/* SPDX-License-Identifier: MIT */
(async()=>{'use strict';
 const data=JSON.parse(document.getElementById('atlas-data').textContent),$=id=>document.getElementById(id),num=(n,d=1)=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:d,minimumFractionDigits:d});
 let cloth,renderer,running=true,original=data.original,reference=data.reference,evidence=data.referenceEvidence,referenceProvenance=data.referenceProvenance,originalHash,referenceHash,frameTime=null,accumulator=0,lastStatus=0,modelDirty=false;
 const materials=data.materials.materials;
 const error=message=>{$('error').textContent=message;$('error').style.display=message?'block':'none';};
 const hashes=async bytes=>{if(!crypto.subtle)return AtlasSHA256(bytes);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');};
 const bytes=dataUrl=>{const b=atob(dataUrl.split(',')[1]);return Uint8Array.from(b,c=>c.charCodeAt(0));};
 const hashImage=url=>hashes(bytes(url));
 const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));r.readAsDataURL(file);});
 const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{if(i.naturalWidth*i.naturalHeight>32000000)reject(Error('Das Bild darf höchstens 32 Megapixel haben.'));else resolve(i);};i.onerror=()=>reject(Error('Bild kann nicht decodiert werden.'));i.src=src;});
 const save=(name,blob)=>{const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
 const downloadImage=(name,url)=>save(name,new Blob([bytes(url)],{type:url.slice(5,url.indexOf(';'))}));
 const busy=state=>{for(const id of ['pause','reset','downloadProject','downloadOriginal'])$(id).disabled=state;$('downloadReference').disabled=state||!reference;};
 for(const m of materials){const o=document.createElement('option');o.value=m.id;o.textContent=m.label;$('material').append(o);}
 const selected=()=>materials.find(m=>m.id===$('material').value);
 function settings(){return {material:$('material').value,bend:Number($('bend').value),stretch:Number($('stretch').value),wind:Number($('wind').value),pins:$('pins').value,width:Number($('width').value),height:Number($('height').value),texture:$('texture').value,lighting:$('lighting').checked};}
 function rebuild(){
  const s=settings(),m=selected();cloth=new AtlasCloth.Cloth({width:s.width/100,height:s.height/100,gsm:m.gsm,nx:renderer.kind?14:28,ny:renderer.kind?18:34,warp:m.warp_compliance*s.stretch,weft:m.weft_compliance*s.stretch,shear:m.shear_compliance*s.stretch,bend:m.bend_compliance/s.bend,pins:s.pins});
  accumulator=0;frameTime=null;modelDirty=true;$('gsm').textContent=num(m.gsm);$('mass').textContent=num(cloth.totalMass*1000);$('sampleInfo').textContent=`${m.fabric_count} Referenzstoff${m.fabric_count===1?'':'e'} · ${m.sample_count} Messung${m.sample_count===1?'':'en'} · Biegeindex ${num(m.bending_index_vs_silk*s.bend,2)} × Seide`;
  $('stretchValue').textContent=num(s.stretch,2)+' ×';$('windValue').textContent=num(s.wind,2)+' N/m²';$('widthValue').textContent=s.width+' cm';$('heightValue').textContent=s.height+' cm';
  $('materialEvidence').textContent=`MIT-Proben ${m.fabric_ids.join(', ')}. Beobachtete Flächengewichte der Stoffmittel: ${num(m.observed_gsm_range[0])}–${num(m.observed_gsm_range[1])} g/m². Biegesteifigkeit der Prüfstreifen: ${num(m.bending_strip_EI_lbf_in2,5)} lbf·in². Keine Streifenbreite zur Umrechnung in eine Flächensteifigkeit belegt.`;
 }
 let textureVersion=0;
 async function updateTexture(){const version=++textureVersion;const useRef=$('texture').value==='reference'&&reference;const i=await image(useRef?reference:original);if(version!==textureVersion)return;renderer.setImage(i);$('stageLabel').textContent=useRef?'Pfauenfeder · vorhandene ATLAS-Referenzfassung':'Ausgangsdatei · keine neue Farbzuordnung';modelDirty=true;}
 function updateProvenance(){
  $('originalThumb').src=original;$('sourceStatus').textContent=`SHA-256 ${originalHash.slice(0,16)}… · ${reference?'Referenzfassung vorhanden':'keine ATLAS-Zuordnung'}`;
  $('texture').options[0].disabled=!reference;$('downloadReference').disabled=!reference;
 }
 async function exportProject(){
  const project={schema:'atlas-cloth-preview-v1',version:'0.1.0',original:{data_url:original,sha256:originalHash},reference:reference?{data_url:reference,sha256:referenceHash,evidence,provenance:referenceProvenance}:null,settings:settings(),material_source:data.materials,physical_validation:'NOT_VALIDATED',production_approval:false,simulation_state:'restart_from_settings'};
  save('ATLAS-Clarus-Stoffvorschau.json',new Blob([JSON.stringify(project)],{type:'application/json'}));
 }
 function validateSettings(s){
  if(!s||!materials.some(m=>m.id===s.material)||![.5,1,2].includes(s.bend)||!['gathered','corners','edge'].includes(s.pins)||!['reference','original'].includes(s.texture)||typeof s.lighting!=='boolean')throw Error('Ungültige Modellvorgaben.');
  for(const [key,min,max,step] of [['width',50,150,5],['height',70,160,5],['wind',0,1.5,.05],['stretch',.25,4,.25]])if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max||Math.abs((s[key]-min)/step-Math.round((s[key]-min)/step))>1e-7)throw Error('Ungültiger Parameter: '+key);
 }
 function validImageUrl(url){return typeof url==='string'&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)&&url.length<24000000;}
 async function importProject(file){
  if(file.size>55000000)throw Error('Projekt ist größer als 55 MB.');const project=JSON.parse(await file.text());
  if(project.schema!=='atlas-cloth-preview-v1')throw Error('Unbekanntes Projektformat.');validateSettings(project.settings);
  if(!validImageUrl(project.original?.data_url))throw Error('Ungültiges Ausgangsbild.');
  // Validate everything before mutating the open project.
  const o=project.original.data_url,oh=await hashImage(o);if(oh!==project.original.sha256)throw Error('Prüfsumme des Ausgangsbildes stimmt nicht.');await image(o);
  let r=null,rh=null;if(project.reference){r=project.reference.data_url;if(!validImageUrl(r))throw Error('Ungültiges Referenzbild.');rh=await hashImage(r);if(rh!==project.reference.sha256)throw Error('Prüfsumme der Referenz stimmt nicht.');await image(r);}
  if(project.settings.texture==='reference'&&!r)throw Error('Die ausgewählte Referenzfassung fehlt.');
  if(JSON.stringify(project.material_source)!==JSON.stringify(data.materials))throw Error('Die Materialquellen passen nicht zu dieser Vorschauversion.');
  original=o;originalHash=oh;reference=r;referenceHash=rh;evidence=project.reference?.evidence??null;referenceProvenance=project.reference?.provenance??null;
  for(const key of ['material','bend','stretch','wind','pins','width','height','texture'])$(key).value=String(project.settings[key]);$('lighting').checked=project.settings.lighting;
  updateProvenance();rebuild();await updateTexture();
 }
 try{
  renderer=new AtlasClothRenderer($('canvas'));originalHash=await hashImage(original);referenceHash=await hashImage(reference);
  if(originalHash!==data.originalSha256||referenceHash!==data.referenceSha256)throw Error('Die eingebetteten Bildprüfsummen stimmen nicht.');
  updateProvenance();rebuild();await updateTexture();busy(false);$('loading').style.display='none';
  for(const id of ['material','bend','stretch','pins','width','height'])$(id).addEventListener('input',rebuild);
  $('wind').addEventListener('input',()=>{$('windValue').textContent=num(Number($('wind').value),2)+' N/m²';});
  $('texture').addEventListener('change',()=>updateTexture().catch(e=>error(e.message)));$('lighting').addEventListener('change',()=>modelDirty=true);
  $('pause').addEventListener('click',()=>{running=!running;$('pause').textContent=running?'Pause':'Weiter';frameTime=null;accumulator=0;modelDirty=true;});
  $('reset').addEventListener('click',rebuild);$('downloadProject').addEventListener('click',()=>exportProject().catch(e=>error(e.message)));
  $('downloadOriginal').addEventListener('click',()=>downloadImage('ATLAS-Clarus-Ausgangsbild.'+(original.startsWith('data:image/png')?'png':'jpg'),original));
  $('downloadReference').addEventListener('click',()=>{if(reference)downloadImage('ATLAS-Clarus-Referenz.png',reference);});
  $('uploadImage').addEventListener('click',()=>$('imageFile').click());$('openProject').addEventListener('click',()=>$('projectFile').click());
  $('imageFile').addEventListener('change',async()=>{try{const f=$('imageFile').files[0];if(!f)return;if(f.size>16000000)throw Error('Bild ist größer als 16 MB.');const url=await readFile(f);if(!validImageUrl(url))throw Error('Bitte PNG oder JPEG verwenden.');await image(url);const hash=await hashImage(url);original=url;originalHash=hash;reference=null;referenceHash=null;evidence=null;referenceProvenance=null;$('texture').value='original';updateProvenance();await updateTexture();error('');}catch(e){error(e.message);}finally{$('imageFile').value='';}});
  $('projectFile').addEventListener('change',async()=>{const f=$('projectFile').files[0];if(!f)return;busy(true);try{await importProject(f);error('');}catch(e){error(e.message);}finally{busy(false);$('projectFile').value='';}});
  window.addEventListener('resize',()=>modelDirty=true);document.addEventListener('visibilitychange',()=>{frameTime=null;accumulator=0;});
  $('canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;error('Die 3D-Grafikverbindung wurde unterbrochen. Bitte die Seite neu laden.');});
  function frame(now){try{
   const elapsed=frameTime===null?0:Math.min((now-frameTime)/1000,.04);frameTime=now;
   if(running&&!document.hidden){accumulator+=elapsed;let count=0;while(accumulator>=1/120&&count<5){cloth.step(1/120,{wind:Number($('wind').value)});accumulator-=1/120;count++;}if(count===5)accumulator=0;}
   // Redraw paused states as camera interaction is independent of simulation time.
   renderer.render(cloth,$('lighting').checked);modelDirty=false;
   if(now-lastStatus>500){$('motionStatus').textContent=running?`Simulation · ${num(cloth.time,1)} s`:'Pausiert';lastStatus=now;}
   requestAnimationFrame(frame);
  }catch(e){error('Simulation gestoppt: '+e.message);running=false;}}
  requestAnimationFrame(frame);
  // Read-only diagnostics for automated numerical/identity checks, no UI data mutations.
  Object.defineProperty(window,'atlasClothDiagnostics',{get:()=>({time:cloth.time,mass:cloth.totalMass,maxStretch:cloth.maxStretch(),finite:Array.from(cloth.position).every(Number.isFinite),originalHash,referenceHash,referencePresent:!!reference,settings:settings()})});
 }catch(e){error(e.message);$('loading').style.display='none';busy(true);}
})();
