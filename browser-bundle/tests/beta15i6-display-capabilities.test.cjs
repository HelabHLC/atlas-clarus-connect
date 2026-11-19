'use strict';
const assert=require('node:assert/strict');
const {check}=require('../src/beta15i6-display-capabilities.js');
const supported=check({css:{supports:(_,v)=>v.includes('display-p3')||v.includes('prophoto-rgb')},
 matchMedia:q=>({matches:q.includes('p3')||q.includes('srgb')})});
assert.equal(supported.css.display_p3,true);
assert.equal(supported.css.prophoto_rgb,true);
assert.equal(supported.reported_display_gamut.p3,true);
assert.equal(supported.p3_preview_supported,true);
assert.equal(supported.prophoto_display_coverage,'NOT_DETERMINABLE_BY_STANDARD_COLOR_GAMUT_MEDIA_QUERY');
assert.equal(supported.display_accuracy,'NOT_MEASURED');
const limited=check({css:{supports:()=>false},matchMedia:()=>({matches:false})});
assert.equal(limited.p3_preview_supported,false);
assert.equal(limited.css.prophoto_rgb,false);
const unknown=check();
assert.equal(unknown.css.display_p3,null);
assert.equal(unknown.reported_display_gamut.p3,null);
assert.equal(unknown.p3_preview_supported,false);
console.log('beta15i.6 display capability contract tests passed');
