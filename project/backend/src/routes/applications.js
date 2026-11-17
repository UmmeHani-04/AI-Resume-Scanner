import express from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { analyzeWithML } from '../ml.js'

const router = express.Router()
router.use(requireAuth)

const base = `
  SELECT 
    a.*, 
    j.company_name, 
    j.role AS job_role, 
    j.description AS job_description, 
    j.is_open,
    p.gender AS candidate_gender,
    p.photo_url AS candidate_photo_url
  FROM applications a 
  JOIN jobs j ON j.id = a.job_id
  LEFT JOIN profiles p ON p.id = a.candidate_id
`

router.get('/', async (req, res) => {
  try {
    let r
    if (req.user.role === 'recruiter') {
      const params = [req.user.id]
      let where = 'j.recruiter_id = $1'
      if (req.query.jobId) {
        where += ' AND a.job_id = $2'
        params.push(req.query.jobId)
      }
      
      // Order by score (rank) if available, then newest applied
      const order = req.query.sort === 'newest'
        ? 'ORDER BY a.applied_at DESC'
        : 'ORDER BY CASE WHEN a.semantic_score IS NOT NULL THEN 0 ELSE 1 END, a.semantic_score DESC, a.applied_at DESC'

      r = await pool.query(`${base} WHERE ${where} ${order}`, params)
    } else {
      r = await pool.query(`${base} WHERE a.candidate_id = $1 ORDER BY a.applied_at DESC`, [req.user.id])
    }
    res.json(r.rows)
  } catch (e) {
    console.error('Fetch applications error:', e)
    res.status(500).json({ message: 'Failed to fetch applications' })
  }
})

router.post('/', requireRole('candidate'), async (req, res) => {
  try {
    const { job_id, candidate_name, candidate_email, resume_name, resume_data, resume_text } = req.body
    if (!job_id || !candidate_name || !candidate_email) {
      return res.status(400).json({ message: 'Application details are required' })
    }
    const job = await pool.query('SELECT id, is_open FROM jobs WHERE id = $1', [job_id])
    if (!job.rowCount) return res.status(404).json({ message: 'Job not found' })
    if (!job.rows[0].is_open) return res.status(400).json({ message: 'This job is closed' })

    const dup = await pool.query('SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2', [job_id, req.user.id])
    if (dup.rowCount) return res.status(409).json({ message: 'You have already applied to this job' })

    const r = await pool.query(
      `INSERT INTO applications (job_id, candidate_id, candidate_name, candidate_email, resume_name, resume_data, resume_text, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new') 
       RETURNING *`,
      [job_id, req.user.id, candidate_name.trim(), candidate_email.trim().toLowerCase(), resume_name || null, resume_data || null, resume_text || null]
    )
    res.status(201).json({ application: r.rows[0] })
  } catch (e) {
    console.error('Submit application error:', e)
    res.status(500).json({ message: 'Failed to submit application' })
  }
})

router.post('/:id/analyze', requireRole('recruiter'), async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT a.id, a.resume_text, a.resume_data, a.resume_name, j.role, j.description 
       FROM applications a 
       JOIN jobs j ON j.id = a.job_id 
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!found.rowCount) return res.status(404).json({ message: 'Application not found' })

    const row = found.rows[0]
    const result = await analyzeWithML({
      job_role: row.role,
      job_description: row.description,
      resume_text: row.resume_text,
      resume_data: row.resume_data,
      resume_name: row.resume_name,
    })

    const detailsJson = result.details ? JSON.stringify(result.details) : null

    const saved = await pool.query(
      `UPDATE applications 
       SET status = 'reviewing',
           semantic_score = $1,
           risk_level = $2,
           reasoning = $3,
           recommendation = $4,
           strengths = $5,
           gaps = $6,
           analysis_details = $7
       WHERE id = $8 
       RETURNING *`,
      [
        result.semanticScore,
        result.riskLevel,
        result.reasoning,
        result.recommendation,
        result.strengths || [],
        result.gaps || [],
        detailsJson,
        row.id,
      ]
    )

    // Re-fetch joined application to include company_name, job_role, candidate_gender, etc.
    const full = await pool.query(`${base} WHERE a.id = $1`, [row.id])
    res.json({ application: full.rows[0] || saved.rows[0], result })
  } catch (e) {
    console.error('Analyze application error:', e)
    res.status(500).json({ message: 'AI analysis failed: ' + (e.message || 'Server error') })
  }
})

router.patch('/:id/decision', requireRole('recruiter'), async (req, res) => {
  try {
    const { status, message } = req.body
    if (!['selected', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid decision' })
    }
    const r = await pool.query(
      `UPDATE applications a 
       SET status = $1, decision_message = $2 
       FROM jobs j 
       WHERE a.job_id = j.id AND a.id = $3 AND j.recruiter_id = $4 
       RETURNING a.*`,
      [status, message || null, req.params.id, req.user.id]
    )
    if (!r.rowCount) return res.status(404).json({ message: 'Application not found' })
    res.json({ application: r.rows[0] })
  } catch (e) {
    console.error('Decision error:', e)
    res.status(500).json({ message: 'Failed to save decision' })
  }
})

export default router
