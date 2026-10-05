import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getDb } from "@/lib/db";

// Einmalige Migration: GIFs, die noch als Base64-Data-URL im JSONB-Eintrag
// liegen, werden als Datei in den Blob-Store hochgeladen und der Eintrag auf
// die URL umgestellt. Durch das Session-Login (src/proxy.ts) geschuetzt.
//
//   GET  /api/admin/migrate-gifs            -> Anzahl/Groesse der betroffenen Eintraege
//   POST /api/admin/migrate-gifs {"confirm":true} -> Migration ausfuehren
//
// Pro Eintrag wird die Zeile erst aktualisiert, nachdem der Upload
// erfolgreich war; fehlgeschlagene Eintraege bleiben unveraendert.
type Row = { id: string; data: Record<string, unknown> & { gif?: Record<string, unknown> } };

async function loadAffected() {
  const sql = await getDb();
  const rows = (await sql`
    SELECT id, data FROM library_entries WHERE data->'gif'->>'dataUrl' IS NOT NULL
  `) as Row[];
  return { sql, rows };
}

export async function GET() {
  const { rows } = await loadAffected();
  return NextResponse.json({
    hinweis: "Die Migration aendert ausschliesslich das Feld gif; Vorlagen (isTemplate), Elemente und Frames bleiben unveraendert.",
    vorlagenInBetroffenen: rows.filter((r) => (r.data as { isTemplate?: boolean }).isTemplate).length,
    betroffeneEintraege: rows.length,
    ungefaehreGroesseMB: +(
      rows.reduce((sum, r) => sum + String(r.data.gif?.dataUrl ?? "").length, 0) /
      1024 /
      1024
    ).toFixed(2),
    eintraege: rows.map((r) => ({ id: r.id, name: r.data.name })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Bestaetigung fehlt: {"confirm":true} senden.' },
      { status: 400 }
    );
  }
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return NextResponse.json({ error: "Blob-Store nicht konfiguriert (BLOB_STORE_ID oder BLOB_READ_WRITE_TOKEN fehlt)." }, { status: 500 });
  }
  const { sql, rows } = await loadAffected();
  const results: { id: string; ok: boolean; url?: string; error?: string }[] = [];
  for (const row of rows) {
    try {
      const dataUrl = String(row.data.gif?.dataUrl ?? "");
      const match = /^data:image\/gif;base64,(.+)$/.exec(dataUrl);
      if (!match) throw new Error("Keine GIF-Data-URL.");
      const buffer = Buffer.from(match[1], "base64");
      const blob = await put(`gifs/${row.id}.gif`, buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: "image/gif",
      });
      const { dataUrl: _removed, ...restGif } = row.data.gif ?? {};
      void _removed;
      const newGif = { ...restGif, url: blob.url, pathname: blob.pathname, bytes: buffer.length };
      // Nur das Feld "gif" ersetzen (jsonb_set): alle anderen Felder des
      // Eintrags (Elemente, Frames, isTemplate, ...) bleiben unangetastet,
      // auch wenn der Eintrag zwischenzeitlich bearbeitet wurde.
      await sql`
        UPDATE library_entries
        SET data = jsonb_set(data, '{gif}', ${JSON.stringify(newGif)}::jsonb), updated_at = now()
        WHERE id = ${row.id} AND data->'gif'->>'dataUrl' IS NOT NULL
      `;
      results.push({ id: row.id, ok: true, url: blob.url });
    } catch (e) {
      results.push({ id: row.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({
    migriert: results.filter((r) => r.ok).length,
    fehlgeschlagen: results.filter((r) => !r.ok).length,
    results,
  });
}
