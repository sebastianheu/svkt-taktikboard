import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Erlaubte Positions-Kuerzel, identisch zum bisherigen Taktikboard-Artefakt
// (Runde 20), damit spaeter beim Uebertragen der restlichen Funktionen
// (Taktik-Editor, Import) dieselbe Vokabel gilt.
const POSITION_CODES = ["", "TW", "AV", "IV", "DM", "ZM", "OM", "FL", "ST"];

// Der Neon-HTTP-Treiber liefert die DATE-Spalte "birthdate" als
// JS-Date-Objekt zurueck (Mitternacht UTC) statt als reinen 'YYYY-MM-DD'
// String -- NextResponse.json() serialisiert ein Date ueber
// toISOString() und haengt dabei "T00:00:00.000Z" an. Der Editor
// (formatDateDMY, computeAgeFromBirthdate, das native <input
// type="date">) erwartet aber ausschliesslich 'YYYY-MM-DD' und zeigt bei
// einem vollen Zeitstempel kaputte Werte an (z. B. "18T00:00:00.000Z.09.2004").
// Daher hier einmalig auf den reinen Datumsanteil normalisieren.
function toDateOnlyString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function GET() {
  const sql = await getDb();
  const rows = await sql`
    SELECT id, first_name, last_name, nickname, position1, position2,
           birthdate, number, initials, starting, injured, hidden,
           heading_strength, duel_strength, anticipation_positioning,
           speed, technique_precision, height_cm,
           finishing, crossing, long_shots, strength
    FROM players
    ORDER BY number NULLS LAST, last_name ASC
  `;
  const players = (rows as Record<string, unknown>[]).map((row) => ({
    ...row,
    birthdate: toDateOnlyString(row.birthdate),
  }));
  return NextResponse.json({ players });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Vorname und Nachname sind Pflichtfelder." },
      { status: 400 }
    );
  }

  const position1 = POSITION_CODES.includes(body.position1) ? body.position1 : "";
  const position2 = POSITION_CODES.includes(body.position2) ? body.position2 : "";
  const nickname = String(body.nickname ?? "").trim();
  const birthdate = body.birthdate ? String(body.birthdate) : null;
  const number =
    body.number === null || body.number === undefined || body.number === ""
      ? null
      : Math.max(0, Math.min(99, parseInt(String(body.number), 10) || 0));
  const initials = String(body.initials ?? "")
    .toUpperCase()
    .slice(0, 4);

  const id = crypto.randomUUID();
  const sql = await getDb();
  await sql`
    INSERT INTO players (id, first_name, last_name, nickname, position1, position2, birthdate, number, initials)
    VALUES (${id}, ${firstName}, ${lastName}, ${nickname}, ${position1}, ${position2}, ${birthdate}, ${number}, ${initials})
  `;

  return NextResponse.json({ id }, { status: 201 });
}
