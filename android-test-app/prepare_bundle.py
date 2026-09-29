#!/usr/bin/env python3
"""Package the reproducible RC27 offline bundle for the Android test shell."""
from pathlib import Path
import hashlib
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXPECTED_ZIP_SHA256 = '3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7'
TARGET = HERE / 'app/src/main/assets/bundle'

with tempfile.TemporaryDirectory(prefix='atlas-android-bundle-') as tmp:
    output = Path(tmp)
    subprocess.run([sys.executable, str(ROOT / 'browser-bundle/build_bundle.py'),
                    '--output-dir', str(output)], check=True, stdout=subprocess.DEVNULL)
    archive = next(output.glob('ATLAS_Clarus_Browser_Bundle_v*.zip'))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED_ZIP_SHA256:
        raise SystemExit(f'Bundle checksum changed: {digest}; review and update the pinned test build.')
    source = output / 'atlas-clarus-browser-bundle'
    if TARGET.exists():
        shutil.rmtree(TARGET)
    shutil.copytree(source, TARGET)
    index = TARGET / 'index.html'
    html = index.read_text(encoding='utf-8')
    marker = '</head>'
    assert html.count(marker) == 1
    bridge = (HERE / 'android-export.js').read_text(encoding='utf-8')
    html = html.replace(marker, '<script>\n' + bridge + '\n</script>\n' + marker)
    index.write_text(html, encoding='utf-8')
    print(f'Android asset: RC27 bundle {digest}; picker route #picker; export bridge added')
