import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
import {readPackage,generate,reduceImage,imageReference} from './dist/bridge.mjs';
const master=JSON.parse(await readFile('../hover-library/data/colors.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(count=2,alpha=255){
 const colors=master.colors.slice(0,count),w=count===256?256:5,h=count===256?1:5;
 const rgba=new Uint8Array(w*h*4);for(let p=0;p<w*h;p++)rgba.set([...colors[count===256?p:p===12?1:0].rgb,alpha],p*4);
 const result=globalThis.ATLAS_COLOUR_REDUCTION.reduce({rgba,width:w,height:h,colors:master.colors,master:master.master_sha256,k:count,lockedIds:colors.map(c=>c.id)});
 const report={...result.report,source:{input_rgba_sha256:hash(rgba),file_sha256:hash(rgba)},output_rgba_sha256:hash(result.pixels)};
 const files={'input-rgba.bin':rgba,'input-atlas-row-id.u16le':globalThis.ATLAS_COLOUR_REDUCTION.assignmentBytes(result.assignments),'output-palette-index.u16le':globalThis.ATLAS_COLOUR_REDUCTION.assignmentBytes(result.indices),'reduction.json':strToU8(JSON.stringify(report))};
 return {files,result,report};
}
function pack(files){const hashes=Object.fromEntries(Object.entries(files).map(([n,b])=>[n,hash(b)]));return zipSync({...files,'reduction-package-manifest.json':strToU8(JSON.stringify({schema:'atlas-clarus-colour-reduction-package/1.0',files:hashes}))});}
test('protected single-pixel island survives the drakarah pipeline with correct number',async()=>{const f=fixture(),input=await readPackage(pack(f.files)),out=await generate(input);assert.deepEqual(input.indices,f.result.indices);assert.equal(out.mapping.regions.length,2);const island=out.mapping.regions.find(r=>r.pixels===1);assert.equal(island.number,2);assert.equal(island.tiny,true);assert.match(out.worksheet,/data-region="1"/);assert.equal(out.mapping.pipeline.length,5);assert.ok(island.contour_points>=4);assert.match(out.legend,/H000_L090_C000/);});
test('all 256 selected references retain separate numbers including unused protected references',async()=>{const f=fixture(256),out=await generate(await readPackage(pack(f.files)));assert.equal(out.mapping.palette.length,256);assert.equal(out.mapping.palette[255].number,256);assert.equal(out.mapping.palette[255].atlas_row_id,255);});
test('rehashing altered assignment cannot bypass source recomputation',async()=>{const f=fixture();f.files['output-palette-index.u16le'][24]=0;await assert.rejects(readPackage(pack(f.files)),/Pixel assignment mismatch/);});
test('transparency is rejected without flattening',async()=>{const f=fixture(2,128);await assert.rejects(readPackage(pack(f.files)),/opaque/);});
test('original actual RC33.2 export is rejected explicitly for alpha rather than silently modified',async()=>{const path=process.env.ATLAS_REAL_ZIP;if(!path){return;}await assert.rejects(readPackage(new Uint8Array(await readFile(path))),/opaque/);});

if(process.env.ATLAS_DEMO_PATH){await (await import("node:fs/promises")).writeFile(process.env.ATLAS_DEMO_PATH,pack(fixture().files));}

test('direct image reduction matches ZIP path and protects clicked reference',async()=>{const f=fixture();const clicked=imageReference([226,226,226]);assert.equal(clicked.id,1);const reduced=await reduceImage({rgba:f.files['input-rgba.bin'],width:5,height:5,k:2,lockedIds:[0,clicked.id],sourceBytes:new Uint8Array([1]),sourceName:'test.png'});assert.deepEqual(reduced.indices,f.result.indices);const out=await generate(reduced);assert.equal(out.mapping.regions.find(r=>r.pixels===1).number,2);assert.equal(out.mapping.source.name,'test.png');});
test('direct image rejects alpha and impossible protection limit',async()=>{const f=fixture(2,128);await assert.rejects(reduceImage({rgba:f.files['input-rgba.bin'],width:5,height:5,k:2,sourceBytes:new Uint8Array([1])}),/deckendes/);const opaque=fixture();await assert.rejects(reduceImage({rgba:opaque.files['input-rgba.bin'],width:5,height:5,k:1,lockedIds:[0,1],sourceBytes:new Uint8Array([1])}),/protected/);});

test('drakarah traces nested regions and places each label into its own source region',async()=>{const w=9,h=9,rgba=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ring=x>=2&&x<=6&&y>=2&&y<=6;const center=x>=3&&x<=5&&y>=3&&y<=5;rgba.set([...master.colors[ring&&!center?1:0].rgb,255],(y*w+x)*4);}const reduced=await reduceImage({rgba,width:w,height:h,k:2,lockedIds:[0,1],sourceBytes:rgba});const before=reduced.indices.slice(),out=await generate(reduced);assert.deepEqual(reduced.indices,before);assert.equal(out.mapping.regions.length,3);for(const r of out.mapping.regions){const i=Math.floor(r.label.y)*w+Math.floor(r.label.x);assert.equal(reduced.indices[i]+1,r.number);assert.ok(r.contour_points>=4);}assert.doesNotMatch(out.worksheet,/NaN|Infinity/);assert.equal(out.mapping.border_segment_halving,0);});

test('uniform single-pixel image creates a finite contour and label',async()=>{const rgba=new Uint8Array([...master.colors[0].rgb,255]);const out=await generate(await reduceImage({rgba,width:1,height:1,k:1,sourceBytes:rgba}));assert.equal(out.mapping.regions.length,1);assert.equal(out.mapping.regions[0].pixels,1);assert.doesNotMatch(out.worksheet,/NaN|Infinity/);assert.ok(out.mapping.regions[0].contour_points>=4);});
