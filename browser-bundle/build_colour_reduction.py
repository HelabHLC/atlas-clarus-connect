#!/usr/bin/env python3
"""Build RC33.1 colour reduction with an input pixel magnifier on RC32.2."""
import argparse
import json
from pathlib import Path
import shutil
import tempfile
from build_image_exchange_pilot import build as build_base, sha, zip_tree

HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc33.1-colour-reduction-loupe'
BASE_VERSION = '0.2.0-rc32.2-image-exchange'
BASE_SHA256 = 'e2475f407ac77318662275f9a3c0ae006fc62135d1a87d7c5a64659a5c083f79'

def once(text, old, new):
    assert text.count(old) == 1, f'Integration point changed: {old[:100]}'
    return text.replace(old,new)

def inline(text):
    return '<script>'+text.replace('</script','<\\/script')+'</script>'

def build(output):
    output.mkdir(parents=True,exist_ok=True)
    dist = output/'atlas-clarus-browser-bundle'
    with tempfile.TemporaryDirectory(prefix='atlas-reduction-base-') as tmp:
        base = build_base(Path(tmp))
        assert sha(base.read_bytes()) == BASE_SHA256
        if dist.exists(): shutil.rmtree(dist)
        shutil.copytree(Path(tmp)/dist.name,dist)
    html = (dist/'index.html').read_text()
    html = once(html,'</head>\n<body>','<style>'+(HERE/'src/colour-reduction.css').read_text()+'</style></head>\n<body>')
    html = once(html,'\n</main>\n',(HERE/'src/colour-reduction.html').read_text()+'\n</main>\n')
    nav = '<a href="#colour-projects">Colour Projects</a>'
    html = once(html,nav,nav+'<a href="#colour-reduction">Colour Reduction</a>')
    # Read-only bridge: return a deep copy, never expose the mutable editor state.
    old_ui = (dist/'assets/image-projects-ui.js').read_text()
    bridge = "    root.ATLAS_IMAGE_PROJECTS_UI.readCurrent=()=>current?JSON.parse(JSON.stringify(current)):null;\n"
    anchor = "    const canvas=$('ip-canvas'),drawing=canvas.getContext('2d',{colorSpace:'srgb'});"
    new_ui = once(old_ui,anchor,bridge+anchor)
    html = once(html,inline(old_ui),inline(new_ui))
    (dist/'assets/image-projects-ui.js').write_text(new_ui)
    core = (HERE/'src/colour-reduction.js').read_text()
    ui = (HERE/'src/colour-reduction-ui.js').read_text()
    worker = (dist/'assets/pkl-image-binding.js').read_text()+'\n'+core+'''\nself.onmessage=e=>{
      try { const result=ATLAS_COLOUR_REDUCTION.reduce(e.data,p=>self.postMessage({progress:p}));
        self.postMessage({result},[result.pixels.buffer,result.indices.buffer,result.assignments.buffer]);
      } catch(e) { self.postMessage({error:e.message}); }
    };'''
    scripts = inline(core)+inline((HERE/'src/colour-reduction-loupe.js').read_text())+inline(ui)+'<script type="application/json" id="atlas-reduction-worker-source">'+json.dumps(worker).replace('<','\\u003c')+'</script>'
    html = once(html,inline(new_ui),inline(new_ui)+scripts)
    anchor = '  window.ATLAS_IMAGE_PROJECTS_UI.init({colors,master:MASTER,download});'
    html = once(html,anchor,anchor+'\n  window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download});')
    app = dist/'assets/app.js'
    app.write_text(once(app.read_text(),anchor,anchor+'\n  window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download});'))
    html = html.replace(BASE_VERSION,VERSION)
    (dist/'index.html').write_text(html)
    for name in ['colour-reduction.js','colour-reduction-loupe.js','colour-reduction-ui.js','colour-reduction.css']:
        shutil.copyfile(HERE/'src'/name,dist/'assets'/name)
    shutil.copyfile(HERE/'COLOUR_REDUCTION.md',dist/'docs/COLOUR_REDUCTION.md')
    manifest = json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION,status='COLOUR_REDUCTION_CANDIDATE',deployment_allowed=False,
                    colour_reduction_schema='atlas-clarus-colour-reduction/1.0',colour_reduction_max_colours=256,
                    colour_reduction_method='ATLAS_RGB_WEIGHTED_MEDOIDS_V1',colour_reduction_input_loupe='11x11_ORIGINAL_RGBA')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n'
        for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    zip_tree(dist,archive)
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes()),'size':archive.stat().st_size,'deployment_allowed':False}))
    return archive

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir',type=Path,default=HERE/'build-colour-reduction')
    build(p.parse_args().output_dir.resolve())
