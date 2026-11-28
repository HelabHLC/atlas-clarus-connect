'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('../browser-bundle/tests/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({extraHTTPHeaders:{'X-Test-Admin':'yes','X-Test-Enabled':'yes'}});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:8765';
 await p.goto(url+'/production-sentinel');
 await p.evaluate(()=>{localStorage.setItem('atlasClarusPalettesV3','production-sentinel');sessionStorage.setItem('test','production-session')});
 await p.goto(url+'/atlas-clarus-rc36-test/#picker');await p.locator('#rc36-file-space').waitFor();
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlasClarusPalettesV3')),null);
 await p.evaluate(()=>{localStorage.setItem('atlasClarusPalettesV3','staging-sentinel');localStorage.extra='staging';sessionStorage.setItem('test','staging-session')});
 await p.goto(url+'/production-sentinel');
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlasClarusPalettesV3')),'production-sentinel');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('test')),'production-session');
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlas-rc36-test::atlasClarusPalettesV3')),'staging-sentinel');
 // Reset malformed test palette through native store; exercise namespace clear separately.
 await p.evaluate(()=>localStorage.removeItem('atlas-rc36-test::atlasClarusPalettesV3'));
 await p.goto(url+'/atlas-clarus-rc36-test/#picker');await p.locator('#rc36-file-space').waitFor();
 await p.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
 await p.goto(url+'/production-sentinel');
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlasClarusPalettesV3')),'production-sentinel');
 assert.equal(await p.evaluate(()=>sessionStorage.getItem('test')),'production-session');
 assert.equal(await p.evaluate(()=>localStorage.getItem('atlas-rc36-test::extra')),null);
 assert.deepEqual(errors,[]);
 console.log('PASS real Chromium: test route and isolated local/session storage; production sentinel unchanged');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
