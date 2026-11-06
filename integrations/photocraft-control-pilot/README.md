# PhotoCraft × ATLAS Clarus Control Pilot 0.1

An isolated interoperability experiment that uses PhotoCraft's existing authenticated local control channel. **No PhotoCraft source file is modified by this pilot.**

The first target is deliberately narrow:

> read one visible composite pixel from PhotoCraft → normalize a scratch copy to sRGB → quantize to 8-bit sRGB → resolve the frozen ATLAS Clarus reference → write a provenance-bearing pilot observation.

## Why this route

PhotoCraft already exposes the relevant engine operations through the same command registry used by its UI, CLI, control channel and MCP bridge. Pilot 0.1 therefore stays outside PhotoCraft core.

The examined PhotoCraft `main` revision is:

`2d5a7497fd1e1891c796f1a93741b27a1d904604`

The pilot relies on these existing commands/methods:

- `document.inspect` through `engine.execute`
- `edit.profileInfo`
- `image.duplicate {"mergedOnly": true}`
- `edit.convertToProfile {"profile":"srgb","intent":"relative","bpc":true}`
- `document.sampleColor {"size":1,"sampleLayer":"all"}`
- `file.close {"document": scratch_index}`

The original document is not converted. A temporary merged duplicate is converted and sampled, then closed. Its source document identity and revision are checked again afterward. Pilot 0.1 intentionally uses only methods exposed by the PhotoCraft 0.8.2 desktop control channel; headless-only `session.list`/`doc.inspect` convenience methods are not used.

## Start PhotoCraft

Use PhotoCraft's token-file form so the bearer token does not appear in the process command line:

```text
photocraft --control 7878 --control-token-file C:\private\photocraft-control.token
```

PhotoCraft's control server is loopback-only. If the token file does not exist, PhotoCraft creates a fresh 256-bit token.

Open an image/document in PhotoCraft and leave the document you want to sample active.

## Run the pilot

From the `atlas-clarus-connect` repository root:

```text
python integrations/photocraft-control-pilot/photocraft_atlas_bridge.py ^
  --token-file C:\private\photocraft-control.token ^
  --x 100 --y 150 ^
  --output photocraft-sample.atlas.json
```

Coordinates are zero-based document pixels. Pilot 0.1 intentionally supports **point sampling only**. PhotoCraft also supports averaged sample sizes, but their semantics are not silently equated with the Browser Edition's sampling contract.

## What the record means

The emitted record is:

`ATLAS_CLARUS_PHOTOCRAFT_OBSERVATION 0.1`

It records:

- original PhotoCraft document name, dimensions, mode, depth, revision and profile description;
- no original absolute file path;
- the scratch-copy normalization to built-in sRGB;
- the sampled RGBA float returned by PhotoCraft;
- deterministic 8-bit channel quantization;
- the resulting source RGB and HEX;
- fixed `atlas_row_id`, ATLAS reference, reference RGB/HEX and squared RGB distance;
- the fixed master SHA-256;
- `FROZEN`, `COMPUTATIONAL_ONLY`, `NOT_MEASURED`, `NOT_SIGNED`.

The frozen ATLAS master is:

`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

Assignment remains integer `RGB_SQUARED_DISTANCE`; exact ties use `LOWER_ATLAS_ROW_ID`.

## Important schema boundary

The pilot output is **not** presented as Clarus palette JSON 1.2.

Current Clarus JSON 1.2 source provenance defines `BROWSER_DECODED_SRGB`. A colour sampled from a PhotoCraft composite and explicitly converted through PhotoCraft's CMS is a different provenance event. Pilot 0.1 therefore names it:

`PHOTOCRAFT_COMPOSITE_CONVERTED_TO_SRGB_U8`

This avoids silently claiming that a PhotoCraft sample came from the Browser Edition decoder.

A later schema revision can admit PhotoCraft provenance explicitly after interoperability testing.

## Validation levels

**Automated in this repository**

- fixed master SHA and 13,283-row gate;
- known ATLAS mapping fixtures;
- squared-distance assignment;
- lower-`atlas_row_id` tie break;
- JavaScript-compatible positive channel rounding;
- scratch-copy workflow and original-revision guard with a fake control client.

**Not established by CI**

- a real PhotoCraft desktop connection;
- real ICC conversion behavior on a user's document;
- real native control-server sampling;
- PhotoCraft restart persistence;
- PSD/XMP provenance carriage;
- Photoshop or other prepress round-trip.

Those are separate acceptance gates.

## Safety and scope

This is an interoperability pilot, not a colour measurement or print approval system.

- `COMPUTATIONAL_ONLY`
- `NOT_MEASURED`
- `NOT_SIGNED`
- no physical-colour claim
- no material or print approval
- no production certification
- no anti-counterfeit or issuer-authentication claim

Pilot 0.1 never replaces PhotoCraft pixels with an ATLAS reference. **Source colour and ATLAS reference remain separate.**

## Tests

```text
python -m unittest discover -s integrations/photocraft-control-pilot -p "test_*.py" -v
```

The next real acceptance gate is a user-operated PhotoCraft desktop run with a known synthetic pixel followed by comparison against the same RGB resolved in ATLAS Clarus.
