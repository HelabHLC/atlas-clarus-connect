const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let saved;
class Anchor {
  constructor() {
    this.download = 'palette.clarus.json';
    this.href = 'blob:atlas-export';
  }
  click() { throw Error('The browser download path must not run'); }
}
class Reader {
  readAsDataURL() {
    this.result = 'data:application/json;base64,eyJvayI6dHJ1ZX0=';
    this.onload();
  }
}
const context = {
  window: { AndroidExport: { save: (...args) => { saved = args; }, error: message => { throw Error(message); } } },
  document: { addEventListener: () => {} },
  HTMLAnchorElement: Anchor,
  FileReader: Reader,
  fetch: async () => ({ ok: true, blob: async () => ({ size: 11, type: 'application/json' }) })
};
vm.runInNewContext(fs.readFileSync(__dirname + '/android-export.js', 'utf8'), context);
new Anchor().click();
setImmediate(() => {
  assert.deepEqual(saved, ['palette.clarus.json', 'application/json', 'eyJvayI6dHJ1ZX0=']);
  console.log('PASS: detached bundle export reaches Android Save Document bridge');
});
