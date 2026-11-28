/* RC36.3 local BYOS integration. No embedded reference data. */
(function(root){
'use strict';
const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const pins={'master_original.json':'b35b0489e04df68fe8796a78329616703137a54317285015891d98ae345cb062','master_address_index.json':'a7e3010324e82e82673d77f23e07324cf5f9bda6da4c9e61ab750b92e9b15ea0','synthetic_reference_library.json':'a7e00ed99994f66691807ced836b93184980782e93282c938ea1ab98645a11bc'};
const WL=Array.from({length:36},(_,i)=>380+i*10),anchors=[460,520,570,610],eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),check=(v,m)=>{if(!v)throw Error(m)};
async function load(files){
 const docs={};
 for(const f of files){check(Object.hasOwn(pins,f.name)&&!Object.hasOwn(docs,f.name)&&f.size<=50*1024*1024,'Unexpected file');const b=await f.arrayBuffer();const h=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');check(h===pins[f.name],'SHA-256 mismatch: '+f.name);docs[f.name]=JSON.parse(new TextDecoder().decode(b));}
 check(Object.keys(docs).length===3,'Select all three catalogue files');
 const m=docs['master_original.json'],i=docs['master_address_index.json'],s=docs['synthetic_reference_library.json'];
 check([m,i,s].every(x=>x.master_sha256===MASTER)&&[i,s].every(x=>eq(x.wavelength_nm,WL)&&eq(x.anchors_nm,anchors)),'Reference source mismatch');
 check(m.records.length===13283&&i.rows.length===13283&&s.rows.length===6832,'Unexpected count');
 const byHlc=new Map(),byKey=new Map(),bySid=new Map();let p3=0,pro=0;
 function add(r,curve,lab,kind,row){
 check(/^H\d{3}_L\d{3}_C\d{3}$/.test(r.hlc)&&!byHlc.has(r.hlc)&&r.kind===kind,'Identity mismatch');
 check(Array.isArray(curve)&&curve.length===36&&curve.every(v=>Number.isFinite(v)&&v>=0&&v<=1),'Invalid curve');
 check(Array.isArray(lab)&&lab.length===3&&lab.every(Number.isFinite)&&Array.isArray(r.libraries),'Invalid Lab or libraries');
 check(r.anchors.length===4&&anchors.every((w,j)=>Math.abs(curve[(w-380)/10]-r.anchors[j])<1e-10),'Anchor mismatch');
 let area=0,moment=0;for(let j=0;j<35;j++){area+=5*(curve[j]+curve[j+1]);moment+=5*(WL[j]*curve[j]+WL[j+1]*curve[j+1]);}
 check(area>0&&Math.abs(380+area-r.lambda_v2_nm)<1e-8&&Math.abs(moment/area-r.lambda_ee_nm)<1e-8,'ARBE mismatch');
 const key=r.sid4+'|'+r.lambda_v2_nm.toFixed(4)+'|'+r.lambda_ee_nm.toFixed(4);
 check(r.sid4===r.anchors.map(x=>x.toFixed(4)).join('_')&&key===r.address6&&!byKey.has(key),'Spectral address mismatch');
 const item={hlc:r.hlc,kind,atlas_row_id:row,lab_d50:lab.slice(),lab_basis:row===null?'SYNTHETIC_TARGET_D50':'STORED_MASTER_D50',reflectance:curve.slice(),sid4:r.sid4,address6:key,lambda_v2_nm:r.lambda_v2_nm,lambda_ee_nm:r.lambda_ee_nm,libraries:r.libraries.slice()};
 byHlc.set(r.hlc,item);byKey.set(key,item);const group=bySid.get(r.sid4)||[];group.push(item);bySid.set(r.sid4,group);
 }
 for(let j=0;j<13283;j++){const a=m.records[j],r=i.rows[j];check(a.atlas_row_id===j&&r.atlas_row_id===j&&r.spectrum_row===j&&a.reference===r.hlc&&eq(a.wavelength_nm,WL),'Master binding mismatch');add(r,a.reflectance,r.lab_d50_stored,'ORIGINAL_MASTER_REFERENCE',j);}
 for(const r of s.rows){check(r.physical_measurement===false&&r.print_approval===false,'Invalid evidence');if(r.libraries.includes('display-p3'))p3++;else if(r.libraries.includes('prophoto-rgb'))pro++;else throw Error('Missing gamut');add(r,r.reflectance,r.lab_d50_target,'SYNTHETIC_REFERENCE_RESEARCH',null);}
 check(p3===3237&&pro===3595,'Partition mismatch');
 const clone=x=>JSON.parse(JSON.stringify(x));
 return Object.freeze({count:byHlc.size,collisions:[...bySid.values()].filter(x=>x.length>1).length,find:q=>clone(byHlc.has(q)?[byHlc.get(q)]:byKey.has(q)?[byKey.get(q)]:(bySid.get(q)||[]))});
}
function record(r){return {schema:'atlas-rc36-wide-gamut-open-dcm/0.1',master_sha256:MASTER,reference:{hlc_address:r.hlc,atlas_row_id:r.atlas_row_id,kind:r.kind,lab_basis:r.lab_basis,master_lab:r.lab_d50.slice(),address6:r.address6},spectral:{wavelength_nm:WL.slice(),reflectance:r.reflectance.slice(),sid4:r.sid4,lambda_v2_nm:r.lambda_v2_nm,lambda_ee_nm:r.lambda_ee_nm},sources:[],output:{status:'not-calculated',iccProfile:null,deltaE00:null},evidence:{iccCalculated:false,physicalProofMeasured:false,productionApproval:false}}}
function mount(){
 if(document.getElementById('rc36-wide-gamut'))return;
 const panel=document.createElement('details');panel.id='rc36-wide-gamut';panel.style.cssText='padding:12px;margin:12px;border:1px solid #8493a0;border-radius:8px;overflow-wrap:anywhere';
 const el=(tag,label)=>{const e=document.createElement(tag);e.textContent=label;panel.append(e);return e};
 el('summary','RC36.3 · Multi-Gamut Reference Explorer (BYOS)');
 el('p','13.283 Originalreferenzen + 6.832 synthetische Forschungsreferenzen. Private Dateien lokal laden. Keine Druckfreigabe.');
 const link=(url,label)=>{const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.display='block';};
 link('https://freiefarbe.de/wp-content/uploads/2022/12/HLC-Colour-Atlas-XL_Set_DE_v1-2.zip','freieFarbe Original-ZIP (Herkunftsquelle)');
 link('https://freiefarbe.de/licence/','Lizenzbedingungen');
 el('p','Aus dem berechtigten privaten v0.2-Archiv drei JSON-Dateien auswählen: master_original.json, master_address_index.json, synthetic_reference_library.json. Das freieFarbe-ZIP allein genügt nicht. Kein öffentlicher Erweiterungsdownload freigegeben.');
 const files=el('input','');files.type='file';files.multiple=true;files.accept='.json';files.setAttribute('aria-label','Private Referenzdateien');
 const start=el('button','Bibliothek prüfen und laden'),clear=el('button','Bibliothek entfernen'),status=el('p','Keine Bibliothek geladen');status.setAttribute('role','status');
 const search=el('input','');search.type='search';search.placeholder='HLC / SID4 / SID4+ARBE';const find=el('button','Suchen'),results=el('div',''),detail=el('pre','');detail.style.whiteSpace='pre-wrap';
 const csv=el('button','Spektrum CSV'),json=el('button','Open DCM JSON'),card=el('button','Open DCM Karte (Test)');
 let cat=null,current=null,rev=0;
 function reset(){current=null;detail.textContent='';results.replaceChildren();csv.disabled=json.disabled=card.disabled=true;}
 reset();find.disabled=true;
 function download(n,t,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 start.onclick=async()=>{const token=++rev;cat=null;reset();find.disabled=true;start.disabled=true;try{const next=await load(files.files);if(token!==rev)return;cat=next;status.textContent=cat.count+' Referenzen · '+cat.collisions+' SID4-Kollisionsgruppen';find.disabled=false;}catch(e){if(token===rev)status.textContent=e.message;}finally{start.disabled=false;}};
 clear.onclick=()=>{rev++;cat=null;reset();files.value='';find.disabled=true;status.textContent='Keine Bibliothek geladen';};
 find.onclick=()=>{reset();if(!cat)return;const hits=cat.find(search.value.trim());if(!hits.length)results.textContent='Kein Treffer';for(const r of hits){const b=document.createElement('button');b.textContent=r.hlc+' · '+r.address6;b.onclick=()=>{current=r;detail.textContent=JSON.stringify(record(r),null,2);csv.disabled=json.disabled=card.disabled=false;};results.append(b);if(hits.length===1)b.click();}};
 csv.onclick=()=>{if(current)download(current.hlc+'-spectrum.csv','wavelength_nm,reference\n'+WL.map((w,j)=>w+','+current.reflectance[j]).join('\n')+'\n','text/csv');};
 json.onclick=()=>{if(current)download(current.hlc+'-reference.json',JSON.stringify(record(current),null,2),'application/json');};
 card.onclick=()=>{if(!current)return;const d=record(current),w=root.open('','_blank');if(!w){status.textContent='Popup blocked';return;}w.document.open();w.document.write('<!doctype html><meta charset="utf-8"><title>Open DCM research card</title><main style="font:16px system-ui;max-width:800px;margin:auto"><h1>ATLAS Clarus · Open DCM</h1><p>Testkarte · keine Druckfreigabe · ICC numerical gate pending</p><pre style="white-space:pre-wrap"></pre></main>');w.document.close();w.document.querySelector('pre').textContent=JSON.stringify(d,null,2);};
 document.body.prepend(panel);
}
root.ATLAS_RC36_WIDE_GAMUT=Object.freeze({load,record});
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})(globalThis);
