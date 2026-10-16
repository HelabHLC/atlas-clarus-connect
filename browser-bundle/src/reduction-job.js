/* Complete, bounded reduction jobs. Hashes prove consistency, not authorship. */
(function(root){
 'use strict';
 const SCHEMA='atlas-clarus-reduction-job/1.0',MANIFEST='atlas-clarus-reduction-job-package/1.0',MAX_BYTES=384*1024*1024,MAX_JSON=32*1024*1024;
 const need=(v,m)=>{if(!v)throw Error('Reduction job: '+m);},utf8=s=>new TextEncoder().encode(s),clone=x=>JSON.parse(JSON.stringify(x));
 const equal=(a,b)=>root.ATLAS_COLOUR_PROJECTS.canon(a)===root.ATLAS_COLOUR_PROJECTS.canon(b);
 const keys=(v,ks)=>v&&typeof v==='object'&&equal(Object.keys(v).sort(),ks.slice().sort());
 const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const json=b=>{need(b&&b.length<=MAX_JSON,'Missing or oversized JSON.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));};
 // The same strict STORE-only ZIP codec as Image Projects, with explicit job limits.
 const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
 const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
 function unzip(bytes){
  need(bytes instanceof Uint8Array&&bytes.length>=22&&bytes.length<=MAX_BYTES,'ZIP exceeds the supported size or is incomplete.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
  need(v.getUint32(end,true)===0x06054b50&&v.getUint16(end+4,true)===0&&v.getUint16(end+6,true)===0&&v.getUint16(end+20,true)===0,'Use the original exported job ZIP.');
  const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),size=v.getUint32(end+12,true);
  need(count>=2&&count<=256&&v.getUint16(end+8,true)===count&&start+size===end,'Invalid ZIP directory.');
  const files=Object.create(null);let at=start,local=0;
  const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
  for(let i=0;i<count;i++){
   need(at+46<=end&&v.getUint32(at,true)===0x02014b50,'Invalid ZIP entry.');
   const flags=v.getUint16(at+8,true),method=v.getUint16(at+10,true),sum=v.getUint32(at+16,true),length=v.getUint32(at+20,true),n=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),offset=v.getUint32(at+42,true);
   need(flags===0x800&&method===0&&length===v.getUint32(at+24,true)&&!extra&&!comment&&v.getUint16(at+34,true)===0&&offset===local&&at+46+n<=end,'Unsupported ZIP entry.');
   const name=decode(bytes.subarray(at+46,at+46+n));need(/^[a-zA-Z][a-zA-Z0-9._/-]{0,100}$/.test(name)&&!name.includes('..')&&!Object.hasOwn(files,name),'Invalid or duplicate ZIP filename.');
   need(local+30<=start&&v.getUint32(local,true)===0x04034b50&&v.getUint16(local+6,true)===flags&&v.getUint16(local+8,true)===0&&v.getUint32(local+14,true)===sum&&v.getUint32(local+18,true)===length&&v.getUint32(local+22,true)===length&&v.getUint16(local+26,true)===n&&v.getUint16(local+28,true)===0,'Invalid local header.');
   const body=local+30+n;need(body+length<=start&&decode(bytes.subarray(local+30,body))===name,'Invalid ZIP payload.');
   files[name]=bytes.slice(body,body+length);need(crc(files[name])===sum,'ZIP checksum mismatch: '+name);local=body+length;at+=46+n;
  }
  need(local===start&&at===end,'Unexpected ZIP content.');return files;
 }
 function encode(state,files){
  const seen=new Map();let index=0,total=Object.values(files).reduce((n,b)=>n+b.length,0);
  function visit(v,depth=0){need(depth<80,'State nesting too deep.');
   if(v instanceof Uint8Array||v instanceof Uint16Array){
    let file=seen.get(v);if(!file){file='job-data/'+String(index++).padStart(3,'0')+'.bin';const bytes=v instanceof Uint16Array?root.ATLAS_COLOUR_REDUCTION.assignmentBytes(v):v.slice();files[file]=bytes;total+=bytes.length;seen.set(v,file);need(total<MAX_BYTES-1024*1024,'Job too large. No data were omitted.');}
    return {$binary:file,type:v instanceof Uint16Array?'u16le':'u8',length:v.length};
   }
   if(Array.isArray(v))return v.map(x=>visit(x,depth+1));
   if(v&&typeof v==='object'){const out={};for(const [k,x]of Object.entries(v)){need(!['__proto__','constructor','prototype','$binary'].includes(k),'Reserved metadata key.');out[k]=visit(x,depth+1);}return out;}
   need(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)),'Invalid state value.');return v;
  }return visit(state);
 }
 function decode(state,files){let nodes=0;const cache=new Map();
  function visit(v,depth=0){need(++nodes<=2000000&&depth<80,'State exceeds structural limits.');
   if(v&&typeof v==='object'&&Object.hasOwn(v,'$binary')){
    need(keys(v,['$binary','type','length'])&&/^job-data\/\d{3}\.bin$/.test(v.$binary)&&['u8','u16le'].includes(v.type)&&Number.isSafeInteger(v.length)&&v.length>=0,'Invalid binary descriptor.');
    const b=files[v.$binary],stride=v.type==='u8'?1:2;need(b&&b.length===v.length*stride,'Missing or truncated binary state.');
    const key=v.$binary+':'+v.type;if(!cache.has(key)){if(stride===1)cache.set(key,b.slice());else{const out=new Uint16Array(v.length),d=new DataView(b.buffer,b.byteOffset,b.byteLength);for(let i=0;i<out.length;i++)out[i]=d.getUint16(i*2,true);cache.set(key,out);}}return cache.get(key);
   }
   if(Array.isArray(v))return v.map(x=>visit(x,depth+1));
   if(v&&typeof v==='object'){const out={};for(const [k,x]of Object.entries(v)){need(!['__proto__','constructor','prototype'].includes(k),'Reserved metadata key.');out[k]=visit(x,depth+1);}return out;}
   need(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)),'Invalid state value.');return v;
  }return visit(state);
 }
 function settings(s,ctx){
  need(keys(s,['protectionMode','libraryId','libraryName','libraryIds','k','lockedIds','originalRgbs','protectedRectangles','regionCorrections']),'Invalid job settings.');
  need(['LIBRARY_REFERENCE','ORIGINAL_RGBA'].includes(s.protectionMode),'Unsupported protection mode.');
  const lib=ctx.libraryViews[s.libraryId];need(lib&&s.libraryName===lib.name&&equal(s.libraryIds,lib.ids.map(Number)),'Reference library changed or is unavailable.');
  need(Number.isInteger(s.k)&&s.k>=1&&s.k<=256,'Invalid palette budget.');
  // Detailed geometry, membership, occurrence and budget validation is performed by replay.
 }
 const bytesEqual=(a,b)=>a?.constructor===b?.constructor&&a.length===b.length&&a.every((v,i)=>v===b[i]);
 function resultEqual(a,b){return keys(a,Object.keys(b))&&Object.keys(b).every(k=>ArrayBuffer.isView(b[k])?bytesEqual(a[k],b[k]):equal(a[k],b[k]));}
 async function verify(state,ctx){
  need(keys(state,['schema','master_sha256','input','settings','result','uncleaned','view','variants'] )&&state.schema===SCHEMA&&state.master_sha256===ctx.master,'Unsupported job or reference master.');
  const input=state.input;need(keys(input,['width','height','rgba','name','sourceName','sourceBytes','sourceMime','project']),'Invalid input record.');
  root.ATLAS_IMAGE_PROJECTS.dimensions(input.width,input.height);
  need(input.rgba instanceof Uint8Array&&input.rgba.length===input.width*input.height*4&&input.sourceBytes instanceof Uint8Array&&input.sourceBytes.length<=root.ATLAS_IMAGE_PROJECTS.MAX_SOURCE,'Invalid input bytes.');
  for(const k of ['name','sourceName'])need(typeof input[k]==='string'&&input[k].length>0&&input[k].length<=1024,'Invalid source name.');
  need(root.ATLAS_IMAGE_CODECS.imageInfo(input.sourceBytes).mime===input.sourceMime,'Source MIME mismatch.');
  let source;
  if(input.project){const p=await root.ATLAS_IMAGE_PROJECTS.verify(input.project,ctx.projectContext);need(bytesEqual(p.source,input.sourceBytes),'Source project bytes differ.');source={width:input.project.original.width,height:input.project.original.height,rgba:p.frame};}
  else{need(typeof ctx.decodeSource==='function','Source decoder unavailable.');source=await ctx.decodeSource(input.sourceBytes);}
  need(source.width===input.width&&source.height===input.height&&bytesEqual(source.rgba,input.rgba),'Source pixels differ in this decoder. Frozen job was not replaced.');
  async function check(settingsValue,base,current){settings(settingsValue,ctx);const computed=await ctx.reduce({...settingsValue,...input,colors:ctx.colors,master:ctx.master});need(resultEqual(base,computed),'Stored reduction does not match deterministic replay.');
   let expected=computed;if(current.report?.area_cleanup){const c=current.report.area_cleanup;expected=root.ATLAS_COLOUR_REDUCTION_CLEANUP.cleanup(computed,input,c.minimum_pixels,c.protection_scope);}
   need(resultEqual(current,expected),'Stored cleanup/output differs from replay.');
  }
  await check(state.settings,state.uncleaned,state.result);
  need(Array.isArray(state.variants)&&state.variants.length<=3,'Invalid variants.');
  for(const [i,v]of state.variants.entries()){need(keys(v,['id','settings','reduced','result'])&&v.id==='variant-'+i,'Invalid variant identity.');await check(v.settings,v.reduced,v.result);}
  const v=state.view;need(keys(v,['zoom','x','y','selected','region','active','overlay','difference','threshold','cleanupMin','cleanupScope']),'Invalid view state.');
  need([1,2,4,8].includes(v.zoom)&&[v.x,v.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&typeof v.overlay==='boolean'&&typeof v.difference==='boolean'&&Number.isFinite(v.threshold)&&v.threshold>=1&&v.threshold<=442,'Invalid inspection settings.');
  need(v.active==='current'||state.variants.some(x=>x.id===v.active),'Missing selected variant.');
  need(v.selected===null||(keys(v.selected,['px','py'])&&Number.isInteger(v.selected.px)&&Number.isInteger(v.selected.py)&&v.selected.px>=0&&v.selected.py>=0&&v.selected.px<input.width&&v.selected.py<input.height),'Invalid inspected pixel.');
  need(v.region===null||(Array.isArray(v.region)&&v.region.length===4&&v.region.every(Number.isInteger)&&v.region[0]>=0&&v.region[1]>=0&&v.region[0]<=v.region[2]&&v.region[1]<=v.region[3]&&v.region[2]<input.width&&v.region[3]<input.height),'Invalid view rectangle.');
  need(Number.isInteger(v.cleanupMin)&&v.cleanupMin>=1&&v.cleanupMin<=1000000&&['PALETTE_AND_MASK','MASK_ONLY'].includes(v.cleanupScope),'Invalid cleanup controls.');
  return state;
 }
 async function exportFiles(state,existing,ctx){
  // Validate before saving too: every successful export must be resumable.
  await verify(state,ctx);
  const files={...existing};need(!files['job.json']&&!files['job-package-manifest.json'],'Duplicate job payload.');
  files['job.json']=utf8(JSON.stringify(encode(state,files)));need(files['job.json'].length<=MAX_JSON,'Job metadata exceeds limit. No data were omitted.');
  const hashes={};for(const [n,b]of Object.entries(files))hashes[n]=await sha(b);
  files['job-package-manifest.json']=utf8(JSON.stringify({schema:MANIFEST,master_sha256:ctx.master,files:hashes}));
  need(Object.values(files).reduce((n,b)=>n+b.length+256,22)<=MAX_BYTES,'Job ZIP exceeds limit. No data were omitted.');return files;
 }
 async function importZip(bytes,ctx){
  const files=unzip(bytes);need(files['job.json']&&files['job-package-manifest.json'],'This is a legacy evidence ZIP, not a resumable reduction job. Keep the original package.');
  const m=json(files['job-package-manifest.json']);need(keys(m,['schema','master_sha256','files'])&&m.schema===MANIFEST&&m.master_sha256===ctx.master,'Wrong job package version or master.');
  need(equal(Object.keys(files).filter(n=>n!=='job-package-manifest.json').sort(),Object.keys(m.files).sort()),'Package files missing or unexpected.');
  for(const [name,hash]of Object.entries(m.files)){need(typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)&&await sha(files[name])===hash,'File hash mismatch: '+name);}
  const state=decode(json(files['job.json']),files);await verify(state,ctx);
  // Verify evidence agrees with the resumable job, even after a rehashed tamper.
  const C=root.ATLAS_IMAGE_CODECS,R=root.ATLAS_COLOUR_REDUCTION;
  if(files['reduced.png'])need(bytesEqual(files['reduced.png'],C.png(state.input.width,state.input.height,state.result.pixels)),'Evidence PNG differs.');
  for(const [name,expected]of [['input-rgba.bin',state.input.rgba],['input-atlas-row-id.u16le',R.assignmentBytes(state.result.assignments)],['output-palette-index.u16le',R.assignmentBytes(state.result.indices)]])if(files[name])need(bytesEqual(files[name],expected),'Evidence differs: '+name);
  return state;
 }
 root.ATLAS_REDUCTION_JOB={SCHEMA,MAX_BYTES,exportFiles,importZip,verify,unzip};
})(typeof window==='undefined'?globalThis:window);
