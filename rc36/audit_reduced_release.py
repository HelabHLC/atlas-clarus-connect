"""Report actual reduced RC36.3 bytes, including gzip contents. No licence waiver."""
import argparse, base64, collections, gzip, hashlib, json, re
from pathlib import Path
from audit_public_byos import audit, profiles

def main():
    p=argparse.ArgumentParser()
    p.add_argument('root',type=Path);p.add_argument('--report',type=Path,required=True)
    a=p.parse_args()
    root=a.root
    manifest=json.loads((root/'BUNDLE_MANIFEST.json').read_text())
    report=audit(root)
    binary=[f for f in report['findings'] if f['kind'] in {'profile_file','raw_icc_candidate','base64_icc_candidate','symlink_review'}]
    compressed=[];opaque=[]
    for f in report['findings']:
        if f['kind']!='opaque_or_container_review':continue
        rel=f['path']; path=root/rel
        if path.suffix!='.gz':
            opaque.append(rel);continue
        with gzip.open(path,'rb') as z:
            data=z.read(128*1024*1024+1)
        if len(data)>128*1024*1024:raise ValueError('Oversized gzip: '+rel)
        # Inspect the decompressed bytes regardless of their format. Only known
        # text formats can clear this technical scan; unknown payloads remain blocked.
        suffix=Path(path.stem).suffix.lower()
        decoded_format='UNKNOWN'
        try:
            parsed=json.loads(data)
            decoded_format='JSON:'+type(parsed).__name__
        except (ValueError, UnicodeError):
            if suffix in {'.js','.mjs','.css','.html','.htm','.txt','.csv','.svg','.md'}:
                try:
                    decoded=data.decode('utf-8-sig')
                    if '\x00' not in decoded:decoded_format='UTF8_TEXT:'+suffix
                except UnicodeError:pass
            if decoded_format=='UNKNOWN':opaque.append(rel+' (unrecognized decompressed format)')
        hits=[{'offset':o,'size':n,'sha256':h} for o,n,h in profiles(data)]
        for m in re.finditer(rb'[A-Za-z0-9+/]{172,}={0,2}',data):
            try: d=base64.b64decode(m.group()+b'='*((-len(m.group()))%4),validate=True)
            except ValueError: continue
            hits.extend({'encoded_offset':m.start(),'offset':o,'size':n,'sha256':h} for o,n,h in profiles(d))
        if hits:binary.append({'path':rel,'kind':'gzip_icc_candidate','matches':hits})
        compressed.append({'path':rel,'decoded_sha256':hashlib.sha256(data).hexdigest(),'decoded_bytes':len(data),'decoded_format':decoded_format,'icc_signature_hits':len(hits)})
    catalog=[]
    for f in report['findings']:
        if f['kind']!='profile_catalog_review':continue
        path=root/f['path'];data=path.read_bytes()
        catalog.append({'path':f['path'],'sha256':f['sha256'],'bytes':len(data),'long_base64_tokens':len(re.findall(rb'[A-Za-z0-9+/]{172,}={0,2}',data))})
    report={'status':'TECHNICAL_ICC_PAYLOAD_SCAN_ONLY','manifest_bundled_output_profiles':manifest.get('bundled_output_profiles'),'manifest_profile_delivery':manifest.get('profile_delivery'),'files_scanned':report['files_scanned'],'gzip_payloads_scanned':len(compressed),'gzip_payloads':compressed,'catalog_review':catalog,'uninspected_opaque':opaque,'icc_binary_candidates':binary,'release_authorized':False,'limitations':['Signature scanning does not prove absence of all encodings.','Catalog provenance and rights of data products must be reviewed separately.']}
    a.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='gzip_payloads'},indent=2))
    if binary or opaque or manifest.get('bundled_output_profiles')!=0:raise SystemExit(2)
if __name__=='__main__':main()
