import { NextRequest, NextResponse } from "next/server";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

// Client Upload fuer GIF-Vorschauen: der Browser laedt die Datei direkt in
// den Blob-Store, diese Route stellt nur eine kurzlebige, eng begrenzte
// Upload-URL aus -- die GIF-Daten laufen nicht ueber die App (kein Fast
// Origin Transfer). Der Store nutzt Vercel-OIDC statt eines
// BLOB_READ_WRITE_TOKEN (Variablen BLOB_STORE_ID + automatisches
// VERCEL_OIDC_TOKEN), daher der "presigned"-Ablauf.
// Bewusst ohne onUploadCompleted: der Editor bekommt das Ergebnis direkt
// vom Upload und traegt die URL selbst in den Bibliothekseintrag ein, so
// ist kein oeffentlich erreichbarer Callback noetig.
const MAX_GIF_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await isValidSessionToken(token))) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadPresignedBody;
  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!/^gifs\/[A-Za-z0-9_-]+\.gif$/.test(pathname)) {
          throw new Error("Ungueltiger Dateipfad.");
        }
        const signed = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ["image/gif"],
          maximumSizeInBytes: MAX_GIF_BYTES,
        });
        return { token: signed, urlOptions: { addRandomSuffix: true } };
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
