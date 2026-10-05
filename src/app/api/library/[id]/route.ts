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
  const [previous] = (await sql`SELECT data FROM library_entries WHERE id = ${id}`) as {
    data: unknown;
  }[];
  await sql`
    INSERT INTO library_entries (id, data, updated_at)
    VALUES (${id}, ${JSON.stringify(body)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
  // Wurde das GIF ersetzt, das alte Blob loeschen (Speicherplatz, 1 GB im
  // Hobby-Plan) -- erst nach erfolgreichem Speichern.
  const oldUrl = previous ? gifUrlOf(previous.data) : null;
  if (oldUrl && oldUrl !== gifUrlOf(body)) await deleteBlobQuietly(oldUrl);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/library/[id]">) {
  const { id } = (await ctx.params) as Params;
  const sql = await getDb();
  const [previous] = (await sql`SELECT data FROM library_entries WHERE id = ${id}`) as {
    data: unknown;
  }[];
  await sql`DELETE FROM library_entries WHERE id = ${id}`;
  if (previous) await deleteBlobQuietly(gifUrlOf(previous.data));
  return NextResponse.json({ ok: true });
}
