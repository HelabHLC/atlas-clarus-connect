"""Promote the tested textile runtime and package the existing guarded WP installer."""
import argparse,hashlib,json,re,sys,tempfile,zipfile,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];WP=ROOT/'wordpress-browser-edition'
sys.path.insert(0,str(ROOT/'browser-bundle'))
from build_image_exchange_pilot import zip_tree
VERSION='0.2.0-rc34.7-textile-conversion';PLUGIN='0.1.16-beta4'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def literal(v):
 if type(v)is bool:return 'true' if v else 'false'
 if type(v)is int:return str(v)
 return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
def once(s,a,b):
 assert s.count(a)==1,a[:90]
 return s.replace(a,b,1)
def package(candidate,out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory() as tmp:
  tmp=Path(tmp)
  with zipfile.ZipFile(candidate)as z:z.extractall(tmp)
  dist=tmp/'atlas-clarus-browser-bundle';mp=dist/'BUNDLE_MANIFEST.json';m=json.loads(mp.read_text());assert m['version']==VERSION+'-preview'
  html=dist/'index.html';html.write_text(html.read_text().replace(VERSION+'-preview',VERSION))
  m.update(version=VERSION,status='TEXTILE_CONVERSION_PUBLIC_BETA',deployment_allowed=True,print_handoff_version='0.2.0',print_paths=['4C','ECG','TEXTILE_RGB'],print_device_calculation='SINGLE_REFERENCE_CMYK_ECG_FOGRA58_RGB16_WITH_PROFILE_BOUND_PDF',print_exports=m['print_exports']+['ICCBased_FOGRA58_RGB_REFERENCE_PDF'],image_preview='PKL_FULL_REFERENCE_THEN_INDEPENDENT_4C_ECG_FOGRA58_ICC_PREVIEWS',owner_release_authorization='2026-10-26_USER_APPROVED',physical_textile_qc='NOT_MEASURED')
  mp.write_text(json.dumps(m,indent=2)+'\n')
  (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n'for p in sorted(dist.rglob('*'))if p.is_file()and p.name!='SHA256SUMS.txt'))
  bundle=out/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,bundle)
  # Same reviewed installer/rollback implementation; explicit identity/config changes only.
  php=(WP/'atlas-clarus-browser-edition.php').read_text().replace('0.1.15-beta8',PLUGIN).replace('0.2.0-rc28-source-provenance',VERSION).replace('RC27','RC34.7').replace('RC28','RC34.7')
  php=re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',php,count=1)
  php=re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256 = '{sha(bundle)}';",php,count=1)
  a=php.index('$expected = array(')+len('$expected = array(');b=php.index(');',a);php=php[:a]+'\n'+''.join(f"            '{k}' => {literal(v)},\n"for k,v in m.items()if type(v)in(bool,int,str))+'        '+php[b:]
  php=once(php,"array( '4C', 'ECG' ) !== ( $manifest['print_paths']", "array( '4C', 'ECG', 'TEXTILE_RGB' ) !== ( $manifest['print_paths']")
  php=once(php,"'DEVICEN_CMYKOGV_REFERENCE_PDF' ) !== ( $manifest['print_exports']", "'DEVICEN_CMYKOGV_REFERENCE_PDF', 'ICCBased_FOGRA58_RGB_REFERENCE_PDF' ) !== ( $manifest['print_exports']")
  hook='    public static function boot() {\n';php=once(php,hook,hook+"        if ( function_exists( 'wp_register_ability' ) ) {\n            add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_ability_category' ) );\n            add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_install_ability' ) );\n        }\n")
  php=once(php,'    private static function validate_manifest( $manifest ) {',(WP/'handoff-abilities.php.inc').read_text()+'\n    private static function validate_manifest( $manifest ) {')
  php=once(php,"return preg_replace( '/<\\/body>/i', $style . $link . '</body>', $html, 1 );","return substr_replace( $html, $style . $link, strripos( $html, '</body>' ), 0 );")
  php=once(php,'    public static function serve_runtime_file() {',(WP/'exchange-help.php.inc').read_text()+'\n    public static function serve_runtime_file() {')
  php=once(php,'$html = self::inject_canvas_exit_button( $html );','$html = self::inject_canvas_exit_button( $html );\n            $html = self::inject_exchange_help( $html );')
  php=once(php,'<h2>Empfohlene öffentliche Adresse</h2>','<h2>RC34.7 · Textile RGB / FOGRA58</h2><p>ICC-Umrechnung, RGB-Referenzdaten mit eingebettetem Profil im PDF und PKL-first B/A-Bildvorschau. ICC-Profil lokal laden. Keine physische Druckfreigabe. Vor dem Wechsel offene Arbeit exportieren.</p><h2>Empfohlene öffentliche Adresse</h2>')
  stage=out/'plugin-source/atlas-clarus-browser-edition';(stage/'assets').mkdir(parents=True,exist_ok=True)
  (stage/'atlas-clarus-browser-edition.php').write_text(php);shutil.copy2(WP/'index.php',stage/'index.php');(stage/'readme.txt').write_text(f'ATLAS Clarus Browser Edition {PLUGIN}\nRC34.7 textile RGB public beta. Explicit verify/install retains previous runtime for rollback. Frozen ATLAS master unchanged. No physical textile approval.\n');shutil.copy2(bundle,stage/'assets/bundle.zip')
  plugin=out/f'ATLAS_Clarus_Browser_Edition_v{PLUGIN}_RC34.7.zip';zip_tree(stage,plugin)
  # zip_tree retains root directory; preflight independently checks archive and all runtime files.
  with zipfile.ZipFile(plugin)as z:
   assert 'atlas-clarus-browser-edition/assets/bundle.zip'in z.namelist();assert z.testzip()is None
  info={'plugin_version':PLUGIN,'bundle_version':VERSION,'bundle_sha256':sha(bundle),'bundle_size':bundle.stat().st_size,'plugin_sha256':sha(plugin),'plugin_size':plugin.stat().st_size,'previous_runtime_sha256':'55b5b12faa7b05b3b2b193fb8a15d767e05e467cf355c3f96403e8db932b650c'}
  (out/'release-info.json').write_text(json.dumps(info,indent=2)+'\n')
  for p in [bundle,plugin]:(out/(p.name+'.sha256')).write_text(sha(p)+'  '+p.name+'\n')
  shutil.copy2(mp,out/'BUNDLE_MANIFEST.json');print(json.dumps(info))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();package(a.candidate,a.output_dir)
