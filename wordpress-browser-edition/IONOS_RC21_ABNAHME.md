# IONOS: RC21 prüfen und umschalten

**Browser Edition v0.1.11-beta1 — RC21-Testkandidat.**

Das ZIP ersetzt das vorhandene Plugin. Die gespeicherte Laufzeit bleibt beim Update aktiv.
Unter **Werkzeuge → ATLAS Clarus Browser Edition → Mitgeliefertes RC21 prüfen und aktiv schalten**
wird RC21 nach bestandener Integritätsprüfung sofort ausgeliefert. Zuerst auf einer Testinstallation prüfen.

Vorher Paletten als **Clarus JSON** sichern. Druckaufträge immer als **Print JSON** exportieren,
bevor die Seite geschlossen oder neu geladen wird. Für eine andere Domain Paletten/Jobs per JSON übertragen.

1. ZIP über **Plugins → Neues Plugin hinzufügen → Plugin hochladen** einspielen und das bestehende Plugin ersetzen.
2. **Werkzeuge → ATLAS Clarus Browser Edition** öffnen. Mitgeliefert: RC21, **2.102.053 Byte**.
3. Auf **Mitgeliefertes RC21 prüfen und aktiv schalten** klicken. Erwartung: **Neues Bundle aktiv: JA**.
4. **Full-Canvas Browser Edition öffnen**. Bei altem Inhalt den Cache der Browser-Seite in IONOS/WordPress leeren und neu laden.
5. Bei Problemen **Zur vorherigen Laufzeit zurückwechseln** wählen. Der vorherige Laufzeitordner bleibt erhalten.

## Abnahme auf IONOS

Datum, Test-URL, WordPress-/PHP-Version, Browser und Smartphone: noch einzutragen.

| Prüfung | Erwartung | Ergebnis |
| --- | --- | --- |
| Plugin als Update einspielen | Vorherige Laufzeit weiterhin aktiv | OFFEN |
| RC21 umschalten | SHA-/Manifestprüfung bestanden; Neues Bundle aktiv: JA | OFFEN |
| Bild → Picker → Hover → Wheel | Referenz-ID und Master bleiben gleich | OFFEN |
| Basis-23, row 1702 | B/A #FF874B / #FD884E; Rechenvorschau-Hinweis sichtbar | OFFEN |
| Palette und Clarus JSON | Geordnete Referenzen nach Export/Import gleich | OFFEN |
| Hover/Wheel: Prepare for print | Ein Auftrag, zwei unabhängige Wege 4C und ECG | OFFEN |
| Palette: Prepare palette for print | Identische geordnete Referenzen in beiden Wegen | OFFEN |
| Nur 4C-Profil/-Bedingung ändern | ECG-Einstellungen bleiben unverändert | OFFEN |
| Nur ECG-Profil/-Bedingung ändern | 4C-Einstellungen bleiben unverändert | OFFEN |
| Fehlendes Profil | Offener Status; keine erfundenen Druckwerte | OFFEN |
| Print JSON exportieren/importieren | Beide Wege, IDs, Profilbytes/-Hashes und Bedingungen gleich | OFFEN |
| Fehlerhaftes Print JSON importieren | Ablehnung; bisheriger Auftrag bleibt erhalten | OFFEN |
| HTML-Bericht exportieren | Beide Wege und ihre offenen Status lesbar | OFFEN |
| Seite neu laden | Paletten ggf. aus Browserspeicher; Print-Auftrag per JSON wieder öffnen | OFFEN |
| Desktop und echtes Smartphone | Menü, Homepage-Link, Picker und Exporte bedienbar | OFFEN |
| Rückschalter | Vorherige Laufzeit wieder sichtbar | OFFEN |

4C und ECG verwenden dieselbe eingefrorene ATLAS-Referenz. Es gibt keine 4C→ECG- oder ECG→4C-Umrechnung.
Die eigentliche Druckwertberechnung und physische Druckprüfung sind noch nicht Bestandteil dieses Kandidaten.

Bundle-SHA-256: `d6bc4230d54e1160e6e1bb80179e4f106937f1f55a47eb1edc383e054914be95`.
Der Homepage-Link wird beim Ausliefern im normalen Navigationsmenü ergänzt; die ZIP-Prüfsumme
gilt für das unveränderte eingebettete Bundle vor dieser Laufzeitergänzung.
