(function(root){
  'use strict';
  const SCHEMA='ATLAS_COLOUR_ADVICE_V1', BASIS='SRGB8_TO_LAB_D65_2_DE00_K111_V1';
  const A=root.ATLAS_LIBRARY_ACCEPTANCE, contexts=new WeakMap();
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const need=(ok,msg)=>{if(!ok)throw Error(msg);};
  const validTolerance=t=>typeof t==='number'&&Number.isFinite(t)&&t>=0&&t<=100;
  const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
  const cos=x=>Math.cos(rad(x)),sin=x=>Math.sin(rad(x));
  // IEC sRGB transfer function; matrix derived from sRGB primaries and D65.
  // Both operands use the stored sRGB values. Never mix these with HLC target Lab.
  function lab(rgb){
    need(Array.isArray(rgb)&&rgb.length===3&&rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255),'Ungültige sRGB-Farbe.');
    const v=rgb.map(n=>{const x=n/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});
    const m=[[506752/1228815,87881/245763,12673/70218],[87098/409605,175762/245763,12673/175545],[7918/409605,87881/737289,1001167/1053270]];
    const white=[0.3127/0.3290,1,(1-0.3127-0.3290)/0.3290];
    const f=m.map((row,i)=>{const t=row.reduce((s,c,j)=>s+c*v[j],0)/white[i];return t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;});
    return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];
  }
  // CIEDE2000, parametric factors kL=kC=kH=1. Independently implemented.
  function deltaE00(x,y){
    need([x,y].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)),'Ungültige Lab-Werte.');
    const [l1,a1,b1]=x,[l2,a2,b2]=y,c1=Math.hypot(a1,b1),c2=Math.hypot(a2,b2),cb=(c1+c2)/2;
    const g=(1-Math.sqrt(cb**7/(cb**7+25**7)))/2,ap1=(1+g)*a1,ap2=(1+g)*a2;
    const cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);
    const hue=(a,b,c)=>c===0?0:(deg(Math.atan2(b,a))+360)%360;
    const h1=hue(ap1,b1,cp1),h2=hue(ap2,b2,cp2),dl=l2-l1,dc=cp2-cp1;
    let dh=h2-h1;if(cp1*cp2===0)dh=0;else if(dh>180)dh-=360;else if(dh< -180)dh+=360;
    const dH=2*Math.sqrt(cp1*cp2)*sin(dh/2),lb=(l1+l2)/2,cp=(cp1+cp2)/2;
    let hb=(h1+h2)/2;if(cp1*cp2===0)hb=h1+h2;else if(Math.abs(h1-h2)>180)hb+=(h1+h2<360?180:-180);
    const t=1-.17*cos(hb-30)+.24*cos(2*hb)+.32*cos(3*hb+6)-.20*cos(4*hb-63);
    const sl=1+.015*(lb-50)**2/Math.sqrt(20+(lb-50)**2),sc=1+.045*cp,sh=1+.015*cp*t;
    const rt=-2*Math.sqrt(cp**7/(cp**7+25**7))*sin(60*Math.exp(-(((hb-275)/25)**2)));
    return Math.sqrt(Math.max(0,(dl/sl)**2+(dc/sc)**2+(dH/sh)**2+rt*(dc/sc)*(dH/sh)));
  }
  function index(ctx){
    if(!contexts.has(ctx.colors))contexts.set(ctx.colors,{byId:new Map(ctx.colors.map(c=>[c.id,c])),labs:new Map(ctx.colors.map(c=>[c.id,lab(c.rgb)])),nearest:new WeakMap(),sets:new WeakMap()});
    return contexts.get(ctx.colors);
  }
  function members(ctx,id){
    const v=(ctx.views||root.ATLAS_CLARUS_DATA?.views||{})[id],ix=index(ctx);
    if(!v||v.type!=='SOURCE_DECLARED_GAMUT_MEMBERSHIP'||v.hidden_from_new_selection||!v.ids?.length)return null;
    if(!ix.sets.has(v))ix.sets.set(v,v.ids.every(n=>Number.isInteger(n)&&ix.byId.has(n))?new Set(v.ids):null);
    return ix.sets.get(v);
  }
  function nearest(colour,ctx,id){
    const set=members(ctx,id);if(!set)return null;
    const v=(ctx.views||root.ATLAS_CLARUS_DATA.views)[id],ix=index(ctx),key=colour.source_rgb.join(',');
    if(!ix.nearest.has(v))ix.nearest.set(v,new Map());const cache=ix.nearest.get(v);
    if(!cache.has(key)){
      const source=lab(colour.source_rgb);let best=null;
      for(const rowId of set){const d=deltaE00(source,ix.labs.get(rowId));if(!best||d<best.delta_e00||d===best.delta_e00&&rowId<best.reference_id)best={reference_id:rowId,delta_e00:d};}
      if(cache.size>=256)cache.clear();cache.set(key,best);
    }
    return {...cache.get(key)};
  }
  function alternatives(doc,ctx){
    const catalog=ctx.catalog||root.ATLAS_ICC_CATALOG,ids=doc.colours.map(c=>c.reference_id),views=ctx.views||root.ATLAS_CLARUS_DATA.views;
    const lists=A.choices(ctx).filter(([id,v])=>id!==doc.print.library_id&&!v.historical&&!catalog?.libraries[id]?.historical&&!catalog?.libraries[id]?.hidden&&members(ctx,id));
    const items=lists.map(([id,v])=>{
      const profiles=(catalog?.libraries[id]?.profile_ids||[]).map(pid=>({id:pid,...catalog.profiles[pid]}));
      const supported=profiles.filter(p=>['4C','ECG','TEXTILE_RGB'].includes(p.output_path));
      return {library_id:id,name:v.name,matched_indices:ids.flatMap((row,i)=>members(ctx,id).has(row)?[i]:[]),profile_ids:supported.map(p=>p.id),
        output_paths:[...new Set(supported.map(p=>p.output_path))],suitability:'PROCESS_AND_MATERIAL_UNVERIFIED',
        note:supported.length?'Enthält die Adresse; Druckverfahren und Material mit der Druckerei prüfen.':'Enthält die Adresse; kein unterstütztes Ausgabeprofil zugeordnet.'};
    }).filter(x=>x.matched_indices.length);
    items.sort((a,b)=>Number(b.output_paths.includes(doc.print.path))-Number(a.output_paths.includes(doc.print.path))||b.matched_indices.length-a.matched_indices.length||a.library_id.localeCompare(b.library_id,'en'));
    return {whole_palette:ids.length?items.filter(x=>x.matched_indices.length===ids.length):[],per_colour:ids.map((_,i)=>items.filter(x=>x.matched_indices.includes(i)))};
  }
  function decision(colour,ctx,libraryId,tolerance){
    need(validTolerance(tolerance),'Bitte eine Toleranz zwischen 0 und 100 ΔE00 festlegen.');
    const best=nearest(colour,ctx,libraryId),set=members(ctx,libraryId);
    need(set&&!set.has(colour.reference_id),'Eine Ersatzfarbe wird nur für eine fehlende Referenz angeboten.');
    need(best&&best.delta_e00<=tolerance,'Keine Ersatzfarbe innerhalb der festgelegten Toleranz.');
    return {schema:SCHEMA,confirmed:true,library_id:libraryId,master_sha256:ctx.master,
      source_response_sha256:(ctx.views||root.ATLAS_CLARUS_DATA.views)[libraryId].source_response_sha256||null,
      original_reference_id:colour.reference_id,source_rgb:[...colour.source_rgb],reference_id:best.reference_id,
      metric:'CIEDE2000',basis:BASIS,tolerance,delta_e00:best.delta_e00};
  }
  function validate(doc,ctx){
    if(doc.advice!==undefined)need(doc.advice?.schema===SCHEMA&&(doc.advice.tolerance===null||validTolerance(doc.advice.tolerance)),'Ungültige Farbberatung oder Toleranz.');
    for(const c of doc.colours){if(c.replacement===undefined)continue;
      need(doc.advice&&c.replacement?.confirmed===true,'Ersatzfarbe wurde nicht bestätigt.');
      const expected=decision(c,ctx,c.replacement.library_id,c.replacement.tolerance);
      const saved={...c.replacement};if(saved.withdrawn===true)delete saved.withdrawn;
      need(same(saved,expected),'Die dokumentierte Ersatzfarbe oder Abweichung stimmt nicht.');
    }
  }
  function active(colour,doc,ctx){
    const r=colour.replacement;if(!r||r.withdrawn||!doc.advice||r.library_id!==doc.print.library_id||r.tolerance!==doc.advice.tolerance)return null;
    try{return same(r,decision(colour,ctx,r.library_id,r.tolerance))?r:null;}catch(_){return null;}
  }
  function effective(colour,doc,ctx){return index(ctx).byId.get(active(colour,doc,ctx)?.reference_id??colour.reference_id);}
  function report(doc,ctx){
    validate(doc,ctx);const alts=alternatives(doc,ctx),tol=doc.advice?.tolerance??null;
    return {schema:SCHEMA,metric:'CIEDE2000',basis:BASIS,tolerance:tol,master_sha256:ctx.master,library_id:doc.print.library_id,
      boundary:'Computed sRGB appearance difference (D65/2 degrees, kL=kC=kH=1); not HLC target Lab, measured print tolerance or device feasibility.',
      whole_palette_libraries:alts.whole_palette,rows:doc.colours.map((c,i)=>{
        const set=members(ctx,doc.print.library_id),best=set&&!set.has(c.reference_id)?nearest(c,ctx,doc.print.library_id):null;
        return {source_rgb:[...c.source_rgb],original_reference_id:c.reference_id,source_kind:c.kind,
          candidate:best?{...best,within_tolerance:validTolerance(tol)&&best.delta_e00<=tol}:null,
          decision:c.replacement||null,decision_active:Boolean(active(c,doc,ctx)),effective_reference_id:effective(c,doc,ctx).id,
          other_libraries:alts.per_colour[i]};
      })};
  }
  root.ATLAS_COLOUR_ADVICE={SCHEMA,BASIS,validTolerance,lab,deltaE00,members,nearest,alternatives,decision,validate,active,effective,report};
})(typeof window==='undefined'?globalThis:window);
