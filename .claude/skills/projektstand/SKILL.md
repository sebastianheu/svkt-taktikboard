---
name: projektstand
description: Hält Stand, Entscheidungen und nächste Schritte in der Projekt-CLAUDE.md des SVKT-Taktikboards fest. Verwenden, wenn der Nutzer "Stand festhalten", "Projektstand aktualisieren", "Entscheidungen dokumentieren", "Session abschließen" oder /projektstand sagt, oder wenn ein Arbeitsabschnitt endet und der Kontext für die nächste Session gesichert werden soll.
---

# Projektstand in CLAUDE.md festhalten

Ziel: `CLAUDE.md` im Projektstamm ist danach so aktuell, dass jede neue Session ohne Rückfragen weiterarbeiten kann. Es gibt **keinen eigenen Abschnitt** „Projektstand“: Die vorhandenen Abschnitte werden gepflegt.

## Aufbau von CLAUDE.md (beibehalten)

```markdown
@AGENTS.md

# Projekt: SVKT Taktikboard
(Kurzbeschreibung)

## Stand (TT.MM.JJJJ)
## Architektur (wichtig)
## Entscheidungen
## Offene Punkte / nächste Schritte
## Sicherheit
```

## Vorgehen

1. **Quellen sammeln.** Nur Belegbares verwenden:
   - Verlauf der aktuellen Session (gebaut, geändert, verworfen, entschieden)
   - `git status`, `git log --oneline -15`, `git branch -a` (offene Branches, nicht gemergte Arbeit)
   - `CHANGELOG.md` (Details und Prüfhinweise je Änderung)
2. **`CLAUDE.md` vollständig lesen**, bevor etwas geändert wird.
3. **Abschnitte aktualisieren** nach den Regeln unten.
4. **Ergebnis kurz zeigen**: was geändert wurde und welche Punkte nicht belegt werden konnten.

## Regeln je Abschnitt

- **Stand (TT.MM.JJJJ)**: Datum in der Überschrift aktualisieren (`date +%d.%m.%Y`). Inhalt kurz halten (Produktion/Deploy, Funktionsumfang) und für Einzelheiten auf `CHANGELOG.md` verweisen statt sie zu kopieren.
- **Architektur (wichtig)**: Nur ändern, wenn sich in der Session tatsächlich etwas an Aufbau, Build-Schritten, Datenmodell oder Infrastruktur geändert hat.
- **Entscheidungen**: Protokoll. Neue Punkte anhängen, bestehende nie stillschweigend löschen. Wird eine Entscheidung revidiert, den alten Punkt anpassen und den Grund dazuschreiben („ersetzt frühere Regel: …“). Nur eintragen, was der Nutzer getroffen oder bestätigt hat, keine unbestätigten Vorschläge von Claude.
- **Offene Punkte / nächste Schritte**: Nummerierte Liste, bei jedem Lauf auf den aktuellen Stand bringen. Erledigtes entfernen (ggf. im CHANGELOG festhalten), Neues ergänzen. Konkret und umsetzbar formulieren; Aufgaben, die nur der Nutzer erledigen kann (z. B. Vercel-Dashboard), als solche kenntlich machen.
- **Sicherheit** und alles außerhalb dieser Abschnitte: unverändert lassen. Die Zeile `@AGENTS.md` nie anfassen, verschieben oder löschen.

## Allgemein

- Nichts erfinden. Unklares als „Nicht bestätigt: …“ markieren und beim Nutzer nachfragen. Annahmen mit „Annahme:“ kennzeichnen.
- Datum immer absolut im Format TT.MM.JJJJ, nie „heute“ oder „gestern“.
- Deutsch, knapp, keine Wiederholung von Inhalten aus `AGENTS.md` oder `CHANGELOG.md`.
- Keine Zugangscodes, API-Keys, Tokens oder personenbezogenen Daten eintragen.
- Gab es in der Session Code-Änderungen, die im `CHANGELOG.md` fehlen, darauf hinweisen und einen Eintrag (mit „Prüfen:“-Zeile) vorschlagen, aber nur nach Zustimmung schreiben.
- Nur `CLAUDE.md` (und nach Zustimmung `CHANGELOG.md`) bearbeiten. Nicht committen oder pushen, außer der Nutzer verlangt es ausdrücklich; dann auf eigenem Branch, `main` nur nach Freigabe per Fast-Forward.
