/* ATLAS Clarus experimental cloth preview. SPDX-License-Identifier: MIT
 * Fixed-step XPBD distance constraints, visual bending proxy, gravity and wind.
 * No self-collision, calibrated constitutive model or fit/production claim.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCloth=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
class Cloth {
 constructor({nx=28,ny=34,width=1,height=1.2,gsm=78.22875,warp=.02,weft=.04,shear=.15,bend=.03,pins='gathered'}={}) {
  if(!Number.isInteger(nx)||nx<2||nx>100||!Number.isInteger(ny)||ny<2||ny>100)throw Error('Invalid grid');
  for(const v of [width,height,gsm])if(!Number.isFinite(v)||v<=0)throw Error('Invalid material/size');
  for(const v of [warp,weft,shear,bend])if(!Number.isFinite(v)||v<0)throw Error('Invalid compliance');
  this.nx=nx;this.ny=ny;this.width=width;this.height=height;this.gsm=gsm;this.time=0;this.count=(nx+1)*(ny+1);
  this.position=new Float64Array(this.count*3);this.previous=new Float64Array(this.count*3);this.velocity=new Float64Array(this.count*3);
  this.invMass=new Float64Array(this.count);this.mass=new Float64Array(this.count);this.anchors=new Map();this.uv=new Float32Array(this.count*2);this.edges=[];
  this.totalMass=width*height*gsm/1000;
  // Lump cell mass onto its four corners: total mass independent of mesh resolution.
  const cellMass=this.totalMass/(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)for(const n of [j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i,(j+1)*(nx+1)+i+1])this.mass[n]+=cellMass/4;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const n=j*(nx+1)+i,k=n*3,u=i/nx,v=j/ny;
   this.position[k]=(u-.5)*width*(pins==='edge'?1:.72);this.position[k+1]=height*.5-v*height;this.position[k+2]=(pins==='edge'?.012:.04)*width*Math.sin(u*Math.PI*8)*(j===0?0:1);
   this.uv[n*2]=u;this.uv[n*2+1]=1-v;this.invMass[n]=1/this.mass[n];
   const pin=j===0&&(pins==='edge'||(pins==='corners'?(i===0||i===nx):(i===0||i===nx||i===Math.floor(nx/2))));
   if(pin){this.anchors.set(n,Array.from(this.position.slice(k,k+3)));this.invMass[n]=0;}
  }
  this.previous.set(this.position);
  const add=(a,b,rest,compliance,type)=>this.edges.push({a,b,rest,compliance,type,lambda:0});
  const dx=width/nx,dy=height/ny;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const a=j*(nx+1)+i;
   if(i<nx)add(a,a+1,dx,weft,'weft');
   if(j<ny)add(a,a+nx+1,dy,warp,'warp');
   if(i<nx&&j<ny){add(a,a+nx+2,Math.hypot(dx,dy),shear,'shear');add(a+1,a+nx+1,Math.hypot(dx,dy),shear,'shear');}
   // Two-hop chord constraints are only a visual bending proxy, not dihedral material calibration.
   if(i<nx-1)add(a,a+2,dx*2,bend,'bend');
   if(j<ny-1)add(a,a+2*(nx+1),dy*2,bend,'bend');
  }
  const indices=[];
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  this.indices=new Uint16Array(indices);
 }
 step(dt=1/120,{wind=0.6,damping=1.8,iterations=14}={}){
  if(!Number.isFinite(dt)||dt<=0||dt>1/30||!Number.isFinite(wind)||Math.abs(wind)>10||!Number.isInteger(iterations)||iterations<1||iterations>30)throw Error('Invalid step');
  const p=this.position,v=this.velocity;this.previous.set(p);this.time+=dt;
  for(let n=0;n<this.count;n++)if(this.invMass[n]){
   const k=n*3;v[k+1]-=9.81*dt;
   // Synthetic wind pressure N/m², not a measured airflow. Force scales with tributary area.
   const tributary=this.mass[n]/(this.gsm/1000),phase=this.time*1.6+p[k]*4;
   v[k]+=wind*.12*Math.sin(phase)*tributary*this.invMass[n]*dt;
   v[k+2]+=wind*(.65+.35*Math.sin(phase+p[k+1]*2))*tributary*this.invMass[n]*dt;
   const damp=Math.exp(-damping*dt);
   for(let a=0;a<3;a++){v[k+a]*=damp;p[k+a]+=v[k+a]*dt;}
  }
  for(const e of this.edges)e.lambda=0;
  for(let it=0;it<iterations;it++){
   // Alternate sweep direction to reduce directional iteration bias.
   for(let idx=0;idx<this.edges.length;idx++){
    const e=this.edges[it%2?this.edges.length-1-idx:idx],a=e.a*3,b=e.b*3;
    const x=p[b]-p[a],y=p[b+1]-p[a+1],z=p[b+2]-p[a+2],len=Math.hypot(x,y,z);if(len<1e-12)continue;
    const wa=this.invMass[e.a],wb=this.invMass[e.b],alpha=e.compliance/(dt*dt),den=wa+wb+alpha;if(den===0)continue;
    const dl=(-(len-e.rest)-alpha*e.lambda)/den;e.lambda+=dl;
    const s=dl/len;
    p[a]-=wa*s*x;p[a+1]-=wa*s*y;p[a+2]-=wa*s*z;
    p[b]+=wb*s*x;p[b+1]+=wb*s*y;p[b+2]+=wb*s*z;
   }
   for(const [n,anchor] of this.anchors){p.set(anchor,n*3);}
   for(let n=0;n<this.count;n++)if(this.invMass[n])p[n*3+1]=Math.max(-this.height*.68,p[n*3+1]);
  }
  for(let n=0;n<this.count;n++)for(let a=0;a<3;a++){const k=n*3+a;v[k]=this.invMass[n]?(p[k]-this.previous[k])/dt:0;}
 }
 maxStretch(){let max=1;for(const e of this.edges)if(e.type==='warp'||e.type==='weft'){
  const a=e.a*3,b=e.b*3,p=this.position;max=Math.max(max,Math.hypot(p[b]-p[a],p[b+1]-p[a+1],p[b+2]-p[a+2])/e.rest);
 }return max;}
}
return {Cloth};
});
