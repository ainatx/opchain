# design-previews/

Static HTML snapshots from past design-iteration rounds (changelog layout
options, architecture diagram refreshes, light/dark theme passes, compare
table options, coverage page options, demo search mockup, brand-live
snapshot, v1.4.3 release mockup). Not part of the build, not linked from
the live site — kept as historical reference for how a shipped surface
got to its current design, not as a to-do list of pending work.

Flat and growing; if this keeps accumulating, worth splitting into
per-feature subfolders (e.g. `changelog/`, `architecture/`, `theme/`)
rather than one flat listing.

## Active

**`proto-2.0.html`** — the 2.0 site prototype: five pages (home, changelog,
skill detail, install, architecture) on the decided Slate & Emerald tokens with
the "opchain 2.0" lockup (option A, wordmark + badge), release surfaces
advanced to "2.0 shipped", and the five new content blocks outlined in ember
(`h` toggles the outlines). Dark only, by decision. The architecture page holds
a dashed placeholder where the separate diagram workstream lands. Built by
`color-2.0-tooling/build-proto.mjs`; hand-rolled mockup, not the Astro site.

**`light-2.0-candidates.html`** — the light-mode rework (2026-09-08; the owner
called the first light half "really ugly"). Five candidates rendered onto the
*real built pages* (home, changelog, skill, skills index) with a dark reference:
three grounds × the brand-emerald fill, plus two moss-fill variants. Images in
`light-2.0-candidates/`. **Decided: L3 "Lifted slate · brand fill"**, with a
stronger accent glow on the hero and stage. Built by
`color-2.0-tooling/render-light.mjs` from `light-candidates.mjs`; the derivation
(two-token accent split, tinted role pills, contrast floors) is documented at the
top of that file.

**`lockup-2.0-options.html`** — three treatments for the 'opchain 2.0' branded
mark (badge / one wordmark / icon carries the 2.0) on the decided tokens, at
header, hero and footer scale in both modes. **Decided: A, wordmark + badge.**


**`color-2.0-explorations.html`** — the v2.0 colour exploration
(2026-09-03). **Decided 2026-09-07: set 11 Slate & Emerald.** The finalized
token sheet is `color-2.0-tooling/tokens-2.0.css` + `TOKENS-2.0.md`; the
exploration file stays as the record of how it was chosen. 19 candidate palettes across dark and light,
each rendered onto three page mockups (home, changelog with all three
tabs, skill detail) plus an overview grid that groups every family next to
its parent.

- **Round 1 (sets 01–10)** — 01–05 keep the Obsidian ground and
  re-harmonize accent, skill-role and semantic colours; 06–10 shift the
  ground hue at the same darkness.
- **Round 2 (sets 11–19)** — the three grounds picked out of round 1.
  11–13 reuse set 06's slate ground exactly, so they read as a pure accent
  comparison. 14–16 (plum) and 17–19 (seaglass) halve their parent's
  ground chroma.
- **Round 4 (sets 26–33)** — the eight least-explored hues, picked by
  farthest-point selection over the 23 chromatic accents already in use.
  Emphasis inverted: the six skill roles are gamut-maxed and the semantics are
  muted to half chroma, so the product's own taxonomy is the loudest thing on
  the page and status reads as background. Note that the single largest gap on
  the wheel is the 90° orange/amber/yellow arc, which is the family ruled out
  in round 1 — sets 26, 27 and 28 sit inside it deliberately.
- **Round 3 (sets 20–25)** — six semantic systems on one ground. All six sit
  on round 2's muted seaglass, so the variable under test is the *semantic*
  palette rather than the backdrop: Vivid, Jewel, Neon, Wide, Split and Rose.
  Each promotes `info` to a real fifth semantic instead of aliasing it to the
  changelog's "next" colour, and each derives its semantics by searching for
  the most saturated colour of that hue which still clears the contrast floor
  — 31–56% more chroma than round 1.

Controls: page tabs and set pills across the top, a dark/light toggle,
arrow keys to cycle sets, `d` for mode, `1`–`4` for page, `t` for the
token panel. The URL hash carries the state
(`#set=12&mode=dark&page=changelog`), so a specific candidate can be
linked directly.

Every token is derived rather than hand-picked. A generator works in
OKLCH, transposes the shipped ladder's per-step lightness delta onto each
new ground hue, then walks lightness until every pairing clears its WCAG
floor — body text at 7:1, and muted, subtle, accent, secondary, tertiary,
the six skill-role colours and the semantic colours all at 4.5:1 against
background, surface and card, with each role also checked against its own
15%-tint pill. All 19 sets clear it in both modes. The collapsible panel
at the top of the page shows the live token values and measured ratios for
whichever set is on screen.

**`color-2.0-tooling/MIGRATION-SURFACE.md`** — every colour literal in the
site that bypasses the token layer (1,848 in 35 files), classified and
adversarially verified, with an order of work. Read it before scheduling the
recolour: three-quarters is the architecture diagrams (other workstream); the
recolour proper touches 392 literals in 30 files.

**Applied 2026-09-08:** `color-2.0-tooling/tokens-2.0.css` is now
`site/src/styles/tokens.css`, and every page and component was migrated per
`MIGRATION-SURFACE.md`'s order of work. The exploration, lockup and prototype
files remain as the record of how the palette was chosen and what the 2.0
content blocks should look like. The generator lives in `color-2.0-tooling/` — edit the `SETS` array
there and re-run it rather than editing the generated HTML by hand; that
folder's README has the three commands.
