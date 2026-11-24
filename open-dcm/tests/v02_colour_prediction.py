#!/usr/bin/env python3
"""Profile-relative D50 PCS predictions, never measured print Lab.
Master Lab comparison is explicitly conditional on D50/2-degree provenance.
"""
import json, os, math, ctypes as C, ctypes.util, statistics
from pathlib import Path

def de(a,b):
    L1,a1,b1=a; L2,a2,b2=b
    c1,c2=math.hypot(a1,b1),math.hypot(a2,b2)
    cb=(c1+c2)/2
    g=.5*(1-math.sqrt(cb**7/(cb**7+25**7)))
    a1*=1+g; a2*=1+g
    c1,c2=math.hypot(a1,b1),math.hypot(a2,b2)
    h1=math.degrees(math.atan2(b1,a1))%360 if c1 else 0
    h2=math.degrees(math.atan2(b2,a2))%360 if c2 else 0
    dh=h2-h1
    if c1*c2==0: dh=0
    elif dh>180: dh-=360
    elif dh<-180: dh+=360
    dH=2*math.sqrt(c1*c2)*math.sin(math.radians(dh/2))
    lb=(L1+L2)/2; cb=(c1+c2)/2
    if c1*c2==0: hb=h1+h2
    elif abs(h1-h2)<=180: hb=(h1+h2)/2
    else: hb=(h1+h2+(360 if h1+h2<360 else -360))/2
    co=lambda h: math.cos(math.radians(h))
    t=1-.17*co(hb-30)+.24*co(2*hb)+.32*co(3*hb+6)-.20*co(4*hb-63)
    sl=1+.015*(lb-50)**2/math.sqrt(20+(lb-50)**2)
    sc=1+.045*cb; sh=1+.015*cb*t
    rt=-2*math.sqrt(cb**7/(cb**7+25**7))*math.sin(math.radians(60*math.exp(-((hb-275)/25)**2)))
    x=(L2-L1)/sl; y=(c2-c1)/sc; z=dH/sh
    return math.sqrt(max(0,x*x+y*y+z*z+rt*y*z))

assert abs(de((50,2.6772,-79.7751),(50,0,-82.7485))-2.0425)<.0001
assert abs(de((50,3.1571,-77.2803),(50,0,-82.7485))-2.8615)<.0001
lib=C.CDLL(ctypes.util.find_library('lcms2'))
def bind(name,restype,args):
    f=getattr(lib,name); f.restype=restype; f.argtypes=args; return f
ptr=C.c_void_p; ui=C.c_uint32
openp=bind('cmsOpenProfileFromFile',ptr,[C.c_char_p,C.c_char_p])
srgb=bind('cmsCreate_sRGBProfile',ptr,[])()
lab=bind('cmsCreateLab4Profile',ptr,[ptr])(None)
profile=openp(os.fsencode(os.environ['ATLAS_TEST_CMYK_ICC']),b'r')
make=bind('cmsCreateTransform',ptr,[ptr,ui,ptr,ui,ui,ui])
run=bind('cmsDoTransform',None,[ptr,ptr,ptr,ui])
delete=bind('cmsDeleteTransform',None,[ptr])
close=bind('cmsCloseProfile',C.c_int,[ptr])
# lcms2 pixel format bit fields: RGB=4, CMYK=6, Lab=10.
rgb8=(4<<16)|(3<<3)|1
cmyk16=(6<<16)|(4<<3)|2
labdbl=(1<<22)|(10<<16)|(3<<3)
assert srgb and lab and profile
ts=make(srgb,rgb8,lab,labdbl,1,0x0100)
td=make(profile,cmyk16,lab,labdbl,1,0x0100)
assert ts and td
def convert(t,data,typ):
    inp=(typ*len(data))(*data); out=(C.c_double*3)()
    run(t,inp,out,1)
    assert all(math.isfinite(x) for x in out)
    return list(out)
selection=json.loads(Path(__file__).with_name('v02-selection-100.json').read_text())['rows']
rows=json.loads(Path(os.environ['ATLAS_WORKER_RESULTS_JSON']).read_text())['rows']
assert len(rows)==len(selection)==100
results=[]
try:
    for r,s in zip(rows,selection):
        assert (r['row_id'],r['hlc'],r['rgb8'])==(s['id'],s['hlc'],s['rgb'])
        source=convert(ts,r['rgb8'],C.c_uint8)
        output=convert(td,r['cmyk16'],C.c_uint16)
        result={'hlc':r['hlc'],'group':s['group'],'master_lab':s['lab'],'source_pcs_lab_d50':source,'predicted_pcs_lab_d50':output,
          'de00_source_to_prediction':de(source,output),
          'de00_master_to_source_conditional_d50':de(s['lab'],source),
          'de00_master_to_prediction_conditional_d50':de(s['lab'],output)}
        results.append(result)
        print('ICC_PREDICTION',json.dumps(result),flush=True)
finally:
    delete(ts);delete(td)
    for p in (srgb,lab,profile):close(p)
for key in ('de00_source_to_prediction','de00_master_to_source_conditional_d50','de00_master_to_prediction_conditional_d50'):
    vals=sorted(r[key] for r in results)
    print('ICC_PREDICTION_SUMMARY',json.dumps({'metric':key,'n':len(vals),'mean':statistics.mean(vals),'median':statistics.median(vals),'p95_nearest_rank':vals[94],'max':vals[-1]}),flush=True)
print('LIMIT: master comparisons conditional on independently confirmed D50/2-degree source; profile-relative predictions not absolute paper-white or measured proof; no production tolerance asserted.',flush=True)
