// Render the five light candidates onto the REAL built site (site/dist) and
// assemble design-previews/light-2.0-candidates.html.
//
// Usage: node render-light.mjs            (after `cd site && npx astro build`)
//
// Each candidate's token block is injected as a [data-theme="light"] override,
// so nothing in site/ changes. Because the two-token accent split does not
// exist in the components yet, a preview pass repaints every element whose
// computed background is the text-safe accent with --accent-fill/--on-accent —
// the same remap the real migration will do by hand. The pass logs the
// selectors it touched so that migration list is not guesswork.

import { createRequire } from "node:module";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATES, cssFor } from "./light-candidates.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../..");
const require = createRequire(path.join(REPO, "site/package.json"));
const { chromium } = require("playwright-core");
const DIST = path.join(REPO, "site/dist");
const OUT_DIR = path.join(REPO, "design-previews/light-2.0-candidates");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".webp": "image/webp" };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  let f = path.join(DIST, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(4398, r));

const PAGES = [["home", "/"], ["changelog", "/changelog"], ["skill", "/skills/oc-app-architect"], ["skills", "/skills"]];
const VIEW = { width: 1280, height: 1500 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem("opchain-consent", "declined"); } catch {} });
const page = await ctx.newPage();

const touched = new Map();
async function shoot(name, url, theme, css, cand) {
  await page.goto("http://localhost:4398" + url, { waitUntil: "networkidle" });
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  if (css) {
    // kill transitions first: otherwise the remap below reads a colour that is
    // still animating from the old --accent and misses the element
    await page.addStyleTag({ content: css + "\n*,*::before,*::after{transition:none!important;animation-duration:0s!important}" });
    await page.waitForTimeout(50);
    const hits = await page.evaluate(({ from, fill, on }) => {
      const norm = (s) => s.replace(/\s/g, "");
      const hex2rgb = (h) => "rgb(" + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",") + ")";
      const target = hex2rgb(from), out = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (norm(cs.backgroundColor) === target) {
          el.style.setProperty("background-color", fill, "important");
          el.style.setProperty("color", on, "important");
          out.push(el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
        }
      }
      return out;
    }, { from: cand.tokens.accent, fill: cand.tokens["accent-fill"], on: cand.tokens["on-accent"] });
    for (const h of hits) touched.set(h, (touched.get(h) || 0) + 1);
  }
  if (name === "changelog") { await page.locator('[role="tab"]:has-text("Coming Next")').click().catch(() => {}); }
  await page.waitForTimeout(200);
  const file = path.join(OUT_DIR, `${cand ? cand.id : "dark"}-${name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 78 });
  return path.relative(path.join(REPO, "design-previews"), file);
}

const shots = { dark: {} };
for (const [n, u] of PAGES) shots.dark[n] = await shoot(n, u, "dark", null, null);
for (const c of CANDIDATES) { shots[c.id] = {}; for (const [n, u] of PAGES) shots[c.id][n] = await shoot(n, u, "light", cssFor(c), c); }
await browser.close(); srv.close();

fs.writeFileSync(path.join(here, "light-fill-remap.txt"), [...touched.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}\t${k}`).join("\n"));

// ── preview page ─────────────────────────────────────────────────────
const sw = (hex, label) => `<span class="sw" title="${label}: ${hex}"><i style="background:${hex}"></i>${label}</span>`;
const strip = (c) => ["bg", "surface", "card", "border", "text", "muted", "accent", "accent-fill", "secondary", "tertiary", "workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator", "success", "danger", "warning", "info", "in-progress"].map((k) => sw(c.tokens[k], k)).join("");
const pills = (c) => Object.keys({ workflow: 1, "tri-agent": 1, "audit-gate": 1, specialist: 1, advisor: 1, orchestrator: 1 }).map((r) => `<span class="pill" style="color:${c.tokens[r]};background:${c.tokens[r + "-pill"]};border-color:${c.tokens[r]}">${r}</span>`).join("");
const fails = (c) => c.report.filter((r) => !r.ok);
const card = (c) => `
<section class="cand" id="${c.id}">
  <header><h2>${c.id} · ${c.name}</h2><p>${c.ground} · ${c.accent} · ${c.report.length} contrast checks, ${fails(c).length ? `<b class="bad">${fails(c).length} below floor</b>` : "<b class='ok'>all clear</b>"}</p>
  <div class="strip">${strip(c)}</div>
  <div class="strip">${pills(c)}<button class="btn" style="background:${c.tokens["accent-fill"]};color:${c.tokens["on-accent"]}">install</button><span class="pill" style="color:${c.tokens.accent};border-color:${c.tokens.accent};background:${c.tokens["accent-dim"]}">v2.0 · next</span></div></header>
  <div class="shots">${PAGES.map(([n]) => `<figure><img loading="lazy" src="${shots[c.id][n]}" alt="${c.id} ${n}"><figcaption>${n}</figcaption></figure>`).join("")}</div>
</section>`;

const html = `<!doctype html><meta charset="utf-8"><title>opchain 2.0 · light-mode candidates</title>
<style>
  body{margin:0;background:#12191f;color:#d4e2ef;font:14px/1.5 system-ui,sans-serif}
  .top{position:sticky;top:0;background:#12191fee;backdrop-filter:blur(8px);border-bottom:1px solid #2a3540;padding:.7rem 1.2rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap;z-index:5}
  .top a{color:#2be179;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px}
  h1{font-size:15px;margin:0 1rem 0 0}
  .cand{padding:1.4rem 1.2rem 2rem;border-bottom:1px solid #2a3540}
  .cand header p{margin:.2rem 0 .6rem;color:#a5bcd1}
  h2{margin:0;font-size:18px}
  .strip{display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;margin:.35rem 0}
  .sw{display:inline-flex;align-items:center;gap:.3rem;font:11px ui-monospace,monospace;color:#a5bcd1}
  .sw i{width:18px;height:18px;border-radius:4px;border:1px solid #ffffff22;display:inline-block}
  .pill{font:600 10px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;border:1px solid;border-radius:999px;padding:2px 8px}
  .btn{font:600 11px ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;border:0;border-radius:999px;padding:6px 14px}
  .ok{color:#2be179}.bad{color:#fb5998}
  .shots{display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem;margin-top:.8rem}
  figure{margin:0}figure img{width:100%;display:block;border-radius:6px;border:1px solid #2a3540}
  figcaption{font:11px ui-monospace,monospace;color:#7d91a4;margin-top:.3rem}
  @media (max-width:1100px){.shots{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="top"><h1>opchain 2.0 · light-mode candidates</h1>${CANDIDATES.map((c) => `<a href="#${c.id}">${c.id} ${c.name}</a>`).join("")}<a href="#dark">dark reference</a></div>
${CANDIDATES.map(card).join("")}
<section class="cand" id="dark"><header><h2>Dark reference · what ships today</h2><p>Same four pages on the decided dark tokens.</p></header>
  <div class="shots">${PAGES.map(([n]) => `<figure><img loading="lazy" src="${shots.dark[n]}" alt="dark ${n}"><figcaption>${n}</figcaption></figure>`).join("")}</div></section>`;
fs.writeFileSync(path.join(REPO, "design-previews/light-2.0-candidates.html"), html);
console.log("wrote design-previews/light-2.0-candidates.html;", touched.size, "fill selectors remapped (see light-fill-remap.txt)");
