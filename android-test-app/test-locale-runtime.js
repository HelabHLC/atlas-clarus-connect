const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const TEXT = 3, ELEMENT = 1;
class TextNode {
  constructor(value, parent) { this.nodeType = TEXT; this.nodeValue = value; this.parentElement = parent; }
}
class Element {
  constructor(tagName, id = '', parent = null) {
    this.nodeType = ELEMENT; this.tagName = tagName; this.id = id;
    this.parentElement = parent; this.childNodes = []; this.attributes = {};
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) {
      if (selector === '#' + node.id) return node;
    }
    return null;
  }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  getAttribute(name) { return this.attributes[name]; }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(node) { node.parentElement = this; this.childNodes.push(node); }
  after() {}
  querySelectorAll() { return this.buttons || []; }
  addEventListener(_name, callback) { this.onClick = callback; }
}
const body = new Element('BODY'), head = new Element('HEAD');
const label = new Element('BUTTON', '', body), text = new TextNode('Bild auswählen', label);
label.appendChild(text); body.appendChild(label);
const status = new Element('P', '', body), statusText = new TextNode('Zuerst eine geschlossene Region erzeugen.', status);
status.appendChild(statusText); body.appendChild(status);
const imageCanvas = new Element('CANVAS', 'imageCanvas', body);
imageCanvas.loadedPixels = new Uint8Array([12, 34, 56, 255]);
body.appendChild(imageCanvas);
const preview = new Element('DIV', 'reportPreview', body);
const userComment = new Element('P', '', preview), userText = new TextNode('Messung', userComment);
userComment.appendChild(userText); preview.appendChild(userComment); body.appendChild(preview);
let observer;
const buttons = [new Element('BUTTON'), new Element('BUTTON')];
buttons[0].dataset = {lang:'de'}; buttons[1].dataset = {lang:'en'};
const document = {
  body, head, documentElement: {},
  createElement: name => {
    const element = new Element(name.toUpperCase());
    if (name === 'nav') element.buttons = buttons;
    return element;
  },
  querySelector: () => new Element('HEADER')
};
const alerts = [], location = {href:''}, storage = new Map();
const window = {
  alert: value => alerts.push(value), confirm: () => true,
  Blob: class { constructor(parts, options) { this.parts = parts; this.type = options?.type; } }
};
const context = {
  window, document, location, Node:{TEXT_NODE:TEXT,ELEMENT_NODE:ELEMENT},
  localStorage:{setItem:(k,v)=>storage.set(k,v)},
  MutationObserver:class { constructor(callback) {observer=callback;} observe() {} },
  DOMParser:class {}
};
const html = fs.readFileSync(__dirname + '/app/src/main/assets/bundle/colour-id-en.html', 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
vm.runInNewContext(script, context);
assert.equal(text.nodeValue, 'Choose image');
assert.equal(statusText.nodeValue, 'Create a closed region first.');
assert.equal(userText.nodeValue, 'Messung', 'user report text must stay exact');
window.alert('Zuerst ein Bild laden.');
assert.deepEqual(alerts, ['Load an image first.']);
statusText.nodeValue = 'Kantenkarte: wird berechnet …';
observer([{type:'characterData',target:statusText}]);
assert.equal(statusText.nodeValue, 'Edge map: calculating …');
buttons[0].onClick();
assert.equal(storage.get('atlasColourIdLanguage'), 'de');
assert.equal(location.href, '', 'language switch must not navigate or discard the loaded image');
assert.equal(document.documentElement.lang, 'de');
assert.equal(text.nodeValue, 'Bild auswählen');
assert.equal(statusText.nodeValue, 'Kantenkarte: wird berechnet …');
assert.deepEqual([...imageCanvas.loadedPixels], [12, 34, 56, 255]);
buttons[1].onClick();
assert.equal(text.nodeValue, 'Choose image');
assert.equal(statusText.nodeValue, 'Edge map: calculating …');
assert.equal(userText.nodeValue, 'Messung');
assert.equal(location.href, '');
console.log('PASS: language switches in place, preserving the image and report text');
