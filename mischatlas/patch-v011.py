from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parent
out=root/'dist'
plugin=out/'atlas-clarus-mischatlas'
html=plugin/'assets/mischatlas.html'
s=html.read_text()
assert s.count('Lichtartenbilanz der 12.556 HLC-Treffer')==1
s=s.replace('Lichtartenbilanz der 12.556 HLC-Treffer','Lichtartenbilanz der HLC-Modelltreffer')
html.write_text(s)
php=plugin/'atlas-clarus-mischatlas.php'
php.write_text(php.read_text().replace('0.1.0','0.1.1'))
manifest={str(p.relative_to(plugin)):hashlib.sha256(p.read_bytes()).hexdigest() for p in plugin.rglob('*') if p.is_file() and p.name!='SHA256.json'}
(plugin/'SHA256.json').write_text(json.dumps(manifest,indent=2))
archive=out/'atlas-clarus-mischatlas-0.1.1.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(plugin.rglob('*')):
        if p.is_file(): z.write(p,str(p.relative_to(out)))
with zipfile.ZipFile(archive) as z: assert z.testzip() is None
print(archive)
