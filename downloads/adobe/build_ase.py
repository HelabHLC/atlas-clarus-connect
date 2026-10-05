#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Build reproducible Adobe RGB swatch libraries from the published projection."""
import hashlib
import json
from pathlib import Path
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'hover-library/data/colors.json'
MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'

def ase(rows):
    blocks = []
    for row in rows:
        name = (row['ref'] + '\0').encode('utf-16-be')
        body = struct.pack('>H', len(name)//2) + name + b'RGB ' + struct.pack('>fffH', *(v/255 for v in row['rgb']), 0)
        blocks.append(struct.pack('>HI', 1, len(body)) + body)
    return b'ASEF' + struct.pack('>HHI', 1, 0, len(rows)) + b''.join(blocks)

def build():
    raw = SOURCE.read_bytes()
    data = json.loads(raw)
    rows = data['colors']
    assert data['master_sha256'] == MASTER
    assert len(rows) == data['entry_count'] == 13283
    assert len({r['id'] for r in rows}) == len({r['ref'] for r in rows}) == len(rows)
    for r in rows:
        assert len(r['rgb']) == 3 and all(type(v) is int and 0 <= v <= 255 for v in r['rgb'])
        assert r['hex'].upper() == '#' + ''.join(f'{v:02X}' for v in r['rgb'])
    full = 'ATLAS_Clarus_13283_RGB_v1.0.ase'
    payload = {full: ase(rows)}
    groups = {}
    for row in rows:
        groups.setdefault(row['ref'].split('_')[0], []).append(row)
    for hue, subset in sorted(groups.items()):
        payload[f'by-hue/ATLAS_Clarus_{hue}_RGB.ase'] = ase(subset)
    manifest = {'format':'ATLAS_CLARUS_ADOBE_ASE_DOWNLOAD', 'version':'1.0',
        'source_file':'hover-library/data/colors.json',
        'source_file_sha256':hashlib.sha256(raw).hexdigest(),
        'master_sha256':MASTER, 'entry_count':len(rows), 'hue_library_count':len(groups),
        'colour_model':'RGB', 'swatch_type':'global/process (ASE type 0)',
        'adobe_runtime_status':'NOT_TESTED', 'measured_qc_status':'NOT_MEASURED',
        'note':'ASE preserves HLC names and RGB; spectral data, row IDs and master hash require the sidecar.',
        'files':{name:{'sha256':hashlib.sha256(value).hexdigest()} for name,value in payload.items()}}
    payload['MANIFEST.json'] = (json.dumps(manifest, indent=2)+'\n').encode()
    payload['REFERENCE_INDEX.json'] = (json.dumps({'master_sha256':MASTER,'row_id_base':0,
        'references':[{'atlas_row_id':r['id'],'reference':r['ref'],'rgb':r['rgb'],'hex':r['hex']} for r in rows]}, separators=(',',':'))+'\n').encode()
    payload['README.md'] = (OUT/'README.md').read_bytes()
    payload['LICENSE_DATA_Zlib.txt'] = (ROOT/'LICENSES/Zlib.txt').read_bytes()
    payload['LICENSE_DOCS_CC-BY-4.0.txt'] = (ROOT/'LICENSES/CC-BY-4.0.txt').read_bytes()
    payload['SHA256SUMS.txt'] = ''.join(f'{hashlib.sha256(value).hexdigest()}  {name}\n' for name,value in sorted(payload.items())).encode()
    (OUT/full).write_bytes(payload[full])
    (OUT/'MANIFEST.json').write_bytes(payload['MANIFEST.json'])
    archive = OUT/'ATLAS_Clarus_Adobe_ASE_v1.0.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, value in sorted(payload.items()):
            info = zipfile.ZipInfo(name, (2026,10,5,0,0,0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, value)
    (OUT/'SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in [archive, OUT/full]))
    print(f'Built {len(rows)} colours, {len(groups)} hue libraries; ZIP {archive.stat().st_size} bytes')

if __name__ == '__main__':
    build()
