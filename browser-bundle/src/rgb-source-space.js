/* ATLAS Clarus — explicit RGB source-space decision.
 * This metadata contract never performs an ICC conversion or changes master data.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ATLAS_RGB_SOURCE_SPACE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SPACES=Object.freeze({
    srgb:'sRGB IEC61966-2.1',
    display_p3:'Display P3',
    prophoto_rgb:'ProPhoto RGB',
    rec2020:'Rec. 2020'
  });
  function decision(space,explicitConfirmation,iccProfile){
    const requested=space==null||space===''?'srgb':space;
    if(!Object.prototype.hasOwnProperty.call(SPACES,requested))
      throw new Error('Unsupported RGB source space');
    if(typeof explicitConfirmation!=='boolean')
      throw new Error('Explicit confirmation flag required');
    if(iccProfile!=null&&(typeof iccProfile!=='object'||Array.isArray(iccProfile)||
        typeof iccProfile.sha256!=='string'||!/^[a-f0-9]{64}$/.test(iccProfile.sha256)))
      throw new Error('Invalid ICC profile provenance');
    if(iccProfile&&requested!==iccProfile.space&&!explicitConfirmation)
      throw new Error('ICC/profile conflict requires explicit confirmation');
    return Object.freeze({
      source_space:requested,
      source_space_label:SPACES[requested],
      source_space_status:explicitConfirmation?'USER_CONFIRMED':'ASSUMED_SRGB_UNVERIFIED',
      user_confirmed:explicitConfirmation,
      source_icc_sha256:iccProfile?.sha256||null,
      icc_space_conflict:!!(iccProfile&&iccProfile.space!==requested),
      conversion_status:'NOT_PERFORMED',
      warranty:'NO_SOURCE_COLOUR_ACCURACY_WARRANTY'
    });
  }
  function resolve(space,confirmed,iccProfile){
    if(!confirmed&&space&&space!=='srgb')
      throw new Error('Non-default RGB source space must be confirmed');
    return decision(space,confirmed,iccProfile);
  }
  return Object.freeze({SPACES,decision:resolve});
});
