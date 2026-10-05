// Bundelt den Browser-Client von @vercel/blob zu einer einzelnen Datei, die
// der Editor (eigenstaendige HTML-Seite ohne Bundler) per <script> laedt.
// Ausfuehren mit: npm run build:blob-client
import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
writeFileSync("scripts/.blob-client-entry.mjs", `import { uploadPresigned } from "@vercel/blob/client";\nwindow.VercelBlobClient = { upload: uploadPresigned };\n`);
await build({
  entryPoints: ["scripts/.blob-client-entry.mjs"],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: "public/vendor/vercel-blob-client.js",
});
rmSync("scripts/.blob-client-entry.mjs", { force: true });
console.log("public/vendor/vercel-blob-client.js erzeugt");
