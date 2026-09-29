const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(__dirname + '/app/src/main/assets/bundle/colour-id.html', 'utf8');
function only(pattern) {
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `expected one generated provenance statement: ${pattern}`);
  return matches[0][0];
}
const initial = only(/let sourceImage=\{name:null,sha256:null,x:null,y:null,width:null,height:null\};\s*let loadedSourceImage=null;let loadedSourceFile=null;/g);
const loaded = only(/loadedSourceFile=file;loadedSourceImage=\{name:file\.name,sha256:sha,x:null,y:null,width:img\.naturalWidth,height:img\.naturalHeight\};sourceImage=\{\.\.\.loadedSourceImage\};/g);
const manual = only(/sourceImage=\{name:null,sha256:null,x:null,y:null\};/g);
const pixel = only(/sourceImage=\{\.\.\.loadedSourceImage,x,y\};/g);
const context = {file:{name:'flower.png'},sha:'a'.repeat(64),img:{naturalWidth:640,naturalHeight:480},x:12,y:34};
vm.runInNewContext(`${initial}\n${loaded}\n${manual}\n${pixel}\nglobalThis.result={sourceImage,loadedSourceImage};`, context);
assert.equal(context.result.sourceImage.name, 'flower.png');
assert.equal(context.result.sourceImage.sha256, 'a'.repeat(64));
assert.equal(context.result.sourceImage.x, 12);
assert.equal(context.result.sourceImage.y, 34);
assert.equal(context.result.sourceImage.width, 640);
assert.match(html, /selection_origin:current\.origin,source_image:sourceImage\.name\?sourceImage:null/);
assert.match(html, /trace\.source_image\.bytes_base64=btoa\(binary\)/);
console.log('PASS: image pixel restores filename, hash, size and coordinates after manual RGB');
