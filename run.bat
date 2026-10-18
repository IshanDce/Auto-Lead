@echo off
title AutoLead AI - Autonomous Client Lead & Outreach Engine
echo ========================================================
echo    AutoLead AI - 24/7 Autonomous Lead & Outreach Engine
echo ========================================================
echo.
echo Starting Python FastAPI Backend Server on port 8000...
start cmd /k "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend Dashboard on port 5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Dashboard will be available at: http://localhost:5173
echo Backend API available at: http://127.0.0.1:8000
echo ========================================================
pause
