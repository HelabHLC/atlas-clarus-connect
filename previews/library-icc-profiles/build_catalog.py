"""Build reviewed library/profile associations from unmodified provider downloads."""
import argparse,json,hashlib,re,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
# Snapshot filter IDs, never the mutable IDs of the current website.
BINDINGS={184:'WAN-IFRAnewspaper26v5.icc',134:'ISOnewspaper26v4.icc',
126:'AdobeRGB1998.icc',187:'eciRGB_v2.icc',147:'PAL_SECAM.icc',196:'TextileRGB_FOGRA58_beta1_.icc',
148:'PSOcoated_v3.icc',167:'ISOcoated_v2_eci.icc',132:'ISOcoated_v2_300_eci.icc',140:'PSOuncoated_v3_FOGRA52.icc',139:'PSO_Uncoated_ISO12647_eci.icc',
156:'GRACoL2013_CRPC6.icc',155:'GRACoL2013UNC_CRPC3.icc',164:'SWOP2013C3_CRPC5.icc',
174:'PSO_INP_Paper_eci.icc',175:'PSO_LWC_Improved_eci.icc',176:'PSO_LWC_Standard_eci.icc',141:'PSO_MFC_Paper_eci.icc',177:'PSO_SNP_Paper_eci.icc',178:'PSOsc-b_paper_v3_FOGRA54.icc',
158:'PSR_LWC_PLUS_V2_PT.icc',179:'PSR_LWC_PLUS_V2_M1.icc',159:'PSR_LWC_STD_V2_PT.icc',180:'PSR_LWC_STD_V2_M1.icc',181:'PSR_MF_V2_M1.icc',160:'PSR_SC_PLUS_V2_PT.icc',182:'PSR_SC_PLUS_V2_M1.icc',161:'PSR_SC_STD_V2_PT.icc',183:'PSR_SC_STD_V2_M1.icc',162:'PSRgravureMF.icc',194:'SC_paper_eci.icc',185:'eciCMYK.icc',205:'eciCMYK_v2.icc',
149:'CGATS21_CRPC1.icc',150:'CGATS21_CRPC2.icc',151:'CGATS21_CRPC3.icc',189:'CGATS21_CRPC4.icc',152:'CGATS21_CRPC5.icc',153:'CGATS21_CRPC6.icc',154:'CGATS21_CRPC7.icc',
193:'PSO_Coated_NPscreen_ISO12647_eci.icc',142:'PSO_Uncoated_NPscreen_ISO12647_eci.icc',171:'PSO_Coated_300_NPscreen_ISO12647_eci.icc',172:'PSO_Coated_v2_300_Glossy_laminate_eci.icc',173:'PSO_Coated_v2_300_Matte_laminate_eci.icc',133:'ISOcoated.icc',146:'WebCoatedSWOP2006Grade3.icc',129:'CoatedFOGRA27.icc',130:'CoatedFOGRA39.icc',203:'ISOuncoated.icc',168:'ISOwebcoated.icc',169:'ISOuncoatedyellowish.icc',135:'JapanColor2001Coated.icc',136:'JapanColor2001Uncoated.icc',170:'JapanColor2002Newspaper.icc',137:'JapanColor2003WebCoated.icc',138:'JapanWebCoated.icc'}
NOTES={165:'Die GamutMap-Verknüpfung für C5 nennt fälschlich die C3-Datei. Kein C3-Profil als C5-Ersatz zugeordnet.',196:'Die Bibliothek heißt FOGRA58beta. Dieses Beta-Profil ist nur zur Dokumentation zugeordnet; der Druckweg akzeptiert ausschließlich das separate finale TextileRGB-Profil.',202:'CIELAB/HLC-Farbtabellen sind keine Geräteprofile. Für die Druckvorschau einen konkreten Ausgabeweg wählen.'}
PAGES={'duon.blob.core.windows.net':'https://duon.zendesk.com/hc/de/articles/15121935919004--DE-ICC-Profil-finden-und-herunterladen','druckerei-konstanz.de':'https://www.druckerei-konstanz.de/downloads/','eci.org':'https://eci.org/doku.php_id=de_downloads.html','fogra.org':'https://fogra.org/digitaler-textildruck','adobe.com':'https://www.adobe.com/support/downloads/iccprofiles/icc_eula_win_end.html','idealliancetaiwan.org':'https://www.idealliancetaiwan.org/okitsdownload'}
def build(download_results,atlas_data):
    records=json.loads(Path(download_results).read_text());all_profiles={}
    for r in records:
        if r['status']!='OK':continue
        for p in r['profiles']:
            # Prefer the contemporary 2009 package to the distinct 2004 yellowish variant.
            if p['file_name'] in all_profiles:continue
            all_profiles[p['file_name']]={**p,'source_url':r['url'],'archive_sha256':r['sha256'],'archive_name':Path(r['file']).name}
    data=json.loads(Path(atlas_data).read_text().split('=',1)[1].strip().rstrip(';'))
    source=json.loads((HERE.parents[1]/'process-libraries/GAMUTMAP_CATALOG.json').read_text());filters={x['filter_id']:x for x in source['filters']}
    profiles={}
    for name in sorted(set(BINDINGS.values())|{'TextileRGB_FOGRA58.icc','Ref-ECG-CMYKOGV_FOGRA55_TAC300.icc'}):
        p=all_profiles[name].copy();pid=re.sub(r'[^a-z0-9]+','_',name.lower()).strip('_');p['id']=pid
        p['beta']='beta' in name.lower();space=p['device_space'];path='4C' if space=='CMYK' else 'ECG' if space=='7CLR' else 'TEXTILE_RGB' if name=='TextileRGB_FOGRA58.icc' else None
        p['output_path']=path;p['role_label']='Druck-Ausgabeprofil' if path=='4C' else '7C-Austauschprofil' if path=='ECG' else 'Textiler RGB-Austauschfarbraum' if name.startswith('TextileRGB') else 'RGB-Arbeits-/Referenzprofil · kein Druck-Ausgabeprofil'
        p['source_page']=next((v for k,v in PAGES.items() if k in p['source_url']),p['source_url'])
        if path=='ECG':p['source_page']='https://fogra.org/forschen/medienvorstufe/mehrfarbendruck-13003'
        p['match_note']='Zuordnung anhand des Profilnamens bzw. der dokumentierten Farbraumvariante. Die Original-Profilbytes der GamutMap-Berechnung sind nicht verfügbar; Byteidentität mit dieser Berechnung ist nicht nachgewiesen.'
        p['public_bundle_allowed']=False
        p['delivery']='PROVIDER_ARCHIVE_IMPORT' if 'adobe.com' in p['source_url'] else 'PERSONAL_DOWNLOAD'
        p['printing_condition']=p['description'];profiles[pid]=p
    byname={p['file_name']:pid for pid,p in profiles.items()}
    libs={}
    for key,v in data['views'].items():
        ids=v.get('gamutmap_filter_ids',[]);filter_ids=[i for i in ids if i!=204]
        if key=='core':filter_ids=[204]
        profile_ids=[byname[BINDINGS[i]] for i in filter_ids if i in BINDINGS]
        hidden=v.get('hidden_from_new_selection',False)
        status='LEGACY_NO_PROFILE' if hidden else 'NO_SINGLE_PROFILE' if key=='core' or filter_ids==[202] else 'MULTIPLE_PROFILES' if len(profile_ids)>1 else 'NAMED_PROFILE' if profile_ids else 'UNRESOLVED'
        note='Profil zur benannten Druckbedingung. Die Eignung für deinen konkreten Druckauftrag muss bestätigt werden.'
        if status=='LEGACY_NO_PROFILE':note='Historische Farbzuordnung, für neue Auswahl ausgeblendet. Kein belegtes Geräteprofil zugeordnet.'
        elif key=='core':note='Die vollständige ATLAS-Referenz besitzt kein einzelnes Druckprofil. Wähle hier die geplante Druckbedingung.'
        elif status=='MULTIPLE_PROFILES':note='Gemeinsame Farbauswahl für FOGRA51 und FOGRA52. Zwei getrennte Druckbedingungen: das tatsächlich verwendete Profil auswählen.'
        elif status=='UNRESOLVED':note='Das genaue Originalprofil konnte bisher nicht verlässlich beschafft und geprüft werden. Keine automatische Ersatzzuordnung.'
        for fid in filter_ids:
            if fid in NOTES:note=NOTES[fid]
        if filter_ids==[196]:status='BETA_REFERENCE_ONLY'
        libs[key]={'name':v['name'],'status':status,'profile_ids':profile_ids,'note':note,'hidden':hidden,'filter_ids':filter_ids,'historical':v.get('historical',False)}
    for key,name,title in [('exchange_fogra55','Ref-ECG-CMYKOGV_FOGRA55_TAC300.icc','Zusätzlicher Ausgabeweg · FOGRA55 CMYKOGV'),('exchange_fogra58_final','TextileRGB_FOGRA58.icc','Zusätzlicher Ausgabeweg · FOGRA58 final')]:
        libs[key]={'name':title,'status':'EXCHANGE_PROFILE','profile_ids':[byname[name]],'note':'Austauschfarbraum, kein spezifisches Drucker-/Materialprofil und keine neue ATLAS-Gamutbibliothek. Bestehende Bibliotheksdaten bleiben unverändert.','hidden':False,'filter_ids':[],'historical':False}
    catalog={'schema':'ATLAS_LIBRARY_ICC_CATALOG_V1','date':'2026-11-03','master_sha256':data['master_sha256'],'source_snapshot_date':source['captured_date'],'original_gamutmap_profile_bytes_verified':False,'profiles':profiles,'libraries':libs,'source_filters':[{**f,'profile_id':byname.get(BINDINGS.get(f['filter_id']))} for f in source['filters']]}
    (HERE/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    (HERE/'profile-catalog.js').write_text('window.ATLAS_ICC_CATALOG='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
    report=['# ICC-Zuordnung · Browser Edition und Startup Colour Kit','', 'Stand: 03.11.2026. Originalwerte und Bibliotheksmitgliedschaften bleiben unverändert. Namenszuordnung ist kein Nachweis, dass GamutMap dieselben Profilbytes benutzt hat.','', '| Bibliothek | Status | ICC-Datei |','|---|---|---|']
    for k,v in libs.items():report.append('| '+v['name']+' | '+v['status']+' | '+('<br>'.join(profiles[p]['file_name'] for p in v['profile_ids']) or '—')+' |')
    (HERE/'ZUORDNUNG.md').write_text('\n'.join(report)+'\n')
    print(json.dumps({'profiles':len(profiles),'mapped_visible_libraries':sum(bool(v['profile_ids']) and not v['hidden'] and not k.startswith('exchange_') for k,v in libs.items()),'unresolved':[v['name'] for v in libs.values() if v['status']=='UNRESOLVED'],'all_views':len(data['views'])},ensure_ascii=False,indent=2))
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--downloads',required=True);a.add_argument('--atlas-data',required=True);args=a.parse_args();build(args.downloads,args.atlas_data)
