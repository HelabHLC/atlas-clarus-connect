"""Promote the tested RC33.8 preview and wrap it with the unchanged guarded installer."""
import argparse,hashlib,json,re,sys,tempfile,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'browser-bundle'))
from build_protection_release import build as base_build
PREVIEW="0.2.0-rc33.8-region-correction-preview"
from build_image_exchange_pilot import zip_tree,sha
from build_protection_plugin import prepare_source
from build_plugin import build,REPO
VERSION='0.1.15-beta17'
RUNTIME='0.2.0-rc33.8-region-correction'
def package(output):
 output.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='atlas-rc338-') as tmp:
  tmp=Path(tmp);base_build(tmp/'preview');dist=tmp/'preview/atlas-clarus-browser-bundle'
  recovery=REPO/'releases/rc33.8/recovered';delta=json.loads((recovery/'index.delta.json').read_text());index=dist/'index.html';assert sha(index.read_bytes())==delta['base_sha256']
  lines=index.read_text().splitlines(keepends=True)
  for op in reversed(delta['operations']):lines[op['start']:op['end']]=[op['text']]
  index.write_text(''.join(lines));assert sha(index.read_bytes())==delta['result_sha256']
  for p in recovery.rglob('*'):
   if p.is_file() and p.name!='index.delta.json':
    target=dist/p.relative_to(recovery);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
  for line in (dist/'SHA256SUMS.txt').read_text().splitlines():
   digest,name=line.split('  ',1);assert sha((dist/name).read_bytes())==digest,name
  before={p.relative_to(dist).as_posix():p.read_bytes() for p in dist.rglob('*') if p.is_file()}
  index=dist/'index.html';index.write_text(index.read_text().replace(PREVIEW,RUNTIME))
  m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());m.update(version=RUNTIME,status='REGION_CORRECTION_PUBLIC_BETA',deployment_allowed=True)
  assert m==json.loads((REPO/'browser-bundle/manifest-rc33.8.json').read_text())
  (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
  (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
  changed={n for n,b in before.items() if (dist/n).read_bytes()!=b};assert changed=={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt'}
  bundle=output/f'ATLAS_Clarus_Browser_Bundle_v{RUNTIME}.zip';zip_tree(dist,bundle)
  # Prepare reviewed beta15 source using its unchanged pinned RC33.5 archive.
  base=tmp/'preview/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc33.5-original-area-protection.zip';stage=tmp/'source';prepare_source(stage,base)
  php=stage/'atlas-clarus-browser-edition.php';s=php.read_text().replace('0.1.15-beta15',VERSION).replace('0.2.0-rc33.5-original-area-protection',RUNTIME).replace('RC33.5','RC33.8')
  s=re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',s,count=1)
  s=re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256 = '{sha(bundle.read_bytes())}';",s,count=1)
  def literal(v):
   if isinstance(v,bool):return 'true' if v else 'false'
   if isinstance(v,int):return str(v)
   return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
  a=s.index('$expected = array(')+len('$expected = array(');b=s.index(');',a)
  s=s[:a]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in m.items() if not isinstance(v,(list,dict)))+'        '+s[b:]
  s=s.replace('Neu in RC33.8: Originalfarb- und Bereichsschutz.','Neu in RC33.8: Bereich korrigieren und schützen.</strong> RGB only: Start mit 32 Farben. Bereiche direkt im reduzierten Bild auswählen, Originalpixel untersuchen und erneut berechnen. Bibliotheksmodus schützt nächstliegende Bibliotheksreferenzen; Originalmodus stellt eingefrorene browser-dekodierte RGBA wieder her. Palettenkonflikte erhalten das bisherige Ergebnis. RGB-Abweichungskarte und prüfbare PNG-/ZIP-Exporte enthalten. <strong>Originalfarb- und Bereichsschutz:')
  php.write_text(s)
  (stage/'readme.txt').write_text(f'ATLAS Clarus Browser Edition {VERSION}\nRC33.8 public beta: RGB only, default 32 colours, result-region correction, both protection modes and RGB deviation map.\nUpdating the plugin preserves the current runtime. Then use Tools > ATLAS Clarus Browser Edition to verify and activate the embedded RC33.8. Previous runtime retained for rollback. Export open projects before updating; no autosave.\n')
  wp=build(bundle,output,source=stage,archive_name=f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC33.8.zip')
  for p in [bundle,wp]:(output/(p.name+'.sha256')).write_text(sha(p.read_bytes())+'  '+p.name+'\n')
  print('PASS metadata-only preview promotion; all runtime/master assets identical')
 return wp
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=REPO/'downloads/rc33.8');package(p.parse_args().output_dir.resolve())
