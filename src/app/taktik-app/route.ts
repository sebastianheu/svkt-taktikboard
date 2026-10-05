import { createHash } from "node:crypto";
import { editorHtmlBase64 } from "./editorHtmlBase64";

// Liefert den (auf Server-Persistenz umgestellten) Taktiktafel-Editor als
// eigenstaendiges HTML-Dokument aus, eingebettet per iframe unter /taktik.
// Bewusst KEIN Pfad unter public/ (dort wuerde die Datei ein Datei-Suffix
// tragen und damit vom Proxy-Login-Schutz ausgenommen sein, siehe
// src/proxy.ts matcher "..(?!... .*\\..*).*" -- Pfade mit Punkt werden dort
// bewusst uebersprungen). Als Route Handler ohne Endung ist die Seite
// weiterhin durch den Zugangscode-Login geschuetzt.
//
// Der Inhalt liegt Base64-kodiert in editorHtmlBase64.ts (statt als rohes
// .html unter fs.readFileSync gelesen zu werden), damit Vercels Output File
// Tracing die Datei garantiert in die Serverless-Function-Bundle aufnimmt --
// ein regulaerer Modul-Import ist dafuer robuster als ein zur Build-Zeit
// nicht immer zuverlaessig erkannter dynamischer Dateizugriff.
//
// Caching: Das HTML ist ~400 KB gross. Mit ETag + "private, no-cache" prueft
// der Browser bei jedem Aufruf nur kurz nach (If-None-Match) und bekommt bei
// unveraendertem Inhalt ein 304 ohne Body. "private" verhindert, dass die
// geschuetzte Seite im CDN-Cache landet; "no-cache" stellt sicher, dass nach
// einem neuen Deployment sofort die neue Version geladen wird. Der
// Login-Schutz (src/proxy.ts) laeuft davor unveraendert.
const html = Buffer.from(editorHtmlBase64, "base64").toString("utf-8");
const etag = `"${createHash("sha256").update(html).digest("hex").slice(0, 32)}"`;

export async function GET(request: Request) {
  const headers = {
    "cache-control": "private, no-cache",
    etag,
  };
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((t) => t.trim().replace(/^W\//, "") === etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(html, {
    headers: { ...headers, "content-type": "text/html; charset=utf-8" },
  });
}
