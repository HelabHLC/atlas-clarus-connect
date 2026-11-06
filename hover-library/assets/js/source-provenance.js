(function(global){
  'use strict';
  // RC28 source-assignment 1.0 contract. Keep the shipped RC28 files/pins unchanged.
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const WORKFLOW='ATLAS Clarus v3.4.0', KEY='atlasClarusLocalPaletteV2';
  const LEGACY_KEY='atlasClarusLocalPaletteV1', MAX_SOURCES=4096, MAX_REFERENCES=24;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&b.every((v,i)=>v===a[i]);
  const rgb8=value=>Array.isArray(value)&&value.length===3&&value.every(v=>Number.isInteger(v)&&v>=0&&v<=255);
  const distance=(a,b)=>a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);
  const pick=(value,keys)=>Object.fromEntries(keys.map(key=>[key,clone(value[key])]));

  function validateSources(records,colors,allowedIds){
    if(!Array.isArray(records)||records.length>MAX_SOURCES)throw Error('Invalid source assignments or more than 4096 records');
    const byId=new Map(colors.map(c=>[c.id,c])),allowed=new Set(allowedIds),winners=new Map();
    return records.map(r=>{
      const c=r&&Number.isInteger(r.atlas_row_id)&&byId.get(r.atlas_row_id);
      if(!c||!allowed.has(c.id)||r.schema_version!=='1.0'||!rgb8(r.source_rgb)||
         r.source_hex!==hex(r.source_rgb)||r.color_space!=='sRGB'||r.bits_per_channel!==8||
         r.source_representation!=='BROWSER_DECODED_SRGB'||r.reference!==c.ref||
         !same(r.reference_rgb,c.rgb)||r.reference_hex!==c.hex||r.master_sha256!==MASTER||
         r.workflow!==WORKFLOW||r.metric!=='RGB_SQUARED_DISTANCE'||
         r.tie_break!=='LOWER_ATLAS_ROW_ID'||r.signature_status!=='NOT_SIGNED'||
         !Number.isInteger(r.distance_squared)||r.distance_squared!==distance(r.source_rgb,c.rgb)){
        throw Error('Source assignment identity, RGB or distance mismatch');
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
        throw Error('Invalid source image or sampling metadata');
      }
      const half=(q.requested_size-1)/2,[x,y]=q.centre;
      const bounds=[Math.max(0,x-half),Math.max(0,y-half),Math.min(im.width-1,x+half),Math.min(im.height-1,y+half)];
      if(!same(q.bounds,bounds)||!Number.isInteger(q.valid_pixel_count)||q.valid_pixel_count<1||
         q.valid_pixel_count>(bounds[2]-bounds[0]+1)*(bounds[3]-bounds[1]+1)||
         (q.valid_pixel_count===1&&q.channel_std.some(v=>v!==0))){
        throw Error('Invalid source sampling bounds or pixel count');
      }
      if(!winners.has(r.source_hex)){
        let best=null,bestD=Infinity;
        for(const candidate of colors){const d=distance(r.source_rgb,candidate.rgb);
          if(d<bestD||(d===bestD&&candidate.id<best.id)){best=candidate;bestD=d;}}
        winners.set(r.source_hex,best.id);
      }
      if(winners.get(r.source_hex)!==c.id)throw Error('Source assignment is not the full-master RGB winner');
      // Rebuild only checked fields; do not propagate unverified extra claims.
      return {...pick(r,['schema_version','source_rgb','source_hex','color_space','bits_per_channel',
        'source_representation','atlas_row_id','reference','reference_rgb','reference_hex','master_sha256',
        'workflow','metric','distance_squared','tie_break','signature_status']),
        sampling:pick(q,['mode','requested_size','centre','bounds','valid_pixel_count','channel_std','alpha_threshold','rounding']),
        image:pick(im,['name','width','height','sha256'])};
    });
  }

  function readHandoff(url,colors){
    const p=url.searchParams;
    if(!p.getAll('source').includes('pkl-image-picker')&&!p.has('source_assignment'))return null;
    for(const key of ['source','atlas_row_id','hlc','master_sha256','return_url']){
      if(p.getAll(key).length!==1)throw Error('Missing or duplicate '+key);
    }
    if(p.get('source')!=='pkl-image-picker')throw Error('Invalid source sender');
    const rawId=p.get('atlas_row_id');
    if(!/^\d+$/.test(rawId)||!Number.isSafeInteger(Number(rawId)))throw Error('atlas_row_id is not a strict integer');
    const color=colors.find(c=>c.id===Number(rawId));
    if(!color||color.ref!==p.get('hlc')||p.get('master_sha256')!==MASTER)throw Error('PKL identity or master mismatch');
    const rawReturn=p.get('return_url');
    if(!rawReturn)throw Error('return URL is missing');
    const returnUrl=new URL(rawReturn,url.href);
    if(returnUrl.origin!==url.origin||!/^https?:$/.test(returnUrl.protocol)||returnUrl.username||returnUrl.password){
      throw Error('return URL is not same-origin');
    }
    let sourceAssignment=null;
    if(p.has('source_assignment')){
      const raw=p.get('source_assignment');
      if(p.getAll('source_assignment').length!==1||!raw||raw.length>16384)throw Error('Invalid source_assignment payload');
      sourceAssignment=validateSources([JSON.parse(raw)],colors,[color.id])[0];
    }
    return {color,returnUrl,sourceAssignment};
  }

  function returnLink(handoff){
    const back=new URL(handoff.returnUrl.href);
    back.searchParams.set('source','hover-library-return');
    back.searchParams.set('atlas_row_id',String(handoff.color.id));
    back.searchParams.set('hlc',handoff.color.ref);
    back.searchParams.set('master_sha256',MASTER);
    back.searchParams.delete('source_assignment');
    if(handoff.sourceAssignment)back.searchParams.set('source_assignment',JSON.stringify(handoff.sourceAssignment));
    return back;
  }

  const empty=()=>({version:2,master_sha256:MASTER,workflow:WORKFLOW,colorIds:[],sourceAssignments:[]});
  function validatePalette(value,colors){
    const byId=new Map(colors.map(c=>[c.id,c]));
    if(!value||value.version!==2||value.master_sha256!==MASTER||value.workflow!==WORKFLOW||
       !Array.isArray(value.colorIds)||value.colorIds.length>MAX_REFERENCES||
       value.colorIds.some(id=>!Number.isInteger(id)||!byId.has(id))||new Set(value.colorIds).size!==value.colorIds.length){
      throw Error('Invalid local palette identity');
    }
    return {...empty(),colorIds:[...value.colorIds],sourceAssignments:validateSources(value.sourceAssignments,colors,value.colorIds)};
  }

  function loadPalette(storage,colors){
    const raw=storage.getItem(KEY);
    if(raw!==null)return validatePalette(JSON.parse(raw),colors);
    const legacy=JSON.parse(storage.getItem(LEGACY_KEY)||'[]');
    if(!Array.isArray(legacy))throw Error('Invalid legacy palette');
    const byId=new Map(colors.map(c=>[c.id,c]));
    // Old UI accepted numeric string IDs; never coerce null/booleans/arrays.
    const ids=legacy.map(id=>typeof id==='string'&&/^\d+$/.test(id)?Number(id):id)
      .filter(id=>Number.isInteger(id)&&byId.has(id));
    return {...empty(),colorIds:[...new Set(ids)].slice(0,MAX_REFERENCES)};
  }

  function add(palette,color,sourceAssignment){
    const next=clone(palette);
    if(!next.colorIds.includes(color.id)){
      if(next.colorIds.length>=MAX_REFERENCES)throw Error('Palette full (24 references); remove a reference first');
      next.colorIds.push(color.id);
    }
    if(sourceAssignment&&!next.sourceAssignments.some(r=>JSON.stringify(r)===JSON.stringify(sourceAssignment))){
      if(next.sourceAssignments.length>=MAX_SOURCES)throw Error('Source limit (4096) reached; no record was added');
      next.sourceAssignments.push(clone(sourceAssignment));
    }
    return next;
  }
  function remove(palette,id){
    return {...palette,colorIds:palette.colorIds.filter(x=>x!==id),sourceAssignments:palette.sourceAssignments.filter(r=>r.atlas_row_id!==id)};
  }
  function clarus(palette,colors){
    const byId=new Map(colors.map(c=>[c.id,c]));
    return {format:'ATLAS_CLARUS_PALETTE',version:'1.2',palette_name:'ATLAS Clarus Hover Palette',workflow:WORKFLOW,
      master_sha256:MASTER,row_id_base:0,freeze_status:'FROZEN',measured_qc_status:'NOT_MEASURED',
      references:palette.colorIds.map((id,index)=>{const c=byId.get(id);return {palette_index:index,atlas_row_id:id,
        reference:c.ref,master_rgb:[...c.rgb],master_hex:c.hex,master_lab:[...c.lab]};}),
      source_assignments:clone(palette.sourceAssignments)};
  }
  global.ATLAS_CLARUS_HOVER_PROVENANCE={MASTER,WORKFLOW,KEY,LEGACY_KEY,MAX_SOURCES,MAX_REFERENCES,
    validateSources,readHandoff,returnLink,empty,validatePalette,loadPalette,add,remove,clarus};
})(typeof window!=='undefined'?window:globalThis);
