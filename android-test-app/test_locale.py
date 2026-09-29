#!/usr/bin/env python3
"""Check that both offline language views retain identical reference data."""
from pathlib import Path
import json
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
ASSETS = HERE / 'app/src/main/assets/bundle'
de = (ASSETS / 'colour-id.html').read_text(encoding='utf-8')
en = (ASSETS / 'colour-id-en.html').read_text(encoding='utf-8')
assert de.count('class="tabbtn') == en.count('class="tabbtn') == 14
assert 'const language = "de";' in de and 'const language = "en";' in en
assert de.replace('const language = "de";', 'const language = "en";') == en
assert de.count('const ATLAS=') == en.count('const ATLAS=') == 1
for name, html in [('de', de), ('en', en)]:
    start = html.index('const ATLAS=') + len('const ATLAS=')
    rows = json.loads(html[start:html.index(';', start)])
    assert len(rows) == 13283 and rows[0][:4] == [0, 'H000_L095_C000', [240, 240, 240], '#F0F0F0']
    assert rows[-1][0] == 13282
    script = html[html.rfind('<script>') + len('<script>'):html.rfind('</script>')]
    with tempfile.TemporaryDirectory() as directory:
        file = Path(directory) / f'{name}-adapter.js'
        file.write_text(script, encoding='utf-8')
        subprocess.run(['node', '--check', str(file)], check=True)
assert len(json.loads((HERE / 'colour-id-en.json').read_text())) >= 180
print('PASS: 14 tabs and 13,283 identical identities in DE/EN; generated scripts parse')
