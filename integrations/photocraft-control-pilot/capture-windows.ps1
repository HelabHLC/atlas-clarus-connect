param(
  [int]$X = 2,
  [int]$Y = 3,
  [int]$Port = 7878,
  [string]$Output = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $here "..\..")
$token = Join-Path $env:USERPROFILE "ATLAS-Clarus-PhotoCraft-Pilot\photocraft-control.token"
$bridge = Join-Path $here "photocraft_atlas_bridge.py"
if (-not $Output) {
  $Output = Join-Path $here ("photocraft-real-test-x{0}-y{1}.atlas.json" -f $X, $Y)
}

if (-not (Test-Path -LiteralPath $token -PathType Leaf)) {
  throw "Control token not found. Run start-windows.ps1 first."
}

$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  & py -3 $bridge --token-file $token --port $Port --master (Join-Path $repo "hover-library\data\colors.json") --x $X --y $Y --output $Output
} else {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if (-not $python) {
    throw "Python 3 was not found. Install Python 3 or use the Python launcher 'py'."
  }
  & python $bridge --token-file $token --port $Port --master (Join-Path $repo "hover-library\data\colors.json") --x $X --y $Y --output $Output
}

if ($LASTEXITCODE -ne 0) {
  throw "ATLAS PhotoCraft pilot failed (exit $LASTEXITCODE)."
}

Write-Host ""
Write-Host "PASS candidate written to:"
Write-Host $Output
Write-Host ""
Write-Host "Expected for the default synthetic test pixel (2,3):"
Write-Host "source #3D7B19 -> H130_L045_C055 -> row 4966 -> #37791A -> distance_squared 41"
Write-Host ""
Write-Host "Upload the JSON here and we can verify the real PhotoCraft result."
