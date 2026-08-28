import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Erlaubte Positions-Kuerzel, identisch zum bisherigen Taktikboard-Artefakt
// (Runde 20), damit spaeter beim Uebertragen der restlichen Funktionen
// (Taktik-Editor, Import) dieselbe Vokabel gilt.
const POSITION_CODES = ["", "TW", "AV", "IV", "DM", "ZM", "OM", "FL", "ST"];

export async function GET() {
  const sql = await getDb();
  const rows = await sql`
    SELECT id, first_name, last_name, nickname, position1, position2,
           birthdate, number, initials, starting, injured, hidden
    FROM players
    ORDER BY number NULLS LAST, last_name ASC
  `;
  return NextResponse.json({ players: rows });
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
