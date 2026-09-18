<?php
/**
 * Plugin Name: ATLAS Clarus TryColors Bridge
 * Description: Admin-only server bridge from an ATLAS PKL target to a TryColors recipe candidate.
 * Version: 0.1.2
 * License: GPL-2.0-or-later
 */
defined('ABSPATH') || exit;

const ATLAS_TRYCOLORS_STATUS = 'SIMULATED_NOT_PHYSICALLY_VERIFIED';
const ATLAS_TRYCOLORS_KEY_OPTION = 'atlas_clarus_trycolors_api_key_encrypted';
const ATLAS_TRYCOLORS_DIAGNOSTIC_OPTION = 'atlas_clarus_trycolors_last_diagnostic';

function atlas_trycolors_record_diagnostic($category, $http_status=0, $message='') {
    $record = array(
        'timestamp_utc'=>gmdate('c'),
        'category'=>sanitize_key((string) $category),
        'http_status'=>absint($http_status),
        'message'=>sanitize_text_field(substr((string) $message, 0, 240)),
    );
    update_option(ATLAS_TRYCOLORS_DIAGNOSTIC_OPTION, $record, false);
    return $record;
}

function atlas_trycolors_last_diagnostic() {
    $record = get_option(ATLAS_TRYCOLORS_DIAGNOSTIC_OPTION, array());
    return is_array($record) ? $record : array();
}

function atlas_trycolors_crypto_key() {
    return hash('sha256', wp_salt('auth').'|'.wp_salt('secure_auth').'|atlas-clarus-trycolors-v1', true);
}

function atlas_trycolors_encrypt($plain) {
    $plain = trim((string) $plain);
    if ($plain === '') return '';
    $key = atlas_trycolors_crypto_key();
    if (function_exists('sodium_crypto_secretbox')) {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        return 'sodium:'.base64_encode($nonce.sodium_crypto_secretbox($plain, $nonce, $key));
    }
    if (function_exists('openssl_encrypt')) {
        $iv = random_bytes(12); $tag = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher !== false) return 'openssl:'.base64_encode($iv.$tag.$cipher);
    }
    return '';
}

function atlas_trycolors_decrypt($stored) {
    $stored = (string) $stored; $key = atlas_trycolors_crypto_key();
    if (str_starts_with($stored, 'sodium:') && function_exists('sodium_crypto_secretbox_open')) {
        $raw = base64_decode(substr($stored, 7), true);
        if ($raw === false || strlen($raw) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) return '';
        $plain = sodium_crypto_secretbox_open(substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), $key);
        return $plain === false ? '' : $plain;
    }
    if (str_starts_with($stored, 'openssl:') && function_exists('openssl_decrypt')) {
        $raw = base64_decode(substr($stored, 8), true);
        if ($raw === false || strlen($raw) <= 28) return '';
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
        return $plain === false ? '' : $plain;
    }
    return '';
}

function atlas_trycolors_api_key() {
    if (defined('ATLAS_CLARUS_TRYCOLORS_API_KEY')) return trim((string) ATLAS_CLARUS_TRYCOLORS_API_KEY);
    $environment = trim((string) getenv('ATLAS_CLARUS_TRYCOLORS_API_KEY'));
    if ($environment !== '') return $environment;
    return atlas_trycolors_decrypt(get_option(ATLAS_TRYCOLORS_KEY_OPTION, ''));
}

function atlas_trycolors_palette() {
    $raw = defined('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON') ? ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON : getenv('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON');
    $rows = json_decode((string) $raw, true);
    if (!is_array($rows)) $rows = array(
        array('name'=>'Primary Colour yellow','hex'=>'#F8E722'), array('name'=>'Bright red','hex'=>'#DB282A'),
        array('name'=>'Carmine red','hex'=>'#A8273A'), array('name'=>'Primary Colour magenta','hex'=>'#C13277'),
        array('name'=>'Ultramarine blue','hex'=>'#1D20A3'), array('name'=>'Prussian blue','hex'=>'#084583'),
        array('name'=>'Primary Colour cyan','hex'=>'#005CA2'), array('name'=>'Emerald green','hex'=>'#006C59'),
        array('name'=>'Yellow ochre','hex'=>'#C88A2A'), array('name'=>'Light brown','hex'=>'#6F4A3B'),
        array('name'=>'Bordeaux red','hex'=>'#84283B'), array('name'=>'White','hex'=>'#FBF9F6'),
        array('name'=>'Silver','hex'=>'#C7CACB'), array('name'=>'Black','hex'=>'#30302F')
    );
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
        atlas_trycolors_record_diagnostic('not_configured', 503, 'API key or fixed palette missing.');
        return new WP_Error('atlas_trycolors_not_configured', 'TryColors server credentials or the fixed paint palette are not configured.', array('status'=>503));
    }
    $payload = array('colors'=>array_column($palette, 'hex'),'targetHex'=>$target,'maxColorsCount'=>4,'maxDropsCount'=>50,'mixerMode'=>'pro','engine'=>'2025','tintingStrengthMode'=>'uniform');
    $upstream = wp_remote_post('https://api.trycolors.com/v1/unmix-color', array('timeout'=>45,'redirection'=>0,'headers'=>array('X-API-KEY'=>$key,'Content-Type'=>'application/json','Accept'=>'application/json'),'body'=>wp_json_encode($payload)));
    if (is_wp_error($upstream)) {
        atlas_trycolors_record_diagnostic('transport_error', 0, $upstream->get_error_code().': '.$upstream->get_error_message());
        return new WP_Error('atlas_trycolors_upstream', 'TryColors could not be reached.', array('status'=>502));
    }
    $code = wp_remote_retrieve_response_code($upstream); $recipe = json_decode(wp_remote_retrieve_body($upstream), true);
    if ($code < 200 || $code >= 300 || !is_array($recipe)) {
        $safe_message = is_array($recipe) && isset($recipe['error']) ? (string) $recipe['error'] : 'No structured error returned.';
        atlas_trycolors_record_diagnostic('upstream_rejected', $code, $safe_message);
        return new WP_Error('atlas_trycolors_rejected', 'TryColors rejected the recipe request.', array('status'=>502,'upstream_status'=>$code));
    }
    atlas_trycolors_record_diagnostic('success', $code, 'Recipe response accepted.');
    $names = array_column($palette, 'name', 'hex');
    if (isset($recipe['structure']) && is_array($recipe['structure'])) foreach ($recipe['structure'] as &$part) { $h=strtoupper((string)($part['hex']??'')); if(isset($names[$h]))$part['name']=$names[$h]; } unset($part);
    return rest_ensure_response(array('schema'=>'ATLAS_CLARUS_TRYCOLORS_RECIPE_V1','status'=>ATLAS_TRYCOLORS_STATUS,'provider'=>array('name'=>'TryColors','mode'=>'pro','engine'=>'2025'),'target'=>array('atlas_ref'=>$ref,'atlas_row_id'=>(int)$row_id,'hex'=>$target),'palette'=>array('count'=>count($palette),'colors'=>$palette),'recipe'=>$recipe,'boundaries'=>array('pkl_identity_changed'=>false,'physical_measurement'=>false,'alfa_dispenser_command'=>false,'production_approval'=>false),'created_at'=>gmdate('c')));
}

function atlas_trycolors_status() {
    return rest_ensure_response(array(
        'schema'=>'ATLAS_CLARUS_TRYCOLORS_STATUS_V1',
        'plugin_version'=>'0.1.2',
        'api_key_configured'=>atlas_trycolors_api_key() !== '',
        'palette_count'=>count(atlas_trycolors_palette()),
        'endpoint'=>'https://api.trycolors.com/v1/unmix-color',
        'mode'=>'pro',
        'engine'=>'2025',
        'last_diagnostic'=>atlas_trycolors_last_diagnostic(),
        'secrets_exposed'=>false,
    ));
}

add_action('rest_api_init', function(){
    register_rest_route('atlas-clarus/v1','/trycolors/unmix',array('methods'=>'POST','callback'=>'atlas_trycolors_unmix','permission_callback'=>'atlas_trycolors_permission','args'=>array('target_hex'=>array('required'=>true),'atlas_ref'=>array('required'=>true),'atlas_row_id'=>array('required'=>true))));
    register_rest_route('atlas-clarus/v1','/trycolors/status',array('methods'=>'GET','callback'=>'atlas_trycolors_status','permission_callback'=>'atlas_trycolors_permission'));
});

add_action('admin_menu', function(){
    add_options_page('ATLAS TryColors Bridge', 'ATLAS TryColors Bridge', 'manage_options', 'atlas-trycolors-bridge', 'atlas_trycolors_settings_page');
});

add_action('admin_post_atlas_trycolors_save', function(){
    if (!current_user_can('manage_options')) wp_die('Insufficient permissions.');
    check_admin_referer('atlas_trycolors_save');
    if (!empty($_POST['clear_key'])) {
        delete_option(ATLAS_TRYCOLORS_KEY_OPTION);
        wp_safe_redirect(add_query_arg('atlas_status', 'cleared', admin_url('options-general.php?page=atlas-trycolors-bridge'))); exit;
    }
    $submitted = isset($_POST['trycolors_api_key']) ? trim(wp_unslash((string) $_POST['trycolors_api_key'])) : '';
    if ($submitted !== '') {
        $encrypted = atlas_trycolors_encrypt($submitted);
        if ($encrypted === '') {
            wp_safe_redirect(add_query_arg('atlas_status', 'crypto_error', admin_url('options-general.php?page=atlas-trycolors-bridge'))); exit;
        }
        update_option(ATLAS_TRYCOLORS_KEY_OPTION, $encrypted, false);
    }
    wp_safe_redirect(add_query_arg('atlas_status', 'saved', admin_url('options-general.php?page=atlas-trycolors-bridge'))); exit;
});

function atlas_trycolors_settings_page() {
    if (!current_user_can('manage_options')) return;
    $configured = atlas_trycolors_api_key() !== ''; $status = sanitize_key($_GET['atlas_status'] ?? ''); $diagnostic = atlas_trycolors_last_diagnostic();
    $messages = array('saved'=>'API key stored in encrypted form.','cleared'=>'Stored API key removed.','crypto_error'=>'No supported server-side encryption method is available.');
    ?>
    <div class="wrap"><h1>ATLAS Clarus · TryColors Bridge</h1>
      <?php if (isset($messages[$status])): ?><div class="notice <?php echo $status==='crypto_error'?'notice-error':'notice-success'; ?> is-dismissible"><p><?php echo esc_html($messages[$status]); ?></p></div><?php endif; ?>
      <p>Administrator-only connection to the official TryColors API. The fixed Lascaux Primär palette contains <strong><?php echo count(atlas_trycolors_palette()); ?> colours</strong>.</p>
      <table class="widefat striped" style="max-width:760px"><tbody>
        <tr><th>Connection</th><td><strong><?php echo $configured ? 'API key configured' : 'API key missing'; ?></strong></td></tr>
        <tr><th>Mode</th><td>PRO · engine 2025 · Kubelka–Munk</td></tr>
        <tr><th>Result status</th><td><code><?php echo esc_html(ATLAS_TRYCOLORS_STATUS); ?></code></td></tr>
      </tbody></table>
      <h2>Safe diagnostics</h2>
      <table class="widefat striped" style="max-width:760px"><tbody>
        <tr><th>Last check (UTC)</th><td><?php echo esc_html($diagnostic['timestamp_utc'] ?? 'No diagnostic recorded'); ?></td></tr>
        <tr><th>Category</th><td><code><?php echo esc_html($diagnostic['category'] ?? 'none'); ?></code></td></tr>
        <tr><th>Upstream HTTP status</th><td><?php echo esc_html((string)($diagnostic['http_status'] ?? 0)); ?></td></tr>
        <tr><th>Safe message</th><td><?php echo esc_html($diagnostic['message'] ?? ''); ?></td></tr>
        <tr><th>Secrets exposed</th><td><strong>No</strong></td></tr>
      </tbody></table>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="max-width:760px;margin-top:24px">
        <?php wp_nonce_field('atlas_trycolors_save'); ?><input type="hidden" name="action" value="atlas_trycolors_save">
        <table class="form-table"><tr><th><label for="trycolors-api-key">TryColors API key</label></th><td>
          <input id="trycolors-api-key" name="trycolors_api_key" type="password" class="regular-text" value="" autocomplete="new-password" placeholder="<?php echo $configured ? 'Configured · leave blank to keep' : 'Enter current key'; ?>">
          <p class="description">The key is encrypted before database storage and is never rendered back into this page.</p>
        </td></tr></table>
        <?php submit_button($configured ? 'Keep or replace key' : 'Save encrypted key'); ?>
        <?php if ($configured): ?><button class="button" type="submit" name="clear_key" value="1" onclick="return confirm('Remove the stored TryColors API key?')">Remove stored key</button><?php endif; ?>
      </form>
      <hr><p><strong>Boundary:</strong> Recipe candidates do not change PKL identity and are not physical measurements, ALFA dispenser commands, or production approvals.</p>
    </div>
    <?php
}

add_action('wp_head', function(){
    if (!atlas_trycolors_permission()) return;
    $config = array('endpoint'=>rest_url('atlas-clarus/v1/trycolors/unmix'),'nonce'=>wp_create_nonce('wp_rest'));
    echo '<script>window.ATLAS_TRYCOLORS_CONFIG='.wp_json_encode($config).';</script>';
}, 1);
