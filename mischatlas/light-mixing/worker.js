function searchLight(job,emit){
 const {samples,target,kernels,lights,objective,poolSize,seed}=job;
 if(!samples.length||(objective!=='D50'&&!lights.length))throw Error('Choose a palette and at least one illuminant.');
 const names=objective==='D50'?['D50']:lights;
 const ks=samples.map(s=>s.R.map(r=>{r=Math.max(1e-6,r);return (1-r)**2/(2*r);}));
 const targetLab=Object.fromEntries([...new Set([...names,'D50'])].map(n=>[n,labFromR(target.reference_spectrum,kernels[n])]));
 const random=rng(seed);let best=null,evaluations=0;
 function evaluate(recipe){
  evaluations++;const R=mixture(recipe,ks);
  const vals=names.map(n=>de00(targetLab[n],labFromR(R,kernels[n])));
  return {recipe:recipe.map(p=>({...p})),model_spectrum:R,score:Math.max(...vals),D50:de00(targetLab.D50,labFromR(R,kernels.D50))};
 }
 function accept(recipe){const c=evaluate(recipe);if(!best||c.score<best.score-1e-12||(Math.abs(c.score-best.score)<=1e-12&&c.D50<best.D50-1e-12)){best=c;return true;}return false;}
 for(let i=0;i<samples.length;i++)accept([{index:i,parts:100}]);
 // Include a compatible existing recipe as a seed only when all names match this palette.
 if(job.seedRecipe&&job.seedRecipe.length){
  const r=job.seedRecipe.map(p=>({index:samples.findIndex(s=>s.name===p.name),parts:p.parts}));
  if(r.every(p=>p.index>=0)&&r.length<=4){const total=r.reduce((a,p)=>a+p.parts,0);r.forEach(p=>p.parts=Math.round(p.parts/total*100));r[r.length-1].parts+=100-r.reduce((a,p)=>a+p.parts,0);if(r.every(p=>p.parts>=0))accept(r.filter(p=>p.parts));}
 }
 for(let n=0;n<poolSize;n++){
  const count=1+Math.floor(random()*Math.min(4,samples.length)),ids=[];
  while(ids.length<count){const i=Math.floor(random()*samples.length);if(!ids.includes(i))ids.push(i);}
  const cuts=[];while(cuts.length<count-1){const c=1+Math.floor(random()*99);if(!cuts.includes(c))cuts.push(c);}
  cuts.sort((a,b)=>a-b);const edges=[0,...cuts,100];accept(ids.map((index,i)=>({index,parts:edges[i+1]-edges[i]})));
  if(n%500===0)emit({type:'progress',stage:'pool',done:n,total:poolSize,best:best.score});
 }
 // Integer refinement, up to four colours and exactly 100 model parts.
 for(let round=0;round<20;round++){
  let changed=false;const base=best.recipe.map(p=>({...p}));
  for(let i=0;i<base.length;i++)for(let j=0;j<base.length;j++)if(i!==j)
   for(const step of [1,3,10])if(base[i].parts>=step){const r=base.map(p=>({...p}));r[i].parts-=step;r[j].parts+=step;changed=accept(r.filter(p=>p.parts))||changed;}
  for(let i=0;i<base.length;i++)for(let k=0;k<samples.length;k++)if(!base.some(p=>p.index===k)){
   const swapped=base.map(p=>({...p}));swapped[i].index=k;changed=accept(swapped)||changed;
   if(base.length<4)for(const step of [1,3,10])if(base[i].parts>step){const r=base.map(p=>({...p}));r[i].parts-=step;r.push({index:k,parts:step});changed=accept(r)||changed;}
  }
  emit({type:'progress',stage:'refine',done:round+1,total:20,best:best.score});if(!changed)break;
 }
 const allLights=Object.keys(kernels).map(n=>{const t=labFromR(target.reference_spectrum,kernels[n]),m=labFromR(best.model_spectrum,kernels[n]);return {name:n,DE00:de00(t,m),target_lab:t,model_lab:m};});
 const result={atlas_reference:target.atlas_reference,atlas_row_id:target.atlas_row_id,reference_spectrum:target.reference_spectrum,model_spectrum:best.model_spectrum,recipe:best.recipe.map(p=>({...p,id:samples[p.index].id,name:samples[p.index].name,reflectance:samples[p.index].R})),total_parts:100,lights:allLights,search:{objective:objective==='D50'?'minimum D50 CIEDE2000':'minimum worst CIEDE2000 across selected illuminants',optimized_lights:names,seed,poolSize,evaluations,max_components:4,model:'Kubelka–Munk S=1',global_optimum_proven:false,physical_measurements:false}};
 emit({type:'done',result});return result;
}
if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope)self.onmessage=e=>{try{searchLight(e.data,m=>self.postMessage(m));}catch(err){self.postMessage({type:'error',message:err.message});}};
