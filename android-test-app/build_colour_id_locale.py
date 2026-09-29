"""Add a local DE/EN presentation layer to the pinned Colour ID workbench.

Canonical values, evidence JSON, colour calculations and the original app code
remain byte-for-byte unchanged. Text nodes and human-readable HTML reports are
translated in the browser after the original app has rendered them.
"""
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent


def keep_loaded_image_provenance(html):
    """Restore the loaded image metadata when a pixel is chosen after manual RGB."""
    replacements = (
        ('let sourceImage={name:null,sha256:null,x:null,y:null,width:null,height:null};',
         'let sourceImage={name:null,sha256:null,x:null,y:null,width:null,height:null};\nlet loadedSourceImage=null;let loadedSourceFile=null;'),
        ('sourceImage={name:file.name,sha256:sha,x:null,y:null,width:img.naturalWidth,height:img.naturalHeight};',
         'loadedSourceFile=file;loadedSourceImage={name:file.name,sha256:sha,x:null,y:null,width:img.naturalWidth,height:img.naturalHeight};sourceImage={...loadedSourceImage};'),
        ('sourceImage.x=x;sourceImage.y=y;',
         'sourceImage={...loadedSourceImage,x,y};'),
    )
    for original, updated in replacements:
        if html.count(original) != 1:
            raise ValueError('Pinned Colour ID image provenance code changed')
        html = html.replace(original, updated, 1)
    original = '$(' + '"exportTrace"' + ').onclick=()=>current&&download(`ATLAS_Clarus_${current.row[1]}_traceability_v2.json`,JSON.stringify(buildTrace(),null,2));'
    updated = '''$("exportTrace").onclick=async()=>{
  if(!current)return;
  const trace=buildTrace();
  if(trace.selection_origin==="IMAGE_PIXEL"){
    if(!loadedSourceFile||!trace.source_image||trace.source_image.sha256!==loadedSourceImage?.sha256){
      alert("Originalbild für diesen Pixelnachweis fehlt. Bild erneut laden.");return;
    }
    if(loadedSourceFile.size>24*1024*1024){alert("Originalbild ist für den JSON-Nachweis zu groß.");return;}
    const file=loadedSourceFile;
    const bytes=new Uint8Array(await file.arrayBuffer());
    const hex=sha256ByteArrayHex(bytes);
    if(hex!==trace.source_image.sha256){alert("Originalbild und Prüfsumme stimmen nicht überein.");return;}
    let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    trace.source_image.mime_type=loadedSourceFile.type||"application/octet-stream";
    trace.source_image.size_bytes=bytes.length;
    trace.source_image.bytes_base64=btoa(binary);
  }
  download(`ATLAS_Clarus_${current.row[1]}_traceability_v2.json`,JSON.stringify(trace,null,2));
};'''
    if html.count(original) != 1:
        raise ValueError('Pinned Colour ID trace export code changed')
    html = html.replace(original, updated, 1)
    return html


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = []
        self.values = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip.append(tag)

    def handle_endtag(self, tag):
        if self.skip and self.skip[-1] == tag:
            self.skip.pop()

    def handle_data(self, data):
        value = unescape(data.strip())
        if value and not self.skip and value not in self.values:
            self.values.append(value)


def localize(html, language):
    if language not in ('de', 'en'):
        raise ValueError(language)
    html = keep_loaded_image_provenance(html)
    parser = VisibleText()
    parser.feed(html)
    if len(parser.values) != 349:
        raise ValueError(f'Pinned Colour ID UI changed: {len(parser.values)} text items')
    indexed = json.loads((HERE / 'colour-id-en.json').read_text(encoding='utf-8'))
    if any(not 0 <= int(index) < len(parser.values) for index in indexed):
        raise ValueError('Invalid Colour ID translation index')
    phrases = {' '.join(parser.values[int(index)].split()): translation
               for index, translation in indexed.items()}
    phrases.update(json.loads((HERE / 'colour-id-dynamic-en.json').read_text(encoding='utf-8')))
    adapter = (HERE / 'colour-id-i18n.js').read_text(encoding='utf-8')
    adapter = adapter.replace('__ATLAS_LANGUAGE__', json.dumps(language))
    adapter = adapter.replace('__ATLAS_TRANSLATIONS__', json.dumps(phrases, ensure_ascii=False))
    end = html.rfind('</body>')
    if end < 0 or '</script>' in adapter:
        raise ValueError('Cannot safely inject Colour ID language adapter')
    return html[:end] + '<script>\n' + adapter + '\n</script>\n' + html[end:]
