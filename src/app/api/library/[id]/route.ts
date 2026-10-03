import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/library/[id]">) {
  const { id } = (await ctx.params) as Params;
  const sql = await getDb();
  await sql`DELETE FROM library_entries WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
