# color-2.0-tooling

Generator for `../color-2.0-explorations.html`. Kept in the repo so the
exploration can be re-run or extended; not wired into any build, not
imported by the site, and it touches nothing under `site/`.

```bash
# 1. derive every set's tokens in OKLCH, enforcing the WCAG floors
node gen-tokens.mjs                       # -> tokens.json + tokens.css (alongside the script)

# 2. assemble the single-file preview
node build-preview.mjs ../color-2.0-explorations.html

# 3. one-off: cache the webfonts so the preview needs no network (already committed)
node fetch-fonts.mjs             # -> fonts.json

# 4. verify — contrast, hue collisions, state legibility, dark/light drift
node audit.mjs                 # add --verbose for every row, not just failures

# 5. the 2.0 deliverables (all read tokens.json for set 34)
node emit-sheet.mjs                          # -> tokens-2.0.css + TOKENS-2.0.md
node lockups.mjs                             # -> ../lockup-2.0-options.html
node build-proto.mjs ../proto-2.0.html       # -> the five-page prototype

# 6. optional: screenshot every set x page x mode (needs site/node_modules)
node render.mjs ../color-2.0-explorations.html ./shots all
```

`audit.mjs` deliberately reimplements the colour maths rather than importing it
from `gen-tokens.mjs`, so a bug in the generator cannot hide by also being
present in its own check. It is the thing to trust: it caught two defects the
generator was happy with — muted light grounds collapsing to white, and the
changelog's release-state colours sharing exact hues with skill-role colours.

`gen-tokens.mjs` is the only file worth editing. Its `SETS` array is the
source of truth: each entry gives a set an accent (an OKLCH lightness,
chroma and hue per mode), a secondary and tertiary hue for the changelog's
three release states, six skill-role hues, four semantic hues, and
optionally a `bg` seed that shifts the ground. Everything else — the
surface and card ladder, hover and dim variants, on-accent text colour,
role pill fills — is derived.

The derivation transposes the shipped ladder's per-step lightness delta
onto the new ground hue, then walks lightness until each pairing clears
its floor: body text 7:1, and muted / subtle / accent / secondary /
tertiary / roles / semantics 4.5:1 against background, surface and card,
with hover at 3:1 and every role also checked against its own 15%-tint
pill. Running the script prints a per-set line ending in the failure
count; that count should stay at zero.

`render.mjs` resolves Playwright from `site/node_modules`, so run
`npm run site:install` first if it is missing.

### Per-set knobs

Beyond the accent / secondary / tertiary / role / semantic hues, a set may set:

| Field | Effect |
|---|---|
| `bg` | Shifts the ground. Dark and light carry separate chroma on purpose — see the note in `gen-tokens.mjs`. |
| `semantic.info` | Promotes `info` to a real fifth semantic. Omit it and `info` aliases `secondary`, which is what production does today. |
| `semanticMaxChroma` | Derives each semantic by searching for the most saturated colour of that hue that still clears the contrast floor, instead of using the default chroma table. |
| `semanticTone` | `"max"`, `"deep"` or `"bright"` — picks among the near-maximal candidates so sets do not all land on the same ceiling. |
| `semanticVibrance` / `semanticC` | Scalar or per-key chroma multiplier. Superseded by `semanticMaxChroma` when that is on. |
| `separateFromSemantics` | Roles also yield to the semantic hues, not just the identity trio. For sets where the semantics are the feature. |

### Why the fonts are embedded

`fonts.json` holds Outfit and JetBrains Mono as base64 woff2, and
`build-preview.mjs` inlines them as `@font-face` rules. The preview previously
pulled them from Google Fonts with a `<link>`, which is fine in a normal browser
but throws a console error on every load in a sandboxed frame or a strict-CSP
preview pane — and this file gets shared around as a standalone artifact, so it
lands in those contexts often.

Both families are variable fonts: Google returns one file covering every weight,
so the eight per-weight requests came back byte-identical. `fetch-fonts.mjs`
dedupes them and declares a weight range instead, which is the difference
between 249 KB and 62 KB. Both are SIL Open Font License, which permits
embedding.

Delete `fonts.json` and the build falls back to the CDN `<link>` tags.

### Console cleanliness

Two things bit us and are now guarded:

- **`history.replaceState` throws in an opaque origin** — a sandboxed iframe,
  a `data:` URL, `srcdoc`. The preview writes the current set to the URL hash on
  every interaction, so an unguarded call spammed the console on every click. It
  now falls back to assigning `location.hash`, then gives up silently.
- **External font requests** — removed entirely, see above.

Verified clean under `file://`, an opaque-origin sandboxed frame, and a
realistic sandbox CSP. The one context that still logs is a policy that blocks
`data:` fonts as well, which leaves no way to ship custom typography at all; the
page falls back to system fonts and stays usable.
