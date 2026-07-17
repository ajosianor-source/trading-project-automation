@echo off
setlocal
cd /d "%~dp0"

rem One launcher for the read-only dashboard and independent feed watchdog.
rem Existing instances are detected by their listening ports/process command.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0tools\Start-ExnessGuard-Stack.ps1"
endlocal
