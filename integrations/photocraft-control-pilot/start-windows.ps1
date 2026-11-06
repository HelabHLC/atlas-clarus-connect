param(
  [Parameter(Mandatory=$true)]
  [string]$PhotoCraftExe,
  [int]$Port = 7878,
  [string]$Fixture = ""
)

$ErrorActionPreference = "Stop"
$pilot = Join-Path $env:USERPROFILE "ATLAS-Clarus-PhotoCraft-Pilot"
New-Item -ItemType Directory -Force -Path $pilot | Out-Null
$token = Join-Path $pilot "photocraft-control.token"

if (-not (Test-Path -LiteralPath $PhotoCraftExe -PathType Leaf)) {
  throw "PhotoCraft executable not found: $PhotoCraftExe"
}

if (-not $Fixture) {
  $Fixture = Join-Path $PSScriptRoot "synthetic-test.ppm"
}
if (-not (Test-Path -LiteralPath $Fixture -PathType Leaf)) {
  throw "PhotoCraft test fixture not found: $Fixture"
}

Write-Host "Starting PhotoCraft with local ATLAS pilot control channel..."
Write-Host "Control: 127.0.0.1:$Port"
Write-Host "Token file: $token"
Write-Host "Opening fixture: $Fixture"

Start-Process -FilePath $PhotoCraftExe -ArgumentList @(
  "--control", "$Port",
  "--control-token-file", $token,
  $Fixture
)

Write-Host ""
Write-Host "PhotoCraft should open the 10x10 synthetic test image automatically."
Write-Host "Confirm the tab says synthetic-test.ppm, then run capture-windows.ps1."
