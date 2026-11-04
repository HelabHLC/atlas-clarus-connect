"""Independent system LittleCMS check; no browser/WASM implementation is imported."""
import argparse
import base64
import ctypes as C
import ctypes.util
import json
import re
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('runtime',type=Path);a=p.parse_args()
script=(a.runtime/'icc/profile-data/psocoated_v3_icc.js').read_text()
data=base64.b64decode(re.search(r'\]="([A-Za-z0-9+/=]+)"',script).group(1))
lib=C.CDLL(ctypes.util.find_library('lcms2'))
def api(name,result,args):
 f=getattr(lib,name);f.restype=result;f.argtypes=args;return f
ptr=C.c_void_p;u=C.c_uint32
open_profile=api('cmsOpenProfileFromMem',ptr,[ptr,u])
create_srgb=api('cmsCreate_sRGBProfile',ptr,[])
create_lab=api('cmsCreateLab4Profile',ptr,[ptr])
create_transform=api('cmsCreateTransform',ptr,[ptr,u,ptr,u,u,u])
transform=api('cmsDoTransform',None,[ptr,ptr,ptr,u])
delete_transform=api('cmsDeleteTransform',None,[ptr])
close_profile=api('cmsCloseProfile',None,[ptr])
formatter=api('cmsFormatterForColorspaceOfProfile',u,[ptr,u,u])
version=api('cmsGetEncodedCMMversion',u,[])
buffer=C.create_string_buffer(data);device=open_profile(buffer,len(data));srgb=create_srgb();lab=create_lab(None)
assert device and srgb and lab
rgb8=(4<<16)|(3<<3)|1;lab64=(1<<22)|(10<<16)|(3<<3);device16=formatter(device,2,0)
steps=[create_transform(srgb,rgb8,lab,lab64,1,0x100),create_transform(lab,lab64,device,device16,3,0x100),create_transform(device,device16,lab,lab64,3,0x100)]
assert all(steps)
rgb=(C.c_uint8*3)(227,20,112);target=(C.c_double*3)();values=(C.c_uint16*4)();output=(C.c_double*3)()
try:
 transform(steps[0],rgb,target,1);transform(steps[1],target,values,1);transform(steps[2],values,output,1)
 print(json.dumps({'engine':'native LittleCMS','encoded_version':version(),'rgb':list(rgb),'target_lab':list(target),'output_lab':list(output),'device16':list(values)},indent=2))
finally:
 for step in steps:delete_transform(step)
 for profile in [device,srgb,lab]:close_profile(profile)
