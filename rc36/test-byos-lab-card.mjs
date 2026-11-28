import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('./byos-lab-card.js',import.meta.url),'utf8'),context);
const de=context.ATLAS_RC36_LAB_CARD.de00;
const cases=[
 [[50,2.6772,-79.7751],[50,0,-82.7485],2.0425],
 [[50,3.1571,-77.2803],[50,0,-82.7485],2.8615],
 [[50,2.8361,-74.0200],[50,0,-82.7485],3.4412],
 [[50,-1.3802,-84.2814],[50,0,-82.7485],1],
 [[50,-1.1848,-84.8006],[50,0,-82.7485],1],
 [[50,-.9009,-85.5211],[50,0,-82.7485],1],
 [[50,0,0],[50,-1,2],2.3669]
];
test('CIEDE2000 reference pairs, symmetry and zero',()=>{
 for(const [a,b,v] of cases){
  assert.ok(Math.abs(de(a,b)-v)<=.0001);assert.ok(Math.abs(de(b,a)-v)<=.0001);assert.equal(de(a,a),0);
 }
});
test('no profile: fail closed before worker',async()=>{
 context.ATLAS_RC36_BYOS={selected:()=>null};
 await assert.rejects(context.ATLAS_RC36_LAB_CARD.calculate({},'Relative colorimetric','paper'),/Select a local CMYK/);
});
test('no substrate: fail closed before worker',async()=>{
 context.ATLAS_RC36_BYOS={selected:()=>({deviceSpace:'CMYK'})};
 await assert.rejects(context.ATLAS_RC36_LAB_CARD.calculate({},'Relative colorimetric',''),/substrate/);
});

test('absolute and other intents are blocked before profile lookup or worker',async()=>{
 context.ATLAS_RC36_BYOS={selected:()=>{throw Error('Profile lookup must not run')}};
 for(const intent of ['Absolute colorimetric','Perceptual','Saturation',null])await assert.rejects(context.ATLAS_RC36_LAB_CARD.calculate({},intent,'paper'),/Only relative colorimetric/);
});
test('worker rejects absolute and BPC on before profile validation or engine',async()=>{
 const w=vm.createContext({});vm.runInContext(readFileSync(new URL('./byos-lab-worker.js',import.meta.url),'utf8'),w);
 for(const [intent,bpc] of [['Absolute colorimetric',false],['Relative colorimetric',true]])await assert.rejects(w.ATLAS_RC36_LAB_ROUNDTRIP({lab:[50,0,0],intent,bpc}),/Only relative colorimetric/);
});
