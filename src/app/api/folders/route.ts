import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Bibliotheks-Ordner -- gleiches Bulk-Replace-Muster wie /api/library und
// /api/players/bulk, spiegelt persistFolders() aus dem alten Editor
// (Ordner sind dort nur {id, name}, siehe page.html).
export async function GET() {
  const sql = await getDb();
  const rows = (await sql`SELECT id, name FROM library_folders ORDER BY created_at ASC`) as {
    id: string;
    name: string;
  }[];
  return NextResponse.json({ folders: rows });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Erwartet ein Array von Ordnern." }, { status: 400 });
  }

  const sql = await getDb();

  const normalized = (body as { id?: unknown; name?: unknown }[])
    .filter((f) => f && typeof f.id === "string" && f.id.trim())
    .map((f) => ({ id: f.id as string, name: String(f.name ?? "").trim() }));

  const existingRows = (await sql`SELECT id FROM library_folders`) as { id: string }[];
  const existingIds = new Set(existingRows.map((r) => r.id));
  const newIds = new Set(normalized.map((f) => f.id));
  const toDelete = [...existingIds].filter((id) => !newIds.has(id));

  const queries = [
    ...toDelete.map((id) => sql`DELETE FROM library_folders WHERE id = ${id}`),
    ...normalized.map(
      (f) => sql`
        INSERT INTO library_folders (id, name, updated_at)
        VALUES (${f.id}, ${f.name}, now())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
      `
    ),
  ];

  if (queries.length > 0) {
    await sql.transaction(queries);
  }

  return NextResponse.json({ ok: true });
}
