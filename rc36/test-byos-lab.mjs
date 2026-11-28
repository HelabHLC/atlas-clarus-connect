// Execute exact vendored WASM with a locally installed test ICC; no profile is shipped.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [runtime,wasm,profilePath,expectedPath]=process.argv.slice(2);
const {instantiate}=await import(pathToFileURL(runtime));
const cms=await instantiate({wasmBinary:readFileSync(wasm),printErr:()=>{}});
globalThis.ATLAS_LOAD_LCMS=async()=>cms;
await import('./byos-lab-worker.js');
const profile=new Uint8Array(readFileSync(profilePath));
const expected=JSON.parse(readFileSync(expectedPath,'utf8'));
assert.equal(createHash('sha256').update(profile).digest('hex'),expected.profile_sha256);
for(const x of expected.cases){
 const y=await globalThis.ATLAS_RC36_LAB_ROUNDTRIP({lab:x.lab,profile,intent:x.intent,bpc:false});
 assert.deepEqual(y.device_values_16bit,x.device);
 assert.ok(y.returned_lab.every((v,i)=>Math.abs(v-x.returned[i])<=0.0001),JSON.stringify({expected:x,actual:y}));
 assert.equal(y.production_approval,false);
}
console.log('PASS: '+expected.cases.length+' direct Lab D50 roundtrips vs independent native LittleCMS; profile SHA-256 '+expected.profile_sha256);
