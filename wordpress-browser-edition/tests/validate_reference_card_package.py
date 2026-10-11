"""Verify the installable card pilot, retained modules and release boundaries."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))
from verify_package import verify

package = Path(sys.argv[1])
candidate = Path(sys.argv[2])
with tempfile.TemporaryDirectory(prefix='atlas-wp-card-check-') as tmp:
    with zipfile.ZipFile(package) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == {'atlas-clarus-browser-edition/'+p for p in (
            'atlas-clarus-browser-edition.php', 'index.php', 'readme.txt', 'assets/bundle.zip')}
        z.extractall(tmp)
    root = Path(tmp)/'atlas-clarus-browser-edition'
    report = verify(root)
    assert report['plugin_version'] == '0.1.15-beta12'
    with zipfile.ZipFile(candidate) as old, zipfile.ZipFile(root/'assets/bundle.zip') as new:
        assert old.namelist() == new.namelist()
        differences = {n for n in old.namelist() if old.read(n) != new.read(n)}
        prefix = 'atlas-clarus-browser-bundle/'
        assert differences == {prefix+n for n in ('index.html', 'BUNDLE_MANIFEST.json', 'SHA256SUMS.txt')}
        assert old.read(prefix+'index.html').replace(b'0.2.0-rc32-colour-reference-card',
            b'0.2.0-rc32.1-colour-reference-card') == new.read(prefix+'index.html')
        a, b = (json.loads(z.read(prefix+'BUNDLE_MANIFEST.json')) for z in (old, new))
        assert {k for k in a if a[k] != b[k]} == {'version', 'status', 'deployment_allowed'}
    source = (root/'atlas-clarus-browser-edition.php').read_text()
    with zipfile.ZipFile(REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip') as z:
        previous = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
    # The upgrade reuses the exact guarded installer and rollback implementation.
    for start, end in [('private static function install_bundle()', 'private static function validate_manifest'),
                       ('public static function handle_rollback_request()', 'private static function remove_tree')]:
        before = previous.split(start)[1].split(end)[0].replace('RC31.1', 'RC32.1')
        assert source.split(start)[1].split(end)[0] == before
    master_json = (REPO/'hover-library/data/colors.json').read_bytes()
    assert hashlib.sha256(master_json).hexdigest() == '96866cacb09d712409b8f361111a73b3cbcd07252e3a7f1ba4e694fef9369361'
    assert json.loads(master_json)['master_sha256'] == '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
    print(json.dumps({'status': 'PASS', 'preflight': report,
                      'candidate_only_version_manifest_checksums_changed': True,
                      'guarded_installer_and_rollback_preserved': True}, indent=2))
