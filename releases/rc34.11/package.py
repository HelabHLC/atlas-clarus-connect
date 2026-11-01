"""Reproducible colour-origin preview, pinned to the published RC34.10 bundle."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'browser-bundle/src'
BASE_SHA = '82a284f37fa149e4a376798efff9ebdc710bf1bd664f73ed19a981970ee1bd90'
VERSION = '0.2.0-rc34.11-colour-origin-preview'
PREFIX = 'atlas-clarus-browser-bundle'
CHANGED = {'assets/app.js', 'assets/palette-export.js', 'index.html', 'BUNDLE_MANIFEST.json', 'SHA256SUMS.txt'}
ADDED = {'assets/colour-origin.js', 'assets/colour-origin.css', 'docs/COLOUR_ORIGIN.html'}


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected exactly one anchor: {old[:90]!r} ({text.count(old)})')
    return text.replace(old, new, 1)


def patch_app(text):
    text = once(text, "return `<section class=\"source-provenance\"><b>Source → reference</b>",
                "return (window.ATLAS_COLOUR_ORIGIN?.render(r.image,r)||'')+`<section class=\"source-provenance\"><b>Source → reference</b>")
    text = once(text, '${esc(r.workflow)}</small></li>',
                "${esc(r.workflow)}</small>${window.ATLAS_COLOUR_ORIGIN?.render(r.image,r)||''}</li>")
    text = once(text, "const digest=(async()=>{try{const bytes=await file.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}catch(_){return null}})();", """const evidence=(async()=>{try{
      const bytes=await file.arrayBuffer();
      if(window.ATLAS_COLOUR_ORIGIN){const origin=await window.ATLAS_COLOUR_ORIGIN.inspect(bytes);return {sha256:origin.file_sha256,colour_origin:origin}}
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      return {sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')};
    }catch(_){return {sha256:null}}})();""")
    text = once(text, 'const sha256=await digest;', 'const sourceEvidence=await evidence;')
    text = once(text, 'pickerImageMeta={name:file.name,width:pickerSource.width,height:pickerSource.height,sha256};',
                'pickerImageMeta={name:file.name,width:pickerSource.width,height:pickerSource.height,...sourceEvidence};')
    text = once(text, 'Loading image and recording its source hash…', 'Loading image and inspecting its colour metadata…')
    text = once(text, "'<p>Image ready. Move the loupe over the image and click its marked centre pixel.</p>';",
                "'<p>Image ready. Move the loupe over the image and click its marked centre pixel.</p>'+(window.ATLAS_COLOUR_ORIGIN?.render(pickerImageMeta,null,true)||'');")
    text = once(text, '<button data-picker-hover>Open in Hover</button>`;',
                "<button data-picker-hover>Open in Hover</button>${window.ATLAS_COLOUR_ORIGIN?.render(pickerImageMeta,assignment,true)||''}`;")
    return text


def patch_exports(text):
    text = once(text, 'image:{name:image.name,width:image.width,height:image.height,sha256:image.sha256??null},',
                "image:{name:image.name,width:image.width,height:image.height,sha256:image.sha256??null,...(image.colour_origin?{colour_origin:global.ATLAS_COLOUR_ORIGIN.validate(image.colour_origin,image.sha256??null)}:{})},")
    text = once(text, 'const half=(q.requested_size-1)/2,[x,y]=q.centre;', """if(im.colour_origin!==undefined){
        if(!global.ATLAS_COLOUR_ORIGIN)throw Error('Colour-origin validator unavailable.');
        global.ATLAS_COLOUR_ORIGIN.validate(im.colour_origin,im.sha256);
      }
      const half=(q.requested_size-1)/2,[x,y]=q.centre;""")
    return text


def sha(b):
    return hashlib.sha256(b).hexdigest()


def package(base, out):
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('Published RC34.10 archive SHA-256 mismatch')
    root = out / PREFIX
    if root.exists():
        raise FileExistsError('Use a new output directory')
    with zipfile.ZipFile(base) as z:
        if z.testzip():
            raise ValueError('Corrupt base ZIP')
        before = {}
        for n in z.namelist():
            if not n.startswith(PREFIX + '/') or '..' in Path(n).parts or '\\' in n:
                raise ValueError('Invalid baseline archive path')
            if not n.endswith('/'):
                before[n[len(PREFIX)+1:]] = z.read(n)
        z.extractall(out)
    html = (root/'index.html').read_text()
    for name, patch in [('app.js', patch_app), ('palette-export.js', patch_exports)]:
        path = root/'assets'/name
        old = path.read_text()
        new = patch(old)
        html = once(html, old, new)
        path.write_text(new)
    module = (SRC/'colour-origin.js').read_text()
    palette = (root/'assets/palette-export.js').read_text()
    html = once(html, palette, module + '\n' + palette)
    css = (SRC/'colour-origin.css').read_text()
    # The bundle also contains HTML template strings; touch the real document head only.
    html = once(html, '</head>\n<body>', '<style>'+css+'</style></head>\n<body>')
    html = html.replace('v0.2.0-rc34.10-quarkxpress-source-zip', 'v'+VERSION)
    (root/'index.html').write_text(html)
    (root/'assets/colour-origin.js').write_text(module)
    (root/'assets/colour-origin.css').write_text(css)
    (root/'docs/COLOUR_ORIGIN.html').write_bytes((Path(__file__).parent/'guide.html').read_bytes())
    m = json.loads((root/'BUNDLE_MANIFEST.json').read_text())
    m.update(version=VERSION,status='COLOUR_ORIGIN_PREVIEW',deployment_allowed=False,
             owner_release_authorization='IMPLEMENTATION_PREVIEW_NO_DEPLOYMENT',base_archive_sha256=BASE_SHA)
    m['colour_origin'] = dict(schema='atlas-colour-origin/1.0',scope='IMAGE_PICKER_HOVER_PALETTES',
        input_formats=['PNG','JPEG','WEBP'], other_formats='NOT_INSPECTED', native_pixel_values='NOT_CAPTURED',
        browser_conversion='NOT_OBSERVABLE',source_assignment_unchanged=True,
        original_file_bytes_in_palette=False,production_approval=False)
    (root/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
    changed = {n for n,b in before.items() if (root/n).read_bytes()!=b}
    assert changed==CHANGED-{'SHA256SUMS.txt'}, changed
    paths = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    assert paths-before.keys()==ADDED, paths-before.keys()
    sums = root/'SHA256SUMS.txt'
    sums.write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in sorted(paths) if n!='SHA256SUMS.txt'))
    target = out/'ATLAS_Clarus_RC34_11_Colour_Origin_Preview.zip'
    with zipfile.ZipFile(target,'w') as z:
        for n in sorted(paths):
            info=zipfile.ZipInfo(PREFIX+'/'+n,(2026,11,1,0,0,0)); info.create_system=3; info.external_attr=0o100644<<16
            z.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    result=dict(version=VERSION,bundle=target.name,sha256=sha(target.read_bytes()),base_sha256=BASE_SHA,
                inherited_byte_identical_files=len(before)-len(CHANGED),changed_files=sorted(CHANGED),
                added_files=sorted(ADDED),deployment_allowed=False)
    (out/'release-info.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--base',type=Path,required=True); parser.add_argument('--output-dir',type=Path,required=True)
    args=parser.parse_args(); package(args.base,args.output_dir)
