@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vysion Print Agent v2.0.12 — installatie vanaf USB

cd /d "%~dp0"
echo.
echo  kassa install — INSTALLEER-VANAF-USB.bat
echo  (bestaande printer/zaakcode in %%APPDATA%%\vysion-print-agent blijft behouden)
echo.

set "DEST=%LOCALAPPDATA%\VysionPrintAgent"
set "EXE=%DEST%\Vysion Print Agent.exe"
set "VBS=%DEST%\resources\app.asar.unpacked\watchdog.vbs"

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "LichteAppPrint" /f >nul 2>&1
:killloop
taskkill /F /IM "Vysion Print Agent.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if not errorlevel 1 goto killloop

if not exist "%DEST%" mkdir "%DEST%"
robocopy "%~dp0." "%DEST%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP /XF "INSTALLEER-VANAF-USB.bat" "README-USB.txt" "LEES-MIJ-STICK.txt" "STOP-AGENT.bat"
if not exist "%EXE%" (
  echo FOUT: Vysion Print Agent.exe ontbreekt op USB.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%'; $s.WorkingDirectory = '%DEST%'; $s.Description = 'Vysion Kassa + Print Agent'; $s.Save();"

set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Vysion"
if not exist "%START_MENU%" mkdir "%START_MENU%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%START_MENU%\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%'; $s.WorkingDirectory = '%DEST%'; $s.Save();"

schtasks /Delete /TN "VysionPrintAgentWatchdog" /F >nul 2>&1
if exist "%VBS%" (
  schtasks /Create /TN "VysionPrintAgentWatchdog" /TR "wscript.exe \"%VBS%\" \"%EXE%\"" /SC MINUTE /MO 1 /RL LIMITED /F >nul 2>&1
)

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\VysionPrintAgent" /v "DisplayName" /d "Vysion Print Agent" /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\VysionPrintAgent" /v "DisplayVersion" /d "2.0.12" /f >nul
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\VysionPrintAgent" /v "InstallLocation" /d "%DEST%" /f >nul

start "" "%EXE%"

echo.
echo Klaar — v2.0.12
echo   Tray: Instellingen ^(bon + keuken + zaakcode^)
echo   Bureaublad: Vysion Kassa
echo   Config: %%APPDATA%%\vysion-print-agent\config.json
echo.
pause
endlocal
