/* Inclusive rectangle protection of frozen input pixels, separate from reference identity. */
(function(root){
  'use strict';
  const base=root.ATLAS_COLOUR_REDUCTION,hex=rgb=>'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const key=rgb=>(rgb[0]<<16)|(rgb[1]<<8)|rgb[2],d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
  function reduce(args,progress){
    const originals=args.originalRgbs===undefined?[]:args.originalRgbs;
    if(!Array.isArray(originals)||originals.length>256||!originals.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isInteger(v)&&v>=0&&v<=255)))throw Error('Colour Reduction: Invalid original RGB protection.');
    const rectangles=args.protectedRectangles===undefined?[]:args.protectedRectangles;
    if(!Array.isArray(rectangles)||rectangles.length>64||!rectangles.every(r=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[0]>=0&&r[1]>=0&&r[0]<=r[2]&&r[1]<=r[3]&&r[2]<args.width&&r[3]<args.height))throw Error('Colour Reduction: Invalid protected rectangle bounds.');
    if(!rectangles.length)return base.reduce(args,progress);
    // Base validation also rejects malformed dimensions, pixels, master and locks.
    const validation=base.reduce({...args,originalRgbs:[],k:args.k},()=>{});
    const rgba=args.rgba,masked=rgba.slice(),mask=new Uint8Array(args.width*args.height);
    for(const [x0,y0,x1,y1]of rectangles)for(let y=y0;y<=y1;y++)mask.fill(1,y*args.width+x0,y*args.width+x1+1);
    const globalKeys=new Set(originals.map(key)),present=new Set(),pinColors=new Map();let rest=0,protectedPixels=0,protectedVisible=0;
    for(let p=0;p<mask.length;p++){
      const i=p*4,k=key(rgba.subarray(i,i+3));
      if(rgba[i+3]&&globalKeys.has(k)){mask[p]=1;present.add(k);}
      if(mask[p]){
        protectedPixels++;
        if(rgba[i+3]){protectedVisible++;pinColors.set(k,Array.from(rgba.subarray(i,i+3)));if(pinColors.size>args.k)throw Error('Colour Reduction: Protected area colours exceed the colour limit. Increase it or shrink the selection; no pixels were changed.');}
        masked[i+3]=0;
      }else if(rgba[i+3])rest++;
    }
    if(present.size!==globalKeys.size)throw Error('Colour Reduction: Each protected original RGB must occur in a visible source pixel.');
    const pins=[...pinColors.values()].sort((a,b)=>key(a)-key(b)),pinMap=new Map(pins.map((rgb,i)=>[key(rgb),i]));
    const budget=args.k-pins.length;
    if(budget<0||(rest&&budget<1)||new Set(args.lockedIds||[]).size>budget)throw Error('Colour Reduction: Protected originals and Atlas references exceed the colour limit. Increase it; no protection was dropped.');
    // Each original reserves one slot; reference slots are separate even if RGB matches.
    const reduced=rest?base.reduce({...args,originalRgbs:[],rgba:masked,k:budget},progress):validation;
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
      const index=mask[p]?offset+pinMap.get(k):reduced.indices[p],c=palette[index];indices[p]=index;
      if(mask[p])c.pixel_count++;
      pixels.set(c.rgb,i);if(c.rgb.some((v,j)=>v!==rgb[j]))changed++;
      const ref=byId.get(row).rgb,e=d2(rgb,ref);source+=e;max=Math.max(max,e);total+=d2(rgb,c.rgb);reduction+=d2(ref,c.rgb);
      const m=row+':'+index;mapping.set(m,(mapping.get(m)||0)+1);
    }
    const collisions=[];const groups=new Map();
    for(const c of palette.filter(c=>c.kind==='ORIGINAL_RGB')){const row=c.source_atlas_row_id;const g=groups.get(row)||[];g.push(c.hex);groups.set(row,g);}
    for(const [row,values]of groups)if(values.length>1)collisions.push({atlas_row_id:row,original_hex:values});
    const report={...validation.report,schema:'atlas-clarus-colour-reduction/1.2',method:'ATLAS_RGB_WEIGHTED_MEDOIDS_WITH_PROTECTED_PIXELS_V1',
      output_palette_kind:'MIXED_ATLAS_REFERENCES_AND_ORIGINAL_RGB',requested_colours:args.k,
      selected_references:offset,used_references:palette.slice(0,offset).filter(c=>c.pixel_count>0).length,
      selected_output_entries:palette.length,used_rgb_colours:new Set(palette.filter(c=>c.pixel_count>0).map(c=>c.hex)).size,
      visible_pixels:visible,transparent_pixels:assignments.length-visible,partial_alpha_pixels:partial,
      source_unique_visible_rgb:seen.size,source_assigned_references:hist.size,changed_visible_pixels:changed,
      errors:{metric:'SQUARED_8BIT_SRGB_NOT_DELTA_E',source_to_full_master_mean:source/visible,source_to_full_master_max:max,full_master_to_output_mean:reduction/visible,source_to_output_mean:total/visible},
      original_rgb_protection:{scope:'ALL_VISIBLE_PIXELS_WITH_EXACT_RGB',reserved_slots:globalKeys.size,rgbs:[...new Map(originals.map(c=>[key(c),c.slice()])).values()],reference_collisions:collisions},palette,
      protected_source_palette:{reserved_slots:pins.length},
      rectangle_protection:{coordinate_base:0,bounds:'INCLUSIVE',rectangles:rectangles.map(r=>r.slice()),mask:'protected-pixel-mask.u8',mask_encoding:'ROW_MAJOR_UINT8_0_OR_1_INCLUDES_GLOBAL_RGB_LOCKS',protected_pixels:protectedPixels,protected_visible_pixels:protectedVisible,protected_transparent_pixels:protectedPixels-protectedVisible,unique_visible_protected_rgb:pins.length,policy:'EXACT_BROWSER_DECODED_RGBA8'},
      reference_mapping_kind:'SOURCE_REFERENCE_TO_MULTIPLE_OUTPUT_ENTRIES',reference_mapping:[...mapping].map(([k,count])=>{const [row,index]=k.split(':').map(Number);return {source_atlas_row_id:row,output_palette_index:index,pixel_count:count};})};
    return {pixels,indices,assignments,protectionMask:mask,report};
  }
  root.ATLAS_COLOUR_REDUCTION={...base,reduce};
})(typeof window==='undefined'?globalThis:window);
