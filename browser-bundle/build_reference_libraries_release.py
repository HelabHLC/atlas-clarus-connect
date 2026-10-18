"""Rebuild the exact RC34.4 public payload from its tested preview."""
import argparse,hashlib,json,tempfile,zipfile
from pathlib import Path
from build_process_library_preview import build as preview_build
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc34.4-reference-libraries'
PREVIEW_SHA='77e9f7022ea126e6b1cadb7bb1688ecddecb336f0ab9a27038b5fbe6bf420120'
PUBLIC_SHA='0163cfd86adf51219bdc1eaf051ba0f656fca03a1fb8ae5ae8478ebcefbe976e'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def build(out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='atlas-rc344-android-') as tmp:
  tmp=Path(tmp);archive=preview_build(tmp/'preview');assert sha(archive)==PREVIEW_SHA
  with zipfile.ZipFile(archive) as z:z.extractall(tmp/'public')
  dist=tmp/'public/atlas-clarus-browser-bundle';before={p.relative_to(dist).as_posix():sha(p) for p in dist.rglob('*') if p.is_file()}
  p=dist/'index.html';p.write_text(p.read_text().replace(VERSION+'-preview',VERSION))
  p=dist/'BUNDLE_MANIFEST.json';m=json.loads(p.read_text());m.update(version=VERSION,status='REFERENCE_LIBRARIES_PUBLIC_BETA',deployment_allowed=True,observed_library_views=16,library_views_total=94,library_views_visible=78,legacy_library_views_retained=16);p.write_text(json.dumps(m,indent=2)+'\n')
  (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
  assert {name for name,h in before.items() if sha(dist/name)!=h}=={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt'}
  target=out/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,target);assert sha(target)==PUBLIC_SHA
  # Existing Android preparation consumes the extracted directory as well.
  import shutil
  shutil.copytree(dist,out/'atlas-clarus-browser-bundle',dirs_exist_ok=True)
  print(json.dumps({'archive':str(target),'sha256':sha(target)}));return target
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);build(p.parse_args().output_dir.resolve())
