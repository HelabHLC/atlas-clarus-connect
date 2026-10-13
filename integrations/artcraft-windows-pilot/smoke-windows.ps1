param(
  [Parameter(Mandatory=$true)][string]$Executable,
  [Parameter(Mandatory=$true)][string]$ResultFile
)
$ErrorActionPreference = 'Stop'
$original = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Artcraft'
$pilot = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Artcraft-ATLAS-Pilot'
if (Test-Path $original) { throw 'Run this smoke check in a fresh CI account.' }
New-Item -ItemType Directory -Path $original | Out-Null
$sentinel = Join-Path $original 'do-not-change.txt'
[IO.File]::WriteAllText($sentinel, 'Original ArtCraft profile sentinel')
$before = (Get-FileHash $sentinel -Algorithm SHA256).Hash
$process = $null
$status = 'FAIL'
try {
  $process = Start-Process -FilePath (Resolve-Path $Executable).Path -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds(40)
  do {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw "Native process exited early: $($process.ExitCode)" }
  } until (($process.MainWindowHandle -ne 0 -and (Test-Path $pilot)) -or [DateTime]::UtcNow -gt $deadline)
  if ($process.MainWindowHandle -eq 0) { throw 'No native application window appeared.' }
  if (-not (Test-Path $pilot)) { throw 'Pilot data directory was not created.' }
  if ((Get-FileHash $sentinel -Algorithm SHA256).Hash -ne $before) { throw 'Original profile sentinel changed.' }
  if (@(Get-ChildItem $original -Recurse -File).Count -ne 1) { throw 'The native app wrote into the original profile.' }
  $status = 'PASS'
} finally {
  if ($process -and -not $process.HasExited) {
    $null = $process.CloseMainWindow()
    if (-not $process.WaitForExit(5000)) { $process.Kill() }
  }
  if ((Get-FileHash $sentinel -Algorithm SHA256).Hash -ne $before -or
      @(Get-ChildItem $original -Recurse -File).Count -ne 1) {
    $status = 'FAIL'
  }
  @{
    status=$status
    scope='Native startup, visible window, separate application data folder, original-profile sentinel'
    limitation='Does not exercise the import UI in WebView2 or replace testing on Windows 10 build 19045.'
  } | ConvertTo-Json | Set-Content $ResultFile -Encoding utf8NoBOM
}
if ($status -ne 'PASS') { throw 'Native startup or profile isolation check failed.' }
