"""Independent primary-chromaticity derivation, not copied conversion matrices."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path
import numpy as np

runtime, out = map(Path, sys.argv[1:3])
out.mkdir(parents=True, exist_ok=True)
data = json.loads((runtime / 'assets/atlas-data.js').read_text().split('=', 1)[1].strip().rstrip(';'))
lists = json.loads((runtime / 'digital/libraries.js').read_text().split('=', 1)[1].strip().rstrip(';'))
master_refs = {c['ref'] for c in data['colors']}
additional = sorted(set().union(*(v['references'] for v in lists['libraries'].values())) - master_refs)
extra_lab = []
for ref in additional:
    h, l, c = map(float, re.fullmatch(r'H([\d.]+)_L([\d.]+)_C([\d.]+)', ref).groups())
    extra_lab.append([l, c*np.cos(np.deg2rad(h)), c*np.sin(np.deg2rad(h))])
lab = np.array([c['lab'] for c in data['colors']] + extra_lab + [[40, 100*np.cos(np.deg2rad(295)), 100*np.sin(np.deg2rad(295))], [0, 0, 0], [100, 0, 0]])
def white(x, y):
    return np.array([x/y, 1, (1-x-y)/y])
d50, d65 = white(.3457, .3585), white(.3127, .3290)
f = np.column_stack(((lab[:, 0]+16)/116+lab[:, 1]/500, (lab[:, 0]+16)/116, (lab[:, 0]+16)/116-lab[:, 2]/200))
xyz50 = np.where(f > 6/29, f**3, 3*(6/29)**2*(f-4/29))*d50
bradford = np.array([[.8951, .2664, -.1614], [-.7502, 1.7135, .0367], [.0389, -.0685, 1.0296]])
adapt = np.linalg.inv(bradford) @ np.diag((bradford@d65)/(bradford@d50)) @ bradford
primaries = {
    'srgb': [(0.64, 0.33), (.30, .60), (.15, .06)],
    'display-p3': [(.68, .32), (.265, .69), (.15, .06)],
    'rec2020': [(.708, .292), (.170, .797), (.131, .046)],
    'prophoto-rgb': [(.734699, .265301), (.159597, .840403), (.036598, .000105)],
}
oracle = {}
for space, p in primaries.items():
    basis = np.array([white(x, y) for x, y in p]).T
    wp = d50 if space == 'prophoto-rgb' else d65
    matrix = basis @ np.diag(np.linalg.solve(basis, wp))
    xyz = xyz50 if space == 'prophoto-rgb' else xyz50 @ adapt.T
    oracle[space] = xyz @ np.linalg.inv(matrix).T
js = '''const C=require(process.argv[1]);let text='';process.stdin.on('data',b=>text+=b);process.stdin.on('end',()=>{const rows=JSON.parse(text);console.log(JSON.stringify(rows.map(lab=>{const r=C.representations(lab);return Object.fromEntries(C.SPACES.map(s=>[s,{linear:r[s].linear_rgb,encoded:r[s].encoded_rgb}]));})));});'''
proc = subprocess.run([os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node'), '-e', js, str(Path(__file__).with_name('core.js').resolve())], input=json.dumps(lab.tolist()), text=True, capture_output=True, check=True)
actual = json.loads(proc.stdout)
errors, encoded_errors, counts = {}, {}, {}
for space, expected in oracle.items():
    observed = np.array([r[space]['linear'] for r in actual])
    error = float(np.max(np.abs(expected-observed)))
    assert error < 1e-10, (space, error)
    ingamut = ((expected >= -1e-7) & (expected <= 1+1e-7)).all(axis=1)
    assert np.array_equal(ingamut, ((observed >= -1e-7) & (observed <= 1+1e-7)).all(axis=1))
    errors[space] = error
    magnitude = np.abs(expected)
    if space == 'prophoto-rgb':
        encoded = np.sign(expected)*np.where(magnitude < 1/512, 16*magnitude, magnitude**(1/1.8))
    elif space == 'rec2020':
        encoded = np.sign(expected)*magnitude**(1/2.4)
    else:
        encoded = np.sign(expected)*np.where(magnitude <= .0031308, 12.92*magnitude, 1.055*magnitude**(1/2.4)-.055)
    encoded_error = float(np.max(np.abs(encoded-np.array([r[space]['encoded'] for r in actual]))))
    assert encoded_error < 1e-9, (space, encoded_error)
    encoded_errors[space] = encoded_error
    counts[space] = int(ingamut[:13283].sum())
assert list(counts.values()) == [10636, 12009, 13108, 13283]
result = {'status': 'PASS', 'vectors': len(lab), 'additional_digital_addresses': len(additional), 'method': 'Matrices independently derived from primary chromaticities; Bradford from cone matrix and whites', 'max_linear_rgb_error': errors, 'max_encoded_rgb_error': encoded_errors, 'master_gamut_counts': counts}
(out / 'oracle-results.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
