#!/usr/bin/env python3
"""Build immutable-master views from captured gamutmap table responses. No RGB or Lab matching."""
import csv,json,re,hashlib,sys,gzip
from pathlib import Path

def source_bytes(p):
 p=Path(p)
 return p.read_bytes() if p.exists() else gzip.decompress(p.with_suffix(p.suffix+'.gz').read_bytes())
def sha(p):return hashlib.sha256(source_bytes(p)).hexdigest()
def parse(path):
 data=json.loads(source_bytes(path));assert set(data)=={f'H{x:03}' for x in range(5,361,5)}
 refs=set();duplicates=0
 for hue,html in data.items():
  lightness=[]
  for tr in re.findall(r'<tr>(.*?)</tr>',html,re.S):
   cells=re.findall(r'<td\b([^>]*)>(.*?)</td>',tr,re.S)
   if not cells or not re.fullmatch(r'\d+',cells[0][1]):continue
   L=int(cells[0][1]);lightness.append(L);assert len(cells)==27
   for i,(attrs,_) in enumerate(cells[1:]):
    if 'background-color' not in attrs:continue
    assert re.search(r'#[0-9a-fA-F]{6}',attrs)
    C=i*5;H=int(hue[1:]) if C else 0;ref=f'H{H:03}_L{L:03}_C{C:03}'
    if ref in refs:duplicates+=1
    refs.add(ref)
  assert lightness==list(range(100,-1,-5)),(hue,lightness)
 return refs,duplicates

def build(master_path,source_dir,outdir):
 out=Path(outdir);out.mkdir(parents=True,exist_ok=True);src=Path(source_dir);m=json.loads(Path(master_path).read_text());rows=m['colors'];assert len(rows)==m['entry_count']==13283;assert len({x['id'] for x in rows})==13283;byref={x['ref']:x for x in rows};assert len(byref)==13283
 expected='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';assert m['master_sha256']==expected
 before=sha(master_path);sets={};duplicate_counts={}
 for name in ['atlas','51','52','atlas51','atlas52','atlas_both']:
  sets[name],duplicate_counts[name]=parse(src/(name+'.json'))
 assert sets['atlas']==set(byref),'Atlas-coordinate identity mismatch'
 assert sets['atlas51']==sets['atlas']&sets['51']
 assert sets['atlas52']==sets['atlas']&sets['52']
 assert sets['atlas_both']==sets['atlas51']&sets['atlas52']
 views={}
 for key,label,name,filter_ids in [('pso_coated_v3_fogra51','ATLAS – PSO Coated v3 (FOGRA51)','atlas51',[204,148]),('pso_uncoated_v3_fogra52','ATLAS – PSO Uncoated v3 (FOGRA52)','atlas52',[204,140]),('pso_fogra51_fogra52_common','ATLAS – FOGRA51 / FOGRA52 common','atlas_both',[204,148,140])]:
  selected=sorted((byref[ref] for ref in sets[name]),key=lambda x:x['id']);views[key]={'name':label,'type':'SOURCE_DECLARED_GAMUT_MEMBERSHIP','status':'GAMUTMAP_SNAPSHOT_MEMBERSHIP_VERIFIED','gamutmap_filter_ids':filter_ids,'entry_count':len(selected),'ids':[x['id'] for x in selected],'source_response_sha256':sha(src/(name+'.json')),'measured_qc_status':'NOT_MEASURED','identity_change':'NONE'}
 doc={'schema':'ATLAS_CLARUS_PROCESS_LIBRARY_VIEWS','schema_version':'0.1.0','captured_date':'2026-10-18','master_sha256':expected,'master_rows':13283,'identity_binding':'Existing frozen master identity; exact HLC identifier join only','selection_method':'Capture of source-selected gamutmap table cells, intersected with exact active-master reference keys; no recalculated gamut threshold','not_a_pantone_library':True,'not_a_print_approval':True,'views':views};(out/'ATLAS_Process_Views_v0_1.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
 with (out/'ATLAS_Process_Membership_v0_1.csv').open('w',newline='') as f:
  w=csv.writer(f);w.writerow(['atlas_row_id','hlc','FOGRA51','FOGRA52','COMMON'])
  for x in sorted(rows,key=lambda x:x['id']):w.writerow([x['id'],x['ref'],int(x['ref'] in sets['atlas51']),int(x['ref'] in sets['atlas52']),int(x['ref'] in sets['atlas_both'])])
 assert sha(master_path)==before
 report={'status':'PASS','master_table_sha256_before':before,'master_table_sha256_after':sha(master_path),'master_identity_sha256':expected,'complete_atlas_exact_reference_match':13283,'FOGRA51':len(sets['atlas51']),'FOGRA52':len(sets['atlas52']),'COMMON':len(sets['atlas_both']),'FOGRA51_ONLY':len(sets['atlas51']-sets['atlas52']),'FOGRA52_ONLY':len(sets['atlas52']-sets['atlas51']),'NEITHER':len(set(byref)-(sets['atlas51']|sets['atlas52'])),'independent_single_filter_intersections_match':True,'direct_multiple_filter_intersection_matches':True,'duplicate_neutral_axis_occurrences_removed':duplicate_counts,'all_ids_unique_and_exist_in_master':True,'source_sha256':{name:sha(src/(name+'.json')) for name in sets},'limits':['Membership snapshot taken directly from gamutmap, not an independent reconstruction of its unpublished internal gamut algorithm.','No new physical measurements; no production approval or certification.','Site display RGB values do not replace active master RGB.','No library integration or deployment performed.']};(out/'VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['source_sha256','duplicate_neutral_axis_occurrences_removed']},indent=2))
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('Usage: python build_process_libraries.py MASTER_COLORS_JSON SOURCES_DIRECTORY OUTPUT_DIRECTORY')
 build(*sys.argv[1:])
