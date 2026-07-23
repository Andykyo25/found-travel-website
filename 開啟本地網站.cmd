@echo off
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js or npm was not found.
  echo Please install Node.js and try again.
  pause
  exit /b 1
)

echo Starting Found Travel at http://localhost:3001
echo Keep this window open while using the website.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:3001'"
npm.cmd run dev -- -p 3001

echo.
echo The local website has stopped.
pause
