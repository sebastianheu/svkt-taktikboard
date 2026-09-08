import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkExternalApiKey } from "@/lib/auth";

// Read-only Export des Kaders fuer externe, nicht-interaktive Anwendungen
// (z. B. eine Gegner-Vorbereitungs-Integration) -- eigene Route statt der
// browser-session-geschuetzten /api/players, weil eine externe Anwendung
// kein Session-Cookie besitzen kann. Auth laeuft stattdessen ueber einen
// Bearer-API-Key (EXTERNAL_API_KEY, siehe proxy.ts fuer die Ausnahme vom
// Session-Gate und checkExternalApiKey in lib/auth.ts).
export const maxDuration = 10;

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = match ? match[1].trim() : "";
  if (!provided) return false;
  return checkExternalApiKey(provided);
}

// Siehe /api/players fuer denselben Hintergrund: der Neon-Treiber liefert
// DATE-Spalten als JS-Date-Objekt zurueck, das ueber toISOString() zu einem
// vollen Zeitstempel statt reinem 'YYYY-MM-DD' serialisiert wuerde.
function toDateOnlyString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

// Bildet denselben exklusiven Status ab, den die Kaderliste im Editor
// anzeigt (siehe rosterStatusOf in editor.source.html) -- fuer eine externe
// Anwendung nuetzlicher als die drei rohen Booleans einzeln zu interpretieren.
type PlayerRow = {
  starting: boolean;
  hidden: boolean;
  injured: boolean;
};
function statusOf(row: PlayerRow): "starting" | "hidden" | "injured" | "bench" {
  if (row.starting) return "starting";
  if (row.hidden) return "hidden";
  if (row.injured) return "injured";
  return "bench";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error:
          "Nicht autorisiert. Gueltigen API-Key im Header 'Authorization: Bearer <key>' mitschicken.",
      },
      { status: 401 }
    );
  }

  const sql = await getDb();
  const rows = await sql`
    SELECT id, first_name, last_name, nickname, position1, position2,
           birthdate, number, initials, starting, injured, hidden
    FROM players
    ORDER BY number NULLS LAST, last_name ASC
  `;

  const players = (
    rows as Array<{
      id: string;
      first_name: string;
      last_name: string;
      nickname: string;
      position1: string;
      position2: string;
      birthdate: unknown;
      number: number | null;
      initials: string;
      starting: boolean;
      injured: boolean;
      hidden: boolean;
    }>
  ).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    position1: row.position1,
    position2: row.position2,
    birthdate: toDateOnlyString(row.birthdate),
    number: row.number,
    initials: row.initials,
    status: statusOf(row),
  }));

  return NextResponse.json({ players });
}
