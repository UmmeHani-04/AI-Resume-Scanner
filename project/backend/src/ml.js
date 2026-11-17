// backend/src/ml.js - calls the Python sentence-transformer service
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

export async function analyzeWithML({ job_role, job_description, resume_text, resume_data, resume_name }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60000) // first call is slow while the model warms up
  try {
    const r = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_role, job_description, resume_text, resume_data, resume_name }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error(`ML service responded ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}
