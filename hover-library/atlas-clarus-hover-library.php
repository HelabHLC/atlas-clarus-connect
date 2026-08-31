<?php
/**
 * Plugin Name: ATLAS Clarus Hover Library
 * Description: Interactive ATLAS Clarus HLC reference library with hover details, search, pagination, and documented observed-coverage views.
 * Version: 0.1.5
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: ATLAS Clarus
 * License: GPL-2.0-or-later
 * Text Domain: atlas-clarus-hover-library
 */

if (!defined('ABSPATH')) { exit; }

define('ATLAS_CLARUS_HOVER_VERSION', '0.1.5');
define('ATLAS_CLARUS_HOVER_FILE', __FILE__);
define('ATLAS_CLARUS_HOVER_DIR', plugin_dir_path(__FILE__));
define('ATLAS_CLARUS_HOVER_URL', plugin_dir_url(__FILE__));
define('ATLAS_CLARUS_MASTER_SHA256', '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4');
define('ATLAS_CLARUS_WHEEL_URL', 'https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site/');

function atlas_clarus_hover_allowed_views() {
    return array('core','xgc','solid_c','solid_u','bridge_c','bridge_u','neons_c','neons_u','metallics_c','cmyk_c','cmyk_u','tcx','tpg','tsx','tn','tpm','skintone');
}

function atlas_clarus_hover_view_labels() {
    return array(
        'core'=>'HLC Core Reference','xgc'=>'Extended Gamut Coated','solid_c'=>'Solid Coated',
        'solid_u'=>'Solid Uncoated','bridge_c'=>'Color Bridge Coated','bridge_u'=>'Color Bridge Uncoated',
        'neons_c'=>'Pastels & Neons Coated','neons_u'=>'Pastels & Neons Uncoated',
        'metallics_c'=>'Metallics Coated','cmyk_c'=>'CMYK Coated','cmyk_u'=>'CMYK Uncoated',
        'tcx'=>'FHI Cotton TCX','tpg'=>'FHI Paper TPG','tsx'=>'FHI Polyester TSX',
        'tn'=>'FHI Nylon Brights TN','tpm'=>'FHI Metallic Shimmers TPM','skintone'=>'SkinTone Guide',
    );
}

function atlas_clarus_hover_defaults() {
    return array('default_view'=>'core','per_page'=>120,'show_status'=>1,'show_search'=>1,'show_library_selector'=>1);
}

function atlas_clarus_hover_get_options() {
    $saved = get_option('atlas_clarus_hover_options', array());
    return wp_parse_args(is_array($saved) ? $saved : array(), atlas_clarus_hover_defaults());
}

function atlas_clarus_hover_sanitize_options($input) {
    $defaults = atlas_clarus_hover_defaults();
    $input = is_array($input) ? $input : array();
    $view = isset($input['default_view']) ? sanitize_key($input['default_view']) : $defaults['default_view'];
    $out = array();
    $out['default_view'] = in_array($view, atlas_clarus_hover_allowed_views(), true) ? $view : 'core';
    $per_page = isset($input['per_page']) ? absint($input['per_page']) : $defaults['per_page'];
    $out['per_page'] = min(480, max(24, $per_page));
    foreach (array('show_status','show_search','show_library_selector') as $key) {
        $out[$key] = !empty($input[$key]) ? 1 : 0;
    }
    return $out;
}

function atlas_clarus_hover_register_settings() {
    register_setting('atlas_clarus_hover_group', 'atlas_clarus_hover_options', array(
        'type'=>'array','sanitize_callback'=>'atlas_clarus_hover_sanitize_options','default'=>atlas_clarus_hover_defaults(),
    ));
}
add_action('admin_init', 'atlas_clarus_hover_register_settings');

function atlas_clarus_hover_admin_menu() {
    add_options_page('ATLAS Clarus Hover Library','ATLAS Clarus Library','manage_options','atlas-clarus-hover-library','atlas_clarus_hover_settings_page');
}
add_action('admin_menu', 'atlas_clarus_hover_admin_menu');

function atlas_clarus_hover_settings_page() {
    if (!current_user_can('manage_options')) { return; }
    $o = atlas_clarus_hover_get_options();
    ?>
    <div class="wrap">
        <h1><?php echo esc_html__('ATLAS Clarus Hover Library', 'atlas-clarus-hover-library'); ?></h1>
        <p><strong>Workflow:</strong> ATLAS Clarus Workflow v3.4.0<br><strong>Active master SHA-256:</strong> <code><?php echo esc_html(ATLAS_CLARUS_MASTER_SHA256); ?></code></p>
        <p>The Core view contains exact ATLAS identities. Other named views are documented observed-coverage views and do not assert Pantone identity equivalence.</p>
        <form method="post" action="options.php">
            <?php settings_fields('atlas_clarus_hover_group'); ?>
            <table class="form-table" role="presentation">
                <tr><th scope="row"><label for="atlas-default-view">Default view</label></th><td><select id="atlas-default-view" name="atlas_clarus_hover_options[default_view]">
                <?php foreach (atlas_clarus_hover_view_labels() as $key=>$label): ?><option value="<?php echo esc_attr($key); ?>" <?php selected($o['default_view'], $key); ?>><?php echo esc_html($label); ?></option><?php endforeach; ?>
                </select></td></tr>
                <tr><th scope="row"><label for="atlas-per-page">Swatches per page</label></th><td><input id="atlas-per-page" type="number" min="24" max="480" step="12" name="atlas_clarus_hover_options[per_page]" value="<?php echo esc_attr($o['per_page']); ?>"></td></tr>
                <tr><th scope="row">Interface</th><td>
                    <label><input type="checkbox" name="atlas_clarus_hover_options[show_status]" value="1" <?php checked($o['show_status'], 1); ?>> Show technical status</label><br>
                    <label><input type="checkbox" name="atlas_clarus_hover_options[show_search]" value="1" <?php checked($o['show_search'], 1); ?>> Show search</label><br>
                    <label><input type="checkbox" name="atlas_clarus_hover_options[show_library_selector]" value="1" <?php checked($o['show_library_selector'], 1); ?>> Show library selector</label>
                </td></tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Usage</h2><p><code>[atlas_clarus_library]</code></p>
        <p><code>[atlas_clarus_library view="solid_c" per_page="120" show_status="yes" show_search="yes" show_library_selector="yes"]</code></p>
        <h2>Technical boundary</h2>
        <p><code>SOURCE_AUTHORITY = UNRESOLVED</code> for Pantone-derived observed views<br><code>FREEZE_STATUS = NOT_FROZEN_EXPERIMENTAL</code><br><code>measured_qc_status = NOT_MEASURED</code></p>
        <p>4C, ECG, device values and measured QC are not generated by this plugin.</p>
    </div><?php
}

function atlas_clarus_hover_asset_version($relative_path) {
    $path = ATLAS_CLARUS_HOVER_DIR . ltrim($relative_path, '/');
    return is_readable($path) ? ATLAS_CLARUS_HOVER_VERSION . '.' . filemtime($path) : ATLAS_CLARUS_HOVER_VERSION;
}

function atlas_clarus_hover_register_assets() {
    wp_register_style('atlas-clarus-hover-library', ATLAS_CLARUS_HOVER_URL.'assets/css/atlas-clarus.css', array(), atlas_clarus_hover_asset_version('assets/css/atlas-clarus.css'));
    wp_register_script('atlas-clarus-hover-library', ATLAS_CLARUS_HOVER_URL.'assets/js/atlas-clarus.js', array(), atlas_clarus_hover_asset_version('assets/js/atlas-clarus.js'), true);
}
add_action('wp_enqueue_scripts', 'atlas_clarus_hover_register_assets');

function atlas_clarus_hover_yesno($value, $default) {
    if ($value === null || $value === '') { return (bool)$default; }
    return !in_array(strtolower((string)$value), array('0','no','false','off'), true);
}

function atlas_clarus_hover_shortcode($atts=array()) {
    $o = atlas_clarus_hover_get_options();
    $atts = shortcode_atts(array(
        'view'=>$o['default_view'],'per_page'=>$o['per_page'],
        'show_status'=>$o['show_status']?'yes':'no','show_search'=>$o['show_search']?'yes':'no',
        'show_library_selector'=>$o['show_library_selector']?'yes':'no',
    ), $atts, 'atlas_clarus_library');
    $view = sanitize_key($atts['view']);
    if (!in_array($view, atlas_clarus_hover_allowed_views(), true)) { $view='core'; }
    $per_page = min(480, max(24, absint($atts['per_page'])));
    wp_enqueue_style('atlas-clarus-hover-library'); wp_enqueue_script('atlas-clarus-hover-library');
    $instance = wp_unique_id('atlas-clarus-');
    return sprintf(
        '<section id="%1$s" class="atlas-clarus-library" aria-label="%9$s" data-colors-url="%2$s" data-views-url="%3$s" data-default-view="%4$s" data-per-page="%5$d" data-show-status="%6$s" data-show-search="%7$s" data-show-library-selector="%8$s" data-wheel-url="%11$s"><div class="atlas-clarus-loading" role="status">%10$s</div></section>',
        esc_attr($instance),esc_url(ATLAS_CLARUS_HOVER_URL.'data/colors.json'),esc_url(ATLAS_CLARUS_HOVER_URL.'data/views.json'),esc_attr($view),$per_page,
        atlas_clarus_hover_yesno($atts['show_status'],true)?'1':'0',atlas_clarus_hover_yesno($atts['show_search'],true)?'1':'0',atlas_clarus_hover_yesno($atts['show_library_selector'],true)?'1':'0',
        esc_attr__('ATLAS Clarus colour reference library','atlas-clarus-hover-library'),esc_html__('Loading ATLAS Clarus library…','atlas-clarus-hover-library'),
        esc_url(apply_filters('atlas_clarus_hover_wheel_url', ATLAS_CLARUS_WHEEL_URL))
    );
}
add_shortcode('atlas_clarus_library','atlas_clarus_hover_shortcode');
