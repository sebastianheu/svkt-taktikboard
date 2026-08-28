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
export async function GET() {
  const html = Buffer.from(editorHtmlBase64, "base64").toString("utf-8");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
