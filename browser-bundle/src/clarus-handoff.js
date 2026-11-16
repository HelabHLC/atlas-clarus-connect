/* ATLAS Clarus handoff 1.0. Independent MIT implementation; browser and Node. */
(function(root){'use strict';
 const SCHEMA='atlas-clarus-startup/0.3',HISTORY='atlas-clarus-decisions/1.0',HANDOFF='atlas-clarus-adobe-handoff/1.0';
 const FIELDS=['id','name','hex','source','color_space'],CORE=['original','source_rgb','atlas_row_id','atlas_reference','reference_hex','reference_rgb','distance_squared','nearest_tie_count'];
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,hex64=/^[0-9a-f]{64}$/;
 const need=(ok,msg)=>{if(!ok)throw Error('Handoff: '+msg);},clone=v=>JSON.parse(JSON.stringify(v));
 const utf8=s=>new TextEncoder().encode(s),isHash=v=>typeof v==='string'&&hex64.test(v);
 function canon(v){if(v===null||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){need(Number.isSafeInteger(v),'non-integer canonical value');return String(v);}if(typeof v==='string'){need(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v),'unpaired Unicode surrogate');return JSON.stringify(v);}if(Array.isArray(v))return '['+v.map(canon).join(',')+']';need(v&&typeof v==='object','unsupported canonical value');return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';}
 function keys(o,wanted){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===wanted.length&&Object.keys(o).every(k=>wanted.includes(k));}
 function core(r){return Object.fromEntries(CORE.map(k=>[k,clone(r[k])]));}
 function payload(n){return {decision_id:n.decision_id,parent_revision_id:n.parent_revision_id,event:n.event,origin:n.origin,record:n.record};}
 async function makeNode(id,parent,event,origin,record,sha){const n={decision_id:id,parent_revision_id:parent,event:clone(event),origin:clone(origin),record:core(record)};n.revision_id=await sha(utf8(canon(payload(n))));return n;}
 function checkOrigin(o){
  need(o&&typeof o.kind==='string','missing origin declaration');
  if(o.kind==='KIT_INPUT')need(keys(o,['kind']),'unexpected origin field');
  else if(o.kind==='FILE_IMPORT')need(keys(o,['kind','document_sha256'])&&isHash(o.document_sha256),'invalid file origin');
  else if(o.kind==='BUNDLE_DERIVATION')need(keys(o,['kind','document_sha256','basis','index'])&&isHash(o.document_sha256)&&['RECORDED_ORIGINALS','REFERENCE_VALUES_AS_NEW_INPUTS'].includes(o.basis)&&Number.isInteger(o.index)&&o.index>=0,'invalid Bundle origin');
  else need(false,'unknown origin kind');
 }
 function checkEvent(e,parent){
  if(e?.kind==='CREATED')need(!parent&&keys(e,['kind']),'invalid creation event');
  else if(e?.kind==='KIT_EDIT')need(parent&&keys(e,['kind']),'invalid edit event');
  else if(e?.kind==='ASE_RETURN'){
   need(parent&&keys(e,['kind','file_sha256','swatch_name','channel_bits','interpretation','quantization'])&&isHash(e.file_sha256)&&typeof e.swatch_name==='string'&&e.swatch_name.length<=1024&&/^[0-9a-f]{24}$/.test(e.channel_bits)&&e.interpretation==='USER_CONFIRMED_SRGB'&&e.quantization==='MATH_ROUND_CHANNEL_X_255','invalid ASE return event');
  }else need(false,'unknown history event');
 }
 function floatChannels(bits){const b=Uint8Array.from(bits.match(/../g),s=>parseInt(s,16)),v=new DataView(b.buffer);return [0,4,8].map(n=>v.getFloat32(n,false));}
 const quantize=a=>a.map(v=>Math.floor(v*255+.5));
 async function verifyHistory(data,ctx){
  need(data.schema===SCHEMA&&keys(data.decisions,['schema','nodes'])&&data.decisions.schema===HISTORY&&Array.isArray(data.decisions.nodes)&&data.decisions.nodes.length>=data.records.length&&data.decisions.nodes.length<=5000,'invalid decision history');
  const nodes=new Map(),roots=new Set();
  for(const n of data.decisions.nodes){
   need(keys(n,['decision_id','parent_revision_id','event','origin','record','revision_id'])&&uuid.test(n.decision_id)&&isHash(n.revision_id)&&!nodes.has(n.revision_id),'invalid or duplicate revision');
   const parent=n.parent_revision_id===null?null:nodes.get(n.parent_revision_id);
   need(n.parent_revision_id===null||parent?.decision_id===n.decision_id,'missing, reordered or foreign parent');
   if(!parent){need(!roots.has(n.decision_id),'duplicate decision root');roots.add(n.decision_id);}
   checkOrigin(n.origin);checkEvent(n.event,parent);
   need(keys(n.record,CORE)&&keys(n.record.original,FIELDS),'invalid record snapshot');
   await ctx.verifyRecord(n.record);
   if(parent){need(canon(n.origin)===canon(parent.origin),'origin was rewritten');need(n.record.original.id===parent.record.original.id,'a changed input ID needs a new decision');}
   else {need(n.origin.kind!=='BUNDLE_DERIVATION'||typeof ctx.verifyOrigin==='function','Bundle origin validator is required');if(ctx.verifyOrigin)await ctx.verifyOrigin(n.origin,n.record,data);}
   if(n.event.kind==='ASE_RETURN'){
    const a=floatChannels(n.event.channel_bits);need(a.every(v=>Number.isFinite(v)&&v>=0&&v<=1),'invalid returned RGB');
    need(canon(quantize(a))===canon(n.record.source_rgb),'returned RGB does not match revision');
    need(tokenFromName(n.event.swatch_name)===token(parent),'return name does not identify its parent revision');
    for(const k of FIELDS.filter(x=>x!=='hex'))need(n.record.original[k]===parent.record.original[k],'return rewrote source labels');
   }
   need(await ctx.sha(utf8(canon(payload(n))))===n.revision_id,'revision checksum mismatch');nodes.set(n.revision_id,n);
  }
  const seen=new Set();for(const r of data.records){const n=nodes.get(r.revision_id);need(n&&n.decision_id===r.decision_id&&!seen.has(r.decision_id)&&canon(n.record)===canon(core(r)),'current record does not match its decision revision');seen.add(r.decision_id);}
  return nodes;
 }
 async function updateHistory(data,previous,ctx,origins=[]){
  const nodes=previous?.decisions?clone(previous.decisions.nodes):[],old=new Map((previous?.records||[]).map(r=>[r.original.id,r])),byRev=new Map(nodes.map(n=>[n.revision_id,n]));
  for(let i=0;i<data.records.length;i++){
   const r=data.records[i],prior=old.get(r.original.id);let n=prior&&byRev.get(prior.revision_id);
   if(!n)n=await makeNode(ctx.uuid(),null,{kind:'CREATED'},origins[i]||{kind:'KIT_INPUT'},r,ctx.sha);
   else if(canon(n.record)!==canon(core(r)))n=await makeNode(n.decision_id,n.revision_id,{kind:'KIT_EDIT'},n.origin,r,ctx.sha);
   if(!byRev.has(n.revision_id)){nodes.push(n);byRev.set(n.revision_id,n);}
   r.decision_id=n.decision_id;r.revision_id=n.revision_id;
  }
  need(nodes.length<=5000,'history limit reached (5,000 revisions); export the complete JSON before starting a separate palette');
  data.schema=SCHEMA;data.decisions={schema:HISTORY,nodes};return data;
 }
 function token(r){return 'AC_'+r.decision_id.replace(/-/g,'')+'_'+r.revision_id.slice(0,16);}
 function tokenFromName(name){const m=/^(AC_[0-9a-f]{32}_[0-9a-f]{16})(?: |$)/.exec(name);return m?m[1]:null;}
 function swatchName(r){return token(r)+' | '+Array.from(r.original.name).slice(0,48).join('');}
 function writeASE(records){
  const parts=[],push16=n=>parts.push((n>>>8)&255,n&255),push32=n=>parts.push((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);
  parts.push(65,83,69,70);push16(1);push16(0);push32(records.length);
  for(const r of records){const name=swatchName(r),len=2+(name.length+1)*2+4+12+2;push16(1);push32(len);push16(name.length+1);for(let i=0;i<name.length;i++)push16(name.charCodeAt(i));push16(0);parts.push(82,71,66,32);const b=new ArrayBuffer(12),v=new DataView(b);r.source_rgb.forEach((x,i)=>v.setFloat32(i*4,x/255,false));parts.push(...new Uint8Array(b));push16(2);}
  return new Uint8Array(parts);
 }
 function readASE(bytes){
  need(bytes.length>=12&&bytes.length<=1024*1024,'invalid ASE size');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=0;
  const ensure=n=>need(pos+n<=bytes.length,'truncated ASE'),u16=()=>{ensure(2);const n=v.getUint16(pos,false);pos+=2;return n;},u32=()=>{ensure(4);const n=v.getUint32(pos,false);pos+=4;return n;};
  need(String.fromCharCode(...bytes.slice(0,4))==='ASEF','invalid ASE signature');pos=4;need(u16()===1&&u16()===0,'unsupported ASE version');const blocks=u32();need(blocks>0&&blocks<=2048,'invalid block count');const out=[];let depth=0;
  function name(end){const n=u16();need(n>=1&&n<=1025&&pos+2*n<=end,'invalid ASE name length');let s='';for(let j=0;j<n-1;j++)s+=String.fromCharCode(u16());need(u16()===0,'missing ASE name terminator');canon(s);return s;}
  for(let i=0;i<blocks;i++){
   const type=u16(),length=u32(),end=pos+length;need(end<=bytes.length,'truncated ASE block');
   if(type===1){const label=name(end);need(pos+18===end,'unsupported colour block size');const model=String.fromCharCode(...bytes.slice(pos,pos+4));pos+=4;need(model==='RGB ','only RGB ASE is supported; CMYK/Lab values need an explicit conversion outside the kit');const channels=[0,4,8].map(i=>v.getFloat32(pos+i,false)),bits=Array.from(bytes.slice(pos,pos+12),x=>x.toString(16).padStart(2,'0')).join('');pos+=12;const colourType=u16();need(channels.every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&[0,1,2].includes(colourType),'invalid RGB values or colour type');out.push({name:label,channels,channel_bits:bits,rgb:quantize(channels)});}
   else if(type===0xc001){name(end);depth++;need(depth<=32,'too many nested groups');}
   else if(type===0xc002){need(depth>0&&length===0,'invalid group end');depth--;}
   else need(false,'unsupported ASE block type');
   need(pos===end,'unexpected bytes in ASE block');
  }
  need(pos===bytes.length&&depth===0&&out.length>=1&&out.length<=250,'invalid ASE structure or swatch count');return out;
 }
 async function exportHandoff(data,ctx){
  await ctx.verifyPalette(data);await verifyHistory(data,ctx);const ase=writeASE(data.records),json=utf8(JSON.stringify(data,null,2)+'\n');
  need(json.length<=16*1024*1024,'complete JSON exceeds the 16 MiB reimport limit');
  const manifest={schema:HANDOFF,export_id:ctx.uuid(),master_sha256:data.master_sha256,colour_interpretation:'sRGB_8BIT_ORIGINAL_INPUT',native_adobe_validation:'NOT_TESTED',files:{'palette.ase':await ctx.sha(ase),'palette.clarus.json':await ctx.sha(json)},swatches:data.records.map(r=>({decision_id:r.decision_id,revision_id:r.revision_id,ase_name:swatchName(r)}))};
  return {'palette.ase':ase,'palette.clarus.json':json,'handoff.json':utf8(JSON.stringify(manifest,null,2)+'\n'),'READ_ME.txt':utf8('ATLAS CLARUS — ADOBE HANDOFF PILOT\n\nKeep this folder together. Import palette.ase through the Swatches panel.\nKeep the AC_ identifier prefix of each swatch unchanged. Use sRGB RGB values;\nASE does not carry this full provenance record or an embedded ICC profile.\nTo return, export exactly these RGB swatches to ASE and choose the returned\nASE plus the original palette.clarus.json and handoff.json in Colour Kit.\nConfirm that the RGB values are intended as sRGB. CMYK/Lab is rejected.\n\nThe JSON preserves the complete decision history and available Bundle origin.\nMetadata stay in the companion files; they are not automatically embedded in\nthe Adobe document. A native Illustrator/Photoshop/InDesign round trip has\nNOT been tested for this release. File-level tests are listed in the kit.\nHashes and identifiers do not authenticate authorship or declared provenance.\n')};
 }
 async function returnHandoff(jsonBytes,manifestBytes,returnedASE,ctx){
  need(jsonBytes.length<=16*1024*1024&&manifestBytes.length<=1024*1024,'companion file too large');const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b),data=JSON.parse(decode(jsonBytes)),m=JSON.parse(decode(manifestBytes));
  need(keys(m,['schema','export_id','master_sha256','colour_interpretation','native_adobe_validation','files','swatches'])&&m.schema===HANDOFF&&uuid.test(m.export_id)&&m.master_sha256===data.master_sha256&&m.colour_interpretation==='sRGB_8BIT_ORIGINAL_INPUT'&&m.native_adobe_validation==='NOT_TESTED','unsupported handoff manifest');
  need(keys(m.files,['palette.ase','palette.clarus.json'])&&isHash(m.files['palette.ase'])&&await ctx.sha(jsonBytes)===m.files['palette.clarus.json'],'companion JSON checksum mismatch');
  await ctx.verifyPalette(data);await verifyHistory(data,ctx);
  need(await ctx.sha(writeASE(data.records))===m.files['palette.ase'],'original ASE binding mismatch');
  const expected=data.records.map(r=>({decision_id:r.decision_id,revision_id:r.revision_id,ase_name:swatchName(r)}));need(canon(m.swatches)===canon(expected),'swatch manifest mismatch');
  const swatches=readASE(returnedASE),byToken=new Map();
  for(const s of swatches){const t=tokenFromName(s.name);need(t&&!byToken.has(t),'missing, changed or duplicate decision identifier');byToken.set(t,s);}
  need(swatches.length===data.records.length,'swatch count differs; return exactly the exported palette');
  const returnHash=await ctx.sha(returnedASE),out=clone(data),nodes=out.decisions.nodes,byRev=new Map(nodes.map(n=>[n.revision_id,n]));let changed=0;
  out.records=[];
  for(const old of data.records){const s=byToken.get(token(old));need(s,'a decision or revision identifier does not match this handoff');const same=canon(s.rgb)===canon(old.source_rgb);if(!same)changed++;const original={...old.original,hex:same?old.original.hex:'#'+s.rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()},r=ctx.assign(original),parent=byRev.get(old.revision_id),event={kind:'ASE_RETURN',file_sha256:returnHash,swatch_name:s.name,channel_bits:s.channel_bits,interpretation:'USER_CONFIRMED_SRGB',quantization:'MATH_ROUND_CHANNEL_X_255'},n=await makeNode(old.decision_id,old.revision_id,event,parent.origin,r,ctx.sha);
   if(!byRev.has(n.revision_id)){nodes.push(n);byRev.set(n.revision_id,n);}r.decision_id=n.decision_id;r.revision_id=n.revision_id;out.records.push(r);
  }
  need(nodes.length<=5000,'history limit reached');out.source_values_sha256=await ctx.sourceDigest(out.records.map(r=>r.original));out.input_file_sha256=returnHash;out.run_id=ctx.uuid();out.created_utc=new Date().toISOString();out.kit_version='0.3.0';
  await verifyHistory(out,ctx);return {data:out,report:{status:'PASS',records:out.records.length,rgb_changed:changed,returned_ase_sha256:returnHash,original_ase_byte_identical:returnHash===m.files['palette.ase'],native_adobe_validation:'NOT_TESTED'}};
 }
 function zipStored(files){
  const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;},parts=[],central=[];let offset=0,centralSize=0;
  const header=n=>{const b=new Uint8Array(n);return[b,new DataView(b.buffer)];};
  for(const [name,body]of Object.entries(files)){const nameBytes=utf8(name),sum=crc(body),[h,v]=header(30);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,sum,true);v.setUint32(18,body.length,true);v.setUint32(22,body.length,true);v.setUint16(26,nameBytes.length,true);parts.push(h,nameBytes,body);const[c,w]=header(46);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,0x21,true);w.setUint32(16,sum,true);w.setUint32(20,body.length,true);w.setUint32(24,body.length,true);w.setUint16(28,nameBytes.length,true);w.setUint32(42,offset,true);central.push(c,nameBytes);centralSize+=46+nameBytes.length;offset+=30+nameBytes.length+body.length;}
  const[e,v]=header(22),count=Object.keys(files).length;v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);const all=[...parts,...central,e],out=new Uint8Array(all.reduce((s,b)=>s+b.length,0));let p=0;for(const b of all){out.set(b,p);p+=b.length;}return out;
 }
 const api={SCHEMA,HISTORY,HANDOFF,canon,core,verifyHistory,updateHistory,writeASE,readASE,exportHandoff,returnHandoff,zipStored,swatchName,token,utf8};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClarusHandoff=api;
})(typeof globalThis!=='undefined'?globalThis:this);
