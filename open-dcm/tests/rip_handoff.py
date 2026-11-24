#!/usr/bin/env python3
"""Rasterize actual ICC worker results, not hard-coded CMYK fixtures."""
import json, os, shutil, subprocess, tempfile
from pathlib import Path
from PIL import Image

rows=json.loads(Path(os.environ['ATLAS_WORKER_RESULTS_JSON']).read_text())['rows']
if len(rows)!=3 or [r['row_id'] for r in rows]!=[1737,10519,9536]:
    raise ValueError('Unexpected master rows/order')
gs=shutil.which('gs')
if not gs:
    raise RuntimeError('Ghostscript required')
lines=['%!PS-Adobe-3.0','<< /PageSize [300 100] >> setpagedevice']
for i,row in enumerate(rows):
    v=row['cmyk16']
    if len(v)!=4 or any(type(x)!=int or not 0<=x<=65535 for x in v):
        raise ValueError('Invalid CMYK16')
    lines.append(' '.join(f'{x/65535:.12f}' for x in v)+f' setcmykcolor {i*100} 0 100 100 rectfill')
lines.append('showpage')
with tempfile.TemporaryDirectory(prefix='atlas-rip-') as tmp:
    ps=Path(tmp)/'patches.ps'
    tif=Path(tmp)/'patches.tif'
    ps.write_text('\n'.join(lines)+'\n',encoding='ascii')
    print('Ghostscript',subprocess.check_output([gs,'--version'],text=True).strip(),flush=True)
    subprocess.run([gs,'-q','-dSAFER','-dBATCH','-dNOPAUSE','-sDEVICE=tiff32nc','-r72','-dUseFastColor=true',f'-sOutputFile={tif}',str(ps)],check=True,timeout=60)
    with Image.open(tif) as im:
        if im.mode!='CMYK' or im.size!=(300,100):
            raise ValueError('Unexpected raster format')
        for i,row in enumerate(rows):
            expected=tuple(round(x/257) for x in row['cmyk16'])
            pixels=list(im.crop((i*100+10,10,i*100+90,90)).getdata())
            error=max(abs(a-b) for p in pixels for a,b in zip(p,expected))
            print(json.dumps({'hlc':row['hlc'],'cmyk16':row['cmyk16'],'expected_cmyk8':expected,'actual_center_cmyk8':im.getpixel((i*100+50,50)),'pixels':len(pixels),'max_channel_error':error}),flush=True)
            if error>1:
                raise RuntimeError('RIP channel preservation gate failed')
print('PASS: live ICC worker to Ghostscript DeviceCMYK 8-bit raster; no physical proof or 16-bit raster claim',flush=True)
