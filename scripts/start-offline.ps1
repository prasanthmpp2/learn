$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Write-Host 'Starting AI Study Assistant in offline/demo mode...' -ForegroundColor Cyan
Write-Host 'Backend: demo auth + memory storage + offline AI fallback' -ForegroundColor DarkCyan
Write-Host 'Frontend: demo auth (Firebase disabled for this session)' -ForegroundColor DarkCyan

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$backendPath'; " +
  '$env:AI_STUDY_ENVIRONMENT=''development''; ' +
  '$env:AI_STUDY_AUTH_MODE=''demo''; ' +
  '$env:AI_STUDY_DATA_BACKEND=''memory''; ' +
  '$env:AI_STUDY_GEMINI_API_KEY=''''; ' +
  '.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload'
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$frontendPath'; " +
  '$env:VITE_API_BASE_URL=''http://127.0.0.1:8000/api''; ' +
  '$env:VITE_FIREBASE_API_KEY=''''; ' +
  '$env:VITE_FIREBASE_AUTH_DOMAIN=''''; ' +
  '$env:VITE_FIREBASE_PROJECT_ID=''''; ' +
  '$env:VITE_FIREBASE_STORAGE_BUCKET=''''; ' +
  '$env:VITE_FIREBASE_MESSAGING_SENDER_ID=''''; ' +
  '$env:VITE_FIREBASE_APP_ID=''''; ' +
  '$env:VITE_FIREBASE_MEASUREMENT_ID=''''; ' +
  'npm.cmd run dev -- --host 127.0.0.1 --port 5173'
)
