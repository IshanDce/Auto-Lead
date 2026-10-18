Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   AutoLead AI - 24/7 Autonomous Lead & Outreach Engine  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting Vite React Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "Dashboard URL: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API:   http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Swagger Docs:  http://127.0.0.1:8000/docs" -ForegroundColor Green
