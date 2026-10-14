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
test('protected single-pixel island survives with correct number and exact edges',async()=>{const f=fixture(),input=await readPackage(pack(f.files)),out=await generate(input);assert.deepEqual(input.indices,f.result.indices);assert.equal(out.mapping.regions.length,2);const island=out.mapping.regions.find(r=>r.pixels===1);assert.equal(island.number,2);assert.equal(island.tiny,true);assert.match(out.worksheet,/M2 2v1/);assert.match(out.legend,/H000_L090_C000/);});
test('all 256 selected references retain separate numbers including unused protected references',async()=>{const f=fixture(256),out=await generate(await readPackage(pack(f.files)));assert.equal(out.mapping.palette.length,256);assert.equal(out.mapping.palette[255].number,256);assert.equal(out.mapping.palette[255].atlas_row_id,255);});
test('rehashing altered assignment cannot bypass source recomputation',async()=>{const f=fixture();f.files['output-palette-index.u16le'][24]=0;await assert.rejects(readPackage(pack(f.files)),/Pixel assignment mismatch/);});
test('transparency is rejected without flattening',async()=>{const f=fixture(2,128);await assert.rejects(readPackage(pack(f.files)),/opaque/);});
test('original actual RC33.2 export is rejected explicitly for alpha rather than silently modified',async()=>{const path=process.env.ATLAS_REAL_ZIP;if(!path){return;}await assert.rejects(readPackage(new Uint8Array(await readFile(path))),/opaque/);});

if(process.env.ATLAS_DEMO_PATH){await (await import("node:fs/promises")).writeFile(process.env.ATLAS_DEMO_PATH,pack(fixture().files));}

test('direct image reduction matches ZIP path and protects clicked reference',async()=>{const f=fixture();const clicked=imageReference([226,226,226]);assert.equal(clicked.id,1);const reduced=await reduceImage({rgba:f.files['input-rgba.bin'],width:5,height:5,k:2,lockedIds:[0,clicked.id],sourceBytes:new Uint8Array([1]),sourceName:'test.png'});assert.deepEqual(reduced.indices,f.result.indices);const out=await generate(reduced);assert.equal(out.mapping.regions.find(r=>r.pixels===1).number,2);assert.equal(out.mapping.source.name,'test.png');});
test('direct image rejects alpha and impossible protection limit',async()=>{const f=fixture(2,128);await assert.rejects(reduceImage({rgba:f.files['input-rgba.bin'],width:5,height:5,k:2,sourceBytes:new Uint8Array([1])}),/deckendes/);const opaque=fixture();await assert.rejects(reduceImage({rgba:opaque.files['input-rgba.bin'],width:5,height:5,k:1,lockedIds:[0,1],sourceBytes:new Uint8Array([1])}),/protected/);});
