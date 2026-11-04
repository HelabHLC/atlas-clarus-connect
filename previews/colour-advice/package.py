"""Add shared colour advice to the pinned Browser Edition / Startup 0.1.3 ZIP."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'startup-colour-kit'
BASE_SHA = '96cb4cce7545107e9c6b522afaefe862eb7ad4098eb3b9f4b55fe00f33b51e2f'
PREFIX = 'atlas-clarus-browser-bundle'
sha = lambda b: hashlib.sha256(b).hexdigest()

def build(base, output):
    if output.exists():
        raise FileExistsError('Choose a fresh output directory')
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('0.1.3 baseline SHA-256 mismatch')
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
    assert scripts.count('<script src="core.js">') == 1
    scripts = scripts.replace('<script src="core.js">', '<script src="colour-advice.js"></script>\n<script src="core.js">')
    scripts = scripts.replace('<script src="app.js">', '<script src="colour-advice-ui.js"></script>\n<script src="app.js">')
    if '<script src="language.js">' not in scripts:
        scripts = scripts.replace('<script src="core.js">', '<script src="language-en.js"></script>\n<script src="language.js"></script>\n<script src="core.js">')
    html = (SOURCE/'index.html').read_text().replace('<!-- SCRIPTS -->', scripts)
    html = html.replace('Startup Colour Kit · Vorschau 0.1', 'Startup Colour Kit · Vorschau 0.1.4')
    (root/'startup/index.html').write_text(html)
    for name in ['core.js','app.js','kit.css','print-guide.js','library-acceptance.js','colour-advice.js','colour-advice-ui.js','language.js','language-en.js']:
        (root/'startup'/name).write_bytes((SOURCE/name).read_bytes())
    reader = (root/'startup/zip-reader.js').read_text()
    assert reader.count('count<=16') == 1
    (root/'startup/zip-reader.js').write_text(reader.replace('count<=16','count<=32'))
    # Patch only the documented context bridge into the actual RC34.11 runtime.
    # The source tree's older app.js must not overwrite the deployed runtime.
    old_app = (root/'assets/app.js').read_text()
    anchor = '  select(selected);render();showWorkflow(0);route();'
    assert old_app.count(anchor) == 1
    new_app = old_app.replace(anchor, (HERE/'browser-bridge.inc.js').read_text()+anchor)
    browser = (root/'index.html').read_text()
    assert browser.count(old_app.strip()) == 1
    browser = browser.replace(old_app.strip(), new_app.strip())
    (root/'assets/app.js').write_text(new_app)
    for name in ['browser-advice.js','browser-advice.css']:
        (root/'assets'/name).write_bytes((HERE/name).read_bytes())
    tags = '<script src="startup/language-en.js"></script>\n<script src="startup/language.js"></script>\n<link rel="stylesheet" href="assets/browser-advice.css">\n<script src="assets/browser-advice.js"></script>\n'
    pos = browser.rfind('</body>');assert pos > 0
    (root/'index.html').write_text(browser[:pos]+tags+browser[pos:])
    assert 'assets/browser-advice.js' in (root/'index.html').read_text()
    (root/'START_HERE.html').write_text('''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ATLAS Clarus · Farbberatung 0.1.4</title><style>body{font:18px/1.6 system-ui;max-width:780px;margin:60px auto;padding:20px;background:#f8f6ef;color:#173c45}a{color:#176860}li{margin:18px 0}</style><h1>ATLAS Clarus · Farbberatung</h1><p>Deine Wunschfarbe. Nachvollziehbare Möglichkeiten.</p><ol><li><a href="startup/index.html">Startup Colour Kit öffnen</a> · Farben wählen, Bibliothek prüfen, Toleranz festlegen, Ersatzfarbe bewusst übernehmen.</li><li><a href="index.html">Browser Edition öffnen</a> · Unter der Bibliotheksauswahl „Ausgewählte Farbe beraten“ oder „Aktive Palette beraten“ wählen.</li></ol><p>Die ZIP zuerst vollständig entpacken und alle Dateien zusammenlassen. Die Farbberatung arbeitet lokal und offline.</p><p>Source Colour und ursprüngliche ATLAS-Adresse bleiben erhalten. Die bestätigte Auswahl wird getrennt gespeichert. Sichere deine Entscheidungen als Farbmappe.</p><p><a href="FARBBERATUNG.txt">Hinweise und Grenzen</a> · <a href="ICC_README.txt">Profilquellen</a></p></html>''')
    manifest={'version':'0.1.4-preview','base_archive_sha256':BASE_SHA,'entry':'START_HERE.html',
      'browser_and_startup':'SHARED_ADVICE_WORKSPACE','alternatives':'EXACT_ORIGINAL_ADDRESS_MEMBERSHIP',
      'replacement':'EXPLICIT_USER_CONFIRMATION_ONLY','metric':'CIEDE2000','basis':'SRGB8_TO_LAB_D65_2_DE00_K111_V1',
      'source_and_original_assignment':'PRESERVED','master_icc_worker':'UNCHANGED','public_deployment':False,'physical_proof':'NOT_PERFORMED'}
    (root/'COLOUR_ADVICE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (root/'FARBBERATUNG.txt').write_text((HERE/'USER_README.txt').read_text())
    mutable={'index.html','assets/app.js','START_HERE.html','SHA256SUMS.txt',*('startup/'+n for n in ['index.html','core.js','app.js','kit.css','print-guide.js','library-acceptance.js','zip-reader.js'])}
    assert all(sha((root/n).read_bytes())==h for n,h in before.items() if n not in mutable)
    names=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    target=output/'ATLAS_Clarus_Browser_Startup_Farbberatung_0.1.4.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for n in names:
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,4,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
    assert 'assets/browser-advice.js' in (root/'index.html').read_text()
    assert sha((root/'index.html').read_bytes()) != before['index.html']
    result={**manifest,'zip':str(target),'sha256':sha(target.read_bytes()),'bytes':target.stat().st_size,
      'inherited_files_unchanged':sum(sha((root/n).read_bytes())==h for n,h in before.items()),
      'modified':sorted(n for n,h in before.items() if sha((root/n).read_bytes())!=h)}
    (output/'build-info.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True)
    a=p.parse_args();build(a.base,a.output_dir)
