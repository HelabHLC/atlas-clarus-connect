(function(){
  'use strict';

  const cache = {};
  const getJson = (url) => {
    if (!cache[url]) {
      cache[url] = fetch(url, {credentials:'same-origin'}).then(r => {
        if (!r.ok) throw new Error('HTTP '+r.status+' for '+url);
        return r.json();
      });
    }
    return cache[url];
  };
  const getGzipJson = async (url) => {
    if (!('DecompressionStream' in window)) throw new Error('This browser cannot open the compressed Name Search Index.');
    const response = await fetch(url, {credentials:'same-origin'});
    if (!response.ok) throw new Error('HTTP '+response.status+' for '+url);
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const yes = (v) => String(v) !== '0';
  const MASTER_SHA256 = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const BASIS23_VERSION = 'ATLAS_COMBINED_BASIS23_v0_8';
  const debounce = (fn, delay=140) => { let timer; return (...args) => { clearTimeout(timer); timer=setTimeout(()=>fn(...args),delay); }; };

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const area=document.createElement('textarea');
    area.value=value; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0';
    document.body.appendChild(area); area.select();
    const ok=document.execCommand('copy'); area.remove();
    if (!ok) throw new Error('Copy command failed');
  }

  function detailHtml(c, view) {
    return `
      <div class="acl-title">${esc(c.ref)}</div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">atlas_row_id</span><span>${c.id}</span></div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">RGB</span><span>${c.rgb.join(', ')}</span></div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">HEX</span><span>${esc(c.hex)}</span></div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">Lab</span><span>${c.lab.map(n=>Number(n).toFixed(2)).join(', ')}</span></div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">View</span><span>${esc(view.name)}</span></div>
      <div class="atlas-clarus-detail-row"><span class="atlas-clarus-detail-key">Status</span><span>${esc(view.status)}</span></div>
    `;
  }

  function recipeHtml(recipe) {
    const within = recipe.computational_tolerance_status === 'WITHIN_COMPUTATIONAL_TOLERANCE';
    const components = recipe.components.map(component => `
      <li><strong>${Number(component.percent).toFixed(2)}%</strong> ${esc(component.name)}
        <a href="${esc(component.source_url)}" target="_blank" rel="noopener noreferrer">source ↗</a>
      </li>`).join('');
    return `
      <div class="atlas-clarus-recipe-head">
        <h3>Basis-23 computational recipe</h3>
        <span class="atlas-clarus-recipe-badge ${within ? 'is-within' : 'is-outside'}">${within ? 'ΔE00 ≤ 5' : 'ΔE00 > 5'}</span>
      </div>
      <p class="atlas-clarus-recipe-score">Best found: <strong>ΔE00 ${Number(recipe.de00).toFixed(2)}</strong> · ${recipe.component_count} components</p>
      <ol class="atlas-clarus-recipe-components">${components}</ol>
      <button type="button" class="atlas-clarus-button acl-download-recipe-pdf">Download recipe PDF</button>
      <p class="atlas-clarus-boundary">Computational demo proxy only. Best-found heuristic, not a proof of global optimum. Physical mixing has not been validated; measured QC: NOT_MEASURED; no production approval or identity-equivalence claim.</p>
    `;
  }

  function acmsSpotHtml(entry, view, targetHex) {
    const viewCode = view === 'solid_c' ? 'ACMS-C-' : 'ACMS-U-';
    const candidates = entry.candidates.filter(r => Number.isFinite(Number(r.de00_model)) &&
      (r.manufacturer_basis.startsWith('CHSOS_') || Number(r.de00_model) <= 5));
    return `<div class="atlas-clarus-recipe-head"><h3>${esc(viewCode + entry.reference)} · Spot colour mixing recipes</h3></div>
      <p class="atlas-clarus-recipe-score">Named source colours, ingredients and starting proportions are listed for each available source basis.</p>
      <p class="atlas-clarus-boundary">Shared ATLAS target ${esc(entry.reference)}. ${view === 'solid_c' ? 'Coated' : 'Uncoated'} view membership is provisional; no paper-specific measurement has been made.</p>
      ${candidates.map(r => `<div class="atlas-clarus-spot-candidate">
        <p class="atlas-clarus-recipe-score"><strong>${esc(r.manufacturer_basis.startsWith('CHSOS_') ? 'CHSOS pigment-sample research basis' : r.manufacturer_basis)}</strong> · model ΔE00 ${Number(r.de00_model).toFixed(2)} · ${Number(r.de00_model) <= 5 ? 'within computational tolerance' : 'outside computational tolerance'}</p>
        ${/^#[0-9A-F]{6}$/i.test(r.model_preview_hex || '') ? `<div class="atlas-clarus-ba" role="group" aria-label="ATLAS target and computational mix preview">
          <div class="atlas-clarus-ba-item"><span class="atlas-clarus-ba-swatch" style="background:${esc(targetHex)}"></span><span>A · ATLAS target<br><code>${esc(targetHex)}</code></span></div>
          <div class="atlas-clarus-ba-item"><span class="atlas-clarus-ba-swatch" style="background:${esc(r.model_preview_hex)}"></span><span>B · model mix<br><code>${esc(r.model_preview_hex)}</code>${r.model_preview_gamut_clipped ? '<br>RGB gamut clipped' : ''}</span></div>
        </div>` : ''}
        <ol class="atlas-clarus-recipe-components">${r.components.map(p => `<li><strong>${Number(p.fraction === undefined ? p.percent : 100 * p.fraction).toFixed(2)}%</strong> ${esc(p.name)}</li>`).join('')}</ol>
      </div>`).join('')}
      <p class="atlas-clarus-boundary">A/B swatches are screen previews: ATLAS reference HEX versus opaque-limit K/S model under D50, adapted to sRGB. The target HEX and model use different rendering paths. Screen appearance does not predict the dried paint or paper response. Source-colour names come from pinned spectral datasets; check product identity and availability before mixing. Named manufacturer recipes use colours from one manufacturer; Golden Heavy Body and OPEN may appear together. CHSOS is a pigment-sample research basis, not a single paint manufacturer. Model ratios are starting values, not validated dispense masses. Measured recipe QC: NOT_MEASURED; opacity and substrate response not verified.</p>`;
  }

  const pdfAscii=value=>String(value).normalize('NFKD').replace(/[^\x20-\x7E]/g,'?');
  const pdfEsc=value=>pdfAscii(value).replace(/([\\()])/g,'\\$1');
  function downloadRecipePdf(c,recipe){
    const commands=[],annotations=[];
    const text=(value,x,y,size=10,strong=false)=>commands.push(`BT /F1 ${strong?size+1:size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEsc(value)}) Tj ET`);
    const link=(label,url,x,y)=>{text(`${label}: ${url}`,x,y,8);annotations.push({url,x1:x,y1:y-2,x2:535,y2:y+10});};
    commands.push(`${(c.rgb[0]/255).toFixed(4)} ${(c.rgb[1]/255).toFixed(4)} ${(c.rgb[2]/255).toFixed(4)} rg 60 665 475 72 re f 0 0 0 rg`);
    text('ATLAS CLARUS - COMPUTATIONAL RECIPE',60,792,15,true);text(c.ref,60,768,17,true);
    text(`atlas_row_id ${c.id}`,60,748);text(`ATLAS target RGB ${c.rgb.join(' / ')}   HEX ${c.hex}`,60,730);
    text(`Lab ${c.lab.map(n=>Number(n).toFixed(2)).join(' / ')}`,60,714);text(`Basis ${recipe.basis_version}   Delta E00 ${Number(recipe.de00).toFixed(3)}`,60,690);
    text(recipe.computational_tolerance_status,60,648,10,true);let y=620;
    recipe.components.forEach((component,index)=>{text(`${index+1}. ${component.name} - ${Number(component.percent).toFixed(3)}%`,60,y,11,true);y-=15;link('Spectral source',component.source_url,72,y);y-=15;text('Safety information/SDS: No verified product-specific SDS available',72,y,8);y-=24;});
    text('COMPUTATIONAL RECIPE - NOT PHYSICALLY VALIDATED - NOT_MEASURED',60,y-2,9,true);text('No production approval or claim of physical colour equality.',60,y-18,9);
    let attributionY=y-34;
    if(recipe.components.some(component=>component.source_family==='CHSOS')){text('CHSOS source data used with permission and attribution. Derived results by ATLAS Clarus.',60,attributionY,8);attributionY-=14;text('CHSOS has not reviewed or validated the derived mixtures.',60,attributionY,8);attributionY-=14;}
    if(recipe.components.some(component=>component.source_family==='KIMERA_PAINTMIXING')){text('PaintMixing / Kimera source dataset: CC BY 4.0 per source README.',60,attributionY,8);}
    text(`Master SHA-256 ${MASTER_SHA256}`,60,48,7);
    const stream=commands.join('\n'),objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';objects[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';const refs=annotations.map((_,i)=>`${6+i} 0 R`).join(' ');
    objects[3]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R /Annots [${refs}] >>`;objects[4]=`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`;objects[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    annotations.forEach((a,i)=>{objects[6+i]=`<< /Type /Annot /Subtype /Link /Rect [${a.x1} ${a.y1} ${a.x2} ${a.y2}] /Border [0 0 0] /A << /S /URI /URI (${pdfEsc(a.url)}) >> >>`;});let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=new TextEncoder().encode(pdf).length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
    const xref=new TextEncoder().encode(pdf).length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const url=URL.createObjectURL(new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`ATLAS_Clarus_${c.ref}_Recipe.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  async function init(root) {
    try {
      const [colorDoc, viewDoc, nameDoc] = await Promise.all([
        getJson(root.dataset.colorsUrl),
        getJson(root.dataset.viewsUrl),
        getGzipJson(root.dataset.nameIndexUrl)
      ]);
      const colors = colorDoc.colors || [];
      const views = viewDoc.views || {};
      if (colorDoc.master_sha256 !== MASTER_SHA256 || viewDoc.master_sha256 !== MASTER_SHA256) {
        throw new Error('Dataset master SHA-256 metadata mismatch');
      }
      if (Number(colorDoc.entry_count) !== 13283 || colors.length !== 13283 || !views.core || views.core.ids.length !== 13283) {
        throw new Error('Dataset entry-count validation failed');
      }
      const byId = new Map(colors.map(c => [Number(c.id), c]));
      if (byId.size !== colors.length) throw new Error('Duplicate atlas_row_id detected');
      if (nameDoc.schema !== 'ATLAS_CLARUS_NAME_SEARCH_INDEX' || nameDoc.master_sha256 !== MASTER_SHA256 ||
          Number(nameDoc.entry_count) !== 13283 || !Array.isArray(nameDoc.records) || nameDoc.records.length !== 13283) {
        throw new Error('Name Search Index validation failed');
      }
      const namesById = new Map(nameDoc.records.map(n => [Number(n.i), n]));
      if (namesById.size !== colors.length || colors.some(c => namesById.get(Number(c.id))?.r !== c.ref)) {
        throw new Error('Name Search Index identity binding failed');
      }
      Object.entries(views).forEach(([key,view]) => {
        if (!Array.isArray(view.ids) || view.ids.some(id => !byId.has(Number(id)))) throw new Error('Invalid view references: '+key);
      });
      let pickerHandoff = null;
      let pickerHandoffError = '';
      const incoming = new URLSearchParams(location.search);
      if (incoming.get('source') === 'pkl-image-picker') {
        try {
          const rawId=incoming.get('atlas_row_id') || '',ref=incoming.get('hlc') || '',sha=incoming.get('master_sha256') || '';
          if (!/^\d+$/.test(rawId)) throw new Error('atlas_row_id is not a strict integer');
          const color=byId.get(Number(rawId));
          if (!color || color.ref !== ref || sha !== MASTER_SHA256) throw new Error('PKL identity or master mismatch');
          const rawReturn=incoming.get('return_url') || '';
          if (!rawReturn) throw new Error('return URL is missing');
          const returnUrl=new URL(rawReturn, location.href);
          if (returnUrl.origin !== location.origin || !/^https?:$/.test(returnUrl.protocol)) throw new Error('return URL is not same-origin');
          pickerHandoff={color,returnUrl};
        } catch (e) { pickerHandoffError=e.message; }
      }
      let activeView = views[root.dataset.defaultView] ? root.dataset.defaultView : 'core';
      const perPage = Math.max(24, Math.min(480, parseInt(root.dataset.perPage || '120', 10) || 120));
      let page = 0;
      let query = '';
      let selectionRequest = 0;
      if (pickerHandoff) { activeView='core'; query=pickerHandoff.color.ref; }

      const getRecipe = async (c) => {
        const shard = Math.floor(Number(c.id) / 256).toString().padStart(3, '0');
        const recipes = await getJson(root.dataset.basis23Url + shard + '.json');
        const recipe = recipes[Number(c.id) % 256];
        if (!recipe || Number(recipe.source_atlas_row_id) !== Number(c.id) || recipe.reference !== c.ref ||
            recipe.basis_version !== BASIS23_VERSION || root.dataset.basis23Version !== BASIS23_VERSION) {
          throw new Error('Basis-23 recipe binding mismatch for atlas_row_id '+c.id);
        }
        return recipe;
      };

      let acmsIndexPromise;
      const getAcmsRecipe = async c => {
        if (!acmsIndexPromise) acmsIndexPromise = getJson(root.dataset.acmsRecipesUrl).then(doc => {
          if (doc.registry?.master_sha256 !== MASTER_SHA256 || doc.registry?.schema !== 'ACMS_SPOT_CANDIDATES_RESEARCH_V1' || doc.registry?.preview_model !== 'K_S_OPAQUE_LIMIT_CIE1931_2DEG_D50_BRADFORD_SRGB' || doc.rows?.length !== 3653) {
            throw new Error('ACMS recipe registry mismatch');
          }
          const index = new Map(doc.rows.map(row => [Number(row.atlas_row_id), row]));
          if (index.size !== 3653) throw new Error('Duplicate ACMS recipe identity');
          return index;
        });
        const entry = (await acmsIndexPromise).get(Number(c.id));
        if (!entry || entry.reference !== c.ref || entry.acms_id !== 'ACMS-'+c.ref) throw new Error('ACMS recipe binding mismatch');
        return entry;
      };

      root.innerHTML = '';
      if (pickerHandoff || pickerHandoffError) {
        const notice=document.createElement('div');
        notice.className='atlas-clarus-handoff-notice'+(pickerHandoffError?' is-error':'');
        notice.textContent=pickerHandoffError ? `Image Picker handoff blocked: ${pickerHandoffError}.` : `Image Picker identity verified: ${pickerHandoff.color.ref} · atlas_row_id ${pickerHandoff.color.id}`;
        root.appendChild(notice);
      }
      const toolbar = document.createElement('div');
      toolbar.className = 'atlas-clarus-toolbar';

      let select = null;
      if (yes(root.dataset.showLibrarySelector)) {
        const field = document.createElement('div');
        field.className = 'atlas-clarus-field';
        field.innerHTML = '<label>Library / View</label>';
        select = document.createElement('select');
        Object.entries(views).forEach(([key,v]) => {
          const o = document.createElement('option');
          o.value = key; o.textContent = v.name;
          if (key === activeView) o.selected = true;
          select.appendChild(o);
        });
        field.appendChild(select);
        toolbar.appendChild(field);
      }

      let search = null;
      if (yes(root.dataset.showSearch)) {
        const field = document.createElement('div');
        field.className = 'atlas-clarus-field';
        field.innerHTML = '<label>Search by colour name, HLC reference, ID or HEX</label>';
        search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Purple, H305_L015_C075, 12345, #2D0080';
        if (query) search.value = query;
        field.appendChild(search);
        toolbar.appendChild(field);
      }

      const displayField = document.createElement('div');
      displayField.className = 'atlas-clarus-field atlas-clarus-display-field';
      displayField.innerHTML = '<label>Display</label><div class="atlas-clarus-segmented"><button type="button" class="atlas-clarus-button acl-view-cards" aria-pressed="true">Cards</button><button type="button" class="atlas-clarus-button acl-view-book" aria-pressed="false">Compact book</button></div>';
      toolbar.appendChild(displayField);

      if (toolbar.childNodes.length) root.appendChild(toolbar);

      const status = document.createElement('div');
      status.className = 'atlas-clarus-status';
      status.setAttribute('aria-live','polite');
      if (yes(root.dataset.showStatus)) root.appendChild(status);

      const layout = document.createElement('div');
      layout.className = 'atlas-clarus-workspace';
      const browser = document.createElement('div');
      browser.className = 'atlas-clarus-browser';
      const grid = document.createElement('div');
      grid.className = 'atlas-clarus-grid';
      browser.appendChild(grid);

      const pager = document.createElement('div');
      pager.className = 'atlas-clarus-pager';
      pager.setAttribute('aria-label','Library pagination');
      const prev = document.createElement('button');
      const next = document.createElement('button');
      const info = document.createElement('span');
      prev.type = next.type = 'button';
      prev.className = next.className = 'atlas-clarus-button';
      info.className = 'atlas-clarus-pager-info';
      prev.textContent = '← Previous';
      next.textContent = 'Next →';
      pager.append(prev,next,info);
      browser.appendChild(pager);

      const sidebar = document.createElement('aside');
      sidebar.className = 'atlas-clarus-sidebar';
      sidebar.setAttribute('aria-label','Selected ATLAS colour and palette');
      sidebar.innerHTML = '<section class="atlas-clarus-side-panel atlas-clarus-selection"><h2>ATLAS colour data</h2><div class="atlas-clarus-selection-body atlas-clarus-side-empty">Select a colour to inspect its exact ATLAS identity.</div></section><section class="atlas-clarus-side-panel"><h2>Nearby ATLAS references</h2><p class="atlas-clarus-boundary">Descriptive Lab neighbourhood only — not equivalence or production advice.</p><div class="atlas-clarus-neighbours atlas-clarus-side-empty">No colour selected.</div></section><section class="atlas-clarus-side-panel"><h2>My local palette</h2><div class="atlas-clarus-palette atlas-clarus-side-empty">No colours added.</div><button type="button" class="atlas-clarus-button acl-clear-palette">Clear palette</button></section>';
      layout.append(browser,sidebar);
      root.appendChild(layout);

      const tip = document.createElement('div');
      tip.className = 'atlas-clarus-tooltip';
      tip.setAttribute('role','tooltip');
      document.body.appendChild(tip);

      const paletteKey = 'atlasClarusLocalPaletteV1';
      let palette = [];
      try { palette = JSON.parse(localStorage.getItem(paletteKey) || '[]').filter(id=>byId.has(Number(id))).slice(0,24); } catch (_) { palette=[]; }

      const savePalette = () => { try { localStorage.setItem(paletteKey, JSON.stringify(palette)); } catch (_) {} };
      const renderPalette = () => {
        const box=sidebar.querySelector('.atlas-clarus-palette');
        if (!palette.length) { box.className='atlas-clarus-palette atlas-clarus-side-empty'; box.textContent='No colours added.'; return; }
        box.className='atlas-clarus-palette'; box.replaceChildren();
        palette.forEach(id=>{ const c=byId.get(Number(id)); if(!c)return; const row=document.createElement('button'); row.type='button'; row.className='atlas-clarus-mini-row'; row.innerHTML=`<span class="atlas-clarus-mini-chip" style="background:${esc(c.hex)}"></span><span><strong>${esc(c.ref)}</strong><small>${esc(c.hex)} · ID ${c.id}</small></span><span aria-hidden="true">×</span>`; row.setAttribute('aria-label',`Remove ${c.ref} from palette`); row.addEventListener('click',()=>{palette=palette.filter(x=>Number(x)!==Number(c.id));savePalette();renderPalette();}); box.appendChild(row); });
      };

      const nearest = (c, count=6) => colors.filter(x=>x.id!==c.id).map(x=>({c:x,d:(x.lab[0]-c.lab[0])**2+(x.lab[1]-c.lab[1])**2+(x.lab[2]-c.lab[2])**2})).sort((a,b)=>a.d-b.d||a.c.id-b.c.id).slice(0,count).map(x=>x.c);
      const showSelection = (c, view) => {
        const wheelUrl = new URL(root.dataset.wheelUrl);
        wheelUrl.searchParams.set('atlas_row_id', String(c.id));
        wheelUrl.searchParams.set('hlc', c.ref);
        wheelUrl.searchParams.set('master_sha256', MASTER_SHA256);
        wheelUrl.searchParams.set('source', 'hover-library');
        wheelUrl.searchParams.set('return_url', location.href);
        let pickerReturnHtml='';
        if (pickerHandoff) {
          const back=new URL(pickerHandoff.returnUrl.href);
          back.searchParams.set('source','hover-library-return');
          back.searchParams.set('atlas_row_id',String(pickerHandoff.color.id));
          back.searchParams.set('hlc',pickerHandoff.color.ref);
          back.searchParams.set('master_sha256',MASTER_SHA256);
          pickerReturnHtml=`<a class="atlas-clarus-button acl-return-picker" href="${esc(back.href)}">← Zurück zum Image Picker</a>`;
        }
        const body=sidebar.querySelector('.atlas-clarus-selection-body');
        body.className='atlas-clarus-selection-body';
        const solidView = view === views.solid_c ? 'solid_c' : view === views.solid_u ? 'solid_u' : null;
        body.innerHTML=`<div class="atlas-clarus-selected-swatch" style="background:${esc(c.hex)}"></div>${detailHtml(c,view)}<div class="atlas-clarus-actions">${pickerReturnHtml}<button type="button" class="atlas-clarus-button acl-copy-ref">Copy reference</button><button type="button" class="atlas-clarus-button acl-copy-hex">Copy HEX</button><button type="button" class="atlas-clarus-button acl-add-palette">Add to palette</button><a class="atlas-clarus-button acl-open-wheel" href="${esc(wheelUrl.href)}" target="_blank" rel="noopener noreferrer">Open in Colour Identity Wheel ↗</a></div><div class="atlas-clarus-copy-status" role="status" aria-live="polite"></div><section class="atlas-clarus-recipe" aria-live="polite"><p class="atlas-clarus-recipe-loading">Loading ${solidView ? 'ACMS spot colour candidates' : 'Basis-23 recipe'}…</p></section>`;
        const recipeBox=body.querySelector('.atlas-clarus-recipe');
        const request=++selectionRequest;
        (solidView ? getAcmsRecipe(c) : getRecipe(c)).then(recipe=>{if(request===selectionRequest){recipeBox.innerHTML=solidView ? acmsSpotHtml(recipe,solidView,c.hex) : recipeHtml(recipe);if(!solidView)recipeBox.querySelector('.acl-download-recipe-pdf').addEventListener('click',()=>downloadRecipePdf(c,recipe));}}).catch(err=>{if(request===selectionRequest)recipeBox.innerHTML='<p class="atlas-clarus-boundary">Recipe unavailable or failed its identity check.</p>';console.error('ATLAS Clarus recipe:',err);});
        const report=m=>{body.querySelector('.atlas-clarus-copy-status').textContent=m;};
        body.querySelector('.acl-copy-ref').addEventListener('click',()=>copyText(c.ref).then(()=>report('Reference copied.')).catch(()=>report('Copy failed.')));
        body.querySelector('.acl-copy-hex').addEventListener('click',()=>copyText(c.hex).then(()=>report('HEX copied.')).catch(()=>report('Copy failed.')));
        body.querySelector('.acl-add-palette').addEventListener('click',()=>{if(!palette.some(id=>Number(id)===Number(c.id)))palette.push(c.id);palette=palette.slice(-24);savePalette();renderPalette();report('Added to local palette.');});
        const nbox=sidebar.querySelector('.atlas-clarus-neighbours'); nbox.className='atlas-clarus-neighbours'; nbox.replaceChildren();
        nearest(c).forEach(n=>{const b=document.createElement('button');b.type='button';b.className='atlas-clarus-mini-row';b.innerHTML=`<span class="atlas-clarus-mini-chip" style="background:${esc(n.hex)}"></span><span><strong>${esc(n.ref)}</strong><small>${esc(n.hex)} · ID ${n.id}</small></span>`;b.addEventListener('click',()=>showSelection(n,views.core));nbox.appendChild(b);});
      };
      renderPalette();
      sidebar.querySelector('.acl-clear-palette').addEventListener('click',()=>{palette=[];savePalette();renderPalette();});
      const cardsButton=displayField.querySelector('.acl-view-cards'); const bookButton=displayField.querySelector('.acl-view-book');
      const setDisplay=compact=>{root.classList.toggle('atlas-clarus-compact',compact);cardsButton.setAttribute('aria-pressed',String(!compact));bookButton.setAttribute('aria-pressed',String(compact));};
      cardsButton.addEventListener('click',()=>setDisplay(false)); bookButton.addEventListener('click',()=>setDisplay(true));

      const filteredIds = () => {
        const v = views[activeView] || views.core;
        const q = query.trim().toUpperCase();
        if (!q) return v.ids;
        return v.ids.filter(id => {
          const c = byId.get(Number(id));
          const n = namesById.get(Number(id));
          const nameText = n ? [n.d,n.s,n.f,...(n.t||[])].join(' ').toUpperCase() : '';
          return c && (
            c.ref.toUpperCase().includes(q) ||
            String(c.id).includes(q) ||
            c.hex.toUpperCase().includes(q) ||
            nameText.includes(q)
          );
        });
      };

      const placeTip = (card) => {
        const gap = 12;
        const pad = 12;
        const r = card.getBoundingClientRect();

        // Measure after display:block.
        const w = tip.offsetWidth || 286;
        const h = tip.offsetHeight || 180;

        let x = r.right + gap;
        if (x + w > window.innerWidth - pad) {
          x = r.left - w - gap;
        }
        if (x < pad) {
          x = Math.max(pad, Math.min(window.innerWidth - w - pad, r.left));
        }

        let y = r.top + (r.height - h) / 2;
        y = Math.max(pad, Math.min(window.innerHeight - h - pad, y));

        tip.style.left = Math.round(x) + 'px';
        tip.style.top = Math.round(y) + 'px';
      };

      const repositionVisibleTip = () => {
        if (tip.style.display !== 'block') return;
        const active = root.querySelector('.atlas-clarus-card.atlas-clarus-hovered');
        if (active) placeTip(active);
      };
      window.addEventListener('resize', repositionVisibleTip, {passive:true});
      window.addEventListener('scroll', repositionVisibleTip, {passive:true});

      const render = () => {
        const view = views[activeView] || views.core;
        const ids = filteredIds();
        const pages = Math.max(1, Math.ceil(ids.length / perPage));
        page = Math.max(0, Math.min(page, pages - 1));
        const idsPage = ids.slice(page*perPage, (page+1)*perPage);
        const frag = document.createDocumentFragment();

        idsPage.forEach(id => {
          const c = byId.get(Number(id));
          if (!c) return;
          const card = document.createElement('button');
          card.className = 'atlas-clarus-card';
          card.type = 'button';
          card.setAttribute('aria-label', `${c.ref}, atlas row ${c.id}, ${c.hex}`);
          card.dataset.atlasId = c.id;
          card.dataset.ref = c.ref;
          card.dataset.rgb = c.rgb.join(',');
          card.dataset.hex = c.hex;

          const chip = document.createElement('div');
          chip.className = 'atlas-clarus-chip';
          chip.dataset.atlasId = c.id;
          chip.dataset.rgb = c.rgb.join(',');
          chip.style.backgroundColor = `rgb(${c.rgb[0]}, ${c.rgb[1]}, ${c.rgb[2]})`;

          const ref = document.createElement('div');
          ref.className = 'atlas-clarus-ref';
          ref.textContent = c.ref;

          const idline = document.createElement('div');
          idline.className = 'atlas-clarus-id';
          idline.textContent = `ID ${c.id} · ${c.hex}`;

          card.append(chip,ref,idline);
          card.addEventListener('mouseenter', () => {
            card.classList.add('atlas-clarus-hovered');
            tip.innerHTML = detailHtml(c,view);
            tip.style.display = 'block';
            requestAnimationFrame(() => placeTip(card));
          });
          card.addEventListener('mouseleave', () => {
            card.classList.remove('atlas-clarus-hovered');
            tip.style.display='none';
          });
          card.addEventListener('focus', () => {
            card.classList.add('atlas-clarus-hovered');
            tip.innerHTML = detailHtml(c,view);
            tip.style.display='block';
            requestAnimationFrame(() => placeTip(card));
          });
          card.addEventListener('blur', () => {
            card.classList.remove('atlas-clarus-hovered');
            tip.style.display='none';
          });
          card.addEventListener('click', () => {
            showSelection(c,view);
          });
          frag.appendChild(card);
        });

        grid.replaceChildren(frag);
        if (!idsPage.length) {
          const empty = document.createElement('div');
          empty.className='atlas-clarus-empty';
          empty.textContent='No matching ATLAS references.';
          grid.appendChild(empty);
        }
        info.textContent = `Page ${page+1} / ${pages} · ${ids.length.toLocaleString()} matches`;
        prev.disabled = page <= 0;
        next.disabled = page >= pages - 1;

        if (yes(root.dataset.showStatus)) {
          status.innerHTML = `<span><strong>${esc(view.name)}</strong></span>
            <span>${esc(view.note)}</span>
            <span>source observations <strong>${Number(view.source_n).toLocaleString()}</strong></span>
            <span>master <strong>${esc(colorDoc.master_sha256.slice(0,12))}…</strong></span>`;
        }
      };

      if (select) select.addEventListener('change',()=>{activeView=select.value;page=0;render();});
      if (search) search.addEventListener('input',debounce(()=>{query=search.value;page=0;render();}));
      prev.addEventListener('click',()=>{if(page>0){page--;render();}});
      next.addEventListener('click',()=>{const n=Math.ceil(filteredIds().length/perPage);if(page<n-1){page++;render();}});
      render();
      if (pickerHandoff) showSelection(pickerHandoff.color,views.core);
    } catch (err) {
      root.innerHTML = '<div class="atlas-clarus-error" role="alert">ATLAS Clarus library could not be loaded or did not pass its integrity checks.</div>';
      console.error('ATLAS Clarus Hover Library:', err);
    }
  }

  function boot() {
    document.querySelectorAll('.atlas-clarus-library').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
