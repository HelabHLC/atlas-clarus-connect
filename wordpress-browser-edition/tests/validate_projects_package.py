"""Verify the WordPress upload structure and the exact embedded project payload."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from verify_package import verify

EXPECTED_SHA256 = 'e9c68334d9bbb2a376fea6f14c0c2a82e70c85ea1da119de7b8b704e4a3b33d5'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--extract-to', type=Path)
args = parser.parse_args()
assert hashlib.sha256(args.archive.read_bytes()).hexdigest() == EXPECTED_SHA256
with tempfile.TemporaryDirectory(prefix='atlas-wp-package-') as tmp:
    with zipfile.ZipFile(args.archive) as outer:
        assert outer.testzip() is None
        prefix = 'atlas-clarus-browser-edition/'
        assert set(outer.namelist()) == {prefix+p for p in (
            'atlas-clarus-browser-edition.php', 'index.php', 'readme.txt', 'assets/bundle.zip')}
        # WordPress discovers the main PHP plugin header in its first 8 KiB.
        php = outer.read(prefix+'atlas-clarus-browser-edition.php')
        assert re.search(rb'^\s*\* Plugin Name: ATLAS Clarus Browser Edition\r?$', php[:8192], re.M)
        assert re.search(rb'^\s*\* Version: 0\.1\.15-beta10\r?$', php[:8192], re.M)
        assert b"register_activation_hook( __FILE__" in php
        assert b"[atlas_clarus_browser_edition]" in php
        outer.extractall(tmp)
        report = verify(Path(tmp)/'atlas-clarus-browser-edition')
        if args.extract_to:
            outer.extractall(args.extract_to)
        with zipfile.ZipFile(io.BytesIO(outer.read(prefix+'assets/bundle.zip'))) as runtime:
            runtime_prefix = 'atlas-clarus-browser-bundle/'
            html = runtime.read(runtime_prefix+'index.html')
            assert b'id="colour-projects"' in html and b'PUBLIC PILOT</span>' in html
            assert b'LOCAL PILOT</span>' not in html
            original = ROOT.parent/'downloads/browser-bundle/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc30-colour-projects.zip'
            assert hashlib.sha256(original.read_bytes()).hexdigest() == '946e2e6cfefb8ed253e777c0c26987340d8c4e57b080273dea5ca2894428645f'
            with zipfile.ZipFile(original) as offline:
                for module in ('colour-projects.js', 'colour-projects-ui.js', 'colour-handoff.js', 'colour-handoff-ui.js', 'clarus-handoff.js', 'palette-export.js'):
                    name = runtime_prefix+'assets/'+module
                    assert runtime.read(name) == offline.read(name), module
            if args.extract_to:
                runtime.extractall(args.extract_to/'runtime')
    print(json.dumps({'status': 'PASS', 'wordpress_plugin_folder_and_header': 'PASS',
                     'plugin_sha256': EXPECTED_SHA256, 'embedded_runtime': report,
                     'rc30_project_and_handoff_code': 'BYTE_IDENTICAL'}))
