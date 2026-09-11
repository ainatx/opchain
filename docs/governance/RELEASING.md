# Releasing opchain — the complete surface guide

> **Status: reviewed draft, staged in the monorepo.** At the repo split
> (handoff Phase C4) this file becomes the root `RELEASING.md` of
> `asfbay-bit/opchain-skills`, adapted for the two-repo layout. Until then it is
> the canonical release process for `ainatx/opchain`, where both halves of a
> release live. Decision record: [docs/plans/2026-08-27-release-surface-governance.md](../plans/2026-08-27-release-surface-governance.md).
> Decision-making rules (who decides what ships): [GOVERNANCE.md](GOVERNANCE.md).
>
> **Activation:** like the governance process, this document becomes **binding
> when a second maintainer is added** (see GOVERNANCE.md → *Activation*).
> Until then it is the working checklist the sole maintainer follows — and may
> amend directly — not a rulebook anyone can be held to.

**Audience:** anyone cutting an opchain release — maintainers, release agents,
and contributors who want to understand why their merged skill isn't on the
site yet. If you remember one thing: **a release is not "the code merged." A
release is the code merged, versioned, tagged, *and every surface below telling
the same story* — and the live-claim surfaces don't move until the deploy
does.**

---

## 1. The golden rule

> **The site must never claim shipped what isn't live in prod.**

Every release-coupled surface is one of two kinds:

- **Forward surfaces** — describe what's *coming* (Coming Next card, planned
  tabs, roadmap buckets). Safe to update in any release-build PR.
- **Live-claim surfaces** — assert what's *currently shipped* (header version
  chip, "vN · shipped" bars, the open changelog hero). These flip **only in the
  release-cut PR, merged only when the deploy follows immediately.** Flipping
  them early makes the site lie until the deploy lands and creates a
  deploy-relevant difference from the approved release baseline.

**Feature PRs never touch live-claim surfaces.** Not to "help," not to fix a
typo in the version string, not as a drive-by. If you think a live-claim
surface is wrong, open an issue — the fix ships with a release cut or as an
explicit maintainer correction, never inside unrelated work.

## 2. Versioning model

Skills are versioned in **lockstep**: one bump moves the entire catalog (all
29 `skills/<id>/SKILL.md` files carry the same `version:`). Entries in
`skills/CHANGELOG.md` are per release, not per skill.

| Type | Example | When |
|---|---|---|
| **Patch** | v1.8.1 → v1.8.2 | Fixes, doc corrections, no new capability |
| **Minor** ("a release") | v1.8.x → v1.9.0 | Additive capability — new skills, new phases, new commands. This is the normal release unit. |
| **Major** | v1.x → v2.0 | A change that breaks a documented contract (see the breaking-change policy at the top of `skills/CHANGELOG.md`) |

Note the licensing boundary for consumers: **releases ≤ 1.8.2 were MIT;
≥ 1.8.3 are Apache-2.0.**

## 3. The surface matrix

This is the exhaustive list. When you cut a release, every applicable row must
move — and §6's mandatory audit prompt checks every row against what actually
shipped before anything merges.

### 3a. Product surfaces (every release, patch and minor alike)

| # | Surface | File(s) | What changes |
|---|---|---|---|
| P1 | Skill version stamps | `skills/<id>/SKILL.md` frontmatter ×29 | `version:` → the new semver, all skills, no exceptions (lockstep) |
| P2 | Catalog changelog | `skills/CHANGELOG.md` | New release entry at the top; BREAKING callouts if any |
| P3 | Plugin manifest | `plugins/opchain/.claude-plugin/plugin.json` | `version` |
| P4 | Marketplace manifests | `.claude-plugin/marketplace.json` (both copies) | plugin `version`; post-split also the SHA-pinned enterprise entry's `ref`/`sha` |
| P5 | MCP registry listing | `server.json` | `version` (the publish workflow re-syncs from the tag, but don't ship a stale file) |
| P6 | Release baseline seal | `release-seal.json` | `catalogVersion` → the new semver, `generation` → 1, `publisherWorkflowSha256` → the exact publisher workflow blob, and `serverJsonSha256` → the MCP registry payload; increment generation only when intentionally replacing that version's untagged baseline |
| P7 | Git tag | — | `vN.N.N`, signed + annotated (`git tag -s`); pushing it triggers `publish-mcp-registry.yml` |

`skills.json`'s `catalogVersion` is **derived** from P1 at build time
(`src/lib/discovery.js` reads `skills[0].version`) — no hand edit, but verify
it live after deploy.

### 3b. Site live-claim surfaces (flip at the cut, by release type)

| # | Surface | File | Patch | Minor |
|---|---|---|---|---|
| L1 | Header version chip + href | `site/src/components/Header.astro` — `CURRENT_RELEASE`, `CURRENT_RELEASE_HREF` | — (carries the major.minor line) | ✅ |
| L2 | Homepage release bar (shipped) | `site/src/pages/index.astro` — `rb-tag` | — | ✅ |
| L3 | Homepage stat chip | `site/src/pages/index.astro` — `stat-num` | — | ✅ |
| L4 | Changelog — open hero | `site/src/pages/changelog.astro` | ✅ extend the open hero's version + date **range** (`v1.8.0 → v1.8.2 · Jul 10 – Jul 24`) and add a patch `rel-card` (`#vN-N-N`) beside it | ✅ promote the new release to the open hero; run the aging pass (§4) |
| L5 | Changelog — "Just Released" tab count | `site/src/pages/changelog.astro` — `tab-count` | ✅ recount | ✅ recount |
| L6 | Skill Library callout tag + href | `site/src/pages/skills/index.astro` | — | ✅ |
| L7 | Styleguide version badge | `site/src/pages/styleguide.astro` — `<Badge>vN.N.N</Badge>` | ✅ (full patch version) | ✅ |

**The tab-count rule (L5):** the count equals the number of release cards
actually rendered in the Just Released panel (heroes + rel-cards). Never
increment arithmetically — **recount the rendered cards** at every cut. The
hardcoded count has drifted from the rendered census before; the audit prompt
makes a fresh count mandatory.

### 3c. Site forward surfaces (update in the release-build PR — minor releases)

| # | Surface | File | What changes |
|---|---|---|---|
| F1 | Homepage release bar (next) | `site/src/pages/index.astro` — `rb-tag-next` | vN+1 becomes "next" |
| F2 | Changelog — Coming Next hero | `site/src/pages/changelog.astro` | the release being built moves in; its body reflects what actually shipped in the sprints, not the original plan |
| F3 | Coming Next tab count | `site/src/pages/changelog.astro` | the new next version |
| F4 | Planned tab + votable options | `site/src/pages/changelog.astro` | shift planned groups forward; **keep ≥ 3 `data-vote-target` options live** — the community vote block in [GOVERNANCE.md](GOVERNANCE.md) needs a top-3 to weight (3/2/1), so fewer than three votable options breaks the decision process, not just the page |
| F5 | Roadmap data | GitHub issues on `asfbay-bit/opchain-skills` → `npm run gen-roadmap` → `site/src/data/roadmap.json` | re-bucket after scope selection; the JSON is gitignored — **regenerate immediately before every deploy** or the build ships the empty-roadmap fallback |
| F6 | Architecture diagrams | `site/src/pages/architecture.astro` + `site/src/components/MobileArchitecture.astro` | vN band badges, "NEW vN" annotations, any new skills/phases in the pipeline narrative — **both files**, they drift independently |

### 3d. Count strings (the drift trap)

Skill counts, tri-agent counts, walkthrough counts, and checkpoint counts are
currently **hand strings scattered across 10+ files** (~30 sites: `/install`,
`/architecture` ×3, MobileArchitecture ×6, `/compare`, `/glossary`, the
changelog, WelcomePopup, and more). Until the derived counts module lands
(surface-pass D2 / handoff Phase E item 3), any release that changes the
catalog must sweep them:

```bash
grep -rn --include='*.astro' --include='*.ts' -E '\b(29|30|31) skills\b|\bskills\b.{0,20}\b(29|30|31)\b' site/src
```

— adjusting the numbers to the old/new counts. The audit prompt (§6) requires
a fresh `ls skills/ | wc -l`-derived count, never the previous release's
number.

## 4. Changelog display rules

The `/changelog` Just Released panel is the release history. The rules:

1. **Nothing is ever deleted.** Every release back to v1.0 stays on the page.
2. **The newest release is the one open hero** (`hero-card--released is-open`,
   "latest release" badge). Patches extend its version/date range in place
   (rule L4) and add their own compact `rel-card` — a patch never creates a
   new hero.
3. **Five heroes total: the open hero plus the four most recent previous minor
   releases** as collapsed `hero-card--released` cards, above the
   `earlier releases` divider. At each minor cut, run the aging pass: promote
   the new release to open hero, demote the previous open hero to a collapsed
   hero, and demote the oldest collapsed hero past the window to a compact
   `rel-card` below the divider (swap `hero-card hero-card--released` →
   `rel-card`, the `hero-head` block → `rc-row`, `card-body-inner
   hero-body-inner` → `card-body-inner`).
   *(This five-hero rule supersedes the 21-day window in
   `skills/oc-release-ops/references/site-release-surfaces.md`; reconcile that
   reference at its next scheduled rework.)*
4. **Topical `rel-card`s** (e.g. the Apache-2.0 relicense card) may sit above
   the divider next to the release they shipped with; they count toward L5.
5. **Hero bodies describe what actually shipped.** When Coming Next (F2)
   becomes the open hero, its body is rewritten against the real release diff
   — features cut from the release come out of the copy.

## 5. Order of operations — the release ritual

Deploys are manual (a human with `wrangler login`); the atomic point of a
release is the **deploy**, not the merge. The order is fixed:

1. **Decide scope** per [GOVERNANCE.md](GOVERNANCE.md) (creator vote + weighted
   community vote). Record the outcome in the roadmap issue.
2. **Product half:** one PR — P1–P6 bumped together, changelog entry written.
   CI green (including lockstep + catalog validation), review per CODEOWNERS,
   squash-merge with `Signed-off-by` preserved. Create the signed tag (P7), run
   `node scripts/check-release-tag.mjs --local`, and only then push it. Re-run
   without `--local` to prove origin holds the same signed tag object.
3. **Site half:** one PR — the applicable L-surfaces, forward surfaces, counts
   sweep, changelog entry/aging. **This PR must not claim vN before the vN tag
   exists** (step 2 first, always). Run the §6 audit prompt on it. Merge only
   when the deploy follows in the same sitting.
4. **Deploy:** from the exact reviewed release checkout (normally pulled
   `origin/main`) —
   `npm run gen-roadmap && npm run deploy:staging` → automated smoke
   (`npm run smoke:staging`) → **human eyeballs staging at the exact SHA that
   will ship** → `npm run gen-roadmap && npm run deploy` →
   `npm run smoke:prod` → verify `/api/health` `version` equals the exact
   deployed runtime SHA (cache-busted) and `/skills.json` `catalogVersion`
   equals the new semver. Then update
   `.github/monitoring/release-baseline.json` with the observed production and
   staging deployment/version ids, 100% traffic, and script fingerprints; run
   the control-plane and deploy-diff checks locally; and merge that reviewed
   baseline update. Do not manually close a deploy-lag issue before those gates
   pass — the default-branch workflow reconciles it from the approved baseline.
   See [the Cloudflare challenge runbook](../runbooks/cloudflare-challenge.md)
   for the control-plane assurance limit.
5. **If the release is abandoned mid-review:** close the site-half PR
   unmerged. Because of the ordering, there is nothing live to roll back.

## 6. The mandatory surface audit

**Every release-cut PR (patch or minor) must include a completed run of this
prompt in its description — a verdict table and an explicit SHIP line — before
review.** Run it with your agent (Claude Code, Codex, or equivalent) from the
release branch. Internal consistency is not the bar; **agreement with the
actual content of the release is.**

```text
You are running the opchain release-surface audit. Audit the working tree
against the release being cut. Trust nothing you did not read this session —
not this prompt's examples, not memory, not a previous audit.

1. GROUND TRUTH — collect and print:
   - RELEASE_VERSION: the top entry of skills/CHANGELOG.md (this is canonical).
   - RELEASE_TYPE: patch or minor, from RELEASE_VERSION vs the previous tag.
   - THE RELEASE CONTENT: `git log --oneline <previous-tag>..HEAD` plus
     `git diff --stat <previous-tag>..HEAD -- skills/` — this is what actually
     shipped.
   - SKILL_COUNT: count the directories in skills/ that contain a SKILL.md.

2. SURFACE SWEEP — open docs/governance/RELEASING.md §3 and, for every row
   applicable to RELEASE_TYPE, read the named file and record the value it
   claims. That includes: all 29 SKILL.md version stamps (P1 — list any that
   differ), the four manifests (P3–P5), every L-surface value, every F-surface
   value, and a fresh grep for the §3d count strings.

3. VERDICT TABLE — one row per surface: file, expected (derived from ground
   truth in step 1), actual, PASS/FAIL. A value that matches the other
   surfaces but not the ground truth is a FAIL. A surface you could not read
   is a FAIL.

4. CONTENT CHECK — read the new changelog entry (skills/CHANGELOG.md) and the
   changelog.astro hero/card body for this release. Verify every claim in them
   against THE RELEASE CONTENT: every feature named actually shipped in the
   diff; nothing user-facing in the diff is missing from the copy; the L5 tab
   count equals a fresh count of rendered cards in the Just Released panel;
   the Planned tab still exposes ≥ 3 data-vote-target options. Quote the
   evidence for each claim you verify.

5. MECHANICAL GATES — run and paste the results:
     npm test
     node scripts/check-release-surfaces.mjs
     npm run gen-catalog
     npm run checkpoint:validate

6. OUTPUT — the verdict table, the content-check findings, the gate results,
   and one final line: SHIP or DO-NOT-SHIP. Any FAIL anywhere is DO-NOT-SHIP.
   If DO-NOT-SHIP: list the exact edits needed, apply nothing yourself unless
   asked, and re-run the audit after fixes until clean.
```

The mechanical gates alone are **not** sufficient —
`check-release-surfaces.mjs` proves the L-surfaces agree *with each other*,
and CI has stayed green while all of them agreed on a stale version. Steps
1–4 are what tie the surfaces to reality.

## 7. Who does what — the contributor seam

**Contributors:** your obligation ends at the product. A skill PR plus a note
under the Unreleased/next-release section of `skills/CHANGELOG.md` is a
complete contribution. You do **not** update site surfaces, version stamps, or
manifests — those move in lockstep at cut time, and a site that still shows
the previous version after your merge is *expected and owned*, not a bug to
PR against. (Post-split: skill PRs go to `asfbay-bit/opchain-skills`; the site
lives in `ainatx/opchain` and is maintainer territory.)

**Maintainers / release agents:** you own §3–§6 end to end. The release-cut
PRs are the only PRs that touch live-claim surfaces, and the audit prompt run
is part of the PR, not an afterthought.

## 8. Enforcement — what CI catches today, and what's planned

| Gate | Runs | Catches |
|---|---|---|
| `tests/release-surfaces.test.js` → `scripts/check-release-surfaces.mjs` | CI, every PR | The 8 live-claim probes disagreeing with Header's `CURRENT_RELEASE` |
| `tests/site-release-chip.test.js` | CI, every PR | Header chip value/href/callout copy drift |
| `site/tests/e2e/changelog-and-scenarios.spec.ts` | CI (Playwright) | Which hero is open, Coming Next lead, deep-link targets |
| `npm run gen-catalog` | Every build | SKILL.md frontmatter validity, dir/name match, flag registry drift |
| `npm run checkpoint:validate` | CI | Checkpoint schema honesty |
| Deploy-lag canary + ancestry refusal in `scripts/deploy.mjs` | Every fourth day-of-month / at deploy | Prod behind main; staging cut from a non-main SHA |
| *Planned:* changelog cross-check (decision doc R3a) | CI | Header claiming a release `skills/CHANGELOG.md` doesn't have |
| *Planned:* derived counts module + pinned test (R3b) | CI | The §3d count strings, retired as hand strings |
| *Planned:* submodule pin ↔ tag check (R3c, post-split) | CI | Site claiming a release the pinned product tree isn't on |

Until R3a–R3c land, the §6 audit prompt is the compensating control — which is
why it is mandatory, not advisory.
