/* beta15i.6 browser capability diagnostics. No claim of measured display gamut.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.ATLAS_DISPLAY_CAPABILITIES=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function check({css,matchMedia}={}){
   const supports=(space)=>typeof css?.supports==='function'
     ? Boolean(css.supports('color','color('+space+' 0.5 0.5 0.5)')):null;
   const media=(gamut)=>{
     if(typeof matchMedia!=='function')return null;
     try{return Boolean(matchMedia('(color-gamut: '+gamut+')').matches);}catch{return null;}
   };
   const cssP3=supports('display-p3'),cssPro=supports('prophoto-rgb');
   const p3=media('p3'),rec2020=media('rec2020'),srgb=media('srgb');
   return Object.freeze({
     schema:'ATLAS_DISPLAY_CAPABILITY_V1',
     css:{display_p3:cssP3,prophoto_rgb:cssPro},
     reported_display_gamut:{srgb,p3,rec2020},
     p3_preview_supported:cssP3===true&&p3===true,
     prophoto_display_coverage:'NOT_DETERMINABLE_BY_STANDARD_COLOR_GAMUT_MEDIA_QUERY',
     display_accuracy:'NOT_MEASURED',
     calibration:'NOT_VERIFIED',
     production_evidence:'NOT_EVALUATED',
     warning:'Browser feature and media-query results are not proof of calibrated colour accuracy or full ProPhoto display coverage'
   });
 }
 function detect(){
   return check({css:typeof CSS==='undefined'?null:CSS,
     matchMedia:typeof globalThis.matchMedia==='function'?globalThis.matchMedia.bind(globalThis):null});
 }
 return Object.freeze({check,detect});
});
