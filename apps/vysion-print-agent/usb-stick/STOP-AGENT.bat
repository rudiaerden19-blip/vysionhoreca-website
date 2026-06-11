@echo off
title Vysion Print Agent stoppen
echo Stoppen...
:again
taskkill /F /IM "Vysion Print Agent.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if not errorlevel 1 goto again
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "LichteAppPrint" /f >nul 2>&1
echo Gestopt. Daarna INSTALLEER-VANAF-USB.bat of Vysion Kassa.
pause
