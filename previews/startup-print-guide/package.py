"""Overlay the guided Startup workflow on the verified Browser/ICC test package."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'startup-colour-kit'
BASE_SHA = 'a947420b125a9ecfeefbb09e03592561062db5cd784b1ee0222d92801aed0ca1'
PREFIX = 'atlas-clarus-browser-bundle'
sha = lambda b: hashlib.sha256(b).hexdigest()

def build(base, output):
    if output.exists():
        raise FileExistsError('Choose a new output directory')
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('ICC 0.1.1 baseline SHA-256 mismatch')
    before = {}
    with zipfile.ZipFile(base) as archive:
        for name in archive.namelist():
            if not name.startswith(PREFIX + '/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe baseline path')
            if not name.endswith('/'):
                before[name[len(PREFIX)+1:]] = sha(archive.read(name))
        archive.extractall(output)
    root = output / PREFIX
    old_html = (root / 'startup/index.html').read_text()
    scripts = old_html[old_html.index('<script'):old_html.rindex('</body>')]
    assert scripts.count('<script src="core.js">') == 1
    scripts = scripts.replace('<script src="core.js">', '<script src="print-guide.js"></script>\n<script src="library-acceptance.js"></script>\n<script src="core.js">')
    if 'colour-advice.js' not in scripts:
        scripts = scripts.replace('<script src="core.js">', '<script src="colour-advice.js"></script>\n<script src="core.js">').replace('<script src="app.js">', '<script src="colour-advice-ui.js"></script>\n<script src="app.js">')
    if '<script src="language.js">' not in scripts:
        scripts = scripts.replace('<script src="core.js">', '<script src="language-en.js"></script>\n<script src="language.js"></script>\n<script src="core.js">')
    html = (SOURCE / 'index.html').read_text().replace('<!-- SCRIPTS -->', scripts)
    html = html.replace('Startup Colour Kit · Vorschau 0.1', 'Startup Colour Kit · Vorschau 0.1.2')
    (root / 'startup/index.html').write_text(html)
    for name in ['core.js', 'app.js', 'kit.css', 'print-guide.js', 'library-acceptance.js','colour-advice.js','colour-advice-ui.js','language.js','language-en.js']:
        (root / 'startup' / name).write_bytes((SOURCE / name).read_bytes())
    reader = root / 'startup/zip-reader.js'
    reader.write_text(reader.read_text().replace('count<=16','count<=32'))
    manifest = {'version':'0.1.2-preview','base_archive_sha256':BASE_SHA,
        'entry':'START_HERE.html','guided_selection':'startup/index.html',
        'profile_loading':'EXPLICIT_USER_ACTION','unconfirmed_suggestions':'LABELED_AND_EXPORTED',
        'master_and_icc_engine':'UNCHANGED','browser_edition':'UNCHANGED',
        'physical_proof':'NOT_PERFORMED','public_deployment':False}
    (root / 'PRINT_GUIDE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (root / 'DRUCKVORBEREITUNG.txt').write_text((HERE / 'USER_README.txt').read_text())
    mutable = {'startup/zip-reader.js','startup/index.html','startup/core.js','startup/app.js','startup/kit.css','SHA256SUMS.txt'}
    assert all(sha((root/n).read_bytes())==h for n,h in before.items() if n not in mutable)
    names = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root / 'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target = output / 'ATLAS_Clarus_Browser_Startup_Druckfuehrung_0.1.2.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,4,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
    result={**manifest,'zip':str(target),'sha256':sha(target.read_bytes()),'bytes':target.stat().st_size,
        'inherited_files_unchanged':len(set(before)-mutable),'modified':sorted(n for n in before if sha((root/n).read_bytes())!=before[n])}
    (output / 'build-info.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True)
    a=p.parse_args();build(a.base,a.output_dir)
