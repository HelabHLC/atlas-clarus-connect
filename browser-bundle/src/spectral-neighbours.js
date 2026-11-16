(function(){
'use strict';
const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
let records=null,byRef=null,selected=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toFixed(3);
function rms(a,b){let total=0;for(let i=0;i<36;i++)total+=(a[2][i]-b[2][i])**2;return Math.sqrt(total/36)*100}
function chart(a,b){const X=i=>50+i*2,Y=v=>125-v*105;return '<svg viewBox="0 0 450 160" style="width:100%;max-width:850px" role="img" aria-label="Reflectance 380 to 730 nanometres"><path d="'+a[2].map((v,i)=>(i?'L':'M')+X(i)+' '+Y(v)).join(' ')+'" fill="none" stroke="#28a6e0" stroke-width="2"/><path d="'+b[2].map((v,i)=>(i?'L':'M')+X(i)+' '+Y(v)).join(' ')+'" fill="none" stroke="#ef9a3d" stroke-width="2"/><text x="50" y="150" fill="currentColor">380 nm</text><text x="110" y="150" fill="currentColor">730 nm</text></svg>'}
function render(){
 const status=$('spectral-status'),table=$('spectral-results'),plot=$('spectral-plot');
 if(!status||!table||!plot)return;
 if(!records){status.textContent='Import the unchanged v2 spectral prototype HTML to activate offline spectral comparison. No master data are modified.';return}
 if(!selected){status.textContent='Choose an ATLAS reference in Hover Library or Image Picker.';return}
 const row=byRef.get(selected.ref);
 if(!row){status.textContent='Selected ATLAS reference is absent from spectral dataset. Comparison disabled.';table.replaceChildren();plot.replaceChildren();return}
 const ranked=records.filter(r=>r!==row).map(r=>({r,score:rms(row,r)})).sort((a,b)=>a.score-b.score||a.r[0].localeCompare(b.r[0])).slice(0,Number($('spectral-limit').value));
 status.textContent='Reference '+selected.ref+' · '+records.length+' validated spectral records · global RMS ranking · 380–730 nm / 10 nm';
 table.innerHTML=ranked.map((v,i)=>'<tr><td>'+esc(v.r[0])+'</td><td>'+fmt(v.score)+'</td><td>'+fmt(Math.abs(row[4]-v.r[4]))+'</td><td>'+fmt(Math.abs(row[5]-v.r[5]))+'</td><td>'+fmt(Math.abs(row[6]-v.r[6]))+'</td><td><button type="button" data-spectral-index="'+i+'">Compare</button></td></tr>').join('');
 table.querySelectorAll('[data-spectral-index]').forEach(b=>b.onclick=()=>{const v=ranked[Number(b.dataset.spectralIndex)];plot.innerHTML=chart(row,v.r);});
 plot.replaceChildren();
}
async function load(file){
 const status=$('spectral-status');if(!file)return;
 try{
  if(file.size>12000000)throw Error('File exceeds 12 MB safety limit');
  const source=await file.text();
  const match=source.match(/\bconst DATA=(\[\[.*?\]\]);\s*const \$/s);
  if(!match)throw Error('Expected v2 spectral DATA block not found');
  const rows=JSON.parse(match[1]);
  if(rows.length!==13283)throw Error('Expected 13,283 reference spectra');
  const map=new Map();
  for(const r of rows){
   if(!Array.isArray(r)||!/^H\d{3}_L\d{3}_C\d{3}$/.test(r[0])||!Array.isArray(r[2])||r[2].length!==36||r[2].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)||map.has(r[0]))throw Error('Invalid or duplicate spectrum');
   map.set(r[0],r);
  }
  const master=window.ATLAS_CLARUS_DATA;
  if(master?.master_sha256!==MASTER||master.colors?.length!==13283||master.colors.some(c=>!map.has(c.ref)))throw Error('Master identity mismatch');
  records=rows;byRef=map;render();
 }catch(e){records=null;byRef=null;status.textContent='Spectral data rejected: '+e.message;tableClear();}
}
function tableClear(){$('spectral-results')?.replaceChildren();$('spectral-plot')?.replaceChildren()}
document.addEventListener('atlas:reference-selected',e=>{selected=e.detail;render()});
document.addEventListener('DOMContentLoaded',()=>{
 $('spectral-file')?.addEventListener('change',e=>load(e.target.files?.[0]));
 $('spectral-limit')?.addEventListener('change',render);
 render();
});
})();