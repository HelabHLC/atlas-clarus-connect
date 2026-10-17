<?php
// Isolated test of the real packaged PHP, without a WordPress server.
define('ABSPATH', '/tmp/'); define('OBJECT', 'OBJECT');
function add_action(...$args) {} function add_filter(...$args) {} function add_shortcode(...$args) {}
function is_admin(){return false;}
function register_activation_hook(...$args) {} function register_deactivation_hook(...$args) {}
function get_page_by_path(...$args){return (object)['post_status'=>'publish','post_content'=>'stored'];}
function parse_blocks($content){return [['blockName'=>'core/html','innerHTML'=>'<section id="exchange-between-tools"><p>Preserve $100 and original RGB.</p></section>'],['blockName'=>'core/shortcode','innerHTML'=>'[atlas_clarus_browser_edition]']];}
function wp_kses_post($content){return $content;}
require '/tmp/atlas-browser-help.php';
$method=new ReflectionMethod('ATLAS_Clarus_Browser_Edition','inject_exchange_help');$method->setAccessible(true);
$original='<!doctype html><html><body><main>Original app</main><script>const source=[1,2,3];</script></body></html>';
$result=$method->invoke(null,$original);
foreach(['id="atlas-exchange-help"','Help / Hilfe','Preserve $100','<script>const source=[1,2,3];</script>'] as $expected){if(strpos($result,$expected)===false)throw new Exception('Missing '.$expected);}
if(strpos($result,'[atlas_clarus_browser_edition]')!==false)throw new Exception('Shortcode recursion');
if(substr_count($result,'id="atlas-exchange-help"')!==1)throw new Exception('Duplicate help');
if($method->invoke(null,$result)!==$result)throw new Exception('Injection not idempotent');
echo "PASS actual plugin PHP: help injection, unchanged app scripts, literal text, no shortcode execution, no duplicate injection\n";
