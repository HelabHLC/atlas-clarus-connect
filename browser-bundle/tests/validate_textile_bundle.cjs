'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto'),{JSDOM,VirtualConsole}=require('jsdom');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const html=fs.readFileSync((process.env.TEXTILE_BUNDLE_DIR || 'browser-bundle/build-textile-preview/atlas-clarus-browser-bundle')+'/index.html','utf8');
const dom=new JSDOM(html,{url:'https://offline.test/#print',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.scrollTo=()=>{};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 const ctx=new Proxy({},{get:(t,k)=>k==='createImageData'?((width,height)=>({data:new Uint8ClampedArray(width*height*4)})):k==='createRadialGradient'||k==='createLinearGradient'?(()=>({addColorStop(){}})):k==='measureText'?(()=>({width:10})):k==='getImageData'?(()=>({data:new Uint8ClampedArray(4)})):t[k]||(()=>{})});
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
}});
setTimeout(()=>{try{
 assert.equal(errors.length,0,errors.join('\n'));
 const d=dom.window.document;assert.equal(d.querySelectorAll('[data-print-path]').length,3);assert.equal(d.querySelector('#print-export').disabled,false);assert.match(d.querySelector('#print-count').textContent,/1 frozen reference/);
 assert.match(d.querySelector('[data-print-path="TEXTILE_RGB"] [data-path-status]').textContent,/Attach the official/);
 console.log('PASS: complete generated offline HTML initializes all scripts and Print UI without runtime errors (jsdom; canvas stubbed, no visual/device acceptance)');
 }catch(e){console.error(e);process.exitCode=1}finally{dom.window.close()}},200);
