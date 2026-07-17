@echo off
setlocal
cd /d "%~dp0"

where py.exe >nul 2>&1
if not errorlevel 1 (
  py.exe -3 "%~dp0tools\dashboard_server.py"
  exit /b %errorlevel%
)

where python.exe >nul 2>&1
if not errorlevel 1 (
  python.exe "%~dp0tools\dashboard_server.py"
  exit /b %errorlevel%
)

echo Python 3 was not found. Install Python or add it to PATH.
pause
exit /b 1
