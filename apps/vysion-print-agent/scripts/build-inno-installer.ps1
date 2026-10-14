#Requires -Version 5.1
<#
  Bouwt win-unpacked (electron-builder --dir) en compileert Inno Setup:
    inno\output\VYSION Print Agent Installeren.exe

  Vereisten op build-PC:
    - Node.js + npm install in apps/vysion-print-agent
    - Inno Setup 6 (iscc.exe), typisch:
      C:\Program Files (x86)\Inno Setup 6\ISCC.exe

  Geen Defender uitschakelen. Payload-SHA256 wordt in de installer ingebed.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "== Vysion Print Agent — Inno build ==" -ForegroundColor Cyan

npm run pack:win
if ($LASTEXITCODE -ne 0) { throw "electron-builder pack mislukt" }

$ExeRel = 'Vysion Print Agent.exe'
$Unpacked = Join-Path $Root 'dist\win-unpacked'
$ExePath = Join-Path $Unpacked $ExeRel
if (-not (Test-Path -LiteralPath $ExePath)) {
  throw "Payload niet gevonden: $ExePath"
}

$hash = (Get-FileHash -LiteralPath $ExePath -Algorithm SHA256).Hash
Write-Host "Payload SHA256: $hash"

$IncPath = Join-Path $Root 'inno\payload-sha256.inc'
$inc = @"
; Gegenereerd door scripts/build-inno-installer.ps1 — niet handmatig wijzigen.
#define VysionPayloadExeRel "$ExeRel"
#define VysionPayloadSha256 "$hash"
"@
Set-Content -LiteralPath $IncPath -Value $inc -Encoding UTF8

$Iscc = $env:ISCC
if (-not $Iscc) {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { $Iscc = $c; break }
  }
}
if (-not $Iscc -or -not (Test-Path -LiteralPath $Iscc)) {
  throw "ISCC.exe niet gevonden. Zet env ISCC naar iscc.exe of installeer Inno Setup 6."
}

$Iss = Join-Path $Root 'inno\VYSION-Print-Agent-Installeren.iss'
& $Iscc $Iss
if ($LASTEXITCODE -ne 0) { throw "Inno compile mislukt" }

$Out = Join-Path $Root 'inno\output\VYSION Print Agent Installeren.exe'
if (-not (Test-Path -LiteralPath $Out)) {
  throw "Verwachte output ontbreekt: $Out"
}

$outHash = (Get-FileHash -LiteralPath $Out -Algorithm SHA256).Hash
Write-Host ""
Write-Host "KLAAR:" -ForegroundColor Green
Write-Host "  $Out"
Write-Host "  SHA256: $outHash"
Write-Host ""
Write-Host "Kopieer naar USB (software): alleen dit ene bestand." -ForegroundColor Yellow
