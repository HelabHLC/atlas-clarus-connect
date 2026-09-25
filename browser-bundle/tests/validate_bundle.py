#!/usr/bin/env python3
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BUNDLE=ROOT/'browser-bundle'
VERSION='0.2.0-rc26-names-v0-3-0-chsos-pilot-acms-spot-ba'
temp_output=tempfile.TemporaryDirectory(prefix='atlas-print-bundle-')
OUTPUT=Path(temp_output.name)
ZIP=OUTPUT/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'

class InlineScriptParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.capture=False
        self.parts=[]
        self.scripts=[]

    def handle_starttag(self,tag,attrs):
        if tag.lower()!='script':
            return
        attributes=dict(attrs)
        script_type=attributes.get('type','').lower()
        self.capture='src' not in attributes and script_type not in {'application/json','application/ld+json'}
        self.parts=[]

    def handle_data(self,data):
        if self.capture:
            self.parts.append(data)

    def handle_endtag(self,tag):
        if tag.lower()=='script' and self.capture:
            self.scripts.append(''.join(self.parts))
            self.capture=False

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

subprocess.run(['python3',str(BUNDLE/'build_bundle.py'),'--output-dir',str(OUTPUT)],check=True)
first=digest(ZIP)
subprocess.run(['python3',str(BUNDLE/'build_bundle.py'),'--output-dir',str(OUTPUT)],check=True)
second=digest(ZIP)
assert first==second, f'non-reproducible ZIP: {first} != {second}'
assert first=='b5d65c2a0bb39ccb0af59709ca8a1bac1ed2765b381e0714cb6ed6ce51112615', 'built bundle differs from deployed IONOS release'

with zipfile.ZipFile(io.BytesIO(ZIP.read_bytes())) as archive:
    assert archive.testzip() is None
    prefix='atlas-clarus-browser-bundle/'
    names=set(archive.namelist())
    required={
        prefix+'index.html',prefix+'BUNDLE_MANIFEST.json',prefix+'SHA256SUMS.txt',
        prefix+'assets/app.js',prefix+'assets/app.css',prefix+'assets/atlas-data.js',
        prefix+'assets/basis23-data.js',prefix+'assets/basis23-recipes.js',
        prefix+'assets/atlas-offline-mixer.js',prefix+'assets/acms-data.js',prefix+'assets/acms-recipes.js',prefix+'assets/name-search-index-v030.json.gz',
        prefix+'assets/palette-export.js',prefix+'assets/image-sampling.js',
        prefix+'assets/pkl-image-binding.js',
        prefix+'assets/print-handoff.js',prefix+'assets/print-ui.js',
        prefix+'assets/reference-card.js'
    }
    assert required <= names
    sums=archive.read(prefix+'SHA256SUMS.txt').decode('utf-8').splitlines()
    for line in sums:
        expected,name=line.split('  ',1)
        actual=hashlib.sha256(archive.read(prefix+name)).hexdigest()
        assert actual==expected, f'checksum mismatch: {name}'
        extracted=OUTPUT/'atlas-clarus-browser-bundle'/name
        assert extracted.is_file(), f'extracted dist file missing: {name}'
        assert digest(extracted)==expected, f'extracted dist mismatch: {name}'
    manifest=json.loads(archive.read(prefix+'BUNDLE_MANIFEST.json'))
    assert manifest['version']==VERSION
    assert manifest['master_sha256']==MASTER
    assert manifest['master_rows']==13283
    assert manifest['tone_system_version']=='0.1'
    assert manifest['visible_name_source']=='ATLAS_CLARUS_COMPLETE_NAME_LAYER'
    assert manifest['iscc_nbs_role']=='INTERNAL_AUDIT_ONLY'
    assert len(manifest['tone_system_sha256'])==64 and len(manifest['name_search_index_sha256'])==64
    assert manifest['status']=='COMPLETE_NAMES_V0_3_0_WITH_OPTIONAL_CHSOS_PILOT'
    assert manifest['primary_user_path']=='PICKER_HOVER_PALETTE_CLARUS_JSON'
    assert manifest['max_palettes']==50 and manifest['max_palette_colours']==64
    assert manifest['reproducible_zip'] is True
    html=archive.read(prefix+'index.html').decode('utf-8')
    parser=InlineScriptParser()
    parser.feed(html)
    assert parser.scripts, 'no inline JavaScript found'
    for number,script in enumerate(parser.scripts,1):
        script_path=OUTPUT/f'inline-{number}.js'
        script_path.write_text(script,encoding='utf-8')
        syntax=subprocess.run(['node','--check',str(script_path)],capture_output=True,text=True)
        assert syntax.returncode==0, f'inline script {number} syntax error: {syntax.stderr}'
    assert manifest['acms_spot_rows']==3653
    assert manifest['name_search_index_sha256']==digest(ROOT/'name-search/atlas-name-search-index-v030.json.gz')
    assert 'ATLAS_ACMS_RECIPES' in html and 'Download A/B PNG' in html
    assert 'v'+VERSION in html
    assert 'id="picker-loupe"' in html
    assert 'id="picker-sample-size"' in html
    assert '<option value="1" selected>Single pixel</option>' in html
    assert 'AREA_MEAN_RGB' in html and 'sampleAt(point,size)' in html
    assert 'ATLAS_CLARUS_SAMPLING' in html
    assert 'Pixels with alpha below 128 are excluded.' in html
    assert 'Channel σ (diagnostic)' in html
    assert "d=(c.rgb[0]-rgb[0])**2" in html
    assert 'Observed screen colour only.' in html
    assert 'COMPUTATIONAL ONLY · NOT MEASURED' in html
    assert "data-back-hover" in html and "data-back-picker" in html
    assert 'assets/app.js' not in html and 'assets/atlas-data.js' not in html
    assert 'assets/image-sampling.js' not in html
    assert 'assets/pkl-image-binding.js' not in html
    assert 'window.ATLAS_CLARUS_DATA=' in html
    assert 'id="palette-storage-status"' in html
    assert 'Your first palette · four steps' in html
    assert 'validateClarus(data,colors,MASTER)' in html
    assert html.count('"mix_display"')==13283
    assert 'Before — ATLAS Target' in html
    assert 'After — Computed Mix' in html
    assert 'COMPUTATIONAL PREVIEW · NOT PHYSICALLY VERIFIED' in html

    assert manifest['print_paths']==['4C','ECG']
    assert manifest['print_device_calculation']=='SINGLE_REFERENCE_DEVICE16_WITH_PROFILE_BOUND_DEVICECMYK_AND_DEVICEN_PDF'
    assert manifest['print_exports']==['PARALLEL_PRINT_JSON','READABLE_HTML_REPORT','PROFILED_REFERENCE_JSON','DEVICECMYK_REFERENCE_PDF','DEVICEN_CMYKOGV_REFERENCE_PDF']
    assert 'ATLAS_CLARUS_PARALLEL_PRINT_HANDOFF' in html
    assert manifest['image_preview']=='PKL_FULL_REFERENCE_THEN_INDEPENDENT_4C_ECG_ICC_PREVIEWS'
    assert manifest['image_preview_identity_binding']=='RGB_ONLY_NEAREST_MASTER_WITH_ATLAS_ROW_ID_TIEBREAK'
    assert manifest['image_preview_foreign_colors_required']==0
    assert manifest['image_preview_max_edge']==1200
    assert 'id="atlas-print-worker-source"' in html
    assert 'assets/print-preview-ui.js' not in html
    assert 'PKL Full Reference ↔ 4C preview' in html and 'PKL Full Reference ↔ ECG preview' in html
    assert 'assets/print-handoff.js' not in html and 'assets/print-ui.js' not in html
    assert 'id="print"' in html and 'data-prepare-print' in html
    assert 'ATLAS_CLARUS_REFERENCE_CARD' in html and 'data-reference-card' in html
    assert 'assets/reference-card.js' not in html
    assert manifest['reference_card_handoff_version']=='0.1.0'
    assert manifest['reference_card_output_status']=='PRINTED_NOT_MEASURED'
    assert manifest['reference_card_identity_change']=='NONE'

print(f'PASS: reproducible parallel-print preparation bundle {first}')
