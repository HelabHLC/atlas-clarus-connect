const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const saved = [], errors = [], revoked = [];
const source = { size: 11, type: 'application/json' };
class Anchor {
  constructor() {
    this.download = 'palette.clarus.json';
    this.href = '';
  }
  click() { throw Error('The browser download path must not run'); }
}
class Reader {
  readAsDataURL(blob) {
    assert.equal(blob, source, 'read the original Blob, without fetching its URL');
    this.result = 'data:application/json;base64,eyJvayI6dHJ1ZX0=';
    this.onload();
  }
}
const objectURLs = {
  createObjectURL: () => 'blob:atlas-export',
  revokeObjectURL: url => revoked.push(url)
};
const context = {
  window: { AndroidExport: { save: (...args) => saved.push(args), error: message => errors.push(message) } },
  document: { addEventListener: () => {} },
  HTMLAnchorElement: Anchor,
  FileReader: Reader,
  URL: objectURLs,
  fetch: () => { throw Error('WebView blob: fetch must not run'); }
};
vm.runInNewContext(fs.readFileSync(__dirname + '/android-export.js', 'utf8'), context);
const anchor = new Anchor();
anchor.href = objectURLs.createObjectURL(source);
anchor.click();
objectURLs.revokeObjectURL(anchor.href);
assert.deepEqual(saved, [['palette.clarus.json', 'application/json', 'eyJvayI6dHJ1ZX0=']]);
assert.deepEqual(revoked, ['blob:atlas-export']);
assert.deepEqual(errors, []);
anchor.click();
assert.deepEqual(errors, ['Export data is unavailable'], 'revoke releases the Blob');
console.log('PASS: detached export saves the original Blob and releases it on revoke');
