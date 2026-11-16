/* Deterministic RGBA PNG output and bounded, stored-ZIP exchange. No network. */
(function(root){
  'use strict';
  const need=(v,m)=>{if(!v)throw Error(m);},utf8=s=>new TextEncoder().encode(s);
  const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
  function crc(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function concat(parts){const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;}
  function u32(n){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n);return b;}
  function png(width,height,rgba){
    need(rgba.length===width*height*4,'Invalid RGBA dimensions.');
    const raw=new Uint8Array((width*4+1)*height);
    for(let y=0;y<height;y++)raw.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
    const parts=[Uint8Array.of(0x78,0x01)];
    for(let i=0;i<raw.length;i+=65535){const n=Math.min(65535,raw.length-i),h=new Uint8Array(5),v=new DataView(h.buffer);h[0]=i+n===raw.length?1:0;v.setUint16(1,n,true);v.setUint16(3,n^65535,true);parts.push(h,raw.subarray(i,i+n));}
    let a=1,b=0;for(const x of raw){a=(a+x)%65521;b=(b+a)%65521;}parts.push(u32(((b<<16)|a)>>>0));
    const chunk=(name,data)=>{const body=concat([utf8(name),data]);return concat([u32(data.length),body,u32(crc(body))]);};
    const ihdr=concat([u32(width),u32(height),Uint8Array.of(8,6,0,0,0)]);
    return concat([Uint8Array.of(137,80,78,71,13,10,26,10),chunk('IHDR',ihdr),chunk('sRGB',Uint8Array.of(0)),chunk('IDAT',concat(parts)),chunk('IEND',new Uint8Array())]);
  }
  function imageInfo(bytes){
    const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)&&String.fromCharCode(...bytes.subarray(12,16))==='IHDR')return {mime:'image/png',extension:'png',width:v.getUint32(16),height:v.getUint32(20)};
    if(bytes.length>4&&bytes[0]===255&&bytes[1]===216){
      let i=2;while(i+3<bytes.length){need(bytes[i]===255,'Invalid JPEG header.');while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===0xd9||marker===0xda)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
        const n=v.getUint16(i);need(n>=2&&i+n<=bytes.length,'Invalid JPEG segment.');
        if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){need(n>=8,'Invalid JPEG dimensions.');return {mime:'image/jpeg',extension:'jpg',width:v.getUint16(i+5),height:v.getUint16(i+3)};}i+=n;
      }
    }
    throw Error('Choose a PNG or JPEG image.');
  }
  function unzip(bytes,max=96*1024*1024){
    need(bytes instanceof Uint8Array&&bytes.length>=22&&bytes.length<=max,'Invalid or oversized image-project ZIP.');
    const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
    need(v.getUint32(end,true)===0x06054b50&&v.getUint16(end+4,true)===0&&v.getUint16(end+6,true)===0&&v.getUint16(end+20,true)===0,'Use a ZIP exported by Image Projects.');
    const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),size=v.getUint32(end+12,true);
    need(count>=4&&count<=8&&v.getUint16(end+8,true)===count&&start+size===end,'Invalid ZIP directory.');
    const files=Object.create(null);let at=start,local=0;
    const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
    for(let i=0;i<count;i++){
      need(at+46<=end&&v.getUint32(at,true)===0x02014b50,'Invalid ZIP entry.');
      const flags=v.getUint16(at+8,true),method=v.getUint16(at+10,true),sum=v.getUint32(at+16,true),length=v.getUint32(at+20,true),n=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),offset=v.getUint32(at+42,true);
      need(flags===0x800&&method===0&&length===v.getUint32(at+24,true)&&!extra&&!comment&&v.getUint16(at+34,true)===0&&offset===local&&at+46+n<=end,'Unsupported or inconsistent ZIP entry.');
      const name=decode(bytes.subarray(at+46,at+46+n));need(/^[a-z][a-z0-9._/-]{0,100}$/.test(name)&&!name.includes('..')&&!Object.hasOwn(files,name),'Invalid or duplicate ZIP filename.');
      need(local+30<=start&&v.getUint32(local,true)===0x04034b50&&v.getUint16(local+6,true)===flags&&v.getUint16(local+8,true)===0&&v.getUint32(local+14,true)===sum&&v.getUint32(local+18,true)===length&&v.getUint32(local+22,true)===length&&v.getUint16(local+26,true)===n&&v.getUint16(local+28,true)===0,'Invalid ZIP local header.');
      const body=local+30+n;need(body+length<=start&&decode(bytes.subarray(local+30,body))===name,'Invalid ZIP payload.');
      files[name]=bytes.slice(body,body+length);need(crc(files[name])===sum,'ZIP checksum mismatch: '+name);local=body+length;at+=46+n;
    }
    need(local===start&&at===end,'Unexpected ZIP content.');return files;
  }
  root.ATLAS_IMAGE_CODECS={png,imageInfo,unzip,crc};
})(typeof window==='undefined'?globalThis:window);
