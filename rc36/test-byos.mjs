import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({crypto:webcrypto,Uint8Array,DataView});
vm.runInContext(readFileSync(new URL('./byos-profile-registry.js',import.meta.url),'utf8'),ctx);
const api=ctx.ATLAS_RC36_BYOS;
function fixture(){const b=new Uint8Array(152),d=new DataView(b.buffer);const put=(p,s)=>{for(let i=0;i<s.length;i++)b[p+i]=s.charCodeAt(i)};d.setUint32(0,b.length);b[8]=4;put(12,'prtr');put(16,'CMYK');put(20,'Lab ');put(36,'acsp');d.setUint32(128,1);put(132,'desc');d.setUint32(136,144);d.setUint32(140,8);put(144,'text');return b;}
test('structural fixture, actual SHA-256, no bytes in metadata, clear',async()=>{
 const b=fixture(),expected=createHash('sha256').update(b).digest('hex');
 const m=await api.add({name:'synthetic.icc',size:b.length,arrayBuffer:async()=>b.buffer});
 assert.equal(m.sha256,expected);assert.equal(m.validation,'HEADER_AND_TAG_BOUNDS_ONLY');
 assert.equal(m.calculation,'NOT_CALCULATED');assert.equal(m.origin,'USER_LOCAL');
 assert.ok(!JSON.stringify(api.list()).includes('bytes'));
 const copy=api.copyForEngine(expected);copy[0]=255;assert.equal(api.copyForEngine(expected)[0],0);
 api.clear();assert.equal(api.selected(),null);assert.throws(()=>api.copyForEngine(expected));
});
test('invalid length, class, magic and tag offset rejected',()=>{
 for(const pos of [0,12,36,136]){const b=fixture();b[pos]^=255;assert.throws(()=>api.inspect(b));}
});
test('clear cancels pending import',async()=>{
 const b=fixture();let resolve;const promise=api.add({name:'pending.icc',size:b.length,arrayBuffer:()=>new Promise(r=>resolve=r)});api.clear();resolve(b.buffer);await assert.rejects(promise,/cancelled/);assert.equal(api.selected(),null);
});
