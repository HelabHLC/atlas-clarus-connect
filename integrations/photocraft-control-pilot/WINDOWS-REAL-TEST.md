# Windows real-test quick start

This is the first user-operated PhotoCraft × ATLAS Clarus acceptance test.

## 1. Get PhotoCraft

Use the official **PhotoCraft v0.8.2 Windows x64 portable ZIP** or the installed v0.8.2 desktop app. The commands used by Pilot 0.1 are present in v0.8.2.

## 2. Start the local control channel

From PowerShell in this repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\integrations\photocraft-control-pilot\start-windows.ps1 -PhotoCraftExe "C:\PATH\TO\photocraft.exe"
```

PhotoCraft listens only on `127.0.0.1:7878` and uses a 256-bit token stored under your user profile.

## 3. Open the deterministic fixture

In PhotoCraft choose **File → Open** and open:

`integrations\photocraft-control-pilot\synthetic-test.ppm`

The fixture is 10×10 pixels. Known points:

| x | y | source RGB | expected ATLAS |
|---:|---:|---|---|
| 2 | 3 | #3D7B19 | H130_L045_C055 · row 4966 · #37791A · d² 41 |
| 3 | 3 | #3C7B19 | H130_L045_C055 · row 4966 · #37791A · d² 30 |
| 6 | 6 | #E1C019 | H090_L080_C075 · row 3259 · #E2C423 · d² 117 |
| 7 | 6 | #ECD61E | H095_L085_C080 · row 3446 · #E6D71F · d² 38 |

## 4. Capture the first real PhotoCraft pixel

```powershell
powershell -ExecutionPolicy Bypass -File .\integrations\photocraft-control-pilot\capture-windows.ps1
```

The default is coordinate `2,3`.

Expected source:

`#3D7B19`

Expected fixed ATLAS assignment:

`H130_L045_C055` · `atlas_row_id 4966` · `#37791A` · `distance_squared 41`

The script writes:

`integrations\photocraft-control-pilot\photocraft-real-test-x2-y3.atlas.json`

Upload that JSON for independent comparison.

## 5. Optional remaining pixels

```powershell
powershell -ExecutionPolicy Bypass -File .\integrations\photocraft-control-pilot\capture-windows.ps1 -X 3 -Y 3
powershell -ExecutionPolicy Bypass -File .\integrations\photocraft-control-pilot\capture-windows.ps1 -X 6 -Y 6
powershell -ExecutionPolicy Bypass -File .\integrations\photocraft-control-pilot\capture-windows.ps1 -X 7 -Y 6
```

## What counts as PASS

A real PASS requires all of the following:

- PhotoCraft's control server accepts the authenticated local request.
- The returned source RGB equals the known fixture RGB.
- The ATLAS assignment equals the fixed full-master winner.
- The master SHA remains fixed.
- The scratch duplicate is closed.
- The original PhotoCraft document revision remains unchanged.
- The record remains `COMPUTATIONAL_ONLY`, `NOT_MEASURED` and `NOT_SIGNED`.

No physical or production approval is implied.
