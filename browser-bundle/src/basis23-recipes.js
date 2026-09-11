(function(root){
  'use strict';
  const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const BASIS='ATLAS_COMBINED_BASIS23_v0_8';
  const SOURCES={CHSOS:'https://chsopensource.org/products/pigments-checker/',KIMERA_PAINTMIXING:'https://github.com/miciwan/PaintMixing'};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validate(r,c){
    if(!r||!c||!Number.isInteger(c.id)||r.source_atlas_row_id!==c.id||r.reference!==c.ref||r.basis_version!==BASIS)throw Error('Recipe identity mismatch');
    if(!Number.isInteger(r.component_count)||r.component_count<1||r.component_count>4||!Array.isArray(r.components)||r.components.length!==r.component_count)throw Error('Invalid component count');
    if(!Number.isFinite(r.de00)||r.de00<0||r.computational_tolerance!==5)throw Error('Invalid tolerance');
    if(r.computational_tolerance_status!==(r.de00<=5?'WITHIN_COMPUTATIONAL_TOLERANCE':'OUTSIDE_COMPUTATIONAL_TOLERANCE'))throw Error('Tolerance status mismatch');
    if(r.measured_qc_status!=='NOT_MEASURED'||r.production_approval!=='NOT_SUPPORTED'||r.search_optimality!=='BEST_FOUND_HEURISTIC_NOT_GLOBAL_PROOF')throw Error('Invalid evidence boundary');
    const ids=new Set();let sum=0;
    for(const p of r.components){
      if(typeof p.basis_id!=='string'||!p.basis_id||ids.has(p.basis_id)||typeof p.name!=='string'||!p.name||!Number.isFinite(p.percent)||p.percent<=0||p.percent>100||!Object.hasOwn(SOURCES,p.source_family)||p.source_url!==SOURCES[p.source_family])throw Error('Invalid component or source');
      ids.add(p.basis_id);sum+=p.percent;
    }
    // Source percentages are rounded to three decimals; do not renormalize them.
    if(Math.abs(sum-100)>r.component_count*0.0005+1e-8)throw Error('Component sum is not 100 percent within source rounding');
    return r;
  }
  function create(data,colors,master){
    if(master!==MASTER||!data||data.registry.atlas_master_sha256!==MASTER||data.registry.basis_version!==BASIS||data.registry.rows!==13283||!Array.isArray(data.rows)||data.rows.length!==13283||colors.length!==13283)throw Error('Recipe dataset binding failed');
    const references=new Map(colors.map(c=>[c.id,c])),rows=new Map();
    for(const r of data.rows){if(rows.has(r.source_atlas_row_id))throw Error('Duplicate recipe');validate(r,references.get(r.source_atlas_row_id));rows.set(r.source_atlas_row_id,r)}
    if(rows.size!==references.size)throw Error('Missing recipes');
    return {get(c){return validate(rows.get(c.id),c)}};
  }
  function displayValid(r){
    const d=r.mix_display;
    return !!(d&&d.status==='VERIFIED'&&d.method==='KS_PROXY_D50_2DEG_400_700_BRADFORD_D65_SRGB_V1'&&/^#[0-9A-F]{6}$/.test(d.hex)&&Array.isArray(d.rgb)&&d.rgb.length===3&&d.rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255)&&d.hex==='#'+d.rgb.map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join('')&&Number.isFinite(d.recomputed_de00)&&d.recomputed_de00>=0&&Number.isFinite(d.benchmark_error)&&d.benchmark_error>=0&&d.benchmark_error<=.001&&Math.abs(d.recomputed_de00-r.de00)<=.001&&typeof d.srgb_clipped==='boolean');
  }
  function comparison(r,c){
    if(!displayValid(r))return '<p role="status">Mix preview unavailable: reconstruction not verified.</p>';
    return `<div class="recipe-comparison" aria-label="Target and computed mix"><div><strong>ATLAS Target</strong><div class="recipe-swatch" style="background:${esc(c.hex)}" role="img" aria-label="ATLAS target ${esc(c.hex)}"></div><code>${esc(c.hex)}</code></div><div><strong>Computed Mix</strong><div class="recipe-swatch" style="background:${r.mix_display.hex}" role="img" aria-label="Computed mix ${r.mix_display.hex}"></div><code>${r.mix_display.hex}</code></div></div><p class="recipe-note">Screen proxies. ΔE00 compares model spectra under D50 / 2°, not these displayed RGB values.${r.mix_display.srgb_clipped?' Computed mix clipped to sRGB.':''}</p><button type="button" data-recipe-png>Download comparison PNG</button>`;
  }
  function download(store,c){
    const r=store.get(c);if(!displayValid(r))throw Error('Unverified mix preview');
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1240;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1017';ctx.fillRect(0,0,1600,1240);
    function text(x,y,t,size=26,color='#ecf0f5'){ctx.fillStyle=color;ctx.font=`${size}px sans-serif`;ctx.fillText(t,x,y)}
    text(70,75,'ATLAS CLARUS',30,'#a1ff50');text(70,145,'Target | Computed Mix',54);text(70,205,`${c.ref} · Basis-23 · ${r.component_count} components`);
    [[70,'ATLAS TARGET',c.hex],[825,'COMPUTED MIX',r.mix_display.hex]].forEach(([x,title,color])=>{text(x,270,title,28);ctx.fillStyle=color;ctx.fillRect(x,300,705,330);text(x,680,color,36)});
    text(70,750,`Spectral-model comparison: ΔE00 ${r.de00.toFixed(3)}`,34,'#a1ff50');
    r.components.forEach((p,i)=>text(70,820+i*48,`${p.name} — ${p.percent.toFixed(3)}%`));
    text(70,1050,'COMPUTATIONAL ONLY · NOT PHYSICALLY VALIDATED',27,'#ffcf87');
    text(70,1090,'Screen proxies. Model proportions, not gram recipes.',24);
    text(70,1125,'D50 / 2° · 400–700 nm · Bradford to D65 / sRGB'+(r.mix_display.srgb_clipped?' · Mix clipped to sRGB':''),22);
    text(70,1165,'Sources: CHSOS / PaintMixing · HLC reference data © freieFarbe e.V.',22);
    canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ATLAS_BA_${c.ref}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png');
  }
  const pdfAscii=value=>String(value).normalize('NFKD').replace(/[^\x20-\x7E]/g,'?');
  const pdfEsc=value=>pdfAscii(value).replace(/([\\()])/g,'\\$1');
  function downloadPdf(store,c){
    const r=store.get(c),commands=[],annotations=[];
    const text=(value,x,y,size=10,strong=false)=>commands.push(`BT /F1 ${strong?size+1:size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEsc(value)}) Tj ET`);
    const link=(label,url,x,y)=>{text(`${label}: ${url}`,x,y,8);annotations.push({url,x1:x,y1:y-2,x2:535,y2:y+10});};
    commands.push(`${(c.rgb[0]/255).toFixed(4)} ${(c.rgb[1]/255).toFixed(4)} ${(c.rgb[2]/255).toFixed(4)} rg 60 665 475 72 re f 0 0 0 rg`);
    text('ATLAS CLARUS - COMPUTATIONAL RECIPE',60,792,15,true);text(c.ref,60,768,17,true);text(`atlas_row_id ${c.id}`,60,748);text(`ATLAS target RGB ${c.rgb.join(' / ')}   HEX ${c.hex}`,60,730);text(`Lab ${c.lab.map(n=>Number(n).toFixed(2)).join(' / ')}`,60,714);text(`Basis ${r.basis_version}   Delta E00 ${Number(r.de00).toFixed(3)}`,60,690);text(r.computational_tolerance_status,60,648,10,true);
    let y=620;r.components.forEach((p,index)=>{text(`${index+1}. ${p.name} - ${Number(p.percent).toFixed(3)}%`,60,y,11,true);y-=15;link('Spectral source',p.source_url,72,y);y-=15;text('Safety information/SDS: No verified product-specific SDS available',72,y,8);y-=24;});
    text('COMPUTATIONAL RECIPE - NOT PHYSICALLY VALIDATED - NOT_MEASURED',60,y-2,9,true);text('No production approval or claim of physical colour equality.',60,y-18,9);let ay=y-34;if(r.components.some(p=>p.source_family==='CHSOS')){text('CHSOS source data used with permission and attribution. Derived results by ATLAS Clarus.',60,ay,8);ay-=14;text('CHSOS has not reviewed or validated the derived mixtures.',60,ay,8);ay-=14;}if(r.components.some(p=>p.source_family==='KIMERA_PAINTMIXING'))text('PaintMixing / Kimera source dataset: CC BY 4.0 per source README.',60,ay,8);text(`Master SHA-256 ${MASTER}`,60,48,7);
    const stream=commands.join('\n'),objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';objects[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';const refs=annotations.map((_,i)=>`${6+i} 0 R`).join(' ');objects[3]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R /Annots [${refs}] >>`;objects[4]=`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`;objects[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';annotations.forEach((a,i)=>{objects[6+i]=`<< /Type /Annot /Subtype /Link /Rect [${a.x1} ${a.y1} ${a.x2} ${a.y2}] /Border [0 0 0] /A << /S /URI /URI (${pdfEsc(a.url)}) >> >>`;});let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=new TextEncoder().encode(pdf).length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=new TextEncoder().encode(pdf).length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;const url=URL.createObjectURL(new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`ATLAS_Clarus_${c.ref}_Recipe.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function render(store,c){
    if(!store)return '<section class="basis23-recipe"><h3>Basis-23 computational recipe</h3><p role="status">Recipe unavailable: dataset validation failed. Reference identity remains unchanged.</p></section>';
    try{
      const r=store.get(c);
      return `<details class="basis23-recipe"><summary>Basis-23 computational recipe · ΔE00 ${r.de00.toFixed(3)}</summary>${comparison(r,c)}<button type="button" data-recipe-pdf>Download recipe PDF</button><p class="recipe-boundary">COMPUTATIONAL ONLY · NOT MEASURED<br>Precomputed model proportions, not a physically validated paint recipe. No production approval.</p><p>${esc(c.ref)} · row ${c.id}<br>${r.component_count} components · tolerance ΔE00 ≤ 5</p><p class="recipe-result ${r.de00<=5?'within':'outside'}">${esc(r.computational_tolerance_status)}</p><ol>${r.components.map(p=>`<li><strong>${esc(p.name)} — ${p.percent.toFixed(3)}%</strong><small>${esc(p.basis_id)}</small><a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">${esc(p.source_family)} source ↗</a><small>Safety information/SDS: No verified product-specific SDS available</small></li>`).join('')}</ol><p class="recipe-note">${esc(BASIS)}<br>Best found heuristic, not a global optimum proof. Source links require an internet connection. Original spectra are not included; source terms remain applicable.</p></details>`;
    }catch(_){return render(null,c)}
  }
  const api={create,validate,render,displayValid,download,downloadPdf,MASTER,BASIS};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ATLAS_CLARUS_RECIPES=api;
})(typeof window==='undefined'?this:window);
