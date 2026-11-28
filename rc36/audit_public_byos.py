"""RC36 Public BYOS: first-pass inventory, NOT legal clearance.
Run on an unpacked release directory. No files are modified.
Exit 2 if ICC candidates, opaque containers or profile bank review remain.
"""
import argparse, base64, hashlib, json, re
from pathlib import Path

def digest(data):
    return hashlib.sha256(data).hexdigest()

def profiles(data):
    for m in re.finditer(b'acsp', data):
        start=m.start()-36
        if start<0 or start+128>len(data):
            continue
        size=int.from_bytes(data[start:start+4],'big')
        if 128<=size<=len(data)-start:
            yield start, size, digest(data[start:start+size])

def audit(root):
    findings=[]
    files=0
    for path in sorted(root.rglob('*')):
        rel=path.relative_to(root).as_posix()
        if path.is_symlink():
            findings.append({'path':rel,'kind':'symlink_review'})
            continue
        if not path.is_file():
            continue
        files+=1
        data=path.read_bytes()
        ext=path.suffix.lower()
        def add(kind, **details):
            findings.append({'path':rel,'kind':kind,**details})
        if ext in {'.icc','.icm'}:
            add('profile_file',sha256=digest(data))
        if ext in {'.zip','.gz','.7z','.rar','.tar','.bz2','.xz','.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff','.wasm'}:
            add('opaque_or_container_review',sha256=digest(data))
        if path.name.lower() in {'profile-bank.js','icc_manifest.json','catalog.json','profile-catalog.js'} and ('icc' in rel.lower() or path.name.lower()=='icc_manifest.json'):
            add('profile_catalog_review',sha256=digest(data))
        for offset,size,sha in profiles(data):
            add('raw_icc_candidate',offset=offset,size=size,sha256=sha)
        if ext in {'.js','.mjs','.json','.html','.htm','.txt','.css','.svg'}:
            for match in re.finditer(rb'[A-Za-z0-9+/]{172,}={0,2}',data):
                token=match.group()
                try:
                    decoded=base64.b64decode(token+b'='*((-len(token))%4),validate=True)
                except ValueError:
                    continue
                for offset,size,sha in profiles(decoded):
                    add('base64_icc_candidate',encoded_offset=match.start(),offset=offset,size=size,sha256=sha)
    return {'schema':'atlas-rc36-byos-inventory/0.1','files_scanned':files,'findings':findings,'status':'REVIEW_REQUIRED' if findings else 'NO_MATCHES_NOT_CLEARANCE','release_authorized':False,'limitations':['Does not prove absence of compressed, fragmented, encrypted or otherwise encoded ICC data.','Manual asset/license review, full source/data provenance and offline/browser verification remain mandatory.']}

def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        root=Path(tmp)
        profile=bytearray(132)
        profile[:4]=(132).to_bytes(4,'big')
        profile[36:40]=b'acsp'
        (root/'sample.icc').write_bytes(profile)
        (root/'embedded.js').write_bytes(b'const x="'+base64.b64encode(profile)+b'";')
        (root/'nested.zip').write_bytes(b'placeholder')
        (root/'normal.txt').write_text('acsp is only a word here')
        report=audit(root)
        kinds={f['kind'] for f in report['findings']}
        assert {'profile_file','raw_icc_candidate','base64_icc_candidate','opaque_or_container_review'}<=kinds
        assert not any(f['path']=='normal.txt' for f in report['findings'])
        assert report['release_authorized'] is False
    print('PASS: raw, base64 and opaque-container detection; no release approval')

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('root',type=Path,nargs='?')
    p.add_argument('--self-test',action='store_true')
    a=p.parse_args()
    if a.self_test:
        self_test()
    else:
        if a.root is None or not a.root.is_dir(): p.error('unpacked runtime directory required')
        report=audit(a.root)
        print(json.dumps(report,indent=2))
        raise SystemExit(2 if report['findings'] else 0)
