#!/usr/bin/env python3
"""Scoped v0.4.1 source/Node checks; no WordPress or physical acceptance."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
APS = ROOT / "appearance-pixel-simulator"
BASE = "2f8b76dc706509801fb65b22ebd72844d8eb97d9"
RELEASE = "48e8e315202fda5ed0a6a851a618dbaa55a2b480"
MASTER = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
PIN = "562a133e965766dc199d753391c9ec2db7bf091793b5358e6604ab22bc96e9db"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def historical(ref, path):
    return git("show", f"{ref}:appearance-pixel-simulator/{path}")


def check(condition, message):
    if not condition:
        raise AssertionError(message)


payload = (APS / "assets/name-search/atlas-name-search-index-v1.json.gz").read_bytes()
php = (APS / "atlas-clarus-appearance-pixel-simulator.php").read_text()
check(hashlib.sha256(payload).hexdigest() == PIN, "compressed index digest")
check(f"'ATLAS_CLARUS_APS_NAME_INDEX_SHA256', '{PIN}'" in php, "plugin digest pin")
check(payload == (ROOT / "name-search/atlas-name-search-index-v1.json.gz").read_bytes(), "shared copy")
doc = json.loads(gzip.decompress(payload))
old = json.loads(gzip.decompress(historical(BASE, "assets/name-search/atlas-name-search-index-v1.json.gz")))
designer_bytes = (ROOT / "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json").read_bytes()
check(hashlib.sha256(designer_bytes).hexdigest() == doc["source_designer_layer_sha256"] ==
      "c7736a98bbaf6ddd8c50942ef11ab45200b43736f9e1ebf7480988b03a8293d2", "independent identity metadata pin")
designer = json.loads(designer_bytes)
tone_bytes = (ROOT / "designer-layer/ATLAS_Clarus_Tone_System_v0_1.json").read_bytes()
check(hashlib.sha256(tone_bytes).hexdigest() == doc["source_tone_system_sha256"], "tone provenance")
tone = json.loads(tone_bytes)
check(doc["master_sha256"] == old["master_sha256"] == designer["source_master"]["sha256"] == MASTER, "master binding")
check(doc["entry_count"] == len(doc["records"]) == len(old["records"]) == len(designer["records"]) == len(tone["records"]) == 13283, "row counts")
for i, (row, previous, metadata, named) in enumerate(zip(doc["records"], old["records"], designer["records"], tone["records"])):
    check(row["i"] == previous["i"] == metadata["atlas_row_id"] == named["i"] == i, "row ID")
    check(row["r"] == previous["r"] == metadata["reference"] == named["r"], "HLC binding")
    check(row["d"] == named["n"], "tone display")
check(len({r["r"] for r in doc["records"]}) == 13283, "unique references")
print("PASS: index hash/pin/shared copy; all 13,283 row-ID/HLC/tone bindings")

source = (APS / "assets/js/simulator.js").read_text()
before = historical(BASE, "assets/js/simulator.js").decode()
display_change = "      const selectedName = state.nameIndex.get(row[0]);\n      outputs.pkl.textContent = selectedName ? selectedName.d + ' · ' + row[1] : row[1];"
check(source.replace(display_change, "      outputs.pkl.textContent = row[1];", 1) == before, "only display changes in JS")
check(source.encode() == historical(RELEASE, "assets/js/simulator.js"), "release JS unchanged at audited HEAD")
before_php = historical(BASE, "atlas-clarus-appearance-pixel-simulator.php").decode()
old_pin = hashlib.sha256(historical(BASE, "assets/name-search/atlas-name-search-index-v1.json.gz")).hexdigest()
check(php.replace("0.4.1", "0.4.0").replace(PIN, old_pin) == before_php, "PHP changes only version/hash")
check("Version: 0.4.1" in php and "'ATLAS_CLARUS_APS_VERSION', '0.4.1'" in php, "plugin version")
check("Stable tag: 0.4.1" in (APS / "readme.txt").read_text() and "**v0.4.1" in (APS / "README.md").read_text(), "documentation versions")
for path in git("ls-tree", "-r", "--name-only", BASE, "appearance-pixel-simulator").decode().splitlines():
    relative = path.removeprefix("appearance-pixel-simulator/")
    if relative in {"README.md", "readme.txt", "VALIDATION.md", "assets/js/simulator.js", "atlas-clarus-appearance-pixel-simulator.php", "assets/name-search/atlas-name-search-index-v1.json.gz"}:
        continue
    check((ROOT / path).read_bytes() == historical(BASE, relative), f"unchanged {relative}")
manifest_bytes = (APS / "assets/master/master-manifest.json").read_bytes()
check(hashlib.sha256(manifest_bytes).hexdigest() == "561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec", "projection manifest")
check(json.loads(manifest_bytes)["source_master_sha256"] == MASTER, "projection source pin")
print("PASS: version markers; normalized JS/PHP equality; unchanged tracked projection/CIE/APF/renderer sources")

# Execute the actual shipped function bodies with a minimal DOM double.
# Identity rows come from the pinned pre-0.4.1 index; HEX is a fixture here.
def function(name, following):
    return source.split(f"    function {name}(", 1)[1].split(f"    function {following}(", 1)[0]

update = "function updateOutputs(" + function("updateOutputs", "populateResults")
search = "function populateResults(" + function("populateResults", "selectedMasterRecord")
gates = source.split("      if (nameDocument.schema", 1)[1].split("      state.numeric =", 1)[0]
node = r'''
const assert = require('node:assert/strict');
const input = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const rows = input.old.records.map(r => [r.i, r.r, '#76CD27']);
const state = {index: {rows}, nameIndex: new Map(), selectedRowId: 4665, cells: [], selectedX: 0, selectedY: 0};
const root = {dataset: {masterSha256: input.master}, querySelector: () => ({style: {setProperty(){}}})};
function bind(nameDocument) { __GATES__ }
bind(input.doc);
for (const mutate of [d=>d.schema='wrong', d=>d.master_sha256='wrong', d=>d.entry_count=13282,
 d=>d.records.pop(), d=>d.records[1].i=0, d=>d.records[0].r='H000_L000_C000']) {
 const d = structuredClone(input.doc); mutate(d); assert.throws(()=>bind(d));
}
bind(input.doc);
const outputs = new Proxy({}, {get: (o,k) => o[k] ||= {textContent: ''}});
let options;
const controls = {angle:{value:'0'},gloss:{value:'0'},depth:{value:'0'},wavelength:{value:'550'},
 material:{value:'paper'},finish:{value:'matte'},effect:{value:'none'},map:{value:'identity'},
 'master-row':{replaceChildren(...v){options=v}}};
const document = {createElement: () => ({})};
const materials={paper:{label:'paper'}},finishes={matte:{label:'matte'}},effects={none:{label:'none'}},mapLabels={identity:'Frozen identity'};
const identity=()=>rows[state.selectedRowId],baseRgb=()=>[118,205,39],numericValue=()=>0,
 masterDiagnostics=()=>({scenario:'D50'}),spectralAppearance=()=>({}),formatNumber=(v,n)=>v.toFixed(n);
__UPDATE__
__SEARCH__
for(const record of input.doc.records) {
 state.selectedRowId=record.i; updateOutputs();
 assert.equal(outputs.pkl.textContent, record.d+' · '+record.r);
 assert.ok(outputs.identity.textContent.includes('source_atlas_row_id '+record.i+' · Lab'));
}
state.selectedRowId=4665; state.nameIndex.delete(4665); updateOutputs();
assert.equal(outputs.pkl.textContent,'H125_L075_C080'); bind(input.doc);
for(const query of ['ATLAS Deep Forest Green','ATLAS Neutral 50','H125_L075_C080','4665']) {
 populateResults(query); assert.ok(options.some(o=>o.textContent.includes(query)),query);
 for(const o of options) {const r=input.doc.records[Number(o.value)]; assert.ok(o.textContent.includes(r.d+' · '+r.r));}
}
console.log('PASS: shipped JS gates reject six invalid bindings; 13,283 name/HLC displays; HLC fallback; tone/neutral/HLC/row-ID search');
'''.replace("__GATES__", "if (nameDocument.schema" + gates).replace("__UPDATE__", update).replace("__SEARCH__", search)
subprocess.run(["node", "-e", node], input=json.dumps({"doc": doc, "old": old, "master": MASTER}), text=True, check=True)
subprocess.run(["node", "--check", str(APS / "assets/js/simulator.js")], check=True)
print("PASS: JavaScript syntax; no live WordPress, full browser, ZIP rebuild or physical test performed")
