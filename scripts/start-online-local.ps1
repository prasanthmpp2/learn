$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Write-Host 'Starting AI Study Assistant in connected/local mode...' -ForegroundColor Cyan
Write-Host 'Backend uses backend/.env and frontend uses frontend/.env' -ForegroundColor DarkCyan

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$backendPath'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$frontendPath'; npm.cmd run dev -- --host 127.0.0.1 --port 5173"
)
