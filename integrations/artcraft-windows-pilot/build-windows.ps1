param(
  [Parameter(Mandatory=$true)][string]$ArtcraftCheckout,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
if (-not $IsWindows) { throw 'This build requires Windows and the MSVC toolchain.' }
$root = (Resolve-Path $ArtcraftCheckout).Path
$manifest = Get-Content (Join-Path $PSScriptRoot 'build-manifest.json') -Raw | ConvertFrom-Json
$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$env:SQLX_OFFLINE = 'true'
$env:RUSTFLAGS = '-C target-feature=+crt-static'
$env:CARGO_INCREMENTAL = '0'
$env:VITE_ENVIRONMENT_TYPE = 'production'
$env:NODE_OPTIONS = '--max-old-space-size=8192'

Push-Location (Join-Path $root 'frontend')
try {
  npm ci --ignore-scripts --no-audit --no-fund
  npx vitest run --config libs/components/moodboard/vite.config.ts --reporter=default --reporter=json "--outputFile=$output/unit-tests.json"
  npx tsc -b libs/components/moodboard/tsconfig.lib.json
} finally { Pop-Location }
Push-Location (Join-Path $root 'frontend/apps/artcraft')
try { npm run build } finally { Pop-Location }

# Keep the desktop CLI outside ArtCraft's checked-in dependency locks.
$cli = Join-Path $env:RUNNER_TEMP 'atlas-clarus-tauri-cli'
npm install --prefix $cli --ignore-scripts --no-audit --no-fund "@tauri-apps/cli@$($manifest.tauri_cli_version)"
$env:TAURI_FRONTEND_PATH = Join-Path $root 'frontend'
$env:TAURI_APP_PATH = Join-Path $root 'crates/desktop/artcraft'
Push-Location $env:TAURI_APP_PATH
try {
  & (Join-Path $cli 'node_modules/.bin/tauri.cmd') build --no-bundle --target $manifest.target -- --locked
} finally { Pop-Location }
$binary = Join-Path $root "target/$($manifest.target)/release/artcraft.exe"
if (-not (Test-Path $binary)) { throw 'Tauri returned without producing artcraft.exe.' }

$deliverable = Join-Path $output 'ArtCraft-ATLAS-Pilot'
New-Item -ItemType Directory -Path $deliverable -Force | Out-Null
Copy-Item $binary (Join-Path $deliverable 'ArtCraft-ATLAS-Pilot.exe')
Copy-Item (Join-Path $root 'frontend/libs/components/moodboard/src/lib/clarus/two-greens.clarus.json') $deliverable
Copy-Item (Join-Path $PSScriptRoot 'USER-README.txt') (Join-Path $deliverable 'BITTE-LESEN.txt')
Copy-Item (Join-Path $PSScriptRoot 'build-manifest.json') $deliverable
Copy-Item (Join-Path $root 'docs/atlas-clarus-pilot.md') $deliverable
Copy-Item (Join-Path $PSScriptRoot '*.patch') $deliverable
$licenses = Join-Path $deliverable 'licenses'
New-Item -ItemType Directory -Path $licenses -Force | Out-Null
Copy-Item (Join-Path $root 'LICENSE-MIT'),(Join-Path $root 'LICENSE-APACHE'),(Join-Path $root 'NOTICE') $licenses
Copy-Item (Join-Path $root 'frontend/libs/components/moodboard/src/lib/clarus/*NOTICE.txt') $licenses
Copy-Item (Join-Path $root 'frontend/libs/components/moodboard/src/lib/clarus/REFERENCE-DATA-ZLIB.txt') $licenses
$checksums = Get-ChildItem $deliverable -Recurse -File | Sort-Object FullName | ForEach-Object {
  $relative = [IO.Path]::GetRelativePath($deliverable, $_.FullName).Replace('\','/')
  "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $relative"
}
$checksums | Set-Content (Join-Path $deliverable 'SHA256SUMS.txt') -Encoding utf8NoBOM
Compress-Archive -Path $deliverable -DestinationPath (Join-Path $output 'ArtCraft-ATLAS-Pilot-0.41.0-clarus.0.2.1-windows-x64.zip') -Force
Write-Host 'Windows executable built. Native acceptance on the user machine is still required.'
