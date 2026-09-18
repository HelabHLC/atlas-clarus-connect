# ATLAS Clarus TryColors Bridge

This optional WordPress plugin keeps the TryColors API key on the server and exposes an authenticated, administrator-only recipe endpoint.

Add both constants to `wp-config.php` (outside the public repository):

```php
define('ATLAS_CLARUS_TRYCOLORS_API_KEY', 'your-current-key');
define('ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON', '[{"name":"Paint name","hex":"#RRGGBB"}]');
```

The palette must contain 2–64 paints. Use the exact, fixed paint palette intended for repeatable comparisons. The browser submits only the frozen ATLAS reference and target HEX. The bridge calls `POST https://api.trycolors.com/v1/unmix-color` with `mixerMode=pro`, `engine=2025`, `maxColorsCount=4`, and `maxDropsCount=50`.

The result is evidence JSON marked `SIMULATED_NOT_PHYSICALLY_VERIFIED`. It is not an ALFA dispenser command, a measured result, or a change to PKL identity. The existing offline, 4C, and ECG workflows remain independent.

## Confirmed Lascaux palette

The repository includes `lascaux-primaer-palette.example.json` with all 14 product names, product codes, pigments where shown, and HEX inputs confirmed from the individual TryColors mixer screens. Use the value of its `colors` array for `ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON`; keep the API key outside the repository.

Control target used during validation: `#F4E46A`. The repeated TryColors UI result was `#F3E16A`, 99.2% displayed match, using 48% Primary Colour yellow, 48% White, and 4% Yellow ochre. This is a digital repeatability control, not physical verification.
