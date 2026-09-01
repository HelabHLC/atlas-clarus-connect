<?php
/**
 * Plugin Name: ATLAS Clarus Appearance Pixel Simulator
 * Description: Master-bound, pixel-addressable appearance engineering simulator using the verified 13,283-row ATLAS Clarus active master projection.
 * Version: 0.1.1
 * Author: Norbert / ATLAS Clarus
 * License: GPL-2.0-or-later
 * Text Domain: atlas-clarus-appearance-pixel-simulator
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ATLAS_CLARUS_APS_VERSION', '0.1.1' );
define( 'ATLAS_CLARUS_APS_URL', plugin_dir_url( __FILE__ ) );
define( 'ATLAS_CLARUS_APS_MASTER_SHA256', '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4' );
define( 'ATLAS_CLARUS_APS_PROJECTION_MANIFEST_SHA256', '561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec' );

function atlas_clarus_aps_activate() {
	add_option( 'atlas_clarus_aps_source_row_id', '4665' );
}
register_activation_hook( __FILE__, 'atlas_clarus_aps_activate' );

function atlas_clarus_aps_sanitize_row_id( $value ) {
	$value = absint( $value );
	return (string) min( 13282, $value );
}

function atlas_clarus_aps_register_settings() {
	register_setting(
		'atlas_clarus_aps_settings',
		'atlas_clarus_aps_source_row_id',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'atlas_clarus_aps_sanitize_row_id',
			'default'           => '4665',
		)
	);
}
add_action( 'admin_init', 'atlas_clarus_aps_register_settings' );

function atlas_clarus_aps_admin_menu() {
	add_options_page(
		'ATLAS Clarus Appearance',
		'ATLAS Clarus Appearance',
		'manage_options',
		'atlas-clarus-appearance',
		'atlas_clarus_aps_render_settings_page'
	);
}
add_action( 'admin_menu', 'atlas_clarus_aps_admin_menu' );

function atlas_clarus_aps_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'ATLAS Clarus Appearance Pixel Simulator', 'atlas-clarus-appearance-pixel-simulator' ); ?></h1>
		<p><?php esc_html_e( 'Use the shortcode [atlas_clarus_appearance_simulator] on any page or post. PKL, RGB, HEX, Lab, spectral and illuminant values are read-only values from the verified active-master projection.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
		<form action="options.php" method="post">
			<?php settings_fields( 'atlas_clarus_aps_settings' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="atlas-clarus-aps-row"><?php esc_html_e( 'Default source_atlas_row_id', 'atlas-clarus-appearance-pixel-simulator' ); ?></label></th>
					<td><input id="atlas-clarus-aps-row" name="atlas_clarus_aps_source_row_id" type="number" min="0" max="13282" value="<?php echo esc_attr( get_option( 'atlas_clarus_aps_source_row_id', '4665' ) ); ?>"><p class="description"><?php esc_html_e( 'Zero-based internal master key. Row 4665 resolves to H125_L075_C080 / #76CD27.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<hr>
		<p><strong><?php esc_html_e( 'Active master:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> 13,283 rows · 114 source columns · SHA-256 <code><?php echo esc_html( ATLAS_CLARUS_APS_MASTER_SHA256 ); ?></code></p>
		<p><strong><?php esc_html_e( 'Evidence boundary:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <?php esc_html_e( 'Identity, spectrum and illuminant-extension values come from the verified master projection. Material, specular, height and appearance layers remain deterministic simulations. The plugin does not create BRDF/BSDF data, a physical proof or measured QC.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
	</div>
	<?php
}

function atlas_clarus_aps_register_assets() {
	wp_register_style(
		'atlas-clarus-aps',
		ATLAS_CLARUS_APS_URL . 'assets/css/simulator.css',
		array(),
		ATLAS_CLARUS_APS_VERSION
	);
	wp_register_script(
		'atlas-clarus-aps',
		ATLAS_CLARUS_APS_URL . 'assets/js/simulator.js',
		array(),
		ATLAS_CLARUS_APS_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'atlas_clarus_aps_register_assets' );

function atlas_clarus_aps_shortcode() {
	wp_enqueue_style( 'atlas-clarus-aps' );
	wp_enqueue_script( 'atlas-clarus-aps' );

	$row_id = get_option( 'atlas_clarus_aps_source_row_id', '4665' );
	$uid    = wp_unique_id( 'atlas-clarus-aps-' );

	ob_start();
	?>
	<section
		id="<?php echo esc_attr( $uid ); ?>"
		class="atlas-clarus-appearance-simulator"
		data-row-id="<?php echo esc_attr( $row_id ); ?>"
		data-version="<?php echo esc_attr( ATLAS_CLARUS_APS_VERSION ); ?>"
		data-master-base="<?php echo esc_url( ATLAS_CLARUS_APS_URL . 'assets/master/' ); ?>"
		data-master-sha256="<?php echo esc_attr( ATLAS_CLARUS_APS_MASTER_SHA256 ); ?>"
		data-projection-manifest-sha256="<?php echo esc_attr( ATLAS_CLARUS_APS_PROJECTION_MANIFEST_SHA256 ); ?>"
	>
		<header class="atlas-clarus-aps__header">
			<div>
				<h2><?php esc_html_e( 'ATLAS Clarus Appearance Pixel Simulator', 'atlas-clarus-appearance-pixel-simulator' ); ?></h2>
				<p><?php esc_html_e( '27,216 discrete combinations plus continuous viewing-angle, gloss, relief and wavelength inspection.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
			</div>
			<div class="atlas-clarus-aps__identity">
				<span class="atlas-clarus-aps__swatch" aria-hidden="true"></span>
				<div>
					<strong data-output="pkl"><?php esc_html_e( 'Loading master…', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong>
					<code data-output="identity"></code>
				</div>
			</div>
		</header>

		<div class="atlas-clarus-aps__layout">
			<div class="atlas-clarus-aps__controls">
				<label class="atlas-clarus-aps__wide"><?php esc_html_e( 'Master search', 'atlas-clarus-appearance-pixel-simulator' ); ?><input data-control="master-search" type="search" placeholder="H125_L075_C080, #76CD27 or row 4665"><select data-control="master-row" size="5" aria-label="<?php esc_attr_e( 'Master search results', 'atlas-clarus-appearance-pixel-simulator' ); ?>"></select></label>
				<label><?php esc_html_e( 'Material', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="material">
						<option value="paper"><?php esc_html_e( 'Coated paperboard', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="polymer"><?php esc_html_e( 'Polymer film', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="metal"><?php esc_html_e( 'Brushed metal', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="textile"><?php esc_html_e( 'Woven textile', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="glass"><?php esc_html_e( 'Translucent glass', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="wood"><?php esc_html_e( 'Wood veneer', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
					</select>
				</label>
				<label><?php esc_html_e( 'Finish', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="finish">
						<option value="matte"><?php esc_html_e( 'Matte', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="satin"><?php esc_html_e( 'Satin', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="gloss" selected><?php esc_html_e( 'High gloss', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="metallic"><?php esc_html_e( 'Metallic', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="pearlescent"><?php esc_html_e( 'Pearlescent', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="softtouch"><?php esc_html_e( 'Soft-touch', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
						<option value="uncoated"><?php esc_html_e( 'Uncoated', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
					</select>
				</label>
				<label><?php esc_html_e( 'Illuminant', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="light">
						<option value="ALS_BASE_D50">ALS_BASE_D50</option><option value="ALS_BASE_D65">ALS_BASE_D65</option><option value="ALS_BASE_A">ALS_BASE_A</option><option value="ALS_LED_P1">ALS_LED_P1</option><option value="ALS_LED_P2">ALS_LED_P2</option><option value="ALS_LED_P3">ALS_LED_P3</option><option value="ALS_STR_1">ALS_STR_1</option><option value="ALS_STR_2">ALS_STR_2</option><option value="ALS_STR_3">ALS_STR_3</option>
					</select>
				</label>
				<label><?php esc_html_e( 'Embellishment', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="effect">
						<option value="none"><?php esc_html_e( 'None', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="spot" selected><?php esc_html_e( 'Spot varnish', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="foil"><?php esc_html_e( 'Metal foil', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="emboss"><?php esc_html_e( 'Emboss', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="raised"><?php esc_html_e( 'Raised ink', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="holographic"><?php esc_html_e( 'Holographic foil', 'atlas-clarus-appearance-pixel-simulator' ); ?></option>
					</select>
				</label>
				<label><?php esc_html_e( 'Texture', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="texture"><option value="smooth"><?php esc_html_e( 'Smooth', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="grain"><?php esc_html_e( 'Fine grain', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="fibres"><?php esc_html_e( 'Fibres', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="woven"><?php esc_html_e( 'Woven', 'atlas-clarus-appearance-pixel-simulator' ); ?></option></select>
				</label>
				<label><?php esc_html_e( 'Pixel map', 'atlas-clarus-appearance-pixel-simulator' ); ?>
					<select data-control="map"><option value="composite"><?php esc_html_e( 'Appearance composite', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="identity"><?php esc_html_e( 'Frozen identity', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="spectral"><?php esc_html_e( 'Master spectral reflectance', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="specular"><?php esc_html_e( 'Specular intensity', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="height"><?php esc_html_e( 'Surface height', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="mask"><?php esc_html_e( 'Embellishment mask', 'atlas-clarus-appearance-pixel-simulator' ); ?></option></select>
				</label>
				<label class="atlas-clarus-aps__wide"><?php esc_html_e( 'Viewing angle', 'atlas-clarus-appearance-pixel-simulator' ); ?>: <output data-output="angle">30°</output><input data-control="angle" type="range" min="0" max="80" value="30"></label>
				<label class="atlas-clarus-aps__wide"><?php esc_html_e( 'Gloss strength', 'atlas-clarus-appearance-pixel-simulator' ); ?>: <output data-output="gloss">70 GU</output><input data-control="gloss" type="range" min="0" max="100" value="70"></label>
				<label class="atlas-clarus-aps__wide"><?php esc_html_e( 'Relief depth', 'atlas-clarus-appearance-pixel-simulator' ); ?>: <output data-output="depth">35%</output><input data-control="depth" type="range" min="0" max="100" value="35"></label>
				<label class="atlas-clarus-aps__wide"><?php esc_html_e( 'Reference wavelength', 'atlas-clarus-appearance-pixel-simulator' ); ?>: <output data-output="wavelength">550 nm</output><input data-control="wavelength" type="range" min="380" max="730" step="10" value="550"></label>
				<label><?php esc_html_e( 'Pixel grid', 'atlas-clarus-appearance-pixel-simulator' ); ?><select data-control="grid"><option value="24">24 × 15</option><option value="40" selected>40 × 25</option><option value="64">64 × 40</option></select></label>
				<label class="atlas-clarus-aps__check"><input data-control="gridlines" type="checkbox" checked> <?php esc_html_e( 'Show pixel boundaries', 'atlas-clarus-appearance-pixel-simulator' ); ?></label>
			</div>

			<div class="atlas-clarus-aps__stage">
				<div class="atlas-clarus-aps__status"><code data-output="combination"></code><strong data-output="master-status">LOADING MASTER</strong></div>
				<div class="atlas-clarus-aps__canvas-wrap"><canvas width="640" height="400" aria-label="<?php esc_attr_e( 'Pixel-level illustrative appearance simulation', 'atlas-clarus-appearance-pixel-simulator' ); ?>"></canvas><span data-output="map-label"><?php esc_html_e( 'Appearance composite', 'atlas-clarus-appearance-pixel-simulator' ); ?></span></div>
				<div class="atlas-clarus-aps__readout" aria-live="polite">
					<div><span><?php esc_html_e( 'Selected pixel', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><code data-output="pixel"></code></div>
					<div><span><?php esc_html_e( 'Simulated RGB', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><code data-output="pixel-rgb"></code></div>
					<div><span><?php esc_html_e( 'Pixel / master channels', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><code data-output="channels"></code></div>
				</div>
				<div class="atlas-clarus-aps__actions">
					<button type="button" data-export="manifest"><?php esc_html_e( 'Export manifest', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
					<button type="button" data-export="pixels"><?php esc_html_e( 'Export pixel data', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
					<button type="button" data-export="png"><?php esc_html_e( 'Export PNG', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
				</div>
				<p class="atlas-clarus-aps__boundary"><strong><?php esc_html_e( 'Evidence boundary:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <?php esc_html_e( 'Identity, spectral reference and illuminant diagnostics are master-bound. Material, specular, height and appearance pixels remain simulated—not BRDF/BSDF or physical QC data. QC_STATUS remains NOT_MEASURED.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
			</div>
		</div>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'atlas_clarus_appearance_simulator', 'atlas_clarus_aps_shortcode' );
