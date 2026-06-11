@echo off
setlocal EnableExtensions
title Vysion Print Agent verwijderen
set "DEST=%LOCALAPPDATA%\VysionPrintAgent"
set "CFG=%APPDATA%\vysion-print-agent"

:killloop
taskkill /F /IM "Vysion Print Agent.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if not errorlevel 1 goto killloop

schtasks /Delete /TN "VysionPrintAgentWatchdog" /F >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Vysion Print Agent" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "LichteAppPrint" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\VysionPrintAgent" /f >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\Vysion Kassa.lnk" >nul 2>&1
if exist "%DEST%" rd /s /q "%DEST%"
if exist "%CFG%" rd /s /q "%CFG%"
echo Klaar.
pause
endlocal
