/* ATLAS Clarus digital HLC extension. Derived colourimetry, not measured data.
 * Equations/matrices: W3C CSS Color 4 (2026-11-03), section 19.
 * D50/2° Lab; Bradford adaptation to D65 for sRGB, Display-P3 and Rec.2020.
 */
(function(root){
  'use strict';
  const VERSION='1.0.0', SCHEMA='ATLAS_CLARUS_DIGITAL_COLOURS_V1';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const WHITE=[.3457/.3585,1,(1-.3457-.3585)/.3585], EPS=1e-7;
  const ADAPT=[[.955473421488075,-.02309845494876471,.06325924320057072],[-.0283697093338637,1.0099953980813041,.021041441191917323],[.012314014864481998,-.020507649298898964,1.330365926242124]];
  const UNADAPT=[[1.0479297925449969,.022946870601609652,-.05019226628920524],[.02962780877005599,.9904344267538799,-.017073799063418826],[-.009243040646204504,.015055191490298152,.7518742814281371]];
  const MATRICES={
    srgb:[[12831/3959,-329/214,-1974/3959],[-851781/878810,1648619/878810,36519/878810],[705/12673,-2585/12673,705/667]],
    'display-p3':[[446124/178915,-333277/357830,-72051/178915],[-14852/17905,63121/35810,423/17905],[11844/330415,-50337/660830,316169/330415]],
    rec2020:[[30757411/17917100,-6372589/17917100,-4539589/17917100],[-19765991/29648200,47925759/29648200,467509/29648200],[792561/44930125,-1921689/44930125,42328811/44930125]],
    'prophoto-rgb':[[1.3457868816471583,-.25557208737979464,-.05110186497554526],[-.5446307051249019,1.5082477428451468,.02052744743642139],[0,0,1.2119675456389452]]
  };
  const INVERSE={
    srgb:[[506752/1228815,87881/245763,12673/70218],[87098/409605,175762/245763,12673/175545],[7918/409605,87881/737289,1001167/1053270]],
    'display-p3':[[608311/1250200,189793/714400,198249/1000160],[35783/156275,247089/357200,198249/2500400],[0,32229/714400,5220557/5000800]],
    'prophoto-rgb':[[.7977666449006423,.13518129740053308,.0313477341283922],[.2880748288194013,.711835234241873,.00008993693872564],[0,0,.8251046025104602]]
  };
  const SPACES=Object.keys(MATRICES), INPUT_SPACES=Object.keys(INVERSE);
  const mul=(m,v)=>m.map(row=>row.reduce((sum,n,i)=>sum+n*v[i],0));
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const triple=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
  const round=n=>Number(n.toFixed(6));
  const component=n=>{const [i,f]=String(round(n)).split('.');return i.padStart(3,'0')+(f?'.'+f:'');};
  const hex=rgb=>'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const gamma=(x,space,inverse=false)=>{
    const sign=Math.sign(x),a=Math.abs(x);
    if(space==='prophoto-rgb')return sign*(inverse?(a<=16/512?a/16:a**1.8):(a<1/512?16*a:a**(1/1.8)));
    if(space==='rec2020')return sign*a**(inverse?2.4:1/2.4); // CSS SDR Rec.2020 / BT.1886
    return sign*(inverse?(a<=.04045?a/12.92:((a+.055)/1.055)**2.4):(a<=.0031308?12.92*a:1.055*a**(1/2.4)-.055));
  };
  function labToXYZ(lab){
    if(!triple(lab))throw Error('Invalid Lab');
    const f=[(lab[0]+16)/116+lab[1]/500,(lab[0]+16)/116,(lab[0]+16)/116-lab[2]/200];
    return f.map((v,i)=>(v**3>216/24389?v**3:(116*v-16)/(24389/27))*WHITE[i]);
  }
  function xyzToLab(xyz){const f=xyz.map((v,i)=>v/WHITE[i]).map(v=>v>216/24389?Math.cbrt(v):((24389/27)*v+16)/116);return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];}
  function representations(lab){
    const xyz50=labToXYZ(lab),xyz65=mul(ADAPT,xyz50),result={};
    for(const space of SPACES){
      const linear=mul(MATRICES[space],space==='prophoto-rgb'?xyz50:xyz65);
      const encoded=linear.map(v=>gamma(v,space)),inGamut=linear.every(v=>v>=-EPS&&v<=1+EPS);
      const preview=encoded.map(v=>Math.min(1,Math.max(0,v))),rgb8=preview.map(v=>Math.round(v*255));
      result[space]={linear_rgb:linear,encoded_rgb:encoded,in_gamut:inGamut,preview_rgb:preview,
        preview_rgb8:rgb8,preview_clipped:!inGamut,...(space==='srgb'?{preview_hex:hex(rgb8)}:{})};
    }
    return result;
  }
  function parseHLC(text){
    if(typeof text!=='string'||text.length>80)throw Error('HLC address required');
    const m=/^H(\d{1,3}(?:\.\d{1,6})?)_L(\d{1,3}(?:\.\d{1,6})?)_C(\d{1,3}(?:\.\d{1,6})?)$/i.exec(text.trim());
    if(!m)throw Error('Use H295_L040_C100 (up to six decimal places)');
    let [h,l,c]=m.slice(1).map(Number);
    if(h>360||l>100||c>200)throw Error('H: 0–360, L: 0–100, C: 0–200');
    if(c===0)h=0;else if(h===0)h=360;
    return {h,l,c,address:`H${component(h)}_L${component(l)}_C${component(c)}`};
  }
  function hlcLab(hlc){return [hlc.l,hlc.c*Math.cos(hlc.h*Math.PI/180),hlc.c*Math.sin(hlc.h*Math.PI/180)];}
  function labAddress(lab){
    const c=Math.hypot(lab[1],lab[2]);let h=c<.0000005?0:(Math.atan2(lab[2],lab[1])*180/Math.PI+360)%360;
    if(c>=.0000005&&(round(h)===360||round(h)===0))h=360;
    return `H${component(h)}_L${component(lab[0])}_C${component(c)}`;
  }
  function normaliseSource(source){
    if(!source||typeof source!=='object')throw Error('Source required');
    if(source.kind==='HLC'){
      if((source.illuminant!==undefined&&source.illuminant!=='D50')||(source.observer!==undefined&&source.observer!=='2deg'))throw Error('This HLC route requires D50 / 2deg');
      return {kind:'HLC',address:parseHLC(source.address).address,illuminant:'D50',observer:'2deg'};
    }
    if(source.kind==='RGB'&&INPUT_SPACES.includes(source.space)&&triple(source.values)&&source.values.every(v=>v>=0&&v<=1))return {kind:'RGB',space:source.space,values:source.values.slice(),encoding:'NORMALIZED_FLOAT'};
    throw Error('RGB requires a named colour space and three finite values from 0 to 1');
  }
  function sourceLab(source){
    if(source.kind==='HLC')return hlcLab(parseHLC(source.address));
    const xyz=mul(INVERSE[source.space],source.values.map(v=>gamma(v,source.space,true)));
    return xyzToLab(source.space==='prophoto-rgb'?xyz:mul(UNADAPT,xyz));
  }
  function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
  function context(data,digitalLibraries=null){
    if(data.master_sha256!==MASTER||!Array.isArray(data.colors)||data.colors.length!==13283)throw Error('Wrong master');
    const colors=JSON.parse(JSON.stringify(data.colors)),refs=new Map();
    colors.forEach((c,i)=>{if(c.id!==i||!triple(c.rgb)||!c.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255)||!triple(c.lab)||c.hex!==hex(c.rgb)||refs.has(c.ref))throw Error('Invalid master projection');refs.set(c.ref,c);});
    const views=JSON.parse(JSON.stringify(data.views||{}));
    for(const v of Object.values(views)){if(!Array.isArray(v.ids)||new Set(v.ids).size!==v.ids.length||!v.ids.every(id=>Number.isInteger(id)&&id>=0&&id<colors.length))throw Error('Invalid library membership');}
    const digital=digitalLibraries?JSON.parse(JSON.stringify(digitalLibraries)):null,digitalSets={};
    if(digital){
      if(digital.schema!=='ATLAS_DIGITAL_RGB_SOURCE_LISTS_V1'||digital.master_sha256!==MASTER)throw Error('Invalid digital libraries');
      for(const [id,lib] of Object.entries(digital.libraries)){
        if(!SPACES.includes(id)||!Array.isArray(lib.references)||lib.references.length!==lib.total)throw Error('Invalid digital library');
        digitalSets[id]=new Set(lib.references);
        if(digitalSets[id].size!==lib.total||lib.references.some(ref=>parseHLC(ref).address!==ref))throw Error('Invalid digital addresses');
        if(lib.references.filter(ref=>refs.has(ref)).length!==lib.master_count)throw Error('Invalid master/library join');
      }
    }
    const digitalMembership=address=>({status:digital?'CHECKED_SOURCE_SNAPSHOT':'NOT_LOADED',snapshot_date:digital?.snapshot_date||null,
      libraries:digital?Object.entries(digital.libraries).filter(([id])=>digitalSets[id].has(address)).map(([id,lib])=>({id,name:lib.name,source_response_sha256:lib.source_response_sha256})):[],
      meaning:'SOURCE_DECLARED_RGB_LIBRARY_MEMBERSHIP; NOT_PRINT_APPROVAL; INDEPENDENT_COMPUTED_GAMUT_REPORTED_SEPARATELY'});
    const memberships=id=>Object.entries(views).filter(([,v])=>!v.hidden_from_new_selection&&v.type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP'&&v.ids.includes(id)).map(([id,v])=>({id,name:v.name}));
    function nearest(rgb){
      let best=null,distance=Infinity;
      for(const c of colors){const d=c.rgb.reduce((sum,v,i)=>sum+(rgb[i]-v)**2,0);if(d<distance||(d===distance&&c.id<best.id)){best=c;distance=d;}}
      return {atlas_row_id:best.id,reference:best.ref,stored_srgb:best.rgb.slice(),stored_hex:best.hex,d2_rgb:distance};
    }
    function resolve(input){
      const source=normaliseSource(input),master=source.kind==='HLC'?refs.get(source.address):null;
      const lab=master?master.lab.slice():sourceLab(source),spaces=representations(lab);
      const address=source.kind==='HLC'?source.address:labAddress(lab);
      const id=master?'master:'+MASTER+':'+master.id:source.kind==='HLC'?'digital-hlc-d50-2deg:v1:'+address:'digital-rgb:v1:'+source.space+':'+source.values.join(',');
      const nativeSrgb8=source.kind==='RGB'&&source.space==='srgb'&&source.values.every(v=>Math.abs(v*255-Math.round(v*255))<1e-9);
      const proxy=nativeSrgb8?source.values.map(v=>Math.round(v*255)):spaces.srgb.preview_rgb8;
      const comparison=nearest(proxy);
      return {digital_id:id,address,address_precision:source.kind==='RGB'?'HLC display rounded to 6 decimals; full source retained':'EXPLICIT_HLC',source,
        identity:master?{kind:'MASTER_REFERENCE',atlas_row_id:master.id}:{kind:'DIGITAL_COLOUR',atlas_row_id:null},
        lab_d50_2deg:lab,representations:spaces,
        master_comparison:{...comparison,input_srgb8:proxy,route:nativeSrgb8?'NATIVE_SRGB8_RGB_ONLY_V3_4_0':'DERIVED_SRGB8_PROXY_RGB_ONLY',proxy_clipped:!spaces.srgb.in_gamut,role:'COMPARISON_ONLY_DOES_NOT_REPLACE_DIGITAL_IDENTITY'},
        library_membership:{status:master?'CHECKED_MASTER_LISTS':'NOT_ESTABLISHED',libraries:master?memberships(master.id):[]},
        digital_library_membership:source.kind==='HLC'?digitalMembership(address):{status:'NOT_LOOKED_UP_FOR_ROUNDED_RGB_ADDRESS',snapshot_date:null,libraries:[],meaning:'RGB_SOURCE_IDENTITY_RETAINED'},
        spectral_data:master?'REFER_TO_ORIGINAL_MASTER':'NOT_AVAILABLE',arbe_values:'NOT_COMPUTED',physical_qc:'NOT_MEASURED'};
    }
    let coverageCache=null;
    function coverage(viewId='core'){
      if(!Object.hasOwn(views,viewId))throw Error('Unknown library');
      if(!coverageCache)coverageCache=colors.map(c=>representations(c.lab));
      const v=views[viewId],spaces={};
      for(const space of SPACES){const inside=v.ids.reduce((n,id)=>n+(coverageCache[id][space].in_gamut?1:0),0);spaces[space]={inside,outside:v.ids.length-inside};}
      return {library_id:viewId,library_name:v.name,total:v.ids.length,spaces,basis:'MASTER_LAB_D50_2DEG_COMPUTED_RGB_GAMUT; DOES_NOT_CHANGE_LIBRARY_MEMBERSHIP'};
    }
    function exportProject(entries){
      if(!Array.isArray(entries)||!entries.length||entries.length>256)throw Error('Palette must contain 1–256 colours');
      return {schema:SCHEMA,version:VERSION,master_sha256:MASTER,method:'LAB_D50_BRADFORD_RGB_V1',entries:entries.map(e=>({label:label(e.label),colour:resolve(e.colour.source)})),print_approval:false};
    }
    function label(value){if(typeof value!=='string'||value.length>100)throw Error('Invalid colour label');return value;}
    function importProject(doc){
      if(!doc||doc.schema!==SCHEMA||doc.version!==VERSION||doc.master_sha256!==MASTER||doc.method!=='LAB_D50_BRADFORD_RGB_V1'||doc.print_approval!==false||!Array.isArray(doc.entries)||doc.entries.length<1||doc.entries.length>256)throw Error('Incompatible digital colour project');
      return doc.entries.map(e=>{const c=resolve(e.colour?.source);if(!equivalent(c,e.colour))throw Error('Colour values, identity or membership have changed');return {label:label(e.label),colour:c};});
    }
    function equivalent(a,b){
      if(typeof a==='number')return finite(b)&&Math.abs(a-b)<=1e-10;
      if(Array.isArray(a))return Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equivalent(v,b[i]));
      if(a&&typeof a==='object')return b&&typeof b==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&equivalent(a[k],b[k]));
      return a===b;
    }
    function css(entries){
      const lines=['/* ATLAS Clarus digital colours. D50/2deg source, calculated previews.',
        ' * sRGB fallbacks may be clipped; P3 is emitted only when inside its gamut.',
        ' * No printing approval. Keep the companion .digital-colours.json. */',':root {'];
      entries.forEach((e,i)=>lines.push(`  --atlas-digital-${i+1}: ${e.colour.representations.srgb.preview_hex}; /* ${e.colour.address}; sRGB ${e.colour.representations.srgb.in_gamut?'in gamut':'CLIPPED'} */`));
      lines.push('}','@supports (color: color(display-p3 1 0 0)) {','  @media (color-gamut: p3) {','    :root {');
      entries.forEach((e,i)=>{const p=e.colour.representations['display-p3'];if(p.in_gamut)lines.push(`      --atlas-digital-${i+1}: color(display-p3 ${p.preview_rgb.map(v=>v.toPrecision(12)).join(' ')});`);});
      lines.push('    }','  }','}');return lines.join('\n')+'\n';
    }
    function libraryRow(address,space){
      if(!digitalSets[space]?.has(address))throw Error('Address absent from selected digital library');
      const master=refs.get(address),lab=master?master.lab.slice():hlcLab(parseHLC(address));
      const representations_=representations(lab),rgb=representations_[space];
      return {address,identity:master?{kind:'MASTER_REFERENCE',atlas_row_id:master.id}:{kind:'DIGITAL_COLOUR',atlas_row_id:null},
        lab_d50_2deg:lab,rgb_space:space,rgb_normalized:rgb.encoded_rgb,computed_in_gamut:rgb.in_gamut,
        source_declared_member:true,preview_srgb:representations_.srgb.preview_hex,preview_srgb_clipped:representations_.srgb.preview_clipped,
        ...(master?{stored_master_srgb:master.rgb.slice(),stored_master_hex:master.hex}:{}),spectral_data:master?'REFER_TO_ORIGINAL_MASTER':'NOT_AVAILABLE'};
    }
    function exportLibrary(space){
      if(!digital?.libraries[space])throw Error('Unknown digital library');
      const lib=digital.libraries[space],{references,...metadata}=lib,rows=references.map(ref=>libraryRow(ref,space));
      return {schema:'ATLAS_CLARUS_DIGITAL_RGB_LIBRARY_V1',version:VERSION,master_sha256:MASTER,space,snapshot_date:digital.snapshot_date,
        source:digital.source,...metadata,calculation:'LAB_D50_BRADFORD_RGB_V1',
        rgb_encoding:'GAMMA_ENCODED_NORMALIZED_FLOAT_UNCLIPPED',rgb_white_point:space==='prophoto-rgb'?'D50':'D65',
        gamut_test:'LINEAR_CHANNELS_0_TO_1',numerical_tolerance:EPS,
        computed_inside:rows.filter(r=>r.computed_in_gamut).length,rows,print_approval:false};
    }
    return {resolve,nearest,coverage,exportProject,importProject,exportLibrary,libraryRow,css,views,digitalLibraries:digital,master:MASTER};
  }
  root.ATLAS_DIGITAL_HLC={VERSION,SCHEMA,MASTER,SPACES,INPUT_SPACES,parseHLC,sourceLab,representations,labAddress,canonical,context};
  if(typeof module!=='undefined')module.exports=root.ATLAS_DIGITAL_HLC;
})(typeof window==='undefined'?globalThis:window);
