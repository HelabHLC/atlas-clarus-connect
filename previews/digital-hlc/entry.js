(function(){
  const startup=Boolean(document.querySelector('#kit-language-bar'));
  const host=startup?document.querySelector('.intro .actions'):(document.querySelector('.atlas-advice-launch')||document.querySelector('.library-toolbar'));
  if(!host)return;
  const link=document.createElement('a');link.id='digital-colour-entry';link.className=startup?'button secondary':'btn';link.target='_blank';link.rel='noopener';host.append(link);
  const label=()=>{const en=(window.ATLAS_LANGUAGE?.language||document.documentElement.lang)==='en';link.textContent=en?'Digital HLC · P3 / ProPhoto ↗':'Digitale HLC-Farben · P3 / ProPhoto ↗';link.href=(startup?'../':'')+'digital/index.html?lang='+(en?'en':'de');};
  addEventListener('atlas-language-change',label);new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});label();
})();
