"""Create a self-contained classic-worker runtime from the pinned MIT package."""
from pathlib import Path
import base64
import hashlib
import io
import json
import tarfile

ROOT = Path(__file__).resolve().parent


def worker_source():
    vendor = ROOT / 'vendor/lcms-wasm'
    provenance = json.loads((vendor / 'PROVENANCE.json').read_text())
    archive = base64.b64decode((vendor / 'lcms-wasm-1.0.5.tgz.base64').read_text(), validate=False)
    assert hashlib.sha256(archive).hexdigest() == provenance['archive_sha256']
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        runtime = tar.extractfile('package/dist/lcms.js').read()
        wasm = tar.extractfile('package/dist/lcms.wasm').read()
    assert hashlib.sha256(runtime).hexdigest() == provenance['runtime_sha256']
    assert hashlib.sha256(wasm).hexdigest() == provenance['wasm_sha256']
    js = runtime.decode().replace('export const ', 'const ').replace('export function ', 'function ')
    js = js.replace('export default instantiate;export { instantiate };', '')
    # Classic, inline Blob workers have no module URL or Node filesystem.
    js = js.replace('import.meta.url', "'file:///atlas-clarus-inline-lcms.js'")
    encoded = base64.b64encode(wasm).decode()
    return ('/* lcms-wasm 1.0.5 / LittleCMS 2.16. MIT. See bundled notices. */\n'
            '(function () { const process = undefined; const window = globalThis;\n' + js +
            '\nglobalThis.ATLAS_LOAD_LCMS = () => instantiate({wasmBinary: '
            'Uint8Array.from(atob(' + json.dumps(encoded) + '), c => c.charCodeAt(0)), '
            'locateFile: () => "data:application/wasm;base64,", printErr: () => {}});\n})();\n' +
            (ROOT / 'src/print-preview-worker.js').read_text())
