(function(root){
  'use strict';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const METHOD='K_S_OPAQUE_LIMIT_CIE1931_2DEG_D50_BRADFORD_SRGB';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hex=s=>typeof s==='string'&&/^#[0-9A-F]{6}$/.test(s);
  function create(data,colors,master,views){
    if(master!==MASTER||data?.registry?.master_sha256!==MASTER||data.registry.schema!=='ACMS_SPOT_CANDIDATES_RESEARCH_V1'||data.registry.preview_model!==METHOD||data.rows?.length!==3653||colors.length!==13283)throw Error('ACMS source identity mismatch');
    const coated=new Set(views?.solid_c?.ids||[]),uncoated=new Set(views?.solid_u?.ids||[]);
    if(coated.size!==2137||uncoated.size!==1963)throw Error('ACMS view source mismatch');
    const byId=new Map();
    for(const r of data.rows){
      const c=colors[r.atlas_row_id];
      if(!c||r.reference!==c.ref||r.acms_id!=='ACMS-'+c.ref||byId.has(c.id)||!Array.isArray(r.views)||!r.views.every(v=>v==='ACMS-C'||v==='ACMS-U')||!r.views.length||!Array.isArray(r.candidates)||!r.candidates.length||r.paper_specific_measurement!=='NOT_MEASURED')throw Error('ACMS row binding failed');
      if(r.views.includes('ACMS-C')!==coated.has(c.id)||r.views.includes('ACMS-U')!==uncoated.has(c.id))throw Error('ACMS view membership mismatch');
      for(const x of r.candidates){
        if(typeof x.manufacturer_basis!=='string'||!Number.isFinite(x.de00_model)||x.de00_model<0||x.measured_qc_status!=='NOT_MEASURED'||!hex(x.model_preview_hex)||typeof x.model_preview_gamut_clipped!=='boolean'||!Array.isArray(x.components)||!x.components.length||x.components.some(p=>!p.name||String(p.basis_id||'').startsWith('PAINTMIXING_KIMERA_')))throw Error('ACMS candidate validation failed');
        const total=x.components.reduce((v,p)=>v+(p.fraction===undefined?p.percent/100:p.fraction),0);
        if(!Number.isFinite(total)||Math.abs(total-1)>.001)throw Error('ACMS weights invalid');
      }
      byId.set(c.id,r);
    }
    return {get(c,view){const r=byId.get(c.id),label=view==='solid_c'?'ACMS-C':view==='solid_u'?'ACMS-U':null;return r&&r.reference===c.ref&&r.views.includes(label)?r:null}};
  }
  function visible(r){return r.candidates.filter(x=>x.manufacturer_basis.startsWith('CHSOS_')||x.de00_model<=5)}
  function render(store,c,view){
    const row=store?.get(c,view);
    if(!row)return '<p role="status">ACMS recipe unavailable for this view and reference.</p>';
    const label=view==='solid_c'?'ACMS-C':'ACMS-U';
    return `<section class="basis23-recipe acms-recipe"><h3>${label}-${esc(c.ref)} · Spot colour candidates</h3><p class="recipe-boundary">COMPUTATIONAL ONLY · NOT MEASURED · ${view==='solid_c'?'Coated':'Uncoated'} membership is provisional. No paper-specific measurement.</p>${visible(row).map((x,i)=>`<article class="acms-candidate"><h4>${esc(x.manufacturer_basis.startsWith('CHSOS_')?'CHSOS pigment-sample research basis':x.manufacturer_basis)}</h4><p>Model ΔE00 ${x.de00_model.toFixed(2)} · ${x.de00_model<=5?'within':'outside'} computational tolerance</p><div class="recipe-comparison" aria-label="ATLAS target and computational mix preview"><div><strong>A · ATLAS target</strong><div class="recipe-swatch" style="background:${esc(c.hex)}" role="img" aria-label="ATLAS target ${esc(c.hex)}"></div><code>${esc(c.hex)}</code></div><div><strong>B · model mix</strong><div class="recipe-swatch" style="background:${x.model_preview_hex}" role="img" aria-label="Computed mix ${x.model_preview_hex}"></div><code>${x.model_preview_hex}</code>${x.model_preview_gamut_clipped?'<small>RGB gamut clipped</small>':''}</div></div><button type="button" data-acms-png="${i}">Download A/B PNG</button><ol>${x.components.map(p=>`<li>${esc(p.name)} — ${(100*(p.fraction===undefined?p.percent/100:p.fraction)).toFixed(2)}%</li>`).join('')}</ol></article>`).join('')}<p class="recipe-note">Screen proxies: ATLAS reference HEX versus opaque-limit K/S model under D50, adapted to sRGB. ΔE00 compares model spectra, not displayed RGB. Ingredient proportions are starting values; drying, opacity and substrate response are unverified. Named manufacturer recipes remain within one manufacturer; Golden Heavy Body and OPEN can appear together. CHSOS is a pigment-sample research basis. No physical QC or production approval.</p></section>`;
  }
  function download(store,c,view,index){
    const row=store?.get(c,view),candidate=row&&visible(row)[index];if(!candidate)throw Error('ACMS preview unavailable');
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1060;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1017';ctx.fillRect(0,0,1600,1060);
    const text=(x,y,s,size=28,color='#ecf0f5')=>{ctx.fillStyle=color;ctx.font=`${size}px sans-serif`;ctx.fillText(s,x,y)};
    text(70,85,`ATLAS CLARUS · ${view==='solid_c'?'ACMS-C':'ACMS-U'}-${c.ref}`,42);text(70,145,candidate.manufacturer_basis,28);
    [[70,'A · ATLAS TARGET',c.hex],[825,'B · COMPUTED MIX',candidate.model_preview_hex]].forEach(([x,title,color])=>{text(x,220,title);ctx.fillStyle=color;ctx.fillRect(x,250,705,335);text(x,635,color,34)});
    text(70,715,`Model ΔE00 ${candidate.de00_model.toFixed(2)} · ${candidate.components.length} components`,31,'#a1ff50');
    candidate.components.forEach((p,i)=>text(70,765+i*38,`${p.name} — ${(100*(p.fraction===undefined?p.percent/100:p.fraction)).toFixed(2)}%`,23));
    text(70,985,'COMPUTATIONAL ONLY · NOT MEASURED · NO PRODUCTION APPROVAL',25,'#ffcf87');
    text(70,1020,'D50 / 2° → sRGB · opacity and substrate response not verified'+(candidate.model_preview_gamut_clipped?' · RGB clipped':''),20);
    canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ATLAS_${view==='solid_c'?'ACMS-C':'ACMS-U'}_${c.ref}_BA.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png');
  }
  root.ATLAS_ACMS_RECIPES=Object.freeze({create,render,download});
})(window);
