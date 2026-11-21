/* Experimental spectral reconstruction and D50 roundtrip; not wired into UI.
 * No spectral measurements or normative CIE weights are bundled.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ATLAS_SPECTRAL_RECONSTRUCTION=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const HASH=/^[a-f0-9]{64}$/;
const validLab=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite);
function checkWeights(w,grid){
 if(!w||w.illuminant!=='D50'||w.observer!=='CIE1931_2'||!HASH.test(w.sha256||'')||!Array.isArray(w.wavelength_nm)||!Array.isArray(w.xyz_weights)||!Array.isArray(w.white_xyz)||w.white_xyz.length!==3)throw Error('D50/2° weights provenance required');
 if(w.wavelength_nm.length!==grid.length||w.xyz_weights.length!==grid.length||!w.white_xyz.every(v=>Number.isFinite(v)&&v>0))throw Error('Weight grid mismatch');
 for(let i=0;i<grid.length;i++){if(grid[i]!==w.wavelength_nm[i]||!Array.isArray(w.xyz_weights[i])||w.xyz_weights[i].length!==3||!w.xyz_weights[i].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid D50 weights');}
 const sum=[0,0,0];w.xyz_weights.forEach(v=>v.forEach((n,j)=>sum[j]+=n));
 if(sum.some((v,j)=>Math.abs(v-w.white_xyz[j])>1e-6*Math.max(1,v)))throw Error('Weights/white normalization mismatch');
}
function labFromXYZ(xyz,white){
 const f=t=>t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;
 const [x,y,z]=xyz.map((v,i)=>f(v/white[i]));
 return [116*y-16,500*(x-y),200*(y-z)];
}
function deltaE00(a,b){
 if(!validLab(a)||!validLab(b))throw Error('Invalid Lab');
 const rad=Math.PI/180,deg=180/Math.PI;
 const [L1,a1,b1]=a,[L2,a2,b2]=b;
 const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),barC=(C1+C2)/2;
 const G=.5*(1-Math.sqrt(barC**7/(barC**7+25**7)));
 const ap1=(1+G)*a1,ap2=(1+G)*a2,Cp1=Math.hypot(ap1,b1),Cp2=Math.hypot(ap2,b2);
 const hue=(bb,aa)=>{let v=Math.atan2(bb,aa)*deg;return v<0?v+360:v;};
 const h1=hue(b1,ap1),h2=hue(b2,ap2);
 const dL=L2-L1,dC=Cp2-Cp1;
 let dh=0;if(Cp1*Cp2!==0){dh=h2-h1;if(dh>180)dh-=360;if(dh< -180)dh+=360;}
 const dH=2*Math.sqrt(Cp1*Cp2)*Math.sin(dh*rad/2);
 const Lm=(L1+L2)/2,Cm=(Cp1+Cp2)/2;
 let hm=h1+h2;if(Cp1*Cp2===0)hm=h1+h2;else if(Math.abs(h1-h2)<=180)hm=(h1+h2)/2;else hm=(h1+h2<360?(h1+h2+360)/2:(h1+h2-360)/2);
 const T=1-.17*Math.cos((hm-30)*rad)+.24*Math.cos(2*hm*rad)+.32*Math.cos((3*hm+6)*rad)-.20*Math.cos((4*hm-63)*rad);
 const Sl=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),Sc=1+.045*Cm,Sh=1+.015*Cm*T;
 const dt=30*Math.exp(-((hm-275)/25)**2),Rc=2*Math.sqrt(Cm**7/(Cm**7+25**7)),Rt=-Math.sin(2*dt*rad)*Rc;
 const p=dL/Sl,q=dC/Sc,r=dH/Sh;
 return Math.sqrt(Math.max(0,p*p+q*q+r*r+Rt*q*r));
}
function reconstruct({reference,target_lab,neighbours,weights,tolerance_de00=null}){
 if(typeof reference!=='string'||!reference.trim()||!validLab(target_lab)||!Array.isArray(neighbours)||neighbours.length<2)throw Error('Invalid candidate input');
 const grid=neighbours[0]?.wavelength_nm;
 if(!Array.isArray(grid)||grid.length<2||grid.some((v,i)=>!Number.isFinite(v)||(i&&v<=grid[i-1])))throw Error('Invalid wavelength grid');
 checkWeights(weights,grid);
 let total=0;const rows=[];
 for(const n of neighbours){
  if(!n||typeof n.reference!=='string'||!n.reference||!HASH.test(n.source_sha256||'')||n.provenance!=='MEASURED'||!Number.isFinite(n.weight)||n.weight<=0||!Array.isArray(n.wavelength_nm)||!Array.isArray(n.reflectance)||n.wavelength_nm.length!==grid.length||n.reflectance.length!==grid.length||n.wavelength_nm.some((v,i)=>v!==grid[i])||n.reflectance.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid measured neighbour provenance or samples');
  rows.push(n);total+=n.weight;
 }
 if(new Set(rows.map(n=>n.reference)).size!==rows.length)throw Error('Duplicate neighbour');
 const reflectance=grid.map((_,i)=>rows.reduce((s,n)=>s+n.weight*n.reflectance[i],0)/total);
 const xyz=[0,0,0];reflectance.forEach((r,i)=>weights.xyz_weights[i].forEach((v,j)=>xyz[j]+=r*v));
 const lab=labFromXYZ(xyz,weights.white_xyz),de=deltaE00(target_lab,lab);
 if(tolerance_de00!==null&&(!Number.isFinite(tolerance_de00)||tolerance_de00<0))throw Error('Invalid tolerance');
 return Object.freeze({reference,provenance:'SYNTHETIC_RECONSTRUCTED',method:'WEIGHTED_MEASURED_NEIGHBOUR_MEAN_V1',wavelength_nm:[...grid],reflectance,neighbour_references:rows.map(n=>n.reference),neighbour_source_sha256:rows.map(n=>n.source_sha256),weights_sha256:weights.sha256,target_lab:[...target_lab],roundtrip_lab:lab,roundtrip_xyz:xyz,delta_e00:de,validation_status:tolerance_de00===null?'PENDING_VALIDATION':de<=tolerance_de00?'NUMERICAL_ROUNDTRIP_PASSED':'NUMERICAL_ROUNDTRIP_FAILED',physical_validation:'NOT_PERFORMED'});
}
return Object.freeze({reconstruct,deltaE00,labFromXYZ});
});
