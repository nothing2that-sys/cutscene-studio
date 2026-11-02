@echo off
setlocal
cd /d "%~dp0"
if defined CUTSCENE_NODE goto have_node
set "CUTSCENE_NODE=node"
where node >nul 2>nul
if not errorlevel 1 goto have_node
set "CUTSCENE_NODE=%~dp0.review-tools\node\node.exe"
if exist "%CUTSCENE_NODE%" goto have_node
echo Node.js is required. Install Node.js and try again.
pause
exit /b 1
:have_node
if exist app\dist\index.html goto serve
echo Build files are missing. In app, run npm ci and npm run build first.
pause
exit /b 1
:serve
if not defined CUTSCENE_PORT set "CUTSCENE_PORT=3001"
echo Open http://127.0.0.1:%CUTSCENE_PORT% in your browser.
"%CUTSCENE_NODE%" scripts\serve.mjs
pause
