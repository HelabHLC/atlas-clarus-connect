"""Build a tiny, pinned RC34.9 WordPress installer for sites rejecting large uploads."""
import argparse, hashlib, json, urllib.request, zipfile
from pathlib import Path
from promote_release import zip_tree, VERSION as BUNDLE_VERSION, PLUGIN, BUNDLE_NAME, PLUGIN_NAME

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
VERSION = PLUGIN + '.1'
RELEASE_URL = 'https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v' + BUNDLE_VERSION + '/'
FULL_NAME = PLUGIN_NAME
BUNDLE_URL = RELEASE_URL + BUNDLE_NAME

def once(s, old, new):
    assert s.count(old)==1, old[:100]
    return s.replace(old,new,1)

def build(full,out):
    out.mkdir(parents=True,exist_ok=True)
    info=json.loads((full.parent/'release-info.json').read_text())
    FULL_SHA=info['plugin_sha256'];BUNDLE_SHA=info['bundle_sha256'];BUNDLE_SIZE=info['bundle_size']
    assert hashlib.sha256(full.read_bytes()).hexdigest()==FULL_SHA
    with zipfile.ZipFile(full) as z:
        assert z.testzip() is None
        php=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
        index=z.read('atlas-clarus-browser-edition/index.php')
        bundle=z.read('atlas-clarus-browser-edition/assets/bundle.zip')
    assert len(bundle)==BUNDLE_SIZE and hashlib.sha256(bundle).hexdigest()==BUNDLE_SHA
    old="""        $tmp = __DIR__ . '/assets/bundle.zip';
        if ( ! is_readable( $tmp ) ) {
            return new WP_Error( 'atlas_package_missing', 'Mitgeliefertes Bundle fehlt.' );
        }"""
    new="""        // Fixed official release URL only. Caller cannot supply a URL, path or hash.
        // The existing size/SHA, strict manifest and file checks below must all pass.
        $tmp = download_url( '%s', 180 );
        if ( is_wp_error( $tmp ) ) {
            return $tmp;
        }""" % BUNDLE_URL
    php=once(php,old,new)
    php=once(php,'            // Embedded ZIP is part of this plugin and must not be deleted.',
             '            if ( is_string( $tmp ) && is_file( $tmp ) ) { wp_delete_file( $tmp ); }')
    assert php.count('0.1.18-beta1')==2
    php=php.replace('0.1.18-beta1',VERSION)
    php=php.replace('Activate the embedded ATLAS Clarus browser bundle','Download, verify and activate ATLAS Clarus RC34.9')
    php=php.replace('Checks the exact embedded ZIP, manifest and checksums','Downloads the fixed official RC34.9 ZIP, verifies its size/SHA-256, manifest and file checksums')
    php=php.replace('Supply the embedded bundle hash','Supply the pinned bundle hash')
    php=php.replace('Mitgeliefertes Bundle','Nachzuladendes Bundle').replace('Mitgeliefertes RC34.9','Nachgeladenes RC34.9')
    php=once(php,'<h2>RC34.9 · QuarkXPress XTG</h2>',
             '<p><strong>Kleines Installationspaket:</strong> Bei der Freischaltung wird die geprüfte RC34.9 direkt von GitHub geladen und vollständig geprüft. Bis dahin bleibt die bisherige Laufzeit aktiv.</p><h2>RC34.9 · QuarkXPress XTG</h2>')
    stage=out/'plugin-source/atlas-clarus-browser-edition'
    stage.mkdir(parents=True,exist_ok=True)
    assert not (stage/'assets').exists(), 'Build into a clean small-installer directory'
    (stage/'atlas-clarus-browser-edition.php').write_text(php)
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'ATLAS Clarus Browser Edition {VERSION} / RC34.9 small installer\nUpload without extracting and replace the existing plugin. Updating or activating this plugin does not switch the runtime. Explicit activation downloads the fixed official RC34.9 ZIP and verifies exact size/SHA-256, strict manifest and file checksums. Previous runtime is retained for rollback. Requires outbound HTTPS.\n')
    archive=out/'ATLAS_Clarus_RC34.9_Small_Installer.zip'
    zip_tree(stage,archive)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None and len(z.namelist())==3
        assert BUNDLE_SHA in z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
    assert archive.stat().st_size<100000
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    (out/(archive.name+'.sha256')).write_text(digest+'  '+archive.name+'\n')
    (out/'small-installer-info.json').write_text(json.dumps(dict(plugin_version=VERSION,installer_sha256=digest,installer_size=archive.stat().st_size,bundle_sha256=BUNDLE_SHA,bundle_size=BUNDLE_SIZE,bundle_url=BUNDLE_URL),indent=2)+'\n')
    # Test fixture stays outside the uploadable ZIP.
    (out/'bundle-fixture.zip').write_bytes(bundle)
    harness=(ROOT/'wordpress-browser-edition/tests/validate_plugin.php').read_text()
    harness=once(harness,'function unzip_file($zip, $target) {',"""function download_url($url, $timeout) {
    check($url === '%s' && $timeout === 180, 'Unexpected download destination/timeout');
    $GLOBALS['download_calls']++;
    if ($GLOBALS['fault'] === 'download') { return new WP_Error('http_request_failed', 'Simulated download failure'); }
    $path = tempnam($GLOBALS['temp'], 'download-');
    check(copy($GLOBALS['bundle_fixture'], $path), 'Could not make download fixture');
    $GLOBALS['downloaded_files'][] = $path;
    return $path;
}
function wp_delete_file($path) { check(unlink($path), 'Could not clean downloaded file'); }
function unzip_file($zip, $target) {""" % BUNDLE_URL)
    harness=once(harness,"$finished = false;", """$bundle_fixture = realpath($argv[2] ?? '');
check($bundle_fixture && is_file($bundle_fixture), 'Pass the bundle fixture');
$download_calls = 0; $downloaded_files = array();
$finished = false;""")
    harness=once(harness,'    $iterator = new RecursiveIteratorIterator',"""    foreach ($GLOBALS['downloaded_files'] as $downloaded) {
        check(!is_file($downloaded), 'Downloaded temporary file was not cleaned');
    }
    $iterator = new RecursiveIteratorIterator""")
    assert harness.count("$package . '/assets/bundle.zip'")==2
    harness=harness.replace("$package . '/assets/bundle.zip'",'$bundle_fixture')
    harness=once(harness,'// Input byte integrity:',"check($download_calls === 0, 'Boot or denied/stale request initiated a download');\n\n// Input byte integrity:")
    harness=once(harness,"array('unzip', 'manifest', 'checksum')", "array('download', 'unzip', 'manifest', 'checksum')")
    harness=once(harness,"'print_exports' => array('PARALLEL_PRINT_JSON')", "'palette_exports' => array('ASE'), 'print_exports' => array('PARALLEL_PRINT_JSON')")
    harness=harness.replace('PASS: RC27 PHP manifest, guarded mutations, failure preservation, install, repeat install, canvas injection and rollback',
                            'PASS: RC34.9 pinned download, permission/stale guards, failure preservation, cleanup, install/reinstall and rollback')
    (out/'validate_small.php').write_text(harness)
    print(json.dumps(dict(path=str(archive),size=archive.stat().st_size,sha256=digest)))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--full',type=Path,default=Path('/tmp')/FULL_NAME)
    parser.add_argument('--output-dir',type=Path,default=Path('small349'))
    args=parser.parse_args()
    build(args.full,args.output_dir)
