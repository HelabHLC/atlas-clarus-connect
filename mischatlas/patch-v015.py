"""Package the UI status fix as 0.1.5; preserve embedded data and algorithms."""
from pathlib import Path
import hashlib, json, re, zipfile

root = Path(__file__).resolve().parent
plugin = root / 'dist' / 'atlas-clarus-mischatlas'
asset = plugin / 'assets' / 'mischatlas.html'
source = asset.read_text()
updated = source
for old, new in [
    ('<title>ATLAS Clarus Mixing Atlas · 38-light experimental mixing · 0.1.4</title>',
     '<title>ATLAS Clarus Mixing Atlas · 38-light experimental mixing · 0.1.5</title>'),
    ('<b>Version 0.1.4 · 38-light experimental mixing.</b>',
     '<b>Version 0.1.5 · 38-light experimental mixing.</b>'),
]:
    assert updated.count(old) == 1, old
    updated = updated.replace(old, new, 1)
scripts = lambda text: re.findall(r'<script\b[^>]*>.*?</script>', text, re.S)
assert scripts(updated) == scripts(source), 'Version patch must not change any script or embedded data'
asset.write_text(updated)
php = plugin / 'atlas-clarus-mischatlas.php'
wrapper = php.read_text()
assert '0.1.4' in wrapper
php.write_text(wrapper.replace('0.1.4', '0.1.5'))
manifest = {str(p.relative_to(plugin)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in plugin.rglob('*') if p.is_file() and p.name != 'SHA256.json'}
(plugin / 'SHA256.json').write_text(json.dumps(manifest, indent=2))
archive = root / 'dist' / 'atlas-clarus-mischatlas-0.1.5.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(plugin.rglob('*')):
        if p.is_file():
            z.write(p, str(p.relative_to(plugin.parent)))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
print(json.dumps({'version': '0.1.5', 'html_sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
                  'version_patch_preserves_all_scripts': True, 'archive': str(archive)}))
