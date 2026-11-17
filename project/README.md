# TalentRadar Connect — AI-Powered ATS Recruitment & Resume Intelligence Platform

TalentRadar Connect is an enterprise-ready candidate recruitment and job-specific resume evaluation platform. It combines a modern React + TypeScript frontend with a Node.js/Express API, PostgreSQL database, and a Python-powered ATS Intelligence engine.

---

## 🚀 Quick Start (One-Click)

On Windows, double-click:
```
project\start-all.bat
```
This script automatically opens 3 separate terminal windows:
1. **ML Service (Port 8000)**: Python ATS Intelligence Service
2. **Backend (Port 5000)**: Node.js / Express REST API
3. **Frontend (Port 5173)**: Vite + React UI

Once the windows say running, open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ Manual Startup (Step-by-Step)

If you prefer to start each service in separate terminal windows:

### 1. Database Setup
1. Ensure PostgreSQL is installed and running on `localhost:5432`.
2. Create the database:
   ```sql
   CREATE DATABASE talentradar;
   ```
3. Run `backend/schema.sql` against `talentradar` to initialize the tables (`users`, `profiles`, `jobs`, `applications`).

### 2. ML Service (Port 8000)
```powershell
cd project/ml-service
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```
Health check: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Backend API (Port 5000)
```powershell
cd project/backend
npm install
npm start
```
Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 4. Frontend Application (Port 5173)
```powershell
cd project
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌟 Upgraded Features & Capabilities

### 1. Zero Blank Screens & Smooth Infinite Scrolling
- Protected with comprehensive React `ErrorBoundary` wrappers.
- High-efficiency pagination and batch rendering (12 candidates/page) prevents DOM overload and GPU compositing crashes.
- Robust null/undefined/NaN guards across candidate records, emails, timestamps, and SVG score rings.

### 2. Fair, Deterministic, Gender-Neutral Avatars
- Explicit candidate gender is used ONLY when explicitly recorded in candidate records; gender is NEVER assumed or guessed from names or photos.
- Missing or unknown gender defaults to a deterministic, professional monogram initials avatar.
- Profile photos take precedence with automatic fallback on load error.

### 3. Job-Specific ATS Scoring Engine
- Normalized 6-dimension scoring model (summing to 100%):
  * **Mandatory Skills Match (30%)**
  * **Preferred Skills Match (10%)**
  * **Relevant Experience Match (25%)**
  * **Project Relevance & Evidence (15%)**
  * **Education & Qualifications Alignment (10%)**
  * **Job Responsibility & Semantic Fit (10%)**
- Semantic skill matching recognizing aliases (`React.js` ↔ `React`, `PostgreSQL` ↔ `SQL`, `REST APIs` ↔ `API development`).
- Differentiates candidates based on actual evidence rather than generic keyword counts.

### 4. Dynamic Candidate Ranking
- Candidates are ranked based on their actual job-specific evaluation score.
- Rank #1 badge awarded to the candidate with the highest verified score.
- Toggle between "Rank (Best Match)" and "Latest Applied".

### 5. Explainable Candidate Score Breakdown
- Visual progress bars for Skills Match, Experience, Education, and Project Relevance.
- Clear itemization of matching requirements vs missing mandatory skills.
- Transparent recruiter notes, potential concerns, and candidate improvement suggestions.

### 6. Side-by-Side Candidate Comparison
- Select 2 or 3 candidates using the checkboxes on candidate cards.
- Click **"Compare Candidates"** to open a comprehensive side-by-side comparison modal evaluating scores, technical skills, verified experience, education, projects, and key differentiators.

---

## 🔒 Environment Variables

### Backend (`backend/.env`):
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=talentradar
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=YOUR_SECURE_JWT_SECRET
ML_SERVICE_URL=http://localhost:8000
```

### Frontend (`.env`):
```env
VITE_API_URL=http://localhost:5000
```
