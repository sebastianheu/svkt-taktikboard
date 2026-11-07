import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { deleteBlobQuietly, gifUrlOf } from "@/lib/blob";

type Params = { id: string };

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/library/[id]">) {
  const { id } = (await ctx.params) as Params;
  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body) || body.id !== id) {
    return NextResponse.json({ error: "Ungueltiger Bibliothekseintrag." }, { status: 400 });
  }
  const sql = await getDb();
  await sql`
    INSERT INTO library_entries (id, data, updated_at)
    VALUES (${id}, ${JSON.stringify(body)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
  // Ersetzte GIFs werden hier bewusst NICHT geloescht: mit mehreren offenen
  // Tabs/Geraeten kann ein veralteter Stand zurueckgeschrieben werden und
  // wuerde sonst das aktuelle (oder per URL noch referenzierte) GIF vernichten
  // -- das hat Vorschauen kaputt gemacht. Geloescht wird nur mit dem Eintrag.
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/library/[id]">) {
  const { id } = (await ctx.params) as Params;
  const sql = await getDb();
  const [previous] = (await sql`SELECT data FROM library_entries WHERE id = ${id}`) as {
    data: unknown;
  }[];
  await sql`DELETE FROM library_entries WHERE id = ${id}`;
  // Kopien eines Eintrags (Duplizieren, "Vorlage anwenden") teilen sich die
  // GIF-URL -- das Blob nur loeschen, wenn kein anderer Eintrag es nutzt.
  const url = previous ? gifUrlOf(previous.data) : null;
  if (url) {
    const [stillUsed] = await sql`
      SELECT 1 AS used FROM library_entries WHERE data->'gif'->>'url' = ${url} LIMIT 1
    `;
    if (!stillUsed) await deleteBlobQuietly(url);
  }
  return NextResponse.json({ ok: true });
}
