@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vysion Print Agent - Installatie

echo.
echo ============================================
echo   Vysion Print Agent v1.1.2 - Installatie
echo ============================================
echo.

set "DEST=%LOCALAPPDATA%\VysionPrintAgent"
set "EXE=%DEST%\Vysion Print Agent.exe"

echo Doelmap: %DEST%
echo.

echo [1/6] Bestaande agent stoppen (alle instances)...
:killloop
taskkill /F /IM "Vysion Print Agent.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if not errorlevel 1 goto killloop
echo OK.
echo.

echo [2/6] Doelmap aanmaken...
if not exist "%DEST%" mkdir "%DEST%" >nul 2>&1
if not exist "%DEST%" (
  echo *** FOUT: kon doelmap niet aanmaken: %DEST%
  pause
  exit /b 1
)
echo OK.
echo.

echo [3/6] Bestanden kopieren naar gebruikersmap...
robocopy "%~dp0." "%DEST%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
if not exist "%EXE%" (
  echo.
  echo *** FOUT: kopieren mislukt - %EXE% niet gevonden.
  echo.
  pause
  exit /b 1
)
echo Kopieren klaar.
echo.

echo [4/6] Bureaublad-snelkoppeling...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%';" ^
  "$s.WorkingDirectory = '%DEST%';" ^
  "$s.Description = 'Vysion Kassa + Print Agent';" ^
  "$s.Save();"
echo Op bureaublad: 'Vysion Kassa'
echo.

echo [5/6] Startmenu + autostart bij Windows...
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Vysion"
if not exist "%START_MENU%" mkdir "%START_MENU%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%START_MENU%\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%';" ^
  "$s.WorkingDirectory = '%DEST%';" ^
  "$s.Description = 'Vysion Kassa + Print Agent';" ^
  "$s.Save();"
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VysionPrintAgent" /t REG_SZ /d "\"%EXE%\"" /f >nul
echo OK.
echo.

echo [6/6] Agent starten vanaf gebruikersmap (NIET vanaf USB)...
start "" "%EXE%"
timeout /t 3 /nobreak >nul

tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if errorlevel 1 (
  echo *** WAARSCHUWING: agent lijkt niet te draaien.
  echo *** Dubbelklik 'Vysion Kassa' op bureaublad.
) else (
  echo Agent draait nu vanaf %%LOCALAPPDATA%%\VysionPrintAgent
  echo USB mag uitgetrokken worden zonder problemen.
)

echo.
echo ============================================
echo   KLAAR!
echo.
echo   - Bureaublad-icoon: 'Vysion Kassa'
echo   - Startmenu: Vysion -^> Vysion Kassa
echo   - Autostart bij Windows-aanmelding
echo   - Locatie: %DEST%
echo.
echo   Check: rechtsklik tray-icoon -^> moet 'v1.1.2' zien.
echo ============================================
echo.
pause
endlocal
