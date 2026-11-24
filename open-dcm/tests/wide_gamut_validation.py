#!/usr/bin/env python3
"""Synthetic wide-gamut source test, not library membership or physical proof.
Matrices and transfer functions: W3C CSS Color 4, section 19.
https://www.w3.org/TR/2026/CRD-css-color-4-20261123/
"""
import ctypes as C, ctypes.util, itertools, json, math, os, statistics, subprocess, tempfile
from pathlib import Path
from PIL import Image
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

def mv(m,v): return [sum(a*b for a,b in zip(row,v)) for row in m]
P3=((.4865709486,.2656676932,.1982172852),(.2289745641,.6917385218,.0792869141),(0,.0451133819,1.0439443689))
PRO=((.7977666449,.1351812974,.0313477341),(.2880748288,.7118352342,.0000899369),(0,0,.8251046025))
SR=((.4123907993,.3575843394,.1804807884),(.2126390059,.7151686788,.0721923154),(.0193308187,.1191947798,.9505321522))
INV=((3.2409699419,-1.5373831776,-.4986107603),(-.9692436363,1.8759675015,.0415550574),(.0556300797,-.2039769589,1.0569715142))
D65_D50=((1.0479298208,.0229467933,-.0501922295),(.0296278157,.9904344846,-.0170738250),(-.0092430582,.0150551449,.7518742814))
D50_D65=((.9554734527,-.0230985369,.0632593087),(-.0283697070,1.0099954580,.0210413989),(.0123140017,-.0205076964,1.3303659366))
def decode(x): return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def prodecode(x): return x/16 if x<=16/512 else x**1.8
def xyz(space,rgb):
    if space=='ProPhoto': return mv(PRO,[prodecode(x) for x in rgb])
    return mv(D65_D50,mv(P3 if space=='P3' else SR,[decode(x) for x in rgb]))
def lab(xyz50):
    f=lambda t: t**(1/3) if t>216/24389 else (24389/27*t+16)/116
    x,y,z=[f(v/w) for v,w in zip(xyz50,(.9642956764,1,.8251046025))]
    return [116*y-16,500*(x-y),200*(y-z)]
def srlinear(x): return mv(INV,mv(D50_D65,x))
def clipped_lab(v): return lab(mv(D65_D50,mv(SR,[min(1,max(0,x)) for x in v])))
for space in ('P3','ProPhoto','sRGB'):
    assert de(lab(xyz(space,[1,1,1])),[100,0,0])<.01
    assert de(lab(xyz(space,[0,0,0])),[0,0,0])<.01
# Fixed source grid, selected by clipping severity before any ICC evaluation.
# Sample evenly across ranked out-of-sRGB candidates; avoid extreme imaginary
# ProPhoto primaries by using a bounded interior grid, not claiming spectral realizability.
cases=[]
for space in ('P3','ProPhoto'):
    candidates=[]
    for rgb in itertools.product((.1,.25,.4,.55,.7,.85,.95),repeat=3):
        x=xyz(space,rgb); lin=srlinear(x)
        overshoot=max(0,-min(lin),max(lin)-1)
        if overshoot>.005:
            candidates.append((overshoot,rgb))
    candidates.sort()
    assert len(candidates)>=20
    for i in range(20):
        _,rgb=candidates[round(i*(len(candidates)-1)/19)]
        cases.append((space,rgb))
for rgb in ((.2,.2,.2),(.5,.5,.5),(.8,.8,.8),(.6,.3,.3),(.3,.6,.3),(.3,.3,.6),(.6,.6,.3),(.3,.6,.6),(.6,.3,.6),(.45,.55,.65)):
    cases.append(('sRGB',rgb))
lib=C.CDLL(ctypes.util.find_library('lcms2'))
def bind(n,r,a):
    f=getattr(lib,n);f.restype=r;f.argtypes=a;return f
ptr=C.c_void_p;ui=C.c_uint32
lp=bind('cmsCreateLab4Profile',ptr,[ptr])(None)
dp=bind('cmsOpenProfileFromFile',ptr,[C.c_char_p,C.c_char_p])(os.fsencode(os.environ['ATLAS_TEST_CMYK_ICC']),b'r')
make=bind('cmsCreateTransform',ptr,[ptr,ui,ptr,ui,ui,ui])
run=bind('cmsDoTransform',None,[ptr,ptr,ptr,ui])
ld=(1<<22)|(10<<16)|(3<<3); cd=(6<<16)|(4<<3)|2
a=make(lp,ld,dp,cd,1,0x100);b=make(dp,cd,lp,ld,1,0x100)
assert a and b
def separation(v):
    ink=(C.c_uint16*4)(); out=(C.c_double*3)()
    run(a,(C.c_double*3)(*v),ink,1);run(b,ink,out,1)
    assert all(math.isfinite(x) for x in out)
    return list(ink),list(out)
results=[]; patches=[]
for space,rgb in cases:
    x=xyz(space,rgb);target=lab(x);lin=srlinear(x);clipped=clipped_lab(lin)
    if space=='sRGB': assert de(target,clipped)<.01
    else: assert min(lin)<-.005 or max(lin)>1.005
    ci,cp=separation(clipped);di,dpred=separation(target)
    e1,e2=de(target,cp),de(target,dpred)
    row=dict(space=space,rgb=rgb,target_lab=target,unclipped_linear_srgb=lin,clipping_de00=de(target,clipped),rgb_cmyk16=ci,direct_cmyk16=di,rgb_prediction=cp,direct_prediction=dpred,rgb_de00=e1,direct_de00=e2,improvement=e1-e2)
    print('WIDE_GAMUT_ROW',json.dumps(row),flush=True);results.append(row);patches.extend([ci,di])
for space in ('P3','ProPhoto','sRGB'):
    rows=[r for r in results if r['space']==space]
    print('WIDE_GAMUT_SUMMARY',json.dumps(dict(space=space,n=len(rows),rgb_mean=statistics.mean(r['rgb_de00'] for r in rows),direct_mean=statistics.mean(r['direct_de00'] for r in rows),improved=sum(r['improvement']>.1 for r in rows),worse=sum(r['improvement']<-.1 for r in rows))),flush=True)
# Raster both paths, 100 patches, 6400 interior pixels each.
with tempfile.TemporaryDirectory() as tmp:
    ps=Path(tmp)/'wide.ps'; tif=Path(tmp)/'wide.tif'
    lines=['%!PS-Adobe-3.0','<< /PageSize [1000 1000] >> setpagedevice']
    for i,ink in enumerate(patches):
        lines.append(' '.join(f'{v/65535:.12f}' for v in ink)+f' setcmykcolor {i%10*100} {900-i//10*100} 100 100 rectfill')
    ps.write_text('\n'.join(lines+['showpage'])+'\n')
    subprocess.run(['gs','-q','-dSAFER','-dBATCH','-dNOPAUSE','-sDEVICE=tiff32nc','-r72','-dUseFastColor=true',f'-sOutputFile={tif}',str(ps)],check=True,timeout=60)
    with Image.open(tif) as im:
        assert im.mode=='CMYK' and im.size==(1000,1000)
        errors=[]
        for i,ink in enumerate(patches):
            x,y=i%10*100,i//10*100
            p=im.crop((x+10,y+10,x+90,y+90))
            data=p.get_flattened_data() if hasattr(p,'get_flattened_data') else p.getdata()
            expected=[round(v/257) for v in ink]
            errors.append(max(abs(a-b) for pix in data for a,b in zip(pix,expected)))
        print('WIDE_GAMUT_RIP',json.dumps(dict(patches=len(patches),max_channel_error=max(errors),channel_checks=len(patches)*6400*4)),flush=True)
        assert max(errors)<=1
print('PASS wide gamut synthetic source comparison; no library membership, independent CMM, production proof or physical realizability claim',flush=True)
