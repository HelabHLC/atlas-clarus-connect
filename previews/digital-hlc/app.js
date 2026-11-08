(function(){
  'use strict';
  const $=id=>document.getElementById(id),C=ATLAS_DIGITAL_HLC,ctx=C.context(ATLAS_CLARUS_DATA,ATLAS_DIGITAL_LIBRARY_DATA);
  let lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'de',current=null,palette=[];
  const names={srgb:'sRGB','display-p3':'Display-P3',rec2020:'Rec.2020','prophoto-rgb':'ProPhoto RGB'};
  const en={badge:'Digital colour extension · Preview 0.1.8',language:'Language',eyebrow:'MORE ROOM FOR YOUR COLOURS',title:'An address of its own.\nBeyond the existing master.',lead:'Keep a digital HLC address, check its RGB colour spaces and preserve the original colour.',boundary:'New digital colours have no measured spectral data or confirmed production-library membership.',inputTitle:'1. Enter a colour',inputKind:'Input',hlcOption:'HLC address · D50 / 2°',rgbOption:'RGB in a known colour space',name:'Colour name',hlcLabel:'HLC address',hlcHint:'H 0–360 · L 0–100 · C 0–200 · up to six decimal places',space:'RGB colour space',scale:'Number scale',rgbHint:'Keep values and colour space together. The same RGB numbers describe different colours in different spaces.',calculate:'Calculate colour',resultTitle:'2. Your colour',add:'Add to digital palette',sourcePreview:'Preview of your colour',comparisonPreview:'Existing RGB-only comparison',comparisonHint:'The comparison reference does not replace your digital address. For colours outside sRGB, this existing search route compares a clipped sRGB preview only.',rgbTable:'Calculated RGB values · normalized 0–1',coverage:'Coverage',valuesHint:'Values outside 0–1 are retained here. Only the preview is clipped. ProPhoto is a working space; it does not expand your display.',details:'View source and comparison',paletteTitle:'3. Save your digital palette',open:'Open palette',save:'Palette with provenance · JSON',css:'Web colours · CSS',saveHint:'This separate digital export preserves source, colour space, Lab and comparison. Reopen it here; it is not a conventional Clarus master-palette export.',libraryTitle:'What changes for the libraries?',library:'Existing reference library',inside:'Inside',outside:'Outside',libraryHint:'Counts check the Lab colours of existing master references. They do not add addresses to stored production libraries and do not establish print approval.',footer:'ATLAS Clarus · 13,283 fixed master references plus separately documented digital colours. Works offline after download.',back:'Back to Browser Edition',digital:'Digital colour · outside the master',master:'Existing master reference',membershipUnknown:'Production-library membership: not established. No spectrum or ARBE values assigned.',membershipMaster:'Present in {n} visible source-declared library lists. Membership is not print approval.',inGamut:'Within gamut',outGamut:'Outside gamut',empty:'Your digital palette is empty.',remove:'Remove',computed:'Colour calculated. The original identity is retained.',added:'Added to the digital palette.',loaded:'Palette opened and all values, identities and memberships verified.',saved:'Export created.',dirty:'Input changed. Calculate again before adding.',failure:'Could not complete: ',previewP3:'Display-P3 preview · display support reported; not measured.',previewSrgb:'sRGB preview',clipped:' · clipped approximation',counts:'{n} existing master references. Membership list unchanged.',normalised:'The 0–1 scale preserves decimal RGB values.',unknownLabel:'Digital colour',limit:'A palette can contain at most 256 colours.',invalidNumber:'Enter three numbers within the selected scale.',importSize:'JSON file must be at most 10 MiB.',noColours:'Add a colour first.'};
  const de={digital:'Digitale Farbe · außerhalb des Masters',master:'Bestehende Masterreferenz',membershipUnknown:'Druckbibliothekszugehörigkeit: nicht bestätigt. Keine Spektral- oder ARBE-Werte zugewiesen.',membershipMaster:'In {n} sichtbaren, quellenbasierten Bibliothekslisten enthalten. Zugehörigkeit ist keine Druckfreigabe.',inGamut:'Im Farbraum',outGamut:'Außerhalb',empty:'Deine digitale Palette ist noch leer.',remove:'Entfernen',computed:'Farbe berechnet. Die ursprüngliche Identität bleibt erhalten.',added:'Zur digitalen Palette hinzugefügt.',loaded:'Palette geöffnet und alle Werte, Identitäten und Zugehörigkeiten geprüft.',saved:'Export erstellt.',dirty:'Eingabe geändert. Vor dem Hinzufügen neu berechnen.',failure:'Nicht ausgeführt: ',previewP3:'Display-P3-Vorschau · Unterstützung gemeldet; nicht gemessen.',previewSrgb:'sRGB-Vorschau',clipped:' · begrenzte Näherung',counts:'{n} vorhandene Masterreferenzen. Bibliotheksliste unverändert.',unknownLabel:'Digitale Farbe',limit:'Eine Palette darf höchstens 256 Farben enthalten.',invalidNumber:'Drei Zahlen innerhalb der gewählten Skala eingeben.',importSize:'Die JSON-Datei darf höchstens 10 MiB groß sein.',noColours:'Zuerst eine Farbe hinzufügen.'};
  Object.assign(en,{digitalLibrariesTitle:'The expanded RGB libraries',digitalLibrary:'Digital library',saveLibrary:'Complete RGB library · JSON',digitalLibraryHint:'GamutMap snapshot 18 October 2026 · full source selection including additional digital HLC addresses. Our computed gamut check is reported separately. A * marks a difference between source selection and the computed boundary.',digitalCounts:'{total} addresses · {master} existing master references · {extra} additional digital colours',digitalMember:'Digital RGB libraries: {names} (source snapshot).',digitalNotListed:'No exact membership in these two source lists.',digitalNotLookedUp:'RGB source preserved; no library lookup using its rounded HLC label.',emptySlice:'No addresses in this source selection at this H / L.',rgb8:'Preview 0–255'});
  Object.assign(de,{digitalCounts:'{total} Adressen · {master} bestehende Masterreferenzen · {extra} zusätzliche digitale Farben',digitalMember:'Digitale RGB-Bibliotheken: {names} (Quellendatenstand).',digitalNotListed:'Keine exakte Zugehörigkeit zu diesen beiden Quellenlisten.',digitalNotLookedUp:'RGB-Original erhalten; keine Bibliothekszuordnung anhand seiner gerundeten HLC-Anzeige.',emptySlice:'Für dieses H / L enthält die Quellenauswahl keine Adressen.',rgb8:'Vorschau 0–255'});
  document.querySelectorAll('[data-text]').forEach(el=>de[el.dataset.text]=el.innerText||el.textContent);
  const t=key=>(lang==='en'?en:de)[key]||key;
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
  function translate(){
    document.documentElement.lang=lang;$('language').value=lang;
    document.querySelectorAll('[data-text]').forEach(el=>{el.textContent=t(el.dataset.text);if(el.id==='title')el.style.whiteSpace='pre-line';});
    document.title='ATLAS Clarus · '+(lang==='en'?'Digital colour extension':'Digitale Farberweiterung');
    renderResult();renderPalette();renderCoverage();renderDigitalLibrary();
  }
  function inputState(){const hlc=$('input-kind').value==='HLC';$('hlc-input').hidden=!hlc;$('rgb-input').hidden=hlc;$('hlc').required=hlc;for(const id of ['red','green','blue'])$(id).required=!hlc;}
  function dirty(){current=null;$('result').hidden=true;status(t('dirty'));}
  $('input-kind').addEventListener('change',inputState);
  $('colour-form').addEventListener('input',e=>{if(e.target.id!=='colour-name')dirty();});
  $('rgb-scale').addEventListener('change',()=>{const max=Number($('rgb-scale').value),previous=max===1?255:1;for(const id of ['red','green','blue']){const input=$(id);input.value=String(Number(input.value)/previous*max);input.max=String(max);}dirty();});
  $('colour-form').addEventListener('submit',event=>{
    event.preventDefault();current=null;$('result').hidden=true;
    try{
      let source;
      if($('input-kind').value==='HLC')source={kind:'HLC',address:$('hlc').value};
      else{const scale=Number($('rgb-scale').value),inputs=['red','green','blue'].map(id=>$(id).value);if(inputs.some(v=>v.trim()===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>scale))throw Error(t('invalidNumber'));source={kind:'RGB',space:$('rgb-space').value,values:inputs.map(v=>Number(v)/scale)};}
      current=ctx.resolve(source);renderResult();status(t('computed'));
    }catch(e){status(t('failure')+e.message,true);}
  });
  function paint(el,colour){
    const s=colour.representations.srgb,p=colour.representations['display-p3'];
    const p3=p.in_gamut&&matchMedia('(color-gamut: p3)').matches&&CSS.supports('color','color(display-p3 1 0 0)');
    el.style.backgroundColor=p3?'color(display-p3 '+p.preview_rgb.join(' ')+')':s.preview_hex;
    return p3?t('previewP3'):t('previewSrgb')+(s.in_gamut?'':t('clipped'));
  }
  function renderResult(){
    $('result').hidden=!current;if(!current)return;
    $('address').textContent=current.address;
    $('identity-kind').textContent=t(current.identity.kind==='MASTER_REFERENCE'?'master':'digital');
    $('membership').textContent=current.identity.kind==='MASTER_REFERENCE'?t('membershipMaster').replace('{n}',current.library_membership.libraries.length):t('membershipUnknown');
    const digital=current.digital_library_membership;
    $('digital-membership').textContent=digital.status==='NOT_LOOKED_UP_FOR_ROUNDED_RGB_ADDRESS'?t('digitalNotLookedUp'):digital.libraries.length?t('digitalMember').replace('{names}',digital.libraries.map(l=>l.name).join(', ')):t('digitalNotListed');
    $('preview-status').textContent=paint($('source-swatch'),current);
    const match=current.master_comparison;$('master-swatch').style.backgroundColor=match.stored_hex;
    $('comparison-ref').textContent=match.reference+' · '+match.stored_hex+' · RGB '+match.stored_srgb.join(' / ');
    $('rgb-values').replaceChildren(...C.SPACES.map(space=>{const r=current.representations[space],tr=node('tr'),values=node('td',r.encoded_rgb.map(v=>v.toFixed(6)).join(' / '),'numbers');values.append(node('small',t('rgb8')+': '+r.preview_rgb8.join(' / '),'rgb8'));tr.append(node('td',names[space]),values,node('td',t(r.in_gamut?'inGamut':'outGamut'),r.in_gamut?'good':'outside'));return tr;}));
    $('details').textContent=JSON.stringify({source:current.source,identity:current.identity,lab_d50_2deg:current.lab_d50_2deg,comparison:match,digital_library_membership:current.digital_library_membership,library_membership:current.library_membership,spectral_data:current.spectral_data,physical_qc:current.physical_qc},null,2);
  }
  $('add').addEventListener('click',()=>{if(!current)return;if(palette.length>=256){status(t('limit'),true);return;}palette.push({label:$('colour-name').value.trim()||t('unknownLabel'),colour:current});renderPalette();status(t('added'));});
  function renderPalette(){
    const host=$('palette');host.replaceChildren();$('save').disabled=$('css').disabled=!palette.length;
    if(!palette.length){host.append(node('p',t('empty'),'hint'));return;}
    palette.forEach((e,i)=>{const row=node('div',undefined,'palette-row'),chip=node('div',undefined,'palette-chip'),description=node('div'),remove=node('button',t('remove'),'remove');paint(chip,e.colour);description.append(node('strong',e.label),node('small',e.colour.address),node('small',t(e.colour.identity.kind==='MASTER_REFERENCE'?'master':'digital')));remove.dataset.remove=i;remove.setAttribute('aria-label',t('remove')+': '+e.label);remove.addEventListener('click',()=>{palette.splice(i,1);renderPalette();});row.append(chip,description,remove);host.append(row);});
  }
  function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status(t('saved'));}
  $('save').addEventListener('click',()=>{try{download(JSON.stringify(ctx.exportProject(palette),null,2)+'\n','ATLAS_Clarus.digital-colours.json','application/json');}catch(e){status(t('failure')+e.message,true);}});
  $('css').addEventListener('click',()=>{try{if(!palette.length)throw Error(t('noColours'));download(ctx.css(palette),'ATLAS_Clarus.digital-colours.css','text/css');}catch(e){status(t('failure')+e.message,true);}});
  $('open').addEventListener('change',async()=>{const file=$('open').files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error(t('importSize'));const restored=ctx.importProject(JSON.parse(await file.text()));palette=restored;current=null;renderResult();renderPalette();status(t('loaded'));}catch(e){status(t('failure')+e.message,true);}finally{$('open').value='';}});
  for(const [id,v] of Object.entries(ctx.views)){if(v.hidden_from_new_selection)continue;const option=node('option',v.name);option.value=id;$('library').append(option);}
  function renderCoverage(){const c=ctx.coverage($('library').value);$('library-status').textContent=t('counts').replace('{n}',c.total.toLocaleString(lang));$('library-counts').replaceChildren(...C.SPACES.map(space=>{const row=node('tr'),r=c.spaces[space];row.append(node('td',names[space]),node('td',r.inside.toLocaleString(lang)),node('td',r.outside.toLocaleString(lang)));return row;}));}
  $('library').addEventListener('change',renderCoverage);
  for(let h=5;h<=360;h+=5){const option=node('option',String(h));option.value=h;$('library-hue').append(option);}$('library-hue').value='295';
  for(let l=100;l>=0;l-=5){const option=node('option',String(l));option.value=l;$('library-lightness').append(option);}$('library-lightness').value='40';
  function renderDigitalLibrary(){
    const space=$('digital-library').value,lib=ctx.digitalLibraries.libraries[space],h=Number($('library-hue').value),l=Number($('library-lightness').value);
    $('digital-library-counts').textContent=t('digitalCounts').replace('{total}',lib.total.toLocaleString(lang)).replace('{master}',lib.master_count.toLocaleString(lang)).replace('{extra}',lib.additional_digital_count.toLocaleString(lang));
    const addresses=lib.references.filter(ref=>{const p=C.parseHLC(ref);return p.l===l&&(p.h===h||p.c===0);}).sort((a,b)=>C.parseHLC(a).c-C.parseHLC(b).c);
    $('digital-library-swatches').replaceChildren(...addresses.map(ref=>{const row=ctx.libraryRow(ref,space),button=node('button',undefined,'library-colour'),chip=node('span',undefined,'library-colour-chip');button.dataset.address=ref;chip.style.backgroundColor=row.preview_srgb;if(space==='display-p3'&&row.computed_in_gamut&&matchMedia('(color-gamut: p3)').matches&&CSS.supports('color','color(display-p3 1 0 0)'))chip.style.backgroundColor='color(display-p3 '+row.rgb_normalized.join(' ')+')';button.append(chip,node('span','C'+String(C.parseHLC(ref).c)+(row.computed_in_gamut?'':' *')));button.title=ref+' · '+t(row.identity.kind==='MASTER_REFERENCE'?'master':'digital');button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>{$('input-kind').value='HLC';$('hlc').value=ref;inputState();$('colour-form').requestSubmit();$('result').scrollIntoView({behavior:'smooth',block:'start'});});return button;}));
    if(!addresses.length)$('digital-library-swatches').append(node('p',t('emptySlice'),'hint'));
  }
  for(const id of ['digital-library','library-hue','library-lightness'])$(id).addEventListener('change',renderDigitalLibrary);
  $('save-library').addEventListener('click',()=>{try{const space=$('digital-library').value;download(JSON.stringify(ctx.exportLibrary(space))+'\n','ATLAS_Clarus_'+space+'_digital-library.json','application/json');}catch(e){status(t('failure')+e.message,true);}});
  $('language').addEventListener('change',()=>{lang=$('language').value;translate();status('');});
  inputState();translate();$('colour-form').requestSubmit();
})();
