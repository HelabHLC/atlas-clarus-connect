    // WordPress 6.9+ administration API. Uses the same pinned installer as the UI.
    public static function register_ability_category() {
        wp_register_ability_category( 'atlas-clarus', array(
            'label' => 'ATLAS Clarus',
            'description' => 'Administrator operations for the local Browser Edition.',
        ) );
    }

    public static function register_install_ability() {
        wp_register_ability( 'atlas-clarus/install-browser-bundle', array(
            'label' => 'Activate the embedded ATLAS Clarus browser bundle',
            'description' => 'Checks the exact embedded ZIP, manifest and checksums, then switches the public runtime. Retains the previous runtime for admin rollback. Requires manage_options. Cannot accept a URL, path or code.',
            'category' => 'atlas-clarus',
            'input_schema' => array(
                'type' => 'object',
                'properties' => array(
                    'bundle_sha256' => array( 'type' => 'string', 'enum' => array( self::BUNDLE_SHA256 ) ),
                    'expected_runtime_sha256' => array( 'type' => 'string' ),
                ),
                'required' => array( 'bundle_sha256', 'expected_runtime_sha256' ),
                'additionalProperties' => false,
            ),
            'output_schema' => array(
                'type' => 'object',
                'properties' => array(
                    'plugin_version' => array( 'type' => 'string' ),
                    'bundle_version' => array( 'type' => 'string' ),
                    'active_bundle_sha256' => array( 'type' => 'string' ),
                    'previous_bundle_sha256' => array( 'type' => 'string' ),
                ),
                'required' => array( 'plugin_version', 'bundle_version', 'active_bundle_sha256', 'previous_bundle_sha256' ),
                'additionalProperties' => false,
            ),
            'permission_callback' => array( __CLASS__, 'can_install_browser_bundle' ),
            'execute_callback' => array( __CLASS__, 'install_browser_bundle_ability' ),
            'meta' => array( 'show_in_rest' => true, 'annotations' => array( 'readonly' => false, 'idempotent' => false ) ),
        ) );
    }

    public static function can_install_browser_bundle() {
        return current_user_can( 'manage_options' );
    }

    public static function install_browser_bundle_ability( $input ) {
        // Check again here: the callback is safe even if called outside the registry.
        if ( ! self::can_install_browser_bundle() ) {
            return new WP_Error( 'atlas_forbidden', 'Administrator permission required.' );
        }
        if ( ! is_array( $input ) || count( $input ) !== 2 ||
            ! isset( $input['bundle_sha256'], $input['expected_runtime_sha256'] ) ||
            self::BUNDLE_SHA256 !== $input['bundle_sha256'] ||
            ! is_string( $input['expected_runtime_sha256'] ) ) {
            return new WP_Error( 'atlas_install_input', 'Supply the embedded bundle hash and expected current runtime hash only.' );
        }
        if ( get_option( self::OPTION_RUNTIME_SHA, '' ) !== $input['expected_runtime_sha256'] ) {
            return new WP_Error( 'atlas_runtime_changed', 'The active runtime has changed. Read its current hash before retrying.' );
        }
        $result = self::install_bundle();
        if ( is_wp_error( $result ) ) {
            return $result;
        }
        $previous = get_option( self::OPTION_PREVIOUS_RUNTIME, array() );
        return array(
            'plugin_version' => self::VERSION,
            'bundle_version' => self::BUNDLE_VERSION,
            'active_bundle_sha256' => get_option( self::OPTION_RUNTIME_SHA, '' ),
            'previous_bundle_sha256' => is_array( $previous ) ? ( $previous['sha'] ?? '' ) : '',
        );
    }

