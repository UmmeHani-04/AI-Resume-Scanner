"""
TalentRadar ML Service — Advanced Job-Specific ATS Intelligence Engine
High-fidelity, explainable candidate resume evaluation system.
Features:
- Structured Job Description Parsing (Mandatory skills, Preferred skills, Experience, Education, Responsibilities)
- Comprehensive Technical Taxonomy & Semantic Skill Matching
- Multi-dimensional Candidate Evaluation:
    * Mandatory Skills Match (30%)
    * Preferred Skills Match (10%)
    * Relevant Experience Match (25%)
    * Project Relevance & Practical Application (15%)
    * Education & Qualifications Alignment (10%)
    * Responsibilities & Domain Alignment (10%)
- Explainable ATS scoring, transparent evidence-backed feedback, strengths, gaps, concerns, and suggestions.
"""

import base64
import io
import math
import re
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_NAME = "all-MiniLM-L6-v2"

# Scoring weights (sum to 1.00 / 100%)
W_MANDATORY = 0.30
W_PREFERRED = 0.10
W_EXPERIENCE = 0.25
W_PROJECTS = 0.15
W_EDUCATION = 0.10
W_RESPONSIBILITIES = 0.10

# Comprehensive Technical Taxonomy & Skill Aliases/Equivalencies
TECH_SYNONYMS: Dict[str, Set[str]] = {
    "react": {"react", "react.js", "reactjs", "react-js"},
    "react native": {"react native", "react-native", "reactnative"},
    "javascript": {"javascript", "js", "ecmascript", "es6", "es6+", "es2015", "es2020"},
    "typescript": {"typescript", "ts"},
    "html": {"html", "html5"},
    "css": {"css", "css3", "tailwind", "tailwindcss", "sass", "scss", "bootstrap"},
    "tailwind": {"tailwind", "tailwindcss"},
    "node": {"node", "node.js", "nodejs", "node-js"},
    "express": {"express", "express.js", "expressjs"},
    "next.js": {"next.js", "nextjs", "next"},
    "vue": {"vue", "vue.js", "vuejs"},
    "angular": {"angular", "angularjs", "angular 2+"},
    "python": {"python", "python3", "py"},
    "django": {"django", "django rest framework", "drf"},
    "flask": {"flask"},
    "fastapi": {"fastapi"},
    "java": {"java", "core java", "j2ee"},
    "spring": {"spring", "spring boot", "springboot"},
    "c++": {"c++", "cpp"},
    "c#": {"c#", "csharp", ".net", "dotnet", "asp.net"},
    "go": {"go", "golang"},
    "rust": {"rust"},
    "sql": {"sql", "rdbms", "relational database"},
    "postgresql": {"postgresql", "postgres", "psql"},
    "mysql": {"mysql", "mariadb"},
    "mongodb": {"mongodb", "mongo", "nosql"},
    "redis": {"redis"},
    "rest": {"rest", "restful", "rest api", "rest apis", "restful api", "restful apis", "api integration", "api development"},
    "graphql": {"graphql"},
    "docker": {"docker", "containerization", "containers"},
    "kubernetes": {"kubernetes", "k8s"},
    "aws": {"aws", "amazon web services", "ec2", "s3", "lambda"},
    "azure": {"azure", "microsoft azure"},
    "gcp": {"gcp", "google cloud", "google cloud platform"},
    "git": {"git", "github", "gitlab", "version control"},
    "ci/cd": {"ci/cd", "ci-cd", "cicd", "continuous integration", "jenkins", "github actions"},
    "linux": {"linux", "unix", "bash", "shell scripting"},
    "flutter": {"flutter", "dart"},
    "kotlin": {"kotlin", "android development"},
    "swift": {"swift", "ios development"},
    "machine learning": {"machine learning", "ml", "deep learning", "ai", "artificial intelligence"},
    "nlp": {"nlp", "natural language processing", "llm", "llms"},
    "tensorflow": {"tensorflow", "tf"},
    "pytorch": {"pytorch", "torch"},
    "pandas": {"pandas"},
    "numpy": {"numpy"},
    "scikit-learn": {"scikit-learn", "sklearn"},
    "figma": {"figma", "ui/ux", "ux", "ui design", "wireframing", "prototyping"},
    "agile": {"agile", "scrum", "kanban", "sprints", "jira"},
    "responsive web design": {"responsive", "responsive design", "responsive web design", "mobile-friendly"},
}

# Related skills that can receive limited partial credit (e.g. 35%) when justified
RELATED_SKILLS: Dict[str, Set[str]] = {
    "react": {"vue", "angular", "next.js", "frontend"},
    "vue": {"react", "angular"},
    "angular": {"react", "vue"},
    "postgresql": {"mysql", "sql", "sqlite"},
    "mysql": {"postgresql", "sql", "sqlite"},
    "mongodb": {"nosql", "dynamodb", "couchbase"},
    "node": {"express", "backend", "fastapi"},
    "express": {"node", "fastapi", "django"},
    "django": {"flask", "fastapi", "python"},
    "flask": {"django", "fastapi", "python"},
    "fastapi": {"flask", "django", "node"},
    "aws": {"azure", "gcp", "cloud"},
    "docker": {"kubernetes", "podman"},
    "kubernetes": {"docker"},
    "flutter": {"react native"},
    "react native": {"flutter"},
}

ALL_KNOWN_SKILLS = set(TECH_SYNONYMS.keys())
for syns in TECH_SYNONYMS.values():
    ALL_KNOWN_SKILLS.update(syns)

DEGREE_WEIGHTS = {
    "phd": 100,
    "doctorate": 100,
    "master": 95,
    "m.tech": 95,
    "m.s": 95,
    "mca": 90,
    "bachelor": 85,
    "b.tech": 85,
    "b.e": 85,
    "b.s": 85,
    "bca": 80,
    "bsc": 75,
    "associate": 65,
    "diploma": 60,
    "bootcamp": 60,
}

state: Dict[str, Any] = {"model": None}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from sentence_transformers import SentenceTransformer
        try:
            state["model"] = SentenceTransformer(MODEL_NAME, local_files_only=True)
            print(f"[ML Service] Loaded cached embedding model: {MODEL_NAME}")
        except Exception:
            state["model"] = SentenceTransformer(MODEL_NAME)
            print(f"[ML Service] Loaded embedding model: {MODEL_NAME}")
    except Exception as e:
        print(f"[ML Service] Embedding model fallback: {e}")
        state["model"] = None
    yield


app = FastAPI(title="TalentRadar ATS Intelligence Engine", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeIn(BaseModel):
    job_role: str
    job_description: str
    resume_text: Optional[str] = ""
    resume_data: Optional[str] = None
    resume_name: Optional[str] = ""


# ---------- Resume File Text Extraction ----------
def extract_resume_text(resume_data: Optional[str], resume_name: Optional[str]) -> str:
    if not resume_data or "," not in resume_data:
        return ""
    try:
        raw = base64.b64decode(resume_data.split(",", 1)[1])
        name = (resume_name or "").lower()
        if name.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        if name.endswith(".docx"):
            import docx
            doc = docx.Document(io.BytesIO(raw))
            return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        print(f"[Extraction Error] Failed to read {resume_name}: {e}")
    return ""


# ---------- Skill & Text Utilities ----------
def normalize_skill(skill: str) -> str:
    skill_clean = skill.strip().lower()
    for canonical, syns in TECH_SYNONYMS.items():
        if skill_clean == canonical or skill_clean in syns:
            return canonical
    return skill_clean


def extract_skills_from_text(text: str) -> Set[str]:
    low = " " + text.lower() + " "
    found: Set[str] = set()

    for canonical, syns in TECH_SYNONYMS.items():
        for variant in syns | {canonical}:
            pattern = r"(?<![a-z0-9+#./])" + re.escape(variant) + r"(?![a-z0-9+#])"
            if re.search(pattern, low):
                found.add(canonical)
                break
    return found


def extract_job_requirements(job_role: str, job_desc: str) -> Dict[str, Any]:
    full_text = f"{job_role}\n{job_desc}"
    lower = full_text.lower()

    # Split into sections if explicitly labelled
    req_section = ""
    pref_section = ""
    resp_section = ""

    req_match = re.search(r"(?:required skills|requirements|must have|qualifications)[\s:]+(.*?)(?=(?:preferred|nice to have|responsibilities|benefits|education|$))", lower, re.DOTALL)
    if req_match:
        req_section = req_match.group(1)

    pref_match = re.search(r"(?:preferred skills|preferred|nice to have|plus|bonus)[\s:]+(.*?)(?=(?:responsibilities|requirements|education|benefits|$))", lower, re.DOTALL)
    if pref_match:
        pref_section = pref_match.group(1)

    resp_match = re.search(r"(?:responsibilities|duties|what you will do|role overview)[\s:]+(.*?)(?=(?:requirements|preferred|skills|qualifications|$))", lower, re.DOTALL)
    if resp_match:
        resp_section = resp_match.group(1)

    # Extract skills
    all_job_skills = extract_skills_from_text(full_text)
    mandatory_skills = extract_skills_from_text(req_section) if req_section else set()
    preferred_skills = extract_skills_from_text(pref_section) if pref_section else set()

    # If no explicit sections were found, infer from role and text
    if not mandatory_skills:
        role_lower = job_role.lower()
        if "frontend" in role_lower:
            mandatory_skills = {"react", "javascript", "html", "css"} & all_job_skills or (all_job_skills & {"react", "javascript", "html", "css", "vue", "angular"})
        elif "backend" in role_lower:
            mandatory_skills = {"node", "python", "sql", "rest", "postgresql", "express"} & all_job_skills
        elif "mobile" in role_lower:
            mandatory_skills = {"react native", "flutter", "kotlin", "swift"} & all_job_skills
        elif "educator" in role_lower or "teacher" in role_lower:
            mandatory_skills = {"communication", "agile"} | (all_job_skills & {"python", "java", "c++", "javascript"})

    if not mandatory_skills:
        mandatory_skills = set(list(all_job_skills)[:max(1, int(len(all_job_skills) * 0.65))])

    preferred_skills = (all_job_skills - mandatory_skills) | preferred_skills

    # Extract years required
    yrs = re.findall(r"(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs)", lower)
    req_years = float(min(map(int, yrs))) if yrs else None

    # Education required
    req_edu_cs = bool(re.search(r"(?:computer science|cs|it|information technology|software engineering)", lower))
    req_degree = "bachelor" if ("degree" in lower or "bachelor" in lower or "b.tech" in lower) else "any"

    return {
        "all_skills": all_job_skills,
        "mandatory_skills": mandatory_skills,
        "preferred_skills": preferred_skills,
        "required_years": req_years,
        "req_edu_cs": req_edu_cs,
        "req_degree": req_degree,
        "responsibilities_text": resp_section or job_desc,
    }


def parse_resume_evidence(resume_text: str) -> Dict[str, Any]:
    low = resume_text.lower()

    # 1. Skills
    skills = extract_skills_from_text(resume_text)

    # 2. Years of Experience
    explicit = [int(x) for x in re.findall(r"(\d+)\s*\+?\s*(?:years|yrs)\s+(?:of\s+)?(?:experience|exp)", low)]
    date_ranges = re.findall(r"(20\d\d|19\d\d)\s*[-–to]+\s*(20\d\d|present|current)", low)
    span = 0.0
    for a, b in date_ranges:
        end = 2026 if b in ("present", "current") else int(b)
        span += max(0, end - int(a))
    years_found = float(max(explicit + [span, 0]))

    # 3. Projects Extraction
    projects_found = []
    project_blocks = re.findall(r"(?:project|portfolio)s?[\s:]+([^\n]+(?:\n[^\n]+){1,6})", low)
    if project_blocks:
        for block in project_blocks:
            lines = [l.strip() for l in block.split("\n") if len(l.strip()) > 8]
            projects_found.extend(lines[:3])

    # Also look for bullet items with action verbs & technologies
    bullet_projects = re.findall(r"[•\-\*]\s*([A-Z][^\n]{15,120}(?:using|with|built|developed|created)[^\n]{10,100})", resume_text)
    projects_found.extend(bullet_projects[:3])

    # 4. Education
    edu_level = "unknown"
    for deg in DEGREE_WEIGHTS.keys():
        if re.search(r"\b" + re.escape(deg) + r"\b", low):
            edu_level = deg
            break

    cs_related = bool(re.search(r"(?:computer science|information technology|software engineering|computer engineering|data science|cs|it|ece)\b", low))

    # 5. Domain Relevance / Responsibilities
    has_frontend_exp = bool(re.search(r"(?:frontend|ui|user interface|react|components|responsive|web app|html5|css3)", low))
    has_backend_exp = bool(re.search(r"(?:backend|api|rest|database|sql|server|postgres|node|express|fastapi)", low))
    has_mobile_exp = bool(re.search(r"(?:mobile|android|ios|react native|flutter|app)", low))

    return {
        "skills": skills,
        "years": years_found,
        "projects": projects_found,
        "edu_level": edu_level,
        "cs_related": cs_related,
        "has_frontend_exp": has_frontend_exp,
        "has_backend_exp": has_backend_exp,
        "has_mobile_exp": has_mobile_exp,
    }


def compute_semantic_embedding_score(job_text: str, resume_text: str) -> float:
    model = state.get("model")
    if model is None:
        # Fallback to token-based Jaccard/Overlap similarity
        j_tokens = set(re.findall(r"\b[a-z]{3,}\b", job_text.lower()))
        r_tokens = set(re.findall(r"\b[a-z]{3,}\b", resume_text.lower()))
        if not j_tokens:
            return 50.0
        overlap = len(j_tokens & r_tokens) / len(j_tokens)
        return float(np.clip(overlap * 120, 10, 95))

    try:
        # Encode job and top resume chunks
        words = resume_text.split()
        chunks = [" ".join(words[i:i + 120]) for i in range(0, len(words), 120)] or [""]
        vecs = model.encode([job_text] + chunks, normalize_embeddings=True, show_progress_bar=False)
        sims = np.array(vecs[1:]) @ vecs[0]
        best_sim = float(np.mean(np.sort(sims)[-3:])) if len(sims) >= 3 else float(np.max(sims))
        # Rescale typical MiniLM range [0.15, 0.70] into [0, 100]
        return float(np.clip((best_sim - 0.15) / 0.52, 0.0, 1.0) * 100)
    except Exception as e:
        print(f"[Semantic Error] Model inference failed: {e}")
        return 50.0


# ---------- Evaluation Engine ----------
def evaluate_candidate(job_role: str, job_description: str, resume_text: str) -> Dict[str, Any]:
    job_text = f"{job_role}\n{job_description}"
    job_reqs = extract_job_requirements(job_role, job_description)
    resume = parse_resume_evidence(resume_text)

    # 1. Mandatory Skills Match (30%)
    m_matched = []
    m_missing = []
    partial_credit = 0.0

    for s in sorted(job_reqs["mandatory_skills"]):
        if s in resume["skills"]:
            m_matched.append(s)
        else:
            # Check related skills for partial credit
            related = RELATED_SKILLS.get(s, set())
            found_related = related & resume["skills"]
            if found_related:
                partial_credit += 0.35
            m_missing.append(s)

    total_m = len(job_reqs["mandatory_skills"])
    if total_m > 0:
        raw_m = ((len(m_matched) + partial_credit) / total_m) * 100
        # If missing critical mandatory skills, cap/discount
        mandatory_score = float(np.clip(raw_m, 0, 100))
    else:
        mandatory_score = 80.0

    # 2. Preferred Skills Match (10%)
    p_matched = []
    p_missing = []
    for s in sorted(job_reqs["preferred_skills"]):
        if s in resume["skills"]:
            p_matched.append(s)
        else:
            p_missing.append(s)

    total_p = len(job_reqs["preferred_skills"])
    if total_p > 0:
        preferred_score = float(len(p_matched) / total_p * 100)
    else:
        preferred_score = 75.0 if m_matched else 50.0

    # Combined Skills Percentage
    all_job_skills = job_reqs["mandatory_skills"] | job_reqs["preferred_skills"]
    all_matched = sorted((job_reqs["mandatory_skills"] & resume["skills"]) | (job_reqs["preferred_skills"] & resume["skills"]))
    skills_percentage = round((len(all_matched) / len(all_job_skills) * 100)) if all_job_skills else round(mandatory_score)

    # 3. Relevant Experience Match (25%)
    req_years = job_reqs["required_years"]
    years_have = resume["years"]

    # Check domain alignment (e.g. Frontend vs Backend)
    domain_multiplier = 1.0
    role_lower = job_role.lower()
    if "frontend" in role_lower and not resume["has_frontend_exp"] and (resume["has_backend_exp"] or resume["has_mobile_exp"]):
        domain_multiplier = 0.45  # experience is in an unrelated stack
    elif "backend" in role_lower and not resume["has_backend_exp"] and resume["has_frontend_exp"]:
        domain_multiplier = 0.50

    if req_years is None or req_years <= 0:
        # Intern or unspecified years
        if years_have >= 1.0:
            exp_score = min(100.0, 85.0 + years_have * 5)
        elif years_have > 0:
            exp_score = 80.0
        else:
            exp_score = 65.0 if len(resume["projects"]) >= 2 else 50.0
    else:
        if years_have >= req_years:
            exp_score = 100.0
        elif years_have > 0:
            exp_score = max(20.0, 100.0 - (req_years - years_have) * 25.0)
        else:
            exp_score = 25.0

    experience_score = float(np.clip(exp_score * domain_multiplier, 0, 100))

    # 4. Project Relevance & Practical Evidence (15%)
    project_count = len(resume["projects"])
    project_skill_overlap = len(resume["skills"] & job_reqs["mandatory_skills"])

    if project_count >= 2 and project_skill_overlap >= 2:
        project_score = 95.0
    elif project_count >= 1 and project_skill_overlap >= 1:
        project_score = 80.0
    elif project_count >= 1:
        project_score = 65.0
    elif project_skill_overlap >= 2:
        project_score = 55.0
    else:
        project_score = 25.0

    # 5. Education & Qualifications Alignment (10%)
    base_edu_score = DEGREE_WEIGHTS.get(resume["edu_level"], 50.0)
    if resume["cs_related"]:
        base_edu_score = min(100.0, base_edu_score + 15.0)
    elif job_reqs["req_edu_cs"]:
        base_edu_score = max(30.0, base_edu_score - 15.0)
    education_score = float(np.clip(base_edu_score, 0, 100))

    # 6. Responsibilities & Semantic Fit (10%)
    semantic_score = compute_semantic_embedding_score(job_text, resume_text)
    responsibilities_score = float(np.clip(semantic_score, 0, 100))

    # Weighted Overall ATS Score (Normalized to 100)
    overall_score = round(
        mandatory_score * W_MANDATORY
        + preferred_score * W_PREFERRED
        + experience_score * W_EXPERIENCE
        + project_score * W_PROJECTS
        + education_score * W_EDUCATION
        + responsibilities_score * W_RESPONSIBILITIES
    )
    overall_score = int(np.clip(overall_score, 0, 100))

    # Risk Level & Recommendation
    if overall_score >= 68:
        risk_level = "Low"
        rec = "Advance to interview — candidate demonstrates strong technical, project, and experience alignment with this role."
    elif overall_score >= 45:
        risk_level = "Moderate"
        rec = "Conduct technical screening to verify depth in required skills and probe missing gap areas."
    else:
        risk_level = "High"
        rec = "Deprioritize for this role — significant gaps in core mandatory qualifications and practical stack experience."

    # Strengths, Weaknesses, Concerns, and Improvement Suggestions
    strengths = []
    if m_matched:
        strengths.append(f"Demonstrated core skills: {', '.join(m_matched[:4])}")
    if p_matched:
        strengths.append(f"Preferred skills matched: {', '.join(p_matched[:3])}")
    if years_have >= (req_years or 1.0):
        strengths.append(f"Strong practical experience duration (~{years_have:.1f} yrs)")
    if resume["projects"]:
        strengths.append("Verified project portfolio applying relevant technologies")
    if resume["cs_related"]:
        strengths.append("Educational background in CS/IT or related discipline")
    if not strengths:
        strengths.append("Foundational knowledge and transferable technical concepts")

    weaknesses = []
    if m_missing:
        weaknesses.append(f"Missing mandatory requirements: {', '.join(m_missing[:4])}")
    if domain_multiplier < 1.0:
        weaknesses.append("Prior experience is predominantly in an adjacent or different technology stack")
    if req_years and years_have < req_years:
        weaknesses.append(f"Experience length ({years_have:.1f} yrs) below stated target ({req_years:.1f} yrs)")
    if not resume["projects"]:
        weaknesses.append("Limited documented project evidence demonstrating production application")

    concerns = []
    if len(m_missing) >= 2:
        concerns.append("May require substantial onboarding or training in core mandatory tools.")
    if domain_multiplier < 0.7:
        concerns.append("Stack divergence: candidate's primary background differs from the primary role requirements.")
    if len(resume_text.strip()) < 150:
        concerns.append("Resume contains sparse text; details could not be independently verified.")

    improvements = []
    if m_missing:
        improvements.append(f"Highlight hands-on projects or coursework involving {', '.join(m_missing[:2])}.")
    if not resume["projects"]:
        improvements.append("Add a dedicated Projects section showcasing architecture, tech stack, and measurable impact.")
    if years_have < 1.0:
        improvements.append("Elaborate on open-source contributions, internships, or production deployment workflows.")

    # Detailed Transparent Score Explanation
    score_explanation = (
        f"ATS Score: {overall_score}/100. "
        f"Mandatory Skills: {len(m_matched)}/{len(job_reqs['mandatory_skills'])} matched ({mandatory_score:.0f}%), "
        f"Preferred Skills: {len(p_matched)}/{max(1, len(job_reqs['preferred_skills']))} ({preferred_score:.0f}%), "
        f"Experience Compatibility: {experience_score:.0f}% (~{years_have:.1f} yrs), "
        f"Project Practicality: {project_score:.0f}%, "
        f"Education Match: {education_score:.0f}%, "
        f"Semantic Alignment: {responsibilities_score:.0f}%."
    )

    reasoning = (
        f"Candidate scored {overall_score}/100 for the {job_role} position. "
        + (f"Demonstrates direct evidence for {', '.join(m_matched[:3])}. " if m_matched else "Lacks direct matches for mandatory skills. ")
        + (f"Missing key requirements: {', '.join(m_missing[:3])}. " if m_missing else "All mandatory requirements verified. ")
        + f"Experience evaluated at ~{years_have:.1f} yrs (target: {req_years or 'internship/open'}). "
        + (f"Project evidence is robust. " if len(resume['projects']) >= 2 else "Project portfolio is limited. ")
        + f"Overall risk is {risk_level}."
    )

    edu_display = f"{resume['edu_level'].capitalize()}" if resume['edu_level'] != 'unknown' else "Not explicitly specified"
    if resume["cs_related"]:
        edu_display += " in CS / IT related field"

    return {
        "semanticScore": overall_score,
        "riskLevel": risk_level,
        "reasoning": reasoning,
        "recommendation": rec,
        "strengths": strengths[:6],
        "gaps": m_missing[:6],
        "breakdown": {
            "skills": skills_percentage,
            "experience": round(experience_score),
            "education": round(education_score),
            "projects": round(project_score),
            "responsibilities": round(responsibilities_score),
        },
        "details": {
            "mandatoryMatched": m_matched,
            "mandatoryMissing": m_missing,
            "preferredMatched": p_matched,
            "preferredMissing": p_missing,
            "relevantExperienceYears": round(years_have, 1),
            "requiredExperienceYears": req_years,
            "educationFound": edu_display,
            "educationStatus": "Meets requirement" if (resume["cs_related"] or not job_reqs["req_edu_cs"]) else "Adjacent / Non-CS",
            "relevantProjects": [p[:80] for p in resume["projects"][:4]],
            "weaknesses": weaknesses[:4],
            "concerns": concerns[:3],
            "improvements": improvements[:3],
            "scoreExplanation": score_explanation,
        },
    }


# ---------- Endpoints ----------
@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "TalentRadar ATS Intelligence Engine",
        "model": MODEL_NAME if state["model"] is not None else "token-jaccard-fallback",
        "weights": {
            "mandatory_skills": W_MANDATORY,
            "preferred_skills": W_PREFERRED,
            "relevant_experience": W_EXPERIENCE,
            "project_relevance": W_PROJECTS,
            "education": W_EDUCATION,
            "responsibilities": W_RESPONSIBILITIES,
        },
    }


@app.post("/analyze")
def analyze(body: AnalyzeIn):
    resume = (body.resume_text or "").strip()
    if len(resume) < 180 and body.resume_data:
        extracted = extract_resume_text(body.resume_data, body.resume_name or "")
        if extracted:
            resume = (resume + "\n" + extracted).strip()

    if len(resume) < 30:
        return {
            "semanticScore": 0,
            "riskLevel": "High",
            "reasoning": "No readable resume text was found in the submitted application. Please provide a text-based PDF or paste resume text.",
            "recommendation": "Ask the candidate for a text-based resume file or detailed portfolio.",
            "strengths": [],
            "gaps": ["No readable resume content"],
            "breakdown": {
                "skills": 0,
                "experience": 0,
                "education": 0,
                "projects": 0,
                "responsibilities": 0,
            },
            "details": {
                "mandatoryMatched": [],
                "mandatoryMissing": ["Readable resume"],
                "preferredMatched": [],
                "preferredMissing": [],
                "relevantExperienceYears": 0.0,
                "requiredExperienceYears": None,
                "educationFound": "Not available",
                "educationStatus": "Not specified",
                "relevantProjects": [],
                "weaknesses": ["Empty or non-parsable resume format"],
                "concerns": ["Scanned document without OCR or corrupted upload"],
                "improvements": ["Upload a standard text-based PDF or DOCX file"],
                "scoreExplanation": "No resume text was extracted; zero score applied.",
            },
        }

    return evaluate_candidate(body.job_role, body.job_description, resume)
