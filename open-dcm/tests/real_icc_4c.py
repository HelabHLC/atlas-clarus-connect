#!/usr/bin/env python3
"""Live ICC 4C separation test: actual lcms-wasm Worker vs system LittleCMS/Pillow.

This is a second binding to the LittleCMS family, not independent colour science.
The test profile is installed by the OS, NOT vendored or committed. No printer
driver, RIP, production profile qualification, substrate simulation or proof.
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
import hashlib, json, os, sys
from PIL import Image, ImageCms
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'browser-bundle'))
from build_lcms import worker_source

PROFILE=Path(os.environ.get('ATLAS_TEST_CMYK_ICC',
                           '/usr/share/color/icc/ghostscript/default_cmyk.icc'))
if not PROFILE.is_file():
    raise SystemExit('Real ICC regression requires the Ghostscript system CMYK profile')
raw=PROFILE.read_bytes()
assert raw[12:16]==b'prtr' and raw[16:20]==b'CMYK'
sha=hashlib.sha256(raw).hexdigest()
profile_name='Ghostscript CMYK system profile (TEST ONLY)'
src=ImageCms.createProfile('sRGB')
dst=ImageCms.getOpenProfile(str(PROFILE))
transform=ImageCms.buildTransformFromOpenProfiles(
    src,dst,'RGB','CMYK',renderingIntent=1,flags=int(ImageCms.Flags.NOOPTIMIZE))
samples=[(232,104,42),(0,55,157),(128,128,128)]
expected=[list(ImageCms.applyTransform(Image.new('RGB',(1,1),rgb),transform).getpixel((0,0)))
          for rgb in samples]
print('Real ICC test fixture: bytes=',len(raw),'sha256=',sha, 'system lcms=',ImageCms.core.littlecms_version)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=http.serve_forever,daemon=True).start()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:'+str(http.server_port)+'/open-dcm/',
                  wait_until='load',timeout=30000)
        page.evaluate("""source => {
          const s=document.createElement('script');s.id='atlas-print-worker-source';
          s.type='application/json';s.textContent=JSON.stringify(source);
          document.body.appendChild(s);
        }""",worker_source())
        for rgb,exp in zip(samples,expected):
            outcome=page.evaluate("""async args => {
              const [{createColourRecord},{createPrintAdapterPreparation},{runPrintAdapter4C}]=
                await Promise.all([
                  import('/open-dcm/reference-record.mjs'),
                  import('/open-dcm/print-adapter-contract.mjs'),
                  import('/open-dcm/print-adapter-icc-4c.mjs')
                ]);
              const prepared=createPrintAdapterPreparation({
                colourRecord:createColourRecord({
                  hlcAddress:'H050_L060_C075',sourceRgb:args.rgb
                }),
                masterSha256:'8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4',
                atlasRowId:100,paths:['4C','ECG'],
                contextByPath:{'4C':{substrate:'test-only substrate',printing_condition:args.condition}}
              });
              const catalog={schema:'ATLAS_LIBRARY_ICC_CATALOG_V1',profiles:{
                example:{device_class:'prtr',output_path:'4C',beta:false,
                  sha256:args.sha,bytes:args.bytes.length,printing_condition:args.condition}
              }};
              return await runPrintAdapter4C({
                preparation:prepared,catalog,profileId:'example',
                profileBytes:new Uint8Array(args.bytes),
                intent:'Relative colorimetric',bpc:false,tolerance8:3,
                secondBinding:{
                  binding:'Pillow ImageCms / system LittleCMS',
                  profileSha256:args.sha,sourceRgb:args.rgb,
                  deviceCmyk8:args.expected,intent:'Relative colorimetric',bpc:false
                }
              });
            }""",{"rgb":list(rgb),"expected":exp,"bytes":list(raw),"sha":sha,
                   "condition":profile_name})
            c=outcome['production_paths'][0]
            e=outcome['production_paths'][1]
            assert c['calculation_evidence']['second_binding']['status']=='PASS',c
            assert len(c['device_values'])==4 and all(0<=v<=65535 for v in c['device_values'])
            assert c['calculation_evidence']['profile_sha256']==sha
            assert c['predicted_lab'] is None and c['delta_e00'] is None
            assert c['production_approval']=='NOT_GRANTED'
            assert e['device_values'] is None and e['calculation_status']=='NOT_CALCULATED'
            assert outcome['source']['identity_status']=='DECLARED_REQUIRES_MASTER_LOOKUP'
            assert outcome['status']=='ICC_4C_CALCULATED_NOT_PROOFED'
            print('PASS actual LittleCMS CMYK16',rgb,c['device_values'],
                  'Pillow CMYK8',exp,'diff',
                  c['calculation_evidence']['second_binding']['absolute_channel_errors'])
        assert not errors,errors
        browser.close()
finally:
    http.shutdown()
print('PASS 4C ICC integration: real-worker calculations, matched secondary binding; no device handoff or physical proof')
