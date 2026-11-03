(function(){
  const library=document.getElementById('library-view'),loader=window.ATLAS_PRINT_PROFILE_LOADER;
  if(!library||!loader)return;
  const slot=document.createElement('div');library.closest('.library-toolbar').after(slot);
  window.ATLAS_PROFILE_LIBRARY.mount({container:slot,externalSelect:library,isBusy:loader.isBusy,attach:async({profile,bytes})=>{
    await loader.attachProfile(profile.output_path,bytes,profile.file_name,profile.printing_condition||profile.description);
    location.hash='print';
  }});
})();
