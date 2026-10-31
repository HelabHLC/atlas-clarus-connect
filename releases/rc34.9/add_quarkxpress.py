"""Add QuarkXPress XPress Tags export to the pinned RC34.8 runtime."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc34.9-quarkxpress-preview'


def update(root):
    index = root / 'index.html'
    html = index.read_text()

    def once(source, old, new):
        assert source.count(old) == 1, (old[:100], source.count(old))
        return source.replace(old, new, 1)

    def asset(name, edit):
        nonlocal html
        p = root / 'assets' / name
        old = p.read_text()
        new = edit(old)
        html = once(html, old, new)
        p.write_text(new)

    module = (HERE / 'quarkxpress-export.js').read_text()
    exports = (root / 'assets/palette-export.js').read_text()
    html = once(html, exports, exports + '\n' + module)
    (root / 'assets/quarkxpress-export.js').write_text(module)

    branch = """}else if(kind==='quarkxpress'){try{const xtg=E.quarkXtg(palette,MASTER,name);E.verifyQuarkXtg(xtg,palette,MASTER,name);download(`${stem}.xtg`,xtg,'text/plain;charset=utf-8');paletteStatus(`QuarkXPress: ${palette.length} RGB swatches exported. Import into a text box with Interpret XPress Tags enabled; use sRGB for RGB solid colours.`)}catch(err){paletteStatus(`Export blocked: ${err.message}`,true)}}else if(kind==='tokens'){"""
    asset('app.js', lambda s: once(s, "}else if(kind==='tokens'){", branch))

    def reduction(s):
        s = once(s, "      const E=root.ATLAS_CLARUS_EXPORTS,r=result.report;",
                 "      const E=root.ATLAS_CLARUS_EXPORTS,r=result.report;\n      const xtg=(p,name)=>{const value=E.quarkXtg(p,master,name);E.verifyQuarkXtg(value,p,master,name);return H.utf8(value);};")
        s = once(s, "return {'palette.xml':xml(p,name),", "return {'palette.xtg':xtg(p,name),'palette.xml':xml(p,name),")
        s = once(s, "return {'palette.xml':xml(p,'ATLAS Clarus mixed output'),", "return {'palette.xtg':xtg(p,'ATLAS Clarus mixed output'),'palette.xml':xml(p,'ATLAS Clarus mixed output'),")
        s = once(s, "if(format==='xml')status(", "if(format==='xtg')status('QuarkXPress XPress Tags exported. Import into a text box with Interpret XPress Tags enabled; use sRGB for RGB solid colours.');if(format==='xml')status(")
        return s.replace('GPL/ASE/CorelDRAW XML/CSS/', 'GPL/ASE/CorelDRAW XML/QuarkXPress XTG/CSS/')

    asset('reduction-job-ui.js', reduction)
    html = once(html, '<button data-palette-export="coreldraw">CorelDRAW XML</button>',
                '<button data-palette-export="coreldraw">CorelDRAW XML</button><button data-palette-export="quarkxpress">QuarkXPress XTG</button>')
    html = once(html, '<option value="xml">CorelDRAW XML</option>',
                '<option value="xml">CorelDRAW XML</option><option value="xtg">QuarkXPress XPress Tags</option>')
    hint = '<p class="boundary">QuarkXPress XTG: import into a text box via File → Import, with Interpret XPress Tags enabled. Use sRGB for RGB solid colours. <a href="docs/QUARKXPRESS.html" target="_blank" rel="noopener">Import guide</a></p>'
    html = once(html, '<div id="export-status"', hint + '<div id="export-status"')
    html = once(html, '<button id="cr-palette" disabled>Download palette</button>', '<button id="cr-palette" disabled>Download palette</button>' + hint)
    html = html.replace('Use ASE, CorelDRAW XML or GPL', 'Use ASE, CorelDRAW XML, QuarkXPress XTG or GPL')
    html = html.replace('ASE, CorelDRAW XML, GPL, CSS and Tokens', 'ASE, CorelDRAW XML, QuarkXPress XTG, GPL, CSS and Tokens')
    html = html.replace('XML for CorelDRAW, GPL', 'XML for CorelDRAW, XTG for QuarkXPress, GPL')
    html = html.replace('v0.2.0-rc34.8-coreldraw-xml', 'v' + VERSION)
    index.write_text(html)
    readme = root / 'docs/README.html'
    readme.write_text(readme.read_text() + '\n<h2>QuarkXPress XPress Tags</h2><p>My Palettes and Colour Reduction now export .xtg files. Complete reduction jobs include palette.xtg. See <a href="QUARKXPRESS.html">the import guide</a>. Native QuarkXPress import is pending verification.</p>\n')
    manifest = root / 'BUNDLE_MANIFEST.json'
    m = json.loads(manifest.read_text())
    m['version'] = VERSION
    m['status'] = 'QUARKXPRESS_XTG_PREVIEW'
    m['deployment_allowed'] = False
    m['owner_release_authorization'] = '2026-10-30_USER_REQUESTED_QUARKXPRESS_INTEGRATION_PREVIEW'
    m['base_archive_sha256'] = 'ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273'
    m['palette_exports'].insert(2, 'QUARKXPRESS_XTG')
    m['quarkxpress_xtg'] = dict(format='XPRESS_TAGS', header='<v21.00><e9>', encoding='UTF-8',
        color_model='RGB', color_type='PROCESS', channels='RGB8_NORMALIZED_TO_0_1',
        source_profile='USER_SETS_SRGB_IEC61966_2_1_FOR_RGB_SOLID_COLOURS',
        max_colors=256, native_quarkxpress_validation='NOT_TESTED',
        import_method='TEXT_BOX_FILE_IMPORT_INTERPRET_XPRESS_TAGS', readback='EXACT_RGB8_AND_NAMES')
    manifest.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    update(Path(sys.argv[1]))
