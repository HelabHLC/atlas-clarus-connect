# RC33.5 public pilot: original RGB and rectangular area protection

Promotes RC33.4.1 preview without changing runtime modules or frozen master data.
Version/status/deployment flag and checksums are the only runtime-package differences.
WordPress beta15 retains the guarded native installer and rollback of beta12, with
new bundle pins and strict manifest fields. Updating the plugin alone preserves
the active runtime; a separate guarded activation switches the public app.

## Behaviour

Global original-RGB locks preserve every visible exact RGB match. Inclusive
rectangles preserve all contained RGBA pixels, including hidden transparent RGB.
Protected distinct visible RGB colours reserve palette slots; conflicts fail
explicitly. Reference locks remain separate immutable ATLAS references. Original
swatches show source RGB and separate assigned HLC, row, reference RGB and HEX.
Exports include the exact protection mask and original/source/output provenance.
This does not guarantee a production ink count or automatic protection of all nuances.

## Evidence and acceptance boundaries

Preview CI: PR83 run38718446906, PR84 run38722801861, PR85 run38724638539 passed.
Owner-operated offline export checks on 2026-10-15 independently verified:
- 1800x1800, 30105 source colours to4: all374003 protected #A82A5D pixels exact;
  separate immutable reference H360_L040_C055 row13227;12 manifest files verified.
- 810x896,150902 source colours to34: inclusive rectangle[413,351,414,352],
  all4 protected pixels exact;13 manifest files, mask and PNG reconstruction verified.
  #413306 and #463605 remain distinct despite sharing reference row3399.

Release CI separately tests reproducible ZIPs, preview boundary, PHP7.4/8.5 installer
and rollback, embedded-runtime browser journeys and independent PNG/mask checks.
A passing CI run is automated verification, not public interactive acceptance.
Public WordPress beta15 / RC33.5 activation and the desktop public UI test passed on 2026-10-15. See `wordpress-browser-edition/RC33_5_DEPLOYMENT.md` and `browser-bundle/evidence/rc33.5/live-verification.json`: 69 source RGB colours to24, two global RGB locks plus an inclusive2x2 rectangle, six exact protected RGBA pixels, all32768 source reference assignments independently verified, PNG/ZIP verified,58 public files matched. Physical devices and production remain untested.
No customer artwork is included. Paint-by-Numbers PR81 is outside this release.
