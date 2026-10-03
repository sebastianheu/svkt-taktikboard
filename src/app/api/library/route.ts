import { getDb } from "@/lib/db";

// Bibliothek (gespeicherte Taktiken/Situationen, optional inkl. GIF). Jeder
// Eintrag wird 1:1 als JSONB-Blob abgelegt (siehe src/lib/db.ts). Geschrieben
// wird einzeln pro Eintrag ueber /api/library/[id] -- ein Bulk-Replace mit
// allen GIFs in einem Request ueberschritt das Request-Limit von Vercel
// (~4,5 MB) und schlug still fehl, ausserdem konnte ein fehlgeschlagenes
// Laden beim Bulk-Replace die ganze Bibliothek loeschen.
//
// Die Antwort wird gestreamt, weil Vercel Antworten ueber ~4,5 MB sonst
// ablehnt -- mit vielen GIFs wird die Bibliothek schnell so gross.
export async function GET() {
  const sql = await getDb();
  const rows = (await sql`SELECT data FROM library_entries ORDER BY updated_at ASC`) as {
    data: unknown;
  }[];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"entries":['));
      rows.forEach((r, i) => {
        controller.enqueue(encoder.encode((i ? "," : "") + JSON.stringify(r.data)));
      });
      controller.enqueue(encoder.encode("]}"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
