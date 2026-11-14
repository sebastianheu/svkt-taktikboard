# Changelog Taktikboard

Stand: 14.11.2026 (Produktion = `main`).
Zu jeder Änderung steht, **wie du sie prüfen kannst**. Mit ⚠️ markierte Punkte habe ich nur lokal/ohne echte Daten getestet.

## 1. Letzte Änderungen (Nov 2026)

### Neue Vorlagen-Rolle „Manndeckung“ (14.11.2026)
- Im Vorlagen-Modus gibt es bei Spieler-Icons die Standard-Rolle **Manndeckung**. Automatische Besetzung gewichtet: Zweikampf (3), Kopfball, Stärke, Schnelligkeit (je 2), Größe, Spielintelligenz (je 1).
- Prüfen: Vorlage öffnen, Spieler-Icon auswählen → „Standard-Rolle“ → Manndeckung. „Vorlage anwenden“ → „Automatisch bestmöglich besetzen“ → zweikampf- und kopfballstarke Spielerin landet auf der Rolle.

### Aufräumen (10.11.2026)
- Einmalige Migrations-Route `/api/admin/migrate-gifs` entfernt (Migration war am 07.11. abgeschlossen: 8 Einträge, 0 Fehler). Der Code liegt weiter in der Git-Historie.
- Prüfen: Nach dem Deploy liefert `/api/admin/migrate-gifs` 404; Editor, Bibliothek und GIF-Vorschauen funktionieren wie vorher.

### Schriftgröße für Texte in Elementen
- Neuer Regler „Schriftgröße“ (0,5–3, Standard 1) bei Kreis/Viereck/Dreieck und Textboxen.
- Prüfen: Viereck anlegen, Beschriftung eintragen, Regler bewegen → Text wird größer/kleiner. Textbox: Kasten wächst mit.
- ⚠️ Marker-Form bleibt gleich groß; sehr großer Text kann überstehen.

### Von vorne abspielen
- Aus der Pause: springt zum Anfang und **bleibt pausiert** bis Play. Im Lauf: startet neu und läuft weiter.
- Prüfen: Play → Pause → „Von vorne“ (bleibt stehen, erstes Bild) → Play. Dann im Lauf „Von vorne“ (läuft weiter).

### Textbox-Hintergrund passt sich dem Text an
- Kasten war hochkant (Breite/Höhe im gedrehten Platz vertauscht), jetzt passend zum Text.
- Prüfen: Textbox mit 2 Zeilen anlegen → Kasten breit und nur so hoch wie der Text.

### Bibliothek: nur das ausgewählte GIF
- Unter den Ordnern erscheint nur noch das angeklickte GIF mit Vorschau und Aktionen (Kopieren, Ordner, Download, Löschen). Ohne Auswahl: Hinweis.
- Prüfen: Ordner aufklappen, GIF anklicken → nur diese Karte. „Neue Taktik“ → Karte weg.

### GIFs in Ordnern sortieren und verschieben
- Per Drag & Drop innerhalb eines Ordners umsortieren (goldene Einfügelinie, Schatten am Mauszeiger); Reihenfolge wird pro Ordner gespeichert.
- Beim Ziehen wird nichts mehr markiert; Schatten des GIFs folgt dem Zeiger; Verschieben in anderen Ordner wie bisher.
- Prüfen: GIF über ein anderes im selben Ordner ziehen (obere/untere Hälfte = davor/danach). Auf anderen Ordner ziehen = verschieben.
- ⚠️ Mit simulierten Mausereignissen getestet, nicht mit echter Maus.

### GIF-Vorschauen: Fehler behoben
- Ursache für beschädigte Vorschauen (London/2+2 Vorlage, Traube Dortmund): Der Server löschte beim Speichern das ersetzte GIF; ein veralteter Tab konnte so aktuelle GIFs vernichten.
- Jetzt: ersetzte GIFs werden nicht mehr gelöscht; beim Löschen eines Eintrags nur, wenn kein anderer Eintrag das GIF nutzt. Die drei Vorschauen wurden neu erzeugt.
- Prüfen: alle Vorschauen ansehen. Offene Editor-Tabs nach dem Deploy neu laden.

## 2. Traffic senken (Fast Origin Transfer) und Vorlagen-Schutz

- GIF-Vorschauen liegen in **Vercel Blob** statt als Base64 in der Datenbank. Upload direkt vom Browser (`/api/blob/upload`, nur mit Login). Antwort von `/api/library`: 15,1 MB → 0,3 MB.
- Neues GIF nur, wenn sich die Taktik geändert hat (Prüfwert `sourceHash`).
- Editor-Seite ist cachebar (ETag, `private, no-cache`).
- Einmalige Migration der alten GIFs durchgeführt: 8 Einträge, 0 Fehler. Alle 44 Einträge inhaltlich identisch zum Backup, alle 9 Vorlagen unverändert.
- **Vorlagen sichern / Importieren** (Buttons im Panel „Taktiken“): Vorlagen als `.json` sichern und wieder einspielen. Löschen einer Vorlage zeigt eine deutliche Warnung.
- Backups liegen in `…\Claude Projekte\svkt-taktikboard-backups\` (außerhalb des Repos).
- Prüfen: Editor öffnen (schnell, GIFs sichtbar); „Vorlagen sichern“ klicken (Datei lädt herunter). Im Vercel-Dashboard unter Usage den Fast Origin Transfer über einige Tage beobachten.
- Aufräumen: Test-Variablen `AUTH_PASSCODE`/`AUTH_SECRET` für den Branch `fast-origin-transfer` im Vercel-Dashboard löschen.

## 3. Elemente pro Frame
- Neue Elemente erscheinen **nur auf dem Frame, auf dem sie angelegt werden**; ein neuer Frame übernimmt den aktuellen Stand.
- Im Menü des Elements: „Nur in diesem Frame entfernen“, „In diesem Frame einblenden“, „Element in allen Frames löschen“. Fehlende Elemente stehen ausgegraut in der Ebenenliste.
- Beim Abspielen/GIF: ein Element erscheint beim Erreichen seines Frames, ein fehlendes bleibt bis dahin sichtbar.
- Prüfen: Auf Frame 2 Element hinzufügen → Frame 1 ohne Element. Dann Einblenden/Entfernen testen.
- ⚠️ Abspielen/GIF-Export mit lückenhaften Elementen nicht im Detail angesehen.

## 4. Kader, Vorlagen, Partien (Okt 2026)
- **10 Standard-Attribute** je Spielerin (Abschluss, Kopfball, Flanken, Distanzschüsse, Stärke, Schnelligkeit, Zweikampf, Größe, Technik, Spielintelligenz); Pflicht nur für neue Einträge; CSV-Export.
- **Vorlagen:** Schalter „Als Vorlage speichern“, Platzhalter-Spieler („Platzhalter hinzufügen“), „Vorlage anwenden“ (Play-Symbol) erzeugt eine Kopie, Original bleibt. Automatische Besetzung per Rollen-Score (ungarische Methode) oder per Drag & Drop.
- **Partien-Bereich:** dritter Reiter mit Gegner, Datum, Notiz und eigener Taktik-Sammlung je Partie.
- **Kader-Karte (Taktik):** nur Startelf, bereits eingesetzte ausgegraut, Löschen eines besetzten Platzhalters bringt den Platzhalter zurück, Spielerin auf Spielerin ziehen = Positionstausch (alle Frames).
- **Startelf-Abgleich beim Öffnen einer Taktik:** nicht mehr aufgestellte Spielerinnen werden entfernt; fehlende nur ergänzt, wenn die Taktik vorher 11 Spielerinnen hatte.
- Namensschrift unter Spielern Standard 16. Neue Spielerinnen werden kollisionsfrei platziert.
- Layout: Taktikfeld bleibt sichtbar, die beiden Menüs links/rechts scrollen getrennt.
- Fußball.de-Team-Link wird gemerkt. GIF-Download repariert.
- ⚠️ Vieles davon konnte lokal ohne Datenbank nur eingeschränkt getestet werden; bitte mit echten Daten gegenprüfen.
