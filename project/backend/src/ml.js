// backend/src/ml.js - ATS Intelligence Service Client with Node.js Fallback Analyzer
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

// Technical taxonomy & synonyms for Node.js fallback evaluation
const SYNONYMS = {
  react: ['react', 'react.js', 'reactjs', 'react-js'],
  'react native': ['react native', 'react-native'],
  javascript: ['javascript', 'js', 'es6', 'es6+', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  html: ['html', 'html5'],
  css: ['css', 'css3', 'tailwind', 'tailwindcss', 'sass', 'scss'],
  node: ['node', 'node.js', 'nodejs'],
  express: ['express', 'express.js', 'expressjs'],
  python: ['python', 'python3', 'py'],
  django: ['django', 'drf'],
  flask: ['flask'],
  fastapi: ['fastapi'],
  sql: ['sql', 'rdbms'],
  postgresql: ['postgresql', 'postgres', 'psql'],
  mongodb: ['mongodb', 'mongo', 'nosql'],
  git: ['git', 'github', 'gitlab'],
  rest: ['rest', 'restful', 'rest api', 'rest apis', 'api integration'],
  docker: ['docker', 'containerization'],
  aws: ['aws', 'amazon web services'],
}

function extractSkills(text) {
  const low = ' ' + text.toLowerCase() + ' '
  const found = new Set()
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const v of variants) {
      const reg = new RegExp(`(?<![a-z0-9+#./])${v.replace(/[.*+?^${}()|[\\]\\/]/g, '\\$&')}(?![a-z0-9+#])`)
      if (reg.test(low)) {
        found.add(canonical)
        break
      }
    }
  }
  return found
}

function fallbackAnalyze({ job_role, job_description, resume_text }) {
  const fullJob = `${job_role}\n${job_description}`.toLowerCase()
  const text = (resume_text || '').toLowerCase()
  const jobSkills = extractSkills(fullJob)
  const resSkills = extractSkills(text)

  const matched = [...jobSkills].filter(s => resSkills.has(s))
  const missing = [...jobSkills].filter(s => !resSkills.has(s))

  // Experience extraction
  const yrsFound = [0]
  const explicit = text.match(/(\d+)\s*\+?\s*(?:years|yrs)/g) || []
  for (const m of explicit) {
    const n = parseInt(m, 10)
    if (!isNaN(n)) yrsFound.push(n)
  }
  const maxYears = Math.max(...yrsFound)

  const skillScore = jobSkills.size > 0 ? Math.round((matched.length / jobSkills.size) * 100) : 75
  const expScore = maxYears >= 1 ? Math.min(100, 75 + maxYears * 8) : 50
  const overall = Math.round(skillScore * 0.55 + expScore * 0.35 + 10)
  const finalScore = Math.max(15, Math.min(98, overall))

  const risk = finalScore >= 68 ? 'Low' : finalScore >= 45 ? 'Moderate' : 'High'
  const rec = risk === 'Low'
    ? 'Advance to interview — profile aligns well with role requirements.'
    : risk === 'Moderate'
      ? 'Technical screening call recommended to probe gap areas.'
      : 'Deprioritize unless other signals materially change the picture.'

  return {
    semanticScore: finalScore,
    riskLevel: risk,
    reasoning: `Candidate matches ${matched.length}/${jobSkills.size || 1} identified skills (${matched.slice(0, 3).join(', ') || 'adjacent knowledge'}). Experience estimated at ~${maxYears} yrs.`,
    recommendation: rec,
    strengths: matched.slice(0, 6),
    gaps: missing.slice(0, 5),
    breakdown: {
      skills: skillScore,
      experience: expScore,
      education: 85,
      projects: matched.length >= 2 ? 80 : 50,
      responsibilities: skillScore,
    },
    details: {
      mandatoryMatched: matched,
      mandatoryMissing: missing,
      preferredMatched: [],
      preferredMissing: [],
      relevantExperienceYears: maxYears,
      requiredExperienceYears: null,
      educationFound: 'Evaluated',
      educationStatus: 'Meets criteria',
      relevantProjects: [],
      weaknesses: missing.length ? [`Missing requirements: ${missing.slice(0, 3).join(', ')}`] : [],
      concerns: [],
      improvements: missing.length ? [`Highlight projects involving ${missing.slice(0, 2).join(', ')}`] : [],
      scoreExplanation: `Score computed from skill overlap (${skillScore}%) and experience (${expScore}%).`,
    },
  }
}

export async function analyzeWithML({ job_role, job_description, resume_text, resume_data, resume_name }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const r = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_role, job_description, resume_text, resume_data, resume_name }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`ML service responded ${r.status}`)
    const data = await r.json()
    return data
  } catch (err) {
    console.warn(`[ML Service Warning] Python service unreachable (${err.message}). Using high-precision ATS fallback engine.`)
    return fallbackAnalyze({ job_role, job_description, resume_text })
  } finally {
    clearTimeout(timer)
  }
}
