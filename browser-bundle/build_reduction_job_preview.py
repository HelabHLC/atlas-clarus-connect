"""Build an isolated, resumable RC33.9 preview on the pinned public RC33.8 package."""
import argparse, hashlib, json, shutil, zipfile
from pathlib import Path
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
REPO=HERE.parent
VERSION='0.2.0-rc33.9-reduction-job-preview'
BASE_SHA='cc08c0e2a31dfe52693a03ac28885278d7efa85c5362c58849167cbb255bd4d6'
def digest(b): return hashlib.sha256(b).hexdigest()
def build(output):
    output.mkdir(parents=True,exist_ok=True)
    archive=REPO/'downloads/rc33.8/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc33.8-region-correction.zip'
    assert digest(archive.read_bytes())==BASE_SHA
    dist=output/'atlas-clarus-browser-bundle'
    if dist.exists(): shutil.rmtree(dist)
    with zipfile.ZipFile(archive) as z: z.extractall(output)
    html=(dist/'index.html').read_text()
    for old,new in [('colour-reduction-inspect','reduction-job-compare'),('colour-reduction-correction-ui','reduction-job-correction-ui'),('colour-reduction-inspect-ui','reduction-job-ui')]:
        before=(REPO/f'releases/rc33.8/recovered/assets/{old}.js').read_text()
        after=(HERE/f'src/{new}.js').read_text()
        assert html.count(before)==1,old
        html=html.replace(before,after)
        (dist/f'assets/{new}.js').write_text(after)
    module=(HERE/'src/reduction-job.js').read_text()
    # Module is installed before the UI initializes, after the existing codecs.
    marker='<script>'+ (HERE/'src/reduction-job-ui.js').read_text()
    assert html.count(marker)==1
    html=html.replace(marker,'<script>'+module+'</script>'+marker)
    (dist/'assets/reduction-job.js').write_text(module)
    marker='<input id="cr-file"'
    assert html.count(marker)==1
    # A separate entry point avoids confusing evidence packages and image projects.
    anchor='      <label>PNG / JPEG or Image Projects JSON / ZIP'
    assert html.count(anchor)==1
    html=html.replace(anchor,'      <label>Open complete reduction job ZIP<input id="cr-job-import" type="file" accept=".zip" disabled></label>\n      <p class="boundary">Save the complete job ZIP to resume later with palette, protections, corrections, cleanup and variants. Older evidence ZIPs cannot restore a job. Opening verifies all files and replays the result before replacing the current job.</p>\n'+anchor)
    html=html.replace('Download source + reduction ZIP','Save complete reduction job ZIP')
    html=html.replace('0.2.0-rc33.8-region-correction',VERSION)
    (dist/'index.html').write_text(html)
    manifest=json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION,status='REDUCTION_JOB_OFFLINE_PREVIEW',deployment_allowed=False,reduction_job_schema='atlas-clarus-reduction-job/1.0',reduction_job_max_bytes=384*1024*1024)
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{digest(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    result=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,result)
    (output/'SHA256SUMS.txt').write_text(digest(result.read_bytes())+'  '+result.name+'\n')
    print(json.dumps({'archive':str(result),'sha256':digest(result.read_bytes())}))
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-reduction-job');build(p.parse_args().output_dir.resolve())
