import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const POSITION_CODES = ["", "TW", "AV", "IV", "DM", "ZM", "OM", "FL", "ST"];

type Params = { id: string };

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/players/[id]">
) {
  const { id } = (await ctx.params) as Params;
  const body = await request.json();
  const sql = await getDb();

  const [existing] = await sql`SELECT id FROM players WHERE id = ${id}`;
  if (!existing) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  // Nur die uebergebenen Felder aktualisieren (Startelf-/Verletzt-/
  // Ausblenden-Icons z. B. schicken jeweils nur ihr eigenes Feld).
  const updates: Record<string, unknown> = {};
  if (typeof body.firstName === "string") updates.first_name = body.firstName.trim();
  if (typeof body.lastName === "string") updates.last_name = body.lastName.trim();
  if (typeof body.nickname === "string") updates.nickname = body.nickname.trim();
  if (POSITION_CODES.includes(body.position1)) updates.position1 = body.position1;
  if (POSITION_CODES.includes(body.position2)) updates.position2 = body.position2;
  if ("birthdate" in body) updates.birthdate = body.birthdate ? String(body.birthdate) : null;
  if ("number" in body) {
    updates.number =
      body.number === null || body.number === ""
        ? null
        : Math.max(0, Math.min(99, parseInt(String(body.number), 10) || 0));
  }
  if (typeof body.initials === "string") updates.initials = body.initials.toUpperCase().slice(0, 4);
  if (typeof body.starting === "boolean") updates.starting = body.starting;
  if (typeof body.injured === "boolean") updates.injured = body.injured;
  if (typeof body.hidden === "boolean") updates.hidden = body.hidden;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Keine Aenderungen uebergeben." }, { status: 400 });
  }

  // Startelf-Grenze serverseitig durchsetzen (max. 11), nicht nur im
  // Frontend -- sonst liesse sich das per direktem API-Aufruf umgehen.
  if (updates.starting === true) {
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM players WHERE starting = TRUE AND id != ${id}
    `;
    if (count >= 11) {
      return NextResponse.json(
        { error: "Startelf ist bereits voll (max. 11)." },
        { status: 409 }
      );
    }
  }

  // Dynamisches SET nur fuer die tatsaechlich uebergebenen Felder, per
  // sql.query() mit nummerierten Platzhaltern -- das neon()-Template-Tag
  // selbst erlaubt kein dynamisches SET, aber die Bibliothek stellt dafuer
  // genau diese query()-Methode bereit (siehe @neondatabase/serverless
  // CONFIG.md: "use the query() property ... and numbered placeholders").
  const keys = Object.keys(updates);
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => updates[key]);
  const idParamIndex = keys.length + 1;

  await sql.query(
    `UPDATE players SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${idParamIndex}`,
    [...values, id]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/players/[id]">
) {
  const { id } = (await ctx.params) as Params;
  const sql = await getDb();
  await sql`DELETE FROM players WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
