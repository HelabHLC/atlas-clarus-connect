# Android beta.11 — RC34.4 reference libraries

Version 0.4.0-beta.11 / versionCode 11; application ID com.atlasclarus.connect.
The source payload exactly matches the public Browser Edition RC34.4 ZIP:
0163cfd86adf51219bdc1eaf051ba0f656fca03a1fb8ae5ae8478ebcefbe976e.
It is rebuilt from its frozen preview, with only version/manifest/checksum
promotion changes before adding the unchanged Android bridge and Colour ID.

New-work selectors expose 78 choices: full 13,283-row Core and 77 source-backed
selections. All 16 earlier libraries retain their names and ordered reference
lists for existing work. The frozen master, RGB-only binding, native Java,
application ID, WebView origin/storage and reserved signing key are unchanged.
VersionCode 10 is not reused. Native export still has a 64 MiB limit.

The upstream payload is public, while this Android package remains an internal
test candidate. Physical device/WebView acceptance and Play submission remain
separate. No automatic Play publication is performed.

Validation includes exact payload SHA, native-boundary fingerprints, every
packaged APK/AAB asset, source-bound modules, DE/EN Colour ID, library selectors,
legacy job replay and persisted beta.10 -> beta.11 documents. Older beta.9 and
beta.8 update checks remain. Chromium document checks are distinct from physical
Android acceptance. The existing signing workflow remains manual-only and retains
the android-beta-signing environment, key pins and certificate checks.

Before updating, export open work. Install through the same testing channel as
the existing installation; do not uninstall or clear app data. Check existing
palettes/projects, portrait/landscape, imports, reduction and Tool Exchange
export/reopen, including files opened outside the app.

Status: preparation and automated validation in progress; signed APK/AAB and
physical device acceptance are not yet claimed.
