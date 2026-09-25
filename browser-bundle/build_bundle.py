#!/usr/bin/env python3
"""Build the deterministic, file:// compatible ATLAS Clarus browser ZIP."""
from __future__ import annotations
import argparse, gzip, hashlib, json, shutil, zipfile
from pathlib import Path
from build_lcms import worker_source

ROOT=Path(__file__).resolve().parents[1]
HERE=ROOT/'browser-bundle'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', type=Path, default=HERE/'build', help='Development output directory (keeps the checked-in RC20 distribution intact).')
OUTPUT=parser.parse_args().output_dir.resolve()
DIST=OUTPUT/'atlas-clarus-browser-bundle'
VERSION='0.2.0-rc27-recipe-notice'
ZIP=OUTPUT/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
ZIP_TIMESTAMP=(2026, 1, 1, 0, 0, 0)

def sha(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

if DIST.exists(): shutil.rmtree(DIST)
(DIST/'assets').mkdir(parents=True)
(DIST/'docs').mkdir()
for name in ('index.html','app.css','designer-layer.js','basis23-recipes.js','acms-recipes.js','atlas-offline-mixer.js','palette-export.js','image-sampling.js','pkl-image-binding.js','print-handoff.js','print-preview-ui.js','print-ui.js','reference-card.js','profiled-reference-card.js','app.js'):
    target=DIST/('assets/'+name if name!='index.html' else name)
    shutil.copy2(HERE/'src'/name,target)

source=json.loads((ROOT/'hover-library/data/colors.json').read_text(encoding='utf-8'))
assert source['master_sha256']==MASTER
assert source['entry_count']==13283 and len(source['colors'])==13283
view_source=json.loads((ROOT/'hover-library/data/views.json').read_text(encoding='utf-8'))
assert view_source['master_sha256']==MASTER and len(view_source['views']['core']['ids'])==13283
source['views']=view_source['views']
payload='window.ATLAS_CLARUS_DATA='+json.dumps(source,separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/atlas-data.js').write_text(payload,encoding='utf-8')

designer=json.loads(gzip.decompress((ROOT/'designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_3.json.gz').read_bytes()))
assert designer['schema']=='ATLAS_CLARUS_DESIGNER_LAYER' and designer['schema_version']=='0.3.0' and designer['new_names_publication_allowed'] is True
assert designer['source_master']['sha256']==MASTER and designer['source_master']['expected_records']==13283
seen=set()
for row in designer['records']:
    row_id=row['atlas_row_id']
    assert row_id not in seen and source['colors'][row_id]['ref']==row['reference']
    assert not ({'lab','rgb','hex','master_rgb'} & set(row))
    seen.add(row_id)
designer_payload='window.ATLAS_CLARUS_DESIGNER_DATA='+json.dumps(designer,separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/designer-layer-data.js').write_text(designer_payload,encoding='utf-8')
name_index=ROOT/'name-search/atlas-name-search-index-v030.json.gz'
name_search=json.loads(gzip.decompress(name_index.read_bytes()))
assert name_search['schema']=='ATLAS_CLARUS_NAME_SEARCH_INDEX'
assert name_search['master_sha256']==MASTER and name_search['entry_count']==13283
assert all(source['colors'][row['i']]['ref']==row['r'] for row in name_search['records'])
name_keys=('schema','schema_version','master_sha256','entry_count','identity_key','public_search_scope','naming_layer_version','naming_layer_sha256','naming_rules_sha256','publication_scope','records')
record_keys=('i','r','d','f','tone','t')
name_search_ordered={key:([{k:row[k] for k in record_keys if k in row} for row in name_search['records']] if key=='records' else name_search[key]) for key in name_keys}
name_search_payload='window.ATLAS_CLARUS_NAME_SEARCH_DATA='+json.dumps(name_search_ordered,separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/name-search-index.js').write_text(name_search_payload,encoding='utf-8')
shutil.copyfile(name_index,DIST/'assets/name-search-index-v030.json.gz')

registry=json.loads((ROOT/'hover-library/data/basis23-source-registry.json').read_text(encoding='utf-8'))
recipes=[]
for shard in sorted((ROOT/'hover-library/data/basis23-recipes').glob('*.json')):
    recipes.extend(json.loads(shard.read_text(encoding='utf-8')))
assert len(recipes)==13283
assert all(recipe['basis_version']==registry['basis_version'] for recipe in recipes)
mix_display=json.loads((ROOT/'hover-library/data/basis23-mix-display.json').read_text(encoding='utf-8'))
assert mix_display['dataset']=='ATLAS_BASIS23_MIX_DISPLAY_V1'
assert mix_display['atlas_master_sha256']==MASTER
assert mix_display['basis_version']==registry['basis_version']
assert mix_display['rows']==13283 and len(mix_display['displays'])==13283
for expected_id,(recipe,display_row) in enumerate(zip(recipes,mix_display['displays'])):
    assert recipe['source_atlas_row_id']==expected_id
    assert display_row['source_atlas_row_id']==expected_id
    recipe['mix_display']=display_row['mix_display']
basis_payload='window.ATLAS_BASIS23_DATA='+json.dumps({'registry':registry,'rows':recipes},separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/basis23-data.js').write_text(basis_payload,encoding='utf-8')
acms=json.loads((ROOT/'hover-library/data/acms-solid-recipe-candidates.json').read_text(encoding='utf-8'))
assert acms['registry']['master_sha256']==MASTER and acms['registry']['schema']=='ACMS_SPOT_CANDIDATES_RESEARCH_V1'
assert len(acms['rows'])==3653 and all(source['colors'][row['atlas_row_id']]['ref']==row['reference'] for row in acms['rows'])
acms_payload='window.ATLAS_ACMS_DATA='+json.dumps(acms,separators=(',',':'),ensure_ascii=False)+';\n'
(DIST/'assets/acms-data.js').write_text(acms_payload,encoding='utf-8')


# Keep the normal asset files for inspection, but also produce one truly
# self-contained entrypoint. This survives Windows opening only index.html from
# inside a ZIP into a temporary directory.
html=(DIST/'index.html').read_text(encoding='utf-8')
css=(DIST/'assets/app.css').read_text(encoding='utf-8')
app=(DIST/'assets/app.js').read_text(encoding='utf-8')
designer_app=(DIST/'assets/designer-layer.js').read_text(encoding='utf-8')
offline_mixer_app=(DIST/'assets/atlas-offline-mixer.js').read_text(encoding='utf-8')
recipe_app=(DIST/'assets/basis23-recipes.js').read_text(encoding='utf-8')
acms_app=(DIST/'assets/acms-recipes.js').read_text(encoding='utf-8')
palette_export=(DIST/'assets/palette-export.js').read_text(encoding='utf-8')
image_sampling=(DIST/'assets/image-sampling.js').read_text(encoding='utf-8')
pkl_image_binding=(DIST/'assets/pkl-image-binding.js').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="assets/app.css">','<style>'+css+'</style>')
html=html.replace('<script src="assets/atlas-data.js"></script>','<script>'+payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/designer-layer-data.js"></script>','<script>'+designer_payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/name-search-index.js"></script>','<script>'+name_search_payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/designer-layer.js"></script>','<script>'+designer_app.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/basis23-data.js"></script>','<script>'+basis_payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/basis23-recipes.js"></script>','<script>'+recipe_app.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/acms-data.js"></script>','<script>'+acms_payload.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/acms-recipes.js"></script>','<script>'+acms_app.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/atlas-offline-mixer.js"></script>','<script>'+offline_mixer_app.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/palette-export.js"></script>','<script>'+palette_export.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/image-sampling.js"></script>','<script>'+image_sampling.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/pkl-image-binding.js"></script>','<script>'+pkl_image_binding.replace('</script','<\\/script')+'</script>')
worker=worker_source()
(DIST/'assets/lcms-worker.js').write_text(worker,encoding='utf-8')
html=html.replace('<script type="application/json" id="atlas-print-worker-source">null</script>', '<script type="application/json" id="atlas-print-worker-source">'+json.dumps(worker).replace('<','\\u003c')+'</script>')
for module in ('print-handoff.js','print-preview-ui.js','reference-card.js','profiled-reference-card.js','print-ui.js'):
    script=(DIST/'assets'/module).read_text(encoding='utf-8')
    html=html.replace(f'<script src="assets/{module}"></script>','<script>'+script.replace('</script','<\\/script')+'</script>')
html=html.replace('<script src="assets/app.js"></script>','<script>'+app.replace('</script','<\\/script')+'</script>')
html=html.replace('v0.2.0-rc1','v'+VERSION)
(DIST/'index.html').write_text(html,encoding='utf-8')

docs={
'README.html':('<h1>ATLAS Clarus Browser Bundle</h1><p>Open <code>index.html</code> directly in a modern browser. No server, account, installation or network connection is required.</p><h2>Included</h2><ul><li>Hover Library with 13,283 references</li><li>Shared Hover and Wheel palette workspace</li><li>ASE, GPL, Figma Tokens, CSS and Clarus JSON exports</li><li>Colour Identity Wheel</li><li>Parallel 4C / ECG print preparation with embedded ICC files and verified JSON re-import</li><li>Browser-sRGB source / PKL Full Reference / 4C and ECG image comparisons, calculated locally with the selected ICC profiles, with B/A PNG exports</li><li>FAQ and Identity Handoff guidance</li><li>Appearance Pixel Simulator</li><li>Inkscape, GIMP, Krita and Scribus workflow demonstrations</li></ul><p><a href="../index.html">Return to ATLAS Clarus</a></p>'),
'LICENSING.html':('<h1>Licensing and attribution</h1><p>Original software: <strong>GPL-2.0-or-later</strong>. Original ATLAS Clarus documentation: <strong>CC BY 4.0</strong>. HLC-derived reference data: <strong>zlib licence</strong>, subject to upstream notices.</p><h2>Upstream reference-data credit</h2><p><strong>Copyright (c) freieFarbe e.V.</strong></p><p>The reference files have been converted, indexed, reorganised or enriched for ATLAS Clarus. They are modified data products and are not presented as unchanged original freieFarbe distributions.</p><h2>Local ICC engine</h2><p>lcms-wasm 1.0.5 / LittleCMS 2.16, MIT. See LCMS-WASM-LICENSE.txt and LCMS-LICENSE.txt in this folder. <a href="https://github.com/mattdesl/lcms-wasm">Upstream project</a>.</p><h2>ATLAS Clarus</h2><p>Copyright © 2026 ATLAS Clarus contributors.</p><p>The repository files <code>LICENSING.md</code>, <code>LICENSES/</code> and <code>THIRD_PARTY_NOTICES.md</code> are the authoritative licence map. ATLAS Clarus Connect is not affiliated with, endorsed by or certified by Pantone. No Pantone identity or equivalence is asserted.</p><p><a href="../index.html#credits">Return to credits</a></p>'),
'VALIDATION.html':(f'<h1>Validation record</h1><p>Status: <strong>READY_PENDING_VISUAL_AUDIT</strong></p><ul><li>Reference count: 13,283</li><li>Master SHA-256: <code>{MASTER}</code></li><li>Row IDs: zero-based and unique</li><li>Reproducible build and offline dependency scan: automated in GitHub Actions</li><li>A′ v0.4 selection logic: unchanged by this presentation bundle</li></ul><p><a href="../index.html">Return to ATLAS Clarus</a></p>')}
style='<style>body{max-width:850px;margin:60px auto;padding:20px;background:#0a0d12;color:#eef2f6;font:17px/1.7 system-ui}a{color:#65dfff}code{color:#a4ff73}</style>'
docs['VALIDATION.html']='<h1>ATLAS naming 0.3.0</h1><p>All 13,283 names follow the completed editorial review of stored master sRGB. 6,273 names changed; 7,010 names retained. PKL identities and colour values remain unchanged.</p><p>Master SHA-256: <code>'+MASTER+'</code></p><p>Names are ATLAS conventions. Physical print approval remains a separate measured process.</p><p><a href="../index.html">Return to ATLAS Clarus</a></p>'
for name,body in docs.items():(DIST/'docs'/name).write_text('<!doctype html><meta charset="utf-8">'+style+body,encoding='utf-8')

manifest=json.loads((HERE/'manifest-rc27.json').read_text(encoding='utf-8'))
assert manifest['version']==VERSION and manifest['master_sha256']==MASTER
assert manifest['name_search_index_sha256']==sha(name_index)
assert manifest['descriptor_sha256']==sha(DIST/'assets/designer-layer-data.js')
assert manifest['acms_source_sha256']==sha(ROOT/'hover-library/data/acms-solid-recipe-candidates.json')
(DIST/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
for source_name,target_name in [('LICENSE.md','LCMS-WASM-LICENSE.txt'),('LCMS-LICENSE.txt','LCMS-LICENSE.txt'),('PROVENANCE.json','LCMS-PROVENANCE.json')]:
    shutil.copyfile(HERE/'vendor/lcms-wasm'/source_name,DIST/'docs'/target_name)
files=sorted(p for p in DIST.rglob('*') if p.is_file())
(DIST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(DIST).as_posix()}\n' for p in files),encoding='utf-8')
if ZIP.exists(): ZIP.unlink()
with zipfile.ZipFile(ZIP,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(DIST.rglob('*')):
        if p.is_file():
            relative=(Path(DIST.name)/p.relative_to(DIST)).as_posix()
            info=zipfile.ZipInfo(relative,ZIP_TIMESTAMP)
            info.compress_type=zipfile.ZIP_DEFLATED
            info.create_system=3
            info.external_attr=0o100644 << 16
            z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print(ZIP)
print(sha(ZIP))
