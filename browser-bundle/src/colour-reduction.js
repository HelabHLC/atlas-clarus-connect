/* Deterministic RGB-only reduction AFTER immutable full-master assignment. */
(function(root){
  'use strict';
  const METHOD='ATLAS_RGB_WEIGHTED_MEDOIDS_V1',MAX_PIXELS=4194304;
  const need=(ok,msg)=>{if(!ok)throw Error('Colour Reduction: '+msg);};
  const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  const hex=rgb=>'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  function reduce({rgba,width,height,colors,master,k,lockedIds=[]},progress=()=>{}){
    need(Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=8192&&height<=8192&&width*height<=MAX_PIXELS,'Image exceeds the supported dimensions.');
    need(rgba instanceof Uint8Array&&rgba.length===width*height*4,'Expected complete RGBA8 pixels.');
    need(Number.isInteger(k)&&k>=1&&k<=256,'Choose 1–256 motif colours.');
    need(Array.isArray(lockedIds)&&lockedIds.every(Number.isInteger),'Invalid protected references.');
    const binding=root.ATLAS_CLARUS_PKL_IMAGE.create(colors,master),byId=new Map(colors.map(c=>[c.id,c]));
    need(colors.length<65535&&colors.every(c=>c.id>=0&&c.id<65535),'Reference IDs exceed the index format.');
    const locks=[...new Set(lockedIds)].sort((a,b)=>a-b);
    need(locks.every(id=>byId.has(id)),'A protected reference is outside the master.');
    need(locks.length<=k,'The number of protected references exceeds the selected colour limit.');
    const assigned=new Uint16Array(width*height),hist=new Map(),cache=new Map(),seen=new Uint8Array(1<<21);
    let visible=0,unique=0,partial=0,sourceError=0,maxSourceError=0;
    for(let p=0;p<assigned.length;p++){
      const i=p*4;if(!rgba[i+3]){assigned[p]=65535;continue;}
      visible++;if(rgba[i+3]<255)partial++;
      const key=(rgba[i]<<16)|(rgba[i+1]<<8)|rgba[i+2],bit=1<<(key&7);
      if(!(seen[key>>3]&bit)){seen[key>>3]|=bit;unique++;}
      let match=cache.get(key);
      if(!match){match=binding.nearest([rgba[i],rgba[i+1],rgba[i+2]]);if(cache.size>=32768)cache.clear();cache.set(key,match);}
      assigned[p]=match.row.id;hist.set(match.row.id,(hist.get(match.row.id)||0)+1);
      sourceError+=match.d2;maxSourceError=Math.max(maxSourceError,match.d2);
      if(p%65536===0)progress({stage:'assign',fraction:p/assigned.length});
    }
    need(visible>0,'The image has no visible pixels.');
    const points=[...hist].sort((a,b)=>a[0]-b[0]).map(([id,count])=>({id,count,rgb:byId.get(id).rgb}));
    const candidates=[...new Set([...hist.keys(),...locks])].sort((a,b)=>a-b);
    const target=Math.min(k,candidates.length),lockSet=new Set(locks);
    let palette=locks.slice();
    // Weighted farthest-first seeds; integer RGB error, then lower row ID.
    if(!palette.length)palette.push(points.slice().sort((a,b)=>b.count-a.count||a.id-b.id)[0].id);
    const distances=new Float64Array(points.length).fill(Infinity),seeded=new Set(palette);
    function updateDistances(id){const rgb=byId.get(id).rgb;points.forEach((p,i)=>{distances[i]=Math.min(distances[i],d2(p.rgb,rgb));});}
    palette.forEach(updateDistances);
    while(palette.length<target){
      let best=null,score=-1;
      points.forEach((p,i)=>{if(seeded.has(p.id))return;
        const value=p.count*distances[i];
        if(value>score||(value===score&&p.id<best)){score=value;best=p.id;}
      });
      if(best===null)break;palette.push(best);seeded.add(best);updateDistances(best);
    }
    function nearestId(rgb,ids){let winner=ids[0],distance=Infinity;
      for(const id of ids){const d=d2(rgb,byId.get(id).rgb);if(d<distance||(d===distance&&id<winner)){winner=id;distance=d;}}
      return winner;
    }
    // Snap weighted centroids to an existing cluster member, never invent RGB.
    // Fixed iteration bound plus stable tie-breaks gives reproducible results.
    for(let iteration=0;iteration<8;iteration++){
      const groups=new Map(palette.map(id=>[id,[]]));
      for(const p of points)groups.get(palette.includes(p.id)?p.id:nearestId(p.rgb,palette)).push(p);
      const next=palette.map(id=>{
        const group=groups.get(id);if(lockSet.has(id)||!group.length)return id;
        const sum=[0,0,0];let weight=0;
        for(const p of group){weight+=p.count;p.rgb.forEach((v,j)=>sum[j]+=v*p.count);}
        const mean=sum.map(v=>v/weight);let best=id,error=Infinity;
        for(const p of group){const e=d2(p.rgb,mean);if(e<error||(e===error&&p.id<best)){best=p.id;error=e;}}
        return best;
      }).sort((a,b)=>a-b);
      if(next.join()===palette.slice().sort((a,b)=>a-b).join()){palette=next;break;}palette=next;
    }
    palette.sort((a,b)=>a-b);
    const indices=new Uint16Array(assigned.length),output=rgba.slice(),counts=new Map(palette.map(id=>[id,0]));
    const mapping=new Map(points.map(p=>[p.id,palette.includes(p.id)?p.id:nearestId(p.rgb,palette)]));
    const paletteIndex=new Map(palette.map((id,i)=>[id,i]));
    let reductionError=0,totalError=0,changed=0;
    for(let p=0;p<assigned.length;p++){
      const id=assigned[p],i=p*4;if(id===65535){indices[p]=65535;continue;}
      const chosen=mapping.get(id),rgb=byId.get(chosen).rgb;
      indices[p]=paletteIndex.get(chosen);counts.set(chosen,counts.get(chosen)+1);
      reductionError+=d2(byId.get(id).rgb,rgb);totalError+=d2([rgba[i],rgba[i+1],rgba[i+2]],rgb);
      if(rgb.some((v,j)=>v!==rgba[i+j]))changed++;
      output.set(rgb,i);
    }
    progress({stage:'complete',fraction:1});
    return {pixels:output,indices,assignments:assigned,
      report:{schema:'atlas-clarus-colour-reduction/1.0',method:METHOD,master_sha256:master,width,height,
        colour_space:'BROWSER_DECODED_SRGB_RGBA8',source_assignment:'FULL_MASTER_RGB_NEAREST_LOWER_ROW_ID_TIEBREAK',
        reduction_basis:'FULL_MASTER_REFERENCE_RGB',requested_colours:k,selected_references:palette.length,
        used_references:palette.filter(id=>counts.get(id)>0).length,used_rgb_colours:new Set(palette.filter(id=>counts.get(id)>0).map(id=>hex(byId.get(id).rgb))).size,
        visible_pixels:visible,transparent_pixels:assigned.length-visible,partial_alpha_pixels:partial,
        source_unique_visible_rgb:unique,source_assigned_references:hist.size,changed_visible_pixels:changed,
        alpha_policy:'PRESERVED_EXACTLY_ZERO_ALPHA_RGB_UNCHANGED',dithering:false,physical_qc:'NOT_MEASURED',
        errors:{metric:'SQUARED_8BIT_SRGB_NOT_DELTA_E',source_to_full_master_mean:sourceError/visible,source_to_full_master_max:maxSourceError,
          full_master_to_reduced_mean:reductionError/visible,source_to_output_mean:totalError/visible},
        protected_ids:locks,palette:palette.map((id,index)=>({index,atlas_row_id:id,reference:byId.get(id).ref,rgb:byId.get(id).rgb.slice(),hex:hex(byId.get(id).rgb),protected:lockSet.has(id),pixel_count:counts.get(id)})),
        reference_mapping:points.map(p=>({source_atlas_row_id:p.id,output_atlas_row_id:mapping.get(p.id),pixel_count:p.count}))}};
  }
  function assignmentBytes(ids){const out=new Uint8Array(ids.length*2),v=new DataView(out.buffer);ids.forEach((id,i)=>v.setUint16(i*2,id,true));return out;}
  root.ATLAS_COLOUR_REDUCTION={reduce,assignmentBytes,METHOD};
})(typeof window==='undefined'?globalThis:window);
