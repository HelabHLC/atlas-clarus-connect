"""Add server-rendered, text-only canvas help; preserve embedded runtime byte-for-byte."""
from pathlib import Path
import zipfile,hashlib,io,json,subprocess
ROOT=Path(__file__).resolve().parents[2]
base=ROOT/'downloads/rc33.8/ATLAS_Clarus_Browser_Edition_v0.1.15-beta17_RC33.8.zip'
expected=(base.with_name(base.name+'.sha256')).read_text().split()[0]
assert hashlib.sha256(base.read_bytes()).hexdigest()==expected
with zipfile.ZipFile(base) as z: files={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
name='atlas-clarus-browser-edition/atlas-clarus-browser-edition.php'
s=files[name].decode();s=s.replace('0.1.15-beta17','0.1.15-beta17.1')
needle='            $html = self::inject_canvas_exit_button( $html );'
assert s.count(needle)==1
s=s.replace(needle,needle+'\n            $html = self::inject_exchange_help( $html );')
method=(Path(__file__).parent/'inject-help.php').read_text()
needle='    public static function serve_runtime_file() {'
assert s.count(needle)==1;s=s.replace(needle,method+'\n'+needle)
files[name]=s.encode()
# All other files, including bundled application and master, remain byte-identical.
with zipfile.ZipFile(base) as z:
 assert all(files[n]==z.read(n) for n in files if n!=name)
out=ROOT/'downloads/exchange-help';out.mkdir(exist_ok=True)
zip_path=out/'ATLAS_Clarus_Browser_Edition_0.1.15-beta17.1_help.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,b in files.items():z.writestr(n,b)
with zipfile.ZipFile(zip_path) as z:assert z.testzip() is None
(out/'SHA256SUMS.txt').write_text(hashlib.sha256(zip_path.read_bytes()).hexdigest()+'  '+zip_path.name+'\n')
Path('/tmp/atlas-browser-help.php').write_text(s)
subprocess.run(['php','-l','/tmp/atlas-browser-help.php'],check=True)
print(json.dumps({'status':'PASS','version':'0.1.15-beta17.1','only_changed_file':name,'embedded_runtime_unchanged':True,'zip':str(zip_path)}))
