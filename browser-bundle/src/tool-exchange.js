/* Lossless file carrier + explicit native working views. Never discard the source. */
(function(root){
 'use strict';
 const SCHEMA='atlas-clarus-tool-exchange/1.0',MAX_BYTES=384*1024*1024,MAX_ITEMS=100;
 const H=root.ClarusHandoff,E=root.ATLAS_CLARUS_EXPORTS,A=root.ATLAS_COLOUR_HANDOFF,P=root.ATLAS_COLOUR_PROJECTS,I=root.ATLAS_IMAGE_PROJECTS,J=root.ATLAS_REDUCTION_JOB;
 const need=(v,m)=>{if(!v)throw Error('Clarus Exchange: '+m);},utf8=s=>new TextEncoder().encode(s),copy=x=>JSON.parse(JSON.stringify(x));
 const equal=(a,b)=>P.canon(a)===P.canon(b),sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const json=bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''));
 const keys=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&equal(Object.keys(x).sort(),ks.slice().sort());
 const encode=d=>utf8(JSON.stringify(d,null,2)+'\n');
 const safeText=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n&&!/[\x00-\x1f\x7f]/.test(s);
 const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s);
 async function context({colors,master,libraryViews={},decodeSource=I.decodeSource,reduce=null,designerLayer=null}){
  const native={...await A.createContext(colors,master),decodeSource};
  return {colors,master,libraryViews,decodeSource,designerLayer,native,job:{colors,master,libraryViews,decodeSource,projectContext:native,reduce:reduce||((args)=>root.ATLAS_COLOUR_REDUCTION.reduce(args))}};
 }
 async function verifyHandoff(files,prefix,data,ctx){
  await A.verify(data,ctx.native);const m=json(files[prefix+'handoff.json']),expected=await H.exportHandoff(data,ctx.native),em=json(expected['handoff.json']);
  need(keys(m,Object.keys(em))&&uuid(m.export_id),'Invalid handoff manifest.');
  for(const k of Object.keys(em).filter(k=>!['export_id','files'].includes(k)))need(equal(m[k],em[k]),'Handoff manifest metadata differs.');
  need(keys(m.files,['palette.clarus.json','palette.ase']),'Invalid handoff companions.');
  for(const name of ['palette.clarus.json','palette.ase'])need(files[prefix+name]&&await sha(files[prefix+name])===m.files[name],'Handoff companion hash differs.');
  need(await sha(files[prefix+'palette.ase'])===await sha(expected['palette.ase']),'Handoff ASE differs from decisions.');
 }
 async function inspect(bytes,ctx,attachment=false){
  need(bytes instanceof Uint8Array&&bytes.length<=MAX_BYTES&&(attachment||bytes.length>0),'Empty or oversized native file.');
  if(attachment)return {kind:'ATTACHMENT',data:null,editable:false};
  if(bytes[0]===80&&bytes[1]===75){
   const files=J.unzip(bytes);
   if(files['exchange.json'])throw Error('Open this exchange package as a workspace; do not nest it as a file.');
   if(files['job.json'])return {kind:'REDUCTION_JOB',data:await J.importZip(bytes,ctx.job)};
   if(files['image-project.clarus.json'])return {kind:'IMAGE_PROJECT',data:await I.importZip(bytes,ctx.native)};
   if(files['project.clarus.json']){
    const data=json(files['project.clarus.json']);await P.verify(data,ctx.native);
    const expected=await P.exportPackage(data,ctx.native);need(equal(Object.keys(expected).sort(),Object.keys(files).sort()),'Colour Project ZIP has missing or unexpected files.');
    const m=json(files['project-package-manifest.json']);need(m.schema==='atlas-clarus-project-package/1.0'&&m.project_id===data.project_id&&m.project_version===P.latest(data).version&&equal(Object.keys(m.files).sort(),Object.keys(files).filter(n=>n!=='project-package-manifest.json').sort()),'Invalid Colour Project manifest.');
    for(const [n,digest]of Object.entries(m.files))need(await sha(files[n])===digest,'Colour Project file hash differs.');
    for(const [n,b]of Object.entries(expected)){
     if(n==='project-package-manifest.json')continue;
     if(n.endsWith('/handoff.json')){const prefix=n.slice(0,-'handoff.json'.length);await verifyHandoff(files,prefix,json(files[prefix+'palette.clarus.json']),ctx);}
     else need(await sha(files[n])===await sha(b),'Colour Project companion differs: '+n);
    }
    return {kind:'COLOUR_PROJECT',data};
   }
   if(files['card-manifest.json'])return {kind:'DECISION_CARD',data:await root.ATLAS_CLARUS_REFERENCE_CARD.colourHandoff.verifyFiles(files,ctx.native,ctx.colors)};
   if(files['handoff.json']&&files['palette.clarus.json']&&files['palette.ase']){
    const data=json(files['palette.clarus.json']);await verifyHandoff(files,'',data,ctx);
    return {kind:'DECISION_HANDOFF',data};
   }
   throw Error('This ZIP has no supported editable document. Add it explicitly as an unchanged attachment if needed.');
  }
  need(bytes.length<=64*1024*1024,'JSON file exceeds the supported native limit.');
  let d;try{d=json(bytes);}catch(_){throw Error('No supported native JSON/ZIP. Use Add unchanged attachment for other formats.');}
  if(d.format==='ATLAS_CLARUS_PALETTE'){E.parseClarus(d,ctx.colors,ctx.master);return {kind:'REFERENCE_PALETTE',data:d};}
  if(d.schema===H.SCHEMA){await A.verify(d,ctx.native);return {kind:'COLOUR_DECISIONS',data:d};}
  if(d.schema===P.SCHEMA){await P.verify(d,ctx.native);return {kind:'COLOUR_PROJECT',data:d};}
  if(d.schema===I.SCHEMA){await I.verify(d,ctx.native);return {kind:'IMAGE_PROJECT',data:d};}
  if(d.format==='ATLAS_CLARUS_PARALLEL_PRINT_HANDOFF'){await root.ATLAS_CLARUS_PRINT.validate(d,ctx.colors,ctx.master);return {kind:'PRINT_HANDOFF',data:d};}
  if(d.format==='ATLAS_CLARUS_REFERENCE_CARD'){root.ATLAS_CLARUS_REFERENCE_CARD.validate(d,ctx.colors,ctx.master,ctx.designerLayer);return {kind:'REFERENCE_CARD',data:d};}
  throw Error('Unsupported native schema. Preserve it as an unchanged attachment; no editable conversion is claimed.');
 }
 function create(ctx){return {schema:SCHEMA,master_sha256:ctx.master,package_id:crypto.randomUUID(),documents:[],payloads:{}};}
 async function verify(pkg,ctx){
  need(keys(pkg,['schema','master_sha256','package_id','documents','payloads'])&&pkg.schema===SCHEMA&&pkg.master_sha256===ctx.master&&uuid(pkg.package_id),'Wrong exchange schema or master.');
  need(Array.isArray(pkg.documents)&&pkg.documents.length<=MAX_ITEMS&&pkg.payloads&&typeof pkg.payloads==='object','Invalid file collection.');
  const seen=new Set(),parsed=new Map();let total=0;
  for(const d of pkg.documents){
   need(keys(d,['id','filename','kind','sha256','size_bytes','parents','operation'])&&uuid(d.id)&&!seen.has(d.id)&&safeText(d.filename,255)&&safeText(d.operation,240),'Invalid document record.');
   need(Array.isArray(d.parents)&&new Set(d.parents).size===d.parents.length&&d.parents.every(id=>seen.has(id)),'Missing, reordered or cyclic source links.');
   const b=pkg.payloads[d.id];need(b instanceof Uint8Array&&d.size_bytes===b.length&&await sha(b)===d.sha256,'Document bytes/hash mismatch: '+d.filename);
   total+=b.length;need(total<=MAX_BYTES-2*1024*1024,'Exchange size limit reached; no file was dropped.');
   const native=await inspect(b,ctx,d.kind==='ATTACHMENT');need(native.kind===d.kind,'Native schema was relabelled.');parsed.set(d.id,native);seen.add(d.id);
  }
  need(equal(Object.keys(pkg.payloads).sort(),[...seen].sort()),'Unexpected or missing payload.');return parsed;
 }
 async function add(pkg,{filename,bytes,parents=[],operation='IMPORTED_NATIVE_FILE',attachment=false},ctx){
  await verify(pkg,ctx);need(pkg.documents.length<MAX_ITEMS,'At most 100 files; save a separate package.');
  need(safeText(filename,255)&&safeText(operation,240)&&Array.isArray(parents)&&new Set(parents).size===parents.length&&parents.every(id=>pkg.documents.some(d=>d.id===id)),'Invalid filename or parent.');
  const native=await inspect(bytes,ctx,attachment),id=crypto.randomUUID();
  const next={...pkg,documents:[...pkg.documents,{id,filename,kind:native.kind,sha256:await sha(bytes),size_bytes:bytes.length,parents:parents.slice(),operation}],payloads:{...pkg.payloads,[id]:bytes.slice()}};
  await verify(next,ctx);return {package:next,id,native};
 }
 async function exportZip(pkg,ctx){
  await verify(pkg,ctx);need(pkg.documents.length>0,'Add at least one complete file before exporting.');const files={};for(const d of pkg.documents)files['payloads/'+d.id+'.bin']=pkg.payloads[d.id];
  const manifest={schema:SCHEMA,master_sha256:pkg.master_sha256,package_id:pkg.package_id,documents:pkg.documents};
  const metadata=encode(manifest);need(metadata.length<=1024*1024,'Manifest exceeds limit.');files['exchange.json']=metadata;
  const zip=H.zipStored(files);need(zip.length<=MAX_BYTES,'Exchange ZIP exceeds limit.');return zip;
 }
 async function importZip(bytes,ctx){
  const files=J.unzip(bytes);need(files['exchange.json']&&files['exchange.json'].length<=1024*1024,'Missing exchange manifest.');const m=json(files['exchange.json']);
  need(keys(m,['schema','master_sha256','package_id','documents'])&&Array.isArray(m.documents)&&m.documents.length<=MAX_ITEMS,'Invalid manifest.');
  need(equal(Object.keys(files).sort(),['exchange.json',...m.documents.map(d=>'payloads/'+d.id+'.bin')].sort()),'Exchange has missing or unexpected files.');
  const pkg={...m,payloads:{}};for(const d of m.documents){need(uuid(d.id),'Invalid payload ID.');pkg.payloads[d.id]=files['payloads/'+d.id+'.bin'];}await verify(pkg,ctx);return pkg;
 }
 function decisionSets(native){
  if(['COLOUR_DECISIONS','DECISION_CARD','DECISION_HANDOFF'].includes(native.kind))return [native.data];
  if(native.kind==='COLOUR_PROJECT')return P.latest(native.data).entries.map(e=>P.palette(native.data,e.entry_id));
  if(native.kind==='IMAGE_PROJECT'&&native.data.colour_project)return decisionSets({kind:'COLOUR_PROJECT',data:native.data.colour_project});
  if(native.kind==='REDUCTION_JOB'&&native.data.input.project?.colour_project)return decisionSets({kind:'COLOUR_PROJECT',data:native.data.input.project.colour_project});
  return [];
 }
 function referenceIds(native){
  if(native.kind==='REFERENCE_PALETTE')return native.data.references.map(r=>r.atlas_row_id);
  if(native.kind==='REDUCTION_JOB')return native.data.result.report.palette.filter(c=>c.kind!=='ORIGINAL_RGB').map(c=>c.atlas_row_id);
  if(native.kind==='PRINT_HANDOFF')return native.data.references.map(r=>r.source_atlas_row_id);
  if(native.kind==='REFERENCE_CARD')return [native.data.reference.atlas_row_id];
  return decisionSets(native).flatMap(d=>d.records.map(r=>r.atlas_row_id));
 }
 async function sourcePalettes(native,ctx){
  if(native.kind==='REFERENCE_PALETTE')return [encode(native.data)];
  const sets=decisionSets(native),docs=new Map();
  for(const d of sets)if(d.bundle_origin){const text=d.bundle_origin.document_text;ctx.native.checkBundle(json(utf8(text)));docs.set(await sha(utf8(text)),utf8(text));}
  need(docs.size>0,'No recorded Browser palette exists. A reference working view is a separate explicit action.');return [...docs.values()];
 }
 async function decisions(native,ctx){
  const existing=decisionSets(native);if(native.kind!=='REDUCTION_JOB'&&existing.length)return existing.map(encode);
  if(native.kind==='REFERENCE_PALETTE'){
   const d=native.data,basis=d.source_assignments?.length?'RECORDED_ORIGINALS':'REFERENCE_VALUES_AS_NEW_INPUTS',count=basis==='RECORDED_ORIGINALS'?d.source_assignments.length:d.references.length,all=[];
   for(let start=0;start<count;start+=250)all.push(encode(await A.derive(d,basis,start,Math.min(250,count-start),ctx.native)));
   need(all.length>0,'No colours to transfer.');return all;
  }
  if(native.kind==='REDUCTION_JOB'){
   // Output colours become explicitly NEW design inputs. Source identities remain in the parent job.
   const rows=native.data.result.report.palette.map((c,i)=>({id:'output-'+i,name:'Reduction output '+(i+1),hex:c.hex,source:'Recorded reduction output; original source and fixed assignments retained in the exchange parent job',color_space:'sRGB'})),all=[];
   const template=await A.derive(E.clarus([ctx.colors[0]],ctx.master,'Output inputs'),'REFERENCE_VALUES_AS_NEW_INPUTS',0,1,ctx.native);
   for(let start=0;start<rows.length;start+=250){const d=copy(template);d.run_id=crypto.randomUUID();delete d.bundle_origin;delete d.decisions;const subset=rows.slice(start,start+250);d.records=subset.map(ctx.native.assign);d.source_values_sha256=await ctx.native.sourceDigest(subset);d.input_file_sha256=null;await H.updateHistory(d,null,ctx.native);await A.verify(d,ctx.native);all.push(encode(d));}return all;
  }
  throw Error('No supported design-colour inputs. Use an explicit reference view first.');
 }
 async function derive(pkg,id,target,ctx){
  const parsed=await verify(pkg,ctx),native=parsed.get(id);need(native,'Choose a source document.');let outputs=[],operation=target;
  if(target==='SOURCE_PALETTE')outputs=(await sourcePalettes(native,ctx)).map((bytes,i)=>({bytes,filename:'source-palette-'+(i+1)+'.clarus.json'}));
  else if(target==='REFERENCE_VIEW'){
   const ids=[...new Set(referenceIds(native))];need(ids.length>0,'No recorded reference IDs. Original colours are not silently converted.');
   for(let start=0;start<ids.length;start+=64)outputs.push({filename:'reference-view-'+(1+start/64)+'.clarus.json',bytes:encode(E.clarus(ids.slice(start,start+64).map(id=>ctx.colors[id]),ctx.master,'Reference view; complete original retained in exchange'))});
  }else if(target==='COLOUR_PROJECT_SOURCE'){
   const p=native.kind==='COLOUR_PROJECT'?native.data:native.kind==='IMAGE_PROJECT'?native.data.colour_project:native.kind==='REDUCTION_JOB'?native.data.input.project?.colour_project:null;
   need(p,'No complete source Colour Project is attached. Select its retained native file instead.');outputs=[{filename:'source-colour-project.clarus.json',bytes:encode(p)}];
  }else if(target==='PRINT_SOURCE'){
   const seen=new Set();let frontier=[id],candidates=new Map();
   while(frontier.length&&!candidates.size){const next=[];for(const key of frontier){if(seen.has(key))continue;seen.add(key);const d=pkg.documents.find(d=>d.id===key);if(parsed.get(key).kind==='PRINT_HANDOFF')candidates.set(d.sha256,d);else next.push(...d.parents);}frontier=next;}
   need(candidates.size===1,'Choose a source with exactly one nearest retained print request; no profile/settings guess was made.');const d=[...candidates.values()][0];outputs=[{filename:d.filename,bytes:pkg.payloads[d.id]}];
  }else if(target==='DECISIONS')outputs=(await decisions(native,ctx)).map((bytes,i)=>({bytes,filename:'decisions-'+(i+1)+'.clarus.json'}));
  else if(target==='COLOUR_PROJECT'&&native.kind==='COLOUR_PROJECT')outputs=[{filename:'project.clarus.json',bytes:encode(native.data)}];
  else if(target==='COLOUR_PROJECT'){
   const sets=await decisions(native,ctx);
   for(let start=0;start<sets.length;start+=10){let p=await P.create('Clarus exchange colours '+(1+start/10),ctx.native);for(let i=start;i<Math.min(sets.length,start+10);i++)p=await P.add(p,'Transferred set '+(i+1),json(sets[i]),ctx.native);outputs.push({filename:'project-'+(1+start/10)+'.clarus.json',bytes:encode(p)});}
  }else if(target==='IMAGE_PROJECT_SOURCE'){
   const p=native.kind==='IMAGE_PROJECT'?native.data:native.kind==='REDUCTION_JOB'?native.data.input.project:null;need(p,'No complete original Image Project is attached.');outputs=[{filename:'source-image-project.clarus.json',bytes:encode(p)}];
  }else if(target==='IMAGE_PROJECT_OUTPUT'){
   need(native.kind==='REDUCTION_JOB','Choose a complete reduction job.');const s=native.data,b=root.ATLAS_IMAGE_CODECS.png(s.input.width,s.input.height,s.result.pixels),decoded=await ctx.decodeSource(b);
   need(decoded.width===s.input.width&&decoded.height===s.input.height&&decoded.rgba.length===s.result.pixels.length&&decoded.rgba.every((v,i)=>v===s.result.pixels[i]),'The browser changes output RGBA during PNG decoding. Exact transfer was refused; the original job remains intact.');
   const p=await I.create({name:'Reduction output',filename:'reduced.png',bytes:b,...decoded,colourProject:s.input.project?.colour_project||null},ctx.native);outputs=[{filename:'reduced-image-project.clarus.json',bytes:encode(p)}];
  }else if(target==='PRINT_HANDOFF'&&native.kind==='PRINT_HANDOFF')outputs=[{filename:'source.print-handoff.json',bytes:pkg.payloads[id]}];
  else if(target==='PRINT_HANDOFF'){
   const ids=[...new Set(referenceIds(native))];need(ids.length>0,'No recorded references.');const Pn=root.ATLAS_CLARUS_PRINT;
   for(let start=0;start<ids.length;start+=64){const d=await Pn.create({entries:ids.slice(start,start+64).map(id=>ctx.colors[id]),colors:ctx.colors,master:ctx.master,name:'Exchange reference print handoff '+(1+start/64),paths:{'4C':Pn.emptySettings(),ECG:Pn.emptySettings()}});outputs.push({filename:'exchange-'+(1+start/64)+'.print-handoff.json',bytes:encode(d)});}
  }else if(target==='REFERENCE_CARDS'){
   const sets=await decisions(native,ctx);for(const [i,b]of sets.entries())outputs.push({filename:'colour-reference-cards-'+(i+1)+'.zip',bytes:H.zipStored(await root.ATLAS_CLARUS_REFERENCE_CARD.colourHandoff.exportFiles(json(b),ctx.native,ctx.colors))});
  }else throw Error('Unknown transition.');
  need(outputs.length>0&&pkg.documents.length+outputs.length<=MAX_ITEMS,'Transition exceeds file limits. No partial transfer.');
  let next=pkg;const added=[];for(const out of outputs){const r=await add(next,{...out,parents:[id],operation},ctx);next=r.package;added.push(r.id);}return {package:next,ids:added};
 }
 root.ATLAS_TOOL_EXCHANGE={SCHEMA,MAX_BYTES,MAX_ITEMS,context,create,inspect,verify,add,exportZip,importZip,derive,decisionSets,referenceIds};
})(typeof window==='undefined'?globalThis:window);
