#!/usr/bin/env python3
"""Transient vendor-source PSOcoated_v3.icc validation: no redistribution.

Fetch from ECI first, fallback to the ICC profile registry (ECI-supplied).
Require exact known SHA-256 and byte length before running actual Chromium
lcms-wasm vs Pillow ImageCms and three HLC master-row crosschecks.
Deleting temp files on exit keeps the profile out of the repo and artifacts.
"""
import hashlib, io, os, subprocess, sys, tempfile, urllib.request, zipfile
from pathlib import Path

EXPECTED_SHA='c30ad2c01e8f93135ec7682c535e0a81bc2d177c301e196376c5f5838b5c8e86'
EXPECTED_BYTES=2195228
SOURCES=[
 ('ECI original ZIP','https://eci.org/lib/exe/pso-coated_v3.zip','zip'),
 ('ICC registry original profile','https://registry.color.org/profile-registry/profiles/PSOcoated_v3.icc','icc')
]
profile=None
accepted_source=None
problems=[]
for label,url,kind in SOURCES:
    try:
        req=urllib.request.Request(url,headers={
            'User-Agent':'ATLAS-Clarus-Open-DCM-CI/0.1 (source verification only)',
            'Accept':'application/zip,application/octet-stream,application/vnd.iccprofile,*/*'
        })
        with urllib.request.urlopen(req, timeout=35) as response:
            payload=response.read(12_000_000+1)
        if len(payload)>12_000_000:
            raise ValueError('Original source exceeded download limit')
        if kind=='zip':
            with zipfile.ZipFile(io.BytesIO(payload)) as z:
                matches=[n for n in z.namelist() if Path(n).name.lower()=='psocoated_v3.icc']
                if len(matches)!=1: raise ValueError('Expected exactly one original PSOcoated_v3.icc')
                profile=z.read(matches[0])
        else:
            profile=payload
        if len(profile)!=EXPECTED_BYTES or hashlib.sha256(profile).hexdigest()!=EXPECTED_SHA:
            raise ValueError('Original ICC digest or size differs from frozen PSO Coated v3 reference')
        accepted_source=(label,url)
        break
    except Exception as ex:
        problems.append(f'{label}: {type(ex).__name__}: {ex}')
        profile=None

if profile is None:
    raise SystemExit('FAIL closed: original ECI PSOcoated_v3.icc unavailable/mismatched\n'+'\n'.join(problems))

print('OFFICIAL SOURCE:',accepted_source[0],accepted_source[1],flush=True)
print('PROFILE VERIFIED: PSOcoated_v3.icc',len(profile),'bytes SHA-256',EXPECTED_SHA,flush=True)
with tempfile.TemporaryDirectory(prefix='atlas-icc-eci-') as tmp:
    file=Path(tmp)/'PSOcoated_v3.icc'
    file.write_bytes(profile)
    env=dict(os.environ)
    env.update({
        'ATLAS_TEST_CMYK_ICC':str(file),
        'ATLAS_EXPECT_PROFILE_SHA256':EXPECTED_SHA,
        'ATLAS_ICC_LABEL':'PSO Coated v3 / FOGRA51 / ISO 12647-2:2013 Premium coated'
    })
    results_file=Path(tmp)/'actual-icc-worker-results.json'
    env['ATLAS_WORKER_RESULTS_JSON']=str(results_file)
    script=Path(__file__).with_name('real_icc_4c.py')
    subprocess.run([sys.executable,str(script)],env=env,check=True)
    independent=Path(__file__).with_name('argyll_independent_reference.py')
    subprocess.run([sys.executable,str(independent)],env=env,check=True)
    rip=Path(__file__).with_name('rip_handoff.py')
    subprocess.run([sys.executable,str(rip)],env=env,check=True)

print('PASS original ECI profile + 3 master rows + LittleCMS/Pillow + independent ArgyllCMS check.',flush=True)
print('LIMIT: 8-bit software RIP only; 16-bit raster, production RIP and physical print proof NOT tested.',flush=True)
