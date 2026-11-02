/* Optional original-file evidence for the isolated first-colour preview. */
(function(root){
  'use strict';
  const SCHEMA='atlas-clarus-first-colour-origin/1.0',MAX_SOURCE=32*1024*1024,MAX_JSON=16*1024*1024,MAX_ZIP=49*1024*1024;
  const need=(ok,message)=>{if(!ok)throw Error(message);};
  const H=root.ClarusHandoff,C=root.ATLAS_IMAGE_CODECS,E=root.ATLAS_CLARUS_EXPORTS;
  const utf8=H.utf8,decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
  // Clarus reference Lab values include decimals; Handoff's integer-only
  // canonicalizer is intentionally not used for this palette schema.
  function ordered(v){
    if(Array.isArray(v))return v.map(ordered);
    if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])]));
    return v;
  }
  const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
  const NOTE='ATLAS CLARUS — HERKUNFTSPAKET\n\noriginal/image.* enthält die unveränderte ausgewählte Datei, einschließlich ihrer eingebetteten ICC-Profildaten, soweit vorhanden.\ncolour.clarus.json enthält die aufgezeichnete browserdekodierte Source Colour und die getrennte feste ATLAS-Referenz. Diese Werte werden beim Öffnen nicht neu berechnet.\nmanifest.json verknüpft das Original über seinen SHA-256 mit jeder aufgezeichneten Quelle und prüft alle drei Nutzdateien. Es hasht sich nicht selbst.\nPrüfsummen belegen interne Dateiintegrität, keine Urheberschaft oder Echtheit. Die tatsächliche Browser-Farbtransformation bleibt nicht beobachtbar; das Paket bestätigt keine korrekte ICC-Umrechnung oder Druckgenauigkeit.\nDieses ZIP in „Meine erste Farbe“ öffnen. Eine spätere Browserdarstellung ist keine Verifikation der früher aufgezeichneten Pixel.\n';
  const POLICY={original_file:'UNMODIFIED_FILE_BYTES',source_colour:'RECORDED_BROWSER_DECODED_SRGB_RGB8',atlas_reference:'FIXED_MASTER_REFERENCE',browser_transform:'NOT_OBSERVABLE',icc:'RETAINED_IN_ORIGINAL_FILE',integrity:'CONSISTENCY_NOT_AUTHENTICITY'};
  async function sha(bytes){
    need(root.crypto?.subtle,'SHA-256 ist hier nicht verfügbar. Verwende HTTPS oder öffne die Testdatei lokal.');
    return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  function format(b){
    const head=String.fromCharCode(...b.subarray(0,12));
    if(head.startsWith('\x89PNG\r\n\x1a\n'))return {mime:'image/png',extension:'png'};
    if(b[0]===255&&b[1]===216&&b[2]===255)return {mime:'image/jpeg',extension:'jpg'};
    if(head.startsWith('RIFF')&&head.slice(8)==='WEBP')return {mime:'image/webp',extension:'webp'};
    if(/^GIF8[79]a/.test(head))return {mime:'image/gif',extension:'gif'};
    throw Error('Die Originaldatei ist kein unterstütztes PNG-, JPEG-, WebP- oder GIF-Bild.');
  }
  function validate(data,ctx){
    const parsed=E.parseClarus(data,ctx.colors,ctx.master);
    need(parsed.sourceAssignments.length>0,'Für dieses Paket fehlt eine aufgezeichnete Bildquelle.');
    // Do not silently discard unknown data from an archive on re-export.
    const refs=parsed.colorIds.map(id=>ctx.colors.find(c=>c.id===id));
    need(same(data,E.clarus(refs,ctx.master,data.palette_name||'Meine erste Farbe',parsed.sourceAssignments)),'Das Paket enthält nicht unterstützte JSON-Felder.');
    return parsed.sourceAssignments;
  }
  async function filesFor(data,original,ctx){
    const sources=validate(data,ctx),bytes=original.bytes;
    need(bytes instanceof Uint8Array&&bytes.length>0&&bytes.length<=MAX_SOURCE,'Die Originaldatei muss zwischen 1 Byte und 32 MiB groß sein.');
    need(typeof original.name==='string'&&original.name.length>0&&original.name.length<=1024,'Ungültiger Originaldateiname.');
    const info=format(bytes),hash=await sha(bytes),path='original/image.'+info.extension;
    need(sources.every(s=>s.image.sha256===hash),'Originaldatei und aufgezeichnete Quellen stimmen nicht überein. Alle Quellen müssen zu dieser einen Originaldatei gehören.');
    const files={'colour.clarus.json':utf8(JSON.stringify(data,null,2)),[path]:bytes,'read-me.txt':utf8(NOTE)};
    need(files['colour.clarus.json'].length<=MAX_JSON,'Die Farbdatei ist größer als 16 MiB.');
    const checks={};for(const [name,body]of Object.entries(files))checks[name]={bytes:body.length,sha256:await sha(body)};
    const manifest={schema:SCHEMA,master_sha256:ctx.master,policy:POLICY,original:{path,name:original.name,mime:info.mime,sha256:hash},source_assignment_indices:sources.map((_,i)=>i),files:checks};
    files['manifest.json']=utf8(JSON.stringify(manifest,null,2));
    return {files,manifest};
  }
  async function pack(data,original,ctx){
    // Snapshot before the first asynchronous read/hash.
    const snapshot=JSON.parse(JSON.stringify(data));
    const source={name:original.name,bytes:original.bytes.slice()};
    const {files}=await filesFor(snapshot,source,ctx);return H.zipStored(files);
  }
  async function unpack(bytes,ctx){
    need(bytes instanceof Uint8Array&&bytes.length<=MAX_ZIP,'Das Herkunftspaket ist größer als 49 MiB.');
    let files;
    try{files=C.unzip(bytes,MAX_ZIP);}
    catch(_){throw Error('Das ZIP ist beschädigt oder verwendet ein nicht unterstütztes Format. Öffne ein unverändertes Herkunfts-ZIP aus dieser Vorschau.');}
    const names=Object.keys(files);
    need(names.length===4&&files['manifest.json']?.length<=16384&&files['colour.clarus.json']?.length<=MAX_JSON&&files['read-me.txt']?.length<=8192,'Das Herkunftspaket ist unvollständig oder überschreitet die Größenlimits.');
    const m=JSON.parse(decode(files['manifest.json']));
    need(m.schema===SCHEMA&&m.master_sha256===ctx.master&&same(m.policy,POLICY),'Unbekanntes Herkunftspaket oder abweichender ATLAS-Master.');
    const path=m.original?.path;
    need(typeof path==='string'&&/^original\/image\.(png|jpg|webp|gif)$/.test(path)&&files[path]?.length<=MAX_SOURCE,'Die Originaldatei fehlt oder ist zu groß.');
    need(same(Object.keys(m.files||{}).sort(),names.filter(n=>n!=='manifest.json').sort()),'Ungültige Dateiliste im Manifest.');
    for(const name of names.filter(n=>n!=='manifest.json')){
      need(same(m.files[name],{bytes:files[name].length,sha256:await sha(files[name])}),'SHA-256 oder Dateigröße stimmt nicht: '+name);
    }
    const data=JSON.parse(decode(files['colour.clarus.json'])),original={name:m.original.name,bytes:files[path]};
    const expected=await filesFor(data,original,ctx);
    need(same(m,expected.manifest),'Manifest und Originaldatei/Farbquellen stimmen nicht überein.');
    need(decode(files['read-me.txt'])===NOTE,'Die Paketerklärung wurde verändert.');
    // Preserve the exact Clarus JSON bytes produced by this preview.
    need(decode(files['colour.clarus.json'])===decode(expected.files['colour.clarus.json']),'Die JSON-Darstellung wurde verändert.');
    return {data,original,mime:m.original.mime,manifest:m};
  }
  root.ATLAS_FIRST_COLOUR_ARCHIVE={SCHEMA,MAX_SOURCE,MAX_JSON,MAX_ZIP,pack,unpack};
})(window);
