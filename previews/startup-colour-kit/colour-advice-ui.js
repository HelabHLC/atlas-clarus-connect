(function(root){
  'use strict';
  function mount({container,ctx,getDoc,isBusy,onChange,onLibrary}){
    const D=root.ATLAS_COLOUR_ADVICE,K=root.ATLAS_STARTUP_CORE,esc=K.escape;
    container.className='colour-advice';
    container.innerHTML=`<div class="advice-heading"><p class="eyebrow">DEINE FARBE. DEINE ENTSCHEIDUNG.</p><h3>Eine passende Lösung finden</h3><p>Behalte deine Referenzfarbe mit einer anderen Bibliothek oder wähle bewusst eine nahe Ersatzfarbe.</p></div><label class="advice-tolerance">Deine maximale Farbabweichung · ΔE00<input data-tolerance type="number" min="0" max="100" step="any" inputmode="decimal" placeholder="z. B. 2,0 · bitte selbst festlegen"></label><p class="small">Die Toleranz gilt zur ursprünglichen Source Colour. Bei einer direkten Referenzauswahl ist deren sRGB-Farbe die Vergleichsbasis. Sie ist eine Projektentscheidung; eine Drucktoleranz wird hier nicht bestätigt.</p><p data-feedback role="status"></p><div data-whole></div><div data-rows></div><details><summary>Wie wird die Ähnlichkeit berechnet?</summary><p>Beide sRGB-Farben werden nach CIELAB mit D65 und 2°-Beobachter umgerechnet. Danach folgt ΔE00 mit kL = kC = kH = 1. Die Lab-Zielwerte der HLC-Adresse werden dabei nicht verwendet. Gleiche oder begrenzte sRGB-Darstellungen können unterschiedliche HLC-Adressen verdecken. Dieser Vergleich bewertet die gespeicherten Bildschirmfarben; er ist kein Drucknachweis.</p><p>Die ursprüngliche RGB-only-Adresszuordnung bleibt erhalten. Eine Ersatzadresse wird getrennt dokumentiert. Bei einer Änderung von Bibliothek oder Toleranz muss die Ersatzwahl erneut bestätigt werden.</p></details>`;
    const tolerance=container.querySelector('[data-tolerance]'),feedback=container.querySelector('[data-feedback]');let signature='';
    function problem(err){feedback.textContent=err.message;feedback.className='error';}
    tolerance.onchange=()=>{
      if(isBusy())return;
      const value=tolerance.value===''?null:Number(tolerance.value);
      if(value!==null&&!D.validTolerance(value)){problem(Error('Bitte eine Zahl zwischen 0 und 100 eingeben.'));return;}
      const doc=getDoc();doc.advice={schema:D.SCHEMA,tolerance:value};feedback.textContent='Toleranz aktualisiert. Vorhandene Ersatzentscheidungen werden erneut geprüft.';feedback.className='';onChange();
    };
    function listHTML(items,all=false){
      if(!items.length)return '<p>Keine andere geprüfte Bibliotheksliste mit '+(all?'allen ursprünglichen Referenzadressen':'dieser ursprünglichen Referenzadresse')+' gefunden.</p>';
      return `<ul class="advice-libraries">${items.map(x=>`<li><b data-user-content>${esc(x.name)}</b><span>${esc(x.note)}</span><button type="button" class="secondary" data-library="${esc(x.library_id)}">Bibliothek prüfen</button></li>`).join('')}</ul>`;
    }
    function refresh(){
      const doc=getDoc(),tol=doc.advice?.tolerance??null;
      if(document.activeElement!==tolerance)tolerance.value=tol===null?'':String(tol);
      tolerance.disabled=isBusy();
      const key=JSON.stringify([doc.colours,doc.print.library_id,tol]);
      if(signature!==key){
        signature=key;const alternatives=D.alternatives(doc,ctx),set=D.members(ctx,doc.print.library_id),rejected=doc.colours.map((c,i)=>({c,i})).filter(({c})=>!set||!set.has(c.reference_id));
        const whole=container.querySelector('[data-whole]');
        whole.innerHTML=doc.colours.length&&rejected.length?`<details class="advice-whole"><summary>Farbe beibehalten · andere Bibliotheken für die gesamte Palette (${alternatives.whole_palette.length})</summary>${listHTML(alternatives.whole_palette,true)}</details>`:'';
        const rows=container.querySelector('[data-rows]');rows.innerHTML='';
        if(!doc.colours.length){rows.innerHTML='<p>Wähle zuerst eine Kundenfarbe.</p>';}
        else if(!set){rows.innerHTML='<p>Für Ersatzfarben zuerst eine Zielbibliothek mit verfügbarer Adressliste wählen. Eine Beta-Liste kann keine fehlende finale Liste ersetzen.</p>';}
        else if(!rejected.length){rows.innerHTML='<p>Alle ursprünglichen Referenzadressen sind enthalten. Eine Ersatzfarbe ist nicht erforderlich.</p>';}
        else for(const {c,i}of rejected){
          const original=ctx.colors.find(x=>x.id===c.reference_id),best=D.nearest(c,ctx,doc.print.library_id),candidate=best&&ctx.colors.find(x=>x.id===best.reference_id),active=D.active(c,doc,ctx),within=D.validTolerance(tol)&&best&&best.delta_e00<=tol;
          const box=document.createElement('article');box.className='advice-card';box.dataset.adviceRow=String(i);
          box.innerHTML=`<h4 data-user-content>${esc(c.label)}</h4><p>Ursprüngliche Zuordnung: <b>${esc(original.ref)}</b> · in dieser Bibliothek nicht enthalten.</p>${candidate?`<div class="advice-pair"><div><div class="advice-swatch" style="background:${K.hex(c.source_rgb)}"></div><b>B · ${c.kind==='atlas_reference'?'Referenz als Ausgangsfarbe':'Originale Source Colour'}</b><code>${K.hex(c.source_rgb)}</code></div><div><div class="advice-swatch" style="background:${candidate.hex}"></div><b>A · ${active?'Bestätigte Ersatzfarbe':'Nächste Bibliotheksfarbe'}</b><code>${esc(candidate.ref)}</code><code>${candidate.hex}</code></div></div><p class="advice-distance" title="${best.delta_e00}">Abweichung zur Ausgangsfarbe: <b>ΔE00 ${best.delta_e00.toFixed(5)}</b>${tol===null?' · Toleranz noch offen':` · Grenze ${tol}`}</p><p class="advice-result" data-within="${within}">${active?'Ersatzfarbe bewusst übernommen. Originalfarbe und ursprüngliche Referenz bleiben gespeichert.':tol===null?'Lege eine Toleranz fest, um diesen Vorschlag zu prüfen.':within?'Innerhalb deiner Toleranz. Du kannst diese Ersatzfarbe übernehmen.':'Keine Ersatzfarbe innerhalb deiner Toleranz gefunden. Der angezeigte nächste Kandidat liegt außerhalb.'}</p>${c.replacement&&!active?'<p>Die frühere Ersatzwahl ist für die aktuelle Bibliothek oder Toleranz nicht aktiv.</p>':''}<div class="advice-actions"><button type="button" data-confirm="${i}" ${!within||active?'disabled':''}>${active?'Ersatzfarbe übernommen':'Ersatzfarbe übernehmen'}</button>${c.replacement?`<button type="button" class="quiet" data-undo="${i}">Ersatzwahl zurücknehmen</button>`:''}</div>`:'<p>Keine verwendbare Ersatzfarbe gefunden.</p>'}<details><summary>Farbe beibehalten · andere Bibliotheken (${alternatives.per_colour[i].length})</summary>${listHTML(alternatives.per_colour[i])}</details>`;
          rows.append(box);
        }
      }
      container.querySelectorAll('[data-library],[data-undo]').forEach(b=>b.disabled=isBusy());
      container.querySelectorAll('[data-confirm]').forEach(b=>{const c=doc.colours[Number(b.dataset.confirm)],best=D.nearest(c,ctx,doc.print.library_id);b.disabled=isBusy()||!D.validTolerance(tol)||!best||best.delta_e00>tol||Boolean(D.active(c,doc,ctx));});
    }
    container.onclick=async e=>{
      const button=e.target.closest('button');if(!button||button.disabled||isBusy())return;
      try{
        const doc=getDoc();
        if(button.dataset.confirm!==undefined){const c=doc.colours[Number(button.dataset.confirm)];c.replacement=D.decision(c,ctx,doc.print.library_id,doc.advice?.tolerance);doc.print.basis='accepted';feedback.textContent='Ersatzfarbe übernommen. Die Druckvorschau verwendet jetzt die bestätigte Auswahl. Bitte B/A neu berechnen.';feedback.className='';onChange();}
        else if(button.dataset.undo!==undefined){delete doc.colours[Number(button.dataset.undo)].replacement;feedback.textContent='Ersatzwahl zurückgenommen. Die ursprüngliche Zuordnung bleibt bestehen.';onChange();}
        else if(button.dataset.library){await onLibrary(button.dataset.library);feedback.textContent='Bibliothek gewählt. Prüfe jetzt das zugehörige Ausgabeprofil, Druckverfahren und Material.';feedback.className='';}
      }catch(err){problem(err);}
    };
    refresh();return {refresh};
  }
  root.ATLAS_COLOUR_ADVICE_UI={mount};
})(typeof window==='undefined'?globalThis:window);
