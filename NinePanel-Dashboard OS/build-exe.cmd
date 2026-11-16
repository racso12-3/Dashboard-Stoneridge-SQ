@echo off
title Build ninepanel.exe - Supplier Quality Dashboard
cd /d "%~dp0"

where bun >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Bun.js not found in PATH.
  echo  Install it from https://bun.sh and run this file again.
  echo.
  pause
  exit /b 1
)

tasklist /FI "IMAGENAME eq ninepanel.exe" 2>nul | find /I "ninepanel.exe" >nul
if not errorlevel 1 (
  echo.
  echo  ninepanel.exe is running. Close it before rebuilding.
  echo.
  pause
  exit /b 1
)

echo.
echo  Building ninepanel.exe with the Stoneridge icon...
echo.
set "ICONO=public\assets\stoneridge-logo.ico"
if /I "%~1"=="s" set "ICONO=public\assets\stoneridge.ico"
bun build --compile --windows-icon="%ICONO%" --outfile "ninepanel.exe" "server.mjs"
if errorlevel 1 (
  echo.
  echo  Build failed. Check the message above.
  echo.
  pause
  exit /b 1
)

rem Bun deja dos grupos de iconos y el Explorador usa el viejo (IDI_MYICON).
rem Este paso copia el grupo correcto sobre IDI_MYICON.
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\fix-exe-icon.ps1" -Exe "ninepanel.exe"
if errorlevel 1 (
  echo.
  echo  WARNING: the icon group could not be repaired. The .exe still works,
  echo  but Windows Explorer may show the wrong icon.
  echo.
)

echo.
echo  Done: ninepanel.exe
echo.
pause
