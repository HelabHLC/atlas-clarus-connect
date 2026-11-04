# Multi-application brand colours — 0.1.6 preview

Current source is extended by [the 0.1.7 logo workflow](../logo-brand-palette/README.md).
The release information below records the 0.1.6 foundation; reproduce that
package from commit `54a56c427a98d7eda2456f10bf9ebb84f937cc2b`.

Adds a separate German/English workspace for a shared logo palette across
two to eight profiled print applications. Startup Colour Kit transfers its
current dossier to a new tab; the same action works inside Browser Edition's
colour-advice iframe. `START_HERE.html` also links to the workspace directly.

## Decision model

For each application, record the real material/finishing, device/process/ink
and provider-confirmed output ICC profile. There is no automatic assignment
of a paper profile to a vehicle or wall. Known exchange/beta profiles are
excluded, including FOGRA58/FOGRA55. Solid-colour films, paints and coatings
need measured material references and are outside this print-profile workflow.

Membership can use the documented library associated with an exact ICC hash,
followed by an actual profile calculation. Alternatively, the user explicitly
chooses a profile-derived address check list. The latter evaluates the frozen
13,283 stored ATLAS sRGB targets using this profile and the chosen output
tolerance; it is labelled separately from verified GamutMap/HLC-Lab membership.

All three limits are user-entered; none has a preapproved default:

1. Original customer sRGB colour to common ATLAS sRGB reference.
2. Common reference to each predicted output.
3. Largest pairwise difference between predicted outputs.

Each comparison uses CIEDE2000 with kL=kC=kH=1 and Lab D50/2° operands.
Acceptance uses unrounded values. A candidate must pass every applicable
membership list, every individual output limit and every pairwise limit.
Eligible common references are ranked by distance to the original customer
colour, with deterministic row-ID ties. Since 0.1.7, the smallest difference
is offered first even if the original reference is still eligible. Up to four suggestions and a common-address input are
available. Each source colour needs an explicit confirmation. Confirming the
last colour first cannot approve an incomplete palette.

Application/profile/material/tolerance edits invalidate the calculation and
shared decisions. Language changes preserve their bytes. Reopening retains
previous choices as history, discards computed approval, and preselects a
previous choice only after it passes recalculation; confirmation is required
again.

## Colour calculation and scope

`worker.inc.js` adds a dedicated operation to a copy of the pinned worker;
the old Startup worker and its operations remain unchanged. The binary is
LittleCMS 2.16 / lcms-wasm 1.0.5:

```text
stored sRGB8 -> Lab D50 -> device16 -> Lab D50 -> display sRGB8
```

The first transform is relative colorimetric. Both device transforms are
absolute colorimetric, no BPC, NOOPTIMIZE. Delta-E is evaluated in Lab before
the display conversion. ICC v2/v4 printer-class profiles must expose both
colorimetric A2B1/B2A1 tables; RGB, CMYK and seven-channel formats are accepted.
Seven-channel names/order must be entered from the provider's specification.
Only actual CMYK profile conversions have been end-to-end validated in this
release; RGB/seven-channel production profiles still need representative
provider fixtures and measured validation.

The colour target is the frozen stored sRGB value, **not the HLC target Lab**.
Different HLC addresses can have the same clipped sRGB appearance. Existing
master/library data, source-origin metadata and 2,304 unresolved origin records
are unchanged; no RGB values are reinterpreted as Display P3 or original Lab.
Profile white is considered by the absolute transform. Arbitrary illumination,
texture, gloss, metamerism and process variation are not modelled. Real samples
and production-provider approval remain necessary.

Primary method references (reviewed 2026-11-04):
- https://www.gamutmap.com/site/content/howto — common selected-space membership
  and absolute colorimetric conversions; screen-clipping limitations.
- https://www.color.org/profile/ — ICC colour-management model.
- https://www.littlecms.com/LittleCMS2.18%20API.pdf — Lab profile defaults and API
  semantics; implementation here remains the pinned 2.16 binary.
- https://github.com/mm2/Little-CMS/blob/master/include/lcms2.h — pixel formats.

## Project and export

The multi-project ZIP contains `project.json`, unchanged ICC files by SHA-256,
the original dossier byte-for-byte as `source-dossier.zip`, and a standalone
HTML comparison card. `comparison.json` records checked address lists,
per-material Lab/display/device values, all three differences and decisions.
Only fully confirmed, current choices produce `common.ase` and
`common.clarus.json`. Those exports never rebind source-image assignments to
replacement reference IDs. The original image, embedded ICC, original
assignments and any single-application advice remain in the nested dossier.

The strict ZIP reader validates inventory, size limits, CRC and SHA-256;
computed/imported report files are not trusted as fresh approvals. Limits are
12 source colours, 8 applications, 16 MiB per ICC and 192 MiB per project.

## Build and validation

Use this builder for the 0.1.6 package. Its input is exactly the 0.1.5 release
with SHA-256 `fbe01ba9d0bdeeace6b34608d67479f72bb9b507261e2a04d90a562aca08aa7c`.

```bash
python3 previews/multi-application/package.py --base /path/to/0.1.5.zip --output-dir /new/output
node previews/multi-application/test-core.cjs /runtime /test-output/core
node previews/multi-application/test-ui.cjs /runtime /test-output/ui
python3 previews/multi-application/native-oracle.py /runtime
```

UI tests need Playwright and optionally `ATLAS_TEST_CHROMIUM`. The independent
oracle needs a system liblcms2; it does not import the browser/WASM code.
Native 2.14 and WASM 2.16 agreed for the fixed PSOcoated magenta fixture within
0.003 Lab units and 4 device16 steps (minor engine-version differences).

Validation passed:
- Actual profile calculation over all 13,283 frozen references, independent
  native oracle, pairwise rejection despite individual passes, exact-boundary
  acceptance and unrounded rejection.
- Deterministic ZIP, unchanged ICC/source bytes, corrupted ZIP rejection,
  separate original/common assignments, import invalidation.
- Four distinct CMYK profiles: PSOcoated v3, PSOuncoated v3 FOGRA52,
  ISOcoated v2 300% and GRACoL2013UNC CRPC3. Test limits 12/3/3 produced 5,011
  common references in documented-library mode. These are software-fixture
  limits and paper profiles, not recommended production tolerances or vehicle
  and wall profiles.
- Both membership modes, explicit out-of-order confirmations, DE/EN
  byte-identical project/decision/palette/profile payloads, restored choices
  requiring reconfirmation, clearing a profile, eight-application limit.
- Browser image -> advice iframe -> new multi tab; original PNG and embedded
  ICC preserved byte-for-byte, native Browser selection unchanged.
- 390px application/report layouts and desktop screenshots; no browser errors.
- Previous full advice and DE/EN UI regression suites passed on the unchanged
  Startup code included here.
- 436 package checksums and ZIP CRC verified; 423 inherited files unchanged.

Package: `ATLAS_Clarus_Markenfarben_Mehrere_Anwendungen_0.1.6_DE_EN.zip`
(137,291,031 bytes), SHA-256
`3d9ef82b539280e2a4a5ed836648edfae43c55b0d4ec675c1e72d0b359ea0cb6`.

This is a local test release stacked on the 0.1.5 preview; no public deployment
or physical print validation is part of it.
