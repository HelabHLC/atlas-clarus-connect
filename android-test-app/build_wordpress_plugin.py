#!/usr/bin/env python3
"""Build the matching bilingual Colour ID WordPress plugin from the archived v0.1.0."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from build_colour_id_locale import localize

BASE_SHA = '9191530eeeceb0abc81e7c504c888a5604f44186a6fa796277f5c1c29003a65c'
SOURCE_SHA = '580d4447193a736ad47a04a876a7437f757b98491836f6a3e8abaa9714769bff'
PREFIX = 'atlas-clarus-colour-picker/'


def checked(path, sha):
    raw = Path(path).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != sha:
        raise ValueError(f'Unexpected source SHA-256: {digest}')
    return raw


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-zip', required=True)
    parser.add_argument('--source-html', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    checked(args.base_zip, BASE_SHA)
    source = checked(args.source_html, SOURCE_SHA).decode('utf-8')
    with ZipFile(args.base_zip) as archive:
        files = {name: archive.read(name) for name in archive.namelist() if not name.endswith('/')}
    php_path = PREFIX + 'atlas-clarus-colour-picker.php'
    php = files[php_path].decode('utf-8')
    php = php.replace('Version: 0.1.0', 'Version: 0.2.2').replace("'0.1.0'", "'0.2.2'")
    php = php.replace("'loading'          => 'lazy',", "'loading'          => 'lazy',\n\t\t\t'lang'             => 'auto',")
    php = php.replace("$app_url = plugins_url( 'assets/atlas-clarus-app-v5.3.3.html', __FILE__ );", """$requested_lang = isset( $_GET['lang'] ) && is_string( $_GET['lang'] )
		? sanitize_key( wp_unslash( $_GET['lang'] ) )
		: strtolower( (string) $atts['lang'] );
\tif ( ! in_array( $requested_lang, array( 'de', 'en' ), true ) ) {
\t\t$requested_lang = 'en' === substr( get_locale(), 0, 2 ) ? 'en' : 'de';
\t}
\t$app_file = 'en' === $requested_lang ? 'colour-id-en.html' : 'colour-id.html';
\t$app_url = plugins_url( 'assets/' . $app_file, __FILE__ );""")
    if "'lang'             => 'auto'" not in php or "'assets/' . $app_file" not in php:
        raise ValueError('Original plugin wrapper changed')
    files[php_path] = php.encode('utf-8')
    files[PREFIX + 'assets/colour-id.html'] = localize(source, 'de').encode('utf-8')
    files[PREFIX + 'assets/colour-id-en.html'] = localize(source, 'en').encode('utf-8')
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(files.items()):
            archive.writestr(name, content)
    print(f'{output}: {len(files)} files, DE/EN Colour ID from pinned v5.3.3')


if __name__ == '__main__':
    main()
