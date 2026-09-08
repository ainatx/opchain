// gen-tokens.mjs — opchain 2.0 colour exploration token generator.
// OKLCH-based derivation with WCAG contrast enforcement. No deps.
import fs from "node:fs";
import path from "node:path";

const OUT = path.dirname(new URL(import.meta.url).pathname);

// ───────────────────────── colour math ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("");
}
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function lum(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(h1, h2) {
  const a = lum(h1), b = lum(h2);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
function linToOklab([r, g, b]) {
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
function oklabToLin([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
export function oklch(hex) {
  const [L, a, b] = linToOklab(hexToRgb(hex).map(toLin));
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}
export function toHex({ L, C, H }) {
  let c = C;
  for (let i = 0; i < 60; i++) {
    const a = c * Math.cos((H * Math.PI) / 180), b = c * Math.sin((H * Math.PI) / 180);
    const lin = oklabToLin([clamp(L), a, b]);
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map((v) => toSrgb(clamp(v))));
    c *= 0.95;
  }
  return rgbToHex(oklabToLin([clamp(L), 0, 0]).map((v) => toSrgb(clamp(v))));
}
// Adjust L (in direction dir) until contrast against every bg ≥ min.
function ensure(spec, bgs, min, dir) {
  let s = { ...spec };
  for (let i = 0; i < 200; i++) {
    const hex = toHex(s);
    if (bgs.every((bg) => contrast(hex, bg) >= min)) return { hex, spec: s };
    s.L = clamp(s.L + dir * 0.004, 0.02, 0.99);
    if (s.L <= 0.02 || s.L >= 0.99) break;
  }
  return { hex: toHex(s), spec: s };
}
const rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
// sRGB mix: colour at pct over base (what color-mix(in srgb, c pct, transparent) over base renders as)
function mix(c, base, pct) {
  const a = hexToRgb(c), b = hexToRgb(base);
  return rgbToHex(a.map((v, i) => v * pct + b[i] * (1 - pct)));
}

// ───────────────────────── current ladders (reference) ─────────────────────────
const CUR_DARK = {
  bg: "#1c1710", ribbon: "#231b13", "ribbon-edge": "#3a2f26", surface: "#251d14", card: "#241c15",
  border: "#5a5040", text: "#e8dfd0", muted: "#c4b89e", subtle: "#9d8b78",
};
const CUR_LIGHT = {
  bg: "#f8ebda", ribbon: "#f0dabe", "ribbon-edge": "#d4b58f", surface: "#f4e5cf", card: "#ffffff",
  border: "#ccb390", text: "#1c1710", muted: "#5a4a30", subtle: "#6e5c40",
};
const OBS = oklch(CUR_DARK.bg);
const CREAM = oklch(CUR_LIGHT.bg);

// Derive a ladder from a seed bg by transposing each step's ΔL from the
// current ladder onto the new hue, scaling chroma by the seed's chroma.
function ladder(cur, base, seed) {
  const out = {};
  const curBase = oklch(cur.bg);
  for (const [k, hex] of Object.entries(cur)) {
    const o = oklch(hex);
    const dL = o.L - curBase.L;
    const cScale = curBase.C > 0.001 ? seed.C / curBase.C : 1;
    let spec = { L: clamp(base.L + dL, 0, 1), C: Math.min(o.C * cScale, 0.06), H: seed.H };
    if (k === "card" && cur.card === "#ffffff") spec = { L: 1, C: 0, H: seed.H };
    out[k] = toHex(spec);
  }
  return out;
}

// NOTE on `bg`: dark and light carry SEPARATE chroma on purpose. Perceived
// colourfulness falls off steeply at high lightness, so the same OKLCH chroma
// that tints a near-black ground vanishes on a near-white one. The live cream
// ground measures C 0.027; under roughly C 0.010 a light ground reads as plain
// white. Halving a family's chroma in BOTH modes therefore mutes dark mode
// correctly but erases light mode — every muted set collapses to the same white
// page and the family stops being identifiable. Muted families keep the full
// 50% cut in dark mode and take a gentler cut in light.
// ───────────────────────── set seeds ─────────────────────────
// H in OKLCH degrees. Roughly: red 25 · orange 55 · yellow 100 · lime 125 ·
// green 145 · mint 160 · teal 180 · cyan 200 · sky 235 · blue 265 · violet 290 ·
// magenta 330 · rose 355.
const SETS = [
  {
    id: 1, key: "vermilion", name: "Vermilion", batch: 1,
    tag: "Ember, hotter and cleaner",
    why: "The continuity option. Same lineage as Ember but pushed toward red-orange with more chroma, so it reads as signal rather than campfire. Ice-blue secondary keeps the changelog from being three shades of warm.",
    accent: { dark: { H: 32, C: 0.21, L: 0.67 }, light: { H: 32, C: 0.20, L: 0.55 } },
    secondary: 235, tertiary: 295,
    roles: { workflow: 32, "tri-agent": 95, "audit-gate": 350, specialist: 175, advisor: 235, orchestrator: 295 },
    semantic: { success: 150, danger: 358, warning: 100, "in-progress": 340 },
  },
  {
    id: 2, key: "signal", name: "Signal", batch: 1,
    tag: "Sky-cyan on Obsidian",
    why: "The 'optimized' register: terminal glow, Linear/Vercel-on-dark energy. Warm Obsidian under a cold accent gives it a temperature contrast the all-cool dev-tool sites don't have. Magenta as the secondary is the surprise.",
    accent: { dark: { H: 235, C: 0.15, L: 0.78 }, light: { H: 240, C: 0.16, L: 0.50 } },
    secondary: 325, tertiary: 280,
    roles: { workflow: 235, "tri-agent": 120, "audit-gate": 20, specialist: 165, advisor: 275, orchestrator: 325 },
    semantic: { success: 150, danger: 20, warning: 100, "in-progress": 345 },
  },
  {
    id: 3, key: "acid", name: "Acid", batch: 1,
    tag: "Lime on Obsidian",
    why: "Fastest-feeling of the ten. Lime on warm black reads as speed and slight danger. Highest-risk set: lime text needs to drop to olive in light mode to pass AA, so the two modes diverge more than any other set.",
    accent: { dark: { H: 125, C: 0.20, L: 0.87 }, light: { H: 128, C: 0.17, L: 0.52 } },
    secondary: 205, tertiary: 310,
    roles: { workflow: 125, "tri-agent": 205, "audit-gate": 15, specialist: 170, advisor: 260, orchestrator: 310 },
    semantic: { success: 160, danger: 15, warning: 70, "in-progress": 345 },
  },
  {
    id: 4, key: "fuchsia", name: "Fuchsia", batch: 1,
    tag: "Magenta on Obsidian",
    why: "The unexpected one for a dev-tool brand. Magenta against warm brown-black is a fashion pairing, not a SaaS one, which is the point. Cyan secondary gives the changelog a hard cold/hot split.",
    accent: { dark: { H: 330, C: 0.23, L: 0.70 }, light: { H: 335, C: 0.21, L: 0.52 } },
    secondary: 195, tertiary: 285,
    roles: { workflow: 330, "tri-agent": 195, "audit-gate": 15, specialist: 155, advisor: 250, orchestrator: 285 },
    semantic: { success: 150, danger: 20, warning: 100, "in-progress": 55 },
  },
  {
    id: 5, key: "ultraviolet", name: "Ultraviolet", batch: 1,
    tag: "Periwinkle-violet on Obsidian",
    why: "Calm but futuristic. Violet is the colour the current orchestrator role already owns, so promoting it to accent says 'the pipeline now runs itself', which is literally the 2.0 story. Cyan secondary, magenta tertiary.",
    accent: { dark: { H: 288, C: 0.17, L: 0.70 }, light: { H: 290, C: 0.19, L: 0.50 } },
    secondary: 205, tertiary: 335,
    roles: { workflow: 288, "tri-agent": 205, "audit-gate": 15, specialist: 160, advisor: 240, orchestrator: 335 },
    semantic: { success: 150, danger: 20, warning: 100, "in-progress": 345 },
  },
  // ── batch 2: background hue shift, same darkness ──
  {
    id: 6, key: "slate-crimson", name: "Slate & Crimson", batch: 2, pairing: "contrast",
    tag: "Cool slate-black under a hot crimson",
    why: "Non-matchy pairing #1. A blue-grey near-black cools the whole page down; crimson is the only warm thing on it, so every CTA and eyebrow snaps forward. Sky secondary, indigo tertiary sit naturally in the bg's family.",
    bg: { dark: { H: 245, C: 0.016 }, light: { H: 245, C: 0.012 } },
    accent: { dark: { H: 18, C: 0.22, L: 0.66 }, light: { H: 18, C: 0.21, L: 0.52 } },
    secondary: 232, tertiary: 278,
    roles: { workflow: 18, "tri-agent": 95, "audit-gate": 325, specialist: 165, advisor: 232, orchestrator: 278 },
    semantic: { success: 150, danger: 38, warning: 100, "in-progress": 345 },
  },
  {
    id: 7, key: "plum-mint", name: "Plum & Mint", batch: 2, pairing: "contrast",
    tag: "Plum-black under mint",
    why: "Non-matchy pairing #2. Purple-black plus mint is a complementary pair, so the accent has maximum pop without needing extra chroma. Reads as premium rather than loud. Magenta secondary borrows from the bg's own hue.",
    bg: { dark: { H: 335, C: 0.022 }, light: { H: 335, C: 0.014 } },
    accent: { dark: { H: 162, C: 0.17, L: 0.82 }, light: { H: 162, C: 0.15, L: 0.50 } },
    secondary: 325, tertiary: 265,
    roles: { workflow: 162, "tri-agent": 100, "audit-gate": 15, specialist: 215, advisor: 265, orchestrator: 325 },
    semantic: { success: 135, danger: 20, warning: 95, "in-progress": 55 },
  },
  {
    id: 8, key: "chrome", name: "Chrome", batch: 2, pairing: "contrast",
    tag: "Neutral graphite, near-white accent",
    why: "Non-matchy pairing #3, by restraint. A true neutral graphite (the only bg here with no warm cast) and an ice-white accent: buttons go white, eyebrows go white, and colour is reserved entirely for roles and status. Light mode inverts to an ink accent on paper.",
    bg: { dark: { H: 250, C: 0.004 }, light: { H: 250, C: 0.003 } },
    accent: { dark: { H: 260, C: 0.025, L: 0.93 }, light: { H: 260, C: 0.03, L: 0.28 } },
    secondary: 250, tertiary: 300,
    roles: { workflow: 250, "tri-agent": 130, "audit-gate": 15, specialist: 175, advisor: 210, orchestrator: 300 },
    semantic: { success: 150, danger: 20, warning: 100, "in-progress": 345 },
  },
  {
    id: 9, key: "deep-signal", name: "Deep Signal", batch: 2, pairing: "family",
    tag: "Navy-black under electric blue",
    why: "Same-family pairing #1. Navy-black with a saturated electric blue: the accent and the ground share a hue so the page feels lit from within. Teal secondary keeps it from being monochrome; magenta tertiary is the counterweight.",
    bg: { dark: { H: 265, C: 0.032 }, light: { H: 262, C: 0.016 } },
    accent: { dark: { H: 268, C: 0.20, L: 0.68 }, light: { H: 265, C: 0.20, L: 0.48 } },
    secondary: 172, tertiary: 325,
    roles: { workflow: 268, "tri-agent": 120, "audit-gate": 10, specialist: 172, advisor: 215, orchestrator: 325 },
    semantic: { success: 150, danger: 20, warning: 100, "in-progress": 345 },
  },
  {
    id: 10, key: "seaglass", name: "Seaglass", batch: 2, pairing: "family",
    tag: "Teal-black under aqua",
    why: "Same-family pairing #2. A deep teal-black ground with an aqua accent one step lighter and brighter. Closest to the current site in structure (warm-ish neutral tinted toward its accent) but in a cold key. Blue secondary, magenta tertiary.",
    bg: { dark: { H: 190, C: 0.020 }, light: { H: 190, C: 0.014 } },
    accent: { dark: { H: 176, C: 0.15, L: 0.84 }, light: { H: 178, C: 0.13, L: 0.48 } },
    secondary: 268, tertiary: 325,
    roles: { workflow: 176, "tri-agent": 110, "audit-gate": 10, specialist: 232, advisor: 268, orchestrator: 325 },
    semantic: { success: 145, danger: 20, warning: 95, "in-progress": 345 },
  },

  // ── batch 3 · round 2: three families the owner shortlisted ──
  // 11–13 keep set 6's slate ground exactly, so they read as a direct
  // accent comparison. 14–16 and 17–19 re-cut plum and seaglass with a
  // markedly more muted ground (bg chroma roughly halved) so the accent
  // does all the work.
  {
    id: 11, key: "slate-emerald", name: "Slate & Emerald", batch: 3, family: "slate", pairing: "contrast",
    tag: "Jewel emerald on cool slate",
    why: "Jewel-tone reading of the slate ground. Emerald is the one saturated green that still reads as money rather than terminal-lint, and on a blue-grey black it feels cut rather than printed. Sapphire secondary and magenta tertiary keep the changelog's three states obvious.",
    bg: { dark: { H: 245, C: 0.016 }, light: { H: 245, C: 0.012 } },
    accent: { dark: { H: 152, C: 0.20, L: 0.80 }, light: { H: 152, C: 0.17, L: 0.46 } },
    secondary: 258, tertiary: 318,
    roles: { workflow: 152, "tri-agent": 100, "audit-gate": 15, specialist: 196, advisor: 250, orchestrator: 310 },
    semantic: { success: 172, danger: 20, warning: 95, "in-progress": 340 },
  },
  {
    id: 12, key: "slate-amethyst", name: "Slate & Amethyst", batch: 3, family: "slate", pairing: "contrast",
    tag: "Jewel amethyst on cool slate",
    why: "The most overtly luxe of the slate three. A high-chroma violet-magenta sits a half-step off the ground's own blue, so it glows instead of vibrating. Reads couture rather than dev-tool, which is the risk and the point.",
    bg: { dark: { H: 245, C: 0.016 }, light: { H: 245, C: 0.012 } },
    accent: { dark: { H: 300, C: 0.19, L: 0.72 }, light: { H: 300, C: 0.20, L: 0.48 } },
    secondary: 200, tertiary: 155,
    roles: { workflow: 300, "tri-agent": 110, "audit-gate": 15, specialist: 165, advisor: 235, orchestrator: 345 },
    semantic: { success: 155, danger: 20, warning: 100, "in-progress": 20 },
  },
  {
    id: 13, key: "slate-aquamarine", name: "Slate & Aquamarine", batch: 3, family: "slate", pairing: "family",
    tag: "Jewel aquamarine on cool slate",
    why: "The quiet one. Aquamarine is close enough to the slate ground to feel like the same stone lit from behind, and its lightness does the hierarchy work instead of chroma. Deep indigo secondary, magenta tertiary.",
    bg: { dark: { H: 245, C: 0.016 }, light: { H: 245, C: 0.012 } },
    accent: { dark: { H: 196, C: 0.16, L: 0.84 }, light: { H: 198, C: 0.14, L: 0.47 } },
    secondary: 272, tertiary: 322,
    roles: { workflow: 196, "tri-agent": 105, "audit-gate": 15, specialist: 155, advisor: 265, orchestrator: 320 },
    semantic: { success: 150, danger: 20, warning: 95, "in-progress": 340 },
  },
  {
    id: 14, key: "plum-mint-muted", name: "Muted Plum & Mint", batch: 3, family: "plum", pairing: "contrast",
    tag: "Brighter mint on a muted plum ground",
    why: "The original plum pairing with the ground pulled back — bg chroma roughly halved so the plum registers as a warm-grey rather than a colour. The mint is pushed brighter to take up the slack, which is what makes it feel expensive instead of minty.",
    bg: { dark: { H: 335, C: 0.011 }, light: { H: 335, C: 0.0112 } },
    accent: { dark: { H: 163, C: 0.18, L: 0.83 }, light: { H: 163, C: 0.15, L: 0.48 } },
    secondary: 318, tertiary: 262,
    roles: { workflow: 163, "tri-agent": 100, "audit-gate": 12, specialist: 205, advisor: 260, orchestrator: 325 },
    semantic: { success: 140, danger: 20, warning: 95, "in-progress": 55 },
  },
  {
    id: 15, key: "plum-chartreuse", name: "Muted Plum & Chartreuse", batch: 3, family: "plum", pairing: "contrast",
    tag: "Chartreuse on a muted plum ground",
    why: "The loudest set in the whole exploration and the one most likely to be right. Chartreuse is plum's near-complement, so on a muted plum ground it detonates. Premium here comes from restraint everywhere else — one screaming colour, everything else greyed.",
    bg: { dark: { H: 335, C: 0.011 }, light: { H: 335, C: 0.0112 } },
    accent: { dark: { H: 125, C: 0.20, L: 0.88 }, light: { H: 128, C: 0.17, L: 0.50 } },
    secondary: 320, tertiary: 265,
    roles: { workflow: 125, "tri-agent": 175, "audit-gate": 12, specialist: 215, advisor: 265, orchestrator: 320 },
    semantic: { success: 158, danger: 20, warning: 85, "in-progress": 340 },
  },
  {
    id: 16, key: "plum-cyan", name: "Muted Plum & Cyan", batch: 3, family: "plum", pairing: "contrast",
    tag: "Cyan on a muted plum ground",
    why: "Cold accent on a warm-grey ground: the temperature split does the work, not the saturation. The most conventionally 'software' of the three plums, and the easiest to live with over a long page.",
    bg: { dark: { H: 335, C: 0.011 }, light: { H: 335, C: 0.0112 } },
    accent: { dark: { H: 205, C: 0.16, L: 0.82 }, light: { H: 207, C: 0.15, L: 0.46 } },
    secondary: 325, tertiary: 268,
    roles: { workflow: 205, "tri-agent": 120, "audit-gate": 12, specialist: 160, advisor: 255, orchestrator: 320 },
    semantic: { success: 150, danger: 20, warning: 95, "in-progress": 345 },
  },
  {
    id: 17, key: "seaglass-aqua-muted", name: "Muted Seaglass & Aqua", batch: 3, family: "seaglass", pairing: "family",
    tag: "Luminous aqua on a muted teal ground",
    why: "Same-family pairing with the ground de-saturated to near-charcoal, so the aqua stops being 'more teal' and starts being light. Closest thing here to a lit-from-within page.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 178, C: 0.16, L: 0.85 }, light: { H: 180, C: 0.13, L: 0.47 } },
    secondary: 268, tertiary: 325,
    roles: { workflow: 178, "tri-agent": 115, "audit-gate": 12, specialist: 225, advisor: 268, orchestrator: 322 },
    semantic: { success: 145, danger: 20, warning: 95, "in-progress": 345 },
  },
  {
    id: 18, key: "seaglass-magenta", name: "Muted Seaglass & Magenta", batch: 3, family: "seaglass", pairing: "contrast",
    tag: "Magenta on a muted teal ground",
    why: "Teal's complement at full strength. On the de-saturated ground the magenta reads as a single deliberate act rather than a theme, which is exactly how luxury brands use one colour. Aqua secondary keeps the ground's own family present.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 328, C: 0.22, L: 0.70 }, light: { H: 330, C: 0.21, L: 0.50 } },
    secondary: 185, tertiary: 265,
    roles: { workflow: 328, "tri-agent": 115, "audit-gate": 15, specialist: 172, advisor: 205, orchestrator: 265 },
    semantic: { success: 150, danger: 25, warning: 95, "in-progress": 300 },
  },
  {
    id: 19, key: "seaglass-lime", name: "Muted Seaglass & Lime", batch: 3, family: "seaglass", pairing: "contrast",
    tag: "Lime on a muted teal ground",
    why: "The energy option for the seaglass family. Lime against de-saturated teal has an oscilloscope quality — instrument, not highlighter. Riskiest of the three: lime has to fall a long way to survive light mode.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 122, C: 0.20, L: 0.87 }, light: { H: 125, C: 0.17, L: 0.50 } },
    secondary: 250, tertiary: 288,
    roles: { workflow: 122, "tri-agent": 170, "audit-gate": 12, specialist: 200, advisor: 258, orchestrator: 318 },
    semantic: { success: 158, danger: 20, warning: 85, "in-progress": 345 },
  },

  // ── batch 4 · round 3: bold accents + vivid semantics ──
  // Rounds 1-2 explored 25 accents and every single one was light-on-dark
  // (L 0.66-0.93) with chroma capped at 0.230, well under the sRGB ceiling.
  // Hue alone is nearly exhausted — only a handful of gaps remain once gold
  // and orange are off the table. So this round moves on the three axes that
  // were never touched: unused hue slots, chroma pushed to the gamut ceiling,
  // and structure (a two-colour brand, a dark solid fill, an achromatic brand
  // whose colour comes only from the semantics).
  //
  // All six also carry the vivid semantic treatment: `info` promoted to a real
  // fifth semantic, every semantic derived by gamut search, and roles pushed
  // off the semantic hues.
  {
    id: 20, key: "sg-prism", name: "Seaglass · Prism", batch: 4, family: "seaglass-sem", pairing: "contrast",
    tag: "Two brand colours, not one",
    why: "The first duotone in the exploration. Filled buttons and eyebrows take the cyan; outlines, links and the install pill take the magenta. A two-colour brand behaves differently from a one-colour brand - the page gets a rhythm rather than a single highlight - and no amount of hue-shuffling a single accent produces that.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 196 }, light: { H: 196 } }, accentMaxChroma: true,
    accent2: { dark: { H: 341 }, light: { H: 341 } }, accent2MaxChroma: true,
    treatment: "duotone",
    secondary: 165, tertiary: 296,
    roles: { workflow: 220, "tri-agent": 110, "audit-gate": 8, specialist: 185, advisor: 250, orchestrator: 315 },
    semantic: { danger: 20, warning: 92, success: 164, info: 236, "in-progress": 308 },
    semanticMaxChroma: true, semanticTone: "max", separateFromSemantics: true,
  },
  {
    id: 21, key: "sg-ink", name: "Seaglass · Ink", batch: 4, family: "seaglass-sem", pairing: "contrast",
    tag: "Dark solid buttons - the page's weight inverted",
    why: "Structural, not chromatic. Every one of the 19 earlier accents was painted light-on-dark; this one paints the primary button as a near-black indigo block with a white label, while a lighter tint of the same hue carries links and eyebrows. The page stops being dark-with-bright-highlights and becomes dark-with-darker-objects.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 265, C: 0.16, L: 0.76 }, light: { H: 265, C: 0.19, L: 0.46 } },
    accentFill: { H: 265, C: 0.19, L: 0.38, Llight: 0.34 },
    treatment: "deep",
    secondary: 170, tertiary: 320,
    roles: { workflow: 246, "tri-agent": 115, "audit-gate": 5, specialist: 196, advisor: 272, orchestrator: 300 },
    semantic: { success: 148, danger: 27, warning: 92, "in-progress": 345, info: 212 },
    semanticMaxChroma: true, semanticTone: "max", separateFromSemantics: true,
  },
  {
    id: 22, key: "sg-halo", name: "Seaglass · Halo", batch: 4, family: "seaglass-sem", pairing: "contrast",
    tag: "No solid fills anywhere - outline and glow only",
    why: "The accent never fills a shape. Primary buttons become outlines with a hard glow behind them, so the page reads as lit rather than painted. Lime because it is one of the few hues sRGB can hold at high chroma AND high lightness, which is what makes the glow actually glow.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 130 }, light: { H: 130 } }, accentMaxChroma: true,
    treatment: "halo",
    secondary: 190, tertiary: 274,
    roles: { workflow: 5, "tri-agent": 118, "audit-gate": 330, specialist: 160, advisor: 232, orchestrator: 300 },
    semantic: { success: 168, info: 205, danger: 32, warning: 78, "in-progress": 300 },
    semanticMaxChroma: true, semanticTone: "deep", separateFromSemantics: true,
  },
  {
    id: 23, key: "sg-orchid", name: "Seaglass · Orchid", batch: 4, family: "seaglass-sem", pairing: "contrast",
    tag: "Chroma ceiling - the most saturated accent possible",
    why: "Every accent in rounds 1 and 2 topped out at chroma 0.230. This one is derived by gamut search and lands at 0.264, the most saturated a screen can render at a legible lightness. Hue 314 is one of the last unused slots, sitting between amethyst and magenta and belonging to neither.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 314 }, light: { H: 314 } }, accentMaxChroma: true,
    treatment: "max",
    secondary: 178, tertiary: 250,
    roles: { workflow: 314, "tri-agent": 100, "audit-gate": 20, specialist: 200, advisor: 232, orchestrator: 285 },
    semantic: { success: 158, danger: 12, warning: 78, "in-progress": 288, info: 218 },
    semanticMaxChroma: true, semanticTone: "deep", separateFromSemantics: true,
  },
  {
    id: 24, key: "sg-invert", name: "Seaglass · Invert", batch: 4, family: "seaglass-sem", pairing: "contrast",
    tag: "The accent as background, not as ink",
    why: "Colour-blocking. The stage and the closing CTA are filled with the accent and their text drops to the ground colour, so the brand colour arrives as a surface rather than a highlight. The most visually different page of the six, and the furthest thing from a tinted link.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 335 }, light: { H: 335 } }, accentMaxChroma: true,
    treatment: "invert",
    secondary: 172, tertiary: 200,
    roles: { workflow: 265, "tri-agent": 112, "audit-gate": 8, specialist: 196, advisor: 238, orchestrator: 296 },
    semantic: { success: 140, danger: 22, warning: 92, "in-progress": 318, info: 208 },
    semanticMaxChroma: true, semanticTone: "bright", separateFromSemantics: true,
  },
  {
    id: 25, key: "sg-bone", name: "Seaglass · Bone", batch: 4, family: "seaglass-sem", pairing: "family",
    tag: "No brand colour at all - the semantics carry everything",
    why: "The brand goes achromatic bone-white and every drop of colour comes from the five semantics, which are gamut-maxed. Set 08 Chrome did something similar on graphite but paired it with tame semantics; a colourless brand against the loudest possible status row is a different proposition. The most restrained and the most colourful set at once.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 190, C: 0.020, L: 0.93 }, light: { H: 190, C: 0.030, L: 0.26 } },
    treatment: "bone",
    secondary: 205, tertiary: 300,
    roles: { workflow: 190, "tri-agent": 118, "audit-gate": 10, specialist: 160, advisor: 240, orchestrator: 320 },
    semantic: { danger: 20, warning: 88, success: 150, info: 228, "in-progress": 330 },
    semanticMaxChroma: true, semanticTone: "max", separateFromSemantics: true,
  },
  // ── batch 5 · round 4: the least-explored hues ──
  // Picked by farthest-point selection over the 23 chromatic accents already
  // in use. The single largest void is the 90-degree arc from H32 to H122 —
  // orange, amber, gold, yellow — which is precisely the family ruled out in
  // round 1. Pure farthest-point put five of eight picks inside it; that would
  // have produced four near-identical oranges, so the void is sampled three
  // times at even spacing and the rest go to the other genuine gaps.
  //
  // Per the round-4 brief the emphasis is inverted: the six skill roles are
  // gamut-maxed and become the loudest thing on the page, while the semantics
  // are muted to roughly half chroma so status reads as background information.
  // All eight share the muted seaglass ground so the accent is the only variable.
  {
    id: 26, key: "amber-ember", name: "Amber Ember", batch: 5, family: "fresh", pairing: "contrast",
    tag: "orange-red at the edge of the void",
    why: "The 90-degree arc between vermilion and lime is the single least-explored region of the wheel, and this is its lower edge. Hotter and more orange than set 01's Ember evolution, and the only warm accent in the exploration that is not a red. Flagged: this is the gold/orange family you asked me to steer away from in round 1.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 45 }, light: { H: 45 } }, accentMaxChroma: true,
    secondary: 190, tertiary: 260,
    roles: { workflow: 45, "tri-agent": 107, "audit-gate": 169, specialist: 231, advisor: 293, orchestrator: 355 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 350, warning: 100, success: 155, info: 232, "in-progress": 300 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 27, key: "brass", name: "Brass", batch: 5, family: "fresh", pairing: "contrast",
    tag: "true amber-gold, the centre of the void",
    why: "Dead centre of the unexplored arc. Gold is the classic premium signal and nothing in 25 sets has gone near it. It also holds chroma unusually well at high lightness, so it stays legible on a dark ground without going pastel. Flagged: gold, which you previously ruled out.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 68 }, light: { H: 68 } }, accentMaxChroma: true,
    secondary: 210, tertiary: 280,
    roles: { workflow: 68, "tri-agent": 130, "audit-gate": 192, specialist: 254, advisor: 316, orchestrator: 18 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 15, warning: 110, success: 158, info: 232, "in-progress": 320 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 28, key: "sulphur", name: "Sulphur", batch: 5, family: "fresh", pairing: "contrast",
    tag: "yellow, the void's upper edge",
    why: "Pure yellow, the brightest hue sRGB can produce and the most aggressive thing on any dark page. Distinct from set 03's lime and set 22's chartreuse by a clear margin. Flagged: inside the yellow/gold band you asked me to avoid.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 92 }, light: { H: 92 } }, accentMaxChroma: true,
    secondary: 230, tertiary: 300,
    roles: { workflow: 92, "tri-agent": 154, "audit-gate": 216, specialist: 278, advisor: 340, orchestrator: 42 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 15, warning: 50, success: 162, info: 235, "in-progress": 320 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 29, key: "viridian", name: "Viridian", batch: 5, family: "fresh", pairing: "contrast",
    tag: "true green, between lime and emerald",
    why: "A 22-degree gap sits between the halo lime and the slate emerald, and nothing occupies it. Real green - not mint, not lime - reads as a different family from both.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 141 }, light: { H: 141 } }, accentMaxChroma: true,
    secondary: 300, tertiary: 10,
    roles: { workflow: 141, "tri-agent": 203, "audit-gate": 265, specialist: 327, advisor: 29, orchestrator: 91 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 25, warning: 88, success: 175, info: 232, "in-progress": 330 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 30, key: "cerulean", name: "Cerulean", batch: 5, family: "fresh", pairing: "contrast",
    tag: "azure, between cyan and sky",
    why: "One of the two 30-degree gaps in the cool half. Sits between the plum cyan and the Signal sky and belongs to neither.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 220 }, light: { H: 220 } }, accentMaxChroma: true,
    secondary: 340, tertiary: 50,
    roles: { workflow: 220, "tri-agent": 282, "audit-gate": 344, specialist: 46, advisor: 108, orchestrator: 170 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 25, warning: 88, success: 155, info: 195, "in-progress": 330 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 31, key: "cobalt", name: "Cobalt", batch: 5, family: "fresh", pairing: "contrast",
    tag: "deep blue, between sky and indigo",
    why: "The other 30-degree cool gap. Bluer than Signal, warmer than Ink's indigo.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 250 }, light: { H: 250 } }, accentMaxChroma: true,
    secondary: 160, tertiary: 230,
    roles: { workflow: 250, "tri-agent": 312, "audit-gate": 14, specialist: 76, advisor: 138, orchestrator: 200 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 25, warning: 88, success: 155, info: 200, "in-progress": 330 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 32, key: "iris", name: "Iris", batch: 5, family: "fresh", pairing: "contrast",
    tag: "indigo, between deep signal and ultraviolet",
    why: "A 20-degree gap between two violets that both lean away from it. True indigo rather than periwinkle or amethyst.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 278 }, light: { H: 278 } }, accentMaxChroma: true,
    secondary: 170, tertiary: 240,
    roles: { workflow: 278, "tri-agent": 340, "audit-gate": 42, specialist: 104, advisor: 166, orchestrator: 228 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 25, warning: 88, success: 150, info: 232, "in-progress": 335 },
    semanticMute: 0.5, separateFromSemantics: true,
  },
  {
    id: 33, key: "carmine", name: "Carmine", batch: 5, family: "fresh", pairing: "contrast",
    tag: "pink-rose, the second-largest gap",
    why: "The 43-degree arc between the invert magenta and the slate crimson is the largest gap outside the gold void. Lands on a rose-red that is neither pink nor red, and holds the highest chroma of any hue on the wheel.",
    bg: { dark: { H: 190, C: 0.009 }, light: { H: 190, C: 0.0112 } },
    accent: { dark: { H: 357 }, light: { H: 357 } }, accentMaxChroma: true,
    secondary: 180, tertiary: 250,
    roles: { workflow: 357, "tri-agent": 59, "audit-gate": 121, specialist: 183, advisor: 245, orchestrator: 307 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { danger: 30, warning: 88, success: 150, info: 232, "in-progress": 315 },
    semanticMute: 0.5, separateFromSemantics: true,
  },

  // ── batch 6 · the 2.0 decision ──
  // Set 11 Slate & Emerald, chosen 2026-09-07, carrying every improvement made
  // after round 2: `info` is a real fifth semantic, the six skill roles are
  // gamut-maxed, and the semantics are muted to half chroma so status reads as
  // background against the product's own taxonomy. Ground, accent, secondary
  // and tertiary are byte-for-byte set 11. Success moved 172 -> 178 to sit
  // further from the emerald brand colour, which the version-chip dot shares
  // a header with.
  {
    id: 34, key: "slate-emerald-2-0", name: "Slate & Emerald · 2.0", batch: 6, family: "final", pairing: "contrast",
    tag: "The decision — set 11 with every later improvement applied",
    why: "Set 11 exactly as approved, plus the three refinements that came after it: info promoted from an alias of the changelog's next-colour to a real fifth semantic; the six skill roles derived by gamut search so the product's own taxonomy is the loudest colour on the page; and the semantics muted to half chroma so status reads as background. This is the token set the 2.0 site ships on.",
    bg: { dark: { H: 245, C: 0.016 }, light: { H: 245, C: 0.012 } },
    accent: { dark: { H: 152, C: 0.20, L: 0.80 }, light: { H: 152, C: 0.17, L: 0.46 } },
    secondary: 258, tertiary: 318,
    // Roles are seeded into legal slots by hand so the solver has nothing to move:
    // with accent 152 / secondary 258 / tertiary 318 as fixed anchors, every
    // role sits >= 25 deg from all three and >= 36 deg from every other role.
    // The strict role-vs-semantic rule is OFF for this set — semantics are at
    // half chroma, so a role sharing a hue with a muted status colour is far
    // less confusable, and with 14 anchors the strict rule had no legal slot
    // left for orchestrator and pushed it into orange (then coral).
    roles: { workflow: 152, "tri-agent": 115, "audit-gate": 0, specialist: 196, advisor: 232, orchestrator: 293 },
    roleMaxChroma: true, roleTone: "max",
    semantic: { success: 178, danger: 20, warning: 95, info: 225, "in-progress": 340 },
    semanticMute: 0.5,
  },
];

// ── hue separation pass ──────────────────────────────────────
// The changelog's three release states (accent = released, secondary = next,
// tertiary = planned) and the six skill-role colours are different meanings
// and must not look alike. Written by hand the two tables kept landing on the
// same hues — e.g. "next" and the advisor role at 0 deg apart, dE 0.020 — so a
// reader who learns blue = advisor then meets blue = coming-next. This pass
// rotates each role off the identity trio by the smallest amount that clears
// the gap, keeping every set's character while making the meanings distinct.
//
// `workflow` is exempt: it is defined as the accent hue on purpose, so the
// pipeline's primary role reads as the brand colour.
//
// Role-vs-semantic overlaps are deliberately NOT resolved here. audit-gate
// sitting on danger's red and specialist on success's green are defensible
// (a failing gate IS a danger state), and the semantics own conventional
// anchors — green success, red danger, yellow warning — that are not ours to
// move, so only the roles could yield. Adding a role-vs-semantic constraint
// was tried and measured WORSE: 13 anchors do not fit in 360 deg, so pushing
// the roles off the semantics shoved them back onto the identity trio.
// Collision totals: 193 unconstrained, 128 trio-only (this), 130 with the
// semantic constraint added. The residue is reported by audit.mjs and left
// for whichever set wins to settle by hand.
const MIN_TRIO_GAP = 25;   // role vs accent / secondary / tertiary
const MIN_ROLE_GAP = 22;   // role vs role
const MIN_SEM_GAP  = 18;   // role vs semantic — only when separateFromSemantics
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function separateHues(set) {
  const trio = [set.accent.dark.H, set.secondary, set.tertiary];
  const sem = set.separateFromSemantics ? Object.values(set.semantic) : [];
  const out = { ...set.roles };
  const order = Object.keys(out).filter((r) => r !== "workflow");

  // Two tiers. A set with five semantics plus the trio plus six roles is very
  // nearly over-constrained, and a single-tier solver that finds no legal slot
  // silently leaves the role exactly where it collided — the worst outcome.
  // So: try the full rule, and if nothing fits, drop the semantic clause and
  // satisfy the trio at least. Degrading beats giving up.
  // The owner ruled orange/amber/gold out for the brand. A role that gets
  // rotated INTO that band (H 35-100) by the solver reads as an orange pill on
  // every skill page — which is how orchestrator ended up orange on the 2.0
  // set. Candidates in the band are refused unless the role was seeded there
  // on purpose (round 4's amber sets are).
  const BAND = [35, 100];
  const inBand = (h) => h >= BAND[0] && h <= BAND[1];
  const fits = (r, h, strict) => {
    if (inBand(h) && !inBand(set.roles[r])) return false;
    const others = Object.entries(out).filter(([k]) => k !== r).map(([, v]) => v);
    return trio.every((t) => gap(h, t) >= MIN_TRIO_GAP)
      && others.every((v) => gap(h, v) >= MIN_ROLE_GAP)
      && (!strict || sem.every((v) => gap(h, v) >= MIN_SEM_GAP));
  };
  const solve = (r, strict) => {
    if (fits(r, out[r], strict)) return true;
    for (let d = 5; d <= 90; d += 5) {
      for (const cand of [(out[r] + d) % 360, (out[r] - d + 360) % 360]) {
        if (fits(r, cand, strict)) { out[r] = cand; return true; }
      }
    }
    return false;
  };
  // Two passes: moving a later role can free or break an earlier one, so the
  // first pass is re-checked once everything has been placed.
  for (let pass = 0; pass < 2; pass++) {
    for (const r of order) {
      if (!solve(r, sem.length > 0)) solve(r, false);
    }
  }
  return out;
}

for (const set of SETS) set.roles = separateHues(set);

// Largest in-gamut chroma for a given lightness and hue.
function maxChromaAt(L, H) {
  let lo = 0, hi = 0.45;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    // toHex shrinks chroma until the colour fits sRGB, so a value survives
    // round-tripping only if it was actually inside the gamut.
    const back = oklch(toHex({ L, C: mid, H }));
    if (Math.abs(back.C - mid) < 0.002) lo = mid; else hi = mid;
  }
  return lo;
}
// The most saturated colour of this hue that still clears `min` against every
// ground. Semantics sit at high lightness for contrast, but sRGB cannot hold
// much chroma up there — pushing a multiplier just gets clamped away. Walking
// lightness and taking the best achievable chroma at each step finds the
// genuinely most vivid legible version instead.
// `tone` picks among the near-maximal candidates: "max" takes the single most
// saturated, "deep" the darkest of the top band (gem-like), "bright" the
// lightest (glowing). Without it every set lands on the same ceiling and the
// only thing separating them is hue.
function mostVivid(H, bgs, min, dark, tone = "max") {
  const cands = [];
  for (let L = dark ? 0.95 : 0.72; dark ? L >= 0.45 : L >= 0.22; L -= 0.01) {
    const C = maxChromaAt(L, H);
    const hex = toHex({ L, C, H });
    if (bgs.every((bg) => contrast(hex, bg) >= min)) cands.push({ hex, C, L });
  }
  if (!cands.length) return toHex({ L: dark ? 0.8 : 0.45, C: 0.12, H });
  const maxC = Math.max(...cands.map((c) => c.C));
  const band = cands.filter((c) => c.C >= maxC * 0.85);
  if (tone === "deep") return band.reduce((a, b) => (b.L < a.L ? b : a)).hex;
  if (tone === "bright") return band.reduce((a, b) => (b.L > a.L ? b : a)).hex;
  return cands.reduce((a, b) => (b.C > a.C ? b : a)).hex;
}

// ───────────────────────── derivation ─────────────────────────
function buildMode(set, mode) {
  const dark = mode === "dark";
  const cur = dark ? CUR_DARK : CUR_LIGHT;
  const n = set.bg ? ladder(cur, dark ? OBS : CREAM, set.bg[mode]) : { ...cur };
  const grounds = [n.bg, n.surface, n.card];
  const t = { ...n };

  // Text ladder contrast enforcement (batch 2 derived ladders can drift)
  const dirT = dark ? +1 : -1;
  t.text = ensure(oklch(n.text), grounds, 7, dirT).hex;
  t.muted = ensure(oklch(n.muted), grounds, 4.5, dirT).hex;
  t.subtle = ensure(oklch(n.subtle), grounds, 4.5, dirT).hex;

  // Accent: must work as 10-11px text on every ground.
  // `accentMaxChroma` derives it by the same gamut search the semantics use,
  // which reaches roughly C 0.29 — every hand-specified accent in rounds 1-2
  // topped out at 0.230, so this is genuinely past anything shown before.
  const acc = set.accentMaxChroma
    ? (() => { const hex = mostVivid(set.accent[mode].H, grounds, 4.5, dark, set.accentTone); return { hex, spec: oklch(hex) }; })()
    : ensure(set.accent[mode], grounds, 4.5, dirT);
  t.accent = acc.hex;
  const hovSpec = { ...acc.spec, L: acc.spec.L + (dark ? -0.10 : -0.08) };
  t["accent-hover"] = ensure(hovSpec, [t.bg], 3, dark ? -1 : -1).hex;
  // Text on accent (primary button label). Prefer the ground's dark colour.
  const cands = dark ? [t.bg, "#ffffff", t.text] : ["#ffffff", t.text, t.bg];
  t["on-accent"] = cands.find((c) => contrast(c, t.accent) >= 4.5) || cands.reduce((a, b) => (contrast(a, t.accent) > contrast(b, t.accent) ? a : b));
  t["accent-dim"] = rgba(t.accent, dark ? 0.10 : 0.12);

  // A second brand colour, for duotone sets. Every set in rounds 1-2 had
  // exactly one accent; a two-colour brand is a different animal, not a
  // different hue. Defaults to the accent so single-accent sets are unaffected.
  t["accent-2"] = set.accent2
    ? (set.accent2MaxChroma
        ? mostVivid(set.accent2[mode].H, grounds, 4.5, dark, set.accentTone)
        : ensure(set.accent2[mode], grounds, 4.5, dirT).hex)
    : t.accent;
  t["accent-2-dim"] = rgba(t["accent-2"], dark ? 0.10 : 0.12);

  // A deep fill for the primary button, with a light label on it. Every accent
  // so far sits at L 0.66-0.93 and is painted as light-on-dark; a dark solid
  // block inverts the page's weight entirely. `accent` stays text-legible for
  // links and eyebrows; only the fill goes dark.
  if (set.accentFill) {
    t["accent-fill"] = toHex({ H: set.accentFill.H, C: set.accentFill.C ?? 0.20, L: dark ? set.accentFill.L : (set.accentFill.Llight ?? set.accentFill.L) });
    t["on-accent-fill"] = ["#ffffff", t.text, t.bg].find((c) => contrast(c, t["accent-fill"]) >= 4.5) || "#ffffff";
  } else {
    t["accent-fill"] = t.accent;
    t["on-accent-fill"] = t["on-accent"];
  }
  t["accent-glow"] = rgba(t.accent, dark ? 0.22 : 0.16);
  t.glow = rgba(t.accent, dark ? 0.14 : 0.10);

  // Secondary (changelog "next" / info) + tertiary ("planned")
  const secSpec = dark ? { H: set.secondary, C: 0.12, L: 0.78 } : { H: set.secondary, C: 0.13, L: 0.48 };
  const terSpec = dark ? { H: set.tertiary, C: 0.12, L: 0.78 } : { H: set.tertiary, C: 0.13, L: 0.48 };
  t.secondary = ensure(secSpec, grounds, 4.5, dirT).hex;
  t.tertiary = ensure(terSpec, grounds, 4.5, dirT).hex;
  t["secondary-dim"] = rgba(t.secondary, 0.12);
  t["tertiary-dim"] = rgba(t.tertiary, 0.12);

  // Semantic
  // `info` is a first-class semantic only when a set names it. Sets that do
  // not still alias it to `secondary` (the changelog's "next" colour), which
  // is what production does today — and is exactly why the semantic row reads
  // flat there: the info badge and the next-release identity are one colour.
  const semL = dark
    ? { success: 0.78, danger: 0.72, warning: 0.82, "in-progress": 0.84, info: 0.78 }
    : { success: 0.45, danger: 0.48, warning: 0.46, "in-progress": 0.50, info: 0.46 };
  const semC = { success: 0.15, danger: 0.17, warning: 0.16, "in-progress": 0.11, info: 0.14 };
  const vib = set.semanticVibrance || 1;
  for (const [k, H] of Object.entries(set.semantic)) {
    if (set.semanticMaxChroma) {
      t[k] = mostVivid(H, grounds, 4.5, dark, set.semanticTone);
    } else {
      const C = Math.min((set.semanticC?.[k] ?? semC[k]) * vib * (set.semanticMute ?? 1), 0.37);
      const L = clamp(semL[k] + (dark ? (set.semanticLift || 0) : 0), 0.02, 0.99);
      t[k] = ensure({ H, C, L }, grounds, 4.5, dirT).hex;
    }
    t[`${k}-dim`] = rgba(t[k], 0.12);
  }
  if (!("info" in set.semantic)) { t.info = t.secondary; t["info-dim"] = t["secondary-dim"]; }

  // Roles — dark: ≥4.5 on card + on 15% pill over surface; light: same.
  for (const [role, H] of Object.entries(set.roles)) {
    // `roleMaxChroma` gives the skill-role taxonomy the same gamut-search
    // treatment the semantics get, so the roles become the loudest thing on
    // the page instead of the quietest.
    const spec = dark ? { H, C: 0.14, L: 0.80 } : { H, C: 0.13, L: 0.46 };
    let r = set.roleMaxChroma
      ? (() => { const hex = mostVivid(H, grounds, 4.5, dark, set.roleTone); return { hex, spec: oklch(hex) }; })()
      : ensure(spec, grounds, 4.5, dirT);
    // pill bg = 15% role over surface; check text-on-pill too
    for (let i = 0; i < 100; i++) {
      const pill = mix(r.hex, t.surface, 0.15);
      if (contrast(r.hex, pill) >= 4.5) break;
      r = { spec: { ...r.spec, L: clamp(r.spec.L + dirT * 0.004, 0.02, 0.99) }, hex: toHex({ ...r.spec, L: clamp(r.spec.L + dirT * 0.004, 0.02, 0.99) }) };
    }
    t[role] = r.hex;
    t[`${role}-pill`] = mix(r.hex, t.surface, 0.15);
  }

  // Logo
  t["logo-stroke"] = t.text; t["logo-spine"] = t.subtle; t["logo-filled"] = t.accent; t["logo-dot-dark"] = t.bg;
  return t;
}

// ───────────────────────── audit ─────────────────────────
function audit(t, dark) {
  const grounds = { bg: t.bg, surface: t.surface, card: t.card };
  const rows = [];
  const push = (label, fg, bgName, min) => {
    const r = contrast(fg, grounds[bgName]);
    rows.push({ label, fg, bg: bgName, ratio: +r.toFixed(2), min, pass: r >= min });
  };
  for (const g of Object.keys(grounds)) {
    push("text", t.text, g, 7);
    push("muted", t.muted, g, 4.5);
    push("subtle", t.subtle, g, 4.5);
    push("accent (text)", t.accent, g, 4.5);
    push("secondary (text)", t.secondary, g, 4.5);
    push("tertiary (text)", t.tertiary, g, 4.5);
  }
  push("accent-hover (ui)", t["accent-hover"], "bg", 3);
  rows.push({ label: "on-accent / accent", fg: t["on-accent"], bg: "accent", ratio: +contrast(t["on-accent"], t.accent).toFixed(2), min: 4.5, pass: contrast(t["on-accent"], t.accent) >= 4.5 });
  for (const k of ["success", "danger", "warning", "in-progress"]) push(k, t[k], "card", 4.5);
  for (const role of ["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"]) {
    push(`role:${role} on card`, t[role], "card", 4.5);
    const r = contrast(t[role], t[`${role}-pill`]);
    rows.push({ label: `role:${role} on pill`, fg: t[role], bg: "pill", ratio: +r.toFixed(2), min: 4.5, pass: r >= 4.5 });
  }
  // border visibility (non-text, informational)
  rows.push({ label: "border / bg (info)", fg: t.border, bg: "bg", ratio: +contrast(t.border, t.bg).toFixed(2), min: 1.5, pass: contrast(t.border, t.bg) >= 1.5 });
  return rows;
}

// ───────────────────────── emit ─────────────────────────
const TOKEN_ORDER = [
  "bg", "ribbon", "ribbon-edge", "surface", "card", "border", "text", "muted", "subtle",
  "accent", "accent-hover", "on-accent", "accent-dim", "accent-glow", "glow",
  "accent-2", "accent-2-dim", "accent-fill", "on-accent-fill",
  "secondary", "secondary-dim", "tertiary", "tertiary-dim", "info", "info-dim",
  "success", "success-dim", "danger", "danger-dim", "warning", "warning-dim", "in-progress", "in-progress-dim",
  "workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator",
  "workflow-pill", "tri-agent-pill", "audit-gate-pill", "specialist-pill", "advisor-pill", "orchestrator-pill",
  "logo-stroke", "logo-spine", "logo-filled", "logo-dot-dark",
];

const out = { generated: new Date().toISOString(), sets: [] };
let css = "/* generated by gen-tokens.mjs — do not hand-edit */\n";
for (const set of SETS) {
  const entry = { id: set.id, key: set.key, name: set.name, batch: set.batch, family: set.family || null, pairing: set.pairing || null, treatment: set.treatment || null, tag: set.tag, why: set.why, modes: {}, audit: {} };
  for (const mode of ["dark", "light"]) {
    const t = buildMode(set, mode);
    entry.modes[mode] = t;
    entry.audit[mode] = audit(t, mode === "dark");
    css += `[data-set="${set.id}"][data-mode="${mode}"] {\n`;
    for (const k of TOKEN_ORDER) css += `  --${k}: ${t[k]};\n`;
    css += `}\n`;
  }
  out.sets.push(entry);
}
fs.writeFileSync(path.join(OUT, "tokens.json"), JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(OUT, "tokens.css"), css);

// Console summary
for (const s of out.sets) {
  for (const mode of ["dark", "light"]) {
    const t = s.modes[mode];
    const fails = s.audit[mode].filter((r) => !r.pass && r.min > 1.5);
    const minAcc = Math.min(...["bg", "surface", "card"].map((g) => contrast(t.accent, t[g]))).toFixed(2);
    console.log(`${String(s.id).padStart(2)} ${s.name.padEnd(16)} ${mode.padEnd(5)} bg ${t.bg} accent ${t.accent} on ${t["on-accent"]} sec ${t.secondary} ter ${t.tertiary} | accent/ground min ${minAcc} | fails ${fails.length}${fails.length ? " → " + fails.map((f) => `${f.label}@${f.bg}=${f.ratio}`).join(", ") : ""}`);
  }
}
