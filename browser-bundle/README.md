# ATLAS Clarus Browser Bundle

This directory builds a standalone offline HTML edition of ATLAS Clarus Connect.

## Build

```bash
python3 browser-bundle/build_bundle.py
```

The generated ZIP opens through `atlas-clarus-browser-bundle/index.html` without a web server. CSS, JavaScript and all 13,283 references are embedded directly in that entrypoint, so it also works when Windows opens the HTML directly from inside the ZIP.

RC6 provides one shared palette across Hover and Wheel. Palettes remain in local
browser storage and export as ASE, Figma Tokens JSON, CSS or Clarus JSON.

## Release boundary

- Status remains `READY_PENDING_AUDIT` until the clean release audit passes.
- The package does not alter reference binding, the active master, or the frozen A′ v0.4 selection logic.
- Interaction Wheel v0.5 content is diagnostic-only.
- Desktop application sections are documented workflow demonstrations, not embedded native integrations.
- Appearance output is simulated and never measured QC.
