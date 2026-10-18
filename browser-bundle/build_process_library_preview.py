"""Add process libraries and retain legacy replay on the unchanged RC34.1 tool-exchange build."""
import argparse,hashlib,json,shutil,tempfile
from pathlib import Path
from build_tool_exchange_preview import build as base_build,VERSION as BASE_VERSION
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
REPO=HERE.parent
VERSION='0.2.0-rc34.2-process-libraries-preview'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def once(text,old,new):
    assert text.count(old)==1,old[:100]
    return text.replace(old,new,1)
def build(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='atlas-process-') as tmp:
        base_build(Path(tmp))
        dist=output/'atlas-clarus-browser-bundle'
        if dist.exists():shutil.rmtree(dist)
        shutil.copytree(Path(tmp)/dist.name,dist)
    html=(dist/'index.html').read_text()
    data_path=dist/'assets/atlas-data.js';old=data_path.read_text()
    prefix='window.ATLAS_CLARUS_DATA=';assert old.startswith(prefix)
    data=json.loads(old[len(prefix):].strip().removesuffix(';'))
    master=json.loads((REPO/'hover-library/data/colors.json').read_text())
    assert data['colors']==master['colors'] and data['master_sha256']==master['master_sha256']
    views=json.loads((REPO/'hover-library/data/views.json').read_text())
    baseline=json.loads((REPO/'process-libraries/legacy-view-baseline.json').read_text())
    for key,legacy in baseline.items():
        assert data['views'][key]==legacy
        assert all(views['views'][key][field]==value for field,value in legacy.items())
    data['views']=views['views']
    new=prefix+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';\n'
    html=once(html,old,new);data_path.write_text(new)
    policy=(HERE/'src/library-visibility.js').read_text()
    # Load policy before the first consumer, without changing pinned baseline sources.
    app_path=dist/'assets/app.js';old=app_path.read_text()
    app=once(old,'Object.entries(libraryViews).forEach(([key,v])=>','window.ATLAS_LIBRARY_VISIBILITY.visibleEntries(libraryViews).forEach(([key,v])=>')
    html=once(html,'<script>'+old,'<script>'+policy+'</script><script>'+app);app_path.write_text(app)
    job_path=dist/'assets/reduction-job-ui.js';old=job_path.read_text()
    job=once(old,'for(const [id,v]of Object.entries(libraryViews))','for(const [id,v]of root.ATLAS_LIBRARY_VISIBILITY.visibleEntries(libraryViews))')
    job=once(job,"const s=restored.settings;$('cr-protection-mode').value=s.protectionMode;$('cr-library').value=s.libraryId;", "const s=restored.settings;root.ATLAS_LIBRARY_VISIBILITY.ensureRestoredOption($('cr-library'),libraryViews,s.libraryId);$('cr-protection-mode').value=s.protectionMode;$('cr-library').value=s.libraryId;root.ATLAS_LIBRARY_VISIBILITY.pruneRestoredOptions($('cr-library'));")
    job=once(job,'function updateMode(){','function updateMode(){\n      root.ATLAS_LIBRARY_VISIBILITY.pruneRestoredOptions($(\'cr-library\'));')
    html=once(html,old,job);job_path.write_text(job)
    html=html.replace(BASE_VERSION,VERSION)
    (dist/'index.html').write_text(html)
    (dist/'assets/library-visibility.js').write_text(policy)
    # Expose inspectable data and source evidence in the downloadable package.
    process_docs=dist/'docs/process-libraries'
    if process_docs.exists():shutil.rmtree(process_docs)
    shutil.copytree(REPO/'process-libraries',process_docs)
    m_path=dist/'BUNDLE_MANIFEST.json';m=json.loads(m_path.read_text());m.update(version=VERSION,status='PROCESS_LIBRARIES_OFFLINE_PREVIEW',deployment_allowed=False,process_library_snapshot='2026-10-18',legacy_hidden_views=['solid_c','solid_u'],legacy_replay='ORIGINAL_ID_NAME_AND_IDS_RETAINED',process_library_views={k:v['entry_count'] for k,v in views['views'].items() if k.startswith('pso_')});m_path.write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive)
    (output/'SHA256SUMS.txt').write_text(f'{sha(archive)}  {archive.name}\n')
    print(json.dumps({'archive':str(archive),'sha256':sha(archive)}));return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-process-libraries');build(p.parse_args().output_dir.resolve())
