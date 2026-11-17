@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul || goto plain
start "ZARYA OS" /min cmd /c python -m http.server 8123 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" http://localhost:8123/
exit /b

:plain
start "" "%~dp0index.html"
