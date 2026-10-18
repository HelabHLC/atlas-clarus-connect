#!/usr/bin/env python3
"""Verify captured source evidence offline and install additive master-ID views."""
import csv,gzip,hashlib,json
from pathlib import Path
from build_process_libraries import parse
ROOT=Path(__file__).resolve().parent

def install():
 doc=json.loads((ROOT/'GAMUTMAP_CATALOG.json').read_text());assert hashlib.sha256(gzip.decompress((ROOT/'catalog-sources/catalog.html.gz').read_bytes())).hexdigest()==doc['catalog_sha256'];mp=ROOT.parent/'hover-library/data/colors.json';before=mp.read_bytes();m=json.loads(before);byref={x['ref']:x['id'] for x in m['colors']};assert doc['master_sha256']==m['master_sha256'] and len(byref)==13283
 atlas=set(byref);records={r['filter_id']:r for r in doc['filters']};assert len(records)==78
 for r in records.values():
  sets=[]
  for suffix in ['single','atlas']:
   p=ROOT/'catalog-sources'/f"{r['filter_id']}-{suffix}.json.gz";assert hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest()==r['source_sha256'][suffix];refs,_=parse(p.with_suffix(''));sets.append(refs)
  assert sets[1]==atlas&sets[0];r['ids']=sorted(byref[x] for x in sets[1]);assert len(r['ids'])==r['entry_count']>0
 assert records[204]['ids']==sorted(byref.values())
 assert records[206]['ids']==records[186]['ids'],'sRGB HEX must match sRGB before aliasing'
 vp=ROOT.parent/'hover-library/data/views.json';v=json.loads(vp.read_text());views=v['views'];old={k:(x['name'],x['ids']) for k,x in views.items()}
 for r in records.values():
  fid=r['filter_id']
  if fid in [204,206]:continue
  key={148:'pso_coated_v3_fogra51',140:'pso_uncoated_v3_fogra52'}.get(fid,f'gamutmap_{fid}')
  if key in views:assert views[key]['ids']==r['ids'];continue
  group=r['category']+(' historical' if r['historical'] else '')
  views[key]={'name':f"ATLAS – {r['source_name']} [{group}]",'type':'SOURCE_DECLARED_GAMUT_MEMBERSHIP','status':'Gamutmap selection · not measured','ids':r['ids'],'entry_count':r['entry_count'],'source_n':r['entry_count'],'gamutmap_filter_ids':[204,fid],'source_response_sha256':r['source_sha256']['atlas'],'source_category':r['category'],'historical':r['historical'],'measured_qc_status':'NOT_MEASURED','identity_change':'NONE','note':'GamutMap snapshot 2026-10-18. Exact HLC join with frozen master. No RGB replacement or production approval.'}
 for key,(name,ids) in old.items():assert views[key]['name']==name and views[key]['ids']==ids
 legacy=json.loads((ROOT/'legacy-view-baseline.json').read_text())
 for key,original in legacy.items():
  assert all(views[key][field]==value for field,value in original.items())
  views[key].update(hidden_from_new_selection=True,lifecycle='LEGACY_RETAINED',legacy_notice='Retained only for existing work; unavailable for new selections.')
 v['gamutmap_catalog']={'snapshot':'2026-10-18','source_filters':78,'aliases':{'204':'core','206':'gamutmap_186'},'master_unchanged':True}
 vp.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n');assert mp.read_bytes()==before
 with (ROOT/'CATALOG_COUNTS.csv').open('w',newline='') as f:
  w=csv.writer(f);w.writerow(['source_filter_id','source_name','category','historical','atlas_references']);w.writerows([r['filter_id'],r['source_name'],r['category'],r['historical'],r['entry_count']] for r in records.values())
 print('PASS: 78 source filters verified, 74 additional views installed;',len(views),'total views; master unchanged')
if __name__=='__main__':install()
