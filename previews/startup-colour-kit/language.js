(function(root){
  'use strict';
  const KEY='ATLAS_CLARUS_UI_LANGUAGE_V1',allowed=new Set(['de','en']),bindings=new WeakMap(),scopes=new Set();
  const dict=root.ATLAS_UI_EN||{};let locale='de',queued=false;
  let query=null,saved=null;try{query=new URL(root.location.href).searchParams.get('lang');}catch(_){}
  try{saved=root.localStorage.getItem(KEY);}catch(_){}
  locale=allowed.has(query)?query:allowed.has(saved)?saved:'de';
  function text(source,lang=locale){
    if(lang!=='en'||typeof source!=='string')return source;
    const trimmed=source.trim();if(!trimmed)return source;
    const prefix=source.slice(0,source.indexOf(trimmed)),suffix=source.slice(source.indexOf(trimmed)+trimmed.length);
    if(Object.hasOwn(dict,trimmed))return prefix+dict[trimmed]+suffix;
    for(const [pattern,replace]of patterns){const match=trimmed.match(pattern);if(match)return prefix+replace(...match.slice(1))+suffix;}
    return source;
  }
  const patterns=[
    [/^Toleranz: (.+)\.$/,n=>'Tolerance: '+text(n,'en')+'.'],
    [/^Startup Colour Kit · Vorschau (.+)$/,v=>'Startup Colour Kit · Preview '+v],
    [/^ATLAS Clarus · Farbberatung (.+)$/,v=>'ATLAS Clarus · Colour advice '+v],
    [/^Farbname (\d+)$/,n=>'Colour name '+n],
    [/^Farbe (\d+) entfernen$/,n=>'Remove colour '+n],
    [/^Farbe (\d+)$/,n=>'Colour '+n],
    [/^(\d+) zugeordnete Referenz(?: fehlt|en fehlen) in der Zielbibliothek\.$/,n=>n+' assigned reference'+(n==='1'?' is':'s are')+' missing from the target library.'],
    [/^(.+?) · (\d+ zugeordnete Referenz(?: fehlt|en fehlen) in der Zielbibliothek\.)$/, (name,msg)=>name+' · '+text(msg,'en')],
    [/^(.+?) · (\d+) von (\d+) Farben akzeptiert(.*)$/, (name,n,total,tail)=>name+' · '+n+' of '+total+' colours accepted'+(tail.includes('Ersatzfarben')?' · including confirmed replacements':' · original reference addresses present')],
    [/^(.+?) · (\d+) von (\d+) Referenzadressen enthalten\.$/, (name,n,total)=>name+' · '+n+' of '+total+' reference addresses present.'],
    [/^(.*?) Für dieses Profil fehlt eine zugeordnete Bibliotheksliste\.$/,msg=>text(msg,'en')+' This profile has no associated library address list.'],
    [/^B\/A gesperrt: (.*)$/,msg=>'B/A blocked: '+text(msg,'en')],
    [/^Farben nicht akzeptiert: (.*)$/,msg=>'Colours not accepted: '+text(msg,'en')],
    [/^(Bibliotheksprüfung bestanden|Nicht akzeptiert · Entwurf) · (\d+) Farbe\(n\) · (Druckvorschau noch nicht berechnet|B\/A-Vergleich berechnet)(.*)$/, (state,n,preview,tail)=>text(state,'en')+' · '+n+' colour(s) · '+text(preview,'en')+(tail?' · Changes have not yet been saved as a ZIP.':'')],
    [/^Farbe beibehalten · andere Bibliotheken für die gesamte Palette \((\d+)\)$/,n=>'Keep colour · other libraries for the entire palette ('+n+')'],
    [/^Farbe beibehalten · andere Bibliotheken \((\d+)\)$/,n=>'Keep colour · other libraries ('+n+')'],
    [/^· Grenze (.+)$/,n=>'· limit '+n],
    [/^(Geladen|Aktuelles Profil|Profil): ((?!.* · Datei noch nicht verfügbar).+)$/, (label,name)=>(label==='Geladen'?'Loaded':label==='Aktuelles Profil'?'Current profile':'Profile')+': '+name],
    [/^(.+) übernommen\. Material und Einstellungen prüfen; B\/A anschließend neu berechnen\.$/,name=>name+' loaded. Check the material and settings, then recalculate B/A.'],
    [/^(\d+) Profil\(e\) zugeordnet; (\d+) Datei\(en\) passen zu keiner geprüften Version\. Nicht erkannte Druckprofile können weiter über „Ausgabeprofil laden“ verwendet werden\.$/, (n,rejected)=>n+' profile(s) matched; '+rejected+' file(s) do not match a verified version. Unrecognized print profiles can still be used via Load output profile.'],
    [/^(.+?) · (7C-Austauschprofil|Druck-Ausgabeprofil|RGB-Arbeits-\/Referenzprofil · kein Druck-Ausgabeprofil|Textiler RGB-Austauschfarbraum)( · BETA)?$/, (file,role,beta)=>file+' · '+text(role,'en')+(beta||'')],
    [/^Profil: (.+) · Datei noch nicht verfügbar\. Lade sie von der Druckerei oder über die erweiterten Einstellungen\.$/,file=>'Profile: '+file+' · File not available yet. Obtain it from your printer or use the advanced settings.'],
    [/^Berechnet: (.+) · (Relative colorimetric|Absolute colorimetric|Perceptual|Saturation) · Schwarzpunktkompensation (an|aus)\. Source und Referenz unverändert\.$/, (file,intent,bpc)=>'Calculated: '+file+' · '+intent+' · Black point compensation '+(bpc==='an'?'on':'off')+'. Source and reference unchanged.'],
    [/^(.+) · (\d+) × (\d+) Pixel\. Klicke auf eine Farbe\. Ein anderes Bild ersetzt die bisherigen Bildfarben\.$/, (file,w,h)=>file+' · '+w+' × '+h+' pixels. Click a colour. A different image replaces the previous image colours.'],
    [/^(.+) · Originaldatei geprüft\. Gespeicherte Farben wurden nicht neu ausgelesen\.$/,file=>file+' · Original file checked. Stored colours were not resampled.'],
    [/^Neues Original geöffnet; (\d+) Bildfarbe\(n\) des vorherigen Originals entfernt\. Manuelle Farben bleiben erhalten\.$/,n=>'New original opened; '+n+' image colour(s) from the previous original removed. Manual colours are preserved.'],
    [/^(.+) · (\d+) × (\d+) Pixel\. (.*?) Die Originaldatei bleibt unverändert erhalten\. Die Farbauswahl verwendet die vom Browser ausgelesenen sRGB-Werte \(8 Bit\); die tatsächliche Browsertransformation ist nicht verifiziert\.$/, (file,w,h,info)=>file+' · '+w+' × '+h+' pixels. '+text(info,'en')+' The original file is preserved unchanged. Colour selection uses browser-decoded sRGB values (8 bit); the actual browser transformation is not verified.'],
    [/^Eingebettetes ICC: (.+)$/,name=>'Embedded ICC: '+name],
    [/^(.+) ist ungültig\.$/,label=>text(label,'en')+' is invalid.'],
    [/^Ungültige Farbe (\d+)$/,n=>'Invalid colour '+n],
    [/^Prüfsumme stimmt nicht: (.+)$/,name=>'Checksum mismatch: '+name],
    [/^Berechnungsbasis: (.*)$/,label=>'Calculation basis: '+text(label,'en')],
    [/^Rendering Intent: (.+) · Schwarzpunktkompensation: (an|aus)$/, (intent,bpc)=>'Rendering intent: '+intent+' · Black point compensation: '+(bpc==='an'?'on':'off')],
    [/^Ersatzfarbe bestätigt · ΔE00 (.+)$/,n=>'Replacement confirmed · ΔE00 '+n],
    [/^Toleranz: (.+)\. Rechnerischer Vergleich der gespeicherten sRGB-Farben, Lab D65\/2°, kL = kC = kH = 1\. Keine Verwendung der HLC-Ziel-Lab-Werte und kein gemessener Drucknachweis\.$/,n=>'Tolerance: '+text(n,'en')+'. Computed comparison of stored sRGB colours, Lab D65/2°, kL = kC = kH = 1. HLC target Lab values are not used; this is not a measured print proof.'],
    [/^Nächster Kandidat: (.+?) · ΔE00 (.+?) · (innerhalb der Toleranz, noch nicht übernommen|außerhalb oder Toleranz offen)$/, (ref,d,state)=>'Nearest candidate: '+ref+' · ΔE00 '+d+' · '+(state.startsWith('innerhalb')?'within tolerance, not yet accepted':'outside tolerance or tolerance not set')],
    [/^ATLAS Clarus Startup Colour Kit — Vorschau$/,()=>'ATLAS Clarus Startup Colour Kit — Preview']
  ];
  const skip='script,style,textarea,input,code,[data-user-content],[translate="no"]';
  function binding(object,key,current,write,lang){
    let records=bindings.get(object);if(!records){records=new Map();bindings.set(object,records);}
    const previous=records.get(key),source=previous&&current===previous.rendered?previous.source:current,rendered=text(source,lang);
    records.set(key,{source,rendered});if(rendered!==current)write(rendered);
  }
  function apply(scope,lang=locale){
    if(!scope)return;
    const doc=scope.ownerDocument||scope,walker=doc.createTreeWalker(scope,4);
    let node;while((node=walker.nextNode()))if(!node.parentElement?.closest(skip))binding(node,'text',node.nodeValue,v=>{node.nodeValue=v;},lang);
    const elements=[...(scope.nodeType===1?[scope]:[]),...scope.querySelectorAll('[aria-label],[placeholder],[title]')];
    for(const el of elements){if(el.closest('[data-user-content],[translate="no"]'))continue;for(const key of ['aria-label','placeholder','title'])if(el.hasAttribute(key))binding(el,key,el.getAttribute(key),v=>el.setAttribute(key,v),lang);}
  }
  function refresh(){
    observer?.disconnect();for(const scope of scopes){apply(scope);scope.lang=locale;}watch();
  }
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}
  const observer=typeof root.MutationObserver==='function'?new root.MutationObserver(schedule):null;
  function watch(){if(observer)for(const scope of scopes)observer.observe(scope,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});}
  function observe(scope){scopes.add(scope);refresh();return ()=>{scopes.delete(scope);refresh();};}
  function setLanguage(value,{persist=true,notify=true}={}){
    if(!allowed.has(value))throw Error('Unsupported UI language');const changed=value!==locale;locale=value;
    if(persist)try{root.localStorage.setItem(KEY,value);}catch(_){}
    if(root.document){root.document.querySelectorAll('[data-language-switch]').forEach(el=>{el.value=value;});refresh();}
    if(changed&&notify&&root.dispatchEvent)root.dispatchEvent(new CustomEvent('atlas-language-change',{detail:{language:value}}));
  }
  function control(container,id='kit-language'){
    const label=document.createElement('label');label.className='language-switch';label.innerHTML=`<span>Sprache / Language</span><select id="${id}" data-language-switch aria-label="Sprache / Language"><option value="de">Deutsch</option><option value="en">English</option></select>`;
    const select=label.querySelector('select');select.value=locale;select.onchange=()=>setLanguage(select.value);container.append(label);return label;
  }
  function html(markup,lang=locale){
    if(lang!=='en')return markup;
    if(typeof root.DOMParser!=='function')throw Error('Localized HTML rendering requires a browser DOM.');
    const doc=new root.DOMParser().parseFromString(markup,'text/html');apply(doc.documentElement,lang);doc.documentElement.lang=lang;return '<!doctype html>\n'+doc.documentElement.outerHTML;
  }
  function plain(source,lang=locale){return source.split('\n').map(line=>text(line,lang)).join('\n');}
  root.ATLAS_LANGUAGE={KEY,get language(){return locale;},text,plain,html,apply,observe,refresh,setLanguage,control};
})(typeof window==='undefined'?globalThis:window);
