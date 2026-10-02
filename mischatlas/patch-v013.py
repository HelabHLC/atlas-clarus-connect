from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parent
plugin=root/'dist'/'atlas-clarus-mischatlas'
php=plugin/'atlas-clarus-mischatlas.php'
php.write_text(php.read_text().replace('0.1.2','0.1.3'))
asset=plugin/'assets'/'mischatlas.html'
text=asset.read_text()
assert 'addEventListner' not in text
assert text.count('addEventListener') >= 2
asset.write_text(text.replace('ATLAS_UserPalette_Recipes_v012.json','ATLAS_UserPalette_Recipes_v013.json'))
manifest={str(p.relative_to(plugin)):hashlib.sha256(p.read_bytes()).hexdigest() for p in plugin.rglob('*') if p.is_file() and p.name!='SHA256.json'}
(plugin/'SHA256.json').write_text(json.dumps(manifest,indent=2))
archive=root/'dist'/'atlas-clarus-mischatlas-0.1.3.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(plugin.rglob('*')):
        if p.is_file():z.write(p,str(p.relative_to(plugin.parent)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(archive)
