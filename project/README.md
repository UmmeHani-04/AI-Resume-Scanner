# TalentRadar Connect

React/Vite frontend + Node/Express API + PostgreSQL.

## 1. Database
Create a PostgreSQL database named `talentradar`, then run `backend/schema.sql` against it.

## 2. Backend
Copy `backend/.env.example` to `backend/.env` and fill in your PostgreSQL password and a JWT secret.

```powershell
cd backend
npm install
npm start
```

API: `http://localhost:5000`

## 3. Frontend
In a second terminal:

```powershell
cd project
npm install
npm run dev
```

If you are already inside the project folder, just run `npm install` then `npm run dev`.

## Important security note
The app never stores passwords in localStorage/sessionStorage. It stores only the JWT, user, and profile. Login fields are configured not to request browser autocomplete. Browsers/password managers can still override autocomplete in some cases; shared computers should use separate browser profiles and should not save passwords.

## Fixed behavior
- Candidate job list shows only open jobs not already applied to.
- Recruiter job list is scoped to the logged-in recruiter.
- Recruiter applicant lists are scoped to the selected job.
- Dashboard applicant/review/selected counts come from the logged-in user's applications.
- Candidate Apply opens the correct application modal and Cancel returns to Browse jobs.
- Duplicate applications are blocked at both API and database level.
- Passwords are hashed with bcrypt and never returned by the API.
- Sign out clears all app auth storage.


## AI matching (sentence-transformers)

```
React (5173) -> Express (5000) -> Python ML service (8000, all-MiniLM-L6-v2) 
                     |
                PostgreSQL
```

Score = 50% semantic similarity (embedding cosine) + 30% skill overlap + 20% experience match.
Scoring runs on the server (`POST /api/applications/:id/analyze`), never in the browser.

Run: double-click `start-all.bat` (Windows), or start `ml-service` (uvicorn main:app --port 8000),
`backend` (npm start) and the frontend (npm run dev) separately.
