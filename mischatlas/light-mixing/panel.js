const LC=JSON.parse($('lightMixData').textContent),lcEngine=JSON.parse($('lightMixEngine').textContent);
const lcFunctions=new Function(lcEngine+';return {labFromR,de00};')();
let lcWorker=null,lcJob=0,lcResult=null;
function lcChosen(){return [...document.querySelectorAll('#lcLights input:checked')].map(x=>x.value);}
function lcStop(message){if(lcWorker){lcWorker.terminate();lcWorker=null;lcJob++;if(message)$('lcProgress').textContent=message;}$('lcCancel').disabled=true;$('lcSearch').disabled=false;}
function lcReset(){lcStop('Calculation cancelled because the reference changed.');lcResult=null;$('lcRecipe').innerHTML='';$('lcExport').disabled=true;lcRender();}
LC.lights.forEach(name=>{const label=document.createElement('label');label.style.cssText='flex-direction:row;align-items:center;gap:6px';const c=document.createElement('input');c.type='checkbox';c.value=name;c.checked=['D50','D65','FL11','LED-B3'].includes(name);label.append(c,document.createTextNode(name));$('lcLights').append(label);c.onchange=()=>{lcStop('Light selection changed. Start a new search to optimize for these lights.');lcRender();};});
function lcSet(names){document.querySelectorAll('#lcLights input').forEach(c=>c.checked=names.includes(c.value));lcStop('Light selection changed. Start a new search to optimize for these lights.');lcRender();}
$('lcStarter').onclick=()=>lcSet(['D50','D65','FL11','LED-B3']);$('lcAll').onclick=()=>lcSet(LC.lights);$('lcNone').onclick=()=>lcSet([]);
$('lcCancel').onclick=()=>lcStop('Search cancelled. The existing recipe and reference are unchanged.');
for(const id of ['lcPalette','lcObjective','lcBudget'])$(id).onchange=()=>lcStop('Search settings changed. Start a new calculation.');
function lcScreen(R){
 const z=[0,0,0],k=LC.kernels.D65;for(let i=0;i<36;i++)for(let j=0;j<3;j++)z[j]+=R[i]*k[i][j]*LC.whitepoints.D65[j];
 const [x,y,b]=z,v=[3.2404542*x-1.5371385*y-.4985314*b,-.969266*x+1.8760108*y+.041556*b,.0556434*x-.2040259*y+1.0572252*b];
 const clipped=v.some(t=>t<0||t>1);return {color:'rgb('+v.map(t=>{t=Math.min(1,Math.max(0,t));return Math.round(255*(t<=.0031308?12.92*t:1.055*t**(1/2.4)-.055));}).join(',')+')',clipped};
}
function lcRender(){
 const r=D.rows[selected],chosen=lcChosen(),fresh=lcResult&&lcResult.atlas_row_id===r.atlas_row_id;
 $('lcTarget').textContent=r.atlas_reference+' · '+r.master_hex+' · atlas_row_id '+r.atlas_row_id+' · fixed master reference';
 const observe=R=>Object.fromEntries(LC.lights.map(n=>[n,lcFunctions.de00(lcFunctions.labFromR(r.reference_spectrum,LC.kernels[n]),lcFunctions.labFromR(R,LC.kernels[n]))]));
 const old=observe(r.model_spectrum),neo=fresh?observe(lcResult.model_spectrum):null;
 $('lcTable').innerHTML=LC.lights.map(n=>'<tr><td>'+escape(n)+'</td><td>'+(chosen.includes(n)?'✓':'—')+'</td><td>'+fmt(old[n])+'</td><td>'+(neo?fmt(neo[n]):'—')+'</td></tr>').join('');
 const lights=chosen.length?chosen:LC.lights;const oldWorst=Math.max(...lights.map(n=>old[n])),newWorst=neo?Math.max(...lights.map(n=>neo[n])):null;
 $('lcMaximum').textContent='Largest ΔE00 across '+(chosen.length?'the '+chosen.length+' selected lights':'all 38 lights (none selected)')+': existing '+fmt(oldWorst)+(neo?' · new '+fmt(newWorst):'')+'. Existing and new recipes may use different palettes.';
 const curves=[['Fixed reference',r.reference_spectrum],['Existing recipe',r.model_spectrum],...(fresh?[['New light-dependent recipe',lcResult.model_spectrum]]:[])];
 $('lcSwatches').innerHTML=curves.map(([name,R])=>{const s=lcScreen(R);return '<div><div style="height:105px;background:'+s.color+'"></div><p>'+name+(s.clipped?' · clipped to sRGB':'')+'</p></div>';}).join('');
 if(fresh){$('lcRecipe').innerHTML='<h3>New recipe · '+escape(lcResult.palette_name)+'</h3><p>Optimized for '+escape(lcResult.search.optimized_lights.join(', '))+' · '+escape(lcResult.search.objective)+'.</p><table class="recipe"><tr><th>Base colour</th><th>Model parts / %</th></tr>'+lcResult.recipe.map(p=>'<tr><td>'+escape(p.name)+'</td><td>'+p.parts+'</td></tr>').join('')+'</table><p>100 model parts · '+lcResult.recipe.length+' components · '+lcResult.search.evaluations.toLocaleString('en-GB')+' candidate evaluations. A global optimum has not been proven.</p>';$('lcExport').disabled=false;}
}
function lcStart(){
 lcStop();const r=D.rows[selected],lights=lcChosen(),objective=$('lcObjective').value;
 if(objective==='multi'&&!lights.length){$('lcProgress').textContent='Choose at least one illuminant.';return;}
 const imported=$('lcPalette').value==='import';if(imported&&!userPalette){$('lcProgress').textContent='Import your spectral palette in the original palette-import section below first.';return;}
 const samples=imported?userPalette.samples:LC.samples,paletteName=imported?userPalette.name:'Golden Heavy Body · available 31-sample subset';
 const materialSystem=imported?userPalette.material_system:'Golden Heavy Body Acrylic',paletteWarnings=imported?[...userPalette.warnings]:['Source file does not fully document substrate, geometry, binder, film thickness or drying. Same-series product names are not proof of calibrated material compatibility.'];
 const url=URL.createObjectURL(new Blob([lcEngine],{type:'text/javascript'}));try{lcWorker=new Worker(url);}catch(e){URL.revokeObjectURL(url);$('lcProgress').textContent='Cannot start the local calculation: '+e.message;return;}URL.revokeObjectURL(url);
 const job=++lcJob,referenceId=r.atlas_row_id;$('lcSearch').disabled=true;$('lcCancel').disabled=false;$('lcProgress').textContent='Searching locally for '+r.atlas_reference+' …';
 lcWorker.onmessage=e=>{if(job!==lcJob||D.rows[selected].atlas_row_id!==referenceId)return;const m=e.data;
  if(m.type==='progress')$('lcProgress').textContent=(m.stage==='pool'?'Candidate search '+m.done+' / '+m.total:'Integer refinement '+m.done+' / '+m.total)+' · best objective ΔE00 '+fmt(m.best);
  else if(m.type==='done'){lcResult={...m.result,palette_name:paletteName,palette_material_system:materialSystem,palette_warnings:paletteWarnings};lcStop();$('lcProgress').textContent='Recipe calculated for '+lcResult.search.optimized_lights.length+' illuminant(s). Compare its errors below.';lcRender();}
  else if(m.type==='error'){lcStop();$('lcProgress').textContent='Calculation failed: '+m.message;}
 };
 lcWorker.onerror=e=>{if(job!==lcJob)return;lcStop();$('lcProgress').textContent='Calculation failed: '+e.message;};
 lcWorker.postMessage({samples,target:{atlas_reference:r.atlas_reference,atlas_row_id:r.atlas_row_id,reference_spectrum:r.reference_spectrum},kernels:LC.kernels,lights,objective,poolSize:Number($('lcBudget').value),seed:42,seedRecipe:r.recipe.map(p=>({name:D.labels[p.source_index],parts:p.model_parts}))});
}
$('lcSearch').onclick=lcStart;
$('lcExport').onclick=()=>{if(!lcResult||lcResult.atlas_row_id!==D.rows[selected].atlas_row_id)return;download(lcResult.atlas_reference+'_LightDependent_Recipe_38SPD_v01.json',{schema:'atlas-light-dependent-recipe-v1',master_sha256:D.summary.master_sha256,physical_measurements:false,reflectance_interval_nm:[380,730,10],provenance:LC.provenance,result:lcResult});};
// The existing Atlas selection drives both the original mixer and the new light-dependent search.
const lcOriginalDetail=renderDetail;renderDetail=function(){lcOriginalDetail();lcReset();};
$('lcProvenance').textContent=JSON.stringify(LC.provenance,null,2);lcRender();

$('paletteFile').addEventListener('change',()=>lcStop('Palette import changed. Start a new light-dependent search.'));
$('removePalette').addEventListener('click',()=>lcStop('Imported palette removed.'));

const lcOriginalUser=renderUser;renderUser=function(){const previous=selected;lcOriginalUser();if(selected!==previous)lcReset();else lcRender();};$('userResult').onchange=renderUser;
