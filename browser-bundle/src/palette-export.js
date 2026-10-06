(function(global){
  'use strict';
  const enc=new TextEncoder();
  function u16(value){return [(value>>>8)&255,value&255]}
  function u32(value){return [(value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255]}
  function f32(value){const b=new ArrayBuffer(4);new DataView(b).setFloat32(0,value,false);return Array.from(new Uint8Array(b))}
  function utf16be(value){const out=[];for(const ch of value){const code=ch.codePointAt(0);if(code<=65535)out.push(...u16(code));else{const v=code-65536;out.push(...u16(0xD800+(v>>10)),...u16(0xDC00+(v&1023)))}}out.push(0,0);return out}
  function ase(palette){const blocks=[];palette.forEach(c=>{const name=utf16be(c.ref),body=[...u16(name.length/2),...name,...enc.encode('RGB '),...f32(c.rgb[0]/255),...f32(c.rgb[1]/255),...f32(c.rgb[2]/255),0,0];blocks.push(...u16(1),...u32(body.length),...body)});return new Uint8Array([...enc.encode('ASEF'),0,1,0,0,...u32(palette.length),...blocks])}
  function readAse(bytes){const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(String.fromCharCode(...bytes.slice(0,4))!=='ASEF')throw Error('Invalid ASE header');let p=12;const count=d.getUint32(8,false),out=[];for(let n=0;n<count;n++){const type=d.getUint16(p,false),len=d.getUint32(p+2,false),end=p+6+len;p+=6;if(type===1){const chars=d.getUint16(p,false);p+=2;let name='';for(let i=0;i<chars-1;i++){name+=String.fromCharCode(d.getUint16(p,false));p+=2}p+=2;const model=String.fromCharCode(...bytes.slice(p,p+4));p+=4;if(model==='RGB '){out.push({ref:name,rgb:[d.getFloat32(p,false),d.getFloat32(p+4,false),d.getFloat32(p+8,false)].map(v=>Math.round(v*255))})}}p=end}return out}
  function slug(ref){return ref.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  function tokens(palette,master,name='ATLAS Clarus Palette'){const color={};palette.forEach(c=>{color[c.ref]={$type:'color',$value:c.hex,$extensions:{'org.atlas-clarus':{atlas_row_id:c.id,master_sha256:master,rgb:c.rgb,lab:c.lab,freeze_status:'FROZEN'}}}});return {$schema:'https://tr.designtokens.org/format/',$description:`${name} — ATLAS Clarus, Figma-compatible design tokens`,color}}
  function css(palette,master,name='ATLAS Clarus Palette'){return `/* ${name}\n   ATLAS Clarus · Master SHA-256: ${master}\n   Frozen reference identities; not measured QC.\n*/\n:root {\n${palette.map(c=>`  --atlas-${slug(c.ref)}: ${c.hex}; /* row ${c.id} · RGB ${c.rgb.join('/')} */`).join('\n')}\n}\n`}
  function gpl(palette,master,name='ATLAS Clarus Palette'){return `GIMP Palette\nName: ${name.replace(/[\r\n]/g,' ')}\nColumns: 4\n# Master SHA-256: ${master}\n# Frozen reference identities; not measured QC.\n${palette.map(c=>`${String(c.rgb[0]).padStart(3)} ${String(c.rgb[1]).padStart(3)} ${String(c.rgb[2]).padStart(3)}\t${c.ref}`).join('\n')}\n`}
  const WORKFLOW='ATLAS Clarus v3.4.0';
  const MAX_SOURCE_ASSIGNMENTS=4096;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&b.every((v,i)=>v===a[i]);
  const rgb8=value=>Array.isArray(value)&&value.length===3&&value.every(v=>Number.isInteger(v)&&v>=0&&v<=255);
  function distanceSquared(a,b){return a.reduce((sum,v,i)=>sum+(v-b[i])**2,0)}
  function createSourceAssignment(sample,point,image,c,master){
    return {
      schema_version:'1.0',source_rgb:[...sample.rgb],source_hex:hex(sample.rgb),
      color_space:'sRGB',bits_per_channel:8,source_representation:'BROWSER_DECODED_SRGB',
      atlas_row_id:c.id,reference:c.ref,reference_rgb:[...c.rgb],reference_hex:c.hex,
      master_sha256:master,workflow:WORKFLOW,metric:'RGB_SQUARED_DISTANCE',
      distance_squared:distanceSquared(sample.rgb,c.rgb),tie_break:'LOWER_ATLAS_ROW_ID',
      sampling:{mode:sample.size===1?'PIXEL_RGB':'AREA_MEAN_RGB',requested_size:sample.size,
        centre:[point.ix,point.iy],bounds:[...sample.bounds],valid_pixel_count:sample.count,
        channel_std:[...sample.std],alpha_threshold:128,rounding:'MATH_ROUND_PER_CHANNEL'},
      image:{name:image.name,width:image.width,height:image.height,sha256:image.sha256??null},
      signature_status:'NOT_SIGNED'
    };
  }
  function validateSourceAssignments(records,colors,master,allowedIds){
    if(!Array.isArray(records)||records.length>MAX_SOURCE_ASSIGNMENTS)throw Error('Invalid source assignments or more than 4096 records.');
    const byId=new Map(colors.map(c=>[c.id,c])),allowed=new Set(allowedIds),winners=new Map();
    for(const r of records){
      const c=r&&Number.isInteger(r.atlas_row_id)&&byId.get(r.atlas_row_id);
      if(!c||!allowed.has(c.id)||r.schema_version!=='1.0'||!rgb8(r.source_rgb)||
         r.source_hex!==hex(r.source_rgb)||r.color_space!=='sRGB'||r.bits_per_channel!==8||
         r.source_representation!=='BROWSER_DECODED_SRGB'||r.reference!==c.ref||
         !same(r.reference_rgb,c.rgb)||r.reference_hex!==c.hex||r.master_sha256!==master||
         r.workflow!==WORKFLOW||r.metric!=='RGB_SQUARED_DISTANCE'||
         r.tie_break!=='LOWER_ATLAS_ROW_ID'||r.signature_status!=='NOT_SIGNED'||
         !Number.isInteger(r.distance_squared)||r.distance_squared!==distanceSquared(r.source_rgb,c.rgb)){
        throw Error('Source assignment identity, RGB or distance validation failed.');
      }
      const im=r.image,q=r.sampling;
      if(!im||typeof im.name!=='string'||!im.name.length||im.name.length>1024||
         !Number.isSafeInteger(im.width)||!Number.isSafeInteger(im.height)||im.width<1||im.height<1||
         !(im.sha256===null||(typeof im.sha256==='string'&&/^[0-9a-f]{64}$/.test(im.sha256)))||
         !q||![1,5,11,21].includes(q.requested_size)||
         q.mode!==(q.requested_size===1?'PIXEL_RGB':'AREA_MEAN_RGB')||
         !Array.isArray(q.centre)||q.centre.length!==2||!q.centre.every(Number.isInteger)||
         q.centre[0]<0||q.centre[0]>=im.width||q.centre[1]<0||q.centre[1]>=im.height||
         q.alpha_threshold!==128||q.rounding!=='MATH_ROUND_PER_CHANNEL'||
         !Array.isArray(q.channel_std)||q.channel_std.length!==3||
         !q.channel_std.every(v=>Number.isFinite(v)&&v>=0&&v<=127.500000001)){
        throw Error('Source image or sampling metadata validation failed.');
      }
      const half=(q.requested_size-1)/2,[x,y]=q.centre;
      const bounds=[Math.max(0,x-half),Math.max(0,y-half),Math.min(im.width-1,x+half),Math.min(im.height-1,y+half)];
      if(!same(q.bounds,bounds)||!Number.isInteger(q.valid_pixel_count)||q.valid_pixel_count<1||
         q.valid_pixel_count>(bounds[2]-bounds[0]+1)*(bounds[3]-bounds[1]+1)||
         (q.valid_pixel_count===1&&q.channel_std.some(v=>v!==0))){
        throw Error('Source sampling bounds or pixel count validation failed.');
      }
      // Verify the claimed winner, never silently rebind an imported identity.
      // Cache by RGB only within this validation against this exact reference set.
      if(!winners.has(r.source_hex)){
        let best=null,bestD=Infinity;
        for(const candidate of colors){const d=distanceSquared(r.source_rgb,candidate.rgb);
          if(d<bestD||(d===bestD&&candidate.id<best.id)){best=candidate;bestD=d}}
        winners.set(r.source_hex,best.id);
      }
      if(winners.get(r.source_hex)!==c.id)throw Error('Source assignment is not the full-master RGB winner.');
    }
    return clone(records);
  }
  function clarus(palette,master,name='ATLAS Clarus Palette',sourceAssignments=[]){
    return {format:'ATLAS_CLARUS_PALETTE',version:'1.2',palette_name:name,workflow:WORKFLOW,
      master_sha256:master,row_id_base:0,freeze_status:'FROZEN',measured_qc_status:'NOT_MEASURED',
      references:palette.map((c,index)=>({palette_index:index,atlas_row_id:c.id,reference:c.ref,master_rgb:c.rgb,master_hex:c.hex,master_lab:c.lab})),
      source_assignments:clone(sourceAssignments)};
  }
  // Validate the entire file before the caller changes any workspace state.
  // IDs and channels are numbers in our own exports: never coerce null,
  // booleans, strings or arrays into a different reference identity.
  function parseClarus(data,colors,master){
    if(!data||data.format!=='ATLAS_CLARUS_PALETTE'||
       !['1.0','1.1','1.2'].includes(data.version)||data.row_id_base!==0||
       data.master_sha256!==master||data.freeze_status!=='FROZEN'||
       data.measured_qc_status!=='NOT_MEASURED'||
       (data.palette_name!==undefined&&typeof data.palette_name!=='string')||
       !Array.isArray(data.references)||!data.references.length||data.references.length>64){
      throw Error('Not a compatible Clarus palette or master.');
    }
    const masterById=new Map(colors.map(c=>[c.id,c])),seen=new Set(),ids=[];
    for(const ref of data.references){
      const c=ref&&Number.isInteger(ref.atlas_row_id)&&masterById.get(ref.atlas_row_id);
      if(!c||seen.has(c.id)||ref.reference!==c.ref||
         typeof ref.master_hex!=='string'||ref.master_hex.toUpperCase()!==c.hex.toUpperCase()||
         !Array.isArray(ref.master_rgb)||ref.master_rgb.length!==3||
         !c.rgb.every((v,i)=>Number.isInteger(ref.master_rgb[i])&&v===ref.master_rgb[i])){
        throw Error('Identity validation failed.');
      }
      seen.add(c.id);ids.push(c.id);
    }
    let sourceAssignments=[];
    if(data.version==='1.2'){
      if(data.workflow!==WORKFLOW)throw Error('Source workflow version mismatch.');
      sourceAssignments=validateSourceAssignments(data.source_assignments,colors,master,ids);
    }else if(data.source_assignments!==undefined){
      throw Error('Source assignments require Clarus palette version 1.2.');
    }
    return {colorIds:ids,sourceAssignments};
  }
  function validateClarus(data,colors,master){return parseClarus(data,colors,master).colorIds}

  global.ATLAS_CLARUS_EXPORTS={ase,readAse,tokens,css,gpl,clarus,validateClarus,parseClarus,createSourceAssignment,validateSourceAssignments,WORKFLOW,MAX_SOURCE_ASSIGNMENTS};
})(typeof window!=='undefined'?window:globalThis);
