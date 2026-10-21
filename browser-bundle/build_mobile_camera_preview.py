"""Build a separate HTTPS mobile-browser camera preview; leave Android and public RC34.4 frozen."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
ROOT=Path(__file__).resolve().parent.parent
MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
def build(output):
    output=Path(output);(output/'assets').mkdir(parents=True,exist_ok=True)
    data=json.loads((ROOT/'hover-library/data/colors.json').read_text())
    assert data['master_sha256']==MASTER and len(data['colors'])==13283
    views=json.loads((ROOT/'hover-library/data/views.json').read_text())
    assert views['master_sha256']==MASTER
    data['views']=views['views']
    assert len([v for v in data['views'].values() if not v.get('hidden_from_new_selection')])==78
    for name in ('index.html','preview.css','preview.js'):
        shutil.copyfile(ROOT/'browser-bundle/mobile-camera-preview'/name,output/name)
    (output/'assets/atlas-data.js').write_text('window.ATLAS_CLARUS_DATA='+json.dumps(data,separators=(',',':'))+';\n')
    core=(ROOT/'android-test-app/live-camera-core.js').read_text()
    camera=(ROOT/'android-test-app/live-camera.js').read_text()
    old='if(!window.AndroidExport||window.ATLAS_LIVE_CAMERA)return;'
    assert camera.count(old)==1
    camera=camera.replace(old,'if((!window.AndroidExport&&!window.ATLAS_BROWSER_CAMERA)||window.ATLAS_LIVE_CAMERA)return;')
    camera=camera.replace('Live camera unavailable in this WebView. Please use Take photo or choose an image.','Live camera unavailable. Open this page over HTTPS in Safari or Chrome, or choose an existing image.')
    (output/'assets/live-camera-core.js').write_text(core)
    (output/'assets/live-camera.js').write_text(camera)
    manifest={'schema':'atlas-clarus-mobile-camera-preview/1.0','master_sha256':MASTER,'master_rows':13283,'visible_libraries':78,'camera_scope':'SECURE_CONTEXT_LOCAL_VIDEO_ONLY','physical_browser_device_acceptance':'NOT_TESTED','source_core_sha256':hashlib.sha256(core.encode()).hexdigest(),'source_android_ui_sha256':hashlib.sha256((ROOT/'android-test-app/live-camera.js').read_bytes()).hexdigest()}
    (output/'CAMERA_PREVIEW.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'output':str(output),'master_rows':13283,'visible_libraries':78}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,required=True);build(p.parse_args().output_dir.resolve())
