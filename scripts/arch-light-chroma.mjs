#!/usr/bin/env node
/**
 * Give the architecture diagram back its neon in light mode.
 *
 * The problem. On dark, each rail is a bright stroke on near-black, and that is
 * what makes the page read as a live diagram rather than a printed schematic.
 * Translating those rails to the site's light role tokens lost it, because a
 * light role token is picked to be *text* on white: at a 4.5:1 floor, sRGB
 * simply has very little chroma left to give. Raising the chroma of the text
 * colour does almost nothing — measured, the ceiling moves by a couple of
 * percent.
 *
 * The fix. Strokes are not text. WCAG asks 3:1 of a graphical object, not
 * 4.5:1, and that one stop buys a large amount of chroma. So each rail becomes
 * two variables, the same split the site uses for --accent / --accent-fill:
 *
 *   --<rail>        text, 4.5:1 on the node body, page ground, raised surface
 *                   and on the rail's own 18% tint (the diagram fills rects
 *                   with color-mix of the rail over those grounds)
 *   --<rail>-line   strokes, arrowheads and glow, 3:1 on the same grounds,
 *                   derived by maximising chroma over the whole lightness range
 *
 * On dark both resolve to the original Forge hex, so dark is untouched.
 *
 * The attribute-remap block is rewritten to route by role: `fill` on <text>
 * takes the text variable; `fill` on a shape, every `stroke`, and every
 * `flood-color` take the line variable. Inline `border-color` fragments follow
 * the strokes; inline `color` follows the text.
 *
 * Neutrals (--obsidian/--forge/--slag/--sand/--linen) are never touched: the
 * diagram keeps sitting on the site's own light grounds.
 *
 * Run from the repo root, after scripts/arch-light-treatment.mjs. Idempotent.
 */
import fs from "node:fs";

const FILE = "site/src/pages/architecture.astro";
const MARK = "/* ══ rail line variants (scripts/arch-light-chroma.mjs) ══ */";

// ── OKLCH ↔ sRGB ─────────────────────────────────────────────────────
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const oklabToRgb = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};
const rgbToOklab = (r, g, b) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const toHex = ({ L, C, H }) => {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const rgb = oklabToRgb(L, a, b).map(gam);
  if (rgb.some((v) => v < -0.002 || v > 1.002)) return null;
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
};
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const oklch = (hex) => { const [L, a, b] = rgbToOklab(...rgbOf(hex).map((v) => lin(v / 255))); return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }; };
const lumOf = (hex) => { const [r, g, b] = rgbOf(hex).map((v) => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (x, y) => { const a = lumOf(x), b = lumOf(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };

/** Most saturated in-gamut colour of hue H clearing `floor` on every ground. */
function mostVivid(H, grounds, floor) {
  let best = null;
  for (let L = 0.86; L >= 0.18; L -= 0.004) {
    for (let C = 0.40; C >= 0.02; C -= 0.002) {
      const hex = toHex({ L, C, H });
      if (!hex) continue;
      if (!grounds.every((g) => contrast(hex, g) >= floor)) break;
      if (!best || C > best.C) best = { hex, L, C };
      break;
    }
  }
  return best;
}

const src = fs.readFileSync(FILE, "utf8");
if (src.includes(MARK)) { console.log("already applied — revert the block first to re-derive"); process.exit(0); }

const lightBlock = src.slice(src.indexOf('[data-theme="light"] .arch-v2 {'));
const get = (n) => { const m = lightBlock.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`)); if (!m) throw new Error("no --" + n); return m[1]; };
const GROUNDS = [get("obsidian"), get("forge"), get("arch-page")]; // node body, raised surface, page

// rail variable → its dark Forge hex (hue source + the dark-mode value)
const RAILS = {
  ember:   "#2be179", success: "#02fdff", warning: "#ebfe00", error: "#d58f8f",
  advisor: "#00bdfd", auditor: "#fb5998", ai: "#a384fe", inst: "#1abea5",
  sig:     "#d87fd1", learn:   "#8cb9fc", tert: "#d79fe9",
};

const rows = [], lineLight = {};
for (const [name, darkHex] of Object.entries(RAILS)) {
  const H = oklch(darkHex).H;
  const found = mostVivid(H, GROUNDS, 3.0);
  if (!found) throw new Error("no legal 3:1 colour for --" + name);
  lineLight[name] = found.hex;
  const text = get(name);
  rows.push({
    rail: name, text, "text C": oklch(text).C.toFixed(3),
    line: found.hex, "line C": found.C.toFixed(3),
    "chroma ×": (found.C / oklch(text).C).toFixed(2),
    worst: Math.min(...GROUNDS.map((g) => contrast(found.hex, g))).toFixed(2),
  });
}

let out = src;

// 1 · declare the line variants — dark aliases the rail itself
const darkDecl = Object.keys(RAILS).map((n) => `    --${n}-line: var(--${n});`).join("\n");
out = out.replace(
  "    --shade:      #1c1710;",
  `    /* Stroke/glow variant of each rail. On dark it IS the rail; light gives it\n       its own value (see the light block below and scripts/arch-light-chroma.mjs). */\n${darkDecl}\n    --shade:      #1c1710;`,
);
const lightDecl = Object.entries(lineLight).map(([n, hex]) => {
  const worst = Math.min(...GROUNDS.map((g) => contrast(hex, g))).toFixed(2);
  return `    --${n}-line: ${hex};  /* C${oklch(hex).C.toFixed(3)} · ${worst}:1 */`;
}).join("\n");
out = out.replace(
  "    --shade: #ffffff;",
  `${MARK}\n    /* Strokes, arrowheads and glow: 3:1 graphics floor, chroma maximised — this\n       is what keeps the diagram reading as neon rather than as a print schematic.\n       Text keeps the calmer 4.5:1 rail colour above. */\n${lightDecl}\n    --shade: #ffffff;`,
);

// 2 · route the attribute remaps: text→rail, shapes/strokes/glow→rail-line
const railVars = new Set(Object.keys(RAILS));
let routed = 0;
out = out.replace(
  /^(  \.arch-v2 ([a-zA-Z]+)\[(fill|stroke|flood-color)="[^"]*"\] \{ \3: )var\(--([a-z0-9-]+)\)(;? \}.*)$/gm,
  (m, head, tag, attr, v, tail) => {
    if (!railVars.has(v)) return m;                 // neutrals stay put
    if (attr === "fill" && tag === "text") return m; // text keeps the 4.5:1 colour
    routed++;
    return `${head}var(--${v}-line)${tail}`;
  },
);
// tinted rect fills are color-mix of a rail — point those at the line variant too
out = out.replace(
  /^(  \.arch-v2 ([a-zA-Z]+)\[(fill|stroke)="rgba[^"]*"\] \{ \3: color-mix\(in srgb, )var\(--([a-z0-9-]+)\)( \d+%, transparent\);? \}.*)$/gm,
  (m, head, tag, attr, v, tail) => { if (!railVars.has(v) || tag === "text") return m; routed++; return `${head}var(--${v}-line)${tail}`; },
);
// inline style fragments: borders follow the strokes, colour follows the text
out = out.replace(
  /^(  \.arch-v2 \[style\*="[^"]*"\] \{ border-color: )([^}]*?)(;? !important;? \}.*)$/gm,
  (m, head, val, tail) => {
    const next = val.replace(/var\(--([a-z0-9-]+)\)/g, (mm, v) => (railVars.has(v) ? (routed++, `var(--${v}-line)`) : mm));
    return head + next + tail;
  },
);

fs.writeFileSync(FILE, out);
console.table(rows);
console.log(`${routed} stroke/shape remaps routed to the line variants`);
