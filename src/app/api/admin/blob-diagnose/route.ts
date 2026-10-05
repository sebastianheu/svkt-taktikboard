import { NextResponse } from "next/server";
import { getVercelOidcToken } from "@vercel/oidc";

// Temporaere Diagnose (Session-geschuetzt): zeigt, ob OIDC fuer den Blob-Store
// in der Function verfuegbar ist. Wird nach der Einrichtung wieder entfernt.
export async function GET() {
  let oidc = "ok";
  try {
    const t = await getVercelOidcToken();
    oidc = t ? `ok (Laenge ${t.length})` : "leer";
  } catch (e) {
    oidc = "FEHLER: " + (e instanceof Error ? e.message : String(e));
  }
  return NextResponse.json({
    BLOB_STORE_ID: process.env.BLOB_STORE_ID ?? null,
    hatBlobReadWriteToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hatVercelOidcTokenEnv: !!process.env.VERCEL_OIDC_TOKEN,
    hatWebhookKey: !!process.env.BLOB_WEBHOOK_PUBLIC_KEY,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    oidc,
  });
}
