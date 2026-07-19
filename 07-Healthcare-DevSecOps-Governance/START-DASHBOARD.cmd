@echo off
setlocal
cd /d "%~dp0"
set "PYTHON=%CD%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo The project Python virtual environment is missing.
  echo Run: py -3.12 -m venv .venv
  pause
  exit /b 1
)
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if errorlevel 1 (
  echo Starting the local staging identity service...
  start "HealthGov Identity" /min cmd /c "set ALLOW_STAGING_SESSION=true&& cd /d ""%CD%\services\local-auth-bff""&& ""%PYTHON%"" -m uvicorn app.main:app --host 127.0.0.1 --port 8080"
)
cd /d "%~dp0portal"
set "NODE_HOME=%CD%\.tools\node-v22.15.0-win-x64"
if not exist "%NODE_HOME%\node.exe" (
  echo The portable Node.js runtime is missing.
  echo See portal\README.md for installation instructions.
  pause
  exit /b 1
)
set "PATH=%NODE_HOME%;%PATH%"
set "AUTH_BFF_URL=http://127.0.0.1:8080"
set "ALLOW_STAGING_LOGIN=true"
set "COOKIE_SECURE=false"
echo.
echo HealthGov dashboard is starting...
echo Open http://127.0.0.1:3000 in your browser.
echo Keep this window open while using the dashboard.
echo.
"%NODE_HOME%\node.exe" "node_modules\next\dist\bin\next" dev -H 127.0.0.1 -p 3000
