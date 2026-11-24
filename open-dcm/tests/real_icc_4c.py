#!/usr/bin/env python3
"""Real browser ICC 4C separation vs Pillow ImageCms (system LittleCMS).

Reads an OS-installed or transient official ICC profile from a local file.
NO ICC file is committed or redistributed. The two bindings use LittleCMS,
so this is an interoperability test, NOT an independent ICC algorithm.
Checks three real row/label/RGB identities against the checked-in browser
projection of the frozen 13,283-row ATLAS master.
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
    raise SystemExit('Real ICC regression requires a locally supplied CMYK profile')
raw=PROFILE.read_bytes()
assert raw[12:16]==b'prtr' and raw[16:20]==b'CMYK'
sha=hashlib.sha256(raw).hexdigest()
expected_sha=os.environ.get('ATLAS_EXPECT_PROFILE_SHA256')
if expected_sha and sha != expected_sha:
    raise AssertionError('Wrong original ICC profile digest; test must fail closed')
profile_name=os.environ.get('ATLAS_ICC_LABEL','Ghostscript CMYK system profile (TEST ONLY)')
src=ImageCms.createProfile('sRGB')
dst=ImageCms.getOpenProfile(str(PROFILE))
transform=ImageCms.buildTransformFromOpenProfiles(
    src,dst,'RGB','CMYK',renderingIntent=1,flags=int(ImageCms.Flags.NOOPTIMIZE))

master=json.loads((ROOT/'hover-library/data/colors.json').read_text())
assert master['master_sha256']=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
assert len(master['colors'])==13283
known=[
    (1737,'H050_L060_C080',[236,101,33]),
    (10519,'H285_L025_C065',[0,55,157]),
    (9536,'H255_L045_C040',[15,114,172])
]
for row_id,hlc,rgb in known:
    c=master['colors'][row_id]
    assert c['id']==row_id and c['ref']==hlc and c['rgb']==rgb, (row_id,c)
expected=[list(ImageCms.applyTransform(Image.new('RGB',(1,1),tuple(rgb)),transform)
              .getpixel((0,0))) for _,_,rgb in known]
worker_results=[]
print('ICC source bytes=',len(raw),'sha256=',sha,
      'binding=',ImageCms.core.littlecms_version,flush=True)
print('MASTER row/HLC/RGB crosscheck: PASS 3/3',flush=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path=='/__icc_test_profile__':
            self.send_response(200)
            self.send_header('Content-Type','application/vnd.iccprofile')
            self.send_header('Content-Length',str(len(raw)))
            self.send_header('Cache-Control','no-store')
            self.end_headers()
            self.wfile.write(raw)
        else:
            super().do_GET()

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
          const s=document.createElement('script');
          s.id='atlas-print-worker-source';
          s.type='application/json';
          s.textContent=JSON.stringify(source);
          document.body.appendChild(s);
        }""",worker_source())
        for (row_id,hlc,rgb),exp in zip(known,expected):
            outcome=page.evaluate("""async args => {
              const [{createColourRecord},{createPrintAdapterPreparation},{runPrintAdapter4C}]=
                await Promise.all([
                  import('/open-dcm/reference-record.mjs'),
                  import('/open-dcm/print-adapter-contract.mjs'),
                  import('/open-dcm/print-adapter-icc-4c.mjs')
                ]);
              const masterDocument=await fetch('/hover-library/data/colors.json')
                .then(r=>{if(!r.ok)throw Error('Master fetch failed');return r.json();});
              const response=await fetch('/__icc_test_profile__');
              if(!response.ok)throw Error('Original ICC loading failed');
              const profileBytes=new Uint8Array(await response.arrayBuffer());
              const prepared=createPrintAdapterPreparation({
                colourRecord:createColourRecord({
                  hlcAddress:args.hlc,sourceRgb:args.rgb
                }),
                masterSha256:args.masterSha256,
                atlasRowId:args.row_id,paths:['4C','ECG'],
                contextByPath:{'4C':{
                  substrate:'Premium coated paper — declared, not measured',
                  printing_condition:args.condition
                }}
              });
              const catalog={schema:'ATLAS_LIBRARY_ICC_CATALOG_V1',profiles:{
                actual:{device_class:'prtr',output_path:'4C',beta:false,
                  sha256:args.sha,bytes:profileBytes.length,
                  printing_condition:args.condition}
              }};
              return await runPrintAdapter4C({
                preparation:prepared,masterDocument,catalog,profileId:'actual',
                profileBytes,
                intent:'Relative colorimetric',bpc:false,tolerance8:3,
                secondBinding:{
                  binding:'Pillow ImageCms / system LittleCMS',
                  profileSha256:args.sha,sourceRgb:args.rgb,
                  deviceCmyk8:args.expected,intent:'Relative colorimetric',bpc:false
                }
              });
            }""",{"rgb":rgb,"hlc":hlc,"row_id":row_id,"expected":exp,
                   "sha":sha,"masterSha256":master['master_sha256'],
                   "condition":profile_name})
            c=outcome['production_paths'][0]
            e=outcome['production_paths'][1]
            assert c['calculation_evidence']['second_binding']['status']=='PASS',c
            assert c['calculation_evidence']['source_identity_verified'] is True
            assert outcome['source']['identity_status']=='MASTER_ROW_RGB_CROSSCHECK_PASS'
            assert len(c['device_values'])==4 and all(0<=v<=65535 for v in c['device_values'])
            assert c['calculation_evidence']['profile_sha256']==sha
            assert c['predicted_lab'] is None and c['delta_e00'] is None
            assert c['production_approval']=='NOT_GRANTED'
            assert e['device_values'] is None and e['calculation_status']=='NOT_CALCULATED'
            assert outcome['status']=='ICC_4C_CALCULATED_NOT_PROOFED'
            worker_results.append({'row_id':row_id,'hlc':hlc,'rgb8':list(rgb),
                                   'cmyk16':c['device_values'],
                                   'profile_sha256':sha,'rendering_intent':'Relative colorimetric',
                                   'bpc':False})
            print('PASS ICC CMYK16',row_id,hlc,rgb,c['device_values'],
                  'Pillow CMYK8',exp,'8bit channel errors',
                  c['calculation_evidence']['second_binding']['absolute_channel_errors'],flush=True)
        assert not errors,errors
        browser.close()
finally:
    http.shutdown()
if os.environ.get('ATLAS_WORKER_RESULTS_JSON'):
    Path(os.environ['ATLAS_WORKER_RESULTS_JSON']).write_text(json.dumps({'profile_sha256':sha,'rows':worker_results},indent=2))
print('PASS actual worker and Pillow binding; no printer control or physical proof',flush=True)
