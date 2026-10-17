/* Development preview: imported results never enter the numerical renderer. */
const MR=window.ATLAS_MIXING_RECIPE;
const mrContext={master:D.summary.master_sha256,colors:Object.fromEntries(D.rows.map(r=>[r.atlas_row_id,{id:r.atlas_row_id,ref:r.atlas_reference,hex:r.master_hex}])),rows:D.rows};
let mrSaved=null,mrJob=null,mrCompletedJob=null;
function mrCapture(job){mrJob=structuredClone(job);return job;}
const mrSection=document.createElement('section');
mrSection.innerHTML='<h2>Recipe return import · development preview</h2><p>Import a recipe JSON retrieved with “Download original file” from RC34 Tool Exchange. Stored results are displayed without recalculation. Model parts are not calibrated grams or drops; these are not physically validated pigment or print recipes.</p><label>Recipe JSON <input id="mr-file" type="file" accept=".json,application/json"></label><p id="mr-status" role="status"></p><button id="mr-export" disabled>Re-export imported file exactly</button><details><summary>Stored result, conditions and provenance</summary><pre id="mr-record" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details>';
document.querySelector('main').prepend(mrSection);
$('mr-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{
 if(f.size>MR.MAX_BYTES)throw Error('Recipe JSON exceeds 16 MiB.');
 const bytes=new Uint8Array(await f.arrayBuffer()),saved=await MR.inspect(bytes,mrContext);
 // Validate everything before replacing the previous imported record; stop any running search.
 lcStop('Imported stored result; no calculation started.');
 mrSaved={...saved,filename:f.name};$('mr-export').disabled=false;
 $('mr-record').textContent=JSON.stringify({reference:saved.reference,integrity:saved.integrity,limitations:saved.limitations,stored_document:saved.record,replay:saved.replay||null},null,2);
 $('mr-status').textContent='Recipe imported: '+saved.result.atlas_reference+' · '+saved.integrity+'. '+saved.limitations.join(' ');$('mr-status').dataset.error='false';
 }catch(err){$('mr-status').textContent='Import rejected: '+err.message+' Previous imported result retained.';$('mr-status').dataset.error='true';}};
$('mr-export').onclick=()=>{if(mrSaved)deliverDownload(mrSaved.filename,new Blob([mrSaved.bytes],{type:'application/json'}));};
$('lcExport').onclick=async()=>{try{
 if(!lcResult||lcResult.atlas_row_id!==D.rows[selected].atlas_row_id)return;
 const record={schema:MR.LIGHT,master_sha256:D.summary.master_sha256,physical_measurements:false,reflectance_interval_nm:[380,730,10],provenance:LC.provenance,result:lcResult};
 const replay=mrCompletedJob?{job:structuredClone(mrCompletedJob),environment:{engine_sha256:await MR.sha(new TextEncoder().encode(lcEngine)),whitepoints:LC.whitepoints,provenance:LC.provenance,physical_measurements:false}}:null;
 const bytes=await MR.seal(new TextEncoder().encode(JSON.stringify(record,null,2)),mrContext,replay);
 deliverDownload(record.result.atlas_reference+'_Recipe_Snapshot_preview.json',new Blob([bytes],{type:'application/json'}));
 }catch(err){$('mr-status').textContent='Export rejected: '+err.message;}};
