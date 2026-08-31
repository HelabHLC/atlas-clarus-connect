<?php
$root = dirname(__DIR__);
$colors = json_decode(file_get_contents($root.'/data/colors.json'), true, 512, JSON_THROW_ON_ERROR);
$views = json_decode(file_get_contents($root.'/data/views.json'), true, 512, JSON_THROW_ON_ERROR);
$expected = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
$check = static function ($condition, $message) { if (!$condition) { fwrite(STDERR, "FAIL: $message\n"); exit(1); } };
$check($colors['entry_count'] === 13283, 'entry_count');
$check(count($colors['colors']) === 13283, 'colors length');
$check($colors['master_sha256'] === $expected && $views['master_sha256'] === $expected, 'master SHA metadata');
$check(count($views['views']) === 17 && count($views['views']['core']['ids']) === 13283, 'view counts');
$ids = array_column($colors['colors'], 'id');
$check(count($ids) === count(array_unique($ids)), 'duplicate ids');
$valid = array_fill_keys($ids, true);
foreach ($views['views'] as $key=>$view) {
    foreach ($view['ids'] as $id) { $check(isset($valid[$id]), "unknown id $id in $key"); }
}
echo "PASS: 13283 colors, 17 views, all referenced IDs valid\n";
