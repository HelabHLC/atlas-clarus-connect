#!/usr/bin/env python3
"""Build a separately versioned card candidate inside the existing Browser Bundle.

Historical builders/assets stay unchanged. No publication or wrapper activation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc32-colour-reference-card'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', type=Path, default=HERE/'build-colour-reference-card')
args = parser.parse_args()
output = args.output_dir.resolve()
dist = output/'atlas-clarus-browser-bundle'
with tempfile.TemporaryDirectory(prefix='atlas-card-base-') as temp:
    subprocess.run(['python3', str(HERE/'build_bundle.py'), '--image-projects', '--output-dir', temp],
                   check=True, capture_output=True)
    if dist.exists():
        shutil.rmtree(dist)
    shutil.copytree(Path(temp)/dist.name, dist)

def replace_once(text, old, new):
    assert text.count(old) == 1, f'Card integration point changed: {old[:90]}'
    return text.replace(old, new)

def inline(script):
    return '<script>' + script.replace('</script', '<\\/script') + '</script>'

html = (dist/'index.html').read_text()
old_ui = (dist/'assets/colour-handoff-ui.js').read_text()
ui = replace_once(old_ui, "['ch-save','ch-export']", "['ch-save','ch-export','ch-reference-card']")
handler = """    $('ch-reference-card').onclick=()=>{
      if(!current||busy)return;
      const snapshot=clone(current),t=ticket+1;
      run('Checking the colour reference cards …',async()=>{
        const files=await root.ATLAS_CLARUS_REFERENCE_CARD.colourHandoff.exportFiles(snapshot,ctx,colors);
        if(t===ticket)download('ATLAS_Clarus_Colour_Reference_Cards.zip',H.zipStored(files),'application/zip');
      },'Colour reference card ZIP saved. Open its HTML to print or save as PDF; keep the JSON companions.');
    };
"""
anchor = "    $('ch-return-files').onchange="
ui = replace_once(ui, anchor, handler + anchor)
extension = (HERE/'src/colour-reference-card.js').read_text()
html = replace_once(html, inline(old_ui), inline(ui) + inline(extension))
button = '<button id="ch-reference-card" disabled>Download colour reference card ZIP</button>'
anchor = '<button id="ch-save" disabled>Save full decision JSON</button>'
html = replace_once(html, anchor, anchor + button)
anchor = 'The same JSON opens in Colour Kit 0.3.0.</p>'
html = replace_once(html, anchor, anchor + '<p class="boundary">Colour reference cards: download printable HTML, full decision JSON and checksums. Each decision stays separate, even when Atlas addresses match. Open the HTML and use Print / Save PDF.</p>')
html = html.replace('0.2.0-rc31-image-projects', VERSION)
(dist/'index.html').write_text(html)
(dist/'assets/colour-handoff-ui.js').write_text(ui)
(dist/'assets/colour-reference-card.js').write_text(extension)
shutil.copyfile(HERE/'COLOUR_REFERENCE_CARD.md', dist/'docs/COLOUR_REFERENCE_CARD.md')
manifest_path = dist/'BUNDLE_MANIFEST.json'
manifest = json.loads(manifest_path.read_text())
manifest.update(version=VERSION, status='COLOUR_REFERENCE_CARD_CANDIDATE', deployment_allowed=False,
                colour_reference_card_schema='atlas-clarus-colour-reference-card/1.0',
                reference_card_signature_status='NOT_SIGNED')
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
(dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n'
    for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
archive = output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(dist.rglob('*')):
        if p.is_file():
            info = zipfile.ZipInfo((Path(dist.name)/p.relative_to(dist)).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
print(json.dumps({'archive': str(archive), 'sha256': sha(archive), 'deployment_allowed': False}))
