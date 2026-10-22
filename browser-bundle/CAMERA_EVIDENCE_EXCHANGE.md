# Camera evidence exchange — isolated development draft

Stacked on Android camera PR #100 (`b9adff1261d57fff6abc36baac19e6e26b00c8d7`). No released archive, Android overlay, published Browser Edition, master or deployment pin is changed.

The existing camera exports `atlas-clarus-camera-selection/1.0` JSON plus PNG. The Tool Exchange carrier already preserves complete native files with SHA-256. This draft adds `CAMERA_EVIDENCE`: an inner stored ZIP containing exactly `camera-selection.json` and `camera-image.png`, held as one native document in the existing `atlas-clarus-tool-exchange/1.0` carrier. The JSON's original image filename remains unchanged inside the record. Original JSON bytes (including whitespace and unknown fields) and PNG bytes survive repeated transfers.

In the isolated Tool Exchange preview, choose the original PNG and JSON under Camera evidence and click Add camera evidence pair, then Save complete exchange ZIP. Import that exchange ZIP through the existing workspace import. Download original native file yields the evidence ZIP, whose two companions can be extracted unchanged. API: `ATLAS_TOOL_EXCHANGE.addCamera(package, {imageBytes, recordBytes}, context)`.

Verification checks the outer payload SHA-256, exact companion set, recorded image SHA-256, PNG signature/IHDR dimensions, RGB syntax, sampling bounds, timestamp, master identity and recorded row/reference/RGB against the master. Library ID/name are historical evidence, retained verbatim even when unavailable in the receiver; membership is not independently attested. Neither pixels nor nearest reference assignments are recomputed. All derive operations on camera evidence are blocked. Existing project formats are not silently extended and there is no automatic palette decision or print approval.

Checksums establish consistency, not authenticity. The unsigned original JSON has no independent author signature; its bytes are covered by the outer carrier SHA-256. Verification does not claim to validate camera calibration, lighting, pixel sampling accuracy, PNG rendering, historical library membership or the truth of a self-consistent unsigned record. A changed image with the original record fails even if the outer carrier hash is recomputed.

Reproduce:

```sh
node browser-bundle/tests/validate_camera_exchange.cjs
node browser-bundle/tests/validate_tool_exchange.cjs
```

Camera tests cover three complete export/import cycles, exact PNG/JSON preservation, deliberately different stored pixel/observed RGB (proving no remeasurement), unavailable historical library, blocked derivations, either missing companion, changed image bytes, invalid/wrong hashes, changed master/reference, invalid sampling/RGB and inner corruption with recomputed outer hash. No physical-device acceptance or production deployment is claimed.
