"""Independent verification of actual browser-downloaded jobs, not the JS importer."""
import hashlib,io,json,sys,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
master=json.loads((root/'hover-library/data/colors.json').read_text())
colors=sorted(master['colors'],key=lambda c:c['id'])
rgb=np.array([c['rgb'] for c in colors],dtype=np.int32)
ids=np.array([c['id'] for c in colors],dtype=np.uint16)
sha=lambda b:hashlib.sha256(b).hexdigest()
folder=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/atlas-reduction-job-browser')
count=0
for path in sorted(folder.glob('*.zip')):
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        files={n:z.read(n) for n in z.namelist()}
    manifest=json.loads(files['job-package-manifest.json'])
    assert set(manifest['files'])==set(files)-{'job-package-manifest.json'}
    for name,digest in manifest['files'].items(): assert sha(files[name])==digest,name
    legacy=json.loads(files['reduction-package-manifest.json'])
    for name,digest in legacy['files'].items(): assert sha(files[name])==digest,name
    state=json.loads(files['job.json']);assert state['master_sha256']==master['master_sha256']
    def data(d):
        arr=np.frombuffer(files[d['$binary']],dtype=np.uint8 if d['type']=='u8' else '<u2')
        assert len(arr)==d['length'];return arr
    w,h=state['input']['width'],state['input']['height']
    source=data(state['input']['rgba']).reshape(-1,4)
    png=np.array(Image.open(io.BytesIO(files['reduced.png'])).convert('RGBA')).reshape(-1,4)
    output=data(state['result']['pixels']).reshape(-1,4)
    np.testing.assert_array_equal(png,output)
    original=data(state['input']['sourceBytes']);mime=state['input']['sourceMime']
    assert original.tobytes()==files['original.jpg' if mime=='image/jpeg' else 'original.png']
    report=json.loads(files['reduction.json'])
    assert report['source']['input_rgba_sha256']==sha(source.tobytes())
    assert report['output_rgba_sha256']==sha(output.tobytes())
    winners={}
    for p,rgba in enumerate(source):
        if not rgba[3]: expected=65535
        else:
            key=tuple(map(int,rgba[:3]))
            if key not in winners:
                distance=((rgb-np.array(key,dtype=np.int32))**2).sum(axis=1)
                winners[key]=ids[int(distance.argmin())]
            expected=winners[key]
        assert data(state['result']['assignments'])[p]==expected
    for result in [state['uncleaned'],state['result']]+[v[k] for v in state['variants'] for k in ['reduced','result']]:
        pixels=data(result['pixels']).reshape(-1,4);indices=data(result['indices'])
        expected=source.copy()
        for p,index in enumerate(indices):
            if source[p,3]:expected[p,:3]=result['report']['palette'][int(index)]['rgb']
            else:assert index==65535
        np.testing.assert_array_equal(pixels,expected)
        np.testing.assert_array_equal(pixels[:,3],source[:,3])
        if result['report'].get('original_rgb_protection') and result.get('protectionMask'):
            mask=data(result['protectionMask']).astype(bool)
            np.testing.assert_array_equal(pixels[mask],source[mask])
    count+=1
assert count>=4,'Expected original, corrected, second-export and continued jobs'
print(f'PASS independent ZIP/CRC/SHA, Pillow pixels, palette-index reconstruction, full-master winners, original bytes, alpha and protected RGBA for {count} downloaded jobs')
