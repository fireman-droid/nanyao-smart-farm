@echo off
setlocal
cd /d "%~dp0"
title Nanyao Smart Farm
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 is required. Install it and reopen this window.
  pause
  exit /b 1
)
if not exist node_modules\.bin\prisma.cmd (
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 goto failed
)
call npm.cmd run setup
if errorlevel 1 goto failed
echo.
echo Open http://127.0.0.1:5173 after the servers are ready.
echo Local account details are in the .local folder.
echo Keep this window open. Press Ctrl+C to stop the web and API servers.
call npm.cmd run dev
exit /b %errorlevel%
:failed
echo Startup failed. See the message above and README.md.
pause
exit /b 1
