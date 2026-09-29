<?php
/**
 * Plugin Name: ATLAS Clarus Colour ID Languages
 * Description: German and English interface switch for the existing Colour ID workbench.
 * Version: 0.1.0
 * License: GPL-2.0-or-later
 * Text Domain: atlas-clarus-colour-id-languages
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', static function () {
    // The original Colour Picker plugin, master data, and other pages are untouched.
    if ( ! is_page( 5227 ) ) {
        return;
    }

    wp_enqueue_script(
        'atlas-clarus-colour-id-languages',
        plugins_url( 'colour-id-i18n.js', __FILE__ ),
        array(),
        '0.1.0',
        true
    );
} );
