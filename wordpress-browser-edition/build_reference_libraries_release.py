"""Promote tested RC34.4 and wrap it in the checksum-pinned, guarded installer."""
import argparse,hashlib,json,re,sys,tempfile,zipfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parent
sys.path.insert(0,str(REPO/'browser-bundle'))
from build_image_exchange_pilot import zip_tree
from build_plugin import build
VERSION='0.1.16-beta2';RUNTIME='0.2.0-rc34.4-reference-libraries'
PREVIEW=REPO/'browser-bundle/build-reference-libraries/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.4-reference-libraries-preview.zip'
PREVIEW_SHA='77e9f7022ea126e6b1cadb7bb1688ecddecb336f0ab9a27038b5fbe6bf420120'
BASE=REPO/'downloads/rc33.8/ATLAS_Clarus_Browser_Edition_v0.1.15-beta17_RC33.8.zip'
BASE_SHA='002fb876ed70aca8536dfdc3720d3d74fe0983e6073ba510db450d67c6d453dc';sha=lambda b:hashlib.sha256(b).hexdigest()
def literal(v):
 if isinstance(v,bool):return 'true' if v else 'false'
 if isinstance(v,int):return str(v)
 return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
def package(out):
 out.mkdir(parents=True,exist_ok=True);assert sha(PREVIEW.read_bytes())==PREVIEW_SHA
 assert sha(BASE.read_bytes())==BASE_SHA
 with tempfile.TemporaryDirectory(prefix='atlas-rc344-release-') as tmp:
  tmp=Path(tmp)
  with zipfile.ZipFile(PREVIEW) as z:z.extractall(tmp)
  dist=tmp/'atlas-clarus-browser-bundle';before={p.relative_to(dist).as_posix():sha(p.read_bytes()) for p in dist.rglob('*') if p.is_file()}
  index=dist/'index.html';index.write_text(index.read_text().replace(RUNTIME+'-preview',RUNTIME))
  manifest=dist/'BUNDLE_MANIFEST.json';m=json.loads(manifest.read_text());m.update(version=RUNTIME,status='REFERENCE_LIBRARIES_PUBLIC_BETA',deployment_allowed=True,observed_library_views=16,library_views_total=94,library_views_visible=78,legacy_library_views_retained=16)
  manifest.write_text(json.dumps(m,indent=2)+'\n')
  (REPO/'browser-bundle/manifest-rc34.4.json').write_text(json.dumps(m,indent=2)+'\n')
  (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
  assert {n for n,h in before.items() if sha((dist/n).read_bytes())!=h}=={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt'}
  bundle=out/f'ATLAS_Clarus_Browser_Bundle_v{RUNTIME}.zip';zip_tree(dist,bundle)
  with zipfile.ZipFile(BASE) as z:
   source=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode();idx=z.read('atlas-clarus-browser-edition/index.php')
  source=source.replace('0.1.15-beta17',VERSION).replace('0.2.0-rc33.8-region-correction',RUNTIME).replace('RC33.8','RC34.4')
  source=re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',source,count=1)
  source=re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256 = '{sha(bundle.read_bytes())}';",source,count=1)
  a=source.index('$expected = array(')+len('$expected = array(');b=source.index(');',a)
  source=source[:a]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in m.items() if not isinstance(v,(list,dict)))+'        '+source[b:]
  # Preserve the RC34.1 live fix: only the final closing body is the outer document.
  source=source.replace("return preg_replace( '/<\\/body>/i', $style . $link . '</body>', $html, 1 );", "return substr_replace( $html, $style . $link, strripos( $html, '</body>' ), 0 );")
  marker='    public static function serve_runtime_file() {';assert source.count(marker)==1
  source=source.replace(marker,(ROOT/'exchange-help.php.inc').read_text()+'\n'+marker)
  source=source.replace('$html = self::inject_canvas_exit_button( $html );','$html = self::inject_canvas_exit_button( $html );\n            $html = self::inject_exchange_help( $html );')
  source=source.replace('<h2>Empfohlene öffentliche Adresse</h2>','<h2>Referenzbibliotheken RC34.4</h2><p>78 Auswahlen: vollständiger Atlas und 77 GamutMap-basierte Ansichten. Alle 16 alten Bibliotheken bleiben ausschließlich für bestehende Arbeitsstände erhalten. Master und RGB-only-Zuordnung bleiben unverändert. Gamut-Zuordnung ist kein gemessenes Druck- oder Mischrezept. Tool Exchange bleibt enthalten.</p><h2>Empfohlene öffentliche Adresse</h2>')
  source=source.replace('Neu in RC34.4: Bereich korrigieren und schützen.','RC34.4: Referenzbibliotheken und Tool Exchange.').replace('RC34.4 – öffentlicher Originalfarb- und Bereichsschutz-Pilot:','RC34.4 – öffentliche Browser-Beta:')
  assert '[REDACTED' not in source
  stage=tmp/'plugin-source';stage.mkdir();(stage/'atlas-clarus-browser-edition.php').write_text(source);(stage/'index.php').write_bytes(idx)
  (stage/'readme.txt').write_text(f'ATLAS Clarus Browser Edition {VERSION}\nRC34.4 public beta: 78 source-backed choices, all 16 legacy definitions retained only for existing work. Frozen 13283-row master unchanged. Full Tool Exchange retained.\nUpdate preserves the current runtime. Then verify and activate the embedded RC34.4 through Tools > ATLAS Clarus Browser Edition. Previous runtime retained for rollback. Export open work first; no autosave.\n')
  wp=build(bundle,out,source=stage,archive_name=f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC34.4.zip')
  for p in [bundle,wp]:(out/(p.name+'.sha256')).write_text(sha(p.read_bytes())+'  '+p.name+'\n')
 hover=out/'ATLAS_Clarus_Hover_Library_v0.2.7-beta1.zip'
 with zipfile.ZipFile(hover,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for f in sorted((REPO/'hover-library').rglob('*')):
   if f.is_file() and not {'tests','tools','__pycache__'}.intersection(f.relative_to(REPO).parts):
    info=zipfile.ZipInfo(f.relative_to(REPO).as_posix(),(2026,10,18,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,f.read_bytes())
 (out/(hover.name+'.sha256')).write_text(sha(hover.read_bytes())+'  '+hover.name+'\n')
 return wp
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=REPO/'downloads/rc34.4');out=p.parse_args().output_dir.resolve();out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='atlas-release-artifacts-') as tmp:
  stage=Path(tmp);package(stage)
  for source in sorted(stage.iterdir()):
   with tempfile.NamedTemporaryFile(dir=out,prefix='.atlas-publish-',delete=False) as f:
    target=Path(f.name);f.write(source.read_bytes())
   target.replace(out/source.name)
   assert sha((out/source.name).read_bytes())==sha(source.read_bytes())
