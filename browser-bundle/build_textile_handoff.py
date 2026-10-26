"""Isolated Print handoff extension over RC34.5; no deployment or bundled ICC."""
import argparse,hashlib,json,shutil,tempfile,zipfile
from pathlib import Path
from build_camera_edition import build as base_build,VERSION as BASE_VERSION
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc34.6-textile-handoff-preview'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def once(s,a,b):
    if s.count(a)!=1:raise ValueError('Integration anchor: '+a[:70])
    return s.replace(a,b,1)
def build(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    dist=output/'atlas-clarus-browser-bundle'
    if dist.exists():raise ValueError('Choose a fresh output directory')
    with tempfile.TemporaryDirectory(prefix='atlas-textile-') as tmp:
        archive=base_build(Path(tmp)/'camera')
        with zipfile.ZipFile(archive) as z:z.extractall(output)
    html=(dist/'index.html').read_text().replace(BASE_VERSION,VERSION)
    for name in ['print-handoff.js','print-ui.js']:
        old=(dist/'assets'/name).read_text();new=(HERE/'textile'/name).read_text()
        html=once(html,old,new);(dist/'assets'/name).write_text(new)
    html=once(html,'      <div id="print-image-preview"','      '+(HERE/'textile/panel.html').read_text()+'\n      <div id="print-image-preview"')
    html=once(html,'One frozen reference set. Two independent production paths. Prepare 4C and ECG side by side, each with its own output profile and print settings.','One frozen reference set. Independent 4C and ECG paths, plus a documented Textile RGB / FOGRA58 handoff. Textile RGB values are not calculated.')
    html=once(html,'Export both paths · JSON','Export all three paths · JSON')
    (dist/'index.html').write_text(html)
    docs=dist/'docs/textile-handoff';docs.mkdir();shutil.copy2(HERE/'TEXTILE_HANDOFF.md',docs/'README.md');shutil.copytree(HERE/'textile',docs/'source')
    for src in [HERE/'build_textile_handoff.py',HERE/'tests/validate_textile_handoff.cjs',HERE/'tests/validate_textile_ui.cjs',HERE/'tests/validate_textile_bundle.cjs']:shutil.copy2(src,docs/src.name)
    mpath=dist/'BUNDLE_MANIFEST.json';m=json.loads(mpath.read_text());m.update(version=VERSION,status='TEXTILE_HANDOFF_OFFLINE_PREVIEW',deployment_allowed=False,textile_profile_mode='LOCAL_USER_FILE_EXACT_PIN_NO_BUNDLED_ICC',textile_profile_sha256='fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d',textile_conversion='NOT_PERFORMED',physical_textile_qc='NOT_MEASURED',legacy_print_handoff='0.1.0_IMPORT_SUPPORTED',textile_print_handoff='0.2.0',base_source_commit='17a0e565903632cd5cc82d366bf883a0383155fd');mpath.write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-dir',type=Path,required=True);print(build(p.parse_args().output_dir.resolve()))
