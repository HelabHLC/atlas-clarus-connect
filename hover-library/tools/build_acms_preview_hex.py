"""Add screened sRGB previews to pinned ACMS spectral recipe candidates.

The swatches represent the opaque-limit K/S model under D50, adapted to sRGB.
They are neither measured paint nor a substrate-specific proof.
"""
import hashlib
import sys
import json
from collections import Counter
from pathlib import Path

import numpy as np

import atlas_golden_variable_mixer_v0_5 as mixer

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
RECIPES = ROOT / 'atlas-clarus-connect/hover-library/data/acms-solid-recipe-candidates.json'
SOURCE = ROOT / 'upload/5b677da7-ef29-4ceb-8d84-64db29418094.rs'
CHSOS = ROOT / 'ATLAS_CHSOS_Acrylic_Model_v0_1.json'
MASTER = ROOT / 'atlas_master__active_master__v2_illumext.pkl'
SAMPLE_COLUMNS = [f'R_{nm}' for nm in range(400, 701, 10)]


def model_hex(lab):
    """D50 CIE Lab -> Bradford adapted D65 sRGB, clipped for display."""
    xbar, ybar, zbar = mixer.CIE_1931_2DEG[:, 1:].T
    spd = mixer.D50[:, 1]
    white = np.array([np.sum(spd * xbar), np.sum(spd * ybar), np.sum(spd * zbar)])
    white *= 100 / white[1]
    L, a, b = lab
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    delta = 6 / 29
    inv = lambda x: x ** 3 if x > delta else 3 * delta ** 2 * (x - 4 / 29)
    xyz = white * np.array([inv(fx), inv(fy), inv(fz)]) / 100
    bradford = np.array([[.8951, .2664, -.1614], [-.7502, 1.7135, .0367], [.0389, -.0685, 1.0296]])
    d65 = np.array([.95047, 1., 1.08883])
    adapted = np.linalg.solve(bradford, (bradford @ xyz) * ((bradford @ d65) / (bradford @ (white / 100))))
    rgb = np.array([[3.2404542, -1.5371385, -.4985314],
                    [-.9692660, 1.8760108, .0415560],
                    [.0556434, -.2040259, 1.0572252]]) @ adapted
    clipped = bool(np.any((rgb < 0) | (rgb > 1)))
    rgb = np.clip(rgb, 0, 1)
    encoded = np.where(rgb <= .0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - .055)
    return '#' + ''.join(f'{int(round(x * 255)):02X}' for x in encoded), clipped


def main():
    doc = json.loads(RECIPES.read_text())
    master, digest = mixer.validate_master(MASTER)
    assert digest == doc['registry']['master_sha256'] == mixer.EXPECTED_MASTER_SHA256
    chsos_doc = json.loads(CHSOS.read_text())
    chsos = {r['basis_id']: np.asarray(r['reflectance_400_700'], dtype=float)
             for r in chsos_doc['basis_registry']}
    rs = {}
    for line in SOURCE.read_text(encoding='utf-8-sig').splitlines():
        parts = line.split('\t')
        name = parts[0].strip().strip('"')
        values = [float(x) for x in line.split('"', 2)[2].split()]
        if len(values) == 36:
            rs[name] = np.asarray(values[2:33], dtype=float)
    assert len(rs) >= 289
    stats = Counter()
    mismatch = []
    for row in doc['rows']:
        target = master.iloc[row['atlas_row_id']][SAMPLE_COLUMNS].to_numpy(dtype=float)
        target_lab = mixer.spectrum_to_lab(target)
        for candidate in row['candidates']:
            parts = candidate['components']
            if candidate['manufacturer_basis'].startswith('CHSOS_'):
                reflectances = [chsos[p['basis_id']] for p in parts]
            else:
                reflectances = [rs[p['name']] for p in parts]
            weights = np.array([p.get('fraction', p.get('percent', 0) / 100) for p in parts], dtype=float)
            if abs(weights.sum() - 1) > .001:
                raise ValueError(f'Invalid recipe fractions: {row["reference"]}')
            weights /= weights.sum()
            mixed = mixer.reflectance_from_km(sum(w * mixer.km_from_reflectance(r)
                                                    for w, r in zip(weights, reflectances)))
            mixed_lab = mixer.spectrum_to_lab(mixed)
            de = mixer.delta_e_2000(mixed_lab, target_lab)
            discrepancy = abs(de - candidate['de00_model'])
            if discrepancy > .15:
                mismatch.append((row['reference'], candidate['manufacturer_basis'], round(discrepancy, 3)))
                stats['preview_omitted_model_mismatch'] += 1
                continue
            preview, clipped = model_hex(mixed_lab)
            candidate['model_preview_hex'] = preview
            candidate['model_preview_gamut_clipped'] = clipped
            stats['preview_added'] += 1
            stats['gamut_clipped'] += clipped
    doc['registry']['preview_model'] = 'K_S_OPAQUE_LIMIT_CIE1931_2DEG_D50_BRADFORD_SRGB'
    doc['registry']['preview_source_sha256'] = {
        'pigments_rs': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'chsos_basis': hashlib.sha256(CHSOS.read_bytes()).hexdigest(),
        'atlas_master': digest,
    }
    doc['registry']['preview_scope'] = 'MODEL_SCREEN_PREVIEW_NOT_MEASURED; substrate and opacity not modeled'
    RECIPES.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(dict(stats), 'mismatch examples', mismatch[:8])


if __name__ == '__main__':
    main()
