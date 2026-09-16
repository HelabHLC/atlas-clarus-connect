<?php
/** Execute the real plugin against a minimal WordPress API shim and real ZIP IO.
 * This is not a full WordPress/IONOS installation or visual acceptance test.
 */
error_reporting(E_ALL);
set_error_handler(function ($severity, $message, $file, $line) {
    if (error_reporting() & $severity) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
    return false;
});

function check($condition, $message) {
    if (!$condition) { throw new RuntimeException($message); }
}
function invoke_private($method, ...$args) {
    $ref = new ReflectionMethod('ATLAS_Clarus_Browser_Edition', $method);
    $ref->setAccessible(true);
    return $ref->invokeArgs(null, $args);
}
class WP_Error {
    public $code;
    private $message;
    public function __construct($code, $message) { $this->code = $code; $this->message = $message; }
    public function get_error_message() { return $this->message; }
}
function is_wp_error($v) { return $v instanceof WP_Error; }
function add_action(...$args) {}
function add_filter(...$args) {}
function add_shortcode(...$args) {}
function register_activation_hook(...$args) {}
function register_deactivation_hook(...$args) {}
function is_admin() { return false; }
function current_user_can($cap) { return $GLOBALS['permission']; }
function check_admin_referer(...$args) { if (!$GLOBALS['nonce']) { throw new RuntimeException('nonce denied'); } }
function wp_die($message) { throw new RuntimeException($message); }
function get_option($key, $default = false) { return $GLOBALS['options'][$key] ?? $default; }
function update_option($key, $value, $autoload = null) { $GLOBALS['options'][$key] = $value; return true; }
function wp_upload_dir() { return array('basedir' => $GLOBALS['temp'] . '/uploads', 'error' => false); }
function trailingslashit($s) { return rtrim($s, '/\\') . '/'; }
function wp_mkdir_p($dir) { return is_dir($dir) || mkdir($dir, 0777, true); }
function wp_generate_uuid4() { return 'attempt-' . (++$GLOBALS['attempt']); }
function current_time($type) { return '2026-09-13 00:00:00'; }
function flush_rewrite_rules($hard) {}
function get_current_user_id() { return 1; }
function set_transient($key, $value, $ttl) { $GLOBALS['notice'] = $value; }
function wp_safe_redirect($url) { $GLOBALS['redirect'] = $url; }
function admin_url($path) { return 'https://example.test/wp-admin/' . $path; }
function home_url($path) { return 'https://example.test' . $path; }
function esc_url($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function esc_html__($s, $domain) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function WP_Filesystem() { $GLOBALS['wp_filesystem'] = new stdClass(); return true; }
function unzip_file($zip, $target) {
    wp_mkdir_p($target);
    if ($GLOBALS['fault'] === 'unzip') { return new WP_Error('test_unzip', 'Simulated unzip error'); }
    $z = new ZipArchive();
    check($z->open($zip) === true, 'Could not open bundle');
    check($z->extractTo($target), 'Could not extract bundle');
    $z->close();
    $root = $target . '/atlas-clarus-browser-bundle';
    if ($GLOBALS['fault'] === 'manifest') {
        $m = json_decode(file_get_contents($root . '/BUNDLE_MANIFEST.json'), true);
        $m['print_topology'] = '4C_TO_ECG';
        file_put_contents($root . '/BUNDLE_MANIFEST.json', json_encode($m));
    } elseif ($GLOBALS['fault'] === 'checksum') {
        file_put_contents($root . '/assets/print-handoff.js', '// corrupted bytes');
    }
    return true;
}

$package = realpath($argv[1] ?? '');
check($package && is_file($package . '/atlas-clarus-browser-edition.php'), 'Pass extracted plugin directory');
$temp = sys_get_temp_dir() . '/atlas-wp-test-' . bin2hex(random_bytes(6));
wp_mkdir_p($temp . '/wp-admin/includes');
file_put_contents($temp . '/wp-admin/includes/file.php', '<?php // Test shim.');
define('ABSPATH', $temp . '/');
$options = array(); $permission = true; $nonce = true; $fault = ''; $attempt = 0;
$finished = false;
register_shutdown_function(function () use (&$finished, $temp) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($temp, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($iterator as $item) { $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname()); }
    rmdir($temp);
    if (!$finished) { fwrite(STDERR, "FAIL: test did not complete\n"); exit(1); }
});

$old = $temp . '/uploads/atlas-clarus-browser-edition/old-rc20';
wp_mkdir_p($old);
file_put_contents($old . '/index.html', '<html>ATLAS previous runtime</html>');
$options = array(
    'atlas_clarus_browser_edition_runtime_path' => $old,
    'atlas_clarus_browser_edition_runtime_sha256' => 'previous-sha',
    'atlas_clarus_browser_edition_installed_at' => 'previous-date',
);
$initial = $options;
require $package . '/atlas-clarus-browser-edition.php';
check($options === $initial, 'Plugin boot changed existing runtime');
check(ATLAS_Clarus_Browser_Edition::runtime_ready(), 'Existing RC20 runtime no longer serves');

// Execute the actual strict PHP manifest validator, including parallel arrays.
$z = new ZipArchive(); check($z->open($package . '/assets/bundle.zip') === true, 'Missing bundle');
$manifest = json_decode($z->getFromName('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'), true);
$html = $z->getFromName('atlas-clarus-browser-bundle/index.html'); $z->close();
check(invoke_private('validate_manifest', $manifest) === true, 'Pinned RC22 manifest rejected');
foreach (array('version' => '0.2.0-rc20-core-journey', 'master_rows' => '13283',
    'master_sha256' => str_repeat('0', 64), 'print_topology' => '4C_TO_ECG',
    'print_device_calculation' => 'IMPLEMENTED', 'image_preview_max_edge' => '1200',
    'image_preview_paper_white_simulation' => true, 'image_preview_exports' => array('BA_PNG'), 'print_paths' => array('ECG', '4C'),
    'print_exports' => array('PARALLEL_PRINT_JSON')) as $key => $value) {
    $bad = $manifest; $bad[$key] = $value;
    check(is_wp_error(invoke_private('validate_manifest', $bad)), 'Accepted invalid ' . $key);
}
$bad = $manifest; unset($bad['print_paths']);
check(is_wp_error(invoke_private('validate_manifest', $bad)), 'Accepted missing print paths');

// Both public mutations must check capability and nonce before touching options.
foreach (array('handle_install_request', 'handle_rollback_request') as $handler) {
    foreach (array('permission', 'nonce') as $guard) {
        $GLOBALS[$guard] = false; $rejected = false;
        try { ATLAS_Clarus_Browser_Edition::$handler(); } catch (RuntimeException $e) { $rejected = true; }
        $GLOBALS[$guard] = true;
        check($rejected && $options === $initial, $handler . ' guard failed');
    }
}

// Input byte integrity: wrong size and same-size tampering must preserve RC20.
$zip_path = $package . '/assets/bundle.zip'; $bytes = file_get_contents($zip_path);
try {
    file_put_contents($zip_path, 'broken'); clearstatcache();
    $result = invoke_private('install_bundle');
    check(is_wp_error($result) && $result->code === 'atlas_size_mismatch', 'Size rejection failed');
    check($options === $initial, 'Size error mutated runtime');
    $tampered = $bytes; $tampered[100] = chr(ord($tampered[100]) ^ 1);
    file_put_contents($zip_path, $tampered); clearstatcache();
    $result = invoke_private('install_bundle');
    check(is_wp_error($result) && $result->code === 'atlas_sha_mismatch', 'SHA rejection failed');
    check($options === $initial, 'SHA error mutated runtime');
} finally { file_put_contents($zip_path, $bytes); clearstatcache(); }

foreach (array('unzip', 'manifest', 'checksum') as $failure) {
    $fault = $failure; $result = invoke_private('install_bundle');
    check(is_wp_error($result), 'Failed to reject ' . $failure);
    check($options === $initial, $failure . ' error mutated runtime');
    check(file_get_contents($old . '/index.html') === '<html>ATLAS previous runtime</html>', 'Previous files changed');
    check(count(glob(dirname($old) . '/*', GLOB_ONLYDIR)) === 1, 'Failed attempt left extraction directory');
}
$fault = '';
check(invoke_private('install_bundle') === true, 'RC22 installation failed');
$runtime = $options[ATLAS_Clarus_Browser_Edition::OPTION_RUNTIME_PATH];
check($runtime !== $old && is_file($runtime . '/index.html'), 'New runtime not selected');
check($options[ATLAS_Clarus_Browser_Edition::OPTION_RUNTIME_SHA] === ATLAS_Clarus_Browser_Edition::BUNDLE_SHA256, 'SHA not recorded');
$previous = $options[ATLAS_Clarus_Browser_Edition::OPTION_PREVIOUS_RUNTIME];
check($previous === array('path' => $old, 'sha' => 'previous-sha', 'at' => 'previous-date'), 'Rollback snapshot differs');
check(invoke_private('install_bundle') === true, 'Repeated install failed');
check($options[ATLAS_Clarus_Browser_Edition::OPTION_PREVIOUS_RUNTIME] === $previous, 'Repeated install replaced rollback with RC22');
check(is_file($runtime . '/index.html') && is_file($old . '/index.html'), 'Repeat install removed existing runtime');

// Real RC22 document: navigation injection must preserve application script bytes.
$injected = invoke_private('inject_canvas_exit_button', $html);
check(substr_count($injected, 'id="atlas-clarus-canvas-exit"') === 1, 'Homepage link absent or duplicated');
check(strpos($injected, 'id="atlas-clarus-canvas-exit"') < strpos($injected, '</nav>'), 'Homepage link outside navigation');
preg_match_all('#<script\b[^>]*>.*?</script>#s', $html, $before);
preg_match_all('#<script\b[^>]*>.*?</script>#s', $injected, $after);
check($before[0] === $after[0], 'Canvas injection changed application scripts');

// Rollback handler deliberately exits after redirect: check final state at shutdown.
register_shutdown_function(function () use ($old) {
    check(get_option(ATLAS_Clarus_Browser_Edition::OPTION_RUNTIME_PATH) === $old, 'Rollback did not restore path');
    check(get_option(ATLAS_Clarus_Browser_Edition::OPTION_RUNTIME_SHA) === 'previous-sha', 'Rollback did not restore SHA');
    check(get_option(ATLAS_Clarus_Browser_Edition::OPTION_INSTALLED_AT) === 'previous-date', 'Rollback did not restore timestamp');
    check($GLOBALS['notice']['success'] === true && isset($GLOBALS['redirect']), 'Rollback notice/redirect missing');
    echo "PASS: RC22 PHP manifest, guarded mutations, failure preservation, install, repeat install, canvas injection and rollback\n";
});
$finished = true;
ATLAS_Clarus_Browser_Edition::handle_rollback_request();
