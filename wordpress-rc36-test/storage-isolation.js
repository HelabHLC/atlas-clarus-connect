/* RC36 staging only: isolate browser state from the production origin. */
(function(){
'use strict';
const prefix='atlas-rc36-test::';
function wrap(native){
 const keys=()=>Array.from({length:native.length},(_,i)=>native.key(i)).filter(k=>k&&k.startsWith(prefix)).map(k=>k.slice(prefix.length));
 const api={
  getItem:k=>native.getItem(prefix+String(k)),
  setItem:(k,v)=>native.setItem(prefix+String(k),String(v)),
  removeItem:k=>native.removeItem(prefix+String(k)),
  key:i=>keys()[Number(i)]??null,
  clear:()=>keys().forEach(k=>native.removeItem(prefix+k))
 };
 return new Proxy(api,{
  get(t,k){if(k==='length')return keys().length;if(k in t||typeof k==='symbol')return Reflect.get(t,k);return api.getItem(k)??undefined},
  set(t,k,v){if(typeof k!=='string'||k in t||k==='length')return false;api.setItem(k,v);return true},
  deleteProperty(t,k){if(typeof k==='string'&&!(k in t)){api.removeItem(k);return true}return false},
  ownKeys(){return keys()},
  getOwnPropertyDescriptor(t,k){return keys().includes(k)?{configurable:true,enumerable:true,writable:true,value:api.getItem(k)}:undefined}
 });
}
try{
 for(const k of ['localStorage','sessionStorage']){
  const native=window[k],facade=wrap(native);
  Object.defineProperty(window,k,{configurable:false,enumerable:true,value:facade,writable:false});
  if(window[k]!==facade)throw Error('Storage namespace could not be installed');
 }
}catch(e){
 // A failed namespace is not allowed to continue into the application.
 document.open();document.write('<!doctype html><meta charset="utf-8"><h1>RC36 test blocked: isolated browser storage unavailable.</h1>');document.close();throw e;
}
})();
