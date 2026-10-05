import { del } from "@vercel/blob";

// Loescht ein GIF im Blob-Store (kostenlos, zaehlt nicht als Advanced
// Operation). Nur Blob-URLs und nur wenn der Store konfiguriert ist;
// Fehler duerfen das Speichern/Loeschen eines Eintrags nie blockieren.
export async function deleteBlobQuietly(url: unknown): Promise<void> {
  if (typeof url !== "string" || !process.env.BLOB_READ_WRITE_TOKEN) return;
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) return;
  try {
    await del(url);
  } catch (e) {
    console.error("Blob konnte nicht geloescht werden", url, e);
  }
}

export function gifUrlOf(data: unknown): string | null {
  const gif = (data as { gif?: { url?: unknown } } | null)?.gif;
  return gif && typeof gif.url === "string" ? gif.url : null;
}
