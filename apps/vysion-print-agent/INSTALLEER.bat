@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vysion Print Agent - Installatie

echo.
echo ============================================
echo   Vysion Print Agent v2.0.0
echo   (commerciele release)
echo ============================================
echo.

set "DEST=%LOCALAPPDATA%\VysionPrintAgent"
set "EXE=%DEST%\Vysion Print Agent.exe"
set "VBS=%DEST%\resources\app.asar.unpacked\watchdog.vbs"

echo Doelmap: %DEST%
echo.

echo [1/8] Bestaande agent stoppen...
:killloop
taskkill /F /IM "Vysion Print Agent.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
tasklist /FI "IMAGENAME eq Vysion Print Agent.exe" 2>nul | find /I "Vysion Print Agent.exe" >nul
if not errorlevel 1 goto killloop
echo OK.
echo.

echo [2/8] Doelmap aanmaken...
if not exist "%DEST%" mkdir "%DEST%" >nul 2>&1
if not exist "%DEST%" (
  echo *** FOUT: kon doelmap niet aanmaken: %DEST%
  pause
  exit /b 1
)
echo OK.
echo.

echo [3/8] Bestanden kopieren...
robocopy "%~dp0." "%DEST%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP
if not exist "%EXE%" (
  echo.
  echo *** FOUT: kopieren mislukt - %EXE% niet gevonden.
  pause
  exit /b 1
)
echo Klaar.
echo.

echo [4/8] Bureaublad-snelkoppeling...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Vysion Kassa.lnk');" ^
  "$s.TargetPath = '%EXE%';" ^
  "$s.WorkingDirectory = '%DEST%';" ^
  "$s.Description = 'Vysion Kassa + Print Agent';" ^
  "$s.Save();"
echo Bureaublad: 'Vysion Kassa'
echo.

echo [5/8] Startmenu-snelkoppeling...
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

echo [6/8] Oude autostart-keys verwijderen...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "VysionPrintAgent" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Vysion Print Agent" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "vysion-print-agent" /f >nul 2>&1

REM Force autoStart=false in config (zonder bestaande velden te wissen).
set "CFG=%APPDATA%\vysion-print-agent\config.json"
if exist "%CFG%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $j = Get-Content -Raw '%CFG%' | ConvertFrom-Json; $j.autoStart = $false; $txt = $j | ConvertTo-Json -Depth 6; [System.IO.File]::WriteAllText('%CFG%', $txt, (New-Object System.Text.UTF8Encoding $false)) } catch { }"
)
echo OK (klant start kassa zelf via bureaublad).
echo.

echo [7/8] Watchdog scheduled task installeren...
REM Verwijdert oude versie en registreert nieuwe taak die elke minuut
REM checkt of de exe draait wanneer de gebruiker is ingelogd.
schtasks /Delete /TN "VysionPrintAgentWatchdog" /F >nul 2>&1
if exist "%VBS%" (
  schtasks /Create /TN "VysionPrintAgentWatchdog" ^
    /TR "wscript.exe \"%VBS%\" \"%EXE%\"" ^
    /SC MINUTE /MO 1 /RL LIMITED /F >nul 2>&1
  if errorlevel 1 (
    echo Waarschuwing: kon watchdog-taak niet registreren ^(geen rechten?^).
  ) else (
    echo Watchdog actief - elke minuut auto-restart bij crash.
  )
) else (
  echo watchdog.vbs niet gevonden in %VBS% - sla over.
)
echo.

echo [8/8] Eerste start...
start "" "%EXE%"
echo Print Agent gestart - tray-icoon verschijnt rechtsonder.
echo.

echo ============================================
echo   KLAAR - PRODUCTIE-INSTALLATIE
echo.
echo   - Bureaublad: 'Vysion Kassa' (klant dubbelklikt)
echo   - Startmenu:  Vysion -^> Vysion Kassa
echo   - Watchdog:   automatische restart bij crash
echo   - Updates:    automatisch via internet (4u check)
echo   - Logs:       %APPDATA%\vysion-print-agent\agent.log
echo   - Locatie:    %DEST%
echo.
echo   Eerste keer: tray-icoon -^> Instellingen
echo   - Tenant code (bv. geerkensdrankenhandel)
echo   - Bonprinter selecteren
echo   - Test bonnetje + lade testen
echo ============================================
echo.
pause
endlocal
