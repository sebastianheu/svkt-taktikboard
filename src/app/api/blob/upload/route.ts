import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

// Client Upload fuer GIF-Vorschauen: der Browser laedt die Datei direkt in
// den Blob-Store, diese Route stellt nur das kurzlebige Upload-Token aus --
// die GIF-Daten laufen nicht ueber die App (kein Fast Origin Transfer).
// Bewusst ohne onUploadCompleted: der Editor bekommt das Ergebnis direkt
// vom Upload und traegt die URL selbst in den Bibliothekseintrag ein, so
// ist kein oeffentlich erreichbarer Callback noetig (funktioniert auch lokal).
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSessionToken(token))) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^gifs\/[A-Za-z0-9_-]+\.gif$/.test(pathname)) {
          throw new Error("Ungueltiger Dateipfad.");
        }
        return {
          allowedContentTypes: ["image/gif"],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload fehlgeschlagen." },
      { status: 400 }
    );
  }
}
