# ATLAS RC22 Basis-23 × CHSOS — Rebuild-Bericht v0.1

## Ergebnis

- ATLAS-Referenzen: **13.283**
- ΔE00 ≤ 5: **12.394 (93.31 %)**
- außerhalb: **889**
- gegenüber RC22 verbessert: **10.074**
- frühere Lücken geschlossen: **801**
- Verschlechterungen: **0**
- Strukturaudit: **PASS**

## Einordnung

Dies ist ein neuer deterministischer Rebuild. keine Wiederherstellung des
verlorenen früheren Laufs mit 1.893 Verbesserungen und 12.248 Treffern. Der
neue Suchraum und die neue Kandidatenauswahl liefern 12.394 rechnerische
Treffer. Die beiden Ergebnisse dürfen nicht gleichgesetzt werden.

Alle Rezepturen sind `MODEL_ONLY`. `NOT_MEASURED` und `NOT_SUPPORTED` für eine
Produktionsfreigabe. Das Kubelka–Munk-Modell behandelt die Quelldaten als
kompatible opake Reflexionsendglieder; Bindemittel. Untergrund. Schichtdicke.
Konzentration und Messgeometrie sind nicht ausreichend harmonisiert. Deshalb
ist das Ergebnis ein Forschungsdatensatz. keine physisch validierte
Mischrezeptur.

## Reproduzierbarkeit

- Methode: `KS_PROXY_D50_2DEG_400_700_V2_REBUILD`
- Seed: `20260915`
- Kandidaten: `250.000` plus vollständige 1C/2C-Startmenge
- KD-Tree-Nachbarn je Ziel: `6`
- maximale Komponenten: 4
- Mindestanteil je verbleibender Komponente: 0.5 %
- Ergebnis-SHA-256: `f6ce60d1b08e453924e45fb4a5a95e0887ec0bd1f3fcc4531c51b72cbe5355c7`
