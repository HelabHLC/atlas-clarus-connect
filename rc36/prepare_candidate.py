"""Prepare isolated RC36.1 candidate from the bit-exact published archive."""
import argparse, hashlib, json, zipfile
from pathlib import Path, PurePosixPath
HERE=Path(__file__).resolve().parent
SHA='e1a6df95fe2f19e3fee5909e929035af427635bd26d9e2912e51abc0cab15544'
PREFIX='atlas-clarus-browser-bundle/'
def sha(b): return hashlib.sha256(b).hexdigest()
def replace_once(s,old,new,name):
    n=s.count(old)
    if n!=1: raise ValueError(f'{name}: expected one anchor, found {n}: {old[:100]}')
    return s.replace(old,new,1)
def patch_export(s,name):
    s=replace_once(s,'function createSourceAssignment(sample,point,image,c,master){','function createSourceAssignment(sample,point,image,c,master,fileSpaceDecision){',name)
    s=replace_once(s,"signature_status:'NOT_SIGNED'\n    };","signature_status:'NOT_SIGNED',\n      ...(fileSpaceDecision===undefined?{}:{file_space_decision:global.ATLAS_RC36_SOURCE.validate(fileSpaceDecision,image)})\n    };",name)
    s=replace_once(s,'const im=r.image,q=r.sampling;','const im=r.image,q=r.sampling;\n      if(Object.prototype.hasOwnProperty.call(r,"file_space_decision"))global.ATLAS_RC36_SOURCE.validate(r.file_space_decision,im);',name)
    return s
def patch_app(s,name):
    s=replace_once(s,'pickerCanvas.onclick=e=>{','window.ATLAS_RC36_SOURCE.mount(pickerCanvas);\n  pickerCanvas.onclick=e=>{',name)
    s=replace_once(s,'pickerImage=null;pickerPixels=null;pickerDraw=null;pickerImageMeta=null;select(selected);','pickerImage=null;pickerPixels=null;pickerDraw=null;pickerImageMeta=null;window.ATLAS_RC36_SOURCE.reset();select(selected);',name)
    s=replace_once(s,'createSourceAssignment(sample,point,pickerImageMeta,best,MASTER)','createSourceAssignment(sample,point,pickerImageMeta,best,MASTER,window.ATLAS_RC36_SOURCE.capture(pickerImageMeta))',name)
    s=replace_once(s,'Y${r.sampling.centre[1]}`;', 'Y${r.sampling.centre[1]}${window.ATLAS_RC36_SOURCE.describe(r)}`;',name)
    return s
def main():
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    if sha(a.base.read_bytes())!=SHA:raise ValueError('Wrong baseline')
    with zipfile.ZipFile(a.base) as z:
        if z.testzip():raise ValueError('Corrupt archive')
        names=[x.filename for x in z.infolist() if not x.is_dir()]
        if len(set(names))!=len(names) or any(not n.startswith(PREFIX) or '..' in PurePosixPath(n).parts for n in names):raise ValueError('Unsafe archive')
        files={n.removeprefix(PREFIX):z.read(n) for n in names}
    listed=dict((n,h) for h,n in (line.split('  ',1) for line in files['SHA256SUMS.txt'].decode().splitlines()))
    actual={n:sha(b) for n,b in files.items() if n!='SHA256SUMS.txt'}
    if len(actual)!=328 or listed!=actual:raise ValueError('Baseline file mismatch')
    source=(HERE/'rgb-source-space.js').read_text()+'\n'+(HERE/'file-space.js').read_text()
    files['assets/rc36-file-space.js']=source.encode()
    for name in ['assets/palette-export.js','assets/app.js','index.html']:
        s=files[name].decode()
        if name!='assets/app.js':s=patch_export(s,name)
        if name!='assets/palette-export.js':s=patch_app(s,name)
        if name=='index.html':
            # The second closing head belongs to an embedded HTML export template.
            # Inject immediately before the first actual document head closure.
            end=s.index('</head>')
            if s.lower().index('<body')<end:raise ValueError('Unexpected document head boundary')
            s=s[:end]+'<script>\n'+source+'\n</script>\n'+s[end:]
        files[name]=s.encode()
    m=json.loads(files['BUNDLE_MANIFEST.json']);m['version']='0.2.0-rc36.1-provenance-candidate';m['status']='RC36_1_TEST_ONLY';m['deployment_allowed']=False;m['source_metadata_extension']='atlas-rc36-file-space/1.0';m['baseline_archive_sha256']=SHA
    files['BUNDLE_MANIFEST.json']=(json.dumps(m,indent=2)+'\n').encode()
    files['SHA256SUMS.txt']=''.join(sha(b)+'  '+n+'\n' for n,b in sorted(files.items()) if n!='SHA256SUMS.txt').encode()
    if a.out.exists():raise ValueError('Use a new candidate output directory')
    for n,b in files.items():
        dest=a.out/n;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
    print(json.dumps({'status':'CANDIDATE_PREPARED','baseline_files':len(actual),'candidate_files':len(files)-1,'master_rows_manifest':m['master_rows'],'master_sha256_manifest':m['master_sha256'],'master_asset_unchanged':sha(files['assets/atlas-data.js'])==actual['assets/atlas-data.js'],'changed_existing_files':sorted(n for n in actual if sha(files[n])!=actual[n]),'new_files':sorted(set(files)-set(actual)-{'SHA256SUMS.txt'})},indent=2))
if __name__=='__main__':main()
