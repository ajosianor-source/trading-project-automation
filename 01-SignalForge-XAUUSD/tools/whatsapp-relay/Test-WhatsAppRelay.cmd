@echo off
title SignalForge WhatsApp Test
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Test-WhatsAppRelay.ps1"
echo.
pause
