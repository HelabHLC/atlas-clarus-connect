const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(process.argv[2]);
const sandbox = vm.createContext({TextEncoder, TextDecoder, crypto:crypto.webcrypto});
sandbox.window = sandbox;
for (const file of ['atlas-data.js','palette-export.js','quarkxpress-export.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
}
const D = sandbox.ATLAS_CLARUS_DATA, E = sandbox.ATLAS_CLARUS_EXPORTS;
const before = JSON.stringify(D), master = D.master_sha256;
const plain = obj => JSON.parse(JSON.stringify(obj));
let batches = 0;
for (let i=0;i<D.colors.length;i+=256) {
  const p=D.colors.slice(i,i+256), xtg=E.quarkXtg(p,master);
  E.verifyQuarkXtg(xtg,p,master);
  assert.deepEqual(plain(E.readQuarkXtg(xtg)),plain(p.map(c=>({ref:c.ref,rgb:c.rgb}))));
  batches++;
}
// Pin Quark's published process-RGB example independently of our reader.
assert.ok(E.quarkXtg([{ref:'Red',rgb:[255,0,0]}],master).includes('@Red=[C]<"RGB",P,1,0,0>\r\n'));
const channels=Array.from({length:256},(_,n)=>({ref:'Test '+n,rgb:[n,255-n,(113*n)%256]}));
E.verifyQuarkXtg(E.quarkXtg(channels,master),channels,master);
const p=[{ref:'H075_L060_C045',rgb:[180,136,67]},{ref:'Original #010203',rgb:[1,2,3]}];
const title='Farben ä ß 🎨 @ <test> \\ "Probe"';
const output=E.quarkXtg(p,master,title);
assert.equal(new TextDecoder('utf-8',{fatal:true}).decode(new TextEncoder().encode(output)),output);
assert.ok(output.includes('<\\@> <\\<>test> <\\\\>'));
E.verifyQuarkXtg(output,p,master,title);
const bad=[[],new Array(257).fill(p[0]),[{ref:'bad',rgb:[256,0,0]}],[{ref:'bad',rgb:[-1,0,0]}],
 [{ref:'bad',rgb:[0.5,0,0]}],[{ref:'bad',rgb:['1',0,0]}],[{ref:'bad',rgb:[NaN,0,0]}],
 [{ref:'bad',rgb:[0,0]}],[{ref:'bad=tag',rgb:[0,0,0]}],[{ref:'bad\n@Injected',rgb:[0,0,0]}],
 [{ref:'bad"name',rgb:[0,0,0]}],[{ref:'bad<name',rgb:[0,0,0]}],[{ref:'bad\\name',rgb:[0,0,0]}],
 [{ref:' ',rgb:[0,0,0]}],[{ref:'Black',rgb:[4,5,6]}],[p[0],p[0]],[{ref:'a',rgb:[0,0,0]},{ref:'A',rgb:[1,2,3]}]];
for(const v of bad)assert.throws(()=>E.quarkXtg(v,master));
for(const name of ['',null,'bad\nname','bad\uD800'])assert.throws(()=>E.quarkXtg(p,master,name));
assert.throws(()=>E.quarkXtg(p,'0'.repeat(63)));
const corrupted=[output.replace('<e9>','<e8>'),output.replace('"RGB",P','"CMYK",P'),
 output.replace('"RGB",P','"RGB",S'),output.replace('0.7058823529411765','0.7'),
 output.replace('H075_L060_C045','H075_L060_C040'),output.replace('Master SHA-256: ','Altered: '),
 output.slice(0,-2),output+'<c"Injected">'];
for(const v of corrupted)assert.throws(()=>E.verifyQuarkXtg(v,p,master,title));
assert.equal(JSON.stringify(D),before);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal((html.match(/data-palette-export="quarkxpress"/g)||[]).length,1);
assert.equal((html.match(/<option value="xtg">/g)||[]).length,1);
for(const file of ['app.js','palette-export.js','quarkxpress-export.js','reduction-job-ui.js']) {
  assert.ok(html.includes(fs.readFileSync(path.join(root,'assets',file),'utf8')),file+' not in offline HTML');
}
let scripts=0;for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1],{filename:'inline-'+scripts});scripts++;
}
const result={master_rows:D.colors.length,batches,all_rgb8_channel_values:256,invalid_palettes_rejected:bad.length,
  corrupt_files_rejected:corrupted.length,quark_documented_example:'PASS',utf8_and_text_escaping:'PASS',
  master_unchanged:true,offline_script_syntax_count:scripts,native_quarkxpress_import:'NOT_TESTED'};
fs.writeFileSync(path.join(root,'..','verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
