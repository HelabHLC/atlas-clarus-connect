"""Build a small RC34.5 uploader; download only the exact pinned full package."""
import hashlib,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
full=ROOT/'downloads/rc34.5/ATLAS_Clarus_Browser_Edition_v0.1.16-beta3_RC34.5.zip'
assert hashlib.sha256(full.read_bytes()).hexdigest()=='93beed197aa7a3396e19b74d48031b8fe0439a5aeb04085a3d1d5052124e9b0a'
with zipfile.ZipFile(full) as z:
    php=z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
    index=z.read('atlas-clarus-browser-edition/index.php')
old="""        $tmp = __DIR__ . '/assets/bundle.zip';
        if ( ! is_readable( $tmp ) ) {
            return new WP_Error( 'atlas_package_missing', 'Mitgeliefertes Bundle fehlt.' );
        }"""
new="""        // The tiny uploader never accepts a caller-supplied URL or package hash.
        // Download the published, pinned wrapper and read only its embedded bundle.
        if ( ! class_exists( 'ZipArchive' ) ) {
            return new WP_Error( 'atlas_zip_required', 'Die PHP-ZIP-Erweiterung wird benötigt.' );
        }
        $download = download_url( 'https://atlas-clarus-mobile-camera-preview.arbe-lambda-star.chatgpt.site/releases/ATLAS_Clarus_Browser_Edition_v0.1.16-beta3_RC34.5.zip', 180 );
        if ( is_wp_error( $download ) ) {
            return $download;
        }
        $tmp = false;
        try {
            if ( filesize( $download ) !== 18635517 || ! hash_equals( '93beed197aa7a3396e19b74d48031b8fe0439a5aeb04085a3d1d5052124e9b0a', (string) hash_file( 'sha256', $download ) ) ) {
                return new WP_Error( 'atlas_download_pin', 'Das heruntergeladene Installationspaket stimmt nicht mit der geprüften RC34.5 überein.' );
            }
            $archive = new ZipArchive();
            if ( true !== $archive->open( $download ) ) {
                return new WP_Error( 'atlas_download_zip', 'Das geprüfte ZIP konnte nicht geöffnet werden.' );
            }
            $input = $archive->getStream( 'atlas-clarus-browser-edition/assets/bundle.zip' );
            $tmp = wp_tempnam( 'atlas-rc345-bundle.zip' );
            $output = $tmp ? fopen( $tmp, 'wb' ) : false;
            if ( ! $input || ! $output ) {
                if ( is_resource( $input ) ) { fclose( $input ); }
                if ( is_resource( $output ) ) { fclose( $output ); }
                $archive->close();
                if ( $tmp ) { wp_delete_file( $tmp ); }
                return new WP_Error( 'atlas_download_temp', 'Temporäre Bundle-Datei konnte nicht erstellt werden.' );
            }
            $copied = stream_copy_to_stream( $input, $output, self::BUNDLE_SIZE + 1 );
            fclose( $input );
            fclose( $output );
            $archive->close();
            if ( self::BUNDLE_SIZE !== $copied ) {
                wp_delete_file( $tmp );
                return new WP_Error( 'atlas_download_size', 'Das Bundle ist unvollständig.' );
            }
        } finally {
            wp_delete_file( $download );
        }"""
assert php.count(old)==1
php=php.replace(old,new).replace('0.1.16-beta3','0.1.16-beta3.1')
# The transport URL remains pinned to the published full beta3 wrapper.
php=php.replace('/releases/ATLAS_Clarus_Browser_Edition_v0.1.16-beta3.1_RC34.5.zip','/releases/ATLAS_Clarus_Browser_Edition_v0.1.16-beta3_RC34.5.zip')
php=php.replace('// Embedded ZIP is part of this plugin and must not be deleted.',"if ( $tmp && is_file( $tmp ) ) { wp_delete_file( $tmp ); }")
php=php.replace('Activate the embedded ATLAS Clarus browser bundle','Download, verify and activate ATLAS Clarus RC34.5').replace('Checks the exact embedded ZIP, manifest and checksums','Downloads the fixed RC34.5 package and checks the exact ZIP, manifest and checksums')
php=php.replace('<h2>Live-Kamera RC34.5', '<p><strong>Kleines Installationspaket:</strong> Bei der Freischaltung wird die vollständige RC34.5 nachgeladen und vor dem Umschalten vollständig geprüft.</p><h2>Live-Kamera RC34.5')
out=ROOT/'downloads/rc34.5/ATLAS_Clarus_RC34.5_Small_Installer.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php',php)
    z.writestr('atlas-clarus-browser-edition/index.php',index)
    z.writestr('atlas-clarus-browser-edition/readme.txt','ATLAS Clarus 0.1.16-beta3.1 small installer. Downloads the fixed RC34.5 wrapper over HTTPS. Verifies wrapper size and SHA-256, embedded bundle size and SHA-256, manifest and file checksums before switching. Previous runtime retained. Smartphone-browser acceptance pending. No automatic install on plugin activation. Requires ZipArchive and outbound HTTPS.\n')
(out.with_suffix('.php')).write_text(php)
print(out, out.stat().st_size, hashlib.sha256(out.read_bytes()).hexdigest())
