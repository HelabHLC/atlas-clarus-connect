# ATLAS Clarus Label Usage Rules v0.1.1

**Status:** REVIEW DRAFT — LABEL USE NOT YET GENERALLY AUTHORISED  
**Related Charter:** `ATLAS_CLARUS_OPEN_LABEL_CHARTER_v0.1.1.md`  
**Related conformance definition:** `ATLAS_CLARUS_CONFORMANCE_LEVELS_v0.1.1.json`

## 1. Purpose

These rules define how ATLAS Clarus names, statements and future badges may be used without exaggerating the evidence. They apply to software interfaces, websites, files, reports, packaging, physical samples, marketing, education and partner communications.

Version 0.1 is a public draft. It permits descriptive references to the project but does not yet grant general permission to display an official certification badge.

## 2. Descriptive reference permitted during the draft phase

The following factual wording may be used when accurate:

> Implements the ATLAS Clarus Open Label v0.1.1 review draft.

or:

> Experimental ATLAS Clarus identity binding — not independently certified and not measured QC.

The complete version number and draft status shall remain visible.

## 3. Reserved label names

The following names are reserved for records that pass their corresponding conformance level:

- `ATLAS Clarus Identity Bound` — AC-1;
- `ATLAS Clarus Workflow Verified` — AC-2;
- `ATLAS Clarus Profile Bound` — AC-3;
- `ATLAS Clarus Measured QC` — AC-4.

Abbreviations or translated wording shall not change the scope of the underlying claim.

The unqualified wording **ATLAS Clarus Certified** shall not be used under v0.1.1.

## 4. Required adjacent information

Whenever a conformance label is displayed, the user shall be able to access the corresponding conformance record. The visible label or its immediate detail view shall identify:

- conformance level;
- specification version;
- conformance result;
- verification date;
- verifier name and version;
- exact assessed object and assessment boundary;
- evidence digest or immutable evidence reference;
- verification class: `SELF_VERIFIED`, `INDEPENDENTLY_VERIFIED` or `AUTHORISED_CERTIFICATION`;
- master SHA-256, at least in an accessible detail view;
- limitations relevant to the claim;
- `measured_qc_status`.

For AC-1 and AC-2, `NOT_MEASURED` shall be visible wherever a viewer could otherwise infer physical approval.

## 5. Badge integrity

When official badge artwork becomes available, users shall:

- use an authorised original asset;
- preserve wording, proportions, colours and clear space;
- keep the conformance level legible;
- link or point to the conformance evidence where the medium permits;
- avoid combining the badge with another organisation's logo in a way that implies endorsement;
- remove or update the badge when the associated evidence fails or is revoked.

Users shall not:

- create higher-level or substitute badges;
- remove the draft, experimental or measurement limitation;
- present a cropped symbol as an unrestricted quality seal;
- place the badge on an entire product range when only one file, colour, workflow or sample was assessed;
- use visual styling that suggests governmental, accredited or independent certification where none exists.

## 6. Scope must remain specific

A label applies only to the assessed object and boundary. Examples include:

- a particular colour-identity record;
- a named file and version;
- a declared software version;
- a defined handoff between two systems;
- a specific profile-bound output route;
- a specific physical sample and measurement record.

A pass for one colour, file, software version, substrate, profile, printing condition or sample shall not be generalised to other objects.

## 7. Prohibited claims

Unless supported by a separate, valid authority, a user shall not state or imply:

- “Pantone equivalent”, “official Pantone”, “Pantone certified” or Pantone identity;
- “colour accurate on every screen”;
- “print guaranteed” or “production approved” from AC-1, AC-2 or AC-3;
- “measured”, “laboratory verified” or “QC passed” when `measured_qc_status = NOT_MEASURED`;
- “independently certified” when the verifier is controlled by the claimant and no authorised independent programme applies;
- universal equivalence between HEX, RGB, Lab, CMYK, ECG, spectral values and physical appearance;
- that ATLAS Clarus replaces ICC colour management, measurement standards or production standards;
- that an observed coverage view establishes source authority.

## 8. Pantone-derived observed views

Pantone-derived observed coverage views are excluded from normative label use while their status remains:

```text
SOURCE_AUTHORITY = UNRESOLVED
FREEZE_STATUS = NOT_FROZEN_EXPERIMENTAL
measured_qc_status = NOT_MEASURED
pantone_identity_claim = NONE
```

If these views are shown, the interface shall describe them as observed ATLAS coverage and shall not display an AC-1, AC-2, AC-3 or AC-4 badge for the observed mapping itself.

## 9. Software and interface use

Software may state that it supports ATLAS Clarus when it accurately identifies:

- the supported specification version;
- the implemented conformance levels;
- the reference master digest;
- whether verification is local, remote or external;
- any unsupported checks or fields.

Merely importing an ATLAS-related file or displaying an HLC value does not establish conformance.

Interfaces should keep these concepts visually distinct:

1. source colour and provenance;
2. frozen ATLAS identity;
3. appearance or viewing-condition analysis;
4. production mapping and device values;
5. physical measurement and QC.

## 10. Product, packaging and physical-sample use

AC-1 through AC-3 may refer to the digital identity or workflow but shall not be positioned so that a purchaser reasonably understands them as physical product approval.

Only AC-4 may describe a measured physical sample, and only within the declared measurement conditions, target, tolerance, date and sample identification. AC-4 does not automatically extend to later production batches.

## 11. Attribution and third-party rights

Users shall preserve all attribution and licence notices required by the applicable source data, software and documentation licences.

ATLAS Clarus label permission does not grant rights to third-party names, numbering systems, logos, datasets or other intellectual property. Third-party marks shall be used only where separately authorised or where legally permissible as a factual reference.

## 12. Self-verification and independent certification

A developer may run the open verifier and publish a self-verification record, provided it is identified as **SELF_VERIFIED**.

The status **INDEPENDENTLY_VERIFIED** requires a competent assessor organisationally independent of the claimant and published assessment rules. The status **AUTHORISED_CERTIFICATION**, the terms **CERTIFIED**, **ACCREDITED** or equivalent require a separately authorised programme with published competence, impartiality, audit, appeal and revocation rules.

Self-verification is useful technical evidence but is not the same as an independent certification.

## 13. Corrections, suspension and revocation

Label use shall stop or be corrected when:

- the conformance record is missing or altered;
- a required check no longer passes;
- the wrong master or identifier basis was used;
- the assessed object changed materially;
- a claim exceeds the assessed scope;
- a label was issued using false, incomplete or misleading evidence;
- the applicable authorising body suspends or revokes the claim.

A public revocation record should state the affected claim, date and reason without deleting the historical evidence.

## 14. Examples

### Acceptable

> ATLAS Clarus Identity Bound · AC-1 · Spec v0.1.1 Review Draft · Master `8283ab91…` · SELF_VERIFIED · NOT_MEASURED

> This workflow preserved the frozen ATLAS source identity through the documented application handoff. AC-2 public-draft conformance record available.

### Not acceptable

> ATLAS Clarus certified colour — guaranteed to match in print.

Reason: It omits the conformance level and makes an unsupported physical guarantee.

> Official Pantone match verified by ATLAS Clarus.

Reason: ATLAS Clarus does not establish Pantone identity, and the observed views have unresolved source authority.

## 15. Draft-phase canonical notice

Until a final label programme is authorised, public implementations should use:

> **ATLAS Clarus Open Label v0.1.1 — Review Draft. Identity verification is not physical colour certification.**

## 16. Review changes from v0.1

Version 0.1.1 adds mandatory identification of the assessed object, assessment boundary, evidence reference and verification class. It also distinguishes independent verification from authorised certification and aligns all visible status spelling with the machine-readable conformance catalogue.
