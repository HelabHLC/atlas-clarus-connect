'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.env.PROJECTS_TEST_OUTPUT||'/tmp/atlas-colour-projects-browser');
fs.mkdirSync(out,{recursive:true});
const target=path.resolve(process.env.PROJECTS_HTML||path.join(root,'browser-bundle/build-projects/atlas-clarus-browser-bundle/index.html'));
const fixture=require('./fixtures/colour-kit-030-two-greens.json'),KEY='atlasClarusColourProjectsV1';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    const ready=()=>page.waitForFunction(()=>!document.getElementById('cp-new').disabled);
    const done=async prefix=>{await page.waitForFunction(p=>(document.getElementById('cp-status').textContent.startsWith(p)||document.getElementById('cp-status').dataset.error==='true')&&!document.getElementById('cp-new').disabled,prefix);assert((await page.locator('#cp-status').innerText()).startsWith(prefix),await page.locator('#cp-status').innerText());};
    const data=()=>page.evaluate(k=>{const l=JSON.parse(localStorage.getItem(k));return l.projects.find(p=>p.project_id===l.active_id);},KEY);
    async function save(button,name){const [dl]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);const dest=path.join(out,name);await dl.saveAs(dest);return dest;}
    const upload=(selector,value)=>page.locator(selector).setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
    await page.goto(pathToFileURL(target).href+'#colour-projects');await ready();
    await page.locator('#cp-new-name').fill('Our startup logo');await page.locator('#cp-new').click();await done('Project created');
    const empty=await data();
    await page.locator('#cp-set-name').fill('Logo greens');await upload('#cp-add-json',fixture);await done('Colour set added');
    const start=await data(),entry=start.revisions.at(-1).entries[0],c=fixture.records[0];
    let card=page.locator('.cp-card').first();
    await card.locator('[data-version]').selectOption(c.revision_id);await card.locator('[data-choice-note]').fill('Keep the original green for launch.');
    await card.locator('[data-choose]').click();await done('Design choice recorded');
    await card.locator('.cp-edit summary').click();await card.locator('[data-hex]').fill('#112233');await card.locator('[data-edit-note]').fill('Try a darker colour for comparison.');
    await card.locator('[data-edit]').click();await done('Colour revision saved');
    assert((await card.locator('.cp-chosen').innerText()).includes('differs from working colour'));
    await page.locator('#cp-note').fill('The original colour remains selected.');await page.locator('#cp-note-save').click();await done('Project note recorded');
    const saved=await data(),json=await save('#cp-save','project.clarus.json');assert.deepEqual(JSON.parse(fs.readFileSync(json)),saved);
    await page.reload();await ready();assert.deepEqual(await data(),saved);
    // Reopening older, divergent, and tampered project files cannot overwrite work.
    for(const bad of [empty,{...saved,document_sha256:'0'.repeat(64)}]){
      await upload('#cp-import',bad);await page.waitForFunction(()=>document.getElementById('cp-status').dataset.error==='true');assert.deepEqual(await data(),saved);
    }
    await page.evaluate(text=>{const dt=new DataTransfer();dt.items.add(new File([text],'project.clarus.json',{type:'application/json'}));document.getElementById('cp-drop').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));},JSON.stringify(saved));
    await done('Project opened');assert.deepEqual(await data(),saved);
    const zip=await save('#cp-package','project.zip');
    execFileSync('python3',['-c',`import zipfile,sys,json,hashlib
z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None
m=json.loads(z.read('project-package-manifest.json'))
for n,h in m['files'].items(): assert hashlib.sha256(z.read(n)).hexdigest()==h,n
z.extractall(sys.argv[2])`,zip,path.join(out,'package')]);
    const workingPath=path.join(out,'package/working',entry.entry_id,'palette.clarus.json');
    const chosenPath=path.join(out,'package/chosen',entry.entry_id,'palette.clarus.json');
    assert.equal(JSON.parse(fs.readFileSync(workingPath)).records[0].original.hex,'#112233');
    assert.equal(JSON.parse(fs.readFileSync(chosenPath)).records[0].original.hex,c.original.hex);
    // Existing handoff import is a real UI consumer of the new exported palette.
    await page.evaluate(()=>location.hash='colour-handoff');await page.locator('#ch-import').setInputFiles(workingPath);
    await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Decision JSON verified'));
    await page.evaluate(()=>location.hash='colour-projects');await page.locator('#cp-set-name').fill('Imported handoff');
    await page.locator('#cp-from-handoff').click();await done('Colour set added');
    assert.equal((await data()).revisions.at(-1).entries.length,2);
    await page.locator('#cp-set-list').selectOption(entry.entry_id);
    // A native file return adds a descendant revision and preserves the choice.
    const returned=await page.evaluate(async value=>{
      const H=window.ClarusHandoff,A=window.ATLAS_COLOUR_HANDOFF;
      const payload=window.ATLAS_CLARUS_DATA;
      const ctx=await A.createContext(payload.colors,payload.master_sha256);
      const files=await H.exportHandoff(value,ctx);
      return (await H.returnHandoff(files['palette.clarus.json'],files['handoff.json'],files['palette.ase'],ctx)).data;
    },JSON.parse(fs.readFileSync(workingPath)));
    await upload('#cp-update-json',returned);await done('Colour set updated');
    assert.equal((await data()).revisions.at(-1).selected[0].revision_id,c.revision_id);
    await page.locator('#cp-new-name').fill('Second project');await page.locator('#cp-new').click();await done('Project created');
    await page.locator('#cp-project-list').selectOption(saved.project_id);
    assert.equal((await data()).project_id,saved.project_id);
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    for(const size of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
      assert.equal(await page.locator('#cp-save').isVisible(),true);await page.screenshot({path:path.join(out,`viewport-${size.width}.png`),fullPage:true});
    }
    await page.evaluate(()=>Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');});
    await page.locator('#cp-note').fill('This version must still be exportable when storage is full.');await page.locator('#cp-note-save').click();await done('Project note recorded');
    assert.equal(await page.locator('#cp-storage-warning').isVisible(),true);
    const memory=JSON.parse(fs.readFileSync(await save('#cp-save','memory-only.json')));
    assert.equal(memory.revisions.at(-1).note,'This version must still be exportable when storage is full.');
    // Cross-tab changes block persistence and leave a recovery download available.
    await page.evaluate(k=>dispatchEvent(new StorageEvent('storage',{key:k,newValue:'changed'})),KEY);
    assert.equal(await page.locator('#cp-new').isDisabled(),true);
    assert.equal(await page.locator('#cp-storage-warning button').isVisible(),true);
    const recovery=JSON.parse(fs.readFileSync(await save('#cp-storage-warning button','recovery.json')));assert.deepEqual(recovery,memory);
    // Denied storage still allows a local file-based session.
    const isolated=await browser.newContext();await isolated.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('denied','SecurityError');};Storage.prototype.setItem=function(){throw new DOMException('denied','SecurityError');};});
    const denied=await isolated.newPage();await denied.goto(pathToFileURL(target).href+'#colour-projects');await denied.waitForFunction(()=>!document.getElementById('cp-new').disabled);
    await denied.locator('#cp-new-name').fill('No storage');await denied.locator('#cp-new').click();await denied.waitForFunction(()=>document.getElementById('cp-status').textContent.startsWith('Project created'));
    assert.equal(await denied.locator('#cp-save').isEnabled(),true);await isolated.close();
    let kitRoundtrip='NOT_RUN';
    if(process.env.COLOUR_KIT_HTML){
      const kitContext=await browser.newContext({acceptDownloads:true}),kit=await kitContext.newPage();
      await kit.goto(pathToFileURL(path.resolve(process.env.COLOUR_KIT_HTML)).href);await kit.waitForFunction(()=>!document.getElementById('import').disabled);
      for(const [name,file]of [['working',workingPath],['chosen',chosenPath]]){
        await kit.locator('#import').setInputFiles(file);await kit.waitForFunction(()=>document.getElementById('status').textContent.includes('imported values and assignments verified'));
        const [dl]=await Promise.all([kit.waitForEvent('download'),kit.locator('#download-json').click()]);const dest=path.join(out,'kit-'+name+'.json');await dl.saveAs(dest);
        const fromKit=JSON.parse(fs.readFileSync(dest)),original=JSON.parse(fs.readFileSync(file));assert.deepEqual(fromKit.decisions,original.decisions);assert.deepEqual(fromKit.bundle_origin,original.bundle_origin);assert.deepEqual(fromKit.records,original.records);
      }
      kitRoundtrip='PASS';await kitContext.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    const report={status:'PASS',project_reopen:true,chosen_preserved:true,full_zip_checksums:true,handoff_bridge:true,malformed_import_preserves_workspace:true,local_storage_failure_export:true,cross_tab_recovery:true,denied_storage_session:true,viewports:[1440,390,844],colour_kit_030_roundtrip:kitRoundtrip,native_adobe_validation:'NOT_TESTED'};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
