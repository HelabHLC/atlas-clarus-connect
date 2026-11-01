(function (root) {
  'use strict';
  // Metadata inspection only. Never assigns a profile or changes a pixel/reference.
  const MAX_FILE = 64 * 1024 * 1024, MAX_ICC = 16 * 1024 * 1024;
  const ascii = (b, p, n) => String.fromCharCode(...b.subarray(p, p + n));
  const u32 = (b, p, little = false) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(p, little);
  const clean = text => String(text).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 160);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hashOK = h => h === null || (typeof h === 'string' && /^[a-f0-9]{64}$/.test(h));
  async function hash(bytes) {
    try { return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join(''); }
    catch (_) { return null; }
  }
  const blankICC = status => ({status, name:null, sha256:null, bytes:null, colour_space:null});
  function empty(format = 'UNKNOWN', sha = null) {
    return {schema:'atlas-colour-origin/1.0', file_format:format, file_sha256:sha,
      icc:blankICC('NOT_INSPECTED'), declaration:'UNKNOWN', notes:[],
      processing:{representation:'BROWSER_DECODED_SRGB', target_space:'sRGB', bits_per_channel:8,
        browser_transform:'NOT_OBSERVABLE', source_profile_assumption:'NONE_BY_ATLAS'}};
  }
  function crc32(b) {
    let c = 0xffffffff;
    for (const n of b) { c ^= n; for (let k=0;k<8;k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); }
    return (c ^ 0xffffffff) >>> 0;
  }
  async function inflate(bytes) {
    if (!root.DecompressionStream) throw Error('DECOMPRESSION_UNAVAILABLE');
    const reader = new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('deflate')).getReader();
    const parts = []; let size = 0;
    try {
      while (true) { const {done, value} = await reader.read(); if (done) break;
        size += value.length; if (size > MAX_ICC) throw Error('PROFILE_SIZE_LIMIT'); parts.push(value); }
    } finally { await reader.cancel().catch(() => {}); }
    const out = new Uint8Array(size); let p = 0;
    for (const part of parts) { out.set(part, p); p += part.length; } return out;
  }
  async function readICC(bytes, label = '') {
    if (bytes.length > MAX_ICC) throw Error('PROFILE_SIZE_LIMIT');
    if (bytes.length < 132 || u32(bytes, 0) !== bytes.length ||
        ascii(bytes, 36, 4) !== 'acsp') throw Error('INVALID_ICC_HEADER');
    if (![2,4].includes(bytes[8])) throw Error('UNSUPPORTED_ICC_VERSION');
    const count = u32(bytes, 128), tags = new Set();
    if (count > 4096 || 132 + count * 12 > bytes.length) throw Error('INVALID_ICC_TAG_TABLE');
    let name = '';
    for (let i=0;i<count;i++) {
      const p = 132+i*12, tag = ascii(bytes,p,4), start = u32(bytes,p+4), length = u32(bytes,p+8);
      if (tags.has(tag) || start < 132+count*12 || length < 8 || start+length > bytes.length || start%4) throw Error('INVALID_ICC_TAG');
      tags.add(tag);
      if (tag !== 'desc') continue;
      const type = ascii(bytes,start,4);
      if (type === 'desc' && length >= 12) {
        const n = u32(bytes,start+8);
        if (n > 0 && n <= length-12) name = clean(ascii(bytes,start+12,Math.min(n,160)));
      } else if (type === 'mluc' && length >= 28) {
        const records = u32(bytes,start+8), stride = u32(bytes,start+12);
        if (records > 0 && records <= 4096 && stride >= 12 && 16+records*stride <= length) {
          const size = u32(bytes,start+20), offset = u32(bytes,start+24);
          if (size%2 === 0 && offset >= 16+records*stride && offset+size <= length) {
            for (let j=0;j<Math.min(size,320);j+=2) name += String.fromCharCode((bytes[start+offset+j]<<8)|bytes[start+offset+j+1]);
            name = clean(name);
          }
        }
      }
    }
    return {status:'EMBEDDED_ICC', name:name || clean(label) || 'Unnamed ICC profile',
      sha256:await hash(bytes), bytes:bytes.length, colour_space:clean(ascii(bytes,16,4))};
  }
  async function png(b, r) {
    let p=8, first=true, end=false, pixels=false, icc=null, srgb=false, cicp=false, colourType=null;
    const seen=new Set();
    while (p < b.length) {
      if (p+12>b.length) throw Error('TRUNCATED_PNG');
      const n=u32(b,p), type=ascii(b,p+4,4), start=p+8, next=p+12+n;
      if (next>b.length || (first && (type!=='IHDR'||n!==13))) throw Error('INVALID_PNG_STRUCTURE');
      first=false;
      if (['IHDR','iCCP','sRGB','cICP','gAMA','cHRM','eXIf','IEND'].includes(type)) {
        if (seen.has(type) || crc32(b.subarray(p+4,start+n))!==u32(b,start+n)) throw Error('INVALID_PNG_METADATA');
        seen.add(type);
      }
      if (type==='IHDR') colourType=b[start+9];
      if (['iCCP','sRGB','cICP'].includes(type) && pixels) throw Error('LATE_PNG_COLOUR_METADATA');
      if (type==='iCCP') {
        const payload=b.subarray(start,start+n), zero=payload.indexOf(0);
        if (zero<1 || zero>79 || payload[zero+1]!==0 || zero+2>=n) throw Error('INVALID_PNG_ICCP');
        icc=await readICC(await inflate(payload.subarray(zero+2)),ascii(payload,0,zero));
        if (icc.colour_space!==([0,4].includes(colourType)?'GRAY':'RGB')) throw Error('PNG_ICC_SPACE_MISMATCH');
      }
      if (type==='sRGB') { if (n!==1 || b[start]>3) throw Error('INVALID_PNG_SRGB'); srgb=true; }
      if (type==='cICP') { if (n!==4 || b[start+2]!==0 || b[start+3]>1) throw Error('INVALID_PNG_CICP'); cicp=true; }
      if (type==='IDAT') pixels=true;
      if (type==='IEND') { if (n!==0 || !pixels || next!==b.length) throw Error('INVALID_PNG_END'); end=true; break; }
      p=next;
    }
    if (!end) throw Error('TRUNCATED_PNG');
    if (icc && srgb && !cicp) throw Error('CONFLICTING_PNG_COLOUR_METADATA');
    r.icc=icc||blankICC('NO_EMBEDDED_ICC');
    r.declaration=cicp?'OTHER_METADATA':icc?'ICC':srgb?'PNG_SRGB':'UNKNOWN';
    if (cicp) r.notes.push('PNG_CICP_PRECEDENCE_NOT_INTERPRETED');
    if (seen.has('gAMA')||seen.has('cHRM')||seen.has('eXIf')) r.notes.push('OTHER_METADATA_NOT_INTERPRETED');
  }
  async function jpeg(b, r) {
    let p=2, total=0, ended=false; const parts=new Map();
    while(p<b.length) {
      if(b[p++]!==255) throw Error('INVALID_JPEG_MARKER');
      while(b[p]===255) p++;
      const marker=b[p++];
      if(marker===0xda || marker===0xd9) { ended=true; break; }
      if(marker===0x01 || (marker>=0xd0&&marker<=0xd7)) continue;
      if(p+2>b.length) throw Error('TRUNCATED_JPEG');
      const n=(b[p]<<8)|b[p+1];
      if(n<2 || p+n>b.length) throw Error('TRUNCATED_JPEG');
      const start=p+2, length=n-2;
      if(marker===0xe1 && ascii(b,start,6)==='Exif\0\0') r.notes.push('EXIF_COLOUR_SPACE_NOT_INTERPRETED');
      if(marker===0xe2 && ascii(b,start,Math.min(length,11))==='ICC_PROFILE') {
        if(length<14 || b[start+11]!==0) throw Error('INVALID_JPEG_ICC');
        const index=b[start+12], count=b[start+13];
        if(!count || !index || index>count || parts.has(index) || (total && total!==count)) throw Error('INVALID_JPEG_ICC_SEQUENCE');
        total=count; parts.set(index,b.subarray(start+14,p+n));
      }
      p+=n;
    }
    if(!ended) throw Error('TRUNCATED_JPEG');
    if(!total) { r.icc=blankICC('NO_EMBEDDED_ICC'); return; }
    if(parts.size!==total) throw Error('INCOMPLETE_JPEG_ICC');
    const size=[...parts.values()].reduce((n,v)=>n+v.length,0);
    if(size>MAX_ICC) throw Error('PROFILE_SIZE_LIMIT');
    const bytes=new Uint8Array(size); let offset=0;
    for(let i=1;i<=total;i++) { bytes.set(parts.get(i),offset); offset+=parts.get(i).length; }
    r.icc=await readICC(bytes); r.declaration='ICC';
  }
  async function webp(b,r) {
    if(u32(b,4,true)+8!==b.length) throw Error('INVALID_WEBP_SIZE');
    let p=12, profile=null;
    while(p<b.length) {
      if(p+8>b.length) throw Error('TRUNCATED_WEBP');
      const type=ascii(b,p,4), n=u32(b,p+4,true), end=p+8+n;
      if(end+(n%2)>b.length) throw Error('TRUNCATED_WEBP');
      if(type==='ICCP') { if(profile) throw Error('DUPLICATE_WEBP_ICC'); profile=await readICC(b.subarray(p+8,end)); }
      if(type==='EXIF') r.notes.push('EXIF_COLOUR_SPACE_NOT_INTERPRETED');
      p=end+(n%2);
    }
    r.icc=profile||blankICC('NO_EMBEDDED_ICC'); r.declaration=profile?'ICC':'UNKNOWN';
  }
  async function inspect(bytes) {
    const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes), r=empty('UNKNOWN',await hash(b));
    if(b.length>MAX_FILE) { r.notes=['FILE_SIZE_LIMIT']; return r; }
    try {
      if(b.length>=8 && ascii(b,0,8)==='\x89PNG\r\n\x1a\n') { r.file_format='PNG'; await png(b,r); }
      else if(b[0]===255 && b[1]===216) { r.file_format='JPEG'; await jpeg(b,r); }
      else if(b.length>=12 && ascii(b,0,4)==='RIFF' && ascii(b,8,4)==='WEBP') { r.file_format='WEBP'; await webp(b,r); }
      else { r.file_format=ascii(b,0,3)==='GIF'?'GIF':'UNKNOWN'; r.notes=['FORMAT_NOT_INSPECTED']; }
    } catch(error) {
      r.icc=blankICC(['DECOMPRESSION_UNAVAILABLE','UNSUPPORTED_ICC_VERSION','PROFILE_SIZE_LIMIT'].includes(error.message)?'NOT_INSPECTED':'INVALID_METADATA');
      r.declaration='UNKNOWN'; r.notes=[/^[A-Z_]+$/.test(error.message)?error.message:'METADATA_READ_FAILED'];
    }
    r.notes=[...new Set(r.notes)].slice(0,8); return r;
  }
  function keys(value, expected) {
    return value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).sort().join('|')===expected.sort().join('|');
  }
  function validate(r, fileHash) {
    const p=r?.processing, i=r?.icc;
    if(!keys(r,['schema','file_format','file_sha256','icc','declaration','notes','processing']) ||
       r.schema!=='atlas-colour-origin/1.0' || !['PNG','JPEG','WEBP','GIF','UNKNOWN'].includes(r.file_format) ||
       !hashOK(r.file_sha256) || r.file_sha256!==fileHash ||
       !keys(p,['representation','target_space','bits_per_channel','browser_transform','source_profile_assumption']) ||
       p.representation!=='BROWSER_DECODED_SRGB' || p.target_space!=='sRGB' || p.bits_per_channel!==8 ||
       p.browser_transform!=='NOT_OBSERVABLE' || p.source_profile_assumption!=='NONE_BY_ATLAS' ||
       !keys(i,['status','name','sha256','bytes','colour_space']) ||
       !['EMBEDDED_ICC','NO_EMBEDDED_ICC','INVALID_METADATA','NOT_INSPECTED'].includes(i.status) ||
       !['ICC','PNG_SRGB','OTHER_METADATA','UNKNOWN'].includes(r.declaration) ||
       !Array.isArray(r.notes) || r.notes.length>8 || r.notes.some(n=>typeof n!=='string'||!/^[A-Z_]{1,80}$/.test(n))) throw Error('Invalid colour-origin record.');
    if(i.status==='EMBEDDED_ICC') {
      if(typeof i.name!=='string'||!i.name.length||i.name.length>160||clean(i.name)!==i.name||!hashOK(i.sha256)||
         !Number.isInteger(i.bytes)||i.bytes<132||i.bytes>MAX_ICC||typeof i.colour_space!=='string'||
         !/^[\x20-\x7e]{1,4}$/.test(i.colour_space)||!['ICC','OTHER_METADATA'].includes(r.declaration)) throw Error('Invalid recorded ICC metadata.');
    } else if(i.name!==null||i.sha256!==null||i.bytes!==null||i.colour_space!==null||r.declaration==='ICC') throw Error('Uninspected profile cannot carry ICC identity.');
    if(r.declaration==='PNG_SRGB' && (r.file_format!=='PNG'||i.status!=='NO_EMBEDDED_ICC')) throw Error('Invalid sRGB declaration.');
    if(['INVALID_METADATA','NOT_INSPECTED'].includes(i.status)&&r.declaration!=='UNKNOWN') throw Error('Unverified source declaration.');
    return clone(r);
  }
  function render(image, assignment=null, open=false) {
    const r=image?.colour_origin, i=r?.icc;
    const status=!r?'Not inspected — older or unsupported source record':
      i.status==='EMBEDDED_ICC'?`Embedded ICC: ${i.name} (${i.colour_space})`:
      i.status==='NO_EMBEDDED_ICC'?'No embedded ICC found in the inspected file metadata':
      i.status==='INVALID_METADATA'?'Metadata invalid or conflicting — source colour space unresolved':
      'Profile metadata not inspected';
    const declaration=r?.declaration==='PNG_SRGB'?'PNG explicitly declares sRGB.':
      r?.declaration==='ICC'?'Profile header and tag bounds checked.':
      r?.declaration==='OTHER_METADATA'?'Additional colour metadata takes precedence; interpretation is unresolved here.':
      'Native file colour space unresolved here; sRGB is not assumed for the original file.';
    const rgb=assignment?`${assignment.source_rgb.join(' / ')} · ${assignment.source_hex} · sampled sRGB, 8-bit`:'Select a pixel to record its sRGB value.';
    const ref=assignment?`${assignment.reference} · ${assignment.reference_rgb.join(' / ')} · ${assignment.reference_hex}`:'No reference assigned yet.';
    return `<details class="colour-origin"${open?' open':''}><summary>Colour origin / Farbherkunft</summary><dl>`+
      `<dt>Original file</dt><dd>${esc(image?.name||'Not recorded')}<br>${esc(status)}<br>${esc(declaration)}</dd>`+
      `<dt>Processing</dt><dd>Browser → sRGB (8-bit). Actual conversion or fallback not reported. ATLAS does not assign a source profile.</dd>`+
      `<dt>Source Colour</dt><dd>${esc(rgb)}</dd><dt>ATLAS reference</dt><dd>${esc(ref)}</dd>`+
      `<dt>Output</dt><dd>Separate Print job; no output profile attached to this source record.</dd></dl>`+
      `<p class="colour-origin-note">RGB-only reference matching. Profile presence does not prove colour accuracy.</p>`+
      `<details><summary>Details &amp; limits</summary><small>Recorded file metadata; imports check consistency, not the original file. Palette JSON includes no source image or ICC bytes. Keep the original image.</small>`+
      (i?.sha256?`<p>ICC SHA-256</p><code>${esc(i.sha256)}</code>`:'')+'</details></details>';
  }
  root.ATLAS_COLOUR_ORIGIN={inspect,validate,render,empty,MAX_FILE,MAX_ICC};
})(typeof window!=='undefined'?window:globalThis);
