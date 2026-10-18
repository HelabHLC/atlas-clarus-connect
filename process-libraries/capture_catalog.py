#!/usr/bin/env python3
"""Capture every advertised GamutMap filter; retain exact source bytes and validate joins."""
import concurrent.futures,gzip,hashlib,html,json,re,urllib.request,urllib.parse
from pathlib import Path
from build_process_libraries import parse
ROOT=Path(__file__).resolve().parent
DEST=ROOT/'catalog-sources';DEST.mkdir(exist_ok=True)
def fetch(data=None):
 req=urllib.request.Request('https://www.gamutmap.de/'+('site/ajax' if data else ''),data=urllib.parse.urlencode(data).encode() if data else None)
 with urllib.request.urlopen(req,timeout=90) as r:return r.read()
def save(p,b):p.write_bytes(gzip.compress(b,mtime=0))
def digest(b):return hashlib.sha256(b).hexdigest()
def capture():
 raw=gzip.decompress((DEST/'catalog.html.gz').read_bytes()) if (DEST/'catalog.html.gz').exists() else fetch();save(DEST/'catalog.html.gz',raw);s=raw.decode();items=[]
 for m in re.finditer(r'<input\s+type="checkbox"\s+name="filter\[\]"\s+value="([^"]+)"\s+data-id="(\d+)"',s):
  name,id=html.unescape(m[1]),int(m[2]);group='LAB' if id in (202,204) else 'RGB' if m.start()<s.index('>CMYK</span>') else 'CMYK';old=group=='CMYK' and m.start()>s.index('>Alte Standards</span>');items.append({'source_name':name,'filter_id':id,'category':group,'historical':old})
 assert len(items)==78 and len({x['filter_id'] for x in items})==78
 atlas,_=parse(ROOT/'sources/atlas.json');master=json.loads((ROOT.parent/'hover-library/data/colors.json').read_text());byref={r['ref']:r['id'] for r in master['colors']};assert atlas==set(byref)
 def work(item):
  id=item['filter_id'];sets=[];hashes={}
  for suffix,ids in [('single',[id]),('atlas',[204,id])]:
   p=DEST/f'{id}-{suffix}.json.gz'
   if not p.exists():
    data=[('ajax','1'),('action','setfilter')]+[('filterId[]',str(i)) for i in dict.fromkeys(ids)];save(p,fetch(data))
   refs,_=parse(p.with_suffix(''));sets.append(refs);hashes[suffix]=digest(gzip.decompress(p.read_bytes()))
  assert sets[1]==atlas&sets[0],id
  item.update(entry_count=len(sets[1]),source_sha256=hashes,validation='PASS',master_sha256=master['master_sha256'],measured_qc_status='NOT_MEASURED')
  return item
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for item in pool.map(work,items):results.append(item);print(item['filter_id'],item['entry_count'],item['source_name'],flush=True)
 doc={'schema':'ATLAS_GAMUTMAP_CATALOG_V1','captured_date':'2026-10-18','source':'https://www.gamutmap.de/','catalog_sha256':digest(raw),'master_sha256':master['master_sha256'],'master_rows':len(byref),'identity_change':'NONE','method':'Exact HLC identifier intersection; independent single-filter and combined-filter membership must agree','filters':results}
 (ROOT/'GAMUTMAP_CATALOG.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
 print('PASS',len(results),'filters',flush=True)
if __name__=='__main__':capture()
