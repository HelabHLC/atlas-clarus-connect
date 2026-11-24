#!/usr/bin/env python3
"""Independent ICC implementation cross-check: ArgyllCMS xicclu vs LittleCMS.

Uses ArgyllCMS to evaluate the B2A1 ICC table directly. The source RGB8 →
D50 PCS Lab computation is implemented here from published sRGB linear
primaries (D50-adapted matrix), not via Pillow or LittleCMS.

This comparison is not an independent physical proof. Acceptance is frozen
at at most 3 integer steps out of 255 per C/M/Y/K output channel.
"""
import json, math, os, re, shutil, subprocess
from pathlib import Path

PROFILE=Path(os.environ['ATLAS_TEST_CMYK_ICC'])
RESULTS=Path(os.environ['ATLAS_WORKER_RESULTS_JSON'])
MAX_CHANNEL_ERROR_8=3
assert PROFILE.is_file() and RESULTS.is_file()
exe=shutil.which('xicclu')
if not exe: raise SystemExit('ARGYLL UNAVAILABLE: cannot claim independent CMM verification')
rows=json.loads(RESULTS.read_text())['rows']
assert len(rows)==3

def srgb_to_lab_d50(rgb):
    if len(rgb)!=3 or any(not isinstance(x,int) or x<0 or x>255 for x in rgb):
        raise ValueError('Source RGB8 invalid')
    r,g,b=[u/255/12.92 if u/255<=0.04045 else ((u/255+0.055)/1.055)**2.4 for u in rgb]
    # Linear sRGB → ICC PCS D50-adapted XYZ; D50 reference white.
    xyz=[
        .4360747*r+.3850649*g+.1430804*b,
        .2225045*r+.7168786*g+.0606169*b,
        .0139322*r+.0971045*g+.7141733*b
    ]
    white=(.96422,1.0,.82521)
    eps=216/24389
    f=lambda t: math.cbrt(t) if t>eps else ((24389/27)*t+16)/116
    fx,fy,fz=[f(v/w) for v,w in zip(xyz,white)]
    return (116*fy-16,500*(fx-fy),200*(fy-fz))

labs=[srgb_to_lab_d50(row['rgb8']) for row in rows]
src='\n'.join(' '.join(f'{v:.8f}' for v in lab) for lab in labs)+'\n'
cmd=[exe,'-v0','-fb','-ir','-pl','-s255',str(PROFILE)]
run=subprocess.run(cmd,input=src,text=True,capture_output=True,timeout=90)
if run.returncode:
    raise RuntimeError(f'ArgyllCM xicclu exit {run.returncode}: {run.stderr[-1600:]}')
lines=[ln.strip() for ln in run.stdout.splitlines() if ln.strip()]
if len(lines)!=len(rows):
    raise ValueError(f'Argyll output count {len(lines)} vs {len(rows)}: {run.stdout[:2000]!r}')
results=[]
pattern=r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?'
for row,lab,line in zip(rows,labs,lines):
    payload=line.split('->')[-1]
    values=[float(v) for v in re.findall(pattern,payload)]
    if len(values)!=4 or any(not math.isfinite(v) or v<0 or v>255 for v in values):
        raise ValueError(f'Argyll output not interpretable as CMYK8: {line!r}')
    rounded=[round(v) for v in values]
    actual=[round(v/257) for v in row['cmyk16']]
    differences=[abs(a-b) for a,b in zip(rounded,actual)]
    result={
      'atlas_row_id':row['row_id'],'hlc':row['hlc'],
      'source_rgb8':row['rgb8'],'pcs_lab_d50':[round(v,6) for v in lab],
      'argyll_cmyk8':[round(v,3) for v in values],
      'littlecms_cmyk8':actual,
      'abs_channel_errors':differences,
      'pass':all(d<=MAX_CHANNEL_ERROR_8 for d in differences)
    }
    results.append(result)
    print('Independent CMM comparison',json.dumps(result,ensure_ascii=False),flush=True)
assert all(x['pass'] for x in results),f'INDEPENDENT CMM GATE FAILED; tolerance ±{MAX_CHANNEL_ERROR_8}/255'
print(f'PASS: ArgyllCMS independent ICC table evaluation vs LittleCMS CMYK16, tolerance ±{MAX_CHANNEL_ERROR_8}/255',flush=True)
print('NOTE: output colour equivalence only, not measured substrate proof / customer acceptance',flush=True)
