@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Vysion USB-bridge — bouwt een map (+ ZIP) voor op een USB-stick.
echo  Vereist: Windows 64-bit, internet, een paar minuten wachten.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Prepare-UsbStick.ps1"
echo.
pause
