<?php
/**
 * Plugin Name: ATLAS Clarus Browser Edition
 * Plugin URI: https://arbe-lambda-star.com/
 * Description: Local Browser Edition with Image Picker, Hover, Wheel, palettes, parallel 4C/ECG print preparation and local ICC image previews. Explicit runtime switch; shortcode [atlas_clarus_browser_edition] preserved. Staging beta.
 * Version: 0.1.13-beta3
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: ARBE Lambda Star / ATLAS Clarus
 * Text Domain: atlas-clarus-browser-edition
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class ATLAS_Clarus_Browser_Edition {
    const VERSION              = '0.1.13-beta3';
    const BUNDLE_VERSION       = 'v0.2.0-rc23-tone-system-v0-1';
    const BUNDLE_SIZE          = 4217913;
    const BUNDLE_SHA256        = '1b62f34123e225c64aa0c5206b4b57b6c39aec411191c3a3f6085dd3fdf408fd';
    const OPTION_PREVIOUS_RUNTIME = 'atlas_clarus_browser_edition_previous_runtime';
    const OPTION_RUNTIME_PATH  = 'atlas_clarus_browser_edition_runtime_path';
    const OPTION_RUNTIME_SHA   = 'atlas_clarus_browser_edition_runtime_sha256';
    const OPTION_INSTALLED_AT  = 'atlas_clarus_browser_edition_installed_at';
    const OPTION_REWRITE_VERSION = 'atlas_clarus_browser_edition_rewrite_version';
    const NOTICE_TRANSIENT_KEY = 'atlas_clarus_browser_edition_notice_';
    const ROUTE_BASE           = 'atlas-clarus-browser-runtime';
    const CANVAS_ROUTE_BASE    = 'atlas-clarus-browser-bundle';
    const CANVAS_QUERY_VAR     = 'atlas_clarus_browser_canvas';

    private static $shortcode_css_printed = false;

    public static function boot() {
        add_action( 'init', array( __CLASS__, 'register_rewrite_rules' ) );
        add_action( 'wp_loaded', array( __CLASS__, 'maybe_flush_rewrite_rules' ) );
        add_filter( 'query_vars', array( __CLASS__, 'register_query_var' ) );
        add_action( 'template_redirect', array( __CLASS__, 'serve_runtime_file' ), 0 );
        add_filter( 'nav_menu_link_attributes', array( __CLASS__, 'menu_link_attributes' ), 10, 4 );

        add_shortcode( 'atlas_clarus_browser_edition', array( __CLASS__, 'render_shortcode' ) );

        if ( is_admin() ) {
            add_action( 'admin_menu', array( __CLASS__, 'register_admin_page' ) );
            add_action( 'admin_post_atlas_clarus_browser_install', array( __CLASS__, 'handle_install_request' ) );
            add_action( 'admin_post_atlas_clarus_browser_rollback', array( __CLASS__, 'handle_rollback_request' ) );
            add_action( 'admin_notices', array( __CLASS__, 'admin_notices' ) );
            add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( __CLASS__, 'plugin_action_links' ) );
        }
    }

    public static function activate() {
        self::register_rewrite_rules();
        flush_rewrite_rules( false );
    }

    public static function deactivate() {
        flush_rewrite_rules( false );
    }

    public static function register_rewrite_rules() {
        add_rewrite_rule(
            '^' . preg_quote( self::CANVAS_ROUTE_BASE, '/' ) . '/?$',
            'index.php?atlas_clarus_browser_asset=index.html&' . self::CANVAS_QUERY_VAR . '=1',
            'top'
        );
        add_rewrite_rule(
            '^' . preg_quote( self::CANVAS_ROUTE_BASE, '/' ) . '/(.+)$',
            'index.php?atlas_clarus_browser_asset=$matches[1]&' . self::CANVAS_QUERY_VAR . '=1',
            'top'
        );
        add_rewrite_rule(
            '^' . preg_quote( self::ROUTE_BASE, '/' ) . '/?$',
            'index.php?atlas_clarus_browser_asset=index.html',
            'top'
        );
        add_rewrite_rule(
            '^' . preg_quote( self::ROUTE_BASE, '/' ) . '/(.+)$',
            'index.php?atlas_clarus_browser_asset=$matches[1]',
            'top'
        );
    }

    public static function maybe_flush_rewrite_rules() {
        $stored = get_option( self::OPTION_REWRITE_VERSION, '' );
        if ( self::VERSION !== $stored ) {
            flush_rewrite_rules( false );
            update_option( self::OPTION_REWRITE_VERSION, self::VERSION, false );
        }
    }

    public static function register_query_var( $vars ) {
        $vars[] = 'atlas_clarus_browser_asset';
        $vars[] = self::CANVAS_QUERY_VAR;
        return $vars;
    }

    public static function plugin_action_links( $links ) {
        $settings = sprintf(
            '<a href="%s">%s</a>',
            esc_url( admin_url( 'tools.php?page=atlas-clarus-browser-edition' ) ),
            esc_html__( 'Einrichtung', 'atlas-clarus-browser-edition' )
        );
        array_unshift( $links, $settings );
        return $links;
    }

    public static function menu_link_attributes( $atts, $menu_item, $args, $depth ) {
        if ( empty( $atts['href'] ) ) {
            return $atts;
        }

        $target_path = untrailingslashit( wp_parse_url( self::canvas_url(), PHP_URL_PATH ) );
        $href_path   = untrailingslashit( wp_parse_url( $atts['href'], PHP_URL_PATH ) );

        if ( $target_path && $href_path && $target_path === $href_path ) {
            $atts['target'] = '_blank';
            $rels = isset( $atts['rel'] ) ? preg_split( '/\s+/', trim( $atts['rel'] ) ) : array();
            $rels = array_filter( array_merge( $rels, array( 'noopener', 'noreferrer' ) ) );
            $atts['rel'] = implode( ' ', array_unique( $rels ) );
        }

        return $atts;
    }

    private static function uploads_base_dir() {
        $upload = wp_upload_dir();
        if ( ! empty( $upload['error'] ) ) {
            return new WP_Error( 'atlas_upload_dir', $upload['error'] );
        }
        return trailingslashit( $upload['basedir'] ) . 'atlas-clarus-browser-edition';
    }

    private static function target_dir() {
        $base = self::uploads_base_dir();
        if ( is_wp_error( $base ) ) {
            return $base;
        }
        return trailingslashit( $base ) . self::BUNDLE_VERSION;
    }

    private static function runtime_dir() {
        $stored = get_option( self::OPTION_RUNTIME_PATH, '' );
        if ( ! is_string( $stored ) || '' === $stored ) {
            return '';
        }
        $real = realpath( $stored );
        if ( false === $real || ! is_dir( $real ) ) {
            return '';
        }
        $base = self::uploads_base_dir();
        if ( is_wp_error( $base ) ) {
            return '';
        }
        $base_real = realpath( $base );
        if ( false === $base_real ) {
            return '';
        }
        if ( 0 !== strpos( $real . DIRECTORY_SEPARATOR, $base_real . DIRECTORY_SEPARATOR ) ) {
            return '';
        }
        return $real;
    }

    public static function runtime_ready() {
        $dir = self::runtime_dir();
        return $dir && is_readable( $dir . DIRECTORY_SEPARATOR . 'index.html' );
    }

    private static function runtime_url() {
        return home_url( '/' . self::ROUTE_BASE . '/' );
    }

    private static function canvas_url() {
        return home_url( '/' . self::CANVAS_ROUTE_BASE . '/' );
    }

    private static function valid_dimension( $value, $fallback ) {
        $value = trim( (string) $value );
        if ( preg_match( '/^(?:[1-9][0-9]{1,3})(?:px|vh|vw|%)$/', $value ) ) {
            return $value;
        }
        return $fallback;
    }

    private static function yes_no( $value ) {
        return in_array( strtolower( (string) $value ), array( '1', 'yes', 'true', 'ja' ), true );
    }

    public static function render_shortcode( $atts ) {
        $atts = shortcode_atts(
            array(
                'height'     => '86vh',
                'min_height' => '720px',
                'full_width' => 'yes',
                'title'      => 'ATLAS Clarus Browser Edition',
            ),
            $atts,
            'atlas_clarus_browser_edition'
        );

        if ( ! self::runtime_ready() ) {
            if ( current_user_can( 'manage_options' ) ) {
                return sprintf(
                    '<div class="atlas-clarus-browser-message"><strong>%s</strong> %s <a href="%s">%s</a></div>',
                    esc_html__( 'ATLAS Clarus Browser Edition:', 'atlas-clarus-browser-edition' ),
                    esc_html__( 'RC23 ist noch nicht lokal installiert.', 'atlas-clarus-browser-edition' ),
                    esc_url( admin_url( 'tools.php?page=atlas-clarus-browser-edition' ) ),
                    esc_html__( 'Jetzt einrichten', 'atlas-clarus-browser-edition' )
                );
            }
            return '<div class="atlas-clarus-browser-message">' . esc_html__( 'ATLAS Clarus Browser Edition ist derzeit nicht verfügbar.', 'atlas-clarus-browser-edition' ) . '</div>';
        }

        $height     = self::valid_dimension( $atts['height'], '86vh' );
        $min_height = self::valid_dimension( $atts['min_height'], '720px' );
        $full_width = self::yes_no( $atts['full_width'] );
        $title      = sanitize_text_field( $atts['title'] );

        $classes = 'atlas-clarus-browser-shell';
        if ( $full_width ) {
            $classes .= ' atlas-clarus-browser-shell--full';
        }

        $css = '';
        if ( ! self::$shortcode_css_printed ) {
            self::$shortcode_css_printed = true;
            $css = '<style>'
                . '.atlas-clarus-browser-shell{position:relative;width:100%;max-width:none;overflow:hidden;background:#0f1115;}'
                . '.atlas-clarus-browser-shell--full{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);}'
                . '.atlas-clarus-browser-frame{display:block;width:100%;border:0;background:#0f1115;}'
                . '.atlas-clarus-browser-message{padding:16px 18px;border:1px solid #dcdcde;background:#fff;}'
                . '@media(max-width:782px){.atlas-clarus-browser-shell--full{margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);}}'
                . '</style>';
        }

        return $css . sprintf(
            '<div class="%1$s"><iframe class="atlas-clarus-browser-frame" src="%2$s" title="%3$s" style="height:%4$s;min-height:%5$s" loading="eager" allow="clipboard-write; fullscreen" allowfullscreen referrerpolicy="same-origin"></iframe></div>',
            esc_attr( $classes ),
            esc_url( self::runtime_url() ),
            esc_attr( $title ),
            esc_attr( $height ),
            esc_attr( $min_height )
        );
    }

    public static function register_admin_page() {
        add_management_page(
            'ATLAS Clarus Browser Edition',
            'ATLAS Clarus Browser Edition',
            'manage_options',
            'atlas-clarus-browser-edition',
            array( __CLASS__, 'render_admin_page' )
        );
    }

    public static function render_admin_page() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        $ready        = self::runtime_ready();
        $installed_at = get_option( self::OPTION_INSTALLED_AT, '' );
        $stored_sha   = get_option( self::OPTION_RUNTIME_SHA, '' );
        ?>
        <div class="wrap">
            <h1>ATLAS Clarus Browser Edition</h1>
            <p>WordPress Plugin v<?php echo esc_html( self::VERSION ); ?> · Browser Bundle <?php echo esc_html( self::BUNDLE_VERSION ); ?></p>

            <table class="widefat striped" style="max-width:980px;margin:18px 0;">
                <tbody>
                    <tr><th style="width:230px;">Runtime-Status</th><td><strong><?php echo $ready ? 'LOCAL / READY' : 'NOT INSTALLED'; ?></strong></td></tr>
                    <tr><th>Mitgeliefertes Bundle</th><td><?php echo esc_html( self::BUNDLE_VERSION ); ?></td></tr>
                    <tr><th>Neues Bundle aktiv</th><td><?php echo hash_equals( self::BUNDLE_SHA256, (string) $stored_sha ) ? 'JA' : 'NEIN — bestehende Laufzeit bleibt aktiv'; ?></td></tr>
                    <tr><th>Erwartete ZIP-Größe</th><td><?php echo esc_html( number_format_i18n( self::BUNDLE_SIZE ) ); ?> Byte</td></tr>
                    <tr><th>Erwartete SHA-256</th><td><code><?php echo esc_html( self::BUNDLE_SHA256 ); ?></code></td></tr>
                    <tr><th>Installierte SHA-256</th><td><code><?php echo esc_html( $stored_sha ? $stored_sha : '—' ); ?></code></td></tr>
                    <tr><th>Installiert am</th><td><?php echo esc_html( $installed_at ? $installed_at : '—' ); ?></td></tr>
                </tbody>
            </table>

            <p><strong>Full-Canvas-Modus:</strong> Die öffentliche Adresse <code><?php echo esc_html( self::canvas_url() ); ?></code> wird direkt von diesem Plugin ausgeliefert — ohne WordPress-Theme, Header, Navigation, Seitentitel, Admin-Bar oder weißen Außenraum.</p>
            <p>Die Browser-Anwendung wird nach der Einrichtung lokal von dieser WordPress-Installation ausgeliefert. Es wird kein <code>chatgpt.site</code>-iframe verwendet.</p>
            <p><strong>Navigation v0.1.2:</strong> Ein WordPress-Menülink auf diese Full-Canvas-Adresse öffnet automatisch in einem neuen Tab. In der App selbst wird zusätzlich ein dezenter Button <code>← Zur Homepage</code> eingeblendet.</p>

            <p><strong>Neu in RC23: ATLAS Clarus Tone System v0.1.</strong> Verständliche Namen werden sichtbar, während HLC-Adresse und PKL-Identität unverändert bleiben. Die vorhandene Druckvorbereitung behält dieselben unabhängigen 4C- und ECG-Wege und ICC-Bildvorschauen.</p>

            <p><strong>RC23-Testkandidat – Browser-Abnahme offen:</strong> Desktop-/Mobilprüfung, WordPress-Laufzeittest und Quellenfreigabe sind vor öffentlichem Einsatz erforderlich. Das Plugin-Update allein schaltet das Bundle nicht um. Der folgende Knopf ändert die öffentlich ausgelieferte Laufzeit sofort.</p>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin:20px 0;">
                <input type="hidden" name="action" value="atlas_clarus_browser_install">
                <?php wp_nonce_field( 'atlas_clarus_browser_install', 'atlas_clarus_browser_nonce' ); ?>
                <?php submit_button( 'Mitgeliefertes RC23 prüfen und aktiv schalten', 'primary', 'submit', false ); ?>
            </form>
            <?php if ( get_option( self::OPTION_PREVIOUS_RUNTIME, false ) ) : ?>
            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                <input type="hidden" name="action" value="atlas_clarus_browser_rollback">
                <?php wp_nonce_field( 'atlas_clarus_browser_rollback', 'atlas_clarus_browser_nonce' ); ?>
                <?php submit_button( 'Zur vorherigen Laufzeit zurückwechseln', 'secondary' ); ?>
            </form>
            <?php endif; ?>

            <h2>Empfohlene öffentliche Adresse</h2>
            <p><code><?php echo esc_html( self::canvas_url() ); ?></code></p>
            <p>Diese Adresse verwendet den neuen Full-Canvas-Modus. Eine eventuell vorhandene WordPress-Seite mit dem Slug <code>atlas-clarus-browser-bundle</code> bleibt in der Datenbank erhalten, wird aber bei aktivem Plugin nicht gerendert.</p>

            <h2>Shortcode (Legacy / optional)</h2>
            <p><code>[atlas_clarus_browser_edition]</code></p>
            <p>Der Shortcode bleibt kompatibel, wird für die öffentliche Browser Edition aber nicht mehr empfohlen.</p>

            <?php if ( $ready ) : ?>
                <p><a class="button button-primary" href="<?php echo esc_url( self::canvas_url() ); ?>" target="_blank" rel="noopener">Full-Canvas Browser Edition öffnen</a></p>
            <?php endif; ?>

            <hr style="margin:28px 0;">
            <p><strong>Nicht verändert:</strong> bestehende Hover-Library-Plugins, Colour Identity Wheel, WordPress-Menüs, Seiten und Startseiten-Einstellungen. Die vorhandene WordPress-Seite wird nicht gelöscht oder bearbeitet.</p>
        </div>
        <?php
    }

    public static function admin_notices() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $key    = self::NOTICE_TRANSIENT_KEY . get_current_user_id();
        $notice = get_transient( $key );
        if ( $notice && is_array( $notice ) ) {
            delete_transient( $key );
            $type = ! empty( $notice['success'] ) ? 'notice-success' : 'notice-error';
            printf(
                '<div class="notice %1$s is-dismissible"><p>%2$s</p></div>',
                esc_attr( $type ),
                esc_html( isset( $notice['message'] ) ? $notice['message'] : '' )
            );
            return;
        }

        if ( ! self::runtime_ready() && isset( $_GET['page'] ) && 'atlas-clarus-browser-edition' === $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
            echo '<div class="notice notice-info"><p>' . esc_html__( 'RC23 muss einmalig lokal installiert werden. Danach läuft die Browser Edition von deinem eigenen WordPress-Webspace.', 'atlas-clarus-browser-edition' ) . '</p></div>';
        }
    }

    private static function set_notice( $success, $message ) {
        set_transient(
            self::NOTICE_TRANSIENT_KEY . get_current_user_id(),
            array(
                'success' => (bool) $success,
                'message' => (string) $message,
            ),
            120
        );
    }

    public static function handle_install_request() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'Keine Berechtigung.', 'atlas-clarus-browser-edition' ) );
        }
        check_admin_referer( 'atlas_clarus_browser_install', 'atlas_clarus_browser_nonce' );

        $result = self::install_bundle();
        if ( is_wp_error( $result ) ) {
            self::set_notice( false, 'RC23 wurde nicht umgeschaltet: ' . $result->get_error_message() );
        } else {
            self::set_notice( true, 'Mitgeliefertes RC23 wurde geprüft und aktiv geschaltet. Die vorherige Laufzeit bleibt erhalten.' );
        }

        wp_safe_redirect( admin_url( 'tools.php?page=atlas-clarus-browser-edition' ) );
        exit;
    }

    private static function install_bundle() {
        require_once ABSPATH . 'wp-admin/includes/file.php';

        global $wp_filesystem;
        if ( ! WP_Filesystem() || ! $wp_filesystem ) {
            return new WP_Error( 'atlas_filesystem', 'WordPress-Dateisystem konnte nicht initialisiert werden.' );
        }

        $target = self::target_dir();
        if ( is_wp_error( $target ) ) {
            return $target;
        }

        $base = self::uploads_base_dir();
        if ( is_wp_error( $base ) ) {
            return $base;
        }
        if ( ! wp_mkdir_p( $base ) ) {
            return new WP_Error( 'atlas_mkdir', 'Zielordner im Upload-Verzeichnis konnte nicht erstellt werden.' );
        }

        $tmp = __DIR__ . '/assets/bundle.zip';
        if ( ! is_readable( $tmp ) ) {
            return new WP_Error( 'atlas_package_missing', 'Mitgeliefertes Bundle fehlt.' );
        }
        // A new directory for every attempt: never remove an active runtime.
        $target .= '-' . wp_generate_uuid4();

        try {
            $size = @filesize( $tmp );
            if ( false === $size || (int) $size !== self::BUNDLE_SIZE ) {
                return new WP_Error(
                    'atlas_size_mismatch',
                    sprintf( 'ZIP-Größe stimmt nicht: erwartet %d Byte, erhalten %d Byte.', self::BUNDLE_SIZE, (int) $size )
                );
            }

            $sha = hash_file( 'sha256', $tmp );
            if ( ! is_string( $sha ) || ! hash_equals( self::BUNDLE_SHA256, strtolower( $sha ) ) ) {
                return new WP_Error( 'atlas_sha_mismatch', 'SHA-256-Prüfung fehlgeschlagen. Das RC23-Paket wird nicht installiert.' );
            }

            if ( ! wp_mkdir_p( $target ) ) {
                return new WP_Error( 'atlas_target_mkdir', 'RC23-Zielordner konnte nicht erstellt werden.' );
            }

            $unzipped = unzip_file( $tmp, $target );
            if ( is_wp_error( $unzipped ) ) {
                self::remove_tree( $target, $base );
                return $unzipped;
            }

            $runtime = self::find_runtime_root( $target );
            if ( is_wp_error( $runtime ) ) {
                self::remove_tree( $target, $base );
                return $runtime;
            }

            $index = $runtime . DIRECTORY_SEPARATOR . 'index.html';
            $head  = @file_get_contents( $index, false, null, 0, 65536 );
            if ( false === $head || false === stripos( $head, 'ATLAS' ) ) {
                self::remove_tree( $target, $base );
                return new WP_Error( 'atlas_index_validation', 'index.html konnte nicht als ATLAS-Clarus-Anwendung validiert werden.' );
            }

            $manifest = json_decode( (string) file_get_contents( $runtime . '/BUNDLE_MANIFEST.json' ), true );
            $manifest_check = self::validate_manifest( $manifest );
            if ( is_wp_error( $manifest_check ) ) {
                self::remove_tree( $target, $base );
                return $manifest_check;
            }
            $lines = file( $runtime . '/SHA256SUMS.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
            if ( ! is_array( $lines ) || ! count( $lines ) ) {
                self::remove_tree( $target, $base );
                return new WP_Error( 'atlas_checksums', 'Dateiprüfsummen fehlen.' );
            }
            foreach ( $lines as $line ) {
                if ( ! preg_match( '/^([a-f0-9]{64})  ([a-zA-Z0-9_.\/-]+)$/', $line, $parts ) || false !== strpos( $parts[2], '..' ) ) {
                    self::remove_tree( $target, $base );
                    return new WP_Error( 'atlas_checksums', 'Ungültiger Prüfpfad.' );
                }
                $file = realpath( $runtime . '/' . $parts[2] );
                if ( ! $file || 0 !== strpos( $file, $runtime . DIRECTORY_SEPARATOR ) || ! is_file( $file ) || ! hash_equals( $parts[1], (string) hash_file( 'sha256', $file ) ) ) {
                    self::remove_tree( $target, $base );
                    return new WP_Error( 'atlas_checksums', 'Dateiprüfsumme stimmt nicht.' );
                }
            }
            $previous = self::runtime_dir();
            if ( $previous && get_option( self::OPTION_RUNTIME_SHA, '' ) !== self::BUNDLE_SHA256 ) {
                update_option( self::OPTION_PREVIOUS_RUNTIME, array( 'path' => $previous, 'sha' => get_option( self::OPTION_RUNTIME_SHA, '' ), 'at' => get_option( self::OPTION_INSTALLED_AT, '' ) ), false );
            }

            update_option( self::OPTION_RUNTIME_PATH, $runtime, false );
            update_option( self::OPTION_RUNTIME_SHA, self::BUNDLE_SHA256, false );
            update_option( self::OPTION_INSTALLED_AT, current_time( 'mysql' ), false );
            flush_rewrite_rules( false );

            return true;
        } finally {
            // Embedded ZIP is part of this plugin and must not be deleted.
        }
    }

    private static function validate_manifest( $manifest ) {
        if ( ! is_array( $manifest ) ) {
            return new WP_Error( 'atlas_manifest', 'Bundle-Manifest fehlt oder ist kein JSON-Objekt.' );
        }
        // Strict values from the pinned RC23 manifest; never coerce identity fields.
        $expected = array(
            'version' => '0.2.0-rc23-tone-system-v0-1',
            'status' => 'PROFILE_BOUND_DEVICECMYK_AND_DEVICEN_PDF_CANDIDATE',
            'master_rows' => 13283,
            'master_sha256' => '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4',
            'row_id_base' => 0,
            'tone_system_version' => '0.1',
            'visible_name_source' => 'ATLAS_CLARUS_TONE_SYSTEM',
            'iscc_nbs_role' => 'METADATA_ONLY',
            'tone_system_sha256' => '848d3731524b6ab4658a4a340c0cd3cf5677465ed3368572c237f6e220d6fa06',
            'name_search_index_sha256' => '562a133e965766dc199d753391c9ec2db7bf091793b5358e6604ab22bc96e9db',
            'basis23_recipes' => 'COMPUTATIONAL_ONLY_NOT_MEASURED',
            'pixel_loupe' => 'ADAPTIVE_PIXEL_GRID_WITH_MARKED_SAMPLE_AREA',
            'picker_handoff' => 'PICKER_TO_HOVER_TO_WHEEL_WITH_RETURN',
            'area_alpha_threshold' => 128,
            'area_edge_policy' => 'CLIP_TO_IMAGE_BOUNDS',
            'picker_binding' => 'RGB_SQUARED_DISTANCE_FULL_MASTER',
            'palette_storage_failure' => 'VISIBLE_PERSISTENT_WARNING',
            'palette_import_validation' => 'STRICT_TYPED_FULL_FILE_BEFORE_MUTATION',
            'primary_user_path' => 'PICKER_HOVER_PALETTE_CLARUS_JSON',
            'max_palettes' => 50,
            'max_palette_colours' => 64,
            'a_prime_v04_logic' => 'UNCHANGED',
            'measured_qc_status' => 'NOT_MEASURED',
            'production_approval' => 'NOT_SUPPORTED',
            'workflow' => 'ATLAS Clarus v3.4.0',
            'print_handoff_version' => '0.1.0',
            'print_topology' => 'PARALLEL_FROM_SAME_FROZEN_REFERENCE',
            'print_profile_transport' => 'EMBEDDED_ICC_WITH_SHA256',
            'print_device_calculation' => 'SINGLE_REFERENCE_DEVICE16_WITH_PROFILE_BOUND_DEVICECMYK_AND_DEVICEN_PDF',
            'print_state_persistence' => 'IN_MEMORY_WITH_VERIFIED_JSON_IMPORT',
            'image_preview' => 'PKL_FULL_REFERENCE_THEN_INDEPENDENT_4C_ECG_ICC_PREVIEWS',
            'image_preview_identity_binding' => 'RGB_ONLY_NEAREST_MASTER_WITH_ATLAS_ROW_ID_TIEBREAK',
            'image_preview_foreign_colors_required' => 0,
            'image_preview_engine' => 'LittleCMS 2.16 / lcms-wasm 1.0.5',
            'image_preview_max_edge' => 1200,
        );
        foreach ( $expected as $key => $value ) {
            if ( ! array_key_exists( $key, $manifest ) || $value !== $manifest[ $key ] ) {
                return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld ' . $key . '.' );
            }
        }
        if ( false !== ( $manifest['image_preview_paper_white_simulation'] ?? null ) ||
            array( 'BA_PNG', 'PREVIEW_METADATA_JSON' ) !== ( $manifest['image_preview_exports'] ?? array() ) ) {
            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Bildvorschau-Einstellungen.' );
        }
        $expected_sampling = array( 'PIXEL_RGB', 'AREA_MEAN_RGB_5_X_5', 'AREA_MEAN_RGB_11_X_11', 'AREA_MEAN_RGB_21_X_21' );
        if ( $expected_sampling !== ( $manifest['sampling_modes'] ?? array() ) ) {
            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld sampling_modes.' );
        }
        if ( array( '4C', 'ECG' ) !== ( $manifest['print_paths'] ?? array() ) ) {
            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld print_paths.' );
        }
        if ( array( 'PARALLEL_PRINT_JSON', 'READABLE_HTML_REPORT', 'PROFILED_REFERENCE_JSON', 'DEVICECMYK_REFERENCE_PDF', 'DEVICEN_CMYKOGV_REFERENCE_PDF' ) !== ( $manifest['print_exports'] ?? array() ) ) {
            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld print_exports.' );
        }
        return true;
    }

    public static function handle_rollback_request() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Keine Berechtigung.' );
        }
        check_admin_referer( 'atlas_clarus_browser_rollback', 'atlas_clarus_browser_nonce' );
        $old = get_option( self::OPTION_PREVIOUS_RUNTIME, array() );
        $base = self::uploads_base_dir();
        $real = is_array( $old ) && isset( $old['path'] ) ? realpath( $old['path'] ) : false;
        $base_real = ! is_wp_error( $base ) ? realpath( $base ) : false;
        if ( $real && $base_real && 0 === strpos( $real . DIRECTORY_SEPARATOR, $base_real . DIRECTORY_SEPARATOR ) && $real !== $base_real && is_readable( $real . '/index.html' ) ) {
            update_option( self::OPTION_RUNTIME_PATH, $real, false );
            update_option( self::OPTION_RUNTIME_SHA, $old['sha'] ?? '', false );
            update_option( self::OPTION_INSTALLED_AT, $old['at'] ?? '', false );
            self::set_notice( true, 'Vorherige Laufzeit wieder aktiv. Keine Dateien gelöscht.' );
        } else {
            self::set_notice( false, 'Vorherige Laufzeit nicht verfügbar; nichts umgeschaltet.' );
        }
        wp_safe_redirect( admin_url( 'tools.php?page=atlas-clarus-browser-edition' ) );
        exit;
    }

    private static function find_runtime_root( $target ) {
        $candidates = array(
            $target,
            $target . DIRECTORY_SEPARATOR . 'atlas-clarus-browser-bundle',
        );

        foreach ( $candidates as $candidate ) {
            if ( is_readable( $candidate . DIRECTORY_SEPARATOR . 'index.html' ) ) {
                $real = realpath( $candidate );
                if ( false !== $real ) {
                    return $real;
                }
            }
        }

        $items = @scandir( $target );
        if ( is_array( $items ) ) {
            foreach ( $items as $item ) {
                if ( '.' === $item || '..' === $item ) {
                    continue;
                }
                $candidate = $target . DIRECTORY_SEPARATOR . $item;
                if ( is_dir( $candidate ) && is_readable( $candidate . DIRECTORY_SEPARATOR . 'index.html' ) ) {
                    $real = realpath( $candidate );
                    if ( false !== $real ) {
                        return $real;
                    }
                }
            }
        }

        return new WP_Error( 'atlas_runtime_missing', 'Das geprüfte RC23-ZIP enthält keinen erkennbaren Browser-Runtime-Ordner mit index.html.' );
    }

    private static function remove_tree( $path, $allowed_base ) {
        if ( ! file_exists( $path ) ) {
            return;
        }

        $allowed_parent = realpath( $allowed_base );
        $real_path      = realpath( $path );
        if ( false === $allowed_parent || false === $real_path ) {
            return;
        }
        if ( 0 !== strpos( $real_path . DIRECTORY_SEPARATOR, $allowed_parent . DIRECTORY_SEPARATOR ) ) {
            return;
        }

        if ( is_file( $real_path ) || is_link( $real_path ) ) {
            @unlink( $real_path );
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator( $real_path, FilesystemIterator::SKIP_DOTS ),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ( $iterator as $item ) {
            if ( $item->isDir() && ! $item->isLink() ) {
                @rmdir( $item->getPathname() );
            } else {
                @unlink( $item->getPathname() );
            }
        }
        @rmdir( $real_path );
    }

    private static function mime_type_for( $file ) {
        $ext = strtolower( pathinfo( $file, PATHINFO_EXTENSION ) );
        $map = array(
            'html'  => 'text/html; charset=utf-8',
            'htm'   => 'text/html; charset=utf-8',
            'css'   => 'text/css; charset=utf-8',
            'js'    => 'text/javascript; charset=utf-8',
            'mjs'   => 'text/javascript; charset=utf-8',
            'json'  => 'application/json; charset=utf-8',
            'txt'   => 'text/plain; charset=utf-8',
            'md'    => 'text/markdown; charset=utf-8',
            'svg'   => 'image/svg+xml',
            'png'   => 'image/png',
            'jpg'   => 'image/jpeg',
            'jpeg'  => 'image/jpeg',
            'gif'   => 'image/gif',
            'webp'  => 'image/webp',
            'ico'   => 'image/x-icon',
            'woff'  => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf'   => 'font/ttf',
            'csv'   => 'text/csv; charset=utf-8',
        );
        return isset( $map[ $ext ] ) ? $map[ $ext ] : 'application/octet-stream';
    }

    private static function inject_canvas_exit_button( $html ) {
        $home = esc_url( home_url( '/' ) );
        $label = esc_html__( 'Zur Homepage', 'atlas-clarus-browser-edition' );
        $style = '<style id="atlas-clarus-canvas-exit-style">'
            . '#atlas-clarus-canvas-exit{white-space:nowrap;border-left:1px solid #263142;padding-left:16px;color:#f4f7fb!important}'
            . '#atlas-clarus-canvas-exit:hover,#atlas-clarus-canvas-exit:focus{color:#9bff55!important}'
            . '@media(max-width:900px){#atlas-clarus-canvas-exit{display:block;border-left:0;border-top:1px solid #263142;margin-top:8px;padding:13px 12px 5px}}'
            . '.atlas-clarus-canvas-exit-fallback{padding:18px 24px;border-top:1px solid #263142;background:#0a0d12}'
            . '</style>';
        $link = '<a id="atlas-clarus-canvas-exit" href="' . $home . '" aria-label="' . esc_attr( $label ) . '">&#8592; ' . $label . '</a>';

        if ( false !== stripos( $html, '</nav>' ) ) {
            $html = preg_replace( '/<\/nav>/i', $link . '</nav>', $html, 1 );
            $link = '';
        } else {
            $link = '<div class="atlas-clarus-canvas-exit-fallback">' . $link . '</div>';
        }
        if ( false !== stripos( $html, '</body>' ) ) {
            return preg_replace( '/<\/body>/i', $style . $link . '</body>', $html, 1 );
        }
        return $html . $style . $link;
    }

    public static function serve_runtime_file() {
        $asset = get_query_var( 'atlas_clarus_browser_asset', null );
        if ( null === $asset || '' === $asset ) {
            return;
        }

        $runtime = self::runtime_dir();
        if ( ! $runtime ) {
            status_header( 503 );
            nocache_headers();
            header( 'Content-Type: text/plain; charset=utf-8' );
            echo 'ATLAS Clarus Browser Edition runtime is not installed.';
            exit;
        }

        $asset = rawurldecode( (string) $asset );
        $asset = str_replace( '\\', '/', $asset );
        $asset = ltrim( $asset, '/' );
        if ( '' === $asset ) {
            $asset = 'index.html';
        }
        if ( false !== strpos( $asset, "\0" ) || preg_match( '#(^|/)\.\.(/|$)#', $asset ) ) {
            status_header( 400 );
            exit;
        }

        $base = realpath( $runtime );
        $file = realpath( $runtime . DIRECTORY_SEPARATOR . $asset );
        if ( false === $base || false === $file || 0 !== strpos( $file, $base . DIRECTORY_SEPARATOR ) || ! is_file( $file ) || ! is_readable( $file ) ) {
            status_header( 404 );
            exit;
        }

        while ( ob_get_level() ) {
            ob_end_clean();
        }

        $is_index  = 'index.html' === basename( $file );
        $is_canvas = self::yes_no( get_query_var( self::CANVAS_QUERY_VAR, '' ) );

        status_header( 200 );
        header( 'Content-Type: ' . self::mime_type_for( $file ) );
        header( 'X-Content-Type-Options: nosniff' );

        if ( $is_index && $is_canvas ) {
            $html = @file_get_contents( $file );
            if ( false === $html ) {
                status_header( 500 );
                exit;
            }
            $html = self::inject_canvas_exit_button( $html );
            header( 'Cache-Control: no-cache, must-revalidate' );
            header( 'Content-Length: ' . (string) strlen( $html ) );
            echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted local RC23 HTML plus escaped plugin markup.
            exit;
        }

        header( 'Content-Length: ' . (string) filesize( $file ) );
        if ( $is_index ) {
            header( 'Cache-Control: no-cache, must-revalidate' );
        } else {
            header( 'Cache-Control: public, max-age=86400' );
        }
        readfile( $file );
        exit;
    }
}

ATLAS_Clarus_Browser_Edition::boot();
register_activation_hook( __FILE__, array( 'ATLAS_Clarus_Browser_Edition', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'ATLAS_Clarus_Browser_Edition', 'deactivate' ) );
