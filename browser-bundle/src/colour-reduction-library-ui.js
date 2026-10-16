(function(root){
  'use strict';
  const I=root.ATLAS_IMAGE_PROJECTS,C=root.ATLAS_IMAGE_CODECS,A=root.ATLAS_COLOUR_HANDOFF,H=root.ClarusHandoff,R=root.ATLAS_COLOUR_REDUCTION;
  const $=id=>document.getElementById(id);
  function init({colors,master,download,libraryViews={}}){
    let uncleaned=null,ctx=null,input=null,result=null,busy=false,worker=null,workerUrl=null,locks=[],originals=[],rectangles=[],corner=null,selectedPixel=null,loupe=null;
    const libraryMode=()=>$('cr-protection-mode').value==='LIBRARY_REFERENCE';
    const library=()=>libraryViews[$('cr-library').value];
    let libraryBinding=null;
    function reference(rgb){
      if(!libraryMode())return I.reference(rgb,ctx);
      const c=libraryBinding.nearest(rgb).row;
      return {atlas_row_id:c.id,atlas_reference:c.ref,reference_rgb:c.rgb};
    }
    const byId=new Map(colors.map(c=>[c.id,c]));
    const status=(s,error=false)=>{$('cr-status').textContent=s;$('cr-status').dataset.error=String(error);};
    function controls(){
      for(const id of ['cr-file','cr-current','cr-k','cr-lock-hex','cr-library','cr-protection-mode'])$(id).disabled=busy||!ctx;
      for(const id of ['cr-run','cr-lock-add','cr-original-add','cr-pixel-original'])$(id).disabled=busy||!ctx||!input;
      for(const id of ['cr-png','cr-zip','cr-palette'])$(id).disabled=busy||!result;
      $('cr-cleanup').disabled=busy||!result;$('cr-cleanup-reset').disabled=busy||!result?.report.area_cleanup;$('cr-cleanup-min').disabled=busy;
      $('cr-cancel').disabled=!worker;
      document.querySelectorAll('#cr-locks button, #cr-original-locks button, #cr-region-locks button').forEach(b=>b.disabled=busy);
      loupe?.setBusy(busy||!ctx||!input);
      $('cr-pixel-original').disabled=busy||!selectedPixel?.alpha;
      $('cr-region-start').disabled=busy||!ctx||!input||!selectedPixel;
      $('cr-region-end').disabled=busy||!ctx||!input||!selectedPixel||!corner;
      $('cr-region-cancel').disabled=busy||!corner;
    }
    function invalidate(){uncleaned=null;result=null;$('cr-output').hidden=true;$('cr-after').hidden=true;$('cr-result').textContent='Settings changed. Create a new reduced preview.';controls();}
    function draw(id,pixels){const cv=$(id);cv.width=input.width;cv.height=input.height;cv.getContext('2d',{colorSpace:'srgb'}).putImageData(new ImageData(new Uint8ClampedArray(pixels),input.width,input.height),0,0);}
    function showLocks(){
      $('cr-locks').replaceChildren();
      for(const id of locks){const c=byId.get(id),b=document.createElement('button');b.textContent=c.ref+' · '+I.hex(c.rgb)+' · Remove protection';b.onclick=()=>{locks=locks.filter(n=>n!==id);invalidate();showLocks();};$('cr-locks').append(b);}
    }
    function showOriginals(){
      $('cr-original-locks').replaceChildren();
      for(const rgb of originals){const b=document.createElement('button');b.textContent=libraryMode()?I.hex(rgb)+' → '+reference(rgb).atlas_reference+' · Remove reference protection':'Original '+I.hex(rgb)+' · Remove exact RGB protection';b.onclick=()=>{originals=originals.filter(c=>I.hex(c)!==I.hex(rgb));invalidate();showOriginals();};$('cr-original-locks').append(b);}
      const groups=new Map();for(const rgb of originals){const r=reference(rgb),g=groups.get(r.atlas_row_id)||[];g.push(I.hex(rgb));groups.set(r.atlas_row_id,g);}
      $('cr-original-warning').textContent=[...groups.values()].some(g=>g.length>1)?(libraryMode()?'Multiple source colours share one library reference and count once.':'Different protected originals share one Atlas reference. Exact original RGB protection keeps them separate in the output.'):'';
    }
    $('cr-original-add').onclick=()=>{try{
      if(busy||!input||!ctx)return;const value=$('cr-lock-hex').value.trim();if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Enter a six-digit HEX value.');
      const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
      if(originals.some(c=>I.hex(c)===I.hex(rgb))){status('This exact original RGB is already protected.');return;}
      let found=false;for(let i=0;i<input.rgba.length;i+=4)if(input.rgba[i+3]&&rgb.every((v,j)=>input.rgba[i+j]===v)){found=true;break;}
      if(!found)throw Error('Choose an original RGB that occurs in a visible source pixel.');
      if(!libraryMode()&&originals.length+locks.length>=Number($('cr-k').value))throw Error('Increase the colour limit before adding another protection.');
      originals.push(rgb);invalidate();showOriginals();status(libraryMode()?'Source colour will be converted to its library reference and fixed everywhere it occurs. Create a preview.':'Exact original '+I.hex(rgb)+' protected everywhere it occurs. Create a new preview.');
    }catch(e){status(e.message,true);}};
    $('cr-pixel-original').onclick=()=>$('cr-original-add').click();
    function drawRegions(){
      if(!input)return;draw('cr-before',input.rgba);
      const c=$('cr-before').getContext('2d'),w=Math.max(1,input.width/600);c.strokeStyle='#A6FF4D';c.lineWidth=w;
      for(const [x0,y0,x1,y1]of rectangles)c.strokeRect(x0+w/2,y0+w/2,Math.max(0.1,x1-x0+1-w),Math.max(0.1,y1-y0+1-w));
    }
    function showRegions(){
      $('cr-region-locks').replaceChildren();
      rectangles.forEach((r,index)=>{const b=document.createElement('button');b.textContent='Rectangle '+(index+1)+' · X '+r[0]+'–'+r[2]+' / Y '+r[1]+'–'+r[3]+' · Remove';b.onclick=()=>{rectangles.splice(index,1);invalidate();showRegions();};$('cr-region-locks').append(b);});
      $('cr-region-corner').textContent=corner?'First corner: X '+corner.x+' / Y '+corner.y+'. Select the opposite corner in the pixel magnifier.':'Select a pixel, then set the first corner.';
      drawRegions();
    }
    $('cr-region-start').onclick=()=>{if(busy||!selectedPixel||!input)return;corner={x:selectedPixel.x,y:selectedPixel.y};showRegions();controls();};
    $('cr-region-cancel').onclick=()=>{if(busy)return;corner=null;showRegions();controls();};
    $('cr-region-end').onclick=()=>{if(busy||!corner||!selectedPixel||!input)return;
      if(rectangles.length>=64){status('At most 64 protected rectangles are supported.',true);return;}
      const r=[Math.min(corner.x,selectedPixel.x),Math.min(corner.y,selectedPixel.y),Math.max(corner.x,selectedPixel.x),Math.max(corner.y,selectedPixel.y)];
      if(!rectangles.some(v=>v.every((n,i)=>n===r[i])))rectangles.push(r);
      corner=null;invalidate();showRegions();status(libraryMode()?'Rectangle selected. Its colours will be converted to library references and fixed. Alpha stays unchanged.':'Rectangle protected. All original RGBA pixels inside stay exact. Create a preview to check the colour limit.');
    };
    async function run(message,fn){if(busy||!ctx)return;busy=true;controls();status(message);try{await fn();}catch(e){status(e.message+' Previous source retained.',true);}finally{busy=false;controls();}}
    async function projectInput(p){const s=await I.verify(p,ctx);return {width:p.original.width,height:p.original.height,rgba:s.frame.slice(),name:p.name,
      sourceName:p.original.name,sourceBytes:s.source,sourceMime:p.original.mime,project:p};}
    function accept(next){input=next;locks=[];originals=[];rectangles=[];corner=null;selectedPixel=null;showOriginals();showRegions();loupe.setInput(input);invalidate();showLocks();$('cr-images').hidden=false;draw('cr-before',input.rgba);drawRegions();$('cr-source').textContent=input.name+' · '+input.width+' × '+input.height+' pixels'+(input.project?' · verified current Image Project revision':' · browser-decoded sRGB');status('Source ready. Choose the maximum palette size and protect important references.');}
    $('cr-file').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;run('Reading and verifying the source …',async()=>{
      const isProject=/\.(json|zip)$/i.test(f.name),limit=isProject?96*1024*1024:I.MAX_SOURCE;
      if(f.size>limit)throw Error('File exceeds the supported size.');
      const bytes=new Uint8Array(await f.arrayBuffer());let next;
      if(isProject){let p;if(/\.zip$/i.test(f.name))p=await I.importZip(bytes,ctx);else{if(bytes.length>I.LIMIT)throw Error('Project JSON exceeds 64 MiB.');p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,''));}next=await projectInput(p);}
      else{const decoded=await I.decodeSource(bytes);next={...decoded,name:f.name,sourceName:f.name,sourceBytes:bytes,sourceMime:C.imageInfo(bytes).mime,project:null};}
      accept(next);
    });};
    $('cr-current').onclick=()=>run('Checking the current Image Project …',async()=>{const p=root.ATLAS_IMAGE_PROJECTS_UI.readCurrent?.();if(!p)throw Error('Open an image in Image Projects first.');accept(await projectInput(p));});
    $('cr-k').oninput=()=>{invalidate();status('Colour limit changed. Create a new preview.');};
    $('cr-lock-add').onclick=()=>{try{
      if(busy||!input)return;const value=$('cr-lock-hex').value.trim();if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('Enter a six-digit HEX value.');
      const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),ref=reference(rgb);
      if(locks.includes(ref.atlas_row_id)){status('This Atlas reference is already protected.');return;}
      if(!libraryMode()&&locks.length+originals.length>=Number($('cr-k').value))throw Error('Increase the colour limit or remove a protected reference.');
      locks.push(ref.atlas_row_id);locks.sort((a,b)=>a-b);invalidate();showLocks();status(value.toUpperCase()+' → protected '+ref.atlas_reference+' ('+I.hex(ref.reference_rgb)+'). Create a new preview.');
    }catch(e){status(e.message,true);}};
    function selectPixel(pixel){
      selectedPixel={x:pixel.x,y:pixel.y,alpha:pixel.alpha};controls();
      if(!pixel.alpha){status('This pixel is fully transparent; choose a visible colour.');return;}
      $('cr-lock-hex').value=I.hex(pixel.rgb);status('Sampled X '+pixel.x+', Y '+pixel.y+'. Protect the selected pixel’s Atlas reference when ready.');
    }
    loupe=root.ATLAS_COLOUR_REDUCTION_LOUPE.create({hex:I.hex,reference:rgb=>reference(rgb),onSelect:selectPixel,
      onProtect:pixel=>{selectPixel(pixel);$('cr-lock-add').click();}});
    function stop(){if(worker)worker.terminate();if(workerUrl)URL.revokeObjectURL(workerUrl);worker=null;workerUrl=null;busy=false;controls();}
    $('cr-cancel').onclick=()=>{stop();status('Reduction cancelled. Source unchanged.');};
    $('cr-run').onclick=()=>{
      if(busy||!ctx||!input)return;invalidate();busy=true;status('Assigning source pixels to the full Atlas …');
      try{
        workerUrl=URL.createObjectURL(new Blob([JSON.parse($('atlas-reduction-worker-source').textContent)],{type:'text/javascript'}));worker=new Worker(workerUrl);controls();
        worker.onmessage=e=>{const m=e.data;if(m.progress){status('Assigning source pixels to the full Atlas … '+Math.round(m.progress.fraction*100)+'%');return;}
          if(m.error){stop();status(m.error,true);return;}result=m.result;uncleaned=result;$('cr-cleanup-status').textContent='';stop();draw('cr-after',result.pixels);$('cr-after').hidden=false;$('cr-output').hidden=false;
          const r=result.report;$('cr-result').textContent=r.reference_protection?'Used: '+r.used_rgb_colours+' library RGB colours · '+r.selected_references+' selected references, including '+r.reference_protection.protected_references+' protected (limit '+r.requested_colours+').':r.source_unique_visible_rgb+' input RGB colours → '+r.used_rgb_colours+' visible output RGB colours · '+r.selected_references+' Atlas references + '+(r.protected_source_palette?.reserved_slots??r.original_rgb_protection?.reserved_slots??0)+' original RGB entries (limit '+r.requested_colours+') · '+r.partial_alpha_pixels+' pixels with partial opacity.';
          $('cr-swatches').replaceChildren();for(const c of r.palette){const el=document.createElement('div');el.className='cr-swatch';const sw=document.createElement('i');sw.style.backgroundColor=c.hex;el.append(sw,document.createTextNode(c.reference+' · '+c.hex+' · '+c.pixel_count+' pixels'+(c.protected?' · PROTECTED':'')+(c.pixel_count===0?' · unused in this image':'')));if(c.kind==='ORIGINAL_RGB'){
            const ref=byId.get(c.source_atlas_row_id),detail=document.createElement('p');detail.className='boundary cr-source-reference';
            detail.textContent=ref?'ATLAS assignment: '+ref.ref+' · row '+ref.id+' · Reference RGB '+ref.rgb.join(' / ')+' · '+I.hex(ref.rgb):'ATLAS assignment unavailable';
            el.append(detail);
          }$('cr-swatches').append(el);}
          status('Reduced preview ready. Original pixels and their full-master assignments are retained separately.');controls();
        };
        worker.onerror=e=>{stop();status('Reduction worker failed: '+e.message,true);};
        const pixels=input.rgba.slice();worker.postMessage({rgba:pixels,width:input.width,height:input.height,colors:colors.map(c=>({id:c.id,ref:c.ref,rgb:c.rgb})),master,protectionMode:$('cr-protection-mode').value,libraryId:$('cr-library').value,libraryName:library().name,libraryIds:library().ids.map(Number),k:Number($('cr-k').value),lockedIds:locks.slice(),originalRgbs:originals.map(c=>c.slice()),protectedRectangles:rectangles.map(r=>r.slice())},[pixels.buffer]);
      }catch(e){stop();status(e.message,true);}
    };
    function refreshCleanup(){
      draw('cr-after',result.pixels);
      const r=result.report;$('cr-result').textContent='Used: '+r.used_rgb_colours+' RGB colours · '+r.selected_references+' selected references (limit '+r.requested_colours+').';
      const cards=$('cr-swatches').children;for(let i=0;i<cards.length;i++){
        const c=r.palette[i],card=cards[i];for(const node of [...card.childNodes])if(node.nodeType===3)node.textContent=c.reference+' · '+c.hex+' · '+c.pixel_count+' pixels'+(c.protected?' · PROTECTED':'')+(c.pixel_count===0?' · unused in this image':'');
      }
      controls();
    }
    $('cr-cleanup').onclick=()=>{if(busy||!result||!uncleaned)return;try{
      result=root.ATLAS_COLOUR_REDUCTION_CLEANUP.cleanup(uncleaned,input,Number($('cr-cleanup-min').value));refreshCleanup();
      const c=result.report.area_cleanup;$('cr-cleanup-status').textContent=c.merged_components+' small areas merged · '+c.changed_pixels+' pixels changed. Protected pixels and palette unchanged.';
    }catch(e){status(e.message,true);}};
    $('cr-cleanup-reset').onclick=()=>{if(busy||!uncleaned)return;result=uncleaned;refreshCleanup();$('cr-cleanup-status').textContent='Cleanup reset. Original reduced preview restored.';};
    function paletteFiles(){
      const E=root.ATLAS_CLARUS_EXPORTS,r=result.report;
      if(!r.original_rgb_protection){const p=r.palette.map(c=>byId.get(c.atlas_row_id)),name='ATLAS Clarus reduced motif';return {'palette.gpl':H.utf8(E.gpl(p,master,name)),'palette.ase':E.ase(p),'palette.css':H.utf8(E.css(p,master,name)),'palette.tokens.json':H.utf8(JSON.stringify(E.tokens(p,master,name),null,2)+'\n')};}
      const p=r.palette.map(c=>({...c,ref:c.reference})),comment='Mixed output palette: ATLAS reference swatches and exact original RGB. Original entries are not frozen references.';
      const tokens={color:Object.fromEntries(p.map((c,i)=>['output-'+i,{$type:'color',$value:c.hex,$extensions:{'org.atlas-clarus':{kind:c.kind,atlas_row_id:c.atlas_row_id,source_atlas_row_id:c.source_atlas_row_id??null,master_sha256:master}}}]))};
      return {'palette.gpl':H.utf8('GIMP Palette\nName: Clarus mixed output\nColumns: 4\n# '+comment+'\n'+p.map(c=>c.rgb.join(' ')+'\t'+c.ref).join('\n')+'\n'),
        'palette.ase':E.ase(p),'palette.css':H.utf8('/* '+comment+' */\n:root {\n'+p.map((c,i)=>'  --clarus-output-'+i+': '+c.hex+'; /* '+c.kind+' */').join('\n')+'\n}\n'),
        'palette.tokens.json':H.utf8(JSON.stringify(tokens,null,2)+'\n')};
    }
    $('cr-palette').onclick=()=>{if(busy||!result)return;const format=$('cr-format').value,name='palette.'+(format==='tokens'?'tokens.json':format);download(name,paletteFiles()[name],format==='ase'?'application/octet-stream':'text/plain');};
    $('cr-png').onclick=()=>{if(!busy&&result)download('atlas-reduced.png',C.png(input.width,input.height,result.pixels),'image/png');};
    $('cr-zip').onclick=()=>run('Preparing source, reduced image and per-pixel evidence …',async()=>{
      if(!result)throw Error('Create a reduced preview first.');
      const files={'reduced.png':C.png(input.width,input.height,result.pixels),'input-rgba.bin':input.rgba,'input-atlas-row-id.u16le':R.assignmentBytes(result.assignments),'output-palette-index.u16le':R.assignmentBytes(result.indices)};
      if(result.protectionMask)files['protected-pixel-mask.u8']=result.protectionMask;
      files['original.'+(input.sourceMime==='image/jpeg'?'jpg':'png')]=input.sourceBytes;
      if(input.project)files['source-image-project.clarus.json']=H.utf8(JSON.stringify(input.project)+'\n');
      const report={...result.report,source:{name:input.sourceName,file_sha256:await ctx.sha(input.sourceBytes),input_rgba_sha256:await ctx.sha(input.rgba),image_project_document_sha256:input.project?.document_sha256||null},output_rgba_sha256:await ctx.sha(result.pixels),index_layout:{order:'ROW_MAJOR_ZERO_BASED',coordinates:'x = pixel_index % width; y = floor(pixel_index / width)',input_reference:'UINT16_LITTLE_ENDIAN; 65535 = fully transparent, not assigned',output_palette:'UINT16_LITTLE_ENDIAN; 65535 = fully transparent, not assigned'}};
      files['reduction.json']=H.utf8(JSON.stringify(report,null,2)+'\n');
      files['README.txt']=H.utf8('ATLAS Clarus Colour Reduction 0.1\nOpen reduced.png to view the derived motif. reduction.json describes the exact settings and palette. Original source bytes and frozen input RGBA are retained. The input may be the current edited frame of the included Image Project; that project retains its complete history and can be opened in Image Projects.\nPer-pixel full-master assignments and selected palette indices use the original image dimensions and coordinates. Transparent pixels keep their original RGB and alpha; sentinel indices mark them unassigned. Partially transparent pixels keep their alpha.\nTo regenerate, load the original image (or included Image Project), choose requested_colours and protect protected_ids using the palette HEX values. Identical input RGBA and the same master/method yield identical output. Browser decoding can differ; compare input_rgba_sha256.\nThis package is not an Image Projects ZIP and does not add an edit to the original project. No reduction-job importer is supplied in v0.1. GPL/ASE/CSS/tokens contain the complete selected palette. Clarus JSON is split into parts of at most 64 references for the existing palette importer.\nNo dithering, ink separation, underbase, trapping, halftones or print approval. Motif RGB colours are not a count of inks/screens. Checksums establish consistency, not authorship.\n');
      if(result.report.original_rgb_protection)files['README.txt']=H.utf8('Mixed output preview. ORIGINAL_RGB entries preserve browser-decoded source RGB at all matching visible pixels; alpha is unchanged. Each original reserves one slot, separately from Atlas references. atlas_row_id is null for originals; source_atlas_row_id records their unchanged reference assignment. Output indices refer to the mixed palette in reduction.json. Reference mapping may split a source reference across multiple outputs. GPL/ASE/CSS/Tokens contain the complete mixed palette. Clarus JSON chunks contain ATLAS REFERENCES ONLY; they cannot restore the mixed palette or original RGB protections. Use the full ZIP. No reduction-job importer. No region mask or spatial-isolation guarantee. Checksums establish consistency, not trusted origin or authorship. No production approval.\n');
      if(result.report.rectangle_protection)files['README.txt']=H.utf8(new TextDecoder().decode(files['README.txt']).replace('ORIGINAL_RGB entries preserve browser-decoded source RGB at all matching visible pixels; alpha is unchanged.','ORIGINAL_RGB entries preserve source values only where protected by the rectangle mask or explicit global original RGB locks; alpha is unchanged.').replace('Each original reserves one slot, separately from Atlas references.','Each distinct protected source RGB reserves one slot, separately from Atlas references; overlapping rectangles share slots.').replace('No region mask or spatial-isolation guarantee.','No spatial-isolation guarantee outside protected regions.')+'Rectangle protection: zero-based inclusive source-pixel coordinates. protected-pixel-mask.u8 is one byte per source pixel, row-major, 1 for protected rectangle or global original RGB, 0 otherwise. Every marked RGBA pixel must equal input-rgba.bin exactly. Region RGB values are protected only inside the selected rectangles; matching colours outside can still be reduced. Transparent pixels retain their hidden RGB and alpha everywhere. Selection outlines are input-preview annotations and are not in the export. No region-job importer.\n');
      if(result.report.reference_protection)files['README.txt']=H.utf8('Library reference reduction. Visible output RGB values come exclusively from the selected library. Selected source colours and rectangle colours are first converted by nearest RGB (lower row ID breaks ties), then those references are fixed during reduction. They count within the requested limit, with duplicate references counted once. This is not exact original pixel protection. Alpha and fully transparent hidden RGB stay unchanged. Original file bytes, frozen source RGBA, independent full-master assignments and original-to-library bindings are retained. protected-pixel-mask.u8 marks selected source positions, not unchanged original RGBA. See reduction.json for library IDs, source bindings and settings. No job importer or production approval.\n');
      if(result.report.area_cleanup)files['README.txt']=H.utf8(new TextDecoder().decode(files['README.txt'])+'\nSmall-area cleanup was applied to the derived reduced image. See area_cleanup in reduction.json. Only existing palette entries were used; explicit masks and protected palette entries were unchanged. Alpha unchanged.\n');
      Object.assign(files,paletteFiles());
      // Existing saved palettes still have a 64-reference limit. Emit compatible
      // chunks, never an oversized document that the existing importer rejects.
      const palette=result.report.palette.filter(c=>c.kind!=='ORIGINAL_RGB').map(c=>byId.get(c.atlas_row_id));
      for(let i=0;i<palette.length;i+=64)files['palette-part-'+(1+i/64)+'.clarus.json']=H.utf8(JSON.stringify(root.ATLAS_CLARUS_EXPORTS.clarus(palette.slice(i,i+64),master,'Reduced motif · part '+(1+i/64)),null,2)+'\n');
      const hashes={};for(const [name,body] of Object.entries(files))hashes[name]=await ctx.sha(body);
      files['reduction-package-manifest.json']=H.utf8(JSON.stringify({schema:'atlas-clarus-colour-reduction-package/1.0',files:hashes},null,2)+'\n');
      download('ATLAS_Clarus_Colour_Reduction.zip',H.zipStored(files),'application/zip');status('Reduction ZIP download started. Check the completed file before closing this tab.');
    });
    for(const [id,v]of Object.entries(libraryViews)){const o=document.createElement('option');o.value=id;o.textContent=v.name+' · '+v.ids.length+' references';$('cr-library').append(o);}
    function updateMode(){
      const v=library();if(!v||!v.ids.length)throw Error('Reference library unavailable.');
      libraryBinding=root.ATLAS_CLARUS_PKL_IMAGE.create(v.ids.map(id=>byId.get(Number(id))),master);
      locks=[];invalidate();showLocks();showOriginals();
      $('cr-library').hidden=!libraryMode();document.querySelectorAll('.cr-original-only').forEach(el=>el.hidden=libraryMode());
      $('cr-mode-help').textContent=libraryMode()?'All visible output colours come from this library. Selected source colours and rectangles are converted to their nearest library references, then fixed. Duplicate references count once within the colour limit. Alpha stays unchanged.':'Exact original RGB and rectangle protection preserve frozen browser-decoded pixels. Reference locks use the full Atlas master.';
      $('cr-original-add').textContent=libraryMode()?'Convert this source colour and protect reference':'Keep this original RGB unchanged';
      $('cr-pixel-original').textContent=libraryMode()?'Convert selected source colour and protect reference':'Keep selected original RGB unchanged';
      status('Mode or library changed. Reference locks cleared; source selections retained. Create a new preview.');
    }
    $('cr-library').onchange=updateMode;$('cr-protection-mode').onchange=updateMode;
    updateMode();
    (async()=>{try{ctx=await A.createContext(colors,master);status('Ready. Load a motif or use your current Image Project.');}catch(e){status(e.message,true);}controls();})();
  }
  root.ATLAS_COLOUR_REDUCTION_UI={init};
})(window);
