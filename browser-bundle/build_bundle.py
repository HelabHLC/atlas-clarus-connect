#!/usr/bin/env python3
"""Build the deterministic, file:// compatible ATLAS Clarus browser ZIP."""
from __future__ import annotations
import hashlib, json, shutil, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HERE=ROOT/'browser-bundle'
DIST=HERE/'dist'/'atlas-clarus-browser-bundle'
ZIP=HERE/'dist'/'ATLAS_Clarus_Browser_Bundle_v0.2.0-rc3.zip'
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'

def sha(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

if DIST.exists(): shutil.rmtree(DIST)
(DIST/'assets').mkdir(parents=True)
(DIST/'docs').mkdir()
for name in ('index.html','app.css','app.js'):
    target=DIST/('assets/'+name if name!='index.html' else name)
    shutil.copy2(HERE/'src'/name,target)

source=json.loads((ROOT/'hover-library/data/colors.json').read_text(encoding='utf-8'))
assert source['master_sha256']==MASTER
assert source['entry_count']==13283 and len(source['colors'])==13283
payload='window.ATLAS_CLARUS_DATA='+json.dumps(source,separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/atlas-data.js').write_text(payload,encoding='utf-8')

# Keep the normal asset files for inspection, but also produce one truly
# self-contained entrypoint. This survives Windows opening only index.html from
# inside a ZIP into a temporary directory.
html=(DIST/'index.html').read_text(encoding='utf-8')
css=(DIST/'assets/app.css').read_text(encoding='utf-8')
app=(DIST/'assets/app.js').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="assets/app.css">','<style>'+css+'</style>')
html=html.replace('<script src="assets/atlas-data.js"></script>','<script>'+payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/app.js"></script>','<script>'+app.replace('</script','<\\/script')+'</script>')
html=html.replace('v0.2.0-rc1','v0.2.0-rc3')
(DIST/'index.html').write_text(html,encoding='utf-8')

docs={
'README.html':('<h1>ATLAS Clarus Browser Bundle</h1><p>Open <code>index.html</code> directly in a modern browser. No server, account, installation or network connection is required.</p><h2>Included</h2><ul><li>Hover Library with 13,283 references</li><li>Colour Identity Wheel</li><li>Identity Handoff</li><li>Appearance Pixel Simulator</li><li>Inkscape, GIMP, Krita and Scribus workflow demonstrations</li></ul><p><a href="../index.html">Return to ATLAS Clarus</a></p>'),
'LICENSING.html':('<h1>Licensing and attribution</h1><p>Software: GPL-2.0-or-later. Documentation and separately identified material may use other licences. See the repository files <code>LICENSING.md</code>, <code>LICENSES/</code> and <code>THIRD_PARTY_NOTICES.md</code> for the authoritative map.</p><p>Reference-data redistribution remains subject to the provenance and licence notices published with the repository.</p><p><a href="../index.html">Return to ATLAS Clarus</a></p>'),
'VALIDATION.html':(f'<h1>Validation record</h1><p>Status: <strong>READY_PENDING_AUDIT</strong></p><ul><li>Reference count: 13,283</li><li>Master SHA-256: <code>{MASTER}</code></li><li>Row IDs: zero-based and unique</li><li>Offline dependency scan: required before release</li><li>A′ v0.4 selection logic: unchanged by this presentation bundle</li></ul><p><a href="../index.html">Return to ATLAS Clarus</a></p>')}
style='<style>body{max-width:850px;margin:60px auto;padding:20px;background:#0a0d12;color:#eef2f6;font:17px/1.7 system-ui}a{color:#65dfff}code{color:#a4ff73}</style>'
for name,body in docs.items():(DIST/'docs'/name).write_text('<!doctype html><meta charset="utf-8">'+style+body,encoding='utf-8')

manifest={'bundle':'ATLAS Clarus Browser Bundle','version':'0.2.0-rc3','status':'READY_PENDING_AUDIT','workflow':'ATLAS Clarus v3.4.0','master_sha256':MASTER,'master_rows':13283,'row_id_base':0,'offline_entrypoint':'index.html','entrypoint_packaging':'SELF_CONTAINED_SINGLE_FILE','a_prime_v04_logic':'UNCHANGED','measured_qc_status':'NOT_MEASURED'}
(DIST/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
files=sorted(p for p in DIST.rglob('*') if p.is_file())
(DIST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(DIST).as_posix()}\n' for p in files),encoding='utf-8')
if ZIP.exists(): ZIP.unlink()
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(DIST.rglob('*')):
        if p.is_file(): z.write(p,Path(DIST.name)/p.relative_to(DIST))
print(ZIP)
print(sha(ZIP))
