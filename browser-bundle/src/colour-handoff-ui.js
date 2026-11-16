(function(root){
  'use strict';
  const KEY='atlasClarusColourHandoffV1',H=root.ClarusHandoff,A=root.ATLAS_COLOUR_HANDOFF;
  const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init({colors,master,getBundle,download}){
    let current=null,ctx=null,busy=true,ticket=0,page=0;
    function status(text,error=false){$('ch-status').textContent=text;$('ch-status').dataset.error=String(error);}
    function controls(){
      for(const id of ['ch-create','ch-import','ch-return-files','ch-srgb','ch-basis','ch-start','ch-count'])$(id).disabled=busy||!ctx;
      for(const id of ['ch-save','ch-export'])$(id).disabled=busy||!ctx||!current;
      $('ch-return').disabled=busy||!ctx||!$('ch-srgb').checked||$('ch-return-files').files.length!==3;
    }
    function paletteInfo(reset=false){
      const d=getBundle(),n=(d.source_assignments||[]).length;
      $('ch-palette-info').textContent=(d.palette_name||'Active palette')+' · '+n+' recorded originals · '+d.references.length+' references.';
      const available=$('ch-basis').value==='RECORDED_ORIGINALS'?n:d.references.length;
      $('ch-start').max=Math.max(1,available);
      if(reset){$('ch-start').value=1;$('ch-count').value=Math.max(1,Math.min(250,available));}
    }
    function render(){
      controls();$('ch-summary').textContent=current?current.records.length+' colour decisions · '+current.decisions.nodes.length+' retained revisions.':'No colour decisions loaded.';
      const rows=current?.records||[],nodes=new Map((current?.decisions.nodes||[]).map(n=>[n.revision_id,n]));
      page=Math.min(page,Math.max(0,Math.ceil(rows.length/12)-1));
      $('ch-cards').innerHTML=rows.slice(page*12,page*12+12).map(r=>{
        const chain=[];let node=nodes.get(r.revision_id);while(node){chain.push(node);node=nodes.get(node.parent_revision_id);}chain.reverse();
        const history=chain.length<=6?chain:[chain[0],...chain.slice(-5)];
        const origin=chain[0],a=current.bundle_origin;
        let detail='';
        if(origin.origin.kind==='BUNDLE_DERIVATION'&&a){
          const d=JSON.parse(a.document_text.replace(/^\uFEFF/,''));
          if(a.basis==='RECORDED_ORIGINALS'){
            const s=d.source_assignments[origin.origin.index];
            detail='<p>Image: '+esc(s.image.name)+'<br>Sample: '+esc(s.sampling.mode)+' · '+s.sampling.centre.join(', ')+'<br>Image SHA-256: '+esc(s.image.sha256||'Not recorded')+'</p>';
          }else detail='<p>Atlas reference deliberately adopted as a new design colour.</p>';
        }
        return '<article class="ch-card"><h3>'+esc(r.original.name)+'</h3><div class="ch-swatches"><div><small>CURRENT DESIGN RGB</small><i style="background:'+r.original.hex+'"></i><b>'+esc(r.original.hex)+'</b></div><div><small>ATLAS REFERENCE</small><i style="background:'+r.reference_hex+'"></i><b>'+esc(r.reference_hex)+'</b></div></div><p>'+esc(r.atlas_reference)+' · row '+r.atlas_row_id+' · d² '+r.distance_squared+'</p><details><summary>Origin & history · '+chain.length+' revisions</summary><p>Starting colour: '+esc(origin.record.original.hex)+'<br>Source: '+esc(origin.record.original.source)+'</p>'+detail+'<p>Decision: '+esc(r.decision_id)+'<br>Revision: '+esc(r.revision_id)+'</p><ol>'+history.map(n=>'<li>'+esc(n.event.kind)+' · '+esc(n.record.original.hex)+'</li>').join('')+'</ol>'+(chain.length>6?'<p>All intermediate revisions are retained in the full JSON.</p>':'')+'</details></article>';
      }).join('');
      $('ch-pager').hidden=rows.length<=12;$('ch-page').textContent=(page+1)+' / '+Math.max(1,Math.ceil(rows.length/12));$('ch-prev').disabled=page===0;$('ch-next').disabled=(page+1)*12>=rows.length;
    }
    function persist(){
      try{localStorage.setItem(KEY,JSON.stringify(current));$('ch-storage-warning').hidden=true;}
      catch(_){$('ch-storage-warning').hidden=false;$('ch-storage-warning').textContent='This working set could not be saved in the browser. Save the full decision JSON before leaving.';}
    }
    async function run(message,work,success){
      const t=++ticket;busy=true;controls();status(message);
      try{const result=await work();if(t!==ticket)return;if(result?.data){current=result.data;page=0;persist();render();}status(typeof success==='function'?success(result):success);}
      catch(e){if(t===ticket)status(e.message+(current?' Current colour decisions were retained.':''),true);}
      finally{if(t===ticket){busy=false;controls();}}
    }
    async function bytes(file,max=A.LIMIT){if(file.size>max)throw Error('File exceeds the import limit.');const b=new Uint8Array(await file.arrayBuffer());if(b.length>max)throw Error('File exceeds the import limit.');return b;}
    const decode=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
    async function importFile(f){if(!f||!ctx)return;await run('Checking the complete decision JSON …',async()=>({data:await A.verify(decode(await bytes(f)),ctx)}),'Decision JSON verified. IDs, original snapshots and revisions are preserved.');}
    $('ch-create').onclick=()=>{
      const d=clone(getBundle()),basis=$('ch-basis').value,start=Number($('ch-start').value)-1,count=Number($('ch-count').value),previous=current&&clone(current);
      run('Preparing colour decisions …',async()=>({data:await A.derive(d,basis,start,count,ctx,previous)}),'Colour decisions ready. Save full JSON to preserve this working set.');
    };
    $('ch-import').onchange=e=>{const f=e.target.files[0];e.target.value='';importFile(f);};
    $('ch-save').onclick=()=>{if(current&&!busy){download('palette.clarus.json',JSON.stringify(current,null,2)+'\n','application/json');status('Full decision JSON saved. It can be opened here or in Colour Kit 0.3.0.');}};
    $('ch-export').onclick=()=>{if(!current||busy)return;const snapshot=clone(current),t=ticket+1;run('Checking and packaging the handoff …',async()=>{const files=await H.exportHandoff(snapshot,ctx);if(t===ticket){files['READ_ME.txt']=H.utf8(new TextDecoder().decode(files['READ_ME.txt']).replace('in Colour Kit.','in Colour Kit or Browser Bundle Colour handoff.'));download('ATLAS_Clarus_Adobe_Handoff.zip',H.zipStored(files),'application/zip');}},'Adobe handoff ZIP saved. Keep the companion files with the ASE. Native Adobe validation is still open.');};
    $('ch-return-files').onchange=()=>{ticket++;busy=false;$('ch-srgb').checked=false;controls();status('Return files selected. Confirm their sRGB interpretation before verification.');};
    $('ch-srgb').onchange=()=>{ticket++;busy=false;controls();status('Verify the return to link its colours to the original decisions.');};
    $('ch-return').onclick=()=>{
      if(!$('ch-srgb').checked||busy)return;const selected=Array.from($('ch-return-files').files);
      run('Verifying returned swatches and companion files …',async()=>{
        let ase,json,manifest;
        if(selected.length!==3)throw Error('Choose exactly three handoff files.');
        for(const f of selected){const b=await bytes(f,/\.ase$/i.test(f.name)?1024*1024:A.LIMIT);if(/\.ase$/i.test(f.name)){if(ase)throw Error('Choose one returned ASE.');ase=b;}else{const d=decode(b);if(d.schema===H.SCHEMA){if(json)throw Error('Duplicate palette JSON.');json=b;}else if(d.schema===H.HANDOFF){if(manifest)throw Error('Duplicate manifest.');manifest=b;}else throw Error('Choose the two original JSON companions.');}}
        if(!ase||!json||!manifest)throw Error('Choose returned ASE, palette.clarus.json and handoff.json.');
        const result=await H.returnHandoff(json,manifest,ase,ctx);await A.verify(result.data,ctx);return result;
      },r=>{ $('ch-return-files').value='';$('ch-srgb').checked=false;return r.report.records+' decisions linked · '+r.report.rgb_changed+' changed RGB values. Save the full JSON to retain the new revisions.';});
    };
    const drop=$('ch-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files.length!==1){status('Drop one decision JSON at a time.',true);return;}importFile(e.dataTransfer.files[0]);};
    $('ch-basis').onchange=()=>{paletteInfo(true);status('Starting point changed. Choose Use active palette to prepare this selection.');};
    $('ch-start').oninput=$('ch-count').oninput=()=>status('Range changed. Choose Use active palette to prepare this selection.');
    $('ch-prev').onclick=()=>{page--;render();};$('ch-next').onclick=()=>{page++;render();};
    document.querySelectorAll('[data-colour-handoff]').forEach(b=>b.onclick=()=>{$('palette-drawer').classList.remove('open');location.hash='colour-handoff';paletteInfo(true);});
    root.addEventListener('hashchange',()=>{if(location.hash==='#colour-handoff')paletteInfo(true);});
    paletteInfo(true);
    run('Checking the reference data …',async()=>{ctx=await A.createContext(colors,master);const raw=localStorage.getItem(KEY);if(raw){if(H.utf8(raw).length>A.LIMIT)throw Error('Saved working set exceeds the import limit.');return {data:await A.verify(JSON.parse(raw),ctx)};}},'Ready. Choose your starting colours or load a saved decision JSON.').then(()=>{render();});
  }
  root.ATLAS_COLOUR_HANDOFF_UI={init};
})(window);
