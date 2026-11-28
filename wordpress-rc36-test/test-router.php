<?php
// Local CLI/web test doubles. Not WordPress, not IONOS.
define('ABSPATH',__DIR__);
function add_action(...$a){}
function get_option($key,$default=''){return ($_SERVER['HTTP_X_TEST_ENABLED']??'')==='yes'?Atlas_Clarus_RC36_Test::SHA:$default;}
function current_user_can($cap){return ($_SERVER['HTTP_X_TEST_ADMIN']??'')==='yes'&&$cap==='manage_options';}
function status_header($n){http_response_code($n);}
function nocache_headers(){header('Cache-Control: no-cache');}
function wp_parse_url($u,$c){return parse_url($u,$c);}
function home_url($p){return $p;}
function wp_safe_redirect($p){header('Location: '.$p,true,302);}
require __DIR__.'/plugin/atlas-clarus-rc36-test/atlas-clarus-rc36-test.php';
if(PHP_SAPI==='cli'){if(!Atlas_Clarus_RC36_Test::verify())exit(1);echo "PASS runtime SHA and every asset\n";exit;}
$wp=(object)['request'=>trim(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH),'/')];
Atlas_Clarus_RC36_Test::serve($wp);
header('Content-Type: text/html');echo '<!doctype html><title>Production sentinel</title>production untouched';
