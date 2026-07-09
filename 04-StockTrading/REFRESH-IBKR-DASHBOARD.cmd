@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Update-IbkrDashboard.ps1" %*
if errorlevel 1 (
  echo.
  echo IBKR dashboard refresh failed. Keep TWS Paper Trading open and check API settings.
  pause
)
endlocal
