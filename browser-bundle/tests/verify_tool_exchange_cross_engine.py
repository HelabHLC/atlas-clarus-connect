import base64,hashlib,io,json,sys,zipfile
from pathlib import Path
folder=Path(sys.argv[1]);sha=lambda b:hashlib.sha256(b).hexdigest()
r=json.loads((folder/'report.json').read_text());assert r['status']=='PASS' and len(r['cases'])==126
checked=profiles=0
for p in sorted(folder.glob('*.zip')):
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  m=json.loads(z.read('exchange.json'));seen=set();images=[];jobs=[]
  assert m['schema']=='atlas-clarus-tool-exchange/1.0'
  assert set(z.namelist())=={'exchange.json',*['payloads/'+d['id']+'.bin' for d in m['documents']]}
  for d in m['documents']:
   assert d['id'] not in seen and all(k in seen for k in d['parents']);seen.add(d['id'])
   b=z.read('payloads/'+d['id']+'.bin');assert sha(b)==d['sha256'] and len(b)==d['size_bytes']
   if d['kind']=='IMAGE_PROJECT':
    image=json.loads(b);o=image['original'];assert sha(base64.b64decode(o['file_base64'],validate=True))==o['file_sha256'];assert sha(base64.b64decode(o['rgba_base64'],validate=True))==o['rgba_sha256']
    assert [h['operation']['kind'] for h in image['history']]==['RECOLOUR','UNDO','REDO'];images.append(image)
   if d['kind']=='PRINT_HANDOFF':
    printdoc=json.loads(b)
    for v in printdoc['production_paths']:
     profile=v['profile'];assert sha(base64.b64decode(profile['data_base64'],validate=True))==profile['sha256'];profiles+=1
   if d['kind']=='REDUCTION_JOB':
    with zipfile.ZipFile(io.BytesIO(b)) as j:
     assert j.testzip() is None
     jm=json.loads(j.read('job-package-manifest.json'))
     for name,digest in jm['files'].items():assert sha(j.read(name))==digest
     state=json.loads(j.read('job.json'));binary=lambda v:j.read(v['$binary'])
     a=binary(state['input']['rgba']);out=binary(state['result']['pixels']);mask=binary(state['result']['protectionMask']);w=state['input']['width']
     assert state['settings']['protectedRectangles']==[[0,0,3,3]]
     for y in range(4):
      for x in range(4):
       at=y*w+x;assert mask[at]==1 and a[at*4:at*4+4]==out[at*4:at*4+4]
     jobs.append(state['input']['project']['document_sha256'])
  assert len(images)==len(jobs)==1 and images[0]['document_sha256']==jobs[0]
  name=images[0]['original']['name'];assert images[0]['original']['file_sha256']==r['fixture_hashes'][name]
  checked+=1
assert checked==42 and profiles==84
for c in r['cases']:
 assert c['actual']==c['expected'];assert sha((folder/(c['from']+'-'+c['fixture']+'.zip')).read_bytes())==c['input_sha256']
 assert c.get('complete_payloads_exact') if c['actual']=='ACCEPT' else c.get('workspace_preserved')
assert len(r['unsaved'])==3 and all(all(v for k,v in s.items() if k!='engine') for s in r['unsaved'])
print(json.dumps({'status':'PASS','packages':checked,'embedded_profiles':profiles,'transfers':len(r['cases']),'protected_rgba_exact':True,'original_file_and_rgba_hashes':True,'crc_sha_and_parent_links':True,'unsaved_engines':len(r['unsaved'])}))
