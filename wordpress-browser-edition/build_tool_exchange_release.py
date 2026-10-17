"""Package RC34.1 public-beta candidate with pinned installer and separate stored-recipe reader."""
from pathlib import Path
import hashlib,io,json,re,sys,tempfile,zipfile
ROOT=Path(__file__).resolve().parent;REPO=ROOT.parent
sys.path.insert(0,str(REPO/'browser-bundle'))
from build_tool_exchange_preview import build as preview_build
from build_image_exchange_pilot import zip_tree
sha=lambda b:hashlib.sha256(b).hexdigest()
VERSION='0.1.16-beta1';RUNTIME='0.2.0-rc34.1-tool-exchange'
def build(out):
 out.mkdir(parents=True,exist_ok=True)
 # Requires the unchanged 0.1.5 mixer and the separately built tested result reader.
 mixer=REPO/'mischatlas/dist/recipe-import-preview/atlas-clarus-mixing-recipe-import-preview.html'
 assert mixer.is_file(),'Build base mixer and recipe-import preview first'
 with tempfile.TemporaryDirectory() as tmp:
  tmp=Path(tmp);preview_build(tmp/'preview');dist=tmp/'preview/atlas-clarus-browser-bundle'
  before={p.relative_to(dist).as_posix():sha(p.read_bytes()) for p in dist.rglob('*') if p.is_file()}
  entry=dist/'index.html';old=entry.read_text();new=old.replace('0.2.0-rc34.1-mixing-recipe-preview',RUNTIME)
  # A clear link to the separate importer; it does not claim an editable mixer session.
  anchor='<p><a href="mixing-atlas-recipe-import.html" target="_blank" rel="noopener">Open separate Mixing Atlas stored-recipe importer</a> · Stored computational results only; no physical validation.</p>'
  marker='<section class="view" id="exchange"';assert marker in new
  pos=new.index('>',new.index(marker))+1;new=new[:pos]+anchor+new[pos:];entry.write_text(new)
  (dist/'mixing-atlas-recipe-import.html').write_bytes(mixer.read_bytes())
  m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());m.update(version=RUNTIME,status='TOOL_EXCHANGE_PUBLIC_BETA',deployment_allowed=True,recipe_import='STORED_RESULTS_NO_AUTOMATIC_RECALCULATION',recipe_import_sha256=sha(mixer.read_bytes()))
  assert m['master_sha256']=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
  (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
  (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
  changed={n for n,h in before.items() if sha((dist/n).read_bytes())!=h};assert changed=={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt'},changed
  bundle=out/f'ATLAS_Clarus_Browser_Bundle_v{RUNTIME}.zip';zip_tree(dist,bundle)
  base=REPO/'downloads/rc33.8/ATLAS_Clarus_Browser_Edition_v0.1.15-beta17_RC33.8.zip'
  assert sha(base.read_bytes())==base.with_name(base.name+'.sha256').read_text().split()[0]
  with zipfile.ZipFile(base) as z:files={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
  name='atlas-clarus-browser-edition/atlas-clarus-browser-edition.php';s=files[name].decode().replace('0.1.15-beta17',VERSION).replace('0.2.0-rc33.8-region-correction',RUNTIME).replace('RC33.8','RC34.1')
  s=re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',s,count=1)
  s=re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256 = '{sha(bundle.read_bytes())}';",s,count=1)
  literal=lambda v:'true' if v is True else 'false' if v is False else str(v) if isinstance(v,int) else "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
  a=s.index('$expected = array(')+len('$expected = array(');b=s.index(');',a)
  s=s[:a]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in m.items() if not isinstance(v,(list,dict)))+'        '+s[b:]
  needle='    public static function serve_runtime_file() {';s=s.replace(needle,(ROOT/'exchange-help.php').read_text()+'\n'+needle)
  needle='            $html = self::inject_canvas_exit_button( $html );';assert s.count(needle)==1;s=s.replace(needle,needle+'\n            $html = self::inject_exchange_help( $html );')
  active_help = """        if ( get_option( self::OPTION_RUNTIME_SHA, '' ) === self::BUNDLE_SHA256 ) {
            $content = str_replace(
                array( 'Tool Exchange RC34/RC34.1 and the standalone recipe importer are tested development previews.', 'The workflow described here is not yet available in this public RC33.8 edition.', 'Publishing this help does not switch the application to a preview version.', 'Tool Exchange RC34/RC34.1 und der eigenständige Rezept-Rückimport sind geprüfte Entwicklungsvorschauen.', 'Der beschriebene Austauschweg ist in dieser öffentlichen RC33.8-Ausgabe noch nicht verfügbar.', 'Diese Hilfe schaltet die Anwendung nicht auf eine Vorschauversion um.' ),
                array( 'Tool Exchange RC34.1 is available as a public beta. Recipe import restores stored results only.', 'Tool Exchange is active in this edition.', '', 'Tool Exchange RC34.1 ist als öffentliche Beta verfügbar. Der Rezept-Rückimport stellt gespeicherte Ergebnisse wieder her.', 'Tool Exchange ist in dieser Ausgabe aktiv.', '' ),
                $content
            );
        }
"""
  needle = "        if ( '' === $content || false !== strpos( $html, 'id=\"atlas-exchange-help\"' ) ) {"
  assert needle in s
  s=s.replace(needle,active_help+needle)
  # Also place the existing home-link style outside embedded print templates.
  s=s.replace("return preg_replace( '/<\\/body>/i', $style . $link . '</body>', $html, 1 );", "return substr_replace( $html, $style . $link, strripos( $html, '</body>' ), 0 );")
  title='<h2>Empfohlene öffentliche Adresse</h2>'
  s=s.replace(title,'<h2>Tool Exchange RC34.1</h2><p>Native project and palette exchange; complete exchange ZIP retains originals. Mixing recipes restore stored results only. Export all open work before switching. A separate Mixing Atlas result importer is linked from Tool Exchange. No physical recipe validation or automatic collaboration sync.</p>'+title)
  files[name]=s.encode();files['atlas-clarus-browser-edition/assets/bundle.zip']=bundle.read_bytes()
  files['atlas-clarus-browser-edition/readme.txt']=(f'ATLAS Clarus Browser Edition {VERSION}\nTool Exchange RC34.1 public beta candidate.\nUpload this ZIP intact and replace the existing plugin. Then Tools > ATLAS Clarus Browser Edition > Mitgeliefertes RC34.1 prüfen und aktiv schalten. Updating the plugin alone preserves the active runtime. Export all open work first. Previous runtime retained for rollback. Recipe imports restore stored computational results; no editable search-session or physical recipe validation is claimed.\n').encode()
  target=out/f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC34.1.zip'
  with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
   for n,v in sorted(files.items()):
    info=zipfile.ZipInfo(n,(2026,10,17,2,50,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,v,compresslevel=9)
  with zipfile.ZipFile(target) as z:assert z.testzip() is None
  (out/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.name+'\n' for p in [target,bundle]))
  report={'status':'PASS','plugin_version':VERSION,'runtime':RUNTIME,'master_unchanged':True,'unchanged_preview_assets':len(before)-3,'changes_to_preview':['version/status metadata','link to separately tested recipe importer'],'bundle_sha256':sha(bundle.read_bytes()),'plugin_sha256':sha(target.read_bytes()),'ionos_live_acceptance':'PENDING','automatic_runtime_switch':False}
  (out/'VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n')
  (out/'plugin.php').write_text(s)
  print(json.dumps(report));return target
if __name__=='__main__':build(REPO/'downloads/rc34.1')
