'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto,createDecipheriv,createHash}=require('node:crypto');
if(!global.crypto)global.crypto=webcrypto;
const H=require('./core.js');
(async()=>{
 const input=new Uint8Array(fs.readFileSync(process.argv[2]||'/tmp/clarus-handoff-test/exchange.zip'));
 const check=await H.code(input),r=await H.seal(input),r2=await H.seal(input);
 assert.equal(r.code,check);assert.notEqual(r.key,r2.key);assert.notDeepEqual(r.bytes,r2.bytes);
 const restored=await H.open(r.bytes,r.key,check);assert.deepEqual(restored,input);
 // Independently decrypt with Node's OpenSSL-backed cipher API.
 const dec=createDecipheriv('aes-256-gcm',Buffer.from(r.key.slice(12),'hex'),r.bytes.slice(8,20));dec.setAAD(Buffer.from('ATLAS Clarus opaque ZIP transport v1'));dec.setAuthTag(r.bytes.slice(-16));const plain=Buffer.concat([dec.update(r.bytes.slice(20,-16)),dec.final()]);assert.deepEqual(plain,Buffer.from(input));assert.equal(check.split(':')[2],createHash('sha256').update(plain).digest('hex'));
 let rejected=0;async function no(fn){await assert.rejects(fn);rejected++;}
 const wrong='ATLAS-KEY-1:'+'00'.repeat(32);await no(()=>H.open(r.bytes,wrong,check));await no(()=>H.open(r.bytes,'123456',check));
 for(const i of [0,8,20,r.bytes.length-1]){const b=r.bytes.slice();b[i]^=1;await no(()=>H.open(b,r.key,check));}
 await no(()=>H.open(r.bytes.slice(0,-1),r.key,check));await no(()=>H.open(r.bytes,r.key,check.replace(/.$/,check.endsWith('0')?'1':'0')));
 const bad=input.slice();bad[30]^=1;await no(()=>H.verify(bad,check));await no(()=>H.verify(input,'ATLAS-CHECK-1:22:'+'0'.repeat(64)));await no(()=>H.verify(input,'123456'));await no(()=>H.code(new Uint8Array([1,2,3])));await no(()=>H.code(new Uint8Array(H.MAX+1)));await no(()=>H.open(new Uint8Array(H.MAX+37),r.key,check));
 fs.writeFileSync('/tmp/clarus-handoff-restored.zip',restored);
 // Fresh RC34 native context verifies all documents after recovery, without modifying native code.
 const base=path.resolve(__dirname,'../../browser-bundle');global.ClarusHandoff=require(base+'/vendor/clarus-handoff/clarus-handoff.js');
 for(const n of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects','pkl-image-binding','colour-reduction','colour-reduction-original','colour-reduction-region','reference-card','colour-reference-card','print-handoff','reduction-job','tool-exchange'])require(base+'/src/'+n+'.js');
 const recovered=path.resolve(__dirname,'../../releases/rc33.8/recovered/assets');for(const n of ['colour-reduction-corrections','colour-reduction-library','colour-reduction-scoped-cleanup'])require(recovered+'/'+n+'.js');
 const m=require('../../hover-library/data/colors.json'),C=global.ATLAS_IMAGE_CODECS,rgba=Uint8Array.from([61,123,25,255,60,123,25,255,0,0,0,255,255,255,255,255]),source=C.png(4,1,rgba);
 const ctx=await ATLAS_TOOL_EXCHANGE.context({colors:m.colors,master:m.master_sha256,libraryViews:{test:{name:'Test',ids:[0,4966,10519]}},decodeSource:async b=>{assert.deepEqual(b,source);return {width:4,height:1,rgba:rgba.slice()};}});
 const a=await ATLAS_TOOL_EXCHANGE.importZip(input,ctx),b=await ATLAS_TOOL_EXCHANGE.importZip(restored,ctx);assert.deepEqual(a,b);
 const QR=require('./vendor/index.js'),qr=new QR(-1,1);qr.addData(check);qr.make();const n=qr.getModuleCount(),pixels=[];for(let y=-4;y<n+4;y++)for(let row=0;row<8;row++)for(let x=-4;x<n+4;x++)for(let col=0;col<8;col++)pixels.push(y<0||x<0||y>=n||x>=n||!qr.isDark(y,x)?255:0);fs.writeFileSync('/tmp/clarus-handoff-qr.pgm',Buffer.concat([Buffer.from(`P5\n${(n+8)*8} ${(n+8)*8}\n255\n`),Buffer.from(pixels)]));fs.writeFileSync('/tmp/clarus-handoff-qr.txt',check);
 console.log(JSON.stringify({status:'PASS',exact_zip_bytes:true,independent_aes_gcm_decryption:true,fresh_random_keys:true,native_RC34_documents:b.documents.length,full_native_state_equal:true,rejections:rejected,qr_modules:n,limit_mib:64}));
})().catch(e=>{console.error(e);process.exitCode=1;});
