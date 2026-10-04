@echo off
setlocal
cd /d "%~dp0"
title SORT SHIFT - Game Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 8080 -OpenPage "index.html"
if errorlevel 1 (
  echo.
  echo [ERROR] The local server could not start.
  echo Try another port with: powershell -ExecutionPolicy Bypass -File start-server.ps1 -Port 8081
  echo Or use VS Code Live Server.
  echo.
  pause
)
