@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 or newer is required to start Zarya Verified Lab.
  echo Download it from https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Zarya OS 2.2.1 Verified Lab
echo Open http://127.0.0.1:8787/ in your browser after the server starts.
echo Press Ctrl+C to stop the local server.
echo.
node server\verified-server.cjs
if errorlevel 1 pause
endlocal
