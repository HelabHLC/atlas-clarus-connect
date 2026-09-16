#!/usr/bin/env python3
"""Strict structural and evidence-boundary audit for the rebuilt merge JSON."""
import argparse, collections, hashlib, json, math
from pathlib import Path

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()

ap=argparse.ArgumentParser()
ap.add_argument('input',type=Path)
ap.add_argument('--audit-json',type=Path,required=True)
ap.add_argument('--report-md',type=Path,required=True)
a=ap.parse_args()
d=json.loads(a.input.read_text(encoding='utf-8')); rows=d['rows']; errors=[]
if len(rows)!=13283: errors.append(f'row_count={len(rows)}')
if [r.get('source_atlas_row_id') for r in rows]!=list(range(13283)): errors.append('atlas_row_id_sequence')
improved=[]; usage=collections.Counter(); comp=collections.Counter(); rescued=0
for r in rows:
    de=float(r['de00'])
    if not math.isfinite(de) or de<0: errors.append(f"invalid_de00:{r.get('source_atlas_row_id')}")
    cs=r['components']; comp[len(cs)]+=1
    total=sum(float(c['percent']) for c in cs)
    # Stored RC22 source recipes use three-decimal percentages and explicitly
    # permit component_count * 0.0005 percentage-point rounding error.
    tolerance = len(cs) * 0.0005 + 1e-8 if r.get('merge_decision')=='RETAINED_BASIS23' else 1e-4
    if abs(total-100)>tolerance: errors.append(f"component_sum:{r['source_atlas_row_id']}:{total}")
    if not 1<=len(cs)<=4: errors.append(f"component_count:{r['source_atlas_row_id']}")
    if r.get('measured_qc_status')!='NOT_MEASURED' or r.get('production_approval')!='NOT_SUPPORTED':
        errors.append(f"evidence_boundary:{r['source_atlas_row_id']}")
    if r.get('merge_decision')=='IMPROVED_WITH_CHSOS_GORGIAS':
        improved.append(r)
        new=[c for c in cs if c.get('source_family')=='CHSOS_GORGIAS_FORS']
        if not new or min(float(c['percent']) for c in cs)<0.5-1e-6:
            errors.append(f"chsos_binding:{r['source_atlas_row_id']}")
        if de>float(r['previous_basis23_de00'])+1e-9: errors.append(f"regression:{r['source_atlas_row_id']}")
        if float(r['previous_basis23_de00'])>5 and de<=5: rescued+=1
        for c in new: usage[c['name']]+=1
audit={
 'status':'PASS' if not errors else 'FAIL','dataset_sha256':sha(a.input),'row_count':len(rows),
 'within_de00_5':sum(float(r['de00'])<=5 for r in rows),'outside_de00_5':sum(float(r['de00'])>5 for r in rows),
 'improved_rows':len(improved),'rescued_to_le5':rescued,'regressions':sum(e.startswith('regression:') for e in errors),
 'component_distribution':dict(sorted(comp.items())),'top_new_chsos_usage':usage.most_common(20),
 'evidence_status':'MODEL_ONLY_NOT_PHYSICALLY_VALIDATED','errors':errors[:100]
}
a.audit_json.parent.mkdir(parents=True,exist_ok=True)
a.audit_json.write_text(json.dumps(audit,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
report=f'''# ATLAS RC22 Basis-23 × CHSOS — Rebuild-Bericht v0.1

## Ergebnis

- ATLAS-Referenzen: **{len(rows):,}**
- ΔE00 ≤ 5: **{audit['within_de00_5']:,} ({audit['within_de00_5']/len(rows)*100:.2f} %)**
- außerhalb: **{audit['outside_de00_5']:,}**
- gegenüber RC22 verbessert: **{len(improved):,}**
- frühere Lücken geschlossen: **{rescued:,}**
- Verschlechterungen: **{audit['regressions']}**
- Strukturaudit: **{audit['status']}**

## Einordnung

Dies ist ein neuer deterministischer Rebuild, keine Wiederherstellung des
verlorenen früheren Laufs mit 1.893 Verbesserungen und 12.248 Treffern. Der
neue Suchraum und die neue Kandidatenauswahl liefern 12.394 rechnerische
Treffer. Die beiden Ergebnisse dürfen nicht gleichgesetzt werden.

Alle Rezepturen sind `MODEL_ONLY`, `NOT_MEASURED` und `NOT_SUPPORTED` für eine
Produktionsfreigabe. Das Kubelka–Munk-Modell behandelt die Quelldaten als
kompatible opake Reflexionsendglieder; Bindemittel, Untergrund, Schichtdicke,
Konzentration und Messgeometrie sind nicht ausreichend harmonisiert. Deshalb
ist das Ergebnis ein Forschungsdatensatz, keine physisch validierte
Mischrezeptur.

## Reproduzierbarkeit

- Methode: `{d['registry']['method']}`
- Seed: `{d['registry']['seed']}`
- Kandidaten: `{d['registry']['random_candidate_count']:,}` plus vollständige 1C/2C-Startmenge
- KD-Tree-Nachbarn je Ziel: `{d['registry']['query_k']}`
- maximale Komponenten: 4
- Mindestanteil je verbleibender Komponente: 0,5 %
- Ergebnis-SHA-256: `{audit['dataset_sha256']}`
'''.replace(',', '.')
a.report_md.write_text(report,encoding='utf-8')
print(json.dumps(audit,indent=2,ensure_ascii=False))
raise SystemExit(0 if not errors else 1)
