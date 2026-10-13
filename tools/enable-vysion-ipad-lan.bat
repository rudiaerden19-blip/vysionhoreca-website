@echo off
chcp 65001 >nul
echo.
echo  Vysion: iPad-print via WiFi aanzetten op deze PC...
echo.

set "CFG=%APPDATA%\Vysion Print Agent\config.json"
if not exist "%APPDATA%\Vysion Print Agent\" mkdir "%APPDATA%\Vysion Print Agent\"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = $env:APPDATA + '\Vysion Print Agent\config.json';" ^
  "if (Test-Path $p) { $j = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json } else { $j = [pscustomobject]@{} };" ^
  "$j | Add-Member -NotePropertyName lanListenEnabled -NotePropertyValue $true -Force;" ^
  "$j.lanListenEnabled = $true;" ^
  "if (-not $j.port) { $j | Add-Member -NotePropertyName port -NotePropertyValue 9742 -Force };" ^
  "$j | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $p -Encoding UTF8"

netsh advfirewall firewall add rule name="Vysion Print Agent TCP 9742" dir=in action=allow protocol=TCP localport=9742 profile=private >nul 2>&1

echo  Klaar: lanListenEnabled=true + firewall poort 9742 (privé).
echo  Sluit oude Vysion/Epson in Taakbeheer, dubbelklik daarna START.bat in de Vysion-map.
echo.
pause
