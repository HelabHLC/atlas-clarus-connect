/* Opt-in exact source RGB protection. Frozen reference reduction stays unchanged. */
(function(root){
  'use strict';
  const base=root.ATLAS_COLOUR_REDUCTION,hex=rgb=>'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const key=rgb=>(rgb[0]<<16)|(rgb[1]<<8)|rgb[2],d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
  function reduce(args,progress){
    const originals=args.originalRgbs===undefined?[]:args.originalRgbs;
    if(!Array.isArray(originals)||originals.length>256||!originals.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isInteger(v)&&v>=0&&v<=255)))throw Error('Colour Reduction: Invalid original RGB protection.');
    if(!originals.length)return base.reduce(args,progress);
    // Base validation also rejects malformed dimensions, pixels, master and locks.
    const validation=base.reduce({...args,k:args.k},()=>{});
    const pins=[...new Map(originals.map(rgb=>[key(rgb),rgb.slice()])).values()].sort((a,b)=>key(a)-key(b));
    const pinMap=new Map(pins.map((rgb,i)=>[key(rgb),i])),rgba=args.rgba,masked=rgba.slice();
    const present=new Set();let rest=0;
    for(let i=0;i<rgba.length;i+=4){if(!rgba[i+3])continue;const k=key(rgba.subarray(i,i+3));if(pinMap.has(k)){masked[i+3]=0;present.add(k);}else rest++;}
    if(present.size!==pins.length)throw Error('Colour Reduction: Each protected original RGB must occur in a visible source pixel.');
    const budget=args.k-pins.length;
    if(budget<0||(rest&&budget<1)||(args.lockedIds||[]).length>budget)throw Error('Colour Reduction: Protected originals and Atlas references exceed the colour limit. Increase it; no protection was dropped.');
    // Each original reserves one slot; reference slots are separate even if RGB matches.
    const reduced=rest?base.reduce({...args,rgba:masked,k:budget},progress):validation;
    const palette=(rest?reduced.report.palette:[]).map(c=>({...c,kind:'ATLAS_REFERENCE'}));
    if(!rest&&(args.lockedIds||[]).length)throw Error('Colour Reduction: No unprotected pixels remain for protected Atlas references.');
    const binding=root.ATLAS_CLARUS_PKL_IMAGE.create(args.colors,args.master),byId=new Map(args.colors.map(c=>[c.id,c]));
    const offset=palette.length;
    for(const rgb of pins){const c=binding.nearest(rgb).row;palette.push({index:palette.length,kind:'ORIGINAL_RGB',atlas_row_id:null,source_atlas_row_id:c.id,source_atlas_reference:c.ref,reference:'Original '+hex(rgb),rgb,hex:hex(rgb),protected:true,pixel_count:0});}
    const pixels=rgba.slice(),assignments=validation.assignments,indices=new Uint16Array(assignments.length),hist=new Map(),mapping=new Map(),seen=new Set();
    let changed=0,total=0,reduction=0,source=0,max=0,visible=0,partial=0;
    for(let p=0;p<assignments.length;p++){
      const i=p*4;if(!rgba[i+3]){indices[p]=65535;continue;}
      visible++;if(rgba[i+3]<255)partial++;
      const rgb=Array.from(rgba.subarray(i,i+3)),k=key(rgb),row=assignments[p];seen.add(k);hist.set(row,(hist.get(row)||0)+1);
      const index=pinMap.has(k)?offset+pinMap.get(k):reduced.indices[p],c=palette[index];indices[p]=index;
      if(pinMap.has(k))c.pixel_count++;
      pixels.set(c.rgb,i);if(c.rgb.some((v,j)=>v!==rgb[j]))changed++;
      const ref=byId.get(row).rgb,e=d2(rgb,ref);source+=e;max=Math.max(max,e);total+=d2(rgb,c.rgb);reduction+=d2(ref,c.rgb);
      const m=row+':'+index;mapping.set(m,(mapping.get(m)||0)+1);
    }
    const collisions=[];const groups=new Map();
    for(const c of palette.filter(c=>c.kind==='ORIGINAL_RGB')){const row=c.source_atlas_row_id;const g=groups.get(row)||[];g.push(c.hex);groups.set(row,g);}
    for(const [row,values]of groups)if(values.length>1)collisions.push({atlas_row_id:row,original_hex:values});
    const report={...validation.report,schema:'atlas-clarus-colour-reduction/1.1',method:'ATLAS_RGB_WEIGHTED_MEDOIDS_WITH_EXACT_ORIGINALS_V1',
      output_palette_kind:'MIXED_ATLAS_REFERENCES_AND_ORIGINAL_RGB',requested_colours:args.k,
      selected_references:offset,used_references:palette.slice(0,offset).filter(c=>c.pixel_count>0).length,
      selected_output_entries:palette.length,used_rgb_colours:new Set(palette.filter(c=>c.pixel_count>0).map(c=>c.hex)).size,
      visible_pixels:visible,transparent_pixels:assignments.length-visible,partial_alpha_pixels:partial,
      source_unique_visible_rgb:seen.size,source_assigned_references:hist.size,changed_visible_pixels:changed,
      errors:{metric:'SQUARED_8BIT_SRGB_NOT_DELTA_E',source_to_full_master_mean:source/visible,source_to_full_master_max:max,full_master_to_output_mean:reduction/visible,source_to_output_mean:total/visible},
      original_rgb_protection:{scope:'ALL_VISIBLE_PIXELS_WITH_EXACT_RGB',reserved_slots:pins.length,rgbs:pins,reference_collisions:collisions},palette,
      reference_mapping_kind:'SOURCE_REFERENCE_TO_MULTIPLE_OUTPUT_ENTRIES',reference_mapping:[...mapping].map(([k,count])=>{const [row,index]=k.split(':').map(Number);return {source_atlas_row_id:row,output_palette_index:index,pixel_count:count};})};
    return {pixels,indices,assignments,report};
  }
  root.ATLAS_COLOUR_REDUCTION={...base,reduce};
})(typeof window==='undefined'?globalThis:window);
