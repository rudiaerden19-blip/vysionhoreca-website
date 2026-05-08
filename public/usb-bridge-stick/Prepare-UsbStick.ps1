#Requires -Version 5.1
<#
  Bouwt map VysionUsbBridge-Stick (+ .zip) onder -OutputParent.

  CI: epsonapp/main wordt telkens vers gecloned — bridge-updates (bv. CORS) zitten in nieuwe ZIP na workflow-run.

  Standaard (geen -BridgeRoot): download bridge uit GitHub-repo-ZIP — voor lokale pc met internet.

  Met -BridgeRoot: gebruik lokale map usb-print-bridge (GitHub Actions).

  Op kassa-PC: ZIP uitpakken, BRIDGE\config.json aanpassen, START.bat — geen aparte Node-installatie.
#>
param(
  [string]$BridgeRoot = '',
  [string]$OutputParent = ''
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) { $ScriptRoot = Get-Location }

if (-not $OutputParent) {
  $OutputParent = $ScriptRoot
}
if (-not (Test-Path -LiteralPath $OutputParent)) {
  New-Item -ItemType Directory -Path $OutputParent -Force | Out-Null
}

# Pin Node LTS win-x64 (portable ZIP van nodejs.org)
$NodeVer = 'v22.14.0'
$NodeZipName = "node-$NodeVer-win-x64.zip"
$NodeUrl = "https://nodejs.org/dist/$NodeVer/$NodeZipName"
$RepoZipUrl = 'https://github.com/rudiaerden19-blip/epsonapp/archive/refs/heads/main.zip'

$OutFolderName = 'VysionUsbBridge-Stick'
$StickRoot = Join-Path $OutputParent $OutFolderName

$Temp = Join-Path ([System.IO.Path]::GetTempPath()) ('vysion-usb-build-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Temp | Out-Null

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }

try {
  if (-not [Environment]::Is64BitOperatingSystem) {
    throw 'Gebruik 64-bit Windows om dit pakket te bouwen (en op de kassa).'
  }

  if (Test-Path -LiteralPath $StickRoot) {
    Remove-Item -LiteralPath $StickRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $StickRoot | Out-Null

  # --- Portable Node.js ---
  Write-Info "Download Node.js portable ($NodeVer)..."
  $nodeZipPath = Join-Path $Temp 'node.zip'
  Invoke-WebRequest -Uri $NodeUrl -OutFile $nodeZipPath -UseBasicParsing

  $nodeExtract = Join-Path $Temp 'node-extract'
  Expand-Archive -LiteralPath $nodeZipPath -DestinationPath $nodeExtract -Force
  $innerDir = Get-ChildItem -LiteralPath $nodeExtract -Directory | Select-Object -First 1
  if (-not $innerDir) { throw 'Node ZIP ongeldig.' }

  $nodeDest = Join-Path $StickRoot 'NODE'
  Move-Item -LiteralPath $innerDir.FullName -Destination $nodeDest

  # --- Bridge-bron ---
  if ($BridgeRoot) {
    Write-Info "Bridge uit lokale map: $BridgeRoot"
    if (-not (Test-Path -LiteralPath $BridgeRoot)) {
      throw "BridgeRoot bestaat niet: $BridgeRoot"
    }
    $bridgeSrc = (Resolve-Path -LiteralPath $BridgeRoot).Path
  }
  else {
    Write-Info 'Download Ordervysion bridge-broncode (epsonapp)...'
    $repoZip = Join-Path $Temp 'repo.zip'
    Invoke-WebRequest -Uri $RepoZipUrl -OutFile $repoZip -UseBasicParsing

    $repoExtract = Join-Path $Temp 'repo-extract'
    Expand-Archive -LiteralPath $repoZip -DestinationPath $repoExtract -Force

    $bridgeSrc = Join-Path $repoExtract 'epsonapp-main\usb-print-bridge'
    if (-not (Test-Path -LiteralPath $bridgeSrc)) {
      throw 'Map usb-print-bridge niet gevonden in repo-ZIP.'
    }
  }

  $bridgeDest = Join-Path $StickRoot 'BRIDGE'
  Copy-Item -LiteralPath $bridgeSrc -Destination $bridgeDest -Recurse -Force

  foreach ($extra in @('installer')) {
    $p = Join-Path $bridgeDest $extra
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
  }
  $nm = Join-Path $bridgeDest 'node_modules'
  if (Test-Path $nm) { Remove-Item $nm -Recurse -Force }

  # --- npm ci met portable Node ---
  Write-Info 'npm ci (even geduld; serialport wordt voor Windows gezet)...'
  $env:Path = "$nodeDest;$env:Path"
  Push-Location $bridgeDest
  $npmCmd = Join-Path $nodeDest 'npm.cmd'
  if (-not (Test-Path $npmCmd)) { throw 'npm.cmd niet gevonden in NODE-map.' }
  & $npmCmd ci --omit=dev
  Pop-Location

  $startBat = @'
@echo off
setlocal
set ROOT=%~dp0
set NODE=%ROOT%NODE\node.exe
if not exist "%NODE%" (
  echo Ontbrekende NODE-map. Kopieer de hele map uit de ZIP.
  pause
  exit /b 1
)
cd /d "%ROOT%BRIDGE"
if not exist "config.json" (
  copy /y config.example.json config.json >nul
  echo Eerste keer: open BRIDGE\config.json en vul COM of Windows-printernaam in.
  echo Daarna START.bat opnieuw starten.
  pause
  exit /b 0
)
"%NODE%" server.mjs
pause
'@

  $listBat = @'
@echo off
set ROOT=%~dp0
set NODE=%ROOT%NODE\node.exe
cd /d "%ROOT%BRIDGE"
"%NODE%" list-ports.mjs
pause
'@

  Set-Content -LiteralPath (Join-Path $StickRoot 'START.bat') -Value $startBat -Encoding OEM
  Set-Content -LiteralPath (Join-Path $StickRoot 'LIST-COM.bat') -Value $listBat -Encoding OEM

  $fixBat = @'
@echo off
chcp 65001 >nul
echo Vernieuwen server.mjs van GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/rudiaerden19-blip/epsonapp/main/usb-print-bridge/server.mjs' -OutFile '%~dp0BRIDGE\server.mjs' -UseBasicParsing; Write-Host OK } catch { Write-Host FOUT; Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 goto :end
echo.
echo Klaar. Start nu START.bat opnieuw.
:end
pause
'@
  Set-Content -LiteralPath (Join-Path $StickRoot 'FIX-PRINT-CHECK.bat') -Value $fixBat -Encoding OEM

  $readme = @'
Vysion USB-bridge — ALLES-IN-ÉÉN (Windows 64-bit)
==================================================

1. Pak deze map uit op de kassa-pc (mag vanaf USB-stick).
2. Pas BRIDGE\config.json aan (COM-poort of Windows-printernaam).
3. Dubbelklik START.bat — laat het zwarte venster open.
4. Ordervysion op deze pc: printer-IP 127.0.0.1

LIST-COM.bat = COM-poorten tonen.

Als Ordervysion «printer niet bereikbaar» zegt terwijl START.bat loopt:
— STOP START.bat (venster sluiten)
— dubbelklik FIX-PRINT-CHECK.bat (een keer, internet nodig)
— START.bat opnieuw

Je hoeft GEEN aparte Node.js te installeren — die zit in de map NODE.
'@
  Set-Content -LiteralPath (Join-Path $StickRoot 'LEES-MIJ.txt') -Value $readme -Encoding UTF8

  Write-Host ''
  Write-Host "KLAAR: $StickRoot" -ForegroundColor Green

  $zipOut = Join-Path $OutputParent ($OutFolderName + '.zip')
  if (Test-Path -LiteralPath $zipOut) { Remove-Item -LiteralPath $zipOut -Force }
  Compress-Archive -Path $StickRoot -DestinationPath $zipOut -Force
  Write-Host "ZIP: $zipOut" -ForegroundColor Green
}
catch {
  Write-Host ''
  Write-Host "FOUT: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
finally {
  Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue
}
