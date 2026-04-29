@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_local_323.ps1"
exit /b %errorlevel%
