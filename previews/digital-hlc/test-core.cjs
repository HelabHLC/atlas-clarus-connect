const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runtime=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const C=require('./core.js'),box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(runtime,'assets/atlas-data.js'),'utf8'),box);
vm.runInNewContext(fs.readFileSync(path.join(runtime,'digital/libraries.js'),'utf8'),box);
const data=JSON.parse(JSON.stringify(box.window.ATLAS_CLARUS_DATA)),before=JSON.stringify(data),ctx=C.context(data,box.window.ATLAS_DIGITAL_LIBRARY_DATA),checks=[];
const source={kind:'HLC',address:'H295_L040_C100'},colour=ctx.resolve(source);
assert.equal(colour.address,source.address);assert.equal(colour.identity.kind,'DIGITAL_COLOUR');assert.equal(colour.identity.atlas_row_id,null);
assert.equal(colour.representations.srgb.preview_hex,'#3749F8');assert.deepEqual(colour.representations.srgb.preview_rgb8,[55,73,248]);
assert.deepEqual(colour.master_comparison.stored_srgb,[61,83,211]);assert.equal(colour.master_comparison.reference,'H290_L040_C075');assert.equal(colour.master_comparison.d2_rgb,1505);
assert.equal(colour.library_membership.status,'NOT_ESTABLISHED');assert.equal(colour.library_membership.libraries.length,0);assert.equal(colour.spectral_data,'NOT_AVAILABLE');
assert.equal(colour.master_comparison.route,'DERIVED_SRGB8_PROXY_RGB_ONLY');
assert.deepEqual(colour.digital_library_membership.libraries.map(l=>l.id),['display-p3','prophoto-rgb']);
checks.push('Requested H295_L040_C100 retained as a separate digital address; known exact sRGB conversion and master comparison');
const exact=ctx.resolve({kind:'HLC',address:'H290_L040_C075'});assert.equal(exact.identity.atlas_row_id,10646);assert.deepEqual(exact.lab_d50_2deg,data.colors[10646].lab);
assert.ok(exact.library_membership.libraries.length);assert.equal(ctx.resolve({kind:'HLC',address:'H360_L050_C000'}).address,'H000_L050_C000');
const redMaster=data.colors.find(c=>c.ref.startsWith('H360_'));assert.equal(ctx.resolve({kind:'HLC',address:redMaster.ref}).identity.atlas_row_id,redMaster.id);assert.equal(ctx.resolve({kind:'HLC',address:redMaster.ref.replace('H360','H000')}).identity.atlas_row_id,redMaster.id);
const gamut=ctx.coverage();assert.deepEqual(C.SPACES.map(k=>gamut.spaces[k].inside),[10636,12009,13108,13283]);
for(const [id,v] of Object.entries(data.views)){const c=ctx.coverage(id);assert.equal(c.total,v.ids.length);for(const s of C.SPACES)assert.equal(c.spaces[s].inside+c.spaces[s].outside,v.ids.length);}
checks.push('Existing identities/lists unchanged; all 94 library coverage totals valid');
for(const [space,total,masterCount] of [['display-p3',15430,12132],['prophoto-rgb',22248,13283]]){
  const exported=ctx.exportLibrary(space),packaged=JSON.parse(fs.readFileSync(path.join(runtime,'digital/libraries',space+'.json')));
  assert.deepEqual(exported,packaged);assert.equal(exported.rows.length,total);assert.equal(exported.master_count,masterCount);assert.equal(exported.additional_digital_count,total-masterCount);
  assert.equal(new Set(exported.rows.map(r=>r.address)).size,total);
  const byref=new Map(data.colors.map(c=>[c.ref,c]));
  for(const r of exported.rows){const master=byref.get(r.address);if(master){assert.equal(r.identity.atlas_row_id,master.id);assert.deepEqual(r.stored_master_srgb,master.rgb);}else{assert.equal(r.identity.atlas_row_id,null);assert.equal(r.spectral_data,'NOT_AVAILABLE');}assert.ok(r.rgb_normalized.every(Number.isFinite));}
  for(const ref of ['H295_L040_C100','H290_L040_C095'])assert.equal(exported.rows.find(r=>r.address===ref).identity.kind,'DIGITAL_COLOUR');
}
assert.ok(ctx.exportLibrary('display-p3').rows.some(r=>!r.computed_in_gamut));
const screenshot=ctx.resolve({kind:'HLC',address:'H290_L040_C095'});
assert.deepEqual(screenshot.representations.srgb.preview_rgb8,[0,81,245]);assert.deepEqual(screenshot.representations['display-p3'].preview_rgb8,[19,80,236]);assert.deepEqual(screenshot.representations['prophoto-rgb'].preview_rgb8,[89,70,226]);assert.equal(screenshot.representations.srgb.in_gamut,false);assert.equal(screenshot.representations['display-p3'].in_gamut,true);
checks.push('Full source libraries: P3 15,430 / ProPhoto 22,248; all old identities preserved, additions separate; screenshot colour outside sRGB but inside P3; source-selected versus computed gamut disagreement retained');
const p3=ctx.resolve({kind:'RGB',space:'display-p3',values:[1,0,0]}),srgb=ctx.resolve({kind:'RGB',space:'srgb',values:[1,0,0]});
assert.notDeepEqual(p3.lab_d50_2deg,srgb.lab_d50_2deg);assert.notEqual(p3.digital_id,srgb.digital_id);assert.equal(p3.representations.srgb.in_gamut,false);assert.ok(p3.representations.srgb.encoded_rgb.some(v=>v<0||v>1));assert.equal(p3.master_comparison.proxy_clipped,true);assert.equal(p3.representations['display-p3'].in_gamut,true);
const prophoto=ctx.resolve({kind:'RGB',space:'prophoto-rgb',values:[0,1,0]});assert.equal(prophoto.representations['display-p3'].in_gamut,false);assert.equal(prophoto.representations['prophoto-rgb'].in_gamut,true);
assert.equal(ctx.resolve({kind:'HLC',address:'H000_L000_C000'}).representations.srgb.preview_hex,'#000000');
assert.equal(ctx.resolve({kind:'HLC',address:'H000_L100_C000'}).representations.srgb.preview_hex,'#FFFFFF');
for(const bad of ['H361_L040_C100','H295_L101_C100','H295_L040_C201','H295_L040_C-1','H295_L040_C100<script>','H295.1234567_L040_C100'])assert.throws(()=>ctx.resolve({kind:'HLC',address:bad}));
for(const values of [[NaN,0,0],[Infinity,0,0],[-.1,0,0],[1.1,0,0],['1',0,0],[1,0]])assert.throws(()=>ctx.resolve({kind:'RGB',space:'display-p3',values}));
assert.throws(()=>ctx.resolve({kind:'HLC',address:'H295_L040_C100',illuminant:'D65'}));assert.throws(()=>ctx.resolve({kind:'RGB',space:'unknown',values:[1,0,0]}));
checks.push('Tagged P3/ProPhoto sources remain distinct; unclipped values retained; invalid inputs and unknown conditions rejected');
function oracleNearest(rgb){let best;for(const c of data.colors){const d=(rgb[0]-c.rgb[0])**2+(rgb[1]-c.rgb[1])**2+(rgb[2]-c.rgb[2])**2;if(!best||d<best.d||(d===best.d&&c.id<best.id))best={id:c.id,d};}return best;}
let seed=42;const rnd=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed>>>24;};
const vectors=[[25,63,143],[9,34,255],[55,73,248],[0,0,0],[255,255,255],...Array.from({length:128},()=>[rnd(),rnd(),rnd()])];
const groups=new Map();for(const c of data.colors){const k=c.rgb.join(',');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c.id);}
const ties=[...groups.entries()].filter(([,ids])=>ids.length>1).slice(0,30);vectors.push(...ties.map(([k])=>k.split(',').map(Number)));
for(const rgb of vectors){const expected=oracleNearest(rgb),record=ctx.resolve({kind:'RGB',space:'srgb',values:rgb.map(v=>v/255)});assert.equal(record.master_comparison.atlas_row_id,expected.id);assert.equal(record.master_comparison.d2_rgb,expected.d);assert.equal(record.master_comparison.route,'NATIVE_SRGB8_RGB_ONLY_V3_4_0');}
checks.push(`${vectors.length} native sRGB comparisons including ${ties.length} real duplicate-RGB ties match an independent exhaustive search`);
const entries=[{label:'Original <script> & colour',colour},{label:'P3 red',colour:p3},{label:'Master',colour:exact},{label:'ProPhoto green',colour:prophoto}];
const doc=ctx.exportProject(entries);assert.deepEqual(ctx.importProject(JSON.parse(JSON.stringify(doc))),entries);
for(const mutate of [d=>d.entries[0].colour.identity.atlas_row_id=10646,d=>d.entries[0].colour.representations.srgb.encoded_rgb[0]+=.1,d=>d.entries[0].colour.library_membership.status='ACCEPTED_FOR_LIBRARY',d=>d.entries[0].colour.address='H290_L040_C075',d=>d.master_sha256='0'.repeat(64),d=>d.entries[0].colour.spectral_data=[1,2,3],d=>d.entries[0].colour.source.illuminant='D65']){const corrupt=JSON.parse(JSON.stringify(doc));mutate(corrupt);assert.throws(()=>ctx.importProject(corrupt));}
assert.throws(()=>ctx.exportProject([]));assert.throws(()=>ctx.exportProject(Array.from({length:257},()=>entries[0])));
const css=ctx.css(entries);assert.match(css,/@media \(color-gamut: p3\)/);assert.match(css,/sRGB CLIPPED/);assert.doesNotMatch(css,/<script>/);assert.doesNotMatch(css,/--atlas-digital-4: color\(display-p3/);
assert.equal(JSON.stringify(data),before);checks.push('Round-trip JSON and CSS; forged identity, colour, membership and spectral records rejected; master untouched');
fs.writeFileSync(path.join(out,'example.digital-colours.json'),JSON.stringify(doc,null,2));
const result={status:'PASS',checks,master_rows:data.colors.length,library_views:Object.keys(data.views).length,core_coverage:gamut.spaces};fs.writeFileSync(path.join(out,'core-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
