# ATLAS Clarus TryColors Bridge

Version 0.2.2 preserves the 0.2.0 recipe registry, cache and administrator test page while switching the controlled pilot from HEX-only palette entries to the confirmed **Golden Heavy Body 59** measured-paint palette.

Each upstream palette entry is sent as:

```json
{"hex":"#RRGGBB","name":"Paint name","paint_id":1234}
```

The `paint_id` selects TryColors' measured mixing data. The pilot request is fixed to:

- `POST /v1/unmix-color`
- `maxColorsCount: 3`
- `maxDropsCount: 20`
- `mixerMode: "pro"`
- `engine: "2025"`

The bundled file `golden-heavy-body-59-palette.json` is the default palette. An installation-specific JSON override remains possible through `ATLAS_CLARUS_TRYCOLORS_PALETTE_JSON`, but every accepted entry must contain a valid HEX value and positive integer `paint_id`.

The API key remains server-side, encrypted in WordPress when entered through **Settings → ATLAS TryColors Bridge**, and is never returned to the browser.

Every result is marked `SIMULATED_NOT_PHYSICALLY_VERIFIED` and displays the required linked attribution **Recipe computed by Trycolors**. It is not a physical measurement, production approval, ALFA dispenser command, or change to PKL identity.

Controlled pilot target:

- PKL reference: `H095_L090_C060`
- target HEX: `#F4E46A`
- run limit: one live request before any wider calculation

## Three-state colour comparison

Every stored recipe now shows three deliberately separate swatches:

1. **PKL Target** — the frozen ATLAS reference identity.
2. **TryColors Simulated Mix** — the predicted `mixedColor` for the practical `wholeParts` recipe.
3. **Measured Dry Sample** — a `NOT_MEASURED` placeholder until an actual dried sample is measured.

The interface may display `100 - matchResult` as the model ΔE00 approximation confirmed by TryColors support. It never treats the simulated swatch as a physical measurement and never changes PKL identity.
