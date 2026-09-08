#!/usr/bin/env node
/**
 * One-shot transform: give the desktop architecture diagram a light treatment.
 *
 * The diagram (site/src/pages/architecture.astro) was drawn dark-only: ~880
 * SVG presentation attributes, ~105 inline style="" fragments and ~75 raw
 * colour literals inside <style> all name Forge hexes directly, so the page
 * ignored [data-theme="light"]. This script rewrites the file ONCE so that:
 *
 *   1. every raw hex / rgba literal inside the <style> rules (after the
 *      .arch-v2 variable block) becomes var(--x) or
 *      color-mix(in srgb, var(--x) N%, transparent);
 *   2. an attribute-remap block maps every <elem attr="#hex"> /
 *      <elem attr="rgba(...)"> to the same vars (CSS beats presentation
 *      attributes, so the SVG markup is untouched);
 *   3. an inline-style remap block overrides the style="" fragments with
 *      !important rules keyed on [style*="..."];
 *   4. a [data-theme="light"] .arch-v2 block re-points the Forge variables at
 *      the 2.0 light tokens (candidate L3), read live from tokens.css.
 *
 * Dark output is byte-identical in the browser: the vars resolve to the same
 * hexes they replace. Run from the repo root; idempotent (guarded by a marker).
 */
import fs from "node:fs";

const FILE = "site/src/pages/architecture.astro";
const MARK = "/* ══ light treatment (scripts/arch-light-treatment.mjs) ══ */";
let src = fs.readFileSync(FILE, "utf8");
if (src.includes(MARK)) { console.log("already applied"); process.exit(0); }

// ── 2.0 light tokens (L3), straight from the sheet ───────────────────
const tokens = fs.readFileSync("site/src/styles/tokens.css", "utf8");
const lightBlock = tokens.slice(tokens.indexOf('[data-theme="light"] {'));
const L = (name) => { const m = lightBlock.match(new RegExp(`--${name}:\\s*([^;]+);`)); if (!m) throw new Error("no light token " + name); return m[1].trim().split("/*")[0].trim(); };

// ── Forge var ↔ dark hex map (from the .arch-v2 block) + light values ─
// name → [dark hex, light value]
const VARS = {
  obsidian:  ["#12191f", L("card")],       // node bodies → white cards
  forge:     ["#162028", L("surface")],
  slag:      ["#445461", L("border")],
  sand:      ["#a5bcd1", L("muted")],
  linen:     ["#d4e2ef", L("text")],
  parchment: ["#e7eef5", L("text")],
  subtle:    ["#7d91a4", L("subtle")],
  ember:     ["#2be179", L("accent")],
  char:      ["#13bd62", L("accent-hover")],
  success:   ["#02fdff", L("specialist")],  // archetype teal = specialist role
  warning:   ["#ebfe00", L("tri-agent")],   // archetype amber = tri-agent role
  error:     ["#d58f8f", L("danger")],
  advisor:   ["#00bdfd", L("advisor")],
  auditor:   ["#fb5998", L("audit-gate")],
  ai:        ["#a384fe", L("orchestrator")],
  inst:      ["#1abea5", L("chart-4")],
  sig:       ["#d87fd1", L("chart-3")],
  learn:     ["#8cb9fc", L("secondary")],
  tert:      ["#d79fe9", L("tertiary")],    // new: 2.0 --tertiary, used raw in 3 rules
};
const hexToVar = Object.fromEntries(Object.entries(VARS).map(([k, [hex]]) => [hex, k]));
// rgb triplets → var (includes two OLD-palette residues that only survive as tints)
const rgbToVar = {};
for (const [k, [hex]] of Object.entries(VARS)) rgbToVar[[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")] = k;
rgbToVar["245,158,11"] = "warning";  // old amber tint behind amber pills
rgbToVar["14,165,233"] = "advisor";  // old sky-blue tint behind advisor pills
rgbToVar["20,184,166"] = "success";  // old teal-700 tint (legend spine swatch)
rgbToVar["236,72,153"] = "auditor";  // old pink tint
rgbToVar["0,0,0"] = null; rgbToVar["28,23,16"] = null; // shadows stay literal

const pct = (a) => Math.round(parseFloat(a) * 100);
function mix(rgb, a) { const v = rgbToVar[rgb]; if (v === undefined) throw new Error("unmapped rgb " + rgb); if (v === null) return null; return `color-mix(in srgb, var(--${v}) ${pct(a)}%, transparent)`; }
const RGBA = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/g;

// ── split the file ───────────────────────────────────────────────────
const styleAt = src.lastIndexOf("<style is:global>");
const markup = src.slice(0, styleAt), style = src.slice(styleAt);
const varEnd = style.indexOf("font-family: 'JetBrains Mono'");
let varBlock = style.slice(0, varEnd), rules = style.slice(varEnd);

// 1 · raw literals inside rules → vars / color-mix
let n1 = 0;
rules = rules.replace(/#[0-9a-fA-F]{6}\b/g, (h) => { const v = hexToVar[h.toLowerCase()]; if (!v) return h; n1++; return `var(--${v})`; });
rules = rules.replace(RGBA, (m, r, g, b, a) => { const out = mix(`${r},${g},${b}`, a); if (!out) return m; n1++; return out; });

// the var block itself: --tert added; dim/mid helpers become mixes so light follows automatically
varBlock = varBlock.replace("    --learn:      #8cb9fc;", "    --tert:       #d79fe9;   /* 2.0 --tertiary (planned) */\n    --learn:      #8cb9fc;");
varBlock = varBlock.replace(RGBA, (m, r, g, b, a) => mix(`${r},${g},${b}`, a) || m);

// 2 · attribute remaps from the markup
const attrs = new Map();
for (const el of markup.matchAll(/<([a-zA-Z]+)\b[^>]*?>/g)) {
  for (const [, a, v] of el[0].matchAll(/(fill|stroke|flood-color|stop-color)="(#[0-9a-fA-F]{6}|rgba?\([^)]*\))"/g)) {
    const key = `${el[1]}|${a}|${v}`; if (attrs.has(key)) continue;
    let out; if (v.startsWith("#")) { const k = hexToVar[v.toLowerCase()]; if (!k) throw new Error("unmapped attr hex " + v); out = `var(--${k})`; }
    else { const m = v.match(new RegExp(RGBA.source)); if (!m) throw new Error("bad rgba " + v); out = mix(`${m[1]},${m[2]},${m[3]}`, m[4]); if (!out) continue; }
    attrs.set(key, `  .arch-v2 ${el[1]}[${a}="${v}"] { ${a}: ${out}; }`);
  }
}

// 3 · inline style fragments
const frags = new Map();
for (const m of markup.matchAll(/style="([^"]*)"/g)) {
  for (const decl of m[1].split(";")) {
    const d = decl.trim(); if (!d || !/(#[0-9a-fA-F]{6}|rgba\()/.test(d)) continue;
    if (frags.has(d)) continue;
    const [prop, ...rest] = d.split(":"); const val = rest.join(":").trim();
    let out = val.replace(/#[0-9a-fA-F]{6}\b/g, (h) => { const k = hexToVar[h.toLowerCase()]; if (!k) throw new Error("unmapped inline hex " + h); return `var(--${k})`; });
    out = out.replace(RGBA, (mm, r, g, b, a) => mix(`${r},${g},${b}`, a) || mm);
    if (out === val) continue;
    const p = prop.trim() === "border" ? "border-color" : prop.trim();
    const outVal = p === "border-color" ? out.replace(/^[0-9.]+px\s+solid\s+/, "") : out;
    frags.set(d, `  .arch-v2 [style*="${d.replace(/"/g, '\\"')}"] { ${p}: ${outVal} !important; }`);
  }
}

// 4 · the light block
const lightVars = Object.entries(VARS).map(([k, [, light]]) => `    --${k}: ${light};`).join("\n");
const lightBlockCss = `
${MARK}
  /* Attribute + inline-style remaps: CSS beats SVG presentation attributes, so
     the markup keeps its Forge hexes and resolves through the variables above.
     On dark every var equals the hex it replaces — pixel-identical. */
${[...attrs.values()].join("\n")}
${[...frags.values()].join("\n")}

  /* Light: the Forge variables re-pointed at the 2.0 light sheet (L3). Node
     bodies become white cards on the page ground; every role/rail colour is
     that role's light token, each ≥ 4.5:1 on white. */
  [data-theme="light"] .arch-v2 {
${lightVars}
    --arch-page: ${L("bg")};
    --docs:      var(--advisor);
    --assure:    var(--warning);
    --v20-bg:    var(--forge);
    --v20-text:  var(--linen);
    --v20-muted: var(--sand);
    --bg: var(--arch-page); --text: var(--linen);
    background: var(--arch-page);
  }
`;
// page ground goes through --arch-page so nodes (obsidian → white) sit on the page tint
let out = markup + varBlock + rules;
out = out.replace("    background: var(--obsidian);\n    color: var(--linen);\n    padding: 2rem;", "    --arch-page: var(--obsidian);\n    background: var(--arch-page);\n    color: var(--linen);\n    padding: 2rem;");
if (!out.includes("--arch-page: var(--obsidian)")) throw new Error("page ground anchor not found");
const closeAt = out.lastIndexOf("</style>");
out = out.slice(0, closeAt) + lightBlockCss + out.slice(closeAt);
fs.writeFileSync(FILE, out);
console.log(`rules: ${n1} literals → vars · attr remaps: ${attrs.size} · inline remaps: ${frags.size}`);
