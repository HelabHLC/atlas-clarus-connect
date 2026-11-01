'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
require('../../browser-bundle/src/colour-origin.js');
require(path.resolve(process.argv[3],'assets/palette-export.js'));
const O=global.ATLAS_COLOUR_ORIGIN,E=global.ATLAS_CLARUS_EXPORTS;
const dir=path.resolve(process.argv[2]),read=name=>fs.readFileSync(path.join(dir,name));
const oracle=JSON.parse(read('oracle.json'));
const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0};
function chunk(name,data){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(name,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b}
const pngWith=(...chunks)=>{const b=read('untagged.png');return Buffer.concat([b.subarray(0,33),...chunks,b.subarray(33)])};
function app2(bytes,index,total){const payload=Buffer.concat([Buffer.from('ICC_PROFILE\0'),Buffer.from([index,total]),bytes]);const b=Buffer.alloc(4);b[0]=255;b[1]=0xe2;b.writeUInt16BE(payload.length+2,2);return Buffer.concat([b,payload])}
const jpegWith=(...segments)=>{const b=read('untagged.jpg');return Buffer.concat([b.subarray(0,2),...segments,b.subarray(2)])};
(async()=>{
  let checks=0;const records={};
  for(const [name,expected] of Object.entries(oracle)) {
    const r=await O.inspect(read(name));records[name]=r;assert.equal(r.file_sha256,expected.file_sha256);O.validate(r,r.file_sha256);
    assert.equal(r.icc.sha256,expected.icc_sha256,name);assert.equal(r.icc.bytes,expected.icc_bytes,name);
    assert.equal(r.icc.status,expected.icc_sha256?'EMBEDDED_ICC':name.endsWith('.gif')?'NOT_INSPECTED':'NO_EMBEDDED_ICC',name);
    assert.equal(r.declaration,expected.icc_sha256?'ICC':expected.png_srgb===0?'PNG_SRGB':'UNKNOWN',name);
    assert.equal(r.processing.browser_transform,'NOT_OBSERVABLE');assert.equal(r.processing.source_profile_assumption,'NONE_BY_ATLAS');checks++;
  }
  const profile=read('source-srgb.icc'),half=profile.length>>1;
  const split=await O.inspect(jpegWith(app2(profile.subarray(half),2,2),app2(profile.subarray(0,half),1,2)));
  assert.equal(split.icc.sha256,records['profiled.jpg'].icc.sha256);checks++;
  const invalid=[jpegWith(app2(profile.subarray(0,half),1,2)),jpegWith(app2(profile,1,1),app2(profile,1,1)),
    jpegWith(app2(profile,0,1)),jpegWith(app2(Buffer.alloc(200),1,1)),
    pngWith(chunk('sRGB',Buffer.from([0])),chunk('sRGB',Buffer.from([0]))),
    pngWith(chunk('iCCP',Buffer.concat([Buffer.from('p\0\0'),zlib.deflateSync(Buffer.alloc(180))]))),
    pngWith(chunk('sRGB',Buffer.from([8]))),read('profiled.png').subarray(0,60),read('profiled.webp').subarray(0,70)];
  const damaged=Buffer.from(read('declared-srgb.png'));damaged[43]^=1;invalid.push(damaged);
  for(const bytes of invalid){const r=await O.inspect(bytes);assert.equal(r.icc.status,'INVALID_METADATA');assert.equal(r.declaration,'UNKNOWN');O.validate(r,r.file_sha256);checks++}
  const iccp=chunk('iCCP',Buffer.concat([Buffer.from('p\0\0'),zlib.deflateSync(profile)]));
  const conflict=await O.inspect(pngWith(iccp,chunk('sRGB',Buffer.from([0]))));assert.equal(conflict.icc.status,'INVALID_METADATA');checks++;
  const cicp=await O.inspect(pngWith(iccp,chunk('cICP',Buffer.from([12,13,0,1]))));
  assert.equal(cicp.icc.status,'EMBEDDED_ICC');assert.equal(cicp.declaration,'OTHER_METADATA');assert.match(O.render({name:'cicp.png',colour_origin:cicp}),/takes precedence/);checks++;
  const ds=global.DecompressionStream;global.DecompressionStream=undefined;
  assert.equal((await O.inspect(read('profiled.png'))).icc.status,'NOT_INSPECTED');global.DecompressionStream=ds;checks++;
  const tooBig=await O.inspect(new Uint8Array(O.MAX_FILE+1));assert.equal(tooBig.icc.status,'NOT_INSPECTED');checks++;
  const oversized=await O.inspect(pngWith(chunk('iCCP',Buffer.concat([Buffer.from('big\0\0'),zlib.deflateSync(Buffer.alloc(O.MAX_ICC+1))]))));
  assert.equal(oversized.icc.status,'NOT_INSPECTED');assert.ok(oversized.notes.includes('PROFILE_SIZE_LIMIT'));checks++;
  const newer=Buffer.from(profile);newer[8]=5;
  assert.equal((await O.inspect(jpegWith(app2(newer,1,1)))).icc.status,'NOT_INSPECTED');checks++;
  const r=records['profiled.png'];
  for(const mutate of [x=>x.file_sha256='0'.repeat(64),x=>x.processing.browser_transform='CONVERTED',
    x=>x.processing.source_profile_assumption='sRGB',x=>x.icc.status='NO_EMBEDDED_ICC',x=>x.icc.bytes=-1,
    x=>x.icc.name='<script>\n',x=>x.extra=true,x=>x.declaration='PNG_SRGB']){
    const bad=structuredClone(r);mutate(bad);assert.throws(()=>O.validate(bad,r.file_sha256));checks++;
  }
  const data=JSON.parse(fs.readFileSync('hover-library/data/colors.json')),c=data.colors.find(c=>c.id===4966);
  const im={name:'profiled.png',width:2,height:1,sha256:r.file_sha256,colour_origin:r};
  const sample={rgb:[61,123,25],size:1,bounds:[0,0,0,0],count:1,std:[0,0,0]};
  const record=E.createSourceAssignment(sample,{ix:0,iy:0},im,c,data.master_sha256);
  const json=E.clarus([c],data.master_sha256,'Origin test',[record]);
  assert.deepEqual(E.parseClarus(json,data.colors,data.master_sha256).sourceAssignments,[record]);checks++;
  const legacy=structuredClone(json);delete legacy.source_assignments[0].image.colour_origin;
  assert.equal(E.parseClarus(legacy,data.colors,data.master_sha256).sourceAssignments[0].image.colour_origin,undefined);checks++;
  assert.match(O.render({name:'legacy'}),/Not inspected/);assert.match(O.render({name:'<img onerror=bad>',colour_origin:r},record),/&lt;img/);checks++;
  const broken=structuredClone(json);broken.source_assignments[0].image.colour_origin.processing.target_space='Adobe RGB';assert.throws(()=>E.parseClarus(broken,data.colors,data.master_sha256));checks++;
  console.log(`PASS: ${checks} metadata/limits/round-trip groups; independent Pillow ICC fingerprints, split JPEG, PNG declarations, malformed input, legacy and tamper rejection.`);
  fs.writeFileSync(path.join(dir,'metadata-results.json'),JSON.stringify({checks,records},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
