// fetch-fonts.mjs — download the two webfonts once and cache them as base64 so
// the preview is fully self-contained. A shared HTML artifact often ends up in
// a sandboxed frame or a strict-CSP preview pane, where an external stylesheet
// is refused and logs a console error on every load. Embedding removes the
// network dependency entirely.
//
// Outfit and JetBrains Mono are both SIL Open Font License, which permits
// embedding. Run this once; build-preview.mjs picks up fonts.json if present
// and falls back to the CDN <link> tags if it is missing.
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
// A modern UA is required or Google serves legacy ttf instead of woff2.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SPECS = [
  { family: "Outfit", range: "300 700", url: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" },
  { family: "JetBrains Mono", range: "400 700", url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" },
];
const faces = [];
let seenDupes = 0;
for (const spec of SPECS) {
  const css = await (await fetch(spec.url, { headers: { "User-Agent": UA } })).text();
  // keep only the latin block — latin-ext/cyrillic/greek would triple the size
  const blocks = css.split("@font-face").slice(1).map((b) => "@font-face" + b);
  for (const b of blocks) {
    if (!/unicode-range:[^;]*U\+0000-00FF/.test(b)) continue;
    const url = b.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const weight = b.match(/font-weight:\s*([^;]+);/)?.[1]?.trim();
    const style = b.match(/font-style:\s*([^;]+);/)?.[1]?.trim() || "normal";
    if (!url) continue;
    const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
    const b64 = buf.toString("base64");
    // Both families are variable fonts: Google returns ONE file covering every
    // weight, so all the per-weight requests are byte-identical. Keep one and
    // declare a weight range, or the file carries the same 31 KB five times.
    if (faces.some((f) => f.b64 === b64)) { seenDupes++; continue; }
    faces.push({ family: spec.family, weight: spec.range, style, b64, bytes: buf.length });
    console.log(`  ${spec.family} — ${(buf.length / 1024).toFixed(1)} KB (variable, ${spec.range})`);
  }
}
if (seenDupes) console.log(`  deduped ${seenDupes} byte-identical face(s)`);
fs.writeFileSync(path.join(HERE, "fonts.json"), JSON.stringify(faces));
console.log(`wrote fonts.json — ${faces.length} faces, ${(faces.reduce((a, f) => a + f.bytes, 0) / 1024).toFixed(0)} KB raw`);
