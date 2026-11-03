(function(root){
  'use strict';
  const SCHEMA='atlas-clarus-startup-colour-kit/1.0', MAX_ORIGINAL=32*1024*1024, MAX_ZIP=56*1024*1024;
  const E=root.ATLAS_CLARUS_EXPORTS,P=root.ATLAS_CLARUS_PRINT,H=root.ClarusHandoff,C=root.ATLAS_STARTUP_CODECS;
  const need=(ok,msg)=>{if(!ok)throw Error(msg);},clone=x=>JSON.parse(JSON.stringify(x));
  const utf8=s=>new TextEncoder().encode(s),decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b);
  const rgb=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=255);
  const hex=v=>'#'+v.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function sha(bytes){return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function text(v,n,label){need(typeof v==='string'&&v.length<=n&&!/[\x00-\x1f]/.test(v),label+' ist ungültig.');}
  function nearest(values,ctx){let best=null,d=Infinity;for(const c of ctx.colors){const n=c.rgb.reduce((s,v,i)=>s+(v-values[i])**2,0);if(n<d||(n===d&&c.id<best.id)){d=n;best=c;}}return best;}
  function defaults(master){return {schema:SCHEMA,master_sha256:master,name:'Meine Marke',colours:[],print:{path:'4C',basis:'source',printing_condition:'',substrate:'',intent:'Relative colorimetric',bpc:false,channel_order:[]}};}
  function validate(doc,ctx){
    need(doc?.schema===SCHEMA&&doc.master_sha256===ctx.master,'Unbekannte Farbmappe oder anderer ATLAS-Master.');
    text(doc.name,100,'Markenname');need(doc.name.trim(),'Bitte einen Markennamen eingeben.');
    need(Array.isArray(doc.colours)&&doc.colours.length>0&&doc.colours.length<=12,'Wähle 1 bis 12 Markenfarben.');
    for(const [i,c]of doc.colours.entries()){
      text(c.label,64,'Farbname');need(c.label.trim()&&rgb(c.source_rgb),'Ungültige Farbe '+(i+1));
      need(['image','manual_srgb'].includes(c.kind),'Unbekannte Farbherkunft.');
      const ref=ctx.colors.find(r=>r.id===c.reference_id);
      need(ref&&nearest(c.source_rgb,ctx).id===ref.id,'Die Referenz entspricht nicht der RGB-Zuordnung.');
      if(c.kind==='image'){
        need(c.assignment&&same(c.assignment.source_rgb,c.source_rgb)&&c.assignment.atlas_row_id===ref.id,'Bildquelle und Farbauswahl stimmen nicht überein.');
        E.parseClarus(E.clarus([ref],ctx.master,doc.name,[c.assignment]),ctx.colors,ctx.master);
      }else need(c.assignment===null,'Eine manuelle sRGB-Farbe darf keine Bildherkunft vortäuschen.');
    }
    const s=doc.print;need(s&&P.ALL_PATHS.includes(s.path)&&['source','reference'].includes(s.basis)&&P.INTENTS.includes(s.intent)&&typeof s.bpc==='boolean','Ungültige Druckeinstellungen.');
    text(s.printing_condition,160,'Druckbedingung');text(s.substrate,160,'Material');
    need(Array.isArray(s.channel_order)&&s.channel_order.length<=7&&s.channel_order.every(v=>typeof v==='string'&&/^[A-Za-z0-9 _-]{1,24}$/.test(v)),'Ungültige Kanalnamen.');
    return clone(doc);
  }
  function references(doc,ctx){return [...new Set(doc.colours.map(c=>c.reference_id))].map(id=>ctx.colors.find(c=>c.id===id));}
  function clarus(doc,ctx){return E.clarus(references(doc,ctx),ctx.master,doc.name,doc.colours.filter(c=>c.kind==='image').map(c=>c.assignment));}
  function palette(doc,ctx,basis){return doc.colours.map((c,i)=>{const r=ctx.colors.find(r=>r.id===c.reference_id);return {id:r.id,ref:basis==='source'?`Source ${i+1} ${c.label}`:`${r.ref} ${i+1} ${c.label}`,rgb:basis==='source'?[...c.source_rgb]:[...r.rgb],hex:basis==='source'?hex(c.source_rgb):r.hex};});}
  function originalType(b){const h=String.fromCharCode(...b.slice(0,12));if(h.startsWith('\x89PNG\r\n\x1a\n'))return 'png';if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpg';if(h.startsWith('RIFF')&&h.slice(8)==='WEBP')return 'webp';if(/^GIF8[79]a/.test(h))return 'gif';throw Error('Unbekanntes Originalbild.');}
  async function checkOriginal(doc,original){
    const sources=doc.colours.filter(c=>c.kind==='image');
    if(!original){need(!sources.length,'Das Originalbild fehlt. Öffne die vollständige Farbmappe oder das Original erneut.');return null;}
    need(original.bytes instanceof Uint8Array&&original.bytes.length>0&&original.bytes.length<=MAX_ORIGINAL,'Das Originalbild darf höchstens 32 MiB groß sein.');text(original.name,1024,'Originaldateiname');
    const hash=await sha(original.bytes),extension=originalType(original.bytes);
    need(sources.every(c=>c.assignment.image.sha256===hash),'Eine Bildfarbe gehört zu einer anderen Originaldatei.');
    const metadata=await root.ATLAS_COLOUR_ORIGIN.inspect(original.bytes);
    need(sources.every(c=>same(c.assignment.image.colour_origin,metadata)),'Die gespeicherte Profilherkunft passt nicht zur Originaldatei.');
    return {path:'original/image.'+extension,name:original.name,sha256:hash};
  }
  function outputRows(doc,ctx,result){return doc.colours.map((c,i)=>{const r=ctx.colors.find(x=>x.id===c.reference_id),p=result?.colours[i];return `<tr><th>${escape(c.label)}</th><td><i style="background:${hex(c.source_rgb)}"></i>${hex(c.source_rgb)}<br>${c.source_rgb.join(' / ')}<br>${c.kind==='image'?'Bildauswahl':'Manuell · sRGB'}</td><td><i style="background:${r.hex}"></i>${escape(r.ref)}<br>${r.hex} · ${r.rgb.join(' / ')}</td><td>${p?`<i style="background:${hex(p.preview_rgb)}"></i>B: ${hex(p.input_rgb)}<br>A: ${hex(p.preview_rgb)}<br>${escape(p.channel_order.join(' / '))}: ${p.device_values_16bit.join(' / ')} (16 Bit)`:'Noch nicht berechnet'}</td></tr>`;}).join('');}
  function report(doc,ctx,result,profileName){
    const s=doc.print;
    return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(doc.name)} · ATLAS Clarus Farbkarte</title><style>body{font:16px/1.5 system-ui;color:#182c31;max-width:1120px;margin:40px auto;padding:24px}h1{font-size:38px}table{width:100%;border-collapse:collapse}th,td{padding:14px;border-bottom:1px solid #cdd6d6;text-align:left;vertical-align:top}td i{display:block;width:100%;height:62px;border:1px solid #777;margin-bottom:8px}code{overflow-wrap:anywhere;font-size:11px}.note{background:#eef3f1;padding:16px}@media print{button{display:none}body{margin:0;font-size:10pt}tr{break-inside:avoid}td i{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style><p>ATLAS CLARUS · STARTUP COLOUR KIT · VORSCHAU</p><h1>${escape(doc.name)}</h1><p>Originalfarbe und ATLAS-Referenz sind getrennt dokumentiert.</p><table><thead><tr><th>Farbe</th><th>Source Colour · sRGB</th><th>ATLAS-Referenz</th><th>B/A · Ausgabeprofil</th></tr></thead><tbody>${outputRows(doc,ctx,result)}</tbody></table><h2>Druck vorbereiten</h2><p>Berechnungsbasis: ${s.basis==='source'?'Source Colour':'ATLAS-Referenz'}<br>Profil: ${escape(profileName||'Nicht geladen')}<br>Druckbedingung: ${escape(s.printing_condition||'Nicht angegeben')}<br>Material: ${escape(s.substrate||'Nicht angegeben')}<br>Rendering Intent: ${escape(s.intent)} · Schwarzpunktkompensation: ${s.bpc?'an':'aus'}</p><p class="note">${result?'B = Eingang in sRGB. A = Rückrechnung über das Ausgabeprofil nach sRGB. Berechnete Vorschau ohne Papierweißsimulation; kein gemessener Drucknachweis.':'Die Druckvorschau wurde nicht berechnet.'} ${s.path==='TEXTILE_RGB'?'FOGRA58 ist ein textiler RGB-Austauschfarbraum; das konkrete Drucker-/Tinten-/Materialprofil wird dadurch nicht ersetzt.':''}</p><p>Bei Bildfarben werden die vom Browser ausgelesenen sRGB-Werte aufgezeichnet. Ein eingebettetes ICC-Profil bleibt in der Originaldatei erhalten; die tatsächliche Browsertransformation ist nicht verifiziert. Die Originaldatei im ZIP kann weitere Metadaten enthalten.</p><p>Master SHA-256: <code>${ctx.master}</code></p><p>Bitte der Druckerei mitteilen: gewünschte Farbgrundlage, Material, Druckverfahren und vereinbarte Toleranz. Einen messbaren Freigabe-Proof beim Dienstleister anfragen.</p><button onclick="print()">Farbkarte drucken / als PDF speichern</button></html>`;
  }
  function validateResult(doc,ctx,result,profile){
    if(result===null)return;
    need(result?.status==='COMPUTATIONAL_PREVIEW_NOT_MEASURED'&&profile&&result.profile_sha256===profile.sha256&&same(result.settings,doc.print)&&same(result.inputs,doc.colours),'Druckergebnis gehört nicht zur aktuellen Farbmappe.');
    need(Array.isArray(result.colours)&&result.colours.length===doc.colours.length,'Unvollständiges Druckergebnis.');
    const channels=doc.print.path==='4C'?4:doc.print.path==='TEXTILE_RGB'?3:7;
    for(const [i,r]of result.colours.entries()){
      const c=doc.colours[i],ref=ctx.colors.find(x=>x.id===c.reference_id),input=doc.print.basis==='source'?c.source_rgb:ref.rgb;
      need(same(r.input_rgb,input)&&rgb(r.preview_rgb)&&Array.isArray(r.device_values_16bit)&&r.device_values_16bit.length===channels&&r.device_values_16bit.every(x=>Number.isInteger(x)&&x>=0&&x<=65535),'Ungültiges Druckergebnis.');
      const order=doc.print.path==='4C'?['C','M','Y','K']:doc.print.path==='TEXTILE_RGB'?['R','G','B']:doc.print.channel_order;
      need(same(r.channel_order,order),'Die Ausgabekanalreihenfolge stimmt nicht.');
    }
    need(result.engine==='LittleCMS 2.16 / lcms-wasm 1.0.5'&&result.method==='SRGB_TO_DEVICE16_TO_SRGB'&&result.return_intent==='Relative colorimetric'&&result.return_bpc===false&&result.paper_white_simulation===false,'Unbekannte Druckberechnung.');
  }
  async function pack(snapshot,ctx){
    const doc=validate(clone(snapshot.doc),ctx),original=snapshot.original?{name:snapshot.original.name,bytes:snapshot.original.bytes.slice()}:null;
    const profile=snapshot.profile?{name:snapshot.profile.name,bytes:snapshot.profile.bytes.slice()}:null,result=clone(snapshot.result||null);
    const originalInfo=await checkOriginal(doc,original),profileInfo=profile?await P.readProfile(profile.bytes,profile.name,doc.print.path):null;
    validateResult(doc,ctx,result,profileInfo);
    const files={'project.json':utf8(JSON.stringify(doc,null,2)),'colours.clarus.json':utf8(JSON.stringify(clarus(doc,ctx),null,2)),'farbkarte.html':utf8(report(doc,ctx,result,profile?.name))};
    if(original)files[originalInfo.path]=original.bytes;
    if(profile)files['print/output.icc']=profile.bytes;
    if(result)files['print/calculation.json']=utf8(JSON.stringify(result,null,2));
    for(const basis of ['source','reference']){
      const p=palette(doc,ctx,basis),ase=E.ase(p),back=E.readAse(ase);need(back.every((c,i)=>same(c.rgb,p[i].rgb)&&c.ref===p[i].ref),'ASE-Rückprüfung fehlgeschlagen.');
      files[`palettes/${basis}.ase`]=ase;
      files[`palettes/${basis}.gpl`]=utf8(`GIMP Palette\nName: ${basis} - ${doc.name}\nColumns: 4\n# sRGB / ${basis}\n${p.map(c=>c.rgb.join(' ')+'\t'+c.ref).join('\n')}\n`);
      files[`palettes/${basis}.css`]=utf8(`/* ${basis} palette; sRGB */\n:root {\n${p.map((c,i)=>`  --brand-${basis}-${i+1}: ${c.hex};`).join('\n')}\n}\n`);
    }
    files['read-me.txt']=utf8('ATLAS Clarus Startup Colour Kit — Vorschau\nSTART_HERE.html im entpackten Softwarepaket öffnen. In der App dieses ZIP über „Farbmappe öffnen“ laden.\nproject.json enthält Source und Referenzen; colours.clarus.json ist für die Browser Edition. Manuelle Eingaben stehen mit ihrem Ursprung in project.json.\npalettes/source.* enthält die Source-Farben, palettes/reference.* die ATLAS-Referenzen.\nfarbkarte.html ist druckbar; eine daraus gespeicherte PDF ist kein profilgebundener Produktionsproof.\noriginal/ enthält die unveränderte Originaldatei samt eingebettetem ICC und sonstigen Metadaten, sofern ein Bild verwendet wurde.\nprint/output.icc enthält das gewählte Ausgabeprofil; vor Weitergabe dessen Nutzungsbedingungen beachten.\nNach Import wird die Druckberechnung verworfen und muss neu gestartet werden. Die alten Rechendaten können separat geprüft werden. Prüfsummen belegen Dateikonsistenz, keine Urheberschaft.\n');
    const checks={};for(const [n,b]of Object.entries(files))checks[n]={bytes:b.length,sha256:await sha(b)};
    files['manifest.json']=utf8(JSON.stringify({schema:SCHEMA,master_sha256:ctx.master,original:originalInfo,profile:profile?{name:profile.name,path:'print/output.icc',sha256:profileInfo.sha256}:null,files:checks},null,2));
    const bytes=H.zipStored(files);need(bytes.length<=MAX_ZIP,'Die Farbmappe ist größer als 56 MiB.');return bytes;
  }
  async function unpack(bytes,ctx){
    need(bytes instanceof Uint8Array&&bytes.length<=MAX_ZIP,'Die Farbmappe ist zu groß.');
    const files=C.unzip(bytes,MAX_ZIP);need(files['manifest.json']?.length<=32768&&files['project.json']?.length<=1024*1024,'Ungültiges Paket.');
    const m=JSON.parse(decode(files['manifest.json']));need(m.schema===SCHEMA&&m.master_sha256===ctx.master,'Unbekanntes Paket.');
    const names=Object.keys(files).filter(n=>n!=='manifest.json');need(same(names.slice().sort(),Object.keys(m.files||{}).sort())&&names.length<=16,'Dateiliste passt nicht.');
    for(const n of names)need(m.files[n].bytes===files[n].length&&m.files[n].sha256===await sha(files[n]),'Prüfsumme stimmt nicht: '+n);
    const doc=validate(JSON.parse(decode(files['project.json'])),ctx);
    const allowed=['project.json','colours.clarus.json','farbkarte.html','read-me.txt',...['source','reference'].flatMap(b=>['ase','gpl','css'].map(ext=>`palettes/${b}.${ext}`))];
    let original=null,profile=null;
    if(m.original){need(/^original\/image\.(png|jpg|webp|gif)$/.test(m.original.path)&&files[m.original.path],'Original fehlt.');original={name:m.original.name,bytes:files[m.original.path]};need(same(await checkOriginal(doc,original),m.original),'Original stimmt nicht.');allowed.push(m.original.path);}else await checkOriginal(doc,null);
    if(m.profile){need(m.profile.path==='print/output.icc'&&files[m.profile.path],'Profil fehlt.');profile={name:m.profile.name,bytes:files[m.profile.path]};profile.info=await P.readProfile(profile.bytes,profile.name,doc.print.path);need(profile.info.sha256===m.profile.sha256,'Profil stimmt nicht.');allowed.push(m.profile.path);}
    if(files['print/calculation.json']){need(files['print/calculation.json'].length<=1024*1024,'Druckdaten zu groß.');validateResult(doc,ctx,JSON.parse(decode(files['print/calculation.json'])),profile?.info);allowed.push('print/calculation.json');}
    need(same(names.slice().sort(),allowed.sort()),'Unbekannte oder fehlende Dateien.');
    need(same(JSON.parse(decode(files['colours.clarus.json'])),clarus(doc,ctx)),'Clarus-Farbdaten stimmen nicht.');
    // Reports and old calculation values are never executed or promoted to a fresh calculation.
    return {doc,original,profile,result:null};
  }
  root.ATLAS_STARTUP_CORE={SCHEMA,MAX_ORIGINAL,MAX_ZIP,defaults,validate,nearest,hex,sha,escape,clarus,palette,report,pack,unpack,validateResult};
})(typeof window==='undefined'?globalThis:window);
