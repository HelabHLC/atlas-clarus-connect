#!/usr/bin/env python3
"""Read-only bridge from the archived Ruisdael study; no JPEG re-encoding or resizing.

Usage: python3 prepare_highres_crop.py STUDY_DIRECTORY OUTPUT_DIRECTORY
Requires numpy and Pillow. Extract the original study ZIP into STUDY_DIRECTORY.
"""
import hashlib
import json
import platform
import sys
from pathlib import Path

import numpy as np
from PIL import Image, PngImagePlugin, __version__ as pillow_version

JPEG_SHA = 'b8c1d72380a7f389ef1c33f85a088c404644bdc1a4123f6f664c7638158b171b'
RGB_SHA = 'a0b0112053a328eb4d246e6ec7dfd69791deb81c7e372576c000a81d3e6d4890'
MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
CSV_SHA = 'a25f4dbd94d819ed3c9b899d0e0db7d4d9449cf8028201d0776fad93b5a7fab9'
sha = lambda b: hashlib.sha256(b).hexdigest()


def pixel_hash(a):
    return sha(('RGB8:%dx%d:' % (a.shape[1], a.shape[0])).encode('ascii') + a.tobytes())


def verify_crop_origin(m, original_bytes, parent, rgba):
    """Extra verifier: the unmodified Image Projects importer does NOT do this."""
    assert m['source']['file_sha256'] == sha(original_bytes) == JPEG_SHA
    assert m['source']['canonical_rgb_sha256'] == pixel_hash(parent) == RGB_SHA
    assert m['source']['width'] == parent.shape[1] and m['source']['height'] == parent.shape[0]
    assert m['coordinates'] == 'zero-based, top-left; original_x=x0+local_x; original_y=y0+local_y'
    assert m['crop']['operation'] == 'INTEGER_CROP_NO_RESIZE_NO_RESAMPLE'
    assert m['crop']['scale'] == [1, 1] and m['crop']['rotation_degrees'] == 0
    x, y, w, h = m['crop']['rect_xywh']
    assert all(type(n) is int for n in (x, y, w, h))
    assert x >= 0 and y >= 0 and w > 0 and h > 0
    assert x+w <= parent.shape[1] and y+h <= parent.shape[0]
    assert rgba.shape == (h, w, 4) and rgba.dtype == np.uint8
    assert np.all(rgba[:, :, 3] == 255)
    assert np.array_equal(rgba[:, :, :3], parent[y:y+h, x:x+w])
    assert m['crop']['rgba_sha256'] == sha(rgba.tobytes())


def main():
    study, out = map(Path, sys.argv[1:3])
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((study/'MANIFEST_SHA256.json').read_text())
    names = ['source_rijksmuseum_SK-C-210.jpg', 'output/painting_pixel_bundle.npz',
             'output/results.json', 'inputs/reference_rows.csv']
    measured = {n: sha((study/n).read_bytes()) for n in names}
    assert all(measured[n] == manifest[n] for n in names)
    source = (study/names[0]).read_bytes()
    assert sha(source) == JPEG_SHA
    assert measured['inputs/reference_rows.csv'] == CSV_SHA
    previous = json.loads((study/'output/results.json').read_text())
    with np.load(study/'output/painting_pixel_bundle.npz', allow_pickle=False) as z:
        parent = z['original_rgb']
        assert parent.shape == (4412, 6116, 3) and parent.dtype == np.uint8
        assert pixel_hash(parent) == previous['source_pixel_sha256'] == RGB_SHA
        with Image.open(study/names[0]) as im:
            assert im.mode == 'RGB' and im.size == (6116, 4412)
            assert not im.info.get('icc_profile') and im.getexif().get(274, 1) == 1
            assert np.array_equal(np.asarray(im), parent)
        x, y, w, h = 1000, 1000, 256, 256
        rgba = np.empty((h, w, 4), dtype=np.uint8)
        rgba[:, :, :3] = parent[y:y+h, x:x+w]
        rgba[:, :, 3] = 255
        expected = {'width': w, 'height': h,
                    'source_atlas_row_id': z['source_atlas_row_id'][y:y+h, x:x+w].ravel().tolist(),
                    'distance_squared': z['distance_squared'][y:y+h, x:x+w].ravel().tolist()}
    # A new PNG encodes the retained RGB values. sRGB is an explicit study assumption.
    tags = PngImagePlugin.PngInfo(); tags.add(b'sRGB', b'\x00')
    Image.fromarray(rgba).save(out/'crop.png', pnginfo=tags)
    with Image.open(out/'crop.png') as im:
        assert np.array_equal(np.asarray(im), rgba)
    (out/'crop.rgba').write_bytes(rgba.tobytes())
    (out/'crop-expected.json').write_text(json.dumps(expected)+'\n')
    metadata = {
        'schema': 'atlas-clarus-crop-evidence-experiment/0.1',
        'status': 'PREPARED_BROWSER_TEST_PENDING',
        'source': {'filename': names[0], 'file_sha256': sha(source), 'file_bytes': len(source),
                   'width': 6116, 'height': 4412, 'pixels': 26983792,
                   'canonical_rgb_sha256': pixel_hash(parent),
                   'canonical_rgb_hash_definition': 'SHA256(ASCII RGB8:6116x4412: + row-major RGB8 bytes)',
                   'raw_rgb_sha256': sha(parent.tobytes()),
                   'colour_status': previous['source_colour_status'],
                   'decoder': {'name': 'Pillow', 'version': pillow_version,
                               'orientation': 'stored raster; EXIF orientation absent or 1; no transpose'},
                   'historical_frozen_rgb_equals_current_jpeg_decode': True,
                   'pixel_bundle_file_sha256': measured['output/painting_pixel_bundle.npz'],
                   'source_page': previous['download']['source_page']},
        'coordinates': 'zero-based, top-left; original_x=x0+local_x; original_y=y0+local_y',
        'crop': {'rect_xywh': [x,y,w,h], 'operation': 'INTEGER_CROP_NO_RESIZE_NO_RESAMPLE',
                 'scale': [1,1], 'rotation_degrees': 0,
                 'file_sha256': sha((out/'crop.png').read_bytes()),
                 'file_bytes': (out/'crop.png').stat().st_size,
                 'rgba_sha256': sha(rgba.tobytes()),
                 'rgba_hash_definition': 'SHA256(raw row-major interleaved RGBA8; no header)',
                 'pixel_equality_against_parent': 'ALL_65536_PIXELS',
                 'expected_map_file_sha256': sha((out/'crop-expected.json').read_bytes())},
        'atlas': {'master_sha256': MASTER, 'master_file_rehashed_here': False,
                  'reference_csv_sha256': CSV_SHA, 'reference_rows': 13283,
                  'assignment': 'argmin (integer squared sRGB distance, atlas_row_id); no Delta E'},
        'source_scope': 'Full JPEG bytes and frozen RGB checked; full image NOT opened as Image Project; full Atlas assignment NOT rerun.',
        'software': {'python': platform.python_version(), 'numpy': np.__version__, 'Pillow': pillow_version}}
    verify_crop_origin(metadata, source, parent, rgba)
    failures = []
    for name, mutation in [
        ('wrong_parent_hash', lambda m: m['source'].update(file_sha256='0'*64)),
        ('wrong_original_offset', lambda m: m['crop'].update(rect_xywh=[1001,1000,256,256])),
        ('wrong_scale', lambda m: m['crop'].update(scale=[2,2]))]:
        bad = json.loads(json.dumps(metadata)); mutation(bad)
        try: verify_crop_origin(bad, source, parent, rgba)
        except AssertionError: failures.append(name)
        else: raise AssertionError('Origin verifier accepted '+name)
    bad_rgba = rgba.copy(); bad_rgba[100,100,0] ^= 1
    bad = json.loads(json.dumps(metadata)); bad['crop']['rgba_sha256'] = sha(bad_rgba.tobytes())
    try: verify_crop_origin(bad, source, parent, bad_rgba)
    except AssertionError: failures.append('changed_rgb_even_with_recomputed_crop_hash')
    else: raise AssertionError('Origin verifier accepted changed RGB')
    metadata['origin_verifier_rejections'] = failures
    # Analytical grid only; no claim that these 30 Image Projects were processed.
    rects = [[tx,ty,min(1024,6116-tx),min(1024,4412-ty)]
             for ty in range(0,4412,1024) for tx in range(0,6116,1024)]
    assert len(rects) == 30 and sum(r[2]*r[3] for r in rects) == 26983792
    metadata['tile_plan'] = {'status': 'GEOMETRY_ONLY_NOT_FULL_TILE_EXECUTION', 'tile_side': 1024,
                             'grid': [6,5], 'count': 30, 'rectangles_xywh': rects}
    (out/'crop-preparation.json').write_text(json.dumps(metadata, indent=2)+'\n')
    assert all(sha((study/n).read_bytes()) == measured[n] for n in names)
    print(json.dumps({'status':'PASS', 'crop_pixels':w*h, 'source_file_sha256':sha(source),
                      'canonical_original_rgb_sha256':pixel_hash(parent), 'rejected':failures}))


if __name__ == '__main__':
    main()
