(function(root){
 'use strict';
 const K=root.ATLAS_STARTUP_CORE,D=root.ATLAS_COLOUR_ADVICE,A=root.ATLAS_LIBRARY_ACCEPTANCE;
 const SCHEMA='ATLAS_MULTI_APPLICATION_V1',METHOD='SRGB8_TO_LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1',MAX_ZIP=192*1024*1024;
 const need=(ok,msg)=>{if(!ok)throw Error(msg);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),clone=x=>JSON.parse(JSON.stringify(x)),utf=s=>new TextEncoder().encode(s),decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
 const asLab=(array,i)=>Array.from(array.slice(i*3,i*3+3)),contexts=new WeakMap();
 function defaults(master){return {schema:SCHEMA,master_sha256:master,tolerances:{source:null,output:null,pair:null},targets:[],choices:[]};}
 function target(id,name){return {id,name,material:'',process:'',profile_sha256:null,profile_name:'',library_mode:'catalog',library_id:'',channel_order:[],condition_confirmed:false};}
 function validate(doc,ctx){
  need(doc?.schema===SCHEMA&&doc.master_sha256===ctx.master,'Unknown multi-application project.');
  need(doc.tolerances&&['source','output','pair'].every(k=>doc.tolerances[k]===null||D.validTolerance(doc.tolerances[k])),'Invalid tolerances.');
  need(Array.isArray(doc.targets)&&doc.targets.length<=8&&new Set(doc.targets.map(t=>t.id)).size===doc.targets.length,'Choose up to eight distinct applications.');
  for(const t of doc.targets){need(/^application-[0-9]+$/.test(t.id)&&['name','material','process','profile_name','library_id'].every(k=>typeof t[k]==='string'&&t[k].length<=255&&!/[\x00-\x1f]/.test(t[k])),'Invalid application details.');need(t.profile_sha256===null||/^[a-f0-9]{64}$/.test(t.profile_sha256),'Invalid ICC identity.');need(['catalog','profile'].includes(t.library_mode)&&typeof t.condition_confirmed==='boolean','Invalid profile conditions.');need(Array.isArray(t.channel_order)&&t.channel_order.length<=7&&t.channel_order.every(s=>typeof s==='string'&&/^[A-Za-z0-9 _-]{1,24}$/.test(s)),'Invalid ink channel names.');}
  need(Array.isArray(doc.choices)&&doc.choices.length<=12&&Array.from(doc.choices).every(c=>c===null||Number.isInteger(c)&&ctx.colors.some(r=>r.id===c)),'Invalid common references.');return doc;
 }
 async function profile(bytes,name,catalog){
  need(bytes instanceof Uint8Array&&bytes.length>=132&&bytes.length<=16777216,'Choose an ICC file up to 16 MiB.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),sig=i=>String.fromCharCode(...bytes.slice(i,i+4));
  need(v.getUint32(0)===bytes.length&&sig(36)==='acsp'&&sig(12)==='prtr'&&[2,4].includes(bytes[8])&&v.getUint32(64)<4&&['Lab ','XYZ '].includes(sig(20)),'A valid ICC v2/v4 printer profile is required.');
  const channels={'RGB ':3,CMYK:4,'7CLR':7}[sig(16)];need(channels,'Supported printer spaces: RGB, CMYK or seven channels.');
  const count=v.getUint32(128),tags=new Set();need(count>0&&count<=Math.floor((bytes.length-132)/12),'Invalid ICC tag table.');
  for(let i=0;i<count;i++){const p=132+i*12,key=sig(p),offset=v.getUint32(p+4),length=v.getUint32(p+8);need(!tags.has(key)&&offset%4===0&&offset>=132+count*12&&length>=8&&offset+length<=bytes.length,'Invalid ICC tag bounds.');tags.add(key);}
  need(tags.has('A2B1')&&tags.has('B2A1'),'Both colorimetric A2B1 and B2A1 tables are required; perceptual-only profiles are not used for this comparison.');
  const sha256=await K.sha(bytes),entry=Object.values(catalog?.profiles||{}).find(p=>p.sha256===sha256);
  need(!entry?.beta&&!/Austausch|exchange/i.test(entry?.role_label||'')&&!/FOGRA58/i.test(entry?.file_name||''),'An exchange/beta profile does not characterize the actual production material.');
  return {name,bytes,info:{sha256,channels,device_space:sig(16),catalog_id:entry?.id||null}};
 }
 function settingsKey(doc,source){return JSON.stringify({master:doc.master_sha256,source:source.doc.colours,tolerances:doc.tolerances,targets:doc.targets});}
 function pending(doc,source,bank,ctx){
  validate(doc,ctx);const out=[];
  if(!source?.doc?.colours?.length)out.push('SOURCE');
  if(doc.targets.length<2)out.push('TARGETS');
  for(const k of ['source','output','pair'])if(!D.validTolerance(doc.tolerances[k]))out.push('TOLERANCE_'+k.toUpperCase());
  for(const t of doc.targets){const p=bank.get(t.profile_sha256);if(!t.name.trim()||!t.material.trim()||!t.process.trim()||!t.condition_confirmed)out.push(t.id+':CONDITIONS');if(!p){out.push(t.id+':ICC');continue;}
   if(p.info.channels===7&&(t.channel_order.length!==7||new Set(t.channel_order.map(s=>s.toUpperCase())).size!==7))out.push(t.id+':CHANNELS');
   if(t.library_mode==='catalog'&&(!D.members(ctx,t.library_id)||!A.choices(ctx,p.info).some(([id])=>id===t.library_id)))out.push(t.id+':LIBRARY');
  }return out;
 }
 function inputs(source,ctx){return new Uint8Array([...ctx.colors.flatMap(c=>c.rgb),...source.doc.colours.flatMap(c=>c.source_rgb)]);}
 function analyze(doc,source,bank,ctx,outputs){
  need(!pending(doc,source,bank,ctx).length,'Complete applications, profiles, library basis and all three tolerances.');
  const n=ctx.colors.length,m=source.doc.colours.length,rows=doc.targets.map(t=>outputs.get(t.profile_sha256));
  need(rows.every((r,i)=>r?.method===METHOD&&r.channels===bank.get(doc.targets[i].profile_sha256).info.channels&&r.input_lab.length===(n+m)*3&&r.output_lab.length===(n+m)*3&&r.device16.length===(n+m)*r.channels&&r.preview_rgb.length===(n+m)*3&&Array.from(r.output_lab).every(Number.isFinite)),'Incomplete profile comparison.');
  need(rows.every(r=>same(Array.from(r.input_lab),Array.from(rows[0].input_lab))),'Input colourimetry differs between profiles.');
  const sets=doc.targets.map(t=>t.library_mode==='catalog'?D.members(ctx,t.library_id):null),lists=doc.targets.map(()=>[]),common=[],stats=new Map();
  for(let i=0;i<n;i++){
   const id=ctx.colors[i].id,goal=asLab(rows[0].input_lab,i),labs=rows.map(r=>asLab(r.output_lab,i)),dist=labs.map(l=>D.deltaE00(goal,l));
   const allowed=dist.map((d,j)=>(!sets[j]||sets[j].has(id))&&d<=doc.tolerances.output);allowed.forEach((ok,j)=>{if(ok)lists[j].push(id);});
   if(!allowed.every(Boolean))continue;
   let pair=0;for(let a=0;a<labs.length;a++)for(let b=a+1;b<labs.length;b++)pair=Math.max(pair,D.deltaE00(labs[a],labs[b]));
   if(pair>doc.tolerances.pair)continue;
   common.push(id);stats.set(id,{index:i,max_output_delta:Math.max(...dist),max_pair_delta:pair,output_delta:dist});
  }
  const proposals=source.doc.colours.map((c,j)=>{
   const lab=asLab(rows[0].input_lab,n+j),rank=common.map(id=>({id,delta:D.deltaE00(lab,asLab(rows[0].input_lab,stats.get(id).index))})).sort((a,b)=>a.delta-b.delta||a.id-b.id);
   const original=rank.find(r=>r.id===c.reference_id),nearest=rank[0]||null,valid=rank.filter(r=>r.delta<=doc.tolerances.source);
   return {original,nearest,allowed_ids:valid.map(r=>r.id),suggestions:[...(original&&original.delta<=doc.tolerances.source?[original]:[]),...valid.filter(r=>r.id!==original?.id)].slice(0,4)};
  });
  const result={key:settingsKey(doc,source),method:METHOD,lists,common,stats,proposals,rows};contexts.set(result,result.key);return result;
 }
 function current(result,doc,source){return Boolean(result&&contexts.get(result)===settingsKey(doc,source));}
 function approved(result,doc,source){return current(result,doc,source)&&doc.choices.length===source.doc.colours.length&&source.doc.colours.every((c,i)=>Number.isInteger(doc.choices[i])&&result.proposals[i].allowed_ids.includes(doc.choices[i]));}
 function select(result,doc,source,index,id){need(current(result,doc,source)&&result.proposals[index]?.allowed_ids.includes(id),'Common colour is outside the agreed limits.');doc.choices=Array.from({length:source.doc.colours.length},(_,i)=>doc.choices[i]??null);doc.choices[index]=id;}
 function records(result,doc,source,ctx){need(current(result,doc,source),'Recalculate the profile comparison.');return {schema:SCHEMA,method:METHOD,comparison:'CIELAB_D50_2_DEGREE_CIEDE2000_K111',boundary:'Stored ATLAS sRGB targets; not HLC target Lab. Profile prediction, not a physical print approval.',tolerances:doc.tolerances,common_count:result.common.length,
  applications:doc.targets.map((t,i)=>({...t,checked_address_count:result.lists[i].length,library_basis:t.library_mode==='catalog'?'DOCUMENTED_MEMBERSHIP_PLUS_ICC_CHECK':'ICC_DERIVED_ADDRESS_LIST',checked_addresses:result.lists[i]})),
  colours:source.doc.colours.map((c,i)=>{const id=doc.choices[i],s=result.stats.get(id),active=result.proposals[i].allowed_ids.includes(id);return {source:clone(c),confirmed_reference_id:active?id:null,source_delta:active?D.deltaE00(asLab(result.rows[0].input_lab,ctx.colors.length+i),asLab(result.rows[0].input_lab,s.index)):null,
    max_output_delta:active?s.max_output_delta:null,max_pair_delta:active?s.max_pair_delta:null,outputs:active?result.rows.map((r,j)=>({application_id:doc.targets[j].id,lab_d50:asLab(r.output_lab,s.index),display_srgb:Array.from(r.preview_rgb.slice(s.index*3,s.index*3+3)),device_values_16bit:Array.from(r.device16.slice(s.index*r.channels,(s.index+1)*r.channels)),channel_order:r.channels===4?['C','M','Y','K']:r.channels===3?['R','G','B']:doc.targets[j].channel_order,delta_to_target:s.output_delta[j]})):[]};})};}
 async function pack({doc,sourceBytes,bank,result,html},ctx){
  validate(doc,ctx);const source=await K.unpack(sourceBytes,ctx),isApproved=approved(result,doc,source),files={'source-dossier.zip':sourceBytes,'project.json':utf(JSON.stringify(doc,null,2)),'report.html':utf(html)};
  for(const t of doc.targets)if(t.profile_sha256){const p=bank.get(t.profile_sha256);need(p&&await K.sha(p.bytes)===t.profile_sha256,'ICC data missing or changed.');files['profiles/'+t.profile_sha256+'.icc']=p.bytes;}
  if(current(result,doc,source))files['comparison.json']=utf(JSON.stringify(records(result,doc,source,ctx),null,2));
  if(isApproved){const palette=doc.choices.map((id,i)=>({...ctx.colors.find(c=>c.id===id),ref:ctx.colors.find(c=>c.id===id).ref+' '+(i+1)+' '+source.doc.colours[i].label}));files['common.ase']=root.ATLAS_CLARUS_EXPORTS.ase(palette);files['common.clarus.json']=utf(JSON.stringify(root.ATLAS_CLARUS_EXPORTS.clarus([...new Set(doc.choices)].map(id=>ctx.colors.find(c=>c.id===id)),ctx.master,source.doc.name+' · common',[]),null,2));}
  files['readme.txt']=utf('ATLAS Clarus — Multi-application colour project\nOpen multi/index.html in the extracted application package, then load this ZIP.\nsource-dossier.zip preserves the original project, source colours, references, original image and embedded ICC when present.\nproject.json records applications, tolerance limits and explicitly chosen common references. ICC files are stored unchanged.\ncomparison.json (when present) records computational output and address lists. common.* is included only when all colours were explicitly confirmed within all limits. These files do not rebind original source assignments.\nThe comparison uses stored sRGB colour targets, ICC Lab D50/2, CIEDE2000 kL=kC=kH=1. Lab/device transforms use absolute colorimetry and no black point compensation. Display swatches are illustrative sRGB conversions.\nAfter import, recalculate and confirm choices again. Stored report/calculation files are never trusted as a new approval.\nCheck actual materials, printer/ink/finishing and viewing conditions with providers; obtain measured physical samples. A profile calculation is not print approval.\n');
  const checks={};for(const [name,b]of Object.entries(files))checks[name]={bytes:b.length,sha256:await K.sha(b)};files['manifest.json']=utf(JSON.stringify({schema:SCHEMA,master_sha256:ctx.master,files:checks},null,2));const zip=root.ClarusHandoff.zipStored(files);need(zip.length<=MAX_ZIP,'Project exceeds 192 MiB.');return zip;
 }
 async function unpack(bytes,ctx){
  need(bytes instanceof Uint8Array&&bytes.length<=MAX_ZIP,'Project is too large.');const files=root.ATLAS_STARTUP_CODECS.unzip(bytes,MAX_ZIP);
  need(files['manifest.json']?.length<=65536&&files['project.json']?.length<=1024*1024,'Invalid project package.');const m=JSON.parse(decode(files['manifest.json']));need(m.schema===SCHEMA&&m.master_sha256===ctx.master,'Unknown project package.');
  const names=Object.keys(files).filter(n=>n!=='manifest.json');need(same(names.sort(),Object.keys(m.files||{}).sort()),'File inventory mismatch.');for(const n of names)need(m.files[n].bytes===files[n].length&&m.files[n].sha256===await K.sha(files[n]),'Checksum mismatch: '+n);
  const doc=validate(JSON.parse(decode(files['project.json'])),ctx),sourceBytes=files['source-dossier.zip'];need(sourceBytes,'Source dossier missing.');const source=await K.unpack(sourceBytes,ctx),bank=new Map();
  const allowed=new Set(['project.json','source-dossier.zip','report.html','readme.txt','comparison.json','common.ase','common.clarus.json']);
  for(const t of doc.targets)if(t.profile_sha256){const name='profiles/'+t.profile_sha256+'.icc';allowed.add(name);need(files[name],'ICC file missing.');const p=await profile(files[name],t.profile_name,ctx.catalog);need(p.info.sha256===t.profile_sha256,'ICC identity mismatch.');bank.set(t.profile_sha256,p);}
  need(names.every(n=>allowed.has(n)),'Unknown project files.');const previous_choices=doc.choices.slice();doc.choices=[];return {doc,source,sourceBytes,bank,result:null,previous_choices};
 }
 root.ATLAS_MULTI={SCHEMA,METHOD,MAX_ZIP,defaults,target,validate,profile,settingsKey,pending,inputs,analyze,current,approved,select,records,pack,unpack};
})(typeof window==='undefined'?globalThis:window);
