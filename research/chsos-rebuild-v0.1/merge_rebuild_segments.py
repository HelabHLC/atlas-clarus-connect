#!/usr/bin/env python3
"""Merge and validate deterministic row-range outputs from rebuild_chsos_merge."""
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()

ap=argparse.ArgumentParser()
ap.add_argument('--output',type=Path,required=True)
ap.add_argument('segments',type=Path,nargs='+')
a=ap.parse_args()
docs=[json.loads(p.read_text(encoding='utf-8')) for p in a.segments]
docs.sort(key=lambda d:d['registry']['row_range'][0])
expected=0; rows=[]
for d in docs:
    start,end=d['registry']['row_range']
    if start!=expected or len(d['rows'])!=end-start: raise SystemExit(f'Gap/overlap at {start}:{end}')
    rows.extend(d['rows']); expected=end
if expected!=13283: raise SystemExit(f'Expected 13283 rows, got {expected}')
ids=[r['source_atlas_row_id'] for r in rows]
if ids!=list(range(13283)): raise SystemExit('atlas_row_id sequence invalid')
if any(float(r['de00'])>float(r.get('previous_basis23_de00',r['de00']))+1e-9 for r in rows):
    raise SystemExit('Regression detected')
reg=dict(docs[0]['registry'])
reg.update({'created_utc':datetime.now(timezone.utc).isoformat(),'row_range':[0,13283],
 'rows':13283,'within_de00_5':sum(float(r['de00'])<=5 for r in rows),
 'outside_de00_5':sum(float(r['de00'])>5 for r in rows),
 'improved_rows':sum(r.get('merge_decision')=='IMPROVED_WITH_CHSOS_GORGIAS' for r in rows),
 'rescued_to_le5':sum(float(r.get('previous_basis23_de00',r['de00']))>5 and float(r['de00'])<=5 for r in rows),
 'regressions':0,'segment_sha256':{p.name:digest(p) for p in a.segments}})
out={'registry':reg,'basis_registry':docs[0]['basis_registry'],'rows':rows}
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(reg,indent=2,ensure_ascii=False))
