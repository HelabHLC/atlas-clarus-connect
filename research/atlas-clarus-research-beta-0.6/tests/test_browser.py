"""Standalone, licence-free browser smoke tests for ATLAS Clarus Research Beta."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import io,csv,json,math,os
ROOT=Path(__file__).resolve().parents[1]; html=ROOT/'index.html'
s=html.read_text(encoding='utf-8')
assert "<script src=" not in s and "fetch(" not in s
assert "connect-src 'none'" in s
assert s.count('href="https://')>=16
assert "M0_DEFAULT" not in s and "FOGRA51_Spectral.txt" in s
wl=list(range(380,731,10))
def make_csv(cols,values):
    out=io.StringIO();wr=csv.writer(out,lineterminator='\n');wr.writerow(['wavelength_nm']+cols)
    for i,w in enumerate(wl):wr.writerow([w]+[c[i] for c in values])
    return out.getvalue().encode()
ref=[0.28+0.32*math.exp(-((w-530)/84)**2) for w in wl]
variant=[min(1,max(0,x+0.023*math.sin(i/4))) for i,x in enumerate(ref)]
observer=[ [math.exp(-((w-c)/d)**2) for w in wl] for c,d in [(610,57),(555,54),(450,39)]]
spd=[[1+.0005*(w-550) for w in wl] for _ in range(7)]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=b.new_page(accept_downloads=True,viewport={'width':1280,'height':850})
    errors=[];requests=[]
    page.on('pageerror',lambda ex:errors.append(str(ex)))
    page.on('request',lambda r:requests.append(r.url) if r.url.startswith('http') else None)
    if os.environ.get('ATLAS_REQUIRE_FILE_URL')=='1':
        page.goto(html.resolve().as_uri(),wait_until='load')
    else:
        try:page.goto(html.resolve().as_uri(),wait_until='load',timeout=5000)
        except Exception:page.set_content(s,wait_until='load')
    page.locator('button[data-view="sources"]').click()
    assert page.locator('a[href*="files.cie.co.at"]').count()==7
    assert page.locator('a[href*="freiefarbe.de"]').count()>=1
    page.locator('#de').click()
    assert 'Originaldaten finden' in page.locator('[data-t="sourcesTitle"]').inner_text()
    page.locator('#en').click()
    page.locator('button[data-view="advisory"]').click()
    page.locator('#spectra').set_input_files({'name':'test.csv','mimeType':'text/csv','buffer':make_csv(['reference','variant'],[ref,variant])})
    expect(page.locator('#importStatus')).to_contain_text('test.csv')
    page.locator('#observer').set_input_files({'name':'observer.csv','mimeType':'text/csv','buffer':make_csv(['xbar','ybar','zbar'],observer)})
    expect(page.locator('#importStatus')).to_contain_text('observer.csv')
    page.locator('#illuminants').set_input_files({'name':'lights.csv','mimeType':'text/csv','buffer':make_csv(['D50','D55','D65','D75','A','LED-B2','LED-B3'],spd)})
    expect(page.locator('#importStatus')).to_contain_text('lights.csv')
    page.locator('#compare').click()
    assert page.locator('#exportAdvisory').is_enabled()
    with page.expect_download() as dl:page.locator('#exportAdvisory').click()
    result=json.loads(Path(dl.value.path()).read_text())
    assert result['status']=='USER_DATA_COLOURIMETRIC_COMPARISON'
    page.locator('button[data-view="lab"]').click()
    page.locator('#fillTarget').click();page.locator('#optimize').click()
    assert page.locator('#exportLab').is_enabled()
    with page.expect_download() as dl:page.locator('#exportLab').click()
    o=json.loads(Path(dl.value.path()).read_text())
    assert len(o['optimized_reflectance'])==36
    # CIE official LED-shaped 10-column CSV, numerical values are test-generated.
    page.locator('button[data-view="advisory"]').click()
    led='\n'.join(','.join([str(w)]+[str(.1+.01*i) for i in range(9)]) for w in range(380,731,5)).encode()
    page.locator('#illuminants').set_input_files({'name':'CIE_illum_LEDs.csv','mimeType':'text/csv','buffer':led})
    expect(page.locator('#importStatus')).to_contain_text('CIE_illum_LEDs.csv')
    page.locator('button[data-view="sources"]').click()
    cxf=('<?xml version="1.0"?><cc:CxF xmlns:cc="http://colorexchangeformat.com/CxF3-core">'
         '<cc:Object Name="H100_L050_C030"><cc:ReflectanceSpectrum StartWL="380">'
         +' '.join(str(x) for x in ref)+'</cc:ReflectanceSpectrum></cc:Object></cc:CxF>').encode()
    page.locator('#sourceSample').fill('H100_L050_C030')
    page.locator('#sourceFile').set_input_files({'name':'sample.cxf','mimeType':'application/xml','buffer':cxf})
    page.locator('#loadSource').click()
    expect(page.locator('#sourceStatus')).to_contain_text('Reference loaded')
    assert page.locator('#exportSourceCSV').is_enabled()
    with page.expect_download() as dl:page.locator('#exportSourceCSV').click()
    assert len(list(csv.reader(io.StringIO(Path(dl.value.path()).read_text()))))==37
    assert not requests,requests
    assert not errors,errors
    b.close()
print('BETA 0.6 PUBLIC SMOKE TEST PASS')
