<?php
/**
 * Plugin Name: ATLAS Clarus Appearance Pixel Simulator
 * Description: Open, master-bound appearance preview with APF material identity and evidence binding.
 * Version: 0.3.1
 * Author: Norbert / ATLAS Clarus
 * License: GPL-2.0-or-later
 * Text Domain: atlas-clarus-appearance-pixel-simulator
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ATLAS_CLARUS_APS_VERSION', '0.3.1' );
define( 'ATLAS_CLARUS_APS_URL', plugin_dir_url( __FILE__ ) );
define( 'ATLAS_CLARUS_APS_MASTER_SHA256', '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4' );
define( 'ATLAS_CLARUS_APS_PROJECTION_MANIFEST_SHA256', '561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec' );
define( 'ATLAS_CLARUS_APS_CIE_ENGINE_SHA256', '6e989630a7e1592a4a627542f52d0fb2882effc43af62552c2f5cfde8d750c75' );

function atlas_clarus_aps_activate() {
	add_option( 'atlas_clarus_aps_source_row_id', '4665' );
	add_option( 'atlas_clarus_aps_renderer_mode', 'mock' );
	add_option( 'atlas_clarus_aps_renderer_endpoint', '' );
	add_option( 'atlas_clarus_aps_renderer_token', '' );
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
	register_setting( 'atlas_clarus_aps_settings', 'atlas_clarus_aps_renderer_mode', array( 'type' => 'string', 'sanitize_callback' => function( $value ) { return 'external' === $value ? 'external' : 'mock'; }, 'default' => 'mock' ) );
	register_setting( 'atlas_clarus_aps_settings', 'atlas_clarus_aps_renderer_endpoint', array( 'type' => 'string', 'sanitize_callback' => 'esc_url_raw', 'default' => '' ) );
	register_setting( 'atlas_clarus_aps_settings', 'atlas_clarus_aps_renderer_token', array( 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ) );
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
				<tr>
					<th scope="row"><label for="atlas-clarus-aps-renderer-mode"><?php esc_html_e( 'Renderer connector', 'atlas-clarus-appearance-pixel-simulator' ); ?></label></th>
					<td>
						<select id="atlas-clarus-aps-renderer-mode" name="atlas_clarus_aps_renderer_mode"><option value="mock" <?php selected( get_option( 'atlas_clarus_aps_renderer_mode', 'mock' ), 'mock' ); ?>><?php esc_html_e( 'Mock simulation', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="external" <?php selected( get_option( 'atlas_clarus_aps_renderer_mode', 'mock' ), 'external' ); ?>><?php esc_html_e( 'External JSON renderer', 'atlas-clarus-appearance-pixel-simulator' ); ?></option></select>
						<p class="description"><?php esc_html_e( 'Mock mode validates the connector and evidence chain but does not decode the selected material.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="atlas-clarus-aps-renderer-endpoint"><?php esc_html_e( 'External endpoint', 'atlas-clarus-appearance-pixel-simulator' ); ?></label></th>
					<td><input class="regular-text" id="atlas-clarus-aps-renderer-endpoint" name="atlas_clarus_aps_renderer_endpoint" type="url" value="<?php echo esc_attr( get_option( 'atlas_clarus_aps_renderer_endpoint', '' ) ); ?>" placeholder="https://renderer.example/v1/render"></td>
				</tr>
				<tr>
					<th scope="row"><label for="atlas-clarus-aps-renderer-token"><?php esc_html_e( 'Bearer token', 'atlas-clarus-appearance-pixel-simulator' ); ?></label></th>
					<td><input class="regular-text" id="atlas-clarus-aps-renderer-token" name="atlas_clarus_aps_renderer_token" type="password" value="<?php echo esc_attr( get_option( 'atlas_clarus_aps_renderer_token', '' ) ); ?>" autocomplete="new-password"><p class="description"><?php esc_html_e( 'Stored server-side and never exposed to the browser.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<hr>
		<p><strong><?php esc_html_e( 'Active master:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> 13,283 rows · 114 source columns · SHA-256 <code><?php echo esc_html( ATLAS_CLARUS_APS_MASTER_SHA256 ); ?></code></p>
		<p><strong><?php esc_html_e( 'APF evidence boundary:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <?php esc_html_e( 'Identity, spectrum and illuminant-extension values come from the verified master projection. Material, specular, height and appearance layers remain deterministic simulations. APF records this distinction and does not create BRDF/BSDF data, a physical proof or measured QC.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
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

function atlas_clarus_aps_renderer_permission() {
	return 'mock' === get_option( 'atlas_clarus_aps_renderer_mode', 'mock' ) || current_user_can( 'upload_files' );
}

function atlas_clarus_aps_mock_render( $request ) {
	$identity = $request['identity'];
	$selector = $request['material_selector'];
	$scene    = $request['scene'];
	$label    = sanitize_text_field( $identity['reference_code'] . ' · ' . $selector['value'] );
	$light    = sanitize_text_field( $scene['illumination'] );
	$angle    = floatval( $scene['view_angle_degrees'] );
	$svg      = '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs><linearGradient id="g"><stop stop-color="#101820"/><stop offset="1" stop-color="#34495e"/></linearGradient><radialGradient id="h" cx="' . esc_attr( (string) max( 0.1, min( 0.9, $angle / 90 ) ) ) . '" cy=".35"><stop stop-color="#fff" stop-opacity=".75"/><stop offset=".28" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs><rect width="960" height="600" fill="url(#g)"/><rect x="100" y="90" width="760" height="390" rx="28" fill="url(#h)" stroke="#fff" stroke-opacity=".35"/><text x="100" y="530" fill="#fff" font-family="sans-serif" font-size="24">' . esc_html( $label ) . '</text><text x="100" y="565" fill="#fff" fill-opacity=".65" font-family="sans-serif" font-size="18">MOCK_SIMULATION · ' . esc_html( $light ) . ' · no material decoding</text></svg>';
	return array(
		'connector_contract' => 'ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1',
		'job_id'             => wp_generate_uuid4(),
		'renderer'           => 'ATLAS Clarus Mock Renderer',
		'renderer_version'   => ATLAS_CLARUS_APS_VERSION,
		'status'             => 'SIMULATED',
		'evidence_class'     => 'MOCK_SIMULATION',
		'media_type'         => 'image/svg+xml',
		'output_base64'      => base64_encode( $svg ),
		'output_sha256'      => hash( 'sha256', $svg ),
		'limitation'         => 'Connector test only. Material bytes were not decoded and no physical measurement was performed.',
	);
}

function atlas_clarus_aps_renderer_request( WP_REST_Request $request ) {
	$payload = $request->get_json_params();
	if ( ! is_array( $payload ) || empty( $payload['identity']['master_sha256'] ) || empty( $payload['asset']['sha256'] ) || empty( $payload['material_selector']['value'] ) || empty( $payload['scene']['illumination'] ) ) {
		return new WP_Error( 'atlas_clarus_invalid_render_request', 'Missing renderer contract fields.', array( 'status' => 400 ) );
	}
	if ( ATLAS_CLARUS_APS_MASTER_SHA256 !== $payload['identity']['master_sha256'] || ! preg_match( '/^[a-f0-9]{64}$/', $payload['asset']['sha256'] ) ) {
		return new WP_Error( 'atlas_clarus_invalid_render_identity', 'Master or material digest validation failed.', array( 'status' => 422 ) );
	}
	if ( 'mock' === get_option( 'atlas_clarus_aps_renderer_mode', 'mock' ) ) {
		return rest_ensure_response( atlas_clarus_aps_mock_render( $payload ) );
	}
	$endpoint = get_option( 'atlas_clarus_aps_renderer_endpoint', '' );
	if ( ! $endpoint || ! wp_http_validate_url( $endpoint ) ) {
		return new WP_Error( 'atlas_clarus_renderer_not_configured', 'External renderer endpoint is not configured.', array( 'status' => 503 ) );
	}
	if ( empty( $payload['asset']['content_base64'] ) ) {
		return new WP_Error( 'atlas_clarus_renderer_asset_missing', 'External mode requires appearance-material bytes.', array( 'status' => 422 ) );
	}
	$material_bytes = base64_decode( $payload['asset']['content_base64'], true );
	if ( false === $material_bytes || strlen( $material_bytes ) > 10 * MB_IN_BYTES || ! hash_equals( $payload['asset']['sha256'], hash( 'sha256', $material_bytes ) ) ) {
		return new WP_Error( 'atlas_clarus_renderer_asset_integrity', 'Material bytes are invalid, exceed 10 MiB or do not match the declared digest.', array( 'status' => 422 ) );
	}
	$headers = array( 'Content-Type' => 'application/json', 'Accept' => 'application/json' );
	$token   = get_option( 'atlas_clarus_aps_renderer_token', '' );
	if ( $token ) {
		$headers['Authorization'] = 'Bearer ' . $token;
	}
	$response = wp_remote_post( $endpoint, array( 'timeout' => 60, 'redirection' => 0, 'headers' => $headers, 'body' => wp_json_encode( $payload ), 'data_format' => 'body' ) );
	if ( is_wp_error( $response ) ) {
		return new WP_Error( 'atlas_clarus_renderer_transport', $response->get_error_message(), array( 'status' => 502 ) );
	}
	$result = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( wp_remote_retrieve_response_code( $response ) < 200 || wp_remote_retrieve_response_code( $response ) >= 300 || ! is_array( $result ) ) {
		return new WP_Error( 'atlas_clarus_renderer_response', 'External renderer returned an invalid response.', array( 'status' => 502 ) );
	}
	if ( empty( $result['output_base64'] ) || empty( $result['media_type'] ) || empty( $result['renderer'] ) || ! in_array( $result['status'] ?? '', array( 'CALCULATED', 'SIMULATED' ), true ) ) {
		return new WP_Error( 'atlas_clarus_renderer_contract', 'External response does not satisfy the connector contract.', array( 'status' => 502 ) );
	}
	if ( ! in_array( $result['media_type'], array( 'image/png', 'image/jpeg', 'image/webp' ), true ) ) {
		return new WP_Error( 'atlas_clarus_renderer_media_type', 'External renderer output must be PNG, JPEG or WebP.', array( 'status' => 502 ) );
	}
	$bytes = base64_decode( $result['output_base64'], true );
	if ( false === $bytes || strlen( $bytes ) > 10 * MB_IN_BYTES ) {
		return new WP_Error( 'atlas_clarus_renderer_output', 'Renderer output is invalid or exceeds 10 MiB.', array( 'status' => 502 ) );
	}
	$result['output_sha256']  = hash( 'sha256', $bytes );
	$result['evidence_class'] = 'EXTERNAL_RENDERER_OUTPUT';
	return rest_ensure_response( $result );
}

function atlas_clarus_aps_register_rest_routes() {
	register_rest_route( 'atlas-clarus/v1', '/appearance/render', array( 'methods' => 'POST', 'callback' => 'atlas_clarus_aps_renderer_request', 'permission_callback' => 'atlas_clarus_aps_renderer_permission' ) );
}
add_action( 'rest_api_init', 'atlas_clarus_aps_register_rest_routes' );

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
		data-cie-engine-url="<?php echo esc_url( ATLAS_CLARUS_APS_URL . 'assets/spectral/cie-spectral-engine-v0.2.0.json' ); ?>"
		data-cie-engine-sha256="<?php echo esc_attr( ATLAS_CLARUS_APS_CIE_ENGINE_SHA256 ); ?>"
		data-renderer-url="<?php echo esc_url( rest_url( 'atlas-clarus/v1/appearance/render' ) ); ?>"
		data-renderer-nonce="<?php echo esc_attr( wp_create_nonce( 'wp_rest' ) ); ?>"
		data-renderer-mode="<?php echo esc_attr( get_option( 'atlas_clarus_aps_renderer_mode', 'mock' ) ); ?>"
		data-three-module-url="<?php echo esc_url( ATLAS_CLARUS_APS_URL . 'assets/vendor/three/three.module.min.js' ); ?>"
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
						<option value="ALS_BASE_D50">CIE D50 · spectral</option><option value="ALS_BASE_D65">CIE D65 · spectral</option><option value="ALS_BASE_A">CIE A · spectral</option><option value="ALS_LED_P1" disabled>ALS LED P1 · SPD required</option><option value="ALS_LED_P2" disabled>ALS LED P2 · SPD required</option><option value="ALS_LED_P3" disabled>ALS LED P3 · SPD required</option><option value="ALS_STR_1" disabled>ALS STR 1 · SPD required</option><option value="ALS_STR_2" disabled>ALS STR 2 · SPD required</option><option value="ALS_STR_3" disabled>ALS STR 3 · SPD required</option>
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
					<button type="button" data-export="apf"><?php esc_html_e( 'Export APF bundle', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
					<button type="button" data-export="pixels"><?php esc_html_e( 'Export pixel data', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
					<button type="button" data-export="png"><?php esc_html_e( 'Export PNG', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
				</div>
				<details class="atlas-clarus-aps__objects" open>
					<summary><strong><?php esc_html_e( 'Open Appearance Object Preview', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <span data-object-output="status">LOADING THREE.JS</span></summary>
					<div class="atlas-clarus-aps__object-grid">
						<div class="atlas-clarus-aps__object-controls">
							<label><?php esc_html_e( 'Object', 'atlas-clarus-appearance-pixel-simulator' ); ?><select data-object-control="template"><option value="sphere"><?php esc_html_e( 'Material sphere', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="package" selected><?php esc_html_e( 'Folding carton', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="bottle"><?php esc_html_e( 'Bottle with label', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="can"><?php esc_html_e( 'Beverage can', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="plate"><?php esc_html_e( 'Material plate', 'atlas-clarus-appearance-pixel-simulator' ); ?></option><option value="fabric"><?php esc_html_e( 'Fabric swatch', 'atlas-clarus-appearance-pixel-simulator' ); ?></option></select></label>
							<label><?php esc_html_e( 'Object rotation', 'atlas-clarus-appearance-pixel-simulator' ); ?>: <output data-object-output="rotation">25°</output><input data-object-control="rotation" type="range" min="-180" max="180" value="25"></label>
							<label class="atlas-clarus-aps__check"><input data-object-control="auto-rotate" type="checkbox"> <?php esc_html_e( 'Auto-rotate preview', 'atlas-clarus-appearance-pixel-simulator' ); ?></label>
							<button type="button" data-object-action="png" disabled><?php esc_html_e( 'Export object preview', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
						</div>
						<div class="atlas-clarus-aps__object-stage">
							<canvas width="720" height="480" aria-label="<?php esc_attr_e( 'Interactive simulated appearance object', 'atlas-clarus-appearance-pixel-simulator' ); ?>"></canvas>
							<code data-object-output="evidence">GEOMETRY BUILT_IN · MATERIAL SIMULATED · QC NOT_MEASURED</code>
						</div>
					</div>
				</details>
				<details class="atlas-clarus-aps__bridge">
					<summary><strong><?php esc_html_e( 'APF Material Bridge v0.1', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <span data-bridge-output="summary">NOT LOADED</span></summary>
					<p><?php esc_html_e( 'Bind an external appearance material to the selected ATLAS identity, validate its record and export the evidence envelope. Material formats remain interchangeable adapters.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
					<div class="atlas-clarus-aps__bridge-grid">
						<label><?php esc_html_e( 'Appearance material', 'atlas-clarus-appearance-pixel-simulator' ); ?><input data-bridge-control="material-file" type="file" accept=".mtlx,.json,.glb,.gltf,.zip,.axf,application/octet-stream,application/json,model/gltf-binary,model/gltf+json"></label>
						<label><?php esc_html_e( 'Bridge JSON', 'atlas-clarus-appearance-pixel-simulator' ); ?><input data-bridge-control="bridge-file" type="file" accept=".json,application/json"></label>
						<label><?php esc_html_e( 'Material format', 'atlas-clarus-appearance-pixel-simulator' ); ?><select data-bridge-control="material-format"><option value="MATERIALX">MaterialX</option><option value="OPENPBR_JSON">OpenPBR JSON</option><option value="GLTF">glTF / GLB</option><option value="PBR_TEXTURE_SET">PBR texture set</option><option value="AXF_ADAPTER">AxF optional adapter</option><option value="OTHER">Other</option></select></label>
						<label><?php esc_html_e( 'Material selector type', 'atlas-clarus-appearance-pixel-simulator' ); ?><select data-bridge-control="selector-type"><option value="DISPLAY_NAME">Display name</option><option value="MATERIAL_ID">Material ID</option><option value="REPRESENTATION_ID">Representation ID</option><option value="IMPLEMENTATION_DEFINED">Implementation defined</option></select></label>
						<label><?php esc_html_e( 'Material selector', 'atlas-clarus-appearance-pixel-simulator' ); ?><input data-bridge-control="selector-value" type="text" placeholder="Material name or ID"></label>
					</div>
					<div class="atlas-clarus-aps__actions">
						<button type="button" data-bridge-action="create"><?php esc_html_e( 'Create binding', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
						<button type="button" data-bridge-action="validate"><?php esc_html_e( 'Validate bridge', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
						<button type="button" data-bridge-action="render" disabled><?php esc_html_e( 'Send to renderer', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
						<button type="button" data-bridge-action="export" disabled><?php esc_html_e( 'Export bridge JSON', 'atlas-clarus-appearance-pixel-simulator' ); ?></button>
					</div>
					<div class="atlas-clarus-aps__renderer-preview" data-bridge-output="preview" hidden><img alt="<?php esc_attr_e( 'Renderer result', 'atlas-clarus-appearance-pixel-simulator' ); ?>"><code data-bridge-output="renderer-meta"></code></div>
					<div class="atlas-clarus-aps__bridge-status" aria-live="polite">
						<div><span><?php esc_html_e( 'Identity binding', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><strong data-bridge-output="binding">NOT LOADED</strong></div>
						<div><span><?php esc_html_e( 'Material asset integrity', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><strong data-bridge-output="asset">NOT LOADED</strong></div>
						<div><span><?php esc_html_e( 'Material origin', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><strong data-bridge-output="origin">UNKNOWN</strong></div>
						<div><span><?php esc_html_e( 'Render / physical QC', 'atlas-clarus-appearance-pixel-simulator' ); ?></span><strong data-bridge-output="render">NOT EXECUTED / NOT MEASURED</strong></div>
					</div>
					<ul class="atlas-clarus-aps__bridge-report" data-bridge-output="report"><li><?php esc_html_e( 'No bridge record loaded.', 'atlas-clarus-appearance-pixel-simulator' ); ?></li></ul>
				</details>
				<p class="atlas-clarus-aps__boundary"><strong><?php esc_html_e( 'Evidence boundary:', 'atlas-clarus-appearance-pixel-simulator' ); ?></strong> <?php esc_html_e( 'Identity, spectral reference and illuminant diagnostics are master-bound. Material, specular, height and appearance pixels remain simulated—not BRDF/BSDF or physical QC data. QC_STATUS remains NOT_MEASURED.', 'atlas-clarus-appearance-pixel-simulator' ); ?></p>
			</div>
		</div>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'atlas_clarus_appearance_simulator', 'atlas_clarus_aps_shortcode' );
