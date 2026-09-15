# ATLAS RC22 Basis-23 × CHSOS – reproduzierbarer Neuaufbau

Dieses Arbeitsmodul rekonstruiert den verlorenen CHSOS-Merge als neuen,
deterministischen Rechenlauf. Es behält jede vorhandene Basis-23-Rezeptur bei,
sofern kein Kandidat mit kleinerem ΔE00 gefunden wird.

## Evidenzgrenze

Alle Ergebnisse sind `MODEL_ONLY`, `NOT_MEASURED` und nicht für eine
Produktionsfreigabe geeignet. Die Suche liefert den besten gefundenen
heuristischen Kandidaten, keinen Beweis eines globalen Optimums.

## Aufruf

```bash
python rebuild_chsos_merge.py \
  --rc22-data work/rc22_bundle/atlas-clarus-browser-bundle/assets/basis23-data.js \
  --atlas-data work/rc22_bundle/atlas-clarus-browser-bundle/assets/atlas-data.js \
  --basis23 work/basis23/outputs/ATLAS_CombinedBasis23_FullBenchmark_v0_8/basis23.json \
  --chsos-xlsx inputs/CHSOS_Lab_D50_2deg_Vollspektren_v0_1.xlsx \
  --output outputs/ATLAS_RC22_Basis23_CHSOS_Merged_Recipes_v0_1.json
```

Der Standardlauf verwendet den festen Seed `20260915`, einen dokumentierten
Kandidatenpool und kontinuierliche SLSQP-Feinoptimierung für höchstens vier
Komponenten. Jede Ausgabe enthält die SHA-256-Werte aller Eingaben.
