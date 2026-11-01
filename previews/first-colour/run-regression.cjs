'use strict';
// Reuse the historical acceptance assertions with only the new entry route and
// preview identity adapted. The historical test files and runtime stay untouched.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const [kind,...args]=process.argv.slice(2),root=path.resolve(__dirname,'../..');
const file=path.join(root,kind==='origin'?'releases/rc34.11/browser-acceptance.cjs':'releases/rc34.10/browser-acceptance.cjs');
if(!['origin','source-zip'].includes(kind))throw Error('Choose origin or source-zip');
let source=fs.readFileSync(file,'utf8');
function once(old,next){if(source.split(old).length!==2)throw Error('Historical test adapter anchor changed: '+old);source=source.replace(old,next);}
if(kind==='origin'){
 once("pathToFileURL(path.join(root,'index.html')).href", "pathToFileURL(path.join(root,'index.html')).href+'#picker'");
}else{
 once("pathToFileURL(path.join(root, 'index.html')).href", "pathToFileURL(path.join(root, 'index.html')).href+'#picker'");
 once("'0.2.0-rc34.11-colour-origin'].includes(version)","'0.2.0-rc34.11-colour-origin', '0.2.0-rc34.11-first-colour-preview.1'].includes(version)");
 once("assert.equal(manifest.deployment_allowed, !version.endsWith('-preview'));",'assert.equal(manifest.deployment_allowed, false);');
 process.env.ATLAS_BUNDLE_VERSION='0.2.0-rc34.11-first-colour-preview.1';
}
const runner=new Module(file,module);runner.filename=file;runner.paths=Module._nodeModulePaths(path.dirname(file));
process.argv=[process.argv[0],file,...args];runner._compile(source,file);
