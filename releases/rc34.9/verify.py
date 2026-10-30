"""Independent sample/parser, archive and inherited-file checks."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

from package import BASE_SHA, CHANGED, PREFIX

base, out = map(Path, sys.argv[1:])
root = out / PREFIX
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha(base.read_bytes()) == BASE_SHA
with zipfile.ZipFile(base) as z:
    changed = {n.removeprefix(PREFIX + '/') for n in z.namelist()
               if not n.endswith('/') and z.read(n) != (out / n).read_bytes()}
assert changed == CHANGED, changed
source = (root / 'examples/ATLAS_Clarus_QuarkXPress_Test.xtg').read_bytes()
expected = json.loads((root / 'examples/QUARKXPRESS_EXPECTED.json').read_text())['palette']
assert source.startswith(b'<v21.00><e9>\r\n')
source.decode('utf-8', errors='strict')
rows = re.findall(rb'^@([^=\r\n]+)=\[C\]<"RGB",P,([^>]+)>\r$', source, re.M)
assert len(rows) == len(expected)
for (name, channels), color in zip(rows, expected):
    assert name.decode('utf-8') == color['name']
    assert [round(float(v) * 255) for v in channels.split(b',')] == color['rgb']
info = json.loads((out / 'release-info.json').read_text())
bundle = out / info['bundle']
assert sha(bundle.read_bytes()) == info['bundle_sha256']
with zipfile.ZipFile(bundle) as z:
    assert z.testzip() is None
    names = set(z.namelist())
    sums = z.read(PREFIX + '/SHA256SUMS.txt').decode().splitlines()
    covered = set()
    for line in sums:
        digest, name = line.split('  ', 1)
        key = PREFIX + '/' + name
        assert sha(z.read(key)) == digest
        assert z.read(key) == (root / name).read_bytes()
        covered.add(key)
    assert covered == names - {PREFIX + '/SHA256SUMS.txt'}
print('PASS independent XTG parsing, sample values, full archive checksums and unchanged data/engines')
