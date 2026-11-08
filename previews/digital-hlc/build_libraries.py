"""Expose full P3/ProPhoto source lists without changing master intersections."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('source_parser', ROOT / 'process-libraries/build_process_libraries.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)


def build(data):
    folder = ROOT / 'process-libraries'
    catalog = json.loads((folder / 'GAMUTMAP_CATALOG.json').read_text())
    master = {c['ref']: c['id'] for c in data['colors']}
    assert catalog['master_sha256'] == data['master_sha256'] and len(master) == 13283
    libraries = {}
    for space, fid in [('display-p3', 200), ('prophoto-rgb', 188)]:
        metadata = next(f for f in catalog['filters'] if f['filter_id'] == fid)
        sets = {}
        for kind in ['single', 'atlas']:
            path = folder / f'catalog-sources/{fid}-{kind}.json.gz'
            digest = hashlib.sha256(gzip.decompress(path.read_bytes())).hexdigest()
            assert digest == metadata['source_sha256'][kind]
            sets[kind], _ = parser.parse(path.with_suffix(''))
        assert sets['single'] & set(master) == sets['atlas']
        assert len(sets['atlas']) == metadata['entry_count']
        libraries[space] = {'name': metadata['source_name'], 'source_filter_id': fid,
                            'source_response_sha256': metadata['source_sha256']['single'],
                            'total': len(sets['single']), 'master_count': len(sets['atlas']),
                            'additional_digital_count': len(sets['single']-set(master)),
                            'selection': 'SOURCE_DECLARED_GAMUT_MEMBERSHIP',
                            'references': sorted(sets['single'])}
    return {'schema': 'ATLAS_DIGITAL_RGB_SOURCE_LISTS_V1', 'snapshot_date': catalog['captured_date'],
            'source': catalog['source'], 'master_sha256': data['master_sha256'],
            'source_profile_bytes_and_threshold': 'UNVERIFIED', 'libraries': libraries}
