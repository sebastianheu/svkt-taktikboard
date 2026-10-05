import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

// Temporaere Diagnose (Session-geschuetzt), wird nach dem Test entfernt:
// prueft serverseitig put() und del() ueber OIDC und raeumt eine Test-Datei.
export async function POST(request: NextRequest) {
  const { deleteUrl } = await request.json().catch(() => ({}));
  const out: Record<string, unknown> = {};
  try {
    const gif = Buffer.from("R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");
    const blob = await put("gifs/server-test.gif", gif, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/gif",
    });
    out.put = blob.url;
    await del(blob.url);
    out.delServerTest = "ok";
    if (typeof deleteUrl === "string" && /\/gifs\/test-upload-[A-Za-z0-9]+\.gif$/.test(deleteUrl)) {
      await del(deleteUrl);
      out.delClientTest = "ok";
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json(out);
}
