# Android beta.6 preparation and acceptance gate

Date: 2026-10-10. Owner-approved scope: prepare the next test update with the
Image Projects integrity correction; submit to the existing test track only
after device acceptance. **No production publication.**

## Fixed candidate

- Release ID: `com.atlasclarus.connect` (unchanged).
- Version: `0.4.0-beta.6`, versionCode `6`; beta.4 and beta.5 are not reused.
- Corrected Image Projects source: PR #70, commit
  `9b0f2c9799879da65f0f8f02b702595b1336ae24`.
- Internal candidate ZIP: `0.2.0-rc31-image-projects`, SHA-256
  `81e3eae2a8aea5f2fd9772a61db5a66c13d62886befa2783ecbdf32ec6a87627`.
  This digest was produced by PR #70 workflow run `38056575054`, Chromium
  job `114226206755`. Android must reproduce it; the RC31.1 website ZIP is
  not a substitute. The source candidate includes Colour handoff/projects
  and image edits with retained originals and history.
- Colour ID and the reference master remain unchanged.

This branch is stacked on the source-binding branch. Review and integration
of the dependency chain remain necessary; do not merge solely to trigger a
build, because a push to main can publish the moving browser download.
No automatic signing or Play upload has been added.

## Evidence levels

PR #70's desktop browser results apply to its recorded source, not a phone.
This preparation adds Android build and packaged-content checks. Results must
be attached to the exact final candidate commit; a green predecessor is not
acceptance of a later APK. Ordinary CI artifacts use `.dev` and do not replace
the existing app. Reserved-key signing, real Android installation/update and
Play submission are NOT_PERFORMED until separately evidenced.

## Device acceptance record (all PENDING)

Record device model, Android version, Android System WebView provider/version,
installed old/new app versions, installation source and APK/AAB SHA-256. Use
an update signed for the existing installation; a Play install may have a
Play-managed signing certificate different from the sideload certificate.
Do not uninstall or clear app data. Export existing palettes/projects first.

| Check | Required observation | Result |
| --- | --- | --- |
| Existing-app update | Same app updated; saved palette names, counts, reference IDs and original-source records retained | PENDING |
| Offline startup | Airplane mode: Connect and Colour ID open; DE/EN and 14 tabs remain usable | PENDING |
| Image Project | PNG and JPEG load; sample coordinate/RGB/reference remain distinguishable | PENDING |
| Edit history | Recolour and transparency work; undo/redo preserve original and journal | PENDING |
| Android document handover | Save JSON and ZIP through Save Document; close/reopen; import both and continue | PENDING |
| Source-binding negative case | A coherently rehashed changed starting pixel with unchanged source is rejected; current project remains intact | PENDING |
| Decoder limits | Alpha, ICC-tagged and EXIF-rotated fixtures either verify exactly or show an explicit non-destructive rejection | PENDING |
| Navigation and layout | Portrait/landscape and narrow screen; no hidden controls; save-before-leaving warning understood | PENDING |
| Previous features | Colour ID image trace and palette JSON, ASE/GPL/CSS/PDF/PNG save smoke checks; cancellation preserves workspace | PENDING |

For cross-device handover, record the creating and receiving WebView/browser
versions. Do not label every rejection as tampering: legitimate decoder
differences can fail exact verification. No fallback or tolerance is authorized.

## Submission gate

Only after exact-candidate automated checks, compatible signing and physical
acceptance: prepare the signed AAB, verify its package identity/certificate,
check versionCode 6 is unused in Play Console, and submit as an update of the
existing app in the existing authorized test track. If 6 is already used,
allocate a higher version and repeat the identity/artifact checks. Do not
promote to production or alter the website download in this task.

The signing workflow creates artifacts only; it does not constitute a Play
submission. With a Play-installed app, verify updates using the appropriate
Play signing/distribution path rather than installing a differently signed APK.

## Proposed test release notes

DE: Neue Testversion mit Bildprojekten: Bilder gezielt umfärben oder transparent
machen, Änderungen nachvollziehen und Projekte als JSON/ZIP weitergeben.
Zusätzliche Prüfung, ob die gespeicherten Ausgangspixel zum eingebetteten
Originalbild passen. Bei Abweichungen wird der Import abgelehnt. Bitte vor dem
Update Paletten und Projekte exportieren. Keine öffentliche Endversion.

EN: Test update with Image Projects: recolour or make pixels transparent,
retain edit history and hand projects over as JSON/ZIP. Added verification
that frozen starting pixels match the embedded original image. Mismatches
are rejected without replacing the open project. Export palettes/projects
before updating. This is not a production release.
