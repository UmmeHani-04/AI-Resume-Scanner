import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'talentradar_super_secret_key_2026'
const tokenFor = user => jwt.sign({ id:user.id, email:user.email, role:user.role }, JWT_SECRET, { expiresIn:'7d' })
router.post('/signup', async (req,res) => {
  try {
    const { email, password, full_name, role } = req.body
    if (!email || !password || !full_name || !role) return res.status(400).json({message:'All fields are required'})
    if (!['candidate','recruiter'].includes(role)) return res.status(400).json({message:'Invalid role'})
    if (password.length < 6) return res.status(400).json({message:'Password must be at least 6 characters'})
    const normalized = email.trim().toLowerCase()
    const exists = await pool.query('SELECT id FROM users WHERE email=$1',[normalized])
    if (exists.rowCount) return res.status(409).json({message:'Email already registered'})
    const hash = await bcrypt.hash(password,10)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const u = (await client.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email,created_at',[normalized,hash])).rows[0]
      const p = (await client.query('INSERT INTO profiles(id,full_name,role) VALUES($1,$2,$3) RETURNING id,full_name,role,created_at',[u.id,full_name.trim(),role])).rows[0]
      await client.query('COMMIT')
      const user = { id:u.id,email:u.email,full_name:p.full_name,role:p.role,created_at:p.created_at }
      res.status(201).json({message:'Signup successful',token:tokenFor(user),user})
    } catch(e) { await client.query('ROLLBACK'); throw e } finally { client.release() }
  } catch(e) { console.error(e); res.status(500).json({message:'Signup failed'}) }
})
router.post('/login', async (req,res) => {
  try {
    const { email,password }=req.body
    if(!email||!password) return res.status(400).json({message:'Email and password are required'})
    const r=await pool.query(`SELECT u.id,u.email,u.password_hash,u.created_at,p.full_name,p.role,p.created_at AS profile_created_at FROM users u JOIN profiles p ON p.id=u.id WHERE u.email=$1`,[email.trim().toLowerCase()])
    if(!r.rowCount) return res.status(401).json({message:'Invalid email or password'})
    const row=r.rows[0]
    if(!(await bcrypt.compare(password,row.password_hash))) return res.status(401).json({message:'Invalid email or password'})
    const user={id:row.id,email:row.email,full_name:row.full_name,role:row.role,created_at:row.profile_created_at||row.created_at}
    res.json({message:'Login successful',token:tokenFor(user),user})
  } catch(e){ console.error(e); res.status(500).json({message:'Login failed'}) }
})
export default router
