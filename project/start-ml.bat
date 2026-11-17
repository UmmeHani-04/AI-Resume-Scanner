@echo off
cd /d "%~dp0ml-service"
if exist venv\Scripts\activate.bat (
  call venv\Scripts\activate.bat
)
python -m uvicorn main:app --port 8000
