@echo off
chcp 65001 >nul
echo Vernieuwen server.mjs van GitHub (CORS-fix voor Ordervysion)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/rudiaerden19-blip/epsonapp/main/usb-print-bridge/server.mjs' -OutFile '%~dp0BRIDGE\server.mjs' -UseBasicParsing; Write-Host OK } catch { Write-Host FOUT; Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 goto :end
echo.
echo Klaar. Start nu START.bat opnieuw.
:end
pause
