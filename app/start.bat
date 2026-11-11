@echo off
setlocal
cd /d "%~dp0"
call npm install
if errorlevel 1 exit /b %errorlevel%
call npm run build
if errorlevel 1 exit /b %errorlevel%
start "pose-toolkit dev" powershell -NoExit -Command "Set-Location '%CD%'; npm run dev -- --host"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"
