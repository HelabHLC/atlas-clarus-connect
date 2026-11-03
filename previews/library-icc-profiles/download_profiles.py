"""Download exact, hash-pinned original provider archives for personal use."""
import argparse,hashlib,json,urllib.request,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
    a=argparse.ArgumentParser();a.add_argument('--output-dir',required=True,type=Path);a.add_argument('--include-adobe',action='store_true',help='Include the separate Adobe end-user archive; it is never bundled with the application.');args=a.parse_args()
    args.output_dir.mkdir(parents=True,exist_ok=True);catalog=json.loads((HERE/'catalog.json').read_text());groups={}
    for p in catalog['profiles'].values():
        if p['delivery']=='PROVIDER_ARCHIVE_IMPORT' and not args.include_adobe:continue
        groups.setdefault(p['archive_sha256'],[]).append(p)
    results=[]
    for digest,profiles in groups.items():
        p=profiles[0];dest=args.output_dir/p['archive_name']
        try:
            if not dest.exists():
                with urllib.request.urlopen(p['source_url'],timeout=45) as response:raw=response.read(120*1024*1024+1)
                if len(raw)>120*1024*1024:raise ValueError('Download size limit exceeded')
                if sha(raw)!=digest:raise ValueError('Provider archive changed; no substitution accepted')
                dest.write_bytes(raw)
            if sha(dest.read_bytes())!=digest:raise ValueError('Existing archive hash mismatch')
            for item in profiles:
                if zipfile.is_zipfile(dest):
                    with zipfile.ZipFile(dest) as z:raw=z.read(item['member'])
                else:raw=dest.read_bytes()
                if sha(raw)!=item['sha256'] or len(raw)!=item['bytes']:raise ValueError('Profile bytes mismatch')
            results.append({'url':p['source_url'],'file':str(dest.resolve()),'sha256':digest,'status':'OK','profiles':profiles});print('OK '+dest.name)
        except Exception as e:results.append({'url':p['source_url'],'status':'FAILED','error':str(e)});print('FAILED '+dest.name+': '+str(e))
    (args.output_dir/'download-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    if any(x['status']!='OK' for x in results):raise SystemExit(1)
if __name__=='__main__':main()
