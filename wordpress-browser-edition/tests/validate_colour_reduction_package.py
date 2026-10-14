"""Verify the installable RC33.2 wrapper and exact RC33.1 runtime boundary."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import zipfile
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'wordpress-browser-edition'))
from verify_package import verify
wp,bundle,preview=map(Path,sys.argv[1:])
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(preview.read_bytes())=='2df593619196cdf4b808e8f2199a28e1fb7aaf7a65cc5db6e5056e632174b1e5'
assert sha(bundle.read_bytes())=='95342c346fc8c73acb89a365ba9f4818184630e45b71b0e1726a9a1c76bf3aee'
with tempfile.TemporaryDirectory() as tmp:
    with zipfile.ZipFile(wp) as z:
        assert z.testzip() is None
        assert z.read('atlas-clarus-browser-edition/assets/bundle.zip')==bundle.read_bytes()
        z.extractall(tmp)
    root=Path(tmp)/'atlas-clarus-browser-edition'
    report=verify(root)
    assert report['plugin_version']=='0.1.15-beta14'
    source=(root/'atlas-clarus-browser-edition.php').read_text()
    with zipfile.ZipFile(ROOT/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip') as z:
        previous=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
    for start,end in [('private static function install_bundle()','private static function validate_manifest'),
                      ('public static function handle_rollback_request()','private static function remove_tree')]:
        assert source.split(start)[1].split(end)[0]==previous.split(start)[1].split(end)[0].replace('RC32.1','RC33.2')
with zipfile.ZipFile(preview) as old,zipfile.ZipFile(bundle) as new:
    assert new.testzip() is None and set(old.namelist())==set(new.namelist())
    prefix='atlas-clarus-browser-bundle/'
    changed={n for n in old.namelist() if old.read(n)!=new.read(n)}
    assert changed=={prefix+n for n in ['index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt']},changed
    assert new.read(prefix+'index.html')==old.read(prefix+'index.html').replace(b'0.2.0-rc33.1-colour-reduction-loupe',b'0.2.0-rc33.2-colour-reduction-update')
    before=json.loads(old.read(prefix+'BUNDLE_MANIFEST.json'));after=json.loads(new.read(prefix+'BUNDLE_MANIFEST.json'))
    before.update(version=after['version'],status='COLOUR_REDUCTION_PUBLIC_PILOT',deployment_allowed=True)
    assert after==before
print(json.dumps({'status':'PASS','wordpress_sha256':sha(wp.read_bytes()),'bundle_sha256':sha(bundle.read_bytes()),
                  'preview_modules_byte_identical':True,'guarded_installer_and_rollback_preserved':True,'preflight':report}))
