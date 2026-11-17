"""
TalentRadar ML service
Run:  uvicorn main:app --port 8000
Scores a resume against a job using:
  - sentence-transformer embeddings (all-MiniLM-L6-v2)  -> semantic score
  - skill overlap                                       -> skills score
  - years-of-experience match                           -> experience score
"""
import base64, io, re
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_NAME = "all-MiniLM-L6-v2"
W_SEMANTIC, W_SKILLS, W_EXPERIENCE = 0.50, 0.30, 0.20   # must sum to 1.0

SKILLS = [
    "javascript", "typescript", "python", "java", "c++", "go", "rust", "sql", "postgres", "mongodb",
    "react", "react native", "node", "express", "next.js", "vue", "angular", "html", "css", "tailwind",
    "flutter", "kotlin", "swift", "django", "flask", "spring", "php", "rest", "graphql", "api",
    "docker", "kubernetes", "aws", "git", "ci/cd", "redis", "kafka", "linux",
    "machine learning", "deep learning", "nlp", "pandas", "numpy", "tensorflow", "pytorch",
    "figma", "ux", "ui", "agile", "scrum", "jira", "communication", "leadership",
]

state = {"model": None}


@asynccontextmanager
async def lifespan(_app):
    from sentence_transformers import SentenceTransformer
    state["model"] = SentenceTransformer(MODEL_NAME)   # loaded once at startup
    yield


app = FastAPI(lifespan=lifespan)


class AnalyzeIn(BaseModel):
    job_role: str
    job_description: str
    resume_text: str | None = ""
    resume_data: str | None = None      # data URL (base64) of the uploaded PDF/DOCX
    resume_name: str | None = ""


# ---------- resume text extraction ----------
def extract_resume_text(resume_data: str | None, resume_name: str) -> str:
    if not resume_data or "," not in resume_data:
        return ""
    try:
        raw = base64.b64decode(resume_data.split(",", 1)[1])
        name = (resume_name or "").lower()
        if name.endswith(".pdf"):
            from pypdf import PdfReader
            return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(raw)).pages)
        if name.endswith(".docx"):
            import docx
            return "\n".join(p.text for p in docx.Document(io.BytesIO(raw)).paragraphs)
    except Exception as e:
        print("extract error:", e)
    return ""


# ---------- helpers ----------
def find_skills(text: str) -> set[str]:
    low = text.lower()
    found = set()
    for s in SKILLS:
        # word-boundary match so "go" does not match "google"
        if re.search(r"(?<![a-z0-9+#.])" + re.escape(s) + r"(?![a-z0-9+#])", low):
            found.add(s)
    return found


def chunk(text: str, words: int = 120) -> list[str]:
    w = text.split()
    return [" ".join(w[i:i + words]) for i in range(0, len(w), words)] or [""]


def years_required(text: str) -> float | None:
    m = re.findall(r"(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs)", text.lower())
    return float(min(map(int, m))) if m else None


def years_in_resume(text: str) -> float:
    explicit = [int(x) for x in re.findall(r"(\d+)\s*\+?\s*(?:years|yrs)", text.lower())]
    ranges = re.findall(r"(20\d\d|19\d\d)\s*[-–to]+\s*(20\d\d|present|current)", text.lower())
    span = 0.0
    for a, b in ranges:
        end = 2026 if b in ("present", "current") else int(b)
        span += max(0, end - int(a))
    return float(max(explicit + [span, 0]))


def semantic_score(job_text: str, resume_text: str) -> float:
    model = state["model"]
    chunks = chunk(resume_text)
    vecs = model.encode([job_text] + chunks, normalize_embeddings=True, show_progress_bar=False)
    sims = np.array(vecs[1:]) @ vecs[0]                      # cosine (vectors are normalised)
    best = float(np.mean(np.sort(sims)[-3:]))                # average of the 3 best-matching chunks
    # MiniLM cosine for related texts sits roughly in 0.15 .. 0.65 -> stretch to 0..100
    return float(np.clip((best - 0.15) / 0.50, 0, 1) * 100)


def label(score: float) -> str:
    return "High" if score < 35 else "Moderate" if score < 60 else "Low"


# ---------- endpoint ----------
@app.get("/health")
def health():
    return {"ok": state["model"] is not None, "model": MODEL_NAME}


@app.post("/analyze")
def analyze(body: AnalyzeIn):
    resume = (body.resume_text or "").strip()
    if len(resume) < 200:                                    # nothing pasted -> read the uploaded file
        resume = (resume + "\n" + extract_resume_text(body.resume_data, body.resume_name or "")).strip()

    job_text = f"{body.job_role}. {body.job_description}"
    if len(resume) < 30:
        return {"semanticScore": 0, "riskLevel": "High", "strengths": [], "gaps": [],
                "reasoning": "No readable resume text was found (scanned PDF or empty file).",
                "recommendation": "Ask the candidate for a text-based resume.",
                "breakdown": {"semantic": 0, "skills": 0, "experience": 0}}

    sem = semantic_score(job_text, resume)

    job_sk, res_sk = find_skills(job_text), find_skills(resume)
    matched, missing = sorted(job_sk & res_sk), sorted(job_sk - res_sk)
    skills = (len(matched) / len(job_sk) * 100) if job_sk else None

    need, have = years_required(job_text), years_in_resume(resume)
    exp = None if need is None else 100.0 if have >= need else max(0.0, 100 - (need - have) * 25)

    # re-normalise weights when a component is not applicable
    parts = [(sem, W_SEMANTIC), (skills, W_SKILLS), (exp, W_EXPERIENCE)]
    used = [(v, w) for v, w in parts if v is not None]
    final = round(sum(v * w for v, w in used) / sum(w for _, w in used))
    risk = label(final)

    lead = ", ".join(matched[:3]) or "related areas"
    reasoning = (
        f"Semantic similarity to the {body.job_role} role is {sem:.0f}/100 (embedding match). "
        f"Skill overlap: {len(matched)}/{len(job_sk)} required skills found ({lead}). "
        + (f"Experience: about {have:.0f} yrs found vs {need:.0f} yrs required." if need is not None
           else "No explicit experience requirement in the job.")
    )
    rec = {"Low": "Advance to interview - strong overall alignment.",
           "Moderate": "Screening call recommended to probe the gap areas.",
           "High": "Deprioritise unless other signals change the picture."}[risk]

    return {"semanticScore": final, "riskLevel": risk, "reasoning": reasoning, "recommendation": rec,
            "strengths": matched[:6], "gaps": missing[:5],
            "breakdown": {"semantic": round(sem), "skills": None if skills is None else round(skills),
                          "experience": None if exp is None else round(exp)}}
