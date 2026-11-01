"""Build the first-colour staging preview from exact published RC34.11 bytes."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PREFIX = 'atlas-clarus-browser-bundle'
BASE_SHA = '6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb'
VERSION = '0.2.0-rc34.11-first-colour-preview.1'
CHANGED = {'assets/app.js', 'index.html', 'BUNDLE_MANIFEST.json', 'SHA256SUMS.txt'}
ADDED = {'assets/first-colour.js', 'assets/first-colour.css', 'robots.txt'}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected exactly one patch anchor: {old[:100]!r}')
    return text.replace(old, new, 1)

def patch_app(text):
    text = once(text, 'let hoverReturn=null,pickerReturn=false;', 'let hoverReturn=null,pickerReturn=false,firstColour=null;')
    text = once(text, "(location.hash||'#picker')", "(location.hash||'#start')")
    text = once(text, "    const previous=views.find", "    firstColour?.route(id);\n    const previous=views.find")
    text = once(text, "$('#picker-result').innerHTML='<p>Unsupported image type.</p>';return", "$('#picker-result').innerHTML='<p>Unsupported image type.</p>';firstColour?.error('Dieses Bildformat wird nicht unterstützt. Wähle PNG, JPEG, WebP oder GIF.');return")
    text = once(text, 'const sequence=++pickerLoadSequence,url=', 'firstColour?.loading();\n    const sequence=++pickerLoadSequence,url=')
    text = once(text, "drawPickerImage();window.dispatchEvent(new Event('atlas-picker-image-loaded'));", "drawPickerImage();firstColour?.ready(pickerImageMeta);window.dispatchEvent(new Event('atlas-picker-image-loaded'));")
    text = once(text, "if(sequence===pickerLoadSequence)$('#picker-result').innerHTML='<p>The image could not be decoded.</p>'", "if(sequence===pickerLoadSequence){$('#picker-result').innerHTML='<p>The image could not be decoded.</p>';firstColour?.error('Das Bild konnte nicht geöffnet werden. Versuche eine andere Datei.');}")
    text = once(text, "$('#picker-result').innerHTML='<p>No sufficiently opaque pixels were found in the selected area.</p>';return", "$('#picker-result').innerHTML='<p>No sufficiently opaque pixels were found in the selected area.</p>';firstColour?.noSample();return")
    text = once(text, 'createSourceAssignment(sample,point,pickerImageMeta,best,MASTER);', 'createSourceAssignment(sample,point,pickerImageMeta,best,MASTER);firstColour?.sample(best,assignment);')
    bridge = '''  firstColour=window.ATLAS_FIRST_COLOUR.init({colors,master:MASTER,download,
    canvasPosition(x,y){
      if(!pickerDraw||!pickerImage)return null;
      const r=pickerCanvas.getBoundingClientRect(),px=pickerDraw.dx+(x+.5)*pickerDraw.scale,py=pickerDraw.dy+(y+.5)*pickerDraw.scale;
      return {clientX:r.left+px*r.width/pickerCanvas.width,clientY:r.top+py*r.height/pickerCanvas.height,percentX:px/pickerCanvas.width*100,percentY:py/pickerCanvas.height*100};
    },
    async openPalette(data,reference,source,target){
      const restored=window.ATLAS_CLARUS_EXPORTS.parseClarus(data,colors,MASTER);
      if(!canCreatePalette())throw Error('Die Grenze von 50 Paletten ist erreicht. Sichere und entferne zuerst eine Palette.');
      const p={id:uid(),name:String(data.palette_name||'Meine erste Farbe').slice(0,60),colorIds:restored.colorIds,sourceAssignments:restored.sourceAssignments};
      palettes.push(p);activePaletteId=p.id;syncPalette();persistPalettes();select(reference,source);
      if(target==='print'){printWorkspace?.open('palette');}
      else{location.hash='library';$('#palette-drawer').classList.add('open');}
    }
  });
'''
    return once(text, '  select(selected);render();showWorkflow(0);route();', bridge+'  select(selected);render();showWorkflow(0);route();')

def package(base, output):
    raw=base.read_bytes()
    if digest(raw)!=BASE_SHA:
        raise ValueError('Published RC34.11 ZIP hash mismatch')
    root=output/PREFIX
    if output.exists():
        raise FileExistsError('Use a new output directory')
    with zipfile.ZipFile(base) as archive:
        if archive.testzip():
            raise ValueError('Corrupt baseline')
        before={}
        for name in archive.namelist():
            if not name.startswith(PREFIX+'/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Invalid archive path')
            if not name.endswith('/'):
                before[name[len(PREFIX)+1:]]=archive.read(name)
        archive.extractall(output)
    html=(root/'index.html').read_text()
    app=(root/'assets/app.js').read_text();patched=patch_app(app)
    script=(HERE/'start.js').read_text();css=(HERE/'start.css').read_text()
    html=once(html,app,script+'\n'+patched)
    html=once(html,'    <section id="picker" class="view">',(HERE/'start.html').read_text()+'\n    <section id="picker" class="view">')
    html=once(html,'</head>\n<body>','<meta name="robots" content="noindex,nofollow"><style>'+css+'</style></head>\n<body>')
    html=once(html,'<nav id="primary-nav" aria-label="Primary navigation">','<a class="fc-tools" href="#picker">Alle Werkzeuge →</a><nav id="primary-nav" aria-label="Primary navigation"><a href="#start">Meine erste Farbe</a>')
    html=once(html,'class="brand" href="#home"','class="brand" href="#start"')
    html=html.replace('v0.2.0-rc34.11-colour-origin','v'+VERSION)
    (root/'index.html').write_text(html)
    (root/'assets/app.js').write_text(patched)
    (root/'assets/first-colour.js').write_text(script)
    (root/'assets/first-colour.css').write_text(css)
    (root/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
    manifest=json.loads((root/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION,status='FIRST_COLOUR_STAGING_PREVIEW',deployment_allowed=False,
                    owner_release_authorization='2026-11-01_SEPARATE_TEST_SERVER_REQUESTED',base_archive_sha256=BASE_SHA)
    manifest['first_colour']={'default_route':'start','backup':'EXISTING_CLARUS_JSON_1_2','original_image_in_backup':False,
                             'matching':'UNCHANGED_RGB_ONLY','production_deployment':False,'staging_target':'SEPARATE_IONOS_VPS_PENDING_ADDRESS'}
    (root/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    paths={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    changes={n for n,b in before.items() if (root/n).read_bytes()!=b}
    assert changes==CHANGED-{'SHA256SUMS.txt'},changes
    assert paths-before.keys()==ADDED,paths-before.keys()
    (root/'SHA256SUMS.txt').write_text(''.join(digest((root/n).read_bytes())+'  '+n+'\n' for n in sorted(paths) if n!='SHA256SUMS.txt'))
    target=output/'ATLAS_Clarus_Meine_erste_Farbe_Test.zip'
    with zipfile.ZipFile(target,'w') as archive:
        for name in sorted(paths):
            info=zipfile.ZipInfo(PREFIX+'/'+name,(2026,11,1,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,(root/name).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    result={'version':VERSION,'sha256':digest(target.read_bytes()),'zip':target.name,
            'base_sha256':BASE_SHA,'inherited_files_unchanged':len(before)-len(CHANGED),
            'changed':sorted(CHANGED),'added':sorted(ADDED),'production_deployment':False}
    (output/'preview-info.json').write_text(json.dumps(result,indent=2)+'\n')
    target.with_suffix('.zip.sha256').write_text(result['sha256']+'  '+target.name+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--base',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args();package(args.base,args.output_dir)
