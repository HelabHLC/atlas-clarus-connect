# ATLAS Clarus RC32.2 — keep the complete image story

RC32.2 keeps Colour Reference Cards and the strict Image Projects source/pixel
check. It adds clearer handover help. A valid project can still be rejected when
another browser decodes transparency or embedded colour profiles differently.

Keep and send the complete image-project JSON or ZIP. The current PNG alone does
not retain the original file and editable history. Never replace frozen pixels,
strip the source profile or recreate a project to bypass a failed check.

## If another browser rejects a project

Use an environment that verifies the exact project. For desktop users, the
separate ATLAS Clarus Image Exchange RC32.2 package contains the same browser
edition and a local helper that checks Chromium, Firefox and WebKit. A successful
check preserves source bytes, captured sRGB, coordinates, references and history.
The helper cannot run inside WordPress, Android, iPhone or iPad.

Install Node.js and the system dependencies required by Playwright. Unzip the
helper package, open a terminal in its root folder, then run:

```
npm ci --prefix browser-bundle/tests --ignore-scripts
node browser-bundle/tests/node_modules/playwright/cli.js install --with-deps chromium firefox webkit
node browser-bundle/tools/image-project-exchange.cjs "path/to/project.zip" --check
node browser-bundle/tools/image-project-exchange.cjs "path/to/project.zip" --open chromium
```

Choose an engine reported as VERIFIED; use firefox or webkit when appropriate.
JSON is supported as well as ZIP. Opening always repeats full verification in the
actual editor process. No engine match means no import; retain the unchanged
files and ask the sender to continue in their verified environment.

Use the editor's download buttons to save new JSON/ZIP files. The helper prints
Saved: and retains the files in a new atlas-exchange-downloads-* folder beside
the incoming file. Wait for that message before closing. Closing alone does not
save edits. The input is never overwritten.

Installation downloads the browser engines. Subsequent checks and editing use
local files; project bytes are not uploaded. Reports test local consistency,
not authorship or external authenticity. Browser names and versions alone are
not a guarantee: the full exact check must pass for every project.

## Updates and retained work

Palettes and Colour Projects retain their existing storage keys. Image Projects
has no autosave: export open projects before closing or updating. Keep exports
outside the app as well. For Android use the existing compatible update channel;
do not uninstall or clear app data to force an update.

Physical iPhone/iPad, macOS Safari and physical Android update acceptance remain
open for this release. Linux Playwright tests are not physical-device tests.
