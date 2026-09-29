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
         'let sourceImage={name:null,sha256:null,x:null,y:null,width:null,height:null};\nlet loadedSourceImage=null;'),
        ('sourceImage={name:file.name,sha256:sha,x:null,y:null,width:img.naturalWidth,height:img.naturalHeight};',
         'loadedSourceImage={name:file.name,sha256:sha,x:null,y:null,width:img.naturalWidth,height:img.naturalHeight};sourceImage={...loadedSourceImage};'),
        ('sourceImage.x=x;sourceImage.y=y;',
         'sourceImage={...loadedSourceImage,x,y};'),
    )
    for original, updated in replacements:
        if html.count(original) != 1:
            raise ValueError('Pinned Colour ID image provenance code changed')
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
