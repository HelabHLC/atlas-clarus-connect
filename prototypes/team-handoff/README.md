# ATLAS Clarus Mitarbeiterübergabe – Untersuchung und Prototyp 0.1

Stand: 17. Oktober 2026. Isoliert auf RC34 Commit `44fd7947dff31761469fa551f61b5d4063f51980` (PR #91, Draft). Kein Merge, keine Veröffentlichung der Browser Edition. `deployment_allowed=false`.

## Entscheidung

Jetzt umsetzbar: vollständige Exchange-ZIP separat weitergeben, ihren SHA-256-Prüfcode über einen bestätigten Kontakt vergleichen und vertrauliche Pakete optional lokal verschlüsseln. Der vorliegende Helfer benötigt weder Server noch Installation. Er ist keine neue RC34-Version und verändert keine Quelldokumente.

Ein **Prüfcode prüft eine bereits vorhandene Datei**. Der QR-Code enthält denselben Prüftext, keine Datei, keinen Link und keinen Schlüssel. Ein **Abrufcode findet eine Datei bei einem Dienst**. Diesen Dienst gibt es hier nicht. Auch die `.aclseal`-Datei muss separat übertragen werden.

## Vergleich

| Anforderung | Offline-ZIP + QR-Prüfcode (Prototyp) | Zeitlich begrenzte Online-Freigabe (Entwurf, nicht implementiert) |
|---|---|---|
| Übertragung | USB oder separat gewählter betrieblicher Kanal; Prüfcode überträgt nichts | Upload auf Speicher, Abruf über Dienst und Berechtigung |
| Infrastruktur | Eine lokale HTML-Datei; alle QR-Skripte enthalten | HTTPS-API, privater Objektspeicher, Benutzerkonten/Identitätsdienst, Betrieb und Löschaufträge |
| Dateigröße | Helfer maximal 64 MiB ZIP, Verschlüsselung +36 Byte; RC34 selbst maximal 384 MiB/100 Dokumente, native Grenzen bleiben | Zunächst nicht höher als RC34; Upload-/Download-/Speicherquoten und Browsergrenzen zusätzlich prüfen; große Uploads fortsetzbar und streamingfähig |
| Datenschutz | Helfer lädt nichts hoch, hat keine Telemetrie oder absichtliche dauerhafte Speicherung; ZIP kann personenbezogene Metadaten/Originalbilder enthalten; Übergabekanal und Endgeräte bleiben relevant | Hostingregion, Betreiberzugriff, Metadaten, Protokolle, Unterauftragnehmer und Aufbewahrung bewerten; technisch keine pauschale DSGVO-Konformitätszusage |
| Verschlüsselung | Klartext-ZIP oder AES-256-GCM-Hülle; zufälliger Schlüssel separat über geschützten Kanal; kein Passwort mit geringer Entropie | TLS immer; optional dieselbe clientseitige Hülle, Schlüssel außerhalb des Dienstes; Speicherverschlüsselung allein hält Betreiber nicht vom Klartext fern |
| Zugriffsrecht | Dateibesitz; bei verschlüsselter Hülle zusätzlich Schlüsselbesitz; keine persönliche Identifizierung oder Rollen | Anmeldung und serverseitige Paket-/Empfängerberechtigung; Abrufcode allein darf keine persönliche Identität vortäuschen |
| Prüfcode | Vollständige SHA-256 + Bytezahl; nur mit vertrauenswürdig bestätigtem Sollwert gegen Austausch durch Dritte hilfreich | Gleicher Paketprüfwert nach Abruf; Abrufberechtigung bleibt gesondert |
| Ablauf/Widerruf | Nicht durchsetzbar; keine irreführende lokale Ablaufuhr | Vor JEDEM Abruf serverseitig Uhrzeit, Widerruf, Konto und Berechtigung prüfen; nach Ablauf keine neuen Abrufe; bereits gespeicherte Kopien bleiben nutzbar |
| Wiederherstellung | Original-ZIP bytegleich; danach unveränderter RC34-Importer | Unveränderliches Paketobjekt laden, entschlüsseln, vollständigen Hash vergleichen, dann RC34-Importer |
| Verlauf/Zusammenarbeit | Jede Bearbeitung als neue vollständige Exchange-ZIP; kein automatisches Zusammenführen | Neue Paketversionen mit Elternhash, keine Überschreibung/automatische Zusammenführung; Konflikte explizit anzeigen |

64 MiB sind eine konservative Prototyp-Grenze, kein auf allen Geräten nachgewiesenes Leistungsversprechen. Web Crypto verarbeitet hier ganze Puffer, nicht Streaming. ZIP, Ein-/Ausgabepuffer, Verschlüsselung und Downloads können gleichzeitig mehrfachen Dateispeicher benötigen. Größere Dateien werden vor `arrayBuffer()` abgelehnt. Nicht als Workaround einzelne Dokumente weglassen; stattdessen vollständige RC34-ZIP außerhalb des Helfers übertragen. Keine Dateigrößenkürzung.

## Einfacher Ablauf mit vertraulichen Dateien

1. Absender speichert in RC34 **ATLAS_Clarus_Exchange.zip** mit allen hinzugefügten Originalen und erfassten Bearbeitungen.
2. `ATLAS_Clarus_Offline_Handoff.html` lokal öffnen und ZIP auswählen. **Verschlüsselte Übergabe erstellen** lädt `ATLAS_Clarus_Exchange.aclseal` herunter.
3. Verschlüsselte Datei über einen freigegebenen Weg senden. Schlüssel über einen getrennten geschützten Kanal an den verifizierten Kollegen geben. Prüfcode ebenfalls über einen vertrauenswürdigen Kontakt bestätigen. Dateiname oder QR allein bestätigt keinen Absender.
4. Empfänger öffnet denselben lokalen Helfer, wählt die erhaltene Datei, fügt Prüfcode und Schlüssel ein und klickt **Entschlüsseln + ZIP wiederherstellen**. Nur nach erfolgreicher GCM- und SHA-256-Prüfung wird eine ZIP ausgegeben.
5. Diese vollständige ZIP in RC34 Tool Exchange importieren. Dort laufen die vorhandenen CRC-/SHA-/Schema-/Master-/Verknüpfungsprüfungen; unterstützte Dokumente können weiterbearbeitet werden. Unbekannte Anhänge bleiben Anhänge.
6. Nach Bearbeitung neuen vollständigen Arbeitsstand speichern und wieder übergeben. Eine vorhandene ältere ZIP bleibt ein eigenständiger Stand. Produktion und Freigabe sind menschliche Entscheidungen.

Ohne Verschlüsselung: **Prüfcode + QR erstellen**, ursprüngliche ZIP unverändert übergeben, Empfänger klickt **ZIP prüfen**. Die ZIP ist dabei lesbar. QR als SVG kann gespeichert und mit einer beliebigen vertrauenswürdigen Scanner-App gelesen werden; integrierte Kamerafunktion fehlt. Der erfasste QR-Text wird beim Empfänger eingefügt. QR/Prüfcode sind keine geheimen Zugangsdaten, können aber einen bekannten Dateistand identifizierbar machen.

## Bewusste Sicherheitsgrenzen

- Die vertrauenswürdige Herkunft der Helferdatei und saubere Endgeräte sind Voraussetzung. Ein kompromittierter Browser kann Daten/Schlüssel lesen. Es gibt kein Sicherheits-Audit-Zertifikat.
- SHA-256 ist keine Signatur. Wer Paket UND Prüfcode austauschen kann, kann einen neuen passenden Hash erzeugen. Prüfcode separat bestätigen. Weder behauptete Autorenschaft noch Produktfreigabe werden kryptografisch beglaubigt.
- AES-GCM verhindert unbemerkte Änderungen der verschlüsselten Nutzlast bei geheimem Schlüssel. Jeder Schlüsselbesitzer kann jedoch selbst neue gültige Hüllen erzeugen; das ist keine persönliche Signatur.
- Schlüssel wird mit `crypto.getRandomValues` erzeugt (256 Bit), IV pro Verschlüsselung zufällig (96 Bit), Tag 128 Bit. Es gibt keine Schlüsselwiederverwendung im Helfer. Die Hülle speichert keine Originaldateinamen, Benutzer oder Ablaufdaten. Ihre Größe bleibt erkennbar.
- Schlüssel nicht zusammen mit der Datei öffentlich teilen. Schlüsselverlust ist nicht wiederherstellbar. Offline gibt es weder Sperrung noch Fernlöschung; auch online keine Rücknahme bereits heruntergeladener Kopien.
- Der Helfer prüft nur ZIP-Signatur, Größe und gesamten Hash; er entpackt, normalisiert oder konvertiert nichts. Er bestätigt keine nativen Schemata oder den Master. Diese Prüfung bleibt ausdrücklich bei RC34.
- Vollständige Originaldokumente, Projektverläufe, ATLAS-Referenzen, Profile und interne Prüfsummen bleiben durch Erhaltung der gesamten ZIP erhalten. Nicht im Ausgangspaket gespeicherte Arbeit kann der Helfer nicht rekonstruieren.
- Die Oberfläche nutzt keine lokalen Speicher-APIs und blockiert Netzwerkverbindungen per CSP. Speicher-/Schlüssellöschung in Browser, Auslagerungsdatei, Zwischenablage oder Downloadordner lässt sich damit nicht garantieren. Nach Nutzung Oberfläche leeren und Tab schließen; Dateien betrieblich verwalten.

## Format für unabhängige Prüfung

Prüftext: `ATLAS-CHECK-1:<dezimaler ZIP-Byteumfang>:<64 kleine SHA-256-Hexzeichen>`.

Schlüsseltext: `ATLAS-KEY-1:<64 kleine Hexzeichen>`. Er ist ein zufälliger AES-Schlüssel, kein menschliches Passwort und kein Abrufcode.

Binäre `.aclseal`-Hülle: ASCII `ACLSEAL1` (8 Bytes), IV (12 Bytes), AES-GCM-Chiffretext gefolgt vom 16-Byte-Tag. AAD sind die exakten UTF-8-Bytes `ATLAS Clarus opaque ZIP transport v1`. Klartext ist die vollständige ursprüngliche ZIP. Größe ist ZIP-Größe +36 Bytes. Kein ZIP-Repack, keine JSON-Normalisierung, keine Referenz-Neuberechnung.

## Online-Abruf: konkrete Anforderungen für einen späteren Schritt

Vorgeschlagener Dienstablauf, nicht implementiert:

1. Authentifizierter Absender wählt Empfänger und Lebensdauer (z. B. 24 Stunden, betrieblich begrenztes Maximum). Client verschlüsselt vollständige ZIP; Dienst erhält nur Hülle und minimal nötige Freigabemetadaten. Schlüssel bleibt außerhalb des Dienstes.
2. Dienst speichert das Objekt unveränderlich und erzeugt einen kryptografisch zufälligen Abruftoken mit mindestens 128 Bit Entropie. Token nur gehasht speichern, nicht in Telemetrie oder öffentlichen URLs protokollieren. QR kann einen Abrufweg enthalten, aber keinen Entschlüsselungsschlüssel.
3. Empfänger meldet sich an und gibt Abrufcode ein. Dienst prüft bei jedem Zugriff die konkrete Paketberechtigung, Ablauf und Widerruf. Ein kurzer sechsstelliger Code ist allein zu leicht erratbar; wenn aus Bediengründen gewünscht, nur kontogebunden und mit kurzer Gültigkeit, Versuchslimit, Rate-Limiting und Sperrlogik. Zufälliger Token und Anmeldung sind unterschiedliche Schutzschichten.
4. Download nur nach Autorisierung, privater Speicher, keine öffentlich lesbaren Objekte. Falls signierte Speicher-URLs verwendet werden, höchstens sehr kurze Gültigkeit, nie länger als Freigabe; für sofortigen Widerruf Abruf über kontrollierten Dienst statt weiter gültiger URL. Cache-Control/no-store, restriktive CORS-/Referrer-Policy und Schutz gegen CSRF bei Cookie-Sitzungen.
5. Client entschlüsselt und prüft denselben vollständigen ZIP-Hash. RC34-Import bleibt ein eigener Schritt. Keine Konvertierung auf dem Server. Weiterbearbeitung liefert neue Version mit Eltern-Pakethash und Benutzer-/Zeitkontext; keine automatische Konfliktauflösung behaupten.
6. Ablauf und Widerruf verhindern weitere Abrufe unmittelbar serverseitig. Separater Löschauftrag entfernt Objekte; Backups, Protokolle und unvollständige Uploads erhalten definierte Löschfristen. Abrufprotokolle minimieren, keine Schlüssel/Token/Projektinhalte loggen. Für Einmalabruf atomare Reservierung plus klarer Wiederholungs-/Abbruchregel statt unklarer Löschung beim ersten GET.

Vor Umsetzung festlegen: Betreiber, Hosting, Identitätsdienst, Empfängerrollen, Datenspeicherort, Quoten, Kosten, Löschfristen und Support. Wenn ein betrieblich genehmigter Dienst diese Anforderungen bereits erfüllt, kann er zunächst die verschlüsselte Hülle transportieren; dadurch entsteht dennoch kein integrierter ATLAS-Abrufcode.

## Reproduzierbare Prüfung

Vom Repository-Stamm:

```sh
python prototypes/team-handoff/build.py
EXCHANGE_TEST_OUTPUT=/tmp/clarus-handoff-test node browser-bundle/tests/validate_tool_exchange.cjs
node prototypes/team-handoff/test.cjs /tmp/clarus-handoff-test/exchange.zip
node prototypes/team-handoff/test_ui.cjs
python browser-bundle/tests/verify_tool_exchange_exports.py /tmp/clarus-handoff-test
```

`test.cjs` erzeugt zusätzlich `/tmp/clarus-handoff-restored.zip` und QR-Prüfdateien. Der UI-Test ist ausdrücklich ein DOM-Mock, kein laufender Browser. Er setzt den vorherigen Fixture-Export voraus.

Ergebnis am 17.10.2026:

- RC34-Basistest PASS: 22 Dokumente, vollständige Originale/Verläufe/Referenzen, 501 Quellfarben ohne Kürzung, angehängte Dateien, eingebettete ICC-Profile; 13 Ablehnungsfälle.
- Neue Transportprüfung PASS: ZIP-Bytes exakt, unabhängige AES-GCM-Entschlüsselung über Node/OpenSSL, frische Schlüssel/IVs, unveränderter kompletter Zustand nach erneutem RC34-Import, 14 Ablehnungsfälle (u. a. falscher Schlüssel, Manipulation an Header/IV/Nutzlast/Tag, Kürzung, falscher Code, Größenlimit).
- Unabhängige Python-ZIP/CRC-/Byteprüfung PASS; vorhandener Python-Validator bestätigt alle 22 Nutzlasten und DAG-Verknüpfungen sowie vier eingebettete ICC-Dateien.
- QR aus derselben vendorten Bibliothek unabhängig mit ZXing-C++ decodiert: exakt vollständiger Prüfcode (37 × 37 Module plus Ruhezone). Keine Smartphone-Kamera-Abnahme behauptet.
- Standalone-HTML-Skripte/Bedienaktionen im DOM-Mock PASS: QR erzeugen, verschlüsseln, wiederherstellen, bei Fehler kein Download, alte Prüfzustände und Schlüssel bei Quellwechsel löschen.
- **Echte Browser-, visuelle, Mobil- und 64-MiB-Leistungsabnahme OFFEN.** Kein Chromium vorhanden; Paketinstallation scheiterte an Umgebungsberechtigungen. Kein Browser-Freigabestatus aus den Node-Tests ableiten. Chrome/Edge, Firefox und Safari einschließlich Dateiöffnung/Download/iOS müssen vor Integration geprüft werden.

Geändert werden ausschließlich Dateien in `prototypes/team-handoff/`. Master, RC34-Code, veröffentlichte ZIPs, WordPress, Android und öffentliche Browser Edition bleiben unverändert. Der Prototyp ist nicht automatisch für vertrauliche Produktivdaten freigegeben.

## Quellen

- [RC34 PR #91](https://github.com/HelabHLC/atlas-clarus-connect/pull/91), am 17.10.2026 via GitHub gelesen: offen, Draft, Head `44fd7947dff31761469fa551f61b5d4063f51980`.
- [RC34 Tool Exchange Dokumentation, commitgebunden](https://github.com/HelabHLC/atlas-clarus-connect/blob/44fd7947dff31761469fa551f61b5d4063f51980/browser-bundle/TOOL_EXCHANGE_PREVIEW.md): gesamte ZIP als Übergabeeinheit, 384 MiB/100 Dokumente, Grenzen nativer Konvertierung.
- [W3C Web Cryptography Recommendation, AES-GCM](https://www.w3.org/TR/2017/REC-WebCryptoAPI-20170126/#aes-gcm): verwendete standardisierte Kryptografie-Operation. Die Prototyp-Hülle und die Online-Anforderungen sind eigene Entwurfsentscheidungen, kein W3C-zertifiziertes Protokoll.
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html): HTTPS, endpointbezogene Zugriffskontrolle und Prüfung zeitlicher Token-Gültigkeit. Daraus abgeleitete Dienstanforderungen oben sind noch nicht implementiert.
- QRCode for JavaScript, Kazuhiko Arase (2009), aus lokal vorhandenem `qrcode-terminal` 0.12.0, Vendor-Dateien unverändert übernommen. Lizenzhinweise unter `vendor/LICENSE.txt`. Build bettet einen CommonJS-Loader ein; keine CDN-Abhängigkeit.
