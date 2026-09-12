// Execute the actual shipped handlers with a small storage/DOM boundary.
// This is a function-level fault-injection test, not a browser visual test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('browser-bundle/src/app.js','utf8');
const part = (start,end)=>{
  const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,`Missing shipped handler: ${start}`);
  return app.slice(a,b);
};
const warning={hidden:true,textContent:''};
const status={textContent:'',style:{}};
let writes=0,renders=0,fail=false,stored;
const p={id:'fixture',name:'Test palette',colorIds:[]};
const context={
  palette:[{id:4966},{id:10519}],palettes:[p],activePaletteId:p.id,
  currentPalette:()=>p,PALETTE_KEY:'fixture-key',
  localStorage:{setItem(key,value){writes++;if(fail)throw Error('QuotaExceededError');stored=JSON.parse(value)}},
  renderPalette(){renders++},
  $(selector){return selector==='#palette-storage-status'?warning:status}
};
vm.createContext(context);
vm.runInContext(part('function persistPalettes()', 'function paletteStatus(')+
  part('function paletteStatus(', 'function addPalette(')+
  part('function canCreatePalette()', 'function movePaletteColour('),context);
context.persistPalettes();
assert.equal(writes,1);assert.equal(renders,1);assert.equal(warning.hidden,true);
assert.deepEqual(stored.palettes[0].colorIds,[4966,10519]);
fail=true;context.persistPalettes();
assert.equal(warning.hidden,false);assert.match(warning.textContent,/could not be saved/);
assert.equal(context.palette.length,2,'failed storage must retain in-memory colours for export');
context.paletteStatus('Export finished.');
assert.equal(warning.hidden,false,'unrelated success must not hide failed persistence');
fail=false;context.persistPalettes();assert.equal(warning.hidden,true);
context.palettes=Array.from({length:49},()=>p);assert.equal(context.canCreatePalette(),true);
context.palettes.push(p);assert.equal(context.canCreatePalette(),false);
assert.match(status.textContent,/50 palettes/);
console.log('PASS: shipped palette persistence, quota failure, recovery and workspace capacity');
