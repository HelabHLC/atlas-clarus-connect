import json,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
P=root/'light-mixing'
plugin=root/'dist'/'atlas-clarus-mischatlas'
asset=plugin/'assets'/'mischatlas.html'
original_source=asset.read_text()
source=original_source
assert hashlib.sha256(source.encode()).hexdigest()=='0adabc4fb283688b1bfd1191e4520baffa6253912dd39cc00143ef071a479949'
worker=(P/'kernel.js').read_text()+'\n'+(P/'worker.js').read_text()
data=json.loads((P/'data.json').read_text())
data['provenance']['experiment_version']='light-mixing-experiment-v0.1'
data['provenance']['base_release_sha256']='0adabc4fb283688b1bfd1191e4520baffa6253912dd39cc00143ef071a479949'
data['provenance']['original_master_and_recipe_rows']='unchanged'
data['provenance']['light_data_quality_note']='Source metadata is retained verbatim. Some bundled CIE tables are labelled approximated by the source; no measured SPD or material-QC claim is added.'
source=source.replace('<title>ATLAS Clarus Mixing Atlas · Digital pilot v0.3</title>','<title>ATLAS Clarus Mixing Atlas · 38-light experimental mixing · 0.1.4</title>')
source=source.replace('<main>','<main><p class="banner"><b>Version 0.1.4 · 38-light experimental mixing.</b> Light-dependent recipe search for the fixed Atlas references. The new section calculates recipes for the selected illuminants. Existing references, recipes and original 12-light diagnostics remain unchanged.</p>'+ (P/'panel.html').read_text(),1)
source=source.replace("let selected=D.rows.findIndex(r=>r.atlas_reference==='H005_L040_C070')","let selected=D.rows.findIndex(r=>r.atlas_reference==='H140_L055_C040')",1)
source=source.replace("$('hue').value='5';","$('hue').value='140';",1)
addon='<script id="lightMixData" type="application/json">'+json.dumps(data,separators=(',',':'))+'</script>'
addon+='<script id="lightMixEngine" type="application/json">'+json.dumps(worker).replace('</','<\\/')+'</script>'
addon+='<script>'+ (P/'panel.js').read_text()+'</script>'
source=source.replace('</body>',addon+'</body>',1)
output=asset
output.write_text(source)
# Verify original reference and recipe payload is byte-identical.
extract=lambda s:re.search(r'<script id="data" type="application/json">(.*?)</script>',s,re.S).group(1)
assert extract(source)==extract(original_source)
scripts=re.findall(r'<script([^>]*)>(.*?)</script>',source,re.S)

print(json.dumps({'path':str(output.resolve()),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'reference_rows':13283,'reference_recipe_data_unchanged':True,'illuminants':len(data['lights']),'palette_samples':len(data['samples'])}))

import zipfile
php=plugin/'atlas-clarus-mischatlas.php'
php.write_text(php.read_text().replace('0.1.3','0.1.4'))
manifest={str(p.relative_to(plugin)):hashlib.sha256(p.read_bytes()).hexdigest() for p in plugin.rglob('*') if p.is_file() and p.name!='SHA256.json'}
(plugin/'SHA256.json').write_text(json.dumps(manifest,indent=2))
archive=root/'dist'/'atlas-clarus-mischatlas-0.1.4.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(plugin.rglob('*')):
  if p.is_file():z.write(p,str(p.relative_to(plugin.parent)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print(archive)
