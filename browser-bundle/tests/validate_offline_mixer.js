'use strict';
const assert=require('node:assert/strict');
const mixer=require('../src/atlas-offline-mixer.js');
const black=Array(31).fill(.1),white=Array(31).fill(.9);
const basis=(id,r,marker,source)=>({id,name:id,ks:r.map(x=>(1-x)**2/(2*x)),opacity_marker:marker,opacity_source:source});
const data={atlas:new Map([['H000_L050_C000',Array(31).fill(.5)]]),bases:[basis('BLACK',black,'TRANSPARENT','test fixture'),basis('WHITE',white,'OPAQUE','test fixture')]};
const result=mixer.solve(data,'H000_L050_C000');
assert.equal(result.reference,'H000_L050_C000');
assert.equal(result.opacity_status,'NOT_VERIFIED');
assert.equal(result.measured_qc_status,'NOT_MEASURED');
assert.equal(result.selection_metric,'SPECTRAL_RMSE_HEURISTIC');
assert(result.recipe.every(p=>p.opacity_marker===data.bases.find(b=>b.id===p.basis_id).opacity_marker));
assert(result.recipe.every(p=>p.opacity_source==='test fixture'));
assert(result.rmse < .1);
assert(Math.abs(result.recipe.reduce((s,p)=>s+p.fraction,0)-1)<1e-9);
assert.throws(()=>mixer.solve(data,'H001_L050_C000'),/missing/);
assert(Math.abs(mixer.lab(Array(31).fill(.5))[0]-76.06926101415557)<1e-9);
const withWhite={atlas:data.atlas,bases:[...data.bases,basis('CHSOS_GORGIAS_PW_6_ANATASE',white,'UNKNOWN',null)]};
for(const whiteFraction of [.05,.10]){
  const trial=mixer.solve(withWhite,'H000_L050_C000',{whiteFraction});
  assert.equal(trial.recipe.at(-1).basis_id,'CHSOS_GORGIAS_PW_6_ANATASE');
  assert.equal(trial.recipe.at(-1).fraction,whiteFraction);
  assert.equal(trial.recipe.at(-1).opacity_marker,'UNKNOWN');
  assert(Math.abs(trial.recipe.reduce((s,p)=>s+p.fraction,0)-1)<1e-9);
}
assert.throws(()=>mixer.solve(data,'H000_L050_C000',{whiteFraction:.05}),/white missing/);
console.log('offline mixer: PASS');
