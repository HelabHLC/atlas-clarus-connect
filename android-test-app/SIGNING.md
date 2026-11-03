# Connect beta identity and signing

**Verified 3 November 2026:** the current Android version is
`0.4.0-beta.15` / `versionCode 15`, application ID `com.atlasclarus.connect`,
with the pinned RC34.4 browser payload. Its reserved-key APK/AAB build succeeded
in [run 39762489747](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/39762489747)
on commit `e6417fd9a822789fce8347419de908e149ec8f16`. The identical AAB is already
active in Play internal testing. The current Play upload certificate matches
the reserved certificate below. A new build/upload is not required for this
candidate, and version code 15 must not be reused for changed contents.
See [BETA15_VERIFICATION.md](BETA15_VERIFICATION.md) for hashes and limitations.

The first signed beta used version code 1. The debug variant uses
`com.atlasclarus.connect.dev` and its runner-generated debug certificate; it is
never a substitute for a signed beta. The installed 0.3.3 Navigationstest has
a different application ID, so this beta installs separately and does not
inherit its private palettes.

## Signing custody

Keep one long-lived signing keystore and its passwords outside the repository.
The release task fails if any signing setting or the keystore is missing. Do
not commit a keystore or passwords, include them in issue text, or upload them
as CI artifacts. The repository ignores `*.jks`, `*.keystore` and
`keystore.properties` under `android-test-app`.

The following key-creation command is only a first-time setup reference.
Do not generate a replacement key for the existing application. For initial
local key creation with JDK 17 or newer, choose and preserve a strong
password. The private key needs a protected, independently accessible backup:

```sh
keytool -genkeypair -keystore atlas-connect-beta.jks -storetype PKCS12 \
  -alias atlas-connect-beta -keyalg RSA -keysize 3072 -validity 10000
```

Record the public certificate fingerprint with `keytool -list -v -keystore
atlas-connect-beta.jks -alias atlas-connect-beta`. Keep the keystore and
password recoverable for future updates. A new key with the same alias is not
the same signing identity.

The reserved beta certificate has SHA-256 fingerprint
`98:6C:A7:30:EF:C5:4A:20:CF:C8:8A:F4:FB:61:01:8D:FE:76:58:F3:16:5C:5B:6F:B5:5E:B9:C5:9C:CA:D6:3C`.
The private key and its password are held separately from this repository.

To build locally, provide `ATLAS_CONNECT_KEYSTORE_PATH`,
`ATLAS_CONNECT_STORE_PASSWORD`, `ATLAS_CONNECT_KEY_ALIAS`, and
`ATLAS_CONNECT_KEY_PASSWORD` as environment variables, then run
`gradle -p android-test-app :app:assembleRelease`. Avoid putting passwords in
the shell command or repository files.

The manual **Android signed beta** workflow reads the reserved keystore from
`ATLAS_CONNECT_KEYSTORE_BASE64` and its password from
`ATLAS_CONNECT_STORE_PASSWORD` in the `android-beta-signing` environment. The
alias is fixed to `atlas-connect-beta`; this PKCS12 key uses the same key and
store password. Base64 is transport encoding, not encryption. Restrict the
environment to trusted maintainers/branches and run the workflow only for a
reviewed commit. The workflow builds a signed APK for direct device testing
and a signed AAB for Google Play. It verifies the APK identity and
certificate, and verifies that the AAB carries the reserved certificate.
Before reading signing secrets it runs the version/bundle contract regression
checks. Both packaged asset trees must match the prepared RC34.4/Colour ID
payload. Artifact names carry beta.15. The workflow itself never uploads to
Play or starts a rollout. The successful historical run and existing internal
release are recorded separately; this documentation update does not rerun it.

Play App Signing is already in use. The visible app-signing fingerprint in the
audited Play Digital Asset Links snippet is
`46:C7:55:46:D4:79:22:92:16:C9:3C:64:93:C4:AF:60:41:6C:75:BE:74:F7:3A:59:FE:91:00:85:B0:D1:3A:87`,
which differs from the reserved upload/direct-APK certificate. AAB acceptance
therefore does not prove that a Play-delivered APK can update a directly
installed APK. Check the installed signing identity and any applicable signing
lineage before choosing that update path. Do not uninstall, clear app data or
change signing keys to force an update. No such device/signing-lineage test was
performed in this audit. Do not put private keys or passwords in this repository.

For each later beta, increase `versionCode`, update `versionName`, adjust the
workflow's identity assertion and artifact name, and sign with the *same*
keystore. Update the reviewed tuple in `test_release_identity.py` together with
the bundle pin; never change a signed version's payload by only replacing its
ZIP hash. Historical beta.4 is bound to RC27 SHA-256
`3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`;
beta.5 is bound to RC28 SHA-256
`79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8`.
Check the certificate fingerprint against the first signed beta
before distributing an update. Preserve the previous APK until an on-device
update has been confirmed without losing local palettes.

The pull-request CI builds a release APK and AAB with a disposable key, verifies
them and their packaged assets, and deletes them without uploading them. That check exercises both signing paths
but does not create an updateable beta artifact.
