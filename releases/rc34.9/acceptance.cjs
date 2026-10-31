// DOM integration test. Canvas and Worker APIs are supplied by the harness;
// this does not claim browser rendering or native QuarkXPress acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const {createCanvas,Image:NativeImage,ImageData}=require('@napi-rs/canvas');
const root=path.resolve(process.argv[2]),blobs=new Map(),downloads=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{
  url:'https://clarus.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Blob=Blob;w.ImageData=ImageData;w.scrollTo=()=>{};
    w.URL.createObjectURL=b=>{const id='blob:test/'+blobs.size;blobs.set(id,b);return id;};w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)});};
    w.HTMLCanvasElement.prototype.getContext=function(kind){
      if(kind!=='2d')return null;
      if(!this._canvas||this._canvas.width!==this.width||this._canvas.height!==this.height)this._canvas=createCanvas(this.width||1,this.height||1);
      return this._canvas.getContext('2d');
    };
    w.HTMLCanvasElement.prototype.toDataURL=function(){this.getContext('2d');return this._canvas.toDataURL('image/png');};
    w.Image=class extends NativeImage{
      set src(value){
        if(blobs.has(value))blobs.get(value).arrayBuffer().then(b=>{super.src=Buffer.from(b);}).catch(e=>this.onerror?.(e));
        else super.src=value;
      }
    };
    Object.defineProperty(w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});
    w.Worker=class {
      constructor(url){this.stopped=false;this.ready=blobs.get(url).text().then(source=>{
        const c={TextEncoder,TextDecoder,Uint8Array:w.Uint8Array,Uint16Array:w.Uint16Array,Uint32Array:w.Uint32Array,
          Uint8ClampedArray:w.Uint8ClampedArray,Float64Array:w.Float64Array};
        c.self=c;c.postMessage=data=>{if(!this.stopped)this.onmessage?.({data});};
        this.context=vm.createContext(c);vm.runInContext(source,this.context);
      });}
      postMessage(data){this.ready.then(()=>{if(!this.stopped)this.context.onmessage({data});}).catch(e=>this.onerror?.(e));}
      terminate(){this.stopped=true;}
    };
  }
});
const w=dom.window,$=s=>w.document.querySelector(s),plain=x=>JSON.parse(JSON.stringify(x));
const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timeout: '+$('#cr-status').textContent);};
const file=async(selector,name,data)=>{
  const b=new Blob([data]);b.name=name;Object.defineProperty($(selector),'files',{configurable:true,value:[b]});
  $(selector).dispatchEvent(new w.Event('change'));
};
const grab=async(selector)=>{const i=downloads.length;$(selector).click();await wait(()=>downloads.length>i);return downloads[i];};
(async()=>{try{
  await wait(()=>typeof $('[data-palette-export="quarkxpress"]').onclick==='function');
  $('[data-palette-export="quarkxpress"]').click();assert.equal(downloads.length,0);assert.match($('#export-status').textContent,/Add at least one/);
  const D=w.ATLAS_CLARUS_DATA,E=w.ATLAS_CLARUS_EXPORTS;
  const selected=['H075_L060_C045','H335_L050_C055','H125_L075_C080'].map(ref=>D.colors.find(c=>c.ref===ref));
  const palette=E.clarus(selected,D.master_sha256,'Quark Test');
  await file('#palette-import-file','test.clarus.json',JSON.stringify(palette));
  await wait(()=>$('#export-status').textContent.includes('Imported'));
  const xtg=await grab('[data-palette-export="quarkxpress"]');assert.equal(xtg.name,'Quark_Test.xtg');
  E.verifyQuarkXtg(await xtg.blob.text(),selected,D.master_sha256,'Quark Test');
  const corel=await grab('[data-palette-export="coreldraw"]');E.verifyCorelXml(await corel.blob.text(),selected,'Quark Test');
  const ase=await grab('[data-palette-export="ase"]');
  assert.deepEqual(plain(E.readAse(new w.Uint8Array(await ase.blob.arrayBuffer()))),plain(selected.map(c=>({ref:c.ref,rgb:c.rgb}))));
  const canvas=createCanvas(16,16),ctx=canvas.getContext('2d');
  for(const [i,rgb] of [[1,2,3],[240,240,240],[118,205,39],[200,40,70]].entries()){
    ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect((i%2)*8,Math.floor(i/2)*8,8,8);
  }
  await wait(()=>!$('#cr-file').disabled);
  $('#cr-protection-mode').value='ORIGINAL_RGBA';$('#cr-protection-mode').dispatchEvent(new w.Event('change'));
  await file('#cr-file','test.png',canvas.toBuffer('image/png'));
  await wait(()=>!$('#cr-run').disabled);$('#cr-k').value='4';$('#cr-lock-hex').value='#010203';$('#cr-original-add').click();
  assert.match($('#cr-status').textContent,/Exact original #010203 protected/);
  $('#cr-run').click();await wait(()=>!$('#cr-palette').disabled);
  $('#cr-format').value='xtg';const mixed=await grab('#cr-palette');assert.equal(mixed.name,'palette.xtg');
  const job=await grab('#cr-zip'),bytes=new w.Uint8Array(await job.blob.arrayBuffer());
  const files=w.ATLAS_REDUCTION_JOB.unzip(bytes),report=JSON.parse(new TextDecoder().decode(files['reduction.json']));
  assert.ok(report.palette.some(c=>c.kind==='ORIGINAL_RGB'));
  const expected=report.palette.map(c=>({ref:c.reference,rgb:c.rgb}));
  E.verifyQuarkXtg(await mixed.blob.text(),expected,D.master_sha256,'ATLAS Clarus mixed output');
  assert.equal(new TextDecoder().decode(files['palette.xtg']),await mixed.blob.text());
  await file('#cr-job-import','job.zip',await job.blob.arrayBuffer());
  await wait(()=>$('#cr-status').textContent.includes('Complete reduction job restored'));
  const restored=await grab('#cr-palette');assert.equal(await restored.blob.text(),await mixed.blob.text());
  $('#cr-protection-mode').value='LIBRARY_REFERENCE';$('#cr-protection-mode').dispatchEvent(new w.Event('change'));
  $('#cr-run').click();await wait(()=>!$('#cr-palette').disabled);
  const reference=await grab('#cr-palette');const text=await reference.blob.text();
  assert.ok(text.includes('ATLAS Clarus reduced motif'));assert.ok(E.readQuarkXtg(text).every(c=>/^H\d{3}_L\d{3}_C\d{3}$/.test(c.ref)));
  assert.deepEqual(errors,[]);
  const result={environment:'JSDOM_WITH_NATIVE_CANVAS_AND_VM_WORKER_HARNESS',palette_button:'PASS',empty_palette:'PASS',
    coreldraw_regression:'PASS',ase_regression:'PASS',mixed_reduction:'PASS',reference_only_reduction:'PASS',
    reduction_zip_xtg:'PASS',job_reimport:'PASS',script_errors:errors,browser_rendering:'NOT_TESTED',native_quarkxpress_import:'NOT_TESTED'};
  fs.writeFileSync(path.join(root,'..','dom-acceptance.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
