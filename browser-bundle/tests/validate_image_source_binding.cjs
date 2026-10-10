'use strict';
// Differential regression: unchanged published importer must accept the forged
// self-consistent documents; the proposed importer must reject those same bytes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve(process.env.SOURCE_BINDING_OUTPUT||'/tmp/atlas-source-binding');
const browserName=process.env.SOURCE_BINDING_BROWSER||'chromium';
const target=path.resolve(process.env.IMAGE_PROJECTS_HTML||'browser-bundle/build-source-binding/atlas-clarus-browser-bundle/index.html');
const legacy=path.join(out,'legacy/atlas-clarus-browser-bundle/index.html');
const sha=b=>createHash('sha256').update(b).digest('hex');
const projects={},report={browser:browserName,status:'RUNNING',fixtures:[],attacks:[],live_ionos:'NOT_TESTED',authorship:'NOT_ESTABLISHED'};
async function ready(page,prefix){
  await page.waitForFunction(p=>!document.getElementById('ip-import').disabled&&(document.getElementById('ip-status').textContent.startsWith(p)||document.getElementById('ip-status').dataset.error==='true'),prefix);
  const text=await page.locator('#ip-status').innerText();assert(text.startsWith(prefix),text);
}
async function download(page){
  await page.waitForFunction(()=>!document.getElementById('ip-json').disabled);
  const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#ip-json').click()]);
  const file=await d.path();return JSON.parse(fs.readFileSync(file));
}
const upload=(page,bytes,name='image-project.clarus.json')=>page.locator('#ip-import').setInputFiles({name,mimeType:name.endsWith('.zip')?'application/zip':'application/json',buffer:bytes});
(async()=>{
  const browser=await playwright[browserName].launch({headless:true,...(browserName==='chromium'?{args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})}:{})});
  report.browser_version=browser.version();
  try{
    const old=await browser.newPage({acceptDownloads:true}),page=await browser.newPage({acceptDownloads:true}),errors=[],requests=[];
    for(const p of [old,page]){p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});}
    await old.goto(pathToFileURL(legacy).href+'#image-projects');await ready(old,'Ready.');
    await page.goto(pathToFileURL(target).href+'#image-projects');await ready(page,'Ready.');
    for(const name of Object.keys(JSON.parse(fs.readFileSync(path.join(out,'fixtures-sha256.json'))))){
      await old.locator('#ip-image').setInputFiles(path.join(out,name));await ready(old,'Original image retained');
      const p=await download(old);projects[name]=p;
      assert.equal(p.original.file_sha256,sha(fs.readFileSync(path.join(out,name))));
      // Legacy ZIP serialization stays byte-identical; no new read-me/schema fields.
      const packet=await old.evaluate(async p=>{
        const ctx=await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors,ATLAS_CLARUS_DATA.master_sha256);
        return ATLAS_IMAGE_PROJECTS.base64(ClarusHandoff.zipStored(await ATLAS_IMAGE_PROJECTS.exportFiles(p,ctx)));
      },p);
      const checked=await page.evaluate(async ({p,packet})=>{
        const I=ATLAS_IMAGE_PROJECTS,ctx=await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors,ATLAS_CLARUS_DATA.master_sha256);
        const before=JSON.stringify(p),s=await I.verify(p,ctx),zip=await I.importZip(I.unbase64(packet,96*1024*1024),ctx);
        return {unchanged:JSON.stringify(p)===before&&JSON.stringify(zip)===before,hash:await ctx.sha(s.original)};
      },{p,packet});
      assert(checked.unchanged);assert.equal(checked.hash,p.original.rgba_sha256);
      report.fixtures.push({name,width:p.original.width,height:p.original.height,source_sha256:p.original.file_sha256,rgba_sha256:p.original.rgba_sha256,legacy_json_and_zip:'PASS'});
    }
    assert.notEqual(projects['linear-icc.png'].original.rgba_sha256,projects['opaque.png'].original.rgba_sha256,'PNG ICC conversion must be observable');
    assert.notEqual(projects['linear-icc.jpg'].original.rgba_sha256,projects['plain.jpg'].original.rgba_sha256,'JPEG ICC conversion must be observable');
    const raw=Buffer.from(projects['exif-1.jpg'].original.rgba_base64,'base64'),w=31,h=19;
    for(let orientation=1;orientation<=8;orientation++){
      const p=projects[`exif-${orientation}.jpg`],ow=orientation>=5?h:w,oh=orientation>=5?w:h,expected=Buffer.alloc(raw.length);
      assert.equal(p.original.width,ow);assert.equal(p.original.height,oh);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const [xx,yy]=[null,[x,y],[w-1-x,y],[w-1-x,h-1-y],[x,h-1-y],[y,x],[h-1-y,x],[h-1-y,w-1-x],[y,w-1-x]][orientation];
        raw.copy(expected,(yy*ow+xx)*4,(y*w+x)*4,(y*w+x)*4+4);
      }
      assert.deepEqual(Buffer.from(p.original.rgba_base64,'base64'),expected,`EXIF ${orientation} coordinate transform`);
    }
    // Construct attacks through the old verifier, including completely regenerated
    // journal, document, ZIP CRCs and companion manifest. Original file stays fixed
    // for both changed-pixel attacks and the forged-journal attack.
    const attacks=await old.evaluate(async projects=>{
      const I=ATLAS_IMAGE_PROJECTS,P=ATLAS_COLOUR_PROJECTS,H=ClarusHandoff,ctx=await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors,ATLAS_CLARUS_DATA.master_sha256),out=[];
      async function rehash(p){p.document_sha256=await ctx.sha(H.utf8(P.canon(Object.fromEntries(Object.entries(p).filter(([k])=>k!=='document_sha256')))));}
      for(const kind of ['rgb-empty','alpha-empty','rgb-history','dimension-transpose','different-profile-source','undecodable-source','jpeg-rgb-empty','icc-rgb-empty']){
        let p=structuredClone(projects[kind==='dimension-transpose'?'exif-1.jpg':kind==='jpeg-rgb-empty'?'plain.jpg':kind==='icc-rgb-empty'?'linear-icc.png':'opaque.png']);
        p.project_id=ctx.uuid();const initialFile=p.original.file_sha256;
        if(kind==='dimension-transpose')[p.original.width,p.original.height]=[p.original.height,p.original.width];
        else if(kind==='different-profile-source'){
          p.original.file_base64=projects['linear-icc.png'].original.file_base64;p.original.file_sha256=projects['linear-icc.png'].original.file_sha256;
        }else if(kind==='undecodable-source'){
          const b=I.unbase64(p.original.file_base64,I.MAX_SOURCE).slice(0,24);p.original.file_base64=I.base64(b);p.original.file_sha256=await ctx.sha(b);
        }else{
          const b=I.unbase64(p.original.rgba_base64,I.MAX_PIXELS*4);b[kind==='alpha-empty'?3:0]^=1;p.original.rgba_base64=I.base64(b);p.original.rgba_sha256=await ctx.sha(b);
        }
        await rehash(p);
        if(kind==='rgb-history'){
          p=await I.edit(p,{kind:'RECOLOUR',rect:[2,3,1,1],replacement:[17,34,51],note:'Synthetic edit after a forged starting pixel.'},ctx);
          p=await I.edit(p,{kind:'TRANSPARENT',rect:[2,3,1,1],note:'Synthetic removal.'},ctx);
          p=await I.edit(p,{kind:'UNDO',note:'Synthetic undo.'},ctx);
          p=await I.edit(p,{kind:'REDO',note:'Synthetic redo.'},ctx);
        }
        await I.verify(p,ctx);const zip=H.zipStored(await I.exportFiles(p,ctx));await I.importZip(zip,ctx);
        out.push({kind,p,zip:I.base64(zip),source_unchanged:p.original.file_sha256===initialFile});
      }
      return out;
    },projects);
    for(const attack of attacks){
      const result=await page.evaluate(async a=>{
        const I=ATLAS_IMAGE_PROJECTS,ctx=await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors,ATLAS_CLARUS_DATA.master_sha256),before=JSON.stringify(a.p),messages=[];
        for(const run of [()=>I.verify(a.p,ctx),()=>I.importZip(I.unbase64(a.zip,96*1024*1024),ctx)]){
          try{await run();messages.push('ACCEPTED');}catch(e){messages.push(e.message);}
        }
        return {messages,unchanged:before===JSON.stringify(a.p)};
      },attack);
      assert(result.unchanged);for(const m of result.messages)assert.match(m,/Source\/pixel consistency could not be verified|retained source image could not be decoded/);
      if(/rgb|alpha/.test(attack.kind))assert(attack.source_unchanged);
      report.attacks.push({name:attack.kind,source_unchanged:attack.source_unchanged,journal_events:attack.p.history.length,legacy_accepts_json_and_zip:true,candidate_rejects_json_and_zip:true,messages:result.messages});
    }
    // Actual UI routes must preserve an already open valid project on rejection.
    const retained=projects['opaque.png'];await upload(page,Buffer.from(JSON.stringify(retained)));await ready(page,'Image project opened');
    for(const [route,attack]of [['json',attacks[0]],['zip',attacks[2]],['drop',attacks[1]]]){
      if(route==='drop')await page.evaluate(text=>{const dt=new DataTransfer();dt.items.add(new File([text],'image-project.clarus.json',{type:'application/json'}));document.getElementById('ip-drop').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));},JSON.stringify(attack.p));
      else await upload(page,route==='zip'?Buffer.from(attack.zip,'base64'):Buffer.from(JSON.stringify(attack.p)),route==='zip'?'forged.zip':'forged.json');
      await page.waitForFunction(()=>!document.getElementById('ip-import').disabled&&document.getElementById('ip-status').dataset.error==='true');
      assert.match(await page.locator('#ip-status').innerText(),/Source\/pixel consistency could not be verified/);
      assert.deepEqual(await download(page),retained);
    }
    // No decoder => no successful verify; a host decoder mismatch is not repaired.
    const hostFailures=await page.evaluate(async p=>{
      const I=ATLAS_IMAGE_PROJECTS,base=await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors,ATLAS_CLARUS_DATA.master_sha256),messages=[];
      for(const decodeSource of [async()=>{throw Error('decoder unavailable');},async b=>{const d=await I.decodeSource(b);d.rgba[0]^=1;return d;}]){
        try{await I.verify(p,{...base,decodeSource});messages.push('ACCEPTED');}catch(e){messages.push(e.message);}
      }return messages;
    },retained);
    assert.match(hostFailures[0],/decoder unavailable/);assert.match(hostFailures[1],/Source\/pixel consistency/);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    report.status='PASS';report.all_eight_exif_transforms=true;report.png_and_jpeg_icc_observable=true;report.json_zip_drop_keep_workspace=true;report.decoder_failure_and_mismatch_fail_closed=true;
    fs.writeFileSync(path.join(out,`report-${browserName}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
