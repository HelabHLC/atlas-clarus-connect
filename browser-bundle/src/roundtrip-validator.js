(function(global){
  'use strict';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const sameRgb=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===3&&b.length===3&&a.every((v,i)=>Number(v)===Number(b[i]));
  const normalHex=value=>String(value||'').trim().toUpperCase();
  const decode=value=>new TextDecoder('utf-8',{fatal:true}).decode(value);

  function parseClarus(data){
    if(data.format!=='ATLAS_CLARUS_PALETTE'||!Array.isArray(data.references))throw Error('Invalid Clarus JSON structure.');
    const headerValid=data.master_sha256===MASTER&&data.row_id_base===0&&data.freeze_status==='FROZEN';
    return {format:'CLARUS_JSON',master:data.master_sha256,authoritative:true,headerValid,entries:data.references.map(x=>({ref:x.reference,rowId:Number(x.atlas_row_id),rgb:x.master_rgb,hex:x.master_hex,master:data.master_sha256}))};
  }
  function parseTokens(data){
    if(!data.color||typeof data.color!=='object')throw Error('Invalid Tokens JSON structure.');
    return {format:'FIGMA_TOKENS',authoritative:false,entries:Object.entries(data.color).map(([ref,x])=>{const ext=x?.$extensions?.['org.atlas-clarus']||{};return {ref,rowId:Number.isInteger(ext.atlas_row_id)?ext.atlas_row_id:null,rgb:ext.rgb||null,hex:x?.$value,master:ext.master_sha256||null}})};
  }
  function parseJson(text){const data=JSON.parse(text);return data.format==='ATLAS_CLARUS_PALETTE'?parseClarus(data):parseTokens(data)}
  function parseAse(bytes){const reader=global.ATLAS_CLARUS_EXPORTS?.readAse;if(!reader)throw Error('ASE reader unavailable.');return {format:'ASE',authoritative:false,entries:reader(bytes).map(x=>({ref:x.ref,rgb:x.rgb,hex:null,rowId:null}))}}
  function parseGpl(text){
    if(!/^GIMP Palette\s*$/m.test(text))throw Error('Invalid GPL header.');
    const master=(text.match(/^# Master SHA-256:\s*([0-9a-f]{64})\s*$/mi)||[])[1]||null;
    const entries=text.split(/\r?\n/).map(line=>line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(.+?)\s*$/)).filter(Boolean).map(m=>({ref:m[4],rgb:[+m[1],+m[2],+m[3]],hex:null,rowId:null}));
    if(!entries.length)throw Error('GPL contains no colour entries.');
    return {format:'GPL',master,authoritative:false,entries};
  }
  function parseCss(text){
    if(!/:root\s*\{/.test(text))throw Error('Invalid CSS palette structure.');
    const master=(text.match(/Master SHA-256:\s*([0-9a-f]{64})/i)||[])[1]||null;
    const entries=[];for(const match of text.matchAll(/--atlas-([a-z0-9-]+):\s*(#[0-9a-f]{6});\s*\/\*\s*row\s+(\d+)\s*·\s*RGB\s+(\d+)\/(\d+)\/(\d+)\s*\*\//gi)){entries.push({ref:match[1].toUpperCase().replace(/-/g,'_'),hex:match[2],rowId:+match[3],rgb:[+match[4],+match[5],+match[6]]})}
    if(!entries.length)throw Error('CSS contains no ATLAS colour entries.');
    return {format:'CSS',master,authoritative:false,entries};
  }
  function parse(fileName,bytes){
    const name=String(fileName||'').toLowerCase();
    if(name.endsWith('.ase'))return parseAse(bytes);
    const text=decode(bytes);
    if(name.endsWith('.gpl'))return parseGpl(text);
    if(name.endsWith('.css'))return parseCss(text);
    if(name.endsWith('.json'))return parseJson(text);
    throw Error('Unsupported round-trip format.');
  }
  function validate(parsed,palette){
    if(!Array.isArray(palette)||!palette.length)return {status:'UNVERIFIABLE',format:parsed.format,summary:'The active palette is empty.',entries:[]};
    if(!parsed.entries.length)return {status:'UNVERIFIABLE',format:parsed.format,summary:'No colour entries could be verified.',entries:[]};
    const countMatch=parsed.entries.length===palette.length;
    const entries=parsed.entries.map((entry,index)=>{
      const target=palette[index];if(!target)return {index,ref:entry.ref||'Unknown',status:'MISMATCH',reason:'Unexpected extra colour.'};
      const refMatch=entry.ref===target.ref, rgbMatch=sameRgb(entry.rgb,target.rgb), hexMatch=!entry.hex||normalHex(entry.hex)===normalHex(target.hex), rowMatch=entry.rowId===null||entry.rowId===target.id;
      const masterMatch=!entry.master||entry.master===MASTER;
      const ok=refMatch&&rgbMatch&&hexMatch&&rowMatch&&masterMatch&&parsed.headerValid!==false;
      return {index,ref:entry.ref||target.ref,status:ok?(parsed.authoritative?'IDENTITY_MATCH':'VALUE_MATCH'):'MISMATCH',reason:ok?(parsed.authoritative?'Frozen identity and master provenance match.':'Usable reference name and colour value match; full identity authority is not asserted.'):'Reference, order, RGB, HEX, row ID or master provenance differs.'};
    });
    if(parsed.entries.length<palette.length){for(let index=parsed.entries.length;index<palette.length;index++)entries.push({index,ref:palette[index].ref,status:'MISMATCH',reason:'Expected palette colour is missing from the returned file.'})}
    if(!countMatch||entries.some(x=>x.status==='MISMATCH'))return {status:'MISMATCH',format:parsed.format,summary:'The returned file differs from the active frozen palette.',entries};
    const status=parsed.authoritative?'IDENTITY_MATCH':'VALUE_MATCH';
    return {status,format:parsed.format,summary:status==='IDENTITY_MATCH'?'Complete Clarus identity and provenance match the active palette.':'Colour values match, but this interchange format is not treated as complete identity evidence.',entries};
  }
  async function validateFile(file,palette){try{const bytes=new Uint8Array(await file.arrayBuffer());return validate(parse(file.name,bytes),palette)}catch(error){return {status:'UNVERIFIABLE',format:'UNKNOWN',summary:error.message||'The file could not be verified.',entries:[]}}}
  global.ATLAS_CLARUS_ROUNDTRIP={MASTER,parse,validate,validateFile};
})(typeof window!=='undefined'?window:globalThis);
