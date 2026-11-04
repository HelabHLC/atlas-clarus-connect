ATLAS Clarus · Farbberatung 0.1.4 · persönliche Testversion

1. ZIP vollständig entpacken und START_HERE.html öffnen.
2. Startup Colour Kit: Kundenfarben auswählen und Zielbibliothek/Profil laden.
   Browser Edition: Unter der Bibliotheksauswahl „Ausgewählte Farbe beraten“
   oder „Aktive Palette beraten“ wählen. Die gemeinsame Beratung öffnet sich.
3. Bei fehlenden Adressen werden andere Bibliotheken für dieselbe Adresse
   und für die gesamte ursprüngliche Palette genannt. „Bibliothek prüfen“
   wählt die Bibliothek ausdrücklich; ein unpassendes Profil wird entfernt.
   Die neue Druckbedingung und das Material anschließend prüfen.
4. Eine eigene Toleranz zwischen 0 und 100 ΔE00 festlegen. Es gibt keinen
   vorgegebenen Akzeptanzwert. Die nächste enthaltene Farbe wird angezeigt.
   Nur innerhalb der Toleranz ist „Ersatzfarbe übernehmen“ verfügbar.
5. Beide Farben stehen nebeneinander. Jede Ersatzwahl bleibt reversibel.
   Die Druckbasis wechselt bei Übernahme sichtbar auf „Bestätigte Auswahl“.
   B/A mit dem richtigen Profil neu berechnen und die Farbmappe als ZIP sichern.

ORIGINAL UND AUSWAHL
Source RGB, ursprüngliche globale RGB-only-Zuordnung und Bildaufzeichnung
bleiben erhalten. Die Ersatzadresse wird separat dokumentiert und niemals
als ursprüngliche Bildzuordnung ausgegeben. Ein Wechsel von Bibliothek oder
Toleranz macht die frühere Ersatzentscheidung für diese Auswahl inaktiv.

EXPORT
project.json: gesamtes Projekt, ursprüngliche Source-Werte, Referenzen, Auswahl.
colour-advice.json: reproduzierbare Toleranzprüfung, Alternativen und Entscheidungen.
library-check.json: Mitgliedschaft der ursprünglichen oder bestätigten Adresse.
palettes/source.*: ursprüngliche Source-Farben (ASE, GPL, CSS).
palettes/reference.* und colours.clarus.json: ursprüngliche Referenzzuordnung.
palettes/accepted.* und accepted.clarus.json: bestätigte Auswahl, ggf. Ersatzfarben.
farbkarte.html: lesbare Dokumentation zum Drucken oder Speichern als PDF.
Bei fehlgeschlagener Prüfung wird ein Entwurf ohne Palettenexport gesichert.
Beim Wiederimport werden Entscheidungen und Prüfberichte neu geprüft; B/A
muss neu berechnet werden. Prüfsummen sind kein Echtheits- oder Zustimmungsnachweis.

BROWSER-ÜBERGABE
Die Beratung verarbeitet bis zu zwölf Farbaufzeichnungen. Größere Paletten
werden ausdrücklich abgewiesen und niemals still gekürzt. Die ursprüngliche
Browser-Palette bleibt unverändert. Die bestätigte Auswahl lässt sich über
accepted.clarus.json als eigene Palette importieren; alle zugehörigen
Source-Aufzeichnungen bleiben in der gemeinsamen Farbmappe dokumentiert.
Das aktuell geöffnete Originalbild wird mitgeführt, wenn es zu den Farben
gehört und höchstens 32 MiB groß ist. Aufzeichnungen früherer Bilder bleiben
mit RGB, Adresse und Herkunft erhalten; fehlende Originaldateien werden nicht
erfunden. Eine direkte Referenzauswahl ist als solche gekennzeichnet und
enthält keine behauptete ursprüngliche Kundenfarbe.

RECHENGRUNDLAGE
CIEDE2000 mit kL=kC=kH=1 auf beiden gespeicherten sRGB-Darstellungen,
umgerechnet nach Lab D65/2°. Dies ist bewusst ein Vergleich von sRGB-Farben.
Die HLC-Ziel-Lab-Werte werden nicht mit aus RGB berechneten Werten vermischt.
Gleiche sRGB-Werte können unterschiedliche HLC-Zielwerte verdecken.
Bibliothekszugehörigkeit und ΔE00-Auswahlgrenze ersetzen keine Materialprüfung,
keinen gerätespezifischen Gamutnachweis und keinen gemessenen Freigabe-Proof.
Andere Bibliotheken können andere Verfahren oder Materialien voraussetzen.
FOGRA58 beta wird nicht zur Annahmeprüfung des finalen Profils benutzt.

Master, Adresslisten, ICC-Dateien und LittleCMS-Engine bleiben unverändert.
Es wurde keine öffentliche Website aktualisiert. Die enthaltenen Profile
bleiben persönliche Anbieterdownloads; bestehende Anbieterhinweise gelten.
