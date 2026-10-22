(function(root){
 'use strict';
 const X=root.ATLAS_TOOL_EXCHANGE,$=id=>document.getElementById(id);
 let ctx=null,pkg=null,busy=false,queue=Promise.resolve(),requested=null,activeByTool={},lastSaved='';
 const tools={palette:{route:'library',button:'export-palette',input:'palette-import-file',status:'export-status',success:'Imported '},decisions:{route:'colour-handoff',button:'ch-save',input:'ch-import',status:'ch-status',success:'Decision JSON verified'},project:{route:'colour-projects',button:'cp-save',input:'cp-import',status:'cp-status',success:'Project opened'},image:{route:'image-projects',button:'ip-json',input:'ip-import',status:'ip-status',success:'Image project opened'},reduction:{route:'colour-reduction',button:'cr-zip',input:'cr-job-import',status:'cr-status',success:'Complete reduction job restored'},print:{route:'print',button:'print-export',input:'print-import-file',status:'print-message',success:'Handoff restored'}};
 const kindTool={REFERENCE_PALETTE:'palette',COLOUR_DECISIONS:'decisions',DECISION_HANDOFF:'decisions',DECISION_CARD:'decisions',COLOUR_PROJECT:'project',IMAGE_PROJECT:'image',REDUCTION_JOB:'reduction',PRINT_HANDOFF:'print'};
 const summary=p=>p?JSON.stringify(p.documents.map(d=>[d.id,d.sha256])):'';
 function status(text,error=false){$('xe-status').textContent=text;$('xe-status').dataset.error=String(error);if($('xe-banner-message'))$('xe-banner-message').textContent=text;}
 function controls(){if($('xe-banner')){$('xe-banner').hidden=!pkg?.documents.length;$('xe-banner-capture').disabled=busy||!ctx;$('xe-banner-save').disabled=busy||!ctx||!pkg?.documents.length;}for(const id of ['xe-new','xe-import','xe-add','xe-attachment','xe-capture','xe-tool','xe-document','xe-derive','xe-target','xe-save','xe-native-open','xe-native-target','xe-original'])$(id).disabled=busy||!ctx;
  $('xe-save').disabled=busy||!pkg?.documents.length;for(const id of ['xe-native-open','xe-original','xe-derive'])$(id).disabled=busy||!pkg?.documents.length;
 }
 function render(){const selected=$('xe-document').value;$('xe-document').replaceChildren();for(const d of pkg?.documents||[]){const o=new Option(d.filename+' · '+d.kind,d.id);$('xe-document').add(o);}if(pkg?.documents.some(d=>d.id===selected))$('xe-document').value=selected;
  $('xe-summary').textContent=(pkg?.documents.length||0)+' complete files · '+(summary(pkg)===lastSaved?'saved/opened package':'changes in this tab; save the exchange ZIP');
  const list=$('xe-files');list.replaceChildren();for(const d of pkg?.documents||[]){const li=document.createElement('li');li.textContent=d.filename+' · '+d.kind+' · '+d.size_bytes+' bytes · '+d.parents.length+' source link(s)';list.append(li);}controls();
 }
 async function run(message,fn){if(busy||!ctx)return;busy=true;controls();status(message);try{await fn();render();}catch(e){status(e.message+' Existing package retained.',true);}finally{busy=false;controls();}}
 const selected=()=>{const d=pkg?.documents.find(d=>d.id===$('xe-document').value);if(!d)throw Error('Choose a file.');return d;};
 async function fileBytes(f){if(!f||f.size>X.MAX_BYTES)throw Error('File exceeds the supported size.');return new Uint8Array(await f.arrayBuffer());}
 function fileInput(input,bytes,name){const dt=new DataTransfer();dt.items.add(new File([bytes],name,{type:/\.zip$/i.test(name)?'application/zip':'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
 async function waitNative(t){const start=Date.now();while(Date.now()-start<120000){const node=$(t.status),text=node.textContent;if(node.dataset.error==='true'||/^(Import blocked|Handoff.*rejected)/.test(text)||node.classList.contains('error'))throw Error(text);
   if(text.startsWith(t.success))return;await new Promise(r=>setTimeout(r,50));}throw Error('Native tool did not confirm the transfer. Check its status; package files remain intact.');}
 async function openNative(){const d=selected(),native=await X.inspect(pkg.payloads[d.id],ctx,d.kind==='ATTACHMENT');const reductionSource=$('xe-native-target').value==='REDUCTION_SOURCE';if(reductionSource&&d.kind!=='IMAGE_PROJECT')throw Error('Choose a complete Image Project as the reduction source.');const key=reductionSource?'reduction':kindTool[d.kind],t=reductionSource?{...tools.reduction,input:'cr-file',success:'Source ready'}:tools[key];if(d.kind==='MIXING_RECIPE'){status('Verified computational recipe. Download original file, then import that JSON in the standalone Mixing Atlas recipe-import preview. No calculation or production approval is performed.');return;}if(!t)throw Error('This file is retained unchanged. Use an explicit working-view action or download it.');
  if($(t.input).disabled)throw Error('Target tool is busy or unavailable.');
  // Native validators and conflict checks still run; source payload is never overwritten.
  location.hash=t.route;$(t.status).dataset.error='false';$(t.status).textContent='Exchange: verifying received document …';$(t.status).classList.remove('error');
  let bytes=pkg.payloads[d.id],name='received.clarus.json';
  if(d.kind==='REDUCTION_JOB')name='received-job.zip';
  else if(['DECISION_CARD','DECISION_HANDOFF','COLOUR_PROJECT'].includes(d.kind)){bytes=new TextEncoder().encode(JSON.stringify(native.data)+'\n');}
  else if(d.kind==='IMAGE_PROJECT')name=bytes[0]===80&&bytes[1]===75?'received-image.zip':'received-image.clarus.json';
  fileInput($(t.input),bytes,name);await waitNative(t);activeByTool[key]=d.id;status('Opened in '+key+'. Full source files remain in this exchange package. Capture the edited tool state, then save the exchange ZIP.');
 }
 function captureNative(name,data,type){
  const ticket=requested; if(!ticket)return false;requested=null;
  queue=queue.then(async()=>{const bytes=data instanceof Uint8Array?data.slice():data instanceof Blob?new Uint8Array(await data.arrayBuffer()):new TextEncoder().encode(String(data));
   const r=await X.add(pkg,{filename:name,bytes,parents:ticket.parent?[ticket.parent]:[],operation:ticket.parent?'CAPTURED_TOOL_EDIT':'CAPTURED_NATIVE_TOOL'},ctx);pkg=r.package;activeByTool[ticket.tool]=r.id;render();$('xe-document').value=r.id;ticket.resolve(r.id);
  }).catch(e=>ticket.reject(e));return true;
 }
 function init(options){
  const download=options.download;
  function replay(args){return new Promise((resolve,reject)=>{
   const source=$('atlas-reduction-worker-source');if(!source){reject(Error('Reduction replay worker is unavailable.'));return;}
   const url=URL.createObjectURL(new Blob([JSON.parse(source.textContent)],{type:'text/javascript'}));let worker;
   const end=()=>{worker?.terminate();URL.revokeObjectURL(url);};
   try{worker=new Worker(url);worker.onmessage=e=>{if(e.data.progress)return;end();e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};worker.onerror=e=>{end();reject(Error(e.message));};
    const request={};for(const k of ['rgba','width','height','master','k','lockedIds','originalRgbs','protectedRectangles','regionCorrections','protectionMode','libraryId','libraryName','libraryIds'])request[k]=args[k];request.colors=args.colors.map(c=>({id:c.id,ref:c.ref,rgb:c.rgb}));worker.postMessage(request);
   }catch(e){end();reject(e);}
  });}
  if($('xe-banner')){
   $('xe-banner-save').onclick=()=>$('xe-save').click();
   $('xe-banner-capture').onclick=()=>{const route=location.hash.slice(1),key=Object.keys(tools).find(k=>tools[k].route===route)||(['picker','wheel','appearance'].includes(route)?'palette':null);if(!key){location.hash='exchange';status('Choose the tool to capture in the exchange workspace.');return;}$('xe-tool').value=key;$('xe-capture').click();};
  }

  $('xe-new').onclick=()=>run('Creating a new exchange workspace …',async()=>{if(pkg?.documents.length&&summary(pkg)!==lastSaved)throw Error('Save the current exchange ZIP before starting another package.');pkg=X.create(ctx);activeByTool={};lastSaved='';status('New package. Add a native file or capture a tool state.');});
  $('xe-import').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;run('Verifying all exchange files and native documents …',async()=>{const candidate=await X.importZip(await fileBytes(f),ctx);if(pkg?.documents.length&&summary(pkg)!==lastSaved)throw Error('Save the current changed exchange package before opening another one.');pkg=candidate;activeByTool={};lastSaved=summary(pkg);status('Exchange opened. Every native document and retained source file verified.');});};
  // Optional isolated-preview controls; production pages are not changed.
  if($('xe-camera-add'))$('xe-camera-add').onclick=()=>run('Verifying original camera companions …',async()=>{
   const image=$('xe-camera-image').files[0],record=$('xe-camera-record').files[0];
   if(!image||!record)throw Error('Choose both the original camera PNG and selection JSON.');
   const result=await X.addCamera(pkg,{imageBytes:await fileBytes(image),recordBytes:await fileBytes(record)},ctx);
   pkg=result.package;status('Camera evidence retained together. Original observation preserved; no new measurement or reference assignment.');
  });
  $('xe-add').onchange=e=>{const files=[...e.target.files];e.target.value='';if(!files.length)return;run('Checking complete native files …',async()=>{let next=pkg;for(const f of files){const r=await X.add(next,{filename:f.name,bytes:await fileBytes(f),attachment:$('xe-attachment').checked},ctx);next=r.package;}pkg=next;status('Files added in full. Attachments are retained as bytes; no editable interpretation is claimed.');});};
  $('xe-save').onclick=()=>run('Verifying the full exchange before download …',async()=>{const snapshot=pkg,bytes=await X.exportZip(snapshot,ctx);download('ATLAS_Clarus_Exchange.zip',bytes,'application/zip',true);lastSaved=summary(snapshot);status('Complete exchange ZIP download started. Check the downloaded file before closing.');});
  $('xe-original').onclick=()=>{try{const d=selected();download(d.filename,pkg.payloads[d.id],'application/octet-stream',true);status('Original native file download started; bytes and filename preserved.');}catch(e){status(e.message,true);}};
  $('xe-derive').onclick=()=>run('Preparing an explicit working view without replacing the source …',async()=>{const r=await X.derive(pkg,selected().id,$('xe-target').value,ctx);pkg=r.package;render();$('xe-document').value=r.ids[0];status('Prepared '+r.ids.length+' complete document(s). Sources and earlier decisions remain in the package. Open the selected working document in its tool.');});
  $('xe-native-open').onclick=()=>run('Checking target compatibility …',openNative);
  $('xe-capture').onclick=()=>run('Capturing the complete native tool state …',async()=>{
   const key=$('xe-tool').value,t=tools[key];if($(t.button).disabled)throw Error('No exportable state in '+key+'. Prepare it in that tool first.');
   const id=await new Promise((resolve,reject)=>{const ticket={tool:key,parent:activeByTool[key]||null,resolve,reject};requested=ticket;location.hash=t.route;$(t.button).click();
    setTimeout(()=>{if(requested===ticket){requested=null;reject(Error('Tool did not produce a complete export. Check its status.'));}},120000);
   });$('xe-document').value=id;status('Complete native state added. Save the exchange ZIP to retain it across tools.');
  });
  root.addEventListener('beforeunload',e=>{if(pkg?.documents.length&&summary(pkg)!==lastSaved){e.preventDefault();e.returnValue='';}});
  (async()=>{try{ctx=await X.context({...options,reduce:replay});pkg=X.create(ctx);status('Ready. Complete sources stay in the package; working views are explicit.');render();}catch(e){status(e.message,true);}controls();})();
 }
 root.ATLAS_TOOL_EXCHANGE_UI={init,captureNative};
})(window);
