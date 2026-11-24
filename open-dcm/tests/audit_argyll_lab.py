#!/usr/bin/env python3
"""Independent CMM audit of frozen HLC Lab targets and both CMYK predictions.
No physical proof. CMYK8 threshold inherited from existing contract.
"""
import ctypes as C, ctypes.util, json, math, os, re, shutil, statistics, subprocess
from pathlib import Path
profile=os.environ['ATLAS_TEST_CMYK_ICC']
rows=json.loads(Path(os.environ['ATLAS_LAB_RESULTS_JSON']).read_text())['rows']
rgb_rows=json.loads(Path(os.environ['ATLAS_WORKER_RESULTS_JSON']).read_text())['rows']
assert len(rows)==len(rgb_rows)==100
assert len({r['hlc'] for r in rows})==100
exe=shutil.which('xicclu')
assert exe
def xicclu(direction, values, nout):
    cmd=[exe,'-v0',direction,'-ir','-pl',profile]
    result=subprocess.run(cmd,input='\n'.join(' '.join(f'{v:.12f}' for v in row) for row in values)+'\n',text=True,capture_output=True,check=True,timeout=90)
    lines=[s for s in result.stdout.splitlines() if s.strip()]
    assert len(lines)==len(values),(len(lines),len(values),result.stdout[:500])
    out=[]
    for line in lines:
        vals=[float(s) for s in re.findall(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?',line.split('->')[-1])]
        assert len(vals)==nout and all(math.isfinite(v) for v in vals),line
        out.append(vals)
    return out
targets=[r['input_lab_assumed_d50'] for r in rows]
argyll=xicclu('-fb',targets,4)
assert all(0<=x<=1 for row in argyll for x in row)
# Evaluate identical device coordinates in both CMMs, separately from separation differences.
direct=[r['cmyk16'] for r in rows]
rgb=[r['cmyk16'] for r in rgb_rows]
arg16=[[round(v*65535) for v in a] for a in argyll]
device=direct+rgb+arg16
pred=xicclu('-ff',[[v/65535 for v in row] for row in device],3)
lib=C.CDLL(ctypes.util.find_library('lcms2'))
def bind(name,restype,args):
    f=getattr(lib,name);f.restype=restype;f.argtypes=args;return f
ptr=C.c_void_p;ui=C.c_uint32
p=bind('cmsOpenProfileFromFile',ptr,[C.c_char_p,C.c_char_p])(os.fsencode(profile),b'r')
l=bind('cmsCreateLab4Profile',ptr,[ptr])(None)
assert p and l
t=bind('cmsCreateTransform',ptr,[ptr,ui,ptr,ui,ui,ui])(p,(6<<16)|(4<<3)|2,l,(1<<22)|(10<<16)|(3<<3),1,0x100)
assert t
run=bind('cmsDoTransform',None,[ptr,ptr,ptr,ui])
# Native LittleCMS CIEDE2000, not the prior hand-written Python formula.
class Lab(C.Structure):
    _fields_=[('L',C.c_double),('a',C.c_double),('b',C.c_double)]
delta=bind('cmsCIE2000DeltaE',C.c_double,[C.POINTER(Lab),C.POINTER(Lab),C.c_double,C.c_double,C.c_double])
def de(a,b):return delta(C.byref(Lab(*a)),C.byref(Lab(*b)),1.,1.,1.)
assert abs(de([50,2.6772,-79.7751],[50,0,-82.7485])-2.0425)<.0001
def lcms(ink):
    out=(C.c_double*3)()
    run(t,(C.c_uint16*4)(*ink),out,1)
    return list(out)
records=[]
for i,(r,s) in enumerate(zip(rows,rgb_rows)):
    assert (r['hlc'],r['row_id'])==(s['hlc'],s['row_id'])
    d8=[abs(round(a/257)-round(b/257)) for a,b in zip(direct[i],arg16[i])]
    d16=[abs(a-b) for a,b in zip(direct[i],arg16[i])]
    a,b,c=pred[i],pred[100+i],pred[200+i]
    row=dict(hlc=r['hlc'],target=targets[i],lcms_cmyk16=direct[i],argyll_cmyk16=arg16[i],channel_error8=d8,channel_error16=d16,argyll_lab_direct=a,argyll_lab_rgb=b,argyll_lab_own=c,lcms_lab_direct=lcms(direct[i]),lcms_lab_rgb=lcms(rgb[i]),same_ink_de00_direct=de(a,lcms(direct[i])),same_ink_de00_rgb=de(b,lcms(rgb[i])),argyll_error_direct=de(targets[i],a),argyll_error_rgb=de(targets[i],b),argyll_error_own=de(targets[i],c))
    records.append(row)
    print('AUDIT_ARGYLL_ROW',json.dumps(row),flush=True)
m=lambda k:statistics.mean(r[k] for r in records)
print('AUDIT_ARGYLL_SUMMARY',json.dumps(dict(n=len(records),max_channel8=max(max(r['channel_error8']) for r in records),max_channel16=max(max(r['channel_error16']) for r in records),max_same_ink_de00=max(max(r['same_ink_de00_direct'],r['same_ink_de00_rgb']) for r in records),rgb_mean=m('argyll_error_rgb'),direct_mean=m('argyll_error_direct'),argyll_own_mean=m('argyll_error_own'),improved=sum(r['argyll_error_rgb']-r['argyll_error_direct']>.1 for r in records),worse=sum(r['argyll_error_direct']-r['argyll_error_rgb']>.1 for r in records))),flush=True)
assert all(max(r['channel_error8'])<=3 for r in records),'Independent separation exceeds inherited CMYK8 tolerance'
print('PASS independent Lab separation channel gate; reverse predictions reported, no physical proof',flush=True)
