// lockups.mjs — a small preview of three "opchain 2.0" lockup treatments on
// the decided Slate & Emerald tokens, at the three sizes the mark ships at
// (header 28px, homepage hero 88px, footer 15px), dark and light side by side.
// Writes design-previews/lockup-2.0-options.html. Read-only on everything else.
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const T = JSON.parse(fs.readFileSync(path.join(HERE, "tokens.json"), "utf8"));
const S = T.sets.find((s) => s.id === 34);
const fonts = JSON.parse(fs.readFileSync(path.join(HERE, "fonts.json"), "utf8"));
const fontFace = fonts.map((f) => `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(data:font/woff2;base64,${f.b64}) format('woff2');}`).join("\n");
const vars = (m) => Object.entries(m).map(([k, v]) => `--${k}:${v}`).join(";");

// The production icon, with an optional "2" cut into the filled node (option C).
const icon = (size, variant) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
<line x1="3" y1="16" x2="29" y2="16" stroke="var(--logo-spine)" stroke-width="1"/>
<rect x="3" y="10" width="7" height="12" rx="1.5" fill="none" stroke="var(--logo-stroke)" stroke-width="1.2"/>
<rect x="12" y="10" width="7" height="12" rx="1.5" fill="none" stroke="var(--logo-stroke)" stroke-width="1.2"/>
<rect x="21" y="10" width="8" height="12" rx="1.5" fill="var(--logo-filled)"/>
<circle cx="6.5" cy="16" r="1.6" fill="var(--logo-stroke)"/><circle cx="15.5" cy="16" r="1.6" fill="var(--logo-stroke)"/>
${variant === "C"
  ? `<text x="25" y="19.6" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="10.5" fill="var(--logo-dot-dark)">2</text>`
  : `<circle cx="25" cy="16" r="1.6" fill="var(--logo-dot-dark)"/>`}
</svg>`;

// Three treatments, each rendered at header / hero / footer scale.
const mark = (variant, ctx) => {
  const sz = { header: 28, hero: 88, footer: 22 }[ctx];
  const cls = `mark mark--${ctx}`;
  if (variant === "A") return `<span class="${cls}">${icon(sz, "A")}<span class="word">opchain</span><span class="badge">2.0</span></span>`;
  if (variant === "B") return `<span class="${cls}">${icon(sz, "B")}<span class="word">opchain<span class="num"> 2.0</span></span></span>`;
  return `<span class="${cls}">${icon(sz, "C")}<span class="word">opchain</span></span>`;
};

const header = (v) => `
<div class="hdr"><div class="hdr-in">
  <a class="brand" href="#">${mark(v, "header")}</a>
  <nav class="nav"><span>Product ▾</span><span>Pipeline <b class="tool">TOOL</b> ▾</span><span>Resources <b class="new">NEW</b> ▾</span><span class="pill">install</span></nav>
  <div class="right"><span class="search">⌕ Search pages, skills, glossary… <kbd>⌘K</kbd></span><span class="chip">v2.0 <i></i></span><span>feedback</span></div>
</div></div>`;
const hero = (v) => `<div class="hero"><span class="eyebrow">skill ecosystem</span>${mark(v, "hero")}<p class="claim">skills that ship.</p></div>`;
const footer = (v) => `<div class="ftr"><div>${mark(v, "footer")}<p class="tag">skills that ship.</p></div><div class="cols"><b>product</b><span>Introduction</span><span>Architecture</span></div><div class="cols"><b>explore</b><span>Pipeline Builder</span><span>Blog</span></div></div>`;

const OPTIONS = [
  ["A", "Wordmark + '2.0' badge", "The mark is untouched; a compact pill in the accent sits after it. The number reads as a version tag, the way a release chip does. Least disruptive to the silhouette everywhere it appears."],
  ["B", "'opchain 2.0' as one wordmark", "The number is set in the same face, weight and 0.22em tracking as the wordmark, as though the name were always 'opchain 2.0'. Bolder, and it changes the mark's width everywhere — note the header width."],
  ["C", "Icon carries the 2.0", "The wordmark stays 'opchain'; the filled third node gains a '2' where the dark dot was. Subtle and self-contained, but the glyph is 10px tall at header size — check whether it reads at 28px before choosing it."],
];

const panel = (v, mode) => `<div class="site" data-mode="${mode}" style="${vars(S.modes[mode])}">${header(v)}${hero(v)}${footer(v)}</div>`;

const css = `
${fontFace}
:root{--font:'Outfit',system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box}body{margin:0;background:#0b0d10;color:#dfe6ec;font:14px/1.5 var(--font);-webkit-font-smoothing:antialiased}
.top{max-width:1360px;margin:0 auto;padding:1.4rem 1.5rem .6rem}
.top h1{font:600 20px var(--font);margin:0 0 .25rem;letter-spacing:-.01em}.top p{margin:0;color:#8a96a3;font-size:12.5px;max-width:78ch}
.opt{max-width:1360px;margin:1.4rem auto;padding:0 1.5rem}
.opt-h{display:flex;align-items:baseline;gap:.8rem;margin-bottom:.6rem}
.opt-h .k{font:600 11px var(--mono);letter-spacing:.14em;color:#2be179;border:1px solid #2be179;border-radius:999px;padding:2px 9px}
.opt-h h2{font:600 17px var(--font);margin:0}.opt-h p{margin:0;color:#8a96a3;font-size:12.5px;flex:1 1 100%}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
.site{background:var(--bg);color:var(--text);border:.5px solid var(--border);border-radius:8px;overflow:hidden}
.hdr{background:var(--ribbon);border-bottom:.5px solid var(--ribbon-edge);box-shadow:0 8px 24px -8px var(--glow)}
.hdr-in{height:56px;display:flex;align-items:center;gap:1rem;padding:0 1.1rem;font-size:12px}
.brand{color:var(--text);text-decoration:none;display:inline-flex;align-items:center}
.nav{display:flex;gap:.9rem;color:var(--muted);align-items:center;white-space:nowrap}.nav b{font:600 8px var(--mono);letter-spacing:.08em;padding:1px 4px;border-radius:3px}
.nav .tool{color:var(--secondary);border:.5px solid var(--secondary)}.nav .new{background:var(--accent);color:var(--on-accent)}
.nav .pill{color:var(--accent);border:.5px solid var(--accent);border-radius:999px;padding:3px 10px}
.right{margin-left:auto;display:flex;gap:.6rem;align-items:center;color:var(--muted);font-size:11px}
.search{white-space:nowrap;background:var(--surface);border:.5px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--subtle)}.search kbd{font:9px var(--mono);border:.5px solid var(--border);border-radius:3px;padding:0 3px;margin-left:4px}
.chip{font:500 10px var(--mono);border:.5px solid var(--border);border-radius:999px;padding:3px 8px;display:inline-flex;gap:5px;align-items:center}.chip i{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 0 3px var(--success-dim)}
.hero{display:flex;flex-direction:column;align-items:center;gap:.7rem;padding:2rem 1rem 1.6rem;text-align:center}
.eyebrow{font:500 10px var(--mono);letter-spacing:.15em;text-transform:uppercase;color:var(--accent);display:inline-flex;align-items:center;gap:8px}.eyebrow::before{content:"";width:18px;height:1px;background:var(--accent)}
.claim{margin:0;font:500 22px var(--font);letter-spacing:-.015em}
.ftr{border-top:.5px solid var(--border);padding:1.2rem 1.4rem;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1rem;font-size:12px;color:var(--muted)}
.ftr .tag{margin:.3rem 0 0}.cols{display:flex;flex-direction:column;gap:.25rem}.cols b{font:500 9px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--subtle)}
/* the mark itself */
.mark{display:inline-flex;align-items:center;gap:.55rem;white-space:nowrap}
.word{font:600 15px var(--font);letter-spacing:.22em;text-transform:lowercase;color:var(--text)}
.mark--hero{gap:1.1rem}.mark--hero .word{font-size:clamp(2.25rem,7vw,3.75rem)}
.mark--footer .word{font-size:15px}
.num{font-weight:600;letter-spacing:.22em}          /* option B: identical to the wordmark */
.badge{font:600 10px var(--mono);letter-spacing:.06em;background:var(--accent);color:var(--on-accent);border-radius:999px;padding:2px 7px;line-height:1.5;transform:translateY(-1px)}
.mark--hero .badge{font-size:15px;padding:4px 12px;transform:translateY(-6px)}
.mark--footer .badge{font-size:9px;padding:1px 6px}
.strip{max-width:1360px;margin:1.4rem auto 3rem;padding:1rem 1.5rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem}
.strip .cell{background:var(--bg);color:var(--text);border:.5px solid var(--border);border-radius:8px;padding:1rem 1.2rem;display:flex;flex-direction:column;gap:.9rem}
.strip .lbl{font:500 9.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--subtle)}
.zoom{transform:scale(2.2);transform-origin:left center;display:inline-block;margin:.6rem 0 .6rem}
`;

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>opchain 2.0 — lockup options</title><style>${css}</style></head><body>
<div class="top"><h1>opchain 2.0 — lockup options</h1><p>Three treatments for the branded mark on the decided Slate &amp; Emerald tokens, each at the three sizes it ships at: header (28px icon, 15px wordmark), homepage hero (88px), footer (15px). Dark on the left, light on the right. Plain-text mentions of opchain in copy are unaffected by this choice.</p></div>
${OPTIONS.map(([v, title, why]) => `<section class="opt"><div class="opt-h"><span class="k">OPTION ${v}</span><h2>${title}</h2><p>${why}</p></div><div class="pair">${panel(v, "dark")}${panel(v, "light")}</div></section>`).join("")}
<section class="opt"><div class="opt-h"><span class="k">SIDE BY SIDE</span><h2>Header scale, 2.2× zoom</h2><p>The header is where the mark is smallest and seen most; this is the comparison that matters. Option C's glyph is the thing to judge here.</p></div></section>
<div class="strip" style="${vars(S.modes.dark)}">${OPTIONS.map(([v, title]) => `<div class="cell"><span class="lbl">option ${v} · ${title}</span><span class="zoom">${mark(v, "header")}</span><span class="lbl">actual size</span>${mark(v, "header")}</div>`).join("")}</div>
<div class="strip" style="${vars(S.modes.light)};margin-top:-2rem">${OPTIONS.map(([v, title]) => `<div class="cell"><span class="lbl">option ${v} · light</span><span class="zoom">${mark(v, "header")}</span><span class="lbl">actual size</span>${mark(v, "header")}</div>`).join("")}</div>
</body></html>`;
const out = path.resolve(HERE, "../lockup-2.0-options.html");
fs.writeFileSync(out, html);
console.log("wrote", out, (html.length / 1024).toFixed(0) + " KB");
