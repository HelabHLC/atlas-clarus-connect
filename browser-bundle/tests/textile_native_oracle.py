"""Independent native LittleCMS oracle. No profile data are redistributed."""
import ctypes as C,ctypes.util,json,os
from pathlib import Path
lib=C.CDLL(ctypes.util.find_library('lcms2'))
def fn(n,r,a):
 f=getattr(lib,n);f.restype=r;f.argtypes=a;return f
ptr,u=C.c_void_p,C.c_uint32
op=fn('cmsOpenProfileFromMem',ptr,[ptr,u]);srgb=fn('cmsCreate_sRGBProfile',ptr,[])();create=fn('cmsCreateTransform',ptr,[ptr,u,ptr,u,u,u]);run=fn('cmsDoTransform',None,[ptr,ptr,ptr,u]);fmt=fn('cmsFormatterForColorspaceOfProfile',u,[ptr,u,C.c_int]);close=fn('cmsCloseProfile',C.c_int,[ptr]);delete=fn('cmsDeleteTransform',None,[ptr]);version=fn('cmsGetEncodedCMMversion',C.c_int,[])
b=Path(os.environ['TEXTILE_PROFILE']).read_bytes();icc=op(b,len(b));assert icc
master=json.loads(Path('hover-library/data/colors.json').read_text())
rows=[4966,10519,0,500,1000,7000,13282];rgb=[master['colors'][i]['rgb'] for i in rows];flat=[v for c in rgb for v in c];src=(C.c_ubyte*len(flat))(*flat);cases=[]
for intent in range(4):
 for bpc in [False,True]:
  f=create(srgb,262169,icc,fmt(icc,2,0),intent,256|(8192 if bpc else 0));back=create(icc,fmt(icc,2,0),srgb,262169,1,256);assert f and back
  device=(C.c_uint16*len(flat))();out=(C.c_ubyte*len(flat))();run(f,src,device,len(rgb));run(back,device,out,len(rgb));cases.append({'intent':intent,'bpc':bpc,'rgb16':list(device),'roundtrip':list(out)});delete(f);delete(back)
close(srgb);close(icc)
print(json.dumps({'native_lcms_version':version(),'row_ids':rows,'rgb':rgb,'cases':cases}))
