(function(global){
  'use strict';
  const P=global.ATLAS_CLARUS_HOVER_PROVENANCE;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  async function hashFile(file){
    if(!global.crypto?.subtle||typeof file?.arrayBuffer!=='function')return null;
    try{return Array.from(new Uint8Array(await global.crypto.subtle.digest('SHA-256',await file.arrayBuffer())))
      .map(v=>v.toString(16).padStart(2,'0')).join('');}catch(_){return null;}
  }
  function capture(rgba,x,y,image,row,colors){
    if(!rgba||rgba.length!==4||!Array.from(rgba).every(v=>Number.isInteger(v)&&v>=0&&v<=255)||rgba[3]<128){
      throw Error('Pixel alpha below 128 or invalid source pixel; provenance handoff blocked');
    }
    const source=Array.from(rgba).slice(0,3);
    const record={schema_version:'1.0',source_rgb:source,source_hex:hex(source),color_space:'sRGB',bits_per_channel:8,
      source_representation:'BROWSER_DECODED_SRGB',atlas_row_id:row.id,reference:row.ref,
      reference_rgb:[...row.rgb],reference_hex:row.hex,master_sha256:P.MASTER,workflow:P.WORKFLOW,
      metric:'RGB_SQUARED_DISTANCE',distance_squared:source.reduce((sum,v,i)=>sum+(v-row.rgb[i])**2,0),
      tie_break:'LOWER_ATLAS_ROW_ID',sampling:{mode:'PIXEL_RGB',requested_size:1,centre:[x,y],bounds:[x,y,x,y],
        valid_pixel_count:1,channel_std:[0,0,0],alpha_threshold:128,rounding:'MATH_ROUND_PER_CHANNEL'},
      image:clone(image),signature_status:'NOT_SIGNED'};
    return P.validateSources([record],colors,[row.id])[0];
  }
  function checkReturn(params,saved,colors){
    for(const key of ['source','atlas_row_id','hlc','master_sha256']){
      if(params.getAll(key).length!==1)throw Error('Missing or duplicate return identity');
    }
    if(!saved||!['atlas-clarus-image-picker-handoff-v1','atlas-clarus-image-picker-handoff-v2'].includes(saved.schema)||
       saved.master_sha256!==P.MASTER||params.get('source')!=='hover-library-return'||
       !/^\d+$/.test(params.get('atlas_row_id'))||Number(params.get('atlas_row_id'))!==saved.atlas_row_id||
       !Number.isInteger(saved.atlas_row_id)||colors[saved.atlas_row_id]?.ref!==saved.reference||
       params.get('hlc')!==saved.reference||params.get('master_sha256')!==P.MASTER||
       !Number.isSafeInteger(saved.x)||!Number.isSafeInteger(saved.y)||saved.x<0||saved.y<0){
      throw Error('Saved handoff identity or coordinates mismatch');
    }
    if(saved.schema==='atlas-clarus-image-picker-handoff-v1'){
      if(params.has('source_assignment'))throw Error('Legacy state has no source record to verify');
      return null;
    }
    const expected=P.validateSources([saved.source_assignment],colors,[saved.atlas_row_id])[0];
    if(expected.sampling.mode!=='PIXEL_RGB'||expected.sampling.centre[0]!==saved.x||expected.sampling.centre[1]!==saved.y){
      throw Error('Saved sampling coordinates mismatch');
    }
    if(params.getAll('source_assignment').length!==1||params.get('source_assignment').length>16384){
      throw Error('Missing, duplicate or oversized return source record');
    }
    const received=P.validateSources([JSON.parse(params.get('source_assignment'))],colors,[saved.atlas_row_id])[0];
    if(JSON.stringify(received)!==JSON.stringify(expected))throw Error('Returned source record differs from the saved observation');
    return expected;
  }
  function verifyRestored(expected,rgba,image,colors){
    if(image.width!==expected.image.width||image.height!==expected.image.height||image.name!==expected.image.name||
       (expected.image.sha256!==null&&image.sha256!==expected.image.sha256)){
      throw Error('Restored image differs from the saved image');
    }
    const [x,y]=expected.sampling.centre;
    // Preserve explicit not-recorded hash rather than retroactively inventing it.
    const actual=capture(rgba,x,y,{...image,sha256:expected.image.sha256},colors[expected.atlas_row_id],colors);
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Restored source pixel differs from the saved observation');
    return actual;
  }
  global.ATLAS_CLARUS_PICKER_PROVENANCE={hashFile,capture,checkReturn,verifyRestored};
})(typeof window!=='undefined'?window:globalThis);
