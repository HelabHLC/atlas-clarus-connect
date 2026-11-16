/* Library-constrained RGB reduction. Full-master identity stays independent. */
(function(root){
  'use strict';
  const base=root.ATLAS_COLOUR_REDUCTION;
  const need=(ok,msg)=>{if(!ok)throw Error('Colour Reduction: '+msg);};
  const d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
  function reduce(args,progress){
    if(args.protectionMode!=='LIBRARY_REFERENCE'){need(!args.regionCorrections?.length,'Region corrections require library mode.');return base.reduce(args,progress);}
    const ids=args.libraryIds;
    need(Array.isArray(ids)&&ids.length>0&&ids.every(Number.isInteger),'Choose a non-empty reference library.');
    const byId=new Map(args.colors.map(c=>[c.id,c])),allowed=new Set(ids);
    need(allowed.size===ids.length&&ids.every(id=>byId.has(id)),'Invalid library reference IDs.');
    const colors=ids.map(id=>byId.get(id));
    // Validate every legacy input, including rectangles and original occurrence.
    // A generous validation budget does not constrain the actual output budget.
    const full=base.reduce({...args,k:256,lockedIds:[],originalRgbs:[],protectedRectangles:[]},()=>{});
    const rectangles=args.protectedRectangles||[],originals=args.originalRgbs||[],corrections=args.regionCorrections||[];
    const plan=root.ATLAS_COLOUR_CORRECTIONS.plan(args),{mask,forced,protectedVisible}=plan,locks=new Set(plan.locks);
    need(locks.size<=args.k,'Protected library references exceed the colour limit. Increase it or reduce the selection; no protection was dropped.');
    const result=base.reduce({...args,colors,lockedIds:[...locks],originalRgbs:[],protectedRectangles:[]},progress);
    const libraryAssignments=result.assignments;
    const paletteIndex=new Map(result.report.palette.map((c,i)=>[c.atlas_row_id,i]));
    for(let p=0;p<mask.length;p++)if(forced[p]>=0&&args.rgba[p*4+3]){const index=paletteIndex.get(forced[p]);need(index!==undefined,'Correction reference was not retained.');result.indices[p]=index;result.pixels.set(byId.get(forced[p]).rgb,p*4);}
    result.report.palette.forEach(c=>c.pixel_count=0);
    let totalError=0,changed=0;
    for(let p=0;p<mask.length;p++){const i=p*4;if(!args.rgba[i+3])continue;result.report.palette[result.indices[p]].pixel_count++;const rgb=Array.from(result.pixels.subarray(i,i+3));totalError+=d2(Array.from(args.rgba.subarray(i,i+3)),rgb);if(rgb.some((v,j)=>v!==args.rgba[i+j]))changed++;}
    result.report.used_rgb_colours=new Set(result.report.palette.filter(c=>c.pixel_count).map(c=>c.hex)).size;
    result.report.used_references=result.report.palette.filter(c=>c.pixel_count).length;result.report.changed_visible_pixels=changed;
    result.report.errors.source_to_output_mean=totalError/result.report.visible_pixels;
    result.assignments=full.assignments;result.protectionMask=mask;
    const mapping=new Map();let sourceError=0,max=0,reductionError=0;
    for(let p=0;p<mask.length;p++){
      const i=p*4;if(!args.rgba[i+3])continue;
      const row=byId.get(full.assignments[p]),rgb=Array.from(args.rgba.subarray(i,i+3)),e=d2(rgb,row.rgb);
      sourceError+=e;max=Math.max(max,e);reductionError+=d2(row.rgb,Array.from(result.pixels.subarray(i,i+3)));
      const k=full.assignments[p]+':'+result.indices[p];mapping.set(k,(mapping.get(k)||0)+1);
      if(mask[p])need(result.report.palette[result.indices[p]].atlas_row_id===(forced[p]>=0?forced[p]:libraryAssignments[p]),'Protected reference changed.');
    }
    const r=result.report;
    Object.assign(r,{schema:corrections.length?'atlas-clarus-colour-reduction/1.4':'atlas-clarus-colour-reduction/1.3',method:corrections.length?'ATLAS_LIBRARY_RGB_WEIGHTED_MEDOIDS_WITH_REGION_CORRECTIONS_V2':'ATLAS_LIBRARY_RGB_WEIGHTED_MEDOIDS_WITH_REFERENCE_LOCKS_V1',
      source_assignment:full.report.source_assignment,reduction_basis:'SOURCE_RGB_TO_SELECTED_LIBRARY_THEN_WEIGHTED_REFERENCE_MEDOIDS',
      source_assigned_references:full.report.source_assigned_references,
      library:{id:args.libraryId||null,name:args.libraryName||null,reference_ids:ids.slice().sort((a,b)=>a-b),assignment:'RGB_NEAREST_LOWER_ROW_ID_TIEBREAK'},
      reference_protection:{policy:corrections.length?'SOURCE_BASED_REGION_CORRECTIONS_THEN_LOCK':'CONVERT_TO_LIBRARY_REFERENCE_THEN_LOCK',protected_references:locks.size,protected_visible_pixels:protectedVisible,source_bindings:plan.bindings,original_rgbs:originals.map(c=>c.slice()),rectangles:rectangles.map(r=>r.slice()),corrections:corrections.map(c=>({mode:c.mode,rectangle:c.rectangle.slice(),...(c.mode==='REFERENCE'?{atlas_row_id:c.atlas_row_id}:{})})),mask:'protected-pixel-mask.u8'},
      reference_mapping_kind:'FULL_MASTER_REFERENCE_TO_MULTIPLE_OUTPUT_ENTRIES',reference_mapping:[...mapping].map(([k,pixel_count])=>{const [source_atlas_row_id,output_palette_index]=k.split(':').map(Number);return {source_atlas_row_id,output_palette_index,pixel_count};})});
    r.errors={...r.errors,source_to_full_master_mean:sourceError/r.visible_pixels,source_to_full_master_max:max,full_master_to_reduced_mean:reductionError/r.visible_pixels};
    return result;
  }
  root.ATLAS_COLOUR_REDUCTION={...base,reduce};
})(typeof window==='undefined'?globalThis:window);
