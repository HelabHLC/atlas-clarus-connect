"""Build a separate, non-deployable standalone preview after build.py; no release mutation."""
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
source=(ROOT/'dist/atlas-clarus-mischatlas/assets/mischatlas.html').read_text()
assert hashlib.sha256(source.encode()).hexdigest()=='6134657042cac978b5bf5a81be3e881cf2fbd27f5df52d990fab63b16d4c1fda', 'Build unchanged 0.1.5 first'
assert source.count('lcWorker.postMessage({samples,')==1
assert source.count('parts:p.model_parts}))});')==1
assert source.count("else if(m.type==='done'){lcResult=")==1
source=source.replace('lcWorker.postMessage({samples,', 'lcWorker.postMessage(mrCapture({samples,').replace('parts:p.model_parts}))});','parts:p.model_parts}))}));')
source=source.replace("else if(m.type==='done'){lcResult=","else if(m.type==='done'){mrCompletedJob=structuredClone(mrJob);lcResult=")
extra=''.join('<script>'+ (ROOT/n).read_text()+'</script>' for n in ['recipe-exchange.js','recipe-import-ui.js'])
preview=source.replace('</body>',extra+'</body>').replace('38-light experimental mixing · 0.1.5</title>', 'Recipe return import · DEVELOPMENT PREVIEW</title>')
assert re.search(r'<script id="data".*?</script>',source,re.S)[0]==re.search(r'<script id="data".*?</script>',preview,re.S)[0]
out=ROOT/'dist/recipe-import-preview';out.mkdir(exist_ok=True)
p=out/'atlas-clarus-mixing-recipe-import-preview.html';p.write_text(preview)
(out/'PREVIEW.json').write_text(json.dumps({'deployment_allowed':False,'release_base':'0.1.5','sha256':hashlib.sha256(p.read_bytes()).hexdigest()},indent=2)+'\n')
print(p)
