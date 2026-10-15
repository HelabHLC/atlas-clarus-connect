"""Prove preview promotion changes metadata only and preserves native installer."""
import hashlib,io,json,re,sys,zipfile
from pathlib import Path
wp,bundle,preview=map(Path,sys.argv[1:])
def files(p):
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  return {n.split('/',1)[1]:z.read(n) for n in z.namelist()}
a,b=files(preview),files(bundle)
assert a.keys()==b.keys()
assert {n for n in a if a[n]!=b[n]}=={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt'}
assert a['index.html'].replace(b'0.2.0-rc33.4.1-reference-label-preview',b'0.2.0-rc33.5-original-area-protection')==b['index.html']
x,y=map(json.loads,(a['BUNDLE_MANIFEST.json'],b['BUNDLE_MANIFEST.json']))
assert x['deployment_allowed'] is False and y['deployment_allowed'] is True
assert {k for k in x if x[k]!=y[k]}=={'version','status','deployment_allowed'}
w=files(wp);assert w['assets/bundle.zip']==bundle.read_bytes()
base=Path(__file__).resolve().parents[2]/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip'
s=files(base)['atlas-clarus-browser-edition.php'].decode();t=w['atlas-clarus-browser-edition.php'].decode()
s=s.replace('RC32.1','RC33.5')
# Preserve installer and rollback implementation; only pinned manifest differs.
for name,end in [('handle_install_request',None),('handle_rollback_request',None),('install_bundle',None)]:
 pattern=r'(?:public|private) static function '+name+r'\('
 start=re.search(pattern,s).start(); start2=re.search(pattern,t).start()
 def extract(text,pos):
  begin=text.index('{',pos);depth=1;i=begin+1
  while depth:
   depth+=(text[i]=='{')-(text[i]=='}');i+=1
  return text[pos:i]
 assert extract(s,start)==extract(t,start2),name
print('PASS preview metadata-only promotion, all runtime/master files identical, embedded ZIP exact, installer and rollback unchanged')
