/* Replayable image edits: immutable source bytes and frozen RGBA, append-only journal. */
(function(root){
  'use strict';
  const H=root.ClarusHandoff,A=root.ATLAS_COLOUR_HANDOFF,C=root.ATLAS_IMAGE_CODECS,P=root.ATLAS_COLOUR_PROJECTS;
  const SCHEMA='atlas-clarus-image-project/1.0',LIMIT=64*1024*1024,MAX_PIXELS=4194304,MAX_SOURCE=8*1024*1024,MAX_EVENTS=100;
  const need=(v,m)=>{if(!v)throw Error('Image Projects: '+m);},clone=x=>JSON.parse(JSON.stringify(x));
  const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&Object.keys(x).every(s=>k.includes(s));
  const rgb=x=>Array.isArray(x)&&x.length===3&&x.every(n=>Number.isInteger(n)&&n>=0&&n<=255),hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
  const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
  const equal=(a,b)=>P.canon(a)===P.canon(b),digest=(x,ctx)=>ctx.sha(H.utf8(P.canon(x)));
  const text=(s,n)=>need(typeof s==='string'&&s.trim()&&s.length<=n&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s),'Invalid name or note.');
  function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
  function unbase64(s,max){need(typeof s==='string'&&s.length<=4*Math.ceil(max/3)&&s.length%4===0&&!/[^A-Za-z0-9+/=]/.test(s),'Invalid or oversized embedded bytes.');const padding=s.endsWith('==')?2:s.endsWith('=')?1:0;need(s.indexOf('=')===-1||s.indexOf('=')===s.length-padding,'Invalid base64 padding.');const raw=atob(s),b=new Uint8Array(raw.length);need(b.length<=max,'Embedded bytes exceed limit.');for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return b;}
  function dimensions(w,h){need(Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w<=8192&&h<=8192&&w*h<=MAX_PIXELS,'Maximum image size is 4,194,304 pixels, with each edge at most 8192. No resizing was performed.');}
  const envelope=p=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='document_sha256'));
  const eventPayload=e=>Object.fromEntries(Object.entries(e).filter(([k])=>k!=='revision_sha256'));
  const hex=v=>'#'+v.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
  function reference(v,ctx){if(v===null)return null;need(rgb(v),'Invalid RGB.');const r=ctx.assign({id:'image-colour',name:'Image colour',hex:hex(v),source:'Image Projects recorded edit',color_space:'sRGB'});return {atlas_row_id:r.atlas_row_id,atlas_reference:r.atlas_reference,reference_rgb:r.reference_rgb,distance_squared:r.distance_squared};}
  function diff(a,b){const runs=[];let start=-1,count=0;for(let i=0;i<a.length/4;i++){const j=i*4,changed=a[j]!==b[j]||a[j+1]!==b[j+1]||a[j+2]!==b[j+2]||a[j+3]!==b[j+3];if(changed){count++;if(start<0)start=i;}else if(start>=0){runs.push(start,i-start);start=-1;}}if(start>=0)runs.push(start,a.length/4-start);need(runs.length<=1048576,'The changed pixel mask is too complex for this pilot.');return {runs,count};}
  function apply(frame,width,height,op){
    need(['RECOLOUR','TRANSPARENT'].includes(op.kind)&&Array.isArray(op.rect)&&op.rect.length===4&&op.rect.every(Number.isInteger),'Invalid edit selection.');
    const [x,y,w,h]=op.rect;need(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height,'Selection is outside the image.');
    need(op.match_rgb===null||rgb(op.match_rgb),'Invalid sampled colour.');
    need(op.kind==='RECOLOUR'?rgb(op.replacement_rgb):op.replacement_rgb===null,'Invalid replacement colour.');
    const next=frame.slice();for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const i=(yy*width+xx)*4;if(!frame[i+3]||(op.match_rgb&&op.match_rgb.some((v,k)=>v!==frame[i+k])))continue;
      if(op.kind==='TRANSPARENT')next[i+3]=0;else for(let k=0;k<3;k++)next[i+k]=op.replacement_rgb[k];
    }return next;
  }
  function rebuild(original,history,active,width,height){let frame=original.slice();for(const i of active)frame=apply(frame,width,height,history[i-1].operation);return frame;}
  function nextFrame(frame,original,history,active,redo,op,width,height){
    if(op.kind==='UNDO'){need(active.length&&op.target_version===active.at(-1),'Nothing to undo, or invalid undo target.');redo.push(active.pop());return rebuild(original,history,active,width,height);}
    if(op.kind==='REDO'){need(redo.length&&op.target_version===redo.at(-1),'Nothing to redo, or invalid redo target.');const version=redo.pop();active.push(version);return apply(frame,width,height,history[version-1].operation);}
    need(op.target_version===null,'Edits cannot target a history version.');return apply(frame,width,height,op);
  }
  async function verify(p,ctx){
    need(p&&H.utf8(JSON.stringify(p)).length<=LIMIT,'Image project exceeds 64 MiB; no history was removed.');
    need(keys(p,['schema','project_id','name','created_utc','master_sha256','original','colour_project','history','document_sha256'])&&p.schema===SCHEMA&&uuid(p.project_id)&&p.master_sha256===A.MASTER,'Unsupported image project or master.');
    text(p.name,120);need(typeof p.created_utc==='string'&&Number.isFinite(Date.parse(p.created_utc)),'Invalid project date.');
    const o=p.original;need(keys(o,['name','mime','file_base64','file_sha256','width','height','representation','rgba_base64','rgba_sha256']),'Invalid retained original.');text(o.name,240);dimensions(o.width,o.height);
    need(o.representation==='BROWSER_DECODED_SRGB_RGBA8_FROZEN','Unsupported original pixel representation.');
    const bytes=unbase64(o.file_base64,MAX_SOURCE),info=C.imageInfo(bytes);dimensions(info.width,info.height);
    need(info.mime===o.mime&&info.width*info.height===o.width*o.height&&((info.width===o.width&&info.height===o.height)||(info.width===o.height&&info.height===o.width)),'Source image dimensions differ.');
    const original=unbase64(o.rgba_base64,MAX_PIXELS*4);need(original.length===o.width*o.height*4&&hash(o.file_sha256)&&await ctx.sha(bytes)===o.file_sha256&&hash(o.rgba_sha256)&&await ctx.sha(original)===o.rgba_sha256,'Original file or frozen pixels were changed.');
    if(p.colour_project!==null)await P.verify(p.colour_project,ctx);
    need(Array.isArray(p.history)&&p.history.length<=MAX_EVENTS,'Image history limit reached (100 steps).');
    const active=[],redo=[];let frame=original.slice(),parent=null,before=o.rgba_sha256;
    for(let i=0;i<p.history.length;i++){
      const e=p.history[i];need(keys(e,['version','parent_sha256','created_utc','note','operation','changed_pixels','affected_runs','before_rgba_sha256','after_rgba_sha256','revision_sha256'])&&e.version===i+1&&e.parent_sha256===parent,'Invalid history chain.');
      text(e.note,2000);need(typeof e.created_utc==='string'&&Number.isFinite(Date.parse(e.created_utc)),'Invalid edit date.');
      const op=e.operation;need(keys(op,['kind','rect','match_rgb','replacement_rgb','source_reference','replacement_reference','target_version']),'Invalid edit operation.');
      if(['UNDO','REDO'].includes(op.kind))need(Number.isInteger(op.target_version)&&['rect','match_rgb','replacement_rgb','source_reference','replacement_reference'].every(k=>op[k]===null),'Invalid undo/redo operation.');
      else need(equal(reference(op.match_rgb,ctx),op.source_reference)&&equal(reference(op.replacement_rgb,ctx),op.replacement_reference),'RGB/reference assignment differs.');
      const next=nextFrame(frame,original,p.history,active,redo,op,o.width,o.height),change=diff(frame,next);
      need(change.count>0&&e.changed_pixels===change.count&&equal(e.affected_runs,change.runs),'Changed pixels or their positions differ.');
      need(e.before_rgba_sha256===before&&hash(e.after_rgba_sha256)&&await ctx.sha(next)===e.after_rgba_sha256,'Rendered image checksum differs.');
      need(hash(e.revision_sha256)&&await digest({project_id:p.project_id,event:eventPayload(e)},ctx)===e.revision_sha256,'History checksum differs.');
      if(!['UNDO','REDO'].includes(op.kind)){active.push(i+1);redo.length=0;}
      frame=next;parent=e.revision_sha256;before=e.after_rgba_sha256;
    }
    need(hash(p.document_sha256)&&await digest(envelope(p),ctx)===p.document_sha256,'Image project checksum differs.');
    return {frame,original,source:bytes,active,redo};
  }
  async function seal(p,ctx){p.document_sha256=await digest(envelope(p),ctx);await verify(p,ctx);return p;}
  async function create({name,filename,bytes,width,height,rgba,colourProject=null},ctx){
    text(name,120);text(filename,240);dimensions(width,height);need(bytes.length<=MAX_SOURCE,'Source image exceeds 8 MiB.');
    const info=C.imageInfo(bytes);
    return seal({schema:SCHEMA,project_id:ctx.uuid(),name,created_utc:new Date().toISOString(),master_sha256:A.MASTER,
      original:{name:filename,mime:info.mime,file_base64:base64(bytes),file_sha256:await ctx.sha(bytes),width,height,representation:'BROWSER_DECODED_SRGB_RGBA8_FROZEN',rgba_base64:base64(rgba),rgba_sha256:await ctx.sha(rgba)},colour_project:clone(colourProject),history:[]},ctx);
  }
  async function edit(p,{kind,rect=null,match=null,replacement=null,note},ctx){
    const state=await verify(p,ctx);text(note,2000);need(p.history.length<MAX_EVENTS,'Image history limit reached. Export this project; no steps were removed.');
    const control=['UNDO','REDO'].includes(kind),op={kind,rect:control?null:rect,match_rgb:control?null:match,replacement_rgb:control?null:replacement,source_reference:control?null:reference(match,ctx),replacement_reference:control?null:reference(replacement,ctx),target_version:kind==='UNDO'?state.active.at(-1):kind==='REDO'?state.redo.at(-1):null};
    const next=nextFrame(state.frame,state.original,p.history,[...state.active],[...state.redo],op,p.original.width,p.original.height),change=diff(state.frame,next);
    need(change.count>0,'No pixels would change. Adjust the selection or colour.');
    const out=clone(p),e={version:p.history.length+1,parent_sha256:p.history.at(-1)?.revision_sha256||null,created_utc:new Date().toISOString(),note,operation:op,changed_pixels:change.count,affected_runs:change.runs,before_rgba_sha256:await ctx.sha(state.frame),after_rgba_sha256:await ctx.sha(next)};
    e.revision_sha256=await digest({project_id:p.project_id,event:e},ctx);out.history.push(e);return seal(out,ctx);
  }
  function relation(a,b){if(a.project_id!==b.project_id)return 'NEW';if(a.document_sha256===b.document_sha256)return 'SAME';const identity=p=>({name:p.name,created_utc:p.created_utc,original:p.original,colour_project:p.colour_project});if(!equal(identity(a),identity(b)))return 'CONFLICT';if(a.history.length<b.history.length&&a.history.every((e,i)=>e.revision_sha256===b.history[i].revision_sha256))return 'NEWER';if(b.history.length<a.history.length&&b.history.every((e,i)=>e.revision_sha256===a.history[i].revision_sha256))return 'OLDER';return 'CONFLICT';}
  async function exportFiles(p,ctx){
    const s=await verify(p,ctx),files={'image-project.clarus.json':H.utf8(JSON.stringify(p)+'\n'),'edited.png':C.png(p.original.width,p.original.height,s.frame)};
    files['original/image.'+(p.original.mime==='image/png'?'png':'jpg')]=s.source;
    if(p.colour_project)files['colour-project.clarus.json']=H.utf8(JSON.stringify(p.colour_project,null,2)+'\n');
    files['read-me.txt']=H.utf8('ATLAS CLARUS IMAGE PROJECTS\nOpen this ZIP or image-project.clarus.json in Image Projects to continue editing.\nThe JSON includes the exact source file, frozen browser-decoded sRGB RGBA pixels,\nevery edit, affected pixel runs (zero-based row-major start/count pairs), notes,\nundo/redo events and integrity hashes. Original bytes are never overwritten.\nThe PNG is the current image; PNG alone does not carry the complete history.\nA colour-project JSON, when included, is the palette snapshot attached at creation;\nimage edits do not automatically recolour that palette or an external design file.\nBrowser decoding is a recorded conversion to sRGB, not original camera/print values.\nChecksums test consistency, not authorship or authenticity of declared sources.\n');
    const hashes={};for(const [name,bytes]of Object.entries(files))hashes[name]=await ctx.sha(bytes);
    files['image-package-manifest.json']=H.utf8(JSON.stringify({schema:'atlas-clarus-image-package/1.0',project_id:p.project_id,document_sha256:p.document_sha256,files:hashes}));return files;
  }
  async function importZip(bytes,ctx){
    const files=C.unzip(bytes),decode=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
    need(files['image-project.clarus.json']&&files['image-package-manifest.json'],'Missing image project companions.');
    const p=decode(files['image-project.clarus.json']),expected=await exportFiles(p,ctx),m=decode(files['image-package-manifest.json']);
    need(equal(Object.keys(files).sort(),Object.keys(expected).sort())&&equal(m,decode(expected['image-package-manifest.json'])),'Image package manifest differs.');
    for(const [name,body]of Object.entries(expected))need(await ctx.sha(files[name])===await ctx.sha(body),'Image package file differs: '+name);
    return p;
  }
  root.ATLAS_IMAGE_PROJECTS={SCHEMA,LIMIT,MAX_PIXELS,MAX_SOURCE,MAX_EVENTS,base64,unbase64,dimensions,reference,hex,verify,create,edit,relation,exportFiles,importZip};
})(typeof window==='undefined'?globalThis:window);
