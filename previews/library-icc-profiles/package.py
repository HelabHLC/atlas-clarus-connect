"""Overlay reviewed ICC associations on the pinned RC34.11 + Startup Kit.
No binary profiles are included in the source repository. Personal-use profiles
are read from verified original provider downloads passed with --downloads.
"""
import argparse,base64,hashlib,importlib.util,json,shutil,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()
def build(base,out,downloads):
    spec=importlib.util.spec_from_file_location('startup_package',HERE.parent/'startup-colour-kit/package.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    mod.build(base,out);root=out/mod.PREFIX
    before={str(p.relative_to(root)):sha(p.read_bytes()) for p in root.rglob('*') if p.is_file()}
    oldui=(root/'assets/print-ui.js').read_text();newui=(REPO/'browser-bundle/textile/print-ui.js').read_text()
    html=(root/'index.html').read_text();assert html.count(oldui.strip())==1
    html=html.replace(oldui.strip(),newui.strip())
    (root/'assets/print-ui.js').write_text(newui)
    icc=root/'icc';icc.mkdir()
    for n in ['profile-catalog.js','catalog.json','profile-library.js','profile-library.css','ZUORDNUNG.md']:(icc/n).write_bytes((HERE/n).read_bytes())
    (icc/'browser-entry.js').write_bytes((HERE/'browser-entry.js').read_bytes())
    bank={};catalog=json.loads((HERE/'catalog.json').read_text());records=json.loads(downloads.read_text()) if downloads else []
    sources={r['sha256']:r for r in records if r['status']=='OK'}
    (icc/'profile-data').mkdir();(icc/'provider-notices').mkdir()
    copied=set()
    for pid,p in catalog['profiles'].items():
        if p['delivery']!='PERSONAL_DOWNLOAD' or p['archive_sha256'] not in sources:continue
        r=sources[p['archive_sha256']];archive=Path(r['file']);raw=archive.read_bytes();assert sha(raw)==p['archive_sha256']
        if zipfile.is_zipfile(archive):
            with zipfile.ZipFile(archive) as z:b=z.read(p['member'])
        else:b=raw
        assert sha(b)==p['sha256'] and len(b)==p['bytes']
        bank[pid]=True
        (icc/'profile-data'/(pid+'.js')).write_text('window.ATLAS_ICC_PROFILE_BANK['+json.dumps(pid)+']='+json.dumps(base64.b64encode(b).decode())+';\n')
        if archive.name not in copied and zipfile.is_zipfile(archive):
            with zipfile.ZipFile(archive) as z:
                for member in z.namelist():
                    if Path(member).suffix.lower() in {'.pdf','.txt','.rtf'} and not member.startswith('__MACOSX/') and not Path(member).name.startswith('._'):
                        dest=icc/'provider-notices'/archive.stem/Path(member).name;dest.parent.mkdir(exist_ok=True);dest.write_bytes(z.read(member))
            copied.add(archive.name)
    (icc/'profile-bank.js').write_text('/* Personal profile downloads; no public redistribution clearance. */\nwindow.ATLAS_ICC_PROFILE_BANK={};window.ATLAS_ICC_INSTALLED='+json.dumps(list(bank))+';window.ATLAS_ICC_DATA_BASE=new URL("profile-data/",document.currentScript.src).href;\n')
    tags='<link rel="stylesheet" href="icc/profile-library.css">\n'+''.join(f'<script src="icc/{n}"></script>\n' for n in ['profile-catalog.js','profile-bank.js','profile-library.js','browser-entry.js'])
    pos=html.rfind('</body>');assert pos>0;html=html[:pos]+tags+html[pos:];(root/'index.html').write_text(html)
    kit=root/'startup/index.html';kh=kit.read_text();kh=kh.replace('<script src="app.js"></script>','<link rel="stylesheet" href="../icc/profile-library.css">\n'+''.join(f'<script src="../icc/{n}"></script>\n' for n in ['profile-catalog.js','profile-bank.js','profile-library.js'])+'<script src="app.js"></script>');kit.write_text(kh)
    (root/'START_HERE.html').write_text('''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ATLAS Clarus · ICC-Testpaket</title><style>body{font:18px/1.6 system-ui;max-width:780px;margin:60px auto;padding:20px;background:#f8f6ef;color:#173c45}a{color:#176860}li{margin:18px 0}</style><h1>ATLAS Clarus · ICC-Profile</h1><p>Browser Edition und Startup Colour Kit mit gemeinsamer Profilzuordnung.</p><ol><li><a href="startup/index.html">Startup Colour Kit öffnen</a></li><li><a href="index.html">Browser Edition öffnen</a></li></ol><p>Wähle „Profil zur Bibliothek“, anschließend die Druckbedingung und „Für Druckvorbereitung übernehmen“. Material ergänzen und B/A neu berechnen.</p><p>Die ZIP zuerst vollständig entpacken. Alle Bestandteile zusammen im Ordner lassen.</p><p>Adobe-Profile werden separat vom Anbieter bereitgestellt: Originalarchiv entpacken, dann die ICC-Dateien über „Vorhandene ICC-Dateien zuordnen“ laden. Diese Zuordnung gilt für die laufende Sitzung; geladene Ausgabeprofile werden mit der Farbmappe gespeichert.</p><p><a href="icc/ZUORDNUNG.md">Vollständige Zuordnung</a> · <a href="ICC_README.txt">Hinweise zum Testpaket</a></p></html>''')
    manifest={'version':'0.1.1-icc-preview.1','status':'PERSONAL_TEST_PACKAGE','public_deployment':False,'master_sha256':catalog['master_sha256'],'baseline_archive_sha256':mod.BASE_SHA,'profile_catalog_sha256':sha((icc/'catalog.json').read_bytes()),'profiles_catalogued':len(catalog['profiles']),'profiles_installed':len(bank),'adobe_profiles':'SEPARATE_ORIGINAL_ARCHIVE_IMPORT','original_gamutmap_profile_bytes_verified':False,'changed_baseline_files':['index.html','assets/print-ui.js'],'ICC_ENGINE':'UNCHANGED','physical_proof':'NOT_PERFORMED','public_redistribution_clearance':False}
    (root/'ICC_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (root/'ICC_README.txt').write_text(f'''ATLAS Clarus · ICC-Testpaket 0.1.1\n\n{len(catalog['profiles'])} Profile im Katalog; {len(bank)} persönliche Originaldownloads im Paket.\nDie öffentliche Quellversion enthält nur Zuordnung, Bezugsquellen und Prüfsummen.\nDieses persönliche Testpaket ist keine Freigabe zur öffentlichen Weiterverteilung fremder Profile. Profil-Copyrights und Anbieterhinweise sind erhalten. Die Originalarchive und ihre Prüfsummen sind im Katalog angegeben. Jede installierte ICC-Datei kann über „ICC-Datei speichern“ unverändert heruntergeladen werden. Adobe-Profile separat aus dem unveränderten Anbieterarchiv importieren.\n\nBibliotheken sind gefilterte ATLAS-Referenzen. Kein Profil wird als Ersatz für Original-RGB oder feste Masterwerte eingesetzt. Zuordnung erfolgt anhand benannter Profile und Varianten; Byteidentität mit den ursprünglich bei GamutMap benutzten Profilen ist nicht nachgewiesen.\nFOGRA51/52 common bietet zwei getrennte Profile. FOGRA58-Beta bleibt zur Dokumentation getrennt vom finalen FOGRA58-Ausgabeweg. RGB-Arbeitsprofile lassen sich speichern, aber nicht als CMYK-Druckprofil übernehmen.\n\nVollständig entpacken, START_HERE.html öffnen. In beiden Anwendungen: Bibliothek wählen, Profil übernehmen, Material und Intent prüfen, B/A neu berechnen. Ein berechneter Vergleich ist kein gemessener Freigabe-Proof.\n''')
    changed=[n for n,h in before.items() if sha((root/n).read_bytes())!=h]
    assert set(changed)=={'index.html','assets/print-ui.js','startup/index.html','START_HERE.html'},changed
    names=sorted(str(p.relative_to(root)) for p in root.rglob('*') if p.is_file())
    (root/'SHA256SUMS.txt').write_text(''.join(sha((root/n).read_bytes())+'  '+n+'\n' for n in names if n!='SHA256SUMS.txt'))
    # The intermediate unmodified kit ZIP is not a deliverable of this build.
    for n in ['ATLAS_Clarus_Startup_Colour_Kit_0.1_Preview.zip','ATLAS_Clarus_Startup_Colour_Kit_0.1_Preview.zip.sha256']:(out/n).unlink()
    target=out/'ATLAS_Clarus_Browser_Startup_ICC_Testpaket_0.1.1.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for n in names:
            info=zipfile.ZipInfo(mod.PREFIX+'/'+n,(2026,11,3,0,0,0));info.create_system=3;info.external_attr=0o100644<<16;z.writestr(info,(root/n).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    result={**manifest,'zip':str(target),'sha256':sha(target.read_bytes()),'bytes':target.stat().st_size,'unchanged_runtime_files':len(before)-len(changed)-1}
    (out/'build-info.json').write_text(json.dumps(result,indent=2)+'\n');target.with_suffix('.zip.sha256').write_text(result['sha256']+'  '+target.name+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--base',required=True,type=Path);a.add_argument('--output-dir',required=True,type=Path);a.add_argument('--downloads',type=Path);args=a.parse_args();build(args.base,args.output_dir,args.downloads)
