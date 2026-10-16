/* Library-constrained RGB reduction. Full-master identity stays independent. */
(function(root){
  'use strict';
  const base=root.ATLAS_COLOUR_REDUCTION;
  const need=(ok,msg)=>{if(!ok)throw Error('Colour Reduction: '+msg);};
  const key=c=>(c[0]<<16)|(c[1]<<8)|c[2];
  const d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
  function reduce(args,progress){
    if(args.protectionMode!=='LIBRARY_REFERENCE')return base.reduce(args,progress);
    const ids=args.libraryIds;
    need(Array.isArray(ids)&&ids.length>0&&ids.every(Number.isInteger),'Choose a non-empty reference library.');
    const byId=new Map(args.colors.map(c=>[c.id,c])),allowed=new Set(ids);
    need(allowed.size===ids.length&&ids.every(id=>byId.has(id)),'Invalid library reference IDs.');
    const colors=ids.map(id=>byId.get(id));
    const binding=root.ATLAS_CLARUS_PKL_IMAGE.create(colors,args.master);
    // Validate every legacy input, including rectangles and original occurrence.
    // A generous validation budget does not constrain the actual output budget.
    const full=base.reduce({...args,k:256,lockedIds:[],originalRgbs:[],protectedRectangles:[]},()=>{});
    const rectangles=args.protectedRectangles===undefined?[]:args.protectedRectangles,originals=args.originalRgbs===undefined?[]:args.originalRgbs;
    need(Array.isArray(rectangles)&&rectangles.length<=64&&rectangles.every(r=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[0]>=0&&r[1]>=0&&r[0]<=r[2]&&r[1]<=r[3]&&r[2]<args.width&&r[3]<args.height),'Invalid protected rectangle bounds.');
    need(Array.isArray(originals)&&originals.length<=256&&originals.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isInteger(v)&&v>=0&&v<=255)),'Invalid protected source RGB.');
    need(Array.isArray(args.lockedIds||[])&&(args.lockedIds||[]).every(id=>Number.isInteger(id)&&allowed.has(id)),'A protected reference is outside the selected library.');
    const locks=new Set(args.lockedIds||[]),globalKeys=new Set(originals.map(key)),present=new Set(),mask=new Uint8Array(args.width*args.height),bindings=new Map();
    for(const [x0,y0,x1,y1]of rectangles)for(let y=y0;y<=y1;y++)mask.fill(1,y*args.width+x0,y*args.width+x1+1);
    let protectedVisible=0;
    for(let p=0;p<mask.length;p++){
      const i=p*4,rgb=Array.from(args.rgba.subarray(i,i+3)),k=key(rgb);
      if(args.rgba[i+3]&&globalKeys.has(k)){mask[p]=1;present.add(k);}
      if(mask[p]&&args.rgba[i+3]){protectedVisible++;let b=bindings.get(k);if(!b){const ref=binding.nearest(rgb);b={source_rgb:rgb,atlas_row_id:ref.row.id,rgb_squared_distance:ref.d2,pixel_count:0};bindings.set(k,b);}b.pixel_count++;locks.add(b.atlas_row_id);}
    }
    need(present.size===globalKeys.size,'Each protected source RGB must occur in a visible source pixel.');
    need(locks.size<=args.k,'Protected library references exceed the colour limit. Increase it or reduce the selection; no protection was dropped.');
    const result=base.reduce({...args,colors,lockedIds:[...locks],originalRgbs:[],protectedRectangles:[]},progress);
    const libraryAssignments=result.assignments;
    result.assignments=full.assignments;result.protectionMask=mask;
    const mapping=new Map();let sourceError=0,max=0,reductionError=0;
    for(let p=0;p<mask.length;p++){
      const i=p*4;if(!args.rgba[i+3])continue;
      const row=byId.get(full.assignments[p]),rgb=Array.from(args.rgba.subarray(i,i+3)),e=d2(rgb,row.rgb);
      sourceError+=e;max=Math.max(max,e);reductionError+=d2(row.rgb,Array.from(result.pixels.subarray(i,i+3)));
      const k=full.assignments[p]+':'+result.indices[p];mapping.set(k,(mapping.get(k)||0)+1);
      if(mask[p])need(result.report.palette[result.indices[p]].atlas_row_id===libraryAssignments[p],'Protected reference changed.');
    }
    const r=result.report;
    Object.assign(r,{schema:'atlas-clarus-colour-reduction/1.3',method:'ATLAS_LIBRARY_RGB_WEIGHTED_MEDOIDS_WITH_REFERENCE_LOCKS_V1',
      source_assignment:full.report.source_assignment,reduction_basis:'SOURCE_RGB_TO_SELECTED_LIBRARY_THEN_WEIGHTED_REFERENCE_MEDOIDS',
      source_assigned_references:full.report.source_assigned_references,
      library:{id:args.libraryId||null,name:args.libraryName||null,reference_ids:ids.slice().sort((a,b)=>a-b),assignment:'RGB_NEAREST_LOWER_ROW_ID_TIEBREAK'},
      reference_protection:{policy:'CONVERT_TO_LIBRARY_REFERENCE_THEN_LOCK',protected_references:locks.size,protected_visible_pixels:protectedVisible,source_bindings:[...bindings.values()].sort((a,b)=>key(a.source_rgb)-key(b.source_rgb)),original_rgbs:originals.map(c=>c.slice()),rectangles:rectangles.map(r=>r.slice()),mask:'protected-pixel-mask.u8'},
      reference_mapping_kind:'FULL_MASTER_REFERENCE_TO_MULTIPLE_OUTPUT_ENTRIES',reference_mapping:[...mapping].map(([k,pixel_count])=>{const [source_atlas_row_id,output_palette_index]=k.split(':').map(Number);return {source_atlas_row_id,output_palette_index,pixel_count};})});
    r.errors={...r.errors,source_to_full_master_mean:sourceError/r.visible_pixels,source_to_full_master_max:max,full_master_to_reduced_mean:reductionError/r.visible_pixels};
    return result;
  }
  root.ATLAS_COLOUR_REDUCTION={...base,reduce};
})(typeof window==='undefined'?globalThis:window);
