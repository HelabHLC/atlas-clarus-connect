/* RC36.1: file-space declaration is distinct from browser-decoded RGB. */
(function(root){
  'use strict';
  const upstream=root.ATLAS_RGB_SOURCE_SPACE;
  const labels={assumed:'sRGB assumed / angenommen',srgb:'sRGB confirmed / bestätigt',display_p3:'Display P3 confirmed / bestätigt',prophoto_rgb:'ProPhoto RGB confirmed / bestätigt'};
  function build(choice,image){
    if(!Object.prototype.hasOwnProperty.call(labels,choice))throw Error('Unsupported file-space declaration');
    const d=upstream.decision(choice==='assumed'?'srgb':choice,choice!=='assumed',null);
    const hash=image?.colour_origin?.icc?.sha256??null;
    if(hash!==null&&!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid original ICC hash');
    return {schema:'atlas-rc36-file-space/1.0',choice,source_space:d.source_space,source_space_status:d.source_space_status,user_confirmed:d.user_confirmed,source_icc_sha256:hash,icc_space_conflict:'NOT_EVALUATED',native_rgb:'NOT_CAPTURED',conversion_status:'NOT_PERFORMED_BY_THIS_CONTRACT',sample_space:'sRGB',sample_representation:'BROWSER_DECODED_SRGB'};
  }
  function validate(d,image){
    if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid file-space decision');
    const expected=build(d.choice,image),keys=Object.keys(expected);
    if(Object.keys(d).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(d,k)||d[k]!==expected[k]))throw Error('Invalid file-space decision');
    return expected;
  }
  let control;
  function mount(canvas){
    if(control)return;
    const label=document.createElement('label');
    label.id='rc36-file-space-panel';
    label.style.display='block';label.style.margin='0.5rem 0';
    label.append(document.createTextNode('Original file colour space / Farbraum der Originaldatei: '));
    control=document.createElement('select');control.id='rc36-file-space';
    for(const [key,text] of Object.entries(labels)){const o=document.createElement('option');o.value=key;o.textContent=text;control.append(o)}
    label.append(control);
    const info=document.createElement('small');info.style.display='block';
    info.textContent='Declaration only / Nur Angabe. Sampled pixels remain browser-decoded sRGB; native RGB not captured. ICC mismatch not evaluated. Select before sampling.';
    label.append(info);canvas.insertAdjacentElement('beforebegin',label);
  }
  function reset(){if(control)control.value='assumed'}
  function capture(image){return build(control?.value||'assumed',image)}
  function describe(r){return r.file_space_decision?' · Original file: '+labels[r.file_space_decision.choice]+' · sample: browser-decoded sRGB':' · Original file space: legacy / not recorded'}
  root.ATLAS_RC36_SOURCE=Object.freeze({build,validate,mount,reset,capture,describe});
})(globalThis);
