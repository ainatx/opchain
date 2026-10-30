# Track S scope-drift audit: what the 2.1 site surfaces say, what the scope now requires

**Date:** 2026-10-29 · **For:** the 2.1 release coordinator (Track S, WEB-01 – WEB-05) · **Plan audited:** `sprints/release-2.1/track-s-site-surfaces.md` §1 (approved 2026-10-16) · **Scope sources:** `sprints/release-2.1/ow-family-sprint-plan.md` (scope changes 2026-10-16, 10-19, 10-22; § Track E router release terms), `skills/CHANGELOG.md` `[Unreleased]`, `catalogs.json`, `skills-work/*/SKILL.md`, `plugins/ow-tools/.claude-plugin/plugin.json`, `docs/audits/2026-10-26-jev-day8-and-route4.md`, PR #665.

**Verified against:** `origin/main` @ `14c8b608` (#664); held branch `origin/claude/track-s-site` @ `8a8eabca` (2026-10-17, draft PR #620, `mergeable: CONFLICTING`); merge-base `fd437ac8`. Nothing was built, merged, marked ready or deployed; `claude/track-s-site` was read, not edited.

## 0. The scope the pages must track (2026-10-29)

| Fact | Value today | Where it comes from |
|---|---|---|
| ow- skills in 2.1.0 | **nine**: ow-start 1.1.1, ow-build-plan 1.2.0, ow-build 1.0.0, ow-uat 1.0.2, ow-documentation 1.0.1, ow-handoff 1.0.0, ow-research 1.0.2, ow-draft 1.0.0 (all on `main`), **ow-care 1.0.0 (not on `main`**; design approved 2026-10-16; owner decided 2026-10-29 to salvage it from Codex draft PR #652 into a fresh branch) | `skills-work/*/SKILL.md` `metadata.version`; sprint plan § Scope change 2026-10-22 |
| Not in 2.1 | ow-vendor-eval (to v2.2, 2026-10-22), ow-controls + four framework packs + `ow-packs` plugin, ow-currency (to v2.2, 2026-10-19). `catalogs.json` still lists all three **and ow-care** under `ow.planned` | sprint plan; `catalogs.json` |
| ow-tools | **1.3.0**: transcription (local), PDF / Word / **PowerPoint** export, **Excel** from CSV, **calc** (dates incl. the US federal contract calendar, hours), **digest**, **health** (read-only checks, **uses the network**), **capture** (screenshots in your own Chrome, **uses the network**), **scan-secrets** (gitleaks, redacted), session-start workstream list. Own marketplace `opchain-work-tools` | `plugins/ow-tools/.claude-plugin/plugin.json`, `plugins/ow-tools/README.md` |
| Network posture of the nine | six are `network: none`; **ow-research, ow-documentation and ow-draft are `network: declared`** (they may use the host's own web tools or a document connector, with the host's prompts on; they ship no code) | SKILL.md frontmatter; `skills-work/README.md` |
| Router verdict | Day-8 go/no-go 2026-10-26: **NO-GO** on volume (23 suggestions vs 30, 16 pipeline prompts vs 30) and unlabelled suggestions, *not* on precision; re-run due about 2026-10-30. Every mention keeps the label **"experimental preview, shadow only, verdict pending"**, makes no effectiveness claim, and names live mode unsupported | `docs/audits/2026-10-26-jev-day8-and-route4.md`; coordinator brief |
| Router release terms | Label on every mention; only the offline eval named as offline (574 prompts, 0.92 / 0.88) plus the E2 verdict as recorded; the term 3 data-flow line on `/privacy`, the security page, `/install`, `/architecture`, the plugin README; live mode unsupported until a GO; opt-in steps without a billing claim | sprint plan § Track E, terms 1–5 |
| Track E since the plan | Shared Jev client + use registry (#658; `DEFAULT_ENDPOINT` / `DEFAULT_MODEL` now live in `plugins/opchain/hooks/lib/jev-client.cjs`), spec `+route4` (#659), J2 outcome judge (#660), J8 PR-docs completeness (#662), J5 feedback triage in the Worker behind `platform.security.feedback-triage` (#663; **#665 open, auto-merge armed, state BEHIND**), per-branch handoff store (#661), tool-form handoffs in every skill (#656), `/oc-merge`, the top-navigation rule, oc-update plugin updates (#612, #615, #617), **BREAKING** deploy template `--prod` | `skills/CHANGELOG.md` `[Unreleased]` |
| REL-02 | Reduced 2026-10-29 to real-model acceptance runs plus three real jobs (ow-start, ow-build-plan, ow-draft) | coordinator brief |
| Standing rules | Nothing on the held branch merges or is marked ready before the release-cut sitting; the ow- catalog is in no build output (plugin, zip, docs, flags, MCP catalog, mirror; `skills-work/` is not in `mirror-public.yml`); `check-release-surfaces.mjs`, Playwright e2e and Lighthouse at `error` gate site changes; every choice goes through `AskUserQuestion` | CLAUDE.md; `catalogs.json`; plan §3.2 |

Absence check (done by grep on both trees): **no file under `site/` on `main` or on `claude/track-s-site` names ow-vendor-eval, ow-controls, ow-currency or ow-packs.** None names ow-care, ow-documentation, ow-research or ow-draft either, which is the drift this document is about.

---

## 1. Surface by surface

Columns: what the surface says today · what the current scope requires · the change, with the file.

### 1a. Forward surfaces on `main` (WEB-00, PR #610) — plan rows 1–6

| Row | Surface | Says today | Scope requires | Change |
|---|---|---|---|---|
| 1 | `/changelog` Coming Next `#v2-1`, ow- group — `site/src/pages/changelog.astro:1225–1234` | "**Five** text-only skills that follow a client job from the first call to the handoff, each at its own version from 1.0.0, plus one optional add-on. They never invent a price, give legal advice or **send anything for you**." Items: ow-start, ow-build-plan, ow-build, ow-uat, ow-handoff, ow-tools | Nine skills; ow-care included; three skills may use the host's web tools or a connector; ow-draft and ow-documentation can push an export through a connector *after you confirm each file* | "Five" → "Nine"; add four `horizon-item` lines (ow-documentation: the bought documentation and training line after sign-off; ow-research: research from sources it opened, through the host's own web tools; ow-draft: drafts from evidence, exported and delivered; ow-care: monthly care after handoff or a takeover). Reword "text-only" to "text only, no code; three of them use the host's own web tools or a document connector, with its prompts on". Reword "send anything for you" → "send nothing without your confirmation". Order the items by stage (fit call → Build Plan → build → UAT → documentation → handoff → care), with research and draft marked cross-stage |
| 1 | Coming Next, ow-tools line — `changelog.astro:1233` | "local transcription, PDF and Word export, a reminder of open work at session start, and a secrets scan that never prints a match" | ow-tools 1.3.0 (table in §0) | Name every part: transcription, PDF / Word / PowerPoint / Excel export, screenshots of a test environment, read-only health checks, digests, date and hours arithmetic, the redacted secrets scan, the session-start list. Say that **health and capture use the network, only for what you list**; audio never leaves the machine |
| 1 | Coming Next, enforcement group — `changelog.astro:1236–1245` | Six items: commit gate that says why, bypass records, enrollment you can check, enforcement map, deploy and release guards, top navigation only | `[Unreleased]` also has: `/oc-merge`, tool-form handoffs in every skill (72/72 vs 80/143 is an *audit* finding, allowed), the per-branch handoff store, a skill invoked with a step skips the welcome, and the deploy template change is **BREAKING** | Add two items: "`/oc-merge <pr>`: merge a reviewed pull request, pinned to its head commit" and "Pull-request evidence stored per branch, so sibling PRs stop conflicting". Append to "Deploy and release guards": "(a breaking change for existing wrapper installs: production now requires `--prod`, and no environment variable selects it)". Optional one-liner for the tool-form handoffs |
| 1 | Coming Next, Experimental item — `changelog.astro:1247` | Label tag "experimental preview"; data-flow line; "live mode stays unsupported until a recorded go/no-go says otherwise" | Terms 1, 3, 4 hold; the 2026-10-26 reading was a NO-GO with a re-run pending | **No change required.** The sentence is still true after the NO-GO. Do not add numbers. (Owner decision Q2, §4: whether the eval-only Jev uses J2 / J8 and the flag-off J5 Worker path appear here. Recommendation: no on Coming Next; yes, under the Experimental block of the open hero at the cut, labelled "eval only" / "off by default") |
| 1 | Coming Next planned-box — `changelog.astro:1250` | "Installs anywhere and the open-source split moved to 2.2 (see Planned)" | Also true now: ow-vendor-eval, ow-controls + packs, ow-currency moved to 2.2 | Owner decision Q1 (§4). Recommendation: add "and the rest of the ow- family (vendor evaluation, a standing control register with framework packs, a currency watch) follows in 2.2". Reason: a reader of the nine-skill list should not conclude the family is finished; the sprint plan's "no 2.1 text presents either skill as available" is met by naming them as 2.2 |
| 2 | `/changelog` Planned `#v2-2` — `changelog.astro:120–162` | "Installs anywhere + the open-source split", direction set, six items, none ow- | Same, plus (if Q1 = yes) one item for the deferred ow- skills | If Q1 = yes: add a seventh item "The rest of the ow- family: vendor evaluation, controls with framework packs, currency watch (designs approved 2026-10-16, moved from 2.1)". Else no change |
| 3 | Homepage next-bar — `site/src/pages/index.astro:101–102` | `v2.1 · next` / "client-work planning + enforcement" | Same | **No change** |
| 4 | Changelog e2e pins — `site/tests/e2e/changelog-and-scenarios.spec.ts:111–118, 140–154, 242–257` | Pins the title, the router label, "no shipped", `#v2-2` title/timing/no votes, aliases | Same; the pins do not read the item count | **No change** unless the title or a group heading moves. Re-run after row 1 edits |
| 5 | Roadmap data (GitHub milestones, F5 / D2) | Site reads milestones 5 and 6 by number; the `gh` rename commands were "with the orchestrator for the owner to confirm" (plan §5 S0) | Unchanged | **Not verifiable from this checkout** (anonymous `gen-roadmap` reads only). Coordinator to confirm whether D2's `gh` commands ran; nothing on the site depends on it either way |
| 6 | Cut-time flips (F1–F3 at the cut) | Unchanged | Unchanged | No change before WEB-05 |

Other `main` pages with a 2.1 bearing (not in §1a of the plan but read for this audit):

| Surface | Says today | Change |
|---|---|---|
| `/install` plugin block — `site/src/pages/install.astro:133–145` | "36 skills, sixteen registered slash commands"; "/oc-enroll installs a Git pre-commit hook"; "Installing the plugin installs no gate" (the WEB-00 correction) | Still true on 2.0.4. `/oc-merge` is a verb of oc-git-ops, not a 17th plugin command file (`plugins/opchain/commands/` has 16), so "sixteen" holds. The 2.1 wording is on the held branch (row 20) |
| `/install` upgrade box — `install.astro:283–296`, `site/src/data/upgrade-prompt.ts` | "Already on 1.x? Upgrade to 2.0" | Row 18 at the cut: a 2.1 compatibility block (see §1e) |
| `/privacy` — `site/src/pages/privacy.astro:81–84` | "Feedback submissions go to Linear for triage" | **PR #665 adds** a "Roadmap requests" bullet at line 85: title and description of a roadmap request go to TypeSafe (`api.typesafe.ai`) "when security triage is switched on", redacted, never the email. That is the J5 `/privacy` line the coordinator asked about; it merges with #665, independent of the 2.1 cut and correct with the flag on or off. **Side effect on the held branch:** see §2 (router-label e2e false positive) |
| `/for-agencies` — `site/src/pages/for-agencies.astro:130–134` | "`/oc-audit` + `/oc-security` are hard gates — oc-deploy-ops won't ship … until both pass" | Fixed on the held branch (row 33); no ow- cross-link anywhere (row 34, WEB-02) |
| `/architecture` meta — `site/src/pages/architecture.astro:32` | `description="Checkpoint-driven pipeline of 33 opchain skills…"` | Pre-existing drift (36 since 2.0.0). Fold into the WEB-05 counts sweep (row 16) |
| Navigation — `site/src/components/Header.astro:35–70`, `Footer.astro`, `SearchPalette.astro:37–55` | Top bar with three dropdown groups (Product, Pipeline, Resources) + mobile drawer; no sidebar anywhere on the site | **Complies with the top-navigation rule.** `/work` joins the Product group, the footer's first column and the palette's page list (row 42); it must not get a sidebar of its own (an in-page table of contents is fine) |

### 1b. Held live-claim pages on `claude/track-s-site` (WEB-01, draft PR #620) — plan rows 20–22, 24–25, 27, 29, 31, 33, 35, 49

The branch is Track E's site half reworked for two themes, reviewed by the JEV session on 2026-10-17 (claims ledger `sprints/release-2.1/web-01-claims-ledger.md`, §5 closed). The router copy meets terms 1–5 as written: `ROUTER_LABEL = "experimental preview, shadow only, verdict pending"` and `ROUTER_LIVE_MODE = "unsupported until the go/no-go records a GO"` in `site/src/data/router-status.ts`, rendered by `RouterLabel.astro` beside every `[data-router-copy]` block; `/privacy#router` carries the term 3 disclosure word for word with `api.typesafe.ai`; no page offers `OPCHAIN_ROUTE_MODE=live` without "unsupported"; the numbers are the offline 0.92 / 0.88 on 574, named offline (still the figures in `scripts/route-spec.overrides.json:262`). What has drifted since 2026-10-17:

| Row | Surface (branch) | Says today | Scope requires | Change |
|---|---|---|---|---|
| 20 | `/install#enroll` — `install.astro` (enrollCmd comment, the `--claude-md` bullet, the "On 2.0.4" callout) | `--claude-md` names "/oc-commit, /oc-pr, /oc-deploy, /oc-bugcheck"; `--ci` "copies the verifier into .opchain/runtime/"; "On 2.0.4, /oc-enroll installs the pre-commit hook. Items marked New in 2.1 arrive with the 2.1 release" | The CLAUDE.md template now lists `/oc-merge`; enrolled repos pick up the per-branch handoff store on their next `.opchain/runtime/` update (`/oc-enroll --ci --force`, `[Unreleased]` § Compatibility) | Add `/oc-merge` to the verb list; add one sentence to the `--ci` bullet: "Already enrolled? `--ci --force` refreshes the runtime; 2.1's per-branch evidence store arrives that way." The "On 2.0.4 … arrive with" framing is correct while held and is removed at the cut (WEB-05) |
| 21 | `/install#router` — `install.astro` | Label, opt-in steps, data flow, redaction, offline 0.92 / 0.88 on 574, "its only evaluation so far is offline", live unsupported | Terms unchanged. Since the review: p floor 0.6 and "never suggests a verb that only prints a skill's menu" (#654, #655); spec `+route4` (#659); the client moved to `jev-client.cjs` (#658); a day-8 reading exists (NO-GO, not on precision) | Copy stays within the terms; **no number is added** (the `+route4` 574-set result, P 1.000 / R 0.805, is also offline and allowed by term 2, but adding it is a JEV review item, not a Track S call). Re-point the claims ledger (R2, R10, R11, R16, R18: `RD:69`, `RD:151–160`, `RD:61–62`, `RD:70` → `jev-client.cjs:33–34, 123–126`; `RD:83` → `route-dispatch.cjs:96`; TERMS lines moved by #633 / #646) |
| 24 | `/architecture` Enforcement map — `site/src/components/EnforcementMap.astro` row "Every PR carries docs and readiness evidence" | "the `pr-docs-v1` and `pr-readiness-v1` handoffs must be bound to the head's tree. The verifier and policy come from the base branch" | #661: the binder writes each verdict to `.checkpoints/handoffs/<policy>/<branch>.json`; `release-evidence --stage pr` reads the store first, then the checkpoints | Append to the mechanism: "Since 2.1 each branch's verdicts live in their own file under `.checkpoints/handoffs/`, so sibling pull requests no longer conflict on shared checkpoints." Status column unchanged. `orchestrator.md` §3 rows (`skills/orchestrator.md:198–205`) otherwise still match the component's seven rows |
| 25 | `/architecture` Jev rail (desktop + `MobileArchitecture.astro`) | Label; "core 7 at fits ≥ 0.6 · 5 more at ≥ 0.9"; "two requests · pinned model · 24 h decision cache"; `jev-1.13.0`; "offline eval: 574 labelled past prompts" | Allowlist still 7 + 5 (`route-spec.overrides.json:262`); `DEFAULT_MODEL` still `jev-1.13.0` (`jev-client.cjs:34`); new: p = min(top, fits, gate) **floored at 0.6** and the menu-verb rule | Add "p ≥ 0.6 floor" to the decision anchor (`ia-do` line) and the mobile caption; nothing else |
| 27 | `/security#plugin` — `security.astro` | Router row with label and term 3; bypass accountability; "Stays local"; "Leaves the machine" (3 `gh pr view` calls) | Same. **J5** (#665) is a Worker-side TypeSafe call, not a plugin hook; term 3 is about the router | No required change. Optional (Q2): one line under "Posture & hardening" that the feedback API can send a roadmap request's text to TypeSafe when the flag is on, cross-linking `/privacy` |
| 29 | `/privacy#plugins` — `privacy.astro` | New section "Plugins on your machine" with the router disclosure; a release-cut comment says to move the effective date to release day | Same; **#665 adds a second `api.typesafe.ai` mention** (feedback triage) at line 85, in "What we collect" | Add one cross-reference sentence so the two TypeSafe disclosures point at each other. The effective-date comment should also say that #665's deploy changes the policy on its own day. **And fix the e2e, §2 item 2** |
| 31 | `/glossary` — `glossary.astro` entries Enrollment, Receipt, INCONCLUSIVE, Bypass record, Skill router, Shadow mode; amended Skillchain, Orchestrator, Audit gate | Label on the two router entries; "2.0.4 installs the pre-commit hook only" | Same | No change while held; the 2.0.4 sentence goes at the cut. Row 32 (an "opchain.work" entry) is WEB-02 |
| 33 | `/for-agencies` gate claim — `for-agencies.astro` | Says where each gate is held, links the enforcement map | Same | No change |
| 35 | Blog `site/src/blog/2026-10-09-0-of-229-what-our-skills-did-when-nobody-checked.md` | `draft: true`, dated 2026-10-09; two-theme framing; router section labelled, 0.92 / 0.88 offline, live unsupported; HTML comment: "add E1's measurement week and E2's go/no-go verdict as recorded in docs/audits/ (none recorded as of 2026-10-17)" | E2's first reading **is** recorded (2026-10-26, NO-GO on volume and unlabelled rows, not precision; re-run ~10-30). No E1 record exists in `docs/audits/` yet | WEB-04: write the E2 paragraph from the audit as recorded (verdict and its reasons; no precision figure, term 2), then update it after the re-run; E1 as recorded when it exists. Re-date at the cut. The comment block should name the 2026-10-26 audit now (WEB-01 rebase, 15 min) |
| 49 | Experimental-label e2e — `site/tests/e2e/router-label.spec.ts` | Labels on 5 pages; `/privacy` names `api.typesafe.ai`; no "live" without "unsupported" on 8 pages; **any text matching `/TYPESAFE_API_KEY\|api\.typesafe\.ai\|skill router\|Jev rail/` outside a `[data-router-copy]` block fails** | The J5 bullet #665 adds to `/privacy` contains `api.typesafe.ai`, is not router copy and must not carry the router label | **Will fail on `/privacy` once the branch takes `main` with #665.** Fix: narrow the unlabelled-copy scan to router phrases (`TYPESAFE_API_KEY`, `skill router`, `Jev rail`, `OPCHAIN_ROUTE`) and keep `api.typesafe.ai` only for the `#router` presence test; or let the J5 bullet opt out with a `data-typesafe-copy="feedback-triage"` attribute the scan skips |

Also on the branch and unchanged by scope: `routes.spec.ts` axe entries for `/glossary` and `/for-agencies`, `lighthouserc.cjs` `/install` at `error`, `MobileArchitecture.astro` subtitle still says "v2.1 Jev rail (draft)" on mobile while desktop says "(experimental preview)" — align the mobile subtitle to the label wording (5 min, WEB-01 rebase).

### 1c. The `/work` section (WEB-02, WEB-03) — plan rows 23, 26, 28, 30, 32, 34, 37–48 — **not started**

Nothing under `site/src/pages/work/` exists on `main` or the branch; there is no `work` collection, no `site/src/lib/work.ts`, no `site/src/data/work.ts`, no `outputs.site` in `catalogs.json`, no `/work` link. The plan's rows were written for five skills ("×5", "5 skills + ow-tools", O3 "five skills and ow-tools"); the plan header already says nine. Requirements as of today:

| Row | Surface | Plan said | Scope requires now |
|---|---|---|---|
| 37 | `/work` overview | Stages fit call → Build Plan → build → UAT → handoff; "five skills" | Nine skills. Stages: fit call (ow-start) → Build Plan (ow-build-plan) → build (ow-build) → acceptance test (ow-uat) → documentation and training, when bought (ow-documentation) → handoff (ow-handoff) → care (ow-care; two ways in: after a handoff, or a takeover via ow-start + ow-build-plan). Cross-stage: ow-research (research from sources it opened, through the host's web tools) and ow-draft (drafts from evidence, delivered). Hosts: Claude Code; claude.ai upload; others untested. "Words we use" list. Version table from frontmatter |
| 38 | `/work/<id>` | ×5 | ×8 from the collection today, ×9 once ow-care merges (pages come from `skills-work/`, so ow-care's page appears when its folder lands; `data/work.ts` needs its key then, WEB-03). Each page must show the `network` and `bundle` facts (`core` / `connected`; `none` / `declared`) so the three connected skills are not sold as "no network" |
| 39 | `/work/ow-tools` | "What it does, that it runs code, `doctor`, privacy rules, its own marketplace, version" | Version **1.3.0** read from `plugin.json`; all nine parts; which two use the network and for what; audio local; no telemetry, no update check; the two skills it ships (`/ow-tools`, `/ow-start-transcribe`) and the SessionStart hook; macOS built, Linux generic, Windows unsupported |
| 40 | `/work/install` | From REL-01's `mirror/README.md` ow- section and zips | **REL-01 is not started**: `skills-work/` is not mirrored (`mirror-public.yml` paths: `skills/`, `mirror/`, `plugins/`, `.claude-plugin/`), there are no ow- zips, and `mirror/README.md` has an ow-tools install section only (lines 70–83). WEB-02 can ship a stub that says the ow- skills are not yet publicly distributed and links the ow-tools marketplace commands; WEB-03 writes the real page after REL-01. No "copy from the private repo" instruction on a public page |
| 41 | `/work/changelog` | "5 skills + ow-tools" | Nine rows + ow-tools 1.3.0, generated; each ow- skill has its own `CHANGELOG.md` under `skills-work/<id>/` that the page can link in the mirror once REL-01 lands |
| 42 | Nav and metadata | Header Product group, Footer, SearchPalette, JSON-LD | Same; top-nav rule (no `/work` sidebar). Suggested label "opchain.work" with blurb "Planning skills for client work" (D1: the name is forward copy until the domain is registered) |
| 43–44 | Data source and `catalogs.json` `outputs.site` | `work` collection over `skills-work/`, `^ow-` / `^oc-` schema guards | Same. Schema must accept the Agent Skills keys only (`name`, `description`, `license`, `compatibility`, `metadata.{version,catalog,protocol,bundle,network,commands}` as strings); `skill.edges.yaml` read at build for reads / writes / hands-off tables |
| 46 | Guard tests | No ow- id in oc- outputs; no `brandNames` (`Deftwright`) or `privateNames` (`llc-ops`) or currency in `dist/work/**`; every built skill has a page and every page a key | Same, nine skills. Note the ow- designs open with a business's site promises; copy from behaviour, never quotes |
| 47 | `check-release-surfaces.mjs` probe | "When `/work` exists, Header ≥ v2.1 and `catalogs.json` `ow.planned` must be empty" | **The rule must change.** `ow.planned` legitimately holds three v2.2 skills (ow-vendor-eval, ow-currency, ow-controls) whose planned verbs the contract check still resolves (`/ow-currency-watch`), so it will not be empty at the cut. Probe instead: no page under `dist/work/` for any `planned` id, and every `planned` id absent from `dist/work/**` text. ow-care leaves `planned` when it merges |
| 48 | Axe + Lighthouse | `/work`, `/work/ow-start`, `/work/install` axe; `/work`, `/work/ow-start` Lighthouse at `error` | Same; calibrate with three runs as `lighthouserc.cjs` records |
| 23, 26, 32, 34 | Pointers from `/install`, `/architecture`, `/glossary`, `/for-agencies` | One card / line / entry / section each | Same; copy says "nine planning skills" and "ow-tools runs code on your machine" |
| 28 | `/security` ow-tools section | Runs code and says so; own marketplace; `SECURITY-MANIFEST.md`; "no network at run time (Hugging Face only in the user-run setup fetch)"; redacted secrets scan; pinning only if REL-01 lands SA-001 | **"No network at run time" is no longer true**: `health` (OSV, npm registry, RDAP, TLS, HTTP GET) and `capture` (the listed origins) use the network for what `health.yaml` or the plan lists; every other verb sends nothing. Say so, with `--no-network` for health. Pinning (SA-001) still unclaimed until REL-01 |
| 30 | `/privacy` ow- paragraph | "The ow- skills are text only and send nothing" | Six send nothing; **ow-research, ow-documentation and ow-draft are `network: declared`**: they use the host's own web search / page opening or a document connector, under the host's permission prompts, and their rules files say what may leave the machine. ow-tools: audio and transcripts local; health and capture network use as above; no telemetry, no update check |

### 1d. Blog drafts (WEB-04) — plan rows 35–36

| Row | Post | State | Required now |
|---|---|---|---|
| 35 | Enforcement post (branch, `draft: true`) | Two-theme framing done; router section within the terms; E1 / E2 placeholders | E2 paragraph from `docs/audits/2026-10-26-jev-day8-and-route4.md` as recorded: NO-GO on volume (23 / 30 suggestions, 16 / 30 pipeline prompts) and unlabelled rows, precision not the blocker, re-run ~10-30; update after the re-run. E1: no record in `docs/audits/` today; write "as recorded" or omit the measurement week until it exists. Re-date at the cut. D5 (publish day) and D6 ("a consumer repository") still open |
| 36 | ow- launch post (not written) | — | Nine skills, stage by stage, for someone who builds software for clients; what runs where (text skills on any host; ow-tools Claude Code only; three skills use the host's web tools or a connector); what it never does (invent a price, give legal advice, send without confirmation); **real-use lines limited to REL-02's reduced set**: three real jobs (ow-start, ow-build-plan, ow-draft) plus real-model acceptance runs for the rest, said plainly. No business, no price. `draft: true` until the cut |

### 1e. Release-cut flips (WEB-05) — plan rows 7–19, status on `main` today

All live-claim surfaces still read v2.0, as they should before the cut: Header `CURRENT_RELEASE = "v2.0"` (`Header.astro:17–18`); homepage `v2.0 · shipped` bar and `v2.0` stat (`index.astro:94–113`); "what 2.0 unlocks" block (`index.astro:128–139`); changelog open hero `#v2-0`; Skill Library callout `v2.0 · SHIPPED` (`skills/index.astro:57–58`); styleguide `v2.0.4` (`styleguide.astro:310`); architecture eyebrow `RELEASE v2.0` (`architecture.astro:148`); skill-page loop tag `v2.0 · shipped` (`skills/[id].astro:229`). Scope-driven changes to the cut list:

| Row | Surface | Change at the cut, as the scope now stands |
|---|---|---|
| 10 | `/changelog` open hero `#v2-1` | Written from the merged `skills/CHANGELOG.md`. **The ow- block must list nine versions and ow-tools 1.3.0.** Enforcement block adds `/oc-merge`, tool-form handoffs, the per-branch handoff store and the BREAKING `--prod` note. Experimental block: the router with the label and the recorded verdict(s); the Jev uses J2 / J8 (eval only) and J5 (Worker, flag off) per Q2 |
| 12 | Skill Library callout | `v2.1 · SHIPPED`, enforcement items, one pointer "client-work planning: opchain.work →" to `/work`; no ow- cards in `/skills` |
| 16 | Counts sweep | oc- stays 36; fix `architecture.astro:32` "33"; ow- counts only under `/work`, never summed. `/install` "sixteen registered slash commands" stays (16 command files) |
| 17 | Homepage "what 2.0 unlocks" | D3 open; recommendation stands: a two-theme "what 2.1 adds" block linking `/changelog#v2-1` and `/work` |
| 18 | `/install` upgrade box | New "Already on 2.0? What 2.1 changes" block: re-run `/oc-enroll` for the post-commit and pre-push hooks; `/oc-enroll --ci --force` refreshes the runtime and brings the per-branch evidence store; **BREAKING**: the deploy wrapper needs `--prod` (point `npm run deploy` at `node scripts/deploy.mjs --prod`, `deploy:staging` at `--staging`, drop any `*_PROD_GO`, pass `--allow-unknown-live` once); the router is off without a key. `upgrade-prompt.ts` unchanged |
| — | Router copy (D7) | Re-run due ~10-30. GO → `ROUTER_LIVE_MODE` becomes "supported, opt-in" and the label drops "verdict pending"; NO-GO or no verdict → unchanged. One constant, `router-status.ts`. Also remove the "On 2.0.4 … arrive with the 2.1 release" and "2.0.4 installs the pre-commit hook only" framings on `/install`, `/security`, `/glossary` |
| — | `skills/CHANGELOG.md` `[Unreleased]` vs the site (P-side, read by the hero) | `[Unreleased]` holds **no ow- entry at all**: the cut must add the ow- family entry (nine skills with versions, ow-tools 1.3.0, the "text only / network: declared" facts), as plan C19 requires. Its Experimental entry quotes "2026-10-23: hand-labelled precision 0.71 against a 0.8 bar", which the 2026-10-26 audit says scored older builds; replace with the day-8 verdict as recorded (no precision figure). Everything the Coming Next card promises is in `[Unreleased]` except the ow- family; everything in `[Unreleased]` that the card lacks is listed in row 1 above. #665 will also edit this file |
| — | `/privacy` effective date | Moves on the 2.1 release day for the plugins section; #665's deploy is its own policy change |
| 19 | READMEs line 3 | Out of Track S (release PR) |

---

## 2. Rebasing `claude/track-s-site` onto current `origin/main`

**Distance:** 28 commits behind (`fd437ac8..14c8b608`), 13 ahead (5 content commits, 4 merges of `main`, 4 checkpoint-evidence commits). The branch has always taken `main` by **merge**, not rebase (`8422dd11`, `586b6844`, `27bf0eb1`, `e4b88d0d`); PR #620 shows `CONFLICTING`.

**What main changed since the merge-base that the branch also touches:** only `.checkpoints/oc-docs-forge.checkpoint.json` and `.checkpoints/oc-repo-ops.checkpoint.json`. No `site/` file the branch edits changed on `main` (main's only `site/` change is `site/package-lock.json` from #649).

**Dry run** (`git merge-tree --write-tree origin/claude/track-s-site origin/main`): conflicts in exactly those two files, in `project_dir`, `step`, `progress_summary`, `skill_state.*`, `handoffs`, `record_updated_at`. The opchain checkpoint merge driver leaves standard markers.

**Expected conflicts and resolution:**

1. The two checkpoint JSONs. Take `origin/main`'s copies whole (the branch's appended `handoffs` entries were the old binder's). Then re-bind the branch's evidence with the current binder, which since #661 writes `.checkpoints/handoffs/pr-docs-v1/<branch>.json` and `.checkpoints/handoffs/pr-readiness-v1/<branch>.json` and leaves the shared checkpoints alone. This also ends the pattern that produced the four "evidence after merging main" commits.
2. **After #665 merges** (auto-merge armed, currently BEHIND): `site/src/pages/privacy.astro` gets a hunk at line 85; the branch's hunks are at lines 2, 19, 102 and 175, so git should auto-merge, **but `router-label.spec.ts` will then fail on `/privacy`** (the J5 bullet's `api.typesafe.ai` is unlabelled text outside `[data-router-copy]`). Fix the spec as in §1b row 49. `skills/CHANGELOG.md` is also touched by #665 but the branch does not edit it.
3. The claims ledger's line references rot (jev-client split, TERMS lines, ORCH lines); not a git conflict, a review-accuracy one.
4. `lighthouserc.cjs`: the branch adds `/install`; `main` has not touched the file. Clean.

**Risk:** low mechanically (two JSON files, resolved by taking main's), medium procedurally (the e2e false positive after #665, and the ledger refs the JEV session relies on). Recommendation (Q3): keep merging `main` in rather than rebasing, since the JEV review signed off on these commit SHAs and the PR is squash-merged at the cut anyway.

---

## 3. Punch list, by sprint, with rough Claude hours

Hours are rough ranges collapsed to one figure; USER time is a review pass per sprint (about 20 min each) plus the decisions in §4.

### WEB-01 — rebase and drift on the held branch (≈ 6.0 h)

| # | Item | Files | h |
|---|---|---|---|
| 1 | Merge `origin/main` into `claude/track-s-site`; take main's two checkpoint JSONs; re-bind evidence through the per-branch store | `.checkpoints/oc-docs-forge.checkpoint.json`, `.checkpoints/oc-repo-ops.checkpoint.json`, `.checkpoints/handoffs/` | 1.0 |
| 2 | After #665: take it; fix the router-label scan so the J5 feedback-triage bullet is not read as router copy; add the cross-reference between the two TypeSafe disclosures | `site/tests/e2e/router-label.spec.ts`, `site/src/pages/privacy.astro` | 0.75 |
| 3 | Re-point claims-ledger sources (jev-client split, TERMS and ORCH line moves); note the 2026-10-26 audit in the blog's comment block | `sprints/release-2.1/web-01-claims-ledger.md`, the blog draft | 1.0 |
| 4 | Enforcement map PR row: per-branch handoff store | `site/src/components/EnforcementMap.astro` | 0.5 |
| 5 | `/install#enroll`: `/oc-merge` in the `--claude-md` verbs; `--ci --force` refresh sentence | `site/src/pages/install.astro` | 0.5 |
| 6 | Jev rail: p ≥ 0.6 floor on the decision anchor and mobile caption; align the mobile subtitle "(draft)" to the label wording | `site/src/pages/architecture.astro`, `site/src/components/MobileArchitecture.astro` | 0.75 |
| 7 | Regression: router-label, routes, changelog e2e; `astro check`; local Lighthouse `/install`, `/architecture`; `check-release-surfaces` still v2.0 | — | 1.0 |
| 8 | Re-bind evidence, push, keep #620 draft (nothing marked ready) | — | 0.5 |

### WEB-02 — the `/work` section for nine skills (≈ 16.5 h; the plan's 8–12 was for five)

| # | Item | Files | h |
|---|---|---|---|
| 9 | `work` collection (Agent Skills schema, `^ow-`), `^oc-` guard on `skills`, `lib/work.ts` (edges), `data/work.ts` intro copy for the eight built skills | `site/src/content.config.ts`, `site/src/lib/work.ts`, `site/src/data/work.ts`, `catalogs.json` (`outputs.site`) | 3.0 |
| 10 | `/work` overview: nine skills, seven stages + two cross-stage, hosts, words list, version table | `site/src/pages/work/index.astro` | 2.5 |
| 11 | `/work/[id]`: description, verbs, reads / writes / hands-off tables from edges, `network` / `bundle` facts, host notes, version | `site/src/pages/work/[id].astro` | 2.5 |
| 12 | `/work/ow-tools` at 1.3.0: nine parts, network parts named, own marketplace, `doctor`, hook | `site/src/pages/work/ow-tools.astro` | 1.0 |
| 13 | `/work/install` stub: ow-tools marketplace commands; the ow- skills "not yet publicly distributed" (REL-01 not started) | `site/src/pages/work/install.astro` | 0.75 |
| 14 | `/work/changelog`: generated per-skill version table + ow-tools | `site/src/pages/work/changelog.astro` | 0.75 |
| 15 | Nav: Product-group entry, footer, search palette, JSON-LD for `/work` pages; top-nav rule | `Header.astro`, `Footer.astro`, `SearchPalette.astro`, `Base.astro` | 0.75 |
| 16 | Pointers: `/install` client-work card, `/architecture` one-liner, `/glossary` "opchain.work" entry, `/for-agencies` cross-link | `install.astro`, `architecture.astro`, `glossary.astro`, `for-agencies.astro` | 1.0 |
| 17 | `/security` ow-tools section (1.3.0: scan-secrets, health and capture network use, marketplace, manifest; no pinning claim) + `/privacy` ow- paragraph (`network: declared` for three skills; ow-tools local audio, no telemetry) | `security.astro`, `privacy.astro` | 1.25 |
| 18 | Guard tests: work-surfaces + dist scan (ow- ids out of oc- outputs; no brand / private name / currency under `dist/work`); release-surface probe rewritten to "no page for a `planned` id" | `tests/work-surfaces.test.js`, `scripts/check-release-surfaces.mjs` | 2.0 |
| 19 | Axe entries and Lighthouse `/work`, `/work/ow-start` at `error` (three calibration runs) | `site/tests/e2e/routes.spec.ts`, `lighthouserc.cjs` | 1.0 |

### WEB-03 — fill in as the product lands (≈ 4.25 h)

| # | Item | Files | h |
|---|---|---|---|
| 20 | ow-care: `data/work.ts` key and the care stage on the overview once the salvage from #652 merges; `catalogs.json` drops it from `planned` (product PR) | `site/src/data/work.ts`, `work/index.astro` | 0.75 |
| 21 | `/work/install` written from REL-01's README section and zip links; by-hand diff against `mirror/README.md`; follow it once from a clean folder (blocked on REL-01) | `work/install.astro` | 1.5 |
| 22 | `/security` ow-tools pinning line only if SA-001 lands | `security.astro` | 0.25 |
| 23 | **Forward PR to `main` now** (not held): Coming Next card to nine skills (four new lines, stage order, the "text only / host web tools / no sending without confirmation" wording), ow-tools line to 1.3.0, `/oc-merge` + handoff-store items, BREAKING `--prod` note; planned-box and `#v2-2` per Q1; re-run changelog e2e | `site/src/pages/changelog.astro`, `changelog-and-scenarios.spec.ts` | 1.5 |
| 24 | Amend the plan's rows 37–41 and O3 from "five" to "nine" | `sprints/release-2.1/track-s-site-surfaces.md` | 0.25 |

### WEB-04 — blog posts and the copy pass (≈ 6.0 h)

| # | Item | Files | h |
|---|---|---|---|
| 25 | Enforcement post: E2 paragraph from the 2026-10-26 audit as recorded, updated after the ~10-30 re-run; E1 as recorded or omitted; re-date at the cut | `site/src/blog/2026-10-09-0-of-229-….md` | 1.5 |
| 26 | ow- launch post: nine skills, what runs where, what it never does, real-use lines limited to the three REL-02 jobs plus real-model runs; `draft: true` | `site/src/blog/<date>-….md` | 3.0 |
| 27 | Plain-language pass over `/work` for the non-coder reader | `site/src/pages/work/*` | 1.0 |
| 28 | Dist scan extended to `dist/blog/**` (no business, no price); drafts absent from `/blog` and RSS | `tests/work-surfaces.test.js` | 0.5 |

### WEB-05 — the release-cut PR (≈ 10.75 h)

| # | Item | Files | h |
|---|---|---|---|
| 29 | Live-claim flips rows 7–15: Header, home bar + stat, hero promotion + aging pass + L5 recount, Skill Library callout + `/work` pointer, styleguide 2.1.0, architecture eyebrows + footer, loop tag; `tests/site-release-chip.test.js` re-pin | `Header.astro`, `index.astro`, `changelog.astro`, `skills/index.astro`, `styleguide.astro`, `architecture.astro`, `MobileArchitecture.astro`, `Footer.astro`, `skills/[id].astro` | 2.0 |
| 30 | Open hero `#v2-1` from the merged CHANGELOG: ow- block with nine versions + ow-tools 1.3.0; enforcement block incl. `/oc-merge`, tool-form handoffs, handoff store, BREAKING `--prod`; Experimental block (router + recorded verdict; Jev uses per Q2) | `changelog.astro` | 2.0 |
| 31 | Counts sweep: `architecture.astro:32` "33" → 36; MobileArchitecture / PipelineDiagram "2.0.x" strings; ow- counts only under `/work` | as named | 0.75 |
| 32 | Homepage "what 2.0 unlocks" → D3 two-theme block linking `/changelog#v2-1` and `/work` | `index.astro` | 1.0 |
| 33 | `/install` upgrade box: "Already on 2.0?" block (re-enroll for post-commit / pre-push, `--ci --force` for the store, BREAKING `--prod` migration, router off without a key) | `install.astro` | 1.0 |
| 34 | Router copy per D7 from the re-run verdict: one constant change in `router-status.ts`; remove the "2.0.4 only" / "arrive with 2.1" framings on `/install`, `/security`, `/glossary` | `router-status.ts`, `install.astro`, `security.astro`, `glossary.astro` | 0.75 |
| 35 | `skills/CHANGELOG.md`: ow- family entry (nine versions, ow-tools 1.3.0); Experimental entry re-stated from the recorded verdicts (P-side, with the release owner) | `skills/CHANGELOG.md` | 1.0 |
| 36 | `/privacy` effective date; optional security-page J5 line per Q2 | `privacy.astro`, `security.astro` | 0.25 |
| 37 | Both posts `draft: false`, re-dated | blog | 0.25 |
| 38 | Gates: `npm test`, `check-release-surfaces` incl. the `/work` probe, `gen-catalog`, `checkpoint:validate`, all Playwright suites, Lighthouse on every route at `error`, `astro check`, `check-release-tag` (expect `missing-tag`); staging eyeball list adds `/work` | — | 1.75 |

### Totals

| Sprint | Items | Hours |
|---|---|---|
| WEB-01 rebase + drift | 8 | 6.0 |
| WEB-02 `/work` (nine skills) | 11 | 16.5 |
| WEB-03 fill-in + forward PR | 5 | 4.25 |
| WEB-04 posts + copy pass | 4 | 6.0 |
| WEB-05 cut | 10 | 10.75 |
| **Total** | **38** | **≈ 43.5 h** (the plan's remaining estimate after WEB-00/01 was 20–30 h for five skills) |

Three largest: the `/work` section for nine skills (16.5 h), the release-cut PR (10.75 h), the held-branch rebase with its drift fixes (6.0 h, tied with the posts).

---

## 4. Decisions for the owner (asked through `AskUserQuestion` on 2026-10-29; all answered)

| # | Question | Recommendation | Owner's answer (2026-10-29) |
|---|---|---|---|
| Q1 | Do the Coming Next planned-box and the `#v2-2` Planned card name the deferred ow- skills (vendor evaluation, controls + packs, currency watch) as 2.2? | Yes: forward copy that keeps "the family continues" honest without presenting them as available | **Yes**: name them as 2.2 (items 23 and row 2 apply) |
| Q2 | Do the eval-only Jev uses (J2, J8) and the flag-off J5 feedback-triage Worker path appear on the site? | Not on Coming Next; yes in the open hero's Experimental block at the cut, labelled "eval only" / "off by default"; `/privacy`'s J5 line comes with #665 regardless | **Hero Experimental block only** (item 30; nothing on Coming Next; the optional security-page line in item 36 is dropped) |
| Q3 | Bring `main` into `claude/track-s-site` by merge (as the branch has done four times) or by rebase? | Merge: the JEV review signed off on these SHAs and the PR squash-merges at the cut | **Merge** (item 1 as written) |
| Q4 | Commit this audit on this worktree branch and open a docs-only PR, or leave it uncommitted for the coordinator? | Commit + PR (docs only; no site file touched) | **Commit + docs PR** |

