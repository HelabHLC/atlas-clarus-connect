"""Build the separate RC36.2 WordPress test plugin; never deploy or publish."""
import argparse, hashlib, json, re, zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
def sha(data):return hashlib.sha256(data).hexdigest()
def write_zip(path,files):
    with zipfile.ZipFile(path,'w') as z:
        for n,b in sorted(files.items()):
            info=zipfile.ZipInfo(n,(2026,11,28,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            z.writestr(info,b,compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
def main():
    p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    a.out.mkdir(parents=True,exist_ok=False)
    files={x.relative_to(a.candidate).as_posix():x.read_bytes() for x in a.candidate.rglob('*') if x.is_file()}
    actual={n:sha(b) for n,b in files.items() if n!='SHA256SUMS.txt'}
    listed=dict((n,h) for h,n in (l.split('  ',1) for l in files['SHA256SUMS.txt'].decode().splitlines()))
    if actual!=listed or len(actual)!=330:raise ValueError('Unverified RC36.2 candidate')
    m=json.loads(files['BUNDLE_MANIFEST.json'])
    if m['status']!='RC36_2_TEST_ONLY' or m['master_rows']!=13283 or m['deployment_allowed'] is not False:raise ValueError('Unexpected candidate')
    storage=(HERE/'storage-isolation.js').read_text()
    for n in ('index.html','startup/index.html','multi/index.html','START_HERE.html'):
        s=files[n].decode();match=re.search(r'<head(?:\s[^>]*)?>',s,re.I)
        if not match:raise ValueError('Missing actual document head '+n)
        i=match.end();files[n]=(s[:i]+'<script>\n'+storage+'\n</script>'+s[i:]).encode()
    m.update(status='RC36_2_IONOS_ADMIN_TEST',storage_namespace='atlas-rc36-test::',deployment_allowed=False,staging_only=True)
    files['BUNDLE_MANIFEST.json']=(json.dumps(m,indent=2)+'\n').encode()
    files['SHA256SUMS.txt']=''.join(sha(b)+'  '+n+'\n' for n,b in sorted(files.items()) if n!='SHA256SUMS.txt').encode()
    if sha(files['assets/atlas-data.js'])!=actual['assets/atlas-data.js']:raise ValueError('Master changed')
    if any(not re.fullmatch(r'[A-Za-z0-9_./-]+',n) or '..' in n.split('/') or n.lower().endswith(('.icc','.icm','.php','.phtml','.phar')) for n in files):raise ValueError('Forbidden staging path')
    runtime=a.out/'rc36-2-test.zip';write_zip(runtime,files)
    fingerprint=sha(runtime.read_bytes())
    php=(HERE/'installer.php.in').read_text().replace('@BUNDLE_SHA@',fingerprint).replace('@BUNDLE_SIZE@',str(runtime.stat().st_size)).replace('@BUNDLE_FILES@',str(len(files)-1))
    slug='atlas-clarus-rc36-test'
    plugin=a.out/'ATLAS_Clarus_RC36.2_IONOS_Test_Installer.zip'
    readme='RC36.2 administrative test only. Install as a new WordPress plugin; activate plugin; Tools > ATLAS Clarus RC36.2 Test > verify and enable. The independent route is /atlas-clarus-rc36-test/. Disable the test from Tools or deactivate this plugin. The production plugin, runtime options and master data are not changed. Test storage uses a dedicated namespace. The bundled archive contains public candidate assets, not private or user files. No physical proof or production approval.\n'
    write_zip(plugin,{slug+'/'+slug+'.php':php.encode(),slug+'/runtime/rc36-2-test.zip':runtime.read_bytes(),slug+'/readme.txt':readme.encode()})
    (a.out/(plugin.name+'.sha256')).write_text(sha(plugin.read_bytes())+'  '+plugin.name+'\n')
    (a.out/'build-report.json').write_text(json.dumps({'status':'PREPARED_NOT_DEPLOYED','runtime_sha256':fingerprint,'runtime_files':len(files)-1,'installer_sha256':sha(plugin.read_bytes()),'installer_bytes':plugin.stat().st_size,'master_asset_unchanged':True,'route':'/atlas-clarus-rc36-test/','option':'atlas_clarus_rc36_test_active_sha256','storage_prefix':'atlas-rc36-test::'},indent=2)+'\n')
    print((a.out/'build-report.json').read_text())
if __name__=='__main__':main()
