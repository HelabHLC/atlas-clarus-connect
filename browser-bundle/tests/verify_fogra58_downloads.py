"""Independently reopen actual browser downloads with pypdf, Pillow and native LittleCMS."""
import argparse
import ctypes as C
import ctypes.util
import hashlib
import json
import os
from pathlib import Path
import subprocess
from PIL import Image
from pypdf import PdfReader

sha = lambda b: hashlib.sha256(b).hexdigest()
INTENTS = ['Perceptual', 'Relative colorimetric', 'Saturation', 'Absolute colorimetric']


def native_roundtrip(profile, rgb, intent, bpc):
    lib = C.CDLL(ctypes.util.find_library('lcms2'))
    def fn(name, result, args):
        f = getattr(lib, name); f.restype = result; f.argtypes = args; return f
    ptr, u = C.c_void_p, C.c_uint32
    op = fn('cmsOpenProfileFromMem', ptr, [ptr,u])
    srgb = fn('cmsCreate_sRGBProfile',ptr,[])()
    icc = op(profile,len(profile)); assert icc
    fmt = fn('cmsFormatterForColorspaceOfProfile',u,[ptr,u,C.c_int])
    create = fn('cmsCreateTransform',ptr,[ptr,u,ptr,u,u,u])
    run = fn('cmsDoTransform',None,[ptr,ptr,ptr,u])
    forward = create(srgb,262169,icc,fmt(icc,2,0),INTENTS.index(intent),256|(8192 if bpc else 0))
    backward = create(icc,fmt(icc,2,0),srgb,262169,1,256)
    assert forward and backward
    source=(C.c_ubyte*3)(*rgb); device=(C.c_uint16*3)(); output=(C.c_ubyte*3)()
    run(forward,source,device,1); run(backward,device,output,1)
    delete = fn('cmsDeleteTransform',None,[ptr]); delete(forward); delete(backward)
    close = fn('cmsCloseProfile',C.c_int,[ptr]); close(srgb); close(icc)
    return list(device), list(output)


def verify(folder, render=False):
    browser = json.loads((folder/'browser-results.json').read_text())
    profile = Path(os.environ['TEXTILE_PROFILE']).read_bytes()
    profile_hash = sha(profile)
    master = json.loads(Path('hover-library/data/colors.json').read_text())
    reference = next(c for c in master['colors'] if c['id']==4665)
    # Read files back from disk after the browser has closed.
    for item in browser['downloads']:
        b=(folder/item['relative_path']).read_bytes()
        assert len(b)==item['bytes'] and sha(b)==item['sha256']
    results=[]
    for jp in sorted(folder.glob('reference-*/*.json')):
        data=json.loads(jp.read_text()); p=data['production']; r=data['reference']
        assert r['atlas_row_id']==4665 and r['atlas_address']==reference['ref'] and r['master_rgb']==reference['rgb']
        assert data['master_sha256']==master['master_sha256'] and data['identity_change']=='NONE'
        assert p['profile']['sha256']==profile_hash
        native, _=native_roundtrip(profile,reference['rgb'],p['rendering_intent'],p['black_point_compensation'])
        assert p['transform']['rgb16']==native
        pdf=next(jp.parent.glob('*.pdf'))
        reader=PdfReader(pdf,strict=True); assert len(reader.pages)==1
        page=reader.pages[0]; space=page['/Resources']['/ColorSpace']['/CS1']
        assert str(space[0])=='/ICCBased'
        embedded=space[1].get_object(); assert embedded['/N']==3
        assert embedded.get_data()==profile and sha(embedded.get_data())==profile_hash
        text=page.extract_text()
        for s in [reference['ref'],'row 4665',profile_hash,master['master_sha256'],p['rendering_intent'],
                  p['printing_condition'],p['substrate'],' / '.join(map(str,native)),
                  'BPC: '+('On' if p['black_point_compensation'] else 'Off')]: assert s in text, s
        painted=' '.join(f'{v/65535:.8f}' for v in native)+' scn'
        assert painted in page.get_contents().get_data().decode()
        if render:
            subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1200','-png',str(pdf),str(jp.parent/'pdf-render')],check=True)
        results.append(dict(kind='REFERENCE_JSON_AND_ICCBASED_PDF',folder=jp.parent.name,rgb16=native,
                            profile_sha256=profile_hash,independent_pdf_readback=True))
    for jp in sorted(folder.glob('image-*/*.json')):
        meta=json.loads(jp.read_text()); calc=meta['calculation']
        assert meta['profile']['sha256']==profile_hash and meta['path']=='TEXTILE_RGB'
        assert meta['printing_condition']=='FOGRA58 regression download'
        assert meta['substrate']=='Synthetic test; no textile measurement'
        assignments=meta['pkl_reference']['assignments']
        assert assignments==[dict(atlas_row_id=4665,reference=reference['ref'],master_rgb=reference['rgb'],pixel_count=1024)]
        assert meta['pkl_reference']['master_sha256']==master['master_sha256']
        original=bytes(reference['rgb']+[255])*1024
        assert meta['source']['rgba_sha256']==sha(original)==meta['pkl_reference']['rgba_sha256']
        _, rgb=native_roundtrip(profile,reference['rgb'],calc['forward_intent'],calc['forward_bpc'])
        assert meta['output_rgba_sha256']==sha(bytes(rgb+[255])*1024)
        assert meta['production_approval']=='NOT_PROVIDED'
        png=next(jp.parent.glob('*.png'))
        with Image.open(png) as im: im.verify()
        with Image.open(png) as im:
            im.load(); assert im.size==(1032,680)
            assert set(im.convert('RGB').crop((24,100,504,580)).getdata())=={tuple(reference['rgb'])}
            assert set(im.convert('RGB').crop((528,100,1008,580)).getdata())=={tuple(rgb)}
        results.append(dict(kind='IMAGE_PNG_AND_METADATA_JSON',folder=jp.parent.name,
                            png_size=[1032,680],native_roundtrip_rgb8=rgb,pixel_hashes_verified=True,
                            profile_sha256=profile_hash,intent=calc['forward_intent'],bpc=calc['forward_bpc']))
    assert len(results)==6 and browser['actual_browser_downloads']==12
    result=dict(status='PASS',independent_readers=['pypdf','Pillow','native LittleCMS'],
                verified_downloads=12,results=results,physical_textile='NOT_MEASURED')
    (folder/'independent-readback.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('evidence',type=Path);parser.add_argument('--render',action='store_true')
    args=parser.parse_args();verify(args.evidence,args.render)
