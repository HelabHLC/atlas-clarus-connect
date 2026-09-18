<?php
/**
 * Plugin Name: ATLAS Clarus TryColors Bridge
 * Description: Admin-only server bridge from an ATLAS PKL target to a TryColors recipe candidate.
 * Version: 0.1.0
 * License: GPL-2.0-or-later
 */
defined('ABSPATH') || exit;

const ATLAS_TRYCOLORS_STATUS = 'SIMULATED_NOT_PHYSICALLY_VERIFIED';

function atlas_trycolors_api_key() {
    if (defined('ATLAS_CLARUS_TRYCOLORS_API_KEY')) return trim((string) ATLAS_CLARUS_TRYCOLORS_API_KEY);
    return trim((string) getenv('ATLAS_CLARUS_TRYCOLORS_API_KEY'));
}

function atlas_trycolors_palette() {
    $raw = defined('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON') ? ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON : getenv('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON');
    $rows = json_decode((string) $raw, true);
    if (!is_array($rows)) return array();
    $out = array();
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        $hex = strtoupper((string) ($row['hex'] ?? ''));
        if (!preg_match('/^#[0-9A-F]{6}$/', $hex)) continue;
        $out[] = array('hex'=>$hex, 'name'=>sanitize_text_field((string) ($row['name'] ?? $hex)));
    }
    return array_slice($out, 0, 64);
}

function atlas_trycolors_permission() {
    return current_user_can(apply_filters('atlas_clarus_trycolors_capability', 'manage_options'));
}

function atlas_trycolors_unmix(WP_REST_Request $request) {
    $target = strtoupper((string) $request->get_param('target_hex'));
    $ref = sanitize_text_field((string) $request->get_param('atlas_ref'));
    $row_id = filter_var($request->get_param('atlas_row_id'), FILTER_VALIDATE_INT);
    if (!preg_match('/^#[0-9A-F]{6}$/', $target) || !preg_match('/^H\d{3}_L\d{3}_C\d{3}$/', $ref) || $row_id === false || $row_id < 0) {
        return new WP_Error('atlas_trycolors_invalid_target', 'A valid frozen ATLAS target is required.', array('status'=>400));
    }
    $key = atlas_trycolors_api_key(); $palette = atlas_trycolors_palette();
    if ($key === '' || count($palette) < 2) {
        return new WP_Error('atlas_trycolors_not_configured', 'TryColors server credentials or the fixed paint palette are not configured.', array('status'=>503));
    }
    $payload = array('colors'=>array_column($palette, 'hex'),'targetHex'=>$target,'maxColorsCount'=>4,'maxDropsCount'=>50,'mixerMode'=>'pro','engine'=>'2025','tintingStrengthMode'=>'uniform');
    $upstream = wp_remote_post('https://api.trycolors.com/v1/unmix-color', array('timeout'=>45,'redirection'=>0,'headers'=>array('X-API-KEY'=>$key,'Content-Type'=>'application/json','Accept'=>'application/json'),'body'=>wp_json_encode($payload)));
    if (is_wp_error($upstream)) return new WP_Error('atlas_trycolors_upstream', 'TryColors could not be reached.', array('status'=>502));
    $code = wp_remote_retrieve_response_code($upstream); $recipe = json_decode(wp_remote_retrieve_body($upstream), true);
    if ($code < 200 || $code >= 300 || !is_array($recipe)) return new WP_Error('atlas_trycolors_rejected', 'TryColors rejected the recipe request.', array('status'=>502,'upstream_status'=>$code));
    $names = array_column($palette, 'name', 'hex');
    if (isset($recipe['structure']) && is_array($recipe['structure'])) foreach ($recipe['structure'] as &$part) { $h=strtoupper((string)($part['hex']??'')); if(isset($names[$h]))$part['name']=$names[$h]; } unset($part);
    return rest_ensure_response(array('schema'=>'ATLAS_CLARUS_TRYCOLORS_RECIPE_V1','status'=>ATLAS_TRYCOLORS_STATUS,'provider'=>array('name'=>'TryColors','mode'=>'pro','engine'=>'2025'),'target'=>array('atlas_ref'=>$ref,'atlas_row_id'=>(int)$row_id,'hex'=>$target),'palette'=>array('count'=>count($palette),'colors'=>$palette),'recipe'=>$recipe,'boundaries'=>array('pkl_identity_changed'=>false,'physical_measurement'=>false,'alfa_dispenser_command'=>false,'production_approval'=>false),'created_at'=>gmdate('c')));
}

add_action('rest_api_init', function(){ register_rest_route('atlas-clarus/v1','/trycolors/unmix',array('methods'=>'POST','callback'=>'atlas_trycolors_unmix','permission_callback'=>'atlas_trycolors_permission','args'=>array('target_hex'=>array('required'=>true),'atlas_ref'=>array('required'=>true),'atlas_row_id'=>array('required'=>true)))); });

add_action('wp_head', function(){
    if (!atlas_trycolors_permission()) return;
    $config = array('endpoint'=>rest_url('atlas-clarus/v1/trycolors/unmix'),'nonce'=>wp_create_nonce('wp_rest'));
    echo '<script>window.ATLAS_TRYCOLORS_CONFIG='.wp_json_encode($config).';</script>';
}, 1);
