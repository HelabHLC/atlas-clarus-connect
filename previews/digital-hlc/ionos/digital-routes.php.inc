    /** Fixed, bundled public preview assets. No arbitrary path or remote input. */
    private static function serve_digital_asset( $asset ) {
        $assets = array(
            'digital/index.html' => array( 'index.html', 'text/html; charset=utf-8', '1ac6306fb65cd8a729e1c545500c553c8830a7400d75f457bf42ddf348803750' ),
            'digital/offline.zip' => array( 'offline.zip', 'application/zip', 'f48efee06caf2ddb1099f34ea410d1acea05d232117383861b23f983fa9dc13f' ),
            'digital/entry.js' => array( 'entry.js', 'text/javascript; charset=utf-8', '' ),
        );
        if ( ! isset( $assets[ $asset ] ) ) { return; }
        list( $name, $mime, $hash ) = $assets[ $asset ];
        $file = __DIR__ . '/digital-preview/' . $name;
        if ( ! is_readable( $file ) || ( $hash && ! hash_equals( $hash, hash_file( 'sha256', $file ) ) ) ) {
            status_header( 503 );
            header( 'Content-Type: text/plain; charset=utf-8' );
            echo 'The digital preview is unavailable; please use the Browser Edition.';
            exit;
        }
        while ( ob_get_level() ) { ob_end_clean(); }
        status_header( 200 );
        header( 'Content-Type: ' . $mime );
        header( 'X-Content-Type-Options: nosniff' );
        header( 'Cache-Control: no-cache, must-revalidate' );
        if ( 'index.html' === $name ) {
            $html = file_get_contents( $file );
            $links = '<nav aria-label="Related tools" style="max-width:1060px;margin:auto;padding:20px;display:flex;gap:20px;flex-wrap:wrap">'
                . '<a href="' . esc_url( home_url( '/' . self::CANVAS_ROUTE_BASE . '/' ) ) . '">Browser Edition</a>'
                . '<a href="' . esc_url( home_url( '/atlas-clarus-interactive-user-guide/#digital-hlc-018' ) ) . '">Hilfe / Help &amp; FAQ</a>'
                . '<a href="' . esc_url( home_url( '/atlas-clarus-downloads/#digital-hlc-018' ) ) . '">Offline ZIP · 0.1.8</a></nav>';
            $pos = strripos( $html, '</body>' );
            if ( false !== $pos ) { $html = substr_replace( $html, $links, $pos, 0 ); }
            header( 'Content-Length: ' . strlen( $html ) );
            echo $html;
        } else {
            if ( 'offline.zip' === $name ) {
                header( 'Content-Disposition: attachment; filename="ATLAS_Clarus_P3_ProPhoto_0.1.8_Offline.zip"' );
            }
            header( 'Content-Length: ' . filesize( $file ) );
            readfile( $file );
        }
        exit;
    }

    private static function inject_digital_entry( $html ) {
        if ( false !== strpos( $html, 'id="atlas-digital-preview-entry-script"' ) ) { return $html; }
        // The bundle also contains print templates with their own </head>.
        $head = stripos( $html, '</head>' );
        $css = __DIR__ . '/digital-preview/navigation.css';
        if ( false !== $head && is_readable( $css ) ) {
            $style = '<style id="atlas-navigation-overflow-fix">' . file_get_contents( $css ) . '</style>';
            $html = substr_replace( $html, $style, $head, 0 );
        }
        $pos = strripos( $html, '</body>' );
        if ( false === $pos ) { return $html; }
        $script = '<script id="atlas-digital-preview-entry-script" src="'
            . esc_url( home_url( '/' . self::CANVAS_ROUTE_BASE . '/digital/entry.js' ) ) . '"></script>';
        return substr_replace( $html, $script, $pos, 0 );
    }
