#!/usr/bin/env python3
import hashlib
import io
import json
import subprocess
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BUNDLE=ROOT/'browser-bundle'
VERSION='0.2.0-rc20-core-journey'
ZIP=BUNDLE/'dist'/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

subprocess.run(['python3',str(BUNDLE/'build_bundle.py')],check=True)
first=digest(ZIP)
subprocess.run(['python3',str(BUNDLE/'build_bundle.py')],check=True)
second=digest(ZIP)
assert first==second, f'non-reproducible ZIP: {first} != {second}'

with zipfile.ZipFile(io.BytesIO(ZIP.read_bytes())) as archive:
    assert archive.testzip() is None
    prefix='atlas-clarus-browser-bundle/'
    names=set(archive.namelist())
    required={
        prefix+'index.html',prefix+'BUNDLE_MANIFEST.json',prefix+'SHA256SUMS.txt',
        prefix+'assets/app.js',prefix+'assets/app.css',prefix+'assets/atlas-data.js',
        prefix+'assets/basis23-data.js',prefix+'assets/basis23-recipes.js',
        prefix+'assets/palette-export.js',prefix+'assets/image-sampling.js'
    }
    assert required <= names
    sums=archive.read(prefix+'SHA256SUMS.txt').decode('utf-8').splitlines()
    for line in sums:
        expected,name=line.split('  ',1)
        actual=hashlib.sha256(archive.read(prefix+name)).hexdigest()
        assert actual==expected, f'checksum mismatch: {name}'
        extracted=BUNDLE/'dist'/'atlas-clarus-browser-bundle'/name
        assert extracted.is_file(), f'extracted dist file missing: {name}'
        assert digest(extracted)==expected, f'extracted dist mismatch: {name}'
    manifest=json.loads(archive.read(prefix+'BUNDLE_MANIFEST.json'))
    assert manifest['version']==VERSION
    assert manifest['master_sha256']==MASTER
    assert manifest['master_rows']==13283
    assert manifest['status']=='CORE_JOURNEY_TEST_CANDIDATE'
    assert manifest['primary_user_path']=='PICKER_HOVER_PALETTE_CLARUS_JSON'
    assert manifest['max_palettes']==50 and manifest['max_palette_colours']==64
    assert manifest['reproducible_zip'] is True
    html=archive.read(prefix+'index.html').decode('utf-8')
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
    assert 'window.ATLAS_CLARUS_DATA=' in html
    assert 'id="palette-storage-status"' in html
    assert 'Your first palette · four steps' in html
    assert 'validateClarus(data,colors,MASTER)' in html

print(f'PASS: reproducible RC20 core-journey bundle {first}')
