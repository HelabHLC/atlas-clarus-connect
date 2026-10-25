#!/usr/bin/env python3
"""Extract selected factual measurements; no workbook authoring.
Run: python3 scripts/derive_materials.py path/to/mit-material-properties.zip
Source: Bouman et al., ICCV 2013, MIT Fabric Properties Dataset.
The xlsx is authoritative for values; the web summary image differs for fabric #4 weight.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from xml.etree import ElementTree as ET
import hashlib,json,statistics,sys
src=Path(sys.argv[1]);ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(src) as outer:
    name=next(n for n in outer.namelist() if n.endswith('matprop.xlsx') and not n.startswith('__MACOSX'))
    workbook=outer.read(name)
with ZipFile(BytesIO(workbook)) as z:
    strings=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    records=[]
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:row',ns)[1:]:
        r={}
        for cell in row:
            v=cell.find('m:v',ns)
            if v is None: continue
            value=strings[int(v.text)] if cell.attrib.get('t')=='s' else float(v.text)
            r[''.join(c for c in cell.attrib['r'] if c.isalpha())]=value
        records.append({'fabric_id':int(r['A']),'sample':r['B'],'bending_lbf_in2':r['C'],
          'thickness_in':r['D'],'area_weight_oz_yd2':r['F'],'confidence_rating':r['G']})
# Avoid over-weighting a fabric with more measurements: mean by fabric, then mean by group.
groups=[('silk','Seide · leichte Referenzstoffe',[3,4]),('cotton','Baumwolle · Referenzstoffe',[5,10]),('denim','Denim · einzelner Referenzstoff',[13])]
materials=[]
for key,label,ids in groups:
    selected=[r for r in records if r['fabric_id'] in ids]
    per_fabric=[{k:statistics.mean(r[k] for r in selected if r['fabric_id']==i)
      for k in ('bending_lbf_in2','thickness_in','area_weight_oz_yd2')} for i in ids]
    mean=lambda key:statistics.mean(r[key] for r in per_fabric)
    factor=28.349523125/(0.9144**2)
    materials.append({'id':key,'label':label,'fabric_ids':ids,'sample_count':len(selected),'fabric_count':len(ids),
      'gsm':mean('area_weight_oz_yd2')*factor,'thickness_mm':mean('thickness_in')*25.4,
      'bending_strip_EI_lbf_in2':mean('bending_lbf_in2'),
      'observed_gsm_range':[min(r['area_weight_oz_yd2'] for r in per_fabric)*factor,max(r['area_weight_oz_yd2'] for r in per_fabric)*factor],
      'stretch_status':'ASSUMED_NOT_MEASURED','warp_compliance':0.02,'weft_compliance':0.04,
      'shear_compliance':0.15,'measurements':selected})
base=materials[0]['bending_strip_EI_lbf_in2']
for m in materials:
    m['bending_index_vs_silk']=m['bending_strip_EI_lbf_in2']/base
    m['bend_compliance']=0.03/m['bending_index_vs_silk']
out={'schema':'atlas-cloth-model-presets-v1','source_url':'https://people.csail.mit.edu/klbouman/pw/projects/materialproperties/dataset.html',
 'download_url':'https://people.csail.mit.edu/klbouman/pw/data/materialproperties/material_properties.zip',
 'source_zip_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'workbook_sha256':hashlib.sha256(workbook).hexdigest(),
 'citation':'Bouman, Xiao, Battaglia, Freeman. Estimating the Material Properties of Fabric from Video. ICCV 2013.',
 'method':'Arithmetic mean within each fabric, then equal-weight mean across selected fabric IDs. No population-average claim.',
 'limitations':['No identified satin weave. Silk label is a fibre/sample description.',
 'No tensile curves or stretch measurements in this source. Stretch/shear compliances are chosen visual-model assumptions in m/N.',
 'Strip EI (lbf in²) is not sheet bending rigidity. Strip width/test geometry are not established; no direct SI sheet conversion is used.',
 'Bend compliance uses an uncalibrated inverse proxy index against the selected silk baseline.',
 'Range is observed spread of fabric means, not a confidence interval. Directional information was not retained by the mean.',
 'Web summary image reports a different area weight for fabric 4; downloaded xlsx values are used.',
 'No validation against the user’s physical fabric or against CLO.'], 'materials':materials}
path=Path(__file__).resolve().parents[1]/'data/materials.json';path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:m[k] for k in ('id','gsm','bending_index_vs_silk','sample_count')} for m in materials],indent=2))
