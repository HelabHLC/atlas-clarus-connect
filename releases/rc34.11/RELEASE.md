ATLAS Clarus RC34.11 makes colour origin visible in Image Picker, Hover/Wheel and recorded palette sources. It distinguishes the original file's embedded ICC metadata, browser-decoded sRGB processing, sampled Source Colour, assigned ATLAS reference and the separate output job.

PNG, JPEG and WebP profile inspection records the profile description, colour space and SHA-256 with bounded parsing. Missing, invalid and uninspected profiles remain distinct. No input profile is assigned by ATLAS. The captured source RGB and RGB-only reference matching stay unchanged.

Recorded metadata survives Clarus JSON and the existing QuarkXPress XTG + Source JSON ZIP. Older records remain readable. Keep the original image: palette exports contain metadata, not original image or ICC bytes. Profile presence does not establish correct browser conversion or print accuracy.

Validation includes 37 metadata/limits/tamper groups; eight real image cases compared against RC34.10; unchanged source RGB/reference/sampling; JSON and ZIP export/import/re-export; local persistence; rejected inconsistent imports; mobile panel layout; and the existing 4,096-source ZIP regression. The WordPress installers verify the fixed bundle size, SHA-256, manifest and file checksums before switching runtime, and retain the prior runtime for rollback.

The immutable 13,283-row master is unchanged: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.

Public beta. Browser bundle `0.2.0-rc34.11-colour-origin`; full WordPress installer `0.1.20-beta1`; small installer `0.1.20-beta1.1`. Publication and IONOS activation explicitly requested on 1 November 2026. Native QuarkXPress/RIP and physical print acceptance remain outside this release.
