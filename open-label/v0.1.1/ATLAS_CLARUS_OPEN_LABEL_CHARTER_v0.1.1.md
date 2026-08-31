# ATLAS Clarus Open Label Charter v0.1.1

**Status:** REVIEW DRAFT — NOT YET A CERTIFICATION STANDARD  
**Document version:** 0.1.1  
**Supersedes for review:** v0.1 public draft  
**Workflow baseline:** ATLAS Clarus Workflow v3.4.0  
**Active reference master:** `atlas_master__active_master__v2_illumext.pkl`  
**Active master rows:** 13,283  
**Active master SHA-256:** `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

## 1. Purpose

ATLAS Clarus is an open reference-identity architecture for colour communication. It gives a documented colour reference a persistent, deterministic and machine-verifiable identity before production-dependent transformations are applied.

ATLAS Clarus does not define a new colour space and does not replace CIELAB, HLC, ICC colour management, device profiles, spectral measurement or production standards. It preserves the answer to a preceding question:

> Which exact documented reference identity did this colour start from?

The Open Label makes narrowly defined facts about that identity and its processing publicly verifiable.

## 2. Open-label principles

An implementation conforming to this Charter shall follow these principles:

1. **Identity before transformation.** Source identity is established before ICC conversion, gamut mapping, separation, rendering or output optimisation.
2. **Persistence.** A frozen identity shall not be silently replaced by later production decisions.
3. **Determinism.** The same valid input, master and binding mode shall produce the same identity result.
4. **Explicit provenance.** Master version, digest, identifier basis and relevant source information shall be recorded.
5. **Machine verifiability.** A claim shall be representable in a structured conformance record.
6. **Bounded claims.** Identity verification shall not be presented as proof of physical colour accuracy.
7. **Visible uncertainty.** Unresolved authority, missing measurements and experimental states shall remain visible.
8. **Open inspection.** Normative specifications, conformance criteria and test vectors shall be publicly inspectable.
9. **No silent mutation.** A change to normative identity data requires a new version and digest.
10. **Separation of interests.** Reference data, software, trademarks and independent certification shall be governed separately.

## 3. Normative terms

The words **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT** and **MAY** indicate requirement, prohibition, recommendation, discouraged practice and permission respectively.

- **ATLAS identity:** The combination of an `atlas_row_id`, canonical reference designation, master identity and required integrity information.
- **Reference master:** A versioned, immutable dataset accepted by the applicable ATLAS Clarus specification.
- **Master digest:** The SHA-256 digest of the exact byte sequence of the reference master.
- **Source identity:** The selected ATLAS identity before downstream production transformation.
- **Production identity:** An optional downstream reference selected for a documented production purpose; it shall not overwrite source identity.
- **Identity handoff:** Transfer of a source identity and its integrity fields between conforming systems.
- **Conformance record:** A machine-readable statement of tests, outcomes, scope and limitations.
- **Measured QC:** Evaluation based on recorded physical measurement data and declared measurement conditions.

## 4. Identity data contract

A normative ATLAS identity record shall contain at least:

- `atlas_row_id`, explicitly declared as zero-based;
- the canonical HLC reference designation;
- `master_sha256`;
- the applicable ATLAS Clarus specification or workflow version;
- an identity status;
- creation or verification time in an unambiguous machine-readable format.
- the identity-binding method and its version;
- the source-authority status applicable to the record.

Where RGB, HEX, Lab, spectral, CMYK, ECG or other values are supplied, their role and conditions shall be declared. Such values shall not independently replace the ATLAS identity.

Human-facing row numbers, if one-based, shall be labelled as display values and shall not be substituted for zero-based `atlas_row_id`.

## 5. Reference-master integrity

The active v0.1.1 baseline is the 13,283-row master identified above. A conformance verifier shall reject or mark as incompatible any claimed record whose master digest does not match the master required by that record.

A revised master shall receive:

- a distinct version designation;
- its own cryptographic digest;
- a change record;
- documented migration consequences;
- preservation of prior published verification where technically possible.

A file with altered bytes shall not retain the former master digest or claim to be the same normative master.

## 6. Conformance levels

The authoritative machine-readable definitions for v0.1.1 are contained in `ATLAS_CLARUS_CONFORMANCE_LEVELS_v0.1.1.json`.

### 6.1 AC-1 — Identity Bound

Confirms that a record is bound to an existing ATLAS identity in the declared reference master and that its required identifiers agree.

It does not confirm display accuracy, profile correctness, producibility or physical colour agreement.

### 6.2 AC-2 — Workflow Verified

Confirms AC-1 and verifies a controlled identity handoff, preservation of frozen source identity and detection of relevant identity mutation.

### 6.3 AC-3 — Profile Bound

Confirms AC-2 and documents a downstream output profile or declared production condition without allowing that condition to rewrite source identity.

It does not confirm the physical result.

### 6.4 AC-4 — Measured QC

Confirms AC-3 and adds a physical measurement record with declared instrument, geometry, illuminant, observer, backing or substrate, calibration state, method, tolerance and result.

AC-4 is unavailable while `measured_qc_status = NOT_MEASURED`.

## 7. Claim boundaries

An ATLAS Clarus label shall not, by itself, be interpreted as:

- a claim of Pantone identity or Pantone equivalence;
- a claim that a screen displays a physically accurate colour;
- proof of print, textile, coating, plastics or product conformity;
- proof that RGB, HEX, Lab, CMYK or ECG values are universally interchangeable;
- proof of source authority where that authority is unresolved;
- an independent certification unless issued under a separately published and authorised certification programme;
- measured quality control when no qualifying physical measurement exists.

## 8. Observed source-context views

The named Pantone-derived source-context views currently documented by ATLAS Clarus have:

- `SOURCE_AUTHORITY = UNRESOLVED`;
- `FREEZE_STATUS = NOT_FROZEN_EXPERIMENTAL`;
- `measured_qc_status = NOT_MEASURED`;
- `pantone_identity_claim = NONE`.

They are observed ATLAS coverage views and shall not be used as normative evidence for AC-1 through AC-4. Their presence in a user interface shall not imply inclusion in the ATLAS normative reference set.

## 9. Relationship to other systems

- **HLC and CIELAB:** May describe or organise reference colour information. ATLAS Clarus adds persistent identity, provenance and integrity binding.
- **ICC colour management:** Remains responsible for profile-based transformations and output behaviour. ICC processing is downstream of source-identity freeze.
- **Spectral data:** May support physical and appearance analysis when provenance and measurement conditions are declared.
- **Named-colour systems:** A name alone is not treated as a unique numerical ATLAS identity.
- **Production standards:** May be bound at AC-3 or assessed at AC-4, but do not retroactively redefine source identity.

## 10. Openness and licensing separation

ATLAS Clarus shall publish or clearly identify the licences applying separately to:

1. source and reference data;
2. ATLAS-added metadata and mappings;
3. software and reference implementations;
4. specifications and documentation;
5. names, logos, badges and other marks.

Upstream copyright, attribution, licence notices and modification notices shall be preserved. Publication under this Charter does not transfer ownership of third-party data or marks and does not permit an implementer to relicense third-party material as its own.

The technical specification should remain usable without payment. Physical samples, laboratory services, audits and certification services may be offered separately.

## 11. Governance

During the v0.1.1 review-draft phase, ATLAS Clarus shall maintain:

- a public issue and change process;
- versioned normative documents;
- recorded decisions affecting identity or conformance;
- regression tests and public test vectors;
- a security and integrity disclosure route;
- a declared maintainer or interim governance body.

Before an independent certification label is launched, governance should be transferred to or supervised by a suitably neutral body with published rules, conflict-of-interest controls, appeals and revocation procedures.

## 12. Change control

Changes are classified as:

- **Editorial:** no semantic or conformance effect;
- **Compatible:** adds optional fields or clarifies tests without invalidating valid records;
- **Breaking:** changes identity meaning, mandatory data, algorithm, index basis, master or pass criteria.

Breaking changes require a new specification version and migration note. Prior normative records shall remain attributable to the version under which they were issued.

## 13. Verification and revocation

Every public label claim should be accompanied by, or resolve to, a conformance record. A verifier shall report at least `PASS`, `FAIL`, `INDETERMINATE` or `NOT_APPLICABLE`, with reasons.

The record shall identify the exact assessed object and boundary, the evidence digest or immutable evidence reference, the issuing role and whether the result is `SELF_VERIFIED`, `INDEPENDENTLY_VERIFIED` or `AUTHORISED_CERTIFICATION`. A claimant shall not choose the latter two statuses without a separately established and competent programme.

A valid result applies only to the recorded object, version and assessment boundary. Modification of that object after verification requires reassessment unless the verifier can prove that the modification is outside the assessed boundary.

A label may be withdrawn or marked invalid when its evidence is missing, altered, incompatible, falsely represented or no longer satisfies the applicable version. Revocation shall not erase historical evidence; it shall add a visible status and reason.

## 14. Public-draft limitation

Version 0.1 is a design and consultation draft. It establishes vocabulary, architecture and proposed requirements. It does not yet authorise use of an independent certification mark and is not legal, laboratory or accreditation advice.

## 15. Canonical v0.1.1 statement

> ATLAS Clarus preserves and verifies a persistent colour-reference identity before production-dependent transformation. Verification of identity is not, by itself, verification of physical colour appearance or production quality.

## 16. Review changes from v0.1

Version 0.1.1:

- identifies itself as a review draft rather than a certification standard;
- adds binding-method and source-authority fields to the identity contract;
- requires an exact assessment scope and evidence reference;
- distinguishes self-verification, independent verification and authorised certification;
- clarifies that changes inside the assessed boundary require reassessment;
- corrects the machine-readable companion so it is not misrepresented as a JSON Schema.
