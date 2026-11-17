@echo off
REM Opens the 3 parts of TalentRadar in separate windows
start "ML service (8000)" cmd /k "%~dp0start-ml.bat"
start "Backend (5000)"   cmd /k "%~dp0start-backend.bat"
start "Frontend (5173)"  cmd /k "%~dp0start-frontend.bat"
echo.
echo Wait until the ML window says "Application startup complete", then open http://localhost:5173
