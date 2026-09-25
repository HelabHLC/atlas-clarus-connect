from pathlib import Path
import hashlib,zipfile,json,shutil
root=Path(__file__).resolve().parents[2]; rc=root/'releases/rc26-acms'; src=rc/'baseline/atlas-clarus-browser-edition-0.1.15-beta4.php'; bundle=next((rc/'work/rc26-preserved').glob('ATLAS_Clarus_Browser_Bundle*.zip')); manifest=json.loads((rc/'work/rc26-preserved/atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json').read_text()); version=manifest['version']; target=rc/'work/rc26-preserved/atlas-clarus-browser-edition';target.mkdir(exist_ok=True)
p=src.read_text();p=p.replace('0.1.15-beta4','0.1.15-beta6').replace('0.2.0-rc25-names-v0-3-0-chsos-pilot-ui4','0.2.0-rc26-names-v0-3-0-chsos-pilot-acms-spot-ba').replace('v0.2.0-rc25-names-v0-3-0-chsos-pilot-ui4','v'+version).replace('3304493',str(bundle.stat().st_size)).replace('005ccb7d5356777e0bad6706bf922f726144f98ab8aaf78ee82c15293c39a0dd',hashlib.sha256(bundle.read_bytes()).hexdigest()).replace('pinned RC25 manifest','pinned RC26 manifest')
needle="            'basis23_recipes' => 'COMPUTATIONAL_ONLY_NOT_MEASURED',"
assert p.count(needle)==1
p=p.replace(needle,"            'acms_spot_candidates' => 'SOLID_C_U_MODEL_ONLY_NOT_MEASURED',\n            'acms_spot_rows' => 3653,\n            'acms_preview_model' => '"+manifest['acms_preview_model']+"',\n            'acms_source_sha256' => '"+manifest['acms_source_sha256']+"',\n"+needle)
(target/'atlas-clarus-browser-edition.php').write_text(p)
(target/'index.php').write_text('<?php // Silence is golden.\n')
(target/'readme.txt').write_text('ATLAS Clarus Browser Edition 0.1.15-beta6\nRC26 ACMS Spot C/U candidate preview. Computational only; not measured.\n')
(target/'assets').mkdir(exist_ok=True);shutil.copy2(bundle,target/'assets/bundle.zip')
zip_path=target.parent/'ATLAS_Clarus_Browser_Edition_v0.1.15-beta6_RC26.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(target.rglob('*')):
  if f.is_file():
   rel=f.relative_to(target).as_posix()
   stamp=(2026,9,25,5,6,14) if rel=='assets/bundle.zip' else (2026,9,25,5,9,10)
   info=zipfile.ZipInfo((Path(target.name)/rel).as_posix(),stamp)
   info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
   z.writestr(info,f.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print(zip_path, zip_path.stat().st_size,hashlib.sha256(zip_path.read_bytes()).hexdigest())
