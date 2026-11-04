"""Add German/English presentation to the pinned colour-advice 0.1.4 bundle."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE.parent / 'startup-colour-kit'
ADVICE = HERE.parent / 'colour-advice'
BASE_SHA = '6fff7e48b1a1766d5ca57dee3ac47be48ede193129d24d56be296155493ea816'
PREFIX = 'atlas-clarus-browser-bundle'
sha = lambda b: hashlib.sha256(b).hexdigest()
KIT_FILES = ['core.js', 'app.js', 'kit.css', 'print-guide.js', 'colour-advice-ui.js', 'language.js', 'language-en.js']

def build(base, output):
    if output.exists():
        raise FileExistsError('Choose a fresh output directory')
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('0.1.4 baseline SHA-256 mismatch')
    before = {}
    with zipfile.ZipFile(base) as archive:
        for name in archive.namelist():
            if not name.startswith(PREFIX + '/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe archive path')
            if not name.endswith('/'):
                before[name[len(PREFIX)+1:]] = sha(archive.read(name))
        archive.extractall(output)
    root = output / PREFIX
    old = (root/'startup/index.html').read_text()
    scripts = old[old.index('<script'):old.rindex('</body>')]
    assert '<script src="language.js">' not in scripts
    scripts = scripts.replace('<script src="core.js">', '<script src="language-en.js"></script>\n<script src="language.js"></script>\n<script src="core.js">')
    html = (KIT/'index.html').read_text().replace('<!-- SCRIPTS -->', scripts)
    html = html.replace('Startup Colour Kit · Vorschau 0.1', 'Startup Colour Kit · Vorschau 0.1.5')
    (root/'startup/index.html').write_text(html)
    for name in KIT_FILES:
        (root/'startup'/name).write_bytes((KIT/name).read_bytes())
    for name in ['browser-advice.js', 'browser-advice.css']:
        (root/'assets'/name).write_bytes((ADVICE/name).read_bytes())
    browser = (root/'index.html').read_text()
    anchor = '<script src="assets/browser-advice.js">'
    assert browser.count(anchor) == 1
    browser = browser.replace(anchor, '<script src="startup/language-en.js"></script>\n<script src="startup/language.js"></script>\n'+anchor)
    (root/'index.html').write_text(browser)
    (root/'START_HERE.html').write_text((HERE/'START_HERE.html').read_text())
    (root/'LANGUAGE_README.txt').write_text((HERE/'USER_README.txt').read_text())
    manifest = {'version':'0.1.5-preview', 'base_archive_sha256':BASE_SHA,
      'entry':'START_HERE.html', 'languages':['de','en'],
      'scope':'STARTUP_KIT_AND_BROWSER_COLOUR_ADVICE',
      'language_preference':'LOCAL_UI_ONLY_NOT_PROJECT_DATA',
      'exports':'CURRENT_UI_LANGUAGE', 'data_and_icc_engine':'UNCHANGED',
      'public_deployment':False, 'physical_proof':'NOT_PERFORMED'}
    (root/'LANGUAGE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    mutable = {'startup/index.html', 'index.html', 'START_HERE.html', 'SHA256SUMS.txt',
      'assets/browser-advice.js', 'assets/browser-advice.css', *('startup/'+n for n in KIT_FILES)}
    assert all(sha((root/n).read_bytes()) == h for n,h in before.items() if n not in mutable)
    names = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target = output/'ATLAS_Clarus_Browser_Startup_Farbberatung_0.1.5_DE_EN.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,4,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    result={**manifest, 'zip':str(target), 'sha256':sha(target.read_bytes()), 'bytes':target.stat().st_size,
      'inherited_files_unchanged':sum(sha((root/n).read_bytes())==h for n,h in before.items()),
      'checksums':len(names)-1,
      'modified':sorted(n for n,h in before.items() if sha((root/n).read_bytes())!=h)}
    (output/'build-info.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True)
    a=p.parse_args();build(a.base,a.output_dir)
