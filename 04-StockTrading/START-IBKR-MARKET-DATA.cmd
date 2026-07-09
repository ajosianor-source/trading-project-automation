@echo off
setlocal
cd /d "%~dp0ml"
uv run python scripts\fetch_ibkr_bars.py %*
if errorlevel 1 (
  echo.
  echo IBKR market-data request failed. See docs\IBKR-SETUP.md.
  pause
)
endlocal
