@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Vysion Print Agent — USB Stick installatie
echo  ==========================================
echo.

:: Zoek USB stick met label "usb disk"
set USBDRIVE=
for %%d in (D E F G H I J K L M N) do (
  if exist "%%d:\" (
    vol %%d: 2>nul | findstr /i "usb disk" >nul && set USBDRIVE=%%d:
  )
)

if defined USBDRIVE (
  echo  USB stick gevonden op %USBDRIVE%
  echo.
  set TARGET=%USBDRIVE%\VysionPrintAgent
) else (
  echo  Geen USB stick met naam "usb disk" gevonden.
  echo  Controleer of de stick ingeplugd is en "usb disk" heet.
  echo  De agent wordt gedownload naar de huidige map.
  echo.
  set TARGET=%~dp0VysionPrintAgent
)

echo  Bestanden worden klaargezet naar: %TARGET%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Prepare-UsbStick.ps1" -OutputParent "%TARGET%"
echo.
if defined USBDRIVE (
  echo  Klaar! USB stick %USBDRIVE% is klaar voor gebruik.
  echo.
  echo  Op de kassa-pc:
  echo  1. Steek de USB stick in
  echo  2. Open %USBDRIVE%\VysionPrintAgent
  echo  3. Dubbelklik START.bat
  echo  4. Kies de Epson printer in het scherm dat opent
) else (
  echo  Klaar! Kopieer de map VysionPrintAgent handmatig naar de USB stick.
)
echo.
pause
