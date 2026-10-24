"""Build a complete RC34.5 browser camera candidate from pinned RC34.4."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import zipfile
from build_reference_libraries_release import build as base_build, VERSION as BASE_VERSION
from build_image_exchange_pilot import zip_tree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VERSION = '0.2.0-rc34.5-live-camera'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def build(output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='atlas-browser-camera-') as tmp:
        tmp = Path(tmp)
        base_archive = base_build(tmp / 'base')
        dist = output / 'atlas-clarus-browser-bundle'
        if dist.exists():
            raise ValueError('Output bundle already exists; choose an empty output directory')
        with zipfile.ZipFile(base_archive) as archive:
            archive.extractall(output)
        before = {p.relative_to(dist).as_posix(): sha(p) for p in dist.rglob('*') if p.is_file()}
        camera = (ROOT / 'android-test-app/live-camera.js').read_text()
        guard = 'if(!window.AndroidExport||window.ATLAS_LIVE_CAMERA)return;'
        assert camera.count(guard) == 1
        camera = camera.replace(guard, 'if(!window.ATLAS_BROWSER_CAMERA||window.ATLAS_LIVE_CAMERA)return;')
        camera = camera.replace('Live camera unavailable in this WebView. Please use Take photo or choose an image.', 'Live camera unavailable. Open this edition over HTTPS in Chrome or Safari, or choose an image.')
        scripts = {'live-camera-core.js': (ROOT / 'android-test-app/live-camera-core.js').read_text(), 'live-camera.js': camera}
        html = (dist / 'index.html').read_text().replace(BASE_VERSION, VERSION)
        additions = '<script>window.ATLAS_BROWSER_CAMERA=true;</script>'
        for name, source in scripts.items():
            (dist / 'assets' / name).write_text(source)
            additions += '<script>' + source.replace('</script', '<\\/script') + '</script>'
        additions += '<style>.atlas-camera{height:100dvh;padding-bottom:max(12px,env(safe-area-inset-bottom));overscroll-behavior:contain}.atlas-camera-actions button{flex:1;min-width:0}.atlas-camera select{max-width:100%}.atlas-camera-stage{min-height:160px}.atlas-camera-record{overflow-wrap:anywhere}</style>'
        head, tail = html.rsplit('</body>', 1)
        html = head + additions + '</body>' + tail
        (dist / 'index.html').write_text(html)
        manifest_path = dist / 'BUNDLE_MANIFEST.json'
        manifest = json.loads(manifest_path.read_text())
        manifest.update(version=VERSION, status='CAMERA_CANDIDATE_PENDING_BROWSER_DEVICE_QA', deployment_allowed=False,
                        base_archive_sha256=sha(base_archive), browser_live_camera=True,
                        physical_browser_device_acceptance='NOT_TESTED', camera_selection_schema='atlas-clarus-camera-selection/1.0',
                        camera_context='HTTPS_OR_SUPPORTED_LOCAL_SECURE_CONTEXT', camera_project_embedding=False,
                        camera_source_sha256={name: sha(ROOT / 'android-test-app' / name) for name in scripts})
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        changed = {name for name, digest in before.items() if sha(dist / name) != digest}
        assert changed == {'index.html', 'BUNDLE_MANIFEST.json'}
        (dist / 'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
        archive = output / f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
        zip_tree(dist, archive)
        print(json.dumps({'archive': str(archive), 'sha256': sha(archive), 'unchanged_base_files': len(before)-3}))
        return archive

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    build(parser.parse_args().output_dir.resolve())
