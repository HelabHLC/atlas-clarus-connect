(function(root){
  'use strict';
  const PRODUCTS={flyer:'Flyer / Visitenkarten',brochure:'Broschüre / Katalog',poster:'Plakat',packaging:'Verpackung / Etikett',textile:'Textil',other:'Anderes Druckprodukt'};
  const MATERIALS={coated:'Gestrichenes Papier',uncoated:'Holzfreies, ungestrichenes Papier',recycled:'Recycling- / Naturpapier, genaue Sorte offen',board:'Karton',film:'Folie',textile:'Stoff / Textil',other:'Anderes Material'};
  const PROCESSES={unknown:'Noch nicht bekannt',offset:'Offsetdruck',digital:'Digitaldruck',other:'Anderes Verfahren'};
  const defaults=()=>({version:1,product:'',material:'',material_detail:'',process:'unknown',instruction:'unknown',profile_name:'',applied:null});
  const norm=s=>s.toLowerCase().replace(/\.ic[cm]$/,'').replace(/[^a-z0-9]/g,'');
  function validate(g){
    if(!g||g.version!==1||!(g.product===''||Object.hasOwn(PRODUCTS,g.product))||!(g.material===''||Object.hasOwn(MATERIALS,g.material))||!Object.hasOwn(PROCESSES,g.process)||!['unknown','name','file'].includes(g.instruction)||typeof g.material_detail!=='string'||g.material_detail.length>160||typeof g.profile_name!=='string'||g.profile_name.length>160)throw Error('Ungültige Angaben zur geführten Druckvorbereitung.');
    if(g.applied!==null&&(!g.applied||!['suggestion','printer_name','printer_file'].includes(g.applied.kind)||!/^[a-f0-9]{64}$/.test(g.applied.sha256)))throw Error('Ungültige Profilzuordnung in der Druckvorbereitung.');
    return g;
  }
  function material(g){return g.material_detail.trim()||MATERIALS[g.material]||'';}
  function evaluate(g,catalog){
    validate(g);
    const profiles=catalog?.profiles||{},pending=[],result={candidate:null,kind:null,title:'Noch offen',detail:'Ergänze die Angaben zu deinem Druckauftrag.',pending};
    if(!g.product)pending.push('Druckprodukt auswählen.');
    if(!g.material)pending.push('Material auswählen.');
    if(g.material==='other'&&!g.material_detail.trim())pending.push('Material genauer beschreiben.');
    const named=Object.entries(profiles).filter(([,p])=>[p.file_name,p.description].some(s=>s&&norm(s)===norm(g.profile_name.trim())));
    if(g.instruction==='name'){
      const aliases={psocoatedv3:'psocoated_v3_icc',psocoatedv3fogra51:'psocoated_v3_icc',psouncoatedv3:'psouncoated_v3_fogra52_icc',psouncoatedv3fogra52:'psouncoated_v3_fogra52_icc'};
      const alias=aliases[norm(g.profile_name.trim())];
      const matches=alias&&profiles[alias]?[[alias,profiles[alias]]]:named;
      if(matches.length===1&&matches[0][1].output_path){
        result.candidate=matches[0][0];result.kind='printer_name';result.title='Vorgabe der Druckerei gefunden';
        result.detail='Zuordnung nach deiner Angabe. Prüfe, ob die Druckerei genau diese Profilversion für deinen Auftrag nennt.';
        if(matches[0][1].output_path==='TEXTILE_RGB')pending.push('FOGRA58 ist ein Austauschfarbraum; das konkrete Drucker-/Tinten-/Materialprofil mit der Druckerei klären.');
      }else{
        result.detail=g.profile_name.trim()?'Keine eindeutige, unterstützte Ausgabeprofil-Zuordnung. Eine FOGRA-Nummer allein legt die Profildatei nicht eindeutig fest.':'Trage den genauen Profilnamen aus der Druckereivorgabe ein.';
        pending.push('Genauen ICC-Dateinamen nennen oder die ICC-Datei von der Druckerei laden.');
      }
    }else if(g.instruction==='file'){
      result.title='Profil von der Druckerei laden';result.detail='Lade die ICC-Datei, die deine Druckerei für diesen Auftrag bereitgestellt hat.';
      if(g.applied?.kind!=='printer_file')pending.push('ICC-Datei der Druckerei laden.');
    }else{
      pending.push('Ausgabeprofil für diesen Auftrag von der Druckerei bestätigen lassen.');
      if(g.process==='unknown')pending.push('Druckverfahren bei der Druckerei erfragen.');
      const paperProduct=['flyer','brochure','poster'].includes(g.product);
      const id=paperProduct&&g.process==='offset'?{coated:'psocoated_v3_icc',uncoated:'psouncoated_v3_fogra52_icc'}[g.material]:null;
      if(id&&profiles[id]){
        result.candidate=id;result.kind='suggestion';result.title='Vorschlag zur Abstimmung';
        result.detail=g.material==='coated'?'Für standardisierten Offsetdruck auf Premium-Coated-Papier kommt PSO Coated v3 infrage. Die genaue Papiersorte und Druckbedingung müssen dazu passen.':'Für standardisierten Offsetdruck auf holzfreiem, ungestrichenem Papier kommt PSO Uncoated v3 infrage. Die genaue Papiersorte und Druckbedingung müssen dazu passen.';
      }else if(g.product&&g.material){
        result.title='Druckereivorgabe benötigt';result.detail='Produkt und Material reichen hier für eine verlässliche Profilauswahl nicht aus. Frage nach dem Ausgabeprofil für den konkreten Auftrag.';
      }
    }
    if(g.applied?.kind==='suggestion'&&!pending.some(s=>s.startsWith('Ausgabeprofil')))pending.push('Vorgeschlagenes Profil noch von der Druckerei bestätigen lassen.');
    return result;
  }
  function inquiry(g,lang=root.ATLAS_LANGUAGE?.language||'de'){
    if(lang==='en'){const t=s=>root.ATLAS_LANGUAGE.text(s,'en');return `Hello,\n\nI would like to print ${g.product?t(PRODUCTS[g.product]):'a product (to be specified)'}.\nMaterial: ${g.material_detail.trim()||(g.material?t(MATERIALS[g.material]):'to be specified')}.\nPrinting process: ${t(PROCESSES[g.process])}.\n${g.instruction==='name'&&g.profile_name.trim()?`Specified profile: ${g.profile_name.trim()}.\n`:''}\nWhich exact ICC output profile and profile version apply to this job? Please send the file or download link and confirm the paper or material and printing condition. What are the requirements for file delivery and an approval proof?\n\nThank you!`;}
    return `Guten Tag,\n\nich möchte ${PRODUCTS[g.product]||'folgendes Produkt (noch festzulegen)'} drucken.\nMaterial: ${material(g)||'noch festzulegen'}.\nDruckverfahren: ${PROCESSES[g.process]}.\n${g.instruction==='name'&&g.profile_name.trim()?`Genannte Profilvorgabe: ${g.profile_name.trim()}.\n`:''}\nWelches genaue ICC-Ausgabeprofil und welche Profilversion gelten für diesen Auftrag? Bitte senden Sie mir die Datei oder den Downloadlink und bestätigen Sie die passende Papiersorte bzw. das Material sowie die Druckbedingung. Welche Vorgaben gelten für die Datenanlieferung und einen Freigabe-Proof?\n\nVielen Dank!`;}
  function summary(g,catalog,lang=root.ATLAS_LANGUAGE?.language||'de'){
    if(!g)return '';
    const e=evaluate(g,catalog),kind=g.applied?.kind;
    if(lang==='en'){const t=s=>root.ATLAS_LANGUAGE.text(s,'en');return `Product: ${g.product?t(PRODUCTS[g.product]):'not specified'} · Material: ${g.material_detail.trim()||(g.material?t(MATERIALS[g.material]):'not specified')} · Process: ${t(PROCESSES[g.process])}. ${kind==='suggestion'?'Provisional profile suggestion used; confirmation from the printer is pending.':kind==='printer_name'?'Profile name as specified by your printer.':kind==='printer_file'?'ICC file as specified by your printer.':'No profile has been loaded through the guide.'}${e.pending.length?' Pending: '+e.pending.map(t).join(' '):''}`;}
    return `Produkt: ${PRODUCTS[g.product]||'offen'} · Materialangabe: ${material(g)||'offen'} · Verfahren: ${PROCESSES[g.process]}. ${kind==='suggestion'?'Vorläufiger Profilvorschlag verwendet; Bestätigung der Druckerei steht aus.':kind==='printer_name'?'Profilname laut deiner Druckereivorgabe.':kind==='printer_file'?'ICC-Datei laut deiner Druckereivorgabe.':'Noch kein Profil durch die Führung übernommen.'}${e.pending.length?' Offen: '+e.pending.join(' '):''}`;
  }
  function mount({container,getGuide,getProfile,getSettings,isBusy,onChange,onApply,onFile,catalog,library}){
    const $=id=>container.querySelector('#'+id);
    const options=map=>Object.entries(map).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
    container.innerHTML=`<div class="guide-fields"><label>1 · Was möchtest du drucken?<select id="guide-product"><option value="">Bitte wählen</option>${options(PRODUCTS)}</select></label><label>2 · Auf welchem Material?<select id="guide-material"><option value="">Noch nicht bekannt</option>${options(MATERIALS)}</select></label><label class="guide-wide">3 · Welche Vorgabe nennt deine Druckerei?<select id="guide-instruction"><option value="unknown">Ich habe noch keine Profilvorgabe</option><option value="name">Sie nennt einen genauen Profilnamen</option><option value="file">Sie hat mir eine ICC-Datei gegeben</option></select></label><label id="guide-name-label" hidden>Profilname aus der Vorgabe<input id="guide-profile_name" maxlength="160" placeholder="z. B. PSO Coated v3"></label><label id="guide-file-label" hidden>ICC-Datei der Druckerei<input id="guide-file" type="file" accept=".icc,.icm"></label><label id="guide-process-label">Druckverfahren laut Druckerei<select id="guide-process">${options(PROCESSES)}</select></label><label>Material genauer beschreiben <span class="small">(optional, bei „Anderes Material“ erforderlich)</span><input id="guide-material_detail" maxlength="160" placeholder="z. B. Papiersorte und Grammatur"></label></div><div class="guide-result" aria-live="polite"><p class="eyebrow">DEIN NÄCHSTER SCHRITT</p><h3 id="guide-title"></h3><p id="guide-detail"></p><p id="guide-candidate"></p><ul id="guide-pending"></ul><button id="guide-apply" type="button" hidden></button><p id="guide-feedback" role="status"></p></div><details class="guide-inquiry"><summary>Angaben fehlen? Anfrage an die Druckerei vorbereiten</summary><label>Text zum Kopieren<textarea id="guide-inquiry" rows="8" readonly></textarea></label><button id="guide-copy" class="secondary" type="button">Anfrage kopieren</button></details>`;
    let working=false,lastProfile=null;
    function refresh(){
      const g=getGuide()||defaults(),e=evaluate(g,catalog),p=e.candidate&&catalog.profiles[e.candidate],loaded=getProfile();
      const signal=loaded?loaded.info.sha256+':'+(g.applied?.kind||'manual'):null;if(signal!==lastProfile&&!working)$('guide-feedback').textContent='';lastProfile=signal;
      if(loaded&&!g.applied){e.title='Profil manuell geladen';e.detail='Die erweiterten Druckeinstellungen gelten. Prüfe die Zuordnung zu deinem Auftrag mit der Druckerei.';const i=e.pending.indexOf('ICC-Datei der Druckerei laden.');if(i>=0)e.pending.splice(i,1);e.pending.push('Manuell gewähltes Profil für diesen Auftrag mit der Druckerei abstimmen.');}
      for(const key of ['product','material','instruction','profile_name','process','material_detail']){const el=$('guide-'+key);if(el.value!==g[key])el.value=g[key];el.disabled=isBusy()||working;}
      $('guide-name-label').hidden=g.instruction!=='name';$('guide-file-label').hidden=g.instruction!=='file';$('guide-process-label').hidden=g.instruction!=='unknown';
      const settings=getSettings();
      if(loaded&&settings.path==='ECG'&&(settings.channel_order.length!==7||new Set(settings.channel_order.map(v=>v.toUpperCase())).size!==7))e.pending.push('Kanalreihenfolge aus der Druckereivorgabe unter „Profile und Druckeinstellungen · erweitert“ ergänzen.');
      if(loaded&&settings.path==='TEXTILE_RGB'&&!e.pending.some(t=>t.includes('Austauschfarbraum')))e.pending.push('FOGRA58 ist ein Austauschfarbraum; das konkrete Drucker-/Tinten-/Materialprofil mit der Druckerei klären.');
      $('guide-title').textContent=e.title;$('guide-detail').textContent=e.detail;$('guide-candidate').textContent=loaded&&!g.applied?'Aktuelles Profil: '+loaded.name:p?'Profil: '+p.file_name:'';
      $('guide-pending').replaceChildren(...e.pending.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
      $('guide-apply').hidden=!p||Boolean(loaded&&loaded.info.sha256===p.sha256&&g.applied?.kind===e.kind);$('guide-apply').textContent=e.kind==='suggestion'?'Vorschau mit diesem Profil testen':'Profilvorgabe übernehmen';
      $('guide-apply').disabled=isBusy()||working||!p||!library.available(e.candidate)||!g.product||!g.material||(g.material==='other'&&!g.material_detail.trim());
      if(p&&!library.available(e.candidate))$('guide-candidate').textContent+=' · Datei noch nicht verfügbar. Lade sie von der Druckerei oder über die erweiterten Einstellungen.';
      $('guide-file').disabled=isBusy()||working;$('guide-copy').disabled=isBusy()||working;$('guide-inquiry').value=inquiry(g);
      if(loaded&&g.applied)$('guide-title').textContent=g.applied.kind==='suggestion'?'Vorläufiges Profil geladen · Bestätigung offen':'Profil laut deiner Druckereivorgabe geladen';
    }
    for(const key of ['product','material','instruction','profile_name','process','material_detail'])$('guide-'+key).addEventListener('input',()=>{
      if(isBusy()||working)return;
      const g={...(getGuide()||defaults()),[key]:$('guide-'+key).value,applied:null};if(key==='material')g.material_detail='';$('guide-feedback').textContent='';onChange(g);refresh();
    });
    async function action(fn){if(isBusy()||working)return;working=true;refresh();$('guide-feedback').textContent='Profil wird geprüft …';try{await fn();$('guide-feedback').textContent='Profil geladen. Prüfe jetzt die Bibliothekszugehörigkeit deiner Farben.';}catch(err){$('guide-feedback').textContent=err.message;}finally{working=false;refresh();}}
    $('guide-apply').onclick=()=>action(async()=>{const g=getGuide(),e=evaluate(g,catalog);if(!e.candidate)throw Error('Keine eindeutige Profilvorgabe.');await onApply(e.candidate,e.kind);});
    $('guide-file').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)action(()=>onFile(file));};
    $('guide-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('guide-inquiry').value);$('guide-feedback').textContent='Anfrage kopiert. Du kannst sie an deine Druckerei weitergeben.';}catch{ $('guide-inquiry').focus();$('guide-inquiry').select();$('guide-feedback').textContent='Text markiert. Mit Strg+C bzw. ⌘C kopieren.';}};
    refresh();return {refresh};
  }
  root.ATLAS_PRINT_GUIDE={defaults,validate,material,evaluate,inquiry,summary,mount};
})(typeof window==='undefined'?globalThis:window);
