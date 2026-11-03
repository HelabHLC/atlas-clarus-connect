"""Compare saved WASM calculations with independent native LittleCMS transforms."""
import ctypes
import ctypes.util
import json
import sys
from pathlib import Path

p=Path(sys.argv[1]);data=json.loads(p.read_text());lib=ctypes.CDLL(ctypes.util.find_library('lcms2'))
lib.cmsOpenProfileFromFile.argtypes=[ctypes.c_char_p,ctypes.c_char_p];lib.cmsOpenProfileFromFile.restype=ctypes.c_void_p
lib.cmsCreate_sRGBProfile.restype=ctypes.c_void_p
lib.cmsCreateTransform.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_void_p,ctypes.c_uint32,ctypes.c_uint32,ctypes.c_uint32];lib.cmsCreateTransform.restype=ctypes.c_void_p
lib.cmsDoTransform.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p,ctypes.c_uint32]
lib.cmsDeleteTransform.argtypes=[ctypes.c_void_p];lib.cmsCloseProfile.argtypes=[ctypes.c_void_p]
a=lib.cmsCreate_sRGBProfile();b=lib.cmsOpenProfileFromFile(data['profilePath'].encode(),b'r')
rgb8=(4<<16)|(3<<3)|1;cmyk16=(6<<16)|(4<<3)|2
f=lib.cmsCreateTransform(a,rgb8,b,cmyk16,1,0x100);r=lib.cmsCreateTransform(b,cmyk16,a,rgb8,1,0x100)
assert f and r
results=[]
for job in data['jobs']:
    for c in job['colours']:
        src=(ctypes.c_ubyte*3)(*c['input_rgb']);dev=(ctypes.c_uint16*4)();ret=(ctypes.c_ubyte*3)()
        lib.cmsDoTransform(f,src,dev,1);lib.cmsDoTransform(r,dev,ret,1)
        results.append({'basis':job['basis'],'input':c['input_rgb'],'device_equal':list(dev)==c['device_values_16bit'],'preview_equal':list(ret)==c['preview_rgb'],'native_device16':list(dev),'native_preview_rgb':list(ret)})
lib.cmsDeleteTransform(f);lib.cmsDeleteTransform(r);lib.cmsCloseProfile(a);lib.cmsCloseProfile(b)
assert all(x['device_equal'] and x['preview_equal'] for x in results)
result={'status':'PASS','oracle':'native liblcms2 via ctypes','comparisons':results}
p.with_name('native-oracle.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'PASS: {len(results)} source/reference colours match native LittleCMS exactly in device16 and returned RGB8')
