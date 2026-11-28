"""Independent native LCMS reference. The ICC is local test input, never copied."""
import ctypes as c,hashlib,json,sys
from pathlib import Path
l=c.CDLL('liblcms2.so.2'); P=c.c_void_p; U=c.c_uint32
for n,ret,args in [('cmsGetEncodedCMMversion',c.c_int,[]),('cmsCreateLab4Profile',P,[P]),('cmsOpenProfileFromFile',P,[c.c_char_p,c.c_char_p]),('cmsCreateTransform',P,[P,U,P,U,U,U]),('cmsFormatterForColorspaceOfProfile',U,[P,U,c.c_int]),('cmsDoTransform',None,[P,P,P,U]),('cmsDeleteTransform',None,[P]),('cmsCloseProfile',c.c_int,[P])]:
    f=getattr(l,n);f.restype=ret;f.argtypes=args
path=Path(sys.argv[1]);lab=l.cmsCreateLab4Profile(None);out=l.cmsOpenProfileFromFile(str(path).encode(),b'r')
assert lab and out
fmt=l.cmsFormatterForColorspaceOfProfile(lab,0,1);dev=l.cmsFormatterForColorspaceOfProfile(out,2,0)
assert fmt==0x4a0018 and ((dev>>3)&15)==4
result={'profile_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'native_engine_version':l.cmsGetEncodedCMMversion(),'cases':[]}
try:
    for intent,label in [(1,'Relative colorimetric'),(3,'Absolute colorimetric')]:
        forward=l.cmsCreateTransform(lab,fmt,out,dev,intent,0x100);reverse=l.cmsCreateTransform(out,dev,lab,fmt,intent,0x100)
        assert forward and reverse
        try:
            for values in ([tuple(map(float,sys.argv[2:5]))] if len(sys.argv)==5 else [(50.,0.,0.),(60.,48.,57.),(45.,74.715,6.537)]):
                inp=(c.c_double*3)(*values);v=(c.c_uint16*4)();back=(c.c_double*3)()
                l.cmsDoTransform(forward,inp,v,1);l.cmsDoTransform(reverse,v,back,1)
                result['cases'].append(dict(lab=values,intent=label,device=list(v),returned=list(back)))
        finally:
            l.cmsDeleteTransform(forward);l.cmsDeleteTransform(reverse)
finally:
    l.cmsCloseProfile(lab);l.cmsCloseProfile(out)
print(json.dumps(result,indent=2))
