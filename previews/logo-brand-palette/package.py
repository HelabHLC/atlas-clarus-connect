"""Build the logo-to-palette workflow on the pinned 0.1.6 release."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
MULTI=HERE.parent/'multi-application'
BASE_SHA='3d9ef82b539280e2a4a5ed836648edfae43c55b0d4ec675c1e72d0b359ea0cb6'
PREFIX='atlas-clarus-browser-bundle'
sha=lambda b:hashlib.sha256(b).hexdigest()

def build(base,output):
    if output.exists():raise FileExistsError('Choose a new output directory')
    if sha(base.read_bytes())!=BASE_SHA:raise ValueError('0.1.6 baseline hash mismatch')
    before={}
    with zipfile.ZipFile(base) as archive:
        for n in archive.namelist():
            if not n.startswith(PREFIX+'/') or '..' in Path(n).parts or '\\' in n:raise ValueError('Unsafe path')
            if not n.endswith('/'):before[n[len(PREFIX)+1:]]=sha(archive.read(n))
        archive.extractall(output)
    root=output/PREFIX;multi=root/'multi'
    old=(multi/'index.html').read_text();scripts=old[old.index('<script'):old.rindex('</body>')]
    scripts=scripts.replace('<script src="core.js">','<script src="logo-core.js"></script>\n<script src="core.js">')
    scripts=scripts.replace('<script src="app.js">','<script src="logo-copy.js"></script>\n<script src="logo-ui.js"></script>\n<script src="app.js">')
    worker=(HERE/'logo-core.js').read_text()+"\nglobalThis.onmessage=e=>{try{postMessage({result:ATLAS_LOGO_CORE.extract(e.data)});}catch(error){postMessage({error:error.message});}};\n"
    scripts='<script id="atlas-logo-worker-source" type="application/json">'+json.dumps(worker).replace('</',r'<\/')+'</script>\n'+scripts
    html=(MULTI/'index.html').read_text().replace('<!-- SCRIPTS -->',scripts).replace('<link rel="stylesheet" href="multi.css">','<link rel="stylesheet" href="multi.css"><link rel="stylesheet" href="logo.css">')
    (multi/'index.html').write_text(html)
    for n in ['core.js','app.js','copy.js','launcher.js','multi.css']:(multi/n).write_bytes((MULTI/n).read_bytes())
    for n in ['logo-core.js','logo-ui.js','logo-copy.js','logo-entry.js','logo.css']:(multi/n).write_bytes((HERE/n).read_bytes())
    (multi/'logo-worker-source.js').write_text(worker)
    native=(root/'index.html').read_text();end=native.rindex('</body>')
    native=native[:end]+'<script src="multi/logo-entry.js"></script>\n'+native[end:]
    (root/'index.html').write_text(native)
    for n in ['START_HERE.html','startup/index.html']:(root/n).write_text((root/n).read_text().replace('0.1.6','0.1.7'))
    (root/'LOGO_BRAND_PALETTE_README.txt').write_bytes((HERE/'USER_README.txt').read_bytes())
    manifest={'version':'0.1.7-preview','base_sha256':BASE_SHA,'entry':'START_HERE.html','logo_formats':['PNG','JPEG','WebP'],'logo_selection':'REVIEWED_ACTUAL_OPAQUE_BROWSER_SRGB_PIXELS','proposal_rule':'MINIMUM_SOURCE_DELTA_E00_THEN_LOWER_ROW_ID','collision_reporting':True,'original_bytes':'PRESERVED','master_and_icc_binary':'UNCHANGED','physical_approval':False,'public_deployment':False}
    (root/'LOGO_BRAND_PALETTE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    mutable={'multi/index.html','multi/core.js','multi/app.js','multi/copy.js','multi/launcher.js','multi/multi.css','index.html','START_HERE.html','startup/index.html','SHA256SUMS.txt'}
    assert all(sha((root/n).read_bytes())==h for n,h in before.items() if n not in mutable)
    names=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target=output/'ATLAS_Clarus_Logo_Markenpalette_0.1.7_DE_EN.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,4,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
    with zipfile.ZipFile(target) as archive:assert archive.testzip() is None
    result={**manifest,'zip':str(target),'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'checksums':len(names)-1,'inherited_unchanged':sum(sha((root/n).read_bytes())==h for n,h in before.items())}
    (output/'build-info.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();build(a.base,a.output_dir)
