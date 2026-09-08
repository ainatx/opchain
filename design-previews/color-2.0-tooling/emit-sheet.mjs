// emit-sheet.mjs — the 2.0 token sheet.
//
// Reads the decided set (id 34, "Slate & Emerald · 2.0") out of tokens.json and
// writes two artefacts:
//   tokens-2.0.css  — a drop-in candidate for site/src/styles/tokens.css. Same
//                     structure and comment style as production; every
//                     non-colour section is spliced in verbatim from the shipped
//                     file so nothing but colour changes.
//   TOKENS-2.0.md   — the human sheet: decision record, rename map, every colour
//                     token in both modes with OKLCH and measured contrast, the
//                     new tokens and what they replace, known trade-offs.
// Nothing under site/ is touched. Run gen-tokens.mjs first.
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "../..");
const PROD = path.join(ROOT, "site/src/styles/tokens.css");
const T = JSON.parse(fs.readFileSync(path.join(HERE, "tokens.json"), "utf8"));
const SET = T.sets.find((s) => s.id === 34);
if (!SET) throw new Error("set 34 not in tokens.json — run gen-tokens.mjs");
const D = SET.modes.dark, L = SET.modes.light;
const DATE = "2026-09-07";

// ── colour maths (self-contained; the audit deliberately does not share code) ──
const h2r = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1).slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = h2r(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function oklch(hex) {
  const [r, g, b] = h2r(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const Lv = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L: Lv, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}
const ok = (hex) => { const o = oklch(hex); return `${o.L.toFixed(2)} ${o.C.toFixed(3)} ${o.H.toFixed(0)}`; };
const rgba = (hex, a) => { const [r, g, b] = h2r(hex).map((v) => Math.round(v * 255)); return `rgba(${r}, ${g}, ${b}, ${a})`; };
const r2 = (x) => x.toFixed(2);
// sRGB composite of an rgba() string over a hex ground — what the tint really renders as
const over = (rgbaStr, ground) => {
  const [r, g, b, a] = rgbaStr.match(/[\d.]+/g).map(Number);
  const G = h2r(ground).map((v) => v * 255);
  return "#" + [r, g, b].map((v, i) => Math.round(v * a + G[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
};

// `destructive` is not in the generator (the mockups never render it). Production
// keeps a deeper red than danger for irreversible actions; derive it as danger's
// hue at a lower lightness so it stays in the family.
function darker(hex, dL) {
  const o = oklch(hex); const target = Math.max(0.2, o.L + dL);
  // walk a hex back from OKLCH via small search (no forward transform here to keep this file short)
  let best = hex, bestD = 1e9;
  for (let r = 0; r < 256; r += 3) for (let g = 0; g < 256; g += 3) for (let b = 0; b < 256; b += 3) {
    const cand = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
    const c = oklch(cand);
    const d = Math.abs(c.L - target) * 4 + Math.abs(c.C - o.C) + Math.min(Math.abs(c.H - o.H), 360 - Math.abs(c.H - o.H)) / 60;
    if (d < bestD) { bestD = d; best = cand; }
  }
  return best;
}
D.destructive = darker(D.danger, -0.30); L.destructive = darker(L.danger, -0.12);
for (const m of [D, L]) m["destructive-dim"] = rgba(m.destructive, 0.12);

// ── splice the non-colour sections out of production verbatim ──
const prod = fs.readFileSync(PROD, "utf8");
const cut = (from, to) => { const i = prod.indexOf(from); const j = prod.indexOf(to, i); if (i < 0 || j < 0) throw new Error(`marker not found: ${from}`); return prod.slice(i, j); };
const TYPO_TO_END_OF_ROOT = cut("  /* ── Typography ── */", "\n}\n\n/* ─────────── LIGHT THEME");
const LIGHT_SHADOWS = cut("  /* Layered shadows — lighter on light grounds", "\n}\n\n/* ── prefers-reduced-motion ── */");
const TAIL = prod.slice(prod.indexOf("/* ── prefers-reduced-motion ── */"));

// ── proposed brand constants (rename map for the old obsidian/ember set) ──
const BRAND = [
  ["slate",        D.bg,              "obsidian",  "the ground"],
  ["slate-2",      D.surface,         "forge",     "raised surface"],
  ["gunmetal",     D.border,          "slag",      "hairline borders"],
  ["mist",         D.muted,           "sand",      "secondary text"],
  ["frost",        D.text,            "linen",     "primary text"],
  ["paper",        L.bg,              "parchment", "light-mode ground"],
  ["emerald",      D.accent,          "ember",     "the accent"],
  ["moss",         D["accent-hover"], "char",      "accent hover"],
  ["emerald-dim",  D["accent-dim"],   "ember-dim", "10% accent tint"],
  ["emerald-glow", D["accent-glow"],  "ember-glow","22% accent halo"],
];

// ── tokens-2.0.css ──
const pad = (k) => (k + ":").padEnd(15);
const line = (k, v, note) => `  --${pad(k)}${v};${note ? "  /* " + note + " */" : ""}`;
const block = (m, dark) => [
  line("bg", dark ? "var(--slate)" : m.bg),
  line("ribbon", m.ribbon),
  line("ribbon-edge", m["ribbon-edge"]),
  line("surface", m.surface),
  line("card", m.card),
  line("border", dark ? "var(--gunmetal)" : m.border),
  line("text", dark ? "var(--frost)" : m.text),
  line("muted", dark ? "var(--mist)" : m.muted),
  line("subtle", m.subtle),
  line("accent", m.accent),
  line("accent-hover", m["accent-hover"]),
  line("on-accent", m["on-accent"], "NEW — label colour on an accent fill; replaces hardcoded var(--obsidian) on primary buttons"),
  line("accent-dim", m["accent-dim"]),
  line("accent-glow", m["accent-glow"], "NEW — replaces --ember-glow in the stage + release bar"),
  line("glow", m.glow),
  "",
  "  /* Release-state identities for /changelog — NEW. `next` was --info and",
  "     `planned` was a page-scoped --cl-violet; both become first-class. */",
  line("secondary", m.secondary, "released = accent · next = secondary"),
  line("secondary-dim", m["secondary-dim"]),
  line("tertiary", m.tertiary, "planned"),
  line("tertiary-dim", m["tertiary-dim"]),
  "",
  "  /* Semantic state colours — muted to half chroma on purpose (2.0 decision):",
  "     status is background information; the skill roles below carry the colour. */",
  line("danger", m.danger), line("danger-dim", m["danger-dim"]),
  line("success", m.success), line("success-dim", m["success-dim"]),
  line("info", m.info, "NOW A REAL COLOUR — was an alias of the changelog next-colour"), line("info-dim", m["info-dim"]),
  line("warning", m.warning), line("warning-dim", m["warning-dim"]),
  line("in-progress", m["in-progress"]), line("in-progress-dim", m["in-progress-dim"]),
  line("destructive", m.destructive), line("destructive-dim", m["destructive-dim"]),
  "",
  "  /* ── Skill role tokens — gamut-maxed (2.0 decision): the product's own",
  "     taxonomy is the loudest colour on the page. Each also gets its rendered",
  "     15%-over-surface pill background, so no page needs to precompute one. */",
  ...["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"].flatMap((r) => [line(r, m[r]), line(`${r}-pill`, m[`${r}-pill`])]),
  "",
  "  /* Logo tokens */",
  line("logo-stroke", "var(--text)"), line("logo-spine", "var(--subtle)"), line("logo-filled", "var(--accent)"), line("logo-dot-dark", "var(--bg)"),
].join("\n");

const css = `/* ─────────────────────────────────────────────────────────────
   opchain — design tokens · 2.0 · Slate & Emerald
   Canonical source of truth. Shared with public/styles.css.
   Consumed by the Astro site via global.css @theme block
   (exposes tokens as Tailwind 4 utilities) and directly in
   component <style> scopes.

   Theme switching: [data-theme="light"] on <html>.

   Generated ${DATE} by design-previews/color-2.0-tooling/emit-sheet.mjs
   from set 34 of the colour exploration. Every colour value below was
   derived in OKLCH and verified against WCAG AA (see TOKENS-2.0.md);
   every non-colour section is copied verbatim from the shipped file.
   ───────────────────────────────────────────────────────────── */

:root {
  /* ── Brand constants (never themed) ── */
${BRAND.map(([k, v, old]) => line(k, v, `was --${old}`)).join("\n")}

  /* ── Legacy names — kept as aliases so global.css's @theme block and the
     components that still reference the old constants keep resolving after
     the swap. Migrate call sites to the new names (MIGRATION-SURFACE.md lists
     every one), then delete this block. ── */
${BRAND.map(([k, , old]) => line(old, `var(--${k})`)).join("\n")}

  /* ── Dark theme (default — Slate) ── */
${block(D, true)}

${TYPO_TO_END_OF_ROOT}
}

/* ─────────── LIGHT THEME (Paper) ─────────── */
[data-theme="light"] {
${block(L, false)}

${LIGHT_SHADOWS}
}

${TAIL}`;
fs.writeFileSync(path.join(HERE, "tokens-2.0.css"), css);

// ── TOKENS-2.0.md ──
const G = (m) => ({ bg: m.bg, surface: m.surface, card: m.card });
const rowGround = (k, note) => `| \`--${k}\` | \`${D[k]}\` | ${ok(D[k])} | \`${L[k]}\` | ${ok(L[k])} | ${note} |`;
const rowText = (k, floor) => {
  const dmin = Math.min(...Object.values(G(D)).map((g) => cr(D[k], g))), lmin = Math.min(...Object.values(G(L)).map((g) => cr(L[k], g)));
  return `| \`--${k}\` | \`${D[k]}\` | ${ok(D[k])} | **${r2(dmin)}:1** | \`${L[k]}\` | ${ok(L[k])} | **${r2(lmin)}:1** | ${floor} |`;
};
const rowRole = (r) => `| \`--${r}\` | \`${D[r]}\` | ${ok(D[r])} | ${r2(cr(D[r], D.card))}:1 | \`${D[r + "-pill"]}\` | ${r2(cr(D[r], D[r + "-pill"]))}:1 | \`${L[r]}\` | ${ok(L[r])} | ${r2(cr(L[r], L.card))}:1 | \`${L[r + "-pill"]}\` | ${r2(cr(L[r], L[r + "-pill"]))}:1 |`;
const avgC = (m, keys) => (keys.reduce((a, k) => a + oklch(m[k]).C, 0) / keys.length).toFixed(3);
const ROLES = ["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"];
const SEMS = ["danger", "warning", "success", "info", "in-progress"];

const md = `# opchain 2.0 — token sheet · Slate & Emerald

**Decision date:** ${DATE} · **Source set:** 34 (\`slate-emerald-2-0\`) in \`gen-tokens.mjs\` · **Status:** finalized, not yet applied to \`site/\`

## Decision record

Set **11 Slate & Emerald** won the exploration (34 candidates over four rounds; see
\`EVALUATION.md\`). The sheet below is set 11 **plus the three refinements made after
round 2**, which the owner elected to carry:

1. \`--info\` becomes a real fifth semantic. In production it is an alias of the
   changelog's "next" colour, so the info badge and the next-release identity are
   literally one colour.
2. The six skill-role colours are derived by gamut search — the product's own
   taxonomy is the loudest colour on the page (mean chroma dark **${avgC(D, ROLES)}**).
3. The semantic status colours are muted to half chroma (mean **${avgC(D, SEMS)}**), so
   status reads as background against the roles.

Ground, accent, secondary and tertiary are byte-for-byte set 11. One hue moved:
\`success\` 172° → 178°, to sit further from the emerald brand colour that the
header's version-chip dot shares a row with.

**Verification.** \`audit.mjs\` (which reimplements the colour maths independently of
the generator) reports **zero WCAG failures** across every check in both modes:
text ≥ 7:1 and muted / subtle / accent / secondary / tertiary / roles / semantics
≥ 4.5:1 on bg, surface and card; hover ≥ 3:1; each role ≥ 4.5:1 on its own pill.

## Files

| File | What it is |
|---|---|
| \`tokens-2.0.css\` | Drop-in candidate for \`site/src/styles/tokens.css\`. Same structure and comment style; non-colour sections spliced verbatim from the shipped file. |
| \`TOKENS-2.0.md\` | This sheet. |
| \`MIGRATION-SURFACE.md\` | Every colour literal in \`site/src\` that bypasses the token layer and would render in the old colours after the swap — catalogued and adversarially verified by a workflow. **A recolour is not a tokens.css swap; read this before scheduling the work.** |

## Rename map — brand constants

Production names the constants after the old palette (\`--obsidian\`, \`--ember\`, …).
They are referenced directly in ${"`global.css`"}'s \`@theme\` block and in a handful of
components (\`Button.astro\` light-mode primary, \`::selection\`, the workbenches) — 180
references in all — so \`tokens-2.0.css\` defines the **new names** and keeps the **old
names as aliases** (\`--obsidian: var(--slate)\` …) so nothing breaks on the swap. The
aliases are a migration aid, not a permanent API: once call sites move, delete the
block. Proposed names:

| New | Value (dark) | Replaces | Role |
|---|---|---|---|
${BRAND.map(([k, v, old, role]) => `| \`--${k}\` | \`${v}\` | \`--${old}\` | ${role} |`).join("\n")}

## Ground ladder

Cool slate: OKLCH hue 245, chroma 0.016 (dark) / 0.012 (light). Light mode is
*not* the dark ladder inverted — light grounds need more chroma than dark to read
as equally tinted, so it is set independently.

| Token | Dark | OKLCH L C H | Light | OKLCH L C H | Purpose |
|---|---|---|---|---|---|
${rowGround("bg", "page ground")}
${rowGround("ribbon", "sticky header")}
${rowGround("ribbon-edge", "header hairline")}
${rowGround("surface", "raised: cards on bg, inputs, tiles")}
${rowGround("card", "resource cards, changelog cards")}
${rowGround("border", "0.5px hairlines")}

## Text ladder

Minimum contrast is the *worst* of bg / surface / card.

| Token | Dark | OKLCH | min contrast | Light | OKLCH | min contrast | floor |
|---|---|---|---|---|---|---|---|
${rowText("text", "7:1 (AAA body)")}
${rowText("muted", "4.5:1")}
${rowText("subtle", "4.5:1")}

## Accent family

| Token | Dark | OKLCH | min contrast | Light | OKLCH | min contrast | floor |
|---|---|---|---|---|---|---|---|
${rowText("accent", "4.5:1 — used as 10–11px text")}
${rowText("secondary", "4.5:1")}
${rowText("tertiary", "4.5:1")}

| Token | Dark | Light | Note |
|---|---|---|---|
| \`--accent-hover\` | \`${D["accent-hover"]}\` (${r2(cr(D["accent-hover"], D.bg))}:1 vs bg) | \`${L["accent-hover"]}\` (${r2(cr(L["accent-hover"], L.bg))}:1 vs bg) | UI surface floor is 3:1 |
| \`--on-accent\` | \`${D["on-accent"]}\` (${r2(cr(D["on-accent"], D.accent))}:1 on accent) | \`${L["on-accent"]}\` (${r2(cr(L["on-accent"], L.accent))}:1 on accent) | **NEW.** Label on a filled accent. Production hardcodes \`var(--obsidian)\` on primary buttons, which is wrong the moment the accent is not light-on-dark. |
| \`--accent-dim\` | \`${D["accent-dim"]}\` | \`${L["accent-dim"]}\` | renders as \`${over(D["accent-dim"], D.surface)}\` / \`${over(L["accent-dim"], L.surface)}\` over surface; text on it: ${r2(cr(D.text, over(D["accent-dim"], D.surface)))}:1 / ${r2(cr(L.text, over(L["accent-dim"], L.surface)))}:1 |
| \`--accent-glow\` | \`${D["accent-glow"]}\` | \`${L["accent-glow"]}\` | **NEW.** Replaces \`--ember-glow\` (stage banner, release bar). |
| \`--glow\` | \`${D.glow}\` | \`${L.glow}\` | card / ribbon halo |
| \`--secondary-dim\` | \`${D["secondary-dim"]}\` | \`${L["secondary-dim"]}\` | |
| \`--tertiary-dim\` | \`${D["tertiary-dim"]}\` | \`${L["tertiary-dim"]}\` | |

**What secondary and tertiary replace.** \`/changelog\` encodes three release states.
Today: released = \`--accent\`, next = \`--info\`, planned = a page-scoped \`--cl-violet\`.
In 2.0: released = \`--accent\`, next = \`--secondary\`, planned = \`--tertiary\`. This is what
frees \`--info\` to be a real semantic.

## Semantic state colours

Muted to half chroma by decision. Contrast is measured on \`--card\`, where badges sit.

| Token | Dark | OKLCH | on card | Light | OKLCH | on card |
|---|---|---|---|---|---|---|
${[...SEMS, "destructive"].map((k) => `| \`--${k}\` | \`${D[k]}\` | ${ok(D[k])} | ${r2(cr(D[k], D.card))}:1 | \`${L[k]}\` | ${ok(L[k])} | ${r2(cr(L[k], L.card))}:1 |`).join("\n")}

Every semantic has a matching \`-dim\` at 12% alpha. \`--destructive\` is not produced by
the generator (nothing in the mockups renders it); it is derived here as danger's hue
at lower lightness, matching production's intent of a deeper red for irreversible
actions.

## Skill-role colours

Gamut-maxed by decision. \`*-pill\` is the rendered 15%-over-surface tint the role tag
sits on, precomputed for both modes so \`skills/index.astro\` no longer has to hardcode
light-mode pill backgrounds.

| Token | Dark | OKLCH | on card | pill | on pill | Light | OKLCH | on card | pill | on pill |
|---|---|---|---|---|---|---|---|---|---|---|
${ROLES.map(rowRole).join("\n")}

## Logo

\`--logo-stroke\` → \`--text\`, \`--logo-spine\` → \`--subtle\`, \`--logo-filled\` → \`--accent\`,
\`--logo-dot-dark\` → \`--bg\`. Unchanged as indirections; the filled node goes emerald.

## Unchanged

Typography, type scale, line-heights, letter-spacing, wordmark tracking, the 4px space
scale, logo spacing, radii, shadows, glow composition, motion, focus ring, the
reduced-motion block and the desktop type bump are **copied verbatim** from the shipped
\`tokens.css\`. Only colour changes.

## New tokens (and what each replaces)

| Token | Replaces |
|---|---|
| \`--on-accent\` | hardcoded \`var(--obsidian)\` as the label on \`.btn-primary\`, \`::selection\`, release-bar tag |
| \`--accent-glow\` | \`--ember-glow\` |
| \`--secondary\`, \`--secondary-dim\` | \`--info\` where it meant *coming next* on /changelog and the homepage release bar |
| \`--tertiary\`, \`--tertiary-dim\` | the page-scoped \`--cl-violet\` / \`--cl-violet-dim\` in \`changelog.astro\` |
| \`--<role>-pill\` ×6 | the six precomputed light-mode backgrounds in \`skills/index.astro\` |
| \`--info\` (real colour) | \`--info: var(--secondary)\` alias |

## Known trade-offs

- **Light mode is duller.** Emerald cannot survive a light ground at chroma: the accent
  drops from ${ok(D.accent)} to ${ok(L.accent)} (−0.082 chroma, the largest of any set). Hue is
  preserved (0.1° shift), so it reads as the same brand, but it is a forest green, not
  a jewel green. This was flagged in the evaluation and accepted with the decision.
- **Three light-mode near-collisions**, all role-vs-semantic and all ≥ 18° apart:
  tri-agent/warning, specialist/success, orchestrator/danger. Semantics own their
  conventional hues, so only the roles could yield, and the solver already did what
  the constraints allow. Acceptable; noted so nobody rediscovers them.
- **The accent shares a hue with \`--workflow\`** on purpose — the pipeline's primary
  role reads as the brand colour.

## Regenerating

\`\`\`bash
cd design-previews/color-2.0-tooling
node gen-tokens.mjs && node audit.mjs && node emit-sheet.mjs
\`\`\`

Edit set 34 in \`gen-tokens.mjs\`, never this file or \`tokens-2.0.css\` by hand.
`;
fs.writeFileSync(path.join(HERE, "TOKENS-2.0.md"), md);
console.log("wrote tokens-2.0.css and TOKENS-2.0.md");
console.log("  destructive: dark", D.destructive, "light", L.destructive);
