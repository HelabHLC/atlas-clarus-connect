#!/usr/bin/env python3
import hashlib
import io
import json
import subprocess
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BUNDLE=ROOT/'browser-bundle'
VERSION='0.2.0-rc18-pixel-loupe'
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
        prefix+'assets/palette-export.js'
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
    assert manifest['reproducible_zip'] is True
    html=archive.read(prefix+'index.html').decode('utf-8')
    assert 'v'+VERSION in html
    assert 'id="picker-loupe"' in html
    assert 'span=11' in html and 'getImageData(point.ix,point.iy,1,1)' in html
    assert "d=(c.rgb[0]-rgb[0])**2" in html
    assert 'Screen-pixel assignment only.' in html
    assert 'COMPUTATIONAL ONLY · NOT MEASURED' in html
    assert "data-back-hover" in html and "data-back-picker" in html
    assert 'assets/app.js' not in html and 'assets/atlas-data.js' not in html
    assert 'window.ATLAS_CLARUS_DATA=' in html

print(f'PASS: reproducible RC18 provenance-sync bundle {first}')
