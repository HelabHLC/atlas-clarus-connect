#!/usr/bin/env python3
"""Deterministic CHSOS-only acrylic-assumption recipe rebuild."""
import argparse, gzip, hashlib, importlib.util, json, multiprocessing as mp, sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE=Path(__file__).resolve().parent
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
VERSION='ATLAS_CHSOS_ACRYLIC_MODEL_v0_1'
M=BASIS=SUPPORTS=WEIGHTS=KS=CM=TARGETS=NEAR=ATLAS=None

def module():
    s=importlib.util.spec_from_file_location('rebuild',HERE/'rebuild_chsos_merge.py')
    m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()

def solve(row_id):
    target=TARGETS[row_id]; best=None; seen=set()
    for pi in NEAR[row_id]:
        key=tuple(sorted(int(x) for x in SUPPORTS[pi] if x>=0))
        if key in seen: continue
        seen.add(key)
        parts,de,_=M.refine(SUPPORTS[pi],WEIGHTS[pi],KS,target,CM)
        if best is None or de<best[1]: best=(parts,de)
    parts,de=best; components=[]
    for idx,fraction in parts:
        b=BASIS[int(idx)]; family='CHSOS' if b['source_family']=='CHSOS_GORGIAS_FORS' else b['source_family']
        components.append({'basis_id':b['basis_id'],'name':b['sample_title'],'percent':round(float(fraction)*100,6),
            'source_family':family,'source_url':'https://chsopensource.org/products/pigments-checker/'})
    return {'source_atlas_row_id':row_id,'reference':ATLAS['colors'][row_id]['ref'],'basis_version':VERSION,
      'component_count':len(components),'components':components,'de00':round(float(de),9),'computational_tolerance':5.0,
      'computational_tolerance_status':'WITHIN_COMPUTATIONAL_TOLERANCE' if de<=5 else 'OUTSIDE_COMPUTATIONAL_TOLERANCE',
      'search_optimality':'BEST_FOUND_HEURISTIC_NOT_GLOBAL_PROOF','material_assumption':'ASSUMED_COMMON_ACRYLIC_BINDER',
      'fraction_semantics':'MODEL_FRACTIONS_NOT_GRAVIMETRIC_RECIPE','measured_qc_status':'NOT_MEASURED','production_approval':'NOT_SUPPORTED'}

ap=argparse.ArgumentParser()
ap.add_argument('--merged-gzip',type=Path,required=True)
ap.add_argument('--atlas-data',type=Path,required=True)
ap.add_argument('--chsos-xlsx',type=Path,required=True)
ap.add_argument('--output',type=Path,required=True)
ap.add_argument('--random-candidates',type=int,default=250000)
ap.add_argument('--query-k',type=int,default=6)
ap.add_argument('--seed',type=int,default=20260915)
a=ap.parse_args(); m=module()

with gzip.open(a.merged_gzip,'rt',encoding='utf-8') as f: merged=json.load(f)
atlas=m.read_js_assignment(a.atlas_data,'window.ATLAS_CLARUS_DATA=')
_,cm=m.load_chsos_xlsx(a.chsos_xlsx)
basis=[b for b in merged['basis_registry'] if b.get('source_family') in {'CHSOS','CHSOS_SUPPLEMENT','CHSOS_GORGIAS_FORS'}]
if len(basis)!=87: raise SystemExit(f'Expected 87 CHSOS colorants, got {len(basis)}')
if atlas['master_sha256']!=MASTER or len(atlas['colors'])!=13283: raise SystemExit('ATLAS binding failed')

rng=np.random.default_rng(a.seed); supports=[]; weights=[]; n=len(basis)
for i in range(n):
    supports.append(np.array([i,-1,-1,-1])); weights.append(np.array([1.,0,0,0]))
for i in range(n):
    for j in range(i+1,n):
        for pct in range(10,100,10):
            supports.append(np.array([i,j,-1,-1])); weights.append(np.array([pct/100,1-pct/100,0,0]))
for _ in range(a.random_candidates):
    k=3 if rng.random()<.35 else 4; idx=rng.choice(n,k,replace=False); w=rng.dirichlet(np.ones(k))
    s=np.full(4,-1,dtype=np.int32); q=np.zeros(4); s[:k]=idx; q[:k]=w
    supports.append(s); weights.append(q)
supports=np.vstack(supports).astype(np.int32); weights=np.vstack(weights)
ks=m.km_from_reflectance(np.array([b['reflectance_400_700'] for b in basis]))
labs=m.pool_labs(supports,weights,ks,cm); tree=cKDTree(labs)
targets=np.array([c['lab'] for c in atlas['colors']],float)
_,near=tree.query(targets,k=min(a.query_k,len(labs)))
if near.ndim==1: near=near[:,None]

M=m; BASIS=basis; SUPPORTS=supports; WEIGHTS=weights; KS=ks; CM=cm; TARGETS=targets; NEAR=near; ATLAS=atlas
rows=[]
with mp.get_context('fork').Pool(min(8,mp.cpu_count())) as pool:
    for row_id,row in enumerate(pool.imap(solve,range(len(targets)),chunksize=16)):
        rows.append(row)
        if (row_id+1)%500==0: print(f'{row_id+1}/13283',file=sys.stderr)

within=sum(r['de00']<=5 for r in rows)
registry={'dataset':'ATLAS_CHSOS_Acrylic_Model_v0_1','created_utc':datetime.now(timezone.utc).isoformat(),
 'atlas_master_sha256':MASTER,'basis_version':VERSION,'basis_count':len(basis),'rows':len(rows),
 'within_de00_5':within,'outside_de00_5':len(rows)-within,'method':'KS_PROXY_D50_2DEG_400_700_CHSOS_ONLY_V1',
 'seed':a.seed,'random_candidate_count':a.random_candidates,'query_k':a.query_k,
 'material_assumption':'ASSUMED_COMMON_ACRYLIC_BINDER','status':'MODEL_ONLY_NOT_PHYSICALLY_VALIDATED',
 'input_sha256':{'merged_gzip':sha(a.merged_gzip),'atlas_data':sha(a.atlas_data),'chsos_xlsx':sha(a.chsos_xlsx)}}
payload={'registry':registry,'basis_registry':basis,'rows':rows}
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
registry['dataset_sha256']=sha(a.output)
print(json.dumps(registry,indent=2,ensure_ascii=False))