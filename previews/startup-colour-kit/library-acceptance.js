(function(root){
  'use strict';
  const RULE='ATLAS_LIBRARY_MEMBERSHIP_V1',cache=new WeakMap();
  const views=ctx=>ctx.views||root.ATLAS_CLARUS_DATA?.views||{};
  const catalog=ctx=>ctx.catalog||root.ATLAS_ICC_CATALOG;
  function usable(view){return Boolean(view&&view.type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP'&&!view.hidden_from_new_selection&&Array.isArray(view.ids)&&view.ids.length);}
  function choices(ctx,profile){
    const c=catalog(ctx),p=profile&&Object.entries(c?.profiles||{}).find(([,p])=>p.sha256===profile.sha256);
    return Object.entries(views(ctx)).filter(([id,v])=>usable(v)&&(!profile||Boolean(p&&c.libraries[id]?.profile_ids.includes(p[0]))));
  }
  function suggestedLibrary(ctx,profile,preferred=''){
    const items=choices(ctx,profile);
    if(items.some(([id])=>id===preferred))return preferred;
    const unique=items.filter(([id])=>catalog(ctx)?.libraries[id]?.profile_ids.length===1);
    return items.length===1?items[0][0]:unique.length===1?unique[0][0]:'';
  }
  function check(doc,ctx,profile=null){
    const id=doc.print.library_id||'',view=views(ctx)[id],c=catalog(ctx);
    let reason='',members=null;
    if(!id)reason='Zielbibliothek noch nicht festgelegt.';
    else if(!usable(view))reason='Für diese Auswahl liegt keine verwendbare Bibliotheksliste vor.';
    else{
      if(!cache.has(view)){
        const valid=new Set(ctx.colors.map(c=>c.id));
        cache.set(view,view.ids.every(id=>Number.isInteger(id)&&valid.has(id))?new Set(view.ids):null);
      }
      members=cache.get(view);if(!members)reason='Die Bibliotheksliste enthält ungültige Referenzadressen.';
    }
    let profileMatch=profile?'UNVERIFIED':'NOT_LOADED';
    if(profile){
      const match=Object.entries(c?.profiles||{}).find(([,p])=>p.sha256===profile.sha256);
      if(id&&match&&c?.master_sha256===ctx.master&&c.libraries[id]?.profile_ids.includes(match[0]))profileMatch='NAMED_ASSOCIATION';
      else if(!reason)reason='Das geladene Profil ist dieser Bibliothek nicht nachweisbar zugeordnet.';
    }
    const rows=doc.colours.map(colour=>{const replacement=root.ATLAS_COLOUR_ADVICE?.active(colour,doc,ctx);return {reference_id:colour.reference_id,status:members?(members.has(colour.reference_id)?'FOUND':replacement&&members.has(replacement.reference_id)?'REPLACEMENT_FOUND':'NOT_FOUND'):'UNVERIFIED',...(colour.replacement?{replacement_reference_id:colour.replacement.reference_id,replacement_active:Boolean(replacement)}:{})};});
    const missing=rows.filter(r=>r.status==='NOT_FOUND').length;
    if(!reason&&missing)reason=`${missing} zugeordnete Referenz${missing===1?' fehlt':'en fehlen'} in der Zielbibliothek.`;
    const accepted=rows.length>0&&rows.every(r=>['FOUND','REPLACEMENT_FOUND'].includes(r.status))&&!reason;
    return {rule:RULE,library_id:id||null,library_name:view?.name||null,master_sha256:ctx.master,
      source_response_sha256:view?.source_response_sha256||null,source_note:view?.note||null,
      profile_sha256:profile?.sha256||null,profile_association:profileMatch,
      status:accepted?'ACCEPTED_FOR_LIBRARY':'NOT_ACCEPTED',reason:reason||(!rows.length?'Noch keine Kundenfarben ausgewählt.':''),rows,
      boundary:'Address membership only; not source/reference equality, ICC gamut proof or physical print approval.'};
  }
  function requireAccepted(doc,ctx,profile=null){const result=check(doc,ctx,profile);if(result.status!=='ACCEPTED_FOR_LIBRARY')throw Error('Farben nicht akzeptiert: '+result.reason);return result;}
  const rowLabel=row=>row?.status==='REPLACEMENT_FOUND'?'Bestätigte Ersatzfarbe in Bibliothek enthalten':row?.status==='FOUND'?'Referenz in Bibliothek enthalten':row?.status==='NOT_FOUND'?'Nicht akzeptiert · Referenz fehlt':'Noch nicht geprüft';
  root.ATLAS_LIBRARY_ACCEPTANCE={RULE,choices,suggestedLibrary,check,requireAccepted,rowLabel};
})(typeof window==='undefined'?globalThis:window);
