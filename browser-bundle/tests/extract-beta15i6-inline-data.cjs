/* Extract actual embedded data scripts from the original offline HTML.
 * No generated/fabricated colour data. Fail closed on ambiguous input.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const [htmlFile,outDir]=process.argv.slice(2);
if(!htmlFile||!outDir)throw Error('Usage: node extract-beta15i6-inline-data.cjs <html> <runtime-output>');
const html=fs.readFileSync(htmlFile,'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>x[1]);
function extract(name,relative){
 const matching=scripts.filter(s=>new RegExp('(?:window\\.)?'+name+'\\s*=').test(s));
 if(matching.length!==1)throw Error('Expected exactly one embedded '+name+' script; found '+matching.length);
 const sandbox={window:{}};
 vm.runInNewContext(matching[0],sandbox,{timeout:30000,filename:htmlFile});
 const value=sandbox.window[name];
 if(!value||typeof value!=='object')throw Error('Embedded '+name+' is not an object');
 const target=path.join(outDir,relative);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,matching[0]+'\n');
 console.log(name+': verified embedded script, output '+relative);
 return value;
}
const master=extract('ATLAS_CLARUS_DATA','assets/atlas-data.js');
const libs=extract('ATLAS_DIGITAL_LIBRARY_DATA','digital/libraries.js');
if(master.colors?.length!==13283)throw Error('Unexpected master count: '+master.colors?.length);
if(master.master_sha256!=='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4')throw Error('Master hash mismatch');
if(libs.master_sha256!==master.master_sha256)throw Error('Library/master identity mismatch');
for(const [name,count] of [['display-p3',15430],['prophoto-rgb',22248]]){
 if(libs.libraries?.[name]?.references?.length!==count)throw Error(name+' source list count mismatch');
}
console.log('Extracted verified original master and P3/ProPhoto source lists');
