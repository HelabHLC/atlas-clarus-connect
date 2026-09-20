(function(root){
'use strict';
const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4',SCHEMA='ATLAS_CLARUS_DESIGNER_LAYER';
const need=(v,m)=>{if(!v)throw Error(m)};
function bind(doc,colors,master=MASTER){need(doc&&doc.schema===SCHEMA,'Designer layer schema rejected.');need(master===MASTER&&doc.source_master?.sha256===MASTER,'DESIGNER_LAYER_MASTER_BINDING_FAILED');need(Array.isArray(colors)&&colors.length===13283&&Array.isArray(doc.records),'Designer layer requires the frozen 13,283-row source master.');const byId=new Map();for(const r of doc.records){need(Number.isInteger(r.atlas_row_id)&&!byId.has(r.atlas_row_id),'Duplicate or invalid atlas_row_id.');const s=colors[r.atlas_row_id];need(s&&s.id===r.atlas_row_id&&s.ref===r.reference,'DESIGNER_LAYER_MASTER_BINDING_FAILED');need(!('lab'in r||'rgb'in r||'hex'in r||'master_rgb'in r),'Designer layer may not replace colour values.');byId.set(r.atlas_row_id,Object.freeze({...r}))}const full=doc.join_contract?.cardinality==='ONE_TO_ONE';need(!full||byId.size===13283,'A one-to-one designer layer must contain 13,283 records.');return Object.freeze({document:Object.freeze({...doc}),byId,full})}
function get(bound,entry){const r=bound?.byId.get(entry?.id);return r&&r.reference===entry.ref?r:null}
function searchText(r){return r?[r.standard_name_en,r.designer_name_en,r.colour_family,r.hue_character,r.lightness_character,r.chroma_character,r.temperature,...(r.search_terms_en||[])].join(' ').toUpperCase():''}
root.ATLAS_CLARUS_DESIGNER={MASTER,SCHEMA,bind,get,searchText};
})(typeof window!=='undefined'?window:globalThis);
