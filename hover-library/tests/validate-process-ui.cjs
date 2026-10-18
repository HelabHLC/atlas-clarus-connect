'use strict';
const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 for(const selected of ['core','solid_c','solid_u']){
  const dom=new JSDOM('<section class="atlas-clarus-library" data-colors-url="/data/colors.json" data-views-url="/data/views.json" data-name-index-url="/data/atlas-name-search-index-v1.json.gz" data-basis23-url="/data/basis23-recipes/" data-acms-recipes-url="/data/acms-solid-recipe-candidates.json" data-default-view="'+selected+'" data-show-library-selector="1" data-show-search="1" data-show-status="1" data-per-page="24" data-wheel-url="https://example.org/wheel"></section>',{url:'https://example.org/library',runScripts:'outside-only'});
  Object.assign(dom.window,{DecompressionStream,Response,TextEncoder,TextDecoder});
  dom.window.fetch=async url=>{const local=path.join(root,new URL(url,'https://example.org').pathname);return new Response(fs.readFileSync(local));};
  dom.window.eval(fs.readFileSync(path.join(root,'assets/js/atlas-clarus.js'),'utf8'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  for(let n=0;n<200&&!dom.window.document.querySelector('.atlas-clarus-field select');n++)await new Promise(r=>setTimeout(r,10));
  const select=dom.window.document.querySelector('.atlas-clarus-field select');assert(select,dom.window.document.body.textContent);const ids=[...select.options].map(o=>o.value);
  for(const id of ['solid_c','solid_u'])assert.equal(ids.includes(id),id===selected);
  for(const id of ['pso_coated_v3_fogra51','pso_uncoated_v3_fogra52','pso_fogra51_fogra52_common'])assert(ids.includes(id));
  assert.equal(select.value,selected);dom.window.close();console.log('PASS Hover Library visible selections and retained explicit default:',selected);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
