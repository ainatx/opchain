# Runbook: the architecture-diagram cycle (audit → fix → release update)

**Use this when:** a release adds or changes skills and `/architecture` has to
follow, or the diagram is suspected of drifting. Say *"follow
`docs/runbooks/architecture-diagram-cycle.md` for vX.Y"* and this is the
procedure.

## The loop, in order

Do these in sequence; each section below expands one step.

1. **§1 Ground truth** — fetch, confirm you aren't stale, count the real
   catalog, run the geometry auditor and record its number.
2. **§2 Audit** — fan out across dimensions, then adversarially verify every
   finding before you act on one.
3. **§3 Release update** — read the new skills' frontmatter, place them, wire
   them to the bands, update every count.
4. **§4 Verify** — the gauntlet, at every viewport and both themes.
5. **§5 Ship** — commit gate → rebase → PR → merge → staging → production.

§6 is a worked example of the whole loop; §7 lists the defect classes worth
re-checking every time; §8 is the exit condition.

Skip §3 for a pure audit pass; skip §2 only if the diagram was audited within
the last release.

**Surfaces this runbook owns** (all four drift independently — check all four):

| File | What it is |
|---|---|
| `site/src/pages/architecture.astro` | The desktop diagram. ~2,800 lines: markup, one inline `<script>`, one `<style is:global>`. |
| `site/src/components/MobileArchitecture.astro` | The static mobile diagram, shown ≤767px. |
| `site/src/components/PipelineDiagram.astro` | A simplified pipeline SVG. **Imported by no page** — it drifts silently. |
| `site/src/pages/{install,compare}.astro` | Carry hardcoded skill/command counts. |

`/skills` and `/skills/<id>` need **no** work — they are an Astro content
collection reading `skills/<id>/SKILL.md` and populate themselves.

`site/src/pages/changelog.astro`'s "All 29 skills" strings are **historical**
release entries. Never bump them; that rewrites history.

---

## 0. Non-negotiables

1. **Never state a number the repo can't back.** Every count in the diagram is
   checkable: `ls skills | grep -c '^oc-'`. The audit that produced this runbook
   found the page claiming things that were simply false.
2. **The catalog lives in `skills/`, this diagram does not.** Do not add a skill
   file for diagram work — `gen-skills-catalog.mjs` validates that directory and
   the catalog is lockstep-versioned.
3. **Work from the release branch's real `SKILL.md` frontmatter**, not from
   roadmap issues. Roadmap text describes intent; frontmatter describes what
   shipped. They disagree (see §3).
4. **Load the design system before editing.** `architecture-diagram-pro` →
   `references/spec.md`. The diagram implements it; §10b and §11 in particular
   are load-bearing and were both violated in the wild.

---

## 1. Establish ground truth

Do this before reading a single line of SVG.

```bash
git fetch origin
git log --oneline HEAD..origin/main | head        # are you stale? (this bit us)
ls skills | grep -c '^oc-'                        # real skill count
grep -h '^version:' skills/*/SKILL.md | sort -u    # lockstep catalog version
```

Then run the deterministic geometry auditor. **Do not eyeball coordinates** —
there are hundreds, and model arithmetic over them is unreliable:

```bash
node scripts/audit-diagram-geometry.mjs \
  site/src/pages/architecture.astro \
  site/src/components/MobileArchitecture.astro
```

**Baseline at v1.9 is `TOTAL: 16`, all known false positives** — they are
enumerated in the script's header. Investigate anything above 16. Re-run after
every edit; it is the fastest regression signal in the loop.

The baseline is not sacred: adding a rail or a band legitimately changes it. When
it moves for a good reason, confirm each new entry is genuinely intentional, then
**update the number and the enumerated list in the script's header** in the same
commit. A baseline nobody maintains is a baseline nobody trusts.

---

## 2. The audit

Fan out across dimensions, then **verify adversarially** — this is the part that
pays. In the v1.9 pass, 8 auditors produced 118 findings; independent verifiers
refuted 6 and rescoped 29. Verifiers caught a reversed arrow, a fabricated
colour convention, and an amber-on-amber pill that would have been invisible.

Run the dimensions in parallel (subagents or a workflow), one per row of the
table below, then pass **each dimension's findings to a separate verifier** that
did not produce them. Hand every agent the same three things, or they invent:

- the exact file paths and the line ranges they own,
- the design spec (`architecture-diagram-pro` → `references/spec.md`),
- the geometry auditor's current output as ground truth.

Instruct verifiers to **default to REFUTED when a claim isn't provable from the
source**, to re-derive any arithmetic themselves, and to reject fixes that would
move an element into a new collision. Require every finding to carry a file,
a line, the evidence, and a concrete before→after edit; discard the rest.

Dimensions that have each found real defects:

| Dimension | Look for |
|---|---|
| **Coordinate-map drift** | The inline script hardcodes a `SKILLS` map duplicating rect geometry. **Highest-yield check in this runbook** — see §2.1. |
| Animation script | Listener/timer leaks, state that desyncs, `aria-expanded` drift, guards missing a mode. |
| Animation CSS | Orphan keyframes, missing `forwards`, delay chains, `prefers-reduced-motion` coverage. |
| CSS layout | Clipped panels, starved flex children, magic numbers, overflow. |
| Geometry | Verify the auditor's output; classify real vs intentional. |
| A11y + spec | Focus rings on elements that can actually receive focus, tooltip wiring, contrast, spec hard rules. |
| Content truth | Counts, ordinals, paths, typos — including inside SVG `<title>` (screen-reader text). |
| Responsive | The 767px swap, both sides of it, and mobile parity. |

### 2.1 The coordinate-map trap — check this every release

`architecture.astro`'s script carries a hardcoded `SKILLS` map (`x/y/w/h/vbW/vbH`
per skill) that **duplicates** the SVG rect attributes. When a band's `viewBox`
grows, the map does not follow, and every connector into that band is silently
mis-scaled.

This shipped for two releases. v1.7 added `oc-signal-forge` and grew the build
band's viewBox from 120 → 205; the map still said `vbH: 120`, so every build-band
endpoint was scaled by 205/120 = **1.708×**. Three arrowheads landed ~27px inside
their panels and two advisory lines started ~119px below their source box.

```bash
# every band's real viewBox height
grep -n 'viewBox="0 0 760' site/src/pages/architecture.astro
# what the map claims
grep -n "vbH:" site/src/pages/architecture.astro
```

They must agree, per band. Also confirm every drawn component exists in the map —
new skills are routinely added to the markup and forgotten here.

### 2.2 Verify in a real browser, not by reading

Several defects are invisible in source and obvious at runtime. Run the dev
server and measure the DOM:

- **Panel clipping:** force `max-height: none`, read the natural height, compare
  to the cap. Do **not** measure a child while the parent is clipped — the
  reflow lies.
- **Both themes:** toggle `data-theme` and re-read computed colours. The diagram
  is dark-only, so any token it inherits from the site theme is a bug.
- **Both sides of 767px**, plus the narrowest desktop width (768px).
- **The canvas:** `getImageData` and count non-transparent pixels. Zero ink is
  the signal that the connector layer silently died.

---

## 3. Adding a release's new skills

### 3.1 Get the facts from frontmatter

For each new skill read `skills/<id>/SKILL.md` and record: `phases`, `triAgent`,
`commands`, the one-line description, and its edges to existing skills. Write
these into a facts file and make every downstream step cite it.

**Roadmap issues are not the source of truth.** For v1.9 the roadmap called all
four skills `roadmap:planned` while the frontmatter showed them built at
`version: 1.9.0`. Frontmatter wins.

### 3.2 Decide where each skill goes

Ask one question per skill: **does it belong to a phase, or does it cut across
them?**

- Touches one phase and sits on the handoff spine → it is a **band panel**, and
  you must re-space that band.
- Attaches to several phases, or hangs off an existing skill via a manifest or a
  conditional gate row → it is a **rail** entry.

All four v1.9 skills were the second kind, which is why they became a rail
rather than four new panels across PLAN/BUILD/SHIP.

### 3.3 Prefer a new rail over re-spacing the bands

The phase bands are dense. Cross-cutting additions go in a **rail** after the
previous release's rail — the established pattern:

| Release | Rail | Accent |
|---|---|---|
| v1.6 | `.irail` instrument rail | `--inst` lime |
| v1.8 | `.qrail` quality-gate rail | `--docs` sky |
| v1.9 | `.arail` assurance rail | `--assure` gold |

Copy the previous rail's structure exactly: `<div class="Xrail" role="group"
aria-label="...">` → `.Xrail-head` (eyebrow + title) → `.Xrail-svg-wrap` → svg →
`.Xrail-anchors` (one `<a href="/skills/<id>">` per skill, reusing the shared
`.ia-name`/`.ia-meta`/`.ia-do`/`.ia-badges` classes) → `.Xrail-foot`.

Add tokens beside the existing ones: `--<name>`, `--<name>-dim` (`.08` alpha),
`--<name>-mid` (`.16`). **Check the accent is free in both palettes** — mobile
defines its own `--ma-*` set, and gold collides with `--ma-triagent` there.

Then connect the bands to the rail with the existing `branch-tag` pill
convention rather than moving panels. Mind the arrow direction: a pill means
"this panel hands off to X". If the relationship is the reverse, say so (`←
oc-qa-ops · qa.yaml`), don't flip the semantics.

### 3.4 House geometry conventions

Non-negotiable, because CI asserts several of them:

- **Font sizes**: desktop ⊆ `{5.5, 6.5, 7.5, 8, 9}`, mobile ⊆ `{9, 11, 13, 15, 17}`.
  `site/tests/e2e/diagram-geometry.spec.ts` fails the build on any other value.
- **Panels** are two stacked rects with identical geometry: an opaque `#1c1710`
  base carrying the `<title>`, then a tinted 0.5-stroke overlay.
- **Centred text** must have `x` exactly equal to its panel's centre.
- **CP/ORC chips**: 22×13, `rx=3`, at `panelRight-37` and `panelRight-11` — the
  ORC overhangs the right edge by exactly 11. 20 of 23 panels obey this; the
  legend documents it.
- **Straddling badges need an opaque backing rect** — the e2e suite checks this.
- **Rows**: equal inter-panel gaps, equal left/right margins.
- **Arrowhead colour must match its line's stroke.** If no marker exists in that
  colour, add one to the shared `<defs>` — don't reuse a mismatched one.

### 3.5 Update every count

**Do this after rebasing onto the release, not before.** The release commit
usually bumps some of these itself; editing them first produces conflicts and
your edits get dropped as redundant. In the v1.9 pass exactly that happened to
`install.astro` and `compare.astro`.

```bash
grep -rn "[0-9]\+ skills\|[0-9]\+ tri-agent" site/src/pages/architecture.astro \
  site/src/components/MobileArchitecture.astro site/src/pages/install.astro \
  site/src/pages/compare.astro
```

Header subtitle, `<meta description>`, footer, the "All N skills read all N
checkpoints" info card, the CP legend card, mobile subtitle and appendix,
`install.astro` (skills **and** slash commands — verify with
`ls plugins/opchain/commands/ | wc -l`), `compare.astro`.

Count audit gates carefully: a *conditional row* added to an existing gate is
not a new gate. v1.9 added two such rows and the diagram still correctly says
"3 audit gates".

---

## 4. Verification gauntlet

Everything must pass before a PR:

```bash
cd site && npx astro check          # 0 errors, 0 warnings
cd .. && npm test                   # vitest
cd site && npx playwright test diagram-geometry.spec.ts routes.spec.ts
npm run site:build
node scripts/audit-diagram-geometry.mjs site/src/pages/architecture.astro \
  site/src/components/MobileArchitecture.astro    # <= the known baseline
```

Manual, per viewport — **768, 1024, 1280, 1440, and 390**: expand every band and
confirm nothing clips; toggle light/dark; check `prefers-reduced-motion`; tab
through and confirm a visible focus ring; confirm the page itself never scrolls
sideways (the diagram card may).

If `/changelog` e2e tests fail, check whether they fail on a pristine tree before
blaming your change — they need `site/src/data/roadmap.json`
(`npm run gen-roadmap`) and have been failing locally while passing in CI.

---

## 5. Ship

The gates are real and each one caught something during the v1.9 pass. Do not
reach for an escape hatch to get past one.

1. **Commit.** A PreToolUse hook blocks `git commit` unless
   `.checkpoints/oc-bug-check.checkpoint.json` shows a PASS newer than 10
   minutes. Run the checks, then record the run honestly.
2. **Rebase onto current `origin/main`.** Expect conflicts on count lines if the
   release already bumped them — keep main's release edits, layer yours on top.
3. **PR**, and wait for all four checks.
4. **Merge before deploying staging.** `scripts/deploy.mjs` refuses a staging
   deploy whose HEAD isn't reachable from `origin/main`.
   `OPCHAIN_ALLOW_OFF_MAIN_STAGING=1` exists but defeats the "I looked at
   staging, it's safe to ship" gate — merging is nearly always the right answer.
   `main` may be checked out in another worktree; `git checkout --detach
   origin/main` satisfies the guard.
5. **Deploy refuses a dirty tree**, including untracked files. Move local-only
   config aside rather than committing it.
6. `npm run deploy:staging` → confirm `/api/health` `version` equals your merge
   SHA → eyeball → `npm run deploy`.
7. Afterwards, refresh `.github/monitoring/release-baseline.json`.

**Probing with plain `curl` returns a 307 bot challenge** on HTML routes — Bot
Fight Mode, documented in `cloudflare-challenge.md`. Use a browser UA and `-L`,
or you will mistake a challenge for an outage. Trailing-slash redirects on
`/skills/<id>` are also 307; follow them.

---

## 6. Worked example: the v1.9 pass

The pass this runbook was written from, end to end, as a shape to copy.

| Step | What happened |
|---|---|
| Ground truth | Worktree was 7 commits stale, so `skills/` showed 29 while `origin/main` had 33. **Fetching first would have saved an hour** and a wrong assumption that the skills were unbuilt. |
| Audit | 8 dimensions × (auditor + adversarial verifier). 118 findings → 6 refuted, 29 rescoped, 112 confirmed. |
| Fixes | 279 edits, applied as line-anchored scripted replacements with a guard on every anchor, in three passes: value edits → geometry → structural (strictly descending line order). |
| Release update | Four skills → one gold `.arail` after the v1.8 rail, plus 4 `branch-tag` pills wiring the bands to it, mobile parity, and `PipelineDiagram` brought current. |
| Ship | bug-check 7/7 → rebase (4 conflicts, all count lines) → PR → CI 4/4 → squash-merge → staging → production. |

Two things that mattered more than expected:

- **Applying edits as a guarded script, not by hand.** Every replacement named
  its line and asserted the old text was present; the first run failed on four
  mismatches and wrote nothing. Hand-editing 279 coordinates would have
  introduced silent errors.
- **The user caught a defect the pipeline dropped.** One auditor did flag the
  canvas z-order, but the synthesiser folded it into another entry and it never
  reached the fix set. Multi-agent breadth is not a substitute for looking at
  the rendered page.

---

## 7. Defect classes worth re-checking every time

Each of these was live in production and none was visible from reading the diff.

| Class | Symptom | Root cause |
|---|---|---|
| Coordinate-map drift | Connectors point into empty space | `SKILLS` map duplicates SVG geometry (§2.1) |
| Panel clipping | Content cut mid-sentence, unreachable | Fixed `max-height` + `overflow: hidden`, no scroll |
| Flex starvation | Text column collapses to 0, one char per line | `flex-shrink: 0` sibling with no `max-width` |
| Theme-token leak | Light-theme artefacts in a dark-only diagram | Consuming `--bg`/`--text`/`--subtle` without pinning them |
| Canvas z-order | Connector trunk paints over cards | Canvas above the bands; spec §10b wants it behind |
| Canvas dies on resize | No connector lines at all | Sized from a `display:none` container → 0×0, never redrawn |
| Chip collision | Badge clipped by a neighbour | Panel placed inside the +11 ORC overhang |
| Dead focus ring | Keyboard users see nothing | `:focus-visible` on an element with no `tabindex` |
| Stale silent surface | `PipelineDiagram.astro` two releases behind | Imported by no page; nothing fails when it rots |

---

## 8. What "done" looks like

- Geometry auditor at or below the known baseline; new rails at **0 findings**.
- `astro check` 0/0; unit + e2e green; build page count matches skill count.
- Every number in the diagram traceable to `skills/` or a manifest.
- New skills reachable from the phase bands, not only from the rail.
- Both themes, both sides of 767px, reduced motion, and keyboard focus verified.
- Production `/api/health` `version` equals the merge SHA, and staging matches.
