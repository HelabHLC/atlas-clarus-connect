# RGB-only-Hochauflösungsversuch mit Image Projects verbinden

Prüfdatum: 9. Oktober 2026. Geprüfter Anwendungsstand: PR #68,
`4a42f74aba2cdc0408e52b91b4dc57e798830491` (RC31.1).
Dieser Nachweis ergänzt Tests und Dokumentation; er erweitert weder den Editor
noch sein Schema und verändert keine eingefrorenen Referenzdaten.

**Ergebnis: Ein verlustfreier Ausschnitt mit separat geprüftem Herkunftsnachweis
ist der kleinste belastbare Anschluss. Er wurde am tatsächlichen Rechenpaket
des Ruisdael-Versuchs geprüft. Das vollständige Original wurde NICHT erfolgreich
als Image Project geöffnet. Sein Import wurde tatsächlich versucht und korrekt
abgewiesen. Eine vollständige Verarbeitung aller Kacheln ist NICHT getestet.**

## Was tatsächlich geprüft wurde

Das archivierte `ATLAS_Clarus_Gemaeldeversuch_Rechenpaket_2026-10-07.zip` enthält
die unveränderte JPEG-Datei, `painting_pixel_bundle.npz`, den früheren Ergebnisbericht
und die Referenz-RGB-Tabelle. Die verwendeten Dateien wurden gegen dessen
SHA-256-Manifest geprüft. Zusätzlich wurden die früher veröffentlichten JPEG-
und kanonischen RGB-Hashes als feste Ausgangswerte geprüft.

- JPEG: 6.116 × 4.412 = **26.983.792 Pixel**, 5.035.516 Bytes.
- Ein erneutes vollständiges JPEG-Decoding mit Pillow stimmt bytegenau mit dem
  archivierten `original_rgb`-Array überein. EXIF-Orientierung fehlt oder ist 1;
  kein ICC-Profil. **sRGB bleibt die ausdrücklich dokumentierte Annahme des
  früheren Versuchs**, keine nachträgliche Kameracharakterisierung.
- Ausschnitt: Ursprung **(1000,1000)**, Größe **256 × 256**, ganzzahlige Grenzen,
  keine Skalierung, Interpolation oder JPEG-Neukompression. Verlustfreie PNG mit
  sRGB-Kennzeichnung entsprechend dieser Annahme; Alpha explizit 255.
- Alle **65.536** Ausschnittpixel wurden gegen das archivierte Array verglichen.
  Anschließend wurden die PNG durch die echte RC31.1-Browseroberfläche geladen
  und deren eingefrorene RGBA-Bytes vollständig mit diesen Daten verglichen.
- Für alle 65.536 Pixel wurden Atlas-Zeilen-ID und ganzzahliges RGB-d² neu gegen
  die unveränderten 13.283 RGB-Referenzzeilen bestimmt und mit dem früheren
  Pixelbundle verglichen. Der RGB-Tabellenhash wurde tatsächlich neu berechnet.
  Der vollständige spektrale Master wurde hier nicht erneut gehasht; seine
  bekannte Identität bleibt der feste Pin. Kein Delta E in der Zuordnung.
- Im Browser: einen Pixel umfärben, transparent machen, rückgängig machen,
  wiederholen; exakt ein Pixel je Ereignis. RGBA außerhalb dieses Pixels bleibt
  unverändert. Quell-RGB bleiben im Original erhalten, verborgenes neues RGB
  bleibt bei Alpha 0 erhalten. Vier Ereignisse bleiben im Journal.
- Tatsächliches ZIP in einer zweiten Browsersitzung öffnen, dort rückgängig
  machen, erweitertes JSON zurückgeben und im ersten Browser öffnen: bestanden.
- Das große JPEG wird beim Import wegen der Pixelgrenze abgewiesen. Ein danach
  exportiertes JSON bestätigt, dass das geöffnete Ausschnittprojekt erhalten blieb.

Ein Prüfpunkt zeigt die notwendige Trennung:

| Bedeutung | Nachgewiesener Wert |
| --- | --- |
| Lokale Ausschnittkoordinate | (100,100), nullbasiert |
| Originalkoordinate | (1100,1100), nullbasiert |
| Ursprüngliches RGB | (174,162,146), `#AEA292` |
| Ursprünglich zugeordnete Atlas-Referenz | Zeile 1500, `H045_L065_C010` |
| RGB dieser Referenz | (174,154,146), `#AE9A92` |
| Abstand Quelle → Referenz | d² = 64 |
| Bearbeitetes RGB | (17,34,51), `#112233` |
| Referenz des bearbeiteten RGB | Zeile 10059, `H270_L010_C015`; RGB (16,29,48), d² = 35 |
| Alpha nach Transparenz / Redo | 0; verborgenes RGB bleibt (17,34,51) |

Die Atlas-RGB werden nicht anstelle der Quelle ins Original geschrieben.
Ein Bearbeitungsereignis bezieht `source_reference` auf sein `match_rgb` im
jeweiligen Vorzustand. Bei der zweiten Operation ist das bereits `#112233`.
Bei flächigen Operationen mit `match_rgb=null` gibt es keine einzelne
Quellreferenz: Die vollständigen vorherigen Pixel entstehen aus Original und Replay.
Ein bloßer Klick zum Ablesen erzeugt noch keinen dauerhaften Sample-Datensatz.
Der Ausschnittnachweis hält deshalb die geprüfte Originalprobe separat fest.

## Dateihashes, Pixelhashes und Referenzpin

Diese Werte wurden im vorliegenden Lauf neu berechnet, außer dem ausdrücklich
als Pin bezeichneten Masterwert. Unterschiedliche Hashdefinitionen sind nicht
direkt miteinander vergleichbar.

| Objekt / Definition | SHA-256 |
| --- | --- |
| Unveränderte JPEG-Dateibytes | `b8c1d72380a7f389ef1c33f85a088c404644bdc1a4123f6f664c7638158b171b` |
| Original-RGB: ASCII `RGB8:6116x4412:` gefolgt von zeilenweisen RGB8-Bytes | `a0b0112053a328eb4d246e6ec7dfd69791deb81c7e372576c000a81d3e6d4890` |
| Ausschnitt-PNG-Dateibytes | `862e65b2abdd13f0550ff8cfea429f83899d6068f2d7333cb4baaf3fc2dfb819` |
| Ausschnitt: rohe zeilenweise RGBA8-Bytes ohne Präfix | `3d31cdfd470546d3680e48ac9405ca38b1237679667024e668fa2efa53103227` |
| Tatsächlich geprüfte RGB-Referenz-CSV | `a25f4dbd94d819ed3c9b899d0e0db7d4d9449cf8028201d0776fad93b5a7fab9` |
| Unveränderter vollständiger Master-Pin; hier nicht neu gehasht | `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |

Projekt-ID, kanonischer Dokumenthash, Hash der tatsächlich exportierten JSON-Datei,
RGBA-Zustandshash und Ereignishashes sind weitere, getrennte Größen. Sie stehen
im Projekt und in `crop-origin.json`. Neue Projekt-UUIDs und Zeitstempel ändern
bei Wiederholung die Journal-/Dokument-/ZIP-Hashes; die Quelldaten bleiben gleich.
Hashes belegen Übereinstimmung mit einer festgehaltenen Ausgangsreferenz, keine
Urheberschaft, Signatur oder physische Echtheit des Gemäldes.

## Vergleich mit Schema und Importprüfungen

Das Schema ist als exakter Feldsatz in `src/image-projects.js` implementiert,
nicht als erweiterbares Metadatenobjekt. Maßgeblich sind `verify`, `importZip`,
`reference`, `relation` und die Browser-Decodierung in `image-projects-ui.js`.

| Bedarf | RC31.1 / `atlas-clarus-image-project/1.0` | Kleinster Anschluss |
| --- | --- | --- |
| Unveränderte Quelldatei und eingefrorenes RGBA | Enthalten, jeweils gehasht | Hier ist `original` ausdrücklich die **Ausschnitt-PNG**, nicht das ganze Gemälde |
| Übergeordnetes Bild, Originalmaße und Offset | Keine Felder; zusätzliche Felder werden abgewiesen | Separate Datei `crop-origin.json` |
| Skalierung und Orientierung | Kein Herkunftstransform für Ausschnitte | Offset, Faktor 1, Rotation 0 und Koordinatenkonvention im Zusatznachweis |
| RGB und feste Atlas-Referenz | Für Match-/Ersatzfarben separat; Zuordnung beim Import neu geprüft | Zusätzliche Originalprobe und kompletter Vergleich des Ausschnitts |
| Verlauf und Position geänderter Pixel | Replay, `affected_runs`, Zahl der Pixel, Vorher-/Nachher- und Kettenhashes | Lokale Positionen nach Originalkoordinaten umrechnen |
| Fremde Zusatzdatei im Projekt-ZIP | Exakte Dateimenge; zusätzliche Datei wird abgewiesen | Unverändertes inneres Projekt-ZIP plus Herkunftsdatei in äußerem Transportpaket |
| Mehrere Kacheln / gemeinsames Undo | Ein Bild je Projekt; kein globales Journal | Eigenes Kachelmanifest und koordinierende Verarbeitung nötig |

Für jeden Pixelindex `i` einer `affected_runs`-Spanne gilt:
`x_original = x0 + (i % crop_width)`,
`y_original = y0 + floor(i / crop_width)`.
Ein Original-Linearindex wäre `y_original * original_width + x_original`.
Wegen verschiedener Zeilenbreiten genügt **kein konstanter Offset auf alle
linearen Indizes**. Spannen an Zeilengrenzen aufteilen oder pixelweise umrechnen.

Der Zusatznachweis bindet die gemessenen Originaldatei-/Originalpixelhashes,
Originalmaße, Ausschnittrechteck, Ausschnittdatei-/RGBA-Hashes, Master-Pin,
gemessenen RGB-CSV-Hash, Projekt-ID und konkrete Projektrevision zusammen.
Der Prüfer vergleicht sämtliche Ausschnittbytes mit dem Originalarray. Falscher
Elternhash, falscher Offset, falscher Skalierungsfaktor und geändertes RGB selbst
mit neu berechnetem Ausschnittshash werden im Test abgewiesen.
Nach weiterer Bearbeitung muss der Revisionsbezug neu geprüft/fortgeschrieben
werden; ein altes Begleitmanifest bestätigt nicht automatisch ein neueres JSON.

### Konkrete Grenze des vorhandenen Importers

`verify` prüft Quelldatei und eingefrorenes RGBA separat sowie die Abmessungen.
Es dekodiert die eingebettete PNG/JPEG **nicht** erneut, um ihre Pixel gegen das
RGBA-Array zu prüfen. Ein Negativversuch hat diese Grenze bestätigt: Änderung
eines eingefrorenen Pixels plus Neuberechnung von Pixel- und Dokumenthash wird
bei leerem Journal vom unveränderten Importer akzeptiert, obwohl die PNG
unverändert blieb. Das ist kein bestandener Herkunftstest.

Unser ergänzender Test schließt diese konkrete Lücke für den untersuchten
Ausschnitt: archiviertes RGB → ausgeschnittenes RGBA → verlustfreie PNG →
tatsächliches Browser-Decoding → eingefrorene Projektbytes werden verglichen.
Die bestehende App allein prüft das separate Herkunftsmanifest nicht. Ein
Produktfeature sollte diese Bindung explizit und versioniert unterstützen und
einen Herkunftsstatus erst nach erfolgreicher Prüfung anzeigen. Bei anderen
JPEG-Decodern, ICC-Profilen, EXIF-Drehungen oder Alpha ist Gleichheit erneut zu
prüfen; ein frisch decodiertes JPEG darf nicht stillschweigend das frühere
eingefrorene Pixelarray ersetzen.

## Ausschnitt oder Kacheln?

| Möglichkeit | Vorteil | Aufwand / offener Nachweis |
| --- | --- | --- |
| 256 × 256 Ausschnitt + externer Nachweis | Kleiner, tatsächlich geprüfter Übergang; keine Schema-/Referenzänderung | Herkunftsprüfung außerhalb des Editors; bearbeitet nur diesen Bereich |
| 1024er-Kacheln, 6 × 5 = 30 Projekte | Alle 26.983.792 Pixel können geometrisch ohne Verkleinerung abgedeckt werden | Vollständiger Lauf, Kachelmanifest, Naht-/Abdeckungsprüfung, globale Transaktionen und Rekonstruktion fehlen |
| Nur Limits erhöhen | Weniger Teilprojekte | Größere JSON-/Speicher-/Replaylast; keine Lösung für Herkunft und keine geprüfte Freigabe |

Die aktuelle PNG-Ausgabe ist unkomprimiert: 2048 × 2048 RGBA benötigt mit
Dateistruktur **16.780.625 Bytes** und überschreitet 8 MiB, obwohl die Pixelzahl
erlaubt ist. 1024 × 1024 benötigt **4.195.729 Bytes** und bleibt darunter.
Beide Größen wurden mit dem tatsächlichen Exporter ermittelt. Komprimierte PNGs
können kleiner sein; deshalb immer die tatsächliche Dateigröße prüfen.
Weiter gelten je Projekt: maximal 8192 je Kante, 100 Ereignisse, 64 MiB kompaktes
JSON, 96 MiB Import-ZIP sowie die Begrenzung komplexer Pixelmasken.

Für eine spätere Kachellösung: alle Teilbilder aus **demselben festgehaltenen
Pixelarray** erzeugen; Originaldatei einmal unverändert behalten; eindeutige
Projekt-IDs und Rechtecke, vollständige Abdeckung ohne Lücken/Überlappungen,
Randkacheln und alle lokalen Hashes prüfen. Änderungen über eine Naht werden
auf die betroffenen Kacheln geschnitten und durch eine globale Transaktions-ID
verbunden. Eine neue Gesamtdatei muss als Ableitung gekennzeichnet werden;
unbearbeitete Bereiche und rekonstruierte Pixel sind separat zu vergleichen.
100 lokale Ereignisse ersetzen kein globales Undo/Redo.

**Begrenzter Nahttest ausgeführt:** Zwei 128 × 256 Teilstücke desselben realen
Ausschnitts wurden im Rechenkern separat bearbeitet und per ZIP exportiert/importiert.
Eine zwei Pixel breite Änderung über die Grenze wurde auf beide Projekte
verteilt. Zusammensetzen ergab bytegenau dieselbe Fläche wie die entsprechende
Änderung im ungeteilten Ausschnitt. Diese Kern-Fixtures sind keine persistierten
Browser-Decoding-Artefakte. Das belegt nicht den vollständigen 30-Kachel-Ablauf,
keine globale Transaktionssteuerung und keinen Vollbild-Export.

## Reproduzieren und Nachweise

Voraussetzungen: archiviertes Rechenpaket lokal entpackt, Python mit NumPy/Pillow,
Node, Playwright und ein installierter Chromium. Vom Repository-Stamm:

```bash
python3 browser-bundle/build_bundle.py --image-projects --public-pilot
python3 browser-bundle/tests/prepare_highres_crop.py /path/to/study /path/to/output
node browser-bundle/tests/validate_highres_crop.cjs /path/to/output /path/to/study/source_rijksmuseum_SK-C-210.jpg
```

Bei Bedarf `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` oder `IMAGE_PROJECTS_HTML` setzen.
Python ohne `-O` ausführen: die Assertions sind Teil dieses Testprotokolls.
Die externen Originaldaten sind absichtlich nicht als große Kopie im Repository.
Das frühere Archiv bleibt die Datengrundlage; es wird nur gelesen.

Maschinenlesbare Laufnachweise: [Bericht](tests/evidence/highres-crop-2026-10-09/highres-crop-report.json),
[Herkunftsbindung](tests/evidence/highres-crop-2026-10-09/crop-origin.json),
[Artefakthashes](tests/evidence/highres-crop-2026-10-09/SHA256.json).
Die letzte Datei beschreibt die erzeugten externen Testartefakte, nicht die
vollständige Dateiliste dieses Repository-Verzeichnisses.

Ein äußeres Testpaket ist **kein direkt importierbares Image-Projects-ZIP**.
Zuerst entpacken und darin `crop-image-project.zip` öffnen; `crop-origin.json`
und den Nachweis daneben aufbewahren. Der JSON-/ZIP-Import allein zeigt weiterhin
lokale Koordinaten und bestätigt nicht automatisch die Herkunft aus dem Gesamtbild.

Offen: native Herkunftsprüfung im Editor, vollständiger Kachellauf und
Zusammensetzung, weitere Browser/Decoder sowie Live-IONOS. Die vollständige
Atlas-Zuordnung aller 26.983.792 Pixel und die 38 Lichtsimulationen wurden in
diesem Anschlussversuch nicht erneut gerechnet. Keine physische Prüfung.

Quellen: [PR #68](https://github.com/HelabHLC/atlas-clarus-connect/pull/68),
[geprüfte technische Dokumentation](https://github.com/HelabHLC/atlas-clarus-connect/blob/4a42f74aba2cdc0408e52b91b4dc57e798830491/browser-bundle/IMAGE_PROJECTS.md),
[geprüfter Importcode](https://github.com/HelabHLC/atlas-clarus-connect/blob/4a42f74aba2cdc0408e52b91b4dc57e798830491/browser-bundle/src/image-projects.js).
Originalaufnahme: Rijksmuseum, Jacob Isaacksz van Ruisdael, Landschaft mit
Wasserfall, SK-C-210; Wikimedia-Dateiversion vom 12.01.2019 gemäß archiviertem
Quellnachweis (Public Domain / CC0 laut damaliger Dateiseite). Der vorliegende
Test prüft die archivierten Bytes; er holt keine neue Bildversion aus dem Netz.
