from pathlib import Path
import json, sys

root = Path(sys.argv[1])
index = root / 'index.html'
html = index.read_text()

def replace_once(text, old, new):
    assert text.count(old) == 1, (old[:100], text.count(old))
    return text.replace(old, new, 1)

def update_asset(name, edit):
    global html
    path = root / 'assets' / name
    old = path.read_text()
    new = edit(old)
    html = replace_once(html, old, new)
    path.write_text(new)

corel = r'''
  // CorelDRAW's documented XML palette format. Values stay in sRGB;
  // normalizing channels to [0,1] is not a colour-space conversion.
  function xmlAttribute(value){
    if(typeof value!=='string')throw Error('XML names must be text.');
    for(const ch of value){const n=ch.codePointAt(0);
      if(!(n===9||n===10||n===13||(n>=32&&n<=0xD7FF)||(n>=0xE000&&n<=0xFFFD)||(n>=0x10000&&n<=0x10FFFF)))throw Error('A palette or colour name contains a character XML cannot represent.');
    }
    return value.replace(/[&<>"'\t\n\r]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;','\t':'&#9;','\n':'&#10;','\r':'&#13;'}[ch]));
  }
  function corelGuid(){
    if(!global.crypto||typeof global.crypto.getRandomValues!=='function')throw Error('Secure random numbers are unavailable for the CorelDRAW palette ID.');
    const bytes=new Uint8Array(16);global.crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  function corelXml(palette,master,name='ATLAS Clarus Palette'){
    if(!Array.isArray(palette)||!palette.length)throw Error('Add at least one colour before exporting.');
    if(typeof master!=='string'||!/^\w{64}$/.test(master)||!/^[0-9a-f]{64}$/.test(master))throw Error('Invalid master SHA-256.');
    if(typeof name!=='string'||!name.length)throw Error('A palette name is required.');
    const rows=palette.map(c=>{
      if(!c||typeof c.ref!=='string'||!c.ref.length||!rgb8(c.rgb))throw Error('CorelDRAW export requires named, exact 8-bit RGB swatches.');
      return '      <color name="'+xmlAttribute(c.ref)+'" cs="sRGB" tints="'+c.rgb.map(v=>String(v/255)).join(',')+'"/>';
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n'+
      '<!-- ATLAS Clarus; master SHA-256: '+master+' -->\n'+
      '<!-- sRGB swatches. Keep Clarus JSON or the complete reduction job for identity and source evidence. -->\n'+
      '<palette name="'+xmlAttribute(name)+'" guid="'+corelGuid()+'">\n  <colors>\n    <page>\n'+
      rows.join('\n')+'\n    </page>\n  </colors>\n</palette>\n';
  }
  // Validate our own emitted XML with the browser XML parser before download.
  // This is a readback check, not a CorelDRAW-import or production approval.
  function verifyCorelXml(xml,palette,name='ATLAS Clarus Palette'){
    const document=new global.DOMParser().parseFromString(xml,'application/xml'),root=document.documentElement;
    if(document.querySelector('parsererror')||root.tagName!=='palette'||root.getAttribute('name')!==name||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(root.getAttribute('guid')||''))throw Error('CorelDRAW XML header readback failed.');
    const groups=Array.from(root.children),pages=groups.length===1&&groups[0].tagName==='colors'?Array.from(groups[0].children):[];
    const swatches=pages.length===1&&pages[0].tagName==='page'?Array.from(pages[0].children):[];
    if(swatches.length!==palette.length||!swatches.length||swatches.some((c,i)=>{
      const values=(c.getAttribute('tints')||'').split(',');
      return c.tagName!=='color'||c.getAttribute('name')!==palette[i].ref||c.getAttribute('cs')!=='sRGB'||values.length!==3||
        values.some((v,j)=>!v.trim()||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1||Number(v)!==palette[i].rgb[j]/255||Math.round(Number(v)*255)!==palette[i].rgb[j]);
    }))throw Error('CorelDRAW XML colour readback failed.');
    return true;
  }
'''

def exports_edit(s):
    s=replace_once(s,"  const WORKFLOW='ATLAS Clarus v3.4.0';",corel+"\n  const WORKFLOW='ATLAS Clarus v3.4.0';")
    return replace_once(s,'={ase,readAse,tokens,css,gpl,clarus,','={ase,readAse,tokens,css,gpl,corelXml,verifyCorelXml,clarus,')

update_asset('palette-export.js',exports_edit)

def app_edit(s):
    return replace_once(s,"}else if(kind==='tokens'){", "}else if(kind==='coreldraw'){try{const xml=E.corelXml(palette,MASTER,name);E.verifyCorelXml(xml,palette,name);download(`${stem}.xml`,xml,'application/xml;charset=utf-8');paletteStatus(`CorelDRAW XML exported and read back: ${palette.length} exact sRGB swatches with Atlas names.`)}catch(err){paletteStatus(`Export blocked: ${err.message}`,true)}}else if(kind==='tokens'){")

update_asset('app.js',app_edit)

def reduction_edit(s):
    s=replace_once(s,"      const E=root.ATLAS_CLARUS_EXPORTS,r=result.report;", "      const E=root.ATLAS_CLARUS_EXPORTS,r=result.report;\n      const xml=(p,name)=>{const text=E.corelXml(p,master,name);E.verifyCorelXml(text,p,name);return H.utf8(text);};")
    s=replace_once(s,"return {'palette.gpl':H.utf8(E.gpl(p,master,name)),", "return {'palette.xml':xml(p,name),'palette.gpl':H.utf8(E.gpl(p,master,name)),")
    s=replace_once(s,"      return {'palette.gpl':H.utf8('GIMP Palette", "      return {'palette.xml':xml(p,'ATLAS Clarus mixed output'),'palette.gpl':H.utf8('GIMP Palette")
    old="    $('cr-palette').onclick=()=>{if(busy||!result)return;const format=$('cr-format').value,name='palette.'+(format==='tokens'?'tokens.json':format);download(name,paletteFiles()[name],format==='ase'?'application/octet-stream':'text/plain');};"
    new="    $('cr-palette').onclick=()=>{if(busy||!result)return;try{const format=$('cr-format').value,name='palette.'+(format==='tokens'?'tokens.json':format),files=paletteFiles();if(!files[name])throw Error('Unsupported palette format.');download(name,files[name],format==='ase'?'application/octet-stream':format==='xml'?'application/xml;charset=utf-8':'text/plain');if(format==='xml')status('CorelDRAW XML exported and read back with exact output RGB and swatch names.');}catch(e){status('Palette export blocked: '+e.message,true);}};"
    s=replace_once(s,old,new)
    s=s.replace('GPL/ASE/CSS/tokens contain','GPL/ASE/CorelDRAW XML/CSS/tokens contain').replace('GPL/ASE/CSS/Tokens contain','GPL/ASE/CorelDRAW XML/CSS/Tokens contain')
    return s

update_asset('reduction-job-ui.js',reduction_edit)
html=replace_once(html,'<button data-palette-export="gpl">','<button data-palette-export="coreldraw">CorelDRAW XML</button><button data-palette-export="gpl">')
html=replace_once(html,'<option value="ase">ASE · Adobe / Affinity</option>','<option value="ase">ASE · Adobe / Affinity</option><option value="xml">CorelDRAW XML</option>')
html=html.replace('ASE, GPL, CSS and Tokens transfer reference swatches','ASE, CorelDRAW XML, GPL, CSS and Tokens transfer reference swatches')
html=html.replace('Use ASE or GPL when taking swatches into a design app.','Use ASE, CorelDRAW XML or GPL when taking swatches into a design app.')
html=html.replace('ASE for Adobe/Affinity, GPL for GIMP/Inkscape,','ASE for Adobe/Affinity, XML for CorelDRAW, GPL for GIMP/Inkscape,')
html=html.replace('v0.2.0-rc34.7-textile-conversion','v0.2.0-rc34.8-coreldraw-xml')
index.write_text(html)
readme=root/'docs/README.html'
s=readme.read_text().replace('ASE, GPL, Figma','ASE, CorelDRAW XML, GPL, Figma')
s+='\n<h2>CorelDRAW XML</h2><p>Open PALETTE, add references, and choose <b>CorelDRAW XML</b>. Colour Reduction also offers CorelDRAW XML in Palette format and includes palette.xml in the complete job ZIP. The XML contains sRGB swatches with their existing names; protected original colours retain their ORIGINAL_RGB names. In CorelDRAW for Windows, open Window → Dockers → Palettes, choose Open a palette, and select the XML file. Keep Clarus JSON or the complete job ZIP for source evidence. XML structure and exact 8-bit RGB readback are checked; native CorelDRAW import has not been tested here.</p>\n'
readme.write_text(s)
manifest=root/'BUNDLE_MANIFEST.json'
m=json.loads(manifest.read_text())
m['version']='0.2.0-rc34.8-coreldraw-xml'
m['status']='CORELDRAW_XML_PUBLIC_BETA'
m['owner_release_authorization']='2026-10-28_USER_REQUESTED_HOMEPAGE_IONOS_UPDATE'
m['palette_exports'].insert(1,'CORELDRAW_XML')
m['coreldraw_xml']={'schema':'COREL_XML_PALETTE','color_space':'sRGB','names':'EXISTING_SWATCH_NAMES','channels':'RGB8_NORMALIZED_TO_0_1','readback':'BROWSER_XML_PARSER_EXACT_RGB8_AND_NAMES','native_coreldraw_validation':'NOT_TESTED','coreldraw_web_sample':'USER_SCREENSHOT_H075_L060_C045_RGB_180_136_67' }
manifest.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
print('Added CorelDRAW XML to palette drawer, Colour Reduction and complete reduction ZIPs.')
