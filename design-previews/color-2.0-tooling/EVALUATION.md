# Colour exploration — evaluation

**Decision (2026-09-07):** set **11 Slate & Emerald** wins. Finalized as set 34 with the post-round-2 refinements; see `TOKENS-2.0.md`.

**Date:** 2026-09-05 · **Artifact:** `../color-2.0-explorations.html` · 25 sets × dark/light

> **Caveat on independence.** The tri-agent harness calls for an *isolated*
> Design Evaluator that never saw the generator's reasoning. That agent was
> launched twice and killed by API rate limits both times before writing a
> report. What follows is therefore a **self-evaluation by the generator**, which
> carries known bias toward its own choices. The mechanical sections (contrast,
> collisions, state pairs, drift) are trustworthy — they come from `audit.mjs`,
> which reimplements the colour maths independently of the generator so a bug
> cannot hide by being present in both. The aesthetic scores are one opinion and
> should be treated as such until a clean-context evaluator runs.

---

## 1. Contrast — verified independently

**3,100 checks across 25 sets × 2 modes. Zero failures.**

Per set and mode, `audit.mjs` verifies:

| Check | Floor |
|---|---|
| `text` on bg / surface / card | 7:1 |
| `muted`, `subtle`, `accent`, `secondary`, `tertiary` on all three grounds | 4.5:1 |
| six skill-role colours on all three grounds | 4.5:1 |
| four semantic colours on all three grounds | 4.5:1 |
| each role on its own 15%-tint pill | 4.5:1 |
| `on-accent` label over the accent fill | 4.5:1 |
| `accent-hover` as a UI surface against bg | 3:1 |
| `text` on each `*-dim` tint the mockups actually composite | 4.5:1 |

The last row matters: `--accent-dim` is an `rgba()`, so the real rendered
background is the tint composited over `--surface`. Checking the token in
isolation would have missed it.

## 2. Hue collisions — one real defect found and fixed

> Counts in this section were measured at the end of round 2, across 19 sets.
> Round 3 later improved the solver (see below); the current total across all
> 25 sets is **137**.

The generator never checked whether two colours carrying *different meanings*
looked alike. They did.

The changelog encodes three release states as `accent` (released), `secondary`
(next) and `tertiary` (planned). Those were landing on the **exact hues** of
skill-role colours — "coming next" blue and the advisor role pill sat 0° apart
at ΔE 0.020, indistinguishable. A reader who learns *blue = advisor* then meets
*blue = coming next*.

Fixed by a hue-separation pass (`separateHues` in `gen-tokens.mjs`) that rotates
each role off the identity trio by the smallest angle that clears a 25° gap.
`workflow` is exempt — it is defined as the accent hue on purpose.

| Constraint | Collisions |
|---|---|
| none (as originally generated) | 193 |
| **trio-only (shipped)** | **128** |
| trio + semantics | 130 |

Adding a role-vs-semantic constraint measured *worse*: thirteen anchors do not
fit in 360°, so pushing roles off the semantics shoved them back onto the trio.

**The residual 128 are deliberate, not unfixed.** They are dominated by
role-vs-semantic overlaps — `audit-gate`/`danger` (red), `specialist`/`success`
(green), `tri-agent`/`warning` (yellow). Semantics own conventional anchors that
are not ours to move, and a failing audit gate arguably *should* read as a danger
state. Left for whichever set wins to settle by hand.

Six further "collisions" are `accent` vs `role:workflow`, which is the intended
identity mapping, not a defect.

## 3. State legibility

Seven UI state pairs checked per set and mode. **One marginal result:**

- **06 Slate & Crimson, dark** — selected vs unselected tab pill, ΔE 0.045
  (threshold 0.05). Borderline, and mitigated in practice: the selected tab also
  carries a coloured border and the underline indicator, so colour is not the
  only cue. Not a blocker; worth a nudge if set 06 wins.

Every other set separates all seven pairs cleanly.

## 4. Dark-to-light drift

No set shifts hue enough between modes to read as a different brand (max 5.1°).
Chroma loss is the real story, and it is structural: light backgrounds force
saturated accents down to stay AA-legible.

Worst offenders, all predictable from the hue:

- **11 Slate & Emerald** — chroma −0.082, the largest drop in the set. The
  jewel-green dark mode becomes a flat forest green in light.
- **15 Muted Plum & Chartreuse** and **19 Muted Seaglass & Lime** — −0.074 each.
  Chartreuse and lime cannot survive a light background; both fall to olive.
  This is the cost of those two sets, and it should be a deliberate choice.
- **12 Slate & Amethyst** and **18 Muted Seaglass & Magenta** — the *best*
  behaved (−0.028 and −0.010). Violet and magenta hold their character in both
  modes better than any other hue explored.

## 5. Fixed during this round

**Muted light grounds collapsed to white.** Halving the ground chroma muted dark
mode correctly but erased light mode — sets 14–19 all rendered as the same white
page. Perceived colourfulness falls off steeply at high lightness, so a chroma
that visibly tints a near-black ground vanishes on a near-white one. The live
cream ground measures C 0.027; these had landed at C 0.008. Light grounds now sit
at C 0.0117, faint but present, still below their round-1 parents (0.0134/0.0138).
Dark grounds unchanged.

## 6. Scores — round-2 sets (11–19)

Weighted 25% each. Hierarchy and States are visual judgement; Consistency is
anchored on the per-set residual collision count; Accessibility is mechanical
(all sets pass, so it is differentiated by dark/light drift).

| # | Set | Hier. | States | Consist. | A11y | Weighted | Verdict |
|---|---|---|---|---|---|---|---|
| 12 | Slate & Amethyst | 8 | 8 | 7 | 9 | **8.0** | PASS |
| 15 | Muted Plum & Chartreuse | 9 | 8 | 8 | 6 | **7.8** | PASS |
| 11 | Slate & Emerald | 8 | 8 | 8 | 6 | **7.5** | PASS |
| 18 | Muted Seaglass & Magenta | 8 | 8 | 7 | 9 | **8.0** | PASS |
| 16 | Muted Plum & Cyan | 7 | 8 | 8 | 8 | **7.8** | PASS |
| 17 | Muted Seaglass & Aqua | 7 | 8 | 8 | 7 | **7.5** | PASS |
| 14 | Muted Plum & Mint | 7 | 8 | 9 | 7 | **7.8** | PASS |
| 13 | Slate & Aquamarine | 6 | 8 | 7 | 7 | **7.0** | PASS |
| 19 | Muted Seaglass & Lime | 8 | 8 | 8 | 6 | **7.5** | PASS |

All nine clear the 6/10 floor on every criterion. No set fails.

### Notes per set

- **12 Slate & Amethyst** — the most convincing answer to "premium". Violet on
  cool slate reads couture rather than dev-tool, and it is one of only two sets
  that holds its character in light mode. Highest collision count (10) is the
  one blemish; it comes from orchestrator and in-progress crowding the same
  magenta corner.
- **18 Muted Seaglass & Magenta** — ties 12 on score by a different route: teal's
  complement used as a single deliberate act against a de-saturated ground.
  Best-behaved accent across modes of anything explored (−0.010 chroma).
- **15 Muted Plum & Chartreuse** — the boldest and most energising, and the
  strongest hierarchy of the nine: nothing else competes with the accent. Pays
  for it in light mode, where chartreuse becomes olive.
- **11 Slate & Emerald** — solid and legible, but the light mode gives up the
  most character of any set. "Money green" in dark, municipal in light.
- **14 Muted Plum & Mint** — the most internally coherent palette (3 collisions,
  joint-lowest with its parent 07). Also the least surprising.
- **16 Muted Plum & Cyan** — the easiest to live with over a long page; the
  cold-on-warm temperature split does the work without shouting. Reads
  conventional rather than premium.
- **17 Muted Seaglass & Aqua** — the lit-from-within effect works, but the accent
  and ground being the same family costs it hierarchy.
- **13 Slate & Aquamarine** — the weakest of the slate three. Too close to the
  ground to drive hierarchy; lightness alone carries it.
- **19 Muted Seaglass & Lime** — the oscilloscope read is genuinely distinctive.
  Same light-mode problem as 15, without 15's complementary tension.

### Did the muting help?

Yes in dark mode, and the comparison is direct — the "All sets" tab puts each
muted set beside its round-1 parent. Against 07, the muted plum ground stops
reading as *purple* and starts reading as *warm grey*, which is what lets
chartreuse and cyan detonate in 15 and 16. Against 10, the muted seaglass ground
similarly stops competing with its own accent in 17.

In light mode it initially did not help at all — it erased the families entirely.
That was a defect, now fixed (§5). Post-fix the light muting is a genuine but
subtle effect; the families are distinguishable but the difference between a
muted and unmuted light ground is much smaller than in dark.

## 7. Recommendation

**Top pick: 12 Slate & Amethyst.** It is the only set that answers all three
words of the brief at once — bold, unique, and premium — while being one of two
that survives light mode with its character intact.

**Runner-up: 15 Muted Plum & Chartreuse**, if the priority is energy over
restraint. It has the best hierarchy of the nine and the most "now we're talkin'"
in dark mode; accept that its light mode is a different, quieter animal.

**Would kill: 13 Slate & Aquamarine.** It is the safest of the slate three and
adds nothing 17 does not do better on a ground built for it.

Before any set ships, it needs: the role-vs-semantic overlaps in §2 settled by
hand, and a clean-context evaluator pass to replace this self-assessment.


---

# Round 3 — six page treatments (sets 20–25)

## The finding that reset this round

The first attempt at round 3 varied only the semantics and reused the seaglass
family's accents. Sets 20, 21 and 22 were **pixel-identical** in accent to sets
17, 18 and 19 — aqua, magenta, lime. That was a fair complaint and it forced a
measurement worth recording.

Across the 19 earlier sets, every accent is **light-on-dark**, lightness 0.66 to
0.93, chroma capped at 0.230. Plotting them by hue leaves only a handful of gaps
wider than 20°, and once gold and orange are excluded, essentially none that is
not adjacent to something. Testing six fresh hues against all 19 priors put five
of them under ΔE 0.08 — "too close" — no matter which slot they took.

There is also a hard physical limit: **blues and cyans cannot be made more
electric on a dark ground.** A dark background demands high lightness for
contrast, and sRGB cannot hold much chroma up there at those hues. Magenta,
purple, pink and lime can; blue cannot. So "bolder blue" is not available.

The conclusion is that hue novelty is exhausted, and distinctness has to come
from **how the accent is used**. Round 3 is therefore six page treatments:

| # | Set | Treatment | What is actually different |
|---|---|---|---|
| 20 | Prism | `duotone` | Two brand colours. Fills and eyebrows in cyan; outlines, links and the install pill in magenta. The page alternates. |
| 21 | Ink | `deep` | Primary buttons are near-black indigo blocks with white labels. The page's weight inverts. |
| 22 | Halo | `halo` | The accent never fills a shape — outlines and glow only. The page reads as lit, not painted. |
| 23 | Orchid | `max` | Chroma ceiling: 0.264, against a prior maximum of 0.230. The most saturated accent a screen can render at a legible lightness. |
| 24 | Invert | `invert` | The accent becomes a surface. The stage and closing CTA are solid accent blocks with the ground colour as text. |
| 25 | Bone | `bone` | No brand colour at all. Achromatic bone-white; every drop of colour comes from the semantics. |

Only 23 competes on hue alone. The other five would look different even rendered
in the same colour, which is the point.

## Semantics (all six sets)

All six sit on round 2's muted seaglass ground and carry the same semantic
improvements.

## What changed in the generator

**`info` became a real semantic.** It was aliased to `secondary` — the
changelog's "next" colour — which is what production does today, and is a large
part of why the semantic row reads flat there: the info badge and the
next-release identity were literally one colour. Sets 20–25 give it its own hue.

**Semantics are now derived by search, not by a chroma table.** The first
attempt simply multiplied chroma by 1.25–1.4 and barely moved: mean chroma went
0.140 → 0.15, because saturated colours cannot exist at the high lightness these
tokens sit at, and `toHex` was clamping the excess straight back off. The fix
walks lightness and takes the largest in-gamut chroma that still clears 4.5:1 at
each step, keeping the best. That is a real gain:

| Set | Tone | Mean semantic chroma | Mean lightness |
|---|---|---|---|
| 10 Seaglass (round 1, for reference) | — | 0.140 | 0.788 |
| 20 Vivid | max | **0.219** | 0.766 |
| 21 Jewel | deep | 0.189 | 0.674 |
| 22 Neon | bright | 0.198 | 0.812 |
| 23 Wide | max | 0.201 | 0.756 |
| 24 Split | deep | 0.191 | 0.704 |
| 25 Rose | bright | 0.184 | 0.772 |

`semanticTone` exists because the first pass at this made all six identical:
every set hit the same ceiling and the only thing separating them was hue.
"deep" takes the darkest of the top chroma band, "bright" the lightest, so jewel
reads gem-like and neon reads glowing while both stay vivid.

**The hue solver now degrades instead of giving up.** With five semantics plus
the identity trio plus six roles, the constraint set is very nearly unsolvable.
The old single-tier solver, finding no legal slot, silently left the role
*exactly where it collided* — the worst possible outcome. It now tries the full
rule, falls back to satisfying the trio alone, and runs a second pass so that
moving a later role re-checks the earlier ones.

## Result

Round 3 is the cleanest batch of all 25 sets.

| Set | Residual collisions | Note |
|---|---|---|
| 20 Vivid | **0** | |
| 23 Wide | **0** | |
| 25 Rose | 1 | tri-agent/success, light only |
| 22 Neon | 2 | incl. the intentional accent = workflow mapping |
| 21 Jewel | 3 | all role-vs-semantic |
| 24 Split | 3 | all role-vs-semantic |

For comparison, rounds 1 and 2 range from 3 to 10. Every remaining collision is
the defensible role-vs-semantic kind — specialist on success's green, audit-gate
on danger's red.

## Notes per set

- **20 Vivid** — the conventional five at full voltage, and the highest mean
  chroma of any set explored. Zero collisions. If the brief is "the semantics
  feel flat", this is the answer that needs no one to learn anything new.
- **21 Jewel** — deepest tone; the status row looks composed rather than
  utilitarian. The magenta accent keeps the brand out of the semantics' way.
- **22 Neon** — brightest, and the one most likely to be too much on a long
  page. Its lime accent is inherently crowded by the green success; worth
  seeing where the ceiling is, but the hardest of the six to live with.
- **23 Wide** — the five semantics sit at a true 72° pentagon, the furthest five
  colours can get from each other. Zero collisions, and the most defensible
  choice if maximum distinctness is the actual goal. The cost is that success
  lands bluer and warning yellower than convention.
- **24 Split** — warm trio (danger, warning, in-progress) versus cool pair
  (success, info). You can tell whether a row wants action before reading which
  colour it is. The most *useful* idea of the six.
- **25 Rose** — the fashion-led one. The hot rose brand colour forces the
  semantics off their usual seats, which is what makes them distinct.

## Recommendation for round 3

**23 Wide** if the goal is literally "distinct" — it is provably the most
separated arrangement and carries zero collisions. **24 Split** if the semantics
should *do work* rather than just be distinguishable; the warm/cool division is
the only idea here that makes the status row faster to read rather than merely
prettier. **20 Vivid** is the safe pick and is not a compromise.

Same caveat as above: still a self-evaluation, not the isolated evaluator.
