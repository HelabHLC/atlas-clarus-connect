/* RC35: real master -> active palette -> Handoff -> Projects -> JSON reimport. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
global.window=global;global.crypto=webcrypto;
const base=process.env.RC35_ASSETS||path.resolve(__dirname,'../build/atlas-clarus-browser-bundle/assets');
const load=n=>vm.runInThisContext(fs.readFileSync(path.join(base,n),'utf8'),{filename:n});
(async()=>{
  load('atlas-data.js');load('palette-export.js');
  global.ClarusHandoff=require(path.join(base,'clarus-handoff.js'));
  load('colour-handoff.js');load('colour-projects.js');
  const colors=ATLAS_CLARUS_DATA.colors,master=ATLAS_CLARUS_DATA.master_sha256;
  assert.equal(colors.length,13283);
  const ctx=await ATLAS_COLOUR_HANDOFF.createContext(colors,master);
  const colour=colors[100];
  const assignment=ATLAS_CLARUS_EXPORTS.createSourceAssignment(
    {rgb:[...colour.rgb],size:1,bounds:[0,0,0,0],count:1,std:[0,0,0]},
    {ix:0,iy:0},{name:'test-pixel.png',width:1,height:1,sha256:'0'.repeat(64)},colour,master
  );
  const palette=ATLAS_CLARUS_EXPORTS.clarus([colour],master,'RC35 Roundtrip Test',[assignment]);
  ATLAS_CLARUS_EXPORTS.parseClarus(palette,colors,master);
  const decisions=await ATLAS_COLOUR_HANDOFF.derive(palette,'RECORDED_ORIGINALS',0,1,ctx);
  await ATLAS_COLOUR_HANDOFF.verify(decisions,ctx);
  const decisionsExport=JSON.stringify(decisions,null,2)+'\n';
  const decisionsImported=JSON.parse(decisionsExport);
  await ATLAS_COLOUR_HANDOFF.verify(decisionsImported,ctx);
  assert.deepEqual(decisionsImported,decisions);
  const files=await ClarusHandoff.exportHandoff(decisionsImported,ctx);
  const returned=await ClarusHandoff.returnHandoff(files['palette.clarus.json'],files['handoff.json'],files['palette.ase'],ctx);
  await ATLAS_COLOUR_HANDOFF.verify(returned.data,ctx);
  assert.equal(returned.report.rgb_changed,0);
  let project=await ATLAS_COLOUR_PROJECTS.create('RC35 Integration Test',ctx);
  project=await ATLAS_COLOUR_PROJECTS.add(project,'Pixel 1',decisionsImported,ctx);
  await ATLAS_COLOUR_PROJECTS.verify(project,ctx);
  const projectExport=JSON.stringify(project,null,2)+'\n';
  const projectImported=JSON.parse(projectExport);
  await ATLAS_COLOUR_PROJECTS.verify(projectImported,ctx);
  assert.deepEqual(projectImported,project);
  const entry=ATLAS_COLOUR_PROJECTS.latest(projectImported).entries[0];
  const restored=ATLAS_COLOUR_PROJECTS.palette(projectImported,entry.entry_id);
  assert.deepEqual(restored.records[0].original,decisions.records[0].original);
  assert.equal(restored.records[0].atlas_reference,decisions.records[0].atlas_reference);
  assert.equal(restored.records[0].source_rgb.join(','),assignment.source_rgb.join(','));
  assert.equal(projectImported.revisions.length,2);
  const exportedPackage=await ATLAS_COLOUR_PROJECTS.exportPackage(projectImported,ctx);
  const manifest=JSON.parse(new TextDecoder().decode(exportedPackage['project-package-manifest.json']));
  for(const [name,digest] of Object.entries(manifest.files))
    assert.equal(await ctx.sha(exportedPackage[name]),digest,'Package checksum: '+name);
  const referenced=await ATLAS_COLOUR_HANDOFF.derive(palette,'REFERENCE_VALUES_AS_NEW_INPUTS',0,1,ctx);
  await ATLAS_COLOUR_HANDOFF.verify(referenced,ctx);
  const tampered=structuredClone(projectImported);
  tampered.revisions[1].name='FORGED';
  await assert.rejects(ATLAS_COLOUR_PROJECTS.verify(tampered,ctx));
  console.log(JSON.stringify({status:'PASS',master,reference:colour.ref,source_rgb:assignment.source_rgb,revision_count:projectImported.revisions.length,package_files:Object.keys(exportedPackage).length,returned_rgb_changes:returned.report.rgb_changed,tamper_rejected:true}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
