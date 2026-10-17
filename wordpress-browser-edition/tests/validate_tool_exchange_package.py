from pathlib import Path
import zipfile,json,hashlib,io,re
root=Path(__file__).resolve().parents[2];out=root/'downloads/rc34.1'
wp=out/'ATLAS_Clarus_Browser_Edition_v0.1.16-beta1_RC34.1.zip'
with zipfile.ZipFile(wp) as z:
 assert z.testzip() is None
 source=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
 bundle=z.read('atlas-clarus-browser-edition/assets/bundle.zip')
assert str(len(bundle))==re.search(r'const BUNDLE_SIZE = (\d+);',source)[1]
assert hashlib.sha256(bundle).hexdigest()==re.search(r"const BUNDLE_SHA256 = '([^']+)';",source)[1]
with zipfile.ZipFile(io.BytesIO(bundle)) as z:
 assert z.testzip() is None
 prefix='atlas-clarus-browser-bundle/'
 m=json.loads(z.read(prefix+'BUNDLE_MANIFEST.json'))
 for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
  h,n=line.split('  ',1);assert hashlib.sha256(z.read(prefix+n)).hexdigest()==h,n
 assert m['deployment_allowed'] is True and m['version']=='0.2.0-rc34.1-tool-exchange'
 assert m['master_sha256']=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
 assert m['tool_exchange_schema']=='atlas-clarus-tool-exchange/1.0'
 assert hashlib.sha256(z.read(prefix+'mixing-atlas-recipe-import.html')).hexdigest()==m['recipe_import_sha256']
 # Test the EXACT packaged runtime using existing browser regressions.
 z.extractall(root/'browser-bundle/build-tool-exchange')
 Path('/tmp/atlas-help-runtime.html').write_bytes(z.read(prefix+'index.html'))
Path('/tmp/atlas-browser-help.php').write_text(source)
Path('/tmp/atlas-rc341-manifest.json').write_text(json.dumps(m))
assert source.index('self::validate_manifest( $manifest )')<source.index('update_option( self::OPTION_RUNTIME_PATH, $runtime')
assert 'self::OPTION_PREVIOUS_RUNTIME' in source and 'expected_runtime_sha256' in source
print('PASS packaged ZIP CRC, every embedded SHA-256, pinned master, complete recipe importer, guarded installer and rollback retained')
