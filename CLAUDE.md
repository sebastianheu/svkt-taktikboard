@AGENTS.md

# Projekt: SVKT Taktikboard

Taktiktafel für Fußball-Trainer:innen (Next.js 16, Neon-Postgres, Vercel Hobby). Deutsche UI und Kommentare. Einzelnutzer, Login über Zugangscode.

## Stand (10.11.2026)

Produktion = Branch `main`, deployt automatisch über Vercel (Projekt `svkt-taktikboard`, Team ATHLYZER). Aktueller Stand und Prüfliste: siehe `CHANGELOG.md`.

Funktionsumfang: Taktik-Editor mit Frames, Bibliothek mit Ordnern, Vorlagen mit Platzhaltern und Rollen-Zuteilung, Kader mit 10 Standard-Attributen, Partien-Bereich, GIF-Export.

Am 10.11.2026 aufgeräumt: einmalige Migrations-Route `/api/admin/migrate-gifs` entfernt (deployt), alle gemergten Feature-Branches lokal und auf GitHub gelöscht (nur noch `main`). CLAUDE.md wird mit dem Skill `projektstand` (`.claude/skills/projektstand/`) gepflegt.

## Architektur (wichtig)

- **Der Editor ist eine eigenständige HTML-Seite** `src/app/taktik-app/editor.source.html` (CSS + JS in einer Datei, kein Bundler), eingebettet per iframe unter `/taktik`. Sie wird als Base64 in `src/app/taktik-app/editorHtmlBase64.ts` ausgeliefert.
  - **Nach jeder Änderung an `editor.source.html` ausführen: `npm run build:editor`** (erzeugt die Base64-Datei und prüft den Roundtrip). Ohne das wirkt die Änderung nicht.
  - Danach Syntax-Check des Inline-Skripts und `npm run build`.
  - Datei hat CRLF-Zeilenenden (Git-Autocrlf). Skripte, die den Text ersetzen, müssen das berücksichtigen.
- Auth: `src/proxy.ts` (heißt in Next 16 so, nicht `middleware.ts`) + Session-Cookie. Externer, API-Key-geschützter Kader-Export unter `/api/external/players`.
- Daten (Neon): Tabellen `players`, `library_entries` (JSONB je Taktik), `library_folders`, `matches`. Schema wird in `src/lib/db.ts` lazy angelegt (`CREATE TABLE IF NOT EXISTS` plus `ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
- Speichern: Kader/Ordner/Partien per Bulk-PUT; **Bibliothek pro Eintrag** (`PUT/DELETE /api/library/[id]`). Nach einem Ladefehler sind Schreibzugriffe gesperrt, damit nichts überschrieben wird.
- GIF-Vorschauen liegen in **Vercel Blob** (Store per OIDC, `BLOB_STORE_ID`, kein `BLOB_READ_WRITE_TOKEN`). Upload direkt vom Browser über `/api/blob/upload` (presigned, nur mit Login). Der Browser-Client wird mit `npm run build:blob-client` nach `public/vendor/` gebündelt. `entry.gif = { url, pathname, bytes, frameCount, savedAt, sourceHash }`.
- Lokal gibt es keine `DATABASE_URL`: Speichern/Laden schlägt dort fehl, die UI lässt sich nur eingeschränkt testen (Import-Button im Panel „Taktiken“ hilft für Testdaten).
- Lokaler Test: `.claude/launch.json` (Windows, untracked); Login lokal mit dem Passcode aus `.env.local`.

## Entscheidungen

- **Elemente gehören pro Frame**: Ein Element steht nur in den Frames, in denen `frame.pos[id]` existiert. Neue Elemente erscheinen nur auf dem aktuellen Frame, ein neuer Frame kopiert den aktuellen.
- **Vorlagen dürfen nie verloren gehen.** Sie sind normale Taktiken mit `isTemplate: true`. Schutzmaßnahmen: Lösch-Warnung, Buttons „Vorlagen sichern“/„Importieren“, Backups vor riskanten Eingriffen.
- **GIF-Blobs werden nie beim Ersetzen gelöscht** (veraltete Tabs haben sonst aktuelle GIFs vernichtet), beim Löschen eines Eintrags nur wenn kein anderer Eintrag die URL nutzt. Kopien teilen sich die GIF-URL.
- **Migrationen ändern nur das Feld `gif`** (`jsonb_set`), nie Elemente/Frames/Vorlagen-Flag.
- Startelf-Abgleich nur beim Öffnen einer Taktik und nur für die geöffnete (nicht live, nicht für alle). Auffüllen nur, wenn die Taktik vorher 11 verknüpfte Spielerinnen hatte.
- Änderungen immer erst auf eigenem Branch, dann nur nach ausdrücklicher Freigabe per Fast-Forward in `main`.
- Der Spielfeldplatz wird im Hochformat gedreht gezeichnet (screenX folgt Meter-y, screenY folgt Meter-x), Text aufrecht. Das betrifft Textbox-Maße.
- Der Projektstand wird in den vorhandenen Abschnitten dieser Datei gepflegt (Skill `projektstand`), nicht in einem eigenen Abschnitt; Details und Prüfhinweise stehen im `CHANGELOG.md`.

## Offene Punkte / nächste Schritte

1. **(Nutzer)** Aktuelles Backup der Bibliothek ziehen und nach `..\svkt-taktikboard-backups\` legen. Letztes Backup: 07.11.2026 (vor der GIF-Migration); seitdem neue GIFs, Ordner-Sortierung, Schriftgrößen.
2. **(Nutzer)** Im Vercel-Dashboard die Test-Variablen `AUTH_PASSCODE` und `AUTH_SECRET` (Preview, Branch `fast-origin-transfer`) löschen. Der Branch selbst ist schon gelöscht, die Variablen nicht. Der verbundene Vercel-MCP-Zugang sieht das Projekt nicht, daher nur im Dashboard möglich.
3. **(Nutzer)** Fast Origin Transfer über einige Tage unter Usage beobachten (Ziel: deutlich unter dem Hobby-Limit von 10 GB/Monat).
4. **(Nutzer)** Nach jedem Deploy alle offenen Editor-Tabs neu laden (veraltete Tabs können alten Stand zurückschreiben).
5. Prüfrunde mit echten Daten (lokal nicht möglich), Claude bereitet eine Checkliste vor: Abspielen/GIF-Export bei Elementen, die nur auf einzelnen Frames stehen; Drag & Drop mit echter Maus (Ordner sortieren/verschieben, Kader-Tausch); Kader-/Vorlagen-Abläufe; sehr große Schrift in Markierungen (steht über die Form hinaus, ok so?).
6. Vorschlag, nicht bestätigt: Versionsprüfung beim Speichern (Server lehnt Schreibzugriffe veralteter Tabs ab), damit Punkt 4 keine Gewohnheit mehr sein muss.
7. Offen aus früheren Ideen: Rolle direkt in der Live-Ansicht tauschen; automatische „beste Startelf für Standards“ als eigener Bericht ohne Vorlage.
8. Optional später: Aufräumroutine für verwaiste Blob-Dateien (alte GIFs bleiben beim Neu-Erzeugen im Store liegen; 1 GB Speicher reicht lange, ca. 1 MB je GIF).

## Sicherheit

Keine Zugangscodes, API-Keys oder Tokens in Repo, `CLAUDE.md` oder Changelog. Backups der Bibliothek liegen außerhalb des Repos (`..\svkt-taktikboard-backups\`).
