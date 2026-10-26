"""FOGRA58 ICC conversions, profile-bound RGB PDF and image comparisons; no deployment."""
import argparse,json,shutil,tempfile,zipfile,sys
from pathlib import Path
from build_textile_handoff import build as base_build,VERSION as BASE_VERSION,sha,once
from build_image_exchange_pilot import zip_tree
from build_lcms import worker_source
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc34.7-textile-conversion-preview'
def build(output):
 output=Path(output);output.mkdir(parents=True,exist_ok=True);dist=output/'atlas-clarus-browser-bundle'
 if dist.exists():raise ValueError('Choose a fresh output directory')
 with tempfile.TemporaryDirectory(prefix='atlas-textile-convert-') as tmp:
  archive=base_build(Path(tmp)/'handoff')
  with zipfile.ZipFile(archive) as z:z.extractall(output)
 html=(dist/'index.html').read_text().replace(BASE_VERSION,VERSION)
 for name in ['print-preview-ui.js']:
  old=(dist/'assets'/name).read_text();new=(HERE/'textile'/name).read_text();html=once(html,old,new);(dist/'assets'/name).write_text(new)
 new=(HERE/'textile/textile-reference-card.js').read_text();html=once(html,'<script>'+ (dist/'assets/print-ui.js').read_text(),'<script>'+new+'</script><script>'+(dist/'assets/print-ui.js').read_text());(dist/'assets/textile-reference-card.js').write_text(new)
 worker=worker_source();old=(HERE/'src/print-preview-worker.js').read_text();worker=once(worker,old,(HERE/'textile/print-preview-worker.js').read_text());(dist/'assets/lcms-worker.js').write_text(worker)
 start='<script type="application/json" id="atlas-print-worker-source">';i=html.index(start)+len(start);end=html.index('</script>',i);html=html[:i]+json.dumps(worker).replace('<','\\u003c')+html[end:]
 preview='''<article class="preview-comparison" data-preview-path="TEXTILE_RGB"><h3>PKL Full Reference ↔ FOGRA58 ICC preview</h3><div class="preview-pair"><figure><figcaption>Reference · PKL master sRGB</figcaption><canvas data-preview-original hidden aria-label="Fixed PKL reference image"></canvas></figure><figure><figcaption>After · FOGRA58 to sRGB round trip</figcaption><canvas data-preview-after hidden aria-label="FOGRA58 ICC preview"></canvas></figure></div><p data-preview-status role="status">Load an image to begin.</p><div class="preview-actions"><button data-preview-run disabled>Create FOGRA58 preview</button><button data-preview-save disabled>Save FOGRA58 B/A · PNG</button><button data-preview-metadata disabled>Save FOGRA58 preview details · JSON</button></div><p>Computational ICC round trip, not actual fabric reproduction. Final-profile gamut membership is not evaluated.</p></article>'''
 html=once(html,'        <p class="boundary">Controlled chain:',preview+'\n        <p class="boundary">Controlled chain:')
 html=html.replace('One source. One PKL reference. Two production previews.','One source. One PKL reference. Three ICC previews.').replace('Both ICC previews then use','All three ICC previews then use').replace('Create both previews','Create available previews').replace('Textile RGB values are not calculated.','FOGRA58 reference values and image round trips can be calculated locally.').replace('selected 4C or ECG output profile','selected 4C, ECG or FOGRA58 profile').replace('Both paths start from the same ATLAS references. Neither path receives the other path’s device values.','All three paths start from the same ATLAS references. No path receives another path’s device values.')
 (dist/'index.html').write_text(html)
 docs=dist/'docs/textile-handoff';shutil.copy2(docs/'README.md',docs/'HANDOFF-PROTOCOL.md');shutil.copy2(HERE/'TEXTILE_CONVERSION.md',docs/'README.md');shutil.copy2(HERE/'TEXTILE_CONVERSION.md',docs/'CONVERSION.md');shutil.copy2(HERE/'build_textile_conversion.py',docs/'build_textile_conversion.py')
 for name in ['textile_native_oracle.py','validate_textile_conversion.cjs','validate_textile_conversion_ui.cjs']:shutil.copy2(HERE/'tests'/name,docs/name)
 mpath=dist/'BUNDLE_MANIFEST.json';m=json.loads(mpath.read_text());m.update(version=VERSION,status='TEXTILE_CONVERSION_OFFLINE_PREVIEW',textile_conversion='AVAILABLE_ON_EXPLICIT_REQUEST',textile_reference_pdf='ICCBased_RGB_WITH_EXACT_PROFILE',textile_preview='SRGB_TO_FOGRA58_RGB16_TO_SRGB',textile_gamut_membership='NOT_EVALUATED',physical_textile_qc='NOT_MEASURED');mpath.write_text(json.dumps(m,indent=2)+'\n')
 (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
 archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-dir',type=Path,required=True);print(build(p.parse_args().output_dir.resolve()))
