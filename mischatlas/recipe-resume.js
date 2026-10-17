/* Preview-only session bridge. Never executes engine code supplied by a document. */
(function(root){
 const R=root.ATLAS_MIXING_RECIPE;
 async function prepare(saved,engine,environment){
  if(!saved.replay)throw Error('Incomplete export: candidate palette, seed recipe or engine/environment are missing. Stored result only.');
  const p=structuredClone(saved.replay);
  if(await R.sha(new TextEncoder().encode(engine))!==p.environment.engine_sha256)throw Error('Engine SHA-256 differs. This engine cannot restore the saved calculation.');
  if(R.canon(p.job.kernels)!==R.canon(environment.kernels)||R.canon(p.environment.whitepoints)!==R.canon(environment.whitepoints))throw Error('Illuminant kernels or whitepoints differ. Saved calculation cannot be restored in this interface.');
  return p.job;
 }
 function compare(original,current,job,savedJob){
  const keys=['atlas_row_id','atlas_reference','reference_spectrum','recipe','model_spectrum','lights','search'];
  const differences=keys.filter(k=>R.canon(original[k])!==R.canon(current[k]));
  const deltas=original.lights.map(l=>{const n=current.lights.find(x=>x.name===l.name);return n?Math.abs(n.DE00-l.DE00):null;});
  return {status:differences.length?'DIFFERENT':'EXACT_NUMERICAL_MATCH',same_inputs:R.canon(job)===R.canon(savedJob),differences,max_abs_delta_DE00:deltas.some(x=>x===null)?null:Math.max(...deltas),comparison_note:'Exact numerical comparison; no tolerance applied. Different JavaScript runtimes can differ in the final floating-point digits even with the same engine source and inputs.',original_recipe:original.recipe,new_recipe:current.recipe,illuminants:original.lights.map(l=>{const n=current.lights.find(x=>x.name===l.name);return {name:l.name,original_DE00:l.DE00,new_DE00:n?.DE00??null,delta_DE00:n?n.DE00-l.DE00:null};}),physical_measurements:false};
 }
 root.ATLAS_RECIPE_RESUME={prepare,compare};
})(typeof window!=='undefined'?window:globalThis);
