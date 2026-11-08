/* DOM interaction tests only. No browser rendering or measured display claims. */
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),standalone=path.resolve(process.argv[4]);fs.mkdirSync(out,{recursive:true});
const tick=()=>new Promise(r=>setTimeout(r,0));
async function setup(p3=false){
  const errors=[],downloads=[],blobs=new Map();let serial=0;
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(fs.readFileSync(standalone,'utf8'),{url:'https://atlas-test.invalid/digital.html',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
    w.matchMedia=()=>({matches:p3});w.CSS={supports:()=>p3};w.Blob=Blob;
    w.URL.createObjectURL=blob=>{const id='blob:test-'+serial++;blobs.set(id,blob);return id;};w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({name:this.download,blob:blobs.get(this.href)});};
    w.HTMLElement.prototype.scrollIntoView=function(){};
  }});
  await tick();return {dom,w:dom.window,$:id=>dom.window.document.getElementById(id),errors,downloads};
}
(async()=>{
  const test=await setup(),{dom,w,$,errors,downloads}=test;
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
  const click=id=>$(id).click();
  assert.equal($('address').textContent,'H295_L040_C100');assert.match($('comparison-ref').textContent,/H290_L040_C075/);
  assert.equal($('source-swatch').style.backgroundColor,'rgb(55, 73, 248)');assert.equal($('master-swatch').style.backgroundColor,'rgb(61, 83, 211)');
  assert.match($('digital-library-counts').textContent,/15\.430/);assert.match($('digital-membership').textContent,/Display P3, ProPhoto RGB/);
  w.document.querySelector('[data-address="H295_L040_C100"]').click();assert.equal($('address').textContent,'H295_L040_C100');
  click('save-library');let exported=JSON.parse(await downloads.at(-1).blob.text());assert.equal(exported.rows.length,15430);
  change('digital-library','prophoto-rgb');assert.match($('digital-library-counts').textContent,/22\.248/);click('save-library');exported=JSON.parse(await downloads.at(-1).blob.text());assert.equal(exported.rows.length,22248);assert.equal(exported.rows.find(r=>r.address==='H295_L040_C100').identity.atlas_row_id,null);
  change('library-hue','290');w.document.querySelector('[data-address="H290_L040_C095"]').click();assert.equal($('address').textContent,'H290_L040_C095');assert.match($('rgb-values').firstElementChild.textContent,/Außerhalb/);
  change('hlc','H295_L040_C100');assert.equal($('result').hidden,true);click('calculate');change('colour-name','Mein Blau');click('add');
  change('input-kind','RGB');assert.equal($('result').hidden,true);change('rgb-space','display-p3');change('rgb-scale','1');change('red','1');change('green','0');change('blue','0');change('colour-name','<script>window.bad=1</script>');click('calculate');
  assert.match($('preview-status').textContent,/begrenzte/);assert.match($('rgb-values').firstElementChild.textContent,/Außerhalb/);click('add');assert.equal(w.bad,undefined);
  click('save');const de=await downloads.at(-1).blob.text();let doc=JSON.parse(de);assert.equal(doc.entries.length,2);assert.equal(doc.entries[1].colour.source.space,'display-p3');
  click('css');assert.match(await downloads.at(-1).blob.text(),/@media \(color-gamut: p3\)/);
  change('language','en');click('save');assert.equal(await downloads.at(-1).blob.text(),de);
  w.document.querySelector('[data-remove="0"]').click();assert.equal(w.document.querySelectorAll('.palette-row').length,1);
  async function load(text){Object.defineProperty($('open'),'files',{configurable:true,value:[{size:Buffer.byteLength(text),text:async()=>text}]});$('open').dispatchEvent(new w.Event('change'));await tick();}
  await load(de);assert.match($('status').textContent,/verified/);assert.equal(w.document.querySelectorAll('.palette-row').length,2);
  doc.entries[0].colour.identity.atlas_row_id=10646;await load(JSON.stringify(doc));assert.equal($('status').classList.contains('error'),true);assert.equal(w.document.querySelectorAll('.palette-row').length,2);
  change('library','pso_coated_v3_fogra51');assert.match($('library-status').textContent,/9,034/);
  change('input-kind','HLC');change('hlc','H290_L040_C075');click('calculate');assert.match($('identity-kind').textContent,/Existing master/);
  change('hlc','H999_L040_C100');click('calculate');assert.equal($('result').hidden,true);assert.equal($('status').classList.contains('error'),true);
  assert.deepEqual(errors,[]);dom.window.close();
  const wide=await setup(true);assert.match(wide.$('preview-status').textContent,/Display-P3/);assert.match(wide.$('source-swatch').style.backgroundColor,/display-p3/);assert.deepEqual(wide.errors,[]);wide.dom.window.close();
  // Test launcher code against the real packaged markup without running legacy UI.
  const launches=[];
  for(const name of ['index.html','startup/index.html']){
    const page=new JSDOM(fs.readFileSync(path.join(runtime,name),'utf8'),{url:'https://atlas-test.invalid/'+name,runScripts:'outside-only'}),window=page.window;
    window.eval(fs.readFileSync(path.join(runtime,'digital/entry.js'),'utf8'));
    const link=window.document.getElementById('digital-colour-entry');assert.ok(link,name);
    assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(runtime,name)),link.getAttribute('href').split('?')[0])));
    window.document.documentElement.lang='en';await tick();assert.match(link.textContent,/Digital HLC/);assert.match(link.href,/lang=en/);launches.push(name);window.close();
  }
  const result={status:'PASS',surface:'JSDOM; no rendered browser/physical display validation',jsdom_version:require('jsdom/package.json').version,
    checks:['P3/ProPhoto library browsing and complete JSON downloads','Both requested blue examples retain digital identity','Exact assigned CSS sRGB swatch values','Native HLC and tagged P3 input; dirty-state and invalid-input guard','JSON reopen; forged row ID rejected without losing palette','DE/EN changes no exported bytes; CSS export','User labels rendered as text','All-library versus source-library membership separated','P3 capability branch mocked','Launchers present in real Browser/Startup markup and track language'],launches,errors};
  fs.writeFileSync(path.join(out,'dom-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
