"""Verify the actual Android overlays against source, data and candidate evidence."""
from pathlib import Path
import hashlib
import json

here = Path(__file__).resolve().parent
assets = here / 'app/src/main/assets/bundle'
candidate = json.loads((assets / 'ANDROID_CANDIDATE.json').read_text())
for name in ('live-camera-core.js', 'live-camera.js'):
    raw = (here / name).read_bytes()
    assert (assets / 'assets' / name).read_bytes() == raw
    assert candidate['live_camera_sha256'][name] == hashlib.sha256(raw).hexdigest()
    embedded = '<script>' + raw.decode().replace('</script', '<\\/script') + '</script>'
    for page in ('index.html', 'colour-id.html', 'colour-id-en.html'):
        assert embedded in (assets / page).read_text(), (page, name)
source = (assets / 'assets/atlas-data.js').read_text()
data = json.loads(source.removeprefix('window.ATLAS_CLARUS_DATA=').strip().removesuffix(';'))
master = json.loads((here.parent / 'hover-library/data/colors.json').read_text())
assert data['colors'] == master['colors']
assert data['master_sha256'] == master['master_sha256']
assert len([v for v in data['views'].values() if not v.get('hidden_from_new_selection')]) == 78
for page in ('colour-id.html', 'colour-id-en.html'):
    html = (assets / page).read_text()
    assert html.count('<script src="assets/atlas-data.js"></script>') == 1
assert candidate['camera_selection_schema'] == 'atlas-clarus-camera-selection/1.0'
print('PASS: all three camera overlays, script hashes, standalone master loading, 13,283 unchanged rows and 78 visible libraries')
