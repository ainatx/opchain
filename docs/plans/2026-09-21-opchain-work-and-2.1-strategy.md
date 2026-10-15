# opchain 2.1 and opchain.work — strategy

**Date:** 2026-09-21 · **Status:** DRAFT. Owner decisions are marked *(owner)*; everything else is a recommendation.
**Base:** `origin/main` @ `1dc86ad` (v2.0.2 shipped; v2.0.3 in flight).
**Replaces:** `2026-09-18-opchain-work-and-2.1-strategy.v1-audited.md`, the working draft the audit cites line by line. That file is kept unchanged as the audit's target; this one is the clean statement of where things landed.
**Companions:** `docs/audits/2026-09-18-ow-pack-design-audit.md` (evidence and findings) · `docs/plans/2026-09-18-ow-w0-test-plan.md` (the test that decides go/no-go).

## 1. Summary

- **v2.1** has no plan yet — only a changelog group and three roadmap issues. Recommended shape: "installs anywhere, says so honestly": keep the Claude.ai install path, ship templates and a right-sized marketplace, defer the editor extension, and own the install debt the theme currently ignores.
- **opchain.work** is a second catalog for people who don't write code. Its value is **the pipeline around knowledge work, not the knowledge**: brief → evidence → draft → review → sign-off → follow-through. Anthropic already gives away function skills (legal, finance, HR, operations); competing on breadth is a losing race.
- The first design of the ow- pack was audited and graded **D**. The reason reorganises everything: in 87 recorded sessions, prose telling one skill to engage another produced **zero** autonomous invocations; skills fire 66% of the time when the user names them and 5% when they don't. Every link that holds in the dev catalog is held by a hook, CI or a deploy script — none of which this audience has.
- So ow- skills never "chain". A link is: a named file, a printed `NEXT` line telling the user exactly what to say, and a receiving skill that checks for the file itself.
- **Nothing is built.** Next is a week-one host spike (owner), then the W0 test with 8+ real non-coders against fixed go/stop rules.
- Nothing unmerged in any worktree proposes a new product direction.

## 2. What exists today

| Asked about | What was found |
|---|---|
| v2.1.0 | No plan doc, sprint plan or branch. Only `/changelog`'s Planned group "Distribution and installation" (`site/src/pages/changelog.astro:89-103`), issues #1 #4 #5 on `asfbay-bit/opchain-skills`, and decision D-F in the v2.0 plan (2.1 scope is a cut-time decision). |
| opchain.work for non-coders | Nothing written anywhere before this work. The only prior use of the name: a private repo `asfbay-bit/opchain-work` (2026-05-18, "the commercial home of opchain"), and decision **D4** (2026-08-24) reserving `opchain-work` for closed commercial content. |
| Roadmap votes | All seven v2.1–v2.3 items read 0 in the live store. *(owner)* Every vote ever cast was the owner's own; even those are not in the current keyspace (plausibly lost when ids moved from Linear to GitHub issue numbers on 2026-08-26 — unverified). |
| `opchain.work` domain | `whois` returns no data, no NS or A record — appears unregistered. Confirm at a registrar. |
| Stale state | `.checkpoints/oc-app-architect.checkpoint.json` still says 2.0 is blocked on the OSS split (D-H); 2.0.0 shipped without it. Roadmap issue #3 still lists `oc-qa-ops`, shipped in v1.9. `CLAUDE.md` describes `did.json` as committed and served; it is tracked on no branch and the URL returns 404. |

## 3. v2.1.0 — "Installs anywhere, says so honestly"

| Candidate | Verdict | Why |
|---|---|---|
| #4 Claude.ai web skill install | **Keep, re-scope, headline** | The only item that widens who can use opchain. "One-click" is unverified — promise nothing until a spike proves it. Deliverable: a per-host install matrix, a no-Node/no-git fallback for every skill, and a verified Cowork/Desktop plugin path. |
| #1 Marketplace + templates | **Both stay in 2.1** *(owner, 2026-09-21 — overrides my recommendation to defer the marketplace)* | My concern stands as a risk to manage, not a veto: no external issue or PR has ever been filed and governance is dormant until a second maintainer exists, so its first version is a **listing page only** *(owner)* — no submission intake until outside contributors exist. |
| #5 VS Code / Cursor extension | **Defer past 2.3 or drop** | New codebase, new publisher identity, new lockstep surface, for a sole maintainer whose recurring failure is release-surface drift. The repo's own rubric scored it 12/20, "spike, not full theme". |

**What the theme is missing:** the portability debt (14 critical / 41 high from 2026-07-04; 24 high from the 2026-08-22 OSS audit); a finish-or-cancel decision on the OSS split; the hosted checkpoint store's remaining gaps (PX-01 itself was closed in v1.9.0 — what remains is no tenancy, a token that can't be revoked, no content validation, no delete); `/privacy` accuracy (PX-02); a generator that stamps every version claim from `skills/CHANGELOG.md`; and publishing the `did:web` document with a key-custody procedure before anything is called signed.

| Sprint | Content |
|---|---|
| 0 | Land 2.0.3 (reconcile `fix/2.0.3-session-clock`, which is 5 commits ahead of release PR #552) |
| 1 | **OSS split, phases C2–C7** *(owner: finish it as 2.1's first sprint)* per `docs/runbooks/oss-split-execution-handoff.md`; C5's history rewrite still needs the owner's explicit go |
| 1b | Host matrix + runtime-free mode for the dev catalog |
| 2 | Portability criticals + hosted-store residuals + PX-02 |
| 3 | Native-host acceptance: Cowork/Desktop plugin path on a clean machine; Claude.ai import spike; `references/` readable over hosted MCP |
| 4 | 3–4 starter templates + marketplace v1 as a **listing page only** *(owner)* — no submissions yet |
| 5 | Update integrity (`/update` endpoint verified, `did.json` published, manifest signed) + release-surface generator + cut |

Sprint plan: `sprints/release-2.1/sprint-plan.md` (draft, at the approval gate). Present 2.1 as "direction set" (decision D-F's branch), not "voting open". opchain.work does **not** depend on 2.1: it has its own protocol and state files, so sprint 1 must justify itself for the dev catalog alone.

## 4. v2.2 and v2.3

- **v2.2 Agency / multi-project:** keep the engine, drop the marketing. Multi-project checkpoint scoping is a problem already observed (the v1.8.2 patch merged in three consumer repos but reached disk in one). `/for-agencies` is live; don't expand it for a customer nobody has met. The client-handoff scenario belongs in opchain.work. Wire 1.2 and the `skill_state` promotion ride with this release — one wire migration, not two.
- **v2.3 Discovery:** fix issue #3, then build `oc-discovery-ops`. It is the one planned skill that isn't about code; "deeper evaluator rubrics" is the same R&D opchain.work's prose evaluator needs.
- **Leave parked:** `pricing-forge`, `email-ops`, `billing-ops`, `support-ops`, `analytics-ops`, `a11y-ops`, `cms-ops`, `growth-ops`, `i18n-ops`. Breadth isn't the constraint; install reach is.

## 5. Other worktrees

A read-only sweep of ~55 worktrees and every unmerged branch found no new product direction; ~45 are merged or hold only stranded reports.

| Item | Recommendation |
|---|---|
| v2.0.3 | Land first; reconcile the two branches before cutting |
| `claude/demo-rebuild-2-0` (11 scenarios written to real job-requisition mandates: RevOps, AI CoE, quote-to-cash) | Read before writing opchain.work copy — the closest thing in the repo to non-developer audience research. Not read by me. |
| `claude/demo-scenario-realism-99b27d` | Salvage lazy-load only if `/demo` weight is a measured problem; else delete |
| Colour set 14 "Muted Plum & Mint" (untracked) | Not for .dev again. Possibly the second flavor's palette — owner's call |
| PRs #494, #547, #549 + Dependabot | Clear before 2.1 sprint 1 |
| Untracked v2.0 simulation audit pack and remediation plan (main checkout) | Commit as record or delete; the 36-skill simulation harness is the natural regression suite for runtime-free mode |
| Token-usage reports stranded across ~16 worktrees | One consolidation PR, then prune (owner action) |

## 6. opchain.work

### 6.1 Positioning

*.dev ships software that passes review; .work ships documents and decisions that pass review.* Users bring whatever domain skills they have; opchain.work is what makes the output survive a skeptical reader. No skill gives legal, financial, medical or compensation advice.

### 6.2 Audience and hosts *(owner)*

- Government **and** non-government, one pack. Government scope: US federal civilian, state and local, defense, and non-US. Users: government employees, contractors and vendors, regulated private organisations.
- Sensitivity ceiling: sensitive but unclassified.
- **First-class host: commercial Claude Team/Enterprise.** Claude for Government Desktop and third-party-cloud Desktop are best-effort until tested. Non-government users are on standard Claude apps. Nobody has Node, git or a repo — but hosts differ (Cowork and Claude for Government Desktop document slash commands and hooks; Cowork is outside Anthropic's BAA), so a host matrix is required rather than one assumption.
- W0 testers: private-sector non-coders.

### 6.3 Organisation

Recommended by all three judges of three competing proposals; **final shape decided after the W0 test** *(owner)*.

| Bundle | Skills | Network |
|---|---|---|
| **Core** | `ow-start` — front door, resume, status, meeting and decision logs · `ow-blueprint` — a finished process idea worked backward to everything needed to stand it up · `ow-draft` — brief → evidence → draft → deliver; deck, sheet and comms as type modules · `ow-review` — separate on purpose: a fresh-session review is the only cheap real separation available, and it is the likeliest solo install | none |
| **Assured** | `ow-controls` — the standing control register across an organisation's processes; sole owner of the compliance profile, the pack pin and all framework text. Inert without a profile | none |
| **Connected** | `ow-research` (incl. `/ow-research-framework`) · `ow-currency` — the only skills with network text; destinations are a generated manifest the administrator pastes into the *tenant's* allow-list | declared |
| **Program** | `ow-program` · `ow-vendor-eval` — first question selects commercial vs formal public procurement; formal mode scores nothing and recommends no awardee | none |
| *not skills* | `references/ow-protocol.md` (short, own version, identical in every bundle; nothing named `oc-` ships in an ow- bundle) · framework packs as sharded data folders | — |

An administrator can approve Core, Assured and Program without reviewing any network behaviour. A user with no compliance regime answers one plain question and never sees compliance vocabulary. Before team mode exists the pack is **single-user per workstream**, and says so.

### 6.4 The cross-talk contract

1. No skill invokes, chains to, or role-plays another. The words do not appear in ow- text.
2. **An edge is three things:** the producer writes a named file with a fixed header; the producer prints a `NEXT` block; the receiver's first step looks for that file, with a written absent-case and mismatch-case. Only the third is load-bearing.
3. **`NEXT` leads with the skill id** — "use **ow-draft** to deliver `<path>`" — and says what to do if that skill isn't installed. Verbs carry their owner: `/ow-draft-brief`, `/ow-start-status`, `/ow-blueprint-scan`, `/ow-controls-map`.
4. One root, `opchain-work/`: `STATUS.md`, `profile.md`, `process-spec/`, `work-packages/`, `compliance/`. Artefacts are **single-writer** or **append-log** (`STATUS.md`); `profile.md` is written by `ow-start` only.
5. Verdicts per check: `OK / FINDING / NOT-CHECKED(reason)`. Overall: `PASS / FAIL / INCOMPLETE`, never PASS while a mandatory check is NOT-CHECKED.
6. Every gate carries one honest label: **agent-checked**, **human-decided**, or **host-enforced**. Nothing is called a block unless something blocks.
7. Order is freeze candidate → review → deliver. `ow-draft`'s deliver step refuses without a review record for that exact candidate. A digest is real tool output or a fingerprint labelled weak — never invented.
8. Step 0 has an **already-shared branch**: if the triggering message already contains the material, say so; never imply exposure was prevented.
9. When a handling level is set, the skill names the host's web-search and connector switches and asks the user to confirm they are off or administrator-managed; the answer is recorded as *confirmed by user, not verified*.
10. The only machine enforcement is authoring-side, at the **build**: the ow- zip refuses to emit unless every handoff has a matching reads row, every reads row has an absent-case, every artefact has one writer, every `NEXT` names an installed or declared skill, and each body is within its token budget.

### 6.5 `ow-blueprint`

Two entry modes — designed-but-unbuilt, or running-but-undocumented — one output. Facts carry a confidence level: HIGH seen in an artefact · MEDIUM stated by one person · LOW inferred · UNKNOWN.

| Phase | Verb | Release |
|---|---|---|
| Scope | `/ow-blueprint-scan` | W0.1 |
| Walk-through + spec pack | `/ow-blueprint-map` | W0.1 |
| Gap analysis | `/ow-blueprint-gaps` | W0.1 |
| Work packages → `NEXT: use ow-draft` | `/ow-blueprint-plan` | W0.1 |
| Control candidates (uncited, fixed columns) | `/ow-blueprint-controls` | W0.2 |
| Document set | `/ow-blueprint-docs` | W0.2 |

Spec pack: `00-process-overview` · `01-process-map` · `02-roles-raci` · `03-data-records` · `04-systems-tools` · `05-control-candidates` (only if a regime applies) · `06-risks-exceptions` · `07-documentation-set` · `08-metrics-monitoring` · `09-rollout-change` · `10-effort-cost` (only if inferable), plus `gap-analysis.md` and `work-packages/WP-nn.md`.

Completeness checks (every step has an owner, every decision has criteria, every exception has a path, every UNKNOWN becomes a question to a named person) are **agent-checked**, each with a NOT-CHECKED outcome. When `04-systems-tools` concludes something must be built, the bridge to opchain.dev is a person carrying that file to `oc-app-architect`; it needs a reciprocal reads row on the dev side, which does not exist yet.

### 6.6 `ow-controls` and framework packs

Same split as the dev catalog: `ow-blueprint` designs controls for one process once; `ow-controls` keeps the standing register. Verbs: `/ow-controls-scope · -map · -gaps · -evidence · -policies · -pin · -status`. Human-process evidence goes stale with **time**, so every control carries a test frequency; when records are regulated, due dates are mirrors — "as reported on `<date>`; verify in `<system>`".

**Limits that do not move:** never asserts compliance; never the system of record — a folder of files is not a Part 11 record system and a sign-off note is not an electronic signature; obligations are cited to a pack or a fetched official source, never recalled; policies are human-approved; an honest bundle lists its gaps. The register requires a persistent folder and stops without one.

| Decision *(owner)* | Answer |
|---|---|
| Currency-check cadence | User-configurable interval; checked at point of use, plus a scheduled watch where a host has a scheduler |
| Hosted framework feed | Yes — it is the **commercial boundary**. Open text and "a newer revision exists" are free; **delta analysis is paid** (what changed, which controls are affected). Delivery is a person downloading a signed pack and provisioning it |
| Newer revision than the pinned one | Pin and report the delta; the organisation decides when to move |
| Live research | Fetch open official sources on demand via `/ow-research-framework`, labelled **unpinned — fetched, not a pack** on every output until pinned |
| First packs | NIST 800-53 · 800-171 / CMMC · HIPAA + GDPR · SOC 2 · GxP · bring-your-own loader. **FedRAMP dropped.** No non-US government pack yet |
| Licensed text (SOC 2, ISO 13485 behind Part 820, GAMP 5) | **Own-words, no-text mode until counsel** — AICPA, ISO, HITRUST and ISPE terms restrict loading their text into AI tools. No SOC 2 subset ships: "the 20 that matter" can only come from recall or licensed text |
| HIPAA | Ships **mapping-only**; no PHI is ever entered, and the skill says so |
| Evidence bundles | **Pointers only** — an index of where records live plus the gap list |
| Handling + not-a-record wording | One plain question and one neutral sentence for everyone; heavier wording only behind a profile |
| Where packs live | Working-folder loader **and** administrator-provisioned pack plugins; the administrator's copy wins, a mismatch is reported |

Research corrections that shape the packs: NIST publishes OSCAL for 800-53 and for 800-171 **Rev 3** only, while CMMC binds **Rev 2** — "current" is not "binding". An eCFR snapshot is not the law in force (vacated provisions still appear). 21 CFR Part 820 has incorporated ISO 13485:2016 by reference since 2026-02-02, so GxP is mixed-licence and is built as a profile of sub-packs. The proving pack is 800-53 alone, delta pair 5.1.1 → 5.2.0. The same recall weakness exists in shipped `oc-compliance-ops`, which picks its SOC 2 subset from model memory.

### 6.7 Structure

| Question | Position |
|---|---|
| Fork or flavor | One repo, two catalogs; ow- shares nothing at runtime with oc- |
| Repo layout | Sibling catalog dir (proposed `skills-work/`) with its own build and checks — today's scripts hard-code `skills/` and the `/oc-` prefix and would silently skip it |
| Naming *(owner)* | `ow-` prefix; `ow-blueprint`, `ow-controls` |
| Versioning | Own 0.x line; per-skill versions; the protocol file versioned separately so one edit doesn't force re-review of every skill |
| Site | One Worker, two hostnames, separate layout and voice — unverified until tried on staging |
| Open vs closed | Skills and pack format open (Apache-2.0 + DCO); the maintained delta feed is the product. **Commercial arm's name: decide later** *(owner)* — it cannot be `opchain-work` now that the name is the public flavor |
| Trademark | No new filing; the OP Labs "OP CHAIN" applications reach their deadline 2027-10-08. Not legal advice |

### 6.8 Release train

| Order | Release | Depends on |
|---|---|---|
| 1 | v2.0.3 | — |
| 2 | v2.1.0 | D-H decision |
| 2′ | Week-one host spike → W0 test | nothing in 2.1; runs in parallel |
| 3 | **W0.1** — `ow-start`, `ow-blueprint` (scan → plan), `ow-draft`, `ow-review` | W0 returns Go |
| 4 | **W0.2** — deck / sheet / comms modules; `ow-blueprint` controls + docs; `ow-controls` with the 800-53 pack and loader | W0.1 in real use |
| 5 | **W0.3** — `ow-research`, `ow-currency`; full status and logs in `ow-start` | — |
| 6 | Remaining packs (800-171/CMMC, HIPAA mapping-only, GDPR, GxP; SOC 2 own-words) and the paid feed | `did.json` published; counsel's read |
| 7 | **W0.4** — `ow-program`, `ow-vendor-eval` | earlier releases in real use |
| 8 | **W0.5** team mode — non-government only; deferred for government | users asking |

One maintainer: alternate .dev and .work cuts; never two at once.

## 7. Validation

Plan: `docs/plans/2026-09-18-ow-w0-test-plan.md`. *(owner)* 8+ unmoderated private-sector testers, non-sensitive material, their own Claude plans; recruit known contacts first; a public call only after the domain is registered, which the owner has tied to a Go result — so W0 recruiting is private in practice; incentive is early access; publication consent asked per tester.

- **Go:** at least half reach "delivered" unaided **and** at least half say the gap list or review raised something new.
- **Stop:** with 8 testers, 3 or fewer reach the gaps step, or 2 or fewer find value.
- **In between:** up to two revision rounds of four new testers, each read on its own four.
- Still proposed: fold `ow-review` into `ow-draft` if split testers act on `NEXT` in under half of transitions; treat the pointer as unreliable below ~80% emission.

The host spike comes first — nine yes/no observations per host: does a skill-written file persist to the next conversation; can state travel as one portable file; is a code tool available; which web and connector switches exist and who controls them; can one plugin read another's files; does the model open the protocol file unprompted; do document-export tools exist; are slash commands registered; how does a non-coder install it.

## 8. Decisions

| # | Decision | Status |
|---|---|---|
| 1 | D-H — the OSS split | **Decided** *(owner)*: finish it as 2.1's first sprint |
| 2 | 2.1 scope as in §3 | **Decided** *(owner)*: as recommended, but the marketplace stays in |
| 3 | Site shape | **Decide after W0** *(owner)*; no site work before the test returns Go |
| 4 | Register `opchain.work` | **Only if W0 returns Go** *(owner)* — so recruiting stays private until then; a public call would announce an unregistered name |
| 5 | Commercial arm's name | **Decide later** *(owner)* |
| 6 | Catalog directory name (`skills-work/`) | Proposed |
| 7 | Merged-vs-split and 80% `NEXT` rules | Proposed |
| 8 | Licensor terms for AICPA / ISO / HITRUST / ISPE text | **Counsel** |
| 9 | Everything in §6.2, §6.6, §6.7 naming, and §7 go / stop / rounds | **Decided** *(owner)* |

## 9. Known limits

- The central remedy is unmeasured: nobody has observed whether a model reliably prints `NEXT` from skill prose or whether a non-coder then types it. The 66% / 5% figures come from developer sessions in Claude Code.
- The audit's one critical finding — sensitive content leaving the host — has a recorded human confirmation step and **no technical control** on standard Claude apps. That is the ceiling a skill can reach.
- Eight private-sector testers say nothing about government users, administrators, sensitive material, the register, or packs. Those tests are still owed before any government-facing claim.
- The HIPAA pack has no confirmed folder-capable commercial host inside Anthropic's BAA, hence mapping-only.
- Research facts about frameworks, licences and hosts were fetched on 2026-09-18 and re-checked by a second agent; four were spot-checked by hand. Confirm at the source before relying on any of them. Nothing here is legal advice.
- One person maintains all of this. The design assumes it: few skills, generated tables, build-time checks, a paid feed for the part that cannot be kept correct by hand.
