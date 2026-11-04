"""Build the multi-application preview from the immutable 0.1.5 release."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
KIT=HERE.parent/'startup-colour-kit'
BASE_SHA='fbe01ba9d0bdeeace6b34608d67479f72bb9b507261e2a04d90a562aca08aa7c'
PREFIX='atlas-clarus-browser-bundle'
sha=lambda b:hashlib.sha256(b).hexdigest()

def build(base,output):
    if output.exists():raise FileExistsError('Choose a new output directory')
    if sha(base.read_bytes())!=BASE_SHA:raise ValueError('0.1.5 baseline hash mismatch')
    before={}
    with zipfile.ZipFile(base) as archive:
        for n in archive.namelist():
            if not n.startswith(PREFIX+'/') or '..' in Path(n).parts or '\\' in n:raise ValueError('Unsafe path')
            if not n.endswith('/'):before[n[len(PREFIX)+1:]]=sha(archive.read(n))
        archive.extractall(output)
    root=output/PREFIX;multi=root/'multi';multi.mkdir()
    old=(root/'startup/index.html').read_text()
    scripts=old[old.index('<script'):old.rindex('</body>')]
    scripts=scripts.replace('<script src="app.js">','<script src="../multi/launcher.js"></script>\n<script src="app.js">')
    html=(KIT/'index.html').read_text().replace('<!-- SCRIPTS -->',scripts).replace('Startup Colour Kit · Vorschau 0.1','Startup Colour Kit · Vorschau 0.1.6')
    (root/'startup/index.html').write_text(html)
    for n in ['app.js','language-en.js']:(root/'startup'/n).write_bytes((KIT/n).read_bytes())
    worker=(root/'startup/worker-source.js').read_text()+'\n'+(HERE/'worker.inc.js').read_text()
    (multi/'worker-source.js').write_text(worker)
    deps=['assets/atlas-data.js','assets/colour-origin.js','assets/palette-export.js','assets/clarus-handoff.js','assets/image-project-codecs.js','assets/print-handoff.js','startup/zip-reader.js','startup/print-guide.js','startup/library-acceptance.js','startup/colour-advice.js','startup/language-en.js','startup/language.js','startup/core.js','icc/profile-catalog.js','icc/profile-bank.js','icc/profile-library.js']
    scripts='\n'.join('<script src="../'+n+'"></script>' for n in deps)
    scripts+='\n<script id="atlas-multi-worker-source" type="application/json">'+json.dumps(worker).replace('</',r'<\/')+'</script>\n'
    scripts+='\n'.join('<script src="'+n+'"></script>' for n in ['core.js','copy.js','app.js'])
    (multi/'index.html').write_text((HERE/'index.html').read_text().replace('<!-- SCRIPTS -->',scripts))
    for n in ['core.js','copy.js','app.js','multi.css','launcher.js']:(multi/n).write_bytes((HERE/n).read_bytes())
    start=(root/'START_HERE.html').read_text().replace('0.1.5','0.1.6')
    start=start.replace('<ul><li><a href="startup/index.html?lang=de">','<ul><li><a href="multi/index.html?lang=de">Markenfarben für mehrere Anwendungen</a></li><li><a href="startup/index.html?lang=de">')
    start=start.replace('<ul><li><a href="startup/index.html?lang=en">','<ul><li><a href="multi/index.html?lang=en">Brand colours across applications</a></li><li><a href="startup/index.html?lang=en">')
    (root/'START_HERE.html').write_text(start)
    (root/'MULTI_APPLICATION_README.txt').write_text((HERE/'USER_README.txt').read_text())
    manifest={'version':'0.1.6-preview','base_sha256':BASE_SHA,'entry':'START_HERE.html','applications':[2,8],'method':'SRGB8_TO_LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1','source_dossier':'PRESERVED_BYTE_FOR_BYTE','original_worker_and_master':'UNCHANGED','multi_worker':'ADDED_OPERATION_SAME_LCMS_BINARY','physical_approval':False,'public_deployment':False}
    (root/'MULTI_APPLICATION_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    mutable={'startup/index.html','startup/app.js','startup/language-en.js','START_HERE.html','SHA256SUMS.txt'}
    assert all(sha((root/n).read_bytes())==h for n,h in before.items() if n not in mutable)
    names=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target=output/'ATLAS_Clarus_Markenfarben_Mehrere_Anwendungen_0.1.6_DE_EN.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,4,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
    with zipfile.ZipFile(target) as archive:assert archive.testzip() is None
    result={**manifest,'zip':str(target),'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'checksums':len(names)-1,'inherited_unchanged':sum(sha((root/n).read_bytes())==h for n,h in before.items())}
    (output/'build-info.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();build(a.base,a.output_dir)
