/* State/permission tests with synthetic camera frames; not device or image-decoder acceptance. */
'use strict';
const {JSDOM}=require('../browser-bundle/tests/node_modules/jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../hover-library/data/colors.json')));data.views=JSON.parse(fs.readFileSync(path.join(__dirname,'../hover-library/data/views.json'))).views;
const dom=new JSDOM('<!doctype html><head></head><body><label><input id="picker-file" type="file" accept="image/png,image/jpeg"></label><input id="json" type="file" accept="application/json"><select id="library-view"><option value="core">Core</option></select>',{url:'https://appassets.androidplatform.net/index.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.AndroidExport={};w.ATLAS_CLARUS_DATA=data;w.Blob=Blob;w.File=File;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
w.scene=[80,100,120];let stopped=0,deny=false,defer=false,release,requestedTorch;
Object.defineProperties(w.HTMLVideoElement.prototype,{videoWidth:{get:()=>640},videoHeight:{get:()=>480},readyState:{get:()=>4}});w.HTMLVideoElement.prototype.play=async()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){const canvas=this;return {drawImage(source){canvas.rgb=[...(source.rgb||w.scene)];},getImageData(x,y,width,height){return {data:Uint8ClampedArray.from(Array.from({length:width*height},()=>[...(canvas.rgb||w.scene),255]).flat())};}};};
w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new Blob([JSON.stringify(this.rgb)],{type:'image/png'}));};
w.DataTransfer=class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)};}};
const input=w.document.getElementById('picker-file');Object.defineProperty(input,'files',{writable:true,value:[]});let applied=null,record=null;input.onchange=()=>{applied=input.files[0];};input.addEventListener('atlas-camera-selection',e=>{record=e.detail;});
Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>{if(deny)throw Error('Denied');const track={stop(){stopped++;},getCapabilities:()=>({torch:true}),getSettings:()=>({torch:!!requestedTorch}),applyConstraints:async c=>{requestedTorch=c.advanced[0].torch;}};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};if(defer)await new Promise(resolve=>release=resolve);return stream;}}});
for(const name of ['live-camera-core.js','live-camera.js'])w.eval(fs.readFileSync(path.join(__dirname,name),'utf8'));
const $=s=>w.document.querySelector(s),wait=()=>new Promise(r=>setTimeout(r,30));
(async()=>{try{
 assert.equal(w.document.querySelectorAll('.atlas-live-button').length,1);
 await w.ATLAS_LIVE_CAMERA.open(input);assert.match($('output').textContent,/#506478/);
 $('[data-lock]').click();const fixed=$('output').textContent;w.scene=[200,30,40];await new Promise(r=>setTimeout(r,300));assert.equal($('output').textContent,fixed);
 $('[data-use]').click();await wait();assert.equal(record.source_hex,'#506478');assert.equal(await applied.text(),'[80,100,120]');assert.ok(stopped);assert.equal(w.ATLAS_LIVE_CAMERA.isOpen(),false);
 await w.ATLAS_LIVE_CAMERA.open(input);$('[data-lock]').click();$('[data-torch]').click();await wait();assert.equal(requestedTorch,true);assert.equal($('[data-use]').disabled,true);$('[data-lock]').click();$('[data-use]').click();await wait();assert.equal(record.lamp_on,true);
 deny=true;await w.ATLAS_LIVE_CAMERA.open(input);assert.match($('output').textContent,/denied/);assert.equal($('[data-lock]').disabled,true);w.ATLAS_LIVE_CAMERA.close();deny=false;
 defer=true;const opening=w.ATLAS_LIVE_CAMERA.open(input);await wait();w.ATLAS_LIVE_CAMERA.close();const before=stopped;release();await opening;assert.equal(stopped,before+1);
 console.log('PASS: synthetic live/fixed state, identical fixed frame handoff, torch invalidates lock, denied permission, close during permission request stops late stream');
}finally{w.ATLAS_LIVE_CAMERA.close();dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
