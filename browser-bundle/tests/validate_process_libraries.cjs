'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto');if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
for(const n of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects','pkl-image-binding','colour-reduction','colour-reduction-original','colour-reduction-region'])require('../src/'+n+'.js');
for(const n of ['colour-reduction-corrections','colour-reduction-library','colour-reduction-scoped-cleanup'])require(path.join(__dirname,'../../releases/rc33.8/recovered/assets',n+'.js'));
require('../src/reduction-job.js');
const visibility=require('../src/library-visibility.js'),master=require('../../hover-library/data/colors.json'),views=require('../../hover-library/data/views.json').views,baseline=require('../../process-libraries/legacy-view-baseline.json'),processDoc=require('../../process-libraries/ATLAS_Process_Views_v0_1.json');
const J=global.ATLAS_REDUCTION_JOB,R=global.ATLAS_COLOUR_REDUCTION,C=global.ATLAS_IMAGE_CODECS,H=global.ClarusHandoff;
(async()=>{
 const visible=new Set(visibility.visibleEntries(views).map(([id])=>id));
 assert.equal(visible.size,78);
 for(const id of Object.keys(baseline)){assert(!visible.has(id));for(const [key,value]of Object.entries(baseline[id]))assert.deepEqual(views[id][key],value);}
 for(const [id,v]of Object.entries(processDoc.views)){assert(visible.has(id));assert.deepEqual(views[id].ids,v.ids);assert.equal(new Set(v.ids).size,v.entry_count);}
 const m51=new Set(views.pso_coated_v3_fogra51.ids),m52=new Set(views.pso_uncoated_v3_fogra52.ids);assert.deepEqual(views.pso_fogra51_fogra52_common.ids,[...m51].filter(id=>m52.has(id)));
 const rgba=Uint8Array.from([61,123,25,255,60,123,25,255,255,0,0,128,0,0,0,0,61,123,25,255,40,80,90,255,255,255,0,255,0,0,0,255]);const source=C.png(4,2,rgba),input={width:4,height:2,rgba,name:'Compatibility motif',sourceName:'motif.png',sourceBytes:source,sourceMime:'image/png',project:null};
 const context=libraryViews=>({colors:master.colors,master:master.master_sha256,libraryViews,decodeSource:async bytes=>{assert.deepEqual(bytes,source);return {width:4,height:2,rgba:rgba.slice()};},reduce:async args=>R.reduce(args)});
 const oldContext=context({...views,...baseline}),newContext=context(views),out=process.env.PROCESS_TEST_OUTPUT||'/tmp/atlas-process-libraries-core';fs.mkdirSync(out,{recursive:true});
 for(const id of [...Object.keys(baseline),...Object.keys(views).filter(id=>views[id].type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP')]){
  const v=views[id],settings={protectionMode:'LIBRARY_REFERENCE',libraryId:id,libraryName:v.name,libraryIds:v.ids,k:8,lockedIds:[],originalRgbs:[],protectedRectangles:[],regionCorrections:[]};
  const reduced=R.reduce({...settings,...input,colors:master.colors,master:master.master_sha256});const state={schema:J.SCHEMA,master_sha256:master.master_sha256,input,settings,result:reduced,uncleaned:reduced,variants:[],view:{zoom:1,x:0,y:0,selected:null,region:null,active:'current',overlay:false,difference:false,threshold:70,cleanupMin:6,cleanupScope:'MASK_ONLY'}};
  const files=await J.exportFiles(state,{},oldContext),zip=H.zipStored(files),back=await J.importZip(zip,newContext);assert.deepEqual(back,state);assert.deepEqual(back.result.pixels,reduced.pixels);const reexport=await J.exportFiles(back,{},newContext);assert.deepEqual(H.zipStored(reexport),zip);fs.writeFileSync(path.join(out,id+'.zip'),zip);
  const allowed=new Set(v.ids);for(const row of back.result.report.palette)if(row.atlas_row_id!==undefined)assert(allowed.has(row.atlas_row_id));console.log('PASS exact job replay and byte-identical export:',id);
 }
 assert.equal(master.colors.length,13283);console.log('PASS process counts, retained legacy identities, selection visibility, original alpha and job round trips');
})().catch(e=>{console.error(e);process.exitCode=1;});
