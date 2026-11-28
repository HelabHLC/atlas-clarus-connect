/* RC36 Public BYOS: local output profile registry; structural preflight only. */
(function installBYOS(root){
  'use strict';
  const MAX=32*1024*1024, registry=new Map();
  let active=null, epoch=0;
  const sig=(b,o)=>String.fromCharCode(...b.subarray(o,o+4));
  function inspect(b){
    if(!(b instanceof Uint8Array)||b.length<132||b.length>MAX)throw Error('ICC size out of range');
    const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
    if(d.getUint32(0)!==b.length||sig(b,36)!=='acsp')throw Error('Invalid ICC header or declared size');
    if(![2,4].includes(b[8]))throw Error('Unsupported ICC major version');
    const deviceClass=sig(b,12),deviceSpace=sig(b,16),pcs=sig(b,20);
    if(deviceClass!=='prtr'||!['RGB ','CMYK','2CLR','3CLR','4CLR','5CLR','6CLR','7CLR','8CLR','9CLR','ACLR','BCLR','CCLR','DCLR','ECLR','FCLR','GRAY'].includes(deviceSpace)||!['Lab ','XYZ '].includes(pcs))throw Error('Unsupported output profile class or colour space');
    const count=d.getUint32(128);
    if(count<1||count>4096||132+12*count>b.length)throw Error('Invalid ICC tag table');
    const start=132+12*count, tags=new Set();
    for(let i=0;i<count;i++){
      const p=132+12*i,t=sig(b,p),o=d.getUint32(p+4),n=d.getUint32(p+8);
      if(tags.has(t)||o<start||o%4||n<8||o+n>b.length)throw Error('Invalid ICC tag entry');
      tags.add(t);
    }
    return {deviceClass,deviceSpace,pcs,versionMajor:b[8],tagCount:count,size:b.length};
  }
  const metadata=x=>x?{...x.meta}:null;
  async function add(file){
    const generation=epoch;
    if(!file||!Number.isInteger(file.size)||file.size<132||file.size>MAX)throw Error('ICC size out of range');
    const b=new Uint8Array(await file.arrayBuffer());
    if(b.length!==file.size)throw Error('File size mismatch');
    const info=inspect(b);
    if(!root.crypto?.subtle)throw Error('SHA-256 unavailable in this browser context');
    const hash=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
    if(generation!==epoch)throw Error('Import cancelled');
    if(!registry.has(hash)&&registry.size>=16)throw Error('Maximum 16 profiles per session');
    registry.set(hash,{bytes:b.slice(),meta:{sha256:hash,name:String(file.name||'profile').slice(0,255),...info,origin:'USER_LOCAL',validation:'HEADER_AND_TAG_BOUNDS_ONLY',calculation:'NOT_CALCULATED'}});
    active=hash; return metadata(registry.get(hash));
  }
  function select(hash){if(!registry.has(hash))throw Error('Profile not available');active=hash;return selected()}
  function selected(){return metadata(registry.get(active))}
  function list(){return [...registry.values()].map(metadata)}
  function clear(){epoch++;registry.clear();active=null}
  function copyForEngine(hash){const x=registry.get(hash);if(!x)throw Error('Profile not available');return x.bytes.slice()}
  root.ATLAS_RC36_BYOS=Object.freeze({inspect,add,select,selected,list,clear,copyForEngine});
})(globalThis);
