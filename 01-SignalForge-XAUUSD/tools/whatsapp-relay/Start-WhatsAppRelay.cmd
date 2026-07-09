@echo off
title SignalForge WhatsApp Relay
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-WhatsAppRelay.ps1"
echo.
echo Relay stopped. Review any message above.
pause
