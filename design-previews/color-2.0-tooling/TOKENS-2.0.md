# opchain 2.0 — token sheet · Slate & Emerald

**Decision date:** 2026-09-07 · **Source set:** 34 (`slate-emerald-2-0`) in `gen-tokens.mjs` · **Status:** finalized, not yet applied to `site/`

## Decision record

Set **11 Slate & Emerald** won the exploration (34 candidates over four rounds; see
`EVALUATION.md`). The sheet below is set 11 **plus the three refinements made after
round 2**, which the owner elected to carry:

1. `--info` becomes a real fifth semantic. In production it is an alias of the
   changelog's "next" colour, so the info badge and the next-release identity are
   literally one colour.
2. The six skill-role colours are derived by gamut search — the product's own
   taxonomy is the loudest colour on the page (mean chroma dark **0.188**).
3. The semantic status colours are muted to half chroma (mean **0.073**), so
   status reads as background against the roles.

Ground, accent, secondary and tertiary are byte-for-byte set 11. One hue moved:
`success` 172° → 178°, to sit further from the emerald brand colour that the
header's version-chip dot shares a row with.

**Verification.** `audit.mjs` (which reimplements the colour maths independently of
the generator) reports **zero WCAG failures** across every check in both modes:
text ≥ 7:1 and muted / subtle / accent / secondary / tertiary / roles / semantics
≥ 4.5:1 on bg, surface and card; hover ≥ 3:1; each role ≥ 4.5:1 on its own pill.

## Files

| File | What it is |
|---|---|
| `tokens-2.0.css` | Drop-in candidate for `site/src/styles/tokens.css`. Same structure and comment style; non-colour sections spliced verbatim from the shipped file. |
| `TOKENS-2.0.md` | This sheet. |
| `MIGRATION-SURFACE.md` | Every colour literal in `site/src` that bypasses the token layer and would render in the old colours after the swap — catalogued and adversarially verified by a workflow. **A recolour is not a tokens.css swap; read this before scheduling the work.** |

## Rename map — brand constants

Production names the constants after the old palette (`--obsidian`, `--ember`, …).
They are referenced directly in `global.css`'s `@theme` block and in a handful of
components (`Button.astro` light-mode primary, `::selection`, the workbenches) — 180
references in all — so `tokens-2.0.css` defines the **new names** and keeps the **old
names as aliases** (`--obsidian: var(--slate)` …) so nothing breaks on the swap. The
aliases are a migration aid, not a permanent API: once call sites move, delete the
block. Proposed names:

| New | Value (dark) | Replaces | Role |
|---|---|---|---|
| `--slate` | `#12191f` | `--obsidian` | the ground |
| `--slate-2` | `#162028` | `--forge` | raised surface |
| `--gunmetal` | `#445461` | `--slag` | hairline borders |
| `--mist` | `#a5bcd1` | `--sand` | secondary text |
| `--frost` | `#d4e2ef` | `--linen` | primary text |
| `--paper` | `#e7eef5` | `--parchment` | light-mode ground |
| `--emerald` | `#2be179` | `--ember` | the accent |
| `--moss` | `#13bd62` | `--char` | accent hover |
| `--emerald-dim` | `rgba(43, 225, 121, 0.1)` | `--ember-dim` | 10% accent tint |
| `--emerald-glow` | `rgba(43, 225, 121, 0.22)` | `--ember-glow` | 22% accent halo |

## Ground ladder

Cool slate: OKLCH hue 245, chroma 0.016 (dark) / 0.012 (light). Light mode is
*not* the dark ladder inverted — light grounds need more chroma than dark to read
as equally tinted, so it is set independently.

| Token | Dark | OKLCH L C H | Light | OKLCH L C H | Purpose |
|---|---|---|---|---|---|
| `--bg` | `#12191f` | 0.21 0.016 245 | `#e7eef5` | 0.95 0.012 248 | page ground |
| `--ribbon` | `#151e26` | 0.23 0.020 246 | `#d3dfea` | 0.90 0.020 246 | sticky header |
| `--ribbon-edge` | `#28333d` | 0.32 0.023 246 | `#acbdcc` | 0.79 0.028 245 | header hairline |
| `--surface` | `#162028` | 0.24 0.021 243 | `#dfe9f1` | 0.93 0.015 242 | raised: cards on bg, inputs, tiles |
| `--card` | `#161f26` | 0.23 0.019 242 | `#ffffff` | 1.00 0.000 90 | resource cards, changelog cards |
| `--border` | `#445461` | 0.44 0.029 243 | `#aab9c7` | 0.78 0.026 246 | 0.5px hairlines |

## Text ladder

Minimum contrast is the *worst* of bg / surface / card.

| Token | Dark | OKLCH | min contrast | Light | OKLCH | min contrast | floor |
|---|---|---|---|---|---|---|---|
| `--text` | `#d4e2ef` | 0.91 0.023 246 | **12.53:1** | `#15181b` | 0.21 0.008 248 | **14.48:1** | 7:1 (AAA body) |
| `--muted` | `#a5bcd1` | 0.78 0.039 246 | **8.43:1** | `#444e57` | 0.42 0.020 245 | **6.90:1** | 4.5:1 |
| `--subtle` | `#7d91a4` | 0.65 0.037 247 | **5.08:1** | `#55616b` | 0.49 0.022 243 | **5.16:1** | 4.5:1 |

## Accent family

| Token | Dark | OKLCH | min contrast | Light | OKLCH | min contrast | floor |
|---|---|---|---|---|---|---|---|
| `--accent` | `#2be179` | 0.80 0.201 152 | **9.56:1** | `#066a34` | 0.46 0.119 152 | **5.47:1** | 4.5:1 — used as 10–11px text |
| `--secondary` | `#8cb9fc` | 0.78 0.108 258 | **8.23:1** | `#295ca5` | 0.48 0.130 258 | **5.39:1** | 4.5:1 |
| `--tertiary` | `#d79fe9` | 0.78 0.119 318 | **7.89:1** | `#7b428c` | 0.48 0.129 318 | **5.69:1** | 4.5:1 |

| Token | Dark | Light | Note |
|---|---|---|---|
| `--accent-hover` | `#13bd62` (7.16:1 vs bg) | `#065027` (8.22:1 vs bg) | UI surface floor is 3:1 |
| `--on-accent` | `#12191f` (10.26:1 on accent) | `#ffffff` (6.73:1 on accent) | **NEW.** Label on a filled accent. Production hardcodes `var(--obsidian)` on primary buttons, which is wrong the moment the accent is not light-on-dark. |
| `--accent-dim` | `rgba(43, 225, 121, 0.1)` | `rgba(6, 106, 52, 0.12)` | renders as `#183330` / `#c5dada` over surface; text on it: 10.24:1 / 12.23:1 |
| `--accent-glow` | `rgba(43, 225, 121, 0.22)` | `rgba(6, 106, 52, 0.16)` | **NEW.** Replaces `--ember-glow` (stage banner, release bar). |
| `--glow` | `rgba(43, 225, 121, 0.14)` | `rgba(6, 106, 52, 0.1)` | card / ribbon halo |
| `--secondary-dim` | `rgba(140, 185, 252, 0.12)` | `rgba(41, 92, 165, 0.12)` | |
| `--tertiary-dim` | `rgba(215, 159, 233, 0.12)` | `rgba(123, 66, 140, 0.12)` | |

**What secondary and tertiary replace.** `/changelog` encodes three release states.
Today: released = `--accent`, next = `--info`, planned = a page-scoped `--cl-violet`.
In 2.0: released = `--accent`, next = `--secondary`, planned = `--tertiary`. This is what
frees `--info` to be a real semantic.

## Semantic state colours

Muted to half chroma by decision. Contrast is measured on `--card`, where badges sit.

| Token | Dark | OKLCH | on card | Light | OKLCH | on card |
|---|---|---|---|---|---|---|
| `--danger` | `#d58f8f` | 0.72 0.086 19 | 6.48:1 | `#874949` | 0.48 0.084 21 | 6.82:1 |
| `--warning` | `#d4c488` | 0.82 0.080 95 | 9.58:1 | `#66571b` | 0.46 0.080 95 | 7.13:1 |
| `--success` | `#81c8b7` | 0.78 0.076 177 | 8.65:1 | `#166355` | 0.45 0.076 177 | 7.12:1 |
| `--info` | `#86c1d9` | 0.78 0.070 225 | 8.46:1 | `#246075` | 0.46 0.070 225 | 6.99:1 |
| `--in-progress` | `#e4bdd6` | 0.84 0.055 340 | 9.97:1 | `#79576d` | 0.50 0.055 340 | 6.18:1 |
| `--destructive` | `#783639` | 0.42 0.093 19 | 1.90:1 | `#662427` | 0.36 0.095 21 | 11.37:1 |

Every semantic has a matching `-dim` at 12% alpha. `--destructive` is not produced by
the generator (nothing in the mockups renders it); it is derived here as danger's hue
at lower lightness, matching production's intent of a deeper red for irreversible
actions.

## Skill-role colours

Gamut-maxed by decision. `*-pill` is the rendered 15%-over-surface tint the role tag
sits on, precomputed for both modes so `skills/index.astro` no longer has to hardcode
light-mode pill backgrounds.

| Token | Dark | OKLCH | on card | pill | on pill | Light | OKLCH | on card | pill | on pill |
|---|---|---|---|---|---|---|---|---|---|---|
| `--workflow` | `#00fd84` | 0.87 0.229 152 | 12.23:1 | `#134136` | 8.37:1 | `#016832` | 0.45 0.119 152 | 6.94:1 | `#bed6d4` | 4.54:1 |
| `--tri-agent` | `#ebfe00` | 0.95 0.216 115 | 14.87:1 | `#364122` | 9.66:1 | `#585f01` | 0.46 0.104 115 | 6.88:1 | `#cbd4cd` | 4.53:1 |
| `--audit-gate` | `#fb5998` | 0.70 0.204 360 | 5.55:1 | `#382939` | 4.52:1 | `#a90e59` | 0.48 0.188 0 | 7.26:1 | `#d7c8da` | 4.55:1 |
| `--specialist` | `#02fdff` | 0.90 0.153 196 | 13.11:1 | `#134148` | 8.79:1 | `#036465` | 0.46 0.077 196 | 6.97:1 | `#bed5dc` | 4.56:1 |
| `--advisor` | `#00bdfd` | 0.75 0.153 232 | 7.71:1 | `#133848` | 5.75:1 | `#016084` | 0.46 0.095 233 | 6.98:1 | `#bed4e1` | 4.55:1 |
| `--orchestrator` | `#a384fe` | 0.70 0.175 293 | 5.79:1 | `#2b2f48` | 4.55:1 | `#7116e4` | 0.49 0.263 293 | 7.15:1 | `#cfc9ef` | 4.51:1 |

## Categorical chart series

Decided 2026-09-08 for `/dashboard`, whose model-tier bars hardcode four Tailwind hexes
(`#38bdf8` `#14b8a6` `#a78bfa` `#f472b6`) next to bars filled with the accent — the
teal sonnet tier reads emerald-adjacent. Four hues placed in the gaps *between* the role
hues so a series never reads as a role and never as the accent; every one is ≥ 25° from
emerald. Floor is the 3:1 UI-component ratio on card and surface (they are fills, not
text); each has a 14% `-dim` for tracks.

| Token | Dark | OKLCH | on card | Light | OKLCH | on card |
|---|---|---|---|---|---|---|
| `--chart-1` | `#18b8d1` | 0.72 0.122 212 | 7.01:1 | `#08707f` | 0.50 0.085 211 | 5.78:1 |
| `--chart-2` | `#72a3fd` | 0.72 0.142 262 | 6.66:1 | `#305eb7` | 0.50 0.150 262 | 6.16:1 |
| `--chart-3` | `#d87fd1` | 0.72 0.151 330 | 6.26:1 | `#903d8b` | 0.50 0.149 330 | 6.51:1 |
| `--chart-4` | `#1abea5` | 0.72 0.128 178 | 7.12:1 | `#097463` | 0.50 0.090 178 | 5.69:1 |

Assignment on `/dashboard`: haiku → `--chart-1`, sonnet → `--chart-2`, opus →
`--chart-3`, fable → `--chart-4`. The page's undefined `--text-2` / `--text-3` /
`--surface-2` (rendering their fallbacks today) map to `--muted` / `--subtle` /
`--surface`.

## Logo

`--logo-stroke` → `--text`, `--logo-spine` → `--subtle`, `--logo-filled` → `--accent`,
`--logo-dot-dark` → `--bg`. Unchanged as indirections; the filled node goes emerald.

## Unchanged

Typography, type scale, line-heights, letter-spacing, wordmark tracking, the 4px space
scale, logo spacing, radii, shadows, glow composition, motion, focus ring, the
reduced-motion block and the desktop type bump are **copied verbatim** from the shipped
`tokens.css`. Only colour changes.

## New tokens (and what each replaces)

| Token | Replaces |
|---|---|
| `--on-accent` | hardcoded `var(--obsidian)` as the label on `.btn-primary`, `::selection`, release-bar tag |
| `--accent-glow` | `--ember-glow` |
| `--secondary`, `--secondary-dim` | `--info` where it meant *coming next* on /changelog and the homepage release bar |
| `--tertiary`, `--tertiary-dim` | the page-scoped `--cl-violet` / `--cl-violet-dim` in `changelog.astro` |
| `--<role>-pill` ×6 | the six precomputed light-mode backgrounds in `skills/index.astro` |
| `--info` (real colour) | `--info: var(--secondary)` alias |

## Known trade-offs

- **Light mode is duller.** Emerald cannot survive a light ground at chroma: the accent
  drops from 0.80 0.201 152 to 0.46 0.119 152 (−0.082 chroma, the largest of any set). Hue is
  preserved (0.1° shift), so it reads as the same brand, but it is a forest green, not
  a jewel green. This was flagged in the evaluation and accepted with the decision.
- **Three light-mode near-collisions**, all role-vs-semantic and all ≥ 18° apart:
  tri-agent/warning, specialist/success, orchestrator/danger. Semantics own their
  conventional hues, so only the roles could yield, and the solver already did what
  the constraints allow. Acceptable; noted so nobody rediscovers them.
- **The accent shares a hue with `--workflow`** on purpose — the pipeline's primary
  role reads as the brand colour.

## Regenerating

```bash
cd design-previews/color-2.0-tooling
node gen-tokens.mjs && node audit.mjs && node emit-sheet.mjs
```

Edit set 34 in `gen-tokens.mjs`, never this file or `tokens-2.0.css` by hand.


## Light rework — 2026-09-08

> **The light-mode values in every table above are superseded** by this section and by the live `[data-theme="light"]` block in `site/src/styles/tokens.css`. Dark values above are current.

The light half above was replaced after the owner reviewed it on the real pages
("really ugly"): the blue-grey page, blue-grey surfaces and forest-green accent
gave no separation and lost the emerald identity. Five candidates were rendered
onto the built site (`../light-2.0-candidates.html`); **L3 "Lifted slate · brand
fill"** won, with the accent glow pushed up on the hero release bar and stage.

What changed in the light block (the dark block is untouched):

| Token | Before | After | Why |
|---|---|---|---|
| `--bg` / `--surface` / `--card` | `#e7eef5` / `#dfe9f1` / `#fff` | `#e9f0f7` / `#f7fbfe` / `#fff` | real steps between page, raised surface and card |
| `--accent` | `#066a34` | `#027c3e` | text-safe green (4.5:1 on all three grounds), a step livelier |
| `--accent-fill` (new) | — | `#33d977` | **two-token split:** fills (buttons, badges, pills) keep the brand emerald with `--on-accent` `#12191f` labels; on dark it aliases `--accent` |
| `--accent-fill-hover` (new) | — | `#13bd62` | the moss hover both themes share |
| `--accent-glow` / `--glow` | 0.16 / 0.10 | 0.42 / 0.28 | owner tweak: stronger glow on light |
| six roles | dark-green-ish outlines | own hue at 4.5:1 + own tint pill (`--<role>-pill`) | six clearly different chips |
| semantics | — | re-derived at C 0.085, 4.5:1 | muted, as on dark |

Trade-off, accepted: `--accent-fill` is 1.6:1 against white *as a shape*. Filled
controls rely on their dark label for contrast, exactly as the dark theme's
buttons do; anything that needs a contrasting edge (rules, tab indicators, dots,
checkbox checks) stays on `--accent`. The migration rule for components:
`background: var(--accent)` on a control that carries `--on-accent` text →
`--accent-fill`; thin lines and dots stay `--accent`; `color-mix` tints stay
`--accent`.

Derivation and contrast report: `light-candidates.mjs` → `light-candidates.json`.

### Evaluator refinements (same day)

The isolated Design Evaluator pass (PASS-WITH-FIXES) drove four changes to the
light half, regenerated through `light-candidates.mjs`:

- **Floor raised to 4.7:1** on light for muted/subtle/accent/secondary/tertiary/roles/semantics — several pairs had landed at 4.50 exactly, no margin for anti-aliasing at 9–11px mono.
- **Twins separated:** light `--workflow` now sits a lightness step below `--accent` (6.2:1 floor, hue 146) instead of being byte-identical; light `--specialist` moves to hue 207 and the light semantics drop to C 0.06 so `--success`/`--specialist` and `--info`/`--advisor` no longer share L and C.
- **Hairlines visible:** light `--border` lifted from L 0.855 to 0.82.
- **Dashboard bars** (`bar-fill`, `spark-bar`) went back to `--accent`: a labelless shape needs 3:1 on its track, which `--accent-fill` cannot give on light.
