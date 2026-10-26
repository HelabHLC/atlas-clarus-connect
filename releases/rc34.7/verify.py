import hashlib,json,zipfile,sys,re
from pathlib import Path
out=Path(sys.argv[1]);info=json.loads((out/'release-info.json').read_text());plugin=next(out.glob('*Browser_Edition*.zip'));bundle=next(out.glob('*Browser_Bundle*.zip'))
assert hashlib.sha256(plugin.read_bytes()).hexdigest()==info['plugin_sha256'];assert hashlib.sha256(bundle.read_bytes()).hexdigest()==info['bundle_sha256']
with zipfile.ZipFile(plugin)as z:
 assert z.testzip()is None
 php=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode();assert '0.1.16-beta4'in php;assert info['bundle_sha256']in php;assert z.read('atlas-clarus-browser-edition/assets/bundle.zip')==bundle.read_bytes()
 assert 'expected_runtime_sha256'in php and 'register_install_ability'in php
with zipfile.ZipFile(bundle)as z:
 prefix='atlas-clarus-browser-bundle/';assert z.testzip()is None;m=json.loads(z.read(prefix+'BUNDLE_MANIFEST.json'));assert m['deployment_allowed']is True and m['print_paths']==['4C','ECG','TEXTILE_RGB'];assert m['master_rows']==13283 and m['physical_textile_qc']=='NOT_MEASURED'
 covered=set()
 for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
  h,name=line.split('  ',1);assert hashlib.sha256(z.read(prefix+name)).hexdigest()==h;covered.add(prefix+name)
 assert covered==set(z.namelist())-{prefix+'SHA256SUMS.txt'}
print('PASS release ZIPs, embedded pins, complete checksums, frozen master, three paths and guarded installer')
