/* Camera observations stay separate from immutable ATLAS reference identities. */
(function(root){
  'use strict';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  function hex(rgb){return '#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
  function mean(bytes){
    if(!bytes.length||bytes.length%4)throw Error('Invalid camera sample');
    const sums=[0,0,0];let count=0;
    for(let i=0;i<bytes.length;i+=4){if(bytes[i+3]<128)continue;count++;for(let c=0;c<3;c++)sums[c]+=bytes[i+c];}
    if(!count)throw Error('No visible camera pixels');
    return sums.map(n=>Math.round(n/count));
  }
  function canToggleTorch(capabilities){
    const value=capabilities?.torch;
    return Array.isArray(value)?value.includes(true)&&value.includes(false):value===true;
  }
  function create(data){
    if(data?.master_sha256!==MASTER||data.colors?.length!==13283)throw Error('Camera reference master unavailable');
    const byId=new Map(data.colors.map(c=>[c.id,c]));
    if(byId.size!==13283)throw Error('Duplicate camera reference rows');
    for(const c of byId.values())if(!Number.isInteger(c.id)||typeof c.ref!=='string'||!Array.isArray(c.rgb)||c.rgb.length!==3||!c.rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw Error('Invalid camera reference row');
    function library(id){
      const view=data.views[id];
      if(!view||!Array.isArray(view.ids)||!view.ids.length)throw Error('Choose an available library');
      const rows=view.ids.map(id=>byId.get(Number(id)));
      if(rows.some(c=>!c))throw Error('Library contains unknown references');
      return {id,name:view.name,rows};
    }
    function match(rgb,lib){
      if(rgb.length!==3||!rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw Error('Invalid camera RGB');
      let best=null,distance=Infinity;
      for(const row of lib.rows){const d=row.rgb.reduce((sum,v,c)=>sum+(v-rgb[c])**2,0);if(d<distance||(d===distance&&row.id<best.id)){best=row;distance=d;}}
      return {source_rgb:rgb.slice(),source_hex:hex(rgb),atlas_row_id:best.id,atlas_reference:best.ref,reference_rgb:best.rgb.slice(),reference_hex:hex(best.rgb),rgb_squared_distance:distance,library_id:lib.id,library_name:lib.name,master_sha256:MASTER,assignment:'RGB_NEAREST_LOWER_ROW_ID_TIEBREAK',status:'CAMERA_ESTIMATE'};
    }
    return {library,match};
  }
  root.ATLAS_LIVE_CAMERA_CORE={create,mean,hex,canToggleTorch,MASTER};
})(typeof window==='undefined'?globalThis:window);
