// Bundelt den Browser-Client von @vercel/blob zu einer einzelnen Datei, die
// der Editor (eigenstaendige HTML-Seite ohne Bundler) per <script> laedt.
// Ausfuehren mit: npm run build:blob-client
import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
writeFileSync("scripts/.blob-client-entry.mjs", `import { upload } from "@vercel/blob/client";\nwindow.VercelBlobClient = { upload };\n`);
await build({
  entryPoints: ["scripts/.blob-client-entry.mjs"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: "public/vendor/vercel-blob-client.js",
});
console.log("public/vendor/vercel-blob-client.js erzeugt");
