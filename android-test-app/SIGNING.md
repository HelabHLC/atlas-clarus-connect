# Connect beta identity and signing

The first updateable beta uses application ID `com.atlasclarus.connect`,
`versionCode 1`, and `versionName 0.4.0-beta.1`. The debug variant uses
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

For local key creation with JDK 17 or newer, choose and preserve a strong
password. The private key needs a protected, independently accessible backup:

```sh
keytool -genkeypair -keystore atlas-connect-beta.jks -storetype PKCS12 \
  -alias atlas-connect-beta -keyalg RSA -keysize 3072 -validity 10000
```

Record the public certificate fingerprint with `keytool -list -v -keystore
atlas-connect-beta.jks -alias atlas-connect-beta`. Keep the keystore and
password recoverable for future updates. A new key with the same alias is not
the same signing identity.

To build locally, provide `ATLAS_CONNECT_KEYSTORE_PATH`,
`ATLAS_CONNECT_STORE_PASSWORD`, `ATLAS_CONNECT_KEY_ALIAS`, and
`ATLAS_CONNECT_KEY_PASSWORD` as environment variables, then run
`gradle -p android-test-app :app:assembleRelease`. Avoid putting passwords in
the shell command or repository files.

The manual **Android signed beta** workflow reads the same four values from
GitHub Actions environment secrets in `android-beta-signing`; it expects the
keystore bytes as `ATLAS_CONNECT_KEYSTORE_BASE64` instead of a local path.
Base64 is transport encoding, not encryption. Restrict the environment to
trusted maintainers/branches, store its secrets there, and run the workflow
only for a reviewed commit. Its release artifact is verified with `apksigner`
and checked for the exact application ID and version.

For each later beta, increase `versionCode`, update `versionName`, adjust the
workflow's identity assertion and artifact name, and sign with the *same*
keystore. Check the certificate fingerprint against the first signed beta
before distributing an update. Preserve the previous APK until an on-device
update has been confirmed without losing local palettes.
