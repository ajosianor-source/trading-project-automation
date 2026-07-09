@echo off
setlocal
cd /d "%~dp0ml"
uv run python scripts\diagnose_ibkr.py %*
if errorlevel 1 (
  echo.
  echo IBKR paper connection is not ready. See docs\IBKR-SETUP.md.
  pause
)
endlocal
