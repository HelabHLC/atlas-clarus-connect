"""Independent inspection of actual cross-tool exchange ZIPs."""
import base64,hashlib,io,json,sys,zipfile
from pathlib import Path
sha=lambda b:hashlib.sha256(b).hexdigest()
folders=[Path(p) for p in sys.argv[1:]] or [Path('/tmp/atlas-tool-exchange-core'),Path('/tmp/atlas-tool-exchange-browser')]
checked=0
for folder in folders:
    archive=folder/'exchange.zip'
    if not archive.exists():continue
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        manifest=json.loads(z.read('exchange.json'))
        docs=manifest['documents'];assert manifest['schema']=='atlas-clarus-tool-exchange/1.0'
        assert set(z.namelist())=={'exchange.json',*['payloads/'+d['id']+'.bin' for d in docs]}
        seen=set();kinds=set();payloads=[];profiles=0
        for d in docs:
            assert d['id'] not in seen and all(p in seen for p in d['parents'])
            seen.add(d['id']);kinds.add(d['kind']);b=z.read('payloads/'+d['id']+'.bin');payloads.append(b)
            assert len(b)==d['size_bytes'] and sha(b)==d['sha256']
            if d['kind']=='REDUCTION_JOB':
                with zipfile.ZipFile(io.BytesIO(b)) as job:
                    assert job.testzip() is None
                    jm=json.loads(job.read('job-package-manifest.json'))
                    for name,digest in jm['files'].items():assert sha(job.read(name))==digest
            if d['kind']=='PRINT_HANDOFF':
                native=json.loads(b)
                assert native['master_sha256']==manifest['master_sha256']
                assert [p['path_id'] for p in native['production_paths']]==['4C','ECG']
                for p in native['production_paths']:
                    if p['profile']:
                        icc=base64.b64decode(p['profile']['data_base64'],validate=True)
                        assert sha(icc)==p['profile']['sha256'];profiles+=1
        original=(folder/'original-palette.json').read_bytes()
        assert original in payloads,'Original file bytes were not retained'
        source=json.loads(original)
        assert source['source_assignments'][0]['source_rgb']==[61,123,25]
        assert source['source_assignments'][1]['source_rgb']==[60,123,25]
        assert source['source_assignments'][0]['atlas_row_id']==source['source_assignments'][1]['atlas_row_id']==4966
        assert {'REFERENCE_PALETTE','COLOUR_DECISIONS','COLOUR_PROJECT','IMAGE_PROJECT','REDUCTION_JOB','PRINT_HANDOFF','DECISION_CARD'}<=kinds
        if (folder/'downloaded-original.json').exists():assert (folder/'downloaded-original.json').read_bytes()==original
        if (folder/'reopened-original.json').exists():assert (folder/'reopened-original.json').read_bytes()==original
        print(f'PASS {folder.name}: {len(docs)} complete documents, all CRC/SHA and DAG links, exact original bytes, two distinct source greens, {profiles} embedded ICC files')
        checked+=1
assert checked>=1,'No exchange exports checked'
