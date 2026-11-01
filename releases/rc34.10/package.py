"""Build an unpublished XTG + provenance ZIP preview from pinned RC34.9 bytes."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc34.10-quarkxpress-source-zip-preview'
BASE_SHA = '5699974d6b5742786b92babc3315d32f3b1af0fd4d89b23cf7fbddc4d5cc2156'
PREFIX = 'atlas-clarus-browser-bundle'
CHANGED = {'assets/app.js', 'index.html', 'BUNDLE_MANIFEST.json', 'docs/QUARKXPRESS.html', 'SHA256SUMS.txt'}
ADDED = {'assets/quarkxpress-package.js'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def once(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f'Expected one patch anchor: {old[:80]!r}; found {source.count(old)}')
    return source.replace(old, new, 1)


def update(root):
    index = root / 'index.html'
    html = index.read_text()
    app = root / 'assets/app.js'
    old = app.read_text()
    new = once(old, 'function exportPalette(kind)', 'async function exportPalette(kind)')
    branch = """}else if(kind==='quark-package'){try{const result=await E.quarkPackage(palette,colors,MASTER,name,p.sourceAssignments||[]);download(`${stem}.quarkxpress.zip`,result.bytes,'application/zip',true);paletteStatus(`QuarkXPress ZIP: ${result.referenceCount} references and ${result.sourceCount} recorded source assignments. ${result.referencesWithoutSources} references have no recorded source colours. Keep the XTG and JSON together.`)}catch(err){paletteStatus(`ZIP export blocked: ${err.message}`,true)}}else if(kind==='quarkxpress'){"""
    new = once(new, "}else if(kind==='quarkxpress'){", branch)
    html = once(html, old, new)
    app.write_text(new)
    module = (HERE / 'quarkxpress-package.js').read_text()
    xtg = (root / 'assets/quarkxpress-export.js').read_text()
    html = once(html, xtg, xtg + '\n' + module)
    (root / 'assets/quarkxpress-package.js').write_text(module)
    button = '<button data-palette-export="quarkxpress">QuarkXPress XTG · Beta</button>'
    html = once(html, button, '<button data-palette-export="quark-package">QuarkXPress ZIP · XTG + Source JSON</button>' + button)
    hint = 'Multiple source colours can share one reference.'
    html = once(html, hint, hint + ' QuarkXPress ZIP downloads the XTG swatches and recorded source RGB assignments together. Extract the ZIP and import its Clarus JSON to restore the sources. Source images are not included.')
    html = html.replace('v0.2.0-rc34.9-quarkxpress', 'v' + VERSION)
    index.write_text(html)
    guide = root / 'docs/QUARKXPRESS.html'
    text = once(guide.read_text(), 'RC34.9 · XPress-Tags-Export · Öffentliche Beta',
                'RC34.10 Preview · XTG + Source-JSON als ZIP · Nicht veröffentlicht')
    guide_new = '''<h2>Neu: Farbfelder und Herkunft gemeinsam weitergeben</h2>
<p>In <b>My Palettes → QuarkXPress ZIP · XTG + Source JSON</b> wird ein ZIP mit <code>palette.xtg</code>, <code>palette.clarus.json</code>, Prüfsummen und Anleitung heruntergeladen. Alle bereits aufgezeichneten Source Colours bleiben mit ihren unveränderten RGB-Werten und ATLAS-Zuordnungen im JSON. Mehrere Quellen dürfen dieselbe Referenz haben.</p>
<p>Das ZIP entpacken und <code>palette.clarus.json</code> über <b>Import Clarus JSON</b> wieder öffnen. Referenzen ohne aufgezeichnete Quelle werden ausdrücklich gezählt; fehlende Originalfarben werden nicht rekonstruiert. Quelldateien und Bildpixel sind in diesem Palettenpaket nicht enthalten. Bei <b>Colour Reduction</b> den vollständigen Job verwenden: Er enthält Originalpixel, Zuordnungen und XTG. Einzelne Paletten-JSON-Dateien aus dem Job enthalten keine vollständige Herkunft.</p>
<p><b>English:</b> My Palettes → QuarkXPress ZIP exports XTG and all recorded source assignments together. Extract and reimport palette.clarus.json. Missing sources are reported, never invented. Source images are not included. Use the complete job for Colour Reduction.</p>
'''
    guide.write_text(once(text, '<h2>1. Aus ATLAS Clarus exportieren</h2>', guide_new + '<h2>1. Aus ATLAS Clarus exportieren</h2>'))
    manifest = root / 'BUNDLE_MANIFEST.json'
    m = json.loads(manifest.read_text())
    m.update(version=VERSION, status='QUARKXPRESS_SOURCE_ZIP_PREVIEW', deployment_allowed=False,
             owner_release_authorization='LOCAL_PREVIEW_ONLY_NO_PUBLICATION', base_archive_sha256=BASE_SHA)
    m['palette_exports'].append('QUARKXPRESS_SOURCE_ZIP')
    m['quarkxpress_source_zip'] = dict(schema='atlas-clarus-quarkxpress-package/1.0',
        scope='MY_PALETTES', source_format='ATLAS_CLARUS_PALETTE_1.2',
        preserves='ALL_RECORDED_SOURCE_ASSIGNMENTS', missing_sources='EXPLICIT_COUNTS_NO_RECONSTRUCTION',
        image_bytes_included=False, native_quarkxpress_import='NOT_TESTED')
    manifest.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')


def package(base, out):
    if digest(base.read_bytes()) != BASE_SHA:
        raise ValueError('Published RC34.9 input ZIP SHA-256 mismatch')
    root = out / PREFIX
    if root.exists():
        raise FileExistsError('Use a new output directory; existing builds are not overwritten.')
    out.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(base) as z:
        if z.testzip() is not None:
            raise ValueError('Corrupt baseline ZIP')
        for n in z.namelist():
            if not n.startswith(PREFIX + '/') or '..' in Path(n).parts:
                raise ValueError('Unexpected archive path')
        before = {n.removeprefix(PREFIX + '/'): z.read(n) for n in z.namelist() if not n.endswith('/')}
        z.extractall(out)
    update(root)
    changed = {n for n, b in before.items() if (root / n).read_bytes() != b}
    assert changed == CHANGED - {'SHA256SUMS.txt'}, changed
    after = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    assert after - before.keys() == ADDED
    sums = root / 'SHA256SUMS.txt'
    sums.write_text(''.join(digest(p.read_bytes()) + '  ' + p.relative_to(root).as_posix() + '\n'
                   for p in sorted(root.rglob('*')) if p.is_file() and p != sums))
    target = out / 'ATLAS_Clarus_Browser_Bundle_RC34_10_Source_ZIP_Preview.zip'
    with zipfile.ZipFile(target, 'w') as z:
        for p in sorted(root.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(PREFIX + '/' + p.relative_to(root).as_posix(), (2026, 11, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    info = dict(version=VERSION, bundle=target.name, bundle_sha256=digest(target.read_bytes()),
                bytes=target.stat().st_size, base_sha256=BASE_SHA,
                changed_existing_files=sorted(CHANGED), added_files=sorted(ADDED),
                inherited_files_byte_identical=len(before) - len(CHANGED),
                master_unchanged=True, native_quarkxpress_import='NOT_TESTED', deployment_allowed=False)
    (out / 'release-info.json').write_text(json.dumps(info, indent=2) + '\n')
    (out / (target.name + '.sha256')).write_text(info['bundle_sha256'] + '  ' + target.name + '\n')
    print(json.dumps(info, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args()
    package(args.base, args.output_dir)
