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

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const yes = (v) => String(v) !== '0';
  const MASTER_SHA256 = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
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

  async function init(root) {
    try {
      const [colorDoc, viewDoc] = await Promise.all([
        getJson(root.dataset.colorsUrl),
        getJson(root.dataset.viewsUrl)
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
      Object.entries(views).forEach(([key,view]) => {
        if (!Array.isArray(view.ids) || view.ids.some(id => !byId.has(Number(id)))) throw new Error('Invalid view references: '+key);
      });
      let activeView = views[root.dataset.defaultView] ? root.dataset.defaultView : 'core';
      const perPage = Math.max(24, Math.min(480, parseInt(root.dataset.perPage || '120', 10) || 120));
      let page = 0;
      let query = '';

      root.innerHTML = '';
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
        field.innerHTML = '<label>Search reference, ID or HEX</label>';
        search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'H305_L015_C075, 12345, #2D0080';
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
        const body=sidebar.querySelector('.atlas-clarus-selection-body');
        body.className='atlas-clarus-selection-body';
        body.innerHTML=`<div class="atlas-clarus-selected-swatch" style="background:${esc(c.hex)}"></div>${detailHtml(c,view)}<div class="atlas-clarus-actions"><button type="button" class="atlas-clarus-button acl-copy-ref">Copy reference</button><button type="button" class="atlas-clarus-button acl-copy-hex">Copy HEX</button><button type="button" class="atlas-clarus-button acl-add-palette">Add to palette</button><a class="atlas-clarus-button acl-open-wheel" href="${esc(wheelUrl.href)}" target="_blank" rel="noopener noreferrer">Open in Colour Identity Wheel ↗</a></div><div class="atlas-clarus-copy-status" role="status" aria-live="polite"></div>`;
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
          return c && (
            c.ref.toUpperCase().includes(q) ||
            String(c.id).includes(q) ||
            c.hex.toUpperCase().includes(q)
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
