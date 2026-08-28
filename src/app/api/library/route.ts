import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Bibliothek (gespeicherte Taktiken/Situationen, optional inkl. GIF) --
// bewusst als Bulk-Replace, spiegelt persistLibrary() aus dem alten
// Taktiktafel-Editor, das dort auch immer das komplette Array in einem
// Rutsch geschrieben hat. Jeder Eintrag wird 1:1 als JSONB-Blob abgelegt
// (siehe src/lib/db.ts) -- keine eigene Spaltenmodellierung noetig, da der
// Alt-Code die Form der Objekte selbst bestimmt (elements, frames, gif, ...).
export async function GET() {
  const sql = await getDb();
  const rows = (await sql`SELECT data FROM library_entries ORDER BY updated_at ASC`) as {
    data: unknown;
  }[];
  return NextResponse.json({ entries: rows.map((r) => r.data) });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Erwartet ein Array von Bibliothekseintraegen." }, { status: 400 });
  }

  const sql = await getDb();

  const normalized = (body as Record<string, unknown>[]).filter(
    (e) => e && typeof e.id === "string" && e.id.trim()
  );

  const existingRows = (await sql`SELECT id FROM library_entries`) as { id: string }[];
  const existingIds = new Set(existingRows.map((r) => r.id));
  const newIds = new Set(normalized.map((e) => e.id as string));
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));

  const queries = [
    ...toDelete.map((id) => sql`DELETE FROM library_entries WHERE id = ${id}`),
    ...normalized.map(
      (e) => sql`
        INSERT INTO library_entries (id, data, updated_at)
        VALUES (${e.id as string}, ${JSON.stringify(e)}::jsonb, now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `
    ),
  ];

  if (queries.length > 0) {
    await sql.transaction(queries);
  }

  return NextResponse.json({ ok: true });
}
