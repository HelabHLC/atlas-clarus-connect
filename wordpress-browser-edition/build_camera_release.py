"""Wrap the complete camera edition using the existing guarded RC34.4 installer."""
import argparse, hashlib, json, re, sys, tempfile, zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
REPO=HERE.parent
sys.path.insert(0,str(REPO/'browser-bundle'))
from build_image_exchange_pilot import zip_tree
from build_plugin import build

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def literal(v):
    if type(v) is bool: return 'true' if v else 'false'
    if type(v) is int: return str(v)
    return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
def package(candidate, base, out):
    out.mkdir(parents=True,exist_ok=True)
    pin=(REPO/'downloads/rc34.4/ATLAS_Clarus_Browser_Edition_v0.1.16-beta2_RC34.4.zip.sha256').read_text().split()[0]
    assert sha(base)==pin
    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        with zipfile.ZipFile(candidate) as z: z.extractall(td)
        dist=td/'atlas-clarus-browser-bundle'
        manifest=dist/'BUNDLE_MANIFEST.json';m=json.loads(manifest.read_text())
        assert m['version']=='0.2.0-rc34.5-live-camera'
        m.update(status='LIVE_CAMERA_PUBLIC_BETA_DEVICE_QA_PENDING',deployment_allowed=True)
        manifest.write_text(json.dumps(m,indent=2)+'\n')
        (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
        bundle=out/'ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.5-live-camera.zip';zip_tree(dist,bundle)
        with zipfile.ZipFile(base) as z:
            php=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
            index=z.read('atlas-clarus-browser-edition/index.php')
        php=php.replace('0.1.16-beta2','0.1.16-beta3').replace('0.2.0-rc34.4-reference-libraries','0.2.0-rc34.5-live-camera').replace('RC34.4','RC34.5')
        php=re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',php,count=1)
        php=re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256 = '{sha(bundle)}';",php,count=1)
        a=php.index('$expected = array(')+len('$expected = array(');b=php.index(');',a)
        php=php[:a]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in m.items() if type(v) in (bool,int,str))+'        '+php[b:]
        php=php.replace('<h2>Referenzbibliotheken RC34.5</h2>','<h2>Live-Kamera RC34.5 · öffentliche Beta</h2><p>Live-Kamera an den Bildeingaben: Fixieren und Übernehmen, PNG und Auswahl-JSON getrennt speichern. HTTPS und Kamerafreigabe erforderlich. Smartphone-Browser-Abnahme steht noch aus. Kamera-Schätzung, keine physische Farbmessung.</p><h2>Referenzbibliotheken RC34.5</h2>')
        stage=td/'source';stage.mkdir();(stage/'atlas-clarus-browser-edition.php').write_text(php);(stage/'index.php').write_bytes(index)
        (stage/'readme.txt').write_text('ATLAS Clarus Browser Edition 0.1.16-beta3\nRC34.5 public camera beta. Physical smartphone browser acceptance pending. Guarded activation retains previous runtime for rollback.\n')
        (REPO/'browser-bundle/manifest-rc34.5.json').write_text(json.dumps(m,indent=2)+'\n')
        wp=build(bundle,out,source=stage,archive_name='ATLAS_Clarus_Browser_Edition_v0.1.16-beta3_RC34.5.zip')
        print(json.dumps({'plugin':str(wp),'bundle_sha256':sha(bundle),'plugin_sha256':sha(wp)}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--base',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);a=p.parse_args();package(a.candidate,a.base,a.output_dir)
