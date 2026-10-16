/* Four-connected small-area cleanup; immutable source, palette and protected pixels. */
(function(root){
  'use strict';
  function cleanup(result,input,minPixels){
    if(!Number.isInteger(minPixels)||minPixels<1||minPixels>1000000)throw Error('Choose a minimum area of 1–1,000,000 pixels.');
    const {width,height,rgba}=input,n=width*height;
    if(result.indices.length!==n||rgba.length!==n*4)throw Error('Cleanup dimensions do not match.');
    const palette=result.report.palette,labels=new Int32Array(n).fill(-1),queue=new Int32Array(n),components=[];
    const protectedAt=p=>!!result.protectionMask?.[p]||!!palette[result.indices[p]]?.protected;
    function neighbors(p,fn){const x=p%width;if(x)fn(p-1);if(x+1<width)fn(p+1);if(p>=width)fn(p-width);if(p+width<n)fn(p+width);}
    for(let p=0;p<n;p++){
      if(labels[p]!==-1||!rgba[p*4+3])continue;
      const id=components.length,index=result.indices[p];let head=0,tail=1,protectedPixels=false;queue[0]=p;labels[p]=id;
      while(head<tail){const q=queue[head++];protectedPixels||=protectedAt(q);neighbors(q,v=>{if(labels[v]===-1&&rgba[v*4+3]&&result.indices[v]===index){labels[v]=id;queue[tail++]=v;}});}
      components.push({size:tail,index,protectedPixels,target:index,borders:new Map()});
    }
    for(let p=0;p<n;p++){
      const id=labels[p];if(id<0)continue;const c=components[id];if(c.size>=minPixels||c.protectedPixels)continue;
      neighbors(p,v=>{const other=labels[v];if(other<0||other===id)return;const b=components[other];
        // Only absorb into a larger neighbour, or the lower-labelled equal-sized one.
        if(b.size>c.size||(b.size===c.size&&other<id))c.borders.set(other,(c.borders.get(other)||0)+1);
      });
    }
    let merged=0;
    components.forEach(c=>{let best=null,edges=-1;for(const [id,count]of c.borders){if(count>edges||(count===edges&&(best===null||id<best))){best=id;edges=count;}}if(best!==null){c.target=components[best].index;merged++;}});
    const pixels=result.pixels.slice(),indices=result.indices.slice();let changed=0;
    for(let p=0;p<n;p++){const id=labels[p];if(id<0)continue;const index=components[id].target;if(index!==indices[p]){indices[p]=index;pixels.set(palette[index].rgb,p*4);changed++;}}
    const report=JSON.parse(JSON.stringify(result.report));report.palette.forEach(c=>c.pixel_count=0);
    let sourceError=0,changedFromSource=0;const mapping=new Map();
    for(let p=0;p<n;p++){const i=p*4;if(!rgba[i+3])continue;report.palette[indices[p]].pixel_count++;let different=false;
      for(let j=0;j<3;j++){sourceError+=(rgba[i+j]-pixels[i+j])**2;different||=rgba[i+j]!==pixels[i+j];}if(different)changedFromSource++;
      const key=result.assignments[p]+':'+indices[p];mapping.set(key,(mapping.get(key)||0)+1);
    }
    report.used_rgb_colours=new Set(report.palette.filter(c=>c.pixel_count).map(c=>c.hex)).size;
    report.used_references=report.palette.filter(c=>c.pixel_count&&c.kind!=='ORIGINAL_RGB').length;
    report.changed_visible_pixels=changedFromSource;report.errors.source_to_output_mean=sourceError/report.visible_pixels;
    // The old reduction error described the uncleaned image, so do not export it as current.
    delete report.errors.full_master_to_reduced_mean;delete report.errors.full_master_to_output_mean;
    report.reference_mapping_kind='FULL_MASTER_REFERENCE_TO_MULTIPLE_OUTPUT_ENTRIES';
    report.reference_mapping=[...mapping].map(([key,pixel_count])=>{const [source_atlas_row_id,output_palette_index]=key.split(':').map(Number);return {source_atlas_row_id,output_palette_index,pixel_count};});
    report.area_cleanup={method:'FOUR_CONNECTED_SMALL_COMPONENTS_SINGLE_PASS_V1',minimum_pixels:minPixels,connectivity:4,merged_components:merged,changed_pixels:changed,protection:'EXPLICIT_MASK_AND_ALL_PROTECTED_PALETTE_ENTRIES',palette_policy:'EXISTING_ENTRIES_ONLY',alpha_policy:'UNCHANGED',scope:'DERIVED_REDUCED_IMAGE'};
    return {...result,pixels,indices,report};
  }
  root.ATLAS_COLOUR_REDUCTION_CLEANUP={cleanup};
})(typeof window==='undefined'?globalThis:window);
