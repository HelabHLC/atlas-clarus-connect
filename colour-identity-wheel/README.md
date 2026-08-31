# Colour Identity Wheel components

## Included WordPress embed

`wordpress-embed-v1.0.0/` contains the supplied **ATLAS Clarus Reference Wheel** WordPress plugin v1.0.0. It provides settings, a shortcode and a responsive iframe around the public Wheel URL.

The plugin is an embed wrapper. It does not contain the Wheel application's colour data, selection logic or Identity Handoff receiver.

The current wrapper also does not forward query parameters from the surrounding WordPress page into the iframe. This does not affect the current Hover Library handoff because that link targets the public Wheel application directly.

## Included application source

`application/` contains the exact repository commit recorded for public Sites version 22. It includes the Wheel interface, 19 L* plane files, 13,283-row search index, master manifest, Handoff receiver, palette exports, ICC-related functionality, tests and build scripts.

No substitute implementation was invented and the copied application source was not altered.

## Required before public release

1. Make `hlc` mandatory whenever a verified handoff is requested.
2. Reject duplicate critical query parameters.
3. Run all vectors in `../identity-handoff/examples/` as receiver-level tests.
4. Complete the code, data and documentation licence inventory.
5. Rebuild from a clean public checkout.

The current receiver blocks master mismatch, invalid or unknown row IDs and supplied HLC mismatch. It currently treats a missing `hlc` value as optional; this is narrower than the proposed handoff specification and remains a release-hardening item.
