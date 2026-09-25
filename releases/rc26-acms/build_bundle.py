from pathlib import Path
import shutil,json,hashlib,zipfile
root=Path(__file__).resolve().parents[2]
repo=root
parts=sorted((root/'releases/rc26-acms/baseline').glob('rc25.zip.part-*'))
assert len(parts)==7
baseline=root/'releases/rc26-acms/work/ATLAS_Clarus_Browser_Bundle_RC25_staging.zip'
baseline.parent.mkdir(parents=True,exist_ok=True)
with baseline.open('wb') as f:
 for part in parts:f.write(part.read_bytes())
assert hashlib.sha256(baseline.read_bytes()).hexdigest()=='005ccb7d5356777e0bad6706bf922f726144f98ab8aaf78ee82c15293c39a0dd'
base=root/'releases/rc26-acms/work/baseline/atlas-clarus-browser-bundle'
with zipfile.ZipFile(baseline) as z:z.extractall(base.parent)
out=root/'releases/rc26-acms/work/rc26-preserved/atlas-clarus-browser-bundle'
if out.exists():shutil.rmtree(out)
shutil.copytree(base,out)
assets=out/'assets'
oldapp=(assets/'app.js').read_text()
app=oldapp
needle="  let selected=colors.find(c=>c.id===4665)||colors[0];"
app=app.replace(needle,"  let acmsStore=null;\n  try{acmsStore=window.ATLAS_ACMS_RECIPES.create(window.ATLAS_ACMS_DATA,colors,doc.master_sha256,libraryViews)}catch(_){/* Fail closed for ACMS. */}\n"+needle)
app=app.replace("const recipeHtml=window.ATLAS_CLARUS_RECIPES?window.ATLAS_CLARUS_RECIPES.render(recipeStore,c):'<p>Recipe module unavailable. Reference identity unchanged.</p>';", "const solidView=activeView==='solid_c'||activeView==='solid_u';const recipeHtml=solidView?(window.ATLAS_ACMS_RECIPES?window.ATLAS_ACMS_RECIPES.render(acmsStore,c,activeView):'<p>ACMS module unavailable. Reference identity unchanged.</p>'):(window.ATLAS_CLARUS_RECIPES?window.ATLAS_CLARUS_RECIPES.render(recipeStore,c):'<p>Recipe module unavailable. Reference identity unchanged.</p>');")
app=app.replace('drawSimulation();renderWheelCards()}',"document.querySelectorAll('[data-acms-png]').forEach(b=>b.onclick=()=>window.ATLAS_ACMS_RECIPES.download(acmsStore,c,activeView,Number(b.dataset.acmsPng)));drawSimulation();renderWheelCards()}",1)
app=app.replace("activeView=$('#library-view').value;filter()};", "activeView=$('#library-view').value;filter();if(filtered.length)select(filtered.find(c=>c.id===selected?.id)||filtered[0])};")
assert app!=oldapp and app.count('data-acms-png')==1 and app.count('let acmsStore')==1
(assets/'app.js').write_text(app)
css=(assets/'app.css').read_text()
local_css=(root/'releases/rc26-acms/acms.css').read_text()
acms_css=next(line for line in local_css.splitlines() if line.startswith('.acms-candidate{'))
(assets/'app.css').write_text(css+'\n'+acms_css+'\n')
module=(repo/'browser-bundle/src/acms-recipes.js').read_text()
(assets/'acms-recipes.js').write_text(module)
data=json.loads((repo/'hover-library/data/acms-solid-recipe-candidates.json').read_text())
assert len(data['rows'])==3653
payload='window.ATLAS_ACMS_DATA='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';\n'
(assets/'acms-data.js').write_text(payload)
html=(out/'index.html').read_text()
assert '<style>'+css+'</style>' in html
html=html.replace('<style>'+css+'</style>','<style>'+css+'\n'+acms_css+'\n</style>',1)
def inline(script):return '<script>'+script.replace('</script','<\\/script')+'</script>'
assert inline(oldapp) in html
html=html.replace(inline(oldapp),inline(app),1)
anchor='<script>window.ATLAS_BASIS23_DATA='
pos=html.find(anchor)
assert pos>0
html=html[:pos]+inline(payload)+'\n  '+inline(module)+'\n  '+html[pos:]
version='0.2.0-rc26-names-v0-3-0-chsos-pilot-acms-spot-ba'
html=html.replace('v0.2.0-rc25-names-v0-3-0-chsos-pilot-ui4','v'+version)
(out/'index.html').write_text(html)
manifest=json.loads((out/'BUNDLE_MANIFEST.json').read_text())
manifest.update(version=version,acms_spot_candidates='SOLID_C_U_MODEL_ONLY_NOT_MEASURED',acms_spot_rows=3653,acms_preview_model=data['registry']['preview_model'],acms_source_sha256=hashlib.sha256((repo/'hover-library/data/acms-solid-recipe-candidates.json').read_bytes()).hexdigest())
(out/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=sorted(p for p in out.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
(out/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(out).as_posix()}\n' for p in files))
zip_path=out.parent/f'ATLAS_Clarus_Browser_Bundle_v{version}.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(out.rglob('*')):
  if p.is_file():
   info=zipfile.ZipInfo((Path(out.name)/p.relative_to(out)).as_posix(),(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
   z.writestr(info,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print(zip_path,zip_path.stat().st_size,sha(zip_path),manifest['name_search_index_sha256'])
