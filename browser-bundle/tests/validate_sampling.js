const assert=require('node:assert/strict');
const {sampleRgba}=require('../src/image-sampling.js');

function image(width,height,pixels){
  const data=new Uint8ClampedArray(width*height*4);
  pixels.forEach((rgba,i)=>data.set(rgba,i*4));
  return data;
}

{
  const data=image(1,1,[[35,56,57,255]]);
  assert.deepEqual(sampleRgba(data,1,1,0,0,1),{size:1,count:1,rgb:[35,56,57],std:[0,0,0],bounds:[0,0,0,0]});
}

{
  const data=image(3,1,[[0,10,20,255],[1,11,21,255],[2,12,22,255]]);
  const sample=sampleRgba(data,3,1,1,0,3);
  assert.deepEqual(sample.rgb,[1,11,21]);
  assert.equal(sample.count,3);
  assert.deepEqual(sample.bounds,[0,0,2,0]);
  sample.std.forEach(value=>assert.ok(Math.abs(value-Math.sqrt(2/3))<1e-12));
}

{
  const data=image(2,2,[[10,20,30,255],[20,30,40,255],[30,40,50,255],[40,50,60,255]]);
  const sample=sampleRgba(data,2,2,0,0,3);
  assert.deepEqual(sample.bounds,[0,0,1,1]);
  assert.equal(sample.count,4);
  assert.deepEqual(sample.rgb,[25,35,45]);
}

{
  const data=image(2,1,[[100,110,120,127],[200,210,220,128]]);
  const sample=sampleRgba(data,2,1,0,0,3);
  assert.equal(sample.count,1);
  assert.deepEqual(sample.rgb,[200,210,220]);
}

{
  const data=image(2,1,[[1,2,3,0],[4,5,6,127]]);
  assert.equal(sampleRgba(data,2,1,0,0,3),null);
}

{
  const data=image(2,1,[[0,0,0,255],[1,1,1,255]]);
  assert.deepEqual(sampleRgba(data,2,1,0,0,3).rgb,[1,1,1]);
}

console.log('PASS: numerical pixel and area sampling vectors');
