/* GPL-2.0-or-later. Immutable computational recipe records; no import-time calculation. */
(function(root){
 'use strict';
 const SCHEMA='atlas-mixing-recipe-snapshot/1.0',LIGHT='atlas-light-dependent-recipe-v1',MAX_BYTES=16*1024*1024;
 const need=(v,m)=>{if(!v)throw Error('Mixing recipe: '+m);};
 const canon=v=>JSON.stringify(v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(x=>JSON.parse(canon(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canon(v[k]))])));
 const utf8=s=>new TextEncoder().encode(s),sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const same=(a,b)=>canon(a)===canon(b),finite=x=>typeof x==='number'&&Number.isFinite(x),text=x=>typeof x==='string'&&x.length>0&&x.length<4096;
 const spectrum=s=>Array.isArray(s)&&s.length===36&&s.every(x=>finite(x)&&x>=0&&x<=1);
 const lab=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
 function parse(bytes){need(bytes instanceof Uint8Array&&bytes.length>0&&bytes.length<=MAX_BYTES,'Empty/oversized JSON.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''));}
 const base64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
 function unbase64(s){need(typeof s==='string'&&s.length<=MAX_BYTES*1.4&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s),'Invalid original bytes.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
 function legacy(d,ctx){
  need(d&&d.master_sha256===ctx.master,'Wrong or missing master checksum.');
  need(d.physical_measurements===false,'Computational record must explicitly state physical_measurements: false.');
  const light=d.schema===LIGHT,r=light?d.result:d.row;
  need(light||(!d.schema&&r&&Array.isArray(d.labels)&&Array.isArray(d.light_observations)&&d.method),'Unsupported recipe schema.');
  need(r&&Number.isInteger(r.atlas_row_id),'Missing reference ID.');
  const c=ctx.colors[r.atlas_row_id];need(c&&c.id===r.atlas_row_id&&c.ref===r.atlas_reference,'Unknown or conflicting master reference.');
  if(r.master_hex!==undefined)need(r.master_hex===c.hex,'Reference RGB conflicts with master.');
  need(spectrum(r.reference_spectrum)&&spectrum(r.model_spectrum),'Invalid stored spectrum.');
  if(ctx.rows){const original=ctx.rows.find(x=>x.atlas_row_id===r.atlas_row_id);need(original&&same(r.reference_spectrum,original.reference_spectrum),'Reference spectrum conflicts with frozen atlas.');}
  need(Array.isArray(r.recipe)&&r.recipe.length>0&&r.recipe.length<=4,'Invalid recipe components.');
  if(light){
   need(same(d.reflectance_interval_nm,[380,730,10])&&d.provenance&&typeof d.provenance==='object','Missing spectrum interval/provenance.');
   need(r.total_parts===100&&r.recipe.every(p=>Number.isInteger(p.index)&&p.index>=0&&text(p.id)&&text(p.name)&&Number.isInteger(p.parts)&&p.parts>0&&spectrum(p.reflectance))&&r.recipe.reduce((n,p)=>n+p.parts,0)===100,'Invalid model parts/components.');
   need(new Set(r.recipe.map(p=>p.index)).size===r.recipe.length,'Duplicate component index.');
   need(r.search&&r.search.physical_measurements===false&&r.search.global_optimum_proven===false&&Array.isArray(r.search.optimized_lights)&&r.search.optimized_lights.length>0,'Missing search conditions.');
   need(Array.isArray(r.lights)&&r.lights.length>0&&r.lights.length<=38&&new Set(r.lights.map(l=>l.name)).size===r.lights.length&&r.lights.every(l=>text(l.name)&&finite(l.DE00)&&l.DE00>=0&&lab(l.target_lab)&&lab(l.model_lab)),'Invalid stored light evaluations.');
   need(r.search.optimized_lights.every(n=>r.lights.some(l=>l.name===n)),'Unknown optimized illuminant.');
  }else{
   need(r.recipe.every(p=>Number.isInteger(p.source_index)&&p.source_index>=0&&finite(p.model_parts)&&p.model_parts>0&&finite(p.model_percent)),'Invalid legacy recipe.');
   need(Array.isArray(d.light_names)&&d.light_names.length===d.light_observations.length&&d.light_observations.every((l,i)=>l.light===d.light_names[i]&&lab(l.target_lab)&&lab(l.model_lab)),'Invalid legacy light observations.');
  }
  return {record:d,result:r,reference:c,mode:light?'LIGHT_RESULT':'LEGACY_ROW',limitations:['Stored computational result; no physical validation.','Legacy export has no independent pre-export digest: earlier edits cannot be detected.','Complete search inputs are absent; full search restoration is unavailable.']};
 }
 function replayCheck(replay,record){
  need(replay&&replay.job&&replay.environment,'Missing replay inputs.');const j=replay.job,r=record.result,e=replay.environment;
  need(same(j.target,{atlas_reference:r.atlas_reference,atlas_row_id:r.atlas_row_id,reference_spectrum:r.reference_spectrum}),'Replay target differs.');
  need(Array.isArray(j.samples)&&j.samples.length>0&&j.samples.length<=4096&&j.samples.every(s=>text(s.id)&&text(s.name)&&spectrum(s.R)),'Invalid complete search palette.');
  need(j.seed===r.search.seed&&j.poolSize===r.search.poolSize&&Number.isInteger(j.seed)&&Number.isInteger(j.poolSize)&&j.poolSize>=0&&j.poolSize<=1000000,'Replay search settings differ.');
  need(['D50','multi'].includes(j.objective)&&same(j.objective==='D50'?['D50']:j.lights,r.search.optimized_lights),'Replay objective/lights differ.');
  need(Array.isArray(j.lights)&&new Set(j.lights).size===j.lights.length&&j.lights.every(n=>Object.hasOwn(j.kernels,n)),'Invalid selected lights.');
  need(same(Object.keys(j.kernels).sort(),r.lights.map(l=>l.name).sort())&&Object.values(j.kernels).every(k=>Array.isArray(k)&&k.length===36&&k.every(lab)),'Incomplete illuminant kernels.');
  need(e.physical_measurements===false&&/^[a-f0-9]{64}$/.test(e.engine_sha256)&&e.provenance&&e.whitepoints&&Object.keys(j.kernels).every(n=>lab(e.whitepoints[n])),'Incomplete engine/provenance/whitepoints.');
  need(Array.isArray(j.seedRecipe)&&j.seedRecipe.every(p=>text(p.name)&&finite(p.parts)&&p.parts>=0),'Missing seed recipe.');
  for(const p of r.recipe){const s=j.samples[p.index];need(s&&s.id===p.id&&s.name===p.name&&same(s.R,p.reflectance),'Recipe differs from preserved search samples.');}
 }
 async function inspect(bytes,ctx){
  const d=parse(bytes);if(d.schema!==SCHEMA)return {...legacy(d,ctx),bytes:bytes.slice(),integrity:'LEGACY_UNSEALED'};
  need(d.master_sha256===ctx.master&&d.physical_measurements===false,'Wrong snapshot master/physical claim.');
  const original=unbase64(d.original?.bytes_base64);need(await sha(original)===d.original.sha256,'Original file SHA-256 mismatch.');
  const saved=parse(original),v=legacy(saved,ctx);
  need(same(saved,d.record)&&await sha(utf8(canon(d.record)))===d.record_sha256,'Stored recipe data differ from original.');
  need(await sha(utf8(canon(d.replay)))===d.replay_sha256,'Replay inputs SHA-256 mismatch.');
  if(d.replay!==null){need(saved.schema===LIGHT,'Replay only supported for light-dependent recipes.');replayCheck(d.replay,saved);}
  return {...v,bytes:bytes.slice(),originalBytes:original,replay:d.replay,integrity:'SHA256_CONSISTENT',limitations:d.replay===null?v.limitations:['Saved result restored without recalculation.','Complete search inputs retained; rerunning is a separate calculation.','Checksums prove consistency, not authenticity or physical validation.']};
 }
 async function seal(bytes,ctx,replay=null){
  const record=parse(bytes);legacy(record,ctx);if(replay!==null)replayCheck(replay,record);
  const d={schema:SCHEMA,master_sha256:ctx.master,physical_measurements:false,original:{sha256:await sha(bytes),bytes_base64:base64(bytes)},record,record_sha256:await sha(utf8(canon(record))),replay,replay_sha256:await sha(utf8(canon(replay)))};
  const out=utf8(JSON.stringify(d,null,2)+'\n');await inspect(out,ctx);return out;
 }
 root.ATLAS_MIXING_RECIPE={SCHEMA,LIGHT,MAX_BYTES,inspect,seal,sha,canon};
})(typeof window==='undefined'?globalThis:window);
