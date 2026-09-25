'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html='<div id="selection"><h2>Named colour</h2><dl><dt>Exact PKL identity</dt><dd>H040_L055_C080</dd></dl></div><div id="wheel-selection"></div>';
const dom=new JSDOM(html,{url:'https://example.invalid/',runScripts:'outside-only'});
dom.window.eval(fs.readFileSync(require('node:path').join(__dirname,'../src/atlas-offline-mixer.js'),'utf8'));
const panel=dom.window.document.querySelector('#selection .atlas-offline-mixer');
assert(panel,'mixer must mount on a named PKL selection');
assert.equal(panel.dataset.reference,'H040_L055_C080');
assert.equal(dom.window.document.querySelectorAll('#selection .atlas-offline-mixer').length,1);
dom.window.document.querySelector('dd').textContent='H125_L070_C100';
dom.window.MutationObserver && Promise.resolve().then(()=>{
  assert.equal(dom.window.document.querySelector('#selection .atlas-offline-mixer').dataset.reference,'H125_L070_C100');
  dom.window.close();
  console.log('offline mixer UI: PASS');
}).catch(e=>{console.error(e);process.exitCode=1});
