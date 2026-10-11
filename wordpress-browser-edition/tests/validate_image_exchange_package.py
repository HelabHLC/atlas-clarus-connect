"""Verify RC32.2 installers, preserved RC32.1 modules and a complete desktop helper."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import zipfile
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'wordpress-browser-edition'))
sys.path.insert(0,str(ROOT/'browser-bundle'))
from verify_package import verify
from build_image_exchange_pilot import base_bundle

wp,bundle,helper = map(Path,sys.argv[1:])
sha = lambda b: hashlib.sha256(b).hexdigest()
prefix = 'atlas-clarus-browser-bundle/'
with tempfile.TemporaryDirectory() as tmp:
    with zipfile.ZipFile(wp) as z:
        assert z.testzip() is None
        assert z.read('atlas-clarus-browser-edition/assets/bundle.zip') == bundle.read_bytes()
        z.extractall(tmp)
    root = Path(tmp)/'atlas-clarus-browser-edition'
    report = verify(root)
    assert report['plugin_version']=='0.1.15-beta13'
    source=(root/'atlas-clarus-browser-edition.php').read_text()
    baseline=ROOT/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip'
    with zipfile.ZipFile(baseline) as z:
        previous=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
    for start,end in [('private static function install_bundle()','private static function validate_manifest'),
                      ('public static function handle_rollback_request()','private static function remove_tree')]:
        assert source.split(start)[1].split(end)[0] == previous.split(start)[1].split(end)[0].replace('RC32.1','RC32.2')
with zipfile.ZipFile(io.BytesIO(base_bundle())) as old,zipfile.ZipFile(bundle) as new:
    assert new.testzip() is None
    assert set(new.namelist())-set(old.namelist())=={prefix+'docs/IMAGE_EXCHANGE_QUICKSTART.md'}
    assert not set(old.namelist())-set(new.namelist())
    changed={n for n in old.namelist() if old.read(n)!=new.read(n)}
    assert changed=={prefix+n for n in ['index.html','assets/image-projects-ui.js','BUNDLE_MANIFEST.json','SHA256SUMS.txt']},changed
    for n in ['image-projects.js','image-project-codecs.js','colour-reference-card.js','colour-projects.js','colour-handoff.js','palette-export.js']:
        assert new.read(prefix+'assets/'+n)==old.read(prefix+'assets/'+n),n
    html=new.read(prefix+'index.html').decode()
    assert 'id="ip-exchange-help"' in html and 'id="ch-reference-card"' in html
    ui=(ROOT/'browser-bundle/src/image-projects-ui.js').read_text()
    assert '<script>'+ui.replace('</script','<\\/script')+'</script>' in html
    manifest=json.loads(new.read(prefix+'BUNDLE_MANIFEST.json'))
    assert manifest['image_exchange_policy']=='EXACT_SOURCE_PIXEL_MATCH'
    assert manifest['physical_apple_acceptance']=='NOT_TESTED'
    bundle_files={n:new.read(n) for n in new.namelist()}
with zipfile.ZipFile(helper) as z:
    assert z.testzip() is None
    root='ATLAS_Clarus_Image_Exchange_RC32.2/'
    for n,b in bundle_files.items():
        assert z.read(root+'browser-bundle/build-source-binding/'+n)==b
    for n in ['tools/image-project-exchange.cjs','tests/package.json','tests/package-lock.json']:
        assert z.read(root+'browser-bundle/'+n)==(ROOT/'browser-bundle'/n).read_bytes()
    checked=set()
    for line in z.read(root+'SHA256SUMS.txt').decode().splitlines():
        digest,n=line.split('  ',1)
        assert sha(z.read(root+n))==digest and n not in checked
        checked.add(n)
    assert {root+n for n in checked}==set(z.namelist())-{root+'SHA256SUMS.txt'}
print(json.dumps({'status':'PASS','wordpress_sha256':sha(wp.read_bytes()),'bundle_sha256':sha(bundle.read_bytes()),
                  'helper_sha256':sha(helper.read_bytes()),'previous_modules_preserved':True,
                  'guarded_installer_and_rollback_preserved':True,'complete_helper_payload':True,'preflight':report}))
