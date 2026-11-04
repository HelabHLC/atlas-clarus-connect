(function(){
 const host=document.querySelector('.atlas-advice-launch');if(!host)return;
 const link=document.createElement('a');link.className='btn';link.id='browser-logo-palette';link.target='_blank';link.rel='noopener';host.append(link);
 const label=()=>{const en=window.ATLAS_LANGUAGE?.language==='en';link.textContent=en?'Load logo and find brand colours ↗':'Logo laden und Markenpalette finden ↗';link.href='multi/index.html?lang='+(en?'en':'de');};
 addEventListener('atlas-language-change',label);label();
})();
