import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Partien ("Matches") -- gleiches Bulk-Replace-Muster wie /api/folders und
// /api/players/bulk. Bewusst schlank gehalten: nur Gegner, Datum, Notiz.
// Die Verknuepfung zu partie-spezifischen Taktiken erfolgt ueber ein
// optionales matchId-Feld im JSONB-Blob eines library_entries (siehe
// /api/library) -- kein eigenes FK-Constraint noetig.
export async function GET() {
  const sql = await getDb();
  const rows = await sql`
    SELECT id, opponent_name, match_date, note
    FROM matches
    ORDER BY match_date DESC NULLS LAST, created_at DESC
  `;
  const matches = (rows as Record<string, unknown>[]).map((row) => ({
    ...row,
    match_date:
      row.match_date == null
        ? null
        : row.match_date instanceof Date
        ? row.match_date.toISOString().slice(0, 10)
        : String(row.match_date).slice(0, 10),
  }));
  return NextResponse.json({ matches });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Erwartet ein Array von Partien." }, { status: 400 });
  }

  const sql = await getDb();

  const normalized = (body as { id?: unknown; opponentName?: unknown; matchDate?: unknown; note?: unknown }[])
    .filter((m) => m && typeof m.id === "string" && m.id.trim())
    .map((m) => ({
      id: m.id as string,
      opponentName: String(m.opponentName ?? "").trim(),
      matchDate: m.matchDate ? String(m.matchDate) : null,
      note: String(m.note ?? "").trim(),
    }))
    .filter((m) => m.opponentName);

  const existingRows = (await sql`SELECT id FROM matches`) as { id: string }[];
  const existingIds = new Set(existingRows.map((r) => r.id));
  const newIds = new Set(normalized.map((m) => m.id));
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));

  const queries = [
    ...toDelete.map((id) => sql`DELETE FROM matches WHERE id = ${id}`),
    ...normalized.map(
      (m) => sql`
        INSERT INTO matches (id, opponent_name, match_date, note, updated_at)
        VALUES (${m.id}, ${m.opponentName}, ${m.matchDate}, ${m.note}, now())
        ON CONFLICT (id) DO UPDATE SET
          opponent_name = EXCLUDED.opponent_name,
          match_date = EXCLUDED.match_date,
          note = EXCLUDED.note,
          updated_at = now()
      `
    ),
  ];

  if (queries.length > 0) {
    await sql.transaction(queries);
  }

  return NextResponse.json({ ok: true, ids: [...newIds] });
}
