"""Build a separate non-public RC36 BYOS integration candidate.
The inherited ICC profile bank is NOT yet cleared; never distribute this candidate.
"""
import argparse, json, shutil
from pathlib import Path
from prepare_candidate import sha, replace_once
HERE=Path(__file__).resolve().parent

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--candidate',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    if a.out.exists(): raise ValueError('Use a new output directory')
    original=json.loads((a.candidate/'BUNDLE_MANIFEST.json').read_text())
    if original.get('status')!='RC36_2_TEST_ONLY' or original.get('deployment_allowed') is not False:
        raise ValueError('Expected RC36.2 test candidate')
    shutil.copytree(a.candidate,a.out)
    assets=a.out/'assets'
    for n in ['byos-profile-registry.js','byos-profile-ui.js']:
        shutil.copyfile(HERE/n,assets/('rc36-'+n))
    research=HERE.parent/'research'/'atlas-clarus-research-beta-0.6'
    dest=a.out/'research';dest.mkdir()
    for n in ['index.html','README.md','SOURCE_LINKS.md','PRIVACY.md','CSV_FORMAT.md','VALIDATION.md','CHANGELOG.md']:
        shutil.copyfile(research/n,dest/n)
    def bind(s):
        s=replace_once(s,'output:{iccProfile:null,renderingIntent:null,substrate:null,deviceValues:null','output:{iccProfile:root.ATLAS_RC36_BYOS?.selected()??null,renderingIntent:null,substrate:null,deviceValues:null','card profile binding')
        return replace_once(s,'<dt>ICC output profile</dt><dd>Not selected</dd>','<dt>ICC output profile</dt><dd>\'+esc(d.output.iccProfile?d.output.iccProfile.name+\' · SHA-256: \'+d.output.iccProfile.sha256+\' · structural preflight only\':\'Not selected\')+\'</dd>','card profile rendering')
    for path in [assets/'rc36-open-dcm-card.js',a.out/'index.html']:
        s=bind(path.read_text())
        if path.name=='index.html':
            end=s.index('</head>')
            scripts='\n'.join((HERE/n).read_text() for n in ['byos-profile-registry.js','byos-profile-ui.js'])
            s=s[:end]+'<script>\n'+scripts+'\n</script>'+s[end:]
        path.write_text(s)
    original.update(version='0.2.0-rc36-public-byos-staging',status='BYOS_STAGING_ONLY',deployment_allowed=False,profile_bank_clearance='NOT_ESTABLISHED',local_output_profile_registry='STRUCTURAL_PREFLIGHT_ONLY',research_module='0.6.0-beta.2',research_handoff='STANDALONE_NO_SHARED_IDENTITY',icc_conversion='NOT_INTEGRATED')
    (a.out/'BUNDLE_MANIFEST.json').write_text(json.dumps(original,indent=2)+'\n')
    paths=sorted(p for p in a.out.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
    (a.out/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(a.out).as_posix()+'\n' for p in paths))
    assert sha((a.out/'assets/atlas-data.js').read_bytes())==sha((a.candidate/'assets/atlas-data.js').read_bytes())
    print('BYOS staging candidate only; no release authorization')
if __name__=='__main__':main()
