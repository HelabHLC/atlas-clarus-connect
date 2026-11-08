"""Build the IONOS update from the verified public 0.1.7 installer.

The active base runtime and every existing installer/rollback path are retained.
Only the isolated 0.1.8 workspace, download route and launch links are added.
"""
from pathlib import Path
import hashlib, json, sys, zipfile

HERE = Path(__file__).resolve().parent
BASE_SHA = 'be3ecd224bf431df1da654e6b54a4b0533f0d47602314c2deadc6a883c74b0d8'
OFFLINE_SHA = 'f48efee06caf2ddb1099f34ea410d1acea05d232117383861b23f983fa9dc13f'
HTML_SHA = '1ac6306fb65cd8a729e1c545500c553c8830a7400d75f457bf42ddf348803750'
sha = lambda b: hashlib.sha256(b).hexdigest()

def build(base, output):
    assert sha(base.read_bytes()) == BASE_SHA, 'Wrong public baseline installer'
    offline = HERE.parent / 'download/ATLAS_Clarus_P3_ProPhoto_0.1.8_Offline.zip'
    assert sha(offline.read_bytes()) == OFFLINE_SHA
    with zipfile.ZipFile(base) as z:
        files = {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
    key = 'atlas-clarus-browser-edition/atlas-clarus-browser-edition.php'
    php = files[key].decode()
    assert php.count('0.1.21-beta1') == 2
    php = php.replace('0.1.21-beta1', '0.1.23-beta1')
    marker = '    public static function serve_runtime_file() {'
    assert php.count(marker) == 1
    php = php.replace(marker, (HERE / 'digital-routes.php.inc').read_text() + '\n' + marker)
    marker = '        $runtime = self::runtime_dir();'
    assert php.count(marker) == 1
    php = php.replace(marker, '        self::serve_digital_asset( (string) $asset );\n\n' + marker)
    marker = '            $html = self::inject_exchange_help( $html );'
    assert php.count(marker) == 1
    php = php.replace(marker, marker + '\n            $html = self::inject_digital_entry( $html );')
    marker = "        header( 'Content-Length: ' . (string) filesize( $file ) );"
    assert php.count(marker) == 1
    php = php.replace(marker, """        if ( in_array( $asset, array( 'index.html', 'startup/index.html' ), true ) ) {
            $html = @file_get_contents( $file );
            if ( false === $html ) { status_header( 500 ); exit; }
            $html = self::inject_digital_entry( $html );
            header( 'Cache-Control: no-cache, must-revalidate' );
            header( 'Content-Length: ' . (string) strlen( $html ) );
            echo $html;
            exit;
        }

""" + marker)
    files[key] = php.encode()
    prefix = 'atlas-clarus-browser-edition/digital-preview/'
    with zipfile.ZipFile(offline) as z:
        html = z.read('ATLAS_Clarus_Digitale_Farberweiterung_0.1.8.html')
        assert sha(html) == HTML_SHA
        files[prefix + 'index.html'] = html
        for n in z.namelist():
            if n.startswith('LICENSES/') or n == 'README.md': files[prefix + n] = z.read(n)
    files[prefix + 'offline.zip'] = offline.read_bytes()
    files[prefix + 'entry.js'] = (HERE / 'entry.js').read_bytes()
    output.mkdir(parents=True, exist_ok=True)
    outzip = output / 'ATLAS_Clarus_P3_ProPhoto_0.1.8_IONOS_Installer.zip'
    with zipfile.ZipFile(outzip, 'w') as z:
        for n, b in sorted(files.items()):
            info = zipfile.ZipInfo(n, (2026, 11, 8, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            z.writestr(info, b, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(outzip) as z:
        assert z.testzip() is None
        z.extractall(output / 'unpacked')
    report = dict(plugin_version='0.1.23-beta1', digital_version='0.1.8-preview',
                  base_installer_sha256=BASE_SHA, offline_sha256=OFFLINE_SHA,
                  unchanged_standalone_sha256=HTML_SHA, installer_sha256=sha(outzip.read_bytes()),
                  installer_bytes=outzip.stat().st_size, active_runtime_switch=False,
                  entry='atlas-clarus-browser-bundle/digital/index.html',
                  icc_payloads=0)
    (output / 'build-info.json').write_text(json.dumps(report, indent=2)+'\n')
    (output / (outzip.name+'.sha256')).write_text(report['installer_sha256']+'  '+outzip.name+'\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__': build(Path(sys.argv[1]), Path(sys.argv[2]))
