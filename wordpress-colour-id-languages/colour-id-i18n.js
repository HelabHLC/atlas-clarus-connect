(function () {
  'use strict';
  const frame = document.querySelector('.atlas-clarus-wp-frame');
  if (!frame) return;
  const source = new WeakMap();
  const attrSource = new WeakMap();
  let language = new URL(location.href).searchParams.get('lang') === 'de' ? 'de' : 'en';
  let observer;
  const article = document.querySelector('.post-5227');
  const de = new Map(Object.entries({
    'Explore a colour’s identity in depth': 'Die Identität einer Farbe im Detail erkunden',
    "Explore a colour's identity in depth": 'Die Identität einer Farbe im Detail erkunden',
    'Pick a pixel from an image or enter RGB/HEX to bind its observed 8-bit sRGB value to an ATLAS reference. The primary assignment uses squared RGB distance and a deterministic': 'Wähle ein Bildpixel oder gib RGB/HEX ein, um den beobachteten 8-Bit-sRGB-Wert einer ATLAS-Referenz zuzuordnen. Die primäre Zuordnung nutzt die quadrierte RGB-Distanz und bei Gleichstand die kleinere',
    'tie-break. Lab and ΔE00 support subsequent comparisons; they do not choose the reference.': '. Lab und ΔE00 dienen erst den nachfolgenden Vergleichen; sie bestimmen die Referenz nicht.',
    'Colour ID analysis workbench': 'Colour ID Analyse-Workbench',
    'This standalone': 'Dieser eigenständige',
    'offers detailed tabs for image picking, region analysis, palettes, heatmaps, traceability, Atlas navigation, gamut and ICC context, production comparison, measured/spectral QC, and approval reporting. The reference identity remains traceable across these views.': 'bietet ausführliche Tabs für Bildauswahl, Regionsanalyse, Paletten, Heatmaps, Nachverfolgung, Atlas-Navigation, Gamut- und ICC-Kontext, Produktionsvergleich, Mess- und Spektral-QC sowie Freigabeberichte. Die Referenzidentität bleibt in allen Ansichten nachvollziehbar.',
    'Digital profile conversions and screen previews are calculations, not physical measurements, print proofs, or production approvals. Measured QC stays': 'Digitale Profilumrechnungen und Bildschirmvorschauen sind Berechnungen, keine physischen Messungen, Druckproofs oder Produktionsfreigaben. Mess-QC bleibt',
    'until a real measurement record is imported and evaluated. Without explicit project limits, a measured result receives no automatic pass/fail approval.': ', bis ein realer Messdatensatz importiert und ausgewertet wurde. Ohne ausdrücklich gesetzte Projektgrenzen gibt es keine automatische Bestanden/Nicht-bestanden-Entscheidung.',
    'Colour reference and attribution: HLC Colour Atlas XL reference material © freieFarbe e.V. / freieFarbe.de. ATLAS Clarus uses a modified, indexed master. CIELAB data are available for analysis; the primary reference assignment is RGB-only.': 'Farbreferenz und Quellenangabe: HLC Colour Atlas XL Referenzmaterial © freieFarbe e.V. / freieFarbe.de. ATLAS Clarus verwendet einen bearbeiteten und indizierten Master. CIELAB-Daten stehen für Analysen bereit; die primäre Referenzzuordnung erfolgt ausschließlich über RGB.',
    'Open full screen': 'Großansicht öffnen',
    'Colour reference credit:': 'Farbreferenz:',
    'Continue with the Browser Edition': 'Weiter mit der Browser Edition',
    'For the connected image → Hover Library → Colour Identity Wheel → palette → print preparation workflow, open the': 'Für den zusammenhängenden Ablauf Bild → Hover Library → Colour Identity Wheel → Palette → Druckvorbereitung öffne die',
    'ATLAS Clarus Browser Edition': 'ATLAS Clarus Browser Edition',
    '. It complements this detailed Colour ID workbench; the two applications have separate version numbers and different scopes.': '. Sie ergänzt diese ausführliche Colour-ID-Workbench; die beiden Anwendungen haben getrennte Versionsnummern und unterschiedliche Aufgaben.',
    'Embedded prototype version checked 29 September 2026.': 'Version des eingebetteten Prototyps am 29. September 2026 geprüft.'
  }));

  // UI wording only. Reference IDs, measurements, exports and application state stay untouched.
  const en = new Map(Object.entries({
    'Atlasidentität · Magnetic Lasso · ΔE00 Heatmap · Multi-Palette · Measured/Spectral QC': 'Atlas identity · Magnetic Lasso · ΔE00 heatmap · Multiple palettes · Measured/spectral QC',
    'Bild-Picker': 'Image Picker',
    'Region Trace & Fill': 'Region Trace & Fill',
    'Region Palette': 'Region Palette',
    'ΔE00 Heatmap': 'ΔE00 Heatmap',
    'Measured QC': 'Measured QC',
    'HLC-Navigator': 'HLC Navigator',
    'Atlas-Browser': 'Atlas Browser',
    'Produktionsvergleich': 'Production Comparison',
    'ICC-Profile': 'ICC Profiles',
    'Farbsatz': 'Colour Set',
    'Das Bild bleibt lokal. Ein Klick bindet das Originalpixel deterministisch an eine': 'The image stays local. A click deterministically binds the original pixel to a',
    '; ICC-Werte werden erst danach verwendet.': '; ICC values are applied only afterwards.',
    'Bild auswählen': 'Choose image',
    'oder PNG/JPEG/WebP hierher ziehen': 'or drag PNG/JPEG/WebP here',
    'Verkleinern': 'Zoom out',
    'Vergrößern': 'Zoom in',
    '✋ Pan': '✋ Pan',
    '✍ Pick': '✍ Pick',
    'Smartphone:': 'Smartphone:',
    'Pan aktivieren → mit einem Finger verschieben, mit zwei Fingern zoomen. Im Pick-Modus bleibt Tippen eine Pixel-Auswahl.': 'Enable Pan → move with one finger and zoom with two. In Pick mode, a tap selects a pixel.',
    'Noch kein Bild geladen': 'No image loaded yet',
    'RGB/HEX auf Atlas binden': 'Bind RGB/HEX to Atlas',
    'Tie-Break: kleinere atlas_row_id': 'Tie-break: smaller atlas_row_id',
    'Region Trace & Atlas Fill': 'Region Trace & Atlas Fill',
    'Eine manuell gezeichnete Spur erzeugt eine reproduzierbar dokumentierte Maske. Die Füllfarbe erhält eine eigene': 'A manually drawn trace creates a reproducibly documented mask. The fill colour receives its own',
    '; die ursprüngliche Bildprovenienz wird nicht überschrieben.': '; the original image provenance is preserved.',
    'Provenienzregel:': 'Provenance rule:',
    'Eine Region kann ursprünglich viele Farben enthalten. v5 behauptet deshalb nicht, die gesamte Region besitze nur eine ursprüngliche Atlas-ID. Stattdessen werden Bildhash, Maskenhash, Pfadhash und – soweit berechenbar – ein Hash der ursprünglichen RGB-Pixel dokumentiert.': 'A region can contain many source colours. v5 therefore does not claim that the whole region has one original Atlas ID. It records image, mask and path hashes and, where possible, a hash of the original RGB pixels.',
    'Zum präzisen Zeichnen hineinzoomen. Zum Verschieben zuerst': 'Zoom in for precise drawing. To move the image, first enable',
    'aktivieren; danach wieder auf': '; then switch back to',
    'Zeichnen': 'Draw',
    'schalten.': '.',
    'Zuerst im Bild-Picker ein Bild laden.': 'Load an image in the Image Picker first.',
    'Noch keine Füllung': 'No fill yet',
    'Region/Bildstand wurde nach der Palette verändert.': 'Region or image changed after the palette was generated.',
    'Palette ist atlasgebunden und exportierbar.': 'Palette is Atlas-bound and can be exported.',
    'Kantenkarte verfügbar · nur Magnetic Lasso nutzt sie.': 'Edge map available · used only by Magnetic Lasso.',
    'Dokumentierte Beobachtung oder Begründung …': 'Documented observation or justification …',
    'Hier Guardrail-JSON einfügen …': 'Paste guardrail JSON here …',
    'Begründung / Freigabehinweis': 'Justification / approval note',
    'Neue Spur': 'New trace',
    'Spur schließen': 'Close trace',
    'Spur löschen': 'Delete trace',
    'Polygon: Punkte anklicken, dann „Spur schließen“. Lasso: Maustaste/Stift gedrückt halten und die Kontur ziehen.': 'Polygon: click points, then choose “Close trace”. Lasso: hold the mouse or pen and draw the outline.',
    '1 · Spurwerkzeug': '1 · Trace tool',
    'Werkzeug': 'Tool',
    'Freihand / Lasso': 'Freehand / Lasso',
    'Füllmodus': 'Fill mode',
    'Struktur erhalten': 'Preserve structure',
    'Magnet-Radius · Source px': 'Magnet radius · source px',
    'Smartphone-Lupe': 'Smartphone magnifier',
    'Ein': 'On',
    'Aus': 'Off',
    'Kantenkarte: noch kein Bild.': 'Edge map: no image yet.',
    '2 · Atlas-Füllfarbe': '2 · Atlas fill colour',
    'Füllfarbe auflösen': 'Resolve fill colour',
    'aktuelle Atlasfarbe verwenden': 'Use current Atlas colour',
    'Referenz': 'Reference',
    '3 · Anwenden': '3 · Apply',
    'Region mit Atlasfarbe füllen': 'Fill region with Atlas colour',
    'Solid setzt alle Maskenpixel exakt auf Atlas-RGB. „Struktur erhalten“ ist eine abgeleitete Visualisierung: lokale Helligkeitsstruktur bleibt näherungsweise erhalten; die resultierenden Pixel sind nicht als identische Messfarbe zu interpretieren.': 'Solid sets every masked pixel to the exact Atlas RGB value. “Preserve structure” is a derived visualisation that approximately retains local lightness structure; its pixels are not identical measured colours.',
    'Punkte': 'Points',
    'Maskenpixel': 'Masked pixels',
    'Bearbeitungen': 'Edits',
    'Bild PNG': 'Image PNG',
    'Maske PNG': 'Mask PNG',
    'Region-Paket JSON': 'Region package JSON',
    'Die Region wird zuerst vollständig und deterministisch auf Atlasidentitäten gebunden. K begrenzt ausschließlich die angezeigte/ausgegebene Palette und verändert keine Pixelidentität.': 'The complete region is first bound deterministically to Atlas identities. K limits only the displayed or exported palette; it does not change any pixel identity.',
    'Quellregel:': 'Source rule:',
    'Pixel→Atlas läuft immer mit': 'Pixel→Atlas always uses',
    ', RGB squared Euclidean im dokumentierten 8-Bit-sRGB und Tie-Break über kleinere': ', squared Euclidean RGB distance in documented 8-bit sRGB, with ties resolved by smaller',
    '. Danach wird die Palette deterministisch nach der gewählten Strategie abgeleitet. Frequency verwendet': '. The palette is then derived deterministically using the selected strategy. Frequency uses',
    '; Diversity und Coverage wählen ausschließlich tatsächlich vorkommende Atlasreferenzen.': '; Diversity and Coverage select only Atlas references that actually occur.',
    'Palette-Basis': 'Palette basis',
    'Originalregion': 'Original region',
    'aktuell bearbeitete Variante': 'Current edited variant',
    'Palettenstrategie': 'Palette strategy',
    'Frequency · häufigste Farben': 'Frequency · most common colours',
    'Diversity · maximale Farbdistanz': 'Diversity · maximum colour distance',
    'Coverage · gewichtet weiteste Abdeckung': 'Coverage · weighted widest coverage',
    'K Farben': 'K colours',
    'K verwenden': 'Use K',
    'UNLIMITED · alle Atlasfarben': 'UNLIMITED · all Atlas colours',
    'Palette aus Region generieren': 'Generate palette from region',
    'Region': 'Region',
    'Zuerst eine geschlossene Region erzeugen.': 'Create a closed region first.',
    'unique RGB in Region': 'Unique RGB values in region',
    'unique Atlasidentitäten': 'Unique Atlas identities',
    'direkte Top-K-Pixelabdeckung': 'Direct top-K pixel coverage',
    'ΔE00-Dokumentation': 'ΔE00 documentation',
    'Source→Atlas ist eine digitale sRGB-Repräsentationsmessung. Die Top-K-Approximation ordnet nicht ausgewählte Atlasreferenzen per RGB-Distanz der gewählten Palette zu; ΔE00 wird anschließend post-hoc auf Master-Lab dokumentiert.': 'Source→Atlas measures a digital sRGB representation. The top-K approximation maps unselected Atlas references to the chosen palette by RGB distance; ΔE00 is then documented post hoc from master Lab.',
    'Mehr anzeigen': 'Show more',
    'ΔE00 Heatmap — Region Analysis': 'ΔE00 Heatmap — Region Analysis',
    'Die Heatmap ist eine Analyse- und Kontrollansicht. Sie verändert weder Pixel noch Atlasidentitäten, Masken oder Gamutstatus.': 'The heatmap is an analysis and review view. It changes no pixels, Atlas identities, masks or gamut states.',
    'Bild + geschlossene Region erforderlich.': 'Image and closed region required.',
    'Analysemodus': 'Analysis mode',
    'Atlas → aktuelle K-Palette': 'Atlas → current K palette',
    'Measured QC Punkte': 'Measured QC points',
    'Basisbild': 'Base image',
    'Original': 'Original',
    'aktuell bearbeitet': 'Currently edited',
    'Heatmap erzeugen': 'Generate heatmap',
    'Löschen': 'Clear',
    'Measured / Spectral QC': 'Measured / Spectral QC',
    'Erst ein tatsächlich importierter Messdatensatz darf den Status': 'Only an actually imported measurement record may leave the',
    'verlassen. Projektgrenzen werden nicht automatisch vorausgesetzt.': 'state. Project limits are never assumed automatically.',
    'Trennung:': 'Separation:',
    'Atlas-Soll → digitale ICC-Produktion → physische Messung. Ein importierter Messwert ändert niemals die': 'Atlas target → digital ICC production → physical measurement. An imported measurement never changes the',
    '1 · Sollreferenz': '1 · Target reference',
    'Soll auflösen': 'Resolve target',
    'aktuelle Atlasfarbe': 'Current Atlas colour',
    'Füllfarbe': 'Fill colour',
    'Spektralziel': 'Spectral target',
    '380–730 nm / 10 nm · aktiver Master': '380–730 nm / 10 nm · active master',
    '2 · Messdatei': '2 · Measurement file',
    'Messdatei importieren': 'Import measurement file',
    'Validiert: CSV, CGATS/Text, JSON. CxF3-Spektren werden als zusätzlicher Importpfad unterstützt.': 'Validated: CSV, CGATS/text and JSON. CxF3 spectra are supported as an additional import path.',
    'Datei': 'File',
    'Datensätze': 'Records',
    'Physische Messung': 'Physical measurement',
    'nicht bestätigt': 'Not confirmed',
    'vom Anwender bestätigt': 'Confirmed by user',
    '3 · Projektgrenzen ΔE00': '3 · Project ΔE00 limits',
    'Leer =': 'Blank =',
    '. Grenzwerte müssen aufsteigend sein; darüber = BLOCK.': '. Limits must increase in order; above them = BLOCK.',
    'QC auswerten': 'Evaluate QC',
    'Messkontext': 'Measurement context',
    'QC Entscheidung': 'QC decision',
    'Lab Ist': 'Measured Lab',
    'Spektrum': 'Spectrum',
    'Spektralvergleich': 'Spectral comparison',
    'Spektralkennwerte vergleichen Reflektanzkurven direkt. Sie werden nicht stillschweigend als ΔE00 interpretiert.': 'Spectral metrics compare reflectance curves directly. They are not silently interpreted as ΔE00.',
    'Hashverkettete Ereigniskette von Quelle → Atlasbindung → Produktionspfad → Evidence → Workflow-Entscheidung.': 'Hash-chained event sequence from source → Atlas binding → production path → evidence → workflow decision.',
    'Noch kein Trace': 'No trace yet',
    '0 Events': '0 events',
    'nicht geprüft': 'Not checked',
    'Neuen Trace aus aktueller Farbe': 'New trace from current colour',
    'Trace abschließen': 'Close trace',
    'Integritätsgrenze: Die SHA-256-Kette macht Änderungen innerhalb eines gespeicherten/exportierten Trace erkennbar. Sie ist kein externer Zeitstempel und keine Blockchain. Ein lokaler Browser-Speicher kann als Ganzes ersetzt werden.': 'Integrity boundary: the SHA-256 chain detects changes within a saved or exported trace. It is neither an external timestamp nor a blockchain. Local browser storage can be replaced as a whole.',
    'Integrität / Export': 'Integrity / Export',
    'Atlasreferenz': 'Atlas reference',
    'Hashkette prüfen': 'Verify hash chain',
    'Trace-Notiz': 'Trace note',
    'Notiz als Event speichern': 'Save note as event',
    'Rückwärtssuche / Import': 'Reverse lookup / Import',
    'Visuelle HLC-Navigation': 'Visual HLC navigation',
    'Filtert den aktiven Atlas direkt über die HLC-Referenzstruktur. Die Auswahl ist eine Atlasreferenz, keine Neuberechnung der Quellidentität.': 'Filters the active Atlas directly through its HLC reference structure. The selection is an Atlas reference, not a recalculation of source identity.',
    '13.283 Atlasreferenzen im Filter · Anzeige auf 240 begrenzt': '13,283 Atlas references in the filter · display limited to 240',
    'Alle': 'All',
    'Suche nach HLC-Referenz,': 'Search by HLC reference,',
    'oder HEX.': 'or HEX.',
    'Zurücksetzen': 'Reset',
    'GamutMap — Analyse- und Kontrollansicht': 'GamutMap — Analysis and Review',
    'Die Klassifikation wird mit LittleCMS': 'Classification uses LittleCMS',
    'gegen das gewählte Proof-Profil berechnet. Out-of-Gamut-Referenzen bleiben vollständig erhalten und behalten ihre': 'against the selected proof profile. Out-of-gamut references remain fully available and keep their',
    'Punktmodus': 'Point mode',
    'Alle Referenzen': 'All references',
    'Nur OOG hervorheben': 'Highlight OOG only',
    'auf aktuelle Farbe': 'Go to current colour',
    'aktuelle Referenz': 'Current reference',
    'Gamut-Status': 'Gamut status',
    'Gesamt Atlas': 'Atlas total',
    'OOG-Anteil': 'OOG share',
    'Methode': 'Method',
    'Filterwirkung': 'Filter effect',
    'Die GamutMap beeinflusst weder': 'The GamutMap affects neither',
    'keine': 'None',
    '. OOG bedeutet hier ausschließlich: LittleCMS-GamutCheck für die dokumentierte Proof-Bedingung.': '. Here, OOG means only LittleCMS GamutCheck for the documented proof condition.',
    'Side-by-Side Produktionsvergleich': 'Side-by-side production comparison',
    'Profile A und B greifen auf dieselbe Atlasidentität zu. CMYK-Werte werden nur gezeigt, wenn für das Profil eine echte, mastergebundene Mapping-Tabelle vorliegt.': 'Profiles A and B use the same Atlas identity. CMYK values appear only when a real, master-bound mapping table exists for the profile.',
    'Profil A': 'Profile A',
    'Profil B': 'Profile B',
    'Zuerst eine Atlasfarbe auswählen.': 'Select an Atlas colour first.',
    'Zuerst Atlasfarbe auswählen.': 'Select an Atlas colour first.',
    'Kein mastergebundenes Mapping verfügbar': 'No master-bound mapping available',
    'H275_L030_C045 · atlas_row_id 10179 · profilunabhängig': 'H275_L030_C045 · atlas_row_id 10179 · profile-independent',
    'Atlasidentität': 'Atlas identity',
    'ICC-Profilverwaltung': 'ICC profile management',
    'ICC-Dateien können frei geladen und gehasht werden. Bekannte integrierte Profile werden sofort erkannt. Für unbekannte Profile zeigt die App keine erfundenen CMYK-Werte; für echte Produktionswerte kann ein mitgeliefertes, mastergebundenes Profile-Mapping importiert werden.': 'ICC files can be loaded and hashed. Known built-in profiles are recognised immediately. Unknown profiles do not receive invented CMYK values; a supplied, master-bound profile mapping can provide actual production values.',
    'ICC-Datei laden': 'Load ICC file',
    'Der Browser liest Headerdaten und SHA-256. Unbekannte Profile erhalten zunächst': 'The browser reads header data and SHA-256. Unknown profiles initially receive',
    'Profile-Mapping laden': 'Load profile mapping',
    '; Master-SHA, Profil-SHA und 13.283 Zeilen werden geprüft.': '; master SHA, profile SHA and 13,283 rows are checked.',
    'Profilinventar JSON exportieren': 'Export profile inventory JSON',
    'Farbsatz / Favoriten': 'Colour set / Favourites',
    'Favoriten bleiben lokal im Browser gespeichert. Der Export dokumentiert Atlasidentität, Messwerte und beide Produktionsbedingungen.': 'Favourites remain in local browser storage. The export documents Atlas identity, measurements and both production conditions.',
    'Farbsatz JSON exportieren': 'Export colour set JSON',
    'Farbsatz CSV exportieren': 'Export colour set CSV',
    'Favoriten löschen': 'Clear favourites',
    'Noch keine Favoriten gespeichert.': 'No favourites saved yet.',
    'Der FP-Referenzcode wird aus der Atlasreferenz abgeleitet. Ein höherer Guardrail-Status wird nur aus importierter Evidence vergeben; die App erfindet keine Registry- oder Produktionsfreigabe.': 'The FP reference code is derived from the Atlas reference. A higher guardrail status requires imported evidence; the app does not invent registry or production approval.',
    'Aktuelle FP-Bindung': 'Current FP binding',
    'Basisstatus': 'Base status',
    'Guardrailstatus': 'Guardrail status',
    'Ein FP-Code oder Guardrail-PASS ist keine physische Druckfreigabe, kein Pigmentrezept und keine Registry-Zertifizierung.': 'An FP code or guardrail PASS is not a physical print approval, pigment recipe or registry certification.',
    'Guardrail JSON importieren': 'Import guardrail JSON',
    'Evidence prüfen & binden': 'Verify and bind evidence',
    'Evidence lösen': 'Unbind evidence',
    'Noch keine Evidence geprüft.': 'No evidence verified yet.',
    'Evidence gelöst.': 'Evidence unbound.',
    'v1.1-PASS ist auf aktuelle Referenz, atlas_row_id und Master-SHA gebunden.': 'v1.1 PASS is bound to the current reference, atlas_row_id and master SHA.',
    'v1.1-Felder passen nicht vollständig zu aktueller Clarus-Bindung.': 'v1.1 fields do not fully match the current Clarus binding.',
    'Positiver Legacy-Pfad; Mastermitgliedschaft lokal bestätigt. Noch kein v1.1 FP_GUARDRAIL_VALIDATED.': 'Positive legacy path; master membership confirmed locally. Not yet v1.1 FP_GUARDRAIL_VALIDATED.',
    'Referenz nicht im aktiven Master.': 'Reference not in the active master.',
    'JSON entspricht keinem unterstützten Guardrail-Evidence-Typ.': 'JSON does not match a supported guardrail evidence type.',
    'Der Report dokumentiert Messung, Interpretation, Workflow-Entscheidung und Einschränkungen. Eine ausgewählte Entscheidung ist eine dokumentierte Benutzerentscheidung, keine automatische physische Druckfreigabe.': 'The report documents measurement, interpretation, workflow decision and limitations. A selected decision is a documented user decision, not automatic physical print approval.',
    'Projekt / Job': 'Project / Job',
    'Workflow-Entscheidung': 'Workflow decision',
    'Kommentar': 'Comment',
    'Keine zusätzliche Begründung.': 'No additional justification.',
    'Einschränkungen': 'Limitations',
    'Entscheidung': 'Decision',
    'Entscheidung in Trace übernehmen': 'Add decision to trace',
    'Report HTML exportieren': 'Export report HTML',
    'Report JSON exportieren': 'Export report JSON',
    'Vorschau': 'Preview',
    'Farbe auswählen oder Pixel anklicken': 'Select a colour or click a pixel',
    '☆ Favorit': '☆ Favourite',
    'Referenz kopieren': 'Copy reference',
    'Messung': 'Measurement',
    'Auswahlquelle': 'Selection source',
    'RGB Distanz²': 'RGB distance²',
    'Produktionsausgabe': 'Production output',
    'profilunabhängig': 'Profile-independent',
    'Nächste Kandidaten': 'Nearest candidates',
    'Verlauf': 'History',
    'Alle löschen': 'Clear all',
    'Favoriten': 'Favourites',
    'Gesamten Verlauf löschen': 'Clear entire history',
    'öffnen': 'Open',
    'aus Verlauf entfernen': 'Remove from history',
    'entfernen': 'Remove',
    'leer': 'Empty',
    'Technischer Offline-Prototyp. Magnetic Lasso und Heatmap sind Hilfs-/Analyseansichten. Palette-K verändert keine Quellidentität. Measured QC verlässt NOT_MEASURED nur nach realem Dateiimport; QC-Grenzen sind projektspezifisch und werden nicht automatisch gesetzt.': 'Technical offline prototype. Magnetic Lasso and heatmap are analysis aids. Palette K does not change source identity. Measured QC leaves NOT_MEASURED only after a real file import; QC limits are project-specific and are never set automatically.'
  }));

  const dialogEn = new Map(Object.entries({
    'Trace JSON ist ungültig.': 'Trace JSON is invalid.',
    'Trace-Integrität FAIL:': 'Trace integrity FAIL:',
    'Verlauf wirklich löschen? Favoriten und Trace-Nachweise bleiben erhalten.': 'Clear history? Favourites and trace evidence will remain.',
    'Keine Messdatensätze mit x/y und ΔE00 vorhanden.': 'No measurement records with x/y and ΔE00 are available.',
    'CSV/Text enthält keine Datensätze.': 'CSV/text contains no records.',
    'Keine Datensätze mit Lab oder vollständigem 380–730-nm-Spektrum gefunden.': 'No records with Lab or a complete 380–730 nm spectrum were found.',
    'QC-Grenzen müssen vollständig und aufsteigend sein.': 'QC limits must be complete and increasing.',
    'Die Spur erzeugt keine gültige Maske.': 'The trace does not create a valid mask.',
    'Zuerst eine Spur schließen.': 'Close a trace first.',
    'Zuerst eine Atlas-Füllfarbe wählen.': 'Choose an Atlas fill colour first.',
    'Mapping JSON ist ungültig.': 'Mapping JSON is invalid.',
    'Mapping gehört nicht zum aktiven Atlas-Master.': 'Mapping does not belong to the active Atlas master.',
    'Mapping enthält ungültige oder fehlende atlas_row_id.': 'Mapping contains invalid or missing atlas_row_id values.',
    'Alle Favoriten lokal löschen?': 'Clear all local favourites?',
    'Zuerst Farbe auswählen.': 'Select a colour first.'
  }));

  const dynamic = [
    [/^(.* · atlas_row_id [0-9]+) · profilunabhängig$/, '$1 · profile-independent'],
    [/^([0-9.]+) Atlasreferenzen im Filter · Anzeige auf ([0-9]+) begrenzt$/, '$1 Atlas references in filter · display limited to $2'],
    [/^([0-9]+) Kandidaten$/, '$1 candidates'],
    [/^([0-9]+) Farben$/, '$1 colours'],
    [/^([0-9]+) Datensätze$/, '$1 records'],
    [/^([0-9]+) Punkte$/, '$1 points'],
    [/^([0-9]+) Maskenpixel$/, '$1 masked pixels'],
    [/^([0-9]+) Atlasfarben$/, '$1 Atlas colours'],
    [/^([0-9.,]+) von ([0-9.,]+) Paletteinträgen angezeigt · Klick = als Region-Füllfarbe verwenden$/, '$1 of $2 palette entries shown · click to use as region fill colour'],
    [/^(.+) aus Verlauf entfernen$/, 'Remove $1 from history'],
    [/^(.+) öffnen$/, 'Open $1'],
    [/^Spur schließen$/, 'Close trace'],
    [/^Spur löschen$/, 'Delete trace']
  ];
  const norm = text => text.replace(/\s+/g, ' ').trim();
  function translate(text) {
    const key = norm(text);
    if (en.has(key)) return en.get(key);
    for (const [pattern, replacement] of dynamic) if (pattern.test(key)) return key.replace(pattern, replacement);
    return null;
  }
  function renderNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const p = node.parentElement;
    if (!p || p.closest('script,style,pre,code,textarea,[contenteditable],.trace-json,.json')) return;
    let state = source.get(node);
    if (!state) state = { original: node.nodeValue, rendered: node.nodeValue };
    else if (node.nodeValue !== state.rendered) state.original = node.nodeValue;
    const original = state.original;
    const value = language === 'en' ? translate(original) : null;
    const next = value === null ? original : original.replace(/\S[\s\S]*\S|\S/, value);
    if (node.nodeValue !== next) node.nodeValue = next;
    state.rendered = next;
    source.set(node, state);
  }
  function renderAttributes(el) {
    if (!el || el.nodeType !== 1) return;
    let state = attrSource.get(el) || {};
    for (const a of ['title', 'aria-label', 'placeholder']) {
      if (!el.hasAttribute(a)) continue;
      if (!state[a]) state[a] = { original: el.getAttribute(a), rendered: el.getAttribute(a) };
      else if (el.getAttribute(a) !== state[a].rendered) state[a].original = el.getAttribute(a);
      const value = state[a].original;
      const next = language === 'en' ? (translate(value) || value) : value;
      if (el.getAttribute(a) !== next) el.setAttribute(a, next);
      state[a].rendered = next;
    }
    attrSource.set(el, state);
  }
  function render(doc) {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) renderNode(walker.currentNode);
    doc.querySelectorAll('[title],[aria-label],[placeholder]').forEach(renderAttributes);
    doc.documentElement.lang = language;
  }
  function renderArticle() {
    if (!article) return;
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('script,style,pre,code,textarea,nav[aria-label="Language / Sprache"]')) continue;
      let state = source.get(node);
      if (!state) state = { original: node.nodeValue, rendered: node.nodeValue };
      else if (node.nodeValue !== state.rendered) state.original = node.nodeValue;
      const value = de.get(norm(state.original));
      const next = language === 'de' && value ? state.original.replace(/\S[\s\S]*\S|\S/, value) : state.original;
      if (node.nodeValue !== next) node.nodeValue = next;
      state.rendered = next;
      source.set(node, state);
    }
    article.setAttribute('lang', language);
  }
  function mountFrame() {
    let doc;
    try { doc = frame.contentDocument; } catch (_) { return; }
    if (!doc || !doc.body) return;
    const win = frame.contentWindow;
    if (win && !win.__atlasI18nDialogs) {
      const originalAlert = win.alert.bind(win);
      const originalConfirm = win.confirm.bind(win);
      const message = text => {
        if (language !== 'en') return text;
        const exact = dialogEn.get(String(text));
        if (exact) return exact;
        return String(text).replace(/^Trace-Integrität FAIL:/, 'Trace integrity FAIL:');
      };
      win.alert = value => originalAlert(message(value));
      win.confirm = value => originalConfirm(message(value));
      win.__atlasI18nDialogs = true;
    }
    if (observer) observer.disconnect();
    render(doc);
    observer = new MutationObserver(() => {
      observer.disconnect();
      render(doc);
      observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
    });
    observer.observe(doc.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  }
  function showLanguage(lang) {
    language = lang;
    document.documentElement.lang = lang;
    renderArticle();
    document.querySelectorAll('[data-atlas-lang]').forEach(el => { el.hidden = el.dataset.atlasLang !== lang; });
    document.querySelectorAll('[data-atlas-language-choice]').forEach(el => {
      el.setAttribute('aria-current', el.dataset.atlasLanguageChoice === lang ? 'page' : 'false');
    });
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (_) {}
    mountFrame();
  }
  if (article) {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Language / Sprache');
    nav.className = 'atlas-colour-id-language';
    nav.innerHTML = '<a href="' + location.pathname + '?lang=de" data-atlas-language-choice="de" lang="de">Deutsch</a><span aria-hidden="true"> | </span><a href="' + location.pathname + '?lang=en" data-atlas-language-choice="en" lang="en">English</a>';
    const heading = article.querySelector('h2');
    heading?.before(nav);
    const style = document.createElement('style');
    style.textContent = '.atlas-colour-id-language{margin:0 0 1.2rem;font-weight:600}.atlas-colour-id-language a[aria-current="page"]{text-decoration:underline;text-underline-offset:.25em}.atlas-colour-id-expanded{position:fixed!important;inset:0!important;z-index:999999!important;background:#fff!important;padding:0!important;max-width:none!important}.atlas-colour-id-expanded iframe{height:calc(100vh - 62px)!important;min-height:0!important}.atlas-colour-id-expanded .atlas-colour-id-exit{position:fixed;right:1rem;top:.65rem;z-index:1000000}';
    document.head.appendChild(style);
    const full = article.querySelector('.atlas-clarus-wp-frame')?.closest('.atlas-clarus-wp-embed');
    const link = full?.querySelector('a[href*="atlas-clarus-app-v5.3.3.html"]');
    if (link && full) link.addEventListener('click', event => {
      if (language !== 'en') return;
      event.preventDefault();
      full.classList.add('atlas-colour-id-expanded');
      const exit = document.createElement('button');
      exit.className = 'atlas-colour-id-exit';
      exit.type = 'button';
      exit.textContent = 'Close expanded view';
      exit.addEventListener('click', () => { full.classList.remove('atlas-colour-id-expanded'); exit.remove(); });
      full.appendChild(exit);
    });
  }
  frame.addEventListener('load', mountFrame);
  document.querySelectorAll('[data-atlas-language-choice]').forEach(el => el.addEventListener('click', event => {
    event.preventDefault(); showLanguage(el.dataset.atlasLanguageChoice);
  }));
  if (frame.contentDocument?.readyState === 'complete') mountFrame();
  showLanguage(language);
})();
