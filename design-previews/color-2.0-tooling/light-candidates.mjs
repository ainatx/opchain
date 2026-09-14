// Light-mode rework candidates for the Slate & Emerald 2.0 sheet.
//
// Owner brief (2026-09-08): light mode "is really ugly". Three grounds to
// compare (near-white cool, warm paper, lifted slate), a two-token accent
// split (--accent-fill vivid for fills, --accent text-safe for text/lines),
// tinted role pills with six distinct hues, five candidates total.
//
// Every token is derived in OKLCH and pushed to the WCAG floor it needs:
//   text 7:1 · muted/subtle 4.5:1 · accent/secondary/tertiary/roles/semantics
//   4.5:1 on bg, surface AND card · role text 4.5:1 on its own pill ·
//   accent-fill ≥ 3:1 against bg (non-text UI boundary) · on-fill label 4.5:1.
//
// Output: light-candidates.json — { id, name, tokens:{...}, report:[...] } × 5.
// Self-contained colour maths so importing never touches the generator.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// ── colour maths ─────────────────────────────────────────────────────
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function rgbToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}
export function toHex({ L, C, H }) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const [r, g, bl] = oklabToRgb(L, a, b).map(gam);
  if ([r, g, bl].some((v) => v < -0.002 || v > 1.002)) return null; // out of sRGB gamut
  return "#" + [r, g, bl].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
export function oklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const [L, a, bb] = rgbToOklab(r, g, b);
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function contrast(h1, h2) { const a = lum(h1), b = lum(h2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }

/** Darkest-first search: the most vivid colour of hue H that clears `floor` on every ground, at the highest L that still passes (light mode → darker = more contrast). */
function vivid(H, grounds, floor, { Lmax = 0.75, Lmin = 0.25, Cmax = 0.30 } = {}) {
  for (let L = Lmax; L >= Lmin; L -= 0.005) {
    for (let C = Cmax; C >= 0.02; C -= 0.005) {
      const hex = toHex({ L, C, H });
      if (!hex) continue;
      if (grounds.every((g) => contrast(hex, g) >= floor)) return hex;
      break; // lower chroma at this L cannot raise contrast enough to matter; go darker
    }
  }
  return toHex({ L: Lmin, C: 0.05, H }) || "#000000";
}
/** Muted variant: fixed chroma, darkest-first for the floor. */
function muted(H, grounds, floor, C) {
  for (let L = 0.70; L >= 0.20; L -= 0.005) {
    const hex = toHex({ L, C, H }) || toHex({ L, C: C * 0.6, H });
    if (hex && grounds.every((g) => contrast(hex, g) >= floor)) return hex;
  }
  return "#333333";
}
/** Light tint of hue H sitting on `bg`: lightest that still separates ≥ 1.15:1 from bg. */
function tint(H, bg, C = 0.045) {
  for (let L = 0.96; L >= 0.80; L -= 0.005) {
    const hex = toHex({ L, C, H });
    if (hex && contrast(hex, bg) >= 1.12) return hex;
  }
  return toHex({ L: 0.88, C: 0.03, H });
}
const rgba = (hex, a) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")}, ${a})`;
const neutral = (L, C, H) => toHex({ L, C, H }) || toHex({ L, C: 0, H });

// ── grounds ──────────────────────────────────────────────────────────
const GROUNDS = {
  "cool-white": {
    label: "Near-white, barely cool",
    H: 245, bg: neutral(0.977, 0.004, 245), surface: "#ffffff", card: "#ffffff",
    ribbon: neutral(0.955, 0.008, 245), ribbonEdge: neutral(0.86, 0.014, 245),
    border: neutral(0.885, 0.012, 245), textH: 245, textC: 0.012,
  },
  "warm-paper": {
    label: "Warm paper",
    H: 80, bg: neutral(0.978, 0.006, 80), surface: "#fffefc", card: "#ffffff",
    ribbon: neutral(0.955, 0.010, 80), ribbonEdge: neutral(0.86, 0.014, 80),
    border: neutral(0.885, 0.012, 80), textH: 60, textC: 0.010,
  },
  "lifted-slate": {
    label: "Lifted slate, separated steps",
    H: 245, bg: neutral(0.952, 0.012, 245), surface: neutral(0.985, 0.006, 245), card: "#ffffff",
    ribbon: neutral(0.925, 0.016, 245), ribbonEdge: neutral(0.83, 0.022, 245),
    border: neutral(0.820, 0.022, 245), textH: 245, textC: 0.016,  // evaluator: 0.855 was a 1.35:1 hairline
  },
};

// ── accent handling ──────────────────────────────────────────────────
// "brand": the fill IS the brand emerald (#2be179-adjacent), dark label.
// "moss":  the fill is a deeper moss with a white label; tints stay bright.
const ACCENT = {
  brand: { label: "brand-emerald fill · slate label", fill: { L: 0.78, C: 0.19, H: 152 }, onFill: "#12191f" },
  moss:  { label: "moss fill · white label",          fill: { L: 0.55, C: 0.16, H: 152 }, onFill: "#ffffff" },
};

// Light-only hue/lightness refinements after the evaluator pass (2026-09-08):
// on white the muted teal semantics and the cyan/blue roles all land at the
// same L/C and collapse into twins, and workflow at hue 152 became byte-equal
// to the text-safe accent. Roles keep their dark hues; light gets its own step.
const ROLES = { workflow: 152, "tri-agent": 115, "audit-gate": 0, specialist: 196, advisor: 232, orchestrator: 293 };
const ROLES_LIGHT = { ...ROLES, workflow: 146, specialist: 207 };
const SEMANTIC = { success: 178, danger: 20, warning: 95, info: 225, "in-progress": 340 };
const SEMANTIC_LIGHT = { ...SEMANTIC, info: 212 };
const FLOOR = 4.7; // light floor with anti-aliasing margin (evaluator: several pairs sat at 4.50 exactly)
const CHART = { 1: 212, 2: 262, 3: 330, 4: 178 };

function build(id, groundKey, accentKey, name) {
  const g = GROUNDS[groundKey], A = ACCENT[accentKey];
  const grounds = [g.bg, g.surface, g.card];
  const t = {}, report = [];
  const rep = (k, hex, floor, on = grounds) => { const worst = Math.min(...on.map((x) => contrast(hex, x))); report.push({ token: k, hex, floor, worst: +worst.toFixed(2), ok: worst >= floor }); };

  t.bg = g.bg; t.ribbon = g.ribbon; t["ribbon-edge"] = g.ribbonEdge; t.surface = g.surface; t.card = g.card; t.border = g.border;
  t.text = vivid(g.textH, grounds, 7, { Lmax: 0.30, Cmax: g.textC }); rep("text", t.text, 7);
  t.muted = vivid(g.textH, grounds, FLOOR, { Lmax: 0.52, Cmax: g.textC + 0.01 }); rep("muted", t.muted, FLOOR);
  t.subtle = vivid(g.textH, grounds, FLOOR, { Lmax: 0.56, Cmax: g.textC + 0.02 }); rep("subtle", t.subtle, FLOOR);

  // accent — the two-token split
  t.accent = vivid(152, grounds, FLOOR, { Lmax: 0.62, Cmax: 0.22 }); rep("accent (text-safe)", t.accent, FLOOR);
  t["accent-hover"] = vivid(152, grounds, 6, { Lmax: 0.55, Cmax: 0.22 });
  let fill = toHex(A.fill); if (!fill) { for (let C = A.fill.C; C > 0.05 && !fill; C -= 0.01) fill = toHex({ ...A.fill, C }); }
  t["accent-fill"] = fill; rep("accent-fill vs grounds (3:1 UI)", fill, 3);
  t["accent-fill-hover"] = toHex({ ...oklch(fill), L: oklch(fill).L - 0.06 }) || fill;
  t["on-accent"] = A.onFill; rep("on-accent on accent-fill", A.onFill, 4.5, [fill]);
  t["accent-dim"] = rgba(t["accent-fill"], accentKey === "brand" ? 0.16 : 0.12);
  t["accent-glow"] = rgba(t["accent-fill"], accentKey === "brand" ? 0.30 : 0.20);
  t.glow = rgba(t["accent-fill"], 0.18);

  t.secondary = vivid(258, grounds, FLOOR, { Lmax: 0.60, Cmax: 0.20 }); rep("secondary", t.secondary, FLOOR); t["secondary-dim"] = rgba(t.secondary, 0.12);
  t.tertiary = vivid(318, grounds, FLOOR, { Lmax: 0.60, Cmax: 0.20 }); rep("tertiary", t.tertiary, FLOOR); t["tertiary-dim"] = rgba(t.tertiary, 0.12);

  // semantics: muted (C 0.06) so they sit a clear chroma step below the vivid roles that share their hue family
  for (const [k, H] of Object.entries(SEMANTIC_LIGHT)) { t[k] = muted(H, grounds, FLOOR, 0.06); rep(k, t[k], FLOOR); t[`${k}-dim`] = rgba(t[k], 0.12); }
  t.destructive = muted(20, grounds, 6, 0.12); t["destructive-dim"] = rgba(t.destructive, 0.12);

  // roles: vivid text hue + a tinted pill of the same hue; text must clear 4.5 on the pill too
  for (const [k, H] of Object.entries(ROLES_LIGHT)) {
    const pill = tint(H, g.card, 0.05);
    t[`${k}-pill`] = pill;
    // workflow sits one lightness step below the accent so the two never read as one colour
    t[k] = vivid(H, [...grounds, pill], k === "workflow" ? 6.2 : FLOOR, { Lmax: 0.62, Cmax: 0.26 });
    rep(`${k} (on grounds + own pill)`, t[k], FLOOR, [...grounds, pill]);
  }
  for (const [k, H] of Object.entries(CHART)) { t[`chart-${k}`] = vivid(H, [g.card, g.surface], 3, { Lmax: 0.66, Cmax: 0.18 }); t[`chart-${k}-dim`] = rgba(t[`chart-${k}`], 0.14); }

  t["logo-stroke"] = "var(--text)"; t["logo-spine"] = "var(--subtle)"; t["logo-filled"] = "var(--accent-fill)"; t["logo-dot-dark"] = "var(--bg)";
  const sh = groundKey === "warm-paper" ? "42, 32, 18" : "18, 28, 40";
  t["shadow-sm"] = `0 1px 2px rgba(${sh}, 0.07)`;
  t["shadow-md"] = `0 2px 6px -1px rgba(${sh}, 0.10), 0 1px 2px rgba(${sh}, 0.05)`;
  t["shadow-lg"] = `0 8px 24px -6px rgba(${sh}, 0.12), 0 2px 4px rgba(${sh}, 0.05)`;
  t["shadow-xl"] = `0 16px 40px -8px rgba(${sh}, 0.16), 0 4px 8px rgba(${sh}, 0.06)`;
  return { id, name, ground: g.label, accent: A.label, tokens: t, report };
}

export const CANDIDATES = [
  build("L1", "cool-white", "brand", "Cool white · brand fill"),
  build("L2", "warm-paper", "brand", "Warm paper · brand fill"),
  build("L3", "lifted-slate", "brand", "Lifted slate · brand fill"),
  build("L4", "cool-white", "moss", "Cool white · moss fill"),
  build("L5", "warm-paper", "moss", "Warm paper · moss fill"),
];

/** CSS override block for one candidate (scoped to the light theme). */
export function cssFor(c) {
  const vars = Object.entries(c.tokens).map(([k, v]) => `  --${k}: ${v};`).join("\n");
  return `[data-theme="light"] {\n${vars}\n}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(here, "light-candidates.json"), JSON.stringify(CANDIDATES, null, 2));
  for (const c of CANDIDATES) {
    const fails = c.report.filter((r) => !r.ok);
    console.log(`${c.id} ${c.name}: bg ${c.tokens.bg} accent ${c.tokens.accent} fill ${c.tokens["accent-fill"]} · ${c.report.length} checks, ${fails.length} fail${fails.length ? " → " + fails.map((f) => `${f.token} ${f.worst}<${f.floor}`).join("; ") : ""}`);
  }
}
