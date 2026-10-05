// Erzeugt src/app/taktik-app/editorHtmlBase64.ts aus editor.source.html und
// prueft per Roundtrip, dass beide Dateien uebereinstimmen.
// Ausfuehren mit: npm run build:editor
import { readFileSync, writeFileSync } from "node:fs";

const src = "src/app/taktik-app/editor.source.html";
const dst = "src/app/taktik-app/editorHtmlBase64.ts";
const bytes = readFileSync(src);
writeFileSync(dst, `export const editorHtmlBase64 = "${bytes.toString("base64")}";\n`);
const match = /editorHtmlBase64 = "([^"]+)"/.exec(readFileSync(dst, "utf8"));
if (!match || !Buffer.from(match[1], "base64").equals(bytes)) {
  console.error("ROUNDTRIP FEHLGESCHLAGEN");
  process.exit(1);
}
console.log(`editorHtmlBase64.ts erzeugt (${bytes.length} Bytes), Roundtrip OK`);
