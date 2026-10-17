"""Isolated cross-tool exchange preview on pinned, replay-tested RC33.9."""
import argparse,json,shutil,tempfile,hashlib
from pathlib import Path
from build_reduction_job_preview import build as build_jobs
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc34.1-mixing-recipe-preview'
JOB_SHA='8d560275aade0528a4904e50839d29897cf336fa2000a65bf281628a97b6d05b'
sha=lambda b:hashlib.sha256(b).hexdigest()
def build(output):
    output.mkdir(parents=True,exist_ok=True);dist=output/'atlas-clarus-browser-bundle'
    with tempfile.TemporaryDirectory(prefix='atlas-exchange-') as tmp:
        base=build_jobs(Path(tmp));assert sha(base.read_bytes())==JOB_SHA
        if dist.exists():shutil.rmtree(dist)
        shutil.copytree(Path(tmp)/dist.name,dist)
    html=(dist/'index.html').read_text()
    before=(HERE.parent/'releases/rc33.8/recovered/assets/app.js').read_text()
    assert html.count(before)==1
    after=before.replace('function download(name,data,type){','function download(name,data,type,exchangeSkip=false){if(!exchangeSkip&&window.ATLAS_TOOL_EXCHANGE_UI?.captureNative(name,data,type))return;')
    needle='  window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download,libraryViews});'
    assert after.count(needle)==1
    after=after.replace(needle,needle+'\n  window.ATLAS_TOOL_EXCHANGE_UI.init({colors,master:MASTER,libraryViews,designerLayer,download});')
    recipe_code=(HERE.parent/'mischatlas/recipe-exchange.js').read_text()
    (dist/'assets/recipe-exchange.js').write_text(recipe_code)
    modules='<script>'+recipe_code+'</script>'
    for name in ['tool-exchange','tool-exchange-ui']:
        code=(HERE/f'src/{name}.js').read_text();modules+='<script>'+code+'</script>';(dist/f'assets/{name}.js').write_text(code)
    html=html.replace('<script>'+before,modules+'<script>'+after)
    assert html.count('\n</main>\n')==1
    html=html.replace('\n</main>\n',(HERE/'src/tool-exchange.html').read_text()+'\n</main>\n')
    html=html.replace('<a href="#colour-reduction">Colour Reduction</a>','<a href="#colour-reduction">Colour Reduction</a><a href="#exchange">Tool Exchange</a>')
    html=html.replace('</head>','<style>#exchange{overflow-wrap:anywhere}#exchange label{display:block;margin:12px 0}#exchange select{max-width:100%}#xe-status[data-error="true"]{color:#ff8f8f}@media(min-width:901px){.topbar{height:auto;min-height:72px;padding-block:10px;gap:20px}#primary-nav{min-width:0;flex-wrap:wrap;column-gap:14px;row-gap:8px}}</style></head>',1)
    marker='\n</main>\n'
    banner='<aside id="xe-banner" hidden style="padding:12px;border:1px solid #71809a;border-radius:10px;margin:12px 0;overflow-wrap:anywhere"><b>Clarus Exchange</b> · Complete sources stay in the package. <a href="#exchange">Open exchange</a> <button id="xe-banner-capture">Add this tool state</button> <button id="xe-banner-save">Save complete exchange ZIP</button><p id="xe-banner-message" role="status"></p></aside>'
    # Keep the package controls available while a native tool view is active.
    main=html.index('>',html.index('<main'))+1;html=html[:main]+banner+html[main:]
    html=html.replace('0.2.0-rc33.9-reduction-job-preview',VERSION)
    (dist/'index.html').write_text(html);(dist/'assets/app.js').write_text(after)
    manifest=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());manifest.update(version=VERSION,status='TOOL_EXCHANGE_OFFLINE_PREVIEW',deployment_allowed=False,tool_exchange_schema='atlas-clarus-tool-exchange/1.0')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);(output/'SHA256SUMS.txt').write_text(sha(archive.read_bytes())+'  '+archive.name+'\n')
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes())}));return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-tool-exchange');build(p.parse_args().output_dir.resolve())
