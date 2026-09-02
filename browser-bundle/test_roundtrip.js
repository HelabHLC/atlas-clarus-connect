#!/usr/bin/env node
'use strict';
require('./src/palette-export.js');
require('./src/roundtrip-validator.js');
const E=globalThis.ATLAS_CLARUS_EXPORTS;
const R=globalThis.ATLAS_CLARUS_ROUNDTRIP;
const enc=new TextEncoder();
const palette=[
  {id:71,ref:'H005_L060_C055',rgb:[231,98,139],hex:'#E7628B',lab:[60,54.7907,4.7936]},
  {id:92,ref:'H005_L050_C015',rgb:[144,110,118],hex:'#906E76',lab:[50,14.9429,1.3073]}
];
const assert=(ok,label)=>{if(!ok)throw Error(`FAIL: ${label}`);console.log(`PASS: ${label}`)};
const textBytes=value=>enc.encode(value);
const jsonBytes=value=>textBytes(JSON.stringify(value));

const clarus=R.validate(R.parse('test.clarus.json',jsonBytes(E.clarus(palette,R.MASTER,'Test'))),palette);
assert(clarus.status==='IDENTITY_MATCH','Clarus JSON returns IDENTITY_MATCH');
assert(clarus.entries.every(x=>x.status==='IDENTITY_MATCH'),'Clarus entries match identity');

const formats=[
  ['test.ase',E.ase(palette)],
  ['test.gpl',textBytes(E.gpl(palette,R.MASTER,'Test'))],
  ['test.tokens.json',jsonBytes(E.tokens(palette,R.MASTER,'Test'))],
  ['test.css',textBytes(E.css(palette,R.MASTER,'Test'))]
];
for(const [name,bytes] of formats){const result=R.validate(R.parse(name,bytes),palette);assert(result.status==='VALUE_MATCH',`${name} returns VALUE_MATCH`)}

const bad=E.clarus(palette,R.MASTER,'Test');bad.references[0].master_rgb=[230,98,139];
assert(R.validate(R.parse('bad.clarus.json',jsonBytes(bad)),palette).status==='MISMATCH','changed RGB returns MISMATCH');
const badMaster=E.clarus(palette,'0'.repeat(64),'Test');
assert(R.validate(R.parse('bad-master.clarus.json',jsonBytes(badMaster)),palette).status==='MISMATCH','changed master SHA-256 returns MISMATCH');
const badFreeze=E.clarus(palette,R.MASTER,'Test');badFreeze.freeze_status='NOT_FROZEN';
assert(R.validate(R.parse('bad-freeze.clarus.json',jsonBytes(badFreeze)),palette).status==='MISMATCH','changed freeze status returns MISMATCH');
const reordered=E.clarus([...palette].reverse(),R.MASTER,'Test');
assert(R.validate(R.parse('reordered.clarus.json',jsonBytes(reordered)),palette).status==='MISMATCH','changed order returns MISMATCH');
const shortened=E.clarus(palette.slice(0,1),R.MASTER,'Test');
const shortResult=R.validate(R.parse('short.clarus.json',jsonBytes(shortened)),palette);
assert(shortResult.status==='MISMATCH'&&shortResult.entries.length===2,'missing colour returns per-entry MISMATCH');
assert(R.validate(R.parse('test.clarus.json',jsonBytes(E.clarus(palette,R.MASTER,'Test'))),[]).status==='UNVERIFIABLE','empty active palette returns UNVERIFIABLE');
try{R.parse('test.txt',textBytes('unknown'));assert(false,'unsupported extension rejected')}catch(_){assert(true,'unsupported extension rejected')}
