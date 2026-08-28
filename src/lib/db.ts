import { neon } from "@neondatabase/serverless";

// Liest die Verbindungs-URL aus der Umgebungsvariable, die die
// Neon-Vercel-Integration automatisch setzt (Vercel-Dashboard -> Storage ->
// Neon -> "Connect to Project"). Lokal (ohne Datenbank) bleibt DATABASE_URL
// leer -- dann wirft jeder Datenbankzugriff einen klaren Fehler, statt still
// falsche Daten zu liefern.
const connectionString = process.env.DATABASE_URL;

let migrated = false;

function getSql() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Die Neon-Datenbank muss zuerst im " +
        "Vercel-Projekt eingerichtet werden (Dashboard -> Storage -> Neon " +
        "hinzufuegen, kostenloser Plan)."
    );
  }
  return neon(connectionString);
}

// Legt das Schema an, falls es noch nicht existiert. Wird lazy vor der
// ersten Anfrage pro Kaltstart ausgefuehrt (CREATE TABLE IF NOT EXISTS ist
// wiederholbar/gefahrlos) -- so ist keine separate Migrations-Ausfuehrung
// mit direktem Datenbankzugriff noetig.
async function ensureSchema(sql: ReturnType<typeof getSql>) {
  if (migrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      position1 TEXT NOT NULL DEFAULT '',
      position2 TEXT NOT NULL DEFAULT '',
      birthdate DATE,
      number INTEGER,
      initials TEXT NOT NULL DEFAULT '',
      starting BOOLEAN NOT NULL DEFAULT FALSE,
      injured BOOLEAN NOT NULL DEFAULT FALSE,
      hidden BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Bibliothek (gespeicherte Taktiken/Situationen inkl. optionalem GIF) und
  // Ordner aus dem bisherigen Taktiktafel-Editor: dort war das jeweils ein
  // einziges JSON-Array in localStorage. Statt das Datenmodell aufzubrechen,
  // wird die exakt gleiche Struktur 1:1 als JSONB-Blob übernommen (`data`
  // enthaelt das komplette Eintrags-Objekt inkl. id) -- so bleibt praktisch
  // der gesamte Alt-Code (Rendering, Bearbeiten, GIF-Export) unveraendert,
  // nur das Laden/Speichern wechselt von localStorage auf diese Tabellen.
  await sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS library_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  migrated = true;
}

export async function getDb() {
  const sql = getSql();
  await ensureSchema(sql);
  return sql;
}
