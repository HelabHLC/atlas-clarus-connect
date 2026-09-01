# APF–AxF Bridge v0.1

Review Draft for binding an AxF appearance material to an ATLAS Clarus colour identity while preserving the evidence chain.

> ATLAS Clarus APF does not replace AxF. It binds an AxF material to a stable colour identity and preserves the evidence chain from reference to rendered and measured appearance.

Contents:

- `APF_AXF_BRIDGE_SPEC_v0.1.md` — normative model and integrity rules
- `schemas/apf-axf-bridge-v0.1.schema.json` — JSON Schema Draft 2020-12
- `examples/apf-axf-bridge-v0.1.example.json` — complete, non-production example
- `validate_apf_axf_bridge_v0_1.py` — schema plus semantic validation

Run:

```bash
python3 validate_apf_axf_bridge_v0_1.py examples/apf-axf-bridge-v0.1.example.json
```

