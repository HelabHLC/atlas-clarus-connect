(function(root){
  'use strict';
  const visibleEntries=views=>Object.entries(views).filter(([,v])=>v.hidden_from_new_selection!==true);
  function ensureRestoredOption(select,views,id){
    const view=views[id];if(!view)throw Error('Reference library unavailable.');
    let option=Array.from(select.options).find(o=>o.value===id);
    if(!option){option=select.ownerDocument.createElement('option');option.value=id;option.textContent=view.name+' · retained for this existing job';option.dataset.legacyRestored='true';select.append(option);}
    return option;
  }
  function pruneRestoredOptions(select){
    for(const option of Array.from(select.options))if(option.dataset.legacyRestored==='true'&&option.value!==select.value)option.remove();
  }
  const api={visibleEntries,ensureRestoredOption,pruneRestoredOptions};
  root.ATLAS_LIBRARY_VISIBILITY=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
