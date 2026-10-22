# Track S (WEB): 2.1 site surfaces — workstream plan

**Date:** 2026-10-16 · **Skill:** oc-app-architect Phase 4 (`/oc-roadmap`), coordinated by oc-orchestrator · **Status:** **APPROVED by the owner 2026-10-16.** WEB-00 (S0) merged in #610; WEB-01 (S1) built and held on draft #620 (router copy approved by Track E); WEB-02 – WEB-05 not started. **Scope 2026-10-19, amended 2026-10-22:** the `/work` section covers the nine 2.1 ow- skills; ow-controls, the packs and ow-currency move to v2.2 (2026-10-19), and ow-vendor-eval (OW-11) follows (owner, 2026-10-22). **Names:** sprints renamed 2026-10-17 to WEB-00 – WEB-05 (`ow-family-sprint-plan.md` § Sprint names); text below uses the old S0–S5.
**Base:** `origin/main` @ `ce3dad43` (ow-build-plan 1.0.0, #605).
**Release:** opchain v2.1.0, one release with two themes (owner, 2026-10-16): (1) the ow- planning family for client work (ow-start, ow-build-plan, ow-build, ow-uat, ow-handoff, plus the Claude Code add-on ow-tools); (2) Track E, enforcement at chokepoints, with the Jev skill router as an experimental preview. One changelog, one tag, one deploy, one release freeze.
**Relationship to the sprint plan:** this is the parallel track the Track S amendment adds to `sprints/release-2.1/ow-family-sprint-plan.md` ("site surfaces" in Sprint 6, and Track E's E3). That file is not edited here; the Track E amendment (PR #606) is editing it.

## Owner decisions (2026-10-16)

All approved by the owner on 2026-10-16.

| # | Decision |
|---|---|
| O1 | **Two themes, one release.** 2.1.0 is the ow- planning family for client work (ow-start, ow-build-plan, ow-build, ow-uat, ow-handoff + ow-tools) **and** enforcement at chokepoints, with the Jev skill router as an **experimental preview** |
| O2 | **v2.2 = Installs anywhere + the OSS split.** The GitHub vote milestones become "later: …", and milestone 4's issues move to v2.2. The GitHub changes are proposed as exact `gh` commands for the owner to confirm; Track S makes no GitHub change itself (decision D2, below) |
| O3 | **The ow- family gets its own section on opchain.dev**, at `opchain.dev/work`, named **"opchain.work"**: an overview, one page per ow- skill (five skills and ow-tools), install and a version table. It stays apart from `/skills` and the dev pipeline diagram. No second deploy. Registering the `opchain.work` domain is the owner's; until then the name appears only as forward copy (decision D1, below) |
| O4 | **One site branch, owned by this orchestration.** Track S takes over Track E's held site work (`claude/consolidate-2-1-updates-6054cf`, `site/` diff), reworks it for the two-theme release and adds the ow- pages. The JEV session supplies router copy and reviews. E3's site deliverables fold into Track S; E0 opens no site PR |
| O5 | **Forward surfaces now**: a small forward-only PR (S0) for Coming Next, Planned and the homepage next-bar |
| O6 | **S0 includes the early `/install` correction** "Installing the plugin installs no gate", true since 1.9.2 (decision D4, below) |
| O7 | **Two blog posts**: Track E's enforcement post revised for the two-theme release, and a new ow- family launch post. Both stay `draft: true` until the cut |
| O8 | `/llms.txt`, `/skills.json`, the MCP catalog and the `.well-known` files stay oc- only in 2.1.0, and a test guards that (§3.2) |

Standing rules this plan keeps: the site never claims shipped what isn't live in production (RELEASING.md §1); real prices never go in the repo; no ow- surface names a business or a private skill (`catalogs.json` `brandNames`, `privateNames`); the router follows the router release terms in the Track E amendment (PR #606): the "experimental preview" label, no effectiveness claim before a GO, the `/privacy` disclosure, live mode unsupported until a GO, and the opt-in steps.

## Sources read

- `origin/main`: `sprints/release-2.1/ow-family-sprint-plan.md`, `docs/governance/RELEASING.md`, `tests/release-surfaces.test.js`, `scripts/check-release-surfaces.mjs`, `catalogs.json`, `skills-work/README.md`, `site/src/content.config.ts`, `site/src/lib/skills.ts`, `src/lib/discovery.js`, `scripts/gen-mcp-catalog.mjs`, `lighthouserc.cjs`, `site/tests/e2e/*`, every page and component under `site/src/` (headings, release strings, nav), the six ow- designs, the 2026-09-21 strategy (§6, §8), `mirror/README.md`.
- Track E site work: `claude/consolidate-2-1-updates-6054cf` @ `ef2591cc`. `git diff b562955c..ef2591cc -- site/` is 10 files, +1130 / −89: `changelog.astro`, `install.astro`, `security.astro`, `glossary.astro`, `architecture.astro`, `index.astro`, `MobileArchitecture.astro`, new `EnforcementMap.astro`, the draft blog post, and the changelog e2e spec. Its plan is `docs/plans/2026-10-09-v2.1-site-update.md` (§A inventory, §B version surfaces, §C decisions, §D claims ledger).
- Track E amendment: committed on `claude/jev-implementation-status-0c66d6` (`ad6b5f99`), open as **PR #606**. This plan reads the router release terms from there. The E0 product half is on `claude/2.1-track-e-product` and has **no `site/` changes**.

---
---

## 1. Surface inventory

Kinds follow RELEASING.md. **Forward** surfaces describe what is coming (F1–F5) and can merge early. **Live-claim** surfaces assert what is shipped: the probed ones (L1–L10) and every page that describes 2.1 behaviour. They merge only in the release-cut sitting. **Plumbing/test** rows make no claim.

"Track E branch" says what `ef2591cc` already has: **reuse** (take as is), **rework** (take, then change), **new** (Track E has nothing).

### 1a. Forward surfaces (S0, then once more at the cut)

| # | Route / file | What changes | Theme | Kind | Copy source | Track E branch |
|---|---|---|---|---|---|---|
| 1 | `/changelog` Coming Next `#v2-1` (`changelog.astro` plan-card + header comment) | Title "The ow- planning family + enforcement at chokepoints". Two item groups: ow- (five skills and ow-tools, one line each) and enforcement (gate diagnostics, bypass records, enrollment, enforcement map, deploy and release guards, top-navigation rule). The router is its own item, labelled "experimental preview", with no effectiveness claim. The planned-box drops "the opchain.work skill pack moved to 2.2" | both | Forward F2 | ow-family sprint plan, the five ow- designs, product `skills/CHANGELOG.md` `[Unreleased]` (E0), router release terms | rework |
| 2 | `/changelog` Planned groups + tab count (`plannedReleaseGroups`, F4) | `#v2-2` becomes "Installs anywhere, says so honestly" plus the OSS split, as v2.2, direction set, not votable (the approved ow-family plan puts both in v2.2). Track E's `#installs-anywhere` (unscheduled) and `#v2-2` ow-skills cards go. The agency and discovery vote groups render as "later", with Track E's hash aliases. Tab count `v2.2 → later`. At least 3 votable options stay | both | Forward F3/F4 | ow-family plan "Not in v2.1.0"; `sprints/release-2.1/sprint-plan.md` (old 2.1 scope) | rework (keep Track E's static-group template and `HASH_ALIASES`; replace the group data) |
| 3 | Homepage next-bar (`index.astro` `rb-tag-next` + `rb-text-next`, F1) | `distribution and installation` → `client-work planning + enforcement`. Tag stays `v2.1 · next` | both | Forward F1 | row 1 | rework (Track E text was enforcement only) |
| 4 | Changelog e2e pins (`site/tests/e2e/changelog-and-scenarios.spec.ts`) | Coming Next title; Planned `#v2-2` = Installs anywhere (no votes); "later" vote loop; `#v2-3` and `#installs-anywhere` deep links resolve through the aliases | both | Plumbing/test | rows 1–2 | rework |
| 5 | Roadmap data (GitHub milestones → `gen-roadmap` → `roadmap.json`, F5) | Re-bucket per O2 / D2: milestone 5 "v2.2" → "later: agency delivery", milestone 6 "v2.3" → "later: discovery depth", milestone 4 ("v2.1", old scope) → v2.2. Proposed as `gh` commands for the owner; the S0 site reads milestones 5 and 6 by number, so it is right before and after | both | Forward F5 | GitHub issues on `asfbay-bit/opchain-skills` | new (Track E changed nothing on GitHub) |
| 6 | Cut-time forward flips (F1, F2, F3 at the cut) | Next-bar → `v2.2 · next` / `open-source repo, install anywhere`; Coming Next → `#v2-2`; Coming Next tab count → `v2.2`; Planned keeps the "later" groups | both | Forward | row 2 | rework (Track E staged `v2.2` = ow-skills) |

### 1b. Probed live-claim surfaces (release-cut PR only)

| # | Route / file | What changes | Theme | Kind | Copy source | Track E branch |
|---|---|---|---|---|---|---|
| 7 | Header chip (`Header.astro` `CURRENT_RELEASE`, `_HREF`) + `tests/site-release-chip.test.js` re-pin | `v2.0` → `v2.1`, `/changelog#v2-1` | both | Live-claim L1 | `skills/CHANGELOG.md` heading | reuse (§B.2) |
| 8 | Homepage shipped bar (`index.astro` `rb-tag`, href, `rb-text`) | `v2.1 · shipped`; one-line summary naming both themes | both | Live-claim L2 | changelog entry | rework (Track E summary was one theme) |
| 9 | Homepage stat chip (`stat-num`) | `v2.0` → `v2.1` | both | Live-claim L3 | — | reuse |
| 10 | `/changelog` open hero + aging pass (L4) | New open hero `#v2-1`, rewritten against the merged diff: an ow- block, an enforcement block, and a separate **Experimental** block for the router. `#v2-0` collapses; `#v1-6` demotes to a `rel-card`. Tags name the ow- family, not "36 skills" alone | both | Live-claim L4 | merged `skills/CHANGELOG.md` 2.1.0 entry, E1/E2 records | rework (§B.4 is one theme with the router as a headline tile) |
| 11 | Just Released count (L5) | Recount rendered cards after the aging pass | both | Live-claim L5 | rendered census | reuse (procedure) |
| 12 | Skill Library callout (`skills/index.astro`) + chip test re-pin | `v2.1 · SHIPPED`, enforcement items; one pointer "client-work planning: opchain.work →" linking `/work`. No ow- cards in `/skills` | both | Live-claim L6 | changelog entry | rework (Track E: "no new skills") |
| 13 | Styleguide badge (`styleguide.astro`) | `v2.0.4` → `v2.1.0` | both | Live-claim L7 | catalog version | reuse |
| 14 | Architecture eyebrow, footer, mobile eyebrow (L8–L10) | `v2.0` → `v2.1` | Track E | Live-claim L8–L10 | — | reuse |
| 15 | Skill-page loop tag (`skills/[id].astro` `inloop-tag`) | May trail; move only if the loop copy changes | Track E | Live-claim (probed, may trail) | — | reuse |
| 16 | Count prose (`architecture.astro` meta "33", subtitle, `:1399`, `:1422`; `MobileArchitecture`, `PipelineDiagram` "at 2.0.x"; `install.astro` "36 skills") | §3d sweep. The oc- count stays 36; ow- counts appear only under `/work`, never summed into oc- strings | both | Live-claim (unprobed) | `ls skills/`, `ls skills-work/` | reuse + rework |
| 17 | Homepage "what 2.0 unlocks" block + its `/changelog#v2-0` CTA | Replace per decision D3 | both | Live-claim (unprobed) | changelog entry | new (Track E only flagged the CTA) |
| 18 | `/install` upgrade box ("Using Opchain 1.9 or earlier?", "Upgrade to 2.0", `site/src/data/upgrade-prompt.ts`) | 2.1 compat: re-run `/oc-enroll` for post-commit and pre-push; the deploy template now needs `--prod` (BREAKING); the router is off without a key | Track E | Live-claim (unprobed) | product `[Unreleased]` | new |
| 19 | READMEs line 3 (`README.md`, `mirror/README.md`, `plugins/opchain/README.md`) | Not site files; the release PR flips them (P-side). Listed for the seam only | both | Live-claim (probed, full semver) | catalog version | out of Track S |

### 1c. Pages that describe 2.1 behaviour (held branch, merge at the cut)

| # | Route / file | What changes | Theme | Kind | Copy source | Track E branch |
|---|---|---|---|---|---|---|
| 20 | `/install` plugin block + `#enroll` | `/oc-enroll` third line; "Installing the plugin installs no gate"; `--doctor`, `--ci`, `--claude-md`, hooks, receipts, bypass trailer | Track E | Live-claim | E0 product (`oc-enroll.md`, `install-git-drivers.mjs`) | reuse |
| 21 | `/install` `#router` | Add the "experimental preview" label. Replace `export OPCHAIN_ROUTE_MODE=live # inject…` with "live mode: unsupported until the go/no-go records a GO". Add the opt-in steps (term 5): get a TypeSafe key, set it, read the shadow log; calls bill the user's own account; up to two requests per prompt; 24-hour cache. Replace precision 0.81 / recall 0.95 / 98% with the offline eval the terms allow (574 labelled past prompts, precision 0.92 oc-git-ops / 0.88 oc-deploy-ops), named as offline | Track E | Live-claim | router release terms 1–5; `docs/runbooks/skill-router-eval.md`; JEV copy | rework |
| 22 | `/install` "What you get" | Repository must be enrolled | Track E | Live-claim | E0 | reuse |
| 23 | `/install` client-work card | One card: "Planning client work? The ow- skills install separately → /work/install" | ow- | Live-claim | Sprint 5 install path | new |
| 24 | `/architecture` Enforcement map + copy fixes (desktop and mobile) | `EnforcementMap.astro`; "handing platform decisions to oc-stack-forge"; gate legends; plus the E3 corrections (PreToolUse "enforcement", orchestrator "enforces audit gates", 33 checkpoints) | Track E | Live-claim | `skills/orchestrator.md` §3 (E0) | reuse + rework (E3 corrections) |
| 25 | `/architecture` Jev rail | "experimental preview" label on the rail; the `LIVE · OPCHAIN_ROUTE_MODE=live` lane and the `shadow by default · …=live injects` line marked "unsupported until GO" | Track E | Live-claim | router terms 1, 4 | rework |
| 26 | `/architecture` pointer | One line under the diagram: client work runs on a separate family at `/work`. The pipeline diagram does not change | ow- | Live-claim | O1 | new |
| 27 | `/security` posture row + `#plugin` | Experimental label; the data-flow line matches term 3 word for word (key → redacted prompt + repo summary to `api.typesafe.ai`; previous prompt and assistant tail only with `OPCHAIN_ROUTE_CONTEXT=1`; nothing sent without a key, for slash commands, outside opchain projects, or for a typed `/oc-*`); "New in 2.1" stays | Track E | Live-claim | router term 3 | rework |
| 28 | `/security` ow-tools section | Runs code on the user's machine and says so; its own marketplace (`opchain-work-tools`), never the dev one; `SECURITY-MANIFEST.md`; no network at run time (Hugging Face only in the user-run setup fetch); redacted secrets scan. Pinning (SA-001) is claimed only if Sprint 5 lands it | ow- | Live-claim | ow-tools design §7–§8, §12; Sprint 5 result | new |
| 29 | `/privacy` "Plugins on your machine": router | The term 3 disclosure, word for word, with the label | Track E | Live-claim | router term 3 | new (Track E left `/privacy` unchanged) |
| 30 | `/privacy` "Plugins on your machine": ow- | The ow- skills are text only and send nothing; ow-tools keeps audio and transcripts local, has no telemetry and no update check | ow- | Live-claim | ow-start design §8; ow-tools design §8 | new |
| 31 | `/glossary` Track E terms | Enrollment, receipt, INCONCLUSIVE, bypass record, skill router, shadow mode; amended Skillchain, Orchestrator, Audit gate. Router and shadow-mode entries get the label; "Set OPCHAIN_ROUTE_MODE=live…" says unsupported until GO | Track E | Live-claim | E0; router terms | rework |
| 32 | `/glossary` "opchain.work" entry | One entry pointing to `/work`; ow- terms live on `/work`, not here | ow- | Live-claim | O1 | new |
| 33 | `/for-agencies` gate claim | "`/oc-audit` + `/oc-security` are hard gates — oc-deploy-ops won't ship…" says where each gate is held, as `/architecture` now does | Track E | Live-claim | Enforcement map | new (Track E fixed this claim on `/architecture` only) |
| 34 | `/for-agencies` cross-link | A short section: the dev pipeline builds the work; the ow- family plans, quotes, tests and hands it off → `/work` | ow- | Live-claim | O1 | new |
| 35 | Blog: `2026-10-09-0-of-229-…md` | Re-date to release day; two-theme framing (enforcement is one of two themes); router section under the terms (no 0.81/0.95/98%, holdout or cost numbers without a committed source; label; live unsupported until GO); E1 and E2 results as recorded; `draft: true` until the cut | Track E | Live-claim (at publish) | audit 2026-10-08, E1/E2 records | rework |
| 36 | Blog: ow- family launch post (new) | What the family does for someone who builds software for clients, stage by stage; what runs where (text skills anywhere, ow-tools Claude Code only); what it never does (prices, legal advice, sending); one-line real-use outcomes from Sprint 6. No business named, no prices. `draft: true` until the cut | ow- | Live-claim (at publish) | the six ow- designs, Sprint 6 outcome lines | new |

### 1d. The ow- section (new, held branch, merge at the cut)

| # | Route / file | What changes | Theme | Kind | Copy source | Track E branch |
|---|---|---|---|---|---|---|
| 37 | `/work` overview (`site/src/pages/work/index.astro`) | Who it is for, the stages (fit call → Build Plan → build → UAT → handoff), what you bring and what you get, hosts (Claude Code; claude.ai upload; others untested), "words we use", a version table | ow- | Live-claim | ow- designs; `skills-work/README.md`; `work` collection | new |
| 38 | `/work/<id>` ×5 (`work/[id].astro`) | Per skill: description, verbs, what it reads and writes, what it hands off to (generated from `skill.edges.yaml`), host notes, version, install link | ow- | Live-claim | SKILL.md frontmatter + `skill.edges.yaml` + `site/src/data/work.ts` intro copy | new |
| 39 | `/work/ow-tools` | What it does, that it runs code, `doctor`, privacy rules, its own marketplace, version | ow- | Live-claim | `plugins/ow-tools/.claude-plugin/plugin.json`, ow-tools design | new |
| 40 | `/work/install` | Claude Code (link or copy a folder, or the zip), claude.ai (upload), ow-tools (marketplace add + install), the verify steps. Text matches the Sprint 5 README section | ow- | Live-claim | Sprint 5 `mirror/README.md` ow- section | new |
| 41 | `/work/changelog` | Generated per-skill version table (5 skills + ow-tools) and a link to `/changelog#v2-1`. Not a second changelog | ow- | Live-claim | `metadata.version`, `plugin.json` | new |
| 42 | Nav and metadata: `Header.astro` (Product group), `Footer.astro`, `SearchPalette.astro` page list, `Base.astro` JSON-LD for `/work` pages | Link the section; one search entry per page | ow- | Live-claim | O1 | new |
| 43 | Data source: `content.config.ts` `work` collection, `site/src/lib/work.ts`, `site/src/data/work.ts` | See §3. Also: the `skills` collection schema requires `name` to start `oc-` | ow- | Plumbing | `catalogs.json` | new |
| 44 | `catalogs.json` `outputs.site` | `"site/src/pages/skills"` for oc-, `"site/src/pages/work"` for ow-; the other ow- outputs stay as Sprint 5 sets them | ow- | Plumbing | — | new |
| 45 | Discovery outputs (`/llms.txt`, `/skills.json`, MCP catalog, `/.well-known/*`) | **No change.** ow- stays out in 2.1.0 (§3). A test guards it | ow- | Live-claim (machine) | — | — |
| 46 | Guard tests (`tests/work-surfaces.test.js` + a `site/dist` scan) | No ow- id in `/skills/*`, `/skills.json`, `/llms.txt`, `mcp-catalog.json`, `ai-catalog.json`; no `brandNames` or `privateNames` from `catalogs.json` and no currency amount in `dist/work/**`; every built ow- skill has a page and every page a built skill | ow- | Plumbing/test | `catalogs.json` | new |
| 47 | `check-release-surfaces.mjs` probe | When `/work` exists, Header must be ≥ `v2.1` and `catalogs.json` `ow.planned` must be empty (no page for an unbuilt skill ships) | ow- | Plumbing/test | — | new |
| 48 | `routes.spec.ts` + `lighthouserc.cjs` | Axe on `/work`, `/work/ow-start`, `/work/install`; Lighthouse `/work` and `/work/ow-start` at `error` | ow- | Plumbing/test | — | new |
| 49 | Experimental-label e2e (E3) | `/install`, `/privacy`, `/security`, `/architecture` show "experimental preview" beside router copy; `/privacy` names `api.typesafe.ai`; no page says `OPCHAIN_ROUTE_MODE=live` without "unsupported" until a GO is recorded | Track E | Plumbing/test | router terms | new (specified in E3, not built) |

**Row count: 49.** By theme: ow- 19, Track E 14, both 16. By kind: forward 5 (all "both"), live-claim 37 (ow- 14, Track E 13, both 10), plumbing/test 7 (ow- 5, Track E 1, both 1).

---

## 2. Conflicts: Track E's 2026-10-09 site plan vs the two-theme release

Track E's plan was written when 2.1 was enforcement only and the ow- pack had moved to 2.2. The router release terms (2026-10-16) came later too.

| # | Track E plan says | Conflict | Fix |
|---|---|---|---|
| C1 | 2.1 = "Enforcement at chokepoints + skill router" (Coming Next title, open hero) | 2.1 has two themes | Title and hero name both; router gets its own Experimental block |
| C2 | Planned `#v2-2` = "ow-skills: the opchain.work skill pack" | ow- ships in 2.1 | `#v2-2` = Installs anywhere + OSS split |
| C3 | `#installs-anywhere`: "unscheduled, no version yet" | The approved ow-family plan (2026-10-14) puts that scope and the OSS split in v2.2 | Make it the v2.2 card; keep `#installs-anywhere` as a hash alias |
| C4 | Coming Next planned-box: "The opchain.work skill pack moved to 2.2" | False under the decision | Remove |
| C5 | Homepage next-bar: "enforcement at chokepoints" | One theme | "client-work planning + enforcement" |
| C6 | At the cut, next-bar → `v2.2 · next` / "the opchain.work skill pack"; Coming Next → `#v2-2` ow-skills | Wrong v2.2 | `v2.2` = open-source repo, install anywhere |
| C7 | "2.1 adds no skills, so 36 stays"; open-hero tag `36 skills` | 2.1 adds five ow- skills and ow-tools in a second catalog | oc- count stays 36; the hero names the ow- family; counts are never summed (row 16) |
| C8 | L6 Skill Library callout: "no new skills" | Same | Enforcement items plus one pointer to `/work` (row 12) |
| C9 | Open hero §B.4: router is a "What's new" tile | Router term 1: own Experimental heading, not a headline item | Separate Experimental block |
| C10 | `/privacy`: "Not changed" | Router term 3 requires the disclosure on `/privacy` | New section (rows 29–30), ow-tools included |
| C11 | `/install`: `export OPCHAIN_ROUTE_MODE=live # inject…`; changelog item "only logs until you set live" | Router term 4: live unsupported until a GO | Mark live unsupported everywhere until E2 records a GO (`install`, changelog, glossary, architecture rail, blog) |
| C12 | Router numbers 0.81 / 0.95 / 98%, holdout and cost (`/install` footnote, blog); its own §D says no file holds them | Router term 2 allows only the offline eval (precision 0.92 / 0.88 on 574 prompts) named as offline, plus the E2 verdict | Swap the numbers; cite the runbook |
| C13 | No "experimental preview" label on any page | Router term 1 | Label on `/install`, `/privacy`, `/security`, `/architecture`, `/glossary`, `/changelog`, blog; e2e row 49 |
| C14 | `/install#router` has no opt-in steps beyond the env var | Router term 5 | Add key, shadow log, own-account billing, two requests, 24 h cache |
| C15 | Branch `claude/release-2.1-site`; E0 opens a separate draft site PR | O2: one site branch owned by this orchestration | Track S branch replaces both; JEV opens no site PR |
| C16 | Blog draft frames 2.1 as the enforcement release | Two themes; O4 adds a second post | Revise; add the ow- post (rows 35–36) |
| C17 | e2e pins `#v2-2` ow-skills, `#installs-anywhere` with no version | Follows C2–C3 | Re-pin (row 4) |
| C18 | "Nothing on GitHub was changed"; milestone 4 ("v2.1") still holds the old scope | That scope is now v2.2, and the "v2.2" milestone feeds the agency vote group | Decision D2 |
| C19 | §B.1 bump: "all 36 skills" lockstep | Right for `skills/`, but the cut must not bump `skills-work/` (per-skill versions) and must list each ow- version in the changelog | Add to the cut checklist (S5) |

Gap, not a conflict: Track E fixed the "won't ship until all gates pass" claim on `/architecture` but not the same claim on `/for-agencies` (row 33).

---

## 3. The ow- section (decided: O3)

The record of the three options, for completeness: (A) own section, chosen; (B) mixed into `/skills`, `/architecture`, `/llms.txt`, `/skills.json`, rejected because the ow- frontmatter does not fit the oc- schema, `/skills.json` `catalogVersion` comes from `skills[0].version` (lockstep, read by the install update-check hook), and the audience differs; (C) changelog and install mention only, rejected by the owner.

### 3.1 Data source

The site reads `skills/` directly today (`content.config.ts`, glob loader, `OPCHAIN_SKILLS_DIR`). `/work` does the same with `skills-work/`. That is not one of the outputs `catalogs.json` holds at `null` (plugin, zip, docs, flag registry, MCP catalog, mirror), so it does not touch `outputs: null`, and nothing in Sprint 5 changes.

| Piece | Source | How |
|---|---|---|
| Skill list and facts | `skills-work/<id>/SKILL.md` frontmatter | New `work` collection: glob `*/SKILL.md`, base `process.env.OPCHAIN_WORK_SKILLS_DIR ?? "../skills-work"` (the `dirEnv` in `catalogs.json`). Schema = the Agent Skills keys the catalog check allows: `name` (`^ow-`), `description`, `license`, `compatibility`, `metadata` (`version`, `catalog`, `protocol`, `bundle`, `network`, `commands`, all strings) |
| Reads, writes, hands off to | `skills-work/<id>/skill.edges.yaml` | Read at build in `site/src/lib/work.ts` and rendered as tables, so the page cannot drift from the contract the catalog check enforces |
| Intro copy per skill (plain words, the stage it serves) | `site/src/data/work.ts` | Hand-written. A test fails if a key has no built skill or a built skill has no key |
| ow-tools facts | `plugins/ow-tools/.claude-plugin/plugin.json` | Version and description at build; the rest is hand copy from the design |
| Raw SKILL.md and downloads | Sprint 5 | Link the public mirror path for `skills-work/<id>/` and Sprint 5's zips. Track S does not add a `public/docs` tree for ow- |
| Install steps | Sprint 5's `mirror/README.md` ow- section | `/work/install` says the same thing; S3 diffs the two by hand at the cut |

Guards: the `skills` collection schema gains `name: z.string().regex(/^oc-/)`, so pointing `OPCHAIN_SKILLS_DIR` at `skills-work/` fails the site build. The `work` collection requires `^ow-`. `catalogs.json` gains `outputs.site` for both catalogs so the record matches what the site does.

### 3.2 Discovery stays out in 2.1.0 (decided: O8)

`/llms.txt`, `/skills.json`, the MCP catalog and the `.well-known` files stay oc- only. Reasons: `catalogVersion` assumes one lockstep version; the MCP `route` and `list_skills` tools serve the dev pipeline; `llms.txt` links raw SKILL.md under `/docs`, which ow- does not have; and `gen-mcp-catalog` refuses non-oc- trees by design. The sitemap lists `/work` pages anyway (`@astrojs/sitemap`), which is enough for 2.1.0. A separate `/work/skills.json` is a v2.2 candidate. Row 46 makes leakage a test failure.

### 3.3 Risks and how the plan holds them

| Risk | Hold |
|---|---|
| A business name or its marketing copy leaks. Every ow- design opens with "What the site promises (staging.deftwright.com)" | Copy written from the designs' behaviour, never their quotes; dist scan for `brandNames` and `privateNames` (row 46); owner review of all `/work` copy |
| A price appears | Pages render frontmatter, edges and hand copy only, never `examples/` (the invented `price-book.yaml`); dist scan for currency amounts |
| Non-coder readers meet dev jargon | `/work` uses its own words list; no checkpoints, hooks or `/oc-` verbs; hosts stated plainly with "untested" where true |
| A page for a skill that is not built ships | `ow.planned` must be empty at the cut (row 47); pages come from the collection, so an unbuilt skill has no page |
| The OSS split (v2.2) moves `skills-work/` | The `work` collection reads `OPCHAIN_WORK_SKILLS_DIR`, the same seam the split uses for `skills/` |
| The "opchain.work" name points at a domain nobody owns | O3 / D1: the name is used only as forward copy until the owner registers the domain; the area lives at `opchain.dev/work` either way |
| ow-tools pinning (SA-001) is not done | `/security` claims pinning only if Sprint 5 lands it (row 28) |

---

## 4. Ownership and merge plan

| Who | Owns |
|---|---|
| This orchestration (Track S) | Every file under `site/`; the `/work` plumbing (`catalogs.json` `outputs.site`, the guard tests, the release-surface probe); both blog posts; the release-cut PR's site half; assembling the release-cut PR |
| JEV session (Track E) | E0–E2 product work; router copy delivered as text in a review comment or a file under `docs/`, and review of every router mention before the cut. Opens no PR that touches `site/` |
| ow- sprints 2–5 | `skills-work/`, `plugins/ow-tools/`, the Sprint 5 mirror, zips and README install text. Touch no `site/` file |

**Branches.** Two branches, one owner:

1. `claude/track-s-s0-forward` → S0, a normal PR to `main`, now.
2. `claude/track-s-site` → the held branch, created from `main` after S0 merges. It starts with Track E's site diff (`b562955c..ef2591cc -- site/`) applied **minus** `changelog.astro` and the changelog e2e spec, which S0 already reworked. Draft PR, labelled for the cut. Rebased on `main` after each product merge (E0, each ow- sprint, Sprint 5).

**No double edits.** `/changelog`, `/install` and the homepage are edited only on Track S branches. E0's draft site PR (E0 deliverable 2) is not opened; this branch replaces it. `skills/CHANGELOG.md` stays product-owned: E0 and the ow- sprints write `[Unreleased]`, and the cut turns it into `## [2.1.0]`.

**The cut.** One release PR, assembled from `claude/track-s-site` after every product PR has merged: rebase on `main`, add the bump commit (P1–P6, `## [2.1.0]`, READMEs, `.bugcheck.json` digests; `skills-work/` versions untouched), then the live-claim flips and the aging pass. The §6 audit prompt runs on it. It merges only when the tag and both deploys follow in the same sitting. Tell the JEV session and every ow- session before the tag: the release freeze runs from the tag to a passing `smoke:prod`.

---

## 5. Sprints

Effort is CLAUDE h | USER h, rough ranges.

### WEB-00 (S0): Forward surfaces (now)

**Status (2026-10-16):** built on `claude/track-s-s0-forward` (not pushed). See "S0 as built" below.

**Deliverables**
- `/changelog` Coming Next (row 1), Planned (row 2), e2e pins (row 4), homepage next-bar (row 3). Reuses Track E's Planned template code and hash aliases; replaces its content.
- The `/install` correction "Installing the plugin installs no gate", true since 1.9.2 (O6).
- No live-claim surface moves. No `/work` link anywhere.

**Tests:** `npm test` (`release-surfaces` and `site-release-chip` unchanged and green); `node scripts/check-release-surfaces.mjs` still reports `v2.0`; `astro check`; `npm run site:build`; Playwright `changelog-and-scenarios` and `routes`; Lighthouse `/` and `/changelog` at `error` (CI); at least 3 `data-vote-target` options rendered; `npm run evidence:pr`.

**Done when** merged to `main`; the live site, once next deployed, says what 2.1 will be and claims nothing shipped.

**Depends on** nothing. Can merge before or after E0. **Effort:** 2–3 | 0.5.

**S0 as built**

| Surface | File | Change |
|---|---|---|
| Coming Next `#v2-1` (F2) | `site/src/pages/changelog.astro` | Title "The ow- planning family + enforcement at chokepoints", direction set. Three groups: the ow- family (five skills and ow-tools, one line each), enforcement at chokepoints (six items), and "Experimental preview" (the skill router, labelled, with the term 3 data flow, live mode unsupported until a recorded go/no-go, no effectiveness number). The planned-box says the card is the plan, not the release notes, and that Installs anywhere + the OSS split moved to 2.2. No `/work` link; "opchain.work" is not used |
| Planned (F3/F4) | same file, `plannedReleaseGroups` + template | `#v2-2` = "Installs anywhere + the open-source split", v2.2, direction set, not votable, six hand-written items (the old 2.1 scope plus the focused-execution salvage). The vote groups render as "later" (`#agency-delivery`, `#discovery-depth`) and read GitHub milestones **5 and 6 by number** (`itemsForMilestoneNumber`), so they hold the same issues before and after the GitHub renames. Tab count `v2.2 → later`. `HASH_ALIASES`: `#v2-3` → `#discovery-depth`, `#installs-anywhere` → `#v2-2`. 4 votable issues render (≥ 3 required by F4) |
| Homepage next-bar (F1) | `site/src/pages/index.astro` | `distribution and installation` → `client-work planning + enforcement`; tag stays `v2.1 · next` |
| `/install` correction | `site/src/pages/install.astro` | The plugin block's copy command gains `/oc-enroll`; the paragraph says "Installing the plugin installs no gate" and that `/oc-enroll` installs the Git `pre-commit` gate per repository; "What you get" says the gate is enforced in an enrolled repository |
| Roadmap helper | `site/src/data/roadmap-types.ts` | `itemsForMilestoneNumber()` |
| e2e pins | `site/tests/e2e/changelog-and-scenarios.spec.ts` | New Coming Next title, router label, no "shipped" on the card; Planned `#v2-2` (Installs anywhere + OSS split, no votes), "later" pills, `#v2-3` absent; vote loop over the "later" groups with ≥ 3 votable; `#v2-2`, `#v2-3` and `#installs-anywhere` deep links |

Not changed (live-claim): Header chip, homepage shipped bar and stat, the Just Released hero and tab count, the Skill Library callout, the styleguide badge, the architecture eyebrows and footer, count strings.

GitHub (F5): no change made. The proposed `gh` commands for D2 are with the orchestrator for the owner to confirm.

### WEB-01 (S1): Take over Track E's site work and rework it

**Deliverables**
- Create `claude/track-s-site` with Track E's site diff (§4).
- Rows 20–22, 24–25, 27, 29, 31, 33, 35 per the conflicts list: label, term 3 disclosure, live unsupported, offline-eval numbers, opt-in steps, `/privacy` section, `/for-agencies` claim, E3's `/architecture` corrections, blog revision (still `draft: true`).
- The experimental-label e2e (row 49).
- A claims ledger in the PR body: every router and enforcement claim → its file on `main` (the Track E §D shape), checked by the JEV session.

**Tests:** row 49 e2e; `routes.spec` axe; Lighthouse `/architecture` (the Jev rail is new weight) and `/install` at `error`; `astro check`; `check-release-surfaces` unchanged (no flips); a grep that no page names `OPCHAIN_ROUTE_MODE=live` without "unsupported".

**Done when** the held branch builds green, the JEV session has approved the router copy, and nothing is merged.

**Depends on** E0 merged (the copy must describe `main`). **Effort:** 5–7 | 1 (JEV review is that session's time).

### WEB-02 (S2): The `/work` section

**Deliverables**
- Rows 37–44 and 46–48: the `work` collection, `lib/work.ts`, `data/work.ts`, pages for the skills built so far (ow-start, ow-build-plan) and ow-tools, `/work/install` as a stub pointing at the mirror, nav and search entries, `outputs.site`, the `^oc-` schema guard, guard tests, the release-surface probe, axe and Lighthouse entries.
- Rows 23, 26, 28, 30, 32, 34: the pointers from `/install`, `/architecture`, `/glossary`, `/for-agencies`, and the ow- halves of `/security` and `/privacy`.

**Tests:** `tests/work-surfaces.test.js`; the dist scan (no ow- id in oc- outputs; no brand, private name or currency in `dist/work`); `astro check`; site build fails on a planted `oc-` skill under `skills-work/` and a planted `ow-` skill under `skills/`; axe on the new routes; Lighthouse `/work`, `/work/ow-start` at `error` (calibrate with three runs first, as `lighthouserc.cjs` records); `npm run check-skill-contracts` (the `catalogs.json` change).

**Done when** `/work` renders every built ow- skill from source with no hand-copied facts, the guards catch each planted failure, and the owner has approved the overview copy and the area's name (D1).

**Depends on** ow- Sprint 1 (merged). Runs alongside S1 on the same branch. **Effort:** 8–12 | 1–2.

### WEB-03 (S3): Fill in as the ow- sprints land

**Deliverables**
- After ow- Sprints 2, 3, 4: the `data/work.ts` entry for ow-build, ow-uat, ow-handoff (their pages come from the collection); the overview's stage diagram gains each stage.
- After Sprint 5: `/work/install` written from the README section; download links to the Sprint 5 zips and mirror paths; the `/security` ow-tools pinning line only if SA-001 closed.

**Tests:** the S2 suites extend themselves (every built skill needs a page and a `data/work.ts` key); a by-hand diff of `/work/install` against `mirror/README.md`; follow `/work/install` once from a clean folder, the same check as Sprint 5's done-when.

**Done when** all five skills and ow-tools have pages, and `/work/install` works for a fresh user.

**Depends on** ow- Sprints 2–5. **Effort:** 4–6 | 1.

### WEB-04 (S4): Blog posts and the copy pass

**Deliverables**
- The ow- launch post (row 36), `draft: true`, using Sprint 6's one-line outcome per real run.
- Second pass on the enforcement post with E1's measurement and E2's verdict as recorded.
- A plain-language pass over `/work` against the non-coder audience.

**Tests:** `blog-layout` e2e; drafts absent from `site/dist/blog/` and RSS; the dist scan covers `dist/blog/**` too (no business name, no prices).

**Done when** the owner has read both posts and approved them for release day (D5, D6).

**Depends on** E1, E2 recorded; Sprint 6 real-use lines. **Effort:** 4–6 | 1–2.

### WEB-05 (S5): The release-cut PR (absorbs E3 and Sprint 6's site part)

**Deliverables**
- Rows 6–19: every live-claim flip, the aging pass, the L5 recount, the counts sweep, the homepage block (D3), the upgrade box, the Skill Library callout, the open hero written from the merged diff with the Experimental block.
- Router copy set to E2's verdict: GO → live is "supported, opt-in"; NO-GO or no verdict → stays "unsupported" (D7).
- Both posts: `draft: false`, re-dated.
- The bump commit from the release owner (P1–P6, READMEs, digests; no `skills-work/` version changes; every ow- version listed in the changelog).
- The §6 audit prompt and its SHIP line in the PR body.

**Tests:** the §6 gates (`npm test`, `check-release-surfaces` including the `/work` probe, `gen-catalog`, `checkpoint:validate`); all Playwright suites including row 49; Lighthouse on every `lighthouserc.cjs` route at `error`; `astro check`; `check-release-tag` (expect `missing-tag` before tagging); then staging smoke, the owner's staging eyeball of `/work`, `/changelog`, `/install#router`, `/privacy`, and production smoke.

**Done when** production `/api/health` reports the release commit, `/skills.json` `catalogVersion` is `2.1.0`, `/work` is live, and no surface claimed 2.1 before the deploy.

**Depends on** S0–S4, E0–E2, ow- Sprints 0–6. **Effort:** 4–6 | 1–2 (the deploy itself is in Sprint 6's user time).

### Totals

**Track S: CLAUDE 27–40h | USER 5.5–8.5h.** It replaces E3 (2–3 | 0–1) and the site share of Sprint 6.

```
S0 forward PR ─────► main (now)
S1 Track E rework ─┐ (after E0)
S2 /work ──────────┤ held branch claude/track-s-site
S3 fill-in ────────┤ (after ow- 2–5)
S4 posts ──────────┘ (after E1, E2, Sprint 6 real use)
                   ▼
S5 release-cut PR = held branch + bump ─► tag ─► staging ─► prod
```

---


---

## 6. Decisions

| # | Question | Status |
|---|---|---|
| D1 | What do we call the area? | **Decided 2026-10-16 (O3):** "opchain.work", at `opchain.dev/work`. Domain registration is the owner's. Until it is registered (and redirected to `opchain.dev/work` with a zone redirect rule, no Worker deploy), the name appears only as forward copy |
| D2 | How do the GitHub milestones follow the new roadmap (F5)? | **Decided 2026-10-16 (O2):** option (a). Rename milestone 5 "v2.2" → "later: agency delivery" and 6 "v2.3" → "later: discovery depth"; milestone 4's issues (#1, #4) move to v2.2. Track S makes no GitHub change: the exact `gh` commands go to the orchestrator, who confirms them with the owner. The S0 site reads milestones 5 and 6 by number, so it is right before and after |
| D3 | What replaces the homepage "what 2.0 unlocks" block at the cut? | Open. Recommendation (a): a two-theme "what 2.1 adds" block linking `/changelog#v2-1` and `/work` |
| D4 | Does the `/install` correction "Installing the plugin installs no gate" ride in S0? | **Decided 2026-10-16 (O6):** yes, as a maintainer correction |
| D5 | When do the two posts publish? | Open. Recommendation: both on release day if E1 and E2 are recorded by the cut, else the ow- post on release day and the enforcement post after E2's verdict |
| D6 | How anonymous is the enforcement post's consumer repository? | Open. Recommendation: "a consumer repository, a product build" (Track E's draft). It names no business and no client |
| D7 | If E2 has no verdict by the cut, what does router copy say? | Open. Recommendation: "experimental preview, shadow only, verdict pending". The router release terms already cover it |

## 7. Effect on the other tracks

- **Track E, E0:** the deliverable "Site PR (`site/`): open as a draft, held for E3" becomes "no site PR; Track S holds the site work".
- **Track E, E3:** replaced by Track S (S1 and S5). E3's test requirements move to S1 and S5 unchanged. E3's effort (CLAUDE 2–3h | USER 0–1h) comes off the Track E total.
- **Sprint 6:** "site surfaces" means Track S S5. Sprint 6 keeps the real-model runs, real use, the spike, the tag and the deploy.
- **Sprint 5:** gives Track S three things: the public mirror path for `skills-work/`, the zip URLs, and the README's ow- install text. It does not wire ow- into `/llms.txt`, `/skills.json` or the MCP catalog.

These changes are recorded here; `sprints/release-2.1/ow-family-sprint-plan.md` picks them up in its own PR.

## 8. Risks

| Risk | Mitigation |
|---|---|
| A held branch this long drifts from `main` | Rebase after every product merge; S0 lands the forward surfaces early so the held diff only carries live claims |
| ow- copy repeats a business's site or shows a price | Copy from the designs' behaviour, not their quotes; dist scan for `brandNames`, `privateNames` and currency; owner review |
| Router copy says more than the terms allow | JEV review; the label e2e; no live-mode wording without "unsupported" before a GO |
| The release-cut PR is very large | S0 merges early; the held PR is reviewed sprint by sprint; the cut adds only the bump and the flips |
| A `/work` page ships for an unbuilt skill | Pages come from the collection; `ow.planned` must be empty at the cut |
| The GitHub milestones are renamed out of step with the site | The "later" groups read milestones by number; the v2.2 card is hand-written |

## Approval

- [x] Owner approved Track S 2026-10-16: two themes in one 2.1.0 (router as experimental preview); v2.2 = Installs anywhere + the OSS split, with the GitHub milestones re-bucketed as proposed; one site branch owned by this orchestration; E3 folds into S1 and S5; S0 forward PR now, including the `/install` correction; the ow- section at `opchain.dev/work`, named "opchain.work", reads `skills-work/` directly and stays out of the discovery outputs in 2.1.0; two blog posts held as drafts until the cut.
