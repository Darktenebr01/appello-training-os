@echo off
setlocal
cd /d "%~dp0"
echo Starting APPELLO on http://localhost:8090
echo Leave this window open while you practise. Press Ctrl+C to stop.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://localhost:8090/'"
where python >nul 2>nul
if errorlevel 1 (
  py -m http.server 8090
) else (
  python -m http.server 8090
)
pause
