/* RC36.2 — Open DCM source evidence card; no ICC conversion or print proof. */
(function(root,createRecord){
  'use strict';
  const schema='atlas-clarus-open-dcm-card/0.1';
  const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={assumed:'sRGB angenommen / assumed',srgb:'sRGB bestätigt / confirmed',display_p3:'Display P3 deklariert / declared',prophoto_rgb:'ProPhoto RGB deklariert / declared'};
  const clone=v=>JSON.parse(JSON.stringify(v));
  function create({entry,colors,master,palette,createdAt=new Date().toISOString()}){
    if(!Array.isArray(colors)||colors.length!==13283||master!=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4')throw Error('Master mismatch');
    const c=colors[entry?.id];
    if(!c||c.id!==entry.id||c.ref!==entry.ref||JSON.stringify(c.rgb)!==JSON.stringify(entry.rgb)||JSON.stringify(c.lab)!==JSON.stringify(entry.lab)||c.hex!==entry.hex)throw Error('Reference identity mismatch');
    if(!palette||!Array.isArray(palette.colorIds)||!Array.isArray(palette.sourceAssignments))throw Error('Palette unavailable');
    const saved=root.ATLAS_CLARUS_EXPORTS.validateSourceAssignments(palette.sourceAssignments,colors,master,palette.colorIds);
    const assignments=saved.filter(r=>r.atlas_row_id===c.id);
    return {schema,created_at:createdAt,master_sha256:master,reference:{atlas_row_id:c.id,hlc_address:c.ref,master_rgb:[...c.rgb],master_hex:c.hex,master_lab:[...c.lab]},palette:{name:String(palette.name),scope:'ACTIVE_SAVED_PALETTE'},sources:assignments.map(r=>({assignment:r,open_dcm:createRecord({hlcAddress:c.ref,sourceRgb:r.source_rgb,sourceSpace:'sRGB',sourceProfile:null})})),source_status:assignments.length?'RECORDED_UNSIGNED':'NOT_RECORDED',output:{iccProfile:null,renderingIntent:null,substrate:null,deviceValues:null,simulatedLab:null,deltaE00:null,status:'not-calculated'},evidence:{iccCalculated:false,physicalProofMeasured:false,productionApproval:false}};
  }
  function html(d){
    const r=d.reference;
    const rows=d.sources.map(({assignment:a})=>'<tr><td>'+esc(a.source_rgb.join(' / '))+'<br>'+esc(a.source_hex)+'</td><td>'+esc(labels[a.file_space_decision?.choice]||'Nicht erfasst / not recorded')+'<br><small>ICC SHA-256: '+esc(a.file_space_decision?.source_icc_sha256??a.image?.colour_origin?.icc?.sha256??'unavailable')+'</small></td><td>'+esc(a.image.name)+'<br>'+esc(a.sampling.centre.join(' / '))+'</td></tr>').join('');
    return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open DCM · '+esc(r.hlc_address)+'</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#e6e9ed;color:#172131;font:15px/1.5 system-ui,sans-serif}main{max-width:780px;margin:24px auto;background:#fff;padding:28px;border-radius:12px}header{background:#152238;color:white;padding:22px;border-radius:8px}header small{color:#a7e4c4;letter-spacing:.13em}h1{font-size:25px;margin:8px 0}h2{font-size:17px;margin-top:24px}.patch{height:100px;border-radius:8px;border:1px solid #c8d0d5;margin:18px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:9px 5px;text-align:left;border-bottom:1px solid #d5dce2;overflow-wrap:anywhere;vertical-align:top}th{font-size:12px}small{font-size:11px}p,dd{overflow-wrap:anywhere}dl{display:grid;grid-template-columns:1fr 1fr;gap:4px}dd{margin:0}button{padding:10px 18px}aside{background:#f0f3f5;padding:12px}tr{break-inside:avoid}@media(max-width:500px){main{margin:0;padding:14px}td{font-size:12px}}@media print{body{background:white}main{margin:0;padding:0;max-width:none}button{display:none}header,.patch{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><main><header><small>ATLAS CLARUS · OPEN DCM</small><h1>Colour Reference Card</h1>'+esc(r.hlc_address)+' · NOT MEASURED</header><div class="patch" style="background:'+esc(r.master_hex)+'"></div><p>Master RGB: '+esc(r.master_rgb.join(' / '))+' · Lab: '+esc(r.master_lab.join(' / '))+' · Row '+esc(r.atlas_row_id)+'</p><p><small>Master SHA-256: '+esc(d.master_sha256)+'</small></p><h2>Farbherkunft / Source provenance</h2><p>Aktive gespeicherte Palette / Active saved palette: '+esc(d.palette.name)+'</p>'+(rows?'<table><thead><tr><th>Browser-sRGB · 8 bit</th><th>Originaldatei / original file</th><th>Datei / pixel</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p>Keine gespeicherte Quellzuordnung / No saved source assignment.</p>')+'<aside>Angaben zum Originalfarbraum sind Anwenderdeklarationen. Native RGB-Werte wurden nicht erfasst; ICC-Konflikt nicht ausgewertet. / File-space declarations do not establish native RGB or ICC accuracy.</aside><h2>Produktion / Production</h2><dl><dt>ICC output profile</dt><dd>Not selected</dd><dt>Material / substrate</dt><dd>Not selected</dd><dt>Device values · ΔE00</dt><dd>Not calculated</dd><dt>Physical proof</dt><dd>Not measured</dd></dl><p>Unveränderte Referenzidentität · kein Proof / Frozen reference · no proof.</p><button onclick="window.print()">Drucken / Save PDF</button></main></body></html>';
  }
  function open(input,download){
    const d=create(input),target=root.open('','_blank');
    if(!target)throw Error('Browser blocked reference card popup');
    target.document.open();target.document.write(html(d));target.document.close();
    download('ATLAS_Open_DCM_'+d.reference.hlc_address+'.json',JSON.stringify(d,null,2),'application/json');
    return clone(d);
  }
  root.ATLAS_RC36_CARD=Object.freeze({create,html,open});
})(globalThis,createColourRecord);
