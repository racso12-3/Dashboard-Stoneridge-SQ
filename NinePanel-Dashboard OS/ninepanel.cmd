@echo off
title Supplier Quality Dashboard - Nine Panel KPI (local demo)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js not found in PATH.
  echo  Get it from https://nodejs.org
  echo.
  pause
  exit /b 1
)

rem --- If it's already running, just open the browser and exit ---
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',5124); exit 0 } catch { exit 1 }"
if not errorlevel 1 (compilalo 
  echo.
  echo  Nine Panel Dashboard is already running.
  echo  Opening http://127.0.0.1:5124 ...
  echo.
  start "" http://127.0.0.1:5124
  timeout /t 3 >nul
  exit /b 0
)

echo.
echo  Starting Supplier Quality Dashboard (Nine-Panel KPI) on http://127.0.0.1:5124 ...
echo  Leave this window open. Close it to shut down the system.
echo.

node server.mjs --abrir
if errorlevel 1 (
  echo.
  echo  The system closed with an error. Check the message above.
  pause
)
