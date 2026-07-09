@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Invoke-StockForge.ps1" %*
if errorlevel 1 (
  echo.
  echo StockForge scan failed.
  pause
)
endlocal
