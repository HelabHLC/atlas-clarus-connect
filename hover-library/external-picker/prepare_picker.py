#!/usr/bin/env python3
"""Patch a pinned, owner-supplied PKL Image Picker 0.3.1-beta2 directory.

Copies only the documented plugin files to a new directory; never edits input.
The proprietary prototype's license is preserved. No source spectra are added.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

PINS = {
    'atlas-clarus-pkl-image-explorer.php': '63fe4424e0c1d3b034f2705145b96e0e4761910c351761d3eaf42d5b42af0503',
    'assets/explorer.js': '621fa40f80ac7d9bbe3e5490863ad48269d692a4e810f6ecb5196d065361ad4a',
    'assets/worker.js': '3027b423dcf4e1c769f80a2c14483e1ee9151aad57ca0149480154096b6a4e8b',
    'assets/explorer.css': 'a32b07764d903920bfbbd0a403e8f52c372a9e90200855bd0a172656860cc1f8',
    'data/manifest.json': 'ceaccd0997cb5872b072b47b63a6b879f4d6ffaeabab7d13ef00f2ab66bb8632',
    'readme.txt': 'c5706af0db209f99fca35918eb87ac4b7d57374f92fdbaec3433b7f1375a050f',
}
MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
HERE = Path(__file__).resolve().parent


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError('Patch context is not unique: ' + old[:100])
    return text.replace(old, new, 1)


def patch_js(js):
    js = js.replace('front-end v0.3.1-beta2', 'front-end v0.3.1-beta3')
    js = replace_once(js, "const IMAGE_DB=", "const P=window.ATLAS_CLARUS_HOVER_PROVENANCE;\nconst S=window.ATLAS_CLARUS_PICKER_PROVENANCE;\nconst IMAGE_DB=")
    js = replace_once(js,"await new Promise((resolve,reject)=>{const r=store.put(blob,'current');r.onsuccess=resolve;r.onerror=()=>reject(r.error);});",
        "await new Promise((resolve,reject)=>{const tx=store.transaction;tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Image transaction aborted'));store.put(blob,'current');});")
    js = replace_once(js, 'this.sourceFile=null;this.pendingRestore=null;this.restoreStarted=false;',
        'this.sourceFile=null;this.pendingRestore=null;this.restoreStarted=false;\n    this.imageGeneration=0;this.handoffBusy=false;this.sourceHashPromise=Promise.resolve(null);')
    js = replace_once(js, 'this.dataReady=true;', '''if(!P||!S||manifest.active_master_sha256!==P.MASTER||manifest.row_count!==13283) throw Error('Provenance master/module mismatch');
      this.provenanceColors=meta.reference.map((ref,id)=>({id,ref,rgb:Array.from(this.rgb.slice(id*3,id*3+3)),hex:meta.hex[id]}));
      this.dataReady=true;''')
    js = replace_once(js, 'const file=this.input.files&&this.input.files[0];if(!file)return;', '''const file=this.input.files&&this.input.files[0];if(!file)return;
    const generation=++this.imageGeneration;
    this.image=null;this.sourceFile=null;this.idMap=null;this.sourceRow=null;this.lastClick=null;this.pendingRestore=null;
    this.confirm.checked=false;this.hoverButton.disabled=true;this.clearSelectionUi();this.updateBindEnabled();
    q(this.root,'[data-role="source-provenance"]').textContent='Quellpixel noch nicht erfasst.';
    this.sourceHashPromise=S.hashFile(file);''')
    js = replace_once(js, 'this.sourceFile=file;this.image=img;',
        "if(generation!==this.imageGeneration){URL.revokeObjectURL(url);return;}\n      this.sourceFile=file;this.image=img;")
    js = replace_once(js, "}catch(e){this.setStatus('Image decode failed: '+e.message,'error');}",
        "}catch(e){if(generation===this.imageGeneration)this.setStatus('Image decode failed: '+e.message,'error');}")
    js = replace_once(js,"this.busy=true;this.updateBindEnabled();this.setStatus('Reading browser-decoded RGB pixels…');",
        "this.bindingGeneration=this.imageGeneration;\n    this.busy=true;this.updateBindEnabled();this.setStatus('Reading browser-decoded RGB pixels…');")
    js = replace_once(js,"}else if(m.type==='bound'){", "}else if(m.type==='bound'){\n      if(this.bindingGeneration!==this.imageGeneration){this.busy=false;this.updateBindEnabled();return;}")
    js = replace_once(js, "this.hoverButton.disabled=!(cfg.hoverUrl&&this.manifest&&this.manifest.active_master_sha256);", '''this.hoverButton.disabled=!(cfg.hoverUrl&&this.manifest&&this.manifest.active_master_sha256)||this.handoffBusy;
    try{
      const sample=this.captureSource(null);
      q(this.root,'[data-role="source-provenance"]').textContent=`Quellpixel ${sample.source_hex} · RGB ${sample.source_rgb.join(', ')} → Referenz ${sample.reference_hex} · Abstand² ${sample.distance_squared} · NOT_SIGNED`;
    }catch(e){this.hoverButton.disabled=true;q(this.root,'[data-role="source-provenance"]').textContent=e.message;}''')
    start=js.index('  async openHover(){')
    end=js.index('  async maybeRestore(){', start)
    js=js[:start]+'''  captureSource(sha256=null){
    if(!this.lastClick||!this.sourceFile||this.sourceRow===null)throw Error('No source observation');
    const {x,y}=this.lastClick;
    return S.capture(this.imageCtx.getImageData(x,y,1,1).data,x,y,
      {name:this.sourceFile.name,width:this.width,height:this.height,sha256},
      this.provenanceColors[this.sourceRow],this.provenanceColors);
  }

  async openHover(){
    if(this.sourceRow===null||!this.lastClick||!this.sourceFile||!cfg.hoverUrl||this.handoffBusy)return;
    const row=this.sourceRow,ref=this.meta.reference[row],file=this.sourceFile;
    const {x,y}=this.lastClick,generation=this.imageGeneration;
    this.handoffBusy=true;this.hoverButton.disabled=true;
    const unchanged=()=>generation===this.imageGeneration&&file===this.sourceFile&&row===this.sourceRow&&
      this.lastClick?.x===x&&this.lastClick?.y===y;
    try{
      const sha256=await this.sourceHashPromise;
      if(!unchanged())throw Error('Image or selection changed during handoff');
      const assignment=this.captureSource(sha256);
      await storeImage(file);
      if(!unchanged())throw Error('Image or selection changed during handoff');
      sessionStorage.setItem(HANDOFF_KEY,JSON.stringify({schema:'atlas-clarus-image-picker-handoff-v2',
        atlas_row_id:row,reference:ref,master_sha256:P.MASTER,x,y,zoom:Number(this.magnifierZoom.value)||12,
        source_assignment:assignment,created_at:new Date().toISOString()}));
      const hover=new URL(cfg.hoverUrl,location.href),back=new URL(location.href);
      ['source','atlas_row_id','hlc','master_sha256','source_assignment'].forEach(k=>back.searchParams.delete(k));
      hover.searchParams.set('atlas_row_id',String(row));hover.searchParams.set('hlc',ref);
      hover.searchParams.set('master_sha256',P.MASTER);hover.searchParams.set('source','pkl-image-picker');
      hover.searchParams.set('return_url',back.href);hover.searchParams.set('source_assignment',JSON.stringify(assignment));
      P.readHandoff(hover,this.provenanceColors);
      if(hover.origin!==location.origin)throw Error('Hover URL is not same-origin');
      location.href=hover.href;
    }catch(e){this.setStatus('Hover handoff blocked: '+e.message,'error');}
    finally{this.handoffBusy=false;this.hoverButton.disabled=this.sourceRow===null;}
  }

'''+js[end:]
    old="""      if(!s||s.schema!=='atlas-clarus-image-picker-handoff-v1'||s.master_sha256!==this.manifest.active_master_sha256||
        !/^\\d+$/.test(p.get('atlas_row_id')||'')||Number(p.get('atlas_row_id'))!==Number(s.atlas_row_id)||p.get('hlc')!==s.reference||p.get('master_sha256')!==s.master_sha256) throw new Error('saved handoff identity mismatch');"""
    js=replace_once(js,old,"      const expected=S.checkReturn(p,s,this.provenanceColors);")
    js=replace_once(js,'const blob=await restoreImageBlob();if(!blob)',
        'const generation=++this.imageGeneration;\n      const blob=await restoreImageBlob();if(!blob)')
    js=replace_once(js,'this.sourceFile=blob;this.image=img;',
        "if(generation!==this.imageGeneration){URL.revokeObjectURL(url);return;}\n      this.sourceFile=blob;this.sourceHashPromise=S.hashFile(blob);this.image=img;")
    js=replace_once(js,'this.confirm.checked=true;this.pendingRestore=s;this.updateBindEnabled();this.bindImage();', '''if(s.x>=this.width||s.y>=this.height)throw Error('Saved pixel outside restored image');
      if(expected){
        const sha256=await this.sourceHashPromise;
        if(generation!==this.imageGeneration)return;
        S.verifyRestored(expected,this.imageCtx.getImageData(s.x,s.y,1,1).data,
          {name:blob.name,width:this.width,height:this.height,sha256},this.provenanceColors);
      }
      this.confirm.checked=true;this.pendingRestore=s;this.updateBindEnabled();this.bindImage();''')
    js=replace_once(js,"['source','atlas_row_id','hlc','master_sha256'].forEach", "['source','atlas_row_id','hlc','master_sha256','source_assignment'].forEach")
    return js


def patch_php(php):
    php=php.replace('0.3.1-beta2','0.3.1-beta3')
    php=replace_once(php,"function atlas_clarus_image_picker_register_assets() {", """function atlas_clarus_image_picker_register_assets() {
    wp_register_script('atlas-clarus-picker-source-validator', ATLAS_CLARUS_IMAGE_PICKER_URL . 'assets/source-provenance.js', array(), ATLAS_CLARUS_IMAGE_PICKER_VERSION, true);
    wp_register_script('atlas-clarus-picker-provenance', ATLAS_CLARUS_IMAGE_PICKER_URL . 'assets/picker-provenance.js', array('atlas-clarus-picker-source-validator'), ATLAS_CLARUS_IMAGE_PICKER_VERSION, true);""")
    php=replace_once(php,"ATLAS_CLARUS_IMAGE_PICKER_URL . 'assets/explorer.js',\n        array(),", "ATLAS_CLARUS_IMAGE_PICKER_URL . 'assets/explorer.js',\n        array('atlas-clarus-picker-provenance'),")
    php=replace_once(php,"    $config = array(", "    $hover_page = get_page_by_path('atlas-clarus-hover-library');\n    $config = array(")
    php=replace_once(php,"apply_filters('atlas_clarus_pkl_hover_url', ATLAS_CLARUS_PKL_HOVER_URL)", "apply_filters('atlas_clarus_pkl_hover_url', $hover_page ? get_permalink($hover_page) : ATLAS_CLARUS_PKL_HOVER_URL)")
    php=replace_once(php,'<p>Übergibt ausschließlich <code>atlas_row_id</code>, PKL-Referenz und Master-SHA. Das Bild bleibt lokal.</p>', '<p data-role="source-provenance">Quellpixel noch nicht erfasst.</p>\n                    <p>Übergibt Quell-RGB und Sampling-Kontext zusätzlich zur festen PKL-Referenz. NOT_SIGNED. Das Bild bleibt lokal; Metadaten stehen in der Übergabe-URL.</p>')
    return php


def prepare(upstream,output):
    if output.exists():raise ValueError('Output must be a new directory')
    manifest=json.loads((upstream/'data/manifest.json').read_text())
    if manifest['active_master_sha256']!=MASTER:raise ValueError('Master mismatch')
    pins={**PINS,**{'data/'+name:value['sha256'] for name,value in manifest['files'].items()}}
    for name,digest in pins.items():
        if hashlib.sha256((upstream/name).read_bytes()).hexdigest()!=digest:raise ValueError('Baseline changed: '+name)
    js=patch_js((upstream/'assets/explorer.js').read_text())
    php=patch_php((upstream/'atlas-clarus-pkl-image-explorer.php').read_text())
    for name in pins:
        target=output/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(upstream/name,target)
    (output/'assets/explorer.js').write_text(js)
    (output/'atlas-clarus-pkl-image-explorer.php').write_text(php)
    shutil.copyfile(HERE/'picker-provenance.js',output/'assets/picker-provenance.js')
    shutil.copyfile(HERE.parent/'assets/js/source-provenance.js',output/'assets/source-provenance.js')
    manifest['plugin_version']='0.3.1-beta3';manifest['source_assignment_schema']='1.0';manifest['signature_status']='NOT_SIGNED'
    (output/'data/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    readme=(output/'readme.txt').read_text().replace('Stable tag: 0.3.1-beta2','Stable tag: 0.3.1-beta3')
    readme=readme.replace('== Changelog ==','== Changelog ==\n\n= 0.3.1-beta3 =\n* Preserves unsigned RC28 pixel provenance through Hover and verifies it against the restored local image.\n* Requires Hover Library 0.2.6-beta2; no new reference or spectral data.')
    (output/'readme.txt').write_text(readme)
    print('Prepared pinned Picker 0.3.1-beta3:',output)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('upstream',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();prepare(args.upstream.resolve(),args.output.resolve())
