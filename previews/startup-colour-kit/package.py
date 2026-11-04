"""Add the Startup Colour Kit to the pinned public RC34.11 archive."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE_SHA = '6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb'
VERSION = '0.1.0-preview.1'
PREFIX = 'atlas-clarus-browser-bundle'
DEPS = ['atlas-data.js', 'colour-origin.js', 'palette-export.js', 'clarus-handoff.js', 'image-project-codecs.js', 'print-handoff.js']
sha = lambda b: hashlib.sha256(b).hexdigest()

def build(base, output):
    if output.exists():
        raise FileExistsError('Choose a new output directory')
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('Published RC34.11 baseline SHA-256 mismatch')
    with zipfile.ZipFile(base) as archive:
        before = {}
        for name in archive.namelist():
            if not name.startswith(PREFIX+'/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe baseline path')
            if not name.endswith('/'):
                before[name[len(PREFIX)+1:]] = archive.read(name)
        archive.extractall(output)
    root = output/PREFIX
    kit = root/'startup';kit.mkdir()
    baseline = (root/'index.html').read_text()
    match = re.search(r'<script[^>]*id="atlas-print-worker-source"[^>]*>(.*?)</script>', baseline, re.S)
    if not match:
        raise ValueError('Embedded ICC worker missing')
    worker = json.loads(match.group(1))
    (kit/'worker-source.js').write_text(worker)
    reader=(root/'assets/image-project-codecs.js').read_text()
    assert reader.count('count<=8')==1 and reader.count('root.ATLAS_IMAGE_CODECS=')==1
    (kit/'zip-reader.js').write_text(reader.replace('count<=8','count<=32').replace('root.ATLAS_IMAGE_CODECS=','root.ATLAS_STARTUP_CODECS='))
    scripts = '\n'.join('<script src="../assets/'+n+'"></script>' for n in DEPS)
    scripts += '\n<script id="atlas-print-worker-source" type="application/json">'+match.group(1)+'</script>\n<script src="zip-reader.js"></script>\n<script src="print-guide.js"></script>\n<script src="library-acceptance.js"></script>\n<script src="colour-advice.js"></script>\n<script src="core.js"></script>\n<script src="colour-advice-ui.js"></script>\n<script src="app.js"></script>'
    if '<script src="language.js">' not in scripts:
        scripts = scripts.replace('<script src="core.js">', '<script src="language-en.js"></script>\n<script src="language.js"></script>\n<script src="core.js">')
    (kit/'index.html').write_text((HERE/'index.html').read_text().replace('<!-- SCRIPTS -->', scripts))
    for name in ['core.js','app.js','kit.css','print-guide.js','library-acceptance.js','colour-advice.js','colour-advice-ui.js','language.js','language-en.js']:
        (kit/name).write_bytes((HERE/name).read_bytes())
    (root/'START_HERE.html').write_text('<!doctype html><html lang="de"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=startup/index.html"><title>ATLAS Clarus Startup Colour Kit</title><a href="startup/index.html">Startup Colour Kit öffnen</a></html>\n')
    (root/'STARTUP_KIT_MANIFEST.json').write_text(json.dumps({'version':VERSION,'status':'ISOLATED_PREVIEW','entry':'START_HERE.html','base_archive_sha256':BASE_SHA,'source_base_commit':'2f8f8f5e8e51ecde1e88a15e777353ce39e0a4f8','master_sha256':'8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4','public_deployment':False,'source_and_reference':'SEPARATE','print_inputs':['RECORDED_BROWSER_SRGB','MANUAL_SRGB','FIXED_MASTER_RGB'],'icc_engine':'UNCHANGED_RC34.11','physical_measurement':'NOT_PERFORMED','output_profiles_bundled':False},indent=2)+'\n')
    # All inherited runtime/data/licensing files must remain byte-identical.
    assert all((root/n).read_bytes()==b for n,b in before.items())
    names=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target=output/'ATLAS_Clarus_Startup_Colour_Kit_0.1_Preview.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,3,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    result={'version':VERSION,'zip':str(target),'sha256':sha(target.read_bytes()),'bytes':target.stat().st_size,'inherited_runtime_files_unchanged':len(before)-1,'added':sorted(set(names)-before.keys())}
    (output/'build-info.json').write_text(json.dumps(result,indent=2)+'\n')
    target.with_suffix('.zip.sha256').write_text(result['sha256']+'  '+target.name+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--base',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args();build(args.base,args.output_dir)
