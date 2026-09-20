const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('browser-bundle/src/app.css', 'utf8');
const app = fs.readFileSync('browser-bundle/src/app.js', 'utf8');
const html = fs.readFileSync('browser-bundle/src/index.html', 'utf8');
const responsiveFix = css.slice(css.indexOf('/* RC20 responsive acceptance fixes. */'));

assert.match(responsiveFix, /--topbar-height:72px/);
assert.match(responsiveFix, /scroll-padding-top:var\(--topbar-height\)/);
assert.match(responsiveFix, /scroll-margin-top:var\(--topbar-height\)/);
assert.match(responsiveFix, /\.topbar nav\{[^}]*background:#0a0d12[;}]/);
assert.doesNotMatch(responsiveFix, /\.topbar nav\{[^}]*background:#[0-9a-f]{8}[;}]/i);
assert.match(app, /requestAnimationFrame\(\(\)=>scrollTo\(/);
assert.match(html, /SEARCH BY COLOUR NAME, HLC REFERENCE, ID OR HEX/);
assert.match(html, /placeholder="Purple, H305_L015_C075, 12345, #2D0080"/);
assert.match(app, /nameSearchById\.get\(c\.id\)/);

console.log('PASS: opaque mobile navigation and sticky-header route offset');
