import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const POSITION_CODES = ["", "TW", "AV", "IV", "DM", "ZM", "OM", "FL", "ST"];

type IncomingPlayer = {
  id?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  position1?: string;
  position2?: string;
  birthdate?: string | null;
  number?: number | string | null;
  initials?: string;
  starting?: boolean;
  injured?: boolean;
  hidden?: boolean;
};

// Ersetzt den kompletten Kader in einem Rutsch. Das spiegelt genau, wie der
// alte Taktiktafel-Editor sein internes `roster`-Array bisher komplett in
// localStorage geschrieben hat (persistRoster()) -- so muessen dessen rund
// 15 Aufrufstellen beim Uebertragen nicht einzeln umgebaut werden, nur
// Laden/Speichern selbst wechseln von localStorage auf diese Route.
//
// Bewusst ohne Array-Parameterbindung (z. B. "id = ANY($1)") -- die Groesse
// eines Kaders ist klein (ein paar Dutzend Eintraege), daher werden
// geloeschte Eintraege einzeln adressiert. Das haelt die Query-Form exakt
// gleich zu den bereits bewaehrten Einzel-Statements in den anderen Routen.
export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: "Erwartet ein Array von Spielerinnen." },
      { status: 400 }
    );
  }

  const sql = await getDb();

  const normalized = (body as IncomingPlayer[])
    .map((p) => {
      const firstName = String(p.firstName ?? "").trim();
      const lastName = String(p.lastName ?? "").trim();
      const position1 = POSITION_CODES.includes(p.position1 ?? "") ? (p.position1 as string) : "";
      const position2 = POSITION_CODES.includes(p.position2 ?? "") ? (p.position2 as string) : "";
      const nickname = String(p.nickname ?? "").trim();
      const birthdate = p.birthdate ? String(p.birthdate) : null;
      const number =
        p.number === null || p.number === undefined || p.number === ""
          ? null
          : Math.max(0, Math.min(99, parseInt(String(p.number), 10) || 0));
      const initials = String(p.initials ?? "").toUpperCase().slice(0, 4);
      const id = p.id && String(p.id).trim() ? String(p.id) : crypto.randomUUID();
      return {
        id,
        firstName,
        lastName,
        nickname,
        position1,
        position2,
        birthdate,
        number,
        initials,
        starting: !!p.starting,
        injured: !!p.injured,
        hidden: !!p.hidden,
      };
    })
    .filter((p) => p.firstName && p.lastName);

  const existingRows = await sql`SELECT id FROM players`;
  const existingIds = new Set((existingRows as { id: string }[]).map((r) => r.id));
  const newIds = new Set(normalized.map((p) => p.id));
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));

  const queries = [
    ...toDelete.map((id) => sql`DELETE FROM players WHERE id = ${id}`),
    ...normalized.map(
      (p) => sql`
        INSERT INTO players (id, first_name, last_name, nickname, position1, position2, birthdate, number, initials, starting, injured, hidden, updated_at)
        VALUES (${p.id}, ${p.firstName}, ${p.lastName}, ${p.nickname}, ${p.position1}, ${p.position2}, ${p.birthdate}, ${p.number}, ${p.initials}, ${p.starting}, ${p.injured}, ${p.hidden}, now())
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          nickname = EXCLUDED.nickname,
          position1 = EXCLUDED.position1,
          position2 = EXCLUDED.position2,
          birthdate = EXCLUDED.birthdate,
          number = EXCLUDED.number,
          initials = EXCLUDED.initials,
          starting = EXCLUDED.starting,
          injured = EXCLUDED.injured,
          hidden = EXCLUDED.hidden,
          updated_at = now()
      `
    ),
  ];

  if (queries.length > 0) {
    await sql.transaction(queries);
  }

  return NextResponse.json({ ok: true, ids: [...newIds] });
}
