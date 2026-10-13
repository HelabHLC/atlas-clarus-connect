param(
  [Parameter(Mandatory=$true)]
  [string]$PhotoCraftExe,
  [int]$Port = 7878
)

$ErrorActionPreference = "Stop"
$pilot = Join-Path $env:USERPROFILE "ATLAS-Clarus-PhotoCraft-Pilot"
New-Item -ItemType Directory -Force -Path $pilot | Out-Null
$token = Join-Path $pilot "photocraft-control.token"

if (-not (Test-Path -LiteralPath $PhotoCraftExe -PathType Leaf)) {
  throw "PhotoCraft executable not found: $PhotoCraftExe"
}

Write-Host "Starting PhotoCraft with local ATLAS pilot control channel..."
Write-Host "Control: 127.0.0.1:$Port"
Write-Host "Token file: $token"
Start-Process -FilePath $PhotoCraftExe -ArgumentList @(
  "--control", "$Port",
  "--control-token-file", $token
)

Write-Host ""
Write-Host "PhotoCraft should open now."
Write-Host "Next: open integrations\photocraft-control-pilot\synthetic-test.ppm in PhotoCraft."
Write-Host "Then run capture-windows.ps1."
