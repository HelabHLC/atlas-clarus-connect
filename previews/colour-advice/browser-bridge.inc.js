  // Read-only snapshot for the shared colour-advice workspace. Never replace
  // a native palette or attach a source record to a different ATLAS address.
  window.ATLAS_ADVICE_BROWSER_SOURCE={
    selected:()=>({name:'Farbberatung · '+selected.ref,entries:[selected],assignments:selectedAssignment?[selectedAssignment]:[]}),
    palette:()=>({name:currentPalette().name,entries:palette.slice(),assignments:(currentPalette().sourceAssignments||[]).slice()}),
    library:()=>activeView,
    original:async()=>pickerImage?.objectUrl?{name:pickerFileName,bytes:new Uint8Array(await (await fetch(pickerImage.objectUrl)).arrayBuffer())}:null
  };
