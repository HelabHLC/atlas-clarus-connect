<?php
/**
 * Plugin Name: ATLAS Clarus Reference Wheel
 * Description: Bindet das ATLAS Clarus Reference Wheel responsiv per Shortcode in WordPress ein.
 * Version: 1.0.0
 * Author: ARBE / ATLAS Clarus
 * License: GPL-2.0-or-later
 * Text Domain: atlas-clarus-reference-wheel
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'ATLAS_CLARUS_WHEEL_VERSION', '1.0.0' );
define( 'ATLAS_CLARUS_WHEEL_DEFAULT_URL', 'https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site' );

function atlas_clarus_wheel_register_settings() {
    register_setting(
        'atlas_clarus_wheel_settings',
        'atlas_clarus_wheel_options',
        array(
            'type'              => 'array',
            'sanitize_callback' => 'atlas_clarus_wheel_sanitize_options',
            'default'           => array(),
        )
    );
}
add_action( 'admin_init', 'atlas_clarus_wheel_register_settings' );

function atlas_clarus_wheel_sanitize_options( $input ) {
    $output = array();
    $url = isset( $input['url'] ) ? esc_url_raw( $input['url'] ) : ATLAS_CLARUS_WHEEL_DEFAULT_URL;

    $output['url'] = wp_http_validate_url( $url ) ? $url : ATLAS_CLARUS_WHEEL_DEFAULT_URL;
    $output['desktop_height'] = isset( $input['desktop_height'] ) ? min( 3000, max( 500, absint( $input['desktop_height'] ) ) ) : 1200;
    $output['mobile_height'] = isset( $input['mobile_height'] ) ? min( 4000, max( 700, absint( $input['mobile_height'] ) ) ) : 1500;

    return $output;
}

function atlas_clarus_wheel_add_settings_page() {
    add_options_page(
        'ATLAS Clarus Reference Wheel',
        'ATLAS Clarus Wheel',
        'manage_options',
        'atlas-clarus-reference-wheel',
        'atlas_clarus_wheel_render_settings_page'
    );
}
add_action( 'admin_menu', 'atlas_clarus_wheel_add_settings_page' );

function atlas_clarus_wheel_get_options() {
    return wp_parse_args(
        get_option( 'atlas_clarus_wheel_options', array() ),
        array(
            'url'            => ATLAS_CLARUS_WHEEL_DEFAULT_URL,
            'desktop_height' => 1200,
            'mobile_height'  => 1500,
        )
    );
}

function atlas_clarus_wheel_render_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $options = atlas_clarus_wheel_get_options();
    ?>
    <div class="wrap">
        <h1>ATLAS Clarus Reference Wheel</h1>
        <p>Verwenden Sie den Shortcode <code>[atlas_clarus_wheel]</code> in einer Seite, einem Beitrag oder einem Shortcode-Block.</p>
        <form method="post" action="options.php">
            <?php settings_fields( 'atlas_clarus_wheel_settings' ); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="atlas-clarus-url">Anwendungs-URL</label></th>
                    <td><input id="atlas-clarus-url" class="regular-text" type="url" name="atlas_clarus_wheel_options[url]" value="<?php echo esc_attr( $options['url'] ); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="atlas-clarus-desktop-height">Höhe Desktop</label></th>
                    <td><input id="atlas-clarus-desktop-height" type="number" min="500" max="3000" name="atlas_clarus_wheel_options[desktop_height]" value="<?php echo esc_attr( $options['desktop_height'] ); ?>"> px</td>
                </tr>
                <tr>
                    <th scope="row"><label for="atlas-clarus-mobile-height">Höhe Smartphone</label></th>
                    <td><input id="atlas-clarus-mobile-height" type="number" min="700" max="4000" name="atlas_clarus_wheel_options[mobile_height]" value="<?php echo esc_attr( $options['mobile_height'] ); ?>"> px</td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

function atlas_clarus_wheel_enqueue_assets() {
    wp_register_style(
        'atlas-clarus-reference-wheel',
        plugins_url( 'assets/atlas-clarus-wheel.css', __FILE__ ),
        array(),
        ATLAS_CLARUS_WHEEL_VERSION
    );
}
add_action( 'wp_enqueue_scripts', 'atlas_clarus_wheel_enqueue_assets' );

function atlas_clarus_wheel_shortcode( $atts ) {
    $options = atlas_clarus_wheel_get_options();
    $atts = shortcode_atts(
        array(
            'height'        => $options['desktop_height'],
            'mobile_height' => $options['mobile_height'],
            'title'         => 'ATLAS Clarus Reference Wheel',
        ),
        $atts,
        'atlas_clarus_wheel'
    );

    $height = min( 3000, max( 500, absint( $atts['height'] ) ) );
    $mobile_height = min( 4000, max( 700, absint( $atts['mobile_height'] ) ) );
    $url = esc_url( $options['url'] );

    wp_enqueue_style( 'atlas-clarus-reference-wheel' );

    ob_start();
    ?>
    <div class="atlas-clarus-wheel-embed" style="--atlas-wheel-height:<?php echo esc_attr( $height ); ?>px;--atlas-wheel-mobile-height:<?php echo esc_attr( $mobile_height ); ?>px">
        <iframe src="<?php echo $url; ?>" title="<?php echo esc_attr( $atts['title'] ); ?>" loading="lazy" allow="clipboard-write"></iframe>
        <p class="atlas-clarus-wheel-fallback">Falls die Anwendung nicht angezeigt wird: <a href="<?php echo $url; ?>" target="_blank" rel="noopener noreferrer">ATLAS Clarus in einem neuen Fenster öffnen</a>.</p>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'atlas_clarus_wheel', 'atlas_clarus_wheel_shortcode' );

