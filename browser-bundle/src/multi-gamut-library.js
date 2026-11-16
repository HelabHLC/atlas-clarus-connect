/* ATLAS Clarus Multi-Gamut library engine — independent, offline, no ICC inference.
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Only imports measured/calculated external results; never claims printability.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ATLAS_MULTI_GAMUT=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const COUNT=13283;
  const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const fail=m=>{throw new Error('Multi-Gamut: '+m)};
  function create(master,options={}){
    if(!isObject(master)||master.master_sha256!==MASTER||master.entry_count!==COUNT||
       !Array.isArray(master.colors)||master.colors.length!==COUNT)fail('master identity/count mismatch');
    const byId=new Map(),byRef=new Map();
    master.colors.forEach(c=>{
      if(!Number.isInteger(c.id)||c.id<0||c.id>=COUNT||typeof c.ref!=='string'||byId.has(c.id)||byRef.has(c.ref))fail('invalid/duplicate master identity');
      byId.set(c.id,c);byRef.set(c.ref,c.id);
    });
    if(byId.size!==COUNT)fail('incomplete master');
    const profiles=new Map(), libraries=new Map(), entries=new Map();
    const key=(id,p)=>id+'|'+p;
    function registerLibrary(id,name){
      if(typeof id!=='string'||!/^[a-z0-9][a-z0-9_-]*$/.test(id)||typeof name!=='string'||!name.trim())fail('invalid library');
      libraries.set(id,Object.freeze({id,name}));return id;
    }
    function registerProfile(p){
      if(!isObject(p)||typeof p.id!=='string'||!/^[a-z0-9][a-z0-9_.-]*$/.test(p.id)||
         !libraries.has(p.library_id)||typeof p.icc_sha256!=='string'||!/^[a-f0-9]{64}$/.test(p.icc_sha256)||
         typeof p.description!=='string'||!p.description.trim()||typeof p.method!=='string'||!p.method.trim()||
         typeof p.intent!=='string'||!p.intent.trim())fail('invalid profile provenance');
      const existing=profiles.get(p.id);
      if(existing)fail('profile ID already exists: '+p.id);
      profiles.set(p.id,Object.freeze({...p}));return p.id;
    }
    function importResults(profileId,rows){
      if(!profiles.has(profileId))fail('unknown profile');
      if(!Array.isArray(rows))fail('results must be an array');
      const seen=new Set(),batch=[];
      for(const r of rows){
        if(!isObject(r))fail('invalid result');
        const id=r.atlas_row_id!==undefined?Number(r.atlas_row_id):byRef.get(r.reference);
        if(!Number.isInteger(id)||!byId.has(id)||seen.has(id))fail('unknown/duplicate atlas row');
        if(r.reference!==undefined&&byId.get(id).ref!==r.reference)fail('reference mismatch');
        if(typeof r.delta_e00!=='number'||!Number.isFinite(r.delta_e00)||r.delta_e00<0)fail('invalid DeltaE00');
        seen.add(id);
        batch.push([key(id,profileId),Object.freeze({atlas_row_id:id,reference:byId.get(id).ref,profile_id:profileId,delta_e00:r.delta_e00,calculation_status:'ICC_ROUNDTRIP',production_status:'NOT_MEASURED'})]);
      }
      // Atomic replacement: never retain stale results for a reimported profile.
      for(const k of [...entries.keys()])if(k.endsWith('|'+profileId))entries.delete(k);
      batch.forEach(([k,v])=>entries.set(k,v));
      return {profile_id:profileId,imported:batch.length,complete:batch.length===COUNT};
    }
    function memberships(id,threshold=1){
      if(!byId.has(id)||!Number.isFinite(threshold)||threshold<0)fail('invalid query');
      return [...profiles.values()].map(p=>{
        const r=entries.get(key(id,p.id));
        return {library_id:p.library_id,profile_id:p.id,checked:!!r,delta_e00:r?.delta_e00??null,within_tolerance:!!r&&r.delta_e00<=threshold,production_status:'NOT_MEASURED'};
      });
    }
    function query(profileIds,threshold=1,mode='intersection'){
      if(!Array.isArray(profileIds)||!profileIds.length||new Set(profileIds).size!==profileIds.length||profileIds.some(p=>!profiles.has(p)))fail('invalid profile selection');
      if(!Number.isFinite(threshold)||threshold<0||!['intersection','union','difference'].includes(mode))fail('invalid query');
      const sets=profileIds.map(p=>new Set([...entries.values()].filter(r=>r.profile_id===p&&r.delta_e00<=threshold).map(r=>r.atlas_row_id)));
      const ids=[...byId.keys()].filter(id=>mode==='intersection'?sets.every(s=>s.has(id)):mode==='union'?sets.some(s=>s.has(id)):sets[0].has(id)&&sets.slice(1).every(s=>!s.has(id)));
      return {mode,profile_ids:[...profileIds],threshold,ids,complete:profileIds.every(p=>[...entries.values()].filter(r=>r.profile_id===p).length===COUNT)};
    }
    function deltaE00(lab1,lab2){
      const [L1,a1,b1]=lab1,[L2,a2,b2]=lab2;
      const rad=Math.PI/180,deg=180/Math.PI;
      const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cbar=(C1+C2)/2;
      const G=.5*(1-Math.sqrt(Cbar**7/(Cbar**7+25**7)));
      const ap1=(1+G)*a1,ap2=(1+G)*a2,cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);
      const hue=(a,b)=>{const v=Math.atan2(b,a)*deg;return v<0?v+360:v;};
      const h1=cp1<1e-12?0:hue(ap1,b1),h2=cp2<1e-12?0:hue(ap2,b2);
      const dL=L2-L1,dC=cp2-cp1;
      let dh=0;if(cp1*cp2>1e-12){dh=h2-h1;if(dh>180)dh-=360;if(dh< -180)dh+=360;}
      const dH=2*Math.sqrt(cp1*cp2)*Math.sin(dh*rad/2);
      const Lbar=(L1+L2)/2,Cpbar=(cp1+cp2)/2;
      let hbar=h1+h2;
      if(cp1*cp2<1e-12)hbar=h1+h2;
      else if(Math.abs(h1-h2)<=180)hbar=(h1+h2)/2;
      else hbar=(h1+h2<360)?(h1+h2+360)/2:(h1+h2-360)/2;
      const T=1-.17*Math.cos((hbar-30)*rad)+.24*Math.cos(2*hbar*rad)+.32*Math.cos((3*hbar+6)*rad)-.20*Math.cos((4*hbar-63)*rad);
      const dTheta=30*Math.exp(-((hbar-275)/25)**2);
      const Rc=2*Math.sqrt(Cpbar**7/(Cpbar**7+25**7));
      const Sl=1+.015*(Lbar-50)**2/Math.sqrt(20+(Lbar-50)**2);
      const Sc=1+.045*Cpbar,Sh=1+.015*Cpbar*T;
      const Rt=-Math.sin(2*dTheta*rad)*Rc;
      const x=dL/Sl,y=dC/Sc,z=dH/Sh;
      return Math.sqrt(Math.max(0,x*x+y*y+z*z+Rt*y*z));
    }
    function closest(targetId,profileIds,threshold=1,limit=5){
      if(!byId.has(targetId)||!Number.isInteger(limit)||limit<1)fail('invalid target');
      const base=byId.get(targetId);
      if(!Array.isArray(base.lab)||base.lab.length!==3||base.lab.some(x=>!Number.isFinite(x)))fail('target Lab unavailable');
      const matching=query(profileIds,threshold,'intersection');
      // Full CIEDE2000 ranking across all qualifying candidates; no RGB proxy.
      const ranked=matching.ids.map(id=>{
        const c=byId.get(id);if(!Array.isArray(c.lab)||c.lab.length!==3)return null;
        return {atlas_row_id:id,reference:c.ref,delta_e00_to_target:deltaE00(base.lab,c.lab)};
      }).filter(Boolean).sort((a,b)=>a.delta_e00_to_target-b.delta_e00_to_target||a.atlas_row_id-b.atlas_row_id);
      return {ranking_method:'CIEDE2000_FULL_CANDIDATE_RANKING',candidates:ranked.slice(0,limit),complete:matching.complete};
    }
    return Object.freeze({registerLibrary,registerProfile,importResults,memberships,query,closest,
      summary:()=>({master_sha256:MASTER,reference_count:COUNT,libraries:[...libraries.values()],profiles:[...profiles.values()],result_count:entries.size})});
  }
  return Object.freeze({MASTER,COUNT,create});
});
