# opchain 2.1 and opchain.work — strategy review (v1, audited working draft)

> **Superseded by `docs/plans/2026-09-21-opchain-work-and-2.1-strategy.md`.** Kept unchanged because `docs/audits/2026-09-18-ow-pack-design-audit.md` cites it by line (`DOC:n`). Line numbers in those citations refer to the draft as it stood during the audit and have since shifted by the notes added above and in place; search by the quoted text.

**Date:** 2026-09-18 · **Skill:** oc-app-architect (discovery / roadmap evaluation, no build)
**Status:** DRAFT for the owner. Owner decisions are recorded in §6, §3c and §7; everything else marked "recommend" is still a proposal.
**Audited 2026-09-18 — grade D.** `docs/audits/2026-09-18-ow-pack-design-audit.md` audited §2–§3c (102 verified findings: 1 critical, 31 high). §3's skill list, its cross-skill edges and several factual claims below are **superseded by §7**; statements the audit showed wrong are struck and corrected in place, marked *[audit]*.
**Base:** `origin/main` @ `1dc86ad` (v2.0.2 shipped; v2.0.3 in flight on `origin/fix/2.0.3-session-clock`).

## Read this first — what is current

This document grew over one working session and later sections overrule earlier ones.

- **§0–§1, §4–§5** (what exists; v2.1, v2.2, v2.3; ideas in other worktrees): current, with in-place *[audit]* corrections.
- **§2** (why opchain.work, constraints, structure): the strategy stands; several host and hosted-store facts are corrected in place.
- **§3–§3c** (the skill list, `ow-blueprint`, `ow-controls`, framework packs): kept as the record of the first design. It was **audited and graded D**. Its skill *list* and every cross-skill *edge* are superseded; its intent, the compliance limits and the owner's framework decisions still hold. Skill names there use the owner's renames.
- **§7** is the recommended organisation and cross-talk contract after the audit; **§8** closes the audit's 24 remaining gaps. Where §7 and §8 differ, §8 wins (verb naming, protocol file location, artefact paths).
- **§6** is the live decision list.
- Nothing here is approved for build. No `ow-*` skill file is to be written before the week-one host spike and the W0 user test.

## 0. What I actually found (and didn't)

Evidence first, because two of the three things I was asked to review have almost no written material.

| Asked for | What exists | Where |
|---|---|---|
| "Latest material on the 2.1.0 launch" | **No 2.1 plan doc, sprint plan, or branch.** 2.1 exists only as (a) the `/changelog` Planned group "Distribution and installation — voting open", (b) three GitHub roadmap issues, (c) decision D-F in the v2.0 plan saying the 2.1 scope decision is cut-time work. | `site/src/pages/changelog.astro:89-103`, `:1113`; `asfbay-bit/opchain-skills` #1 #4 #5; `docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:344-348` |
| "New idea: keep opchain.dev, add opchain.work for non-coding professionals" | **Nothing written that I could find** — no hit in any worktree, remote branch, or memory file; session-transcript searches for `opchain.work`, `non-coding` and `knowledge work` return only the audit finding below; the first page of a Drive search for "opchain" (modified since 2026-08-15) returned unrelated documents and I did not page further. So this review works from the one-sentence idea in the request, not from a brief. The only prior use of the name is the 2026-08-22 OSS audit finding AF5, which records a private repo `asfbay-bit/opchain-work` (created 2026-05-18) described as "the commercial home of opchain". That is a *different idea* (commercial arm of the dev product) — and decision D4 (2026-08-24) formally reserved `opchain-work` for closed commercial content, which the new idea collides with (§2.4, §6 item 0). That repo now 404s for both logged-in `gh` accounts. | `docs/audits/2026-08-22-oss-readiness-audit.md:576-579` |
| Other release ideas in worktrees | See §4 (from a read-only sweep of ~55 worktrees + unmerged remote branches). | §4 |

Live checks run today (read-only):

- `GET opchain.dev/api/votes?ids=1..7` → **all seven v2.1–v2.3 candidates have 0 votes.** Same as the 2026-09-03 plan recorded. "Voting open" has produced no signal in ~3 weeks.
- `GET opchain.dev/api/health` → `f196207` (matches the #555 runtime approval).
- `whois opchain.work` → registry returns "No Data Found"; no NS, no A record. **The domain appears unregistered.** CLI whois can be wrong — confirm at a registrar before relying on this. (I did not and will not register anything.)
- Roadmap issue #3 "Pipeline depth" (v2.3) still lists `oc-qa-ops` as future work. It shipped in v1.9 (#8). The issue body is stale.

One staleness flag on our own state: `.checkpoints/oc-app-architect.checkpoint.json` still says the v2.0 sprint plan is *blocked on OSS split Phase C2–C7 (decision D-H)*. But v2.0.0 shipped on 2026-09-14 as "The shared runtime", and its changelog says "Wire 1.2 migration and the repository split are not part of this release." D-H was reversed in practice and the checkpoint never recorded it. I have **not** edited the checkpoint — that reversal is the owner's to record — but every recommendation below assumes the shipped reality, not the checkpoint.

## 1. v2.1.0 "Distribution and installation" — evaluation

### 1.1 The three listed candidates

| # | Candidate | Verdict | Why |
|---|---|---|---|
| #4 | **Claude.ai web skill install** ("one-click … no file management") | **Keep, re-scope, make it the headline.** | It is the only 2.1 item that widens *who can use opchain at all*, and the host facts it uncovers are shared with opchain.work's host spike (§8). But the promise as written is ahead of the evidence: `/install` flow 02 already says "use your host's supported skill import flow" and "local runtime commands need filesystem access and Node.js 22.13 or newer; loading instructions alone does not run those commands." I could not verify that Claude.ai exposes any one-click/deep-link install surface, so **do not promise one-click until a spike proves it.** The honest deliverable is: (a) a per-host install matrix that says what works where, (b) a *runtime-free mode* — every skill degrades to file-tool checkpoints when Node/git are absent, (c) a Cowork/Desktop plugin path, since the repo already ships `.claude-plugin/marketplace.json`. |
| #1 | **Marketplace + templates** | **Split. Ship templates; defer the marketplace.** | A community registry needs a community. Evidence today: 0 votes on 7 items; all 12 issues ever filed on the public repo are the maintainer's own migrated roadmap entries and it has received no pull requests; governance pack explicitly dormant until a second maintainer exists. A registry with one publisher is a new release surface with no users. *Templates* (a stack-forge pack + skill bundle + checkpoint defaults) are different: they shorten time-to-first-value for a solo installer and need no intake/review machinery. |
| #5 | **VS Code / Cursor extension** | **Defer past 2.3, or drop.** | A new codebase (TypeScript extension host), a new publisher identity (VS Marketplace + Open VSX), and a new lockstep surface — for a sole maintainer whose chronic failure mode is release-surface drift (v1.0–1.7 untagged; the 2.0.0-vs-2.0.2 copy split graded C+ yesterday). The value (see checkpoint state without leaving the editor) is ~80% covered by `checkpoint:status`, the SessionStart hook, and the 2.0.3 visible-progress work. Revisit only if real users ask. |

### 1.2 What 2.1 is missing

"Distribution and installation" currently lists three *new* surfaces and none of the *known-broken* install work. If the theme is honest it should own:

1. **The portability debt.** The code-auditor checkpoint still carries 14 critical / 41 high from the 2026-07-04 portability audit and 24 HIGH from the 2026-08-22 OSS-readiness audit. Those are, literally, "does it install and run somewhere that isn't Aidan's laptop."
2. **The OSS split — finish or formally cancel.** D-H said "split before 2.0"; 2.0 shipped without it. Either run Phase C2–C7 as 2.1's first sprint, or record a decision that the monorepo-plus-mirror model is permanent and delete the path freeze. The current state (approved plan, reversed silently, checkpoint still "blocked") is the worst of the three.
3. **PX-01 / PX-02.** *[audit: my description was stale — PX-01 was closed in v1.9.0 (`skills/CHANGELOG.md:450-455`, `src/index.js:607-686`): HMAC-signed per-session tokens, 30-day TTL, 64 KiB cap. The code-auditor checkpoint's "Fix PX-01/PX-02" next action is stale too.]* What remains open in the hosted store: no tenancy or user identity, a bearer token that cannot be revoked, no protocol validation of content, no delete tool, a KV namespace shared with lead capture, and `ow-` ids rejected as unknown skills. `/privacy` accuracy (PX-02) still needs checking. Any install path aimed at less technical users (Claude.ai, and all of opchain.work) leans on the hosted MCP *more*, not less. Fix before widening the funnel.
4. **A single source for version claims.** At least 1.8.2 and 2.0.x needed follow-up live-claim fixes after the cut (#411 for the parked 1.8.2 surfaces; the v2 asset hotfix and #553 for 2.0.x). A generator that stamps every live-claim surface from `skills/CHANGELOG.md` is a distribution feature: it is what makes what people install match what the site says.
5. **The vote mechanism itself.** The owner confirmed (2026-09-18) that every roadmap vote ever cast was their own, so the vote has never carried outside signal. Separately, the live store reads 0 for issues 1–7 (`vote-count:<issue-number>` in the `NOTIFY` KV, `src/index.js:91-160`), so even those votes are not in the current keyspace — plausibly lost when ids moved from Linear to GitHub issue numbers on 2026-08-26, or cast on staging; unverified, and I did not cast a test vote. Either way: stop presenting 2.1 as "voting open". Per D-F and the dormant-governance clause this is sole-maintainer discretion; take the D-F *direction set* branch (hand-written hero, Planned reads `v2.2 → v2.3`, vote-target pin 4) and keep voting on the later groups as advisory.

### 1.3 Recommended 2.1.0 shape — "Installs anywhere, says so honestly"

| Sprint | Content | Rough size |
|---|---|---|
| 0 | Decide D-H (finish vs cancel split); fix the stale architect checkpoint; land 2.0.3 | decisions + 1–2h |
| 1 | Host matrix + **runtime-free mode**: every skill's checkpoint read/write has a documented no-Node, no-git fallback; `gen-skills-catalog` fails a skill that references a runtime command without one | the real work — for the dev catalog. *(No longer the seam opchain.work stands on; see §8 G24.)* |
| 2 | Portability criticals (the 14) + hosted-store residuals and PX-02 | bounded by the existing audit lists |
| 3 | Native-host acceptance (deferred from 2.0): Cowork/Desktop plugin path verified end-to-end on a clean machine; Claude.ai import spike → write down what is actually possible; skill `references/` readable over the hosted MCP transport | spike first, promise second |
| 4 | 3–4 starter templates (issue #1, templates half only) | small |
| 5 | Update integrity (verify the advertised `/update` endpoint; publish the `did:web` document and a key-custody procedure, then sign the update manifest — *[audit: `opchain.dev/.well-known/did.json` returns 404 and `did.json` is tracked on no branch, so nothing can be called signed yet; CLAUDE.md's description of it as committed is also wrong]*) + release-surface generator + cut | replaces the recurring post-release honesty patch |

Explicitly **out** of 2.1: marketplace/registry, editor extension, anything opchain.work-branded.

## 2. opchain.work — a flavor for non-coding professionals

### 2.1 The strategic question: what would non-coders come for?

Not "a library of professional skills." Anthropic already distributes free function plugins for exactly this audience — legal, finance, HR, marketing, operations, product management, data, design, productivity are all installed in the session that wrote this doc. From their listing descriptions they look like standalone per-task skills (I read the descriptions, not their internals). A solo maintainer does not win a breadth race against the platform owner, and several of those domains (legal, finance, HR) carry advice liability.

What opchain has that a bag of skills doesn't is **the chain**: state that survives sessions, human approval gates, a skeptical Generator→Evaluator loop, an evidence trail, and hindsight. That is function-agnostic. So:

> **opchain.work = the pipeline around knowledge work, not the knowledge.** Brief → evidence → draft → review gate → sign-off → follow-through. Bring whatever domain skills you already have; opchain.work is what makes the output survive a skeptical reader.

This also gives an honest one-line difference from opchain.dev: *.dev ships software that passes review; .work ships documents and decisions that pass review.*

### 2.2 Pipeline translation

| opchain.dev | What it guarantees | opchain.work analog |
|---|---|---|
| `/oc-discover` + gate | The problem is agreed before work starts | **Brief** — decision needed, audience, deliverable type, constraints, definition of done. ★ gate |
| oc-reverse-spec / oc-rag-forge | Ground truth is read, not assumed | **Evidence table** — claim · source · date · confidence; gaps flagged |
| `/oc-build` Generator→Evaluator | Work is graded against a contract, skeptically | **Draft loop** — deliverable graded against the brief's definition of done |
| oc-bug-check commit gate | Nothing unverified gets committed | **Review gate** — every claim maps to an evidence row; numbers tie out; names/dates consistent; confidentiality scan. Blocks / warns / passes |
| oc-git-ops + oc-release-ops | Versioned, attributable, tagged | **Deliver** — versioned package, sign-off record, change summary since last version |
| oc-monitoring-ops | What happens after ship is watched | **Follow-through** — decisions, actions, owners, dates; status generated from checkpoints |
| oc-hindsight / oc-evolve | The pipeline learns | Reused as-is |

### 2.3 Hard constraints (these decide the architecture)

1. **No Node, no git, no repo.** *[audit: true, but my further assumption that every host is instruction-only is wrong per host — Anthropic documents a `/` skill menu, plugin slash commands and hooks on Cowork and on Claude for Government Desktop. A host matrix is needed; Cowork is also outside Anthropic's BAA, which matters for the HIPAA pack.]* The 2.0 shared runtime needs Node ≥ 22.13 and a filesystem; the plugin's commit gate needs git. None exist for this audience. ~~opchain.work therefore cannot start until 2.1's runtime-free mode exists.~~ *[superseded by §8 G24: ow- has its own protocol and state files, so its only prerequisite is the week-one host spike; 2.1 sprint 1 must justify itself for the dev catalog alone.]*
2. **Where checkpoints live.** Three candidates: a working folder (Cowork / Desktop), a Claude.ai Project's files, or the hosted MCP store. *[audit: PX-01 is closed — see §1.2 item 3.]* The hosted store still has no tenancy, no revocation and no delete, and a 30-day TTL that is wrong for a standing register; the audit's recommendation is that ow- work never uses it. Default must be local-first, and "a Claude.ai Project's files" is unverified as a writable location.
3. **The evaluator has no test suite.** For code, "run the tests" is the floor. For a memo the mechanical floor must be built: claim→source mapping, arithmetic tie-out, internal consistency, audience checklist. That rubric kit is the real R&D of opchain.work, and the 2.0 scorecard kit is its starting point.
4. **Confidentiality.** This audience pastes client, HR and contract material. No telemetry default changes; the review gate needs a confidentiality scan; nothing hosted without auth.
5. **Liability.** No skills that give legal, financial, medical or compensation advice. Chain *to* such skills if the user has them; gate their output; don't author them.

### 2.4 Structure — recommendations

| Decision | Recommendation | Reasoning |
|---|---|---|
| Fork or flavor? | **One engine, two catalogs.** Shared: checkpoint protocol, orchestrator protocol, scorecard kit, hindsight/evolve/update. | A fork doubles every protocol fix. |
| Repo | Same product repo; a second catalog dir (e.g. `skills-work/`) and a second plugin (`plugins/opchain-work/`) in the same `marketplace.json`. | `gen-skills-catalog`, lockstep checks and the mirror all key off `skills/<id>/`; a sibling dir keeps the dev catalog's gates untouched. |
| Skill prefix | `ow-` for work skills; shared core keeps `oc-`. **Owner decision.** | Avoids collisions with the owner's own claude.ai skills and with Anthropic's plugin names. |
| Versioning | Work catalog on its **own 0.x semver**; pins a core protocol version. | Lockstep across both catalogs would force empty bumps on .dev for every .work change. Cost: one more version surface — acceptable only *after* the 2.1 release-surface generator exists. |
| Site | **One Worker, two hostnames.** `opchain.work` routes to a `/work/*` tree in the same Astro build with its own layout, voice and IA. | A second Worker means a second baseline, canary, Lighthouse budget and deploy ritual, on top of monitors that are already partly red by choice. One deploy keeps one evidence chain. `wrangler.jsonc:24` already declares `routes` as an array and sets `run_worker_first: true`, so a second `custom_domain` entry plus a host check in `src/index.js` is the likely shape — unverified until tried on staging, and it needs the `opchain.work` zone in the same Cloudflare account. The dev site's terminal aesthetic will not sell to this audience, so a separate layout is non-negotiable even if the Worker is shared. |
| Commercial / open-vs-closed | **This collides with a recorded decision and needs the owner first.** D4 (decided 2026-08-24, `docs/plans/2026-08-22-oss-split-licensing-compliance.md:28`) chose DCO, accepted that the open core is permanently open, and said to "keep commercial value in `opchain-work`-only content" — i.e. `opchain-work` was reserved as the *closed commercial arm*. The new idea reuses the same name for a *public audience flavor*. Both cannot be true. My recommendation: **spine open** (Apache-2.0 + DCO, in the product repo — it shares the permanently-open engine and is the only funnel), **rename the commercial arm**, and reserve it for things that are actually hard to copy: hosted team mode and, later, maintained function packs. | Skills are plain Markdown; once a customer has one it is trivially copied, so closed skill *content* is a weak moat, and a closed catalog with no users gets no feedback. A service boundary is a real one. Counter-argument the owner should weigh: opening the spine under DCO forecloses ever closing it. |
| Domain / mark | Domain looks unregistered (§0) — cheap, owner's call. No new trademark filing; the OP Labs "OP CHAIN" ITUs reach their drop-dead on **2027-10-08** and that date, not this launch, should drive any filing decision. Not legal advice. | From the 2026-08-25 knockout search. |

### 2.5 Validate before building

opchain.dev has 0 roadmap votes and no external issues or PRs. The main risk for opchain.work is not architecture; it is building a second product for an audience that has not been met. Proposed gate before any W-release is planned in detail:

- **W0 spike** *(now specified in `docs/plans/2026-09-18-ow-w0-test-plan.md`, which governs — 8+ unmoderated testers and owner-confirmed go/stop rules replace the numbers below)*: `ow-blueprint` phases 0–2 plus a thin draft → review → deliver, instruction-only, one recorded walkthrough, run in Cowork/Desktop with folder checkpoints. `ow-blueprint` leads because "draft me a memo" is something any chat already does; "describe your process, get the full stand-up pack and the gaps you missed" is not, and its output is mechanically checkable.
- **Test with 3–5 real non-coders** on a real deliverable of theirs.
- **Kill / continue:** continue only if most of them get a real process through the chain without help *and* the gap analysis or review gate surfaces something they had not thought of. Otherwise stop, keep the runtime-free mode (it helps .dev regardless), and write the hindsight.

Prototype pool: the owner's claude.ai account already holds roughly forty non-dev skills (names visible to this session include `deck-master`, `professional-writing`, `meeting-action-parser`, `one-on-one-coach`, `project-governance`, `governance-protocol`, `checkpoint-protocol`, `internal-comms`, `doc-coauthoring`, `wordsmith`, `deslop`, `crr`). I can see names and a few descriptions only, not their contents — but the existence of `checkpoint-protocol` and `governance-protocol` there suggests the chain idea has already been ported once by hand. Mine those before writing anything from scratch.

## 3. The opchain.work skill set across releases — FIRST DESIGN, SUPERSEDED

> **Historical record.** This section is the design the audit graded D. Read §7 for the recommended organisation and §8 for the rules that govern. Kept because the audit's findings cite it line by line, and because `ow-blueprint`'s spec-pack layout (§3a), the compliance limits (§3a–§3b) and the owner's framework decisions (§3c) still hold.

Principle: **spine first, deliverable types second, function packs last.** Nothing ships that doesn't plug into brief → evidence → draft → review → deliver.

### Shared core (not new skills)

~~`oc-checkpoint-protocol` (runtime-free mode), orchestrator protocol, scorecard kit, `oc-hindsight`, `oc-evolve`, `oc-update`.~~ *[audit: none of this can be reused as-is. `oc-hindsight`, `oc-evolve` and `oc-update` each require Node 22.13+ and a consuming repository; the updater rejects non-`oc-` ids; the scorecard kit is a Node module; the bundled `orchestrator.md` is 810 lines of git/deploy handoffs and tells the model that naming the next skill to the user — the only lever measured to work — is WRONG. §7 replaces this with a short generated ow- protocol block.]*

### W0.1 — "The spine" + the entry point (6 skills)

| Skill | Does | Gate / evaluator | .dev analog |
|---|---|---|---|
| **`ow-blueprint`** (owner's idea, 2026-09-18) | Takes a finished process idea — designed but unbuilt, or running but undocumented — and works backward to everything needed to stand it up, document it and make it auditable. Full outline in §3a | Structural completeness checks (§3a) + ★ spec approval | oc-reverse-spec |
| `ow-brief` | Intake interview → one-page brief: decision needed, audience, deliverable, constraints, definition of done | ★ brief approval | `/oc-discover` |
| `ow-research` | Sources → evidence table (claim · source · date · confidence); lists what is still unknown | Rejects uncited rows | oc-reverse-spec, oc-rag-forge |
| `ow-draft` | Generator→Evaluator loop on a written deliverable (memo, proposal, report) against the brief | 4-criterion rubric: answers the brief · evidence-backed · structure · reads like a person wrote it | `/oc-build` |
| `ow-review` | Pre-send gate: claim→evidence mapping, arithmetic tie-out, name/date consistency, audience fit, confidentiality scan | BLOCK / WARN / PASS | oc-bug-check + oc-code-auditor |
| `ow-deliver` | Versioned package, sign-off record, cover note, "what changed since v(n-1)" | ★ sign-off | oc-git-ops + oc-release-ops |

### W0.2 — "Forges and the standing register" (4)

| Skill | Does |
|---|---|
| `ow-deck-forge` | Storyline → slide plan → built deck; evaluator enforces one message per slide and conclusion-first titles |
| `ow-sheet-forge` | Models and trackers with inputs / calcs / outputs separated, a checks tab and an assumptions register; evaluator re-derives totals |
| `ow-comms` | Turns an approved deliverable into audience variants (exec summary, team announcement, client email); never outruns the approved source |
| **`ow-controls`** | The standing control register and evidence bundles for a process — the direct analog of oc-compliance-ops. Outline in §3b. Lands here, not later, because `ow-blueprint` phase 3 (`/ow-blueprint-controls`) needs somewhere to hand its controls |

### W0.3 — "Meetings and follow-through" (4) — the monitoring analog

| Skill | Does |
|---|---|
| `ow-orchestrator` | "Where did I leave off?" across workstreams; routes vague asks. Deferred from W0.1: with six skills and one workstream, checkpoint status already answers this |
| `ow-meeting-ops` | Agenda from the brief → notes → decisions, actions, owners, dates written to the checkpoint |
| `ow-decision-log` | Business ADRs: context, options, decision, owner, revisit date |
| `ow-status` | Weekly status / RAG generated **from checkpoints**, not from memory; flags items with no movement |

### W0.4 — "Program governance pack" (4)

| Skill | Does | Shares engine work with |
|---|---|---|
| `ow-program-ops` | Charter, RAID, milestones, steering-committee pack; multi-workstream checkpoint scoping | **v2.2** multi-project scoping — build the scoping once |
| `ow-stakeholder-ops` | Stakeholder map, comms plan, change-impact assessment | — |
| `ow-discovery` | JTBD, opportunity trees, problem framing | **v2.3** `oc-discovery-ops` — this skill is inherently non-code; author it once and list it in both catalogs |
| `ow-vendor-eval` | Requirements → weighted scorecard → RFP questions → recommendation memo, every score tied to evidence; a selected vendor's attestations feed the `ow-controls` register | — |

### W0.5 — "Team mode"

Reviewer roles, person-to-person handoff, shared checkpoints. Needs an authenticated hosted store with real tenancy, revocation and delete (PX-01's original defect is already fixed; these are what remain). This is the first release that *requires* a service and the natural commercial boundary if one is ever wanted. Do not start it without users asking.

### W1.0

No new skills. Rubrics recalibrated from real hindsight data, a full walkthrough set, and the honest-claims audit the .dev side learned the hard way.

### 3a. `ow-blueprint` — outline (drafted as `ow-revspec`; renamed by the owner 2026-09-18)

**Reading of the idea.** "Reverse" here means *working backward from the finished state*: the process is complete in someone's head (or already running informally) and nothing around it exists yet. Two entry modes, one output: **to-be** (designed, unbuilt) and **as-is** (running, undocumented — fed by interviews, forms, screenshots, ticket exports, existing policy text).

**Why it belongs in W0.1, not a late pack.** (1) It is the entry point for the beachhead audience — people who own processes and direct builds. (2) It answers §2.3's hardest constraint: unlike prose, a process spec is *structurally checkable*, so the evaluator has a real floor. (3) It is the bridge between the flavors — see `04-systems-tools.md` below.

| Phase | Command | Does |
|---|---|---|
| 0 Scope | `/ow-blueprint-scan` | Boundary (trigger → outcome), owner, volume, systems touched, entry mode, which regimes the owner says apply |
| 1 Analysis | `/ow-blueprint-map` | Walk it end to end: steps, actors, decisions, inputs/outputs, data, handoffs, exceptions. Every fact carries oc-reverse-spec's confidence level — **HIGH** seen in an artifact · **MEDIUM** stated by one person · **LOW** inferred · **UNKNOWN** |
| 2 Spec pack | (same) | The numbered set below; conditional docs are skipped, not padded |
| 3 Controls | `/ow-blueprint-controls` | Obligation → control → evidence → owner → test frequency |
| 4 Doc set | `/ow-blueprint-docs` | Inventory of documents that must exist, then chains each to `ow-draft` → `ow-review` |
| 5 Onramp | `/ow-blueprint-plan` | Ordered work packages; each enters the spine as an `ow-brief` |

```
process-spec/
├── 00-process-overview.md      purpose, trigger → outcome, scope / non-scope, owner, success measures
├── 01-process-map.md           steps, swimlanes, decision criteria, exception paths
├── 02-roles-raci.md            roles, RACI, approvals, delegation, segregation of duties
├── 03-data-records.md          data handled, classification, records produced, retention
├── 04-systems-tools.md         systems touched, access, automation candidates, configure-vs-build
├── 05-controls-compliance.md   only if a regime applies
├── 06-risks-exceptions.md      failure modes, escalation
├── 07-documentation-set.md     policy · SOP · work instructions · forms · training · comms — each with owner + review cycle
├── 08-metrics-monitoring.md    KPIs, SLAs, control tests, review cadence
├── 09-rollout-change.md        pilot, training, comms, cutover, stakeholder impact
└── 10-effort-cost.md           only if inferable
gap-analysis.md                 what stands between the idea and a runnable, auditable process
build-plan.md                   work packages → ow-brief
```

**Evaluator floor** *[audit: not mechanical and nothing to BLOCK — on every stated host these are agent-checked prose; they test presence, can be satisfied by invention, and half of them check phase-3 output W0.1 does not produce. Label them agent-checked and give each a NOT-CHECKED outcome]*: every step has an owner · every decision has written criteria · every exception has a path · every obligation maps to a control and every control to evidence + owner + test frequency · every document has an owner and review date · every UNKNOWN is turned into a question addressed to a named person.

**The compliance line — this is where the skill could do harm.** It must not assert that a process *is* compliant, and it must not supply regulatory requirements from model memory as fact. Obligations come from a cited source — a framework pack or text the user provides (§3c) — never from recall; anything recalled rather than read is marked LOW and routed to "confirm with your compliance owner or counsel". Same stance as oc-compliance-ops: a register and a gap list, never a certification. "Nail compliance" is the goal; the skill's honest contribution is that nothing is left unmapped or unowned.

**Bridge to opchain.dev.** When `04-systems-tools.md` concludes something must be *built* rather than configured, it is already shaped as discovery input: hand it to `oc-app-architect /oc-discover` *[audit: not "the same way" — oc-reverse-spec hands off via `/oc-roadmap`; `/oc-discover` declares no such input and has no reciprocal "reads from" row. The bridge is a person carrying a file, and needs a change on the oc- side too]*. A process owner specs in .work; the build runs in .dev. That handoff is the best single argument for keeping both flavors on one engine.

**Scope risk.** oc-reverse-spec is 600+ lines across five phases; "everything you need" invites a mega-skill. Hold W0.1 to phases 0–2 plus the gap analysis; phases 3–5 can land in W0.2 once `ow-draft`/`ow-review` exist to chain to.

### 3b. `ow-controls` — outline (drafted as `ow-compliance-ops`; renamed by the owner 2026-09-18)

**Correction to the first draft.** This skill was never listed as a first-class skill (the owner asked where "ow-compliance-ops" had gone): I had reduced it to a W0.5 row called `ow-audit-evidence` and folded the rest into `ow-blueprint` phase 3. That under-named it and buried it. It is a first-class skill and it moves to W0.2. *(It first kept the dev catalog's name; the audit found one-letter verb collisions with `/oc-comply`, and the owner renamed it `ow-controls`.)*

**Split of duties — identical to the dev side.** oc-compliance-ops says "consume the assessor, don't be one": oc-security-auditor assesses at a point in time, compliance-ops keeps state over time. Here `ow-blueprint /ow-blueprint-controls` is the assessor (designs controls for one process, once); `ow-controls` is the standing register across all of a team's processes.

| Command | Does |
|---|---|
| `/ow-controls-scope` | Declare which frameworks and internal policies apply, to which processes and data classes, at what tier → writes the profile |
| `/ow-controls-map` | Control → satisfying artifact (SOP section, approval record, training log, access review, signed form) → owner → status → last tested → next due |
| `/ow-controls-evidence` | Bundle for a sign-off or period close — **pointers only** (owner decision 6): an index of where each record lives plus the gap list, never copies; stamped with date and the `ow-deliver` version + content hash (there is no commit SHA in this world) |
| `/ow-controls-gaps` | Unmapped, unsatisfied, or **stale** controls |
| `/ow-controls-policies` | Scaffold policy documents the frameworks require; humans approve, never the skill |
| `/ow-controls-status` | Register health, last bundle, what is overdue |

**The one real difference from the dev skill.** Code evidence goes stale when a commit changes it. Human-process evidence goes stale with *time* — an access review is good for a quarter, training for a year. So cadence is the core mechanic: every control carries a test frequency, and `ow-status` (W0.3) must surface overdue control tests the way it surfaces overdue actions.

**Principles carried over verbatim in spirit:** inert without a profile · facts, not attestations — a bundle never says "we are compliant" · proportional to tier, or it is theater · humans own policies · an honest bundle lists its gaps. Plus the `ow-blueprint` rule: obligations are cited to a framework pack or to text the user supplies (§3c); anything recalled from model memory is marked LOW and routed to the compliance owner or counsel. No certification, no legal advice.

### 3c. Framework packs and currency — owner decisions of 2026-09-18

**This supersedes the blanket rule in §3a/§3b** that obligations only come from text the user supplies. The real hazard is *recalling* requirements from model memory; *fetching the authoritative source and citing it with a version* is better than either. It also exposes a weakness in the shipped dev skill: oc-compliance-ops carries no framework text or version at all — `controls_in_scope` and "the ~20 controls that matter early" (`skills/oc-compliance-ops/SKILL.md:90-98`, `references/compliance-profile.md:66-70`) come from the model's memory of SOC 2. Framework packs are therefore shared-engine work that improves both catalogs.

**Owner decisions recorded:**

| Question | Decision |
|---|---|
| Check cadence | **User-configurable**, not a fixed hour. The profile carries the interval; the skill re-verifies currency before a compliance statement whenever the last check is older than that interval *[audit: overstated — the 2.0.3 session clock is an instruction to display the date with no named time source; no scheduler is documented for Claude for Government, and Cowork scheduled tasks cannot be tied to a local folder or a quarterly interval. Currency checks run only when someone runs the verb.]*, and a scheduled watch runs at the same interval where the host has a scheduler |
| Hosted framework-version feed on opchain.dev | **Yes — and it is the commercial boundary.** A maintained, signed feed plus change-impact alerts is what the commercial arm sells. This answers most of §6 item 0: the skills and the pack *format* stay open; the *maintained feed* is the product |
| A newer revision exists than the pinned one | **Pin and report the delta**: keep applying the revision the organization is bound to, show what changed and which register controls are affected; the organization decides when to move |
| First packs | NIST 800-53 (~~+ FedRAMP~~ — dropped by the owner 2026-09-18) · NIST 800-171 / CMMC · HIPAA + GDPR · **SOC 2** · **GxP** · plus the bring-your-own loader |

**Two kinds of pack, split by licence — this is not negotiable and the loader must make it visible:**

| Kind | Frameworks | What ships |
|---|---|---|
| **Open text** (public law or openly published, machine-readable where available) | NIST 800-53 (OSCAL confirmed); 800-171 — *[audit: OSCAL exists only for Rev 3, but CMMC binds Rev 2, so "current" ≠ "binding"]*; ~~FedRAMP baselines (GSA OSCAL)~~ *[audit: `GSA/fedramp-automation` is gone (404); FedRAMP restructured in 2026 into Certification Classes A–D published as JSON in `FedRAMP/rules`, with no licence file or tags — hold this pack]*; HIPAA (eCFR) — *[audit: an eCFR snapshot is not "the law in force": vacated or enforcement-discretion provisions still appear]*; GDPR (EUR-Lex); the FDA GxP parts — *[audit: mixed licence, see next row]* | A versioned snapshot: control text, source URL, retrieval date, content hash. Works offline in a locked-down tenant; refreshed live from an allow-list of authoritative domains when the host permits |
| **Licensed text** (copyrighted standards) | **SOC 2** (AICPA Trust Services Criteria), ISO 27001, PCI DSS, CIS, HITRUST, ISPE GAMP 5 — *[audit: also ISO 13485:2016, which 21 CFR Part 820 has incorporated by reference since 2026-02-02, so a Part 820 "open" snapshot is a shell over copyrighted text; ICH E6 (now R3) and EU Annex 11 were filed nowhere]* | Identifiers and structure only — never the criteria text. The organization loads its own licensed copy through the bring-your-own loader, and mappings cite that copy. *[audit — HIGH: this is not the safe path I presented it as. The current terms of AICPA, ISO (updated 2026-05-29), HITRUST and ISPE restrict or object to loading their text into AI tools; a user following the skill's instruction could breach their own licence. Needs counsel; until then, no-text / own-words mode only.]* Whether shipping bare identifiers is acceptable needs a licence check per framework; not legal advice |

*This table was written from memory. The audit's research dimensions have since checked it against live sources; the [audit] notes above are the results, with URLs in the audit report's fact table.*

**GxP is a family, not a framework, and it is the best fit in the whole pack.** It spans 21 CFR Part 11 (electronic records and signatures), Parts 210/211 (drug GMP), Part 820 (device quality system), Part 58 (GLP), the GCP parts and ICH E6, EU Annex 11, and GAMP 5 as the licensed industry guide. Its evidence is exactly what `ow-blueprint` and `ow-controls` are built around: SOPs, training records, periodic review, deviations and CAPA, change control, data integrity. So a GxP pack is a *profile of several sub-packs*, selected in `/ow-controls-scope` by product type and activity.

**The hard limit GxP forces — and it applies to every regime with record-keeping rules:** the pack drafts and maps; it is **never the system of record**. A folder of checkpoint files is not a Part 11-compliant record system: no validated audit trail, no compliant electronic signature. `ow-deliver`'s "sign-off record" must say so in plain words and must never be described as an electronic signature; approved documents live in the organization's validated QMS or document system, and the organization's own policy governs using an AI tool to draft controlled documents. Same principle as "facts, not attestations", one level up.

**Rules every pack and every fetch obeys:**

1. **Version and verification time on every compliance output.** If the currency check could not run (no web access, feed not allow-listed), the output says "pack dated X, currency not verified" — never silence.
2. **Fetch by identifier only.** A research query never contains the user's own material. *[audit — the one CRITICAL finding: nothing enforces this. It is model judgement with no floor, and it covers only pack fetches while four other channels can carry sensitive content off-host. It must be described as agent-checked, the tenant's own egress controls are the only real control, and on standard Claude apps there is none.]*
3. **Fetched content is data, not instructions.** Authoritative-domain allow-list per pack; anything outside it is refused *[audit: a pack file cannot refuse anything — the tenant's allow-list governs, and default egress on managed tenants is off, so "live refresh" is "never" by default]*. This is the pack's main indirect-injection surface.
4. **Retrieval, not loading.** 800-53 alone is on the order of a thousand controls and enhancements; packs are addressed by control id and baseline, and the tier still bounds register depth — proportionality survives.
5. **Admin-reviewable.** The allow-list, the feed URL and the check interval are declared in one place a tenant administrator can read and restrict.

**Release-train effect.** W0.2 grows: `ow-controls` now needs the pack format, the bring-your-own loader and at least the open-text packs. Recommend splitting: W0.2 ships the register, the loader and **one** open pack end to end (NIST 800-53 alone, delta pair 5.1.1 → 5.2.0, because its OSCAL source makes the snapshot and delta mechanics testable; FedRAMP was dropped by the owner); the remaining packs and the commercial feed follow as their own release once the delta mechanism is proven. Six regimes across four jurisdictions is more than one maintainer can keep correct by hand — which is exactly the argument for the feed being the paid, maintained part.

### Deliberately not built

Legal, finance/accounting, HR/compensation, medical, marketing/SEO skills. Anthropic's plugins cover them and they carry advice liability. `ow-draft` may *call* whatever domain skill the user has; `ow-review` gates the result. That composition is the pitch.

### Interleaved release train

| Order | Release | Depends on |
|---|---|---|
| 1 | v2.0.3 | — |
| 2 | **v2.1.0** installs anywhere (runtime-free mode, portability, hosted-store residuals, surface generator) | D-H decision |
| 3 | Week-one host spike, then the W0 test (8+ testers) | nothing in 2.1 — can run in parallel with it |
| 4 | W0.1 spine + `ow-blueprint` phases 0–2 | W0 passes its gate |
| 5 | v2.2 multi-project scoping (engine) → W0.4 reuses it | — |
| 6 | W0.2 (forges + `ow-blueprint` phases 3–5 + `ow-controls` with the 800-53 pack; HIPAA mapping-only; no FedRAMP; SOC 2 and licensed GxP in own-words mode pending counsel), W0.3 | W0.1 in real use |
| 7 | v2.3 discovery → shared with W0.4 `ow-discovery` | — |
| 8 | W0.5 team mode → W1.0 | users asking |

One maintainer: alternate .dev and .work releases; never run two cuts at once.

## 4. Ideas in other worktrees and unmerged branches — evaluation

A read-only sweep covered every listed worktree, every unmerged remote branch and the open PRs (four `/private/tmp` worktrees no longer exist on disk and could not be read). **Headline: nothing unmerged proposes a new product direction.** Roughly 45 of ~55 worktrees are fully merged or hold only stranded reports, regenerated PNGs or stale checkpoints. What is left:

| Workstream | Where | State | Recommendation |
|---|---|---|---|
| **v2.0.3 "Focused execution, visible progress"** | PR #552 on `codex/release-2.0.3`; `origin/fix/2.0.3-session-clock` is **5 commits ahead of #552's head** (session clock, wall-clock actuals, staging audits) and has no PR of its own | In flight | **Land first, and reconcile the two branches before cutting** — as it stands the release PR does not contain the release's newest feature. |
| Mandate-driven demo rebuild | `origin/claude/demo-rebuild-2-0` (PR #515 closed as superseded) | Parked | **Read before writing the opchain.work brief.** Per the sweep its 11 scenarios were written to mandates taken from real job requisitions — RevOps, AI CoE, quote-to-cash, tool consolidation. I have not read them myself, but that is the closest thing in the repo to research on a non-developer audience, and it points at a sharper beachhead than "all non-coding professionals": *business-systems and operations people who direct builds but do not write code.* Salvage the `oc-git-ops ⇒ oc-bug-check` scenario invariant test regardless. |
| Demo realism rewrite + lazy-loaded artifacts | `origin/claude/demo-scenario-realism-99b27d` (PR #517 closed) | Parked | Salvage the lazy-load JSON route and index dedup **only if** `/demo` page weight is a measured Lighthouse problem; otherwise delete the branch. Not a release theme. |
| Colour set 14 "Muted Plum & Mint" | untracked `design-previews/mint/DESIGN.md` in the 2.0-colours worktree, dated today | Idea | 2.0 shipped Slate & Emerald; re-theming .dev again is churn. *Possible* good use: a second palette on the same token roles is exactly what a second flavor needs (§2.4 "own layout"). Owner's call — I don't know what it was drawn for. |
| Colour geometry auditor fix (#494), checkpoint-hygiene contracts (#547), deps consolidation (#549) + five Dependabot PRs | open PRs | Housekeeping | Clear the queue before 2.1 sprint 1; #549 exists precisely because Dependabot PRs fail `evidence:pr`. |
| v2.0 simulation audit pack; audit-remediation program plan | **untracked in the main checkout** (`docs/audits/2026-09-14-v2-simulation/`, `docs/plans/opchain-audit-remediation/`) | Evidence stranded | Commit as historical record or delete. Only the fix (`9176f02`) is on main; the 36/36-skill simulation harness that found the defects is not, and it is the obvious regression suite for 2.1's runtime-free mode. |
| Weekly token-usage reports 07-12 … 08-28 | uncommitted across ~16 worktrees; main has three | Data stranded | One consolidation PR, then prune the worktrees (owner action — I have not deleted anything). |
| Original 2.0 plan draft (`57efac`) | untracked | Superseded | Delete with the worktree. |

### Deferred items already on main — where each should land

| Deferred item (source) | Recommendation |
|---|---|
| Native-host acceptance; real provider run with reviewed evidence (`2026-09-13-v2-runtime-alignment.md:41-45`) | **2.1.** Native-host acceptance *is* the host matrix. |
| Verify `curl https://opchain.dev/update` before advertising; updater digests are not a publisher signature (`2026-09-12-oc-update-v2-addendum.md`) | **2.1.** Distribution integrity. *[audit: the `did:web` document is not published (404) and not tracked; only `scripts/gen-did.mjs` exists.]* Publishing it, with a key-custody and rotation procedure, comes before any signing claim. |
| Serving `references/` over hosted transports (`v1.9.1 plan:212-219`) | **2.1.** MCP-only hosts — the non-coder path — cannot read a skill's references today. |
| Wire 1.2 rotation and migration | **2.2**, with multi-project scoping, if 1.2 is where the scoping fields go; otherwise its own patch. One wire migration, not two. |
| Multi-project reflect; vector-DB hindsight index (`v2.0 plan:130-137`) | 2.2 (reflect) / not yet (index — no data volume to justify it). |
| Turnstile on the roadmap form | Skip until the form gets traffic; votes are 0. |
| Promote `skill_state` payloads to public fields (42 findings) | 2.2, alongside the wire change. |
| Parked stack packs (python-ml, r, julia, tauri, electron) | Templates in 2.1 can absorb one if an installer asks. |
| Unshipped scored candidates in `roadmap/archive/07` — `pricing-forge`, `email-ops`, `billing-ops`, `support-ops`, `analytics-ops`, `a11y-ops`, `cms-ops`, `growth-ops`, `i18n-ops` | **Leave parked.** All are dev-side breadth (skills for *building* business apps), scored 12–15/20 with the lowest marks on Dogfood. Breadth is not the constraint; install reach is. Note these are *not* opchain.work skills despite the "business-app" label. |

That same archive file holds the repo's own candidate rubric — **Fit · Pull · Dogfood · Scope**, where Pull is "can I name three real adopters in week 1?". It scored `vscode-ext` 12/20 "spike, not full theme" (consistent with §1.1) and `marketplace + template-ops` 18/20 with Pull 4 — a Pull score the evidence since (0 votes, no external issues or PRs) does not support. Applying it to opchain.work: the spine scores well on Dogfood (the owner already works this way on claude.ai) and Scope, and **unknown on Pull** — which is exactly what the W0 test in §2.5 measures. Team mode scores 1–2 on Fit ("no backend"), which is why it is last.

## 5. v2.2 and v2.3 — evaluation

| Release | As listed | Recommendation |
|---|---|---|
| **v2.2 "Agency and multi-project delivery"** (#2 Agency play, #7 oc-monorepo-ops) | `/for-agencies` page, multi-project checkpoint scoping, client-handoff demo, oc-monorepo-ops | **Keep the engine, drop the marketing.** Multi-project checkpoint scoping is real and dogfoodable today: the owner runs opchain across several other repos, and the v1.8.2 rollout audit (2026-07-27) found the patch merged in all three consumer repos but present on disk in only one. That is the multi-project problem, observed. Build scoping + `oc-monorepo-ops` against that. `/for-agencies` is already live on main; issue #2 asks for an *expansion* of it. Don't expand a page aimed at a customer nobody has spoken to — hold that until one exists. The client-handoff scenario is a *knowledge-work deliverable* — move it to opchain.work (`ow-deliver`), where it is the core use case rather than a demo. |
| **v2.3 "Discovery and pipeline depth"** (#3, #6 oc-discovery-ops) | oc-discovery-ops (JTBD / opportunity trees); oc-qa-ops; deeper evaluator rubrics | **Fix the issue, then promote discovery.** #3 still lists oc-qa-ops, which shipped in v1.9 — edit the issue. `oc-discovery-ops` is the one planned skill that is not about code at all; author it once as the first dual-catalog skill. "Deeper evaluator rubrics" is the same R&D as opchain.work's prose evaluator (§2.3 item 3) — do it once, in the shared scorecard kit. |

## 6. Decisions — status as of the latest refresh

| # | Decision | Status |
|---|---|---|
| 0 | D4 collision: `opchain.work` as public flavor vs the closed commercial arm D4 reserved the name for | **Mostly decided.** Skills and pack format open; the maintained framework feed is the commercial boundary. Commercial arm's *name*: owner said decide later |
| 1 | D-H: finish or formally cancel the OSS split; fix the stale architect checkpoint | **Open** |
| 2 | 2.1 scope "installs anywhere", marketplace and editor extension cut | **Open.** Note §8 G24: opchain.work no longer depends on 2.1's runtime-free mode, so 2.1 sprint 1 must stand on the dev catalog's needs alone |
| 3 | opchain.work go/no-go is a test | **Agreed** — organisation is to be decided after the W0 test. Testers: private-sector non-coders, none lined up; recruiting is step one |
| 4 | Naming | **Decided:** `ow-` prefix; `ow-blueprint`, `ow-controls`. Directory name (`skills-work/`) still a proposal |
| 5 | Site shape: one Worker / two hostnames | **Open** |
| 6 | Register the `opchain.work` domain (appeared unregistered) | **Open — owner action** |
| 7 | Beachhead audience | **Partly answered:** testers are private-sector non-coders; first-class host is commercial Team/Enterprise |
| 8 | Government scope, users, sensitivity, host | **Decided** (§7 and the audit): all tiers and user types in scope; sensitive-but-unclassified ceiling; commercial Team/Enterprise first, Claude for Government best-effort |
| 9 | Framework packs: cadence, feed, pinning, first packs, licensed text, evidence, handling wording, non-US | **Decided** — §3c and the §7 decision table |
| 10 | Live research depth | **Decided:** fetch open official sources on demand, labelled unpinned (§8 G2) |
| 11 | Free/paid line · FedRAMP · HIPAA | **Decided 2026-09-18:** open framework text and "a newer revision exists" are free, **delta analysis is paid**; **FedRAMP is dropped from the first packs** (supersedes §3c's list and §8 G18's hold); **HIPAA ships mapping-only** — no PHI is ever entered and the skill says so up front (supersedes §8 G4's "ship later") |
| 13 | W0 test | **Planned:** `docs/plans/2026-09-18-ow-w0-test-plan.md` — 8+ unmoderated private-sector testers, non-sensitive material, own plans; go, stop and two-revision-round rules confirmed by the owner; merged-vs-split rule still proposed. Recruit known contacts first, public call second; incentive is early access; publication consent asked per tester |
| 12 | Licence terms for AICPA / ISO / HITRUST / ISPE text in AI tools | **Counsel** |

## 7. Audit outcome — supersedes §3's skill list and edges

Full record: `docs/audits/2026-09-18-ow-pack-design-audit.md`. Three organisation proposals were written independently and scored by three judges; all three ranked **admin-first > conductor > composable**. What follows is the synthesis, *not yet approved* — eight decisions in the audit are the owner's.

**Why §3 fails.** Across 87 recorded sessions, prose telling one skill to engage another produced zero autonomous invocations; skills fire 66.0% of the time when the user names them and 5.4% when they don't. Every edge in §3 was producer-side prose, 16 of 18 skills had no verb, and no receiver checked for anything.

**Shape: nine text-only skills in four closed bundles, plus two things that are not skills.**

| Bundle | Skills | Network |
|---|---|---|
| Core | `ow-start` (front door, resume, status, meeting and decision logs — absorbs orchestrator, status, meeting-ops, decision-log) · `ow-draft` (brief → evidence → draft → deliver as one phase-structured skill; deck, sheet and comms as type modules) · `ow-review` (kept separate: a fresh-session review is the only cheap real separation these hosts allow, and it is the likeliest solo install) · **`ow-blueprint`** (drafted as `ow-revspec`; scan, map, gaps, plan in W0.1; controls, docs, export in W0.2) | none, CI-enforced |
| Assured | **`ow-controls`** — the standing register (drafted as `ow-compliance-ops`). Sole owner of the compliance profile, the pack pin, the loader and all framework-text access. Inert without a profile | none |
| Connected | `ow-research` · `ow-currency` — the only skills with network text; destinations are a generated manifest the administrator pastes into the *tenant's* allow-list | declared |
| Program | `ow-program` · `ow-vendor-eval` (mandatory first question: commercial vs formal public procurement; formal mode scores nothing and recommends no awardee) | none |
| *not skills* | a 40–150-line generated ow- protocol block (replaces the 810-line dev `orchestrator.md`; nothing named `oc-` ships in an ow- bundle) · framework packs as sharded data folders | — |

**How cross-talk works when nothing can enforce it.** No skill invokes, chains to, or role-plays another. An edge is exactly three things: the producer writes a named file with a fixed header; the producer prints a `NEXT` block giving the typeable skill id, a plain sentence to say, and what to do if that skill is not installed; the receiver's first step looks for that file and has a written absent-case and mismatch-case. Only the third is load-bearing. Verdicts gain a `NOT-CHECKED(reason)` outcome and an overall `INCOMPLETE`, so a skipped check can never read as PASS. Every gate carries one honest label: agent-checked, human-decided, or host-enforced. The only machine enforcement is authoring-side CI over one edges file per skill: every handoff has a matching reads row, every reads row has a non-empty absent-case, every artefact has exactly one writer.

**One pack for both audiences.** Behaviour differs only by which bundles are enabled and which profile files exist. A user with no regime answers one plain question and never sees compliance vocabulary; a tenant administrator can approve Core, Assured and Program without reviewing any network behaviour.

**What is still unmeasured.** Whether a model reliably prints the `NEXT` block, whether a non-coder then types it, and whether merged phases hold better than split skills. Those become what the W0 spike measures, per tester, separately from completion — with a pre-committed rule to fold `ow-review` into `ow-draft` or split phases out depending on the result. The completeness critic also found the synthesis still narrows the owner's "research detailed frameworks" requirement to comparing revision identifiers, leaves the bring-your-own loader without a mechanism on hosts with no code tool, and has no real control behind the one CRITICAL finding on standard Claude apps.

### Owner decisions recorded 2026-09-18 (after the audit)

| # | Decision | Answer | Consequence |
|---|---|---|---|
| 1 | First government host | **Commercial Claude Team / Enterprise** | That is where contractors, regulated private organisations and most non-US users are. Claude for Government Desktop and third-party-cloud Desktop are best-effort until tested. Cowork is outside Anthropic's BAA, so the HIPAA pack needs a host × data-class check before it can be offered there |
| 2 | Organisation for the first release | **Decide after the W0 test** | Nothing is committed to nine-skills-in-four-bundles yet. The W0 spike must run a merged-versus-split evaluation and measure, per tester, whether the `NEXT` block is printed and whether the tester types it. The cross-talk contract (file + `NEXT` + receiver check) applies either way, because in-skill phases use the same carriers |
| 3 | Names | **`ow-blueprint`** replaces `ow-revspec`; **`ow-controls`** replaces `ow-compliance-ops` | Verbs become `/ow-blueprint-scan · -map · -gaps · -plan` (then `-controls`, `-docs`) and `/ow-controls-scope · -map · -gaps · -evidence · -pin · -status`. No verb differs from an `oc-` verb by one letter any more. Earlier sections of this doc have been updated to the new names |
| 4 | Where packs live | **Both**: working-folder loader plus edition-named, text-only pack plugins | An administrator-provisioned pack wins over a folder copy; a mismatch is reported, never silently resolved |
| 5 | Licensed standard text | **No-text, own-words mode until counsel** | SOC 2 and the licensed parts of GxP ship as identifiers plus the organisation's own wording only. The licensed-text loader path and any SOC 2 content in the paid feed wait for a lawyer's read and a written answer from AICPA |
| 6 | Evidence bundles | **Pointers only** | A bundle is an index of where records live plus the gap list. "Artifacts collected" in §3b is withdrawn; nothing copies controlled records into an AI working folder |
| 7 | Handling and not-a-record wording | **One plain question for everyone** | One yes / no / not-sure question at first run and one neutral sentence; a stored "no" becomes a one-line notice. Everything heavier stays behind a profile |
| 8 | Non-US government pack | **None yet** | Say plainly that non-US governments are served by the bring-your-own loader until a target tenant is named |

## 8. Closing the completeness critic's 24 gaps

Status key: **Closed** = resolved by a design rule below · **Spike** = cannot be settled on paper; added to the week-one host spike · **Owner** / **Counsel** = not mine to settle. Names use the owner's renames (`ow-blueprint`, `ow-controls`). Further owner inputs of 2026-09-18 used here: commercial Team/Enterprise is the first-class host; live research = *fetch open sources on demand*; commercial-arm name *decide later*; W0 testers are private-sector non-coders, none lined up yet.

| # | Gap | Resolution | Status |
|---|---|---|---|
| G1 | The one CRITICAL (sensitive content leaving the host) has wording but no control | Nothing in a skill can be the control; say so. Add a **human-decided** step: when a handling level is set, the skill lists the host's web-search and connector switches by name and asks the user to confirm they are off or administrator-managed; the answer and date go in the workstream's handling block, and the skill records "confirmed by user, not verified". The posture may be labelled *host-enforced* only on hosts where the spike proves an administrator switch exists. | Closed (wording + step) · **Spike**: which switches exist per host |
| G2 | "Research detailed frameworks" was narrowed to comparing revision ids | Restored per the owner's answer. New verb **`/ow-research-framework`** in the Connected bundle: given a framework id and section, fetch the control text from the pack's declared official source (or, for a regime with no pack, from an official-domain source the user confirms), cite URL + retrieval date, and write it as an artefact marked **`unpinned — fetched, not a pack`**. `ow-controls` may map against it only with that label showing on every output, and offers to pin it as a user pack. Secondary commentary is never fetched as requirement text. Licensed frameworks are excluded (decision 5). | Closed |
| G3 | Bring-your-own loader has no mechanism without a code tool | Two honest modes. **With code execution** (commercial Team/Enterprise, the first-class host): the loader shards and indexes the user's file in the session and writes a user pack with `origin: user`. **Without it**: no bulk load; the user pastes the sections in scope and the register runs in own-words mode against those ids, stated plainly as partial. Non-English sources: loaded as-is, mapped in the user's language, flagged "untranslated source". | Closed · **Spike**: code tool availability per host |
| G4 | Register undesigned where no persistent folder exists | The register **requires a persistent folder**; `ow-controls` says so at `/ow-controls-scope` and stops rather than degrade a standing register into a chat. A host × data-class table in the admin guide states which hosts qualify; claude.ai chat does not. For PHI: Cowork is outside Anthropic's BAA, so **the HIPAA pack has no confirmed commercial host today** — it ships only after the Trust Center HIPAA guide is read and a qualifying folder-capable host is identified. | Closed by refusing · **Owner**: accept that HIPAA may ship later than the other packs |
| G5 | Zero-network-text lint contradicts text those skills must carry | Lint the **capability**, not the vocabulary: Core, Assured and Program may contain no URL, no fetch/search *instruction*, and no MCP/tool reference; *prohibitions* are allowed and come only from the generated protocol block, whose exact sentences the lint whitelists. Host-eligibility and source links live in the admin guide and the Connected bundle only; `ow-controls` says "see your administrator's host table" instead of linking. The literal `opchain.dev` leaves Core. | Closed |
| G6 | "Stop before material is pasted" is impossible when the triggering message already contains it | Add the **already-shared branch** to step 0: "This material is already in this environment; I cannot undo that. If this environment is not approved for it, stop here and tell your administrator." Never imply exposure was prevented. W0 records how often entry happens this way. | Closed |
| G7 | Pack routes rest on unverified host facts, no fallback | With commercial Team/Enterprise first-class, the working-folder route is the tested default. Stated fallback if a host can read neither a sibling plugin nor a folder: **per-regime variants of `ow-controls` carrying the pack under their own `references/`** — the one location every transport is shown to serve. Claude for Government stays best-effort until spiked. | Closed · **Spike** |
| G8 | Verbs no longer carry the owning skill id — dead verbs again on hosts with no command registration | Rule: **every `NEXT` sentence leads with the skill id** — "use **ow-draft** to deliver `<path>`", never a bare `/ow-deliver`. Verbs are namespaced by owner (`/ow-draft-brief`, `/ow-draft-evidence`, `/ow-draft-deliver`, `/ow-start-status`, `/ow-start-log-meeting`). CI asserts each `NEXT` template begins with a skill id that exists in the same or a declared-dependency bundle. | Closed |
| G9 | SOC 2 "tier subsets" can only come from recall or licensed text | **No SOC 2 subset ships.** The SOC 2 stub is identifiers and category names only, gated on counsel like the rest (decision 5). Tier depth for SOC 2 is chosen by the user from their own copy or their auditor's list; the skill never proposes "the ~20 that matter". The same defect in shipped `oc-compliance-ops` (`SKILL.md:90-98`) is logged for the dev catalog. | Closed · **Counsel** |
| G10 | GxP cadence is an unvalidated tracker; trigger phrases promise CAPA handling that doesn't exist | When `regulated_records` is true, `next_due` and `last_tested` are **mirrors**: "as reported on `<date>`; verify in `<system>`", and `/ow-start-status` says "reported overdue", never "overdue". Remove "CAPA" and "deviation" from trigger phrases until a verb handles them. | Closed |
| G11 | Government team mode has no substrate | **Deferred explicitly** for the government tier, as finding research-host-07 advised. The contractor → government-approver handoff is "a person moves marked files", stated as such. | Closed by deferral |
| G12 | Small teams are served only as individuals | State it: before W0.5, the pack is **single-user per workstream**. One named recorder owns each workstream's files; others contribute through that person. No shared-state claim appears anywhere until a shared carrier is proven. | Closed by honest scope |
| G13 | Body budget never checked | Two-tier body: contracts (reads/hands-off rows, `NEXT` templates, step 0) inline; rubrics, glossary and checklists in `references/`. Producers do **not** inline the receiver's checklist — the not-installed branch says what is missing and stops. CI computes a token estimate per SKILL.md body and fails above budget. | Closed |
| G14 | Generated protocol block forces lockstep re-review | The block moves to **`references/ow-protocol.md`**, one file, own integer version, same hash in every bundle; each SKILL.md carries a two-line pointer plus the step-0 sentence. A protocol edit then changes one known file per bundle, not nine skill bodies. Cost accepted: it depends on the model opening a reference — a W0 measurement. | Closed · **Spike** |
| G15 | "One writer per artefact" fails on its own edge list; paths disagree | One root: **`opchain-work/`**, with `opchain-work/STATUS.md`, `profile.md`, `process-spec/`, `work-packages/`, `compliance/`. Artefacts are classed **single-writer** (CI-asserted) or **append-log** (`STATUS.md`, handling block — any skill appends one line, none rewrites). `evidence.md` is single-writer by `ow-draft`; `ow-research` writes `evidence-web.md`, which `ow-draft` reads. `profile.md` is written by `ow-start` only; other skills ask the question and print the `NEXT` to `ow-start`. | Closed |
| G16 | Office-format output depends on an undeclared edge | Declare it: an **optional host-capability edge** to the host's document tools, with an absent-case — deliver Markdown and say "this host cannot export; convert it yourself". The digest is taken over the Markdown source, never the export. | Closed · **Spike**: built-ins per host |
| G17 | Paid feed transport contradicts itself; free/paid line for deltas never asked | Paid delivery is **a person downloading a signed pack from an authenticated site and provisioning it** — no MCP, no credentialed fetch. Proposed line: open-pack *text* and "a newer revision exists" are free; the **maintained delta with change classification and affected-control mapping** is the paid feed. | Transport closed · **Owner**: confirm the free/paid line |
| G18 | FedRAMP held indefinitely without telling the owner | Exit criteria: `FedRAMP/rules` carries a licence statement **and** tagged releases (or FedRAMP publishes reuse terms), checked at each release cut. Until then federal users get 800-53B baselines with a standing notice that FedRAMP's classes are not one-for-one. State/local: no named framework — served by own-words mode and the loader, said plainly. | Closed · **Owner**: accept the hold |
| G19 | Two mandated evaluations have no harness or costing | Sized for one person: W0 is a **manual protocol** — 3–5 testers, a one-page observer sheet (was `NEXT` printed; did the tester type it; did the receiver find the file; completion). Merged-vs-split is tested on **one seam only** (`ow-draft` with review merged vs separate), not two full variants. The coexistence trigger test is 20 hand-run prompts with Anthropic's plugins installed. With no testers lined up, **recruiting is now step one of W0**. | Closed |
| G20 | Authoring CI can be admin-merged past | The chokepoint is the **build**, not the merge: the ow- zip and pack build refuse to emit unless the edge checks pass — the same pattern `scripts/deploy.mjs` uses for `check-release-tag`. No escape hatch for the edge checks. | Closed |
| G21 | AI-use policy question asked only at the brief | Asked at first entry, whichever skill that is (`ow-blueprint` scan included); stored once in `profile.md` via `ow-start`. | Closed |
| G22 | Vendor-eval's evidence needs a cross-bundle edge | Declared optional edge Program → Connected. Without Connected, every score is labelled **"vendor-claimed, not independently checked"** and the recommendation memo carries that on its first line. | Closed |
| G23 | No provenance or continuity statement | Admin guide gains: who maintains the pack (one person, named), how key rotation is announced, and that pinned packs keep working offline forever while the paid feed simply stops if maintenance stops. Also documents the Claude for Government member-created-skill switch. | Closed |
| G24 | Release sequencing carried over unexamined | **Correction to §1.3 and §2.3:** ow- no longer stands on 2.1's runtime-free mode — it has its own protocol file and state files. The real prerequisite is the **week-one host spike** only. 2.1 sprint 1 loses its second consumer and must justify itself for the dev catalog alone. The 800-53 proving pack names its delta pair up front (5.1.1 → 5.2.0). | Closed |

**Week-one host spike, consolidated** (each is a yes/no observed on commercial Team/Enterprise first): does a skill-written file persist to the next conversation with a folder attached · is a code tool available to the loader · which web-search and connector switches exist and who controls them · can one plugin read another's files · does the model open `references/ow-protocol.md` before acting · do the host's document tools exist · does a printed `NEXT` get typed.

**Still open after this pass:** the one CRITICAL has a recorded human step but no technical control on standard apps, and that is the honest ceiling; the licence questions (counsel); the HIPAA host; FedRAMP's terms; the free/paid delta line and the commercial name (owner); and every spike item above.
