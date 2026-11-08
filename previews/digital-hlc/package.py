"""Add the isolated digital-HLC workspace to the pinned personal 0.1.7 preview.

The standalone HTML contains reference data, library lists and this extension;
it contains no ICC profile payloads. The full ZIP retains inherited profile rights.
"""
import argparse
import hashlib
import html as html_module
import json
import os
import subprocess
import zipfile
from pathlib import Path
from build_libraries import build as build_libraries

HERE = Path(__file__).resolve().parent
BASE_SHA = 'a8ba76271fc8d52b867030a57facd6e332712cd3e2732338deabb2324aef3cf2'
MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
PREFIX = 'atlas-clarus-browser-bundle'
sha = lambda b: hashlib.sha256(b).hexdigest()


def insert_last_body(html, script):
    end = html.rindex('</body>')
    return html[:end] + script + '\n' + html[end:]


def build(base, output):
    if output.exists():
        raise FileExistsError('Choose a new output directory')
    if sha(base.read_bytes()) != BASE_SHA:
        raise ValueError('0.1.7 baseline hash mismatch')
    before = {}
    with zipfile.ZipFile(base) as archive:
        for n in archive.namelist():
            if not n.startswith(PREFIX + '/') or '..' in Path(n).parts or '\\' in n:
                raise ValueError('Unsafe path')
            if not n.endswith('/'):
                before[n[len(PREFIX) + 1:]] = sha(archive.read(n))
        archive.extractall(output)
    root = output / PREFIX
    data = (root / 'assets/atlas-data.js').read_text()
    parsed = json.loads(data.split('=', 1)[1].strip().rstrip(';'))
    if parsed['master_sha256'] != MASTER or len(parsed['colors']) != 13283:
        raise ValueError('Wrong master projection')
    digital = root / 'digital'
    digital.mkdir()
    libraries = build_libraries(parsed)
    library_script = 'window.ATLAS_DIGITAL_LIBRARY_DATA=' + json.dumps(libraries, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (digital / 'libraries.js').write_text(library_script)
    for name in ('core.js', 'app.js', 'style.css', 'entry.js'):
        (digital / name).write_bytes((HERE / name).read_bytes())
    subprocess.run([os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node'), str(HERE / 'export-libraries.cjs'), str(root)], check=True)
    # Each entry is self-contained and works from file://, with no fetch or CDN.
    scripts = '\n'.join('<script>' + text.replace('</', '<\\/') + '</script>' for text in
                        (data, library_script, (HERE / 'core.js').read_text(), (HERE / 'app.js').read_text()))
    repo = HERE.parents[1]
    source_url = 'https://github.com/HelabHLC/atlas-clarus-connect/tree/feat/digital-hlc-wide-gamut-20261108/previews/digital-hlc'
    notices = '<p>Copyright © 2026 ATLAS Clarus contributors. Code: GPL-2.0-or-later. <a href="' + source_url + '">Source code / Quellcode</a>.</p><p>HLC-derived data: Copyright (c) freieFarbe e.V. Converted, indexed and enriched for ATLAS Clarus; not an unchanged original distribution. Library selections: GamutMap / Proof GmbH, snapshot 2026-10-18. Additional digital values calculated by ATLAS Clarus.</p>'
    for label, filename in [('Reference data · zlib', 'Zlib.txt'), ('Program · GPL-2.0-or-later', 'GPL-2.0-or-later.txt')]:
        notices += '<details><summary>' + label + '</summary><pre>' + html_module.escape((repo / 'LICENSES' / filename).read_text()) + '</pre></details>'
    html = (HERE / 'index.html').read_text().replace('<!-- NOTICES -->', notices).replace('<!-- STYLE -->', '<style>' + (HERE / 'style.css').read_text() + '</style>').replace('<!-- SCRIPTS -->', scripts)
    standalone = output / 'ATLAS_Clarus_Digitale_Farberweiterung_0.1.8.html'
    standalone.write_text(html.replace('<!-- BACK -->', ''))
    (digital / 'index.html').write_text(html.replace('<!-- BACK -->', '<a href="../index.html" data-text="back">Zur Browser Edition</a>'))
    for name, src in [('index.html', 'digital/entry.js'), ('startup/index.html', '../digital/entry.js')]:
        p = root / name
        p.write_text(insert_last_body(p.read_text(), '<script src="' + src + '"></script>'))
    start = (root / 'START_HERE.html').read_text().replace('0.1.7', '0.1.8')
    start = start.replace('<ul><li><a href="multi/index.html?lang=de">', '<ul><li><a href="digital/index.html?lang=de">Digitale HLC-Farben · sRGB, P3 und ProPhoto</a></li><li><a href="multi/index.html?lang=de">')
    start = start.replace('<ul><li><a href="multi/index.html?lang=en">', '<ul><li><a href="digital/index.html?lang=en">Digital HLC colours · sRGB, P3 and ProPhoto</a></li><li><a href="multi/index.html?lang=en">')
    (root / 'START_HERE.html').write_text(start)
    (root / 'DIGITAL_HLC_README.md').write_bytes((HERE / 'README.md').read_bytes())
    manifest = {'version': '0.1.8-preview', 'extension_version': '1.0.0', 'base_sha256': BASE_SHA,
                'entry': 'START_HERE.html', 'digital_entry': 'digital/index.html', 'master_sha256': MASTER,
                'master_rows': 13283, 'new_master_rows': 0, 'digital_addresses': 'ON_DEMAND_HLC_D50_2DEG',
                'spaces': ['srgb', 'display-p3', 'rec2020', 'prophoto-rgb'],
                'spectra_for_digital_colours': None, 'new_production_memberships': False,
                'native_rgb_matching': 'UNCHANGED', 'native_image_pipeline': 'UNCHANGED',
                'digital_project_schema': 'ATLAS_CLARUS_DIGITAL_COLOURS_V1',
                'physical_approval': False, 'public_deployment': False}
    manifest['digital_library_snapshot'] = libraries['snapshot_date']
    manifest['digital_library_counts'] = {space: {k: v[k] for k in ('total', 'master_count', 'additional_digital_count')} for space, v in libraries['libraries'].items()}
    (root / 'DIGITAL_HLC_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    mutable = {'index.html', 'startup/index.html', 'START_HERE.html', 'SHA256SUMS.txt'}
    assert all(sha((root / n).read_bytes()) == h for n, h in before.items() if n not in mutable)
    names = sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file())
    (root / 'SHA256SUMS.txt').write_text(''.join(sha((root / n).read_bytes()) + '  ' + n + '\n' for n in names if n != 'SHA256SUMS.txt'))
    target = output / 'ATLAS_Clarus_Digitale_Farberweiterung_0.1.8_DE_EN.zip'
    with zipfile.ZipFile(target, 'w') as archive:
        for n in names:
            info = zipfile.ZipInfo(PREFIX + '/' + n, (2026, 11, 8, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, (root / n).read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    result = {**manifest, 'zip': str(target), 'bytes': target.stat().st_size, 'sha256': sha(target.read_bytes()),
              'standalone': str(standalone), 'standalone_sha256': sha(standalone.read_bytes()),
              'checksums': len(names) - 1, 'inherited_unchanged': sum(sha((root / n).read_bytes()) == h for n, h in before.items())}
    (output / 'build-info.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    build(args.base, args.output_dir)
