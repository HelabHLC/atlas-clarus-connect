/* Real-data beta15i.6 integration gate.
 * Usage: node browser-bundle/tests/beta15i6-real-data.test.cjs /path/to/runtime
 * Runtime must contain assets/atlas-data.js and digital/libraries.js from the
 * SAME verified digital-HLC build. No synthetic master or mocked engines.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const runtime=process.argv[2];
if(!runtime)throw Error('Pass an extracted, verified digital-HLC runtime directory as argument');
function load(relative,globalName){
 const filename=path.resolve(runtime,relative);
 if(!fs.existsSync(filename))throw Error('Missing real build data: '+filename);
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),sandbox,{filename,timeout:30000});
 const value=sandbox.window[globalName];
 if(!value)throw Error('Missing '+globalName+' in '+filename);
 return JSON.parse(JSON.stringify(value));
}
const master=load('assets/atlas-data.js','ATLAS_CLARUS_DATA');
const libraries=load('digital/libraries.js','ATLAS_DIGITAL_LIBRARY_DATA');
const before=JSON.stringify(master);
const digital=require('../src/beta15i6-digital-hlc-core.js');
const multi=require('../src/multi-gamut-library.js');
const bridge=require('../src/beta15i6-integration-bridge.js');
assert.equal(master.colors.length,13283);
assert.equal(master.master_sha256,multi.MASTER);
const context=digital.context(master,libraries);
const store=multi.create(master);
const api=bridge.create({digitalContext:context,multiGamutStore:store});
const masterColour=api.assess({source:{kind:'HLC',address:'H290_L040_C075'},material_id:'test_material'});
assert.equal(masterColour.identity.kind,'MASTER_REFERENCE');
assert.equal(masterColour.identity.atlas_row_id,10646);
assert.equal(masterColour.production_evidence.status,'NOT_VERIFIED_FOR_SELECTED_MATERIAL');
const added=api.assess({source:{kind:'HLC',address:'H295_L040_C100'},material_id:'test_material'});
assert.equal(added.identity.kind,'DIGITAL_COLOUR');
assert.equal(added.identity.atlas_row_id,null);
assert.equal(added.icc_status,'NOT_EVALUATED');
assert.deepEqual(added.source_memberships.libraries.map(x=>x.id),['display-p3','prophoto-rgb']);
assert.equal(added.production_evidence.status,'NOT_VERIFIED_FOR_SELECTED_MATERIAL');
const p3=libraries.libraries['display-p3'].references;
const pro=libraries.libraries['prophoto-rgb'].references;
assert.equal(p3.length,15430);
assert.equal(pro.length,22248);
const union=new Set([...p3,...pro]);
const proSet=new Set(pro);
const intersection=p3.filter(x=>proSet.has(x)).length;
assert.equal(union.size,p3.length+pro.length-intersection);
assert.equal(JSON.stringify(master),before,'Master mutated');
console.log(JSON.stringify({status:'PASS',master_count:master.colors.length,p3:p3.length,prophoto:pro.length,intersection,unique_digital_addresses:union.size,extra_over_master:union.size-master.colors.length,production_qc:'NOT_VERIFIED'},null,2));
