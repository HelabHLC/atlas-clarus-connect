ArtCraft ATLAS Pilot — Windows x64
Basis: ArtCraft 0.41.0 / c3844acdadf630db0c17ec1d1512bcf6bbc1b4f9
Testversion: 0.41.0-clarus.0.2.2

Dies ist eine unabhängig gebaute Testfassung, keine offizielle ArtCraft-Version.
Der enthaltene Code ist ein direkter Moodboard-Einbau, kein extern ladbares Plug-in.
Diese Fassung ist für deinen persönlichen Integrationstest bestimmt.
Der verwendete Stand 0.41.0 enthält die ArtCraft-Fair-Source-Lizenz (LICENSE.md);
deren Text liegt unverändert bei und wird nicht durch eine andere Lizenz ersetzt.

1. ZIP in einen eigenen neuen Ordner entpacken.
2. ArtCraft-ATLAS-Pilot.exe starten.
3. Im Startbereich das Moodboard öffnen und die Grid-Ansicht wählen.
4. "Import ATLAS Clarus palette" auswählen.
5. Die beigelegte Datei two-greens.clarus.json öffnen.
6. Beide Farbfelder öffnen und ihre Originalwerte mit der ATLAS-Referenz vergleichen.
7. Programm schließen, erneut starten und beide Einträge kontrollieren.
8. Im Grid "Export ATLAS Clarus palette" wählen. Die erzeugte .clarus.json
   anschließend wieder in ATLAS Clarus importieren und Source-RGB, Adresse,
   atlas_row_id, Referenz-RGB, Sampling/Bilddaten und Master-SHA vergleichen.

Erwartung:
#3D7B19 und #3C7B19 bleiben zwei verschiedene Originalfarben.
Beide erhalten H130_L045_C055, atlas_row_id 4966.
Die Referenzfarbe #37791A wird getrennt angezeigt.
Die Bildherkunft im Beispiel ist synthetisch und nicht signiert.
Der Export bewahrt NOT_SIGNED und NOT_MEASURED; er ist keine Produktionsfreigabe.
Er rekonstruiert nur gespeicherte source-backed Datensätze und nicht die exakten
Bytes der ursprünglich importierten Datei.

Die Testfassung verwendet einen eigenen Ordner Artcraft-ATLAS-Pilot in deinem
Benutzerordner und die eigene Programmkennung org.atlasclarus.artcraft.pilot.
Vorhandene ArtCraft-Projekte und Anmeldedaten werden nicht in den Piloten kopiert.
Für den lokalen Palettenimport ist keine Anmeldung und kein Kauf nötig.
Zum Beenden genügt das Schließen des Fensters; es gibt keinen Installer.

Die Datei ist nicht mit einem kommerziellen Windows-Zertifikat signiert.
Falls Windows den Start sperrt, nicht pauschal Schutzfunktionen deaktivieren:
die genaue Meldung für die gemeinsame Prüfung festhalten.
Ein aktuelles Microsoft Edge WebView2 Runtime wird wie bei ArtCraft benötigt.

Der CI-Build läuft auf Windows Server 2022. Das ist noch keine vollständige
Abnahme auf Windows 10 Build 19045. Der praktische Test auf deinem Rechner
bleibt ein eigener Prüfschritt.

Quellcode: unveränderter öffentlicher ArtCraft-Basiscommit plus die beiliegenden
Patches. Lizenzen und Referenzdaten-Herkunft liegen im Ordner licenses.
SHA256SUMS.txt enthält die Dateiprüfsummen dieses Pakets.
