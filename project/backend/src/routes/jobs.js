import express from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
const router=express.Router()
router.use(requireAuth)
router.get('/', async (req,res)=>{
  try {
    let result
    if(req.user.role==='recruiter') {
      result=await pool.query(`SELECT j.*, COUNT(a.id)::int AS application_count FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.recruiter_id=$1 GROUP BY j.id ORDER BY j.created_at DESC`,[req.user.id])
    } else {
      result=await pool.query(`SELECT j.*, 0::int AS application_count FROM jobs j WHERE j.is_open=true AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id=j.id AND a.candidate_id=$1) ORDER BY j.created_at DESC`,[req.user.id])
    }
    res.json(result.rows)
  }catch(e){console.error(e);res.status(500).json({message:'Failed to fetch jobs'})}
})
router.post('/',requireRole('recruiter'),async(req,res)=>{try{const {company_name,role,description}=req.body;if(!company_name||!role||!description)return res.status(400).json({message:'Company, role and description are required'});const r=await pool.query(`INSERT INTO jobs(recruiter_id,company_name,role,description) VALUES($1,$2,$3,$4) RETURNING *`,[req.user.id,company_name.trim(),role.trim(),description.trim()]);res.status(201).json(r.rows[0])}catch(e){console.error(e);res.status(500).json({message:'Failed to create job'})}})
router.patch('/:id/status',requireRole('recruiter'),async(req,res)=>{try{const r=await pool.query(`UPDATE jobs SET is_open=$1 WHERE id=$2 AND recruiter_id=$3 RETURNING *`,[Boolean(req.body.is_open),req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({message:'Job not found'});res.json({job:r.rows[0]})}catch(e){console.error(e);res.status(500).json({message:'Failed to update job'})}})
router.delete('/:id',requireRole('recruiter'),async(req,res)=>{try{const r=await pool.query('DELETE FROM jobs WHERE id=$1 AND recruiter_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({message:'Job not found'});res.json({message:'Job deleted'})}catch(e){console.error(e);res.status(500).json({message:'Failed to delete job'})}})
export default router
