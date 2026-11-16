(function(root){
  'use strict';
  const P=root.ATLAS_COLOUR_PROJECTS,A=root.ATLAS_COLOUR_HANDOFF,H=root.ClarusHandoff;
  const KEY='atlasClarusColourProjectsV1',LIBRARY='atlas-clarus-project-library/1.0',MAX_LIBRARY=32*1024*1024;
  const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init({colors,master,download}){
    let ctx=null,busy=true,page=0,setId='',library={schema:LIBRARY,active_id:null,projects:[]},storageBlocked=false,lastStoredRaw=null;
    const backedUp=new Map();
    const current=()=>library.projects.find(p=>p.project_id===library.active_id)||null;
    function status(message,error=false){$('cp-status').textContent=message;$('cp-status').dataset.error=String(error);}
    function controls(){
      const p=current(),has=Boolean(p),set=has&&P.latest(p).entries.some(e=>e.entry_id===setId);
      for(const id of ['cp-project-list','cp-new-name','cp-new','cp-import'])$(id).disabled=busy||!ctx||storageBlocked;
      for(const id of ['cp-name','cp-rename','cp-note','cp-note-save','cp-set-name','cp-from-handoff','cp-add-json','cp-save','cp-package','cp-passport'])$(id).disabled=busy||!ctx||!has||storageBlocked;
      for(const id of ['cp-set-list','cp-update-json'])$(id).disabled=busy||!ctx||!set||storageBlocked;
      $('cp-prev').disabled=busy||page===0;$('cp-next').disabled=busy||!set||(page+1)*12>=P.palette(p,setId).records.length;
      $('cp-cards').querySelectorAll('input,textarea,button,select').forEach(e=>e.disabled=busy||storageBlocked);
    }
    function persist(){
      if(storageBlocked)return;
      try{
        if(localStorage.getItem(KEY)!==lastStoredRaw){blockForOtherTab();return;}
        const raw=JSON.stringify(library);if(H.utf8(raw).length>MAX_LIBRARY)throw Error('Workspace size limit.');
        localStorage.setItem(KEY,raw);lastStoredRaw=raw;$('cp-storage-warning').hidden=true;
      }catch(_){$('cp-storage-warning').hidden=false;$('cp-storage-warning').textContent='These latest changes are in memory only. Browser storage is unavailable or full. Download every changed project as JSON before closing or reloading.';}
    }
    function commit(p){
      if(storageBlocked)throw Error('The workspace changed in another tab. Export this tab’s project before reloading.');
      const index=library.projects.findIndex(x=>x.project_id===p.project_id);
      if(index<0){if(library.projects.length>=10)throw Error('This browser holds 10 projects. Keep your project exports and use a separate browser workspace for another project.');library.projects.push(p);}else library.projects[index]=p;
      library.active_id=p.project_id;persist();render();
    }
    function render(){
      const p=current(),r=p&&P.latest(p);
      $('cp-project-list').innerHTML=library.projects.length?library.projects.map(x=>'<option value="'+x.project_id+'">'+esc(P.latest(x).name)+' · v'+P.latest(x).version+'</option>').join(''):'<option value="">No projects yet</option>';
      $('cp-project-list').value=p?.project_id||'';
      $('cp-name').value=r?.name||'';
      $('cp-project-info').textContent=r?'Project version '+r.version+' · '+r.entries.length+' colour sets · '+r.selected.length+' chosen colours.':'No project open.';
      $('cp-backup-status').textContent=p?(backedUp.get(p.project_id)===p.document_sha256?'Download started for this version. Check your downloads.':'Download project JSON to keep a portable backup of this version.'):'Create a project or open a saved project JSON.';
      $('cp-workspace').hidden=!p;
      if(!r){$('cp-cards').innerHTML='';controls();return;}
      if(!r.entries.some(e=>e.entry_id===setId)){setId=r.entries[0]?.entry_id||'';page=0;}
      $('cp-set-list').innerHTML=r.entries.map(e=>'<option value="'+e.entry_id+'">'+esc(e.label)+' · '+P.palette(p,e.entry_id).records.length+' colours</option>').join('');$('cp-set-list').value=setId;
      const d=setId?P.palette(p,setId):null,rows=d?.records||[],nodes=new Map((d?.decisions.nodes||[]).map(n=>[n.revision_id,n]));
      page=Math.min(page,Math.max(0,Math.ceil(rows.length/12)-1));
      $('cp-cards').innerHTML=rows.slice(page*12,page*12+12).map((c,j)=>{
        const index=page*12+j,history=d.decisions.nodes.filter(n=>n.decision_id===c.decision_id),first=history[0];
        const selected=r.selected.find(s=>s.entry_id===setId&&s.decision_id===c.decision_id),chosen=selected&&nodes.get(selected.revision_id);
        const swatch=(label,hex)=>'<div><small>'+label+'</small><i style="background:'+hex+'"></i><b>'+hex+'</b></div>';
        let image='';
        if(first.origin.kind==='BUNDLE_DERIVATION'&&d.bundle_origin?.basis==='RECORDED_ORIGINALS'){
          const raw=JSON.parse(d.bundle_origin.document_text.replace(/^\uFEFF/,'')),s=raw.source_assignments[first.origin.index];
          image='<p>Image: '+esc(s.image.name)+'<br>Sample: '+esc(s.sampling.mode)+' · '+s.sampling.centre.join(', ')+'<br>Image SHA-256: '+esc(s.image.sha256||'Not recorded')+'</p>';
        }
        return '<article class="cp-card" data-index="'+index+'"><h3>'+esc(c.original.name)+'</h3><div class="cp-swatches">'+swatch('STARTING RGB',first.record.original.hex)+swatch('WORKING RGB',c.original.hex)+swatch('ATLAS REFERENCE',c.reference_hex)+'</div><p>'+esc(c.atlas_reference)+' · RGB squared distance '+c.distance_squared+'</p><p class="cp-chosen"><strong>Chosen version: '+(chosen?esc(chosen.record.original.hex):'Not selected')+'</strong>'+(chosen&&chosen.revision_id!==c.revision_id?' · differs from working colour':'')+'</p><label>Design version to use<select data-version aria-label="Design version for '+esc(c.original.name)+'"><option value="">No chosen version</option>'+history.map((n,i)=>'<option value="'+n.revision_id+'"'+(n.revision_id===selected?.revision_id?' selected':'')+'>'+esc(n.record.original.hex)+' · revision '+(i+1)+(n.revision_id===c.revision_id?' · current':'')+'</option>').join('')+'</select></label><label>Selection note<input data-choice-note maxlength="2000" placeholder="Why this version?" aria-label="Selection note for '+esc(c.original.name)+'"></label><button data-choose>Record choice</button><details class="cp-edit"><summary>Edit working colour</summary><label>Colour name<input data-name maxlength="240" value="'+esc(c.original.name)+'"></label><label>sRGB HEX<input data-hex maxlength="7" value="'+esc(c.original.hex)+'"></label><label>Change note<textarea data-edit-note maxlength="2000" rows="2" placeholder="Why are you changing it?"></textarea></label><button data-edit>Save colour revision</button></details><details><summary>Origin & history · '+history.length+' revisions</summary><p>Recorded source: '+esc(first.record.original.source)+'</p>'+image+'<p>Decision ID: '+esc(c.decision_id)+'</p><ol>'+history.map(n=>'<li>'+esc(n.record.original.hex)+' · '+esc(n.event.kind)+'</li>').join('')+'</ol></details></article>';
      }).join('');
      $('cp-pager').hidden=rows.length<=12;$('cp-page').textContent=(page+1)+' / '+Math.max(1,Math.ceil(rows.length/12));
      $('cp-history-list').innerHTML=p.revisions.slice().reverse().map(v=>'<li><b>Version '+v.version+' · '+esc(v.kind)+'</b> · '+esc(v.created_utc)+'<br>'+esc(v.note)+'</li>').join('');
      controls();
    }
    async function run(message,work,success){
      if(busy||storageBlocked)return;busy=true;controls();status(message);
      try{await work();status(success);}catch(e){status(e.message+' Existing project data were retained.',true);}
      finally{busy=false;controls();}
    }
    async function read(file){if(!file||file.size>P.LIMIT)throw Error('Choose a JSON file no larger than 16 MiB.');const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>P.LIMIT)throw Error('File exceeds the import limit.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''));}
    async function importProject(file){return run('Verifying the complete project …',async()=>{
      const data=await P.verify(await read(file),ctx),existing=library.projects.find(p=>p.project_id===data.project_id);
      if(existing){const relation=P.importRelation(existing,data);if(relation==='OLDER'||relation==='CONFLICT')throw Error('This project file is older or has diverged from the version here. Neither version was overwritten. Keep both files; no automatic merge is performed.');}
      commit(clone(data));
    },'Project opened. Source documents, chosen versions and history are preserved.');}
    const requireProject=()=>{const p=current();if(!p)throw Error('Create or open a project first.');return p;};
    const setName=()=>{const name=$('cp-set-name').value.trim();if(!name)throw Error('Give this colour set a name.');return name;};
    $('cp-new').onclick=()=>run('Creating project …',async()=>{const p=await P.create($('cp-new-name').value,ctx);commit(p);$('cp-new-name').value='';},'Project created. Bring your colours from Colour handoff or a saved palette JSON.');
    $('cp-project-list').onchange=()=>{if(busy)return;library.active_id=$('cp-project-list').value;setId='';page=0;persist();render();status('Saved project opened.');};
    $('cp-import').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importProject(f);};
    $('cp-rename').onclick=()=>run('Saving project name …',async()=>commit(await P.rename(requireProject(),$('cp-name').value,ctx)),'Project name saved as a new version.');
    $('cp-note-save').onclick=()=>run('Adding project note …',async()=>{commit(await P.note(requireProject(),$('cp-note').value,ctx));$('cp-note').value='';},'Project note recorded.');
    $('cp-from-handoff').onclick=()=>run('Adding the complete handoff colour set …',async()=>{
      const d=root.ATLAS_COLOUR_HANDOFF_UI.readCurrent?.();if(!d)throw Error('Prepare or load colours in Colour handoff first.');
      commit(await P.add(requireProject(),setName(),d,ctx));setId=P.latest(current()).entries.at(-1).entry_id;render();
    },'Colour set added with its complete recorded origin and decision history.');
    $('cp-add-json').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)run('Verifying the colour set …',async()=>{commit(await P.add(requireProject(),setName(),await read(f),ctx));setId=P.latest(current()).entries.at(-1).entry_id;render();},'Colour set added.');};
    $('cp-update-json').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)run('Checking the returned colour decisions …',async()=>commit(await P.update(requireProject(),setId,await read(f),'Imported a newer colour decision file.',ctx)),'Colour set updated. Earlier snapshots and chosen versions were kept.');};
    $('cp-set-list').onchange=()=>{setId=$('cp-set-list').value;page=0;render();};
    $('cp-save').onclick=()=>run('Preparing full project JSON …',async()=>{const p=requireProject();await P.verify(p,ctx);download('project.clarus.json',JSON.stringify(p,null,2)+'\n','application/json');backedUp.set(p.project_id,p.document_sha256);render();},'Project JSON download started. Keep this file to reopen or share the complete project.');
    $('cp-package').onclick=()=>run('Checking and packaging the project …',async()=>{const p=requireProject(),files=await P.exportPackage(p,ctx);download('ATLAS_Clarus_Colour_Project.zip',H.zipStored(files),'application/zip');backedUp.set(p.project_id,p.document_sha256);render();},'Project ZIP download started. It includes the full project, passport, working colours and explicitly chosen versions.');
    $('cp-passport').onclick=()=>run('Preparing the colour passport …',async()=>{const p=requireProject();await P.verify(p,ctx);download('colour-passport.html',P.passport(p),'text/html');},'Readable colour passport download started. Keep project JSON for complete editable data.');
    $('cp-cards').onclick=e=>{
      const button=e.target.closest('button');if(!button||busy)return;const card=button.closest('.cp-card'),p=requireProject(),c=P.palette(p,setId).records[Number(card.dataset.index)];
      if(button.hasAttribute('data-edit'))run('Saving the colour revision …',async()=>commit(await P.edit(p,setId,c.decision_id,card.querySelector('[data-name]').value,card.querySelector('[data-hex]').value,card.querySelector('[data-edit-note]').value,ctx)),'Colour revision saved. Its original record and any previously chosen version remain available.');
      if(button.hasAttribute('data-choose'))run('Recording the design choice …',async()=>commit(await P.choose(p,setId,c.decision_id,card.querySelector('[data-version]').value||null,card.querySelector('[data-choice-note]').value,ctx)),'Design choice recorded. This is not measured production approval.');
    };
    $('cp-prev').onclick=()=>{page--;render();};$('cp-next').onclick=()=>{page++;render();};
    const drop=$('cp-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length!==1){status('Drop one project JSON at a time.',true);return;}importProject(e.dataTransfer.files[0]);};
    document.querySelectorAll('[data-colour-projects]').forEach(b=>b.onclick=()=>{$('palette-drawer').classList.remove('open');location.hash='colour-projects';});
    // Another tab must never silently replace this tab's unsaved project changes.
    function blockForOtherTab(){storageBlocked=true;$('cp-storage-warning').hidden=false;$('cp-storage-warning').textContent='Another tab changed the project workspace. Export the current project using the recovery button before reloading.';const p=current();if(p){const b=document.createElement('button');b.textContent='Export this tab’s project';b.onclick=()=>download('project-recovery.clarus.json',JSON.stringify(p,null,2)+'\n','application/json');$('cp-storage-warning').append(' ',b);}controls();}
    root.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)blockForOtherTab();});
    (async()=>{
      try{
        ctx=await A.createContext(colors,master);let raw=null;
        try{raw=localStorage.getItem(KEY);lastStoredRaw=raw;}catch(_){$('cp-storage-warning').hidden=false;$('cp-storage-warning').textContent='Browser storage is unavailable. You can work here and download project JSON before closing.';}
        if(raw){
          if(H.utf8(raw).length>MAX_LIBRARY)throw Error('Saved workspace exceeds the size limit.');
          const candidate=JSON.parse(raw);
          if(candidate.schema!==LIBRARY||!Array.isArray(candidate.projects)||candidate.projects.length>10)throw Error('Unsupported saved project workspace.');
          const ids=new Set();for(const p of candidate.projects){await P.verify(p,ctx);if(ids.has(p.project_id))throw Error('Duplicate saved project.');ids.add(p.project_id);}
          if(candidate.projects.length&&!ids.has(candidate.active_id))throw Error('Saved active project is missing.');
          library=candidate;
        }
        status('Ready. Create a project or open your saved project JSON.');
      }catch(e){storageBlocked=true;status(e.message+' Saved browser data have not been overwritten.',true);if(lastStoredRaw){$('cp-storage-warning').hidden=false;$('cp-storage-warning').textContent='The saved workspace could not be opened. Download its raw data for recovery.';const b=document.createElement('button');b.textContent='Download saved workspace';b.onclick=()=>download('colour-projects-workspace-recovery.json',lastStoredRaw,'application/json');$('cp-storage-warning').append(' ',b);}}
      finally{busy=false;render();}
    })();
  }
  root.ATLAS_COLOUR_PROJECTS_UI={init};
})(window);
