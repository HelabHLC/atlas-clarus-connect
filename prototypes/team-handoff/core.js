/* Standalone carrier: no ZIP parsing, native conversion or network access. */
(function(root){
'use strict';
const MAX=64*1024*1024, MAGIC=new TextEncoder().encode('ACLSEAL1'), AAD=new TextEncoder().encode('ATLAS Clarus opaque ZIP transport v1');
const need=(v,m)=>{if(!v)throw Error(m);};
function bytes(b,max=MAX){need(b instanceof Uint8Array&&b.length>0&&b.length<=max,'Datei leer oder größer als das Prototyp-Limit (64 MiB).');}
function zip(b){bytes(b);need(b.length>=22&&b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4,'Bitte die vollständige Exchange-ZIP wählen. Native Prüfung erfolgt beim RC34-Import.');}
async function hash(b){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');}
async function code(b){zip(b);return 'ATLAS-CHECK-1:'+b.length+':'+await hash(b);}
function parse(s){need(typeof s==='string'&&s.length<150,'Ungültiger Prüfcode.');const m=/^ATLAS-CHECK-1:([1-9][0-9]{0,8}):([0-9a-f]{64})$/.exec(s.trim());need(m&&Number(m[1])<=MAX,'Ungültiger Prüfcode oder unzulässige Größe.');return {size:Number(m[1]),hash:m[2]};}
async function verify(b,s){zip(b);const c=parse(s);need(b.length===c.size&&await hash(b)===c.hash,'PRÜFUNG FEHLGESCHLAGEN: Größe oder SHA-256 weicht ab.');return true;}
function keyBytes(s){need(typeof s==='string'&&/^ATLAS-KEY-1:[0-9a-f]{64}$/.test(s.trim()),'Ungültiger Schlüssel.');return Uint8Array.from(s.trim().slice(12).match(/../g),v=>parseInt(v,16));}
async function seal(b){zip(b);const raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD,tagLength:128},key,b));const out=new Uint8Array(20+ct.length);out.set(MAGIC);out.set(iv,8);out.set(ct,20);return {bytes:out,key:'ATLAS-KEY-1:'+Array.from(raw,v=>v.toString(16).padStart(2,'0')).join(''),code:await code(b)};}
async function open(b,s,c){bytes(b,MAX+36);parse(c);need(b.length>=58&&MAGIC.every((v,i)=>v===b[i]),'Ungültige verschlüsselte Übergabe.');const key=await crypto.subtle.importKey('raw',keyBytes(s),'AES-GCM',false,['decrypt']);let plain;try{plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(8,20),additionalData:AAD,tagLength:128},key,b.slice(20)));}catch{throw Error('Entschlüsselung fehlgeschlagen: Schlüssel falsch oder Datei verändert.');}await verify(plain,c);return plain;}
const api={MAX,code,parse,verify,seal,open};if(typeof module!=='undefined')module.exports=api;root.ClarusTeamHandoff=api;
})(globalThis);
