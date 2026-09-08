# opchain 2.0 — colour migration surface

**Measured:** 2026-09-08 against `origin/main` @ `2755ef9` · **Status:** input to scheduling, nothing decided here

`TOKENS-2.0.md` promises this file and describes it as the thing to read before
scheduling the recolour — *"a recolour is not a tokens.css swap"* — but it had never
been written. This is it: every colour literal in the shipped site that does **not**
come from the token layer, and would therefore still render in Ember after
`site/src/styles/tokens.css` is replaced.

Regenerate rather than trust it:

```bash
node design-previews/color-2.0-tooling/scan-migration-surface.mjs
```

## The one-paragraph answer

A `tokens.css` swap moves **157 token definitions**. It does not move the **1,870
colour literals** that sit outside that file in `site/src`, nor the **190 references
to brand constants by name** that the rename map would orphan, nor a **second copy of
the token layer** shipped as a static asset, nor the **22 literals that bake every
social preview card**. The good news is concentrated: **90% of the literal surface is
the two architecture-diagram files**, and both are already converted on open PRs. The
remainder is small enough to enumerate line by line, and most of it is deliberate.

## Headline numbers

| Measure | Count |
|---|---|
| Colour literals under `site/src`, excluding `tokens.css` | **1,870** across 30 files |
| …of those, in the two architecture-diagram files | **1,688 (90%)** |
| …of those, everywhere else | **182** across 28 files |
| Literals that **shadow** a current token value | **938** (881 diagram · 57 elsewhere) |
| References to renamed brand constants by name, in `site/src` | **190** (94 diagram · 96 elsewhere) |
| Second, independent copy of the token layer | **1 file**, 214 lines, 50 hex literals |
| Colour literals outside `site/src` that ship to users | **22** (`scripts/gen-og-images.mjs`) |

By context: `svg-attr` 1,282 · `css` 372 · `inline-style` 197 · `script` 11 ·
`frontmatter` 8.

**"Shadow" is the load-bearing word.** A shadow is a literal that happens to equal a
token's current value — `#e05c18` written out where `var(--accent)` was meant. It
renders identically today, which is exactly what makes it dangerous: swap the token
layer and the token moves while the copy stays behind, with no error, no build
failure, and no visual warning until somebody looks at the page. The 938 shadows are
the part of this surface that fails *silently*.

## 1. The architecture diagram — 1,688 literals, already handled

| File | Literals | Shadows |
|---|---|---|
| `site/src/pages/architecture.astro` | 1,069 | 485 |
| `site/src/components/MobileArchitecture.astro` | 619 | 396 |

This is 90% of the surface and it is **not** pending work: it is converted on
[#488](https://github.com/ainatx/opchain/pull/488) (stacked on
[#487](https://github.com/ainatx/opchain/pull/487)), which also renames the 94
in-diagram brand-constant references and updates the geometry auditor's marker table.
Both PRs are held pending this decision.

The practical consequence for sequencing: **the diagram is not a reason to delay the
swap, and the swap is not a reason to delay the diagram.** They are independent, and
the diagram is the only part currently finished.

## 2. Brand-constant references by name — 190, and the rename is the risk

`TOKENS-2.0.md` renames the brand constants (`--obsidian` → `--slate`, `--ember` →
`--emerald`, …) and keeps the old names as aliases so nothing breaks on the swap.
That alias block is doing more work than its one-line description suggests. Measured
in `site/src` (excluding `tokens.css` itself):

| Constant | Refs | | Constant | Refs |
|---|---|---|---|---|
| `--ember` | 76 | | `--sand` | 26 |
| `--obsidian` | 38 | | `--linen` | 24 |
| `--slag` | 19 | | `--parchment` | 6 |
| `--ember-dim` | 19 | | `--forge` | 5 |
| `--char` | 3 | | `--ember-glow` | 3 |

Heaviest consumers: `architecture.astro` (94 — handled on #488), `index.astro` (16),
`global.css` (9), `Header.astro` (9), `styleguide.astro` (8), `security.astro` (7),
`demo.astro` (7).

**Delete the alias block only after these move.** These are *global* tokens, so a
missed reference does not fall back to something obviously wrong — it resolves to
nothing and the property is dropped, or it inherits. Neither errors.

> Note on a number: `TOKENS-2.0.md` says "180 references in all". This scan counts
> **190** in `site/src` on `2755ef9`. The gap is small and could be scope or drift
> since that sheet was written; the point is only that the alias block is load-bearing
> for ~190 call sites, not a handful.

## 3. A second copy of the token layer

`site/public/previews/mobile-demo/_shared/tokens.css` — 214 lines, 50 hex literals,
defining its own `--obsidian`, `--ember`, `--ember-dim`, `--ember-glow`. It is a
static asset under `public/`, so nothing imports it and nothing will flag it. It ships
to users and would keep the Ember palette indefinitely.

Decide explicitly: convert it, or accept that the mobile-demo preview is a historical
artifact rendered in the old brand.

## 4. Outside `site/src` — the social cards

`scripts/gen-og-images.mjs` bakes 22 colour literals: `#e05c18` ×10, `#1c1710` ×6,
`#e8dfd0` ×2, `#5a5040` ×2, `#c4b89e`, `#c4742a`. These generate the OG preview cards
for every route. A token swap does not touch them, so every link unfurled in Slack,
iMessage or a search result would keep showing Ember cards against a slate site.

Cheap to fix and easy to forget — it needs a regeneration step in the swap, not just
an edit.

No `<meta name="theme-color">` exists, so there is nothing to update there.

## 5. The 182 non-diagram literals, bucketed

22 of the 182 are pure black/white alphas (scrims, shadows) and are palette-neutral by
construction. That leaves **160 genuine colour decisions**, which fall into four
groups.

### 5a. Shadows that should become `var()` — 57

The silent-failure set. Examples, all verified at the stated line:

| File | Line | Literal | Shadows |
|---|---|---|---|
| `components/Logo.astro` | 25–41 | 7 literals | `--slag`, `--linen` ×4, `--ember`, `--obsidian` |
| `pages/styleguide.astro` | 42–49 | 8 literals | the full brand-constant row, in frontmatter |
| `components/ui/Button.astro` | 68–69 | `#d95010`, `#e05c18` | `--accent` (light-mode primary) |
| `components/WelcomePopup.astro` | 239–249 | `#1c1710`, `#d95010`, `#e05c18` | `--obsidian`, `--accent` |
| `components/Header.astro` | 523 | `#e05c18` | `--ember`, `--accent` |
| `components/ui/Eyebrow.astro` | 32 | `#ab3e08` | `--accent-hover` |
| `pages/skills/[id].astro` | 1128–1130 | `#e05c18`, `#FB923C`, `#8a3610` | `--accent`, `--workflow` |
| `pages/pipeline-builder.astro` | 418, 528, 570 | `#1c1710` ×3 | `--obsidian` |
| `compare.astro`, `showcase.astro`, `status.astro`, `pipeline-builder.astro` | various | `#f59e0b` ×7 | `--tri-agent` |
| `components/PipelineDiagram.astro` | 320–321 | `#84CC16`, `#f59e0b` | `--warning`, `--tri-agent` |

`Logo.astro` and `styleguide.astro` deserve particular attention: the logo is the
brand mark itself, and the styleguide's frontmatter is a hand-maintained swatch list
that would go on *documenting the old palette* after the swap.

### 5b. Brand-adjacent one-offs that will clash — ~30

Not shadows (they match no token) but unmistakably Ember-family, so they will read as
wrong against slate:

- `#f5894d` / `#993505` — an orange gradient pair repeated across
  `DesktopWorkbench.astro`, `MobileWorkbench.astro`, `WelcomePopup.astro`, `demo.astro`
  (**23 occurrences** — the single most-repeated non-token colour on the site)
- `rgba(224, 92, 24, …)` at five different alphas in `index.astro` (312–328) — ember
  glows that `--accent-dim` / `--glow` do not cover
- `#14100a` (`index.astro` 485), `rgba(232, 223, 208, 0.22)` (600)
- `rgba(20, 184, 166, 0.16)` ×2 and `rgba(224,92,24,0.4)` in `Header.astro`
- `#E36209` in `global.css` 131
- `#fbbf24`, `#8a6508` in `PipelineDiagram.astro`

### 5c. Independent palettes needing a decision — ~35

These are coherent palettes of their own, not brand colours:

- **`pages/dashboard.astro`** (21 literals) — already a cool slate/teal set
  (`#cbd5e1`, `#334155`, `#1e293b`, `#14b8a6`, `#94a3b8`). Closer to 2.0 than to
  Ember. Probably wants converting to 2.0 tokens rather than left alone, but it is a
  design call, not a mechanical one.
- **Workbench editor chrome** (`DesktopWorkbench` 923–932 and `MobileWorkbench`
  569–575, 17 literals) —
  `#181818`, `#e8e8e8`, `#62afff`, `#9ece6a`, `#f7768e`, `#b294ff` — a syntax-highlight
  theme imitating a code editor. Arguably *should* stay palette-independent: it is
  depicting someone else's editor.
- **`pages/changelog.astro`** — `#b29adf` / `#6d28d9` and their alphas, the page-scoped
  `--cl-violet` pair that `TOKENS-2.0.md` says `--tertiary` replaces.
- **`data/walkthroughs/*.ts`** (11 literals) — colours embedded in walkthrough fixture
  data, including four malformed-looking short hexes (`#412`, `#2243` ×3) that are
  worth a second look regardless of the swap.

### 5d. Deliberately palette-independent — leave alone

- macOS traffic-light dots `#ff5f57` / `#febc2e` / `#28c840` (`DesktopWorkbench` 459–461)
- `rgba(0,0,0,…)` and `rgba(255,255,255,…)` scrims and shadows (22 occurrences)
- `#e5484d` (`Footer.astro` 265), `#0a0a0a` (247)

## 6. Two corrections to `TOKENS-2.0.md`

Both found by checking the sheet's claims against the tree:

1. **The role-pill count is seven, not six.** The sheet says the new `--<role>-pill`
   tokens replace "the six precomputed light-mode backgrounds in `skills/index.astro`".
   There are **seven** — `workflow`, `tri-agent`, `audit-gate`, `specialist`,
   `advisor`, `orchestrator` **and `success`** (lines 389–395) — plus a generic
   `color-mix()` fallback that also bakes `--surface` (`#f4e5cf`, itself a shadow of
   the light `--surface`). With six pill tokens, `success` falls through to that
   `color-mix()` fallback, which is precisely the case the code comment says Axe cannot
   evaluate. Either mint a seventh pill token or accept the fallback knowingly.

2. **The brand-constant reference count measures 190**, not 180 (see §2).

## 7. Suggested sequencing

Nothing here is a decision — this is the order the dependencies imply.

1. **Land the diagram PRs independently** (#487, then #488). They are self-contained
   and remove 90% of the literal surface from the problem.
2. **Convert the 57 shadows to `var()`** before swapping anything. This is mechanical,
   individually verifiable, and reviewable in isolation — and it is the set that fails
   silently, so doing it first turns the swap from risky into boring.
3. **Swap `tokens.css`**, keeping the alias block.
4. **Sweep 5b** (the ~30 brand-adjacent one-offs) in the same sitting; these are the
   visible clashes.
5. **Regenerate the OG cards** (§4) and decide the preview token copy (§3).
6. **Decide 5c** — dashboard, workbench chrome, changelog violet — as design calls.
7. **Move the 190 name references**, then delete the alias block. Not before.

## What this catalogue does not cover

Stated plainly, because a migration doc that overstates its coverage is worse than
none:

- **`skills/`, `plugins/`, `mirror/`, `docs/`** were not scanned. They are product and
  documentation, not the site's rendering surface.
- **Images and binaries** — `.png`, `.svg` assets under `site/public/`, favicons,
  and anything with baked-in brand colour. Only text-parseable sources were scanned.
- **Named CSS colours** (`white`, `black`, `orange`) are not matched — only hex,
  `rgb()`/`rgba()` and `hsl()`/`hsla()`. A prose-safe named-colour scan needs
  property-position parsing this scanner does not do.
- **Runtime-computed colour** — anything assembled from parts at runtime, or arriving
  from PostHog/flag config, is invisible to a static scan.
- **Contrast after the swap.** This says what *would not move*; it says nothing about
  whether what does move still clears WCAG in every pairing. `audit.mjs` covers the
  token set in isolation, not these call sites.
