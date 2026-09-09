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

$registry = json_decode(file_get_contents($root.'/data/basis23-source-registry.json'), true, 512, JSON_THROW_ON_ERROR);
$check($registry['atlas_master_sha256'] === $expected, 'Basis-23 master SHA metadata');
$check($registry['basis_version'] === 'ATLAS_COMBINED_BASIS23_v0_8', 'Basis-23 version');
$check($registry['rows'] === 13283 && $registry['shard_size'] === 256 && $registry['shard_count'] === 52, 'Basis-23 row/shard metadata');
$check($registry['within_de00_5'] === 11593 && $registry['outside_de00_5'] === 1690, 'Basis-23 benchmark totals');
$check($registry['published_payload'] === 'DERIVED_RECIPES_ONLY_NO_SOURCE_SPECTRA', 'Basis-23 publication boundary');

$recipeCount = 0;
$withinCount = 0;
for ($shard = 0; $shard < $registry['shard_count']; $shard++) {
    $path = sprintf('%s/data/basis23-recipes/%03d.json', $root, $shard);
    $check(is_file($path), "missing recipe shard $shard");
    $recipes = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    $check(count($recipes) <= $registry['shard_size'], "oversized recipe shard $shard");
    foreach ($recipes as $recipe) {
        $id = $recipeCount++;
        $check($recipe['source_atlas_row_id'] === $id, "recipe row sequence $id");
        $check($recipe['reference'] === $colors['colors'][$id]['ref'], "recipe reference binding $id");
        $check($recipe['basis_version'] === $registry['basis_version'], "recipe basis binding $id");
        $check($recipe['component_count'] === count($recipe['components']), "recipe component count $id");
        $sum = 0.0;
        foreach ($recipe['components'] as $component) {
            $sum += $component['percent'];
            $check(in_array($component['source_family'], array('CHSOS','KIMERA_PAINTMIXING'), true), "recipe source family $id");
            $check(filter_var($component['source_url'], FILTER_VALIDATE_URL) !== false, "recipe source URL $id");
            $check(!isset($component['reflectance_400_700']) && !isset($component['spectrum']) && !isset($component['ks']), "source spectrum leaked $id");
        }
        $check(abs($sum - 100.0) <= 0.002, "recipe percentage sum $id");
        if ($recipe['de00'] <= 5.0) { $withinCount++; }
        $check($recipe['measured_qc_status'] === 'NOT_MEASURED' && $recipe['production_approval'] === 'NOT_SUPPORTED', "recipe boundary $id");
    }
}
$check($recipeCount === 13283 && $withinCount === 11593, 'Basis-23 validated totals');
echo "PASS: 13283 colors, 17 views and 13283 derived Basis-23 recipes valid\n";
