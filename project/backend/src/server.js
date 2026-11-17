import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db.js'
import authRoutes from './routes/auth.js'
import jobRoutes from './routes/jobs.js'
import applicationRoutes from './routes/applications.js'
dotenv.config()
const app=express(); const PORT=Number(process.env.PORT||5000)
app.use(cors({origin:true,credentials:false})); app.use(express.json({limit:'10mb'}))
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'TalentRadar API'}))
app.get('/api/test-db',async(_req,res)=>{try{const r=await pool.query('SELECT NOW() AS now');res.json({ok:true,now:r.rows[0].now})}catch(e){console.error(e);res.status(500).json({ok:false,message:'Database connection failed'})}})
app.use('/api/auth',authRoutes); app.use('/api/jobs',jobRoutes); app.use('/api/applications',applicationRoutes)
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({message:'Internal server error'})})
app.listen(PORT,()=>console.log(`TalentRadar API running on http://localhost:${PORT}`))
