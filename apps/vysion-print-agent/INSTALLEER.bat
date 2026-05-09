@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vysion Print Agent - Installatie

echo.
echo ============================================
echo   Vysion Print Agent v1.2.1 - Geerkens drankenhandel
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

echo [5/6] Startmenu-snelkoppeling...
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Vysion"
if not exist "%START_MENU%" mkdir "%START_MENU%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%START_MENU%\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%';" ^
  "$s.WorkingDirectory = '%DEST%';" ^
  "$s.Description = 'Vysion Kassa + Print Agent';" ^
  "$s.Save();"
echo OK.
echo.

echo [6/6] Autostart bij Windows-aanmelding UITZETTEN (alle oude varianten)...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VysionPrintAgent" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Vysion Print Agent" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "vysion-print-agent" /f >nul 2>&1

REM Force autoStart=false in bestaande config (zonder andere instellingen te overschrijven)
REM Schrijf UTF-8 zonder BOM, anders breekt JSON.parse in de agent.
set "CFG=%APPDATA%\vysion-print-agent\config.json"
if exist "%CFG%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $j = Get-Content -Raw '%CFG%' | ConvertFrom-Json; $j.autoStart = $false; $txt = $j | ConvertTo-Json -Depth 6; [System.IO.File]::WriteAllText('%CFG%', $txt, (New-Object System.Text.UTF8Encoding $false)) } catch { }"
)
echo Klant start de kassa zelf via 'Vysion Kassa' op het bureaublad.
echo.

echo ============================================
echo   KLAAR!
echo.
echo   - Bureaublad-icoon: 'Vysion Kassa' (klant dubbelklikt)
echo   - Startmenu: Vysion -^> Vysion Kassa
echo   - GEEN autostart bij Windows-aanmelding
echo   - Login wordt onthouden (versleuteld op deze PC)
echo   - Locatie: %DEST%
echo.
echo   Check: rechtsklik tray-icoon -^> moet 'v1.2.1' zien.
echo ============================================
echo.
pause
endlocal
