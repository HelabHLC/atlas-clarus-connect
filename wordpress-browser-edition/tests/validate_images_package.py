"""Verify the installable Image Projects package and unchanged reference core."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from verify_package import verify

EXPECTED_SHA256 = '8ec7cdcd296cd179ff24a84a344bc3d6c2e989273c0d31977d6ac5518079e3bd'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--extract-to', type=Path)
args = parser.parse_args()
assert hashlib.sha256(args.archive.read_bytes()).hexdigest() == EXPECTED_SHA256
with tempfile.TemporaryDirectory(prefix='atlas-image-package-') as tmp:
    with zipfile.ZipFile(args.archive) as outer:
        assert outer.testzip() is None
        prefix = 'atlas-clarus-browser-edition/'
        assert set(outer.namelist()) == {prefix+p for p in (
            'atlas-clarus-browser-edition.php', 'index.php', 'readme.txt', 'assets/bundle.zip')}
        php = outer.read(prefix+'atlas-clarus-browser-edition.php')
        assert re.search(rb'^\s*\* Plugin Name: ATLAS Clarus Browser Edition\r?$', php[:8192], re.M)
        assert re.search(rb'^\s*\* Version: 0\.1\.15-beta11\r?$', php[:8192], re.M)
        assert b'register_activation_hook( __FILE__' in php
        assert b'[atlas_clarus_browser_edition]' in php
        outer.extractall(tmp)
        report = verify(Path(tmp)/'atlas-clarus-browser-edition')
        if args.extract_to:
            outer.extractall(args.extract_to)
        with zipfile.ZipFile(io.BytesIO(outer.read(prefix+'assets/bundle.zip'))) as runtime:
            runtime_prefix = 'atlas-clarus-browser-bundle/'
            html = runtime.read(runtime_prefix+'index.html')
            assert b'id="image-projects"' in html and b'ATLAS_IMAGE_PROJECTS_UI.init' in html
            assert b'PUBLIC PILOT</span>' in html and b'LOCAL PILOT</span>' not in html
            original = ROOT.parent/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta10_RC30.1.zip'
            assert hashlib.sha256(original.read_bytes()).hexdigest() == 'e9c68334d9bbb2a376fea6f14c0c2a82e70c85ea1da119de7b8b704e4a3b33d5'
            with zipfile.ZipFile(original) as previous, zipfile.ZipFile(io.BytesIO(previous.read(prefix+'assets/bundle.zip'))) as old:
                for module in ('colour-projects.js', 'colour-handoff.js', 'colour-handoff-ui.js', 'clarus-handoff.js', 'palette-export.js'):
                    name = runtime_prefix+'assets/'+module
                    assert runtime.read(name) == old.read(name), module
                # The only change to the palette UI is a read-only snapshot bridge.
                module = runtime_prefix+'assets/colour-projects-ui.js'
                bridge = b'\n    root.ATLAS_COLOUR_PROJECTS_UI.readCurrent=()=>current()&&clone(current());'
                assert runtime.read(module).count(bridge) == 1
                assert runtime.read(module).replace(bridge, b'') == old.read(module)
            if args.extract_to:
                runtime.extractall(args.extract_to/'runtime')
    print(json.dumps({'status': 'PASS', 'wordpress_plugin_folder_and_header': 'PASS',
                     'plugin_sha256': EXPECTED_SHA256, 'embedded_runtime': report,
                     'previous_project_and_handoff_core': 'BYTE_IDENTICAL'}))
