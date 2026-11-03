'use strict';
const assert=require('node:assert/strict');const {Cloth}=require('../src/solver.js');
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
for(const grid of [[8,10],[20,24],[28,34]]){
 const c=new Cloth({nx:grid[0],ny:grid[1],width:1,height:1.2,gsm:78.22875258526936});
 close(c.mass.reduce((a,b)=>a+b,0),.09387450310232323);
 const pins=Array.from(c.anchors,([i,p])=>[i,[...p]]);
 for(let t=0;t<240;t++)c.step(1/120,{wind:.35});
 assert.ok(c.position.every(Number.isFinite));
 for(const [i,p] of pins)for(let a=0;a<3;a++)close(c.position[i*3+a],p[a]);
 assert.ok(c.maxStretch()<1.45,`excessive stretch: ${c.maxStretch()}`);
 assert.ok(c.position.some((v,i)=>i%3===2&&Math.abs(v)>.02),'no wind displacement');
}
const a=new Cloth({nx:8,ny:10}),b=new Cloth({nx:8,ny:10});
for(let n=0;n<120;n++){a.step();b.step();}assert.deepEqual(a.position,b.position);
for(const options of [{gsm:-1},{width:NaN},{warp:-1},{nx:200}])assert.throws(()=>new Cloth(options));
assert.throws(()=>a.step(1));assert.throws(()=>a.step(1/120,{wind:Infinity}));
// No-wind symmetric case should still settle under gravity; free nodes move, anchors do not.
const c=new Cloth({nx:8,ny:10,pins:'corners'}),initial=c.position.slice();for(let n=0;n<180;n++)c.step(1/120,{wind:0});
assert.ok(c.position.some((v,i)=>Math.abs(v-initial[i])>.02));
// A changed physical area changes total mass consistently.
close(new Cloth({width:.5,height:.7,gsm:100}).totalMass,.035);
console.log('PASS: mass conservation over 3 meshes, fixed anchors, finite dynamics, bounded stretch, wind, determinism, input guards, gravity and area scaling');
// Exercise the adjustable domain and require a material-control change to affect the trajectory.
let endpoints=[];
for(const factor of [.25,4]){const c=new Cloth({nx:14,ny:18,warp:.02*factor,weft:.04*factor,shear:.15*factor});for(let n=0;n<240;n++)c.step(1/120,{wind:.35});assert.ok(c.position.every(Number.isFinite));endpoints.push(Array.from(c.position));}
assert.ok(Math.max(...endpoints[0].map((v,i)=>Math.abs(v-endpoints[1][i])))>.01,'stretch control has no visible geometric effect');
for(const gsm of [78.22875258526936,119.4056666208638,296.6752904052201]){const c=new Cloth({nx:14,ny:18,width:.5,height:1.6,gsm,warp:.08,weft:.16,shear:.6,bend:.06,pins:'corners'});for(let n=0;n<360;n++)c.step(1/120,{wind:1.5});assert.ok(c.position.every(Number.isFinite));assert.ok(c.maxStretch()<2);}
console.log('PASS: control sensitivity and finite extreme scenarios for all 3 reference materials');
