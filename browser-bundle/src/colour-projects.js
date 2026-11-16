/* Local Colour Projects: complete source palettes, append-only project versions. */
(function(root){
  'use strict';
  const H=root.ClarusHandoff,A=root.ATLAS_COLOUR_HANDOFF;
  const SCHEMA='atlas-clarus-colour-project/1.0',LIMIT=16*1024*1024;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const HASH=/^[0-9a-f]{64}$/;
  const need=(ok,msg)=>{if(!ok)throw Error('Colour Projects: '+msg);};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const keys=(x,list)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===list.length&&Object.keys(x).every(k=>list.includes(k));
  function canon(x){
    if(x===null||typeof x==='boolean'||typeof x==='string')return JSON.stringify(x);
    if(typeof x==='number'){need(Number.isFinite(x),'Non-finite number.');return JSON.stringify(x);}
    if(Array.isArray(x))return '['+x.map(canon).join(',')+']';
    need(x&&typeof x==='object','Unsupported JSON value.');
    return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';
  }
  const equal=(a,b)=>canon(a)===canon(b),latest=p=>p.revisions[p.revisions.length-1];
  const digest=(data,ctx)=>ctx.sha(H.utf8(canon(data)));
  function text(s,max,required=true){need(typeof s==='string'&&s.length<=max&&(!required||s.trim().length>0)&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s),'Missing or invalid text.');return s;}
  const payload=r=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='revision_sha256'));
  const envelope=p=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='document_sha256'));
  async function seal(p,ctx){p.document_sha256=await digest(envelope(p),ctx);return p;}
  function extension(old,data){
    const nodes=new Map(data.decisions.nodes.map(n=>[n.revision_id,n]));
    need(old.decisions.nodes.every(n=>nodes.has(n.revision_id)&&equal(n,nodes.get(n.revision_id))),'A colour update must retain every earlier decision revision.');
    need(equal(old.bundle_origin||null,data.bundle_origin||null),'A colour update cannot replace its recorded Bundle origin.');
    need(equal(old.records.map(r=>r.decision_id).sort(),data.records.map(r=>r.decision_id).sort()),'Update this colour set with the same decision IDs; add unrelated colours as a new set.');
    for(const previous of old.records){
      let n=nodes.get(data.records.find(r=>r.decision_id===previous.decision_id).revision_id);
      while(n&&n.revision_id!==previous.revision_id)n=nodes.get(n.parent_revision_id);
      need(n,'This colour update is older or follows a different branch. The current colours were kept.');
    }
  }
  function selectionKey(s){return s.entry_id+'/'+s.decision_id;}
  async function verify(p,ctx){
    need(H.utf8(JSON.stringify(p,null,2)+'\n').length<=LIMIT,'Project exceeds 16 MiB. No history was removed.');
    need(keys(p,['schema','project_id','master_sha256','palettes','revisions','document_sha256'])&&p.schema===SCHEMA&&UUID.test(p.project_id)&&p.master_sha256===A.MASTER,'Unsupported project or reference master.');
    need(Array.isArray(p.palettes)&&p.palettes.length<=100&&Array.isArray(p.revisions)&&p.revisions.length>=1&&p.revisions.length<=200,'Invalid project history or project limit reached.');
    const palettes=new Map(),used=new Set();
    for(const s of p.palettes){
      need(keys(s,['sha256','data'])&&HASH.test(s.sha256)&&!palettes.has(s.sha256),'Invalid or duplicate palette snapshot.');
      need(await digest(s.data,ctx)===s.sha256,'Palette snapshot checksum differs.');
      await A.verify(s.data,ctx);palettes.set(s.sha256,s.data);
    }
    let previous=null;
    for(let i=0;i<p.revisions.length;i++){
      const r=p.revisions[i];
      need(keys(r,['version','parent_sha256','created_utc','kind','name','note','entries','selected','revision_sha256'])&&r.version===i+1&&r.parent_sha256===(previous?.revision_sha256||null),'Invalid project version chain.');
      text(r.name,120);text(r.note,2000);
      need(typeof r.created_utc==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r.created_utc)&&Number.isFinite(Date.parse(r.created_utc)),'Invalid recorded date.');
      need(Array.isArray(r.entries)&&r.entries.length<=10&&Array.isArray(r.selected)&&r.selected.length<=2500,'Invalid colour sets or selections.');
      const entries=new Map(),choices=new Set();
      for(const e of r.entries){
        need(keys(e,['entry_id','label','palette_sha256'])&&UUID.test(e.entry_id)&&!entries.has(e.entry_id)&&palettes.has(e.palette_sha256),'Invalid colour set.');
        text(e.label,120);entries.set(e.entry_id,e);used.add(e.palette_sha256);
      }
      for(const s of r.selected){
        need(keys(s,['entry_id','decision_id','revision_id'])&&!choices.has(selectionKey(s)),'Invalid or duplicate selection.');
        const d=palettes.get(entries.get(s.entry_id)?.palette_sha256);
        need(d&&d.records.some(x=>x.decision_id===s.decision_id)&&d.decisions.nodes.some(n=>n.decision_id===s.decision_id&&n.revision_id===s.revision_id),'Selection does not identify a retained colour revision.');
        choices.add(selectionKey(s));
      }
      const sameEntries=previous&&equal(previous.entries,r.entries),sameSelection=previous&&equal(previous.selected,r.selected),sameName=previous&&previous.name===r.name;
      if(!previous)need(r.kind==='CREATE'&&!r.entries.length&&!r.selected.length,'Project must start with an empty CREATE version.');
      else if(r.kind==='NOTE')need(sameEntries&&sameSelection&&sameName,'A note cannot rewrite colours or choices.');
      else if(r.kind==='RENAME')need(sameEntries&&sameSelection&&!sameName,'Rename changed something other than the project name.');
      else if(r.kind==='ADD_COLOURS')need(sameName&&sameSelection&&r.entries.length===previous.entries.length+1&&equal(r.entries.slice(0,-1),previous.entries),'Invalid colour-set addition.');
      else if(r.kind==='COLOUR_EDIT'||r.kind==='IMPORT_UPDATE'){
        need(sameName&&sameSelection&&r.entries.length===previous.entries.length,'Colour update changed project identity or selections.');
        let changed=0;
        for(let j=0;j<r.entries.length;j++){
          const a=previous.entries[j],b=r.entries[j];
          need(a.entry_id===b.entry_id&&a.label===b.label,'Colour update replaced a colour set.');
          if(a.palette_sha256!==b.palette_sha256){changed++;extension(palettes.get(a.palette_sha256),palettes.get(b.palette_sha256));}
        }
        need(changed===1,'A colour update must change exactly one set.');
      }else if(r.kind==='SELECT'){
        need(sameEntries&&sameName&&!sameSelection,'Invalid selection event.');
        const a=new Map(previous.selected.map(s=>[selectionKey(s),s])),b=new Map(r.selected.map(s=>[selectionKey(s),s]));
        const differences=[...new Set([...a.keys(),...b.keys()])].filter(k=>!equal(a.get(k)||null,b.get(k)||null));
        need(differences.length===1,'Select one colour revision at a time.');
      }else need(false,'Unknown project event.');
      need(HASH.test(r.revision_sha256)&&await digest({project_id:p.project_id,revision:payload(r)},ctx)===r.revision_sha256,'Project revision checksum differs.');
      previous=r;
    }
    need(used.size===palettes.size,'Unreferenced palette snapshot.');
    need(HASH.test(p.document_sha256)&&await digest(envelope(p),ctx)===p.document_sha256,'Project document checksum differs.');
    return p;
  }
  async function append(p,kind,note,change,ctx){
    await verify(p,ctx);const out=copy(p),r=copy(latest(p));
    r.version++;r.parent_sha256=r.revision_sha256;r.created_utc=new Date().toISOString();r.kind=kind;r.note=text(note,2000);
    await change(r,out);r.revision_sha256=await digest({project_id:p.project_id,revision:payload(r)},ctx);
    out.revisions.push(r);await seal(out,ctx);return verify(out,ctx);
  }
  async function create(name,ctx){
    const p={schema:SCHEMA,project_id:ctx.uuid(),master_sha256:A.MASTER,palettes:[],revisions:[]};
    const r={version:1,parent_sha256:null,created_utc:new Date().toISOString(),kind:'CREATE',name:text(name.trim(),120),note:'Project created.',entries:[],selected:[]};
    r.revision_sha256=await digest({project_id:p.project_id,revision:r},ctx);p.revisions.push(r);await seal(p,ctx);return verify(p,ctx);
  }
  async function snapshot(out,data,ctx){await A.verify(data,ctx);const sha=await digest(data,ctx);if(!out.palettes.some(s=>s.sha256===sha))out.palettes.push({sha256:sha,data:copy(data)});return sha;}
  function entry(p,id){const e=latest(p).entries.find(e=>e.entry_id===id);need(e,'Choose a colour set.');return e;}
  function palette(p,id){return p.palettes.find(s=>s.sha256===entry(p,id).palette_sha256).data;}
  async function add(p,label,data,ctx){return append(p,'ADD_COLOURS','Added colour set: '+text(label,120),async(r,out)=>{r.entries.push({entry_id:ctx.uuid(),label,palette_sha256:await snapshot(out,data,ctx)});},ctx);}
  async function update(p,id,data,note,ctx,kind='IMPORT_UPDATE'){
    return append(p,kind,note,async(r,out)=>{extension(palette(p,id),data);const sha=await snapshot(out,data,ctx);need(sha!==entry(p,id).palette_sha256,'This colour set is already up to date.');r.entries.find(e=>e.entry_id===id).palette_sha256=sha;},ctx);
  }
  async function edit(p,id,decisionId,name,hex,note,ctx){
    await verify(p,ctx);const previous=palette(p,id),d=copy(previous),index=d.records.findIndex(r=>r.decision_id===decisionId);
    need(index>=0&&/^#[\da-fA-F]{6}$/.test(hex),'Choose a colour and enter a six-digit HEX value.');
    const original={...d.records[index].original,name:text(name,240),hex:hex.toUpperCase()};
    need(!equal(original,d.records[index].original),'The colour name and value are unchanged.');
    d.records[index]={...d.records[index],...ctx.assign(original)};
    await H.updateHistory(d,previous,ctx);d.source_values_sha256=await ctx.sourceDigest(d.records.map(r=>r.original));
    d.run_id=ctx.uuid();d.created_utc=new Date().toISOString();
    return update(p,id,d,note,ctx,'COLOUR_EDIT');
  }
  async function choose(p,id,decisionId,revisionId,note,ctx){return append(p,'SELECT',note,r=>{
    const s={entry_id:id,decision_id:decisionId,revision_id:revisionId},key=selectionKey(s);
    r.selected=r.selected.filter(x=>selectionKey(x)!==key);if(revisionId!==null)r.selected.push(s);
    r.selected.sort((a,b)=>selectionKey(a).localeCompare(selectionKey(b)));
  },ctx);}
  const rename=(p,name,ctx)=>append(p,'RENAME','Project renamed.',r=>{r.name=text(name.trim(),120);},ctx);
  const note=(p,message,ctx)=>append(p,'NOTE',message,()=>{},ctx);
  function importRelation(current,incoming){
    if(current.project_id!==incoming.project_id)return 'NEW';
    if(current.document_sha256===incoming.document_sha256)return 'SAME';
    const a=current.revisions,b=incoming.revisions;
    if(a.length<b.length&&a.every((r,i)=>r.revision_sha256===b[i].revision_sha256))return 'NEWER';
    if(b.length<a.length&&b.every((r,i)=>r.revision_sha256===a[i].revision_sha256))return 'OLDER';
    return 'CONFLICT';
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function passport(p){
    const r=latest(p);
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(r.name)+' — Colour Passport</title><style>body{max-width:1050px;margin:40px auto;padding:24px;font:16px/1.6 system-ui;color:#17202c}h1,h2{line-height:1.2}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{padding:10px;border:1px solid #ccd3dc;text-align:left;overflow-wrap:anywhere}code{overflow-wrap:anywhere}i{display:inline-block;width:28px;height:28px;vertical-align:middle;border:1px solid #666;margin-right:8px}p,li{overflow-wrap:anywhere}small{color:#465668}@media print{body{margin:0;padding:0}tr{break-inside:avoid}}</style><h1>'+esc(r.name)+'</h1><p>ATLAS Clarus Colour Projects · Version '+r.version+'</p><p>Your colours. Your decisions. A project you can take with you and keep developing.</p><p>Chosen versions record a design decision. They are not measured production approval or authenticated authorship.</p>'+r.entries.map(e=>{
      const d=palette(p,e.entry_id),nodes=new Map(d.decisions.nodes.map(n=>[n.revision_id,n]));
      return '<h2>'+esc(e.label)+'</h2><table><thead><tr><th>Colour</th><th>Starting colour / recorded source</th><th>Current design / Atlas reference</th><th>Chosen design version</th></tr></thead><tbody>'+d.records.map(c=>{
        let origin=nodes.get(c.revision_id);while(origin.parent_revision_id)origin=nodes.get(origin.parent_revision_id);
        const selection=r.selected.find(s=>s.entry_id===e.entry_id&&s.decision_id===c.decision_id),chosen=selection&&nodes.get(selection.revision_id);
        return '<tr><td>'+esc(c.original.name)+'<br><small>'+esc(c.decision_id)+'</small></td><td>'+esc(origin.record.original.hex)+'<br>'+esc(origin.record.original.source)+'</td><td><i style="background:'+esc(c.original.hex)+'"></i>'+esc(c.original.hex)+'<br>'+esc(c.atlas_reference)+' · '+esc(c.reference_hex)+'</td><td>'+(chosen?'<i style="background:'+esc(chosen.record.original.hex)+'"></i>'+esc(chosen.record.original.hex)+'<br><small>'+esc(chosen.revision_id)+'</small>':'Not selected')+'</td></tr>';
      }).join('')+'</tbody></table>';
    }).join('')+'<h2>Project history</h2><ol>'+p.revisions.map(v=>'<li><b>Version '+v.version+' · '+esc(v.kind)+'</b> · '+esc(v.created_utc)+'<br>'+esc(v.note)+'</li>').join('')+'</ol><p>Keep project.clarus.json to reopen this complete project. Keep the companion JSON with exported colour files. The JSON retains all source documents and decision history; this report is a readable summary.</p><p>Project ID: <code>'+esc(p.project_id)+'</code><br>Document SHA-256: <code>'+p.document_sha256+'</code></p></html>';
  }
  async function exportPackage(p,ctx){
    await verify(p,ctx);const r=latest(p),files={'project.clarus.json':H.utf8(JSON.stringify(p,null,2)+'\n'),'colour-passport.html':H.utf8(passport(p))};
    for(const e of r.entries){
      const d=palette(p,e.entry_id),sets=[['working',d]],chosen=copy(d);
      chosen.records=r.selected.filter(s=>s.entry_id===e.entry_id).map(s=>{
        const n=d.decisions.nodes.find(n=>n.revision_id===s.revision_id);
        return {...copy(n.record),decision_id:n.decision_id,revision_id:n.revision_id};
      });
      if(chosen.records.length){chosen.source_values_sha256=await ctx.sourceDigest(chosen.records.map(c=>c.original));await A.verify(chosen,ctx);sets.push(['chosen',chosen]);}
      for(const [folder,data]of sets){const part=await H.exportHandoff(data,ctx);for(const [name,bytes]of Object.entries(part))files[folder+'/'+e.entry_id+'/'+name]=bytes;}
    }
    files['READ_ME.txt']=H.utf8('ATLAS CLARUS COLOUR PROJECTS 0.1 — LOCAL PILOT\n\nOpen project.clarus.json in Colour Projects to resume the COMPLETE project.\nOpen colour-passport.html for the human-readable summary and version notes.\nworking/ contains all current design colours. chosen/ contains ONLY explicitly\nchosen design revisions; these can differ from current working colours.\nFolder IDs match colour sets in project.clarus.json. Keep each ASE, palette JSON\nand handoff manifest together. Palette JSON opens in Colour Kit 0.3 or Bundle\nColour handoff; project metadata require Colour Projects. Extract the ZIP\nbefore opening its JSON. Images are not embedded; keep original images too.\n\nSelection is a recorded design choice, not measured production approval.\nChecksums verify consistency, not authorship or the truth of declared origin.\nNative Adobe application round trips remain NOT_TESTED. No online syncing.\n');
    const sums={};for(const [name,bytes]of Object.entries(files))sums[name]=await ctx.sha(bytes);
    files['project-package-manifest.json']=H.utf8(JSON.stringify({schema:'atlas-clarus-project-package/1.0',project_id:p.project_id,project_version:r.version,files:sums},null,2)+'\n');
    return files;
  }
  root.ATLAS_COLOUR_PROJECTS={SCHEMA,LIMIT,canon,equal,latest,verify,create,add,update,edit,choose,rename,note,palette,importRelation,passport,exportPackage};
})(typeof window==='undefined'?globalThis:window);
