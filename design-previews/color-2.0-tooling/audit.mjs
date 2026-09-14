// audit.mjs — independent verification of tokens.json.
//
// Deliberately does NOT import anything from gen-tokens.mjs: the colour
// maths is reimplemented here so a bug in the generator cannot hide itself
// by also being present in its own check. Run after gen-tokens.mjs.
//
//   node audit.mjs            # summary
//   node audit.mjs --verbose  # every row, not just failures
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const T = JSON.parse(fs.readFileSync(path.join(HERE, "tokens.json"), "utf8"));
const VERBOSE = process.argv.includes("--verbose");

// ── colour maths (independent reimplementation) ──
const hex2rgb = (h) => {
  h = h.trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function relLum(hex) {
  const [r, g, b] = hex2rgb(hex).map(srgb2lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function oklab(hex) {
  const [r, g, b] = hex2rgb(hex).map(srgb2lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}
const dE = (p, q) => {
  const x = oklab(p), y = oklab(q);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
};
const hueOf = (hex) => {
  const { a, b } = oklab(hex);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};
const chromaOf = (hex) => { const { a, b } = oklab(hex); return Math.hypot(a, b); };
const hueGap = (p, q) => { const d = Math.abs(hueOf(p) - hueOf(q)) % 360; return d > 180 ? 360 - d : d; };
// sRGB composite of `fg` at `alpha` over `bg` — what a *-dim token renders as.
function over(fg, bg, alpha) {
  const f = hex2rgb(fg), b = hex2rgb(bg);
  return "#" + f.map((v, i) => Math.round((v * alpha + b[i] * (1 - alpha)) * 255).toString(16).padStart(2, "0")).join("");
}
const alphaOf = (rgba) => parseFloat(rgba.slice(rgba.lastIndexOf(",") + 1)) || 0;

const ROLES = ["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"];
const SEMS = ["success", "danger", "warning", "in-progress"];
const GROUNDS = ["bg", "surface", "card"];

let contrastRows = 0, contrastFails = [];
const collisions = [], stateIssues = [], divergence = [];

for (const s of T.sets) {
  for (const mode of ["dark", "light"]) {
    const t = s.modes[mode];
    const tag = `${String(s.id).padStart(2, "0")} ${s.name} / ${mode}`;
    const check = (label, fg, bgHex, min) => {
      contrastRows++;
      const r = ratio(fg, bgHex);
      if (r < min) contrastFails.push(`${tag}: ${label} = ${r.toFixed(2)}:1 (needs ${min})`);
      if (VERBOSE) console.log(`  ${tag} ${label} ${r.toFixed(2)}`);
    };

    // 1. text + accent ladder on every ground
    for (const g of GROUNDS) {
      check(`text on ${g}`, t.text, t[g], 7);
      for (const k of ["muted", "subtle", "accent", "secondary", "tertiary"]) check(`${k} on ${g}`, t[k], t[g], 4.5);
      for (const k of SEMS) check(`${k} on ${g}`, t[k], t[g], 4.5);
      for (const r of ROLES) check(`role:${r} on ${g}`, t[r], t[g], 4.5);
    }
    // 2. button label on its own fill, and the hover fill as a UI surface
    check("on-accent over accent", t["on-accent"], t.accent, 4.5);
    check("accent-hover vs bg", t["accent-hover"], t.bg, 3);
    // 3. each role label on its own 15% pill
    for (const r of ROLES) check(`role:${r} on its pill`, t[r], t[`${r}-pill`], 4.5);
    // 4. text sitting on the *-dim tints the mockups actually use
    for (const [k, dim] of [["accent", "accent-dim"], ["secondary", "secondary-dim"], ["tertiary", "tertiary-dim"]]) {
      const bgHex = over(t[k], t.surface, alphaOf(t[dim]));
      check(`text on ${dim} tint`, t.text, bgHex, 4.5);
      check(`${k} on its own ${dim} tint`, t[k], bgHex, 3);
    }

    // 5. hue collisions — colours that carry different meanings but look alike
    const named = { accent: t.accent, secondary: t.secondary, tertiary: t.tertiary };
    for (const r of ROLES) named[`role:${r}`] = t[r];
    for (const k of SEMS) named[k] = t[k];
    const keys = Object.keys(named);
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const [A, B] = [keys[i], keys[j]];
        // a role and its same-named accent are intentionally the same colour
        if (A === "accent" && B.startsWith("role:") && hueGap(named[A], named[B]) < 3) continue;
        const d = dE(named[A], named[B]), h = hueGap(named[A], named[B]);
        if (d < 0.085 && h < 22) collisions.push({ tag, A, B, d, h, hexA: named[A], hexB: named[B] });
      }
    }

    // 6. state legibility — pairs the UI relies on being told apart
    const pairs = [
      ["tab pill selected vs unselected", over(t.accent, t.surface, alphaOf(t["accent-dim"])), t.surface],
      ["vote button voted vs default", over(t.tertiary, t.bg, alphaOf(t["tertiary-dim"])), t.bg],
      ["TOC active vs idle link", t.accent, t.subtle],
      ["nav active vs idle", t.text, t.muted],
      ["released vs next card rail", t.accent, t.secondary],
      ["next vs planned card rail", t.secondary, t.tertiary],
      ["released vs planned card rail", t.accent, t.tertiary],
    ];
    for (const [label, x, y] of pairs) {
      const d = dE(x, y);
      if (d < 0.05) stateIssues.push({ tag, label, d, x, y });
    }
  }

  // 7. how far each set's light mode drifts from its dark mode
  const dA = s.modes.dark.accent, lA = s.modes.light.accent;
  divergence.push({
    id: s.id, name: s.name,
    hue: hueGap(dA, lA),
    chroma: chromaOf(dA) - chromaOf(lA),
    dark: dA, light: lA,
  });
}

const line = (c = "─") => console.log(c.repeat(78));
console.log(`\nAUDIT — ${T.sets.length} sets x 2 modes, generated ${T.generated.slice(0, 10)}`);
line();
console.log(`1. WCAG contrast: ${contrastRows} checks, ${contrastFails.length} failures`);
contrastFails.forEach((f) => console.log("   FAIL " + f));

console.log(`\n2. Hue collisions (dE < 0.085 AND hue gap < 22 deg): ${collisions.length}`);
for (const c of collisions) console.log(`   ${c.tag}: ${c.A} ${c.hexA} vs ${c.B} ${c.hexB} — dE ${c.d.toFixed(3)}, ${c.h.toFixed(0)} deg apart`);

console.log(`\n3. State pairs too close to tell apart (dE < 0.05): ${stateIssues.length}`);
for (const s of stateIssues) console.log(`   ${s.tag}: ${s.label} — dE ${s.d.toFixed(3)} (${s.x} vs ${s.y})`);

console.log(`\n4. Dark-to-light accent drift (large hue shift = the two modes read as different brands)`);
divergence.sort((a, b) => b.hue - a.hue);
for (const d of divergence) {
  const flag = d.hue > 12 ? "  <-- hue shifts" : d.chroma > 0.075 ? "  <-- light much duller" : "";
  console.log(`   ${String(d.id).padStart(2)} ${d.name.padEnd(26)} ${d.dark} -> ${d.light}  hue ${d.hue.toFixed(1).padStart(5)} deg  chroma -${d.chroma.toFixed(3)}${flag}`);
}
line();
const bad = contrastFails.length + collisions.length + stateIssues.length;
console.log(bad === 0 ? "PASS — no contrast failures, no collisions, all states distinguishable.\n"
                      : `${bad} issue(s) found.\n`);
process.exit(0);
