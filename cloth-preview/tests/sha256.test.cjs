'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),sha=require('../src/sha256.js');
for(const n of [0,3,55,56,63,64,65,1000000]){const b=Buffer.alloc(n,97);assert.equal(sha(b),crypto.createHash('sha256').update(b).digest('hex'));}
console.log('PASS: SHA-256 fallback vs Node crypto at padding boundaries and million-byte vector');
