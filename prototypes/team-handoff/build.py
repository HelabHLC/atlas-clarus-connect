"""Build one offline HTML. No external requests/dependencies."""
from pathlib import Path
p=Path(__file__).resolve().parent
mods=[]
for f in sorted((p/'vendor').glob('*.js')):
    mods.append(repr('./'+f.stem)+':function(module,exports,require){\n'+f.read_text()+'\n}')
bundle="(function(){const m={"+','.join(mods)+"},c={};function req(n){if(!c[n]){const v=c[n]={exports:{}};m[n](v,v.exports,req);}return c[n].exports;}globalThis.ClarusQRCode=req('./index');})();"
html=(p/'index.template.html').read_text().replace('/*QR_BUNDLE*/',bundle).replace('/*CORE*/',(p/'core.js').read_text())
(p/'ATLAS_Clarus_Offline_Handoff.html').write_text(html)
print('Built standalone offline HTML')
