# ATLAS Clarus TryColors Bridge

This optional WordPress plugin keeps the TryColors API key on the server and exposes an authenticated, administrator-only recipe endpoint.

Add both constants to `wp-config.php` (outside the public repository):

```php
define('ATLAS_CLARUS_TRYCOLORS_API_KEY', 'your-current-key');
define('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON', '[{"name":"Paint name","hex":"#RRGGBB"}]');
```

The palette must contain 2–64 paints. Use the exact, fixed paint palette intended for repeatable comparisons. The browser submits only the frozen ATLAS reference and target HEX. The bridge calls `POST https://api.trycolors.com/v1/unmix-color` with `mixerMode=pro`, `engine=2025`, `maxColorsCount=4`, and `maxDropsCount=50`.

The result is evidence JSON marked `SIMULATED_NOT_PHYSICALLY_VERIFIED`. It is not an ALFA dispenser command, a measured result, or a change to PKL identity. The existing offline, 4C, and ECG workflows remain independent.
