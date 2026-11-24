#!/usr/bin/env python3
"""Synthetic wide-gamut source test, not library membership or physical proof.
Matrices and transfer functions: W3C CSS Color 4, section 19.
https://www.w3.org/TR/2026/CRD-css-color-4-20261123/
"""
import ctypes as C, ctypes.util, itertools, json, math, os, statistics, subprocess, tempfile
from pathlib import Path
from PIL import Image
import hashlib, io, urllib.request, zipfile
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
openmem=bind('cmsOpenProfileFromMem',ptr,[ptr,ui])
src_profiles={}; src_buffers={}; direct_transforms={}; pcs_transforms={}
rgbdbl=(1<<22)|(4<<16)|(3<<3)
for space,url in [('P3','https://registry.color.org/rgb-registry/profiles/DisplayP3.zip'),('ProPhoto','https://registry.color.org/rgb-registry/profiles/ISO22028-2_ROMM-RGB.icc')]:
    prefix='ATLAS_P3' if space=='P3' else 'ATLAS_ROMM'
    local=os.environ.get(prefix+'_ICC')
    expected=os.environ.get(prefix+'_SHA256',{'P3':'20789fdbea9835251a4f0796c8bf45cbd964896044886540da21ffc7457af0ab','ProPhoto':'96b2f2987f83e2a545e607799fbfdff43ef8158fb9b215b187c574db8f145aaf'}[space])
    if local:
        if not expected: raise ValueError(prefix+' local ICC requires a trusted SHA-256')
        raw=Path(local).read_bytes()
        origin='local supplied file'
    else:
        request=urllib.request.Request(url,headers={'User-Agent':'ATLAS-Clarus-Open-DCM-CI/0.1 (ICC source verification)','Accept':'application/zip,application/vnd.iccprofile,application/octet-stream,*/*'})
        try:
            with urllib.request.urlopen(request,timeout=45) as response:
                raw=response.read(4000001)
        except Exception as exc:
            raise RuntimeError(f'{space}: official source unavailable; supply {prefix}_ICC and independently verified {prefix}_SHA256; no substitute accepted') from exc
        origin=url
    assert len(raw)<=4000000
    if space=='P3' and not local:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            names=[n for n in z.namelist() if Path(n).name.lower() in ('display p3.icc','displayp3.icc')]
            assert len(names)==1,names
            raw=z.read(names[0])
    assert len(raw)>=128 and raw[16:20]==b'RGB ' and raw[36:40]==b'acsp'
    assert int.from_bytes(raw[:4],'big')==len(raw)
    digest=hashlib.sha256(raw).hexdigest()
    if expected and digest!=expected.lower(): raise ValueError(prefix+' ICC digest mismatch')
    print('SOURCE_ICC_PROVENANCE',json.dumps(dict(space=space,origin=origin,sha256=digest,externally_pinned=bool(expected))),flush=True)
    print('SOURCE_ICC',json.dumps({'space':space,'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}),flush=True)
    buf=C.create_string_buffer(raw);src_buffers[space]=buf
    src_profiles[space]=openmem(buf,len(raw))
src_profiles['sRGB']=bind('cmsCreate_sRGBProfile',ptr,[])()
for space,p in src_profiles.items():
    assert p
    direct_transforms[space]=make(p,rgbdbl,dp,cd,1,0x100)
    pcs_transforms[space]=make(p,rgbdbl,lp,ld,1,0x100)
    assert direct_transforms[space] and pcs_transforms[space]
def profile_direct(space,rgb):
    inp=(C.c_double*3)(*rgb); ink=(C.c_uint16*4)(); out=(C.c_double*3)(); pcs=(C.c_double*3)()
    run(direct_transforms[space],inp,ink,1)
    run(pcs_transforms[space],inp,pcs,1)
    run(b,ink,out,1)
    assert all(math.isfinite(x) for x in list(out)+list(pcs))
    return list(ink),list(out),list(pcs)
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
    pi,pp,pcs=profile_direct(space,rgb)
    e3=de(target,pp)
    print('DIRECT_ICC_ROW',json.dumps(dict(space=space,rgb=rgb,source_pcs_de00=de(target,pcs),profile_cmyk16=pi,profile_de00=e3,explicit_lab_de00=e2,clipped_de00=e1,profile_vs_explicit_prediction_de00=de(pp,dpred))),flush=True)
    row=dict(space=space,rgb=rgb,target_lab=target,unclipped_linear_srgb=lin,clipping_de00=de(target,clipped),rgb_cmyk16=ci,direct_cmyk16=di,rgb_prediction=cp,direct_prediction=dpred,rgb_de00=e1,direct_de00=e2,improvement=e1-e2)
    print('WIDE_GAMUT_ROW',json.dumps(row),flush=True);row.update(profile_de00=e3,source_pcs_de00=de(target,pcs));results.append(row);patches.extend([ci,di,pi])
for space in ('P3','ProPhoto','sRGB'):
    rows=[r for r in results if r['space']==space]
    print('DIRECT_ICC_SUMMARY',json.dumps(dict(space=space,n=len(rows),profile_mean=statistics.mean(r['profile_de00'] for r in rows),explicit_lab_mean=statistics.mean(r['direct_de00'] for r in rows),clipped_mean=statistics.mean(r['rgb_de00'] for r in rows),max_source_pcs_de00=max(r['source_pcs_de00'] for r in rows))),flush=True)
    print('WIDE_GAMUT_SUMMARY',json.dumps(dict(space=space,n=len(rows),rgb_mean=statistics.mean(r['rgb_de00'] for r in rows),direct_mean=statistics.mean(r['direct_de00'] for r in rows),improved=sum(r['improvement']>.1 for r in rows),worse=sum(r['improvement']<-.1 for r in rows))),flush=True)
# Raster both paths, 150 patches, 6400 interior pixels each.
with tempfile.TemporaryDirectory() as tmp:
    ps=Path(tmp)/'wide.ps'; tif=Path(tmp)/'wide.tif'
    lines=['%!PS-Adobe-3.0','<< /PageSize [1000 1500] >> setpagedevice']
    for i,ink in enumerate(patches):
        lines.append(' '.join(f'{v/65535:.12f}' for v in ink)+f' setcmykcolor {i%10*100} {1400-i//10*100} 100 100 rectfill')
    ps.write_text('\n'.join(lines+['showpage'])+'\n')
    subprocess.run(['gs','-q','-dSAFER','-dBATCH','-dNOPAUSE','-sDEVICE=tiff32nc','-r72','-dUseFastColor=true',f'-sOutputFile={tif}',str(ps)],check=True,timeout=60)
    with Image.open(tif) as im:
        assert im.mode=='CMYK' and im.size==(1000,1500)
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

# Exhaustive audit: same nominal D50 Lab target for each route, no use of historical RGB.
# Invert the published matrices without adding dependencies.
def inverse(m):
    a=[list(row)+[float(i==j) for j in range(3)] for i,row in enumerate(m)]
    for i in range(3):
        k=max(range(i,3),key=lambda k:abs(a[k][i]))
        a[i],a[k]=a[k],a[i]
        q=a[i][i]; assert abs(q)>1e-12
        a[i]=[v/q for v in a[i]]
        for j in range(3):
            if j!=i:
                q=a[j][i];a[j]=[v-q*w for v,w in zip(a[j],a[i])]
    return [row[3:] for row in a]
def lab_xyz(v):
    L,A,B=v;y=(L+16)/116
    f=lambda t:t**3 if t>6/29 else (116*t-16)/(24389/27)
    return [f(y+A/500)*.9642956764,f(y),f(y-B/200)*.8251046025]
invp3=inverse(P3);invpro=inverse(PRO)
def encode(space,x):
    if space=='ProPhoto':return 16*x if x<=1/512 else x**(1/1.8)
    return 12.92*x if x<=.0031308 else 1.055*x**(1/2.4)-.055
# Source profile hashes frozen to actual prior CI download; not external certification.
master=json.loads((Path(__file__).resolve().parents[2]/'hover-library/data/colors.json').read_text())
assert master['master_sha256']=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
assert len(master['colors'])==len({r['ref'] for r in master['colors']})==13283
audit={s:[] for s in ('sRGB','P3','ProPhoto','Lab')}
for row in master['colors']:
    target=row['lab']; x=lab_xyz(target)
    di,dl=separation(target); base=de(target,dl)
    record={'hlc':row['ref'],'row_id':row['id'],'Lab':{'de00':base,'cmyk16':di}}
    audit['Lab'].append((base,False,0.,0.))
    for s,lin in [('sRGB',srlinear(x)),('P3',mv(invp3,mv(D50_D65,x))),('ProPhoto',mv(invpro,x))]:
        clipped=any(v< -1e-7 or v>1+1e-7 for v in lin)
        rgb=[min(1.,max(0.,encode(s,min(1.,max(0.,v))))) for v in lin]
        ink,pred,pcs=profile_direct(s,rgb)
        err=de(target,pred); loss=de(target,pcs)
        audit[s].append((err,clipped,loss,err-base))
        record[s]={'de00':err,'cmyk16':ink,'clipped':clipped,'linear_rgb_unclipped':lin,'source_pcs_de00':loss}
    print('FULL_GAMUT_ROW',json.dumps(record,separators=(',',':')),flush=True)
for s,vals in audit.items():
    e=sorted(v[0] for v in vals)
    print('FULL_GAMUT_SUMMARY',json.dumps(dict(space=s,n=len(vals),mean=statistics.mean(e),median=statistics.median(e),p95=e[math.ceil(.95*len(e))-1],maximum=e[-1],clipped=sum(v[1] for v in vals),mean_source_loss=statistics.mean(v[2] for v in vals),worse_than_lab=sum(v[3]>.1 for v in vals),better_than_lab=sum(v[3]<-.1 for v in vals))),flush=True)
print('PASS full nominal Lab path audit; 53132 separations, continuous RGB, profile-relative predictions only; independent CMM full audit pending',flush=True)
