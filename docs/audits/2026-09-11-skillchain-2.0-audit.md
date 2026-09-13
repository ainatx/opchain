# Skill-chain audit — the 2.0 chain at v1.9.0

**Date:** 2026-09-11 · **Tree:** `4d39b93` (worktree `skillchain-2-audit-fixes-b27bc7`)
**Scope:** all 33 skills, `skills/orchestrator.md`, `oc-checkpoint-protocol`, the 17 live
checkpoints, `scripts/checkpoint.mjs`, `scripts/merge-checkpoint.mjs`, the shipped plugin
(`plugins/opchain/`), the generated catalogs, the routing/eval sets, and the v2.0 plan.
**Method:** `/oc-code-auditor` (Auditor sweep) + `/oc-bug-check` (gate suite), run as a
multi-agent fan-out: 33 per-skill contract extractions, 10 cross-cutting lens finders,
deduped in code, then **every finding adversarially verified** by independent refuters.

**Verification is complete.** 527 findings judged (427 from the first pass, 100 from the
four lenses that were cut off and later re-run). **484 upheld, 43 refuted.** The CRITICAL
tier was additionally confirmed by execution oracle — running the shipped hook, not reading
it. Refuted findings are listed at the end of Appendix A so they are not re-raised.

| Severity | Upheld |
|---|---|
| CRITICAL | 11 |
| HIGH | 82 |
| MEDIUM | 248 |
| LOW | 143 |

**Grade: C.** Down from the C+ of the unverified draft, because the four late lenses found
the live-checkpoint layer to be in worse shape than the skill text, and because two gate
defects turn out to be mutually reinforcing rather than independent. The repo's mechanical
rails are genuinely green: 607 tests, full prebuild chain, zero vulnerabilities, catalogs
and bundles in sync. What is not healthy is the seam between the documented chain and the
executable one. The skills are individually good; they are talking past each other, and the
one gate that actually runs cannot read the checkpoint its own skill writes.

---

## 1. The bug-check gate suite (`/oc-bug-check`)

Full-project scope against this worktree:

| Check | Verdict | Detail |
|---|---|---|
| Type safety | PASS | `astro check` clean; no root TS project by design |
| Lint | UNSUPPORTED | no eslint config or dependency in this repo |
| Tests | PASS | 45 files, **607 tests**, 4.4s; plugin hook suites 13/13 |
| Anti-patterns | PASS | no `debugger`, no `.only`, no empty catch in shipped code |
| Secret detection | PASS | only the scanner's own documentation patterns match |
| Build verification | PASS | full prebuild chain green: 33 skills, catalogs + bundles in sync |
| Dependency scan | PASS | `npm audit` → 0 vulnerabilities |

**Gate verdict: PASS with one UNSUPPORTED.** Nothing in the working tree blocks a commit on
its own merits. Everything below concerns the skill definitions, the plugin and the live
session state, not the deployable Worker.

---

## 2. The CRITICAL tier — eleven upheld

Five were found in the first pass and confirmed by oracle. Six more came from the late
lenses. They cluster into three failures.

### 2a. The commit gate and its skill disagree on the schema, and the disagreement is fatal

`pre-commit-gate.cjs:212` resolves the verdict as `st.last_run_verdict || st.verdict`.
`oc-bug-check/SKILL.md:554` documents the verdict at `skill_state.last_run.verdict`, and the
string `last_run_verdict` appears nowhere in that file. Only the plugin's own slash-command
file names the flat key, and that file is not loaded when oc-git-ops invokes the skill.

Execution oracle, scratch repo, both shapes with a valid fresh tree hash:

```
SKILL.md-shaped (skill_state.last_run.verdict = PASS)  → DENY: "verdict was (none recorded), not PASS"
plugin-command-shaped (skill_state.last_run_verdict)   → ALLOW
```

Three further CRITICALs compound it:

- **The tree binding deadlocks whenever the checkpoint is tracked.** `fullWorkingTree()`
  (`:277`) hashes `git add -A`, so writing the checkpoint changes the tree it just hashed.
  `oc-git-ops:550` and `oc-checkpoint-protocol:490` both tell users *not* to gitignore
  `.checkpoints/`. Oracle: tracked → permanent DENY; the single file ignored → ALLOW. The
  test fixture gitignores `.checkpoints/`, which is why CI never sees it.
- **No `verified_tree` in the documented schema at all**, so even after a schema fix the
  gate falls through to its 10-minute freshness deny.
- **`/oc-git-sync` commits before it runs the gate.** Step 5 structures commits, step 6
  invokes oc-bug-check. Under the shipped PreToolUse hook, step 5's commit is denied because
  no PASS exists yet. The documented order cannot run.

This repo is living it: the live `.checkpoints/oc-bug-check.checkpoint.json` records
`last_run.verdict: PASS` and its own `next_actions[0]` says "gate is green". Running the
shipped hook against this worktree denies the commit.

### 2b. Six shell forms walk through the gate with a FAIL on file

| Command | Result |
|---|---|
| `git commit -m x` | DENY (control) |
| `exec git commit -m x` | **ALLOW** |
| `builtin exec git commit -m x` | **ALLOW** |
| `\git commit -m x` | **ALLOW** |
| `git "commit" -m x` | **ALLOW** |
| `git c\ommit -m x` | **ALLOW** |
| `git $'commit' -m x` | **ALLOW** |

`PREFIX` (`:138`) omits `exec`/`builtin`; quote stripping (`:118`) deletes the span instead
of performing bash quote *removal*. The quoting family is tracked in open PR #505; the
`exec`/`builtin` family is tracked nowhere. Rule 0 of the hook's own header is "FAIL CLOSED".
The converse also bites: this audit's own probe was blocked because `git commit` appeared
inside a quoted loop list (GATE-09, open PR #507).

### 2c. The deploy gate reads state that is stale, contradictory, or absent

- **oc-security-auditor is half the mandatory two-audit gate and has never written a
  checkpoint.** Worse, `scripts/checkpoint.mjs` ignores a positional skill argument
  entirely: `node scripts/checkpoint.mjs status oc-security-auditor` prints the full table
  and exits 0 even though no such file exists. The documented gate command cannot detect its
  own missing half. Verified directly.
- **The audit-reuse window now blocks every deploy.** oc-deploy-ops reuses an oc-code-auditor
  checkpoint under an hour old and blocks on any CRITICAL or on more than three HIGH. This
  audit's own checkpoint satisfies that window with 11 CRITICAL and 82 HIGH — findings about
  skill prose, not the deployable Worker — while `oc-deploy-ops.checkpoint.json` still
  records `audit_gate: {critical: 0, high: 0, result: PASS}`. Two live checkpoints give
  opposite answers to the same gate and nothing reconciles scope.
- **The pre-PR gate has no staleness row.** oc-repo-ops and oc-docs-forge both record PASS
  bound to `3a662ab`, which is not an ancestor of HEAD (it is the pre-squash tip of merged
  PR #498). The git-ops verdict table has three rows and none keyed on `verified_for_sha`,
  so the next session opening any PR reads PASS and inserts a stale docs packet verbatim.
- **The oc-git-ops restamp command corrupts the checkpoint.** `checkpoint.mjs:810-811`
  strips `+` before `:json`, so the documented `--skill_state.merged_prs+:json={…}` writes a
  key literally named `merged_prs+` instead of appending. I hit this independently writing
  this session's own checkpoint.

---

## 3. Do the skills talk to each other?

Mostly they *describe* talking to each other. Computed from frontmatter, not prose.

**Sixteen handoffs name a verb the target does not declare** — `/oc-audit pre-deploy`,
`/oc-audit security`, `/oc-security pre-deploy`, `/oc-security posture`, `/oc-security
compare`, `/oc-security readiness`, `/oc-deploy prod`, `/oc-release verify`, `/oc-scale
loadtest`, `/oc-api build`, `/oc-integrate secrets` and more. oc-code-auditor declares two
verbs while its body documents fifteen and five siblings route to the unlisted ones.
`/oc-rollback` (in `orchestrator.md:328`) and `/oc-git-commit` (the gate trigger in
`orchestrator.md:194`) are declared by no skill at all. Bare `/oc-deploy` is used as the
production verb in two skills and the shared protocol, but oc-deploy-ops defines it as the
menu.

**Five skills believe oc-deploy-ops gates production for them.** oc-agent-forge,
oc-prompt-ops, oc-rag-forge, oc-scale-ops and oc-api-dev each say the deploy gate blocks on
their suite or score. oc-deploy-ops names the first four zero times, and its real gate is
agent-executed prose: `scripts/deploy.mjs` never reads an auditor checkpoint.

**The orchestrator map is not the complete map it claims to be.**
`oc-checkpoint-protocol:362` tells every skill the Upstream/Downstream map covers every
skill. It has 25 rows for 33. Missing: oc-agent-forge, oc-claude-api, oc-prompt-ops,
oc-rag-forge, oc-signal-forge, oc-modularize-ops, oc-fleet-ops. §3 Handoff Points has no row
for any edge those seven declare. §7 is healthier than the v2.0 plan records — **32 of 32
invocable skills have a block**, the #482 backfill landed — but its own house rule is exact
match with the frontmatter description and **11 of 32 differ**.

**Most of the catalog is unreachable through the shipped surfaces.**

| Surface | Coverage |
|---|---|
| Plugin slash commands | 12 files for 32 skills declaring 222 verbs; 20 skills have none, including `/oc-app`, `/oc-git`, `/oc-security`, `/oc-monitor`, `/oc-migrate` |
| MCP intent routing | 17 of 33; 15 unroutable, including every v1.8/v1.9 skill |
| `next-suggestion.cjs` | 16 skills can never be suggested |
| Root `README.md` | claims 33 skills and "this table mirrors it"; omits all four v1.9 skills |
| `/pipeline-builder` | recommends from a 21-skill table frozen at v1.5 |

**The routing eval cannot catch a collision.** `prompts/opchain-eval/eval.yaml` sets a 0.90
pass rate over 28 cases, tolerating exactly two failures — and the two `llm_judge` collision
cases can both fail while the gate stays green. 26 of 28 cases grade with `contains`, the
mode the collision cases' own criteria call insufficient. The catalog's single exact
quoted-phrase collision, "tag the release" (oc-git-ops vs oc-release-ops), is pinned by
neither the routing test nor the eval set.

---

## 4. Are the checkpoints robust?

The wire format and CLI are sound. The contract around them leaks, and the live files have
drifted badly.

**The privacy rule is violated by design, repeatedly.** `oc-checkpoint-protocol:376` says
never read another skill's `skill_state`. At least eleven skills document cross-skill reads
that only `skill_state` can satisfy: agent-forge reads claude-api's `model_routing`, api-dev
and data-ops read stack-forge's decisions, security-hardening reads the auditor's `tier`,
monitoring-ops reads deploy-ops's `pm.deploy_tickets[]`. Either the rule or the eleven edges
has to give.

**30 of 33 skills never point the reader at their own bundled protocol.** Every skill ships
`references/checkpoint-protocol.md`; three name it. The rest say when to checkpoint and
never how — the gap PR #396 tried to close.

**The SessionStart hook garbles the protocol's blessed shape.** `next_actions` may be
`{text, done_when}` objects. `session-state.cjs:88` renders them as `[object Object]`.

**The validator accepts contradictory states** — `blocked` with no blockers, `complete` with
an open `user_decision` blocker. Punchlist item P3c, still open.

**Live-state drift is now the worst layer.** oc-git-ops still lists #498 and #472 as open and
orders the owner to merge them; both merged on 2026-09-11, and its `open_prs` misses nine
genuinely open PRs including the three gate PRs other checkpoints coordinate against.
oc-deploy-ops and oc-release-ops both queue re-baseline work that merged PR #510 already
performed. oc-deploy-ops records staging as serving `fbb24a8` when it has served `213d401`
since 07:09Z. oc-telemetry-ops says metering is ENABLED in its step, summary and all three
next actions while `telemetry_handle.enabled` is `false`. oc-orchestrator is `complete` at
v1.5.0, 81 days stale, three releases behind. oc-app-architect says v1.7.0 is live in the
same file that records v1.9.0 as tagged.

---

## 5. Outputs and inputs

- `oc-claude-api:62` writes `05-llm-design.md`; oc-app-architect produces `11-ai-architecture.md`.
- `oc-api-dev:144` and `orchestrator.md:142` read `03-data-model.md`, which oc-app-architect never generates.
- `oc-telemetry-ops`' export → `/dashboard` handoff has no receiving end, and `/oc-telemetry aggregate` and `export` have no implementation.
- `oc-signal-forge:252` hands `freshness_sla` to oc-monitoring-ops, which has no receiver. Its Evaluator loop also has no iteration ceiling, unlike every other tri-agent skill.
- `oc-modularize-ops` hands a Structural plan to oc-migration-ops, which mentions modularization zero times.
- `oc-dash-forge:349` writes through a nonexistent `create_file` tool to a claude.ai sandbox path; `oc-reverse-spec:486` uses `present_files` and `/home/claude`.
- `scripts/sync-docs.sh` publishes `SKILL.md` only, so the 61 bundled `references/` files the bodies tell the model to read are unreachable over `/docs`, `/llms.txt` and MCP `get_skill`.
- `oc-monitoring-ops/references/alerting-patterns.md:42` and `oc-deploy-ops:420` call `oc-api.telegram.org` and `oc-api.cloudflare.com` — a find-and-replace that corrupted real hostnames, so the default alert channel silently never delivers.
- `/oc-release ship` is circular: step 1's verify gate requires the tag step 3 creates.

---

## 6. Two corrections to the record

**"Nothing built yet" for v2.0 is false.** Both the plan and `oc-app-architect`'s checkpoint
state that no 2.0 code exists. `origin/claude/demo-rebuild-2-0` carries **35 skill
directories**, including complete `skills/oc-hindsight/` and `skills/oc-evolve/`.

**That branch is what staging is serving, and merging it would freeze production deploys.**
All 35 skills there are stamped `version: 1.9.0`. `check-release-tag` compares the working
catalog to the tagged one by skill identity: two added ids with versions agreeing sets
`countDrift: true` — "this tree is the NEXT release still wearing the 1.9.0 number" — and
production deploys are refused until `v2.0.0` is tagged. This is the v2.0 plan's sequencing
constraint 1, arriving early and on an unmerged branch nobody has flagged.

---

## 7. Proposed fixes

Nothing below is applied. Sequenced so nothing lands before what it depends on.

### Tier 0 — make the one real gate true (11 CRITICAL)

1. **Unify the gate schema.** Teach `pre-commit-gate.cjs:212` to read `st.last_run.verdict`
   first-class, document `last_run_verdict` + `verified_tree` in `oc-bug-check/SKILL.md`,
   and add a `test-gate.cjs` fixture in the SKILL.md shape. Coordinate with open PR #499.
2. **Break the tree deadlock.** Exclude the bug-check checkpoint from `fullWorkingTree()`
   via pathspec; add a test with a *tracked* checkpoint that must ALLOW.
3. **Close the prefix family.** Add `exec`/`builtin` to `PREFIX`/`WRAPPER`, replace
   span-deletion with real bash quote removal. Land on top of #505/#507.
4. **Fix `/oc-git-sync` step order** so the gate runs before the commit, not after.
5. **Make `checkpoint.mjs status <skill>` honour its argument** and exit non-zero when the
   file is absent; change the deploy gate's "no audit run" row for the security half from
   warn to block, or record an explicit waiver.
6. **Give audits a scope discriminator** so a skill-docs audit cannot block a Worker deploy,
   and refresh or historicise `oc-deploy-ops.audit_gate`.
7. **Add a staleness row to the pre-PR gate**: PASS is invalid unless `verified_for_sha`
   matches the branch HEAD; have `checkpoint doctor` flag a non-ancestor value.
8. **Fix `oc-git-ops:491`** to `--skill_state.merged_prs:json+=[…]`, make `applyUpdates`
   accept either suffix order, document it, add a unit test.

### Tier 1 — stop the chain asserting false things (82 HIGH)

9. **The 16 undeclared handoff verbs** — widen the targets' frontmatter `commands:` to match
   what siblings already route to, and add a CI check asserting every `/oc-*` verb cited in
   any SKILL.md is declared by its owner.
10. **The five phantom deploy gates** — add the rows to oc-deploy-ops or relabel as advisory.
11. **The modularize → migration handoff** — name the artifact and format, or downgrade the text.
12. **Orchestrator backfill** — 8 Upstream/Downstream rows, §3 handoff rows for the seven
    v1.5/v1.7 skills, 11 drifted §7 blocks; add the exact-match assertion to CI.
13. **Root README** — the four missing v1.9 rows.
14. **Reconcile the drifted live checkpoints** — oc-git-ops, oc-deploy-ops, oc-release-ops,
    oc-telemetry-ops, oc-orchestrator, oc-app-architect, oc-code-auditor.
15. **Harden the routing eval** — pin "tag the release", and either raise the pass rate or
    stop grading collision cases with `contains`.
16. **Fix `/oc-release ship`'s circular verify**, and the `/oc-deploy` menu-vs-verb ambiguity.

### Tier 2 — the checkpoint contract (248 MEDIUM, the spine)

17. **Resolve the `skill_state` privacy contradiction.** Recommended: promote the eleven
    genuinely cross-skill payloads into documented public fields and keep the rule. This is
    protocol work and is the natural content of v2.0 Sprint 1's wire 1.2.
18. **Point every skill at its own bundled protocol** — one sentence, 30 files, checkable.
19. **Fix `session-state.cjs:88`** to render `{text}` objects.
20. **Tighten the validator** — reject `blocked` without blockers and `complete` with an open
    `user_decision` blocker; land as a warning first, then ratchet.

### Tier 3 — reach and surfaces (143 LOW + the rest)

21. Document which 12 commands the plugin registers, or register the rest.
22. Add the 15 missing skills to the MCP intent table.
23. Refresh `/pipeline-builder` off the live catalog.
24. Serve `references/` over `/docs`, `/llms.txt` and MCP, or stop citing unreachable files.
25. Fix the two corrupted hostnames and the claude.ai-sandbox tool/path references.

### Decide separately, before any of the above

`origin/claude/demo-rebuild-2-0` holds 35 skills at `version: 1.9.0` and is deployed to
staging. It is either the start of the v2.0 product half or an abandoned spike. Until that is
decided it is a live hazard: merging it freezes production deploys, and leaving it on staging
means staging advertises two skills the catalog does not have. Also worth parking green:
PR #490 has never run CI on its current head and is conflicting, and by the F9 rule it
itself adds, its `LOCKUP_GENERATION = "2.0"` badge must not deploy ahead of the v2.0 cut —
which means merging it pins every production deploy until that cut.

---

## 8. Method and confidence

- 33 per-skill contract extractions; 10 cross-cutting lenses (orchestrator,
  checkpoint-contract, plugin, tooling-refs, gate-reality, generated-surfaces,
  live-checkpoints, executability, routing, release-plan).
- 552 raw findings deduped to 427; the four late lenses added 100 more; **all 527 were
  adversarially verified** by independent refuters instructed to default to refutation when
  uncertain. CRITICAL and HIGH got three lenses (source-truth, known-or-deferred, impact);
  MEDIUM and LOW got two. 484 upheld, 43 refuted.
- The CRITICAL tier was additionally confirmed by execution oracle: the shipped hook was run
  against constructed repositories rather than reasoned about. Scripts are preserved at
  [`docs/audits/2026-09-11-skillchain-2.0-audit-evidence/`](2026-09-11-skillchain-2.0-audit-evidence/)
  (`gate-probe.mjs`, `verify-clusters.mjs`, `verify-ckpt.mjs`).
- Verification corrected the record. It refuted a finding about a malformed
  `eval_scores+` key that was true when written and fixed during the session. Refuted
  findings are listed at the end of Appendix A.
- **Correction, 2026-09-13.** An earlier version of this report said the author's own
  check had refuted the finding that the validator rejects `+00:00` ISO offsets. That
  check was broken: it ran the CLI from a scratch directory, but the CLI reads the
  repo's own `.checkpoints/` unless `OPCHAIN_CHECKPOINTS_DIR` is set, so it never read
  the fixture. The finding was right, and the adversarial pass upheld it (Appendix A,
  LOW). The same flaw affected the lifecycle-state probe in `verify-ckpt.mjs`; both are
  fixed, and v1.9.1 Sprint 2 accepts offsets and warns on those states.
- Residual risk: the reciprocity-gap and completeness-critic stages never completed, so
  "which skill fails to mention which" is covered by the per-skill extractions rather than
  a dedicated pass. A rerun would likely surface more MEDIUM-tier contract gaps.

---

## Appendix A — all 484 upheld findings, and the 43 refuted

## CRITICAL — upheld (11)

### .checkpoints/oc-bug-check.checkpoint.json:18 — Live oc-bug-check checkpoint writes last_run.verdict; the shipped commit gate reads last_run_verdict — every commit in this repo is denied
*category:* gate-contract · *surfaced by the live-checkpoints lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:45 (C1), :353, :362

**Problem.** JSON path skill_state.last_run.verdict = "PASS" (line 18), matching skills/oc-bug-check/SKILL.md:554-556 exactly. plugins/opchain/hooks/pre-commit-gate.cjs:212 reads `String(st.last_run_verdict || st.verdict || "")` where st = cp.skill_state — neither key exists, so verdict resolves to "" and line 222-223 denies with "last oc-bug-check verdict was (none recorded), not PASS". The live file also carries no skill_state.verified_tree (the gate's fallback binding at :226), so even a schema fix would then hit the freshness deny at :237 once 10 minutes (FRESH_MS, :57) elapse.

**Evidence.** pre-commit-gate.cjs:212 `const verdict = String(st.last_run_verdict || st.verdict || "").toUpperCase();`; :222 `if (verdict !== "PASS") { deny(...) }`. Live checkpoint lines 15-31 contain only `"last_run": { ... "verdict": "PASS" ... }`. Contradicted by the same file's own next_actions[0] (line 13): "No action pending - gate is green."

**Proposed fix.** Make the gate read the documented nested shape (`st.last_run?.verdict ?? st.last_run_verdict ?? st.verdict`) and have oc-bug-check emit skill_state.verified_tree on every run. Until then, correct line 13's claim that the gate is green — it denies.

### .checkpoints/oc-code-auditor.checkpoint.json:65 — The live oc-code-auditor checkpoint sits inside oc-deploy-ops' 1-hour audit-reuse window and blocks every deploy, while oc-deploy-ops' own audit_gate record still asserts PASS
*category:* gate-divergence · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.findings_by_severity = {critical: 6, high: 76, medium: 197, low: 148} (lines 65-70), updated_at 2026-09-12T00:17:30.490Z. oc-deploy-ops/SKILL.md:177-179 states the reuse rule verbatim: "# Reuse the existing checkpoint if it's recent / node scripts/checkpoint.mjs status oc-code-auditor / # If updated_at < 1h old, reuse." — so it is reused. The Gate Rules table (SKILL.md:229-238) then says "CRITICAL findings exist (either audit) | 🚫 Block" and "HIGH findings (> 3 total) | 🚫 Block". Meanwhile .checkpoints/oc-deploy-ops.checkpoint.json:34-41 records audit_gate {critical: 0, high: 0, result: PASS} for SHA 244bf13. Two live checkpoints give opposite answers to the same gate, and nothing reconciles the scope: the 427 findings are about SKILL.md prose and plugin hooks, not the deployable Worker.

**Evidence.** oc-deploy-ops/SKILL.md:231 `| CRITICAL findings exist (either audit) | 🚫 Block — must fix before deploy |`; :233 `| HIGH findings (> 3 total) | 🚫 Block — too many unresolved issues |`. oc-code-auditor skill_state.scope (line 60) still reads "coordination-gaps overhaul changeset" — a label from a prior run, so the gate has no honest scope signal either.

**Proposed fix.** Give skill_state a machine-readable scope/target discriminator (e.g. scope_kind: "runtime-code" | "skill-docs") and have the deploy gate only consider runtime-code audits; refresh oc-deploy-ops.audit_gate or mark it explicitly historical with its SHA.

### .checkpoints/oc-repo-ops.checkpoint.json:36 — oc-repo-ops and oc-docs-forge record PASS + a PR docs packet bound to 3a662ab, a commit that is not an ancestor of HEAD; the git-ops pre-PR gate has no staleness row
*category:* stale-handoff · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.verified_for_sha = 3a662ab30fa9ad1ea1c150ac533efda19909ce56 (line 36) and oc-docs-forge.checkpoint.json:37 carries the same SHA. `git merge-base --is-ancestor 3a662ab HEAD` returns non-zero — it is the pre-squash branch tip of PR #498 (merged 2026-09-11T08:18:21Z, squashed). HEAD is 4d39b93. The git-ops Pre-PR Gate verdict table (skills/oc-git-ops/SKILL.md:337-342) has exactly three rows — PASS / FAIL / (no checkpoint) — and no row keyed on verified_for_sha. So the next session opening any PR reads verdict PASS (line 26) and, per SKILL.md:328-329, inserts skill_state.pr_body_fragment from oc-docs-forge verbatim.

**Evidence.** oc-docs-forge.checkpoint.json:38 pr_body_fragment describes #498's content ("LHCI preview server", "docs/runbooks/release-tag-backfill.md (new; draft procedure for issue #464)"). git-ops SKILL.md:338 `| PASS | Proceed to \`gh pr create\` |`. Both checkpoints are status:complete with next_actions: [].

**Proposed fix.** Add a staleness row to the git-ops Pre-PR Gate table: treat verdict PASS as invalid unless skill_state.verified_for_sha equals the branch HEAD being PR'd; re-invoke oc-docs-forge → oc-repo-ops otherwise. Have `checkpoint doctor` flag a verified_for_sha that is not an ancestor of HEAD.

### plugins/opchain/hooks/pre-commit-gate.cjs:138 — `exec git commit` (and prefix/quote-split forms) pass through the gate fail-open — PREFIX list omits `exec`, quote stripping deletes the subcommand token
*category:* gate-reality · *known:* PR #505 (open) GATE-08 for the quote/substitution forms only

**Problem.** The PREFIX alternation (line 138) lists nice/stdbuf/time/setsid/flock/ionice/timeout/env/command/sudo/nohup/xargs but not `exec`, and it is not in WRAPPER (line 149) either, so `exec git commit` is never in command position. Separately, `stripped` deletes quoted spans (line 118), so `git "commit"`, `git com"m"it`, `git $'commit'`, `git ${c:-commit}` and backslash-escaped `\git` / `git c\ommit` lose the `commit` (or `git`) token and match nothing. Every one of these is an ALLOW with a FAIL verdict on file — rule 0 ('FAIL CLOSED', line 36) is violated by the matcher itself. None of the 35 test cases covers these forms.

**Evidence.** Probe against the shipped gate in a scratch repo with `last_run_verdict: FAIL`: `exec git commit -m x` → ALLOW; `\git commit -m x` → ALLOW; `git "commit" -m x` → ALLOW; `git com"m"it -m x` → ALLOW; `git ${c:-commit} -m x` → ALLOW; `git c\ommit -m x` → ALLOW; `git $'commit' -m x` → ALLOW; control `git commit -m x` → DENY. pre-commit-gate.cjs:138 PREFIX has no `exec`; :118 `.replace(/'[^']*'|"[^"]*"/g, "")`.

**Proposed fix.** Add `exec` (and `builtin`) to PREFIX and WRAPPER; instead of deleting quoted spans, perform bash-style quote removal (concatenate the literal content) before matching, and reject/deny on unexpanded parameter expansions in the git/commit token positions; add DENY regression cases for each form to test-gate.cjs. Quote-removal/substitution forms are tracked as GATE-08 in open PR #505; the `exec` form is tracked nowhere.

### plugins/opchain/hooks/pre-commit-gate.cjs:212 — Gate reads skill_state.last_run_verdict/verdict but oc-bug-check's documented schema (and a real run today) writes skill_state.last_run.verdict — every honest PASS is denied as '(none recorded)'
*category:* cross-skill-contract · *independently reported 3×* · *known:* PR #499 (open, unmerged) — not in coordination-gaps-punchlist.md or v2.0 §4.4

**Problem.** The PreToolUse commit gate reads `st.last_run_verdict || st.verdict` (line 212) and `st.verified_tree || st.verified_for_tree` (line 226) from oc-bug-check's skill_state. The owning skill's SKILL.md documents only the nested shape `skill_state.last_run.verdict` (lines 554-556) plus run_history/bypasses/carried_debt/streak (lines 543-548, 570-577) and contains zero occurrences of `verified_tree` or `last_run_verdict` (grep). Only the plugin slash command plugins/opchain/commands/oc-bugcheck.md:8-9 names the flat keys, so a skills-only (zip) install or any session that follows SKILL.md writes a checkpoint the gate cannot read: it denies with `last oc-bug-check verdict was (none recorded), not PASS`. The live .checkpoints/oc-bug-check.checkpoint.json written today (2026-09-11) has exactly this shape (`skill_state.last_run.verdict: PASS`, no last_run_verdict, no verified_tree) and would be denied by the gate.

**Evidence.** pre-commit-gate.cjs:212 `const verdict = String(st.last_run_verdict || st.verdict || "").toUpperCase();`. skills/oc-bug-check/SKILL.md:554-556 `"last_run": { "at": ..., "verdict": "PASS"`. .checkpoints/oc-bug-check.checkpoint.json (written 2026-09-11) has `skill_state.last_run.verdict: "PASS"` and no `last_run_verdict`. Reproduced: `printf '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"},"cwd":"<worktree>"}' | node plugins/opchain/hooks/pre-commit-gate.cjs` → `permissionDecision: deny ... last oc-bug-check verdict was (none recorded), not PASS`. The gate's own fixtures use the non-canonical key (test-gate.cjs:77 `const st = { last_run_verdict: opts.verdict }`), so CI (ci.yml:33-36 `npm run test:hooks`) is green against a schema no skill produces. Only plugins/opchain/commands/oc-bugcheck.md:7-9 tells the session to write `last_run_verdict`, contradicting the SKILL.md it invokes.

**Proposed fix.** Make the hook read the canonical nested key first (`st.last_run && st.last_run.verdict`) and keep `last_run_verdict`/`verdict` as fallbacks; change test-gate.cjs fixtures to the nested shape (keep one flat-key fixture for back-compat); rewrite plugins/opchain/commands/oc-bugcheck.md:7-9 to name `skill_state.last_run.verdict`; add a Vitest contract test that parses the schema block in skills/oc-bug-check/SKILL.md and asserts the gate accepts it.

### plugins/opchain/hooks/pre-commit-gate.cjs:277 — Tree-bound PASS can never match when the bug-check checkpoint is tracked — which oc-git-ops and oc-checkpoint-protocol tell every user to do; gate deadlocks and its remedy re-creates the mismatch
*category:* gate-reality

**Problem.** fullWorkingTree() hashes `git add -A -- .` (line 277), i.e. every non-ignored file. The skill must hash the tree BEFORE writing the checkpoint that carries that hash, so writing `.checkpoints/oc-bug-check.checkpoint.json` itself changes the tree unless that file is gitignored. This repo gitignores it privately (.gitignore:91; .checkpoints/README.md:30-38) but nothing shipped says so: oc-git-ops SKILL.md:550 says 'Do **not** gitignore `.checkpoints/`', oc-checkpoint-protocol SKILL.md:490 says the same, the gitignore list at oc-git-ops:539-547 omits the file, and plugins/opchain/README.md and commands/oc-bugcheck.md never mention it. The test suite hides this because its fixture gitignores `.checkpoints/` (test-gate.cjs:52).

**Evidence.** Empirical probe (scratch repo, `.checkpoints/` not ignored, verified_tree computed with the gate's own `git add -A` method immediately before writing the checkpoint): `git commit -m x` → DENY 'the repo has changed since oc-bug-check passed'; re-running exactly as the deny text instructs → DENY again; adding `.checkpoints/oc-bug-check.checkpoint.json` to .gitignore → ALLOW. skills/oc-git-ops/SKILL.md:550 `Do **not** gitignore `.checkpoints/` by default`; test-gate.cjs:52 `fs.writeFileSync(path.join(dir, ".gitignore"), ".checkpoints/\n");`.

**Proposed fix.** Either exclude `.checkpoints/oc-bug-check.checkpoint.json` from the hash in fullWorkingTree() (pathspec `:!.checkpoints/oc-bug-check.checkpoint.json`) or ship the gitignore rule as a contract: add it to oc-git-ops §.gitignore Enforcement, oc-bug-check SKILL.md, commands/oc-bugcheck.md, and plugins/opchain/README.md; add a test-gate case with a tracked checkpoint that must ALLOW.

### skills/oc-bug-check/SKILL.md:552 — oc-bug-check's documented checkpoint carries no verified_tree, so the shipped gate denies any commit made more than 10 minutes after a PASS
*category:* gate-schema-mismatch · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md C1/C2 and 'plugins/opchain/commands/oc-bugcheck.md:9' cover the verdict-key and write-tree-vs-add-A mis

**Problem.** The shipped commit gate binds a PASS to a working-tree hash: `pre-commit-gate.cjs:226` reads `st.verified_tree || st.verified_for_tree`, and when that is absent `:237` denies any commit where `updated_at` is older than FRESH_MS (`:57` = 10 minutes). The gate's own comment at `:266` asserts 'oc-bug-check records `verified_tree` the same way (`git add -A`)'. It does not: the string `verified_tree` does not appear anywhere in skills/oc-bug-check/SKILL.md (grep -> 0 hits). The Checkpoint Schema field table (:542-548) and the skill_state example (:552-581) list last_run / run_history / bypasses / carried_debt / config_hash / streak and nothing else. A session that writes the checkpoint exactly as documented gets a 10-minute commit window and then a hard deny with no documented remedy.

**Evidence.** grep -n 'verified_tree' skills/oc-bug-check/SKILL.md -> no matches. skills/oc-bug-check/SKILL.md:542-548 field table (last_run, run_history, bypasses, carried_debt, config_hash); :552-581 skill_state JSON. plugins/opchain/hooks/pre-commit-gate.cjs:226 `const verifiedTree = st.verified_tree || st.verified_for_tree || null;`; :237 `if (!verifiedTree && Math.abs(Date.now() - ts) > FRESH_MS)`; :57 `const FRESH_MS = 10 * 60 * 1000;`; :266 comment claiming oc-bug-check records it.

**Proposed fix.** Add `verified_tree` to the Checkpoint Schema field table and the skill_state example in oc-bug-check/SKILL.md, with the exact recipe the gate uses (`git add -A` in a scratch index, then `git write-tree`), and state that a run without it only satisfies the gate for 10 minutes. Reconcile with plugins/opchain/commands/oc-bugcheck.md:9, which tells the skill to record plain `git write-tree` (index-only) instead.

### skills/oc-bug-check/SKILL.md:554 — Documented checkpoint verdict shape is unreadable by the shipped plugin commit gate
*category:* gate-reality · *independently reported 2×* · *known:* Not in coordination-gaps-punchlist.md, the v2.0 plan §4.4 (row 4 at :695 treats `last_run` as canonical; :616 says the skill has 'first mention of any

**Problem.** SKILL.md documents the verdict only as nested `skill_state.last_run.verdict` (:544 table, :554-556 example) and never mentions `last_run_verdict` or `verified_tree`. The plugin PreToolUse gate that CHANGELOG 1.8.2 (:253-254) says 'blocks git commit unless oc-bug-check recorded a PASS' reads only the flat keys `skill_state.last_run_verdict || skill_state.verdict` (pre-commit-gate.cjs:211-212) and binds to `skill_state.verified_tree` (:226); it never looks at `last_run.verdict`. A checkpoint written exactly per SKILL.md is denied with 'last oc-bug-check verdict was (none recorded), not PASS' (:222-223) and the deny text tells the model to re-run the same skill — a closed loop. The repo-local hook reads the opposite (nested) shape (.claude/hooks/pre-commit-bugcheck.sh:86-87), so the two gates disagree on the schema and the only reconciliation lives in the plugin slash-command file (plugins/opchain/commands/oc-bugcheck.md:7-9), which is not consulted when oc-git-ops invokes the skill via Skill(skill="oc-bug-check") (oc-git-ops/SKILL.md:234).

**Evidence.** grep -n 'last_run_verdict\|verified_tree' skills/oc-bug-check/SKILL.md → 0 hits. pre-commit-gate.cjs:211-212 `const st = cp.skill_state…; const verdict = String(st.last_run_verdict || st.verdict || "")`; :226 `st.verified_tree || st.verified_for_tree`. test-gate.cjs:77 fixtures only ever write `{ last_run_verdict }`. The live checkpoint written today (.checkpoints/oc-bug-check.checkpoint.json:16-18) has `skill_state.last_run.verdict: "PASS"` and no flat key or tree hash. git log -S last_run_verdict → introduced c440c7b (v1.8.2, #411) on 2026-07-24; SKILL.md not updated since.

**Proposed fix.** Add a 'Gate contract' subsection to Checkpoint Schema documenting the two mandatory writes the plugin reads — `skill_state.last_run_verdict` (PASS|FAIL|UNSUPPORTED) and `skill_state.verified_tree` (= `git write-tree` from a scratch index after `git add -A`, matching pre-commit-gate.cjs:266) — alongside the existing `last_run` object; or make the hook also accept `last_run.verdict`. Make .claude/hooks/pre-commit-bugcheck.sh and the plugin read the same shape, and add a test-gate.cjs fixture for a SKILL.md-shaped checkpoint so the schism cannot recur.

### skills/oc-deploy-ops/SKILL.md:192 — oc-security-auditor is half the mandatory two-audit deploy gate but has never written a checkpoint, and `checkpoint.mjs status <skill>` silently ignores its argument so the absence produces no signal
*category:* missing-state · *surfaced by the live-checkpoints lens*

**Problem.** skills/oc-deploy-ops/SKILL.md:165-172 says both audits "must pass for /oc-deploy staging and /oc-deploy prod to proceed", and :191-193 instructs `node scripts/checkpoint.mjs status oc-security-auditor` then "# Reuse if updated_at < 24h old". No .checkpoints/oc-security-auditor.checkpoint.json exists (16 of 33 skills have none). Worse, scripts/checkpoint.mjs:977 dispatches `case "status": return cmdStatus({ brief, since })` — no positional skill argument is read (usage at :988 confirms `status [--brief] [--since=ISO]`). Running the exact documented command prints the full 17-row table and exits 0, so a session can read a neighbouring skill's updated_at as the security auditor's and satisfy the 24h reuse window that in fact has no backing record.

**Evidence.** Verified: `node scripts/checkpoint.mjs status oc-security-auditor` prints the whole session-state table, exit 0. `ls .checkpoints/` shows no oc-security-auditor file. oc-deploy-ops.checkpoint.json:34-41 audit_gate records no security-auditor row yet asserts result PASS / independent_review SHIP for the v1.9 gate.

**Proposed fix.** Make `status <skill>` accept and honour the positional argument, and exit non-zero with "no checkpoint for <skill>" when the file is absent; change the deploy gate's "No audit run" row from ⚠️ Warn to a block for the security half, or record an explicit waiver in oc-deploy-ops.audit_gate.

### skills/oc-git-ops/SKILL.md:373 — /oc-git-sync commits before it runs the bug-check gate, and the shipped plugin denies that commit
*category:* gate-ordering-deadlock · *surfaced by the executability lens*

**Problem.** The `/oc-git-sync` numbered flow at :370-373 is: 4. Stage changes -> 5. Structure commits -> 6. Run oc-bug-check gate. The gate therefore runs AFTER `git commit` has already been issued, directly contradicting the same file's Pre-Commit Gate rule at :227 ('Before staging files or running `git commit`, invoke the oc-bug-check skill'). Step 6's remedy text ('FAIL aborts the sync') is unreachable for the commit it was supposed to gate, because the commits already exist. With the shipped opchain plugin installed, the flow cannot even reach step 6: `plugins/opchain/hooks/pre-commit-gate.cjs:196` denies every `git commit` when `.checkpoints/oc-bug-check.checkpoint.json` does not exist, and step 5 is the first `git commit`. A session following /oc-git-sync on a clean repo stalls at step 5 with a deny whose remedy (run the gate) is step 6.

**Evidence.** skills/oc-git-ops/SKILL.md:371 `4. **Stage changes**`; :372 `5. **Structure commits** — group by logical unit`; :373 `6. **Run oc-bug-check gate** — invoke Skill(skill="oc-bug-check", args="/oc-bugcheck run")`. Contradicted by :227 `**Before staging files or running \`git commit\`, invoke the oc-bug-check skill.**`. plugins/opchain/hooks/pre-commit-gate.cjs:196-198 `if (!fs.existsSync(cpPath)) { deny("opchain: oc-bug-check has not run in this repo, so this commit is unverified." ...) }`.

**Proposed fix.** Renumber /oc-git-sync so the bug-check gate is step 5 and 'Structure commits' is step 6, matching :227 and the orchestrator handoff row (skills/orchestrator.md:194). Also add the gate to the 'typical flow' list at :74-79, which omits it entirely.

### skills/oc-git-ops/SKILL.md:491 — Documented merged_prs append command writes a bogus `merged_prs+` key instead of appending
*category:* executability

**Problem.** The one sanctioned way to restamp oc-git-ops ("The single update is:") uses `--skill_state.merged_prs+:json={...}`. scripts/checkpoint.mjs applyUpdates strips a trailing `+` BEFORE it strips `:json` (checkpoint.mjs:810-811), so with the suffixes in this order the `+` is never seen: isAppend stays false, the key becomes the literal string `merged_prs+`, and the value REPLACES a new scalar key rather than appending to the array. Executed directly: `{skill_state:{merged_prs:[1]}}` + the documented arg → `{merged_prs:[1],"merged_prs+":{pr:2}}`. The reverse order `--skill_state.merged_prs:json+=` appends correctly. The validator does not inspect skill_state keys (free-form), so the corruption is silent and the real merged_prs array is never updated.

**Evidence.** skills/oc-git-ops/SKILL.md:490-493: `node scripts/checkpoint.mjs update oc-git-ops \ "--skill_state.merged_prs+:json={...}" ...`. scripts/checkpoint.mjs:810: `if (lhs.endsWith("+")) { isAppend = true; ... }` then :811: `if (lhs.endsWith(":json")) { isJson = true; ... }`. Header comment :796-798 documents only `--key+=value` and `--key:json=...`, never the combined form. Reproduced via node: plus-then-json → {"merged_prs":[1],"merged_prs+":{"pr":2}}; json-then-plus → {"merged_prs":[1,{"pr":2}]}. No hit for `merged_prs+` in docs/plans, docs/audits, or .checkpoints.

**Proposed fix.** Change SKILL.md:491 to `"--skill_state.merged_prs:json+=[{...}]"` (and document the combined-suffix order in checkpoint.mjs:796-798), OR make applyUpdates strip suffixes in either order (loop until neither `+` nor `:json` remains). Add a unit test for the combined form.


## HIGH — upheld (82)

### .checkpoints/oc-app-architect.checkpoint.json:143 — oc-app-architect.skill_state.prior_release says v1.7.0 is the live release and v1.8 is TBD, in the same file that records v1.9.0 as tagged
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.prior_release (lines 143-149) = {version: "1.7.0", theme: "Seams & Signals", shipped_at: "2026-06-26", status: "live", next_theme: "v1.8 TBD via /oc-release plan (calendar slot 2026-07-29)"}. The same file's skill_state.v19_release (line 260) describes the shipped v1.9 catalog 29→33 and skill_state.v20_release.ground_truth.last_tag (line 347) reads "v1.9.0@244bf13 (2026-09-02)". The file was last written 2026-09-08T22:02:27Z, six days after v1.9.0 shipped, and prior_release was left untouched. It carries no date qualifier, unlike ground_truth which at least carries planned_at.

**Evidence.** Line 147 `"status": "live"` for 1.7.0 versus line 347 `"last_tag": "v1.9.0@244bf13 (2026-09-02)"`. git tag confirms v1.8.0–v1.8.3 and v1.9.0 all exist.

**Proposed fix.** Set prior_release to {version: "1.9.0", shipped_at: "2026-09-02", tag: "v1.9.0", sha: "244bf13", next_theme: "v2.0 The self-improving pipeline"} or delete the block in favour of reading oc-release-ops.

### .checkpoints/oc-code-auditor.checkpoint.json:29 — The 2026-09-11 graded sweep appended no eval_scores entry, so the grade C+ that oc-deploy-ops and oc-orchestrator read as trend is missing from the series
*category:* missing-emission · *surfaced by the live-checkpoints lens*

**Problem.** skills/oc-code-auditor/SKILL.md:397-399 states "On each graded sweep, code-auditor appends to the wire-1.1 eval_scores checkpoint field, mapping the grade to a 0..10 score" with the fixed mapping at :409-410 ("A≈9.5, B≈8, C≈6.5, D≈4, F≈2, nudge ±0.5"). The live eval_scores array (lines 29-57) has two entries, the newest at 2026-08-22T03:20:00Z (score 4.5). skill_state.grade is "C+" (line 74) from the 2026-09-11 sweep — score ≈7.0 — and was never appended. SKILL.md:412-414 says oc-telemetry-ops aggregates these into eval_score_trend and oc-orchestrator reads a downward trend as a "schedule the next audit" signal; the trend therefore reads 8.0 → 4.5 and stops before the most recent grade.

**Evidence.** eval_scores[1].at = "2026-08-22T03:20:00Z" (line 46); skill_state.grade = "C+" (line 74) with updated_at 2026-09-12T00:17:30.490Z (line 7). No third entry exists.

**Proposed fix.** Append {rubric: "oc-code-auditor", score: 7.0, max: 10, at: <sweep time>, ref: "docs/audits/2026-09-11-skillchain-2.0-audit.md"} and make the checkpoint write path refuse to record a new grade without a matching eval_scores entry.

### .checkpoints/oc-code-auditor.checkpoint.json:71 — oc-code-auditor.progress_summary says "No fixes applied" while skill_state records fixes_applied: 9 and fixes_verified: 9
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** progress_summary (line 11) ends "Report: docs/audits/2026-09-11-skillchain-2.0-audit.md. No fixes applied - awaiting approval on the tiered plan in section 6." and blockers[0] (line 15-18) says "Nothing is applied yet." skill_state.fixes_applied = 9 and fixes_verified = 9 (lines 71-72), with mode "auditor-sweep" and scope "coordination-gaps overhaul changeset" (lines 59-60) — all carried over unchanged from a prior run. skills/oc-code-auditor/SKILL.md:434-445 documents these as the live counters for the current sweep. Any reader that trusts the structured field over the prose concludes nine fixes landed in a changeset that no longer exists.

**Evidence.** Line 11 "No fixes applied"; lines 71-73 `"fixes_applied": 9, "fixes_verified": 9, "fixes_rejected": 0`. Line 60 scope still names the coordination-gaps changeset while line 11 describes a 33-skill chain audit.

**Proposed fix.** Zero fixes_applied/fixes_verified for the new sweep and set scope to the actual target ("opchain skill chain at 4d39b93"), or move the prior run's counters into skill_state.last_audit alongside the 2026-08-22 record.

### .checkpoints/oc-code-auditor.checkpoint.json:75 — oc-code-auditor.skill_state.verified_tree points at the tree of a 2026-07-19 commit, not the 4d39b93 tree the audit claims to cover
*category:* false-provenance · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.verified_tree = "7c59d269ca269bc10035b0bbd706697df230b920" (line 75). `git cat-file -t` says that is a tree, and `git log --all --format='%H %T'` shows it is the tree of 85abb64 "docs(reports): weekly token+cost audit 2026-07-19 (#403)". HEAD's tree is fe987568114f1c840958db8309e9312e5dd1e572. progress_summary (line 11) asserts the audit was of "tree 4d39b93". verified_tree is the provenance field punchlist P3d wants promoted and the field the commit gate binds verdicts to (pre-commit-gate.cjs:226) — a 54-day-old value silently vouches for content that has changed under it.

**Evidence.** git rev-parse HEAD^{tree} = fe98756…; 7c59d26 is the tree of 85abb64/d9188dd (2026-07-19). The checkpoint is also uncommitted (`git status` shows ` M .checkpoints/oc-code-auditor.checkpoint.json`).

**Proposed fix.** Recompute verified_tree from the audited worktree (`git add -A && git write-tree`) on every sweep, and have checkpoint validate reject a verified_tree that resolves to a tree not reachable from HEAD.

### .checkpoints/oc-code-auditor.checkpoint.json:94 — docs/audits/2026-09-11-skillchain-2.0-audit.md — the 594 KB artifact the approval gate depends on — is untracked and would be lost by any clean checkout
*category:* unpersisted-artifact · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.report_path = "docs/audits/2026-09-11-skillchain-2.0-audit.md" (line 94), blockers[0].description (line 15) and next_actions[0] (line 22) both tell the owner to review "section 6" of it, and the whole checkpoint is status: blocked pending that review. `git status --porcelain --untracked-files=all docs/audits/` reports it as `??` — it exists only in this worktree's working directory (594038 bytes). The checkpoint that points at it is itself uncommitted (` M`). A `git checkout`, worktree removal, or a fresh clone leaves a blocked checkpoint pointing at nothing.

**Evidence.** `git status --porcelain --untracked-files=all docs/audits/` → `?? docs/audits/2026-09-11-skillchain-2.0-audit.md`. The v2.0 plan's decision D-D (oc-app-architect.checkpoint.json:388) makes docs/audits/ "the default for durable audit reports" — durable implies committed.

**Proposed fix.** Commit the report (and the oc-code-auditor checkpoint that references it) before the session ends; add a doctor check that report_path / generated_files entries which exist but are untracked-and-not-ignored are warned as unpersisted.

### .checkpoints/oc-deploy-ops.checkpoint.json:14 — oc-deploy-ops' three laptop next_actions were completed by merged PR #510; the baseline it asks to be written already carries the values
*category:* stale-next-actions · *surfaced by the live-checkpoints lens*

**Problem.** next_actions[0] (line 14) asks to record the deployment/version ids "in .github/monitoring/release-baseline.json with sourceSha 78567c2d70e6f00836000e4bd6bbad842ba04a42"; next_actions[2] (line 16) asks to "open the baseline PR, dispatch Canary and Deploy lag after merge". PR #510 (MERGED 2026-09-11T14:23:51Z, 534152d) did all of it: .github/monitoring/release-baseline.json:10-14 now carries the `runtime` block with sha 78567c2, :20-21 carries deploymentId 8da6c19d / versionId b6268c62, and oc-monitoring-ops.checkpoint.json:11 records dispatch runs 34609906583 and 34609909497 as success. oc-deploy-ops updated_at is 2026-09-11T04:05:36.049Z and was never restamped.

**Evidence.** release-baseline.json:11 `"sha": "78567c2d70e6f00836000e4bd6bbad842ba04a42"`; :21 `"versionId": "b6268c62-48e8-4c30-a0c6-fea074ae260c"`. gh: 510 MERGED 2026-09-11T14:23:51Z. `checkpoint doctor` cannot see this — its stale-action detector (scripts/checkpoint.mjs:154-159, harvestTokens) only matches `#\d+` and `ABC-123` tokens, and none of these three actions names a PR.

**Proposed fix.** Clear next_actions[0] and [2], set skill_state.cloudflare_version_id to b6268c62-48e8-4c30-a0c6-fea074ae260c, and flip progress_table id baseline-refresh (line 169-171) from blocked to complete.

### .checkpoints/oc-deploy-ops.checkpoint.json:21 — oc-deploy-ops records staging as serving fbb24a8; staging has served 213d401 since 2026-09-11T07:09Z and oc-monitoring-ops says so
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.staging_version = "fbb24a8" (line 21) and skill_state.unrecorded_deploy.staging_live_version = "fbb24a8" (line 146). The live truth is 213d401: .github/monitoring/release-baseline.json:78 records "staging intentionally serves an off-main branch preview (claude/demo-rebuild-2-0 @ 213d401, deployed 2026-09-11T07:09Z)" and oc-monitoring-ops.checkpoint.json:217 records live_version 213d401 with deployment 6863e5bc. The two checkpoints also give opposite instructions: oc-deploy-ops next_actions[1] (line 15) says redeploy staging from main@78567c2 now; oc-monitoring-ops next_actions[1] (line 52) says keep the preview until it is no longer needed.

**Evidence.** deploy-ops:21 `"staging_version": "fbb24a8"` vs monitoring-ops:217 `"live_version": "213d401"`. Both fbb24a8 and 213d401 resolve as commits. deploy-ops updated 04:05Z; the 213d401 staging deploy happened 07:09Z.

**Proposed fix.** Update staging_version/staging_live_version to 213d401 with its deployment id, and reword next_actions[1] to defer to the owner decision oc-monitoring-ops records rather than contradict it.

### .checkpoints/oc-git-ops.checkpoint.json:165 — oc-git-ops still lists #498 and #472 as open and orders the owner to merge them; both merged 2026-09-11
*category:* stale-next-actions · *surfaced by the live-checkpoints lens*

**Problem.** status is in_progress (line 10), step is "pr-498-awaiting-review" (line 9), skill_state.open_prs (line 173) lists #498 (line 175) and #472 (line 182) as open, and next_actions[0] (line 165) reads "Owner: review and merge #498 (squash)" with next_actions[1] "After #498 merges: bring #472 ... squash-merge". `gh pr view` reports #498 MERGED 2026-09-11T08:18:21Z and #472 MERGED 2026-09-11T08:23:54Z; both are in HEAD's history. updated_at is 2026-09-11T07:35:00.809Z — the session never restamped after the merges.

**Evidence.** gh: 498 MERGED 2026-09-11T08:18:21Z; 472 MERGED 2026-09-11T08:23:54Z. `node scripts/checkpoint.mjs doctor` already emits three warnings for this. A resuming session that reads next_actions[0] literally re-attempts a merge of a closed PR and re-derives the whole dependency chain from a false premise.

**Proposed fix.** Move #498 and #472 from open_prs to merged_prs with their merge SHAs, drop next_actions[0]-[1], and set status to complete (or restate the remaining owner-only branch-deletion items as the queue).

### .checkpoints/oc-git-ops.checkpoint.json:173 — oc-git-ops.open_prs misses nine genuinely open PRs, including the three gate PRs other checkpoints coordinate against
*category:* stale-state · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.open_prs (lines 173-192) holds exactly three entries — #498 (merged), #472 (merged), #490. `gh pr list --state open` returns twelve: 511, 507, 506, 505, 504, 502, 500, 499, 494, 490, 407, 402. oc-git-ops is the skill orchestrator.md:144 names as the owner of branch/PR state and that oc-release-ops reads for the "merged-PR list" (orchestrator.md:150), so nine open PRs are invisible to every downstream reader.

**Evidence.** gh pr list --state open: 511, 507, 506, 505, 504, 502, 500, 499, 494, 490, 407, 402. open_prs contains only 498/472/490, two of which are merged.

**Proposed fix.** Repopulate open_prs from `gh pr list --state open --json number,title,headRefName,isDraft` at every oc-git-ops write, rather than appending session-local entries.

### .checkpoints/oc-orchestrator.checkpoint.json:9 — oc-orchestrator is status:complete at v1.5.0, 81 days stale, three minor releases behind oc-release-ops
*category:* contradiction · *surfaced by the live-checkpoints lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:194 §4 Live-state drift

**Problem.** step = "v1.5.0-shipped-and-live" (line 9), status = complete (line 10), progress_summary (line 11) = "v1.5.0 'Build the AI app' is SHIPPED and LIVE on opchain.dev (2026-06-22)", next_actions[0] = "Next theme is v1.6 'Cost & telemetry' ... the first oc-checkpoint-protocol bump since v1.2 (adds cost, eval_scores, telemetry_handle)". Ground truth: v1.9.0 tagged 2026-09-02 at 244bf13, catalog 33 skills, wire 1.1 shipped with v1.6 long ago; oc-release-ops.checkpoint.json:10 is status complete at "v1.9-release-signed-off". The orchestrator is the skill every other skill's routing defers to (orchestrator.md:134), so its cold-start view of the pipeline is four releases out of date.

**Evidence.** `git tag` → v1.8.0 v1.8.1 v1.8.2 v1.8.3 v1.9.0. checkpoint status reports "⚠ 81d stale". oc-release-ops skill_state.current_release.semver = 1.9.0. The orchestrator's skill_state also still names Linear ADEV-327 as the active parent.

**Proposed fix.** Reset oc-orchestrator to the v1.9.0 post-release state (or `checkpoint reset oc-orchestrator` to archive it), and populate skill_state.registry, which it has never contained.

### .checkpoints/oc-release-ops.checkpoint.json:82 — oc-release-ops next_actions[0] orders the 78567c2 re-baseline that merged PR #510 already performed, and skill_state.monitoring.continuous_status asserts it is still pending
*category:* stale-next-actions · *surfaced by the live-checkpoints lens*

**Problem.** next_actions[0] (line 82): "Laptop: bless the 2026-09-05 production deploy of 78567c2 by refreshing .github/monitoring/release-baseline.json (deployment 8da6c19d-...), redeploying staging from the same SHA, verifying with cloudflare-monitor.mjs, and opening the baseline PR." skill_state.monitoring.continuous_status (line 224) states "stale since 2026-09-05: production moved to 78567c2 without a baseline refresh; re-baseline pending on the laptop". PR #510 merged 2026-09-11T14:23:51Z; the baseline's runtime block and production deploymentId/versionId are written. The checkpoint is status:complete (line 10) with updated_at 2026-09-11T04:05:36.112Z.

**Evidence.** release-baseline.json:10-14 runtime block present; :20 deploymentId 8da6c19d-a89a-4214-8e58-4606c7ce2f72. oc-monitoring-ops.checkpoint.json:138 continuous_monitoring_status now reads "production baseline matches since PR #510". doctor does not flag it — the action names no #N token.

**Proposed fix.** Drop next_actions[0], set monitoring.continuous_status to match oc-monitoring-ops, and record runtime_pull_request: 510 alongside baseline_pr: 478 (line 217).

### .checkpoints/oc-telemetry-ops.checkpoint.json:11 — oc-telemetry-ops says metering is ENABLED in step, progress_summary and all three next_actions while telemetry_handle.enabled is false
*category:* contradiction · *surfaced by the live-checkpoints lens* · *known:* docs/plans/coordination-gaps-punchlist.md:28 (0.4); docs/audits/2026-09-11-skillchain-2.0-audit.md:194 §4 Live-state drift

**Problem.** step = "metering-enabled" (line 9); progress_summary (line 11) = "Opt-in local metering is ENABLED. Skill/phase runs are recorded to .checkpoints/usage.sqlite"; next_actions (lines 13-15) tell the next session to "Let the pipeline run — metered rows accumulate" and then aggregate/export. telemetry_handle.enabled = false (line 18) and its own note (line 22) says "Set false 2026-07-20". The protocol is explicit that presence is not consent: skills/oc-checkpoint-protocol/SKILL.md:695-697 "Default stance is OFF — the field's mere presence is not consent; enabled: true is." updated_at is 2026-06-26T01:52:35.464Z, so the 2026-07-20 flip was made without restamping — the narrative half was never reconciled with the flag half.

**Evidence.** Line 18 `"enabled": false` vs line 11 "metering is ENABLED". Punchlist item 0.4 (docs/plans/coordination-gaps-punchlist.md:28-33) instructed only the flag flip, which is why the prose survived. usage.sqlite is gitignored (.gitignore:96) and absent.

**Proposed fix.** Rewrite step to "metering-disabled", rewrite progress_summary to state that consent is off and why, and replace the three next_actions with the one real action (move consent out of tracked state per the checkpoint's own note), then restamp updated_at.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:453 — Three mutually incompatible eval verdict enums across the plan; §4.4 claims §3.2 was restated but §3.2 still carries the withdrawn value
*category:* contract-drift · *surfaced by the release-plan lens* · *known:* §4.4 row 4 (:695); docs/releases/2.0-plan.md:495 carries the older "binary PASS/FAIL" wording

**Problem.** §3.2 (:453-454) says the harvested bug-check verdict "is three-valued, PASS / PASS-with-warnings / FAIL, plus per-check `UNSUPPORTED`". §4.4 row 4 (:695) explicitly withdraws that ("'PASS-with-warnings' is not a verdict value") and says its resolution is "§3.2 harvest row restated" — but §3.2 was never edited. Appendix C (:1336) defines a third enum for the wire-1.2 field: `"verdict": "FAIL", // optional: PASS | FAIL | WARN`. The tree's actual enum is PASS/FAIL/UNSUPPORTED. Result: `UNSUPPORTED` — the terminal verdict that means the gate never read the code — has no representation in the wire-1.2 `eval_scores[].verdict` field or the `history/<skill>.eval.ndjson` row Appendix D derives from it, so a harvested UNSUPPORTED run is indistinguishable from a PASS or is dropped.

**Evidence.** skills/oc-bug-check/SKILL.md:121 `| **Verdict** | PASS / FAIL / UNSUPPORTED | Grade A-F (nuanced) |`; :293 "The gate produces one of three verdicts:"; :654 "returns **UNSUPPORTED** — a distinct terminal verdict"; :664 "Callers must treat UNSUPPORTED as blocking-with-override, never as a green light." Per-check values are a separate axis (PASS/WARN/FAIL) at :558-566. Appendix D :1382 makes the ndjson row "the 1.2 entry plus `\"skill\"`", inheriting Appendix C's enum.

**Proposed fix.** Pick one enum and propagate it: `PASS | FAIL | UNSUPPORTED` for gate-style emitters, `PASS | FAIL` for Evaluator-style emitters, with per-check WARN kept as a separate `warnings` count. Edit §3.2:453-454 to match §4.4 row 4, and widen Appendix C:1336 to `PASS | FAIL | WARN | UNSUPPORTED` (or add a `kind` discriminator) before Sprint 1 freezes the wire.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:598 — Plan's §7 description-count is stale in five places — §7 is already complete at 32/32 invocable skills, so "the one still missing" does not exist and "parity at 35" is unreachable
*category:* plan-vs-tree-stale · *surfaced by the release-plan lens* · *known:* §4.4 row 13; docs/audits/2026-09-11-skillchain-2.0-audit.md:176-180, :320-321

**Problem.** The plan repeats at :34, :598-599, :704 (§4.4 row 13), :890 (Sprint 5 deliverable) and :1141 that orchestrator.md §7 "stands at 32 of 33" and that 2.0 "adds the one still missing plus the two new skills, reaching parity at 35". Today §7 carries a block for every one of the 32 invocable skills; the only catalog member without a block is oc-checkpoint-protocol, whose own description says it is "Not invoked directly". A Sprint 5 session following the text will hunt for a nonexistent missing skill and, to hit 35, will author a §7 trigger-description block for a skill that must never be triggered.

**Evidence.** `grep -o '^# oc-' skills/orchestrator.md | wc -l` → 32; `comm -23` of the 33 skill dirs against those 32 names yields exactly `oc-checkpoint-protocol`. skills/orchestrator.md:336 is `## 7. Skill Descriptions (Trigger Optimization)`, :654 is `## 8. Ecosystem Awareness`. skills/oc-checkpoint-protocol/SKILL.md description: "Not invoked directly". docs/audits/2026-09-11-skillchain-2.0-audit.md:176 independently records "32/32 invocable skills have a block (the #482 backfill landed)".

**Proposed fix.** Rewrite :34, :598-599, :704 and :890 to "§7 carries 32 of 32 invocable skills; 2.0 adds the two new skills → 34 blocks for 35 skills, oc-checkpoint-protocol excluded by design." Change the Sprint 5 closing-sweep check from a bare 35 to `grep -c '^# oc-' skills/orchestrator.md` → 34, and state the exclusion rule once so the next release does not re-open it.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:609 — `memory_user_edits` / session-file staleness exists at six sites in oc-orchestrator, not the four the plan enumerates, and one enumerated anchor is off by two lines
*category:* anchor-drift · *surfaced by the release-plan lens* · *known:* §4.4 row 2 (:693)

**Problem.** The L3 oc-orchestrator row says the stale text is "fixed at **four** sites (`:184-186`, `:214`, `:324`, `:498`)". Two of those are wrong: `:498` is a blank line (the stale sentence is at :496-497), and `:214` is not stale at all — it is the corrective paragraph that already declares "There is **no** `memory_user_edits` and **no** `~/.opchain/` session file". Two genuinely stale sites are missing from the list entirely: :335 ("invoked with no memory edit") and :984 ("Its own state lives in memory (registry) and session files (cache)"), plus :989 ("active_project (session state) or default_project (memory)"). A Sprint 2 session fixing "four sites" leaves the Principles section (:984) and the Cold Start path (:335) asserting a persistence model the same file calls stale at :214-218.

**Evidence.** `grep -n 'session files\|memory (registry)\|editing the memory\|memory edit' skills/oc-orchestrator/SKILL.md` → 185, 216, 335, 496, 984. `grep -n memory_user_edits …` → 214, 324. `awk NR==498` prints an empty line; `awk NR==485` also prints an empty line. The corrective text runs skills/oc-orchestrator/SKILL.md:213-218.

**Proposed fix.** Replace the anchor list with `:185`, `:324`, `:335`, `:496-497`, `:984`, `:989`, drop `:214` (already correct — it is the statement the other five must be reconciled to), and state the invariant once: registry + routing history + active project all live in `.checkpoints/oc-orchestrator.checkpoint.json` `skill_state`.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:623 — oc-release-ops "Major band row (`:17`)" anchor points at the **Minor** band row; the Major row is at :16
*category:* anchor-drift · *surfaced by the release-plan lens* · *known:* §4.4 row 6 (:697)

**Problem.** The L3 oc-release-ops row instructs Sprint 5 to rewrite `semver-decisions.md` item 1 and reconcile it "with the Major band row (`:17`)". In semver-decisions.md line 17 is the **Minor** band ("Backward-compatible feature work — new skill, new verb, …"); the Major band is line 16. An agent editing the cited line will widen the Minor band to cover wire `protocol_version` bumps — the exact inverse of the intended change, and it would classify wire 1.2 as a Minor, which is the failure mode §0 says the release exists to avoid. (oc-release-ops/SKILL.md:17, the other reading of a bare `:17`, is the frontmatter line `description: >` — no band row exists in SKILL.md at all; the only band table in the skill is in the reference file.)

**Evidence.** skills/oc-release-ops/references/semver-decisions.md:16 `| **Major** | Breaking change to a public surface …`; :17 `| **Minor** | Backward-compatible feature work — new skill, new verb, …`. `grep -in major skills/oc-release-ops/SKILL.md` returns only :132 and :134 (prose in `### Outputs`), never a table row. skills/oc-release-ops/SKILL.md:17 is `description: >`.

**Proposed fix.** Change the anchor to `references/semver-decisions.md:16` and spell the filename out, since every other anchor in that row (`:119`, `:292`, `:310`) is a SKILL.md line. While there, note that decision-tree item 4 (`semver-decisions.md:38-39`, "Was a new skill added? → **Minor.**") also needs the first-match-wins ordering checked, because 2.0 adds two skills.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:696 — §4.4 finding 5 is factually wrong for oc-git-ops: the skill already documents three `--` flags, so `--graduate` is not "the skill's first documented flag"
*category:* plan-vs-tree-false · *surfaced by the release-plan lens* · *known:* §4.4 row 5; docs/releases/2.0-plan.md:508

**Problem.** §4.4 row 5 states "oc-prompt-ops, oc-git-ops | neither documents any `--` flag; 'existing flag style' is false", and the L3 row at :619 therefore calls `/oc-git-sync --graduate <rule-id>` "**the skill's first documented flag** (D-G convention)". oc-git-ops documents three `--` flags today, one of which has its own `###` section. The original spec (docs/releases/2.0-plan.md:508, "existing flag style, no new verb") was correct and the §4.4 correction reverses it. A Sprint 5 session acting on §4.4 will invent and document a new flag convention for a skill that already has one, producing two conventions in one SKILL.md.

**Evidence.** skills/oc-git-ops/SKILL.md:562 `/oc-git-sync TICKET-1234`, `/oc-commit --ticket PLAT-12`; :617 `/oc-git-sync --closed`; :638 `### \`/oc-git-sync --retry-pm\` flush`; :653 "user can `/oc-git-sync --retry-pm`". The oc-prompt-ops half of the finding does hold: `grep -- '--' skills/oc-prompt-ops/SKILL.md` returns only markdown rules and table separators.

**Proposed fix.** Split §4.4 row 5 into two rows: oc-prompt-ops (no flags — D-G states the convention, `--cases`/`--rule` are its first) and oc-git-ops (three existing flags at :562/:617/:638 — `--graduate` follows the established style, restoring the spec's wording). Strike "the skill's first documented flag" from :619.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:901 — Sprint 5 gives two opposite instructions for check-release-surfaces.mjs in the same deliverable paragraph
*category:* plan-self-contradiction · *surfaced by the release-plan lens* · *known:* §7 risk 1 (:1165-1169), F-005

**Problem.** Lines 901-905 list "**the R3a fix** — make `check-release-surfaces.mjs` directional … because today's strict equality would turn `main` red the moment the product half lands (F-005)" as a Sprint 5 substrate deliverable. Six lines later, inside the same semicolon-joined list, :911-912 say "`check-release-surfaces.mjs` unchanged (R3a already binds Header to CHANGELOG)". §7 risk 1 (:1165-1169) re-asserts the first reading. A Sprint 5 session reading the deliverable list top-to-bottom lands on whichever clause it reads last; if it takes "unchanged", the equality check fails on `main` for the whole Appendix B freeze window (B1 merge lands `## [2.0.0]` in skills/CHANGELOG.md while Header still reads v1.9 until B3).

**Evidence.** scripts/check-release-surfaces.mjs:125 `const heading = changelog.match(/^## \[(\d+\.\d+)\.\d+\]/m);` and :131 `if (logged !== expected)` — strict equality against the newest numeric CHANGELOG heading, exactly as the R3a-fix clause describes. The `[Unreleased]` heading does not match the numeric pattern, so the check reads the newest shipped release. Appendix B sequences B1 (product half, :1269) before B3 (site half, :1293).

**Proposed fix.** Delete the "`check-release-surfaces.mjs` unchanged (R3a already binds Header to CHANGELOG)" clause at :911-912. It contradicts :901-905 and :1165-1169, and binding-to-CHANGELOG is the cause of the problem, not evidence the check is safe.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:1368 — Appendix C's `blockers[].advisory` demotion names only `rankCheckpoint()`; two other code paths and the protocol's own welcome rule still elevate any `needs: user_decision` blocker
*category:* incomplete-spec · *surfaced by the release-plan lens*

**Problem.** Appendix C specifies "`rankCheckpoint()` demotes it below ranks 1–4" so "a proposed rule never sits at the rank-1 `needs: user_decision` position a genuine bottleneck occupies". Patching `rankCheckpoint` alone does not achieve that. `recommendedAction()` independently scans `blockers` for `needs === "user_decision"` and returns "Blocked on your decision: …" as the headline for whichever checkpoint `pickNext` surfaces, regardless of rank — so an oc-evolve advisory blocker still hijacks the `/oc-ops next` output line. The shared protocol's welcome sequence tells every skill the same thing in prose. A Sprint 1 implementer following Appendix C literally ships a half-fix that looks correct in `checkpoint next` ranking tests and is wrong in the rendered output.

**Evidence.** scripts/checkpoint.mjs:425 `if (blockers.some((b) => b.needs === "user_decision")) return 1;` (rankCheckpoint) and :459 `const decision = blockers.find((b) => b.needs === "user_decision");` → :470 `why: \`Blocked on your decision: ${decision.description}\``; `recommendedAction` is called at :580 and :631 with no rank guard. skills/oc-checkpoint-protocol/SKILL.md:239 "Check `blockers` — if any are `needs: user_decision`, ask before proceeding".

**Proposed fix.** Extend Appendix C's `blockers[].advisory` section to name all three sites: `rankCheckpoint()` (skip advisory entries in the rank-1 test), `recommendedAction()` (skip advisory entries in the `decision` find), and the protocol welcome rule at oc-checkpoint-protocol/SKILL.md:239 ("advisory blockers do not stop the session"). Add the `recommendedAction` case to the Appendix E Sprint 1 test row.

### plugins/opchain/commands/oc-bugcheck.md:9 — commands/oc-bugcheck.md tells the skill to record `git write-tree` (index) while the gate binds to `git add -A` (full working tree) and its comment claims the skill records it 'the same way'
*category:* cross-skill-contract · *independently reported 2×* · *known:* PR #499 (open) touches the recipe; unmerged

**Problem.** The plugin's own slash-command tells the session to record `skill_state.verified_tree` as the output of `git write-tree`, i.e. the staged index. pre-commit-gate.cjs:256-267 explains that v3 deliberately binds to the ENTIRE working state (`git add -A` into a throwaway index, :277) and asserts 'oc-bug-check records verified_tree the same way (git add -A)'. Nothing in skills/oc-bug-check/SKILL.md mentions `verified_tree` at all (grep: zero hits), so the only place the recipe exists is this command file — and it is the wrong recipe. Result: run /oc-bugcheck on staged changes with any untracked file present → tree mismatch → deny (:300-310), even though the verdict is genuine.

**Evidence.** plugins/opchain/commands/oc-bugcheck.md:8-9 `skill_state.verified_tree set to the output of git write-tree`. pre-commit-gate.cjs:266-267 `oc-bug-check records verified_tree the same way (git add -A)` and :277 `git(["add", "-A", "--", "."], repoRoot, env)`. `grep -n verified_tree skills/oc-bug-check/SKILL.md` → no output. skills/oc-checkpoint-protocol/SKILL.md `grep -n -i verified` → no output (the protocol does not define the field either).

**Proposed fix.** Document the binding recipe once, in skills/oc-bug-check/SKILL.md 'Checkpoint Schema' (`verified_tree`: hash of `GIT_INDEX_FILE=$(mktemp) git add -A && git write-tree`, computed immediately after the checks), have plugins/opchain/commands/oc-bugcheck.md point at it instead of restating it, and add `verified_tree` to the checkpoint-protocol optional-field table so `checkpoint validate` recognises it.

### plugins/opchain/hooks/next-suggestion.cjs:249 — next-suggestion re-targets a handoff to the finishing skill when the named downstream skill has neither a plugin command nor a checkpoint — 16 skills are unreachable as suggestion targets
*category:* plugin

**Problem.** There is no skill→next transition map; the target is derived by scanning the action text for an id in KNOWN = COMMANDS keys ∪ skills that already have a checkpoint (line 249). If the downstream skill has no command file and has not yet written a checkpoint (its normal state before it ever runs), the loop at 254-260 never matches and `target` stays `source.skill`, so the notice names the skill that just finished. Orchestrator.md §2/§3 handoffs that hit this: oc-code-auditor → oc-security-auditor (:139), oc-app-architect → oc-integrations-engineer / oc-api-dev / oc-data-ops / oc-stack-forge (:200-202, :209), oc-reverse-spec → oc-app-architect (:199), oc-ux-engineer → oc-dash-forge (:204), oc-signal-forge → oc-data-ops (:210). Skills with no command and no live checkpoint in this repo: oc-agent-forge, oc-api-dev, oc-claude-api, oc-dash-forge, oc-fleet-ops, oc-integrations-engineer, oc-migration-ops, oc-modularize-ops, oc-prompt-ops, oc-rag-forge, oc-reverse-spec, oc-scale-ops, oc-security-auditor, oc-signal-forge (plus oc-checkpoint-protocol by design). test-suggestion.cjs only tests a handoff to a COMMANDS skill (line 170-176).

**Evidence.** Probe: oc-app-architect checkpoint changes to next_actions `["Hand off to oc-ux-engineer for the design pass"]` with no oc-ux-engineer checkpoint → emits `opchain · next → "run oc-app-architect"   (oc-app-architect just wrote a checkpoint: Hand off to oc-ux-engineer ...)`; same with oc-deploy-ops → `/oc-deploy` (correct). next-suggestion.cjs:249 `const KNOWN = new Set([...Object.keys(COMMANDS), ...cps.map((d) => d.skill)]);`.

**Proposed fix.** Seed KNOWN with the full catalog id list (ship a generated `skills.json`-derived array or scan `${CLAUDE_PLUGIN_ROOT}/skills/*/`), or fall back to any `\boc-[a-z-]+\b` token in the action text that differs from the source; add a test-suggestion case 'handoff to a skill with no checkpoint names that skill'.

### prompts/opchain-eval/eval.yaml:25 — opchain-eval pass_rate 0.90 over 28 cases tolerates exactly 2 failures — the two llm_judge collision cases can both fail and the gate stays green
*category:* eval-coverage · *surfaced by the routing lens*

**Problem.** eval.yaml:25 sets `pass_rate: 0.90` and the set holds 28 cases (inputs.jsonl/expected.jsonl are 28 lines each), so 0.90*28 = 25.2 → 26 passes required, i.e. exactly 2 failures are tolerated. The only two cases graded strictly (route-019, route-020, expected.jsonl:19-20, mode `llm_judge`) are precisely the /oc-harden vs /oc-hardening pair the whole disambiguation effort exists to defend — they are 2 of 28. Both can regress simultaneously and the eval gate still reports PASS at 26/28 = 0.9286. The score gate cannot fail on the collision it grades strictly; only a wider drift can trip it.

**Evidence.** prompts/opchain-eval/eval.yaml:25 `pass_rate: 0.90`; :26 `regression_epsilon: 0.05`. `wc -l prompts/opchain-eval/inputs.jsonl prompts/opchain-eval/expected.jsonl` → 28 and 28. `grep -n llm_judge prompts/opchain-eval/expected.jsonl` → lines 19, 20 only. node: 0.9*28 = 25.2; 26/28 = 0.9286 (>= 0.90 → pass); 25/28 = 0.8929 (fail). tests/opchain-eval.test.js:113-117 only asserts 0 < pass_rate <= 1, never that the collision cases are individually required.

**Proposed fix.** Either mark the collision cases as must-pass (a `required: true` flag honoured by /oc-prompt eval, or a separate 100%-threshold collision suite), or raise pass_rate so that no single collision case is expendable (>= 0.965 for 28 cases means 1 failure fails the gate). Document the chosen rule in eval.yaml next to `pass_rate`.

### prompts/opchain-eval/expected.jsonl:1 — 26 of 28 eval cases grade with `contains`, the exact mode route-019/020's own criteria declare insufficient for collision cases
*category:* eval-coverage · *surfaced by the routing lens*

**Problem.** eval.yaml:19 sets `default_mode: contains`, and 26 of 28 expected rows use it. `contains` passes whenever the answer text contains the skill id and the verb anywhere — so an answer that routes to the wrong skill but mentions the right one in passing scores as a pass. expected.jsonl:19-20 spell out that exact failure mode ('fails, even if it mentions the hardening skill in passing') and were therefore switched to llm_judge. Every other collision decision is left in the weak mode: route-004 (code-auditor vs security-auditor; the input literally says 'security bugs'), route-021/022/023 (security-auditor vs compliance-ops), route-024/025 (api-dev vs data-ops schema drift, decision D2), route-026 (integrations vs data-ops, D3), route-027/028 (scale-ops vs qa-ops load test). A regression in any of those trigger boundaries produces an answer naming both skills — and passes.

**Evidence.** prompts/opchain-eval/eval.yaml:19 `default_mode: contains         # the routing answer must contain the expected skill + command`; expected.jsonl lines 1-18 and 21-28 all `"mode": "contains"`; expected.jsonl:19 criteria `...fails, even if it mentions the hardening skill in passing.`; :20 same construction. inputs.jsonl:4 `review this code for security bugs before I ship` → expected.jsonl:4 `contains` [oc-code-auditor, /oc-audit].

**Proposed fix.** Promote every case that encodes a collision decision (route-004, 021-028) to `llm_judge` with a criteria string naming the wrong-side skill, matching the pattern already used at expected.jsonl:19-20.

### site/src/pages/pipeline-builder.astro:618 — /pipeline-builder recommends from a 21-skill table frozen at v1.5 — it never installs the commit/pre-PR gates or any v1.6–v1.9 skill, and the CLAUDE.md it generates describes a pipeline without them
*category:* generated-surface · *known:* docs/plans/coordination-gaps-punchlist.md P6 (pipeline representations mutually inconsistent) — architecture.astro/MobileArchitecture now carry 33/33;

**Problem.** recommend() (:663-693) draws only from FOUNDATION (:618) + KIND_SKILLS (:620-627) + a handful of adds; 12 of the 33 skills can never be recommended: oc-docs-forge, oc-repo-ops (the v1.8 pre-PR gate that orchestrator.md:96-101 says oc-git-ops runs before every PR), oc-qa-ops, oc-security-hardening, oc-compliance-ops, oc-data-ops (the `data` kind gets oc-dash-forge only), oc-release-ops, oc-cost-ops, oc-telemetry-ops, oc-signal-forge, oc-fleet-ops, oc-modularize-ops; oc-bug-check is recommended only for `cli`. The self-hosted note (:635) and the blurb (:653) still describe oc-security-auditor as doing "hardening", which moved to oc-security-hardening in v1.9. The generated CLAUDE.md (:752) tells the user "Code changes go through oc-code-auditor before merge" and nothing about the commit gate or PR gate. A user who installs this subset gets an oc-git-ops that chains to oc-bug-check/oc-docs-forge/oc-repo-ops skills that were never installed.

**Evidence.** Coverage script: pipeline-builder.astro present=21 of 33, missing oc-compliance-ops oc-cost-ops oc-data-ops oc-docs-forge oc-fleet-ops oc-modularize-ops oc-qa-ops oc-release-ops oc-repo-ops oc-security-hardening oc-signal-forge oc-telemetry-ops. :653 `"oc-security-auditor": "Threat model, OWASP, runtime / infra hardening"`; :635 `oc-security-auditor for hardening`.

**Proposed fix.** Make FOUNDATION carry the gate rail (oc-bug-check, oc-docs-forge, oc-repo-ops) unconditionally; add v1.9 rows (data kind → oc-data-ops; medium/large or self-hosted → oc-qa-ops + oc-security-hardening; compliance toggle → oc-compliance-ops); add oc-release-ops for team ≥ small; regenerate SKILL_BLURB from the content collection's shortDesc instead of a hand table so it cannot go stale; extend the generated CLAUDE.md with the commit gate and pre-PR gate lines. Add a build-time assertion that every catalog id has a SKILL_BLURB entry.

### skills/oc-agent-forge/SKILL.md:187 — Model-routing handoff reads a field oc-claude-api only publishes inside private skill_state, in a different shape
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:114 (chaining-gap, CONFIRMED, fix:M) — covers the missing absence fallback; the skill_state privacy/shape 

**Problem.** The Planner (step 1) and Builder (step 2) are told to read 'the model routing from the oc-claude-api checkpoint (orchestrator model, worker model, effort, thinking, caching)' and the skill calls this 'the single most important boundary' (:412). oc-claude-api's checkpoint section exposes model routing ONLY as `skill_state.model_routing` keyed by phase (`spec`, `build`, `classify`) — there is no orchestrator/worker/effort/thinking/caching structure and no public (top-level / context_primer) copy. The bundled protocol forbids reading another skill's skill_state. Following the text as written, the Planner either violates the protocol and improvises a per-phase→per-node mapping, or finds nothing and re-decides the model itself — the exact behaviour Principle 4 (:540-541) forbids. There is still no fallback for an absent oc-claude-api checkpoint.

**Evidence.** SKILL.md:187-189 'the **model routing** from the `oc-claude-api` checkpoint (orchestrator model, worker model, effort, thinking, caching)'; SKILL.md:487-492 skill_state example expects `model_routing.{source,orchestrator,worker,effort}`. oc-claude-api/SKILL.md:314-322 `### skill_state { "model_routing": { "spec": "claude-opus-4-8", "build": "claude-sonnet-4-6", "classify": "claude-haiku-4-5" } ...`; oc-claude-api/SKILL.md:79-80 only says siblings read 'this skill's per-task model choice' without naming a public field. skills/oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill' and :725 'Private state stays private'.

**Proposed fix.** Have oc-claude-api publish the per-node routing in a public field (e.g. a documented top-level `model_routing` or a `context_primer` entry shaped {orchestrator, worker, effort, thinking, caching}) or in 11-ai-architecture.md, and point oc-agent-forge :187-189/:307-308 at that field; add an absence fallback ('if no oc-claude-api checkpoint exists, invoke /oc-claude-api first — do not pick models here').

### skills/oc-api-dev/SKILL.md:419 — oc-deploy-ops drift gate asserted three times but oc-deploy-ops has no such gate
*category:* gate-reality

**Problem.** 'oc-deploy-ops gates production deploys on this command returning zero drift' (419), 'Drift gate — /oc-api drift must report zero before prod' (549) and '/oc-api drift is a oc-deploy-ops pre-condition' (593). oc-deploy-ops's Pre-Deploy Audit Gate runs oc-code-auditor, oc-security-auditor, and conditional oc-security-hardening / oc-compliance-ops manifest rows only. A session running oc-deploy-ops will never run the drift check; a session running oc-api-dev is told a gate exists that does not.

**Evidence.** grep -n -i drift skills/oc-deploy-ops/SKILL.md -> 0 hits. grep -n oc-api skills/oc-deploy-ops/SKILL.md -> only :712 (codegen aside) plus two mangled curl hostnames. sed -n 165,235p skills/oc-deploy-ops/SKILL.md shows gate rows 1-4 with no API-drift row. plugins/opchain/hooks/*.cjs: no drift gate.

**Proposed fix.** Either add a conditional row 5 to oc-deploy-ops's audit gate (only when api/openapi.yaml or an oc-api-dev checkpoint exists: Skill(oc-api-dev, '/oc-api drift'); non-zero drift -> block) and list oc-api-dev in its Reads-from, or downgrade SKILL.md:419/549/593 and orchestrator.md:142 to 'recommended CI check' until the gate is real.

### skills/oc-api-dev/SKILL.md:588 — Obligations placed on oc-monitoring-ops that its text does not carry
*category:* cross-skill-contract

**Problem.** oc-api-dev says oc-monitoring-ops ingests SLO targets + a drift-alert manifest (433, 548), receives a registration on PASS (371-372), supplies SDK/API-key telemetry as a consumer registry (572-573), tracks deprecated-operation usage (ref:164-165, 176), and 'opens an incident ticket parent-linked to the deprecation reminder' when a sunset endpoint is not removed (587-589). oc-monitoring-ops mentions none of this — no oc-api-dev row in its Reads-from table and no drift-manifest, SLO-target ingestion, or sunset-incident behaviour.

**Evidence.** grep -n -i -E 'drift|manifest|deprecat|api-dev|first-party' skills/oc-monitoring-ops/SKILL.md -> only :83 (/oc-monitor compare snapshots), :385/:392 (oc-prompt-ops eval drift). sed -n 575,589p shows Reads-from rows for oc-deploy-ops, oc-security-auditor, oc-scale-ops, oc-app-architect, oc-code-auditor, oc-data-ops, oc-security-hardening — no oc-api-dev.

**Proposed fix.** Add an oc-api-dev row to oc-monitoring-ops Reads-from (SLO targets + drift manifest from the spec; deprecated-operation usage counters; sunset-date incident ticket) or strike the unilateral obligations at SKILL.md:587-589 and :572-573 and soften :371-372/:548 to 'hand SLO targets to oc-monitoring-ops when it is run'.

### skills/oc-app-architect/SKILL.md:480 — Design Evaluator 'auto-attach' is claimed mechanically but nothing invokes oc-ux-engineer
*category:* orchestrator

**Problem.** The description (:22) declares a chain to oc-ux-engineer, and Phase 6 says the UX Evaluator 'auto-attaches on UI sprints' (:404, :480-483) and 'Sprint must pass BOTH evaluators'. Unlike every other chain in the file (stack-forge :181-188, dash-forge :291-295, launch :550-558) there is no step to read oc-ux-engineer/SKILL.md, check its checkpoint, or execute a verb. orchestrator.md:203 says the opposite: 'Invoke the Design Evaluator as a build-loop step (not an automatic trigger)', and oc-ux-engineer:546 expects `/oc-uxe attach` during the Phase 6 session. A session following this text waits for an attach that never happens, so the second half of the UI-sprint gate silently never runs.

**Evidence.** SKILL.md:404 `| ux_evaluator | auto-attach on UI sprints |`; :480 `**UX Evaluator** (auto-attaches on UI sprints):`; :643 `Design Evaluator auto-attaches during UI sprints in Phase 6`; grep -n 'oc-uxe' skills/oc-app-architect/SKILL.md → 0 hits; orchestrator.md:203 `| UI sprint detected | oc-app-architect (Phase 6) | oc-ux-engineer | Invoke the Design Evaluator as a build-loop step (not an automatic trigger) |`

**Proposed fix.** Add an explicit active-invocation step in Phase 6 Step 3: when the contract mentions UI/component/screen/page, read `oc-ux-engineer/SKILL.md`, check `.checkpoints/oc-ux-engineer.checkpoint.json`, execute `/oc-uxe attach`, and require its Design Score in the eval report; drop the 'auto-attach' wording in :404/:480/:643.

### skills/oc-bug-check/SKILL.md:244 — Private-key secret grep is written in BRE and never matches a PEM header
*category:* executability

**Problem.** Check 5's private-key pattern `grep -rn "BEGIN (RSA |EC |DSA )?PRIVATE KEY"` has no `-E`, so `(`, `)` and `?` are literal characters in basic regex and the command matches only the literal string with parentheses. The check silently reports no matches for real `-----BEGIN RSA PRIVATE KEY-----` / `-----BEGIN PRIVATE KEY-----` blocks, under a section whose rule is 'secrets always FAIL' (:257-263). The reference table repeats the defect (check-patterns.md:128 `BEGIN (RSA\|EC\|DSA )?PRIVATE KEY`).

**Evidence.** printf '-----BEGIN RSA PRIVATE KEY-----\n' | /usr/bin/grep -n "BEGIN (RSA |EC |DSA )?PRIVATE KEY" → exit 1 (no match); same with `-E` → exit 0, matches. Reproduced with both BSD grep and ugrep 7.8.4. Lines :241 (AWS) and :253 (service prefixes) use `-E`; :244 does not.

**Proposed fix.** Change :244 to `grep -rn -E "BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY" --exclude-dir=node_modules .` and fix the check-patterns.md:128 table entry to match.

### skills/oc-bug-check/SKILL.md:376 — Bypass protocol does not unlock the shipped commit gate
*category:* gate-reality · *independently reported 2×*

**Problem.** The Bypass Protocol (:376-388) and Git-Ops Integration (:496-497) say `/oc-bugcheck bypass` logs a `bypasses[]` entry, the commit proceeds with a `[BYPASS]` prefix, and the user 'can /oc-bugcheck bypass to force'. The plugin gate never reads `bypasses[]`; its only bypass is `--no-verify` / `OPCHAIN_BYPASS=1` in argument position on the git command (pre-commit-gate.cjs:181-186) and any verdict other than PASS is denied (:222-223). A session following the SKILL.md as written writes the bypass entry, expects the commit to go through, and is blocked — while the plugin's own oc-commit.md:7-9 tells users that `--no-verify` 'defeats the only enforcement opchain has'. Only the repo-local sh hook honours a fresh `skill_state.bypasses[].at` (.claude/hooks/pre-commit-bugcheck.sh:90-107).

**Evidence.** grep -n bypass plugins/opchain/hooks/pre-commit-gate.cjs → lines 183-184 (`--no-verify|OPCHAIN_BYPASS=1`), 195, 219, 296 — no `bypasses` array read. SKILL.md:383 `[BYPASS] feat(auth): WIP session handling`; :497 'User can `/oc-bugcheck bypass` to force'. git log -500 shows 0 commits with a `[BYPASS]` prefix.

**Proposed fix.** Either have the gate honour a checkpoint-recorded bypass bound to the current tree (e.g. `skill_state.bypass_for_tree === fullWorkingTree()`), or rewrite the bypass sections in oc-bug-check, oc-git-ops and orchestrator.md §3 to state that under the plugin the only override is `git commit --no-verify`, and that `[BYPASS]`/`bugcheck:` annotations are oc-git-ops prose conventions the hook neither adds nor checks.

### skills/oc-claude-api/SKILL.md:62 — `05-llm-design.md` names a spec doc no skill produces; oc-app-architect writes `11-ai-architecture.md`
*category:* cross-skill-contract · *independently reported 3×*

**Problem.** The pipeline diagram (:62), the Phase 2 prose (:75) and the Cross-Skill Integration row (:281) all say this skill records the request-layer plan in `05-llm-design.md` and that oc-app-architect reads it. oc-app-architect's AI-App branch says the oc-claude-api contribution 'folds into `02-architecture.md` and a new `11-ai-architecture.md`' and that app-architect itself assembles 11-ai-architecture.md from the invoked skills' checkpoints; its 05 slot is `05-monetization.md`. A session in either skill will look for / write a file the other never touches.

**Evidence.** skills/oc-app-architect/SKILL.md:204 '| Any direct Claude/LLM API usage ... | **oc-claude-api** | ... folds into `02-architecture.md` and a new `11-ai-architecture.md` |'; :216-219 'Each invoked skill writes its own checkpoint; app-architect reads them back ... Add an `11-ai-architecture.md` spec doc'; :252 `05-monetization.md`. `grep -rn 05-llm-design skills docs` hits only oc-claude-api (:62,:75,:281) and oc-prompt-ops:443. oc-agent-forge:186-187 and oc-monitoring-ops:376 already use 11-ai-architecture.md.

**Proposed fix.** Either delete the Phase 5 edge from the diagram (leaving Phase 2 as the sole inbound chain) or add a Phase 5 rule in oc-app-architect/SKILL.md + scaffold-guide.md: 'if 11-ai-architecture.md exists, invoke /oc-claude-api to scaffold the request layer (caching + max_tokens ceilings)'.

### skills/oc-claude-api/SKILL.md:79 — Model routing is 'read by siblings' but is recorded only in private `skill_state.model_routing`
*category:* cross-skill-contract

**Problem.** ':79 Model routing is **owned here and read by siblings.**' - oc-agent-forge, oc-rag-forge and oc-prompt-ops all say they read model routing 'from the oc-claude-api checkpoint'. The only place this skill documents the routing in its checkpoint is `skill_state.model_routing` (:318-322), which the checkpoint protocol declares off-limits to other skills. A sibling that obeys the protocol cannot get the routing (handoff silently fails); one that reads it violates the contract. No protocol-readable surface (context_primer, progress_table, an artifact path) is named.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:162 '// Other skills should NOT read this section - it's private to the owning skill.'; :376 '- Never read `skill_state` - it's private to the owning skill'; :725 '**Private state stays private.** `skill_state` is an opaque bag - other skills don't read it'; :375 readable fields are header, progress, progress_table, context_primer, blockers. oc-agent-forge:188 'the **model routing** from the `oc-claude-api` checkpoint'; :307 'Builder reads the **model routing from the `oc-claude-api` checkpoint**'.

**Proposed fix.** Publish the per-phase model map through a protocol-readable surface and say so: append it to `context_primer.key_decisions` (protocol :117-122, :264) and record it in `11-ai-architecture.md` (listed in `context_primer.generated_files`); tell siblings to read those, not skill_state. Alternatively propose an additive top-level field in the protocol (like pm_refs) - but do not leave the edge pointing at the private bag.

### skills/oc-claude-api/SKILL.md:270 — Cost section still says oc-cost-ops 'lands in v1.6 ... once it ships'; it shipped in 1.6.0 and is at 1.9.0 with six verbs
*category:* docs-drift

**Problem.** The callout (:270-273) 'Deeper cost ops land in v1.6. Cross-project spend dashboards, per-route cost budgets, and live cost-regression alerts route through `oc-cost-ops` once it ships. Until then, this command sets static per-phase ceilings' and the table row (:288) '`oc-cost-ops` (v1.6) | Will own live spend tracking + cost-regression alerts' describe a future skill. A session following this text would not hand budgets/regression gates to /oc-cost budget|gate and would treat live spend as untracked. The table also omits the one real edge: oc-cost-ops reads this skill's price table.

**Evidence.** skills/oc-cost-ops/SKILL.md:2-16 (name oc-cost-ops, version 1.9.0, commands /oc-cost attribute|budget|route|gate|report); skills/CHANGELOG.md:385-390 '## [1.6.0] - 2026-06-25 ... **oc-cost-ops** (`/oc-cost`)'; oc-cost-ops:215 '| oc-claude-api | The price table + model IDs |' and orchestrator.md:156 list oc-cost-ops reading oc-claude-api - absent from this skill's Cross-Skill Integration table (:279-289). governance.last_reviewed (:25) is 2026-06-21, before 1.6.0.

**Proposed fix.** Rewrite :270-273 and :288 in present tense: `/oc-claude-api cost` sets static per-phase ceilings and records them in the checkpoint; live attribution, budgets and cost-regression gates are `/oc-cost attribute|budget|gate` (oc-cost-ops reads this skill's price table + model IDs). Add the 'read by oc-cost-ops (price table)' row and restamp governance.last_reviewed.

### skills/oc-cost-ops/references/budget-gates.md:71 — CI recipe invokes npm scripts that do not exist
*category:* executability · *independently reported 3×* · *known:* docs/audits/2026-07-04-portability-audit.md:402 (CONFIRMED, repo-only-dependency, still open)

**Problem.** The CI wiring recipe tells the reader to add `- run: npm run oc-prompt -- regress` and `- run: npm run oc-cost -- gate` to every PR. Neither npm script exists in opchain's package.json (46 scripts, none named oc-*) nor is any such script produced by either skill; both `/oc-prompt regress` and `/oc-cost gate` are agent-driven verbs. A session following the recipe adds a CI step that fails on first run. Still open since the 2026-07-04 audit; the v2.0 plan's D-G only covers the prompt-eval half (scripts/prompt-eval.mjs, Sprint 4) and says nothing about a cost-gate runner.

**Evidence.** skills/oc-cost-ops/references/budget-gates.md:70-73: "```\n- run: npm run oc-prompt -- regress   # quality\n- run: npm run oc-cost -- gate        # cost  (this skill)\n```". `node -e` over package.json scripts: no `oc-prompt`, no `oc-cost`. Known: docs/audits/2026-07-04-portability-audit.md:402-405 (CONFIRMED); v2.0 plan §4.4 row "oc-prompt-ops runner" line 706 (D-G, prompt side only).

**Proposed fix.** Rewrite the recipe as what actually exists today: an agent-run gate whose verdict is written to the checkpoint, with the CI step being `npm run checkpoint:validate` (which enforces cost.total_usd vs budget_usd per cost-attribution.md:75-76); or ship the runner scripts and register them in package.json before documenting them.

### skills/oc-cost-ops/SKILL.md:200 — Two sections disagree on which checkpoint receives the `cost` block
*category:* checkpoint

**Problem.** SKILL.md §Checkpoint Integration says the skill's checkpoint is `{project-dir}/.checkpoints/oc-cost-ops.checkpoint.json` and the When-to-Write table saves `cost.total_usd`/`by_phase`/`by_model`/`budget_usd` there. references/cost-attribution.md:67-69 instead says `/oc-cost attribute` does a read→merge→write 'on the owning skill's checkpoint (never blind-overwrite — another skill may share the project)'. The bundled protocol (checkpoint-protocol.md:377 = skills/oc-checkpoint-protocol/SKILL.md:377) says 'Never write to another skill's checkpoint', while the same protocol defines `cost` as 'spend attributed to this checkpoint' (:637-644) and both the validator warning (scripts/checkpoint.mjs:336-338) and oc-orchestrator's budgetExceeded() (:439-441) compare total_usd and budget_usd within one file. Following SKILL.md puts spend and budget in oc-cost-ops's own file (as the live checkpoint does — all $1,078.74 under by_phase.interactive); following cost-attribution.md writes into e.g. oc-app-architect's file and breaks the protocol rule. Whichever a session picks, a per-skill budget set the other way never trips.

**Evidence.** SKILL.md:200 `{project-dir}/.checkpoints/oc-cost-ops.checkpoint.json`; SKILL.md:206-207 saves cost.* to it; cost-attribution.md:67 'on the owning skill's checkpoint'; checkpoint-protocol.md:377 'Never write to another skill's checkpoint'; .checkpoints/oc-cost-ops.checkpoint.json has cost.by_phase {interactive: 1078.74} and no budget_usd.

**Proposed fix.** Pick one model and state it in both files: (a) oc-cost-ops is the sole writer of the top-level `cost` block into any skill's checkpoint (add that carve-out to the protocol's 'never write to another skill's checkpoint' rule), or (b) `cost` lives only in oc-cost-ops.checkpoint.json with by_phase keyed `<skill>/<phase>` and budgets keyed the same way. Then update the When-to-Write table and cost-attribution.md step 1 accordingly.

### skills/oc-dash-forge/references/checkpoint-schema.md:14 — Skill's own checkpoint schema fails the validator: no next_actions/blockers, phase_data instead of skill_state
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:13 ('one divergent stale copy in oc-dash-forge') — the next_actions omission itself is not itemized there

**Problem.** SKILL.md:422 tells sessions to 'Read references/checkpoint-schema.md for schema' (the bundled references/checkpoint-protocol.md is never cited). That schema (checkpoint-schema.md:14-136) claims to conform to the protocol but omits next_actions and blockers entirely and stores skill-private data under a phase_data key the protocol does not define (its private container is skill_state). A checkpoint written exactly as documented is rejected by the schema gate and has no next_actions[0] for the protocol's resume flow to read.

**Evidence.** Extracted the jsonc example verbatim, wrote it as oc-dash-forge.checkpoint.json in a scratch dir and ran `OPCHAIN_CHECKPOINTS_DIR=<dir> node scripts/checkpoint.mjs validate` → '✗ next_actions must be a non-empty array when status is "in_progress"', exit 1 (rule at scripts/checkpoint.mjs:250-255). skills/oc-checkpoint-protocol/SKILL.md:305-308 lists next_actions as required while in_progress; `grep -n phase_data skills/oc-checkpoint-protocol/SKILL.md` = 0 hits; .checkpoints/README.md:63 defines skill_state as the private object. `grep -n checkpoint-protocol skills/oc-dash-forge/SKILL.md` = 0 hits.

**Proposed fix.** Rewrite checkpoint-schema.md to the wire-1.1 envelope (add next_actions[], blockers[], recently_done), move phase_data.* under skill_state, and change SKILL.md:422 to cite references/checkpoint-protocol.md as the contract with checkpoint-schema.md as the skill_state layout only.

### skills/oc-dash-forge/SKILL.md:109 — Claims parent checkpoints carry a sub_skill_invocations entry and that /status in either skill reads both — no parent or protocol defines it
*category:* cross-skill-contract

**Problem.** SKILL.md:108-110 states the parent skill's checkpoint 'adds a sub_skill_invocations entry pointing at the oc-dash-forge checkpoint' and '/status in either skill reads both and surfaces combined progress'; example-walkthrough.md:269-281 shows oc-app-architect's checkpoint with that array. Neither oc-app-architect nor oc-ux-engineer documents the field, the checkpoint protocol does not define it, the validator/merge driver never handle it, oc-app-architect's /status reads only its own checkpoint, and oc-ux-engineer has no /status command. A session resuming from either parent will be told to expect combined progress that never exists.

**Evidence.** `grep -rn sub_skill_invocations skills/ scripts/ plugins/opchain/hooks/ .checkpoints/ docs/` (excluding bundles) hits only skills/oc-dash-forge/SKILL.md:109 and references/example-walkthrough.md:274; 0 hits in skills/oc-checkpoint-protocol/SKILL.md, skills/oc-dash-forge/references/checkpoint-protocol.md, scripts/merge-checkpoint.mjs, skills/oc-app-architect/SKILL.md, skills/oc-ux-engineer/SKILL.md. oc-app-architect/SKILL.md:582-600 (/status) reads only its own checkpoint; `grep -n '/status' skills/oc-ux-engineer/SKILL.md` = 0 hits.

**Proposed fix.** Either add sub_skill_invocations as an optional extension in oc-checkpoint-protocol + the two parents' checkpoint sections (and teach /status /oc-ops to follow it), or reword SKILL.md:108-110 to the existing contract: parent appends the handoff path to context_primer.generated_files and oc-dash-forge writes its own checkpoint.

### skills/oc-dash-forge/SKILL.md:349 — Phase 3 deliverable uses a nonexistent create_file tool and a claude.ai sandbox output path
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:412 ([oc-dash-forge] Prototype deliverable instructs a nonexistent create_file tool) — still open

**Problem.** 'Single React artifact — renderable via create_file to /mnt/user-data/outputs/ with .tsx extension' cannot be executed in Claude Code (no create_file tool; /mnt/user-data/outputs/ does not exist) and contradicts Phase 4 (SKILL.md:368-372) and react-patterns.md:331-343, which put prototype.tsx in {project-dir}/dash-forge-handoff/.

**Evidence.** SKILL.md:349 verbatim; `grep -rn 'create_file\|/mnt/user-data' skills/*/SKILL.md` hits only oc-dash-forge; `ls /mnt/user-data` fails on this machine; Phase 4 tree at SKILL.md:368-372 names {project-dir}/dash-forge-handoff/prototype.tsx.

**Proposed fix.** Replace with 'Write {project-dir}/dash-forge-handoff/prototype.tsx (Write tool); record the path in the checkpoint's phase_data.prototype.artifact_file'.

### skills/oc-deploy-ops/SKILL.md:178 — oc-deploy-ops' audit gate invokes `checkpoint.mjs status <skill>`, an argument the CLI silently discards
*category:* nonexistent-api · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers skills/oc-deploy-ops/SKILL.md:179 for a different defect (age-only reuse, no SHA binding); th

**Problem.** Both audit-gate reuse steps tell the session to run `node scripts/checkpoint.mjs status oc-code-auditor` (:178) and `node scripts/checkpoint.mjs status oc-security-auditor` (:192), then decide reuse from 'updated_at < 1h / < 24h'. The CLI's `status` verb takes no skill argument — its usage line is `status [--brief] [--since=ISO]`. The extra argument is silently ignored and the command prints the whole multi-skill table with exit 0, so the gate decision is made against an unfiltered dump rather than the named skill's checkpoint, and nothing signals the mistake. The verb that does take a skill is `show [skill]`.

**Evidence.** skills/oc-deploy-ops/SKILL.md:178 `node scripts/checkpoint.mjs status oc-code-auditor`; :192 `node scripts/checkpoint.mjs status oc-security-auditor`. Executed in this worktree: `node scripts/checkpoint.mjs status oc-code-auditor` printed the full 16-row session-state table (every skill) and exited 0. Usage banner from `node scripts/checkpoint.mjs`: `status [--brief] [--since=ISO]      — session-resume summary` / `show [skill]                        — print full JSON for one checkpoint, or all`.

**Proposed fix.** Change both lines to `node scripts/checkpoint.mjs show oc-code-auditor` / `show oc-security-auditor`, and add the CLI-optional caveat required by skills/oc-checkpoint-protocol/SKILL.md:382-391 (on a user project the script does not exist; read `.checkpoints/<skill>.checkpoint.json` directly).

### skills/oc-deploy-ops/SKILL.md:226 — Gate Rules is a prose table with no executable backing, and the sibling-skill invocations that feed it are bash comments
*category:* gate-reality · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md P3b 'The audit gate is a markdown table' (Tier 3, open); docs/audits/2026-07-04-portability-audit.md:199 '[o

**Problem.** The Gate Rules table (:228-237: block on CRITICAL, block on >3 HIGH, warn on no audit) and the two reuse windows (:177-181 'If updated_at < 1h old, reuse'; :192-196 '< 24h old AND no high-impact changes since') read as thresholds a gate applies. Nothing applies them: scripts/deploy.mjs contains the word 'audit' only in a comment about the 2026-08-26 ledger audit (:218) and never opens `.checkpoints/oc-code-auditor.checkpoint.json` or `oc-security-auditor`; the only mechanical reader of `findings_by_severity` repo-wide is the plugin SessionStart hook (session-state.cjs:79), which prints an 'open loops' line and gates nothing. The reuse windows are freshness-only — no `at_sha`/`verified_tree` comparison against HEAD — so a grade recorded for older code passes as current. Classification: (b) presented as (a).

**Evidence.** scripts/deploy.mjs:356-399 main sequence = assertDeployFromMain, assertCleanCheckout, assertReleaseTagged, prebuild, hardening:verify, wrangler deploy, verifyLiveVersion, live hardening replay, smoke — no audit step. `grep -rn -e findings_by_severity -e findings_total -e '"grade"' scripts plugins/opchain/hooks .github src tests .claude/hooks` → only plugins/opchain/hooks/session-state.cjs:79. oc-deploy-ops SKILL.md:178 `node scripts/checkpoint.mjs status oc-code-auditor` — checkpoint.mjs:977 `case "status": return cmdStatus({ brief, since })` ignores the positional skill argument and prints the whole table.

**Proposed fix.** Label :165-172 and the table at :226-240 'Agent-executed, unenforced: oc-deploy-ops applies these rules while it is running; `npm run deploy` does not read auditor checkpoints.' Add the provenance condition the punchlist asks for to :179 and :193 ('reuse only if `skill_state.verified_tree`/`last_audit.at_sha` equals the deploying SHA'). Long-term: add an `assertAuditGate()` to scripts/deploy.mjs that reads oc-code-auditor's `findings_by_severity` + `verified_tree` and refuses on critical>0 or tree≠HEAD, with a loud `OPCHAIN_ALLOW_UNAUDITED_DEPLOY=1` hatch.

### skills/oc-deploy-ops/SKILL.md:339 — Drift the other way: scripts/deploy.mjs is the real deploy chokepoint (from-main, clean tree, signed tag, hardening verify, live replay, smoke + auto-rollback) but oc-deploy-ops tells the session to run `npx wrangler deploy` directly, bypassing all of it
*category:* docs-drift

**Problem.** In this repo `npm run deploy` (CLAUDE.md:43-44) executes: HEAD==origin/main (deploy.mjs:116-166), clean tree before and after prebuild (:229-243, :357, :380), signed release tag (:192-227), `npm run hardening:verify` = check-hardening.mjs --pre-deploy (:382), post-deploy live hardening replay against the target (:391) and smoke suite with automatic `wrangler rollback` on any miss (:390-396). The skill's Staging Deploy Sequence (:260 `npx wrangler deploy --env staging`) and Production Deploy Sequence (:339 `npx wrangler deploy`) never mention deploy.mjs, `npm run deploy`, `hardening:verify`, or `check-hardening.mjs` (grep across oc-deploy-ops, oc-security-hardening and hardening-manifest.md → zero hits). oc-security-hardening :206-208 itself says 'a direct platform deploy (`wrangler deploy` and kin) bypasses' the manifest gate — which is exactly what the deploy-ops walkthrough instructs. Related: oc-security-hardening :203-211 classifies its deploy-ops row as 'agent-run prose, not machine enforcement' and its checkpoint template (:253) sets `gate.machine_enforced: false`, while in opchain the row is machine-enforced by deploy.mjs and the live .checkpoints/oc-security-hardening.checkpoint.json carries no `gate` object at all.

**Evidence.** scripts/deploy.mjs:356-399; :382 `run("npm", ["run", "hardening:verify"])`; :391 `["node", ["scripts/check-hardening.mjs", "--target", TARGET_URL], "live hardening replay failed"]`. `grep -n 'hardening:verify\|check-hardening\|scripts/deploy\|deploy\.mjs' skills/oc-deploy-ops/SKILL.md skills/oc-security-hardening/SKILL.md skills/oc-security-hardening/references/hardening-manifest.md` → no output. skills/oc-deploy-ops/SKILL.md:260, :339. skills/oc-security-hardening/SKILL.md:206-208, :253. `grep -n '"gate":' .checkpoints/oc-security-hardening.checkpoint.json` → no output.

**Proposed fix.** In oc-deploy-ops add a 'Project deploy wrapper' rule before :246 and :327: 'If package.json defines a `deploy`/`deploy:staging` script, run it — never call the platform CLI directly; opchain's `scripts/deploy.mjs` is the chokepoint that enforces the audit rows below.' In oc-security-hardening :203-211 add: 'When the project's deploy script already replays the manifest (opchain: `npm run hardening:verify` + live `check-hardening.mjs --target`), record `gate.machine_enforced: true` and `chokepoint: "scripts/deploy.mjs"`.' Backfill the `gate` object in the live hardening checkpoint.

### skills/oc-deploy-ops/SKILL.md:420 — Cloudflare-analytics and Telegram commands use non-existent hosts oc-api.cloudflare.com / oc-api.telegram.org
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:437 '[oc-deploy-ops] External API hostnames corrupted by an oc- prefix rename' (PARTIAL)

**Problem.** The /oc-deploy health analytics curl targets https://oc-api.cloudflare.com/client/v4/... and the notify() helper targets https://oc-api.telegram.org/bot...; the generated CI template bakes the same Telegram host into users' notify job. Neither host resolves; the real hosts are api.cloudflare.com and api.telegram.org (the repo's own monitor uses api.cloudflare.com). Known since the 2026-07-04 portability audit (PARTIAL) and still present.

**Evidence.** skills/oc-deploy-ops/SKILL.md:420 `curl -s "https://oc-api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/workers/analytics/stored"`; SKILL.md:439 `curl -s -X POST "https://oc-api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage"`; references/github-actions.md:97 same host; .github/scripts/cloudflare-monitor.mjs:144 `apiBase = "https://api.cloudflare.com/client/v4"`

**Proposed fix.** Replace oc-api.cloudflare.com with api.cloudflare.com (:420) and oc-api.telegram.org with api.telegram.org (:439, references/github-actions.md:97, plus the plugin copy via sync); the same artifact exists in skills/oc-monitoring-ops/references/alerting-patterns.md:42.

### skills/oc-deploy-ops/SKILL.md:648 — Bare-metal row still routes to oc-migration-ops although CHANGELOG 1.7.0 and oc-fleet-ops say it was re-pointed to oc-fleet-ops
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:157-160 and :497 (P1) — three v1.7 skills absent from map/handoff table; still open

**Problem.** oc-deploy-ops' Platform Matrix says 'bare-metal needs oc-migration-ops, not oc-deploy-ops'. oc-fleet-ops/SKILL.md:278-286 quotes that exact sentence and states '1.7 **edits that row** to re-point self-managed/multi-node/IaC deploys at oc-fleet-ops — a behavioural change. It also registers deploy-ops ↔ fleet-ops as **peers** in the orchestrator'. Neither edit exists: the deploy-ops row is unchanged, and skills/orchestrator.md never mentions oc-fleet-ops outside the §7 description block and the §8 skill-count sentence (:385-386) — no §2 map entry, no Upstream/Downstream row, no §3 handoff, no §4 route, no peer registration. A session in deploy-ops with a self-managed target is sent to a skill that (per fleet-ops:284-286) has 'no provision / topology / fleet-health surface', while the skill built for it is invisible.

**Evidence.** skills/oc-deploy-ops/SKILL.md:648 `| Bare-metal / VPS | Out of scope | oc-deploy-ops is opinionated about managed deploys; bare-metal needs oc-migration-ops, not oc-deploy-ops. |`; skills/oc-fleet-ops/SKILL.md:280 `1.7 **edits that row** to re-point self-managed/multi-node/IaC deploys at \`oc-fleet-ops\``; :281-282 `registers \`deploy-ops ↔ fleet-ops\` as **peers** in the orchestrator`; `awk 'NR<336||NR>653' skills/orchestrator.md | grep -i fleet` → only the §8 count line.

**Proposed fix.** Edit deploy-ops:648 to route self-managed/multi-node/IaC to oc-fleet-ops; add oc-fleet-ops (peer of oc-deploy-ops) to orchestrator §2 map, the Upstream/Downstream table, §3 (fleet → monitoring-ops / git-ops; modularize → fleet) and §4; or rewrite fleet-ops:278-286 to stop claiming the edits shipped.

### skills/oc-deploy-ops/SKILL.md:695 — Pack-dispatch worked example reads an `activePack` field from oc-stack-forge's checkpoint that no skill or script ever writes
*category:* cross-skill-contract

**Problem.** Step 2 of the `/oc-deploy staging` worked example says 'Read pack hint from project's oc-stack-forge.checkpoint.json: activePack: "python"'. oc-stack-forge's SKILL.md documents no such field (its skill_state template is stack_path/decisions/features_planned/gap_analysis_done), the live .checkpoints/oc-stack-forge.checkpoint.json has none, and a repo-wide grep finds `activePack` only in this file. Without the hint, step 3 gets no packId and resolution rule 3 ('Pack miss — caller error ... exits') fires, so the documented primary dispatch path cannot execute. It would also be a read of another skill's private skill_state.

**Evidence.** skills/oc-deploy-ops/SKILL.md:695-696 `Read pack hint from project's oc-stack-forge.checkpoint.json:\n     activePack: "python"`; `grep -rn activePack skills/ src/ scripts/ tests/` (excluding bundles) -> only skills/oc-deploy-ops/SKILL.md:696; skills/oc-stack-forge/SKILL.md:459-474 skill_state has stack_path/decisions/...; `grep -n activePack .checkpoints/oc-stack-forge.checkpoint.json` -> no output; SKILL.md:688-689 'Pack miss — caller error'

**Proposed fix.** Either have oc-stack-forge document and write a pack id in a readable field (e.g. top-level or context_primer, since skill_state is private) and reference that name here, or derive the pack id from the project files (go.mod / Cargo.toml / pyproject) as the Fly.io section already does (:607).

### skills/oc-fleet-ops/SKILL.md:280 — Claims the deploy-ops Platform Matrix bare-metal row was re-pointed to oc-fleet-ops; the edit never landed
*category:* routing · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:157-160 and :497 ('Add the three new skills to the upstream/downstream map and handoff table') — sti

**Problem.** Lines 281-283 ('It also registers deploy-ops ↔ fleet-ops as peers in the orchestrator so routing is unambiguous when a project has both checkpoints'), plus :58-60 and :259-260 ('the orchestrator routes by managed app vs self-managed fleet'), describe routing machinery that does not exist. The shared protocol only knows fleet-ops as a §7 trigger description and a §8 skill count. A session asking the orchestrator 'where should this fleet go?' gets no answer, and the modularize → fleet handoff has no Handoff Point row.

**Evidence.** skills/orchestrator.md Upstream/Downstream Map (:130-159) has no oc-fleet-ops row (rows present: :132-158, none for fleet-ops, modularize-ops, or signal-forge); Handoff Points (:189-212) contain no fleet edge; Smart Routing Table (:272-296) has no fleet/self-managed row; the only mentions are §7 description :572-584 (added by 563034c #482) and §8 count :704. `grep -ci fleet skills/oc-orchestrator/SKILL.md` = 0. Site copy asserts the peer relationship (site/src/components/PipelineDiagram.astro:175-181, :274) — the site is ahead of the protocol.

**Proposed fix.** Add an oc-fleet-ops row to orchestrator.md's Upstream/Downstream Map (reads: oc-modularize-ops, oc-stack-forge, oc-scale-ops, oc-app-architect; chains: oc-monitoring-ops, oc-git-ops), a Handoff Point row for oc-modularize-ops → oc-fleet-ops, a Routing Table row for 'kubernetes / terraform / deploy to VMs / container fleet' → oc-fleet-ops /oc-fleet topology, and add fleet-ops as an upstream in the oc-monitoring-ops (:149) and oc-git-ops (:144) rows. Until then, soften SKILL.md:281-283 to say the peer routing is a documented convention here, not registered in the orchestrator.

### skills/oc-fleet-ops/SKILL.md:297 — Handoff contract asserts oc-migration-ops reads modules[] to build a Structural cutover plan; migration-ops has no such behaviour
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:159 ('Handoff points do not include ... modularize -> migration/fleet') and docs/audits/2026-07-04-p

**Problem.** Line 299 ('oc-fleet-ops topology reads the same modules[] to seed containers') and :303 (gates on modules[].equivalence_verified) read fields that live in another skill's skill_state, which the protocol declares opaque. The text tries to launder this through 'the module map (modularization/module-map.json) is the shared, named artifact' (:140-141, :301), but that file's contents are never specified anywhere in the repo, so a reader cannot tell whether image_hint / equivalence_verified are in the file or only in modularize's private state. A future rename inside modularize's skill_state silently breaks topology.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill'; :725 'Private state stays private. skill_state is an opaque bag — other skills ...'. `grep -rn module-map skills docs plugins/opchain/commands mirror` finds only oc-fleet-ops, oc-modularize-ops, docs/releases/1.7-plan.md:736,:861 and the portability audit — no schema. skills/oc-modularize-ops/SKILL.md:374 says only 'modularization/module-map.json written for migration-ops + fleet-ops'.

**Proposed fix.** Either add a 'Reads from oc-modularize-ops: modularization/module-map.json (Structural cutover input)' row and a modules[]-driven step to skills/oc-migration-ops/SKILL.md, or drop the migration-ops bullet from the fleet-ops (and modularize-ops) Handoff contract and state that the chain today is modularize → fleet only.

### skills/oc-git-ops/SKILL.md:239 — Pre-commit verdict table has no row for oc-bug-check's UNSUPPORTED verdict, so an unread gate reads as 'proceed'
*category:* cross-skill-contract · *independently reported 5×* · *known:* docs/audits/2026-07-04-portability-audit.md:214 (CONFIRMED, chaining-gap; still open)

**Problem.** Punchlist Tier 0 item 0.2 was applied (the paragraph is now advisory), but the replacement text makes two new claims a session would act on: (1) 'The opchain.dev repo registers a PreToolUse(Bash) hook that blocks git commit on a missing, stale, or non-PASS bug-check checkpoint' — that hook (.claude/hooks/pre-commit-bugcheck.sh) exits 0 = allow whenever `jq` is absent (:30-32), so it is not a fail-closed block; (2) 'To get real enforcement, install the opchain plugin (which ships the hook)' — the plugin hook only arms when `.checkpoints/` or `.opchain/` exists or `OPCHAIN_GATE=1` (pre-commit-gate.cjs:171-179), which the paragraph never says, and when armed it denies every SKILL.md-conformant PASS (see the CRITICAL finding). A user who follows this sentence gets either no gate or a permanent deny.

**Evidence.** skills/oc-git-ops/SKILL.md:242 `... or /oc-bugcheck bypass (logged override). Do NOT call git commit until verdict flips to PASS or the user explicitly bypasses.` skills/oc-bug-check/SKILL.md:381-383 steps 1-3 (log in checkpoint, `[BYPASS]` prefix). plugins/opchain/hooks/pre-commit-gate.cjs:183 `if (/(?:^|\s)(?:--no-verify|OPCHAIN_BYPASS=1)(?:\s|$)/.test(stripped))` — no reference to `bypasses` anywhere in the file (grep confirmed). .claude/hooks/pre-commit-bugcheck.sh:91 `BYPASS_AT="$(jq -r '(.skill_state.bypasses // []) | last | .at // empty' ...)"`.

**Proposed fix.** Replace :245-251 with: '**Agent-executed, unenforced by default.** Nothing in the skills zip runs this table for you. The opchain plugin ships a PreToolUse(Bash) hook (`plugins/opchain/hooks/pre-commit-gate.cjs`) that denies `git commit` unless `.checkpoints/oc-bug-check.checkpoint.json` records a PASS (`skill_state.last_run.verdict`) within 10 minutes or bound to the current `verified_tree`; it arms only in repos containing `.checkpoints/` or `.opchain/` (or `OPCHAIN_GATE=1`) and is cleared only by `OPCHAIN_BYPASS=1`/`--no-verify`. The opchain.dev repo's own `.claude/settings.json` hook is a separate shell script that soft-skips when `jq` is missing.'

### skills/oc-git-ops/SKILL.md:375 — /oc-git-sync runs oc-docs-forge after commit, bug-check and push, but never commits the README/product-doc edits it produces
*category:* executability

**Problem.** Steps 5-7 commit, run bug-check, and push; step 8 then invokes /oc-docs pr 'to produce the ## Documentation body fragment (and any README/product-doc edits that must travel with the change)'. No step 8b commits or pushes those edits, bug-check is declared 'already run at commit time' (:345), and step 9's /oc-repo verify flags dirty related files. Following the text a session either opens a PR whose docs edits are still uncommitted or trips its own repo-ops gate on them. The same push-before-docs order is in the overview flow (:73-80). It also disagrees with oc-repo-ops's Every-PR order, which puts the bug-check-before-commit step after docs-forge/repo-ops.

**Evidence.** SKILL.md:373-377 steps 6 bug-check, 7 'Push — git push -u origin <branch>', 8 docs packet '(and any README/product-doc edits that must travel with the change)', 9 repo-ops, 10-11 PR; :344-345 'docs-forge -> repo-ops -> bug-check (already run at commit time) -> PR'. oc-docs-forge/SKILL.md:37 'documentation that must travel with it'. oc-repo-ops/SKILL.md:59-64 order '1. Docs Forge ... 2. Repo Ops ... 3. Bug Check runs the fast code gate before commit. 4. Git Ops opens the PR'; :95 flags 'Dirty untracked files that look related to the PR but are not staged'.

**Proposed fix.** Either move step 8 (/oc-docs pr) ahead of step 4-6 so docs edits are staged, gated by bug-check, and pushed with the change, or insert an explicit step 8b 'commit docs-forge edits (docs: ...), re-run the oc-bug-check gate, push' before /oc-repo verify. Update :73-80 and :344-345 to match whichever order is chosen.

### skills/oc-git-ops/SKILL.md:413 — /oc-git-release hard-requires opchain-repo-only artifacts on any project, against the protocol's CLI-optional rule
*category:* repo-only-hard-requirement · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers skills/oc-release-ops/SKILL.md:297 for the release-ops half ('Verify gate and default plan/dr

**Problem.** `/oc-git-release <semver>` is a declared frontmatter verb (oc-git-ops frontmatter `commands:` includes `/oc-git-release`) and is the target of oc-release-ops' release handoff, including its multi-project mode. Its preconditions and steps are unconditionally opchain-specific with no user-project fallback: it refuses unless 'the lockstep catalog version in `skills/*/SKILL.md`' equals the semver (:411-412), refuses unless `release-seal.json` exists and names that version (:413-414), and requires `node scripts/check-release-tag.mjs --local` (:425) and again at :439. None of those exist on a user project. The bundled protocol states the opposite rule: 'On a user's own project none of this exists — and that is expected... If any command in this section is not found, skip it and write the file yourself' (oc-checkpoint-protocol/SKILL.md:385-391). A session running /oc-git-release on a consumer repo refuses at precondition 2 on a directory that does not exist.

**Evidence.** skills/oc-git-ops/SKILL.md:411-412 `- The lockstep catalog version in \`skills/*/SKILL.md\` does not equal \`<semver>\`.`; :413-414 `- \`release-seal.json\` is missing or names another catalog version.`; :425 `4. \`node scripts/check-release-tag.mjs --local\``; :439 `7. Verify with \`node scripts/check-release-tag.mjs\` (exit 0).` Rule violated: skills/oc-checkpoint-protocol/SKILL.md:385-391 `**On a user's own project none of this exists — and that is expected.**`

**Proposed fix.** Gate the whole precondition/step block behind 'In the opchain.dev repo:' and add a generic branch for other projects (verify HEAD is on the default branch, the project's own version surface matches the semver per `.opchain/release.yaml`, then `git tag -s` + push), matching the multi-project mode oc-release-ops:328+ already assumes.

### skills/oc-migration-ops/references/migration-playbooks.md:604 — Ecosystem playbook still hardcodes claude.ai-sandbox paths and tools; `/oc-migrate ecosystem` cannot be executed as written on Claude Code
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:512 [oc-migration-ops] Ecosystem playbook hardcodes claude.ai-sandbox paths and tools (CONFIRMED, env-assu

**Problem.** The playbook loaded for 'update all skills' / 'checkpoint protocol upgrade' (frontmatter triggers :34-36) scans `/mnt/skills/user/*/SKILL.md` (:604-605, :763-764), stages to `/home/claude/skill-migration-staging/` (:626), says skills are read-only in /mnt/skills and installed via 'Settings -> Customize -> Skills' (:637, :787, :828-831), and calls a `memory_user_edits` tool (:775-779). None of that exists in Claude Code, where skills live in skills/ (this repo) or ~/.claude/skills.

**Evidence.** `grep -rn '/mnt/skills\|memory_user_edits\|/home/claude' skills --include='*.md'` (excluding bundles) -> 9 hits in this file. Repo skill source is `skills/*/SKILL.md` (33 files); install path per CLAUDE.md is the opchain-skills.zip / plugin.

**Proposed fix.** Rewrite the Ecosystem playbook step templates against `skills/<id>/SKILL.md` + `plugins/opchain/skills` sync + `npm run gen-catalog` / `node scripts/checkpoint.mjs validate`, and replace memory_user_edits with an instruction to update CLAUDE.md / auto-memory files.

### skills/oc-modularize-ops/SKILL.md:173 — 'modularization/fixtures/ is gitignored by default' — nothing implements it (PII exposure)
*category:* gate-reality · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:765 (CONFIRMED, doc-drift, fix:S)

**Problem.** Phase 1 states as fact that `modularization/fixtures/` (real-data fixtures that may carry PII) 'is gitignored by default with explicit opt-in'. No .gitignore template, hook, script, or plugin command references the path, and the skill gives no step that creates the ignore rule. A session following the text as written will assume the protection exists and can commit real-traffic fixtures. The 1.7 plan's R1 row calls this a hard requirement.

**Evidence.** grep -rn modularization .gitignore scripts/ plugins/opchain/hooks plugins/opchain/commands src/ → only src/generated/mcp-catalog.json:360 (the skill's own description text). docs/releases/1.7-plan.md:828 'R1 | Golden fixtures from real prod data = PII/secrets exposure … `modularization/fixtures/` is gitignored by default with explicit opt-in. **Hard requirement.**'

**Proposed fix.** Make it a step: 'on `/oc-modularize characterize`, append `modularization/fixtures/` to .gitignore before writing any fixture; opt-in by removing the line', or wire it into the plugin's commit gate; reword :173-174 from 'is gitignored' to the imperative until then.

### skills/oc-modularize-ops/SKILL.md:204 — Handoff to oc-migration-ops has no receiving side — the emitted Structural plan and module-map.json are never ingested
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:249 (chaining-gap, no invocation mechanics); docs/releases/1.7-plan.md:810 (S5 cross-skill ripples)

**Problem.** Phase 3 (:204-205), Phase 5 (:236-237) and the Handoff contract (:308-309) say modularize-ops emits a Structural migration plan and that oc-migration-ops reads modules[] / modularization/module-map.json to build the cutover plan, then runs `/oc-migrate execute`. No path or format for the emitted plan is given, and oc-migration-ops has no ingestion path: `/oc-migrate execute` starts 'from migration plan' produced by its own `/oc-migrate plan` at migrations/migration-plan.md, and its Cross-Skill Reads table does not list oc-modularize-ops. A session reaching Phase 5 runs `/oc-migrate execute`, finds no plan, re-plans from migration-ops's own assess, and the seams / data-ownership / equivalence oracle are silently dropped.

**Evidence.** grep -n -i modulariz skills/oc-migration-ops/SKILL.md → no matches. skills/oc-migration-ops/SKILL.md:65 '/oc-migrate execute      Start or resume execution from migration plan'; :707 'migration-plan.md          # Full plan with all steps' (under migrations/); :666-674 Reads-from table lists oc-reverse-spec, oc-app-architect, oc-stack-forge, oc-code-auditor, oc-scale-ops, oc-deploy-ops, oc-data-ops only. skills/oc-modularize-ops/SKILL.md:204-205 'emits a **Structural migration plan** and hands it to `oc-migration-ops /oc-migrate execute`'.

**Proposed fix.** Define the emitted artifact concretely (e.g. modularize-ops writes migrations/migration-plan.md in migration-ops's Structural step format, or migration-ops gains a `/oc-migrate plan --from modularization/module-map.json` ingestion) and add oc-modularize-ops to oc-migration-ops's Cross-Skill Reads with the artifact path; until then, change Phase 3/5 to say `/oc-migrate plan` must be run against module-map.json before `/oc-migrate execute`.

### skills/oc-modularize-ops/SKILL.md:294 — Claims 1.7 added a deconfliction note to oc-migration-ops's Structural type — it does not exist
*category:* docs-drift · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:146 (P0 — v1.7 skills not integrated into routing)

**Problem.** Lines 294-297 state in past tense that '1.7 adds a note to oc-migration-ops's Structural type pointing live, real-traffic decompositions at oc-modularize-ops and stating the deconfliction trigger'. oc-migration-ops contains no mention of oc-modularize-ops at all, and its type inference still routes 'Split the monorepo' → Structural unconditionally, so the 'two skills must not both fire' rule at :101-103 is enforced by nothing on the migration-ops side. A session reading this skill is misled about what oc-migration-ops will do.

**Evidence.** grep -n -i modulariz skills/oc-migration-ops/SKILL.md → no matches; skills/oc-migration-ops/SKILL.md:136 '- "Split the monorepo" → Structural'. The note was planned, not shipped: docs/releases/1.7-plan.md:461 '> **Resolves an existing seam:** add a note to `oc-migration-ops`'s *Structural* type' and :810 'migration-ops Structural-type deconfliction note → modularize-ops'. skills/CHANGELOG.md:360-364 (1.7.0) records no such change to oc-migration-ops.

**Proposed fix.** Either add the routing note + trigger table to oc-migration-ops's Structural type (and its Reads-from table) so the claim becomes true, or rewrite :294-297 to say the note is still pending.

### skills/oc-modularize-ops/SKILL.md:306 — Handoff contract has sibling skills reading skill_state.modules[] — violates the protocol's private-skill_state rule and duplicates the module-map.json artifact
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:209 (oc-fleet-ops side)

**Problem.** Lines 306-311 say 'oc-modularize-ops writes `skill_state.modules[]`', 'oc-migration-ops reads that set', and 'oc-fleet-ops `topology` reads the same `modules[]`'. The checkpoint protocol says skill_state is private and other skills must never read it. Lines 313-314 then say the real handoff is modularization/module-map.json, whose schema is never defined — the text points readers at two different payloads. oc-fleet-ops/SKILL.md:295-301 copies the same skill_state read.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:162 '// Other skills should NOT read this section — it's private to the owning skill.'; :376 '- Never read `skill_state` — it's private to the owning skill'; :725 '5. **Private state stays private.** `skill_state` is an opaque bag'. skills/oc-modularize-ops/SKILL.md:308 '- **oc-migration-ops reads** that set'; :310 '- **oc-fleet-ops `topology` reads** the same `modules[]`'.

**Proposed fix.** Make modularization/module-map.json the sole cross-skill payload, give it the `{ id, seam_contract, owns_data[], image_hint, equivalence_verified }` schema explicitly, and change :308-311 (and oc-fleet-ops:295-301) to read the file, not skill_state.

### skills/oc-monitoring-ops/references/alerting-patterns.md:42 — Telegram transport hostname corrupted to oc-api.telegram.org — the default alert channel silently never delivers
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:437 (oc-deploy-ops copies only)

**Problem.** The Telegram Bot API host is api.telegram.org. The `oc-` prefix rename that hit the suite mangled it to `oc-api.telegram.org`, which does not resolve. Telegram is declared the opchain default channel (alerting-patterns.md:9, SKILL.md:605, 624) and the transport's `.catch(() => console.error(...))` at :51 swallows the fetch failure, so a user who copies src/lib/alerting.ts as written gets zero alerts with no visible error. The same corrupted host ships in oc-deploy-ops.

**Evidence.** references/alerting-patterns.md:42 `await fetch(\`https://oc-api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage\``; :51 `.catch(() => console.error("Telegram alert delivery failed"))`. `grep -rn 'oc-api.telegram' skills/` → alerting-patterns.md:42, oc-deploy-ops/SKILL.md:439, oc-deploy-ops/references/github-actions.md:97. docs/audits/2026-07-04-portability-audit.md:437 recorded the oc-deploy-ops copies only; this file was not listed and is still unfixed.

**Proposed fix.** Change to `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage` here and in the two oc-deploy-ops files; add `api.telegram.org` / `api.cloudflare.com` to the lint-internal-refs or a grep gate so the rename cannot recur.

### skills/oc-monitoring-ops/references/instrumentation.md:166 — Middleware registration snippet mounts routes at /oc-api while auth guards /api/* — rename artifact leaves routes unauthenticated
*category:* executability

**Problem.** The 'Middleware Registration Order' example applies `authMiddleware` to `/api/*` (line 163) and then mounts the app's routes at `/oc-api` (line 166) — a leftover of the suite-wide `api → oc-api` rename. Copied verbatim, the routes sit outside the auth guard, and the `/api/health` contract the same file defines (:313-336) and SKILL.md:196 rely on lives under `/api`, not `/oc-api`. The same corruption is in oc-stack-forge.

**Evidence.** references/instrumentation.md:163 `app.use("/api/*", authMiddleware);` :166 `app.route("/oc-api", routes);`. `grep -rn 'route("/oc-api"' skills/` → instrumentation.md:166, skills/oc-stack-forge/references/typed-pipeline.md:87. Not in any known-issue register (`grep -rn '/oc-api"' docs/` → none).

**Proposed fix.** Change both to `app.route("/api", routes)`.

### skills/oc-monitoring-ops/SKILL.md:130 — Pipeline handoff into this skill lands on an undefined verb: oc-deploy-ops invokes /oc-monitor verify, which is not a command here, and this text describes a different handoff
*category:* cross-skill-contract

**Problem.** Lines 130-133 say the handoff is: deploy-ops runs its one-shot health check, then either 'oc-monitoring-ops takes over' (if a checkpoint exists) or 'oc-deploy-ops suggests /oc-monitor setup'. oc-deploy-ops's own text does neither: it actively invokes this skill with a verb that does not exist in the 19-entry frontmatter (SKILL.md:10-29) or anywhere in the body. The single primary chain into oc-monitoring-ops therefore names a non-command; a session following deploy-ops improvises (health? setup?), a session following this text expects a suggestion that never comes.

**Evidence.** skills/oc-deploy-ops/SKILL.md:364 `Skill(skill="oc-monitoring-ops", args="/oc-monitor verify")`; :359-372 describe a post-deploy verification (uptime monitor pinging new deployment, error tracking sees fresh events, new SLOs). `grep -n verify skills/oc-monitoring-ops/SKILL.md` → only line 232 ('Version correlation'); no /oc-monitor verify verb. skills/orchestrator.md:143 also routes oc-migration-ops → 'oc-monitoring-ops (verify post-migration)' while oc-migration-ops/SKILL.md:570 invokes `/oc-monitor setup`. `grep -rn 'oc-monitor verify' docs/ .checkpoints/` → no register entry.

**Proposed fix.** Either add `/oc-monitor verify` (post-deploy verification per oc-deploy-ops:367-372: confirm uptime monitor, fresh error-tracking events, SLOs for new surfaces) to frontmatter + the OBSERVE block at SKILL.md:62-67, or change oc-deploy-ops:364 to `/oc-monitor health`. Then rewrite SKILL.md:130-133 to match the chosen mechanism (active invoke, not 'suggests').

### skills/oc-orchestrator/SKILL.md:293 — Recommended monorepo flat layout `<app>-<skill>.checkpoint.json` fails the CLI's filename-skill validator
*category:* gate-reality

**Problem.** Lines 293-297 tell skills to write app-specific checkpoints as `.checkpoints/<app>-<skill>.checkpoint.json` (e.g. `storefront-app-architect.checkpoint.json`) with `project: "storefront"`, and promise this 'keeps every checkpoint visible to status/validate/doctor with no tooling change'. The validator hard-errors on any filename that does not equal `${data.skill}.checkpoint.json`, so a session following this text produces a checkpoint that fails `npm run checkpoint:validate` (which CI runs) and `checkpoint update` refuses to write.

**Evidence.** scripts/checkpoint.mjs:224-228 `// Filename-skill consistency: foo.checkpoint.json must own skill="foo"` ... `if (file !== expected) errors.push(...)`. Reproduced: a file named storefront-app-architect.checkpoint.json with skill="oc-app-architect" -> `OPCHAIN_CHECKPOINTS_DIR=<dir> node scripts/checkpoint.mjs validate` prints `filename storefront-app-architect.checkpoint.json does not match skill="oc-app-architect" (expected oc-app-architect.checkpoint.json)` and exits non-zero. The example also uses the retired bare name `app-architect`.

**Proposed fix.** Either drop the flat `<app>-<skill>` recommendation and state that per-app checkpoints are not supported by the CLI today (point at OPCHAIN_CHECKPOINTS_DIR per app as the only validator-clean option), or relax the validator to accept a `<prefix>-<skill>` filename when `project` matches the prefix; in both cases change the example to an `oc-` prefixed id.

### skills/oc-orchestrator/SKILL.md:569 — Ambiguity example presents oc-security-auditor as 'coming soon' with a verb `/scan` it does not have
*category:* routing

**Problem.** The Ambiguity Handling template the router is told to present verbatim says `2. oc-security-auditor /scan — if you want a full security posture review (coming soon)`. oc-security-auditor is a shipped v1.9.0 skill and `/scan` is not one of its commands; a session following the template misinforms the user about a sibling skill and offers a command that does not exist.

**Evidence.** skills/oc-security-auditor/SKILL.md frontmatter `version: 1.9.0`, commands: /oc-security, /oc-secaudit, /oc-sec, /oc-threat-model, /oc-owasp, /oc-hardening, /oc-attack-surface, /oc-posture; `grep -n '/scan' skills/oc-security-auditor/SKILL.md` returns nothing. Routing table (:525-540) also has no oc-security-auditor row at all.

**Proposed fix.** Rewrite the option as `oc-security-auditor /oc-security` (or `/oc-threat-model`), delete '(coming soon)', and add an oc-security-auditor row to the routing table.

### skills/oc-rag-forge/SKILL.md:429 — oc-deploy-ops has no RAG regression-goldset gate, but this skill says it 'gates prod on the regression goldset passing'
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:557 (doc-drift: absent from orchestrator.md) — partially fixed: §7 entry at orchestrator.md:502 and §8 tri

**Problem.** Cross-Skill Integration (:429) and Read by (:483) tell a session that oc-deploy-ops receives the frozen config + goldset and gates production on it. oc-deploy-ops documents no such gate or read, so a session relying on the text would believe a deploy gate exists that nothing implements.

**Evidence.** grep -n -i 'rag\|retrieval\|goldset\|vector' skills/oc-deploy-ops/SKILL.md -> 0 hits. oc-deploy-ops/SKILL.md:165-236 defines the audit gate as the two-audit gate plus two conditional manifest rows (.opchain/hardening.yaml, .opchain/compliance.yaml) only; its Reads-from table :480-484 lists oc-code-auditor, oc-app-architect, oc-git-ops. orchestrator.md:166-174 states edges are 'conventions, not machinery' and a deploy gate 'has to be enforced by something outside the catalog'.

**Proposed fix.** Either add a conditional gate row to oc-deploy-ops (e.g. `rag/goldset.jsonl` present -> replay `/oc-rag regress` at the deploying SHA, mirroring the v1.9 manifest-gate pattern) and list oc-rag-forge in its Reads-from table, or reword :429/:483 to 'hands the frozen config + goldset to oc-deploy-ops; the regression gate runs in the project's own CI via /oc-rag regress — oc-deploy-ops does not gate on it'.

### skills/oc-release-ops/references/site-release-surfaces.md:43 — site-release-surfaces.md L6/F5 direct edits to site/src/data/roadmap-static.ts, deleted in #449
*category:* docs-drift · *independently reported 2×*

**Problem.** Two release-surface rows the release cut must flip (L6 live-claim 'Roadmap timeline — shipped flip' and F5 forward 'Roadmap timeline — buckets') point at `site/src/data/roadmap-static.ts` with instructions to edit `in-progress`/`planned` buckets, `generated_at`, blurbs and `OPC-` vote ids. That file was removed in commit 5c5ae9d (#449, 2026-08-27, before the v1.9.0 tag); the roadmap is now sourced from GitHub Issues via scripts/gen-roadmap.mjs → site/src/data/roadmap.json (CLAUDE.md). A release cut following this table looks for a file that does not exist and has no instruction for the real surface (issue labels/milestones).

**Evidence.** skills/oc-release-ops/references/site-release-surfaces.md:43 "| L6 | Roadmap timeline — shipped flip | `site/src/data/roadmap-static.ts` | ..." and :89 "| F5 | Roadmap timeline — buckets | `site/src/data/roadmap-static.ts` | ...". `ls site/src/data/` → authors.ts dashboard-static.ts roadmap-types.ts walkthroughs (no roadmap-static.ts). `git log --diff-filter=D -- site/src/data/roadmap-static.ts` → 5c5ae9d feat(roadmap): source /changelog from GitHub Issues, not Linear (#449), dated 2026-08-27. Not listed in the v2.0 plan §4.4 table (which re-verified this file on 2026-09-03) nor the punchlist.

**Proposed fix.** Replace L6/F5 with the GitHub-Issues procedure from docs/plans/2026-08-26-roadmap-github-issues.md (which issues/labels move a release from in-progress to shipped) and note `npm run gen-roadmap` must be run before the deploy; drop the stale comment at scripts/deploy.mjs:14 too.

### skills/oc-release-ops/references/site-release-surfaces.md:55 — The shipped release skill still instructs the 21-day changelog hero window that governance superseded with the five-hero rule
*category:* contract-contradiction · *surfaced by the release-plan lens* · *known:* plan L3 oc-release-ops row (:623), R8

**Problem.** `site-release-surfaces.md` L4 (:41) and its "The 21-day active window (L4 detail)" section (:55-79) tell the release agent to keep every release shipped ≤ 21 days as a collapsed hero and age out anything older, with a manual aging pass keyed on `hero-ver "… shipped <Mon DD, YYYY>"`. `docs/governance/RELEASING.md:135-143` states the opposite rule — five heroes total (open + four most recent previous minors), aged at each minor cut — and says explicitly "*(This five-hero rule supersedes the 21-day window …)*". The v2.0 plan's own header names RELEASING.md as winning "on conflict for cut mechanics". The skill file is the copy that ships to users and is mirrored publicly; the governance doc is internal. Two consecutive cuts already did not practice the 21-day rule (governance plan :141).

**Evidence.** skills/oc-release-ops/references/site-release-surfaces.md:41 "keep it **and every release shipped ≤ 21 days ago**"; :55 `### The 21-day active window (L4 detail)`; :57 "stay prominent as **heroes** for **21 days**". docs/governance/RELEASING.md:135-143 "**Five heroes total: the open hero plus the four most recent previous minor releases** … *(This five-hero rule supersedes the 21-day window…)*". docs/plans/2026-08-27-release-surface-governance.md:135-141 (R8).

**Proposed fix.** Replace :41 and :55-79 with the R8 five-hero procedure now, as a substrate PR — it names no 2.0 identity so it cannot trip check-release-tag. The plan's L3 row at :623 already schedules this for Sprint 5; pulling it forward removes a live contradiction from the shipped catalog instead of carrying it through the cut that will exercise it.

### skills/oc-release-ops/SKILL.md:173 — Draft phase and verify gate target a changelog DOM that no longer exists
*category:* gate-reality · *independently reported 2×*

**Problem.** Phase 2 says the draft is appended to changelog.astro as `<section class="release release--current">` with the previous entry demoted to `rel-tag rel-tag--past` (:173-175); the post-draft verify checks a `rel-date` (:183); the ship gate row greps for `rel-tag.*v<semver>` (:304) and 'aborts on the first failure' (:294). The live page uses `hero-card hero-card--released` / `rel-card` markup (as this skill's own references/site-release-surfaces.md:41 and :55-79 describe). A session following Phase 2 writes markup the page does not use, and the verify grep row can never match, so `/oc-release ship` hard-blocks on a correct entry. references/changelog-recipe.md:14-29 and :88-99 (v1.2 entry as `<section class="release">` template) are stale the same way.

**Evidence.** grep -c 'release--current' site/src/pages/changelog.astro → 0; grep -n -E 'rel-tag|rel-date|rel-head|rel-summary' site/src/pages/changelog.astro → no output; grep -c 'hero-card--released' → 13, grep -c 'rel-card' → 22; the v1.2 entry is `<article class="rel-card" id="v1-2">` at changelog.astro:924.

**Proposed fix.** Rewrite Phase 2 'File output' and the :183/:304 checks in terms of the hero-card/rel-card structure (promote to `hero-card--released is-open`, `hero-ver "vN.N.N · shipped <Mon DD, YYYY>"`, 21-day age-out) by pointing at references/site-release-surfaces.md L4/L5, and replace the `rel-tag` grep with `node scripts/check-release-surfaces.mjs` (which already probes the Just-Released hero). Update changelog-recipe.md's section structure and template to the current DOM.

### skills/oc-release-ops/SKILL.md:246 — Homepage 'release-pill' does not exist and the announce-phase href check contradicts the site's designed link target
*category:* docs-drift

**Problem.** SKILL.md :96, :204-205, :246-248 and :320 direct edits to an `index.astro` 'release-pill' and say the announce phase 'verifies it points to the new `/changelog#v<semver>` anchor'; references/version-locations.md:20 pins `href="/changelog#v1.3"` `<span>v1.3</span>` and :26 says 'The homepage uses `/changelog#v1.3`'. The actual homepage element is `<a class="release-bar-glow" href="/changelog#v2-0">` with `rb-tag` 'v1.9 · shipped' / 'v2.0 · next' — the link intentionally targets the NEXT release card (site-release-surfaces.md L2 :39 and F1 :85 describe this correctly). A session following :246-248 would rewrite the href to the shipped anchor and break the roadmap link; version-locations.md's dotted anchor form (`#v1.3`) never matched the hyphenated card ids.

**Evidence.** grep -n 'release-pill' site/src/pages/index.astro → 0 hits; sed -n '94,101p' site/src/pages/index.astro shows `href="/changelog#v2-0"`, `<span class="rb-tag">v1.9 · shipped</span>`, `<span class="rb-tag rb-tag-next">v2.0 · next</span>`; stat chip `<span class="stat-num">v1.9</span>` at :113.

**Proposed fix.** Replace 'release-pill' wording in SKILL.md and version-locations.md with the release-bar L2/F1 + stat-chip L3 rows from site-release-surfaces.md; state that the bar's href points at the next-release card (`#vN+1` hyphenated) and that the shipped label/stat are the live-claim surfaces; drop the `/changelog#v1.3` dotted-anchor claim.

### skills/oc-release-ops/SKILL.md:267 — /oc-release ship is circular: step 1's verify gate requires the tag that step 3 creates
*category:* flow-deadlock · *surfaced by the executability lens*

**Problem.** `/oc-release ship` step 1 (:265) runs `/oc-release verify` and says it 'Hard-blocks on any failure'. The verify gate's row list includes 'Release is tagged and pushed | `node scripts/check-release-tag.mjs`' (:307). The tag is only created at step 3 (:277 'After the PR merges, run `/oc-git-release <semver>`'). On a real release the catalog version has just been bumped by `/oc-release bump` and no tag exists yet, so check-release-tag.mjs fails and step 1 hard-blocks before the flow can ever reach step 3. The circularity is reinforced by :307's own claim that this is 'the same check `npm run deploy` runs, so the gate you run and the gate that blocks you cannot disagree' — that guard is a post-tag deploy guard, not a pre-tag ship guard.

**Evidence.** skills/oc-release-ops/SKILL.md:265 `1. \`/oc-release verify\` — run the full pre-ship gate. Hard-blocks on any failure.`; :277-279 `**After the PR merges, run \`/oc-git-release <semver>\`.** This is the step that was missing until v1.8.3: the tag, and the push...`; :307 `| Release is tagged and pushed | \`node scripts/check-release-tag.mjs\` ... |`. Verified the script is the real gate: `node scripts/check-release-tag.mjs` exits 0 today only because v1.9.0 is already tagged (CLAUDE.md: 'npm run deploy ... refuses when the lockstep catalog version ... has moved somewhere no git tag follows').

**Proposed fix.** Split the verify gate into a pre-tag set (catalog, tests, build, docs packet, repo readiness, version lockstep) and a post-tag set (check-release-tag), and have /oc-release ship run the pre-tag set at step 1 and the post-tag set between step 3 and step 4. Mark the tag row explicitly 'runs after /oc-git-release, not before'.

### skills/oc-release-ops/SKILL.md:287 — Bare `/oc-deploy` is used as the production-deploy verb in two skills and the shared protocol, but oc-deploy-ops defines it as the menu
*category:* handoff-verb-mismatch · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md §3a registers `/oc-deploy prod` as undeclared (cited at app-architect:557, migration-ops:569); the inve

**Problem.** oc-deploy-ops:30 defines the bare verb as display-only ('When the user types `/oc-deploy`, display this menu'), and names `/oc-deploy prod` (:37) as the production verb — which is itself absent from oc-deploy-ops' frontmatter `commands:` (only `/oc-deploy`, `/oc-deploy staging`, `/oc-deploy audit`). Three call sites treat bare `/oc-deploy` as 'deploy to production': oc-release-ops:287 'Run `/oc-deploy` (prod) on user confirmation', skills/orchestrator.md:207 'Invoke oc-deploy-ops `/oc-deploy staging` then `/oc-deploy` on user confirmation', and skills/orchestrator.md:56 'Have code ready to ship? -> Start with `/oc-git-sync` then `/oc-deploy`'. A session following any of these renders a menu at the moment it believes it is shipping production, and the rollback precondition at oc-release-ops:316 ('`/oc-deploy` not yet run') is untestable as written.

**Evidence.** skills/oc-deploy-ops/SKILL.md:30 `When the user types \`/oc-deploy\`, display this menu:`; :37 `  /oc-deploy prod       Promote staging to production (or direct deploy)`; frontmatter `commands:` at :10-13 lists only `/oc-deploy`, `/oc-deploy staging`, `/oc-deploy audit`. skills/oc-release-ops/SKILL.md:287 `   - Run \`/oc-deploy\` (prod) on user confirmation.`; skills/orchestrator.md:207; skills/orchestrator.md:56.

**Proposed fix.** Add `/oc-deploy prod` to oc-deploy-ops' frontmatter `commands:` and replace every bare-`/oc-deploy`-means-production use (oc-release-ops:287, :316, :479; orchestrator.md:56, :207) with `/oc-deploy prod`.

### skills/oc-release-ops/SKILL.md:304 — Three Cross-Skill Reads consume sibling skill_state, violating the checkpoint protocol's privacy rule
*category:* cross-skill-contract · *independently reported 3×* · *known:* docs/plans/coordination-gaps-punchlist.md P3d (cites oc-release-ops/SKILL.md:292, now :305)

**Problem.** The verify table row "`/changelog` has the new release entry | grep for `rel-tag.*v<semver>`" targets a CSS class that does not exist in site/src/pages/changelog.astro (0 occurrences). The live markup uses `hero-card--released` (13), `hero-ver` (7), `rel-card` (22). The same skill's own references/version-locations.md:24 row also tells `/oc-release bump` to rewrite `<section class="release release--current">` / `<span class="rel-tag">vN</span>` — also 0 occurrences — while references/site-release-surfaces.md L4 and scripts/check-release-surfaces.mjs:48-49 correctly use `hero-card--released`. A session following verify as written concludes the changelog entry is missing on every release.

**Evidence.** `grep -c 'rel-tag' site/src/pages/changelog.astro` → 0; `grep -c 'release--current'` → 0; classes present: hero-card--released/hero-ver/rel-card. skills/oc-release-ops/references/version-locations.md:24: "| `site/src/pages/changelog.astro` | Most recent `<section class=\"release release--current\">` | `<span class=\"rel-tag\">v1.3</span>` |". scripts/check-release-surfaces.mjs:48: label "changelog Just-Released hero (open)". Not in the punchlist, §4.4 table, or audits.

**Proposed fix.** Either promote `verified_for_sha` (and a merged-PR / last-deployed-SHA summary) into protocol-level top-level fields as punchlist P3d proposes, or reword the rows to read only top-level fields (`progress_table`, `pm_refs`, `context_primer.generated_files`) and drop the `verified_for_sha` gate row until the field is public.

### skills/oc-reverse-spec/SKILL.md:214 — Sibling-skill reads point at claude.ai sandbox paths (/mnt/skills/user/…) that do not exist on Claude Code
*category:* executability · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:512 (oc-migration-ops sandbox paths — same family, different skill)

**Problem.** Phase 2 says 'Read `/mnt/skills/user/oc-app-architect/references/spec-template.md` for the canonical templates', Phase 3 (:376) 'Read the UX design guide at `/mnt/skills/user/oc-app-architect/references/ux-design-guide.md`', and Phase 4 (:404) 'Read `/mnt/skills/user/oc-stack-forge/SKILL.md`'. That is the claude.ai sandbox mount; on Claude Code the skills live at `.claude/skills/<id>/` or `~/.claude/skills/<id>/` (skills/README.md:27, mirror/README.md:31) and in the plugin cache. Every other skill uses relative sibling links (e.g. oc-stack-forge/SKILL.md:293 `../oc-app-architect/references/scaffold-guide.md`). The same sandbox-path family in oc-migration-ops/references/migration-playbooks.md:604-605,637,763-764 is already in the portability audit; the reverse-spec instances are not.

**Evidence.** SKILL.md:214 'Read `/mnt/skills/user/oc-app-architect/references/spec-template.md` for the canonical templates.'; :376 'Read the UX design guide at `/mnt/skills/user/oc-app-architect/references/ux-design-guide.md`'; :404 'Read `/mnt/skills/user/oc-stack-forge/SKILL.md`'. `ls /mnt/skills/user` → No such file or directory. The files exist in-repo at skills/oc-app-architect/references/{spec-template,ux-design-guide}.md and skills/oc-stack-forge/SKILL.md. docs/audits/2026-07-04-portability-audit.md:512-515 flagged the identical pattern for oc-migration-ops' playbook but has no [oc-reverse-spec] finding.

**Proposed fix.** Replace the three absolute paths with the portable form used elsewhere in the catalog ('read oc-app-architect/references/spec-template.md from the installed skills directory (~/.claude/skills or the repo's skills/)'), matching how :563 already cites `oc-app-architect/SKILL.md` relatively.

### skills/oc-reverse-spec/SKILL.md:486 — Output Delivery names a nonexistent tool (present_files) and claude.ai-only paths (/home/claude, /mnt/user-data)
*category:* executability

**Problem.** The only delivery instruction in the skill writes to /home/claude/reverse-spec-output/, copies to /mnt/user-data/outputs/, and calls a `present_files` tool. None exist on a user machine (macOS /home is a read-only automount; present_files is not a Claude Code tool). Phase 0 likewise points uploads at /mnt/user-data/uploads. The '(or user-specified directory)' escape leaves the default unexecutable and gives no project-relative default.

**Evidence.** SKILL.md:486-487 'Generate all output files to `/home/claude/reverse-spec-output/` (or user-specified directory), then copy final versions to `/mnt/user-data/outputs/`. Use the present_files tool to share.'; :137 'Files in /mnt/user-data/uploads or pasted code'. `ls /home/claude /mnt/user-data` → No such file or directory. docs/audits/2026-07-04-portability-audit.md has CONFIRMED env-assumption findings for the same pattern in oc-dash-forge (:412-415), oc-git-ops (:477-480), oc-orchestrator (:805-808) but none for oc-reverse-spec.

**Proposed fix.** Default the output root to `{project-dir}/reverse-spec-output/` (or `{project-dir}/spec/` — see the handoff-path issue), drop the copy step and the present_files call, and replace :137 with 'files the user attaches or pastes'.

### skills/oc-reverse-spec/SKILL.md:565 — Handoff tells the session to run /oc-discover or /oc-spec, but oc-app-architect documents reverse-spec output entering at /oc-roadmap; orchestrator says Phase 2 baseline
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** The handoff asserts a read the target skill never performs. oc-app-architect/SKILL.md mentions oc-reverse-spec only at :650 (picks up at Phase 4/6) and :661 (quick-start mode); its PM section (:691-753) reads only an explicit `--ticket` id and its own `skill_state.pm.sprint_comments[]`. The read exists only in the protocol's Reads table and the orchestrator map, so a session in oc-app-architect has no instruction to locate reverse-spec's parent ticket.

**Evidence.** SKILL.md:564-566 'Execute the appropriate command: `/oc-discover --ticket {parent-id}` if PM tickets were filed (treats this run as the discovery), otherwise `/oc-spec` directly.' vs oc-app-architect/SKILL.md:661-664 '### From existing specs (oc-reverse-spec output)  /oc-roadmap → /oc-scaffold → /oc-build → /oc-launch' and :650 'oc-app-architect picks up at Phase 4 (sprint plan) or Phase 6 (build)' vs skills/orchestrator.md:199 'load oc-reverse-spec's output as Phase 2 baseline'.

**Proposed fix.** Make :565 match oc-app-architect's documented mode: run `/oc-roadmap` (Phase 4) against the generated specs, passing `--ticket {parent-id}` only if oc-app-architect grows that flag on /oc-roadmap; reconcile orchestrator.md:199 to 'Phase 4 (sprint plan) baseline' in the same PR.

### skills/oc-scale-ops/SKILL.md:171 — Claims oc-deploy-ops enforces performance budgets in its smoke suite and reads the readiness score; oc-deploy-ops does neither
*category:* cross-skill-contract

**Problem.** SKILL.md:171 states 'In oc-deploy-ops: Performance budgets are part of the smoke test suite' and :434 lists oc-deploy-ops as reading 'Readiness score → deploy confidence at scale'. oc-deploy-ops's smoke suite is HTTP-status + '<html' grep only, its health check has one hard-coded >2.0s latency warning, and its Reads-from table has no oc-scale-ops row. A session trusting this text believes budgets are gated at deploy when nothing implements it.

**Evidence.** skills/oc-deploy-ops/SKILL.md:285-312 (run_smoke checks http_code only), :349-354 (single '$LATENCY > 2.0' warning), :411-412 (health check bullets: status + latency, no budgets), :480-484 (Reads from: oc-code-auditor, oc-app-architect, oc-git-ops only); grep -n -i 'oc-scale\|scale-ops\|budget' skills/oc-deploy-ops/SKILL.md → zero hits for oc-scale/scale-ops/budget.

**Proposed fix.** Reword :171 as an unwired recommendation ('hand the budget thresholds to oc-deploy-ops' smoke suite — not enforced today') or add a budget-check row to oc-deploy-ops's smoke suite and an oc-scale-ops row to its Reads-from table; otherwise drop :434.

### skills/oc-security-auditor/SKILL.md:62 — oc-deploy-ops invokes `/oc-security pre-deploy`, a verb this skill never defines; this skill calls the deploy gate optional while oc-deploy-ops makes it mandatory
*category:* cross-skill-contract

**Problem.** The command reference (SKILL.md:50-80) and frontmatter commands (:10-18) have no `pre-deploy` verb, but oc-deploy-ops' Pre-Deploy Audit Gate invokes exactly that verb. A session following oc-deploy-ops as written hands this skill an argument it cannot route; a session following this skill's Read-by row believes the posture gate is optional when the consumer says both audits must pass.

**Evidence.** `grep -n pre-deploy skills/oc-security-auditor/SKILL.md` → no matches. skills/oc-deploy-ops/SKILL.md:195 `#   Skill(skill="oc-security-auditor", args="/oc-security pre-deploy")`; :166-168 'run two audits in order: oc-code-auditor ... then oc-security-auditor ... Both must pass'. This skill's :469 `| oc-deploy-ops | Posture grade → deployment gate (optional) |`. orchestrator.md:140 also lists oc-deploy-ops 'posture check before prod gate'.

**Proposed fix.** Either add `/oc-security pre-deploy` (posture at the auto-detected tier, no compliance pillar unless Comprehensive) to the command reference at :62 and frontmatter, or change oc-deploy-ops:195 to `/oc-security posture`; and rewrite :469 to say the gate is mandatory before `/oc-deploy staging|prod`.

### skills/oc-security-auditor/SKILL.md:473 — Findings handoff has no carrier: skill_state holds only counts/scores, yet three surfaces promise readers the findings and tier from the checkpoint
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:614 (L3 row for oc-code-auditor's analogous missing `report_path`; no row exists for oc-secu

**Problem.** The Read-by row advertises 'Findings + tier' to oc-security-hardening, the PM comment points subscribers at the checkpoint as the 'Full report', and the When-to-Write table promises STRIDE findings / attack surface map / adversary profiles are saved — but the documented skill_state carries only `findings_total`, `findings_by_risk` counts and scores, and no `report_path`, artifact path or findings array exists anywhere in the contract. `tier` lives only in skill_state, which the protocol forbids siblings from reading. oc-security-hardening's `/oc-harden fix` step 1 'Pull the finding: the oc-security-auditor checkpoint' therefore has nothing to pull.

**Evidence.** SKILL.md:470-472 rows for oc-code-auditor, oc-app-architect, oc-scale-ops. `grep -c oc-security-auditor skills/oc-scale-ops/SKILL.md` → 0. skills/oc-code-auditor/SKILL.md:448-452 Reads-from lists only oc-reverse-spec, oc-app-architect, oc-stack-forge (:202 is prose 'complement', not a read). oc-app-architect has no Reads-from row (only :555 invokes `/oc-security posture`). skills/oc-deploy-ops/SKILL.md:480-484 Reads-from lists oc-code-auditor, oc-app-architect, oc-git-ops only, despite :183-196 invoking this skill. orchestrator.md:139-140,148 backs the code-auditor/deploy-ops edges at ecosystem level but names no oc-scale-ops edge.

**Proposed fix.** Document a durable report artifact (e.g. `docs/audits/<date>-security-posture.md` or `.opchain/security-posture.md`) with SA-XXX findings, add a top-level `report_path` (or `artifacts`) to the checkpoint and to the When-to-Write table, and surface `tier` in `context_primer`/a top-level field so oc-security-hardening's read is protocol-legal; re-point :506 at the report path. Mirror the v2.0 L3 oc-code-auditor row.

### skills/oc-signal-forge/SKILL.md:215 — oc-signal-forge's Evaluator loop has no iteration ceiling and no escalation path, unlike every other tri-agent skill
*category:* undefined-termination · *surfaced by the executability lens*

**Problem.** The Evaluator gate terminates with '**FAIL -> Builder fixes -> re-verify**, same loop until all four axes pass' (:215). No max-iteration count and no 'escalate to user' branch exists anywhere in the file (grep for max/rounds/escalate across oc-signal-forge/SKILL.md returns nothing). Every sibling tri-agent skill bounds the loop and names an escalation: oc-app-architect:401 `| max_iterations | 3 |` plus :530 'FAIL + max iterations: Escalate to user'; oc-ux-engineer:390; oc-api-dev:376; oc-rag-forge:373; oc-agent-forge:406; oc-integrations-engineer:343. Worse, :128 explicitly claims signal-forge runs 'the same loop discipline as oc-app-architect's Generator/Evaluator' — the one property it does not share. A session on a metric that cannot be reconciled against ground truth has no defined exit and will loop until the user interrupts.

**Evidence.** skills/oc-signal-forge/SKILL.md:215 `**FAIL → Builder fixes → re-verify**, same loop until all four axes pass.`; :126-129 `This is the same loop discipline as \`oc-app-architect\`'s Generator/Evaluator`. Contrast skills/oc-app-architect/SKILL.md:401 `| max_iterations | 3 |` and :530 `- **FAIL + max iterations**: Escalate to user with all eval reports.`; skills/oc-rag-forge/SKILL.md:373 `Max iterations: 3.`; skills/oc-agent-forge/SKILL.md:406 `Max iterations: 3.`

**Proposed fix.** Add 'Max iterations: 3. FAIL + max rounds -> escalate to user with the failing axis and the ground-truth reconciliation attempts' after :215, and record the round number in `skill_state.signals[]` the way rag-forge/agent-forge record theirs.

### skills/oc-signal-forge/SKILL.md:252 — freshness_sla handoff to oc-monitoring-ops has no receiver; the 'first-class Data-freshness SLI + v1.6 eval-drift template' description is wrong
*category:* cross-skill-contract

**Problem.** Lines 207, 224-225, 252 and 275 say the wire phase hands each signal's `freshness_sla` to oc-monitoring-ops, which 'has a first-class Data-freshness SLI + the v1.6 eval-drift template' and 'enforces' the SLA. oc-monitoring-ops has no intake for signal-forge or freshness_sla, its 'Data freshness' entry is a row in the SLO-tier target table (not an SLI it ingests from anyone), and its Eval-drift template is model/prompt-quality drift via oc-prompt-ops — unrelated to data staleness. A session following /oc-signal wire will 'hand off' the SLA into nothing and move on believing the prod alarm is monitoring-ops's job.

**Evidence.** `grep -n -i 'signal-forge\|freshness_sla' skills/oc-monitoring-ops/SKILL.md` → 0 hits. skills/oc-monitoring-ops/SKILL.md:319 `| Data freshness | Best effort | <5 min | <1 min | <30s |` sits in the `Metric (SLI) | T0..T3 Target` SLO table (:314-319). :385 `| **Eval drift** | model/prompt quality silently regressing in prod | scheduled oc-prompt-ops drift run ...` and :392 'Eval drift reuses oc-prompt-ops drift'. Cross-Skill Reads :577-585 list `oc-data-ops | Monitor inventory from /oc-data-ops observe (freshness/volume/schema checks) (v1.9)` but no oc-signal-forge. skills/orchestrator.md:151 monitoring-ops upstream = oc-deploy-ops, oc-data-ops, oc-security-hardening only. skills/CHANGELOG.md:375-377 (v1.7) claims 'oc-dash-forge + oc-monitoring-ops — gain oc-signal-forge as the upstream ... monitoring-ops enforces each signal's freshness SLA' — that edit never landed in monitoring-ops.

**Proposed fix.** Add an `oc-signal-forge | per-signal freshness_sla from signals/catalog.md → Data-freshness SLI alert + runbook` row to oc-monitoring-ops Cross-Skill Reads (:577-585) and to the orchestrator.md map/Declared chains, handing the SLA via signals/catalog.md (not skill_state, which is private); rewrite :252 and :275 to drop the eval-drift template claim and name the actual monitoring-ops verb (`/oc-monitor alerts`). Note the oc-data-ops seam already routes mart-backed signals' staleness through the contract monitor (:255), so only raw-source signals need this path.

### skills/oc-signal-forge/SKILL.md:278 — Claims oc-app-architect Phase 2 chains to oc-signal-forge; nothing in oc-app-architect or orchestrator.md does
*category:* cross-skill-contract · *independently reported 3×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:159 (P1: 'Handoff points do not include app-architect -> signal-forge')

**Problem.** The 'Resolves an existing seam' callout says 'In 1.7, app-architect's Phase 2 chains to `oc-signal-forge` when the analytics doc warrants real instrumentation — the plan finally has a skill that builds it.' Four releases later oc-app-architect/SKILL.md contains zero references to oc-signal-forge, its spec table still lists `08-analytics.md` with Source '—' (:255), and neither the Upstream table nor §3 records the edge. The seam the callout says is resolved is still open, and the text tells signal-forge users to expect an upstream invocation that never happens.

**Evidence.** `grep -n -i 'signal' skills/oc-app-architect/SKILL.md` → 0 hits. skills/oc-app-architect/SKILL.md:255 `| 08-analytics.md | Tracking, metrics (if warranted) | — |` (source column empty, unlike 06-testing.md → oc-qa-ops at :253). Cross-Skill Integration table :638-650 has no oc-signal-forge row. skills/orchestrator.md Handoff Points :189-213 contain only `Metric needs a pipeline that doesn't exist | oc-signal-forge | oc-data-ops` (:210); Declared chains :665-674 list oc-data-ops 'from oc-app-architect Phase 2 on data-heavy discovery' but never oc-signal-forge from oc-app-architect.

**Proposed fix.** Either implement the seam — add a 'Metrics branch' to oc-app-architect Phase 2 after the oc-data-ops branch (:224-235), set the 08-analytics.md source column (:255) to oc-signal-forge, add a Cross-Skill Integration row (:640-650), and add an orchestrator.md Handoff row 'Analytics doc warrants instrumentation | oc-app-architect (Phase 2) | oc-signal-forge | Invoke /oc-signal frame' — or rewrite :278-281 to say the seam is still open and /oc-signal must be invoked manually after the spec gate.

### skills/oc-stack-forge/SKILL.md:394 — Mobile dispatch hands App Store / Play Store / TestFlight release to oc-release-ops, which has no such workflow
*category:* cross-skill-contract

**Problem.** SKILL.md:394-396 states 'Mobile dispatch deliberately does NOT invoke oc-deploy-ops; oc-release-ops handles the App-Store / Play-Store / TestFlight / Internal-Testing workflow.' oc-release-ops/SKILL.md has zero occurrences of testflight, app store, play store, or mobile. A session finishing a kind: mobile pack is told to hand off to a skill that has nothing to catch it.

**Evidence.** grep -n -i 'testflight\|app store\|play store\|mobile' skills/oc-release-ops/SKILL.md → no output; grep -rn -i 'testflight\|app store\|play store' skills/*/SKILL.md → only skills/oc-stack-forge/SKILL.md. oc-deploy-ops/SKILL.md also has no 'mobile' hits, so the 'do not invoke oc-deploy-ops' half is consistent.

**Proposed fix.** Either drop the oc-release-ops claim (the mobile.md checklist is the release path) or add a mobile-store release section + handoff row to oc-release-ops and orchestrator.md §3 before pointing at it.

### skills/oc-telemetry-ops/SKILL.md:21 — oc-telemetry-ops claims the bare trigger "telemetry" for opchain-internal usage metering; oc-monitoring-ops owns app observability and neither description names the other
*category:* routing-collision · *surfaced by the routing lens*

**Problem.** oc-telemetry-ops:21 quotes the unqualified trigger "telemetry" although its scope (:18-20) is opt-in, local-first metering of which opchain skills ran, written to .checkpoints/usage.sqlite. In ordinary dev usage 'set up telemetry' means application instrumentation, which is oc-monitoring-ops (:31 'Post-deployment observability', :35 quoted "observability"). Neither description mentions the other skill (oc-telemetry-ops names only oc-cost-ops at :24; oc-monitoring-ops names only oc-deploy-ops at :32-33), so the router has no carve-out to break the tie; oc-signal-forge:26-27 is the only skill that separates them, and only in its own direction. Neither skill appears in tests/routing-disambiguation.test.js, and neither has an eval case. A user asking for telemetry on their service can land in a skill that will offer to record which opchain skills they ran.

**Evidence.** skills/oc-telemetry-ops/SKILL.md:21 `/oc-telemetry, "usage metering", "telemetry", "opt-in analytics", "which skills`; :18-20 scope; :24 `Pairs with oc-cost-ops`; skills/oc-monitoring-ops/SKILL.md:31 `Post-deployment observability: uptime monitoring, error tracking...`; :35 `response", "observability", "what's happening in prod"...`; script over all 33 descriptions: oc-telemetry-ops names {oc-cost-ops}, oc-monitoring-ops names {oc-deploy-ops}; `grep -n 'telemetry\|monitoring' tests/routing-disambiguation.test.js` → no matches; no expected.jsonl row names either skill.

**Proposed fix.** Qualify the phrase in oc-telemetry-ops:21 ('opchain usage telemetry') and add a mutual NOT-clause to both descriptions (telemetry-ops: 'NOT application/production observability — oc-monitoring-ops'; monitoring-ops: 'NOT opchain skill-usage metering — oc-telemetry-ops'), then add the pair to tests/routing-disambiguation.test.js and one eval case each.

### skills/orchestrator.md:130 — orchestrator.md §2 map and §3 Handoff Points carry no row for oc-modularize-ops (nor the modularize → migration → fleet chain)
*category:* orchestrator · *independently reported 3×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:146 (P0 — New v1.7 skills are not fully integrated into checkpoint routing)

**Problem.** The table §2 calls the canonical cross-skill read/chain map has rows for 25 skills. Missing: oc-checkpoint-protocol, oc-claude-api, oc-rag-forge, oc-agent-forge, oc-prompt-ops (v1.5), oc-signal-forge, oc-modularize-ops, oc-fleet-ops (v1.7). Each of the seven command-bearing absentees documents its own reads/chains in its SKILL.md (agent-forge :511-525, rag-forge :472-485, prompt-ops :438-451, claude-api :277-289, signal-forge :264-276, modularize :278-292, fleet :264-276), and other rows reference them as read sources (oc-cost-ops row :156 reads oc-claude-api and oc-prompt-ops; oc-data-ops row :153 reads oc-signal-forge) — so the map has edges pointing at skills it has no row for. The same seven are also absent from the §2 ASCII pipeline map (:66-128) and §8 'Cross-cutting skills' (:696), appearing only as a count at :385-387. oc-checkpoint-protocol/SKILL.md:361-363 tells every skill this table is 'complete, maintained' and 'covers every skill'.

**Evidence.** orchestrator.md:134-158 → 25 `| **oc-…** |` rows (computed against 33 dirs); :156 `| **oc-cost-ops** | oc-claude-api (price table), oc-prompt-ops (eval token counts)…`; skills/oc-signal-forge/SKILL.md:272-276 Chains-to table (dash-forge, monitoring-ops, api-dev); skills/oc-modularize-ops/SKILL.md:287-292 (migration-ops, fleet-ops, code-auditor, git-ops); oc-checkpoint-protocol/SKILL.md:361-363 'the **complete, maintained** upstream/downstream map lives in orchestrator.md … it covers every skill'.

**Proposed fix.** Add oc-modularize-ops and oc-fleet-ops rows to the §2 map (modularize upstream: oc-reverse-spec, oc-app-architect, oc-code-auditor, oc-scale-ops; downstream: oc-migration-ops, oc-fleet-ops) and two §3 Handoff Points rows ('equivalence verified' → oc-migration-ops `/oc-migrate execute`; 'module-map.json written' → oc-fleet-ops `/oc-fleet topology`).

### skills/orchestrator.md:328 — §6 Error Recovery tells sessions to suggest `/oc-rollback`, a verb no skill defines
*category:* orchestrator

**Problem.** The shared protocol's error-recovery step says 'Error in deploy → suggest /oc-rollback'. oc-deploy-ops defines the verb as `/oc-deploy rollback` (menu :39, section heading :380); `/oc-rollback` appears in no SKILL.md frontmatter and no command menu. oc-release-ops repeats the phantom verb at :324 ('invoke `oc-deploy-ops /oc-rollback`'), so both the protocol and the release skill hand a session a command that does not exist at the exact moment production is broken.

**Evidence.** skills/orchestrator.md:328 `Error in deploy → suggest /oc-rollback.`; skills/oc-deploy-ops/SKILL.md:39 `/oc-deploy rollback   Revert to previous production version`; :380 `## Rollback (/oc-deploy rollback)`; `grep -rl '/oc-rollback' skills/*/SKILL.md` → only oc-release-ops (:324). oc-deploy-ops frontmatter commands: [/oc-deploy, /oc-deploy staging, /oc-deploy audit].

**Proposed fix.** Change orchestrator.md:328 and oc-release-ops/SKILL.md:324 to `/oc-deploy rollback`; run `npm run sync-bundles` so every references/orchestrator.md picks it up.

### src/lib/mcp/routing.js:15 — routing.js intent table omits all six v1.8/v1.9 rows of orchestrator.md §4 Smart Routing Table — docs-forge, repo-ops, qa-ops, data-ops, compliance-ops, security-hardening never route by intent over MCP
*category:* routing · *independently reported 3×*

**Problem.** routing.js:16 returns `phase: "/oc-rev-spec"` for reverse-spec intents, but oc-reverse-spec's frontmatter commands (:10-16) declare /oc-reverse-spec, /oc-rev-scan, /oc-rev-full, /oc-rev-design, /oc-rev-stack, /oc-rev-sprint — `/oc-rev-spec` appears only in the description prose (:18), so buildCommandIndex has no entry for it and no MCP prompt is minted for it. When a client then calls route("/oc-rev-spec") (the phase it was just given), routing.js:72-84 finds no index hit and :86-98 runs the NL table on the raw string: `\bspec\b` at :31 matches the hyphenated token and returns `oc-app-architect /oc-discover confident:true`. The same fall-through misroutes other slash verbs the SKILL.md bodies advertise: `/oc-df-status` and `/oc-rev-status` → `oc-orchestrator /oc-ops status true`; `/oc-git-pr` → orchestrator fallback.

**Evidence.** Probes via route(q, mcp-catalog): "Generate the PR docs", "Is this PR ready?", "Repo hygiene", "Catalog drift", "Test pyramid", "Coverage budget", "Data pipeline", "dbt", "Data contract", "SOC 2 evidence", "Compliance checklist", "Harden this", "Fix the security findings", "Roll out CSP" → all `oc-orchestrator /oc-ops false`; "Audit-ready" → `oc-code-auditor /oc-audit true`. Also "Bump versions" (:289 → release-ops) → orchestrator; "Set up webhooks" (:284) → orchestrator because :24 uses `\bwebhook\b` (no plural).

**Proposed fix.** Add six INTENT_HINTS rows ordered before the generic `audit`/`spec` rules: docs-forge (`pr docs|update the readme|docs (drift|upkeep)`), repo-ops (`pr ready|repo hygiene|catalog drift|clean this repo`), qa-ops (`test (strategy|pyramid)|coverage budget|contract test`), data-ops (`data pipeline|dbt|data contract|ingestion|warehouse|stale data`), compliance-ops (`soc ?2|compliance|audit[- ]ready|auditor ask`), security-hardening (`harden|security findings|roll out csp|rate limit`); fix `webhooks?` and add `bump versions?` to the release row. Add a test that walks every example phrase in orchestrator.md §4 and asserts route() returns that row's skill.

### tests/routing-disambiguation.test.js:1 — "tag the release" — the catalog's only exact quoted-phrase collision — is pinned by neither the routing test nor the eval set
*category:* routing-collision · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:734 (the §3/§4 routing side of the same collision)

**Problem.** oc-git-ops/SKILL.md:22 and oc-release-ops/SKILL.md:24 both quote the trigger "tag the release", and orchestrator.md:289 routes it to oc-release-ops /oc-release plan — the skill that cannot tag (the tag verb is oc-git-ops /oc-git-release, required by `npm run check-release-tag`). tests/routing-disambiguation.test.js declares itself the pin for 'routing-collision decisions' and asserts two-way cross-references for six pairs (lines 27-59), but contains no reference to oc-git-ops or oc-release-ops at all, and prompts/opchain-eval has no case for either the phrase or oc-release-ops. The one collision a deterministic scan can find is the one collision with zero regression coverage on both the static and behavioural side.

**Evidence.** skills/oc-git-ops/SKILL.md:22 `"tag the release", "sync to repo", or any git operation.`; skills/oc-release-ops/SKILL.md:24 `"ship v1.3", "tag the release", "draft the changelog"...`; skills/orchestrator.md:289 `| "Cut a release" / "Ship v1.3" / "Bump versions" / "Draft the changelog" / "Tag the release" | oc-release-ops | /oc-release plan |`; `grep -n 'git-ops\|release-ops' tests/routing-disambiguation.test.js` → no matches (file is 61 lines); no expected.jsonl row names oc-release-ops or /oc-git-release.

**Proposed fix.** After the ownership decision lands (split the §4 row or drop the phrase from one description), add the matching assertion to tests/routing-disambiguation.test.js and one llm_judge eval case ('tag the release for v1.9.1') so the decision has both a static and a behavioural pin.


## MEDIUM — upheld (248)

### .checkpoints/oc-bug-check.checkpoint.json:37 — oc-bug-check's eval_scores entry counts the UNSUPPORTED lint check as passed and reports zero warnings, inflating the rubric score to a perfect 1.0
*category:* false-metric · *surfaced by the live-checkpoints lens*

**Problem.** skills/oc-bug-check/SKILL.md:531-532 fixes the rubric: "score = checks_passed / checks_total (0..1, max: 1), with the per-check breakdown in dimensions". The live run recorded lint: "UNSUPPORTED" and warnings: 1 (lines 21, 29) — six of seven checks returned PASS. eval_scores[0] records dimensions {checks_passed: 7, checks_total: 7, warnings: 0} and score 1 (lines 36-43). The correct value is 6/7 ≈ 0.86 with warnings: 1 — which is verbatim the SKILL.md example at :525-527. The gate's own doctrine (pre-commit-gate.cjs:214-220) is that UNSUPPORTED "is not a pass".

**Evidence.** Line 21 `"lint": "UNSUPPORTED"` and line 29 `"warnings": 1` versus lines 40-42 `"checks_passed": 7, "checks_total": 7, "warnings": 0` and line 37 `"score": 1`. progress_summary (line 11) itself says "Verdict PASS with one UNSUPPORTED".

**Proposed fix.** Recompute the entry as score 0.857, dimensions {checks_passed: 6, checks_total: 7, warnings: 1}, and treat UNSUPPORTED as not-passed in the rubric denominator so the trend cannot be gamed by an unrecognised stack.

### .checkpoints/oc-deploy-ops.checkpoint.json:25 — oc-deploy-ops.cloudflare_version_id holds a prose placeholder where a UUID belongs, and the value it waits for is already in the baseline
*category:* stale-state · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.cloudflare_version_id = "unknown until wrangler deployments list runs on the laptop" (line 25) while every sibling id in the same block is a real UUID (staging_cloudflare_version_id at :27, cloudflare_deployment_id at :26). The value has been known since PR #510 merged: .github/monitoring/release-baseline.json:21 records versionId b6268c62-48e8-4c30-a0c6-fea074ae260c for deployment 8da6c19d, and oc-monitoring-ops.checkpoint.json:114 carries the same. A consumer reading the field as an identifier gets a sentence.

**Evidence.** Line 25 versus release-baseline.json:21 and oc-monitoring-ops.checkpoint.json:114 `"version_id": "b6268c62-48e8-4c30-a0c6-fea074ae260c"`.

**Proposed fix.** Set cloudflare_version_id to b6268c62-48e8-4c30-a0c6-fea074ae260c and script_etag to 236d015622faef5596b4dd309c0b0c8cb3e198baacdab4381fbf28f2b662fdfd; use null rather than prose for unknown identifiers.

### .checkpoints/oc-deploy-ops.checkpoint.json:32 — oc-deploy-ops.last_deploy timestamps the v1.9 deploy while prod_version/production_sha describe the later 2026-09-05 deploy
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.prod_version = "78567c2" and production_sha = 78567c2d70e… (lines 22-23), but last_deploy = "2026-09-02T20:11:25.746861Z" (line 32) — the timestamp of the v1.9.0 production deploy of 244bf13 recorded at :105. oc-monitoring-ops.checkpoint.json:119 records the 78567c2 deployment at 2026-09-05T02:24:37Z. Anything deriving deploy age or "what shipped when" from this checkpoint (orchestrator.md:149 names oc-deploy-ops as the source of the "last-shipped commit SHA" for oc-release-ops) pairs the wrong SHA with the wrong time.

**Evidence.** Line 32 `"last_deploy": "2026-09-02T20:11:25.746861Z"` next to line 22 `"prod_version": "78567c2"`; monitoring-ops:119 `"deployed_at": "2026-09-05T02:24:37Z"`.

**Proposed fix.** Set last_deploy to 2026-09-05T02:24:37Z, or split into last_release_deploy and last_runtime_deploy so the tagged release and the approved post-release runtime each keep their own timestamp.

### .checkpoints/oc-git-ops.checkpoint.json:701 — oc-git-ops.last_pr_number is 478 although the same checkpoint records opening #498
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** skill_state.last_pr_number = 478 and last_pr_url points at .../pull/478 (line 701-702), a PR merged 2026-09-02. The same skill_state's open_prs[0] (line 175) records #498 opened_at 2026-09-11T04:16:00Z, and the checkpoint's step (line 9) is "pr-498-awaiting-review". A reader using last_pr_number to find "the PR this session produced" lands nine days and twenty PRs in the past.

**Evidence.** Line 701 `"last_pr_number": 478` versus line 175 `"number": 498` with opened_at 2026-09-11.

**Proposed fix.** Update last_pr_number/last_pr_url on every `gh pr create`, and have the validator warn when last_pr_number is lower than the highest number in open_prs.

### .checkpoints/oc-monitoring-ops.checkpoint.json:157 — Checkpoints spell the repository three different ways — a-atx, asfbay-bit and ainatx — after the canonical owner moved to ainatx
*category:* identity-drift · *surfaced by the live-checkpoints lens*

**Problem.** CLAUDE.md states the canonical source repository is `ainatx/opchain`, set by commit 61a9169 "chore(repo): update canonical owner to ainatx (#480)". Live checkpoints carry all three spellings, sometimes in the same block: oc-monitoring-ops:157 and :172 use https://github.com/a-atx/opchain/actions/... while :165 and :185 use https://github.com/ainatx/opchain/actions/...; oc-release-ops:120 (release_pr.url) and skill_state.publisher URLs use a-atx; oc-git-ops skill_state.prs[0].url and merged_prs_this_session entries use asfbay-bit/opchain. Every a-atx and asfbay-bit URL for the private repo is a dead link.

**Evidence.** oc-monitoring-ops.checkpoint.json:157 `"latest_v1_9_validation_url": "https://github.com/a-atx/opchain/actions/runs/33686712301"` versus :165 `"https://github.com/ainatx/opchain/actions/runs/34609906583"`. git log 61a9169.

**Proposed fix.** Normalise all stored URLs to ainatx/opchain (keeping asfbay-bit/opchain-skills for the public mirror and registry namespace), and add a doctor check for github.com URLs whose owner is not the canonical one.

### .checkpoints/oc-orchestrator.checkpoint.json:181 — Live checkpoint's skill_state has none of the documented keys (no registry/active_project/routing_history), so the documented session-start sequence lands in cold start on a repo with 16 checkpoints
*category:* live-checkpoint

**Problem.** SKILL.md :705-722 documents skill_state as {registry, active_project, last_scan, scan_summary, routing_history} and Session Start step 1 reads `skill_state.registry` (:729); step 3 says an empty registry means cold-start flow. The live file's skill_state has keys active_branches, merged_prs_this_session, linear_*, skills_invoked_this_session, routing_history_this_session, reconciliation_* and no `registry`. Following the text on this repo therefore prints 'No projects registered yet' (:339) despite 16 live checkpoints.

**Evidence.** `node -e "const c=require('./.checkpoints/oc-orchestrator.checkpoint.json'); console.log(Object.keys(c.skill_state))"` -> no registry/active_project/last_scan/scan_summary/routing_history; .checkpoints/oc-orchestrator.checkpoint.json:243 `skills_invoked_this_session`, :249 `routing_history_this_session`.

**Proposed fix.** Either migrate the live skill_state to the documented shape (add registry with this repo as default_project, rename routing_history_this_session -> routing_history) or change SKILL.md to document the shape actually in use.

### .checkpoints/oc-release-ops.checkpoint.json:86 — pm_refs is adopted by 1 of 17 live checkpoints and uses provider "github" instead of the documented "github-issues", so /oc-ops resume TICKET-ID resolves nothing
*category:* contract-drift · *surfaced by the live-checkpoints lens*

**Problem.** skills/oc-orchestrator/SKILL.md:908-912 defines `/oc-ops resume TICKET-ID` as "Searches pm_refs across all skill checkpoints for the ticket id", and :883 says /oc-ops reads pm_refs across every skill checkpoint. Only oc-release-ops carries the field (lines 86-91): four entries of shape {provider: "github", id: "8"|"9"|"10"|"11", role: "source"}. skills/oc-checkpoint-protocol/SKILL.md:562 documents the provider enum as "linear" | "jira" | "github-issues" — "github" is not one of them, and the validator (scripts/checkpoint.mjs:296-303) only enforces the role enum, so the drift passes silently. The entries also omit url, created_by_skill and first_seen_at from the documented shape (:560-568), and use role "source" four times against the protocol's "one per checkpoint, typically" (:571).

**Evidence.** grep -l '"pm_refs"' .checkpoints/*.json returns only oc-release-ops.checkpoint.json. scripts/checkpoint.mjs:91 `const PM_ROLE_ENUM = ["source", "child", "deploy", "incident", "linked"];` — no PROVIDER enum exists.

**Proposed fix.** Add a provider enum to the validator matching the protocol, normalise the four entries to "github-issues" with urls, and either adopt pm_refs across the skills that carry ad-hoc PM state (oc-orchestrator.linear_active_parents, oc-stack-forge.linear_pr_tickets) or mark the orchestrator's resume-by-ticket verb as unimplemented.

### .checkpoints/oc-repo-ops.checkpoint.json:26 — oc-repo-ops returned PASS with zero blocking findings while its own documented fail-closed condition — checkpoint pointers to files that no longer exist — was live in four checkpoints
*category:* gate-not-firing · *surfaced by the live-checkpoints lens*

**Problem.** skills/oc-repo-ops/SKILL.md:100 lists, under "/oc-repo verify — PR readiness gate. Fail closed on:", the bullet "Checkpoint pointers to files that no longer exist." The live checkpoint records verdict PASS (line 26), blocking_findings [] (line 27) and internal_links_verified true (line 34) at 2026-09-11T04:15:19Z. At that moment nine generated_files entries across four checkpoints pointed at non-existent paths (oc-app-architect blog post, oc-orchestrator ×4 pre-rename checkpoint names, oc-stack-forge ×3 pre-rename pack paths, oc-ux-engineer RoadmapTimeline.astro) — all predating that timestamp and all reported today by `node scripts/checkpoint.mjs doctor`.

**Evidence.** doctor output lists them; none of the four checkpoints has been written since (oc-orchestrator 2026-06-22, oc-stack-forge 2026-06-22, oc-ux-engineer 2026-09-08, oc-app-architect 2026-09-08). oc-repo-ops.skill_state.warnings (line 28-30) contains only a DCO-attribution note.

**Proposed fix.** Make /oc-repo verify actually run `node scripts/checkpoint.mjs doctor` and surface its missing-path warnings as blocking findings, or scope the SKILL.md bullet explicitly to checkpoints the PR touches so the gate stops claiming coverage it does not have.

### .checkpoints/oc-security-hardening.checkpoint.json:31 — Live checkpoint's `skill_state` shares no keys with the documented shape `/oc-harden status`/`verify` rely on
*category:* live-checkpoint

**Problem.** `/oc-harden status` reads `last_verify`, the remediation queue and the gate tier, and `verify` writes `skill_state.last_verify`; the live checkpoint has none of `manifest_path`, `controls{...}`, `csp_stage`, `remediation_queue`, `gate`, `last_verify`. It also never records that this repo has tier-1 machine wiring, so `status` cannot report the gate tier.

**Evidence.** SKILL.md:246-255 documents `manifest_path`, `controls{total,verified,failed,manual}`, `csp_stage`, `remediation_queue`, `gate{installed,chokepoint,machine_enforced}`, `last_verify{sha,date}`; :218 and references/hardening-manifest.md:149 'Output lands in the checkpoint's `skill_state.last_verify`'; :222-224 status reads them. Live file :31-52 has `manifest`, `pre_deploy_verdict`, `independent_review`, `controls: 2` (number), `failed`, `live_skipped`, `staging_live`, `production_live`, `session_isolation`, `production_rollback_used`. Machine wiring exists at scripts/deploy.mjs:382 (`npm run hardening:verify`) and :391 (`scripts/check-hardening.mjs --target`), package.json:22.

**Proposed fix.** Re-key the live `skill_state` to the documented shape — `manifest_path`, `controls:{total:2,verified:2,failed:0,manual:0}`, `gate:{installed:true,chokepoint:"scripts/deploy.mjs",machine_enforced:true}`, `last_verify:{sha:"244bf13",date:"2026-09-02"}` — keeping the live-replay keys alongside; or amend SKILL.md:246-255 to the keys actually written.

### .checkpoints/oc-stack-forge.checkpoint.json:145 — oc-stack-forge's phase/step/progress_summary describe v1.5 while its entire skill_state still describes the v1.4 cycle
*category:* contradiction · *surfaced by the live-checkpoints lens*

**Problem.** step = "v1.5-shipped-vector-db-packs-live" (line 9) and progress_summary (line 11) reports 36 packs / 30 coverage flags and the four v1.5 vector-DB packs. skill_state.release_target is "v1.4.0" (line 145), linear_parent is ADEV-327 (line 146), and scope_at_cut (line 163) records packs_total 24. The repo has 36 pack.yml files today, so progress_summary is right and skill_state is a frozen v1.4 snapshot. skill_state.skills_unchanged also lists pre-rename names ("bug-check", "code-auditor", "git-ops", …) that no longer exist as skill ids.

**Evidence.** `find skills/oc-stack-forge/packs -name pack.yml | wc -l` → 36 versus scope_at_cut.packs_total 24. Line 145 `"release_target": "v1.4.0"`. status complete, 81 days stale per `checkpoint status`.

**Proposed fix.** Advance release_target/scope_at_cut to the v1.5 state (or archive the checkpoint with `checkpoint reset oc-stack-forge`), and update skills_unchanged to the oc--prefixed ids.

### .checkpoints/oc-telemetry-ops.checkpoint.json:18 — Live checkpoint contradicts itself: `telemetry_handle.enabled:false` but step/progress_summary/next_actions still say metering is ENABLED, and updated_at was never restamped
*category:* live-checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md § 0.4 (consent → false: applied in c440c7b); docs/audits/2026-06-29-checkpoint-system-audit.md:133,:377 (no 

**Problem.** Punchlist 0.4 flipped `enabled` to false (with a note at :22), but the surrounding fields were left as telemetry.mjs `enable` wrote them: `step: "metering-enabled"` (:9), `progress_summary: "Opt-in local metering is ENABLED. Skill/phase runs are recorded…"` (:11), `next_actions[0]: "Let the pipeline run — metered rows accumulate…"` (:13). `updated_at` is still 2026-06-26 (:7) although the flip landed 2026-08-08. `npm run checkpoint:status` / `checkpoint:next` therefore tell a resuming session that metering is on and rows are accumulating, while `npm run telemetry -- status` prints OFF. Doctor flags it 77d stale. progress_table/context_primer recommended by the 2026-06-29 audit are still absent.

**Evidence.** `git log -- .checkpoints/oc-telemetry-ops.checkpoint.json` → c440c7b 2026-08-08, 6d01e63 2026-06-26. `npm run telemetry -- status` → 'telemetry: OFF ⬜ … store: .checkpoints/usage.sqlite (absent)', exit 0. `npm run checkpoint:doctor` → '⚠ [oc-telemetry-ops] in_progress but last updated 77d ago — stale?'.

**Proposed fix.** Run `npm run telemetry -- disable` (which rewrites step/progress_summary/next_actions and restamps updated_at, telemetry.mjs:162-177) instead of hand-editing, keep the :22 note, and add a minimal progress_table + context_primer.

### .checkpoints/oc-ux-engineer.checkpoint.json:152 — oc-ux-engineer next_actions[0] tells the next session to open a PR that merged as #487 three days earlier
*category:* stale-next-actions · *surfaced by the live-checkpoints lens*

**Problem.** next_actions[0] (line 152): "Open the PR for the learning rail; do not deploy — v2.0 has not shipped and the diagram claims nothing new about production." The work is already on main: commit f1d5567 "feat(architecture): the v2.0 self-improvement loop, as a planned learning rail (#487)" is an ancestor of HEAD, and `git show HEAD:site/src/pages/architecture.astro | grep -c "learning rail"` returns 4. gh reports #487 MERGED 2026-09-08T05:51:04Z; the checkpoint's updated_at is 2026-09-08T03:43:00Z, roughly two hours before the merge, and was never restamped. doctor cannot see it — the action text carries no #N token.

**Evidence.** git log --oneline -3 -- site/src/pages/architecture.astro → f1d5567 (#487); gh pr view 487 → MERGED 2026-09-08T05:51:04Z. architecture.astro:1292, :1327, :1618 all carry the rail.

**Proposed fix.** Replace next_actions[0] with the #487 merge record, leaving only the surviving items (the cut-time flip list and the 1024px header overflow follow-up).

### .claude/settings.json:10 — This repo wires the shell commit gate, CI tests the plugin commit gate — two gates, two contracts, and the one that is exercised is not the one that runs
*category:* gate-reality · *known:* Open PR #499; docs/audits/2026-08-22-oss-readiness-audit.md:996.

**Problem.** `.claude/settings.json` registers `.claude/hooks/pre-commit-bugcheck.sh` (reads `last_run.verdict`, honours `bypasses[]`, soft-skips without jq, no tree binding). ci.yml:33-36 runs `npm run test:hooks`, which exercises only `plugins/opchain/hooks/pre-commit-gate.cjs` (reads `last_run_verdict`, ignores `bypasses[]`, fails closed, tree-bound). The comment in ci.yml calls the plugin hooks 'the only executable enforcement opchain ships', but this repository's sessions never execute it. Any future edit to either gate's contract will be validated against the wrong one.

**Evidence.** .claude/settings.json:10 `"command": ".claude/hooks/pre-commit-bugcheck.sh"`; .claude/hooks/pre-commit-bugcheck.sh:86 `.skill_state.last_run.verdict`, :91 `bypasses`, :30-32 jq soft-skip. .github/workflows/ci.yml:33-36 `Plugin hook suites (commit gate + next-suggestion)` → `npm run test:hooks`; package.json `test:hooks` → `node plugins/opchain/hooks/test-gate.cjs`. Reproduced both gates against the live checkpoint: shell gate denies on staleness (13 min), plugin gate denies on missing key.

**Proposed fix.** Point `.claude/settings.json` at `plugins/opchain/hooks/pre-commit-gate.cjs` (what PR #499 proposes) and delete `.claude/hooks/pre-commit-bugcheck.sh`, after fixing the schema key. Until then, add a one-line note to CLAUDE.md § Session resume saying which gate this repo actually runs.

### CLAUDE.md:79 — CLAUDE.md still says the catalog is 29 skills
*category:* count-drift · *surfaced by the release-plan lens*

**Problem.** CLAUDE.md's Repo Layout tree says "skills/ # Skill source definitions (the product) — 29 skills,". The catalog has been 33 since v1.9 (2026-09-02). CLAUDE.md is the highest-precedence context document loaded into every session and every subagent in this repo, so the wrong number is the first fact a session learns. The plan schedules the fix as "CLAUDE.md Repo Layout (29 → 35 skills)" in Sprint 5 (:908), which both confirms the staleness and leaves it wrong for the whole v2.0 build — including the sprints whose sweeps assert counts.

**Evidence.** CLAUDE.md:79 `├── skills/                 # Skill source definitions (the product) — 29 skills,`. `ls -d skills/*/ | wc -l` → 33. README.md:51 "33 skills across 6 phases". skills/CHANGELOG.md:19 "catalog 29 → 33".

**Proposed fix.** Fix CLAUDE.md:79 to 33 now as a substrate PR (it names no 2.0 identity, so the freeze does not apply), and keep the Sprint 5 line as 33 → 35. CLAUDE.md is not in any release-pinned surface list, which is why it missed the v1.9 sweep — add it to `version-locations.md`'s new "Count surfaces" section.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:452 — Sprint 3 harvests oc-bug-check's checkpoint into a committed store, but that checkpoint is deliberately gitignored and rewritten on every gate run
*category:* design-gap · *surfaced by the release-plan lens*

**Problem.** §3.2 (:452-456) and the L3 oc-bug-check row (:616) make `skill_state.last_run` / `run_history[]` a harvest source feeding `.checkpoints/history/<skill>.eval.ndjson` and `.opchain/hindsight/lessons.jsonl` — both git-tracked, both merged across machines. `.checkpoints/oc-bug-check.checkpoint.json` is gitignored by explicit policy because it "rewrites on every pre-commit gate run, which generates 2-3 false merge conflicts per PR". So the harvest reads machine-local, non-reproducible state and writes it into a shared committed record: the ndjson content depends on which laptop last ran the gate, `scorecard.mjs scan --check` (which recomputes the store from the ndjson and byte-compares) cannot be reproduced on another machine, and CI — which never runs the gate — sees no bug-check rows at all. The plan never names the gitignore.

**Evidence.** .gitignore:79-91 — "Exception: bug-check is local-only. … Its run telemetry (updated_at, step, last_run.*, run_history, streak) rewrites on every pre-commit gate run, which generates 2-3 false merge conflicts per PR" then `.checkpoints/oc-bug-check.checkpoint.json`. `git check-ignore -v .checkpoints/oc-bug-check.checkpoint.json` → `.gitignore:91`. `git ls-files .checkpoints` lists 16 checkpoints, not oc-bug-check. Plan :461 makes `scan --check` "recompute from the ndjson and byte-compare `scorecard.json`".

**Proposed fix.** Decide explicitly in §3.2: either (a) bug-check rows are excluded from `scan --check`'s byte-comparison and marked machine-local in the ndjson, or (b) the Stop hook writes a small committed digest (verdict + counts + at, no per-check bodies) that is the harvest source instead of the gitignored checkpoint. Either way, add the gitignore to the §4.4 table so the next reviewer does not rediscover it.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:594 — orchestrator.md's Upstream/Downstream Map covers 25 of 33 skills while oc-checkpoint-protocol tells every skill it "covers every skill"; the plan adds only two rows
*category:* incomplete-contract · *surfaced by the release-plan lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:168-174

**Problem.** L2 says orchestrator.md gains "two Upstream/Downstream rows" for the new skills. The map has 25 rows against 33 skills; eight have no row (oc-agent-forge, oc-checkpoint-protocol, oc-claude-api, oc-prompt-ops, oc-rag-forge, oc-signal-forge, oc-modularize-ops, oc-fleet-ops). Adding two takes it to 27 of 35 while `oc-checkpoint-protocol/SKILL.md:362` — bundled verbatim into all 33 skills — keeps telling every skill the map "covers every skill" and to "Treat that as the single source of truth". Three of the missing eight (oc-prompt-ops, oc-rag-forge, oc-cost-ops' counterparty) carry L3 rows in this very release, so 2.0 wires new edges into a map that has no row for their skills. §4.4 caught the analogous §7 gap but not this one.

**Evidence.** skills/orchestrator.md:130 `### Upstream/Downstream Map`, rows :134-:158 (25). `comm -23` of the 33 skill dirs against the bolded row names yields the eight listed. skills/oc-checkpoint-protocol/SKILL.md:361-364 "the **complete, maintained** upstream/downstream map lives in `orchestrator.md` § \"Upstream/Downstream Map\" (it covers every skill …). Treat that as the single source of truth".

**Proposed fix.** Change L2 to "ten Upstream/Downstream rows (eight backfill + two new)", or — if the backfill is out of scope — weaken oc-checkpoint-protocol/SKILL.md:361-364 to "covers the pipeline skills" so the bundled contract stops asserting completeness it does not have. Add a `grep -c '^| \*\*oc-' skills/orchestrator.md` parity check to the Sprint 5 closing sweep next to the §7 one.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:609 — Three of the four oc-orchestrator tiebreaker-chain anchors no longer point at the sections they name
*category:* anchor-drift · *surfaced by the release-plan lens*

**Problem.** The L3 oc-orchestrator row documents the tiebreaker chain as "rank `:432-439` → budget → trend → pipeline order `:447` → cross-project `:485`". Only the budget anchor (`:467`) is exact. `:432-439` covers a blank line, the `### Priority Hierarchy` heading and only the first four of six hierarchy lines (the block runs :435-442). `:447` is the sixth line of the "One implementation" blockquote, not the pipeline-order section (`### Pipeline Order (tie-breaker)` is :452). `:485` is a blank line inside the cross-project section (`### Cross-Project Priority` is :481). A Sprint 2 session inserting the trend subsection by line number lands inside a blockquote.

**Evidence.** `grep -n` on skills/oc-orchestrator/SKILL.md: :433 `### Priority Hierarchy`, :436 `1. BLOCKED items needing user_decision`, :441 `6. NOT_STARTED skills in pipeline order`, :452 `### Pipeline Order (tie-breaker)`, :467 `### Cost / Budget Awareness (v1.6 — the instrumented pipeline)`, :481 `### Cross-Project Priority`. `awk NR==447` → `> cross-project layer — so the two never diverge. The oc-orchestrator adds the`; `awk NR==485` → blank.

**Proposed fix.** Update to rank `:433-442` → budget `:467` → trend (new, after :479) → pipeline order `:452` → cross-project `:481`. Prefer heading text over line numbers for this row, since Sprint 2 inserts a whole subsection and will invalidate every anchor below it in the same edit.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:623 — `/oc-release verify` already has 12 rows, so the plan's "rows 12–13" would overwrite the existing row 12
*category:* count-drift · *surfaced by the release-plan lens*

**Problem.** The L3 oc-release-ops row says "`verify` gains rows 12–13 (\"Graduated rules proven\", \"no write-through\") after the v1.9 warn-class precedent (`:310`)". The verify table currently holds twelve rows (:299-:310), with row 12 being the v1.9 compliance warn-class row the plan itself cites as the precedent to append after. New rows are 13 and 14. Additionally, the spec of record (docs/releases/2.0-plan.md:511) promises only one new row ("Graduated rules proven"); the plan adds a second ("no write-through") without flagging the widening.

**Evidence.** skills/oc-release-ops/SKILL.md:292 `### \`/oc-release verify\` (the gate)`; table rows at :299, :300, :301, :302, :303, :304, :305, :306, :307, :308, :309, :310 — twelve. :310 is the v1.9 compliance/warn-class row.

**Proposed fix.** Say "rows 13–14, appended after the v1.9 warn-class row at `:310`", and note in the row that this widens docs/releases/2.0-plan.md:511 from one new check to two so the spec-vs-plan delta is recorded the way the document's preamble requires.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:1365 — Appendix C's Directory Convention row for `reset` archives does not match the filename `cmdReset` actually writes
*category:* contract-drift · *surfaced by the release-plan lens*

**Problem.** Appendix C's Directory Convention block adds `.checkpoints/history/<skill>.<date>.json  tracked · \`reset\` archives (unchanged)`. The real filename is `<skill>.<full-ISO-stamp>.checkpoint.json` — a colon/dot-sanitised timestamp, not a date, and it keeps the `.checkpoint.json` double extension. The row ships into oc-checkpoint-protocol/SKILL.md as normative text and is marked "(unchanged)", so no one will verify it. Anything that later globs `history/*.json` versus `history/*.checkpoint.json` versus `history/*.eval.ndjson` — the history-integrity CI pass, the oc-repo-ops rotation-compliance row, a `.gitattributes` entry — inherits the wrong shape.

**Evidence.** scripts/checkpoint.mjs:954 `const stamp = new Date().toISOString().replace(/[:.]/g, "-");` and :955 `const dest = join(histDir, \`${skill}.${stamp}.checkpoint.json\`);` — e.g. `oc-git-ops.2026-09-11T14-20-00-000Z.checkpoint.json`. Plan :1364 as quoted.

**Proposed fix.** Change the row to `.checkpoints/history/<skill>.<iso-stamp>.checkpoint.json   tracked · \`reset\` archives (unchanged)`, and note in the same block that the three history filename families are disjoint (`*.checkpoint.json` = reset archives, `*.eval.ndjson` = eval archive, `*.reports.ndjson` = report scan) so globs can be written safely.

### docs/releases/2.0-plan.md:466 — The verified matrix of record says "All 29 existing skills take the lockstep bump" — the catalog has been 33 since v1.9
*category:* count-drift · *surfaced by the release-plan lens* · *known:* plan §4.4 (the table records no row for this)

**Problem.** docs/releases/2.0-plan.md is the spec of record and is "normative for *what* ships" (plan :11-13). Its verified-matrix preamble says "All 29 existing skills take the lockstep bump to 2.0.0", a v1.8-era count. The v2.0 plan builds on 33 → 35 throughout (:34, §8 facts, the Sprint 5 sweep). A bump session driven by the spec — which is the document the plan defers to for scope — would bump 29 files and leave four v1.9 skills at 1.9.0, which `check-release-tag.mjs` reports as `tag-version-mismatch` with `countDrift: false` ("found 1.9.0 instead of 2.0.0") at the first production deploy.

**Evidence.** docs/releases/2.0-plan.md:466. `ls -d skills/*/ | wc -l` → 33; all at `version: 1.9.0`. skills/CHANGELOG.md:19 "Four new skills, catalog 29 → 33". scripts/check-release-tag.mjs:360 `mismatchedVersions` and :375 `found ${mismatchedVersions.join(", ")} instead of ${version}`.

**Proposed fix.** Amend docs/releases/2.0-plan.md:466 to "All 33 existing skills take the lockstep bump to 2.0.0 (35 including the two new)." and add a matching line to the plan's §4.4 table so the amendment is recorded as a post-v1.9 correction rather than a silent edit of the normative spec.

### package.json:53 — session-state.cjs has no test and npm run test:hooks / CI never execute it
*category:* tooling

**Problem.** `test:hooks` runs only test-gate.cjs and test-suggestion.cjs; there is no test-session-state.cjs, so the SessionStart hook's staleness thresholds, blocker surfacing, open-findings line, untrusted-data fencing and the [object Object] defect above are unverified by anything. README §Testing (:133-134) lists only the two suites.

**Evidence.** package.json:53 `"test:hooks": "node plugins/opchain/hooks/test-gate.cjs && node plugins/opchain/hooks/test-suggestion.cjs"`; `ls plugins/opchain/hooks` shows no session-state test; ci.yml:36 `run: npm run test:hooks`.

**Proposed fix.** Add plugins/opchain/hooks/test-session-state.cjs with hermetic fixtures (stale in_progress/complete/blocked at 7/14/3 days, user_decision blocker, findings_by_severity on a complete checkpoint, object-form next_actions, malformed JSON, no .checkpoints dir) and wire it into test:hooks.

### plugins/opchain/hooks/pre-commit-gate.cjs:237 — Fresh PASS with no verified_tree is allowed for 10 minutes — README claims every verdict is tree-bound ('non-matching, not merely old'), and PR #499 has not landed
*category:* gate-reality · *known:* PR #499 (open) 'make the tree mandatory'

**Problem.** Line 237 only enforces freshness when `!verifiedTree`; a checkpoint with `last_run_verdict: PASS`, a current `updated_at`, and no tree hash passes the gate for any content (test-gate.cjs:147 encodes this as expected ALLOW). README.md:52-54 states the verdict 'is bound to `git write-tree` output, so re-staging different code invalidates it automatically. A forged or stale PASS is non-matching, not merely old' — untrue in the no-tree window. Conversely a tree-bound PASS is accepted at any age (no freshness check when verifiedTree is set), which README does not say either.

**Evidence.** pre-commit-gate.cjs:237 `if (!verifiedTree && Math.abs(Date.now() - ts) > FRESH_MS)`; test-gate.cjs:147 `["fresh PASS, no tree", `${GC} -m x`, freshNoTree, "ALLOW"]`; README.md:52-54.

**Proposed fix.** Either make verified_tree mandatory (PR #499's stated intent) and flip test-gate.cjs:147 to DENY, or document the 10-minute unbound window in README §Tree-bound verdicts.

### plugins/opchain/hooks/session-state.cjs:88 — session-state.cjs prints '[object Object]' for the object-form next_actions the checkpoint protocol and validator accept
*category:* checkpoint · *independently reported 3×*

**Problem.** Line 87 sets `next` from the first `in_progress` file readdir returns (alphabetical), ignoring updated_at, blockers and staleness; checkpoint.mjs `next` ranks blocked-on-user_decision first, then failed/blocked, then in_progress at a gate, then mid-work, then complete-with-queue (checkpoint.mjs:403-430) and skips stale action tokens (:457-482). In this repo the hook would always name oc-app-architect (alphabetically first in_progress, itself blocked on a user_decision since 2026-09-08) while oc-git-ops/oc-monitoring-ops were written on 2026-09-11. Staleness day thresholds do match (7/14/3 at :22 vs checkpoint.mjs:101-112).

**Evidence.** Probe with `next_actions: [{text:"Run the Phase 6 evaluator", done_when:"test -f x"}]` → session-state output `  next: oc-app-architect: [object Object]`. session-state.cjs:88 `next = `${d.skill}: ${String(d.next_actions[0]).slice(0, 140)}`;`; checkpoint.mjs:268 `next_actions[${i}] must be a string or { text, done_when? }`.

**Proposed fix.** Sort candidates by updated_at desc and skip checkpoints whose blockers carry needs:user_decision (those are already on the AWAITING YOU line), or apply the same token-staleness filter next-suggestion.cjs uses.

### plugins/opchain/hooks/test-gate.cjs:129 — Documented gate behaviours with no test: .opchain/ enrolment, OPCHAIN_GATE=1, OPCHAIN_BYPASS=1, verified_for_tree/verdict aliases, eval/xargs/sudo wrappers, array/invalid-JSON checkpoints
*category:* tooling

**Problem.** The 35 cases never exercise: enrolment via `.opchain/` (gate :175, README :57); `OPCHAIN_GATE=1` override (:173) — the harness deliberately deletes it (:96); `OPCHAIN_BYPASS=1` bypass token (:183); the `st.verdict` and `st.verified_for_tree` aliases (:212, :226); WRAPPER forms `eval`, `xargs`, `sudo`, `env` (:149); a checkpoint that is a JSON array (:207) or invalid JSON (:205 — the 'null' case is valid JSON); and the uncaughtException deny path (:78). test-suggestion.cjs likewise never covers object-form next_actions, a blocker without proposed_resolution (:206 falls back to description), the `"run <skill>"` non-command target path (:261), or dedup reset across a new HEAD (:264-265).

**Evidence.** test-gate.cjs:129-185 case list contains no `.opchain`, `OPCHAIN_GATE`, `OPCHAIN_BYPASS`, `verified_for_tree`, `eval`, `xargs`, or `sudo` strings; test-gate.cjs:96 `delete env.OPCHAIN_GATE;`.

**Proposed fix.** Add the missing cases (enrol-by-.opchain ALLOW/DENY pair, OPCHAIN_GATE=1 on an unenrolled repo → DENY, OPCHAIN_BYPASS=1 → ALLOW, alias fields → ALLOW, `eval "git commit -m x"` → DENY, array checkpoint → DENY) and the four suggestion cases.

### plugins/opchain/README.md:34 — Which twelve commands the plugin registers is documented nowhere; 21 of the 33 skills declare slash commands (210 of 222) that the plugin does not register, including /oc-app, /oc-git, /oc-pr, /oc-git-release, /oc-security
*category:* docs-drift · *independently reported 2×* · *known:* v2.0 plan §4.4 #14 only covers the next-suggestion comment count (12→14), not the selection or the 192 figure

**Problem.** README line 34 advertises 'Real slash commands ✅' against the zip's '192 declared, 0 registered', skills/README.md:23 and install.astro:113 say 'twelve registered slash commands', but no shipped or site document lists the twelve or says the other 210 declared verbs (`commands:` frontmatter totals 222 across 33 skills via js-yaml) are NOT registered. Skills with frontmatter commands and no plugins/opchain/commands/*.md file: oc-agent-forge, oc-api-dev, oc-app-architect, oc-claude-api, oc-cost-ops, oc-dash-forge, oc-fleet-ops, oc-integrations-engineer, oc-migration-ops, oc-modularize-ops, oc-monitoring-ops, oc-prompt-ops, oc-rag-forge, oc-reverse-spec, oc-scale-ops, oc-security-auditor, oc-signal-forge, oc-stack-forge, oc-telemetry-ops, oc-ux-engineer (20) plus oc-git-ops' /oc-git, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release (only /oc-commit ships). CLAUDE.md:19 instructs 'Run `/oc-git-release <semver>`' and root README's pipeline table (README.md:38-45) advertises /oc-discover, /oc-spec, /oc-uxe plan, /oc-build, /oc-deploy staging, /oc-scale audit — a plugin user typing those gets 'unknown command'. The 12 that do ship: oc-audit, oc-bugcheck, oc-commit, oc-comply, oc-data-ops, oc-deploy, oc-docs, oc-harden, oc-ops, oc-qa, oc-release, oc-repo (all 12 front the right skill and name verbs present in that skill's frontmatter — verified).

**Evidence.** `ls plugins/opchain/commands` → 12 files; js-yaml count of `commands:` entries across skills/oc-*/SKILL.md = 222; grep for `oc-comply|/oc-harden|/oc-qa` across plugins/opchain/README.md, skills/README.md, mirror/README.md, README.md, install.astro hits only mirror/README.md:88 (incidental). plugins/opchain/README.md:34 `| Real slash commands | ❌ (192 declared, 0 registered) | ✅ |`; skills/README.md:23 `twelve registered slash commands`; CLAUDE.md:19 `Run `/oc-git-release <semver>``.

**Proposed fix.** Add a 'Registered commands' table to plugins/opchain/README.md (and skills/README.md / install.astro) listing the 12 with their target skill + verb, and state explicitly that every other `/oc-*` verb in a SKILL.md is a prompt phrase to type in natural language, not a registered command; correct '192 declared' to the generated count (222 today) or drop the number; either register /oc-git-release (CLAUDE.md relies on it) or reword CLAUDE.md:19 to 'ask for the oc-git-ops release verb'.

### prompts/opchain-eval/inputs.jsonl:1 — Eleven command-bearing skills have zero eval coverage, including both halves of uncovered collisions (release-ops, monitoring-ops, telemetry-ops, fleet-ops, signal-forge)
*category:* eval-coverage · *surfaced by the routing lens*

**Problem.** Joining expected.jsonl against skills/: 21 of the 33 skills appear in at least one case. The 12 absent are oc-checkpoint-protocol (not directly invoked, fine) plus oc-cost-ops, oc-docs-forge, oc-fleet-ops, oc-migration-ops, oc-modularize-ops, oc-monitoring-ops, oc-release-ops, oc-repo-ops, oc-signal-forge, oc-telemetry-ops, oc-ux-engineer. Several are the losing side of a live trigger overlap: oc-release-ops shares "tag the release" with oc-git-ops; oc-fleet-ops competes with oc-deploy-ops for 'deploy'; oc-telemetry-ops competes with oc-monitoring-ops for 'telemetry/observability'; oc-signal-forge is the untested half of decision D4 (route-025/026 only ever expect oc-data-ops); oc-docs-forge and oc-repo-ops both claim 'catalog drift'. The set that exists to catch trigger-copy drift is blind on exactly the skills whose trigger copy overlaps.

**Evidence.** Script over prompts/opchain-eval/expected.jsonl vs skills/*: covered = 21 skills (oc-agent-forge, oc-api-dev, oc-app-architect, oc-bug-check, oc-claude-api, oc-code-auditor, oc-compliance-ops, oc-dash-forge, oc-data-ops, oc-deploy-ops, oc-git-ops, oc-integrations-engineer, oc-orchestrator, oc-prompt-ops, oc-qa-ops, oc-rag-forge, oc-reverse-spec, oc-scale-ops, oc-security-auditor, oc-security-hardening, oc-stack-forge); uncovered = the 12 listed. tests/opchain-eval.test.js:65-67 only asserts `inputs.length >= 10`, so the gap can never fail CI.

**Proposed fix.** Add one case per uncovered command-bearing skill (11 cases), prioritising the overlapping pairs, and strengthen tests/opchain-eval.test.js:65-67 into a coverage assertion (every skills/<id> with a non-empty `commands:` appears in at least one expected row, with an explicit allowlist for deliberate exclusions).

### README.md:51 — Root README.md claims 33 skills and 'this table mirrors' skills/README.md, but its table has 29 rows — all four v1.9 skills missing
*category:* docs-drift

**Problem.** README.md:51 says "33 skills across 6 phases. Canonical list lives in skills/README.md — this table mirrors it." The tables under it contain 29 `oc-*` rows; oc-qa-ops, oc-data-ops, oc-compliance-ops and oc-security-hardening (the v1.9.0 additions, tagged 2026-09-02) are absent. "6 phases" also counts README section groupings (foundation/plan/plan+build/build+ai-native/build/ship); the content schema defines four phases (site/src/content.config.ts:16) and `ship` is not one. oc-repo-ops's catalog-parity check (skills/oc-repo-ops/SKILL.md:120) only compares `skills/*/SKILL.md` count against skills/README.md, so this root-README drift is invisible to the gate.

**Evidence.** `awk 'NR>51 && /^### Claude.ai/{exit} /^\| `?oc-/' README.md | wc -l` → 29; per-skill loop reports missing: oc-compliance-ops, oc-data-ops, oc-qa-ops, oc-security-hardening. skills/README.md table has 33 rows; mirror/README.md has 33 rows. site/src/content.config.ts:16 `const PHASES = ["foundation", "plan", "build", "ai-native"]`.

**Proposed fix.** Add the four v1.9 rows to README.md (qa-ops/data-ops/compliance-ops under plan+build; security-hardening under build) and fix the phase count wording; extend the oc-repo-ops `catalog` parity rule (SKILL.md:120) to include the root README table so it fails on the next drift.

### README.md:51 — Root README.md claims 33 skills against a 29-row table; the plan's "+2 rows each" instruction would leave it at 31 rows claiming 35
*category:* count-drift · *surfaced by the release-plan lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:189

**Problem.** README.md:51 says "33 skills across 6 phases. Canonical list lives in skills/README.md — this table mirrors it." The table has 29 `| \`oc-…\`` rows and omits all four v1.9 skills (oc-qa-ops, oc-data-ops, oc-compliance-ops, oc-security-hardening). The v2.0 plan's L3 row (:622) tells Sprint 5 to add "**+2 rows each**" to skills/README.md and root README.md, "not just a count string". skills/README.md is correct today (33 rows), so +2 → 35 works there; root README is four rows behind, so +2 → 31 rows under a "35 skills" claim, shipping the same lie one release larger.

**Evidence.** `grep -c '^| \`oc-' README.md` → 29; `comm -23` of the 33 skill dirs against the README rows → oc-compliance-ops, oc-data-ops, oc-qa-ops, oc-security-hardening. `grep -c '^| oc-' skills/README.md` → 33. README.md table sections at :54-95+.

**Proposed fix.** Backfill the four v1.9 rows into README.md now (a substrate PR naming no 2.0 identity, so it does not trip check-release-tag), then change the plan's L3 row at :622 to "+2 rows to skills/README.md; +6 rows to root README.md (4 v1.9 backfill + 2 new)" — or add `grep -c '^| \`oc-' README.md` to the Sprint 5 closing sweep beside the skills/README.md check.

### scripts/checkpoint.mjs:123 — `checkpoint doctor`'s missing-path detector skips docs/, tests/, specs/, plugins/ and root files, and truncates after three warnings per skill
*category:* detector-gap · *surfaced by the live-checkpoints lens*

**Problem.** ARTIFACT_PREFIXES (line 123) is ["src/", "scripts/", "skills/", "site/", "spec/", "design/", "sprints/", ".checkpoints/", ".github/", ".opchain/"]; line 730 skips any generated_files entry not matching one of them. That excludes every entry under docs/, tests/, specs/ (note "spec/" ≠ "specs/"), plugins/, previews/, roadmap/, prompts/, mirror/, mcp/ and all root files — which is most of what oc-docs-forge, oc-app-architect, oc-monitoring-ops and oc-ux-engineer actually generate (e.g. oc-docs-forge lists CLAUDE.md, roadmap/05-post-sprint-7-backlog.md, specs/spec/06-testing.md; oc-app-architect lists three docs/ paths). Line 733 additionally collapses everything past the third warning into "…and N more", which today hides oc-orchestrator's fourth dangling entry (.checkpoints/git-ops.checkpoint.json). A manual pass over all 45 generated_files entries found nine dangling paths; doctor names eight.

**Evidence.** Line 730 `if (!ARTIFACT_PREFIXES.some((pre) => p.startsWith(pre))) continue;`; line 733 `if (missing > 3) add("warn", skill, "…and " + (missing - 3) + " more missing generated_files paths")`. Verified independently: all docs//tests//specs//previews/ entries happen to exist today, so the blind spot is currently latent, not firing.

**Proposed fix.** Replace the prefix allowlist with a "looks like a repo-relative path" test (no scheme, no leading /, contains a dot-extension or a known dir) and list every missing path rather than the first three.

### scripts/checkpoint.mjs:154 — `checkpoint doctor`'s stale-action detector only recognises #N and ABC-123 tokens, so completed prose actions in three checkpoints go unflagged
*category:* detector-gap · *surfaced by the live-checkpoints lens*

**Problem.** harvestTokens (lines 154-160) extracts only /#(\d+)/ and /\b([A-Z]{2,}-\d+)\b/, and Drift 4 (lines 736-745) flags a next_action only when one of those tokens appears in the completed/merged set. Every already-done action phrased in prose is invisible: oc-deploy-ops next_actions[0]-[2] (lines 14-16, done by #510), oc-release-ops next_actions[0] (line 82, done by #510) and oc-ux-engineer next_actions[0] (line 152, done by #487) all passed the detector today. Doctor reported 18 warnings and none of these four.

**Evidence.** Doctor's output flags only the three #498 references in oc-git-ops and the #303/ADEV-330 references in oc-stack-forge/oc-orchestrator. The four prose actions above are verifiably complete (release-baseline.json:10-14 and git commit f1d5567).

**Proposed fix.** Extend the drift evidence set with short SHAs and file paths — flag an action naming a file whose git log shows a commit after the checkpoint's updated_at, and an action naming a 7–12 hex SHA that is already an ancestor of HEAD.

### scripts/checkpoint.mjs:278 — Validator accepts blocked-without-blockers, complete-with-open-user_decision-blocker, and in_progress-with-user_decision-blocker; priority engine then ranks a 'complete' file as the top bottleneck
*category:* checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md P3c (complete with open criticals) — adjacent, does not cover status↔blockers

**Problem.** The protocol says a blocker that stops progress sets status to `blocked` (line 267) and that `blocked` resume behaviour is 'show blockers' (line 172), but the validator has no cross-check between status and blockers: `status: blocked` with `blockers: []` validates clean; `status: complete` with an open `needs: user_decision` blocker validates clean and `rankCheckpoint` (line 425) then returns rank 1, so `next` recommends 'Resolve the blocker' on a complete checkpoint. The live oc-app-architect checkpoint is `in_progress` while carrying a user_decision blocker and is what `next` surfaces today. Punchlist P3c proposes the related complete-with-open-criticals rule; the status↔blockers consistency rule is still absent.

**Evidence.** Scratch run with OPCHAIN_CHECKPOINTS_DIR: blk.checkpoint.json (blocked, no blockers) → `✓ blk.checkpoint.json`; cmp.checkpoint.json (complete + user_decision blocker) → `✓ cmp.checkpoint.json`, `checkpoint next` → `Skill: cmp (complete — x/y) Why: Blocked on your decision`. scripts/checkpoint.mjs:278-290 validates only blocker shape; :425 `if (blockers.some((b) => b.needs === "user_decision")) return 1;` regardless of status. Protocol :267 `Add to blockers and set status to blocked if it stops progress`.

**Proposed fix.** In validate(): warn when status==='blocked' and no blockers; warn when status==='complete' and any blocker lacks a resolved marker; warn when status==='in_progress' and a blocker has needs:'user_decision'. Land as warnings first (CI runs validate non-strict).

### scripts/checkpoint.mjs:580 — `status --brief` recommends without drift evidence, so it can surface the already-merged action that `next` was fixed to skip
*category:* tooling

**Problem.** cmdNext computes `driftTokens(all)` and passes it to recommendedAction (:576-579 in cmdNext at 570-583), but cmdStatus --brief calls `recommendedAction(top.data)` with no stale set (line 580), so firstFreshAction returns next_actions[0] unfiltered. The comment at :464-469 records that this exact unfiltered path told the repo to 'tag v1.8.0' twelve days after it shipped; the fix covered `next` only. The protocol advertises `status --brief` as 'just the top skill + its next action' (:405) with no caveat, and the live oc-git-ops queue currently holds three actions doctor flags as referencing merged #498.

**Evidence.** scripts/checkpoint.mjs:580 `const rec = recommendedAction(top.data);` (inside cmdStatus, no driftTokens call in that function) vs cmdNext `const stale = driftTokens(all); ... recommendedAction(d, stale)`; live `doctor` output: `⚠ [oc-git-ops] next_action references #498, which already appears as completed/merged`.

**Proposed fix.** Compute `const stale = driftTokens(all)` once in cmdStatus and pass it to recommendedAction in brief mode (and annotate skipped-stale counts as `next` does).

### scripts/checkpoint.mjs:702 — doctor reconstructs the file path from data.skill, so the filename↔skill error can never fire under doctor
*category:* tooling · *known:* docs/plans/coordination-gaps-punchlist.md P7a (collateral fact 2)

**Problem.** cmdDoctor calls `validate(join(DIR, `${skill}.checkpoint.json`), data, bytes)` where skill = data.skill, so the filename check at line 227 always compares a name derived from the data with itself. README:46 says the validator 'enforces filename-skill consistency' and doctor is documented as the drift catcher (protocol:420-424); a mis-named file is only caught by `validate`, and doctor reports the phantom skill name (`[other]`) with no error. Reproduced with wrongname.checkpoint.json containing skill:"other": validate → error; doctor → no error, warnings labelled `[other]`.

**Evidence.** scripts/checkpoint.mjs:702 `const { errors } = validate(join(DIR, \`${skill}.checkpoint.json\`), data, bytes);` vs :227 `if (file !== expected) errors.push(...)`. Scratch doctor output: `⚠ [other] project_dir "/tmp/p" doesn't exist here` and `2 error(s)` (both from iso file only).

**Proposed fix.** Thread the real path from readAll() into cmdDoctor (`for (const { path, data, bytes } of all)`) and pass it to validate().

### scripts/merge-checkpoint.mjs:109 — Merge driver applies newer-wins to telemetry paths before the base==ours shortcut, silently discarding a one-sided telemetry update from the older side
*category:* tooling

**Problem.** The header comment (lines 12-17) says step 2 (`base==ours → take theirs; base==theirs → take ours`) runs before step 3 (telemetry newer-wins 'if the recursive merge would conflict'). In code the telemetry check (line 109) precedes the base-equality checks (lines 113-114). When both sides touched something inside skill_state but only the OLDER-updated_at side changed a telemetry key, the newer side's unchanged (base) value wins and the real update is dropped with exit 0 and no conflict. Verified: base carried_debt=3/last_run FAIL; theirs (older updated_at) set carried_debt=0/last_run PASS; ours (newer) changed only skill_state.foo → merged output keeps carried_debt 3 / verdict FAIL. Reachability today is limited (the telemetry key names are oc-bug-check's, and that file is gitignored), but any tracked checkpoint that adopts those key names inherits the silent loss. No test covers merge-checkpoint.mjs.

**Evidence.** scripts/merge-checkpoint.mjs:104-114: `if (deepEqual(oursV, theirsV)) return oursV; if (isTelemetryPath(path)) { return newerSide === "ours" ? oursV : theirsV; } if (deepEqual(baseV, oursV)) return theirsV;` vs comment :12-17. Scratch run of `node scripts/merge-checkpoint.mjs baseD.json oursD.json theirsD.json` → exit 0, output `"carried_debt": 3`, `"verdict": "FAIL"`.

**Proposed fix.** Move the `deepEqual(baseV, oursV)`/`deepEqual(baseV, theirsV)` shortcuts above the telemetry rule so newer-wins only applies when both sides diverged from base, matching the header comment; add a tests/merge-checkpoint.test.js covering one-sided telemetry, two-sided telemetry, array append conflicts.

### scripts/sync-docs.sh:14 — Hosted/local MCP get_skill, /llms.txt and /docs serve SKILL.md only — the 61 bundled references/ files (and references/checkpoint-protocol.md) the bodies instruct the model to read are unreachable on those transports
*category:* cross-skill-contract

**Problem.** Every non-protocol skill (32/33) opens with "On first invocation, read `references/orchestrator.md`" and 26 skills cite 61 further `references/<file>` companions (agent-forge 4, dash-forge 6, stack-forge 5, code-auditor 4 incl. ai-safety-signatures.json, cost-ops 4, ...). gen-skills-catalog.mjs:125-141 enforces that those files exist in the zip, but the hosted MCP `get_skill` (index.js:813 fetches `/docs/<id>/SKILL.md` from ASSETS), the stdio server (local-server.mjs:47 reads only `SKILL.md`), `/llms.txt` (discovery.js:150 links `/docs/<id>/SKILL.md`) and `resources/list` (server.js:158-176: only `opchain://orchestrator` + `opchain://skill/<id>`) expose no way to fetch any references/ file. get_orchestrator covers one of them; references/checkpoint-protocol.md (the checkpoint contract the write_checkpoint tool cites) and the other 61 are simply absent. A Codex/MCP session following the SKILL.md verbatim (as the server's initialize instructions at server.js:304-311 tell it to) is told to read files it cannot obtain.

**Evidence.** sync-docs.sh:14 `cp "${d}SKILL.md" "$DEST/$name/SKILL.md"` (no references/). server.js:158-176 listResources emits only orchestrator + skill/<id>. Count: `for f in skills/oc-*/SKILL.md; grep -o '`references/...`'` → 61 distinct non-protocol citations across 26 skills; 32 skills carry the first-invocation bootstrap line.

**Proposed fix.** Either (a) extend sync-docs.sh to copy each skill's references/ tree and add an `opchain://skill/<id>/references/<file>` resource + `get_skill_reference` tool in server.js (local-server loadBody reading `${SKILLS_DIR}/${id}/references/${file}`), and link them from llms.txt; or (b) have get_skill prepend a transport note mapping `references/orchestrator.md` → get_orchestrator and `references/checkpoint-protocol.md` → a new get_checkpoint_protocol tool, and add a catalog/test assertion that every backtick `references/` citation in a served body resolves to a served resource.

### site/src/content.config.ts:46 — 15 skills carry a `governance:` frontmatter block in two shapes that no schema or validator knows about; its breaking_change_policy pointer is repo-relative and dangling in every installed copy
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:582, :712, :772 (dangling governance pointer, cosmetic) — still present

**Problem.** content.config.ts:46-61 declares no `governance` key (zod object strips it silently) and gen-skills-catalog.mjs REQUIRED_FIELDS/validators never look at it, so the field is unvalidated on every path. Today 15/33 skills have it (agent-forge, claude-api, compliance-ops, cost-ops, data-ops, docs-forge, fleet-ops, modularize-ops, prompt-ops, qa-ops, rag-forge, repo-ops, security-hardening, signal-forge, telemetry-ops); 12 carry a `docs:` list and 3 (fleet-ops, modularize-ops, signal-forge) do not; every one points `breaking_change_policy: skills/CHANGELOG.md`, a monorepo-relative path that does not exist relative to an installed skill dir. No site page or script reads it (grep governance site/src src scripts → only a prose comment in architecture.astro:1237).

**Evidence.** Frontmatter inventory: KEYS {..., "governance": 15}; awk over each SKILL.md frontmatter shows the two shapes; grep -rn governance consumers → none.

**Proposed fix.** Either add `governance` to both schemas (content.config.ts optional zod object with `breaking_change_policy`, `last_reviewed` ISO date, `owner`, `docs[]{path,kind,lifecycle}`; matching checks in gen-skills-catalog.mjs incl. `docs[].path` existence) and make the policy path relative or a URL, or delete the block from the 15 skills since nothing consumes it.

### skills/CHANGELOG.md:4 — `governance:` frontmatter exists on 15/33 skills; CHANGELOG claims every skill has it and nothing documents or validates the split
*category:* cross-skill-contract

**Problem.** CHANGELOG.md:4 states "Every skill's `governance.breaking_change_policy` points here." Only 15 skills carry a `governance:` block; the 18 without it are oc-api-dev, oc-app-architect, oc-bug-check, oc-checkpoint-protocol, oc-code-auditor, oc-dash-forge, oc-deploy-ops, oc-git-ops, oc-integrations-engineer, oc-migration-ops, oc-monitoring-ops, oc-orchestrator, oc-release-ops, oc-reverse-spec, oc-scale-ops, oc-security-auditor, oc-stack-forge, oc-ux-engineer (i.e. every pre-1.4 skill — the 1.4.x 'rollout' at CHANGELOG.md:426 never reached the original set). scripts/gen-skills-catalog.mjs has no governance check, site/src/content.config.ts has no governance field, and the only reader is site/src/pages/architecture.astro. The split is undocumented in skills/README.md, CHANGELOG, the punchlist, and the v2.0 plan (which only references governance as a project concept). A future edit that assumes the block exists (e.g. the R7 'breaking_change_policy' audit prompt) will silently skip half the catalog.

**Evidence.** awk over frontmatter: 15 files contain `^governance:` between the `---` fences; 18 listed above do not. skills/CHANGELOG.md:4 "Every skill's `governance.breaking_change_policy` points here."; :426 "`governance:` frontmatter rollout". `grep -n governance scripts/gen-skills-catalog.mjs site/src/content.config.ts` → no matches. `grep -rln governance site/src scripts src tests` → only site/src/pages/architecture.astro.

**Proposed fix.** Either finish the rollout (add the block to the 18 skills and have gen-skills-catalog.mjs require it) or reword CHANGELOG.md:4 to 'skills that declare `governance:`' and record the 15/18 split in skills/README.md so the R7 audit prompt and any reader knows it is optional.

### skills/CHANGELOG.md:15 — CHANGELOG [Unreleased] says '_Nothing yet._' but two post-v1.9.0 commits changed shipped skill text
*category:* docs-drift

**Problem.** Since the v1.9.0 tag (244bf13, 2026-09-02) two merged commits edited files under skills/ that ship in the zip/plugin: 563034c (#482) added §7 trigger descriptions for 7 skills to skills/orchestrator.md, re-bundled into all 33 references/orchestrator.md copies plus plugins/opchain/skills/orchestrator.md (a routing-contract change every skill reads on first invocation); and 2755ef9 (#484) added 11 lines to oc-release-ops/references/site-release-surfaces.md (F6 architecture-diagram procedure). The catalog's own rule (CHANGELOG.md:3-6, oc-release-ops draft verb 'from what actually shipped') expects these under [Unreleased]; the next `/oc-release draft` will read '_Nothing yet._' and omit them.

**Evidence.** skills/CHANGELOG.md:13-15: "## [Unreleased]\n\n_Nothing yet._". `git log --oneline v1.9.0..HEAD -- skills/ plugins/ .claude-plugin/` → 2755ef9 docs(runbook)... (#484), 563034c docs(orchestrator): backfill §7 trigger descriptions for 7 missing skills (#482). `git show --stat 563034c -- skills/` lists every skills/*/references/orchestrator.md + plugins/opchain/skills/orchestrator.md.

**Proposed fix.** Add two [Unreleased] bullets (orchestrator §7 backfill 25→32 of 33; site-release-surfaces F6 diagram procedure) and make `/oc-release draft` seed [Unreleased] from `git log v<last>..HEAD -- skills/ plugins/` so the section cannot silently lag.

### skills/oc-agent-forge/SKILL.md:63 — Body menu advertises seven /oc-agent subcommands the frontmatter (and public catalog) do not list
*category:* docs-drift

**Problem.** The command reference lists /oc-agent plan, build, topology, tools, fixtures, trace, regress (plus eval, loop) but `commands:` in the frontmatter carries only /oc-agent, /oc-agent eval, /oc-agent loop, and that is what skills.json / the MCP catalog / the site expose. CI cannot catch this: the flag registry gates at the `/oc-agent` verb and gen-skills-catalog validates only the frontmatter array, so subcommands can drift freely.

**Evidence.** SKILL.md:10-13 'commands:\n  - /oc-agent\n  - /oc-agent eval\n  - /oc-agent loop'; SKILL.md:63-75 '/oc-agent plan … /oc-agent build … /oc-agent topology … /oc-agent tools … /oc-agent fixtures … /oc-agent trace … /oc-agent regress'; mcp-catalog commands for oc-agent-forge → ["/oc-agent","/oc-agent eval","/oc-agent loop"]; src/lib/flags/registry.js:279-280 'Subcommands … inherit the parent verb's flag — we gate at the verb, not the variant'.

**Proposed fix.** List every advertised subcommand in `commands:` (oc-claude-api lists all five of its body commands) or cut the menu to the three that are declared; consider a gen-skills-catalog check that every `/verb sub` in the body menu block appears in frontmatter.

### skills/oc-agent-forge/SKILL.md:461 — Claims oc-deploy-ops gates prod on the agent regression suite; oc-deploy-ops has no such gate
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** This skill says its fixture suite is 'the *trajectory* analogue' of prompt-ops's suite and 'the two regression suites run side by side' (:460), with its own Evaluator running `agent/fixtures.jsonl` (:334-357); oc-prompt-ops is absent from the Reads-from table (:513-518) and no step invokes /oc-prompt. oc-prompt-ops states the opposite: agent-forge 'uses this skill's eval harness to score it' (:363), 'its agent goldset runs through `/oc-prompt eval` rather than a bespoke runner' (:380), and lists oc-agent-forge under Read by for the 'Eval harness contract' (:448). One of the two contracts is wrong; a session starting from prompt-ops would expect agent fixtures to flow through /oc-prompt eval, which agent-forge never does. (The v2.0 plan's D-G separately records that no mechanical /oc-prompt eval runner exists.)

**Evidence.** SKILL.md:460 '| **oc-prompt-ops** | Owns single-prompt versioning + evals. Agent Forge's fixture suite is the *trajectory* analogue; the two regression suites run side by side. |'; oc-prompt-ops/SKILL.md:380 '| **oc-agent-forge** | Consumes this skill's eval harness to score agent behavior — its agent goldset runs through `/oc-prompt eval` rather than a bespoke runner. |'; docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:706 'no eval runner script exists; `/oc-prompt eval` is agent-driven'.

**Proposed fix.** Either add a conditional 'agent regression suite' row to oc-deploy-ops's audit gate (present when `agent/fixtures.jsonl` + a frozen harness config exist) and a reciprocal 'Reads from oc-agent-forge' row there, or soften agent-forge :461/:523 to 'hands off; the regression run is a CI job the user registers (:399), not a deploy-ops gate'.

### skills/oc-agent-forge/SKILL.md:522 — Every other read_by / reads_from claim is one-sided, and the data siblings are said to read lives in private skill_state
*category:* cross-skill-contract

**Problem.** oc-claude-api (:522), oc-scale-ops (:463, :525), oc-rag-forge (:457, :517), oc-integrations-engineer (:458, :518) and oc-api-dev (:459) are named as readers of / suppliers to this skill, but none of their SKILL.md files mention oc-agent-forge except oc-claude-api, which lists it only as a reader of its routing (:282), never as something it reads back for 'final model/caching tuning'. Separately, everything those siblings are said to consume — targets, allowlist, fixtures path, last_eval metrics — is documented only inside `skill_state` (:484-508); the skill writes no top-level `eval_scores`/`cost`, and the protocol lists eval_scores owners as oc-bug-check/oc-code-auditor/oc-prompt-ops only. So even a sibling that wanted to honour the read has no public field to read.

**Evidence.** `grep -n -i 'agent-forge\|oc-agent' skills/oc-scale-ops/SKILL.md skills/oc-rag-forge/SKILL.md skills/oc-integrations-engineer/SKILL.md skills/oc-api-dev/SKILL.md` → no matches; `grep -n -i agent skills/oc-scale-ops/SKILL.md` → only 'triAgent: false' (:8). oc-claude-api/SKILL.md:282 '| `oc-agent-forge` | Owns agent topology + harness loops; **reads** this skill's model routing |' (no reverse read; oc-claude-api has no 'Reads from' table). skills/oc-checkpoint-protocol/SKILL.md:660 '### `eval_scores` — … (owners: `oc-bug-check`, `oc-code-auditor`, `oc-prompt-ops`)'; :376 'Never read `skill_state`'. oc-monitoring-ops/SKILL.md:377 is the only reciprocal mention (AI-app template applies to 'any … oc-agent-forge surface').

**Proposed fix.** Add reciprocal rows in the five sibling skills, and promote the sibling-facing values (targets, last_eval verdict/metrics, fixtures path, allowlist size, call ceiling) into a public surface — a top-level field the protocol sanctions (e.g. register oc-agent-forge as an `eval_scores` owner) or `context_primer` — so the Read-by table describes something readable.

### skills/oc-api-dev/SKILL.md:58 — /oc-api build, /oc-api list, /oc-api drift are body commands missing from frontmatter commands
*category:* generated-surface

**Problem.** The command reference lists /oc-api build (58; Phase 2 heading at 261), /oc-api list (73) and /oc-api drift (74), but frontmatter commands: (10-20) omits all three. Generated surfaces (mcp-catalog.json, /skills.json, site) therefore advertise only the 10 frontmatter entries; the Phase 2 entry point and the gate verb are invisible. oc-qa-ops:133 tells users to run /oc-api build.

**Evidence.** node -e on src/generated/mcp-catalog.json -> oc-api-dev commands = exactly the 10 frontmatter strings. Registry gates at the verb (src/lib/flags/registry.js:279-281; scripts/check-skill-flags.mjs:56-64), so no flag failure masks the omission.

**Proposed fix.** Add '/oc-api build', '/oc-api list', '/oc-api drift' to frontmatter commands: (subcommands inherit the /oc-api flag; no registry change needed).

### skills/oc-api-dev/SKILL.md:144 — Input 03-data-model.md is never produced by oc-app-architect
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:605 — [oc-app-architect] Spec document name drift: 03-architecture.md vs 02-architecture.md/03-security-au

**Problem.** The Designer is told to open 03-data-model.md (lines 144, 162) and the Cross-Skill Reads table names it as the oc-app-architect artifact (538). oc-app-architect's Phase 2 spec table defines 02-architecture.md ('System diagram, data model, API design') and 03-security-auth.md; no 03-data-model.md exists. oc-app-architect:648 calls it 03-architecture.md — a third name. orchestrator.md:142 (bundled into every skill) repeats 03-data-model.md.

**Evidence.** grep -rn 03-data-model skills/ docs/ -> only skills/oc-api-dev/SKILL.md:144,162,538, skills/orchestrator.md:142 and the audit. sed -n 244,256p skills/oc-app-architect/SKILL.md lists 00..09 with 02-architecture.md holding the data model and 03-security-auth.md as 03.

**Proposed fix.** Replace 03-data-model.md with '02-architecture.md data-model section' at SKILL.md:144, 162, 538 and orchestrator.md:142; fix oc-app-architect:648 (03-architecture.md) in the same PR and resync bundles.

### skills/oc-api-dev/SKILL.md:294 — Builder reads the chosen stack from oc-stack-forge's checkpoint, which only exists in its private skill_state
*category:* checkpoint

**Problem.** 'Builder reads the chosen stack from oc-stack-forge's checkpoint'. oc-stack-forge stores the stack only under skill_state (stack_path, decisions.*); the live checkpoint has no top-level stack field. The protocol says 'Never read skill_state — it's private to the owning skill'. oc-stack-forge's Read-by table (483-489) also does not list oc-api-dev.

**Evidence.** sed -n 459-471 skills/oc-stack-forge/SKILL.md shows stack_path/decisions inside skill_state; node -e Object.keys(.checkpoints/oc-stack-forge.checkpoint.json) -> protocol_version, skill, project, project_dir, created_at, updated_at, phase, step, status, progress_summary, progress_table, context_primer, blockers, next_actions, skill_state. oc-checkpoint-protocol/SKILL.md:376.

**Proposed fix.** Read the stack from oc-app-architect's 01-tech-stack.md (oc-app-architect:248) or the stack-forge progress_summary/context_primer, and have oc-stack-forge list oc-api-dev in Read-by; do not reference skill_state.

### skills/oc-api-dev/SKILL.md:434 — Handoff names /oc-integrate secrets, a verb absent from oc-integrations-engineer's frontmatter
*category:* routing

**Problem.** Boundaries table hands secret rotation to 'oc-integrations-engineer /oc-integrate secrets'. oc-integrations-engineer's frontmatter commands: is only /oc-integrate and /oc-integrate plan; 'secrets' exists solely in that skill's body command reference (:55) and section heading (:431), so catalog/MCP surfaces do not advertise the target verb.

**Evidence.** sed -n '/^commands:/,/^[a-zA-Z]*:/p' skills/oc-integrations-engineer/SKILL.md -> '- /oc-integrate', '- /oc-integrate plan' only.

**Proposed fix.** Add /oc-integrate secrets to oc-integrations-engineer frontmatter commands (target-side fix); until then reference the 'Secret Audit' section rather than the verb.

### skills/oc-api-dev/SKILL.md:447 — Per-language adapter section directs the Builder to opchain-repo-only build artifacts with no not-installed fallback
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:322 — [oc-api-dev] Per-language scaffold adapters section directs the Builder to a build-time codegen arti

**Problem.** Builder is told to read src/generated/api-dev-adapters.json, rely on prebuild/gen-stack-packs/gen-flags ordering, and trust tests/api-dev-adapters.test.js — all real here but absent in the user project where the skill executes; :305 reads oc-stack-forge/references/typed-pipeline.md by repo-relative sibling path. No fallback is described.

**Evidence.** All paths exist in this repo (ls src/generated/, tests/, package.json prebuild) but are repo build tooling; CLAUDE.md and the OSS audit confirm no distribution channel ships them.

**Proposed fix.** Add a fallback: 'if src/generated/api-dev-adapters.json is absent, use the inline stack table (297-303) and the pack.yml testRunner/buildCmd/lintCmd from the installed oc-stack-forge skill'.

### skills/oc-api-dev/SKILL.md:495 — Checkpoint section says when to write but never how; bundled checkpoint-protocol.md is orphaned
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:119 — [oc-api-dev] Checkpoint section says WHEN to write but never HOW; bundled checkpoint-protocol.md is 

**Problem.** Checkpoint Integration (495-532) gives location, events and a skill_state example but never points at references/checkpoint-protocol.md (schema, write protocol, validator). The bundle is shipped but unreachable from the skill text.

**Evidence.** grep -n checkpoint-protocol skills/oc-api-dev/SKILL.md -> exit 1 (no hits); ls skills/oc-api-dev/references/ shows checkpoint-protocol.md present.

**Proposed fix.** Add 'Read references/checkpoint-protocol.md for the schema and write protocol' at the top of Checkpoint Integration.

### skills/oc-api-dev/SKILL.md:566 — PM ticket trigger relies on /oc-api lint detecting breaking changes, contradicting lint's definition
*category:* executability · *independently reported 2×*

**Problem.** The skill files breaking-change parent/child tickets, deprecation reminder tickets, api-drift bug tickets and SDK release comments (563-607) and expects oc-monitoring-ops to parent-link an incident to the deprecation reminder (587-589), but nowhere says it writes pm_refs (the protocol's field for refs a sibling must find) and the skill_state example (513-531) carries no ticket ids. top_level_fields_written is empty.

**Evidence.** SKILL.md:64 '/oc-api lint  Run spectral / redocly lint on the spec'; :318 'Diff the spec. openapi-diff <prev> <new>' under Conformance; :566 attributes diff detection to lint.

**Proposed fix.** Add a 'Writes pm_refs' note under Checkpoint Integration listing role=source (breaking-change parent), role=child (per-consumer), role=linked (deprecation reminder, api-drift bug).

### skills/oc-api-dev/SKILL.md:577 — .opchain/pm.yaml deprecation_lead_time has no absence fallback and is undefined in the pm.yaml schema
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:327 — [oc-api-dev] PM-Tool MCP section depends on .opchain/pm.yaml with no absence fallback (CONFIRMED, re

**Problem.** Consumer-ticket deadlines come from .opchain/pm.yaml deprecation_lead_time (576-577). The Failure modes list (609-617) covers missing api-consumers.yaml, 100+ matches, and v0.x, but not a missing pm.yaml or missing key. The canonical pm.yaml schema in oc-integrations-engineer (565-583) does not define deprecation_lead_time.

**Evidence.** grep -rn deprecation_lead_time skills scripts docs src -> only skills/oc-api-dev and the audit. grep -n -E 'pm.yaml|lead_time' skills/oc-integrations-engineer/SKILL.md -> 546, 560, 565, 583; no lead_time key.

**Proposed fix.** Add 'No .opchain/pm.yaml or no deprecation_lead_time -> default 90d, note in ticket' to Failure modes, and register the key in oc-integrations-engineer's pm.yaml schema.

### skills/oc-app-architect/SKILL.md:19 — Seventeen declared verbs are never mentioned in their own skill's description, so they are unreachable except by exact typing
*category:* trigger-drift · *surfaced by the routing lens*

**Problem.** Comparing each skill's `commands:` roots against the /oc-* tokens in its own description: oc-app-architect declares /oc-roadmap and /oc-scaffold (:15-16) and names neither in :19-22; oc-reverse-spec declares /oc-rev-scan, /oc-rev-full, /oc-rev-design, /oc-rev-stack, /oc-rev-sprint and names none (its description instead advertises the undeclared /oc-rev-spec); oc-dash-forge declares nine /oc-df-* verbs and names none; oc-git-ops declares /oc-git-sync and names none. Each of these has a flag, a site catalog entry and an MCP prompt, but the trigger surface never tells the model they exist — including /oc-rev-full, which orchestrator.md:277 routes an intent to.

**Evidence.** Script output 'commands verbs (root) never mentioned in own description': oc-app-architect /oc-roadmap, /oc-scaffold; oc-dash-forge /oc-df-intake, /oc-df-archetype, /oc-df-layout, /oc-df-tokens, /oc-df-prototype, /oc-df-spec-only, /oc-df-full, /oc-df-audit, /oc-df-variants; oc-git-ops /oc-git-sync; oc-reverse-spec /oc-rev-scan, /oc-rev-full, /oc-rev-design, /oc-rev-stack, /oc-rev-sprint. skills/oc-app-architect/SKILL.md:15-16 vs :19-22; skills/oc-reverse-spec/SKILL.md:10-16 vs :18; skills/orchestrator.md:277 routes to /oc-rev-full.

**Proposed fix.** For each skill, either name the phase verbs in the description (as oc-api-dev and oc-security-hardening already do) or accept them as menu-only sub-verbs and say so in the body; at minimum add /oc-rev-full and /oc-git-sync, the two that orchestrator §4 routes to.

### skills/oc-app-architect/SKILL.md:51 — Seven body commands missing from frontmatter commands: (five unprefixed, two ungated /oc- verbs)
*category:* routing · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:337 (unprefixed utility commands)

**Problem.** The command reference documents /eval (:51), /status (:55), /approve (:56), /oc-export-spec (:57), /oc-punch-list (:58), /contract (:59) and /checkpoint [show|reset] (:62-64); none appear in frontmatter `commands:` (:10-18). check-skill-flags.mjs derives verb flags from frontmatter only, so /oc-export-spec and /oc-punch-list have no `skills.command.*.enabled` flag in registry.js (grep: none) and cannot be gated or listed in the catalog, while the five bare verbs still break the /oc- convention (/status is a Claude Code built-in). /oc-app itself (:11, :21) is only a section header (:35) with no defined behaviour.

**Evidence.** SKILL.md:57 `/oc-export-spec    Generate master spec document (.docx)`; :58 `/oc-punch-list     View or edit the screen & component punch list`; registry.js:282-297 lists /oc-app … /oc-launch but no oc-export-spec / oc-punch-list; check-skill-flags.mjs:59 `for (const cmd of Array.isArray(data.commands) ? data.commands : [])`

**Proposed fix.** Either add /oc-export-spec and /oc-punch-list to frontmatter and registry.js, or fold them into subcommands of an existing verb (e.g. `/oc-spec export`, `/oc-design punch-list`); rename /eval, /status, /approve, /contract, /checkpoint to /oc-build eval|status|approve|contract and /oc-app checkpoint, or point at the universal checkpoint commands.

### skills/oc-app-architect/SKILL.md:256 — Spec doc numbering contradicts references/spec-template.md and the AI hub skills' expected file name
*category:* cross-skill-contract

**Problem.** SKILL.md's spec table defines 09-cost-estimate.md and 10-documentation-plan.md, and the AI branch adds 11-ai-architecture.md; the bundled template it points at has '09 — Documentation Plan', '10 — Cost Model', and '11 — Implementation Roadmap' — 09/10 swapped and 11 taken by a roadmap this skill never writes. Separately, oc-claude-api (the hub this skill invokes first) says it 'writes 05-llm-design.md' and that oc-app-architect 'reads 05-llm-design.md', and oc-prompt-ops reads the same file; this skill's 05 is 05-monetization.md and its AI doc is 11-ai-architecture.md, so the hub writes a file nobody here reads and collides with an existing number.

**Evidence.** SKILL.md:256 `| 09-cost-estimate.md |`, :257 `| 10-documentation-plan.md |`, :218 `Add an \`11-ai-architecture.md\` spec doc`; spec-template.md:482 `## 09 — Documentation Plan`, :508 `## 10 — Cost Model (detailed version)`, :517 `## 11 — Implementation Roadmap`; oc-claude-api/SKILL.md:281 `| \`oc-app-architect\` | Auto-invokes this skill in Phase 2 on AI apps; reads \`05-llm-design.md\` |`

**Proposed fix.** Renumber spec-template.md sections to match the SKILL.md table (09 cost, 10 docs, 11 AI architecture; move the roadmap template under sprints/ or drop it), and change oc-claude-api/oc-prompt-ops to name 11-ai-architecture.md.

### skills/oc-app-architect/SKILL.md:402 — oc-app-architect's sprint gate is per-criterion but every artifact it produces records only an aggregate
*category:* threshold-drift · *surfaced by the executability lens*

**Problem.** Build Configuration sets `pass_threshold = All criteria >= 6/10` (:402), so the gate is per-criterion. Everything downstream records an aggregate instead: the evaluation report's headline is `**Code Score: [X]/10**` (:495), the user-facing summary is `Sprint 1: Auth 8.2/10 (2 rounds)` (:598), and the checkpoint surface oc-ux-engineer mirrors stores `{ "final": 8.1, "rounds": 2, "verdict": "PASS" }` (oc-ux-engineer:640). A weighted 8.2 is reachable with one criterion at 4/10, which the stated threshold must fail — so a later session (or oc-orchestrator reading the trend) cannot reconstruct whether the gate was actually met.

**Evidence.** skills/oc-app-architect/SKILL.md:401-402 `| max_iterations | 3 |` / `| pass_threshold | All criteria ≥ 6/10 |`; :495 `- **Code Score: [X]/10**`; :598 `  ✅ Sprint 1: Auth        8.2/10 (2 rounds) — 12 tests`; skills/oc-ux-engineer/SKILL.md:640 `"sprint-1": { "final": 8.1, "rounds": 2, "verdict": "PASS" },`.

**Proposed fix.** Record the per-criterion vector alongside the aggregate — reuse the wire-1.1 `eval_scores[].dimensions` object the validator already accepts (scripts/checkpoint.mjs:357-363) — and state at :495 that the aggregate is informational while `min(criteria) >= 6` is the gate.

### skills/oc-app-architect/SKILL.md:640 — Cross-Skill Integration table and description omit nine skills the body actively chains to
*category:* docs-drift

**Problem.** The table (:640-650) lists nine skills; the body also chains to oc-claude-api, oc-rag-forge, oc-agent-forge, oc-prompt-ops (:202-207), oc-data-ops (:224-239), oc-qa-ops (:253), oc-dash-forge (:291-295), oc-security-auditor (:555) and oc-monitoring-ops (:558). The frontmatter description (:22) names only oc-stack-forge and oc-ux-engineer as chain targets. A reader using the table as the contract summary (the same table orchestrator.md §7 mirrors) misses more than half the edges.

**Evidence.** SKILL.md:640-650 rows: oc-stack-forge, oc-ux-engineer, oc-code-auditor, oc-git-ops, oc-deploy-ops, oc-integrations-engineer, oc-api-dev, oc-scale-ops, oc-reverse-spec; :22 `Chains to (when you invoke it): oc-stack-forge and oc-ux-engineer.`

**Proposed fix.** Add rows for the nine missing skills with their phase + verb, and extend the description's 'Chains to' clause (keeping orchestrator.md §7 :342-346 in sync).

### skills/oc-app-architect/SKILL.md:648 — Cross-Skill table names `03-architecture.md`, a spec file this skill never generates (oc-api-dev expects `03-data-model.md`)
*category:* cross-skill-contract · *independently reported 4×* · *known:* docs/audits/2026-07-04-portability-audit.md:605

**Problem.** orchestrator §3 (:166-173) states 'These edges are conventions, not machinery … cross-skill prose produced zero autonomous invocations' and the stack-forge / ux-engineer rows (:202-203) say '(a step you run, not an automatic trigger)'. oc-app-architect's Cross-Skill Integration table says oc-stack-forge is 'Auto-invoked during Phase 2' (:642), the ux Design Evaluator 'auto-attaches during UI sprints' (:643, also :404 `auto-attach on UI sprints`, :480), and `/oc-git-sync` 'auto-invokes oc-bug-check … and the oc-docs-forge → oc-repo-ops pre-PR gate' (:645, :556). oc-bug-check:103 has a heading '**Auto-invocation:** oc-git-ops calls oc-bug-check before every…'; oc-claude-api:281 says oc-app-architect 'Auto-invokes this skill in Phase 2'. A session reading these skill files is told the gate fires by itself; the protocol bundled next to them says it will not.

**Evidence.** skills/oc-app-architect/SKILL.md:642 `| **oc-stack-forge** | Auto-invoked during Phase 2.`; :643 `Design Evaluator auto-attaches during UI sprints in Phase 6.`; :645 `which auto-invokes oc-bug-check at commit`; skills/oc-bug-check/SKILL.md:103 `**Auto-invocation:** oc-git-ops calls oc-bug-check`; skills/oc-claude-api/SKILL.md:281 `Auto-invokes this skill in Phase 2 on AI apps`; orchestrator.md:166 `> **These edges are conventions, not machinery.**`; :202 `(a step you run, not an automatic trigger)`.

**Proposed fix.** Change :648 to '02-architecture.md (API Design + Data Model sections)' and update oc-api-dev:162/538 and orchestrator.md:142 to the same name, or split the data model into a real 03-data-model.md and renumber security-auth.

### skills/oc-app-architect/SKILL.md:709 — Source ticket is never recorded in `pm_refs`, but siblings look for it in this checkpoint
*category:* cross-skill-contract

**Problem.** Phase 1 says only 'Cite the ticket id in 00-project-overview.md' and Phase 4 records comment ids under private `skill_state.pm.sprint_comments[]`; `pm_refs` is never mentioned in this file (grep: 0 hits). oc-code-auditor resolves the linked ticket 'from … oc-app-architect.checkpoint.json' and oc-orchestrator 'reads pm_refs across every skill checkpoint'; the protocol says to prefer pm_refs for anything a sibling reads and keep only private bookkeeping in skill_state. As written, the ticket a sibling needs is in a markdown file and a private bag, not the documented top-level field.

**Evidence.** grep -n 'pm_refs' skills/oc-app-architect/SKILL.md → none; SKILL.md:750 `\`skill_state.pm.sprint_comments[]\``; oc-code-auditor/SKILL.md:477-478 `(from the PR body, the \`oc-app-architect.checkpoint.json\`, or the user prompt)`; oc-checkpoint-protocol/SKILL.md:552-553 `Prefer \`pm_refs\` for anything a *sibling* skill needs to read`

**Proposed fix.** In Phase 1 step 4 and Phase 4 step 5, append `{ provider, id, role: "source"|"sprint-child", url }` entries to top-level `pm_refs[]` alongside the skill_state bookkeeping.

### skills/oc-app-architect/SKILL.md:741 — `create_child_tickets` pm.yaml key is read here but defined in no schema
*category:* cross-skill-contract

**Problem.** Phase 4 step 4 branches on `pm.yaml` `create_child_tickets: true`. The pm.yaml schema in oc-integrations-engineer (provider, team_or_project, issue_types, states, labels_default, mcp_server) and the protocol doc (tool_overrides, states.extended) never define this key; grep across skills/ finds it only in this file (site walkthroughs echo it). The section itself says all contract details 'come from that doc' (:686-689).

**Evidence.** grep -rn 'create_child_tickets' skills/ → skills/oc-app-architect/SKILL.md:741 only; oc-integrations-engineer/SKILL.md:565-581 pm.yaml example lacks the key

**Proposed fix.** Add `create_child_tickets` (default false) to the pm.yaml schema in oc-integrations-engineer/SKILL.md and pm-mcp-protocol.md, or drop the child-ticket branch.

### skills/oc-bug-check/references/check-patterns.md:111 — references/check-patterns.md reinstates the --include-scoped and TS-only filters SKILL.md explicitly forbids
*category:* docs-drift · *known:* docs/plans/coordination-gaps-punchlist.md Tier 2 items 0.6 (:83-87) and 0.7 (:76-81) — fixed in SKILL.md (CHANGELOG 1.8.2 :262-266), never applied to 

**Problem.** check-patterns.md bills itself as the implementation layer ('The SKILL.md describes WHAT is checked; this file provides the implementation details', :4-5) and then contradicts the v1.8.2 fixes: its primary secret grep (:111-114) is `--include`-scoped to ts/tsx/js/json/yaml/yml/toml — exactly what SKILL.md:233-236 says made the scanner 'blind to Swift, Kotlin, Ruby, PHP, Java — every non-JS repo got a silent zero-hit PASS'; its source filter (:253) is `\.(ts|tsx|js|jsx|py|go|rs)$` (drops swift/kt/rb/java/php vs SKILL.md:473) despite SKILL.md:471-472 'a filter that drops your language silently empties the whole gate'; and its no-git fallback (:244) is `find src/ -name "*.ts" -o -name "*.tsx"`. It also lacks the JWT and sk_test_ patterns. A session that follows the reference reintroduces the false-green failure mode.

**Evidence.** SKILL.md:233-236 comment block; SKILL.md:473 `SRC='\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|swift|kt|rb|java|php)$'`; check-patterns.md:111-114, :244, :253 as quoted; CHANGELOG.md:262-266 records the SKILL.md-side fix in 1.8.2; grep -n 'eyJ\|sk_test_' references/check-patterns.md → 0 hits.

**Proposed fix.** Sync check-patterns.md to SKILL.md: drop the --include allowlist on the secret grep, reuse the `$SRC` extension list at :253, replace the TS-only find fallback with the same list, and add the JWT / sk_test_ rows to the service table.

### skills/oc-bug-check/SKILL.md:103 — Handoff verb /oc-git-commit is not in oc-git-ops frontmatter; text also uses /oc-commit
*category:* routing

**Problem.** The skill's description (:22), command banner (:68), auto-invocation paragraph (:103) and Git-Ops Integration (:491) all key on `/oc-git-commit`, while the pipeline diagram (:94) uses `/oc-commit`. oc-git-ops's frontmatter `commands:` (oc-git-ops/SKILL.md:10-16) registers `/oc-commit`, not `/oc-git-commit`; the latter exists only in oc-git-ops's body command banner (:44, :171) and in orchestrator.md:194/:667, so the flag registry and catalog know one verb and the prose another.

**Evidence.** grep -n 'oc-git-commit\|/oc-commit' skills/oc-bug-check/SKILL.md → 22, 68, 94, 103, 491. sed -n 10,16p skills/oc-git-ops/SKILL.md → /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release.

**Proposed fix.** Pick one verb: either add `/oc-git-commit` to oc-git-ops frontmatter (and the flag registry) or change bug-check :22/:68/:103/:491 and orchestrator.md:194/:667 to `/oc-commit`.

### skills/oc-bug-check/SKILL.md:293 — Verdict vocabulary is self-contradictory: three different 'three verdicts' plus BYPASS
*category:* cross-skill-contract · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 row 4 (:695) declares the enum PASS/FAIL/UNSUPPORTED and attributes 'The gate produces 

**Problem.** :121 lists the gate verdict as `PASS / FAIL / UNSUPPORTED`; :293 says 'The gate produces one of three verdicts' and then enumerates PASS (:295), WARN (:306), FAIL (:322); :654 calls UNSUPPORTED 'a distinct terminal verdict'; :751 says 'Binary verdict. Pass or fail'; output-templates.md:81-84 adds 'Gate Verdict: BYPASS'. :664 requires callers to treat UNSUPPORTED as blocking-with-override, yet neither oc-git-ops (:239-243 table: PASS/FAIL/no-checkpoint) nor oc-repo-ops mentions UNSUPPORTED — only the plugin hook does (pre-commit-gate.cjs:214-221).

**Evidence.** grep -n 'one of three verdicts\|PASS / FAIL / UNSUPPORTED\|distinct terminal verdict\|Binary verdict' skills/oc-bug-check/SKILL.md → 293, 121, 654, 751. grep -n UNSUPPORTED skills/oc-git-ops/SKILL.md skills/oc-repo-ops/SKILL.md → 0 hits.

**Proposed fix.** Rewrite the Verdicts section to list PASS / FAIL / UNSUPPORTED as gate verdicts, describe WARN as a count that rides on PASS (strict mode → FAIL), and BYPASS as a logged event; add an UNSUPPORTED row to oc-git-ops :239-243.

### skills/oc-bug-check/SKILL.md:495 — Commit-footer contract (`bugcheck: pass …`) is defined only here; oc-git-ops never mentions it
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** SKILL.md:293 'The gate produces one of three verdicts' (PASS/FAIL/UNSUPPORTED), yet :496 says 'If PASS or WARN (lenient mode): proceed to commit' — WARN is a per-check status (:559), not a verdict, and a checkpoint recording `WARN` as the verdict is denied by pre-commit-gate.cjs:222 (`verdict !== "PASS"`). oc-git-ops SKILL.md:239-243 lists PASS / FAIL / (no checkpoint) only, so a session following oc-git-ops has no instruction for UNSUPPORTED even though oc-bug-check:664 says callers 'must treat UNSUPPORTED as blocking-with-override' and the gate denies it with its own message (:214-221).

**Evidence.** skills/oc-bug-check/SKILL.md:496 `3. If PASS or WARN (lenient mode): proceed to commit`; :293 `The gate produces one of three verdicts:`; skills/oc-git-ops/SKILL.md:239-243 table rows PASS/FAIL/(no checkpoint); pre-commit-gate.cjs:214 `if (verdict === "UNSUPPORTED")`, :222 `if (verdict !== "PASS")`.

**Proposed fix.** Delete 'or WARN (lenient mode)' at :496 (warnings ride PASS as a count) and add an UNSUPPORTED row to the oc-git-ops verdict table pointing at the SKILL.md:651-664 contract.

### skills/oc-bug-check/SKILL.md:513 — `bugcheck: pass` commit footer and `[BYPASS]` prefix are read by nothing — the 'audit trail in git history' is a naming convention, not a mechanism
*category:* gate-reality

**Problem.** 'Commit Message Annotation' (:499-513) says oc-git-ops appends `bugcheck: pass (7/7, …)` or `bugcheck: bypassed (…)` and that 'This creates an audit trail in git history'; the Bypass Protocol (:383) says the commit message gets a `[BYPASS]` prefix. No script, hook, workflow, or test greps either string: repo-wide grep for `bugcheck: pass` / `\[BYPASS\]` hits only these SKILL.md lines. oc-git-ops's own Commit Structure (:171-181) and PM-MCP commit rule (:591-594, trailer `Refs:`) never mention the footer, so even the agent-side half is not cross-referenced. Classification: (c) presented as mechanical accountability, nothing implements or consumes it.

**Evidence.** `grep -rn -e 'bugcheck: pass' -e '\[BYPASS\]' scripts plugins .claude src tests .github CLAUDE.md skills/*/SKILL.md` → only skills/oc-bug-check/SKILL.md:383,504,510. oc-git-ops SKILL.md:171-181 commit template has `[optional footer]` with no bugcheck line.

**Proposed fix.** Either add the footer to oc-git-ops's commit template (:180) and have release-ledger.yml / `/oc-release plan` count `bugcheck: bypassed` commits since the last tag (a real consumer), or reword :513 to 'agent-executed convention; nothing reads this footer today' and drop 'audit trail'.

### skills/oc-bug-check/SKILL.md:589 — Read-by table promises verdict/trend/debt that live only in skill_state, which the bundled protocol forbids other skills from reading
*category:* cross-skill-contract · *independently reported 3×*

**Problem.** Six skills are told they read the gate verdict, pass rate, trend and carried debt (:589-596), but the documented schema stores all of those exclusively under `skill_state` (:550-578); no protocol-public field (`status`, `blockers`, `progress_summary`, a top-level key) carries the verdict and no exception is declared. The bundled checkpoint-protocol says 'Other skills should NOT read this section — it's private' (oc-checkpoint-protocol/SKILL.md:162) and 'Never read `skill_state`' (:376), and its cross-skill read table (:368-372) has no bug-check row. In practice oc-git-ops (:237), both hooks and oc-repo-ops must read skill_state to honour the contract.

**Evidence.** skills/oc-bug-check/SKILL.md:583-587 `| oc-code-auditor | … | oc-app-architect | … | oc-deploy-ops |`; :174 `**QA-manifest awareness (v1.9, additive):** when \`.opchain/qa.yaml\` exists (written by oc-qa-ops)`; orchestrator.md:145 `| **oc-bug-check** | oc-git-ops (gate trigger), oc-qa-ops (\`.opchain/qa.yaml\` coverage budgets, when present) |`.

**Proposed fix.** Either mirror the gate verdict into a protocol-public field (e.g. `status`/`blockers` or a top-level `gate_verdict`) and point the Read-by table at it, or add an explicit bug-check exception row to the protocol's cross-skill table and cite it here.

### skills/oc-checkpoint-protocol/references/INTEGRATION.md:21 — INTEGRATION.md routes /checkpoint unconditionally through the opchain-only CLI
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:51 (CLI-only write paths) — remediated in SKILL.md by v1.8.1 'Checkpoint truth without the CLI'; INTEGRATI

**Problem.** INTEGRATION.md:21-31 says 'When any of these commands are received, run the canonical CLI … node scripts/checkpoint.mjs <command>' with no fallback, while SKILL.md:281-289 and :383-391 say the CLI exists only inside the opchain.dev repo and a missing script is never a reason to skip the write. A session on a user project following INTEGRATION.md would try a nonexistent script.

**Evidence.** SKILL.md:283-284 'on a user's own project it is absent'; INTEGRATION.md:21-26 has no such caveat (only :46 offers 'Read it (or run …)').

**Proposed fix.** Add the read-the-JSON-directly fallback to INTEGRATION.md:21-31 mirroring SKILL.md 'How to Write'.

### skills/oc-checkpoint-protocol/references/INTEGRATION.md:72 — INTEGRATION.md oc-app-architect template names gates/phases/files oc-app-architect does not have
*category:* cross-skill-contract

**Problem.** The 'copy-paste ready' oc-app-architect section records phases `roadmap`/`roadmap-approved`/`uat-approved` (:72-76), progress_table rows `roadmap`, `roadmap-gate`, `build`, `uat-gate` (:90-94), and generated file `spec/11-implementation-roadmap.md` (:117). oc-app-architect's own template has `sprint-plan`, `sprint-gate`, `sprint-1..3` and its gates are Spec / Design Direction / Punch List / Sprint Plan; spec/ runs 00..10.

**Evidence.** skills/oc-app-architect/SKILL.md:138-151 (progress_table), :259/:307/:323/:368 (the four ★ gates; no 'Roadmap Gate' or 'UAT Gate' anywhere), :616 ('00-project-overview.md ... 10-documentation-plan.md'); grep '11-implementation\|UAT Gate\|Roadmap Gate' skills/oc-app-architect/SKILL.md → 0 hits.

**Proposed fix.** Replace INTEGRATION.md:63-118 with oc-app-architect's current progress_table + gate names + file list, or point at oc-app-architect/SKILL.md:138-151 instead of duplicating.

### skills/oc-checkpoint-protocol/SKILL.md:55 — Problem Statement describes a pre-1.0 world as 'Today'
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:625 '[oc-checkpoint-protocol] Problem Statement describes a pre-1.0 world (tri-dev, life-architect …)' CON

**Problem.** Lines 54-61 say 'Today: … tri-dev has file-based state but no formal resume; oc-app-architect has gates but zero session persistence; oc-stack-forge, life-architect, and others have no continuity at all'. tri-dev is retired (INTEGRATION.md:133), life-architect is not an opchain skill, and oc-app-architect / oc-stack-forge both have live 1.1 checkpoints. Materially misleads about sibling skills' persistence.

**Evidence.** ls .checkpoints/ shows oc-app-architect.checkpoint.json and oc-stack-forge.checkpoint.json at protocol_version 1.1; neither 'tri-dev' nor 'life-architect' is in the 33-skill catalog (ls skills/).

**Proposed fix.** Rewrite the section as history ('Before v1.0 …') or delete it; drop the non-catalog names.

### skills/oc-checkpoint-protocol/SKILL.md:228 — Two archive conventions for the same 'restart/reset' action
*category:* checkpoint · *independently reported 2×* · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 row 10 (history/ absent from Directory Convention tree) — covers the tree omission only

**Problem.** Resume Protocol step 3 says Restart archives by renaming to `.checkpoint.json.bak` (:228); oc-migration-ops:593 and oc-modularize-ops:91/:256 implement `abandon` as `.bak`; oc-git-ops's .gitignore template (:546) ignores `*.checkpoint.json.bak`. The `/checkpoint reset` verb (:505) and CLI (:435, checkpoint.mjs:949-957) instead move the file to `.checkpoints/history/<skill>.<stamp>.checkpoint.json`, which is NOT gitignored (git check-ignore → not ignored) so it is tracked, while a `.bak` in a git-ops-templated project is untracked and lost on an ephemeral runner. The rotation prose (:339) names a third pattern `history/<skill>.<date>.json`. `.checkpoints/history/` has never been created in this repo (ls → No such file) despite six references. Two sessions 'restarting' the same skill produce different artifacts with different durability.

**Evidence.** protocol:228 `Archive current checkpoint (rename to .checkpoint.json.bak)`; :435 `reset <skill>  # archive current file into .checkpoints/history/`; :339 `.checkpoints/history/<skill>.<date>.json`; scripts/checkpoint.mjs:955 `const dest = join(histDir, \`${skill}.${stamp}.checkpoint.json\`);`; skills/oc-git-ops/SKILL.md:546 `*.checkpoint.json.bak  # Archived checkpoints`; `ls .checkpoints/history` → No such file or directory; `git check-ignore -v .checkpoints/history/x.checkpoint.json` → exit 1.

**Proposed fix.** Pick one archive convention (history/<skill>.<stamp>.checkpoint.json, tracked). Rewrite protocol:228/:339, oc-migration-ops:593, oc-modularize-ops:91/:256 to it; drop the `*.checkpoint.json.bak` line from oc-git-ops:546 or make it `.checkpoints/history/` policy.

### skills/oc-checkpoint-protocol/SKILL.md:361 — oc-checkpoint-protocol tells every skill the orchestrator map is complete and 'covers every skill' — it covers 25 of 33
*category:* checkpoint

**Problem.** The Cross-Skill Reads section defers to orchestrator.md as 'the **complete, maintained** upstream/downstream map … (it covers every skill including oc-security-auditor, oc-api-dev, oc-monitoring-ops, oc-release-ops, and oc-migration-ops). Treat that as the single source of truth'. This text is bundled (frontmatter stripped) as references/checkpoint-protocol.md into all 32 other skills. The named examples are all pre-v1.5; the eight skills with no row (see the Upstream-map finding) are exactly the ones a session in, say, oc-rag-forge would look up. The illustrative table beneath (:368-372) also lists 'oc-deploy-ops reads oc-app-architect' and 'oc-git-ops reads any skill checkpoint', neither of which matches the orchestrator rows (:148, :144) it says are authoritative.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:361-364 `the **complete, maintained** upstream/downstream map lives in \`orchestrator.md\` § "Upstream/Downstream Map" (it covers every skill including …). Treat that as the single source of truth`; orchestrator.md:134-158 → 25 rows; `md5` of every references/checkpoint-protocol.md identical per `npm run sync-bundles:check` (in sync).

**Proposed fix.** Fix the map (add the 8 rows) and update the parenthetical to name the v1.5/v1.7 skills, or soften the claim to 'the maintained map (currently N of 33 skills)'. Align :369-370 with orchestrator :148/:144.

### skills/oc-checkpoint-protocol/SKILL.md:375 — Cross-Skill Reads rule list omits the fields later sections tell siblings to read
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md P3d (verified_for_sha promotion) — covers only one of the reads

**Problem.** The protocol states three times that skill_state is private and never read by other skills (schema comment line 162, Cross-Skill Reads rule line 376, Principle 5 line 725) and oc-orchestrator:380 repeats 'Do NOT read skill_state'. Yet every real gate in the chain is a documented cross-skill skill_state read: oc-git-ops reads oc-docs-forge `skill_state.pr_body_fragment`/`pr_comment_marker` (:265, :329) and oc-repo-ops `skill_state.blocking_findings` + verdict (:341); oc-monitoring-ops reads oc-deploy-ops `skill_state.pm.deploy_tickets[]` (:675); oc-data-ops reads oc-stack-forge `skill_state.decisions.*` (:92); oc-fleet-ops/oc-migration-ops read oc-modularize-ops `skill_state.modules[]` (fleet:297); oc-release-ops reads oc-docs-forge `verified_for_sha` (:305) and oc-git-ops merged_prs (:396); pre-commit-gate.cjs:211-226 and session-state.cjs:79 read oc-bug-check / any skill's skill_state; checkpoint.mjs:663 (`driftTokens`) scans every skill's skill_state keys. The contract text is wrong about the system as built, so a writer that treats skill_state as freely reshapeable (as the protocol permits) breaks readers it was told do not exist.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:376 `- Never read \`skill_state\` — it's private to the owning skill`; :162 `Other skills should NOT read this section`; :725 `Private state stays private`; skills/oc-orchestrator/SKILL.md:380 `5. Do NOT read skill_state (private to owning skill)`; readers cited above verified with grep -n.

**Proposed fix.** Either promote the cross-skill keys (pr_body_fragment, blocking_findings/verdict, verified_for_sha, pm.deploy_tickets, decisions.*, modules[], last_run_verdict/verified_tree, findings_by_severity) into a documented 'shared' top-level or `skill_state.public` namespace with shapes in the protocol, or rewrite protocol:376/:162/:725 and oc-orchestrator:380 to say skill_state keys named in a skill's 'Read by' table are a published contract.

### skills/oc-checkpoint-protocol/SKILL.md:406 — Staleness text still says in_progress >7d only; tooling is status-aware
*category:* docs-drift · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md Tier 1 item 0.1 'Fix the staleness conjunction' — fixed in code, SKILL.md not updated

**Problem.** Punchlist 0.1 was implemented: checkpoint.mjs has STALE_DAYS=7 (in_progress), STALE_COMPLETE_DAYS=14, STALE_BLOCKED_DAYS=3 (lines 101-112) and session-state.cjs:22 mirrors `{ in_progress: 7, complete: 14, blocked: 3 }`. The protocol still says status flags stale 'on in_progress checkpoints older than 7 days' (:406) and the resume rule is 'stale (>7d)' regardless of status (:222); README:101 says '⚠ stale / drift (e.g. in_progress and untouched >7 days)'; oc-orchestrator:805 'If updated_at is >7 days old and status is in_progress'. A session following the prose will not treat an 81-day-old `complete` orchestrator checkpoint or a 4-day-old `blocked` one as stale even though doctor/status/hook do — the exact 27-day-complete drift the code comment cites.

**Evidence.** scripts/checkpoint.mjs:101 `const STALE_DAYS = 7;` :110 `const STALE_COMPLETE_DAYS = 14;` :112 `const STALE_BLOCKED_DAYS = 3;`; plugins/opchain/hooks/session-state.cjs:22; skills/oc-checkpoint-protocol/SKILL.md:222 `or the checkpoint is stale (>7d)`, :406 `flags ⚠ stale (Nd) on in_progress checkpoints older than 7 days`; .checkpoints/README.md:101; skills/oc-orchestrator/SKILL.md:805.

**Proposed fix.** Update protocol:222/:406, README:101 and oc-orchestrator:805 to state the per-status thresholds (in_progress 7d, complete 14d, blocked 3d, failed never).

### skills/oc-checkpoint-protocol/SKILL.md:498 — /checkpoint command family is prose-only — registered in no frontmatter, plugin command, or flag
*category:* routing

**Problem.** SKILL.md:496-510 says every checkpoint-aware skill 'should recognize /checkpoint' and INTEGRATION.md:9-19 says to add the block 'to every skill's command reference section', yet no skill's frontmatter `commands:` lists any /checkpoint verb, no `skills.command.checkpoint.*` flag exists (gen-skills-catalog gates frontmatter verbs on the registry), plugins/opchain/commands/ has no checkpoint.md, and no skill contains the verbatim 'CHECKPOINT (cross-skill)' block.

**Evidence.** awk-frontmatter grep for '/checkpoint' across skills/oc-*/SKILL.md → 0; grep 'checkpoint' src/lib/flags/registry.js → only skills.registry.oc-checkpoint-protocol.enabled + skills.capability.checkpoint-protocol; ls plugins/opchain/commands/ → 12 files, none checkpoint; grep -l 'CHECKPOINT (cross-skill)' skills/oc-*/SKILL.md | wc -l → 0.

**Proposed fix.** Either ship plugins/opchain/commands/checkpoint.md + a skills.command.checkpoint.enabled flag and list the verb in adopting skills' frontmatter, or reword :496-510 / INTEGRATION.md:7-19 as a prose convention ("when the user says /checkpoint …") rather than a command every skill registers.

### skills/oc-checkpoint-protocol/SKILL.md:597 — pm_refs status surface documented but nothing implements it
*category:* tooling · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md P1 '`pm_refs` status surface is documented but not implemented' (line 269) — still open

**Problem.** SKILL.md:596-608 states `npm run checkpoint:status` includes a one-line PM summary per skill ("PM: PLAT-4471 (source) + 3 children") and :608 says this makes the cross-skill PM thread legible at resume. No such output exists; a session relying on status to surface PM context will wrongly conclude no pm_refs are recorded.

**Evidence.** grep -n 'pm_refs\|PM:' scripts/checkpoint.mjs hits only the validator block (:291-301); cmdStatus (:554-624) has no pm_refs rendering. Same claim repeated in every bundled references/checkpoint-protocol.md (33 identical copies).

**Proposed fix.** Either render a PM column/line in cmdStatus from pm_refs, or reword :596-608 to 'planned' / delete the sample output; resync bundles.

### skills/oc-checkpoint-protocol/SKILL.md:597 — The documented `npm run checkpoint:status` PM summary line does not exist in the CLI
*category:* contract-drift · *surfaced by the live-checkpoints lens*

**Problem.** The protocol's "Status surface" section (:598-608) states "npm run checkpoint:status includes a one-line PM summary per skill in v1.2" and shows four example rows of the form "oc-app-architect spec-approved PM: PLAT-4471 (source) + 3 children". Running `node scripts/checkpoint.mjs status` today prints a markdown table with columns Skill | Phase | Step | Status | Updated | Age and per-skill prose blocks — no PM column, no "PM:" line anywhere. grep for pm_refs in scripts/checkpoint.mjs hits only the validator (lines 291-305). The catalog is at skill release 1.9.0, seven minors past the version the doc claims shipped this.

**Evidence.** Verified by running the command; grep -n "PM:" scripts/checkpoint.mjs returns nothing. cmdStatus (scripts/checkpoint.mjs:554) never touches data.pm_refs.

**Proposed fix.** Either render the PM line in cmdStatus when pm_refs is present, or delete the Status-surface subsection and its example block so the protocol stops advertising a surface that has never existed.

### skills/oc-claude-api/references/migration-playbooks.md:97 — Migration playbook hands off to `/oc-git-pr`, a verb oc-git-ops's frontmatter does not declare
*category:* routing

**Problem.** Step 5 says 'Route the diff through `oc-git-ops` (`/oc-git-pr`)'. oc-git-ops's frontmatter commands are /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release. `/oc-git-pr` exists only in oc-git-ops's body help screen and orchestrator.md, and the flag registry gates `/oc-pr` (no `skills.command.oc-git-pr.enabled`), so the verb named here can neither be flag-gated nor matched against the target's declared commands.

**Evidence.** skills/oc-git-ops/SKILL.md:10-16 commands list (has `/oc-pr`, no `/oc-git-pr`); skills/oc-git-ops/SKILL.md:45 '/oc-git-pr  Generate PR description from commits/checkpoint' (body only); src/lib/flags/registry.js:288 contains "/oc-pr", `grep -n oc-git-pr src/lib/flags/registry.js` -> 0.

**Proposed fix.** Change :97 to `/oc-pr` (the declared verb), or have oc-git-ops add `/oc-git-pr` to its frontmatter commands and the registry. SKILL.md:248 ('open the PR via `oc-git-ops`') is verb-less and fine.

### skills/oc-claude-api/SKILL.md:50 — 'Bundled `claude-api` skill' is not bundled; the accuracy contract points at files that do not ship
*category:* executability

**Problem.** The Accuracy contract (:49-52) and Principle 5 (:351-352) say model IDs/prices/breaking changes 'are sourced from the bundled `claude-api` skill ... invoke `claude-api` (or read its `shared/` files)'; migration-playbooks.md:5-7 cites `shared/model-migration.md`. No such skill or file exists in skills/, plugins/opchain/skills/, the zip, or ~/.claude/skills; `claude-api` is a Claude Code built-in skill, which the punchlist itself flags as a distinct non-opchain skill that collides with this id. On an install without it, the 'never from memory' rule cannot be followed and the fallback (Models API, model-routing.md:57-63) is only mentioned in a reference.

**Evidence.** `ls -d skills/claude-api plugins/opchain/skills/claude-api` -> No such file; `find . -name model-migration.md` (excluding node_modules) -> none; scripts/make-skills-zip.sh:46-53 packs only skills/*/ dirs containing SKILL.md plus README.md; `ls ~/.claude/skills | grep claude-api` -> only oc-claude-api; docs/plans/coordination-gaps-punchlist.md:144 '`claude-api` ... live collisions with `oc-claude-api` ... are **not** the same skills'.

**Proposed fix.** Replace 'bundled' with 'the Claude Code built-in `claude-api` skill, when present'; drop the `shared/` path claims; promote the Models API lookup (`client.models.list()` / `retrieve`) from model-routing.md:57-63 into SKILL.md as the fallback when that skill is absent.

### skills/oc-claude-api/SKILL.md:247 — `migrate` steps 5-6 hard-depend on oc-prompt-ops and oc-git-ops with no absence fallback
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:372 [oc-claude-api] Migration flow hard-depends on oc-prompt-ops and oc-git-ops with no installed-check or

**Problem.** Still open, text unchanged since the audit: 'Hand the diff to `oc-prompt-ops` for a regression run against the golden set before merge, then open the PR via `oc-git-ops`'. Per-skill zips (scripts/make-skills-zip.sh:63-72) ship this skill alone; the eval gate and PR step then stall with no 'if absent, do X' path.

**Evidence.** SKILL.md:247-248 and references/migration-playbooks.md:89-99 contain no 'if not installed' language (`grep -rniE 'not installed|absent|fallback' skills/oc-claude-api/SKILL.md skills/oc-claude-api/references/migration-playbooks.md` -> only the API `fallbacks` param at playbooks:70).

**Proposed fix.** Add a degrade path: 'If oc-prompt-ops is absent, run the project's own test suite plus a hand-picked golden sample and record the result in the PR body; if oc-git-ops is absent, open the PR with `gh pr create` using the same body.'

### skills/oc-claude-api/SKILL.md:298 — Checkpoint section gives location + 'when' but no write imperative and never points at the bundled protocol
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:164 [oc-claude-api] Checkpoint-write gap (CONFIRMED, checkpoint-write-gap, fix:M)

**Problem.** Still open. '## Checkpoint Integration' (:298-334) has the path, a When-to-Write table and a skill_state fragment, but no instruction to create/update the envelope (protocol_version, skill, phase, status, updated_at, next_actions) and no reference to references/checkpoint-protocol.md, which is now bundled but uncited. orchestrator.md §5 covers discovery only, so nothing this skill loads tells it how to write.

**Evidence.** `grep -c checkpoint-protocol.md skills/oc-claude-api/SKILL.md` -> 0 (only 3 skills cite it at all); `grep -n checkpoint-protocol.md skills/orchestrator.md` -> 0; skills/orchestrator.md:298-322 (§5) is an `ls .checkpoints/*.checkpoint.json` scan + status summary; references/checkpoint-protocol.md is byte-identical to the protocol body (diff = one leading blank line).

**Proposed fix.** Add one line under Checkpoint Location: 'Write the full envelope per `references/checkpoint-protocol.md`; on each event below update the relevant fields and restamp `updated_at`'.

### skills/oc-code-auditor/SKILL.md:10 — Frontmatter commands list 2 verbs; body documents 14 and every sibling handoff targets an unlisted one
*category:* routing · *independently reported 3×* · *known:* docs/audits/2026-07-04-portability-audit.md:392 ([oc-code-auditor] Frontmatter description drifts — CONFIRMED, still open)

**Problem.** oc-deploy-ops :180 and :490 route to `/oc-audit pre-deploy`; oc-code-auditor's menu (:41) and scope table (:367) define it, but the frontmatter `commands:` lists only `/oc-audit` and `/oc-audit full`. gen-skills-catalog.mjs validates `commands` as the machine-readable verb list (feeding `skills.command.<verb>.enabled` and the site catalog), so the deploy gate's verb is invisible to every generated surface. Subcommands inherit the verb gate, so nothing blocks — this is catalog drift a future edit will trip on.

**Evidence.** src/generated/mcp-catalog.json entry for oc-code-auditor: commands ['/oc-audit','/oc-audit full']; site/src/pages/skills/[id].astro:69 renders skill.data.commands. Handoffs to unlisted verbs: oc-deploy-ops/SKILL.md:180 `/oc-audit pre-deploy`, oc-security-auditor/SKILL.md:94-99 `/oc-audit security`, oc-qa-ops/SKILL.md:31 `/oc-audit test-bootstrap`, orchestrator.md:198 `/oc-audit pre-deploy`. Peer convention: oc-ux-engineer 10 verbs, oc-security-hardening 7, oc-qa-ops 7, oc-bug-check 7 in frontmatter.

**Proposed fix.** Add the twelve body sub-verbs to frontmatter commands: (at minimum pre-deploy, security, fix-all, fix, verify, test-bootstrap, report) so skills.json, the MCP card and the site page match the menu and the sibling handoffs.

### skills/oc-code-auditor/SKILL.md:13 — oc-code-auditor's description names no sibling skill while claiming "security audit" — the escalation carve-out exists only in the orchestrator §7 copy, not on the surface the router reads
*category:* routing-collision · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:1502 (§7-vs-frontmatter drift, which notes the missing phrase but not the one-way carve-out or the test

**Problem.** oc-code-auditor's frontmatter description (:13-16) is the only one of 33 that claims the phrase "security audit" and is one of eight that name no other skill at all. Three siblings point at it as their boundary (oc-security-auditor:22 'Operates ABOVE oc-code-auditor', oc-security-hardening:30-31, oc-qa-ops:28-31) and it points back at none, so the code-auditor↔security-auditor and code-auditor↔bug-check boundaries are one-way on the router surface. The orchestrator §7 canonical block for this skill (orchestrator.md:388-392) does carry the missing sentence ('For fast pre-commit checks, escalate to oc-bug-check. For architecture- or infra-level security, escalate to oc-security-auditor') and deliberately omits "security audit" — so the copy that claims to be canonical is the only place the carve-out exists, while the copy Claude actually triggers on has the phrase and no carve-out. tests/routing-disambiguation.test.js pins two-way cross-references for all six v1.9 pairs but has no assertion for this triangle.

**Evidence.** skills/oc-code-auditor/SKILL.md:13-16 full description — `Use for /oc-audit, "audit this", "find bugs", "security audit", "code review", "pre-deploy check", "what's wrong with this code", or any code quality question.`; skills/orchestrator.md:388-392 §7 block ends `...or any code-level quality question. For fast pre-commit checks, escalate to oc-bug-check. For architecture- or infra-level security, escalate to oc-security-auditor.`; per-description sibling scan: oc-code-auditor → (none); `grep -n 'code-auditor' tests/routing-disambiguation.test.js` → no matches.

**Proposed fix.** Adopt the §7 wording in skills/oc-code-auditor/SKILL.md:13-16 (drop "security audit", add the two escalation clauses), re-run `npm run sync-bundles`, and add a routing-disambiguation assertion that oc-code-auditor's description names oc-bug-check and oc-security-auditor.

### skills/oc-code-auditor/SKILL.md:305 — Every tri-agent skill claims Verifier/Evaluator context isolation, but no skill or the shared protocol defines any mechanism that could produce it
*category:* isolation-impossible · *surfaced by the executability lens*

**Problem.** Nine skills carry `triAgent: true` and each asserts that its third role runs with isolated context: oc-code-auditor:75 'Cannot see Fixer's reasoning — only the diff and original finding' and :305-306; oc-api-dev:310-311; oc-agent-forge:336-337; oc-rag-forge:306-307; oc-integrations-engineer:269-270; oc-ux-engineer:309-311; oc-data-ops:53-55 and :262; oc-app-architect:451-452; oc-signal-forge:126-128. Nothing anywhere defines how that isolation is obtained — grep for 'subagent', 'Task tool', 'spawn' or 'sub-agent' across all nine SKILL.md files returns zero hits, and skills/orchestrator.md mentions tri-agent only as a catalogue fact at :660. All three roles are the same session, in one context window. The claim is actively defeated by the skills' own artifact formats: oc-code-auditor's Fix Output Format bundles '### Rationale' into the same document the Verifier is handed (:272-275), and oc-data-ops:123-125 has the Builder itself invoke `/oc-data-ops verify` mid-build. A session cannot follow the isolation instruction, and the three stated reasons for three agents (:88-101) do not hold.

**Evidence.** skills/oc-code-auditor/SKILL.md:75 `│          │  Cannot see Fixer's reasoning — only the diff and original finding`; :305-306 `It has **isolated context**: it reads the original finding and the diff, but NOT the Fixer's reasoning or exploration.`; :272-275 Fix Output Format `### Rationale` block inside the same fix document. skills/oc-data-ops/SKILL.md:53-55 and :123-125 `the Builder invokes \`/oc-data-ops verify\``. grep -n 'subagent\|Task tool\|spawn\|sub-agent' across the nine tri-agent SKILL.md files -> only skills/oc-code-auditor/SKILL.md:194 (an unrelated shell-exec finding pattern).

**Proposed fix.** Either give the claim a mechanism — instruct the session to dispatch the Verifier/Evaluator role through a fresh Task/subagent invocation with an explicit input allowlist (finding + diff only) — or downgrade the wording everywhere to what a single session can honour: 'grade from the contract and the artifact only; do not re-read your own exploration notes', and drop the 'cannot see' phrasing.

### skills/oc-code-auditor/SKILL.md:362 — Audit Modes table says `/oc-audit full` runs 'All 5' sweeps; the Auditor defines six (1a-1f) and the finding/report enums have no AI-safety value
*category:* docs-drift

**Problem.** The count string 'All 5' predates the v1.5 AI-App Safety sweep 1f. The Finding Format `Category:` enum (:219 security|performance|quality|config|ux) and Audit Report `Scope:` enum (:235) likewise have no slot for the AI-INJ/AI-TOOL findings 1f emits, so a session cannot classify them within the documented format.

**Evidence.** Sweep headings at :117 (1a), :132 (1b), :142 (1c), :153 (1d), :163 (1e), :177 (1f 'AI-App Safety Sweep'); 1f finding table :187-197; ai-safety-rules.md:119-122 requires each finding to cite a rule id; :362 reads '| `/oc-audit full` | All 5 | Auditor only |'.

**Proposed fix.** Change :362 to 'All 6 (1f only when an LLM is in the loop)'; add `ai-safety` to the Category enum at :219 and note 1f in the Scope enum at :235.

### skills/oc-code-auditor/SKILL.md:415 — SKILL.md never routes the reader to the bundled references/checkpoint-protocol.md — says when to checkpoint, never how
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:169 ([oc-code-auditor] Checkpoint-write gap — CONFIRMED, still reproduces today)

**Problem.** The only mandated reference read is references/orchestrator.md (:21). §Checkpoint Integration (:415-444) gives a path and a When-to-Write table but no schema or write instruction, and orchestrator.md only names the oc-checkpoint-protocol skill (:84, :658) without pointing at the bundled file. On a fresh install nothing in the loaded instruction path tells the model how to produce a conforming checkpoint.

**Evidence.** grep -n 'checkpoint-protocol' skills/oc-code-auditor/SKILL.md -> exit 1 (0 hits); skills/oc-code-auditor/references/checkpoint-protocol.md exists (712 lines); grep -n 'checkpoint-protocol' skills/orchestrator.md -> only :84 and :658, both the skill name in diagrams.

**Proposed fix.** Add one line under §Checkpoint Integration: 'Read `references/checkpoint-protocol.md` before the first checkpoint write; create `.checkpoints/` if absent.'

### skills/oc-code-auditor/SKILL.md:422 — The 'never mark complete over open CRITICAL/HIGH; mark the loop open' rule lives only in the plugin command, and `loop_state` is undocumented
*category:* checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md P3c (status vs findings) and P3e (/oc-audit abandon) — both still open

**Problem.** The When-to-Write table (:422-429) and skill_state block (:433-444) never state the status rule or a `loop_state` key, yet the plugin command and the live checkpoint both rely on `loop_state: open`. A session loading the skill directly (zip/global install, not via the plugin) has no instruction against closing the loop over open criticals — the exact P3 defect — and the field it would need is validated nowhere.

**Evidence.** plugins/opchain/commands/oc-audit.md:7-10 'Do NOT set `status: complete` while any critical or high finding is unresolved — mark the loop `open`'; .checkpoints/oc-code-auditor.checkpoint.json skill_state.loop_state = 'open' with a note that marking complete 'would repeat exactly the defect the overhaul's P3 exists to prevent'; grep -n loop_state scripts/checkpoint.mjs skills/oc-checkpoint-protocol/SKILL.md skills/oc-code-auditor/SKILL.md -> 0 hits each.

**Proposed fix.** Add `loop_state` (open|closed|abandoned) to the skill_state block and a 'Fix-all complete' rule in When-to-Write mirroring the plugin command text; land the validator half via punchlist P3c.

### skills/oc-code-auditor/SKILL.md:456 — Read-by table promises grade / finding counts that exist only in private skill_state
*category:* cross-skill-contract · *independently reported 3×* · *known:* docs/plans/coordination-gaps-punchlist.md P3b (the audit gate is a markdown table; no executable read of findings_by_severity/grade anywhere)

**Problem.** 'oc-deploy-ops | Finding count, grade -> deploy gate' (:456) and 'oc-app-architect | Findings' (:459) describe siblings consuming values the skill defines only under skill_state (:436-438 findings_total, findings_by_severity, grade). The protocol forbids siblings from reading skill_state, and the only top-level carrier, eval_scores (:401-406), holds a numeric score/dimensions but neither the letter grade nor severity counts — so the documented deploy gate has no sanctioned field to read.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill' and :725 'other skills don't read it'; SKILL.md:433-444 is the only place grade/findings_by_severity are defined; oc-deploy-ops/SKILL.md:178 reads via `node scripts/checkpoint.mjs status oc-code-auditor` (summary only).

**Proposed fix.** Promote grade + findings_by_severity into progress_summary wording the gate can parse, or add them to the eval_scores entry (e.g. dimensions.grade / a `counts` object) and point :456/:459 at that top-level field.

### skills/oc-code-auditor/SKILL.md:507 — Sub-ticket assignee sourced from a `remediation_owners` key the pm.yaml schema does not define
*category:* cross-skill-contract

**Problem.** `assignee: from .opchain/pm.yaml remediation_owners map by area` names a key that the schema owner never defines or validates; four other skills assume the same undocumented key with different sub-shapes (.security / .infra / .frontend vs. 'by area').

**Evidence.** grep -rn remediation_owners skills/oc-integrations-engineer/ -> 0 hits; pm-mcp-protocol.md:266 required keys are provider, team_or_project, issue_types, states only. Other consumers: oc-monitoring-ops/SKILL.md:703, oc-security-auditor/SKILL.md:520 (remediation_owners.security), oc-scale-ops/SKILL.md:471 (remediation_owners.infra), oc-ux-engineer/SKILL.md:698 (remediation_owners.frontend).

**Proposed fix.** Either define `remediation_owners` (map area -> assignee) in pm-mcp-protocol.md's pm.yaml schema + validator, or change :507-508 to 'unassigned unless the project's pm.yaml defines an owner map'.

### skills/oc-code-auditor/SKILL.md:525 — PM writes never name the protocol-mandated `pm_refs` / `pm_deferred_actions` checkpoint fields
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:387 ([oc-code-auditor] PM-tool integration depends on unshipped .opchain/pm.yaml — PARTIAL; adjacent, not 

**Problem.** The skill files sub-tickets and posts comments (:474-521) and on MCP outage says 'log intended writes to checkpoint as deferred PM actions' without naming a field. The PM-MCP protocol it defers to requires a top-level `pm_deferred_actions[]` from every PM-writing skill, and the checkpoint protocol requires every ticket-touching skill to append `pm_refs`. Neither appears anywhere in this SKILL.md, and top-level writes are documented only for eval_scores, so downstream `pm_refs` readers (oc-git-ops per protocol :584-586) never see the auditor's sub-tickets.

**Evidence.** grep -n 'pm_refs\|pm_deferred_actions' skills/oc-code-auditor/SKILL.md -> 0 hits. skills/oc-integrations-engineer/references/pm-mcp-protocol.md:154 'Every skill that performs PM writes adds a top-level `pm_deferred_actions`'. skills/oc-checkpoint-protocol/SKILL.md:590-593 'Every skill that touches a PM ticket appends to its own `pm_refs` array at the same time it writes the ticket'. oc-code-auditor is not in PM_AWARE_SKILLS (scripts/lib/pm-mcp-checks.mjs:5-11), so validate-pm-mcp never checks this prose.

**Proposed fix.** In §PM-Tool MCP Integration state that each sub-ticket is appended to top-level `pm_refs` (role: child, created_by_skill: oc-code-auditor) and that deferred writes go to `pm_deferred_actions[]` per pm-mcp-protocol.md §4; add both to the top-level fields the skill writes.

### skills/oc-compliance-ops/SKILL.md:128 — gaps_chained is a designed cross-skill read of private skill_state
*category:* cross-skill-contract

**Problem.** The handoff to oc-security-hardening is specified as: chained control ids are 'recorded by control id in the checkpoint's `gaps_chained` so `/oc-harden fix` can pull it'. `gaps_chained` lives under `skill_state` (SKILL.md:245). The checkpoint protocol says other skills 'should NOT read this section' (:162), 'Never read `skill_state` — it's private to the owning skill' (:376), and 'Private state stays private' (:725). oc-security-hardening/SKILL.md:146-147 implements the read. A hardening session that follows the protocol as written cannot pull the ids from the checkpoint; the register YAML's `chained_to:` field is the only protocol-clean channel and the text does not name it as the read path.

**Evidence.** SKILL.md:128 'control id in the checkpoint's `gaps_chained` so `/oc-harden fix` can pull'; SKILL.md:245 `"gaps_chained"` under `"skill_state"`; oc-checkpoint-protocol/SKILL.md:376 '- Never read `skill_state` — it's private to the owning skill'; oc-security-hardening/SKILL.md:146-147 'an oc-compliance-ops register `gap` chained here (by control id in its `gaps_chained`)'.

**Proposed fix.** Make the register YAML `chained_to:` entries (compliance-profile.md:56) the documented read path for `/oc-harden fix`, and either move `gaps_chained` to a protocol-readable top-level field (`context_primer` or a promoted handoff field per punchlist P3d's pattern) or state that it is a private mirror. Update oc-security-hardening/SKILL.md:146-147 to match.

### skills/oc-compliance-ops/SKILL.md:176 — Evidence step gates automatic `cmd`/`http` captures on a 'reference allowlist' that no reference defines
*category:* executability

**Problem.** SKILL.md:175-177: 'Any free-form command or external origin outside the reference allowlist requires the user's approval of the exact action; without it, write a refused/manual stub'. compliance-profile.md:90-91: 'Automatic commands must match a documented read-only allowlist'. No allowlist is documented anywhere in references/ — the only guidance is one example (`wrangler secret list`, never `env` or `cat .dev.vars`, :106-107). As written, a session cannot decide what is inside the allowlist, so every `cmd`/`http` capture must fall to approval or a manual stub; the automatic capture path is unexecutable. Fallback is safe, but the step cannot be executed as specified.

**Evidence.** grep -n allowlist skills/oc-compliance-ops/ → SKILL.md:176 'origin outside the reference allowlist', compliance-profile.md:91 'must match a documented read-only allowlist'; no allowlist table or list exists in compliance-profile.md (141 lines, read in full).

**Proposed fix.** Add an explicit 'Capture allowlist' table to references/compliance-profile.md (e.g. `wrangler secret list`, `git log`, `npm ls --depth=0`, `ls`, HTTPS GET/HEAD on the declared evidence origin) and point SKILL.md:176 at it by section name.

### skills/oc-compliance-ops/SKILL.md:184 — Compliance evidence gate is self-contradictory: bundle must exist for the deploying SHA at gate time, but bundles are committed only after the deploy, and the deploy wrapper refuses a dirty tree
*category:* cross-skill-contract

**Problem.** oc-deploy-ops :216-218 sets the gate condition as 'an honest evidence bundle exists for the deploying SHA', evaluated pre-deploy. oc-compliance-ops :184-187 says 'Bundles are committed in a follow-up commit after the deploy … a bundle for SHA X always lives in a commit after X'. In opchain, scripts/deploy.mjs:357 (`assertCleanCheckout("preflight")`) refuses any untracked file, so a bundle written to docs/compliance/evidence/ before the deploy aborts the deploy, and a bundle committed first moves HEAD to X+1 — which is then the deploying SHA with no bundle. The row is warn-class (:189-191, deploy-ops :237) so nothing blocks, but the text as written cannot be satisfied by construction. Both rows are (b) agent prose; oc-compliance-ops is honest about that ('presence-checked, never blocking').

**Evidence.** skills/oc-deploy-ops/SKILL.md:216-218, :237. skills/oc-compliance-ops/SKILL.md:184-187, :189-191. scripts/deploy.mjs:229-243, :357.

**Proposed fix.** Define the gate condition as 'a bundle whose stamped SHA equals the deploying SHA is present in the working tree OR in the previous commit's `docs/compliance/evidence/`', and in deploy.mjs's clean-tree check allow (or explicitly instruct the operator to `git stash`-free commit) a `docs/compliance/evidence/<date>-<sha>/` directory; or move the bundle write to post-deploy and make the pre-deploy row 'profile present → warn: generate after prod ships'.

### skills/oc-compliance-ops/SKILL.md:192 — Handoff names `/oc-release verify`, absent from oc-release-ops frontmatter commands
*category:* routing

**Problem.** SKILL.md:192 describes 'The oc-release-ops `/oc-release verify` delta row'. oc-release-ops' frontmatter `commands:` (:10-16) lists only /oc-release, plan, draft, bump, announce, ship; `verify` exists only in its body menu (:63) and section (:292). Any verb-vs-frontmatter validator or catalog surface would show the target verb as nonexistent. The fix belongs in oc-release-ops, but this skill's handoff text depends on it.

**Evidence.** grep '^  - /oc-release' skills/oc-release-ops/SKILL.md → :11-16 (no verify); skills/oc-release-ops/SKILL.md:63 '/oc-release verify         Pre-ship sanity gate'; :292 '### `/oc-release verify` (the gate)'.

**Proposed fix.** Add `/oc-release verify` (and `status`, `rollback`) to oc-release-ops frontmatter `commands:`; no change needed in oc-compliance-ops once the target is fixed.

### skills/oc-cost-ops/references/budget-gates.md:60 — Cost-regression gate has no defined place to read its frozen baseline
*category:* executability

**Problem.** Gate 2 fails when `cost_per_eval` rises more than `regression_pct` 'above the frozen baseline', and `/oc-cost budget --rebaseline` 're-freezes the cost baseline ... recording the new number in the prompt's CHANGELOG'. No file or field anywhere in the skill holds the frozen cost baseline: eval.yaml carries only cost_per_eval / budget_per_eval / regression_pct (budget-gates.md:50-55; prompts/opchain-eval/eval.yaml:28-36), the checkpoint `cost` block has no baseline key (SKILL.md:120-129), and a CHANGELOG entry is not machine-readable. oc-prompt-ops, by contrast, freezes its score baseline to `eval/baseline.json` (skills/oc-prompt-ops/SKILL.md:241). `/oc-cost gate` cannot compute a regression as written.

**Evidence.** budget-gates.md:60-61 'rises more than `regression_pct` above the frozen baseline → FAIL'; budget-gates.md:76-77 '`/oc-cost budget --rebaseline`, recording the new number in the prompt's CHANGELOG'; `find prompts -name 'baseline*'` → nothing; SKILL.md:208 'gate verdict + the cost delta vs baseline' names no field.

**Proposed fix.** Name the baseline location — e.g. `cost_per_eval` inside oc-prompt-ops's `eval/baseline.json`, or a `cost.baseline_per_eval` key in eval.yaml — and reference it from Gate 2, from `--rebaseline`, and from the SKILL.md When-to-Write row for 'Gate run'.

### skills/oc-dash-forge/references/checkpoint-schema.md:3 — Checkpoint schema still stamps protocol_version 1.0 and says it conforms to protocol v1.0
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:417 (wire v1.0 + 'aidops' branding) — branding fixed since, version still 1.0

**Problem.** checkpoint-schema.md:3 'Conforms to the opchain checkpoint protocol v1.0' and :16 '"protocol_version": "1.0"'. The contract says new writes stamp "1.1" (oc-migration-ops sweeps 1.0 files forward). The validator accepts 1.0 so this does not fail the gate, but every fresh oc-dash-forge checkpoint is written pre-sweep and the v1.1 optional fields are never mentioned.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:29 (currently "1.1"), :91 ('stamp new writes "1.1"'); scripts/checkpoint.mjs:67 SCHEMA_VERSION="1.1", :70 ACCEPTED ["1.0","1.1"].

**Proposed fix.** Change both to 1.1 now; bump with the v2.0 wire-1.2 sweep.

### skills/oc-dash-forge/SKILL.md:38 — Primary documented upstream 'data-architect' is not an opchain skill
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:422 ([oc-dash-forge] Primary documented upstream 'data-architect' is not a skill) — still open

**Problem.** oc-dash-forge's intake is written around a `data-architect-handoff.md` file 'from data-architect handoff' (:38, :118, :169, :198, :199 and three more), oc-app-architect:291 treats 'downstream of a data-architect handoff' as a dash-forge routing trigger, and oc-ux-engineer has one more. No skills/<id> is named data-architect and no opchain skill writes `data-architect-handoff.md`; the estate/data role in the catalog is oc-data-ops (whose checkpoint dash-forge does read at :195-198). The orchestrator map (:138) says dash-forge reads oc-ux-engineer and oc-app-architect only, so three documents disagree on dash-forge's upstream.

**Evidence.** `grep -c 'data-architect' skills/*/SKILL.md` → oc-dash-forge:8, oc-app-architect:1, oc-ux-engineer:1; skills/oc-dash-forge/SKILL.md:38 `Takes data (from data-architect handoff, upstream spec, or direct input)`; :199 `Is there a \`data-architect-handoff.md\` in the project dir?`; `ls skills/` has no data-architect.

**Proposed fix.** Replace the data-architect intake with the oc-data-ops checkpoint / `.opchain/data-contracts/*.yaml` path already described at :195-198, and add oc-data-ops to dash-forge's Upstream row (:138) to match the data-ops row (:153) that chains to it.

### skills/oc-dash-forge/SKILL.md:50 — Menu/description commands missing from frontmatter and unregistered in the flag registry; stale /df-* prefix
*category:* routing · *known:* docs/audits/2026-07-04-portability-audit.md:675 ([oc-dash-forge] Sub-command set inconsistent) — still open

**Problem.** SKILL.md:50 advertises alias /dashforge and says 'Sub-commands use /df-* prefix' while the menu uses /oc-df-*; the menu lists /oc-df-status (68), /oc-df-resume (69) and /df-reset (70); the description says ALWAYS trigger on /dashboard and /dataviz-design (26). None of these six appear in frontmatter commands (10-21), so scripts/check-skill-flags.mjs never sees them and no skills.command.<verb>.enabled flag exists for them. checkpoint-schema.md:193 repeats '/df-*'.

**Evidence.** `for v in oc-df-status oc-df-resume df-reset dashforge dashboard dataviz-design; do grep -c "\"/$v\"" src/lib/flags/registry.js; done` → 0 for all six; registry.js:284-286 registers only the 11 frontmatter verbs; scripts/check-skill-flags.mjs:59-67 gates on frontmatter commands only.

**Proposed fix.** Rename /df-reset → /oc-df-reset, add /oc-df-status, /oc-df-resume, /oc-df-reset to frontmatter and registry.js; drop /dashforge, /df-*, /dashboard, /dataviz-design or register them; fix checkpoint-schema.md:193.

### skills/oc-dash-forge/SKILL.md:368 — Phase 4 handoff tree lists 4 files while the rest of the skill says the bundle has 8 (tokens.ts, types.ts, README.md, audit-report.md missing)
*category:* docs-drift

**Problem.** SKILL.md:368-372 shows dash-forge-handoff/ with spec.md, prototype.tsx, mock-data.ts, integration-notes.md only. SKILL.md:125 says tokens.ts is written 'in the handoff bundle' (the artifact oc-ux-engineer consumes, 157); checkpoint-schema.md:151-159 and example-walkthrough.md:238-246 list 8 files; react-patterns.md:331-340 adds components/. A session following Phase 4 literally omits the cross-skill token artifact.

**Evidence.** Line contents as cited; `grep -n 'tokens.ts' skills/oc-dash-forge/SKILL.md` → 125 only (absent from the 368-372 tree).

**Proposed fix.** Make the Phase 4 tree the canonical 8-file list (+ optional components/) and reference it from checkpoint-schema.md and react-patterns.md.

### skills/oc-dash-forge/SKILL.md:375 — Handoffs name slash-verbs the target skills do not have (/oc-ux-engineer, /oc-app-architect, /status)
*category:* routing

**Problem.** 'Hand this to /oc-app-architect Phase 6 for build' (375), 'Was this called from /oc-ux-engineer' / '/oc-app-architect' (30-31,104,200,201) and '/status in either skill' (110) reference verbs that are not commands: oc-app-architect's commands are /oc-app,/oc-discover,/oc-spec,/oc-design,/oc-roadmap,/oc-scaffold,/oc-build,/oc-launch; oc-ux-engineer's are /oc-uxe*; oc-dash-forge's own status verb is /oc-df-status (68).

**Evidence.** skills/oc-app-architect/SKILL.md:10-18 and skills/oc-ux-engineer/SKILL.md:10-20 frontmatter commands lists (no /oc-app-architect, /oc-ux-engineer, /status); oc-ux-engineer's routing verb is `/oc-uxe dash` (SKILL.md:18,128,157-159).

**Proposed fix.** Use /oc-build (Phase 6), /oc-uxe dash, /oc-app or /oc-design, and /oc-df-status; keep bare skill names when describing skills rather than commands.

### skills/oc-dash-forge/SKILL.md:420 — Default checkpoint location is a claude.ai sandbox path not defined by the protocol
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:189 ([oc-dash-forge] Checkpoint default location is a Claude.ai sandbox path) — still open

**Problem.** SKILL.md:419-420 and checkpoint-schema.md:5-7: 'Location: {project-dir}/.checkpoints/... Default if unset: /home/claude/dash-forge-session/'. The protocol defines only {project-dir}/.checkpoints/ (project root) with mkdir -p and no alternate default; {project-dir} is never defined in this skill. On a user machine the fallback creates state outside the repo and `doctor` flags the nonexistent project_dir.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:75,294-296; running `node scripts/checkpoint.mjs doctor` on the schema example warned 'project_dir "/home/claude/it-training-compliance" doesn't exist here'.

**Proposed fix.** Delete the 'Default if unset' line in both files and define {project-dir} as the repo root per references/checkpoint-protocol.md.

### skills/oc-dash-forge/SKILL.md:473 — Integration section and Phase 0 intake omit the v1.7/v1.9 upstreams that chain into this skill (oc-signal-forge, oc-monitoring-ops, oc-data-ops)
*category:* cross-skill-contract

**Problem.** Integration (455-476) lists upstreams as data-architect, oc-ux-engineer and oc-app-architect only, and Phase 0 (193-202) checks only for data-ops contracts, data-architect-handoff.md, ux-engineer, app-architect and a prior checkpoint. But oc-signal-forge's /oc-signal wire chains here (CHANGELOG says dash-forge gained that upstream in v1.7), oc-monitoring-ops' /oc-monitor dashboard routes here with a pre-selected ops archetype and 'skip interview', and oc-data-ops lists oc-dash-forge under 'Chains to'. A session following this text will run the full intake and look for the wrong artifacts when invoked from those three.

**Evidence.** `grep -rni 'signal\|monitoring-ops\|oc-monitor' skills/oc-dash-forge/SKILL.md skills/oc-dash-forge/references/{archetypes,chart-selection,checkpoint-schema,design-principles,example-walkthrough,react-patterns}.md` = 0 hits. skills/CHANGELOG.md:375-377; skills/oc-signal-forge/SKILL.md:221-225,274; skills/oc-monitoring-ops/SKILL.md:80,147,436-455 ('Archetype: ops (pre-selected, skip interview)'); skills/oc-data-ops/SKILL.md:247.

**Proposed fix.** Add oc-signal-forge (signals/catalog.md + consumer stub), oc-monitoring-ops (ops context packet, archetype pre-selected) and oc-data-ops rows to Integration and a Phase 0 step that honours a pre-selected archetype.

### skills/oc-dash-forge/SKILL.md:532 — PM-MCP 'MCP unavailable' path does not use the pm_deferred_actions queue the canonical protocol requires
*category:* cross-skill-contract

**Problem.** SKILL.md:532 says 'MCP unavailable → log intent to checkpoint as deferred' and :486 defers to oc-integrations-engineer for the canonical patterns — but that protocol mandates a top-level pm_deferred_actions[] array with a fixed entry shape (id, retriable, …) so a later flush can replay it. oc-dash-forge names no field, never mentions pm_refs, and its checkpoint schema has neither, so the 'deferred' intent lands in an ad-hoc place the flush never reads.

**Evidence.** skills/oc-integrations-engineer/references/pm-mcp-protocol.md:146-160 ('Every skill that performs PM writes adds a top-level pm_deferred_actions array'), :187,:207-216 (flush filters pm_deferred_actions); `grep -n 'pm_deferred_actions\|pm_refs' skills/oc-dash-forge/SKILL.md skills/oc-dash-forge/references/checkpoint-schema.md` = 0 hits.

**Proposed fix.** Name pm_deferred_actions (and pm_refs for the posted comment ids) at SKILL.md:532 and add both to checkpoint-schema.md.

### skills/oc-data-ops/SKILL.md:92 — Reads oc-stack-forge's private skill_state (decisions.*) against the checkpoint protocol's 'never read skill_state' rule
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** Phase 1 instructs reading `skill_state.decisions.warehouse` / `decisions.queue` / `decisions.transform_tool` from oc-stack-forge's checkpoint (SKILL.md:90-93) and takes the Verifier's SQL dialect from it (SKILL.md:150-151). The protocol says skill_state is private and other skills never read it. Both skills agree on the keys today, but nothing in the protocol or validator protects them, and the live oc-stack-forge checkpoint has no `decisions` object at all (only context_primer.key_decisions, .checkpoints/oc-stack-forge.checkpoint.json:70), so the read has never been exercised.

**Evidence.** SKILL.md:92-93 `skill_state.decisions.warehouse` / `decisions.queue` / `decisions.transform_tool` from its checkpoint. oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill'; :725 'Private state stays private. skill_state is an opaque bag — other skills don't read it, and the protocol doesn't define its contents'. oc-stack-forge/SKILL.md:160-163 'Record all of it in the checkpoint as skill_state.decisions.warehouse / decisions.queue / decisions.transform_tool — oc-data-ops reads exactly those keys'. Same pattern elsewhere: oc-monitoring-ops/SKILL.md:675-677 reads deploy-ops `skill_state.pm.deploy_tickets[]`. Related but distinct punchlist item: coordination-gaps-punchlist.md:129 (promote verified_for_sha out of ad-hoc skill_state).

**Proposed fix.** Move the data-platform decision to a protocol-sanctioned shared carrier (e.g. a `decisions` cross-skill field defined in oc-checkpoint-protocol alongside pm_refs, or stable-prefixed `context_primer.key_decisions` entries) and update SKILL.md:92-93 + oc-stack-forge/SKILL.md:160-163 to name it; or add an explicit 'documented cross-skill skill_state keys' exception to oc-checkpoint-protocol/SKILL.md:376,725 so the rule matches practice.

### skills/oc-data-ops/SKILL.md:171 — oc-data-ops' Contract-Verifier loop is likewise unbounded
*category:* undefined-termination · *surfaced by the executability lens*

**Problem.** 'Any VIOLATION fails the loop iteration; the Builder fixes and re-verifies. BLOCKED does not pass the loop either' (:171-173) is the only termination text in the skill. There is no max-iteration count and no escalation branch. BLOCKED specifically is an environment condition (no reachable warehouse, :148-152) the Builder often cannot fix, so the documented loop can never close and the session is given no defined next step.

**Evidence.** skills/oc-data-ops/SKILL.md:170-174 `Any VIOLATION fails the loop iteration; the Builder fixes and re-verifies. BLOCKED does not pass the loop either — an unverifiable estate is not a verified one.`; :148-152 `No reachable warehouse → data-dependent checks (freshness, volume, invariants) return **BLOCKED**, never PASS`. grep for 'Max iterations' in skills/oc-data-ops/SKILL.md -> no matches.

**Proposed fix.** Add a bounded loop ('Max iterations: 3, then escalate') and a distinct BLOCKED exit that parks the checkpoint with `status: blocked` and a `blockers[].needs: external_dep` entry rather than re-entering the loop.

### skills/oc-data-ops/SKILL.md:181 — Monitor inventory handoff to oc-monitoring-ops names no checkpoint field or file
*category:* cross-skill-contract

**Problem.** Phase 4 says to 'hand it the monitor inventory via checkpoint' and the When-to-write table saves 'Monitor inventory + oc-monitoring-ops handoff state', but the only documented skill_state keys are `monitors_wired` and `handoffs` (booleans/status), skill_state is private to this skill anyway, and no shared field, progress_table row, context_primer entry, or on-disk file is defined for the inventory. oc-monitoring-ops likewise reads 'Monitor inventory from /oc-data-ops observe' without naming where. A monitoring-ops session has nothing mechanical to open.

**Evidence.** SKILL.md:181-182 'hand it the monitor inventory via checkpoint and chain to `/oc-monitor`'; SKILL.md:203 'Monitors handed off | Monitor inventory + oc-monitoring-ops handoff state'; SKILL.md:228-229 skill_state shows only `"monitors_wired": false, "handoffs": {...}`; references/data-contract-format.md:106-107 'The monitor inventory (what runs, where, how often) is written to the checkpoint and handed to oc-monitoring-ops'; oc-monitoring-ops/SKILL.md:584 'Monitor inventory from `/oc-data-ops observe`' — no field. oc-checkpoint-protocol/SKILL.md:375-376 limits cross-skill reads to header/progress/progress_table/context_primer/blockers.

**Proposed fix.** Define the inventory as an artifact — e.g. `.opchain/data-contracts/monitors.yaml` (one row per contract: check, engine, schedule, target) listed in `context_primer.generated_files` — and name that path in SKILL.md:181-182, data-contract-format.md:106-107, and oc-monitoring-ops/SKILL.md:584.

### skills/oc-data-ops/SKILL.md:253 — 'Retention behavior' promised to oc-compliance-ops as evidence but no retention field exists in the contract format or skill text
*category:* cross-skill-contract

**Problem.** The Read-by row says oc-compliance-ops cites 'Data contracts + retention behavior' as register evidence, and oc-compliance-ops expects exactly that. The contract schema (version/dataset/owner/consumers/grain/schema/freshness/volume/invariants) has no retention block, and 'retention' appears nowhere else in SKILL.md or data-contract-format.md, so a compliance-ops session looking for retention evidence from this skill finds nothing to cite.

**Evidence.** SKILL.md:253 '| oc-compliance-ops | Data contracts + retention behavior cited as register evidence |'; `grep -n -i retention skills/oc-data-ops/SKILL.md skills/oc-data-ops/references/data-contract-format.md` → only line 253. references/data-contract-format.md:11-42 full example has no retention key. oc-compliance-ops/SKILL.md:259 '| oc-data-ops | Data contracts + retention behavior as evidence for data controls |'.

**Proposed fix.** Add an optional `retention:` block to references/data-contract-format.md (e.g. `{ policy, window, enforced_by, check }`) and a Verifier row for it; or reword SKILL.md:253 and oc-compliance-ops/SKILL.md:259 to 'data contracts (schema/freshness/volume) as evidence' until retention is modelled.

### skills/oc-deploy-ops/SKILL.md:10 — Frontmatter commands lists 3 of the 9 subcommands the body menu documents; the site renders the frontmatter list
*category:* docs-drift · *independently reported 3×* · *known:* docs/audits/2026-07-04-portability-audit.md:695 '[oc-deploy-ops] Frontmatter description drifts from the canonical copy in orchestrator.md section 7' 

**Problem.** commands: is [/oc-deploy, /oc-deploy staging, /oc-deploy audit], but the body menu and sections define prod, rollback, status, smoke, health, init, env (plus the --retry-pm flush and --platform override). site/src/pages/skills/[id].astro renders `skill.data.commands`, so the public skill page shows only three verbs. Sibling skills (oc-monitoring-ops, oc-security-hardening, oc-compliance-ops) list every subcommand.

**Evidence.** skills/oc-deploy-ops/SKILL.md:6 `shortDesc: ... v1.2 creates deploy tickets ...`; :718 `## PM-Tool MCP Integration (v1.3+)`; skills/oc-integrations-engineer/references/pm-mcp-protocol.md:1 `# PM-MCP Protocol (v1.3+)`; skills/CHANGELOG.md:428-432 '[1.3.0] — PM-MCP runtime + release-ops ... PM-tool MCP runtime across five skills'; `grep -n '\[1\.2' skills/CHANGELOG.md` -> none

**Proposed fix.** Add /oc-deploy prod, rollback, status, smoke, health, init, env to the frontmatter commands array (subcommands inherit the skills.command.oc-deploy flag per the registry rules).

### skills/oc-deploy-ops/SKILL.md:14 — oc-deploy-ops claims "deploy this" / "ship it" / "rollback" with no carve-out, while oc-fleet-ops and oc-migration-ops both operate on the same words one-way
*category:* routing-collision · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:595 (fleet-ops absent from orchestrator maps)

**Problem.** oc-deploy-ops:14-17 claims the unqualified deploy vocabulary and names no sibling. oc-fleet-ops:9-11 does the carve-out from its side ('Complements oc-deploy-ops (single-app managed PaaS): managed app → deploy-ops; multi-container/self-managed/IaC → fleet-ops') and oc-migration-ops/oc-fleet-ops both use 'rollback' in their prose, but deploy-ops offers the router nothing to send a Kubernetes/Terraform request elsewhere. oc-fleet-ops additionally has no orchestrator §4 row and no eval case, so a 'deploy these containers' request has a one-way pointer as its only defence, and nothing in CI would notice if that sentence were edited out — unlike the six v1.9 pairs, which tests/routing-disambiguation.test.js pins in both directions.

**Evidence.** skills/oc-deploy-ops/SKILL.md:14-17 `Deployment pipeline: audit gate → staging → production → monitoring. Use for /oc-deploy, "deploy this", "ship it", "push to production", "staging", "rollback", "health check", or any deployment task.`; skills/oc-fleet-ops/SKILL.md:9-11 the complement clause; phrase scan: "rollback" (quoted by oc-deploy-ops) also appears in oc-fleet-ops and oc-migration-ops descriptions; orchestrator.md:274-294 has no fleet row; no expected.jsonl row names oc-fleet-ops.

**Proposed fix.** Add the reciprocal clause to oc-deploy-ops:14-17 ('multi-container / self-managed / IaC deploys are oc-fleet-ops'), add a §4 row for fleet-ops, and pin the pair in tests/routing-disambiguation.test.js plus one eval case.

### skills/oc-deploy-ops/SKILL.md:98 — Project detection and setup checklist only recognise wrangler.toml; the repo this skill was built for uses wrangler.jsonc
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:700 '[oc-deploy-ops] Project detection only checks wrangler.toml' (CONFIRMED)

**Problem.** `[[ -f wrangler.toml ]]`, `grep -q "pages" wrangler.toml`, 'staging/prod wrangler.toml configured?' and 'derive from wrangler.toml routes' all assume the TOML config. Wrangler accepts wrangler.json/wrangler.jsonc and opchain itself ships only wrangler.jsonc, so `/oc-deploy init` on this repo reports no Cloudflare Workers project. Known since the portability audit and unchanged.

**Evidence.** skills/oc-deploy-ops/SKILL.md:98 `[[ -f wrangler.toml ]] && echo "Cloudflare Workers project detected"`, :101, :157, :161; `ls wrangler.*` -> wrangler.jsonc only

**Proposed fix.** Detect any of wrangler.toml / wrangler.json / wrangler.jsonc in :96-105 and reword :157 and :161 to 'wrangler config'.

### skills/oc-deploy-ops/SKILL.md:178 — Audit-gate checkpoint reuse is keyed on age only (1h / 24h), never on whether the grade was produced for the deploying SHA
*category:* gate-reality · *independently reported 5×* · *known:* docs/plans/coordination-gaps-punchlist.md P3a 'Stop replaying unbacked audit grades' (Tier 3, open)

**Problem.** The audit-gate step runs `node scripts/checkpoint.mjs status oc-code-auditor` (and :192 `status oc-security-auditor`) to read that skill's verdict. In scripts/checkpoint.mjs the `status` verb takes only `--brief`/`--since=` (dispatch :977 passes `{brief, since}`); the positional is consumed only by show/reset/update/done (:973 comment). The command therefore prints the whole-project digest, not the named checkpoint, and the per-skill fields the gate needs (`skill_state.grade`, `findings_by_severity`, `verified_tree`) are not in the status summary. The verb that does what the text intends is `show <skill>` (as oc-reverse-spec/SKILL.md:306 correctly uses).

**Evidence.** skills/oc-deploy-ops/SKILL.md:178 "node scripts/checkpoint.mjs status oc-code-auditor"; :192 "node scripts/checkpoint.mjs status oc-security-auditor". scripts/checkpoint.mjs:972-977: `const arg0 = rest.find(...)` / `case "status": return cmdStatus({ brief: flags.has("--brief"), since: ... })`; cmdStatus(opts) at :554 calls readAll(). oc-reverse-spec/SKILL.md:306 uses `show oc-reverse-spec`.

**Proposed fix.** Either add positional filtering to cmdStatus (`status <skill>` → one row + `updated_at` age) or change :178/:192 to `node scripts/checkpoint.mjs status --brief | grep oc-code-auditor`.

### skills/oc-deploy-ops/SKILL.md:195 — Audit gate step 2 invokes /oc-security pre-deploy, a verb oc-security-auditor does not define
*category:* cross-skill-contract · *independently reported 3×*

**Problem.** Step 2 of the pre-deploy gate hands off with `Skill(skill="oc-security-auditor", args="/oc-security pre-deploy")`. oc-security-auditor's `commands:` frontmatter and its Command Reference menu list threat-model, attack-surface, adversaries, data-flow, owasp, posture, readiness, report, headers, tls, dns, cloudflare, infra, prioritize, compare — no `pre-deploy`. The only 'pre-deploy' text in that skill (:308) is a note about projects with no live URL. A session following the handoff must improvise which pillar to run, so the 'posture gate' half of the two-audit gate has no defined entry point.

**Evidence.** skills/oc-deploy-ops/SKILL.md:195 `#   Skill(skill="oc-security-auditor", args="/oc-security pre-deploy")`; `grep -n 'pre-deploy' skills/oc-security-auditor/SKILL.md` → no hits; security-auditor menu :62 `/oc-security posture            Full posture assessment (all three pillars)`; frontmatter commands: [/oc-security, /oc-secaudit, /oc-sec, /oc-threat-model, /oc-owasp, /oc-hardening, /oc-attack-surface, /oc-posture].

**Proposed fix.** Change :195 to `args="/oc-security posture"` (the 'full posture assessment (all three pillars)' verb) or add a `/oc-security pre-deploy` alias row to oc-security-auditor's menu and frontmatter that maps to posture + headers/tls against the staging URL.

### skills/oc-deploy-ops/SKILL.md:364 — Monitoring handoff invokes /oc-monitor verify, a verb oc-monitoring-ops does not have; the two sides of the handoff name different verbs
*category:* cross-skill-contract · *independently reported 3×*

**Problem.** 'Hand off to oc-monitoring-ops' says to run `Skill(skill="oc-monitoring-ops", args="/oc-monitor verify")` and that oc-monitoring-ops 'reads this skill's checkpoint to learn what shipped (version, commit SHA, prod URL) and confirms' three things. oc-monitoring-ops defines 18 verbs (setup, stack, instrument, health, errors, uptime, metrics, alerts, oncall, slo, incident, runbook, postmortem, dashboard, report, audit, compare, status) — no `verify`; its own handoff section (:128-133) says the protocol is 'if a monitoring checkpoint exists it takes over; if not, oc-deploy-ops suggests `/oc-monitor setup`', not an invoked verify. The deploy-ops skill_state template (:466-475) also carries no commit SHA or prod URL field for monitoring to read (the live checkpoint happens to add `production_url`, but the contract does not).

**Evidence.** skills/oc-deploy-ops/SKILL.md:364 `Skill(skill="oc-monitoring-ops", args="/oc-monitor verify")`; `grep -n verify skills/oc-monitoring-ops/SKILL.md` -> only :228 'verify 200'; oc-monitoring-ops frontmatter commands (lines 10-29) contain no verify; skills/oc-monitoring-ops/SKILL.md:133 'If not: oc-deploy-ops suggests `/oc-monitor setup` for the project'; skills/oc-app-architect/SKILL.md:558 'execute `/oc-monitor`'

**Proposed fix.** Pick one protocol and state it in both files: e.g. deploy-ops :364 → `args="/oc-monitor health"` (post-deploy) plus `/oc-monitor setup` when no checkpoint exists; monitoring :128-133 → mirror that. Add `prod_version_sha` and `production_url` to deploy-ops's skill_state template (:466-475) since monitoring is told to read them.

### skills/oc-deploy-ops/SKILL.md:478 — Cross-Skill Reads and Triggered By sections are stale: they omit five skills the body reads, every skill that invokes deploy-ops at release/cutover, and any 'Read by' table
*category:* cross-skill-contract · *independently reported 3×* · *known:* docs/plans/coordination-gaps-punchlist.md P3a / P3b

**Problem.** The Cross-Skill Reads table lists only oc-code-auditor, oc-app-architect, oc-git-ops, while the body reads oc-security-auditor (:192), oc-security-hardening (:207), oc-compliance-ops (:221) and oc-stack-forge (:695) checkpoints/manifests — orchestrator.md:148 lists five upstreams. Triggered By (:486-491) omits oc-release-ops (which invokes `/oc-deploy staging` then `/oc-deploy`, its SKILL.md:284-287; orchestrator.md:207) and the oc-api-dev drift gate that oc-api-dev:419/549/593 and orchestrator.md:142 say deploy-ops enforces before prod (deploy-ops has no such gate row). There is no 'Read by' table although oc-monitoring-ops:579, oc-release-ops:398, oc-git-ops:531, oc-compliance-ops:257 and oc-security-hardening:267 all read this checkpoint.

**Evidence.** skills/oc-deploy-ops/SKILL.md:478-484 (3-row Reads table), :486-491 (Triggered By: oc-git-ops, oc-app-architect only); `grep -c oc-release-ops skills/oc-deploy-ops/SKILL.md` -> 0; `grep -c oc-api-dev` -> 1 (only the codegen aside at :712); skills/orchestrator.md:148 `| **oc-deploy-ops** | oc-code-auditor (audit grade), oc-security-auditor (posture), oc-git-ops (branch status), oc-security-hardening (...), oc-compliance-ops (...) | oc-monitoring-ops (post-ship observability) |`; skills/oc-api-dev/SKILL.md:419 'oc-deploy-ops gates production deploys on this command returning zero drift'; skills/oc-release-ops/SKILL.md:284-287

**Proposed fix.** Rewrite the section to list all upstream reads (code-auditor, security-auditor, hardening, compliance, stack-forge, app-architect, git-ops, api-dev drift), add a Read-by table (monitoring-ops, release-ops, git-ops, compliance-ops, security-hardening), add oc-release-ops (ship) and oc-migration-ops (cutover) to Triggered By, and either add the oc-api-dev drift row to the Gate Rules table or have oc-api-dev stop claiming it.

### skills/oc-deploy-ops/SKILL.md:673 — Pack-aware dispatch section still describes the v1.4 'PR 7 pending' window as future; render/fly-io/shuttle packs never landed and no pack declares platforms
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:432 '[oc-deploy-ops] Pack-aware dispatch imports Worker source ... that never ship with the skill' (CONFIR

**Problem.** The section says the populated-platforms return shape arrives 'once PR 7 lands the deploy-target packs', the empty shape applies 'while deploy-target packs are still pending (v1.4 PR 3 -> PR 7 window)', and 'After PR 7 lands render, fly-io, heroku, shuttle as deploy-target packs with bidirectional graph entries, step 4 above gets short-circuited'. At v1.9.0 the registry has deploy-target packs heroku, railway, netlify, aws-amplify, app-store, play-store — no render, fly-io or shuttle — and no pack.yml declares defaultPlatform/supportedPlatforms, so the fallback is the permanent behaviour, not a transitional one. Also the import path ../../src/lib/pack-dispatch.js is repo-only (known).

**Evidence.** skills/oc-deploy-ops/SKILL.md:673 '(once PR 7 lands the deploy-target packs)', :675 'while deploy-target packs are still pending (v1.4 PR 3 → PR 7 window)', :686-687, :704-706 'After PR 7 lands `render`, `fly-io`, `heroku`, `shuttle`'; `grep -l 'kind: deploy-target' skills/oc-stack-forge/packs/*/pack.yml` -> app-store, aws-amplify, heroku, netlify, play-store, railway; `grep -rn 'defaultPlatform\|supportedPlatforms' skills/oc-stack-forge/packs/` -> only _schema.json and CONTRIBUTING.md; tests/pack-dispatch.test.js:97 asserts {defaultPlatform:null, supportedPlatforms:[]} for every language pack

**Proposed fix.** Rewrite :671-706 in present tense: language packs carry no platform graph today, the Platform Matrix keyed by language is the dispatch path, and the six deploy-target packs that exist are named; drop the PR-number framing. Track the repo-only import separately per the portability audit.

### skills/oc-deploy-ops/SKILL.md:727 — Nine sibling-relative references/ paths do not resolve in an installed skill copy
*category:* broken-reference · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers only skills/oc-git-ops/SKILL.md:568 ('PM-MCP runtime contract is linked by a sibling-relative

**Problem.** Skills install one directory per skill and each ships its own `references/`. Nine citations in the target set point at a *sibling* skill's references directory (`../<other-skill>/references/...`). None of those files exist under the citing skill, so the instruction 'read X' resolves to nothing on a per-skill install, and over the /docs, /llms.txt and MCP get_skill transports (which serve SKILL.md only) they are unreachable even on a full-zip install. Sites in the audited set: oc-deploy-ops:727 and :651, oc-release-ops:235 and :417, oc-app-architect:685 and :184, oc-api-dev:305, oc-signal-forge:290. Four more exist outside the audited set (oc-fleet-ops:313, oc-modularize-ops:322, oc-monitoring-ops:637, oc-prompt-ops:350, oc-reverse-spec:214/:376/:563, oc-stack-forge:293/:327-330).

**Evidence.** Verified each target path is absent from the citing skill's own references/: e.g. `ls skills/oc-deploy-ops/references/pm-mcp-protocol.md` -> no such file; skills/oc-deploy-ops/SKILL.md:727 `[\`oc-integrations-engineer/references/pm-mcp-protocol.md\`](../oc-integrations-engineer/references/pm-mcp-protocol.md)`. Same shape at skills/oc-release-ops/SKILL.md:235, skills/oc-app-architect/SKILL.md:685, skills/oc-signal-forge/SKILL.md:290; skills/oc-api-dev/SKILL.md:305 `Read \`oc-stack-forge/references/typed-pipeline.md\``; skills/oc-deploy-ops/SKILL.md:651 `oc-app-architect/references/scaffold-guide.md`.

**Proposed fix.** Either bundle pm-mcp-protocol.md into every skill that cites it (as orchestrator.md and checkpoint-protocol.md already are, via scripts/sync-bundles), or replace the link with an inline summary of the contract plus a note that the full doc lives in the oc-integrations-engineer skill. Add a check to scripts/lint-internal-refs so a cross-skill references/ path fails the build.

### skills/oc-deploy-ops/SKILL.md:767 — Deploy ticket is recorded only in private skill_state.pm.deploy_tickets[], never in top-level pm_refs (role: deploy) as the checkpoint protocol prescribes
*category:* checkpoint

**Problem.** Step 6 of deploy-ticket creation writes the id to `skill_state.pm.deploy_tickets[]` and the PM section never mentions pm_refs. The checkpoint protocol defines pm_refs role `deploy` as 'deploy-ops-created deploy ticket', says every skill that touches a PM ticket appends to pm_refs, and its status example shows `oc-deploy-ops shipped PM: PLAT-4485 (deploy)`. Because the ticket is only in private state, oc-monitoring-ops reads `oc-deploy-ops.checkpoint.json skill_state.pm.deploy_tickets[]` (its :675), which the protocol forbids ('Never read skill_state'). The live checkpoint has no pm_refs.

**Evidence.** skills/oc-deploy-ops/SKILL.md:767-768 'Record the deploy-ticket id in `oc-deploy-ops.checkpoint.json` `skill_state.pm.deploy_tickets[]`'; `grep -c pm_refs skills/oc-deploy-ops/SKILL.md` -> 0; skills/oc-checkpoint-protocol/SKILL.md:571 '`deploy` — deploy-ops-created deploy ticket', :590-593 write pattern, :601 status example, :376 'Never read `skill_state`'; skills/oc-monitoring-ops/SKILL.md:674-675; `grep pm_refs .checkpoints/oc-deploy-ops.checkpoint.json` -> none

**Proposed fix.** In step 6 also append `{provider, id, url, role: "deploy", created_by_skill: "oc-deploy-ops"}` to top-level pm_refs, and point oc-monitoring-ops:675 at pm_refs instead of skill_state.

### skills/oc-docs-forge/SKILL.md:22 — "catalog drift" is claimed by both oc-repo-ops (quoted) and oc-docs-forge (unquoted list), and §4 routes it to only one of them
*category:* routing-collision · *surfaced by the routing lens*

**Problem.** oc-repo-ops:21 quotes "catalog drift" as a trigger and orchestrator.md:281 routes 'Catalog drift' to oc-repo-ops /oc-repo audit. oc-docs-forge:22 claims the same words inside an unquoted slash-list ('changelog/ADR/readme/catalog drift'), which a quoted-phrase scan does not see but a model reading the description does. The two skills are consecutive stages of the same pre-PR gate (docs-forge → repo-ops) with different entry verbs and different checkpoints, so the overlap decides which stage a 'catalog drift' request starts at. Neither skill has an eval case and neither appears in tests/routing-disambiguation.test.js.

**Evidence.** skills/oc-repo-ops/SKILL.md:21 `"is this PR ready", "check generated files", "catalog drift", "plugin/cache`; skills/oc-docs-forge/SKILL.md:22 `comment", "docs upkeep", changelog/ADR/readme/catalog drift, or any request`; skills/orchestrator.md:280-281 (docs-forge row has no catalog phrase; repo-ops row owns 'Catalog drift').

**Proposed fix.** Narrow oc-docs-forge:22 to the doc artifacts it owns ('changelog/ADR/readme drift') and leave 'catalog drift' to oc-repo-ops, or add an explicit split sentence to both descriptions; mirror the change into orchestrator.md §7.

### skills/oc-docs-forge/SKILL.md:83 — /oc-docs pr inputs list and the Cross-Skill Reads table name different upstream skills, and both omit rows the shared upstream map assigns
*category:* cross-skill-contract

**Problem.** Lines 83-84 list eight checkpoints as /oc-docs pr inputs (oc-app-architect, oc-reverse-spec, oc-code-auditor, oc-bug-check, oc-release-ops, oc-api-dev, oc-stack-forge, oc-repo-ops). The 'Reads from' table at 197-204 lists a different set: it adds oc-git-ops and drops oc-stack-forge and oc-repo-ops. The shared upstream map (orchestrator.md:146) additionally lists oc-compliance-ops as a read source, and oc-compliance-ops:266 / oc-stack-forge:489 / oc-cost-ops:218 each declare a read edge with oc-docs-forge that this skill's tables do not acknowledge. A session reading only the table will not consult stack-forge/repo-ops/compliance checkpoints the inputs list (or peers) expect it to.

**Evidence.** sed -n '83,84p;197,204p' skills/oc-docs-forge/SKILL.md shows the two lists; sed -n 146p skills/orchestrator.md shows oc-compliance-ops in the upstream column; grep -n docs-forge skills/oc-stack-forge/SKILL.md:489, skills/oc-compliance-ops/SKILL.md:266, skills/oc-cost-ops/SKILL.md:218 show the peer-declared edges.

**Proposed fix.** Make the inputs list and the Cross-Skill Reads table one set: add oc-stack-forge and oc-repo-ops rows (or drop them from :84), add an oc-compliance-ops row (policy docs riding the packet) to match orchestrator.md:146, and add oc-cost-ops to 'Read by' (per-PR gate cost attribution).

### skills/oc-docs-forge/SKILL.md:158 — '/oc-docs verify' failure is said to block oc-repo-ops verify, but no checkpoint field carries the verdict and nothing in the pre-PR gate invokes verify
*category:* gate-reality

**Problem.** Line 158 says a /oc-docs verify failure 'blocks oc-repo-ops verify, which blocks oc-git-ops from opening the PR'. Outputs (94-95) promise the checkpoint records 'verification status', but the documented schema (184-191) has only verified_for_sha — no verdict, no failure reasons. oc-repo-ops fails only on a 'missing or stale' docs-forge checkpoint (oc-repo-ops:90; pr-readiness-gate.md:16), i.e. on SHA staleness. A verify FAIL for a non-SHA criterion (e.g. line 156 'Links and referenced files exist') therefore has no documented way to reach repo-ops if verified_for_sha was already stamped at HEAD by /oc-docs pr. Separately, the oc-git-ops pre-PR gate (:325-335) invokes /oc-docs pr and /oc-repo verify but never /oc-docs verify, so in the normal flow the 'failure blocks' path has no invoker; only oc-release-ops:305 runs verify and hard-blocks on it itself.

**Evidence.** sed -n '94,95p;147,159p;184,191p' skills/oc-docs-forge/SKILL.md; grep -n 'stale' skills/oc-repo-ops/SKILL.md:90 and skills/oc-repo-ops/references/pr-readiness-gate.md:16; grep -n 'oc-docs' skills/oc-git-ops/SKILL.md shows only '/oc-docs pr' (:325,:341,:375); STATUS_ENUM in scripts/checkpoint.mjs:83 has no docs-verify semantics documented here.

**Proposed fix.** Add a documented verify verdict to the checkpoint (e.g. verify_verdict: PASS|FAIL plus blocking_findings[]) and state that a FAIL must not advance verified_for_sha (or must set status: failed); have oc-repo-ops:90 key on that verdict as well as staleness; either add /oc-docs verify to the oc-git-ops gate or reword line 158 to describe what actually gates (repo-ops staleness check + release-ops verify row).

### skills/oc-docs-forge/SKILL.md:184 — Cross-skill handoff payload is placed in skill_state, which the bundled checkpoint protocol declares private
*category:* checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md P3d (covers verified_for_sha only; pr_body_fragment and pr_comment_marker are not covered)

**Problem.** The only documented carriers of the PR docs packet — pr_body_fragment, pr_comment_marker, verified_for_sha — are skill_state keys (lines 184-191). The 'Read by' table (207-210) then requires oc-git-ops and oc-release-ops to consume them, and those skills do so explicitly (oc-git-ops:328-329 'insert skill_state.pr_body_fragment'; oc-release-ops:305 'checkpoint verified_for_sha matches HEAD'). The protocol bundled into this skill says the opposite: skill_state is 'private to the owning skill' (:162), 'Never read skill_state' (:376), 'Private state stays private ... other skills don't read it' (:725-726), and sibling-readable data should not live there (:552-553). Every consumer of this skill's output must violate the protocol rule to function.

**Evidence.** sed -n '184,191p;207,210p' skills/oc-docs-forge/SKILL.md; sed -n '328,330p' skills/oc-git-ops/SKILL.md; sed -n 305p skills/oc-release-ops/SKILL.md; sed -n '162p;376p;552,553p;725,726p' skills/oc-checkpoint-protocol/SKILL.md; live .checkpoints/oc-docs-forge.checkpoint.json keeps all three keys under skill_state.

**Proposed fix.** Move the three handoff keys out of skill_state into a documented top-level block (e.g. pr_docs: { body_fragment, comment_marker, verified_for_sha }) or a protocol extension per punchlist P3d, and update oc-git-ops:328-330 and oc-release-ops:305 to read the new location; keep docs_changed / docs_not_changed_reason / follow_up_docs private.

### skills/oc-fleet-ops/SKILL.md:139 — image_hint — the field fleet-ops maps to `image` — is absent from oc-modularize-ops's own skill_state example
*category:* cross-skill-contract

**Problem.** Lines 139 and 300 map `module.image_hint → image` and :296 lists image_hint in the per-module payload. The producer's prose contract lists it, but the producer's canonical skill_state example (the thing a modularize session copies) omits it, so a real module-map/modules[] entry will most likely arrive without image_hint and topology has no documented fallback for `image`.

**Evidence.** skills/oc-modularize-ops/SKILL.md:306-307 lists `{ id, seam_contract, owns_data[], image_hint, equivalence_verified }`; its skill_state example at :360-362 is `{ "id": "billing", "seam_contract": ..., "owns_data": [...], "fixtures_captured": true, "extracted": true, "equivalence_verified": true }` — no image_hint. Its 'When to Save' table (:366-374) never records image_hint either.

**Proposed fix.** Add `"image_hint": "billing:abc123"` to the modularize example and a save-event row for it, or state in fleet-ops :139 that image is derived from module.id when image_hint is absent.

### skills/oc-fleet-ops/SKILL.md:241 — 'First-class' is defined as carrying a vetted IaC recipe + /demo scenario, but no recipe doc and no /demo scenario exists for any environment
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:457 ('All four companion reference docs are declared but unwritten') — still open

**Problem.** Lines 241-243 define 'reachable, not first-class' as lacking 'a vetted IaC recipe + /demo scenario', implying compose / k8s / Linux-VMs (:235-237, marked first-class) have both. The same file at :376-381 says all four recipe references are 'not yet written', and the site has no fleet-ops demo scenario. The section therefore promises a capability the skill does not carry.

**Evidence.** skills/oc-fleet-ops/references/ contains only orchestrator.md and checkpoint-protocol.md (`ls`); topology-design.md / iac-selection.md / rollout-strategies.md / fleet-verification.md absent. `grep -i fleet site/src/pages/demo.astro site/src/components/DesktopWorkbench.astro site/src/components/MobileWorkbench.astro site/src/lib/demo-search/*.ts` → 0. docs/releases/1.7-plan.md:809 planned S4 as 'full body + 4 references ... + TRYIT.md'; skills/oc-fleet-ops/TRYIT.md is also absent.

**Proposed fix.** Either write the three first-class recipes (compose, k8s/Helm, Ansible VMs) under references/ and add a /demo walkthrough, or change :233-243 to say every environment is 'reachable' today and drop the recipe+scenario definition until one ships.

### skills/oc-fleet-ops/SKILL.md:266 — Neither chains_to target nor any reads_from source acknowledges fleet-ops; the scale-ops edge names no field
*category:* cross-skill-contract · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:157-160 (new skills not made operational in routing / map) — still open

**Problem.** The Cross-skill wiring tables (:266-276) are one-directional: oc-monitoring-ops, oc-git-ops, oc-scale-ops, oc-stack-forge and oc-app-architect contain zero references to fleet-ops, and scale-ops's own 'Read by' table omits it. In particular the load-bearing 'fleet-ops applies, scale-ops decides' rule (:111-112, :204-206, :253, :270) points at a target scale-ops never emits — it records 'Current tier, target tier, upgrade path', not replica or node counts — so a fleet-ops session has nothing concrete to apply.

**Evidence.** `grep -ci fleet` = 0 for skills/oc-monitoring-ops/SKILL.md, oc-git-ops, oc-scale-ops, oc-stack-forge, oc-app-architect. skills/oc-scale-ops/SKILL.md:420 '| Capacity plan produced | Current tier, target tier, upgrade path |'; its Read-by table :432-436 lists deploy-ops, code-auditor, app-architect only. orchestrator.md:149 (oc-monitoring-ops reads from) and :144 (oc-git-ops reads from) do not list oc-fleet-ops.

**Proposed fix.** Add a `replica_targets[] {service, replicas, nodes}` field (or a named report path) to oc-scale-ops's capacity-plan save event and cite it at fleet-ops :270; add 'oc-fleet-ops' to the Read-by tables of oc-scale-ops and oc-stack-forge and to the reads-from rows of oc-monitoring-ops and oc-git-ops (SKILL.md and orchestrator.md).

### skills/oc-fleet-ops/SKILL.md:313 — PM-MCP section defers to a protocol that does not list oc-fleet-ops as a producing skill or know its fleet-deploy / rolled / partial-halt events
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:452-455 (PM-MCP contract deferred to a sibling's file absent in per-skill installs) — related, still open;

**Problem.** Lines 311-319 defer the runtime contract to pm-mcp-protocol.md and shape markers `opchain:oc-fleet-ops:fleet-deploy:<env>:<sha>` plus `rolled` / `partial-halt` / `rolled-back` per-event updates. The protocol enumerates its `<skill>` producers and its extended state vocabulary; fleet-ops is in neither, and `rolled` / `partial-halt` appear nowhere. Any future validation of `<skill>` or of state names against the protocol will reject fleet-ops writes.

**Evidence.** skills/oc-integrations-engineer/references/pm-mcp-protocol.md:7-9 lists downstream PM-aware skills as oc-app-architect, oc-git-ops, oc-deploy-ops, oc-monitoring-ops, oc-release-ops; :110-111 `<skill>` = the producing skill with the same five; Appendix A :280-291 has `rolled-back` (oc-deploy-ops) but no `rolled` or `partial-halt`. The `<event>` list at :112-114 is open-ended ('...'), so `fleet-deploy` is tolerated but undocumented.

**Proposed fix.** Add oc-fleet-ops (and oc-modularize-ops / oc-migration-ops, which defer the same way) to pm-mcp-protocol.md:7-9 and :110-111, and add `rolled` / `partial-halt` rows (used by oc-fleet-ops) to Appendix A.

### skills/oc-git-ops/SKILL.md:20 — /oc-git-sync is the phase orchestrator §4 routes two intents to, and the verb oc-bug-check chains on, but oc-git-ops's own description never mentions it
*category:* trigger-drift · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:2196 (git-ops body-vs-frontmatter verb split)

**Problem.** orchestrator.md:287 routes 'Commit my changes' / 'Push to git' to oc-git-ops with phase /oc-git-sync, oc-bug-check:22-23 keys its gate on '/oc-git-commit and /oc-git-sync', and eval case route-005 expects the answer to name /oc-git-sync. oc-git-ops's frontmatter declares it (:15) but the description — the only text the model reads when deciding what a verb does — lists /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-release and stops (:20-21). The verb every chaining contract and the router table depend on is advertised nowhere on the trigger surface.

**Evidence.** skills/oc-git-ops/SKILL.md:15 `  - /oc-git-sync`; :20-21 `Use for /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-release, "commit this", "push to git", "create a PR",`; skills/orchestrator.md:287 `| "Commit my changes" / "Push to git" | oc-git-ops | /oc-git-sync |`; skills/oc-bug-check/SKILL.md:22-23; prompts/opchain-eval/expected.jsonl:5 `["oc-git-ops", "/oc-git-sync"]`.

**Proposed fix.** Add /oc-git-sync to the verb list in skills/oc-git-ops/SKILL.md:20-21 (and mirror into orchestrator.md §7:447-451, which is also missing /oc-git-release).

### skills/oc-git-ops/SKILL.md:35 — Three command-name families in one file: frontmatter verbs never appear in the body, body/menu verbs are undeclared
*category:* routing · *known:* docs/audits/2026-07-04-portability-audit.md:720 (CONFIRMED, naming-or-trigger, still open)

**Problem.** Frontmatter declares /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release (mirrored by the flag registry, mcp-catalog.json and plugins/opchain/commands/oc-commit.md). The body's menu trigger is /oc-git-ops (:35, :57), the menu and section headings use /oc-git-init, /oc-git-commit, /oc-git-pr, /oc-git-status, /oc-git-convention plus un-prefixed /git-branch, /git-push, /git-diff (:42-54, :84, :152, :171, :255). /oc-pr, /oc-push and /oc-git occur nowhere outside the frontmatter/description. Sibling contracts chain on /oc-git-commit and /oc-git-pr, which no frontmatter or registry flag declares, so the verb gate skills.command.<verb>.enabled cannot match what the pipeline actually calls.

**Evidence.** grep -nE '/oc-pr\b|/oc-push\b|/oc-git\b' SKILL.md hits only :6-21 (frontmatter). SKILL.md:35 'When the user types /oc-git-ops'; :43 '/git-branch'; :46 '/git-push'; :52 '/git-diff'; :44-45 '/oc-git-commit', '/oc-git-pr'. src/lib/flags/registry.js:287-290 registers /oc-git, /oc-git-sync, /oc-pr, /oc-push. oc-bug-check/SKILL.md:103 'oc-git-ops calls oc-bug-check before every /oc-git-commit and /oc-git-sync'; skills/orchestrator.md:194-195 '/oc-git-commit or /oc-git-sync starts', 'PR creation starts (/oc-git-pr ...)'. Sibling menus use their frontmatter verb as the trigger (oc-deploy-ops:30 '/oc-deploy', oc-reverse-spec:46 '/oc-reverse-spec'). (/checkpoint is a suite-wide un-prefixed convention and is not counted.)

**Proposed fix.** Pick the frontmatter family as canonical: rename menu/headings to /oc-git (menu), /oc-commit, /oc-pr, /oc-push, and prefix the rest (/oc-git-branch, /oc-git-diff) — declaring any kept extras in commands: so gen-skills-catalog/registry gate them; then update oc-bug-check:22,68,103,491 and orchestrator.md:194-195,667 to the same verbs.

### skills/oc-git-ops/SKILL.md:44 — oc-git-ops body command menu (/oc-git-commit, /oc-git-pr, /git-branch, /git-push, ...) disagrees with its frontmatter commands, and orchestrator.md §3 + oc-bug-check key their gate trigger on the undeclared /oc-git-commit
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:720 "[oc-git-ops] Command-menu drift" (CONFIRMED, still open)

**Problem.** Frontmatter (:10-16) declares /oc-git, /oc-commit, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release. The body's GIT OPS COMMANDS menu (:42-52) tells the model to use /oc-git-init, /git-branch, /oc-git-commit, /oc-git-pr, /git-push, /oc-git-status, /git-diff instead. Every derived surface (MCP prompts via server.js:55-65, route via buildCommandIndex, the plugin's 12 registered commands, next-suggestion.cjs:237 `"oc-git-ops": "/oc-commit"`) uses the frontmatter names, while the chaining contract other skills implement uses the body names: orchestrator.md:194 "/oc-git-commit or /oc-git-sync starts → oc-bug-check" and oc-bug-check/SKILL.md:22,68,103,491 all say "before every /oc-git-commit". A session reading oc-bug-check looks for a `/oc-git-commit` trigger that oc-git-ops never registers; an MCP client asking route("/oc-git-pr") gets the orchestrator fallback.

**Evidence.** sed -n 42,52p skills/oc-git-ops/SKILL.md shows the mixed menu; grep -rn oc-git-commit skills/ hits oc-bug-check:22,68,103,491 and orchestrator.md:194,365,667 but no `commands:` entry anywhere; route("/oc-git-pr") → `oc-orchestrator /oc-ops false`; route("/oc-git-commit") → `oc-git-ops /oc-git-sync true` (wrong phase).

**Proposed fix.** Pick one namespace. Cheapest: make the body menu match frontmatter (/oc-commit, /oc-pr, /oc-push, /oc-git-sync, /oc-git-release) and add the utilities (/oc-git-init, /oc-git-status) to `commands:`; then update orchestrator.md:194 and oc-bug-check:22,68,103,491 to "/oc-commit or /oc-git-sync". Add a gen-skills-catalog rule: every `^\s{2,}/oc-[a-z-]+` verb in a SKILL.md command menu must be in that skill's `commands:`.

### skills/oc-git-ops/SKILL.md:262 — PR-description sources list a 'Tri-dev checkpoint' — a retired skill name — alongside the oc-app-architect checkpoint it merged into
*category:* docs-drift

**Problem.** Item 2 tells the session to read a tri-dev checkpoint for 'sprint contract, evaluator scores'; tri-dev no longer exists (merged into oc-app-architect), and item 4 already names the oc-app-architect checkpoint. A session looks for .checkpoints/tri-dev.checkpoint.json that no skill writes.

**Evidence.** SKILL.md:262 '2. **Tri-dev checkpoint** — sprint contract, evaluator scores'; :264 '4. **App-architect checkpoint**'. skills/README.md:11 'Delete any existing tri-dev skill (merged into oc-app-architect)'. 'tri-dev' is not among the 33 skills/<id> directories.

**Proposed fix.** Fold :262 into :264: 'oc-app-architect checkpoint — roadmap tasks, Phase 6 sprint contract, evaluator scores' and renumber.

### skills/oc-git-ops/SKILL.md:329 — Reads sibling skills' skill_state (pr_body_fragment, pr_comment_marker, blocking_findings, bug-check verdict) against the protocol's 'never read skill_state' rule
*category:* cross-skill-contract

**Problem.** The whole pre-commit/pre-PR rail is wired through other skills' skill_state: docs-forge's skill_state.pr_body_fragment/pr_comment_marker (:265, :292, :329-330), repo-ops's skill_state.blocking_findings (:341), and bug-check's verdict (:237; bug-check stores it under skill_state). The bundled protocol forbids exactly this, while its own cross-skill table sanctions the docs-forge/repo-ops read — the protocol contradicts itself and the rail depends on the forbidden path. A future validator or reader that enforces the rule breaks every gate.

**Evidence.** SKILL.md:329 'insert skill_state.pr_body_fragment'; :341 'Surface skill_state.blocking_findings'; :237 'read .checkpoints/oc-bug-check.checkpoint.json for the verdict'. oc-checkpoint-protocol/SKILL.md:376 '- Never read skill_state — it's private to the owning skill'; :725 'Private state stays private. skill_state is an opaque bag — other skills don't read it'; but :371 '| oc-git-ops | oc-docs-forge + oc-repo-ops checkpoints | Pre-PR gate: docs packet + readiness verdict |'. Producers: oc-docs-forge/SKILL.md:185-186 (skill_state.pr_body_fragment), oc-repo-ops/SKILL.md:152-153 (verdict, blocking_findings), oc-bug-check/SKILL.md:550-556 (skill_state.verdict).

**Proposed fix.** Promote the handoff fields to a protocol-defined optional top-level extension (like pm_refs — e.g. gate: { verdict, blocking_findings } and docs_packet: { pr_body_fragment, pr_comment_marker }) validated by checkpoint.mjs, and rewrite :237, :265, :292, :329-330, :341 to read those; or add an explicit named exception to the protocol's rule at :376/:725 and cite it here.

### skills/oc-git-ops/SKILL.md:338 — oc-git-ops pre-PR gate consumes docs-forge/repo-ops verdicts without checking verified_for_sha against HEAD, so a stale PASS from an earlier PR satisfies the gate
*category:* gate-reality · *known:* docs/plans/coordination-gaps-punchlist.md P3d

**Problem.** Both writers record `verified_for_sha` (docs-forge:190, repo-ops:158) and oc-release-ops:305 correctly requires 'checkpoint verified_for_sha matches HEAD'. The everyday consumer, oc-git-ops's Pre-PR Gate verdict table (:337-343), only branches on PASS / FAIL / no-checkpoint; it never compares verified_for_sha to the current HEAD, so on the second PR of a session the previous PASS (already `complete` in both checkpoints) lets `gh pr create` proceed without re-running docs-forge/repo-ops.

**Evidence.** skills/oc-git-ops/SKILL.md:337-343 verdict table rows `PASS | Proceed to gh pr create`, `FAIL | ABORT`, `(no checkpoint) | The gate hasn't run` — no sha row; skills/oc-docs-forge/SKILL.md:190 `"verified_for_sha": "abc123"`; skills/oc-repo-ops/SKILL.md:158; skills/oc-release-ops/SKILL.md:305 `checkpoint verified_for_sha matches HEAD`.

**Proposed fix.** Add a row to oc-git-ops:337-343: `PASS but skill_state.verified_for_sha != git rev-parse HEAD → treat as (no checkpoint) and re-run the gate`.

### skills/oc-git-ops/SKILL.md:384 — Post-sync handoff only 'suggests' oc-deploy-ops while the bundled orchestrator handoff table says to invoke it (audit then staging)
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:29 (git-sync -> oc-deploy-ops hop 'demoted to passive suggest'; still open)

**Problem.** SKILL.md phrases the git-sync -> deploy edge as a user prompt ('suggest: Changes pushed. Run /oc-deploy staging ...?') and never mentions /oc-deploy audit; the orchestrator's handoff table, which is bundled into this skill, states the same edge as an active invocation of /oc-deploy audit then /oc-deploy staging. The two texts a session reads on first invocation disagree about whether the hop fires.

**Evidence.** SKILL.md:388 'Run /oc-deploy init to set up deployment, or /oc-audit pre-deploy'; :306 'consider /oc-audit pre-deploy'. oc-deploy-ops/SKILL.md:10-13 commands: /oc-deploy, /oc-deploy staging, /oc-deploy audit (init only at :48, :90). oc-code-auditor/SKILL.md:10-12 commands: /oc-audit, /oc-audit full (pre-deploy only at :41, :367). src/lib/flags/registry.js:279-280 'Subcommands ... inherit the parent verb's flag'.

**Proposed fix.** Make them agree: either change orchestrator.md:197 to 'Suggest /oc-deploy staging (user-confirmed)' or make :384-388 an explicit Skill(skill="oc-deploy-ops", args="/oc-deploy audit") then '/oc-deploy staging' chain with a user confirmation gate.

### skills/oc-git-ops/SKILL.md:431 — Documented skill_state.releases record was never written for v1.8.3 / v1.9.0; the live checkpoint records the tag under a different key and shape
*category:* live-checkpoint

**Problem.** Step 6 of /oc-git-release (:431-437) and the write table (:482) say to append { semver, tag, tag_sha, pr, tagged_at } to skill_state.releases. Two releases have been tagged since the verb existed (v1.8.3, v1.9.0) but the live checkpoint has no releases key and no tag_sha/tagged_at anywhere; the v1.9.0 tag is recorded as skill_state.release_reconciliation.tag with keys name/object_sha/peeled_commit/signing_fingerprint/local_gate/remote_gate. The documented schema is therefore fiction for a consumer (oc-release-ops reads this checkpoint for release state), and doctor cannot check a field that nothing writes.

**Evidence.** SKILL.md:434-436 '{ "skill_state": { "releases": [ { "semver": "1.8.3", "tag": "v1.8.3", "tag_sha": ... } ] } }'; :482 'Append { semver, tag, tag_sha, pr, tagged_at } to skill_state.releases'. git tag -l 'v*' -> v1.8.0 v1.8.1 v1.8.2 v1.8.3 v1.9.0. node: Object.keys(skill_state) has no 'releases'; JSON contains no 'tag_sha' or 'tagged_at'; skill_state.release_reconciliation.tag = {name:'v1.9.0', object_sha:'fd05dd2c...', peeled_commit:'244bf13e...', signing_fingerprint:..., local_gate:'PASS', remote_gate:'PASS'}.

**Proposed fix.** Either backfill skill_state.releases with v1.8.3 and v1.9.0 entries in the documented shape (one reconciliation PR), or change :431-437/:482 to document the release_reconciliation.tag shape that is actually written and name which key oc-release-ops should read.

### skills/oc-git-ops/SKILL.md:525 — Cross-Skill Reads table omits oc-bug-check, which the body reads at the pre-commit gate
*category:* docs-drift · *independently reported 2×*

**Problem.** oc-git-ops carries more active-chain edges than any skill (bug-check, docs-forge → repo-ops, deploy-ops per orchestrator :144), yet its Cross-Skill Reads section (:523-531) has only a 'Reads from' table — no 'Read by' / 'Chains to' — and that table omits oc-bug-check even though the commit path (:236-242) reads `.checkpoints/oc-bug-check.checkpoint.json` for the verdict. For the git-sync → deploy edge, §3 :197 says 'Invoke oc-deploy-ops, run /oc-deploy audit then /oc-deploy staging', but git-ops :385-388 says 'suggest: "Changes pushed. Run `/oc-deploy staging`…?"' — the passive pattern §3 :178-186 labels WRONG.

**Evidence.** skills/oc-git-ops/SKILL.md:525-531 `| Reads from | Why |` rows: oc-app-architect, oc-code-auditor, oc-docs-forge, oc-repo-ops, oc-deploy-ops (no oc-bug-check, no Chains-to table); :236 `Then read \`.checkpoints/oc-bug-check.checkpoint.json\` for the verdict.`; :385-386 `- If a oc-deploy-ops config exists for this project, suggest: "Changes pushed. Run \`/oc-deploy staging\` to deploy to staging?"`; orchestrator.md:197 `| git-sync completes | oc-git-ops | oc-deploy-ops | Invoke oc-deploy-ops, run /oc-deploy audit then /oc-deploy staging |`.

**Proposed fix.** Add an oc-bug-check row and a 'Chains to' table (oc-bug-check, oc-docs-forge → oc-repo-ops, oc-deploy-ops, oc-release-ops tag handoff) to :523-531; reconcile :385-388 with §3 :197 (either invoke, or downgrade the §3 row to 'offer').

### skills/oc-git-ops/SKILL.md:567 — PM-MCP runtime contract is linked by a sibling-relative path that does not resolve in an installed copy of this skill
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:472 (CONFIRMED, chaining-gap; still open)

**Problem.** The §1 tool registry, §2 retry policy and §4 pm_deferred_actions schema that :574-581 and :638-656 depend on live only in oc-integrations-engineer/references/pm-mcp-protocol.md, reached via '../oc-integrations-engineer/...'. skills/oc-git-ops/references/ contains only the two synced bundles, so a per-skill install (or the ~/.claude/skills layout if only git-ops is present) cannot read the contract it says every MCP call honours.

**Evidence.** SKILL.md:566-568 'The runtime contract ... lives in [oc-integrations-engineer/references/pm-mcp-protocol.md](../oc-integrations-engineer/references/pm-mcp-protocol.md)'. ls skills/oc-git-ops/references/ -> checkpoint-protocol.md, orchestrator.md only. scripts/sync-skill-bundles.mjs syncs only those two files (:5-9).

**Proposed fix.** Add pm-mcp-protocol.md to scripts/sync-skill-bundles.mjs so it ships as references/pm-mcp-protocol.md in every PM-writing skill, and point :568 at references/pm-mcp-protocol.md.

### skills/oc-integrations-engineer/references/pm-mcp-protocol.md:154 — pm_deferred_actions / pm_flush_log / pm_idempotent_skips are declared as top-level checkpoint fields but exist in no checkpoint contract, validator or merge rule
*category:* checkpoint

**Problem.** :154-155 "Every skill that performs PM writes adds a top-level `pm_deferred_actions` array to its checkpoint (alongside the existing `skill_state`)", :127 `pm_idempotent_skips[]`, :209-210 `pm_flush_log[]`. The checkpoint contract (oc-checkpoint-protocol/SKILL.md, .checkpoints/README.md) defines only `pm_refs` as the PM extension; scripts/checkpoint.mjs validates pm_refs/cost/eval_scores/telemetry_handle and has no unknown-key check, so the three arrays pass `checkpoint:validate` with no shape validation and `doctor` is blind to them; merge-checkpoint.mjs treats a diverged array as a hard conflict (exit 1, textual markers) rather than the union a queue needs. No live checkpoint has ever carried the field.

**Evidence.** `grep -n 'pm_deferred_actions\|pm_flush_log\|pm_idempotent_skips' scripts/checkpoint.mjs .checkpoints/README.md skills/oc-checkpoint-protocol/SKILL.md` -> no hits; `grep -n -i 'unknown\|unexpected\|Object.keys(data)' scripts/checkpoint.mjs` -> no hits; scripts/merge-checkpoint.mjs:132-133 `conflicts.push(path); return newerSide === "ours" ? oursV : theirsV;` then :138-146 exit 1 with markers; `grep -l pm_deferred_actions .checkpoints/*.json` -> none (only oc-release-ops has pm_refs).

**Proposed fix.** Register the three arrays in oc-checkpoint-protocol/SKILL.md's optional-extension section and .checkpoints/README.md, add shape validation in scripts/checkpoint.mjs (mirroring the pm_refs block at :291-304, required keys per pm-mcp-protocol.md:185-200), and add `pm_deferred_actions`/`pm_flush_log`/`pm_idempotent_skips` to a union-merge path set in merge-checkpoint.mjs (the v2.0 plan §4.4 row 11 already introduces UNION_PATHS for eval_scores).

### skills/oc-integrations-engineer/references/pm-mcp-protocol.md:236 — §5 says the validator enforces all seven cross-skill rules; only rules 1 and 7 are mechanically checked
*category:* gate-reality

**Problem.** :236 "These rules apply to every PM-aware skill. The validator (Section 6) enforces them." Rules 2 (markers everywhere), 3 (pre-write check), 4 (defer, don't fail), 5 (state names from pm.yaml), 6 (tool_overrides honoured) have no corresponding code; checkSkillFile only tests the `mcp.<provider>.` placeholder (rule 1) and the `pm-mcp-protocol.md` citation (rule 7). A session reading §5 would believe marker and pre-write discipline are build-gated when they are prose-only.

**Evidence.** scripts/lib/pm-mcp-checks.mjs:89-109 checkSkillFile: three tests — /^##\s+PM-Tool MCP Integration/m, /mcp\.<provider>\./g, text.includes("pm-mcp-protocol.md"); no reference to `opchain:`, `list_comments`, `tool_overrides`, or `states` in any SKILL.md check.

**Proposed fix.** Change :236 to "Rules 1 and 7 are enforced by the validator (Section 6); rules 2–6 are reviewed by hand" or add the missing checks (e.g. every SKILL.md that names an add_comment tool must also contain an `opchain:oc-` marker and a list_comments/pre-write mention).

### skills/oc-integrations-engineer/references/pm-mcp-protocol.md:263 — PM-MCP validator covers 5 skills while the protocol names 6 and 9 skills now emit markers; oc-release-ops's concrete tool calls are never validated
*category:* gate-reality · *independently reported 3×*

**Problem.** Lines 7-8 list the downstream PM-aware skills as oc-app-architect, oc-git-ops, oc-deploy-ops, oc-monitoring-ops and oc-release-ops; §6 (line 263) says the validator checks 'Each of the 5 PM-aware SKILL.md files' for the anchor, placeholder drift, citation and tool-name typos. The validator's list (scripts/lib/pm-mcp-checks.mjs:5-11) is oc-integrations-engineer + app-architect + git-ops + deploy-ops + monitoring-ops — oc-release-ops is NOT validated despite being named in the contract and citing it at SKILL.md:417. Meanwhile 20 SKILL.md files carry `## PM-Tool MCP Integration` (also api-dev, bug-check, migration-ops, code-auditor, dash-forge, fleet-ops, modularize-ops, ux-engineer, orchestrator, reverse-spec, security-auditor, scale-ops, signal-forge, stack-forge), so 15 skills' concrete MCP tool names are never checked against the registry the doc calls the source of truth (line 17-18).

**Evidence.** skills/oc-integrations-engineer/references/pm-mcp-protocol.md:7-8 "...`oc-monitoring-ops`, and `oc-release-ops`."; :263 "| Each of the 5 PM-aware SKILL.md files contains the section anchor...". scripts/lib/pm-mcp-checks.mjs:5-11 PM_AWARE_SKILLS = [oc-integrations-engineer, oc-app-architect, oc-git-ops, oc-deploy-ops, oc-monitoring-ops]. `grep -ln '^## PM-Tool MCP Integration' skills/*/SKILL.md` → 20 files including oc-release-ops. Distinct from the oss-readiness audit :95-97 item (pm.yaml being Linear-specific).

**Proposed fix.** Add oc-release-ops (and the other marker emitters, or derive the list from `## PM-Tool MCP Integration` sections that cite the protocol) to PM_AWARE_SKILLS in scripts/lib/pm-mcp-checks.mjs; replace the literal "5" at pm-mcp-protocol.md:263-264 and the five-name enumeration at :110-111 with the derived list or a pointer to PM_AWARE_SKILLS.

### skills/oc-integrations-engineer/SKILL.md:10 — Frontmatter commands enumerate 2 of the 11 body verbs, so the hosted catalog advertises only /oc-integrate and /oc-integrate plan
*category:* generated-surface · *independently reported 2×*

**Problem.** The command reference at :44-59 documents build, test, connect, webhook, oauth, health, secrets, retry and list, but `commands:` at :10-12 lists only `/oc-integrate` and `/oc-integrate plan`. Sibling skills enumerate every sub-verb in frontmatter (oc-api-dev 10, oc-release-ops 6), and the generated MCP catalog / skills.json / site pages derive from frontmatter, so MCP clients and the /skills page see two verbs for a skill with eleven.

**Evidence.** `grep -o '"/oc-integrate[^"]*"' src/generated/mcp-catalog.json | sort -u` -> "/oc-integrate", "/oc-integrate plan"; `sed -n '/^commands:/,/^description:/p' skills/oc-api-dev/SKILL.md | grep -c '^  - /'` -> 10; oc-release-ops -> 6; scripts/check-skill-flags.mjs:56-64 gates on the verb only so adding sub-verbs needs no registry change.

**Proposed fix.** Extend `commands:` to the nine remaining `/oc-integrate <sub>` entries (and drop `/checkpoint` from the body table or list it too), then `npm run gen-mcp-catalog` to regenerate the surface.

### skills/oc-integrations-engineer/SKILL.md:339 — No oc-code-auditor handoff despite the shared orchestrator declaring it as this skill's downstream
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:224

**Problem.** orchestrator.md:141 declares `oc-integrations-engineer | upstream oc-app-architect (integration spec) | downstream oc-code-auditor (verify integration)`. Step 4 (:337-343) ends a PASS with "Add to health monitoring" and never names oc-code-auditor, `/oc-audit`, or any next skill; the only oc-code-auditor mentions are a PM-pattern example (:525) and a Read-by row (:673). The declared chain therefore has no trigger point in this skill's workflow. Still open.

**Evidence.** `grep -n 'oc-code-auditor' skills/oc-integrations-engineer/SKILL.md` -> 525, 673 only; no `/oc-audit` string in the file.

**Proposed fix.** Add to Step 4 PASS: "Suggest `/oc-audit` (oc-code-auditor) on the new client + webhook handler; if oc-code-auditor is not installed, note it and continue" — mirroring the imperative handoff style used by oc-app-architect:644-647.

### skills/oc-integrations-engineer/SKILL.md:339 — oc-integrations-engineer's PASS branch ends in 'Add to health monitoring' with no skill, verb, or artifact
*category:* undefined-next-step · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers skills/oc-integrations-engineer/SKILL.md:339 as 'No oc-code-auditor handoff despite the share

**Problem.** Step 4 of the Planner/Builder/Tester loop terminates the success path with '- **PASS**: Integration is production-ready. Add to health monitoring.' (:339). No skill is named, no verb, no artifact and no checkpoint field. The skill's own body has `/oc-integrate health` (:54) which checks integrations rather than registering them, and oc-monitoring-ops' text carries no receiver for an integration registration. The shared map assigns this skill a different downstream entirely — 'oc-integrations-engineer | ... | oc-code-auditor (verify integration)' (skills/orchestrator.md:139) — which the skill body never invokes. So the only defined terminal state of the primary flow hands off to nothing.

**Evidence.** skills/oc-integrations-engineer/SKILL.md:339 `- **PASS**: Integration is production-ready. Add to health monitoring.`; :54 `  /oc-integrate health     Check health of all active integrations`; skills/orchestrator.md:139 `| **oc-integrations-engineer** | oc-app-architect (integration spec) | oc-code-auditor (verify integration) |`.

**Proposed fix.** Replace :339 with a concrete handoff: record the integration in the checkpoint's public surface, invoke `/oc-monitor instrument` (a verb oc-monitoring-ops declares) for the uptime/error checks, then chain `/oc-audit full` per orchestrator.md:139 — and give oc-monitoring-ops a matching receiving row.

### skills/oc-integrations-engineer/SKILL.md:495 — Enterprise scenario docs (mcp-enterprise-f500, mcp-enterprise-defense, "scenarios 7-8") are cited six times and exist nowhere
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:497

**Problem.** :495-497 tells a regulated-environment session to "See scenarios `mcp-enterprise-f500` and `mcp-enterprise-defense` for the security posture and the broker / redactor / audit pipeline that must precede deployment"; :520 says the audit-record schema is "in the scenarios"; pm-mcp-protocol.md:358 points there for the "full broker / redactor / audit-pipeline reference architecture". No file, directory or doc with those names exists in the repo or the shipped skill, so the step that must precede a HIPAA/FedRAMP/CMMC deployment cannot be executed. Still open as of today.

**Evidence.** `grep -rn 'mcp-enterprise-f500\|mcp-enterprise-defense' . --include='*.md' ...` (excluding node_modules/dist/public/plugin copies) hits only prose references in this skill, the bundled checkpoint-protocol.md copies and the 2026-07-04 audit; `find . -iname '*scenario*'` -> only site/tests/e2e/changelog-and-scenarios.spec.ts.

**Proposed fix.** Ship a references/enterprise-scenarios.md (or two files) describing the broker/redactor/audit pipeline and audit-record schema, and point :482/:495/:520/:611 and pm-mcp-protocol.md:51/:358 at it; otherwise delete the citations and state the posture inline.

### skills/oc-integrations-engineer/SKILL.md:621 — Checkpoint Integration section never points at the bundled references/checkpoint-protocol.md (suite-wide: 30 of 33 skills)
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:219

**Problem.** :621-660 gives a location, a when-to-write table and a skill_state example but no schema, no read→merge→write procedure and no pointer to references/checkpoint-protocol.md; the bootstrap line at :24 loads orchestrator.md, which names oc-checkpoint-protocol only descriptively (:84, :658) and never says to read the bundled file. Only oc-app-architect, oc-orchestrator and oc-reverse-spec cite `references/checkpoint-protocol.md`, so for this skill the bundled contract is unreachable from the text. Still open.

**Evidence.** `grep -n 'checkpoint-protocol' skills/oc-integrations-engineer/SKILL.md` -> no hits; `grep -n 'checkpoint-protocol.md' skills/orchestrator.md` -> no hits; `grep -l 'references/checkpoint-protocol.md' skills/*/SKILL.md | wc -l` -> 3.

**Proposed fix.** Add one line under ### Checkpoint Location: "Read `references/checkpoint-protocol.md` for the schema and the read→merge→write procedure; if `.checkpoints/` is missing, create it and write the JSON with the Write tool." (Ideally add the same pointer to skills/orchestrator.md so all 30 skills inherit it.)

### skills/oc-integrations-engineer/SKILL.md:673 — Cross-Skill Reads rows are not reciprocated by oc-code-auditor, oc-deploy-ops or oc-stack-forge, and omit oc-agent-forge / oc-qa-ops / oc-data-ops edges that exist on the other side
*category:* cross-skill-contract

**Problem.** :673 says oc-code-auditor reads "Integration health -> security context" — oc-code-auditor's Reads-from table lists only oc-reverse-spec, oc-app-architect, oc-stack-forge. :674 says oc-deploy-ops reads "Integration status -> deploy confidence" — its Reads-from lists oc-code-auditor, oc-app-architect, oc-git-ops only, and :669's "Environment config" read has no Read-by counterpart (oc-deploy-ops has no Read-by table). :668 names an oc-stack-forge "Auth pattern" artifact that oc-stack-forge/SKILL.md never mentions and whose Read-by table has no oc-integrations-engineer row. Meanwhile oc-agent-forge lists this skill as a read source three times, and oc-qa-ops:122 / oc-data-ops:31 hand connector builds to it, none of which appear in :671-676.

**Evidence.** awk over `| Reads from` / `| Read by` tables in the three sibling files (output captured above); `grep -n -i 'auth pattern\|authentication' skills/oc-stack-forge/SKILL.md` -> no hits; `grep -n integrations-engineer skills/*/SKILL.md` shows oc-code-auditor:471, oc-deploy-ops:727, oc-stack-forge:516 mention this skill only in their PM-MCP citation sentences.

**Proposed fix.** Either add the reciprocal rows in oc-code-auditor (Reads from: oc-integrations-engineer — integration health), oc-deploy-ops (Reads from: integration status; Read by: environment config) and oc-stack-forge (Read by: auth/platform choice), or drop :668/:669/:673/:674; add Read-by rows for oc-agent-forge (third-party tools for the allowlist), oc-qa-ops (recorded fixtures for consumed APIs) and oc-data-ops (connector for warehouse-bound pipelines).

### skills/oc-migration-ops/SKILL.md:31 — Six trigger aliases in the description (`/oc-migration`, `/oc-upgrade`, `/oc-refactor`, `/oc-swap`, `/oc-move-to`, `/oc-platform-move`) are absent from `commands:` and the flag registry
*category:* routing · *independently reported 2×*

**Problem.** The description (:31-32) says "ALWAYS trigger on /oc-migrate, /oc-migration, /oc-upgrade, /oc-refactor, /oc-swap, /oc-move-to, /oc-platform-move", but only the /oc-migrate family is in `commands:`. Claude Code matches the description, so the aliases work there; over MCP the prompts list (server.js:55-65) and route's command index are frontmatter-only, so the same aliases silently don't exist. oc-bug-check's description (:22) similarly cites `/oc-git-commit`, undeclared anywhere. No validator compares `/oc-*` tokens in `description` against declared verbs.

**Evidence.** Script extracting `/oc-[a-z0-9-]+` from each description vs its own commands: oc-migration-ops → 6 UNDECLARED verbs; oc-reverse-spec → oc-rev-spec UNDECLARED; oc-bug-check → oc-git-commit UNDECLARED. route("/oc-upgrade") and route("/oc-refactor") → `oc-orchestrator /oc-ops false`.

**Proposed fix.** Either declare the aliases in `commands:` (so prompts/route/plugin pick them up) or trim the description to the declared verbs; add a gen-skills-catalog check that every `/oc-*` token in a skill's description is declared by that skill or by another skill (cross-skill mentions like oc-security-auditor→/oc-harden are legitimate and pass that rule).

### skills/oc-migration-ops/SKILL.md:231 — SKILL.md says when to write checkpoints but never how, and never points at the bundled references/checkpoint-protocol.md
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:234 [oc-migration-ops] SKILL.md says when to write checkpoints but never how (CONFIRMED, checkpoint-write-

**Problem.** 'Write checkpoint: phase "assessed"' (:231), 'planned' (:359), and the When-to-Write table (:651-662) give no write mechanism and no pointer to the schema file shipped next to the skill. Still true today.

**Evidence.** `grep -n 'references/' skills/oc-migration-ops/SKILL.md` -> :43 orchestrator.md, :310 and :695 migration-playbooks.md only; `ls skills/oc-migration-ops/references/` includes checkpoint-protocol.md.

**Proposed fix.** Add 'Read `references/checkpoint-protocol.md` for the envelope schema and write rules' at the top of Session Persistence (:575).

### skills/oc-migration-ops/SKILL.md:546 — Inbound handoffs from oc-modularize-ops (`modularization/module-map.json` -> `/oc-migrate execute`) and oc-data-ops are never acknowledged by this skill
*category:* cross-skill-contract

**Problem.** oc-modularize-ops emits a Structural migration plan as `modularization/module-map.json` 'written for migration-ops' and hands it to `/oc-migrate execute`; oc-data-ops lists oc-migration-ops under 'Chains to'. The Cross-Skill Integration table (:548-558), Active Chaining (:562-571), and Assessment inputs (:151-165) never mention oc-modularize-ops or module-map.json, so an execute session arriving from modularize-ops has no instruction to read the artifact and would re-assess from scratch.

**Evidence.** skills/oc-modularize-ops/SKILL.md:60 ('oc-migration-ops Structural type (/oc-migrate execute)'), :313 and :374 (module-map.json 'written for migration-ops + fleet-ops'); skills/oc-data-ops/SKILL.md:246 ('| oc-migration-ops | Live-pipeline schema evolution beyond additive changes |'); `grep -n 'modularize\|module-map' skills/oc-migration-ops/SKILL.md` -> no hits.

**Proposed fix.** Add oc-modularize-ops (Upstream: reads modularization/module-map.json as the Structural plan input; skip assess/plan when present) and oc-data-ops (Upstream trigger) rows to Cross-Skill Integration and Cross-Skill Reads.

### skills/oc-migration-ops/SKILL.md:560 — Active Chaining invokes seven sibling skills unconditionally with no installed-check or fallback
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:507 [oc-migration-ops] Active Chaining unconditionally invokes six sibling skills with no installed-check 

**Problem.** Rows :564-571 say 'Invoke oc-stack-forge / oc-code-auditor / oc-security-auditor / oc-deploy-ops / oc-monitoring-ops / oc-data-ops' and 'Suggest oc-git-ops' with no instruction for the per-skill install where the target is absent. Still open; the v1.9 oc-data-ops row was added since the audit (six -> seven).

**Evidence.** `grep -n -i 'not installed\|installed\|available skills\|fallback' skills/oc-migration-ops/SKILL.md` -> no hits; skills/orchestrator.md:218 only says 'Read that skill's SKILL.md (it's in the available skills list)'.

**Proposed fix.** Add one line: 'If the target skill is not in the available skills list, perform the check inline and record the gap in next_actions.'

### skills/oc-migration-ops/SKILL.md:569 — Handoff verb `/oc-deploy prod` is not in oc-deploy-ops frontmatter `commands:`
*category:* routing · *independently reported 2×*

**Problem.** Active Chaining invokes `/oc-deploy staging` then `/oc-deploy prod`. oc-deploy-ops frontmatter lists only /oc-deploy, /oc-deploy staging, /oc-deploy audit; `prod` exists only in its body, so catalog/flag gating (`skills.command.<verb>.enabled`) and the plugin command surface never see it.

**Evidence.** skills/oc-security-auditor/SKILL.md:10-18 commands (/oc-security, /oc-secaudit, /oc-sec, /oc-threat-model, /oc-owasp, /oc-hardening, /oc-attack-surface, /oc-posture); body :62 and :337 document `/oc-security posture`.

**Proposed fix.** Invoke `/oc-posture` here, or add the `/oc-security <verb>` subcommands to oc-security-auditor `commands:`.

### skills/oc-migration-ops/SKILL.md:678 — Read-by table claims oc-deploy-ops / oc-code-auditor / oc-app-architect consume the migration checkpoint; none of them do
*category:* cross-skill-contract

**Problem.** SKILL.md:676-681 says oc-deploy-ops reads migration status for 'deploy confidence, cutover readiness', oc-code-auditor reads post-migration findings, oc-app-architect reads spec-update needs. A session handing cutover to `/oc-deploy prod` (:569) assumes deploy-ops gates on migration state; it does not, so the cutover-readiness gate implied here does not exist anywhere.

**Evidence.** `grep -n 'migration-ops\|oc-migrate' skills/oc-deploy-ops/SKILL.md` -> only :648 (a scope table row). oc-deploy-ops 'Reads from' table at :480-484 lists oc-code-auditor, oc-app-architect, oc-git-ops only. `grep -n 'migration' skills/oc-code-auditor/SKILL.md` and `skills/oc-app-architect/SKILL.md` -> no hits. Only oc-orchestrator (:896, :946) actually renders migration-ops state.

**Proposed fix.** Either add reciprocal 'Reads from oc-migration-ops' rows (and a cutover-readiness gate) in oc-deploy-ops, oc-code-auditor, oc-app-architect, or trim the Read-by table to oc-orchestrator and make migration-ops pass cutover readiness explicitly in the `/oc-deploy` handoff.

### skills/oc-migration-ops/SKILL.md:695 — `/oc-migrate diff` and `/oc-migrate history` output formats are delegated to migration-playbooks.md, which contains neither
*category:* executability · *independently reported 2×*

**Problem.** History 'reads `steps_verified` and `step_failures` from the checkpoint and lists each completed step with outcome, duration, and session number'. `steps_verified` is an int array and `step_failures[]` has only step/attempt/error/rollback (:624-627); 'When to Write' (:658) says timing is saved but no field is defined for it. A session cannot render duration/session number from the documented shape.

**Evidence.** `grep -n -i 'diff view\|/oc-migrate diff\|/oc-migrate history\|per-area' skills/oc-migration-ops/references/migration-playbooks.md` -> no hits; section headers (`grep -n '^## \|^### '`) list only migration-type playbooks, verification patterns, ecosystem templates, anti-patterns.

**Proposed fix.** Extend the step record (e.g. `steps[] {n, status, duration_min, session, verified_at}`) or drop duration/session from the history description.

### skills/oc-migration-ops/SKILL.md:735 — Parent ticket type `chore` / `epic` 'from .opchain/pm.yaml' - neither mapping exists in the canonical pm.yaml schema or the shipped example
*category:* cross-skill-contract

**Problem.** Step 1 of the parent + step-child mirror says the parent ticket type is `chore` or `epic` from `.opchain/pm.yaml` 'use epic mapping if available'. The pm.yaml contract owned by oc-integrations-engineer defines issue_types feature/bug/deploy/incident only, so a session reading pm.yaml finds neither key and has no documented default.

**Evidence.** skills/oc-integrations-engineer/SKILL.md:565-583 pm.yaml schema (issue_types: feature, bug, deploy, incident). `grep -n -i 'epic\|chore' .opchain/pm.yaml` -> none; same grep on oc-integrations-engineer SKILL.md and references/pm-mcp-protocol.md -> none.

**Proposed fix.** Either add `epic`/`chore` to the canonical issue_types in oc-integrations-engineer + .opchain/pm.yaml, or specify a fallback ('use issue_types.feature, or provider default Epic') here.

### skills/oc-migration-ops/SKILL.md:746 — PM parent/child ticket ids are recorded 'in the checkpoint' with no field named; protocol and oc-orchestrator expect `pm_refs`
*category:* checkpoint

**Problem.** SKILL.md:746-748 says to record parent + child ids in oc-migration-ops.checkpoint.json but never names `pm_refs` (or any field). The checkpoint protocol says 'Prefer pm_refs for anything a sibling skill needs to read' and oc-orchestrator `/oc-ops resume` searches `pm_refs` across checkpoints to render 'parent + 9 children'; ids dropped into skill_state are invisible to it. Lines 793-798 also rely on deploy-ops/monitoring-ops finding the migration parent.

**Evidence.** `grep -n pm_refs skills/oc-migration-ops/SKILL.md` -> no hits. skills/oc-checkpoint-protocol/SKILL.md:543-560 defines pm_refs with role `child`; :551-553 notes skills still record refs ad-hoc in skill_state. skills/oc-orchestrator/SKILL.md:896 shows `oc-migration-ops step 4/9 (parent + 9 children)` and :905-906 'Searches pm_refs across all skill checkpoints'.

**Proposed fix.** State explicitly: append the parent as `pm_refs[] role: source` and each step ticket as `role: child`, created_by_skill oc-migration-ops; keep step<->ticket map in skill_state.

### skills/oc-migration-ops/SKILL.md:803 — `/oc-migrate sync-pm` is not a frontmatter command and contradicts the canonical `--retry-pm` / `pm_deferred_actions[]` flush contract
*category:* cross-skill-contract

**Problem.** Failure-mode text says 'checkpoint records the intended transition; user can `/oc-migrate sync-pm` to flush'. The verb is absent from `commands:` (:10-24) and from the body command menu (:54-83), and the PM-MCP protocol this skill defers to (:727) defines the flush as a `--retry-pm` flag on every PM-aware verb reading a top-level `pm_deferred_actions[]` - neither is mentioned here.

**Evidence.** `grep -rn sync-pm skills/*/SKILL.md` -> only oc-migration-ops:803 and oc-scale-ops:492. skills/oc-integrations-engineer/references/pm-mcp-protocol.md:154-159 (`pm_deferred_actions`), :202-204 ('Every PM-aware verb accepts a `--retry-pm` flag').

**Proposed fix.** Replace `/oc-migrate sync-pm` with `--retry-pm` on `/oc-migrate execute|step|verify`, and say deferred writes go to `pm_deferred_actions[]`.

### skills/oc-modularize-ops/SKILL.md:287 — Chains-to table omits oc-security-auditor, which Phase 1 says is looped before fixtures hit disk
*category:* cross-skill-contract

**Problem.** Phase 1 (:172-173) says 'This phase **loops `oc-security-auditor`** to vet the capture before any fixtures are written to disk', a mandatory gate per the 1.7 plan's R1. The Cross-skill wiring 'Chains to' table (:287-292) lists only oc-migration-ops, oc-fleet-ops, oc-code-auditor, oc-git-ops. No oc-security-auditor verb is named for the vetting step either. Sections contradict each other and a session working from the table skips the PII gate.

**Evidence.** skills/oc-modularize-ops/SKILL.md:172 'This phase **loops `oc-security-auditor`** to vet the'; :287-292 table rows: oc-migration-ops, oc-fleet-ops, oc-code-auditor, oc-git-ops. grep -n -i modulariz skills/oc-security-auditor/SKILL.md → no matches.

**Proposed fix.** Add an `oc-security-auditor | vet fixture capture / PII redaction before Phase 1 writes fixtures` row and name the verb (e.g. `/oc-security attack-surface` or a data-handling review) so the loop is executable.

### skills/oc-modularize-ops/SKILL.md:335 — Checkpoint section omits next_actions, which the validator requires for in_progress checkpoints
*category:* checkpoint · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:170 (P1 — new skill checkpoint sections under-specified, oc-modularize-ops bullet at :183-188); docs

**Problem.** The PM section records parent + child ids in `skill_state.pm.{parent_ticket, module_tickets[]}` and never mentions pm_refs. The protocol's write pattern says every skill that touches a PM ticket appends to its own pm_refs array so downstream skills (oc-git-ops on sync, for one) can find the ticket without re-asking. The protocol itself notes skills still do this ad hoc.

**Evidence.** grep -n 'next_actions\|context_primer\|/checkpoint' skills/oc-modularize-ops/SKILL.md → no matches. scripts/checkpoint.mjs:250-255 'errors.push(`next_actions must be a non-empty array when status is "in_progress" (the next session reads next_actions[0] first)`)'. skills/oc-checkpoint-protocol/SKILL.md:150 '// === NEXT ACTIONS (required while status is in_progress — resume reads [0] first) ==='.

**Proposed fix.** Add a next_actions example per phase (e.g. after assess-gate: 'run /oc-modularize characterize') and a context_primer line to the Checkpoint section, and list `/checkpoint` in the UTILITIES block of the command reference.

### skills/oc-modularize-ops/SKILL.md:359 — Module object shape drifts between the Handoff contract and the Checkpoint section — image_hint never scheduled for writing
*category:* checkpoint · *independently reported 2×*

**Problem.** The Handoff contract (:307) defines a module as `{ id, seam_contract, owns_data[], image_hint, equivalence_verified }` and oc-fleet-ops maps `module.image_hint → image`. The Checkpoint example (:359-363) shows `{ id, seam_contract, owns_data, fixtures_captured, extracted, equivalence_verified }` — no image_hint — and the What-to-Save table (:367-374) never names an event that writes image_hint. A session following the Checkpoint section produces modules fleet-ops cannot seed images from.

**Evidence.** skills/oc-modularize-ops/SKILL.md:307 '`{ id, seam_contract, owns_data[], image_hint, equivalence_verified }`'; :360-362 '{ "id": "billing", "seam_contract": …, "owns_data": ["invoices","charges"], "fixtures_captured": true, "extracted": true, "equivalence_verified": true }'; :371 'Strategy chosen | `strategy`, per-module `seam_contract` + `owns_data`'. skills/oc-fleet-ops/SKILL.md:139 '(`module.id → container`, `module.image_hint → image`)'.

**Proposed fix.** Add image_hint to the checkpoint example and to the 'Strategy chosen' or 'Module extracted' row of the What-to-Save table; state one canonical module schema and reference it from both sections.

### skills/oc-monitoring-ops/SKILL.md:392 — AI-app template schedules 'oc-prompt-ops drift' — a verb absent from oc-prompt-ops's frontmatter commands (same for the /oc-audit pre-deploy reference)
*category:* routing

**Problem.** Eval-drift wiring says monitoring 'reuses `oc-prompt-ops drift`' and schedules it against the live model. The real spelling is `/oc-prompt drift`, and that verb exists only in oc-prompt-ops's body command menu; its frontmatter `commands:` lists just /oc-prompt, /oc-prompt eval, /oc-prompt diff, so the verb gate `skills.command.<verb>.enabled` and any router keyed on frontmatter cannot see it. Line 145 likewise cites oc-code-auditor's `/oc-audit pre-deploy`, which is body-only in oc-code-auditor (frontmatter: /oc-audit, /oc-audit full). The drift case is an active scheduled invocation, so it is the one that matters.

**Evidence.** SKILL.md:392 'reuses `oc-prompt-ops drift`'; :385 'scheduled `oc-prompt-ops` drift run'. skills/oc-prompt-ops/SKILL.md:11-13 frontmatter commands = /oc-prompt, /oc-prompt eval, /oc-prompt diff; :79 body '/oc-prompt drift  Re-run the frozen baseline...'. SKILL.md:145 '`/oc-audit pre-deploy`'; skills/oc-code-auditor/SKILL.md:11-12 frontmatter = /oc-audit, /oc-audit full; :41 body '/oc-audit pre-deploy'.

**Proposed fix.** Spell the invocation `/oc-prompt drift` at SKILL.md:385/392 and add `/oc-prompt drift` (and `/oc-audit pre-deploy`) to the respective frontmatter `commands:` lists so scripts/gen-skills-catalog.mjs and the flag registry cover them.

### skills/oc-monitoring-ops/SKILL.md:575 — Cross-Skill Reads tables disagree with the bundled orchestrator.md §2 row and with six peer skills that document a monitoring-ops contract this text never mentions
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** (a) Two 'Read by' rows are unreciprocated: oc-security-auditor (590) and oc-scale-ops (591) contain no reference to oc-monitoring-ops at all. (b) The shared protocol table lists reads-from = deploy-ops, data-ops, security-hardening and chains-to = '—', omitting the four other reads-from rows here (security-auditor, scale-ops, app-architect, code-auditor) and the oc-dash-forge / oc-prompt-ops chains at :80 and :392. (c) Six peers document inbound contracts absent from this text: oc-signal-forge hands `freshness_sla` to monitoring-ops to enforce (CHANGELOG says this landed in 1.7); oc-api-dev registers an SLO + drift-rule manifest and expects monitoring-ops to open a sunset incident; oc-release-ops says monitoring-ops tags first-24h incidents `post-release`; oc-compliance-ops reads audit-log + runbook artifacts; oc-fleet-ops chains to it; oc-migration-ops invokes `/oc-monitor setup` after cutover. None of `signal-forge`, `freshness_sla`, `api-dev`, `post-release`, `compliance`, `fleet`, `migration` occur in SKILL.md or its four non-bundled references.

**Evidence.** `grep -n -i 'monitoring-ops\|oc-monitor' skills/oc-security-auditor/SKILL.md skills/oc-scale-ops/SKILL.md` → no output. skills/orchestrator.md:132 header '| Skill | Reads checkpoints from | Chains to (invoke actively) |', :149 '| **oc-monitoring-ops** | oc-deploy-ops (what shipped), oc-data-ops (monitor inventory from `observe`), oc-security-hardening (detection controls handed off) | — |'. skills/oc-signal-forge/SKILL.md:207, 224-225, 252, 275; skills/CHANGELOG.md:375-377 'oc-dash-forge + oc-monitoring-ops — gain oc-signal-forge as the upstream ... monitoring-ops enforces each signal's freshness SLA'. skills/oc-api-dev/SKILL.md:372, 433, 548, 588. skills/oc-release-ops/SKILL.md:406. skills/oc-compliance-ops/SKILL.md:258. skills/oc-fleet-ops/SKILL.md:113, 275. skills/oc-migration-ops/SKILL.md:558, 570. `grep -rn -i 'signal-forge\|post-release\|freshness SLA\|api-dev\|compliance\|fleet' skills/oc-monitoring-ops/SKILL.md` → no output.

**Proposed fix.** Rebuild the Cross-Skill Reads section from the orchestrator.md §2 row plus the six inbound claims (add reads-from rows for oc-signal-forge freshness_sla, oc-api-dev SLO/drift manifest, oc-release-ops release window → `post-release` label, and read-by rows for oc-compliance-ops; add 'Invoked by' rows for oc-deploy-ops, oc-fleet-ops, oc-migration-ops, oc-app-architect:558, oc-data-ops:182); delete or substantiate the oc-security-auditor / oc-scale-ops read-by rows; update orchestrator.md:149 to match and re-run scripts/sync-skill-bundles.mjs.

### skills/oc-monitoring-ops/SKILL.md:675 — PM incident flow reads oc-deploy-ops's private skill_state (pm.deploy_tickets[]) — violates the checkpoint-protocol privacy rule
*category:* checkpoint

**Problem.** Step 4 of 'On alert fire' tells the session to read `oc-deploy-ops.checkpoint.json` `skill_state.pm.deploy_tickets[]` to parent-link the incident to the latest deploy ticket; line 657 also pulls 'deploys in last 2h from deploy-ops checkpoint' and the Cross-Skill Reads row (579) lists 'deploy history'. oc-deploy-ops keeps all of that only in skill_state (deploy tickets at :768; prod_version/last_deploy at :466-474) and documents no deploy-history list or pm_refs entry. The protocol says sibling skill_state is opaque and must not be read; the sanctioned cross-skill surface is pm_refs.

**Evidence.** SKILL.md:673-675 'read from `oc-deploy-ops.checkpoint.json` `skill_state.pm.deploy_tickets[]`'; :657 '{list-of-deploys-in-last-2h-from-deploy-ops-checkpoint}'. skills/oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill'; :551-553 'Prefer `pm_refs` for anything a *sibling* skill needs to read; keep skill-private PM bookkeeping in `skill_state`'; :725 'Private state stays private.' oc-deploy-ops/SKILL.md:767-768 records deploy tickets in `skill_state.pm.deploy_tickets[]`; :464-474 skill_state template has no deploy history.

**Proposed fix.** Have oc-deploy-ops mirror deploy tickets into top-level `pm_refs[]` (kind: deploy, env, version, ticket id) and change SKILL.md:657/675 to read `oc-deploy-ops.checkpoint.json#pm_refs` + `progress_table`; drop 'deploy history' from :579 or point it at pm_refs.

### skills/oc-monitoring-ops/SKILL.md:703 — pm.yaml.remediation_owners is consumed here but defined nowhere in the PM-MCP contract
*category:* cross-skill-contract

**Problem.** The postmortem back-reference assigns each remediation sub-ticket 'to the owning team's default assignee (from `pm.yaml.remediation_owners` map)'. That key appears in no pm.yaml example, not in pm-mcp-protocol.md, and not in the validator's required-key list, so a session has no schema for it and the protocol's rule 5 ('resolve via .opchain/pm.yaml') cannot be satisfied. The sibling keys this section uses — `issue_types.incident` (669) and `labels_default` (672) — are defined.

**Evidence.** `grep -rn remediation_owners skills/ scripts/validate-pm-mcp.mjs docs/` → only skills/oc-monitoring-ops/SKILL.md:703. skills/oc-integrations-engineer/SKILL.md:567-581 pm.yaml example keys: provider, team_or_project, issue_types{feature,bug,deploy,incident}, states, labels_default, mcp_server. skills/oc-integrations-engineer/references/pm-mcp-protocol.md:266 validator requires provider, team_or_project, issue_types, states.

**Proposed fix.** Add `remediation_owners: { <team>: <assignee-id> }` to the pm.yaml example in oc-integrations-engineer/SKILL.md and a field row in pm-mcp-protocol.md (optional; fallback = incident ticket assignee), or change :703 to assign to the incident's assignee.

### skills/oc-orchestrator/SKILL.md:10 — Seven body verbs are missing from frontmatter `commands:`, so the generated MCP/skills catalogs never advertise them
*category:* generated-surface · *independently reported 2×*

**Problem.** Frontmatter lists 11 commands (:10-21). The body documents and the 'What's wired' note (:87-96) explicitly names `/oc-ops unregister` (:68), `/oc-ops health` (:79), `/oc-ops skills` (:80), `/oc-ops resume` (:907), `/oc-ops ticket` (:904-905), `/oc-ops pm-status` (:933) and `/oc-ops status --fresh` (:389). The frontmatter array is what gen-mcp-catalog and gen-skills-catalog read, so MCP clients and /skills.json see none of the PM verbs the shortDesc (:6) advertises.

**Evidence.** site/src/content.config.ts:54-57 '`tryable` was used by the now-removed Try-It chat. Kept on the schema ...'; `grep -rn tryable scripts/*.mjs src/lib/*.js` -> no consumer; CLAUDE.md 'API Routes' notes /api/try/start and /api/try/chat now return 410.

**Proposed fix.** Add the six real subcommands to frontmatter `commands:` (drop `--fresh` with the cache section), keeping the `oc-ops` verb so the flag-registry check (src/lib/flags/registry.js:288) still passes.

### skills/oc-orchestrator/SKILL.md:324 — Registration flow and four other passages still say state lives in memory_user_edits / memory / session files, contradicting the Persistence Model
*category:* docs-drift · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 item 2 (says 'four sites'; there are six); docs/audits/2026-07-04-portability-audit.md:

**Problem.** Lines 213-218 declare there is NO memory_user_edits and NO ~/.opchain/ session file and that any such reference is stale. Yet Registration Flow step 7 says `Write to memory_user_edits` (:324), Design Constraint 1 says state persists 'via memory (registry) and session files' (:185-186), Cold Start keys on 'no memory edit' (:334), Cross-Project Priority says override 'by editing the memory edit directly' (:496-497), Principle 1 repeats 'lives in memory (registry) and session files (cache)' (:984), and Principle 4 says 'default_project (memory)' (:990).

**Evidence.** sed -n '213,218p;324p;185,186p;334p;496,497p;984p;990p' skills/oc-orchestrator/SKILL.md shows all seven passages; the only persistence the skill has is skill_state in the tracked checkpoint (:205-209, :700-703).

**Proposed fix.** Replace every memory/session-file phrase with 'skill_state in .checkpoints/oc-orchestrator.checkpoint.json' (six sites, not the four the v2.0 plan counts).

### skills/oc-orchestrator/SKILL.md:382 — Scan Caching section describes a session cache and `--fresh` flag that the Persistence Model says do not exist
*category:* docs-drift · *independently reported 2×*

**Problem.** Lines 382-390 specify a 'session cache' (full scan on first invocation, reuse unless >5 min stale, `/oc-ops status --fresh` forces re-scan, dispatch invalidates the cache) and :685 says routing_history lives 'in the session cache'. Lines 222-223 state 'there's no separate cache layer to keep warm or invalidate' and :724-725 say scan_summary is 're-derived by re-running node scripts/checkpoint.mjs status, never trusted as a cache'. `--fresh` appears nowhere else and is not a frontmatter command.

**Evidence.** scripts/checkpoint.mjs:661-663 `const st = data.skill_state || {}; for (const key of Object.keys(st)) { if (/merged|shipped|completed|done/i.test(key)) harvestTokens(JSON.stringify(st[key]), toks); }`; skills/oc-checkpoint-protocol/SKILL.md:376 'Never read skill_state — it's private to the owning skill'.

**Proposed fix.** Qualify :380 to 'do not interpret skill_state; the shared CLI may scan it for drift tokens only', and mirror that carve-out in the protocol.

### skills/oc-orchestrator/SKILL.md:444 — Claim that `checkpoint.mjs next` and `/oc-ops next` 'never diverge' is false: the CLI tie-breaks by recency, the prose by pipeline order
*category:* gate-reality · *independently reported 2×*

**Problem.** oc-orchestrator:444-447 says 'This exact hierarchy is encoded in scripts/checkpoint.mjs ... so the two never diverge' and :452-464 defines the tie-breaker as canonical pipeline order (reverse-spec → app-architect → git-ops → deploy-ops). checkpoint.mjs pickNext sorts `(a.rank - b.rank) || (a.over - b.over) || (b.t - a.t)` — over-budget first, then most-recent updated_at — and has no pipeline-order concept. The orchestrator's six-level hierarchy (:434-441) has no slot for `status: blocked` without a user_decision blocker; code ranks it 2 alongside failed (:427). A session doing /oc-ops next by hand and one running `checkpoint next` will pick different items on ties.

**Evidence.** scripts/checkpoint.mjs:445-455 `.sort((a, b) => (a.rank - b.rank) || (a.over - b.over) || (b.t - a.t))`; `grep -n -i pipeline scripts/checkpoint.mjs` returns no lines. The v2.0 plan (§3 row at :609) plans to document a 'rank → budget → trend → pipeline order → cross-project' chain without changing the CLI, which would preserve the divergence.

**Proposed fix.** Either implement pipeline-order tie-break in pickNext (after over-budget) or rewrite oc-orchestrator:452-464 to 'ties break on over-budget, then most recent updated_at' and add the blocked-without-decision rank-2 row to :434-441.

### skills/oc-orchestrator/SKILL.md:458 — Pipeline-order tie-breaker list omits oc-monitoring-ops, oc-release-ops and every v1.9 skill present in the canonical pipeline map
*category:* routing

**Problem.** The 'canonical pipeline' used as the priority tie-breaker (:458-465) lists 9 skills; the canonical map the skill says it follows (references/orchestrator.md §2) ends the main line at oc-monitoring-ops and places oc-release-ops between oc-git-ops and oc-deploy-ops, plus oc-security-auditor, oc-qa-ops, oc-security-hardening, oc-compliance-ops. The pipeline-complete example (:826) likewise ends at oc-deploy-ops. 24 of 33 skills have no defined tie-break position.

**Evidence.** skills/orchestrator.md:68 `oc-reverse-spec ──► oc-app-architect ──► oc-git-ops ──► oc-deploy-ops ──► oc-monitoring-ops`, :69-72 oc-release-ops placement, :97-108 quality/assurance tiers, :675 'Pipeline flow: ... → oc-monitoring-ops'; SKILL.md:458-465 has none of these.

**Proposed fix.** Replace the local list with a pointer to references/orchestrator.md §2 or regenerate it from that map at the next bundle sync.

### skills/oc-orchestrator/SKILL.md:519 — Skill-local routing table drifts from the bundled orchestrator.md table it claims to operationalize (7 rows missing, not 4)
*category:* routing · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 item 1 (deferred to Sprint 2; states 'four rows')

**Problem.** Lines 520-521 say the Router Engine 'operationalizes the routing table currently in orchestrator.md', but the local table (:525-540) has no rows for oc-bug-check, oc-api-dev, oc-release-ops, oc-qa-ops, oc-data-ops, oc-compliance-ops or oc-security-hardening, all present in the bundled copy. Three of those (oc-bug-check, oc-api-dev, oc-release-ops) predate v1.9, so the §4.4 register's 'four v1.9 rows' description undercounts the drift. A session routing 'cut a release' or 'SOC 2 evidence' from this table falls to the no-match path.

**Evidence.** skills/orchestrator.md:279 (oc-bug-check /oc-bugcheck), :285 (oc-api-dev /oc-api design), :289 (oc-release-ops /oc-release plan), :290 (oc-qa-ops /oc-qa pyramid), :291 (oc-data-ops /oc-data-ops design), :292 (oc-compliance-ops /oc-comply scope), :293 (oc-security-hardening /oc-harden baseline); none appear in SKILL.md:525-540.

**Proposed fix.** Backfill all seven rows (plus oc-security-auditor, oc-monitoring-ops, oc-migration-ops which neither table has) or replace the local table with 'see references/orchestrator.md §3 routing table' so there is one copy.

### skills/oc-orchestrator/SKILL.md:645 — Health check runs `node scripts/sync-bundles:check`, a path that does not exist
*category:* executability · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:537 '[oc-orchestrator] Malformed health-check command `node scripts/sync-bundles:check` fails everywhere' 

**Problem.** The Skill Health Check bash block's step 3 says the bundle-sync leg is verified by `node scripts/sync-bundles:check`. There is no `scripts/sync-bundles` file; `sync-bundles:check` is an npm script name (package.json → `node scripts/sync-skill-bundles.mjs --check`). Run as written it exits MODULE_NOT_FOUND, so the health check's 'references in sync' row can never be produced honestly. Confirmed open in the 2026-07-04 portability audit; still unfixed at v1.9.0.

**Evidence.** skills/oc-orchestrator/SKILL.md:644-645: "# 3. references/orchestrator.md + references/checkpoint-protocol.md are present\n#    and in sync:  node scripts/sync-bundles:check". `ls scripts/ | grep sync-bundles` → nothing; `sync-skill-bundles.mjs` exists; package.json has `sync-bundles:check`. oc-repo-ops/SKILL.md:125 uses the correct `npm run sync-bundles:check`.

**Proposed fix.** Change to `npm run sync-bundles:check` (or `node scripts/sync-skill-bundles.mjs --check`) and add the same caveat the surrounding text already gives for checkpoint.mjs: this exists only in the opchain repo.

### skills/oc-orchestrator/SKILL.md:729 — oc-orchestrator's documented skill_state (registry/active_project/scan_summary/routing_history) does not exist in the live checkpoint; Session Start step 1 reads a key never written
*category:* live-checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md 0.5 (sandbox project_dir) — adjacent; v2.0 plan §4.4 row 2 (memory_user_edits) — adjacent

**Problem.** oc-orchestrator:702-722 defines `skill_state.registry / active_project / last_scan / scan_summary / routing_history` as the tracked state, :729 makes reading `skill_state.registry` step 1 of every session, and :769-780 says /checkpoint summarizes the registry. The live `.checkpoints/oc-orchestrator.checkpoint.json` skill_state has none of those keys (it holds session logs and six reconciliation blobs) and has been `complete` since 2026-06-22 (81d). A session following the SKILL.md finds no registry, cannot tell whether the file is corrupt or cold, and the /checkpoint summary format is unproducible.

**Evidence.** node read of .checkpoints/oc-orchestrator.checkpoint.json → skill_state keys `['active_branches','merged_prs_this_session','direct_to_main_commits_this_session','linear_active_parents',...,'reconciliation_2026_06_22']`, `registry? false`; skills/oc-orchestrator/SKILL.md:729 `1. Read .checkpoints/oc-orchestrator.checkpoint.json → skill_state.registry.`; doctor: `⚠ [oc-orchestrator] marked complete but last updated 81d ago`.

**Proposed fix.** Either write a real `skill_state.registry` (this repo as the single project) and rotate the reconciliation blobs to history/, or change oc-orchestrator:729 to 'if skill_state.registry is absent, treat as cold start'.

### skills/oc-orchestrator/SKILL.md:730 — Several skills hard-require scripts/checkpoint.mjs on user projects despite the protocol's CLI-optional stance; oc-orchestrator contradicts itself within 230 lines
*category:* executability

**Problem.** Protocol:281-286 and :392-399 say the CLI exists only in the opchain repo and a missing CLI is never a reason to skip. oc-orchestrator:134 agrees ('do not assume scripts/checkpoint.mjs was copied into the project') but :365 marks `( cd {project.path} && node scripts/checkpoint.mjs status )` as 'Preferred' for every registered project and :730-734 runs `node scripts/checkpoint.mjs status` per registered path and `init` on any project lacking .checkpoints/. oc-reverse-spec:306 makes `node scripts/checkpoint.mjs show oc-reverse-spec` step 1 of resume with no file-tool fallback, and :309 always asks 'Continue from here, restart, or show' contrary to protocol:219-221 (in_progress and not stale → continue automatically). oc-git-ops:490-493 gives only the CLI form for the merged_prs restamp; oc-deploy-ops:178/:192 as above.

**Evidence.** skills/oc-orchestrator/SKILL.md:365 `( cd {project.path} && node scripts/checkpoint.mjs status )` under `# Preferred`; :730 `scan each path (node scripts/checkpoint.mjs status)`; :733 `run node scripts/checkpoint.mjs init first`; :134 `do not assume scripts/checkpoint.mjs was copied`; skills/oc-reverse-spec/SKILL.md:306 `1. Check for checkpoint: node scripts/checkpoint.mjs show oc-reverse-spec`; :309 `Ask: "Continue from here, restart, or show full checkpoint?"`; skills/oc-git-ops/SKILL.md:490; protocol:281-286.

**Proposed fix.** Add the 'if scripts/checkpoint.mjs is absent, read/write .checkpoints/<skill>.checkpoint.json directly' fallback at oc-orchestrator:365/:730-734, oc-reverse-spec:306, oc-git-ops:490, oc-deploy-ops:178/192; align oc-reverse-spec:309 with the protocol's auto-continue rule.

### skills/oc-orchestrator/SKILL.md:918 — `/oc-git-sync --refresh` is recommended but oc-git-ops documents no such flag
*category:* cross-skill-contract

**Problem.** The /oc-ops resume example tells the user to 'Run `/oc-git-sync --refresh` to update'. oc-git-ops has /oc-git-sync but no `--refresh`; its only documented flag is `--retry-pm` (which :944 uses correctly).

**Evidence.** grep -n -- '--refresh' skills/oc-git-ops/SKILL.md -> no match; skills/oc-git-ops/SKILL.md:638 `### /oc-git-sync --retry-pm flush` is the only `--` flag.

**Proposed fix.** Change the example to `/oc-git-sync` (or `/oc-pr` status) or add `--refresh` to oc-git-ops if the behaviour is wanted.

### skills/oc-prompt-ops/SKILL.md:47 — The advertised 'live instance of this layout' prompts/opchain-eval/ does not follow the documented layout — flat, no eval/ subdir, no versioned prompt.md, no CHANGELOG.md, no baseline.json
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:547 (repo-only directory) and v2.0 plan :706 (no runner) cover adjacent facts; the layout mismatch itself 

**Problem.** SKILL.md:46-50 and :170-171 call prompts/opchain-eval/ the live instance of the layout at :96-99 / :130-140 (prompts/<name>/eval/{inputs,expected,eval.yaml,baseline.json} plus prompts/<name>/vX.Y.Z/prompt.md and CHANGELOG.md); prompt-versioning.md:28-29 adds 'the prompt under test is opchain's own model-routing prompt'. On disk prompts/opchain-eval/ holds only README.md, inputs.jsonl, expected.jsonl, eval.yaml at the top level — no eval/ subdir, no v*/ dir, no prompt.md anywhere under prompts/, no CHANGELOG.md, no baseline.json — and eval.yaml:9-13 calls that flat shape 'the canonical oc-prompt-ops goldset shape'. A session following the layout would look for prompts/opchain-eval/eval/inputs.jsonl and a prompt.md that does not exist, and /oc-prompt regress|drift|diff on the live instance has no prompt text and no baseline to compare.

**Evidence.** find prompts -type f → prompts/opchain-eval/{README.md,expected.jsonl,inputs.jsonl,eval.yaml}. find prompts -name prompt.md -o -name CHANGELOG.md -o -name baseline.json -o -type d -name eval -o -type d -name 'v*' → no output.

**Proposed fix.** Either restructure to prompts/opchain-eval/eval/ + v1.0.0/prompt.md (the routing prompt = the description/orchestrator routing surfaces, or a pointer) + CHANGELOG.md + a frozen baseline.json, or state in SKILL.md:46-50 and prompt-versioning.md:28-29 that the live instance is eval-files-only and flat.

### skills/oc-prompt-ops/SKILL.md:346 — Cost-regression gate has two claimed runners: this skill says oc-cost-ops runs it; oc-cost-ops and orchestrator.md say oc-prompt-ops runs it
*category:* cross-skill-contract

**Problem.** SKILL.md:346 '`oc-cost-ops` runs a **cost-regression gate beside this skill's score gate**', :365 'oc-cost-ops owns the budget + cost-regression gate', :382 same. oc-cost-ops/SKILL.md:107-108 'Downstream: `oc-prompt-ops` runs the **cost-regression gate** beside its score gate', and orchestrator.md:156 lists oc-cost-ops chaining TO 'oc-prompt-ops (cost-regression gate)'. budget-gates.md:64-67 says `/oc-cost gate` emits the verdict but names no invoker. Each side assigns the run to the other, so nobody is told to invoke /oc-cost gate on a prompts/ PR.

**Evidence.** sed -n '346p;365p;382p' skills/oc-prompt-ops/SKILL.md; sed -n '107,108p' skills/oc-cost-ops/SKILL.md → 'Downstream: `oc-prompt-ops` runs the **cost-regression gate**'; sed -n '156p' skills/orchestrator.md → chains-to column 'oc-prompt-ops (cost-regression gate)'.

**Proposed fix.** Pick one: either this skill's regress step invokes /oc-cost gate (add it to the :241-244 sequence and a chains_to row) or oc-cost-ops:108 and orchestrator.md:156 are reworded to 'oc-cost-ops runs /oc-cost gate beside oc-prompt-ops's /oc-prompt regress'.

### skills/oc-prompt-ops/SKILL.md:380 — Claims oc-agent-forge and oc-rag-forge run their goldsets through /oc-prompt eval; both siblings say they run their own suites side by side
*category:* cross-skill-contract · *independently reported 3×* · *known:* docs/audits/2026-07-04-portability-audit.md:542 (cross-skill section purely descriptive; the specific contradiction is not registered)

**Problem.** SKILL.md:380 says oc-agent-forge's 'agent goldset runs through `/oc-prompt eval` rather than a bespoke runner' and :114-115 says both siblings 'run their own goldsets *through* this skill's eval runner rather than reinventing one'. oc-agent-forge/SKILL.md:441 says 'Agent Forge evals the *agent trajectory*; prompt-ops evals one prompt' and :460 'Agent Forge's fixture suite is the *trajectory* analogue; the two regression suites run side by side'. oc-rag-forge/SKILL.md:428 says the same for its retrieval goldset. A session in this skill would expect an agent/RAG goldset to arrive at /oc-prompt eval; neither sibling sends one.

**Evidence.** grep -n 'through `/oc-prompt eval`\|through\* this skill' skills/oc-prompt-ops/SKILL.md → 115, 380. sed -n '441p;460p' skills/oc-agent-forge/SKILL.md → 'Agent Forge evals the *agent trajectory*; prompt-ops evals one prompt' / 'Agent Forge's fixture suite is the *trajectory* analogue; the two regression suites run side by side'. sed -n '428p' skills/oc-rag-forge/SKILL.md → 'RAG Forge's goldset is the *retrieval* analogue; the two regression suites run side by side'.

**Proposed fix.** Reword SKILL.md:113-117, :363-364, :380-381 and the Read-by rows :448-449 to match the siblings: prompt-ops owns single-prompt / generation-prompt evals; agent-forge (trajectory fixtures) and rag-forge (retrieval goldset) run their own suites side by side. If shared-runner consumption is intended, add the reciprocal statement to oc-agent-forge and oc-rag-forge in the same PR.

### skills/oc-prompt-ops/SKILL.md:422 — Checkpoint section omits the eval_scores top-level field the protocol says this skill co-owns, and every artifact it offers siblings lives only in private skill_state
*category:* checkpoint

**Problem.** oc-checkpoint-protocol/SKILL.md:660 names `eval_scores` owners as oc-bug-check, oc-code-auditor, oc-prompt-ops and shows the entry `{ "rubric": "oc-prompt-ops", "score": 0.93, "max": 1 }` (:667). This skill never mentions eval_scores; pass_rate is written only to skill_state.last_eval (:422-427) and the drift verdict to skill_state.last_drift (:428-433). The Read-by rows (:447-451) promise siblings the drift signal, the frozen baseline, and per-eval token counts, but the protocol rule (:376 'Never read skill_state — it's private') means no sibling may read any of it, and token counts have no documented field at all. Additionally skill_state.cost (:434) reuses the wire-1.1 top-level `cost` key name with a different shape (:637-657).

**Evidence.** grep -n 'eval_scores' skills/oc-prompt-ops/SKILL.md → no output. sed -n '660p;667p' skills/oc-checkpoint-protocol/SKILL.md → owners list includes oc-prompt-ops; example rubric 'oc-prompt-ops'. sed -n '376p' skills/oc-checkpoint-protocol/SKILL.md → 'Never read `skill_state` — it's private to the owning skill'.

**Proposed fix.** Add an 'appends to top-level eval_scores' line to When-to-Write (Eval runs / Drift run rows) with the protocol's {rubric:'oc-prompt-ops', score, max:1, ref:<scorecard>} shape; surface last_drift verdict + baseline in progress_table/context_primer; rename the private bag to eval_cost or drop it (cost_per_eval already lives in eval.yaml).

### skills/oc-prompt-ops/SKILL.md:443 — Cross-Skill Reads names oc-app-architect as producer of 05-llm-design.md; oc-app-architect never produces it and its 05 slot is 05-monetization.md
*category:* cross-skill-contract

**Problem.** SKILL.md:443 reads '`05-llm-design.md` — which prompts an app ships' from oc-app-architect. grep for 05-llm-design across skills/ hits only this skill and oc-claude-api; oc-app-architect's numbered spec set is 00-project-overview … 05-monetization.md … 09-cost-estimate.md, and its :204 row says the oc-claude-api output 'folds into `02-architecture.md` and a new `11-ai-architecture.md`'. oc-claude-api:62,75 says it writes 05-llm-design.md itself. A session following :443 would look in oc-app-architect's spec output and find monetization in the 05 slot.

**Evidence.** grep -rn '05-llm-design' skills/ --include='*.md' | grep -v 'references/orchestrator.md\|references/checkpoint-protocol.md' → oc-prompt-ops/SKILL.md:443, oc-claude-api/SKILL.md:62,75,281 only. grep -n -o '0[0-9]-[a-z-]*\.md' skills/oc-app-architect/SKILL.md → 05-monetization.md at :251, no 05-llm-design. grep -rn '05-llm-design' docs/ specs/ site/src src/ sprints/ roadmap/ → no output.

**Proposed fix.** Change the producer to oc-claude-api (or to oc-app-architect's `11-ai-architecture.md`) once the three AI-native skills agree on one filename; fix oc-claude-api's 05-llm-design.md name collision in the same PR.

### skills/oc-qa-ops/SKILL.md:31 — Scope carve-out names `/oc-audit test-bootstrap`, absent from oc-code-auditor's frontmatter
*category:* routing

**Problem.** The description routes untested codebases to `/oc-audit test-bootstrap`; oc-code-auditor's frontmatter declares only `/oc-audit` and `/oc-audit full`.

**Evidence.** skills/oc-qa-ops/SKILL.md:31 `/oc-audit test-bootstrap for untested codebases`; skills/oc-code-auditor/SKILL.md:11-12 `- /oc-audit` / `- /oc-audit full`; body :51 and :374 `## Test Bootstrap (`/oc-audit test-bootstrap`)`.

**Proposed fix.** Declare `/oc-audit test-bootstrap` in oc-code-auditor's frontmatter commands.

### skills/oc-qa-ops/SKILL.md:122 — oc-integrations-engineer is assigned contract-test ownership but is missing from the Cross-Skill Reads tables and has no reciprocal
*category:* cross-skill-contract

**Problem.** The contracts table and manifest `owner` enum route third-party boundary tests to oc-integrations-engineer, yet the skill's own Reads-from / Read-by tables, the orchestrator.md pipeline-map row, and oc-integrations-engineer's own tables all omit the relationship — a session in oc-integrations-engineer has no way to learn rows are waiting for it.

**Evidence.** skills/oc-qa-ops/SKILL.md:122 `QA Ops plans; oc-integrations-engineer builds`; references/qa-manifest.md:55 owner enum and :82 `oc-integrations-engineer for consumed third-party boundaries`; Cross-Skill Reads :195-209 contain no oc-integrations-engineer row; skills/orchestrator.md:152 oc-qa-ops row lists neither; skills/oc-integrations-engineer/SKILL.md:664-676 (Reads from / Read by) has no oc-qa-ops row.

**Proposed fix.** Add oc-integrations-engineer to the Read-by table (and orchestrator.md:152), and add a reciprocal `oc-qa-ops | contract-matrix rows with owner: oc-integrations-engineer` row to oc-integrations-engineer's Reads-from table.

### skills/oc-qa-ops/SKILL.md:133 — Contract-row remediation names `/oc-api build`, which oc-api-dev's frontmatter does not declare
*category:* routing

**Problem.** The ownerless-row failure mode tells the user to run `/oc-api test` (declared) or `/oc-api build` (body-only in oc-api-dev).

**Evidence.** skills/oc-qa-ops/SKILL.md:133 `(or `/oc-api build`)`; skills/oc-api-dev/SKILL.md:11-20 frontmatter lists design/spec/scaffold/lint/test/version/deprecate/sdk/docs — no `build`; body :58 `/oc-api build  Scaffold + conformance loop` and :261 `## Phase 2: Build Loop (`/oc-api build`)`.

**Proposed fix.** Add `/oc-api build` to oc-api-dev's frontmatter commands (it is a documented phase entry point), or drop the parenthetical here.

### skills/oc-qa-ops/SKILL.md:182 — Load-plan handoff signal is documented inside private skill_state, which the protocol says siblings must not read
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** The repo's own oc-qa-ops checkpoint has zero of the documented skill_state keys and instead holds a release test-execution ledger (verdict PASS, tests_passed 579, live_acceptance, verified_runtime_sha) — the activity :28 and :47-49 say this skill does NOT own. Its phase is `verify` (documented example: `strategy`), and there is no `last_audit`, so `/oc-qa status` (:65, 'last audit verdict') has nothing to read even though .opchain/qa.yaml:1 claims `/oc-qa audit` generated it.

**Evidence.** .checkpoints/oc-qa-ops.checkpoint.json skill_state keys: strategy, verdict, test_files, tests_passed, pre_merge_steps, warnings, failures, live_acceptance_pending_release_ops, live_acceptance, verified_runtime_sha; `"phase": "verify"`; documented keys at SKILL.md:183-188 (manifest_path, pyramid_declared, coverage_budget, contract_matrix_count, load_plan, last_audit); SKILL.md:28 `NOT test execution (oc-bug-check)`; .opchain/qa.yaml:1 `Generated by oc-qa-ops /oc-qa pyramid + /oc-qa audit`.

**Proposed fix.** Rewrite the live checkpoint to the documented shape (pyramid_declared, contract_matrix_count: 6, last_audit with sha/date/gaps) and move the execution ledger to oc-bug-check / oc-release-ops checkpoints; or, if the skill is meant to record release QA verdicts, document that in SKILL.md.

### skills/oc-rag-forge/SKILL.md:289 — oc-stack-forge never mentions vector-db packs, has no provisioning verb, and its checkpoint has no vector-DB field the Builder can read
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:562 (chaining-gap: Builder hard-depends on the oc-stack-forge checkpoint with no absent-fallback) — still 

**Problem.** Step 2 says 'Builder reads the chosen vector-DB pack from the oc-stack-forge checkpoint' (:289) and the skill repeatedly says 'RAG Forge selects; stack-forge provisions + emits the client config' (:182-183, :409, :426). oc-stack-forge documents none of this: no vector-db dispatch, no verb, no checkpoint field, no Read-by row for oc-rag-forge. A session following :289 looks for state oc-stack-forge never writes.

**Evidence.** grep -n -i 'vector\|rag-forge\|oc-rag' skills/oc-stack-forge/SKILL.md -> 0 hits; its commands are /oc-stack, /oc-stack-decide, /oc-feature; skill_state :459-474 holds stack_path/decisions (platform, backend, database, auth, frontend) with no vector-db key; Read-by :483-488 omits oc-rag-forge. The four packs do exist (packs/{pgvector,turbopuffer,pinecone,supabase-vectors}/pack.yml) and packs/_schema.json:27 says they 'are leaf nodes selected by oc-rag-forge; they carry no adapter-graph edges'.

**Proposed fix.** Pick one side: (a) add a `kind: vector-db` dispatch section + checkpoint field + Read-by row to oc-stack-forge, or (b) reword oc-rag-forge to read `skills/oc-stack-forge/packs/<id>/vector.md` directly, record `stack_forge_pack` itself (it already does at :457), and add the audit's 'if the oc-stack-forge checkpoint is absent, gather the platform from the user and proceed standalone' fallback.

### skills/oc-rag-forge/SKILL.md:347 — oc-rag-forge's Evaluator gates on an 'answer relevance' target that no normative section declares and the checkpoint cannot carry
*category:* threshold-drift · *surfaced by the executability lens*

**Problem.** The Evaluator's report table gates five metrics, including `| answer relevance | 0.88 | >= 0.85 | PASS |` (:347). The skill's authoritative Metric Targets block declares only four — recall@10, MRR, nDCG@10, faithfulness (:274-278) — and the checkpoint `targets` object carries the same four (:463 `"targets": { "recall_at_10": 0.90, "mrr": 0.75, "ndcg_at_10": 0.80, "faithfulness": 0.95 }`). references/retrieval-eval.md defines metrics but declares no answer-relevance threshold. So the Evaluator can FAIL a round on a threshold the Designer was never told to declare, that the user never approved, and that no checkpoint field records for the next round's delta comparison.

**Evidence.** skills/oc-rag-forge/SKILL.md:347 `| answer relevance | 0.88 | ≥ 0.85 | PASS |`; :274-278 `### Metric Targets (from Designer)` listing recall@10 / MRR / nDCG@10 / faithfulness only; :463 checkpoint `targets` object with the same four keys; grep of skills/oc-rag-forge/references/retrieval-eval.md for a relevance threshold -> none.

**Proposed fix.** Add `- answer relevance >= 0.85 (end-to-end)` to the Metric Targets block at :278 and `"answer_relevance": 0.85` to the checkpoint targets at :463, or drop the row from the Evaluator report table.

### skills/oc-rag-forge/SKILL.md:436 — Checkpoint section never points at the bundled envelope (references/checkpoint-protocol.md)
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:294 (CONFIRMED, checkpoint-write-gap) — still open

**Problem.** Checkpoint Integration (:436-470) gives a path, an event table, and a skill_state payload, and :246 says 'Write checkpoint: phase designed', but nothing tells the model where the envelope schema (skill/phase/status/updated_at/next_actions) is. The bootstrap chain does not reach it either.

**Evidence.** grep -c checkpoint-protocol skills/oc-rag-forge/SKILL.md -> 0. orchestrator.md §5 (:298-320) covers discovery only and never cites references/checkpoint-protocol.md (grep 'checkpoint-protocol' skills/orchestrator.md -> :84, :147, :658, all skill-name mentions). Only 3 of 33 SKILL.md files cite references/checkpoint-protocol.md.

**Proposed fix.** Add one line under Checkpoint Location: 'Envelope + write mechanics: read `references/checkpoint-protocol.md` before the first write (create `.checkpoints/` if absent).'

### skills/oc-rag-forge/SKILL.md:477 — Cross-skill reads and read-by rows can only be satisfied by reading skill_state, which the protocol forbids
*category:* checkpoint · *independently reported 3×*

**Problem.** The data this skill says it reads from siblings lives only in their skill_state (oc-stack-forge decisions, oc-claude-api model_routing), and the data it says siblings read from it (frozen config, last_eval metrics) lives only in its own skill_state — no shareable top-level field is written. Following the text requires violating the 'skill_state is private' rule in both directions.

**Evidence.** oc-agent-forge/SKILL.md:517 'Reads from oc-rag-forge: Retrieval config to wire as a tool'. oc-app-architect/SKILL.md:217-218 'Each invoked skill writes its own checkpoint; app-architect reads them back to assemble the AI sections of the spec'. oc-prompt-ops/SKILL.md:449 'Read by oc-rag-forge: Eval harness contract for scoring the generation prompt' and :381 'Consumes the same eval harness for its generation prompt' — oc-rag-forge:428 only says the two suites 'run side by side' and its Reads-from omits oc-prompt-ops. oc-rag-forge never mentions oc-agent-forge (grep -> 0).

**Proposed fix.** Read oc-claude-api's `05-llm-design.md` (oc-claude-api/SKILL.md:61, 79) instead of its checkpoint; publish the frozen config + last verdict in `context_primer`/`progress` (or adopt `eval_scores` for recall/MRR/nDCG/faithfulness) so oc-deploy-ops/oc-monitoring-ops have a legal field to read; state that explicitly in the Cross-Skill Reads tables.

### skills/oc-release-ops/references/site-release-surfaces.md:91 — site-release-surfaces.md F7 names scripts/gen-og.mjs; real file is scripts/gen-og-images.mjs
*category:* docs-drift · *independently reported 2×* · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 row 8

**Problem.** Row F7 (per-skill OG cards) tells the release cut to add each new skill to `scripts/gen-og.mjs`. No such file exists; the generator is scripts/gen-og-images.mjs (npm script `gen-og`). Already recorded in the v2.0 plan §4.4 #8 with resolution 'path fixed' — but the fix is scheduled for a 2.0 sprint and the current text is still wrong today.

**Evidence.** skills/oc-release-ops/references/site-release-surfaces.md:91: "`site/src/layouts/Base.astro` (`ROUTE_OG_IMAGES`) + `scripts/gen-og.mjs`". `ls scripts/ | grep gen-og` → gen-og-images.mjs only. package.json script `gen-og` exists.

**Proposed fix.** s/scripts\/gen-og.mjs/scripts\/gen-og-images.mjs (`npm run gen-og`)/ on line 91; do it now rather than waiting for Sprint 5 since it is a one-token doc fix.

### skills/oc-release-ops/references/site-release-surfaces.md:114 — site-release-surfaces.md procedure says flip L1–L7 while the table defines L1–L10
*category:* docs-drift

**Problem.** Procedure step 2 reads 'flip all Live-claim surfaces (L1–L7)'; the live-claim table (:38-47) has ten rows and :49-53 explains L8–L10 were added because the architecture diagrams were missed after v1.9. Following the procedure literally repeats the miss the file was amended to prevent.

**Evidence.** sed -n '38,47p;114p' skills/oc-release-ops/references/site-release-surfaces.md.

**Proposed fix.** Change ':114' to 'L1–L10'.

### skills/oc-release-ops/references/version-locations.md:5 — version-locations.md still hedges on a `check-version-lockstep.mjs` that never shipped, cites `tests/oc-release-ops-*.test.js` that don't exist, and omits two surfaces the real checker asserts
*category:* docs-drift · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 row 7 (line 698, count-surfaces section only)

**Problem.** Lines 5-6 say lockstep is checked by `scripts/check-version-lockstep.mjs` '(when that script exists; for v1.3 the check lives in this skill's /oc-release verify step)' and :66 repeats it; :68 says to add regression tests 'under `tests/oc-release-ops-*.test.js`'. The lockstep checker exists since v1.6 as scripts/check-release-surfaces.mjs with tests/release-surfaces.test.js (the same skill's site-release-surfaces.md:107 names it). No tests/oc-release-ops-* file exists (actual: release-surfaces.test.js, check-release-tag.test.js, release-sequence.test.js, site-release-chip.test.js). The 'Required locations' table also omits `site/src/pages/skills/index.astro` (Skill Library release callout + href) and the architecture.astro eyebrow/footer, all of which check-release-surfaces.mjs:54-79 asserts — so `/oc-release bump` following this table leaves surfaces the verify gate then fails on. Its index.astro pattern (:22 `href="/changelog#v1.3"`) also predates the hyphenated anchors the file's own note (:26-29) and index.astro:94 (`#v2-0`) use.

**Evidence.** version-locations.md:5-6, :66-68 as quoted; `ls scripts/ | grep lockstep` → none; `ls tests/ | grep release` → check-release-tag.test.js release-sequence.test.js release-surfaces.test.js site-release-chip.test.js. scripts/check-release-surfaces.mjs:54-60 labels 'Skill Library release callout' / '...href' file site/src/pages/skills/index.astro; :73-79 architecture eyebrow/footer. site-release-surfaces.md:107 "`scripts/check-release-surfaces.mjs` (added v1.6)". v2.0 plan §4.4 #7 touches this file's count-surface section only.

**Proposed fix.** Replace the two check-version-lockstep.mjs mentions with scripts/check-release-surfaces.mjs + tests/release-surfaces.test.js; add the skills/index.astro callout and architecture eyebrow/footer rows (or state that site-release-surfaces.md L8-L10 own them); fix the index.astro pattern to the hyphenated anchor.

### skills/oc-release-ops/references/version-locations.md:22 — `version-locations.md` — the file `/oc-release bump` follows — is frozen at v1.3, names a script that has never existed, and points at changelog markup that no longer exists
*category:* stale-contract · *surfaced by the release-plan lens* · *known:* §4.4 row 7 (:698); plan L3 oc-release-ops row (:623) defers this to Sprint 5

**Problem.** The "Required locations" table that `/oc-release bump` rewrites in lockstep and `/oc-release verify` gates on lists six surfaces, all with v1.3 example values. Line 22 tells the release agent to edit `site/src/pages/changelog.astro` "Most recent `<section class="release release--current">`" matching `<span class="rel-tag">v1.3</span>` — neither class exists in changelog.astro today (the live markup is `hero-card--released is-open`). Line 5 directs the reader to register new version surfaces in `scripts/check-version-lockstep.mjs`, which has never existed. Meanwhile `scripts/check-release-surfaces.mjs` probes eleven live-claim surfaces, seven of which the table never mentions (architecture eyebrow/footer, MobileArchitecture, skills/index.astro callout + href, homepage release bar, Header href), and `server.json` (:6, `"version": "1.9.0"`) is absent. A 2.0 release session following this file edits a nonexistent element, registers nothing, and misses seven surfaces that CI probes.

**Evidence.** `grep -c 'release--current' site/src/pages/changelog.astro` → 0; site/src/pages/changelog.astro:204 `<article class="hero-card hero-card--released is-open" id="v1-9" data-card>`. `ls scripts/check-version-lockstep.mjs` → No such file. scripts/check-release-surfaces.mjs PROBES entries at :27, :32, :38, :43, :48, :54, :59, :65, :73, :78, :83 (11). server.json:6 `"version": "1.9.0"`. version-locations.md:5, :15-22, :53 ("As of v1.3 there are no version pins here").

**Proposed fix.** Rework the table before Sprint 5, not during it: derive the required-locations list from `scripts/check-release-surfaces.mjs`'s PROBES array plus the three manifests (server.json, .claude-plugin/marketplace.json, plugins/opchain/.claude-plugin/plugin.json), delete the check-version-lockstep.mjs sentence at :5, and replace the v1.3 example column with a `<release>` placeholder so it cannot go stale again.

### skills/oc-release-ops/SKILL.md:62 — Body command menu lists three verbs the frontmatter commands: block omits
*category:* generated-surface

**Problem.** The command reference lists `/oc-release status`, `/oc-release verify`, `/oc-release rollback` (:62-64); `verify` is the gate the whole ship path depends on (:107, :179, :267, :292-310) and `rollback` is Phase 6 (:314). Frontmatter `commands:` (:10-16) has only the six plan/draft/bump/announce/ship entries, and the generated catalogs (src/generated/mcp-catalog.json, /skills.json, /skills/oc-release-ops) are built from frontmatter, so the MCP tool list and site under-advertise the skill's verbs. check-skill-flags.mjs gates by verb only (:56-64), so the flag check cannot catch the omission.

**Evidence.** node -e on src/generated/mcp-catalog.json prints ["/oc-release","/oc-release plan","/oc-release draft","/oc-release bump","/oc-release announce","/oc-release ship"]; SKILL.md:62-64 lists status/verify/rollback.

**Proposed fix.** Add `/oc-release status`, `/oc-release verify`, `/oc-release rollback` to the frontmatter `commands:` list (subcommands inherit the `skills.command.oc-release.enabled` flag, no registry change needed) and regenerate the catalog.

### skills/oc-release-ops/SKILL.md:103 — Stale v1.3-era present-tense text across the skill
*category:* docs-drift

**Problem.** ':35 v1.3 dogfoods this skill for its own release' (present tense); version-locations.md:5-6 'for v1.3 the check lives in this skill's verify step', :52 'As of v1.3 there are no version pins here'; changelog-recipe.md:103-149 offers the v1.3 skeleton (with the retired `rel-tag`/`rel-summary` classes and 'the 18th skill') as the worked example; semver-decisions.md examples stop at v1.2→v1.3. The catalog is 1.9.0 with 15 shipped releases and 33 skills.

**Evidence.** grep -n 'v1\.3' skills/oc-release-ops/SKILL.md skills/oc-release-ops/references/*.md; release-seal.json catalogVersion 1.9.0; live checkpoint post_release_drift.ledger '10 of 15 shipped releases untagged'.

**Proposed fix.** Move the v1.3 material to past tense or replace the worked examples with the v1.9 cut (which the live checkpoint documents in detail).

### skills/oc-release-ops/SKILL.md:206 — changelog-recipe.md and site-release-surfaces.md are never cited from SKILL.md or version-locations.md
*category:* routing

**Problem.** Phase 3 points only at references/version-locations.md for 'any other site-wide version stamps' (:206-207) and version-locations.md does not link site-release-surfaces.md; Phase 2 never points at changelog-recipe.md even though that file calls itself 'the canonical instruction `/oc-release draft` follows' (:7). A session following SKILL.md never reaches the L1–L10 / F1–F8 checklist or the 21-day hero window, so the bump misses the changelog tab count, stat chip, architecture eyebrows and coupled tests; only `tests/release-surfaces.test.js` (via the `npm test` gate row) catches part of it afterwards.

**Evidence.** grep -n -E 'changelog-recipe|site-release-surfaces' skills/oc-release-ops/SKILL.md → 0 hits; grep -n 'site-release-surfaces' skills/oc-release-ops/references/version-locations.md → 0 hits; site-release-surfaces.md:9 links back to version-locations.md only one-way.

**Proposed fix.** Cite references/changelog-recipe.md from Phase 2 and references/site-release-surfaces.md from Phase 3 and the verify table (add a `node scripts/check-release-surfaces.mjs` row); add a companion link from version-locations.md.

### skills/oc-release-ops/SKILL.md:294 — Two different idempotency markers for the same production-shipped event
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/plans/2026-08-28-v1.9-assurance-release-plan.md:549 (release-sequence introduced, never wired into the skill).

**Problem.** ':292-310 Runs in order; aborts on the first failure' describes a sequence no script executes. Row-by-row: gen-catalog / validate-pm-mcp / gen-flags / npm test / site:build = (a) commands the agent must remember to run; changelog grep = broken (separate finding); docs-forge verify, repo-ops verify, compliance delta = (b) agent-executed checkpoint reads; 'Release is tagged' = (a) check-release-tag.mjs (correctly named); 'All skill versions match' and 'Styleguide badge matches' = (a) but the rows say 'parse every SKILL.md frontmatter' / 'parse styleguide.astro' instead of naming `check-release-tag.mjs` (readCatalogVersion reports a split catalog, :106-125) and `check-release-surfaces.mjs` (styleguide Badge probe, :64-68). Meanwhile `npm run release-sequence -- --stage pre-tag` (scripts/release-sequence.mjs:121-146) already runs the tag gate + release-surfaces + clean-tree as a fail-closed sequence and is invoked by the v1.9 and v2.0 release plans — but not by this skill, so the 'gate you run' and the ledger CI mirrors can diverge.

**Evidence.** skills/oc-release-ops/SKILL.md:292-310. `grep -n 'check-release-surfaces\|release-sequence' skills/oc-release-ops/SKILL.md` → no output (only :307 and :477 name check-release-tag). scripts/release-sequence.mjs:2 'The GitHub Actions surface, runnable as a local release sequence', :94-245 LEDGER. docs/plans/2026-08-28-v1.9-assurance-release-plan.md:549 introduces the script; v2.0 plan :1278 uses `--stage pre-tag`.

**Proposed fix.** Add a lead sentence to :292: 'Agent-executed. The mechanical subset is `npm run release-sequence -- --stage pre-merge` then `--stage pre-tag --version <semver>`; run those first, then the checkpoint rows below.' Rename the implementation cells: skill versions → `node scripts/check-release-tag.mjs --json` (`disagreement` must be null); styleguide badge → `node scripts/check-release-surfaces.mjs`.

### skills/oc-release-ops/SKILL.md:297 — Verify gate and default plan/draft/bump flow are opchain-repo-only; multi-project mode does not override them
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:309 and :567 (repo-only-dependency, CONFIRMED)

**Problem.** Every verify row (:299-309) is an opchain npm script or opchain site file (`gen-catalog`, `validate-pm-mcp`, `gen-flags`, `site:build`, styleguide.astro, changelog.astro) and the gate 'aborts on the first failure' (:294). Multi-project mode (:330-348) redefines version locations and changelog path but not the verify table, so in an opchain-managed project `/oc-release ship` step 1 aborts on the first missing script. Phases 1–3 likewise default to opchain's own site files (:123, :173, :203-205). Still open since the 2026-07-04 portability audit.

**Evidence.** sed -n '294,310p;330,348p' skills/oc-release-ops/SKILL.md — no `.opchain/release.yaml` key maps to verify commands; audit items at docs/audits/2026-07-04-portability-audit.md:309 and :567 are marked CONFIRMED with no resolution recorded.

**Proposed fix.** Add a `verify_commands:` list to `.opchain/release.yaml` and make the gate table read 'opchain defaults, overridden by release.yaml'; make Phases 1–3 read `changelog_path` / `version_locations` from release.yaml when present.

### skills/oc-release-ops/SKILL.md:324 — Shipped-release rollback handoff names `/oc-rollback`, a verb oc-deploy-ops does not have
*category:* cross-skill-contract

**Problem.** Phase 6 says 'invoke `oc-deploy-ops /oc-rollback` to revert the worker'. oc-deploy-ops' frontmatter commands are `/oc-deploy`, `/oc-deploy staging`, `/oc-deploy audit`; its body verb is `/oc-deploy rollback`. In an incident (shipped release must be reverted) a session following this text invokes a verb that resolves nowhere.

**Evidence.** awk frontmatter of skills/oc-deploy-ops/SKILL.md → commands: /oc-deploy, /oc-deploy staging, /oc-deploy audit; grep -n '/oc-rollback' skills/oc-deploy-ops/SKILL.md → 0 hits; oc-deploy-ops/SKILL.md:39 `/oc-deploy rollback   Revert to previous production version`, :380 `## Rollback (/oc-deploy rollback)`.

**Proposed fix.** Change :324 to `oc-deploy-ops /oc-deploy rollback` (and consider adding `/oc-deploy rollback` to oc-deploy-ops' frontmatter so the catalog advertises it).

### skills/oc-release-ops/SKILL.md:371 — Documented skill_state schema and When-to-Write fields do not match what the skill actually writes
*category:* live-checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:299 (checkpoint-write-gap, CONFIRMED)

**Problem.** The skill_state block documents `current_release{semver,theme,phase,release_ticket_id,started_at}` + `history[]` (:371-388). The live checkpoint's `current_release` has no `release_ticket_id` and adds `shipped_at`; there is no `history[]`; and 13 undocumented keys are present (`prior_release`, `catalog`, `pre_merge`, `release_seal`, `release_pr`, `tag`, `publisher`, `staging`, `production`, `retention`, `roadmap`, `monitoring`, `post_release_drift`). The When-to-Write table (:359-367) names 14 further fields (`proposed_semver`, `headline_items`, `changelog_diff_path`, `sections_added`, `bumped_versions[]`, `commit_sha`, `announcement_paths`, `gate_results[]`, `deploy_ticket_id`, `rolled_back_at`, `prior_versions[]`, ...) that appear in neither the schema nor the live file, and never says where they live. The 2026-07-04 portability audit flagged the WHEN-but-not-HOW gap and it is still open.

**Evidence.** cat .checkpoints/oc-release-ops.checkpoint.json → skill_state keys: current_release, prior_release, catalog, pre_merge, release_seal, release_pr, tag, publisher, staging, production, retention, roadmap, monitoring, post_release_drift; grep -c 'history' → 0; grep -c 'release_ticket_id' → 0; grep -c 'gate_results\|headline_items\|bumped_versions' → 0.

**Proposed fix.** Rewrite the skill_state block to the shape the v1.9 cut actually produced (or prune the live file to the documented shape), and give each When-to-Write field an explicit home (`skill_state.<key>` or a top-level protocol field).

### skills/oc-release-ops/SKILL.md:405 — Three 'Read by' rows are not reciprocated by the named skills
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** :402 claims oc-git-ops 'knows a release is in flight; `/oc-git-sync` shapes the release PR specifically' — oc-git-ops reads only oc-bug-check, oc-docs-forge and oc-repo-ops checkpoints and has no release-PR shaping text. :405 claims oc-deploy-ops 'treats oc-release-ops handoff as authoritative for the release tag' — oc-deploy-ops/SKILL.md contains zero mentions of oc-release-ops (its Cross-Skill Reads list oc-code-auditor, oc-app-architect, oc-git-ops); the tag authority is actually `scripts/deploy.mjs` importing check-release-tag.mjs, not a checkpoint read. :406 claims oc-monitoring-ops 'tags incidents in the first 24h after a release with `post-release`' — oc-monitoring-ops/SKILL.md has zero occurrences of 'release'.

**Evidence.** grep -n -E 'release-ops|/oc-release|post-release' skills/oc-deploy-ops/SKILL.md → none; same grep on skills/oc-monitoring-ops/SKILL.md → none; grep -n -i 'release' skills/oc-monitoring-ops/SKILL.md → none; grep -n 'checkpoint.json' skills/oc-git-ops/SKILL.md → :237 oc-bug-check, :328 oc-docs-forge, :336 oc-repo-ops only; grep -n -E 'release PR|Release PR' skills/oc-git-ops/SKILL.md → none; scripts/deploy.mjs:35 `import { checkReleaseTag ... } from "./check-release-tag.mjs"`.

**Proposed fix.** Either add the reciprocal reads/behaviour to oc-git-ops, oc-deploy-ops and oc-monitoring-ops, or trim the Read-by table to the rows that are real (oc-docs-forge :203/:210, oc-repo-ops :170, oc-compliance-ops :264) and attribute the tag gate to scripts/check-release-tag.mjs.

### skills/oc-repo-ops/SKILL.md:63 — Every-PR Gate lists Bug Check as step 3 'before commit' after Repo Ops, contradicting the actual sequence
*category:* cross-skill-contract

**Problem.** SKILL.md:59-64 and pr-readiness-gate.md:5-10 give the required order as 1 Docs Forge → 2 Repo Ops → 3 'Bug Check runs the fast code gate before commit' → 4 Git Ops opens the PR. Commits precede the pre-PR gate, so a step placed after Repo Ops cannot run 'before commit'. Every consumer has to patch the order in prose: oc-git-ops/SKILL.md:344-345 restates it as 'docs-forge → repo-ops → bug-check (already run at commit time) → PR', and its /oc-git-sync steps (:375-379) actually run oc-bug-check at step 6 before push, docs-forge at 8, repo-ops at 9. oc-bug-check/SKILL.md:106-109 repeats the same '(already run at commit time)' gloss. A session following this skill alone would re-run bug-check after the readiness verdict.

**Evidence.** SKILL.md:63 '3. Bug Check runs the fast code gate before commit.'; SKILL.md:64 'Git Ops opens the PR only after Repo Ops and Bug Check pass.'; pr-readiness-gate.md:9 '3. Bug Check verifies fast quality checks before commit.'; oc-git-ops/SKILL.md:376 '6. Run oc-bug-check gate' precedes :378 '8. Generate PR docs packet' and :379 '9. Run oc-repo-ops gate'.

**Proposed fix.** Rewrite the list so Bug Check is a precondition, not a later step: '0. Bug Check has already run at commit time (oc-git-ops /oc-git-sync step 6). 1. Docs Forge … 2. Repo Ops verifies cleanliness, docs packet presence, and that the bug-check verdict is present and fresh (chain back to oc-bug-check if not). 3. Git Ops opens the PR.' Apply the same edit to pr-readiness-gate.md:5-10.

### skills/oc-repo-ops/SKILL.md:90 — /oc-repo verify fails closed on a 'stale' docs-forge checkpoint that nothing defines
*category:* undefined-threshold · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers skills/oc-git-ops/SKILL.md:337 for the consumer side ('consumes docs-forge/repo-ops verdicts 

**Problem.** The PR readiness gate's first fail-closed condition is 'Missing or stale `.checkpoints/oc-docs-forge.checkpoint.json`' (:90). 'Stale' is defined nowhere — no age threshold, no SHA comparison, no diff comparison. The bundled reference repeats the word without defining it (references/pr-readiness-gate.md:16). The skill's own checkpoint example carries `verified_for_sha` (:157) and oc-docs-forge's carries the same field (oc-docs-forge/SKILL.md:190), which is the obvious binding — but no line tells the gate to compare it against HEAD. A gate that fails closed on an undefined predicate is decided by whichever way the session happens to read it.

**Evidence.** skills/oc-repo-ops/SKILL.md:88-90 `PR readiness gate. Fail closed on: - Missing or stale \`.checkpoints/oc-docs-forge.checkpoint.json\`.`; skills/oc-repo-ops/references/pr-readiness-gate.md:16 `- \`.checkpoints/oc-docs-forge.checkpoint.json\` is missing or stale.`; skills/oc-repo-ops/SKILL.md:157 `"verified_for_sha": "abc123"`; skills/oc-docs-forge/SKILL.md:190 `"verified_for_sha": "abc123"`.

**Proposed fix.** Define stale as `skill_state.verified_for_sha != git rev-parse HEAD` (the same binding oc-release-ops:305 already uses for the docs row) and state it at :90 and in references/pr-readiness-gate.md:16.

### skills/oc-repo-ops/SKILL.md:91 — /oc-repo verify can only be executed by reading sibling skills' private skill_state
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md P3d (promote verified_for_sha out of ad-hoc skill_state; pr_body_fragment and last_run.verdict reads are not

**Problem.** oc-repo-ops :49 '/oc-repo verify — PR readiness gate, blocks on failures', :88 'Fail closed on:', references/pr-readiness-gate.md:14 'Block PR creation when any of these are true', oc-docs-forge :158-159 'Failure blocks oc-repo-ops verify, which blocks oc-git-ops from opening the PR', and oc-git-ops :293 'The oc-repo-ops gate fails closed if this section is missing' all describe an enforced pre-PR gate. Classification: (b) agent-executed prose presented as (a). The only PreToolUse hook matches `git commit` (pre-commit-gate.cjs:142) — `gh pr create` is unmatched; neither .github/PULL_REQUEST_TEMPLATE.md nor pull_request_template.md contains `## Documentation`; no workflow or script reads the PR body or the `<!-- opchain:oc-docs-forge:pr-docs -->` marker; the ruleset requires CI contexts only. The v1.8 rail therefore holds exactly as long as the running session chooses to honour it — the condition orchestrator.md :166-173 warns produced zero autonomous invocations in 87 sessions.

**Evidence.** SKILL.md:90 'Missing or stale .checkpoints/oc-docs-forge.checkpoint.json.'; SKILL.md:91 'Missing ## Documentation PR body fragment.'; SKILL.md:169 '| oc-bug-check | Fast gate verdict before commit |'; oc-checkpoint-protocol/SKILL.md:376 '- Never read skill_state — it's private to the owning skill'; oc-docs-forge/SKILL.md:184 '"pr_body_fragment": "## Documentation\n..."' inside skill_state; oc-bug-check/SKILL.md:553-556 last_run.verdict inside skill_state.

**Proposed fix.** Prefix the three gate statements with 'Agent-executed, unenforced:' and point at the enforcement that exists (`gh pr create` is not hook-gated). Cheapest real enforcement: add `## Documentation` to .github/pull_request_template.md and a tiny PR-only workflow step that fails when the PR body lacks that heading (or extend pre-commit-gate.cjs to match `gh pr create` and require a fresh `.checkpoints/oc-repo-ops.checkpoint.json` with `verdict: PASS` and `verified_for_sha == HEAD`).

### skills/oc-reverse-spec/SKILL.md:60 — Body menu advertises /oc-rev-status and /oc-rev-diff that frontmatter, flags registry, and MCP catalog do not declare
*category:* generated-surface · *independently reported 2×*

**Problem.** tri-dev is not in the 33-skill catalog. The command menu and pipeline diagram present it as a third consumer alongside APP-ARCHITECT, while :27-29, :426-435 and :243 say oc-app-architect Phase 6 consumes spec.md + sprint-plan.md. The Pipeline Readiness block still carries the renamed row, so oc-app-architect is listed twice with different verdicts.

**Evidence.** SKILL.md:60-61 '/oc-rev-status  Show progress from checkpoint' / '/oc-rev-diff  Compare generated specs against actual code'; :93-97 define their behavior; frontmatter :10-16 lists only six verbs. src/lib/flags/registry.js:289-290 lists /oc-rev-design, /oc-rev-full, /oc-rev-scan, /oc-rev-sprint, /oc-rev-stack, /oc-reverse-spec only. src/generated/mcp-catalog.json oc-reverse-spec.commands = the same six. scripts/check-skill-flags.mjs:59 iterates `data.commands` (frontmatter) only. oc-checkpoint-protocol/references/INTEGRATION.md:196 also cites `/oc-rev-status`.

**Proposed fix.** Add `/oc-rev-status` and `/oc-rev-diff` to frontmatter `commands:` and to the registry verb list (regenerate catalog), or delete them from the menu and route status to the protocol's `/checkpoint`.

### skills/oc-reverse-spec/SKILL.md:223 — Generated specs never land where oc-app-architect reads them; handoff omits the target path
*category:* cross-skill-contract

**Problem.** Output goes to `reverse-spec-output/spec/` (or /home/claude/reverse-spec-output/), but oc-app-architect's File Structure and the protocol's Directory Convention place specs at `{project-dir}/spec/`, and oc-app-architect's 'From existing specs' mode names no source path. The handoff steps (:558-568) never say to move/copy the docs or to point oc-app-architect at generated_files, so the chain depends on the session guessing.

**Evidence.** SKILL.md:223-224 'reverse-spec-output/ ├── spec/'; :486 '/home/claude/reverse-spec-output/'; :558-568 handoff has no path step. oc-app-architect/SKILL.md:615 'spec/ ├── 00-project-overview.md ...'; :661-664 mode lists commands only. oc-checkpoint-protocol/SKILL.md:523 'spec/  (oc-app-architect output)'.

**Proposed fix.** Add a step to the handoff: 'copy reverse-spec-output/spec/*.md to {project-dir}/spec/ (or write there directly) and record the paths in context_primer.generated_files; oc-app-architect /oc-roadmap loads them from there.'

### skills/oc-reverse-spec/SKILL.md:234 — Spec docs 09/10 are numbered opposite to oc-app-architect's Phase 2 file list while claiming to match it 'exactly'
*category:* cross-skill-contract

**Problem.** Rule 2 requires the oc-app-architect structure 'exactly' so downstream tools consume output without translation. oc-reverse-spec emits 09-documentation-plan.md / 10-cost-estimate.md; oc-app-architect's own spec table and File Structure emit 09-cost-estimate.md / 10-documentation-plan.md. spec-template.md (the file :214 tells the session to read) sides with oc-reverse-spec, so oc-app-architect is internally inconsistent and the two skills' outputs collide on numbered names.

**Evidence.** SKILL.md:234-235 '09-documentation-plan.md … 10-cost-estimate.md'; :251 'Use the oc-app-architect template structure exactly.' oc-app-architect/SKILL.md:256-257 '09-cost-estimate.md | Infra costs …' / '10-documentation-plan.md | Docs plan'; :616 '00-project-overview.md ... 10-documentation-plan.md'; :649 'Phase 2 spec `09-cost-estimate.md`'. oc-app-architect/references/spec-template.md:482 '## 09 — Documentation Plan', :508 '## 10 — Cost Model'.

**Proposed fix.** Pick one ordering in oc-app-architect (template vs body) and align oc-reverse-spec :234-235 to it; the fix is one line here plus three in oc-app-architect.

### skills/oc-reverse-spec/SKILL.md:282 — States adoption of 'checkpoint protocol v1.0'; current wire is 1.1 and new writes must stamp 1.1
*category:* checkpoint

**Problem.** The only skill in the catalog that pins a protocol version pins the superseded one. A session copying the number into `protocol_version` writes a '1.0' file that validates but immediately becomes work for oc-migration-ops' sweep, and the 1.1 fields (cost, eval_scores, telemetry_handle) are implicitly opted out.

**Evidence.** SKILL.md:282 'Reverse-spec adopts the checkpoint protocol v1.0.' `grep -rn 'checkpoint protocol v1' skills/*/SKILL.md` → only this line. oc-checkpoint-protocol/SKILL.md:30-31 '`protocol_version` — the on-disk schema version, currently "1.1"'; :46-47 'New writes stamp "1.1"; oc-migration-ops sweeps existing "1.0" files forward.'

**Proposed fix.** Drop the version number: 'Reverse-spec implements the checkpoint protocol (see references/checkpoint-protocol.md for the current wire version).'

### skills/oc-reverse-spec/SKILL.md:306 — Resume step invokes `node scripts/checkpoint.mjs show` without the CLI-availability caveat; user projects don't ship the script
*category:* tooling · *independently reported 2×* · *known:* docs/audits/2026-08-22-oss-readiness-audit.md:1003-1004,1108 (checkpoint-CLI portability, item lists oc-reverse-spec:305)

**Problem.** The resume flow's first step is an unqualified CLI call. The script exists in this repo and `show` is a real verb (exits 1 with 'no checkpoint for …' when absent), but skills are installed into user projects that have no scripts/checkpoint.mjs; the protocol carries a caveat block for this that this skill does not echo.

**Evidence.** SKILL.md:306 '1. Check for checkpoint: `node scripts/checkpoint.mjs show oc-reverse-spec`'. scripts/checkpoint.mjs:987 usage lists `show`. Already tracked: docs/audits/2026-08-22-oss-readiness-audit.md:1003-1004 and :1108 list 'skills/oc-reverse-spec/SKILL.md:305' among unqualified checkpoint.mjs references (line has since shifted to 306).

**Proposed fix.** Prefix with 'if the opchain repo's CLI is available, …; otherwise read the JSON file directly' as the protocol's caveat block does.

### skills/oc-reverse-spec/SKILL.md:536 — /oc-rev-spec is used as a verb in the description, the --pm-mirror flag, the MCP router and the site, but is not a frontmatter command
*category:* routing

**Problem.** The skill has two spellings of its root verb. Frontmatter and the menu are keyed on /oc-reverse-spec; the description, the PM-mirror section, the MCP router's `phase`, and three site pages tell users to type /oc-rev-spec. Nothing declares the alias, the flags registry has no /oc-rev-spec entry, and the body never says what /oc-rev-spec (without --pm-mirror) does.

**Evidence.** SKILL.md:18 'Use for /oc-rev-spec, /oc-reverse-spec'; :536 '### `/oc-rev-spec --pm-mirror`'; :46 'When the user types `/oc-reverse-spec`, display this menu'. src/lib/mcp/routing.js:16 `skill: "oc-reverse-spec", phase: "/oc-rev-spec"`; site/src/pages/install.astro:455 'Run <code>/oc-rev-spec</code>'; for-agencies.astro:170; architecture.astro:358. src/lib/flags/registry.js:290 has /oc-reverse-spec only.

**Proposed fix.** Declare `/oc-rev-spec` in frontmatter `commands:` as the short alias (and register its verb flag), and state in the menu that both spellings open it; or normalize routing.js and the site pages to /oc-reverse-spec.

### skills/oc-reverse-spec/SKILL.md:552 — PM ticket ids and deferred mirrors are 'recorded in the checkpoint' without naming pm_refs / pm_deferred_actions
*category:* checkpoint · *independently reported 2×*

**Problem.** The skill's whole reason for recording ticket ids is sibling reads (:553-554), but it never names the protocol field siblings read. A session may stash them in skill_state, which the protocol declares private (never read by other skills), silently breaking the stated downstream read. The deferred-mirror log (:588-589) likewise omits the `pm_deferred_actions[]` queue that `--retry-pm` flushes.

**Evidence.** SKILL.md:552-554 'Record the parent + child ticket ids in the `oc-reverse-spec.checkpoint.json` for downstream skills … to read.'; :588-589 'log the intended PM mirror as deferred in the checkpoint.' Protocol: oc-checkpoint-protocol/SKILL.md:545-553 (pm_refs is the sibling-readable field; 'keep skill-private PM bookkeeping in skill_state'), :376 'Never read `skill_state`', :584-592 (siblings read pm_refs). oc-integrations-engineer/references/pm-mcp-protocol.md:154-159 'Every skill that performs PM writes adds a top-level `pm_deferred_actions` array'. `grep -rln pm_refs skills/*/SKILL.md` → only oc-checkpoint-protocol and oc-orchestrator.

**Proposed fix.** At :552 write 'append to top-level `pm_refs[]` (kind: source for the parent, child for each spec ticket)'; at :588 write 'append to `pm_deferred_actions[]` with the marker, retriable: true'.

### skills/oc-reverse-spec/SKILL.md:585 — Failure-mode handoff names `/oc-integrate plan pm`, a target oc-integrations-engineer does not document; its own rule is 'report and continue'
*category:* cross-skill-contract

**Problem.** oc-integrations-engineer's frontmatter has `/oc-integrate plan` but no `pm` target, and its menu lists no PM-tool setup verb; the PM-MCP contract it owns says an unconfigured MCP is reported and the skill continues without blocking. Sending the user to a verb the target doesn't define stalls the run on a non-load-bearing enrichment.

**Evidence.** SKILL.md:584-586 '`--pm-mirror` set but no MCP configured → skill prompts user to run `/oc-integrate plan pm` first, or proceed without mirroring.' oc-integrations-engineer/SKILL.md:10-12 commands `/oc-integrate`, `/oc-integrate plan`; :44-59 menu has plan/build/test/connect/webhook/oauth/health/secrets/retry/list — no `pm`; :594-596 'MCP unconfigured — skill reports `pm-mcp not configured` and continues without PM context. Never blocks on MCP'. `grep -rn 'plan pm' skills/*/SKILL.md` → only this line.

**Proposed fix.** Replace with the contract's behavior: 'report `pm-mcp not configured`, emit specs to the filesystem, and point the user at `.opchain/pm.yaml` + the PM-MCP setup in oc-integrations-engineer/references/pm-mcp-protocol.md'.

### skills/oc-scale-ops/SKILL.md:10 — Frontmatter declares 2 commands; body defines 10 subcommands plus 2 more verbs — site and MCP catalog surface only the frontmatter
*category:* docs-drift

**Problem.** SKILL.md:10-12 `commands: [/oc-scale, /oc-scale audit]`; the command reference (:35-50) defines budget, bottleneck, loadtest, benchmark, cache, queries, cdn, plan, cost as well, and the PM section adds capacity (:476) and sync-pm (:492). The /skills index, the per-skill page and the MCP catalog read only frontmatter commands, so 8 of 10 documented verbs are invisible to every catalog consumer; siblings declare full sets (oc-monitoring-ops 19, oc-migration-ops 14, oc-qa-ops 7).

**Evidence.** site/src/pages/skills/index.astro:122 (visibleCommandsFor(s.data.commands)); site/src/pages/skills/[id].astro:69 (skill.data.commands filtered by isCommandEnabled); scripts/gen-mcp-catalog.mjs:50 (commands from frontmatter); scripts/gen-skills-catalog.mjs:88-89 (only requires an array); per-skill frontmatter command counts: oc-scale-ops 2, oc-qa-ops 7, oc-migration-ops 14, oc-monitoring-ops 19.

**Proposed fix.** Declare every verb from the command reference in frontmatter `commands:` (and resolve capacity/sync-pm first).

### skills/oc-scale-ops/SKILL.md:440 — oc-code-auditor read edges are one-sided in both directions; /oc-audit perf does not consume budgets
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** SKILL.md:440-494 ('PM-Tool MCP Integration (v1.2+)') writes comments and sub-tickets but cites only 'oc-integrations-engineer' (:444-445), never pm-mcp-protocol.md (rule 7), defines no idempotency marker for the summary comment or sub-tickets (rule 2), and no pre-write comment listing (rule 3). validate-pm-mcp.mjs checks only 5 PM_AWARE_SKILLS; oc-scale-ops is one of 15 skills whose `## PM-Tool MCP Integration` section is never validated, so drift back to placeholder prose cannot be caught. Not in the punchlist or v2.0 §4.4; OSS audit F13 covers pm.yaml coupling, not validator scope.

**Evidence.** grep -c pm-mcp-protocol skills/oc-scale-ops/SKILL.md → 0; skills/oc-integrations-engineer/references/pm-mcp-protocol.md:240-241 (rule 2 markers), :242-243 (rule 3 pre-write), :252-253 (rule 7 cite this doc), :257-275 (validator scope 'Each of the 5 PM-aware SKILL.md files'); scripts/lib/pm-mcp-checks.mjs:5-11 (PM_AWARE_SKILLS = integrations-engineer, app-architect, git-ops, deploy-ops, monitoring-ops); grep -l '^## PM-Tool MCP Integration' skills/*/SKILL.md → 20 skills.

**Proposed fix.** Either upgrade the section to the §5 rules (cite pm-mcp-protocol.md, define `<!-- opchain:oc-scale-ops:scale-summary:<sha> -->`-style markers, pre-write check, pm_deferred_actions) and add oc-scale-ops to PM_AWARE_SKILLS, or retitle the section as advisory v1.2 prose that performs no writes.

### skills/oc-scale-ops/SKILL.md:453 — Three incompatible readiness vocabularies: A–F grade, READY/WATCH/RED, and HIGH/CRITICAL 'on the readiness scale'
*category:* docs-drift

**Problem.** The readiness scale is defined as letter grades A–F (:90-98) and the report template's bottleneck list carries no severity tags (:123-125), but the PM summary reports 'Readiness {READY / WATCH / RED}' (:453) and sub-tickets are filed 'for every finding tagged HIGH or CRITICAL on the readiness scale' (:465). No mapping between the three exists, so the sub-ticket gate at :465 has no input it can evaluate.

**Evidence.** sed -n '90,98p;123,125p;453p;465p' skills/oc-scale-ops/SKILL.md.

**Proposed fix.** Define the mapping once (e.g. A/B → READY, C → WATCH, D/F → RED) and add a severity column to the Top-5 bottleneck template so :465 has a field to key on.

### skills/oc-scale-ops/SKILL.md:471 — PM section invokes /oc-scale capacity, a verb the command reference does not define
*category:* executability · *independently reported 2×*

**Problem.** SKILL.md:471-472 'assignee: from `.opchain/pm.yaml` `remediation_owners.infra` or `.backend`'. The canonical pm.yaml schema owned by oc-integrations-engineer (provider, team_or_project, issue_types, states, labels_default, mcp_server, tool_overrides) has no `remediation_owners` map, and the sub-keys `.infra`/`.backend` are named only here; four other skills each invent their own sub-key (.security, .frontend, 'by area').

**Evidence.** skills/oc-integrations-engineer/SKILL.md:565-581 (pm.yaml example, no remediation_owners); grep -rn remediation_owners skills/ → oc-scale-ops:471, oc-security-auditor:520 (.security), oc-ux-engineer:698 (.frontend), oc-code-auditor:507 ('map by area'), oc-monitoring-ops:703; grep -n remediation pm-mcp-protocol.md → no hits.

**Proposed fix.** Add `remediation_owners: {infra, backend, frontend, security, …}` to the canonical pm.yaml example in oc-integrations-engineer/SKILL.md and pm-mcp-protocol.md, then reference those keys here.

### skills/oc-scale-ops/SKILL.md:491 — Deferred PM flush uses /oc-scale sync-pm instead of the protocol's --retry-pm and never names pm_deferred_actions
*category:* cross-skill-contract

**Problem.** SKILL.md:491-492 'MCP unavailable → log intended writes to checkpoint; user can `/oc-scale sync-pm` later.' `sync-pm` is not in the command reference (:30-57), and the canonical PM-MCP protocol says every PM-aware verb accepts `--retry-pm` and that deferred writes go into a top-level `pm_deferred_actions` array — neither named here. Ten sibling skills use `--retry-pm`; only oc-migration-ops shares the `sync-pm` drift.

**Evidence.** skills/oc-integrations-engineer/references/pm-mcp-protocol.md:154-155 ('Every skill that performs PM writes adds a top-level `pm_deferred_actions` array'), :202-204 ('Every PM-aware verb accepts a `--retry-pm` flag'); grep -n 'sync-pm\|retry-pm' skills/*/SKILL.md → --retry-pm in oc-app-architect:770, oc-deploy-ops:797, oc-git-ops:638, oc-monitoring-ops:714, oc-release-ops:250, oc-integrations-engineer:601; sync-pm only in oc-scale-ops:492 and oc-migration-ops:803.

**Proposed fix.** Replace :491-492 with 'record to `pm_deferred_actions[]` per pm-mcp-protocol.md §4; user flushes with `/oc-scale <verb> --retry-pm`' and add `pm_deferred_actions` to the checkpoint section.

### skills/oc-security-auditor/SKILL.md:19 — Frontmatter description diverges from the canonical §7 copy in orchestrator.md that 'should match exactly'
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:392 (same drift class, filed for oc-code-auditor only)

**Problem.** orchestrator.md §7 is bundled into every skill as the trigger-routing source of truth, but its oc-security-auditor block is a stale subset of the frontmatter: it omits `/oc-sec` and `/oc-posture`, 'Cloudflare config', the oc-code-auditor contrast sentence, and the v1.9 re-pointed trigger phrases ('audit the CSP policy', 'review WAF rules', 'check TLS config', 'is it hardened').

**Evidence.** skills/orchestrator.md:339 'Each skill's YAML frontmatter `description` field should match exactly:'; :395-402 block lists `/oc-security, /oc-secaudit, /oc-threat-model, /oc-owasp, /oc-hardening, /oc-attack-surface` and 'runtime/infra hardening (CSP, TLS, DNS, WAF)'. SKILL.md:19-32 lists eight verbs incl. `/oc-sec`, `/oc-posture` and '(CSP, TLS, DNS, WAF, Cloudflare config)'. skills/CHANGELOG.md:47-53 records the v1.9 trigger re-point. No parity test: `grep -rl 'match exactly' scripts tests` → none.

**Proposed fix.** Paste the frontmatter description (:19-32) into orchestrator.md:395-402, run `npm run sync-bundles`, and add the §7-vs-frontmatter parity assertion to tests/routing-disambiguation.test.js.

### skills/oc-security-auditor/SKILL.md:412 — `/oc-security compare` needs a 'before' snapshot that nothing in the contract produces
*category:* executability

**Problem.** compare 'diffs snapshots; it never re-assesses on its own' and takes 'two dates or checkpoint paths', but the skill documents a single checkpoint file that `/oc-security posture` overwrites, never says a prior snapshot is archived, and the protocol's `.checkpoints/history/` is only written by `reset`. The documented close-the-loop step in three skills (harden → re-assess → compare) therefore has no 'before' to diff across sessions.

**Evidence.** SKILL.md:412-413 'Input: two dates or checkpoint paths. If one argument, compares against current checkpoint'; :479-481 'run `/oc-security compare` to confirm the score moved (compare diffs snapshots; it never re-assesses)'; :422 single path. skills/oc-security-hardening/SKILL.md:154-156; skills/orchestrator.md:211 'close the loop with `/oc-security compare`'. `grep -n history/ skills/oc-security-auditor/SKILL.md` → none; `ls .checkpoints/history` → No such file or directory; protocol `reset` is the only archive verb (skills/oc-checkpoint-protocol/SKILL.md:435).

**Proposed fix.** State that `posture` (and any pillar re-run) archives the previous checkpoint to `.checkpoints/history/oc-security-auditor.<updated_at>.json` before writing, and that `compare` with one argument diffs against the newest history entry; add the archive to the When-to-Write table.

### skills/oc-security-auditor/SKILL.md:463 — Cross-referencing oc-code-auditor findings requires reading its skill_state, which the checkpoint protocol forbids, and the findings are in no documented field anyway
*category:* cross-skill-contract · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:614 (producer-side fix: oc-code-auditor gains `docs/audits/` report + `report_path`; this co

**Problem.** Steps 1, 2 and 6 of posture and the Reads-from row instruct the session to read oc-code-auditor's findings from its checkpoint and map them to STRIDE. oc-code-auditor's documented checkpoint holds only `findings_by_severity` counts and `current_finding` inside skill_state; individual findings are not in any documented field. Following the text either violates protocol rule 'Never read skill_state' or finds nothing to cross-reference.

**Evidence.** SKILL.md:373 'Read checkpoints: ... oc-code-auditor'; :385-386 'do oc-code-auditor findings map to STRIDE categories?'; :453 `code_auditor_checkpoint_read`. skills/oc-code-auditor/SKILL.md:433-443 skill_state (counts only), :490-491 'full findings live in the checkpoint'. skills/oc-checkpoint-protocol/SKILL.md:375-376 'Read the header, progress, progress_table, context_primer, and blockers / Never read skill_state'.

**Proposed fix.** Re-point :373/:463 at oc-code-auditor's forthcoming `report_path` artifact (and at PM tickets as the interim source), and state explicitly that only header/progress/blockers of the sibling checkpoint are read.

### skills/oc-security-auditor/SKILL.md:519 — `.opchain/pm.yaml` `remediation_owners.security` is not part of the canonical pm.yaml schema or its validator
*category:* cross-skill-contract

**Problem.** CRITICAL incident tickets are assigned from `remediation_owners.security`, but the schema this skill defers to ('See oc-integrations-engineer for the canonical PM-MCP patterns', :491) has no such key, the validator does not know it, and the live pm.yaml in this repo lacks it. Five skills read the same undocumented map with different sub-keys (security, frontend, infra).

**Evidence.** SKILL.md:519-520 '`assignee`: Security Lead from `.opchain/pm.yaml` `remediation_owners.security`'. skills/oc-integrations-engineer/SKILL.md:565-580 schema keys: provider, team_or_project, issue_types, states, labels_default, mcp_server. scripts/lib/pm-mcp-checks.mjs:138 required keys `provider, team_or_project, issue_types, states`. `grep -rn remediation_owners skills/oc-integrations-engineer` → 0 hits; `.opchain/pm.yaml` has no remediation_owners key (grep). Other readers: oc-code-auditor:507, oc-scale-ops:471, oc-ux-engineer:698, oc-monitoring-ops:703.

**Proposed fix.** Add an optional `remediation_owners: { security, frontend, infra, data }` block to the canonical schema in oc-integrations-engineer:568-580 and references/pm-mcp-protocol.md, accept it in pm-mcp-checks.mjs, and add it to the example `.opchain/pm.yaml`; or drop the assignee rule and say 'unassigned unless pm.yaml defines remediation_owners'.

### skills/oc-security-hardening/SKILL.md:124 — Secrets-hygiene control 'verify: {method: test} invoking the Check 5 command set' is rejected by the skill's own test allowlist
*category:* executability

**Problem.** The baseline tells the session to record the secrets scan as a `test` control whose `cmd` is oc-bug-check's Check 5 command set, but Check 5 is five bare `grep -rn -E ...` invocations, and the reference's mandatory allowlist (and this repo's runner) admit only `npm test`, `npm run test*|check*|lint*|validate*`, check/lint/validate/test Node scripts, and local `vitest run`. As written the control either cannot be recorded or fails schema at gate time.

**Evidence.** SKILL.md:124-126; skills/oc-bug-check/SKILL.md:229-253 (bare grep commands with quotes/parens); skills/oc-security-hardening/references/hardening-manifest.md:82-86 allowlist + 'reject ... binaries/scripts outside the project'; scripts/check-hardening.mjs:43-79 `safeCommand()` returns null for anything outside that shape and its charset regex (:45) rejects quotes.

**Proposed fix.** Say: wrap the Check 5 commands in a repository script (`npm run check:secrets` or `node scripts/check-secrets.mjs`) and point `verify.test.cmd` at it; otherwise record the control as `manual` with the command set in `instructions`.

### skills/oc-security-hardening/SKILL.md:134 — `baseline` reads `tier` from oc-security-auditor's private `skill_state`
*category:* checkpoint · *independently reported 2×*

**Problem.** The proportionality step tells the session to read the auditor checkpoint for the Lite/Standard/Comprehensive tier, but the auditor only records `tier` inside `skill_state`, which the checkpoint protocol forbids sibling skills from reading. No public field carries it.

**Evidence.** SKILL.md:134-136 'read the oc-security-auditor checkpoint for tier (Lite/Standard/Comprehensive)'; skills/oc-security-auditor/SKILL.md:437-441 places `"tier": "standard"` under `### skill_state` and its When-to-Write table (:426-433) names no public field for it; skills/oc-checkpoint-protocol/SKILL.md:376 'Never read `skill_state` — it's private to the owning skill', :725 principle 5. orchestrator.md:155 repeats '(findings + tier)'.

**Proposed fix.** Have oc-security-auditor surface the tier in a public field (a `context_primer.key_decisions` entry or a `progress_table` row) and point SKILL.md:135 at that field; fall back to asking the user when absent.

### skills/oc-security-hardening/SKILL.md:147 — `fix` pulls compliance gaps from oc-compliance-ops' private `skill_state.gaps_chained` instead of the public register
*category:* cross-skill-contract · *independently reported 2×* · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4 L3 reciprocal-edits table, row oc-code-auditor (line 614), Sprint 3

**Problem.** Step 1 says code-auditor marks control-class findings `route: oc-security-hardening` 'in its findings report'; that report is conversation output today with no committed path, so a later session running `/oc-harden fix` has nothing to pull from. Text is accurate to code-auditor's current wording; the gap is the missing durable artifact, already scheduled.

**Evidence.** SKILL.md:146-147 'an oc-compliance-ops register `gap` chained here (by control id in its `gaps_chained`)'; skills/oc-compliance-ops/SKILL.md:245 `gaps_chained` is inside `skill_state`, and :127-128 tells hardening to pull from it; skills/oc-compliance-ops/references/compliance-profile.md:52-59 and :74-75 define the public `chained_to: oc-security-hardening` register field; skills/oc-checkpoint-protocol/SKILL.md:376.

**Proposed fix.** Re-point step 1 at `.opchain/compliance.yaml` controls with `status: gap` and `chained_to: oc-security-hardening`; edit oc-compliance-ops:127-128 to say `gaps_chained` is its private mirror, not the handoff surface.

### skills/oc-signal-forge/SKILL.md:266 — orchestrator.md map has no oc-signal-forge row and none of the dash-forge / api-dev / stack-forge targets reciprocate the declared edges
*category:* orchestrator · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:156-157 ('The upstream/downstream map on origin/main does not add rows for the three new skills')

**Problem.** The Cross-skill wiring tables (:266-276) declare reads from oc-app-architect / oc-stack-forge / oc-api-dev and chains to oc-dash-forge / oc-monitoring-ops / oc-api-dev, but the shared protocol's Upstream/Downstream Map has no `**oc-signal-forge**` row, its Declared chains omit every signal-forge → dash-forge/api-dev/monitoring-ops edge, and the target skills' Read-by/upstream lists never name oc-signal-forge. Only the oc-data-ops edge is declared both ways. Checkpoint discovery and routing depend on that map, so these edges are invisible to the ecosystem.

**Evidence.** `grep -n 'signal-forge' skills/orchestrator.md` → :153 (inside the oc-data-ops row), :210 (handoff to oc-data-ops), :546-558 (registry copy), :664 (tri-agent list), :671 (data-ops chain), :703 (count) — no `| **oc-signal-forge** |` map row between :130-158; Declared chains :665-674 mention signal-forge only as the caller of oc-data-ops. skills/oc-dash-forge/SKILL.md:473-475 'Upstream (common): data-architect handoff, oc-ux-engineer design referral, oc-app-architect design phase' — no signal-forge (`grep -n -i signal-forge` → 0). skills/oc-api-dev/SKILL.md:544-549 Read-by = oc-code-auditor, oc-security-auditor, oc-monitoring-ops, oc-deploy-ops, oc-integrations-engineer. skills/oc-stack-forge/SKILL.md:483-488 Read-by = oc-app-architect, oc-code-auditor, oc-scale-ops, oc-deploy-ops, oc-docs-forge. Contrast oc-data-ops SKILL.md:240 and :251, which list the edge both ways.

**Proposed fix.** Add `| **oc-signal-forge** | oc-app-architect (08-analytics.md), oc-stack-forge (store choice), oc-data-ops (contracted mart) | oc-dash-forge (validated signal + read contract), oc-api-dev (metric endpoint), oc-monitoring-ops (freshness_sla) |` to orchestrator.md :130-158, extend Declared chains :665-674, and add reciprocal rows to oc-dash-forge (upstream list :473), oc-api-dev Read-by (:544) and oc-stack-forge Read-by (:483).

### skills/oc-stack-forge/SKILL.md:37 — Wrong oc-app-architect phase numbers: Phase 5 scaffold does not call stack-forge, sprint decomposition is Phase 4 not Phase 6
*category:* routing · *independently reported 2×*

**Problem.** SKILL.md:37 'Phase 5: Scaffold ──auto-calls──▶ oc-stack-forge project structure' — oc-app-architect Phase 5 (/oc-scaffold) reads its own references/scaffold-guide.md and never mentions stack-forge. SKILL.md:51, :411, :485, :501 place stack-ordered sprint decomposition in oc-app-architect 'Phase 6'; in oc-app-architect, Phase 4 (/oc-roadmap) is 'Sprint Plan (roadmap → sprint decomposition)' and Phase 6 is the Generator/Evaluator build loop. A session would apply /oc-feature at the wrong phase.

**Evidence.** skills/oc-app-architect/SKILL.md:83 '│  (roadmap → sprint decomposition)  ★GATE' under 'Phase 4: Sprint Plan'; :328 '## Phase 4: Sprint Plan (`/oc-roadmap`)'; :373-391 '## Phase 5: Scaffold' has no stack-forge reference (grep -i stack over that range → nothing); :392 '## Phase 6: Build Loop (`/oc-build`)'. oc-app-architect mentions stack-forge only at :22,43,80,139,179-187,204-256,591,642,800.

**Proposed fix.** Change :37 to drop the Phase 5 edge (or make oc-app-architect Phase 5 actually consult stack-forge's per-stack scaffold recipe), and replace 'Phase 6' with 'Phase 4 (/oc-roadmap)' at :51, :411, :485, :501.

### skills/oc-stack-forge/SKILL.md:46 — 'Automatic' / 'auto-invoked' language contradicts orchestrator.md §3 and the skill's own §Invocation section
*category:* orchestrator · *known:* docs/audits/2026-07-04-portability-audit.md:29 (chaining degrades to passive suggestion; no mechanism runs the edge)

**Problem.** SKILL.md:25-26 'Auto-invoked by oc-app-architect', :36-37 'auto-calls', :46-47 'decision tree runs automatically', :253 'it auto-invokes oc-api-dev', :578-579 'Automatic, not optional' — while :429 says it is 'actively invoked ... per orchestrator.md §3', and §3 says edges are conventions with zero autonomous invocations and the stack-forge row is 'a step you run, not an automatic trigger'. A user reading :46-48 ('The user doesn't need to call it separately') would wait for an invocation that never fires.

**Evidence.** skills/orchestrator.md:166-173 'These edges are conventions, not machinery ... produced *zero* autonomous invocations'; :202 '| Stack decision needed | oc-app-architect (Phase 2) | oc-stack-forge | Invoke from Phase 2 (a step you run, not an automatic trigger) |'.

**Proposed fix.** Rewrite :25-26, :36-37, :46-48, :253, :578-579 to 'invoked as an explicit Phase 2 step by oc-app-architect' and keep :429-436 as the single description.

### skills/oc-stack-forge/SKILL.md:55 — `/oc-stack-forge` named as the command but the registered verb is `/oc-stack`, which the body never documents
*category:* routing

**Problem.** SKILL.md:48, :55 ('## /oc-stack-forge — Command Reference'), :438-439 refer to a `/oc-stack-forge` command. Frontmatter commands (:10-13) are /oc-stack, /oc-stack-decide, /oc-feature; the flags registry gates /oc-stack, not /oc-stack-forge. `/oc-stack` itself appears only in the description (:16) and is never explained in the body.

**Evidence.** src/lib/flags/registry.js:291 '"/oc-spec", "/oc-stack", "/oc-stack-decide"' (no /oc-stack-forge); grep -n '/oc-stack[^-]' skills/oc-stack-forge/SKILL.md → only line 16.

**Proposed fix.** Rename the heading and prose to `/oc-stack` (or `/oc-stack-decide`) and add a one-line definition of what bare `/oc-stack` does (menu / same as decide).

### skills/oc-stack-forge/SKILL.md:62 — Body advertises seven verbs missing from frontmatter and the registry; `/oc-deploy` collides with oc-deploy-ops
*category:* routing · *independently reported 2×*

**Problem.** gen-skills-catalog.mjs:88-90 only checks that `commands` is an array; nothing cross-checks it against the command menu in the body, and every derived surface (server.js promptCatalog :55-65, routing.js buildCommandIndex :47-56, plugin commands) is built from frontmatter. Today: oc-stack-forge body lists `/oc-stack-compare` (:62) and `/oc-deploy` (:67) — the latter is oc-deploy-ops' declared verb, so a stack-forge user typing the menu item is routed to deploy-ops; oc-app-architect lists `/oc-export-spec`, `/oc-punch-list` (:57-58); oc-dash-forge lists `/oc-df-status`, `/oc-df-resume` (:68-69); oc-reverse-spec lists `/oc-rev-status`, `/oc-rev-diff` (:60-61). None are declared, so none are MCP prompts and route() falls through (see the /oc-rev-spec finding: `/oc-df-status` and `/oc-rev-status` confidently route to oc-orchestrator).

**Evidence.** src/lib/flags/registry.js:282-292 skillCommandFlags list contains /oc-stack, /oc-stack-decide, /oc-feature, /oc-deploy but no /oc-stack-compare, /typed-pipeline, /testing, /errors, /ci, /checkpoint; skills/oc-deploy-ops/SKILL.md frontmatter commands: /oc-deploy, /oc-deploy staging, /oc-deploy audit; scripts/gen-skills-catalog.mjs:92 'Registry-drift checks (unknown flag names, unregistered command verbs' applies to `data.commands` (:88).

**Proposed fix.** Add the missing verbs to each skill's `commands:` (rename stack-forge's `/oc-deploy` menu row to `/oc-stack-deploy` to avoid the collision), and add the body-vs-frontmatter menu check to gen-skills-catalog.mjs so it fails the build.

### skills/oc-stack-forge/SKILL.md:160 — Publishes its own skill_state for oc-data-ops to read, violating the checkpoint-protocol privacy rule
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** oc-stack-forge:159-162 promises to record `skill_state.decisions.warehouse` / `decisions.queue` / `decisions.transform_tool` and says 'oc-data-ops reads exactly those keys and never re-decides'; oc-data-ops:90-93 reads them. But the canonical skill_state block a session copies from (stack-forge:459-475) lists only decisions.{platform,backend,database,auth,frontend}. A writer following the template never emits the keys the reader depends on, and data-ops then falls back to re-invoking stack-forge.

**Evidence.** skills/oc-checkpoint-protocol/SKILL.md:162 '// Other skills should NOT read this section — it's private to the owning skill.'; :376 '- Never read `skill_state` — it's private to the owning skill'; :725 'Private state stays private.' skills/oc-data-ops/SKILL.md:91-93 'read `skill_state.decisions.warehouse` / `decisions.queue` / `decisions.transform_tool` from its checkpoint'.

**Proposed fix.** Move the three data-platform decisions to a reader-visible surface (context_primer, a spec artifact such as 01-tech-stack.md § Data platform, or a documented top-level field) and update SKILL.md:160-163 and oc-data-ops/SKILL.md:91-93 to read that instead.

### skills/oc-stack-forge/SKILL.md:432 — Reads 'discovery context' from the oc-app-architect checkpoint, but no producer field is named and the protocol restricts what may be read
*category:* cross-skill-contract

**Problem.** Step 1 (:432) reads 'requirements, users, constraints, budget, team experience' from .checkpoints/oc-app-architect.checkpoint.json. oc-app-architect Phase 1 only says 'Write checkpoint: phase "discovery"' and documents no field holding the interview answers; the protocol allows other skills to read header/progress/progress_table/context_primer/blockers only. The handoff has no named field on either side, so a future edit to either checkpoint layout breaks it silently.

**Evidence.** skills/oc-app-architect/SKILL.md:160-173 (Phase 1 ends 'Write checkpoint: phase "discovery".' with no field); grep -n 'skill_state' skills/oc-app-architect/SKILL.md → only :750 (pm.sprint_comments); skills/oc-checkpoint-protocol/SKILL.md:375-376.

**Proposed fix.** Name the field: have oc-app-architect Phase 1 write the discovery summary into context_primer (or a spec/00-discovery.md artifact) and cite that exact location at SKILL.md:432.

### skills/oc-stack-forge/SKILL.md:442 — Gap-analysis mode is advertised with no procedure; oc-reverse-spec hands off to a 'retroactive use mode' that does not exist
*category:* executability · *independently reported 2×*

**Problem.** Gap analysis is one of three standalone uses (:442), a checkpoint write event (:457), a skill_state flag (:472 gap_analysis_done) and a cross-skill read (:481), but no section describes how to run it, what input to open, or what to produce. oc-reverse-spec's /oc-rev-stack says its output 'is designed to feed directly into oc-stack-forge's retroactive use mode' — a mode named nowhere in this skill.

**Evidence.** grep -n -i 'gap\|retroactive' skills/oc-stack-forge/SKILL.md → only lines 442, 457, 472, 481; skills/oc-reverse-spec/SKILL.md:402-422 ('## Phase 4: Stack-Forge Gap Analysis (`/oc-rev-stack`)' ... 'feed directly into oc-stack-forge's retroactive use mode'); oc-reverse-spec:240 names the artifact stack-forge-audit.md, which this skill never mentions.

**Proposed fix.** Add a short 'Gap analysis (existing codebase)' section: input = oc-reverse-spec's stack-forge-audit.md, steps = compare each typed-pipeline link against the recommendation, output = findings summary + gap_analysis_done=true; or drop the mode from :442/:457/:472/:481 and fix oc-reverse-spec:422.

### skills/oc-stack-forge/SKILL.md:461 — Downstream skills read a pack id (`activePack`, chosen vector-DB pack) from this checkpoint that the documented skill_state never writes
*category:* cross-skill-contract

**Problem.** Documented skill_state (:461-473) is stack_path + decisions.{platform,backend,database,auth,frontend} + features_planned + gap_analysis_done (plus warehouse/queue/transform_tool at :161-163). oc-deploy-ops' worked example reads `activePack` from oc-stack-forge.checkpoint.json; oc-rag-forge reads 'the chosen vector-DB pack from the oc-stack-forge checkpoint'; oc-api-dev reads 'the chosen stack'. No pack-id key exists in this skill's contract, so the pack-aware dispatch and the RAG builder read a field nobody documents writing.

**Evidence.** skills/oc-deploy-ops/SKILL.md:695-696 '2. Read pack hint from project's oc-stack-forge.checkpoint.json: activePack: "python"'; skills/oc-rag-forge/SKILL.md:289; skills/oc-api-dev/SKILL.md:294; grep -rn 'activePack\|active_pack' skills/*/SKILL.md src/lib/*.js scripts/*.mjs → only oc-deploy-ops:696; grep -n -i 'pack' skills/oc-stack-forge/SKILL.md → no occurrence inside the skill_state block.

**Proposed fix.** Add a documented, reader-visible pack field (e.g. `stack_path` doubling as pack id, plus a vector-db decision key) to the checkpoint section and align oc-deploy-ops:696 / oc-rag-forge:289 / oc-api-dev:294 to its name and location.

### skills/oc-stack-forge/SKILL.md:483 — Read-by table omits six skills whose text reads this checkpoint, and oc-migration-ops as an invoker; orchestrator.md says 'Read by: —'
*category:* cross-skill-contract

**Problem.** The 'Read by' table (:483-489) lists oc-app-architect, oc-code-auditor, oc-scale-ops, oc-deploy-ops, oc-docs-forge. Readers documented elsewhere but missing here: oc-data-ops, oc-api-dev, oc-rag-forge, oc-security-hardening, oc-integrations-engineer, oc-migration-ops. oc-migration-ops also invokes stack-forge ('Invoke oc-stack-forge to validate target stack'), while :17 and :438-442 say only oc-app-architect invokes it plus three standalone cases. orchestrator.md's pipeline table gives stack-forge no readers at all, contradicting both this table and orchestrator's own rows.

**Evidence.** skills/oc-data-ops/SKILL.md:239 '| oc-stack-forge | Warehouse/queue/transform-tool decision (input, never made here) |'; skills/oc-api-dev/SKILL.md:539 '| oc-stack-forge | Chosen framework + typed-pipeline tooling |'; skills/oc-rag-forge/SKILL.md:289 'Builder reads the chosen vector-DB pack from the `oc-stack-forge` checkpoint'; skills/oc-security-hardening/SKILL.md:266 '| oc-stack-forge | Platform idiom for expressing controls as code |'; skills/oc-integrations-engineer/SKILL.md:668 '| oc-stack-forge | Auth pattern → compatible implementation |'; skills/oc-migration-ops/SKILL.md:565 '| Platform move planned | Invoke oc-stack-forge to validate target stack |' and :670; skills/orchestrator.md:136 '| **oc-stack-forge** | oc-app-architect (discovery context) | — (returns control to oc-app-architect) |' vs :142/:151/:153/:155 listing oc-stack-forge as an input to oc-api-dev, oc-scale-ops, oc-data-ops, oc-security-hardening.

**Proposed fix.** Add the six reader rows and an oc-migration-ops invoker note to SKILL.md; update orchestrator.md:136 'Read by' cell to match (bundled 33×, run npm run sync-bundles).

### skills/oc-telemetry-ops/references/aggregation.md:40 — The export → site `/dashboard` handoff has no receiving end: the page imports only static sample data and there is no loader or file path for a live aggregate
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** aggregation.md:40-42 states '`/dashboard` reads exactly this shape. If no live aggregate is published yet, the page ships clearly-labeled sample data and swaps to the real export when one exists'. SKILL.md:203 lists the site /dashboard as a reader. Nothing implements the swap: dashboard.astro:6 does `import { usage, replays } from "../data/dashboard-static"` (sample: true at dashboard-static.ts:40); grep for usage-aggregate/aggregate.json/loadUsage across site/src returns only the static file and the page's own comment. No file path is named anywhere for where an export would be placed. The Read-by edge cannot be satisfied even if export existed.

**Evidence.** site/src/pages/dashboard.astro:6 `import { usage, replays } from "../data/dashboard-static";` and :12-14 comment 'Until a live aggregate is published it ships labeled SAMPLE data'. `grep -rn 'usage-aggregate\|aggregate.json\|loadUsage' site/src/` → only site/src/data/dashboard-static.ts:5,15,39 and dashboard.astro:62 (the label). `ls site/src/data/` → authors.ts dashboard-static.ts roadmap-types.ts walkthroughs.

**Proposed fix.** Name the export path in aggregation.md (e.g. `site/src/data/usage-aggregate.json`) and have dashboard.astro prefer it over dashboard-static when present with `sample:false`; or reword aggregation.md:40-42 and SKILL.md:203 to say the swap is not yet wired.

### skills/oc-telemetry-ops/references/local-metering.md:71 — Claims an 'opt-out → zero writes' test verifies the consent gate; no such test exists
*category:* gate-reality · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md § 0.3 (diagram honesty fix — applied; the residue that no caller exists anywhere is not tracked)

**Problem.** local-metering.md:71-73 states 'The owning skill (or oc-cost-ops, which already has the token counts) inserts a `runs` row at the end of a metered run'. SKILL.md:90-92 (post-punchlist-0.3) makes the edge 'YOU must call `npm run telemetry -- record`'. Repo-wide, that call appears only at SKILL.md:91 — not in any other SKILL.md, orchestrator.md (bundled everywhere), plugin hook, plugin command, or workflow. oc-cost-ops/SKILL.md never mentions inserting rows or `record` (its only telemetry row, :223, is a Read-by). Further, the flags `record` actually needs (`--skill` required, `--phase --command --tier --cost --in --out --outcome --at --duration`, telemetry.mjs:223-244) are documented nowhere in the skill, so a session that does follow SKILL.md:91 gets `record: --skill is required` (exit 1).

**Evidence.** `grep -rn 'telemetry -- record\|telemetry.mjs\|run telemetry' skills/*/SKILL.md skills/*/references/*.md skills/orchestrator.md plugins/opchain/hooks plugins/opchain/commands .github/workflows mcp/ src/` (bundles excluded) → exactly one hit: skills/oc-telemetry-ops/SKILL.md:91. `grep -n 'telemetry\|usage.sqlite\|runs(' skills/oc-cost-ops/SKILL.md` → :24,:53,:101,:110,:192,:223 — all describe telemetry as the consumer/aggregator, none instruct a write.

**Proposed fix.** Document the `record` flag surface in local-metering.md § Write path (and SKILL.md), and add the call to the one shared surface every skill bundles (orchestrator.md's checkpoint/phase-end protocol) or to a plugin Stop/phase hook; alternatively soften local-metering.md:71-73 to 'a session may insert…' so it stops naming oc-cost-ops as a writer it never claims to be.

### skills/oc-telemetry-ops/SKILL.md:15 — `/oc-telemetry aggregate` and `/oc-telemetry export` are frontmatter commands with no implementation anywhere
*category:* executability · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md has this finding class for oc-cost-ops (:660), oc-dash-forge (:680), oc-deploy-ops (:695), oc-code-auditor

**Problem.** The skill's two output-producing verbs have no executable path. The only implementation, scripts/telemetry.mjs, dispatches enable|disable|status|record and prints `usage: telemetry <enable|disable|status|record>` for anything else (:275). No plugin command, no sqlite CLI invocation, and no output path/destination for the export are documented. telemetry.mjs itself writes next_actions telling the user to 'Run /oc-telemetry aggregate' and 'Run /oc-telemetry export' (:148-149), which is what the live checkpoint says today (:14-15). A session invoked with either verb can only improvise hand-run SQL from aggregation.md:46-59 (which is itself incomplete — see the LOW finding).

**Evidence.** SKILL.md:15-16 list `/oc-telemetry aggregate` / `/oc-telemetry export`; aggregation.md:4-5 '`/oc-telemetry aggregate` computes it from the local store; `/oc-telemetry export` emits it'. `grep -n 'case "' scripts/telemetry.mjs` → enable/disable/status/record only; :275 usage string. `ls plugins/opchain/commands/ | grep -i telem` → nothing. `grep -rn 'aggregate\|export' scripts/telemetry.mjs` → only the next_actions strings at :148-149.

**Proposed fix.** Either add `aggregate` (runs the aggregation.md queries incl. k=5 fold and pipelines_run) and `export` (writes `<path>/opchain-usage-aggregate.json`) subcommands to scripts/telemetry.mjs with the usage string updated, or demote the two verbs in frontmatter/command reference to 'planned' and stop telemetry.mjs from writing next_actions that name them.

### skills/oc-telemetry-ops/SKILL.md:204 — Read-by oc-orchestrator ('most-used skill signal') is unreciprocated and has nothing readable
*category:* cross-skill-contract

**Problem.** SKILL.md:204 and orchestrator.md:157 say oc-orchestrator reads a 'most-used skill' signal from telemetry. oc-orchestrator/SKILL.md contains no mention of telemetry, usage.sqlite, or most-used (grep returns nothing); its Cross-Skill Reads (:747-749) read only checkpoints. There is nothing it could read: the store is gitignored + machine-local, and the telemetry checkpoint carries no usage summary (no skill_state is written by telemetry.mjs). A session routing on this row would look for a signal that no skill produces or consumes.

**Evidence.** `grep -n 'telemetry\|most-used\|most used' skills/oc-orchestrator/SKILL.md` → no matches. oc-orchestrator/SKILL.md:749 '| **Every skill** | Checkpoint status, progress, blockers, next_actions |'. `grep -n skill_state scripts/telemetry.mjs` → no matches.

**Proposed fix.** Either have `aggregate` write `skill_state.last_aggregate` {top_skill, pipelines_run, generated_at} to the tracked checkpoint and add a matching 'oc-telemetry-ops → most-used skill' row to oc-orchestrator's Cross-Skill Reads, or drop the row from SKILL.md:204 and orchestrator.md:157.

### skills/oc-ux-engineer/SKILL.md:21 — oc-ux-engineer ↔ oc-dash-forge boundary is one-way: dash-forge points back with verbs that do not exist, ux-engineer never names dash-forge despite declaring /oc-uxe dash
*category:* routing-collision · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:2033 (the body-level version of the phantom verbs)

**Problem.** oc-dash-forge:30 says 'Invoked by /oc-ux-engineer when the UI is data-heavy and by /oc-app-architect' — two slash tokens that no skill declares (the real verbs are /oc-uxe and /oc-app). The reverse direction is missing entirely: oc-ux-engineer's description (:21-24) names no sibling at all even though it declares /oc-uxe dash (:18) as the hand-off verb, and dash-forge claims "design a dashboard", "analytics UI", "monitoring dashboard" plus the bare /dashboard trigger (:26). Inside a UX session there is nothing on the routing surface pointing at dash-forge, and from dash-forge the pointer back is unresolvable. Neither skill is in tests/routing-disambiguation.test.js; oc-ux-engineer has no eval case.

**Evidence.** skills/oc-dash-forge/SKILL.md:26 `ALWAYS trigger on /oc-data-forge, /oc-dash-forge, /dashboard, /dataviz-design.`; :30 `view". Invoked by /oc-ux-engineer when the UI is data-heavy and by /oc-app-architect`; skills/oc-ux-engineer/SKILL.md:18 `  - /oc-uxe dash`; :21-24 description names no other skill; verb-ownership scan: /oc-ux-engineer and /oc-app-architect declared by no skill.

**Proposed fix.** Rewrite oc-dash-forge:30 to name skills (or the real verbs /oc-uxe dash and /oc-design), and add a clause to oc-ux-engineer:21-24 routing dense-data screens to oc-dash-forge via /oc-uxe dash.

### skills/oc-ux-engineer/SKILL.md:67 — Body utility commands `/oc-uxe status` and `/oc-uxe export` missing from frontmatter commands
*category:* docs-drift · *independently reported 2×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md P1 ('Protocol promises /checkpoint show|reset|list, but the CLI does not implement them')

**Problem.** The UTILITIES block lists `/checkpoint  Show checkpoint status`. It is not in frontmatter `commands:`, there is no `plugins/opchain/commands/checkpoint.md`, no flag-registry verb, and the bundled checkpoint-protocol no longer describes a `/checkpoint` slash verb (only `scripts/checkpoint.mjs status`). The same line is carried by 28 skills; the 2026-06-29 audit logged it and it is still open.

**Evidence.** `ls plugins/opchain/commands/` -> no checkpoint.md; `grep -ln "^  /checkpoint " skills/*/SKILL.md | wc -l` -> 28; `grep -n "/checkpoint" skills/oc-checkpoint-protocol/SKILL.md` -> only scripts/checkpoint.mjs references

**Proposed fix.** Either ship a `/checkpoint` plugin command that runs `npm run checkpoint:status`, or reword the line to `npm run checkpoint:status` (opchain repo) / 'read .checkpoints/oc-ux-engineer.checkpoint.json' and apply fleet-wide.

### skills/oc-ux-engineer/SKILL.md:368 — Design Evaluator verdict enum is PASS/ITERATE standalone but PASS/FAIL in attach mode and in oc-app-architect
*category:* verdict-enum-drift · *surfaced by the executability lens*

**Problem.** oc-ux-engineer's standalone Design Evaluator emits '### Verdict: PASS / ITERATE' (:368) and Step 4 branches on 'ITERATE + rounds remaining' / 'ITERATE + max rounds' (:375-376). The same skill's attach mode emits '### Combined Verdict: PASS / FAIL' (:572). oc-app-architect, which is the consumer when the Design Evaluator auto-attaches, emits '### Verdict: PASS / FAIL' (:515) and branches on 'FAIL + iterations remaining' / 'FAIL + max iterations' (:528-530), and requires the sprint to 'pass BOTH evaluators' (:483). A Design Evaluator that returns ITERATE matches none of oc-app-architect's branches, so the attached sprint has no defined next step.

**Evidence.** skills/oc-ux-engineer/SKILL.md:368 `### Verdict: PASS / ITERATE`; :375-376 `- **ITERATE + rounds remaining**... - **ITERATE + max rounds**...`; :572 `### Combined Verdict: PASS / FAIL`. skills/oc-app-architect/SKILL.md:480 `**UX Evaluator** (auto-attaches on UI sprints):`; :483 `Sprint must pass BOTH evaluators.`; :515 `### Verdict: PASS / FAIL`; :528-530 branches on FAIL.

**Proposed fix.** Pick one enum. Either rename ITERATE to FAIL throughout oc-ux-engineer (:368, :375-376) or add an explicit 'ITERATE is oc-app-architect's FAIL' mapping note beside :483 and :572.

### skills/oc-ux-engineer/SKILL.md:559 — The attach-mode combined report drops oc-app-architect's fourth code criterion
*category:* rubric-drift · *surfaced by the executability lens*

**Problem.** oc-app-architect grades the Code Evaluator on four weighted criteria — Functionality 30%, Feature Completeness 30%, Code Quality 20%, Visual/UX Quality 20% (:456-459) — and gates on 'All criteria >= 6/10' (:402). The Combined Report that oc-ux-engineer's attach mode tells the session to produce lists only three Code Scores (Functionality, Feature Completeness, Code Quality) at :559-563 and then a '**Code Score: [X]/10**'. A session in attach mode therefore omits a criterion the gate it is feeding evaluates, and the weighted Code Score it reports cannot equal oc-app-architect's 30/30/20/20 aggregate.

**Evidence.** skills/oc-app-architect/SKILL.md:456-459 criteria table including `| **Visual/UX Quality** | 20% | Looks intentional, not generic AI slop |`; :402 `| pass_threshold | All criteria ≥ 6/10 |`; :491-495 report lists all four plus `**Code Score: [X]/10**`. skills/oc-ux-engineer/SKILL.md:558-564 Combined Report `### Code Scores` lists Functionality, Feature Completeness, Code Quality, then `**Code Score: [X]/10**` — Visual/UX Quality absent.

**Proposed fix.** Add `- Visual/UX Quality: [X]/10` to the Combined Report's Code Scores block at :562, or state that in attach mode Visual/UX Quality is superseded by the Design Scores block and drop its 20% weight from oc-app-architect:459 when a Design Evaluator is attached.

### skills/oc-ux-engineer/SKILL.md:653 — Cross-Skill Reads names `frontend-design`, which is not an opchain skill
*category:* cross-skill-contract · *independently reported 3×*

**Problem.** This skill says oc-code-auditor reads it ('Component health -> UX audit context', line 658) and that it reads oc-code-auditor's `/oc-audit ux` findings (652). oc-code-auditor's Reads-from table (448-453) does not list oc-ux-engineer at all; instead its Read-by table (460) lists `oc-ux-engineer | Component health -> UX audit context` — the same wording, opposite direction. Only one of the two files can be right about who reads whom.

**Evidence.** skills/oc-code-auditor/SKILL.md:448-453 Reads-from: oc-reverse-spec, oc-app-architect, oc-stack-forge; :460 (under 'Read by') `| oc-ux-engineer | Component health -> UX audit context |`; skills/oc-ux-engineer/SKILL.md:652 reads-from oc-code-auditor, :658 read-by oc-code-auditor with identical 'Component health' text

**Proposed fix.** Delete the row, or add a reciprocal `oc-ux-engineer | Fidelity score -> deploy confidence` row to oc-deploy-ops's Reads-from table and say where oc-deploy-ops reads it (`skill_state.last_fidelity_score` is private, so it would need a top-level field).

### skills/oc-ux-engineer/SKILL.md:684 — PM comment cites an eval-report path no step produces
*category:* executability

**Problem.** The design-eval PM comment template says `Full report: sprints/sprint-{N}/design-eval-round-{M}.md`, but the Evaluator report is defined as `design/sprints/sprint-N/eval-round-M.md` (line 343, file tree lines 597-601), and in plugin mode findings are 'appended to sprint eval report' (line 552), i.e. oc-app-architect's `sprints/sprint-N/eval-round-M.md`. A `design-eval-round-{M}.md` file is written by nothing.

**Evidence.** SKILL.md:343 `saved to \`design/sprints/sprint-N/eval-round-M.md\``; :552 `Design findings appended to sprint eval report`; :684 `Full report: sprints/sprint-{N}/design-eval-round-{M}.md`; `grep -rn design-eval-round skills/*/SKILL.md` matches only this line; oc-app-architect/SKILL.md:485 `saved to \`sprints/sprint-N/eval-round-M.md\``

**Proposed fix.** Change line 684 to `design/sprints/sprint-{N}/eval-round-{M}.md` (standalone) and note that in attached mode the link is oc-app-architect's `sprints/sprint-{N}/eval-round-{M}.md`.

### skills/oc-ux-engineer/SKILL.md:698 — a11y sub-ticket assignee keys on a `pm.yaml` field the canonical schema does not define
*category:* cross-skill-contract

**Problem.** Sub-ticket `assignee` is taken from `.opchain/pm.yaml` `remediation_owners.frontend`, and line 667 defers to oc-integrations-engineer as the canonical PM-MCP source. That skill's `.opchain/pm.yaml` schema (provider, team_or_project, issue_types, states, labels_default, mcp_server) has no `remediation_owners` key, and its pm-mcp-protocol.md never mentions it. The key exists only in consumer skills' prose, so a pm.yaml written per the canonical schema leaves the assignee unresolvable.

**Evidence.** skills/oc-integrations-engineer/SKILL.md:565-580 pm.yaml block (no remediation_owners); `grep -n remediation_owners skills/oc-integrations-engineer/references/*.md` -> no output; consumers: oc-code-auditor:507, oc-scale-ops:471, oc-security-auditor:520, oc-monitoring-ops:703, oc-ux-engineer:698

**Proposed fix.** Add `remediation_owners: { frontend, security, infra, ... }` to the canonical pm.yaml schema in oc-integrations-engineer (and pm-mcp-protocol.md), or make this skill's assignee rule 'if `remediation_owners.frontend` is set, else unassigned'.

### skills/oc-ux-engineer/SKILL.md:706 — `/oc-uxe consistency` is not a command anywhere in the skill
*category:* routing

**Problem.** The PM 'Design-system drift comments' section is triggered by `/oc-uxe consistency`, but that verb is absent from frontmatter `commands:` (lines 10-20), from the command reference block (45-71) and from the component-library subcommands (493-496). The consistency check the skill actually defines is `/oc-uxe components audit` (495, 499-507).

**Evidence.** `grep -n consistency skills/oc-ux-engineer/SKILL.md` -> the only slash-command form is :706 `If \`/oc-uxe consistency\` finds drift`; frontmatter :10-20 has no such entry

**Proposed fix.** Replace `/oc-uxe consistency` with `/oc-uxe components audit` (or add the verb to frontmatter and the command reference if it is meant to be distinct).

### skills/oc-ux-engineer/SKILL.md:732 — PM-MCP section does not follow the v1.3 executable contract it is bound by
*category:* cross-skill-contract

**Problem.** oc-integrations-engineer states that every PM-MCP write by an opchain skill must follow references/pm-mcp-protocol.md and that downstream skills cite both the section and the protocol doc. This skill cites only the skill name (667-668), and its failure mode 'MCP unavailable -> log intent to checkpoint' names no field: `pm_refs`, `pm_deferred_actions`, `retriable` and `--retry-pm` occur zero times in the file, so 'log intent' has no schema location and the deferred write can never be replayed. (Same gap in oc-dash-forge, oc-code-auditor, oc-scale-ops, oc-security-auditor.)

**Evidence.** skills/oc-integrations-engineer/SKILL.md:464-466 'v1.3 makes it executable. **Every PM-MCP write made by an opchain skill must follow that contract.**' and :471 'downstream skills cite this section AND the protocol doc'; `grep -c "pm_refs\|pm_deferred_actions\|--retry-pm" skills/oc-ux-engineer/SKILL.md` -> 0; oc-checkpoint-protocol/SKILL.md:543-553 defines `pm_refs` as the sibling-readable field

**Proposed fix.** Point line 667 at `oc-integrations-engineer/references/pm-mcp-protocol.md`, and rewrite line 732 as 'MCP unavailable -> append to `pm_deferred_actions[]` with `retriable: true`; record filed ticket ids in `pm_refs`'.

### skills/orchestrator.md:142 — Orchestrator + oc-api-dev read `03-data-model.md`, a spec file oc-app-architect never generates
*category:* cross-skill-contract · *independently reported 2×*

**Problem.** The Upstream/Downstream row for oc-api-dev says it reads oc-app-architect's `02-architecture.md` and `03-data-model.md`; oc-api-dev/SKILL.md repeats `03-data-model.md` at :144, :162 and :538 ('Open `03-data-model.md`'). oc-app-architect's Phase 2 spec set (:245-258) has no such file: `03-` is `03-security-auth.md` (:250) and the data model lives inside `02-architecture.md` (:249 'System diagram, data model, API design'). oc-app-architect's own cross-skill row (:648) names a third non-existent variant, `03-architecture.md`. oc-reverse-spec (:228, :503) also emits `03-security-auth.md`. A session running `/oc-api design` per the protocol looks for a file that will never exist on any project.

**Evidence.** orchestrator.md:139 `| **oc-code-auditor** | oc-reverse-spec, oc-app-architect | oc-security-auditor (posture review above code-level findings), oc-deploy-ops (pre-deploy gate) |`; skills/oc-code-auditor/SKILL.md:454-462 Read-by rows: oc-deploy-ops, oc-git-ops, oc-docs-forge, oc-app-architect, oc-ux-engineer, oc-security-hardening, oc-qa-ops; `grep -n 'oc-security-auditor' skills/oc-code-auditor/SKILL.md` → only :202 prose.

**Proposed fix.** Replace `03-data-model.md` (orchestrator.md:142, oc-api-dev:144/:162/:538) and `03-architecture.md` (oc-app-architect:648) with `02-architecture.md` (data-model section), or add a real `03-data-model.md` to the app-architect spec table and spec-template. Sync bundles afterwards.

### skills/orchestrator.md:191 — §3 Handoff Points has no row for any edge declared by the v1.5 AI-native or v1.7 skills
*category:* orchestrator · *independently reported 3×* · *known:* docs/audits/2026-06-29-checkpoint-system-audit.md:159 ('Handoff points do not include app-architect -> signal-forge, modularize -> migration/fleet, or

**Problem.** §2 draws `oc-deploy-ops ──► oc-monitoring-ops` (:66) and the Upstream row :148 lists it as deploy-ops' only chain; oc-deploy-ops/SKILL.md:357-364 implements it as an active `Skill(...)` invocation. §3 has no 'production promotion succeeds → oc-deploy-ops → oc-monitoring-ops' row. Likewise absent from §3 despite appearing in the Upstream table's 'Chains to' column: oc-code-auditor → oc-security-auditor (:139, also §8 :685 'Quality gates: oc-code-auditor → oc-security-auditor'); oc-integrations-engineer → oc-code-auditor (:141); oc-migration-ops → oc-deploy-ops / oc-monitoring-ops (:143); oc-api-dev → four targets (:142); oc-data-ops → monitoring/dash/migration (:153); oc-compliance-ops → hardening/release/docs (:154); oc-security-hardening → monitoring (:155); oc-qa-ops → scale/api-dev/bug-check (:152); oc-cost-ops → prompt/telemetry/orchestrator (:156). The two tables in the same file disagree on which edges exist.

**Evidence.** orchestrator.md:191-213 handoff table (21 rows; From/To columns contain none of oc-claude-api, oc-rag-forge, oc-agent-forge, oc-prompt-ops, oc-modularize-ops, oc-fleet-ops); skills/oc-app-architect/SKILL.md:198-199 'Route per orchestrator.md §3 (Active Invocation), only to the skills the app actually needs:' followed by the four-row table :202-207; skills/oc-modularize-ops/SKILL.md:301 `## Handoff contract — the modularize → migration → fleet chain`.

**Proposed fix.** Add §3 rows: 'AI signal in discovery → oc-app-architect (Phase 2) → oc-claude-api (hub) then rag/agent/prompt as applicable'; 'Validated signal → oc-signal-forge → oc-dash-forge (/oc-data-forge) / oc-monitoring-ops (freshness SLA) / oc-api-dev'; 'Module extracted → oc-modularize-ops → oc-migration-ops (Structural plan) → oc-fleet-ops (/oc-fleet deploy)'; 'Fleet up → oc-fleet-ops → oc-monitoring-ops, oc-git-ops (IaC commit)'.

### skills/orchestrator.md:206 — §3 release-ship row ends at `/oc-git-sync v<semver>` and never names `/oc-git-release`; 'Tag the release' is routed to oc-release-ops
*category:* release-plan · *independently reported 2×*

**Problem.** The row for '/oc-release ship advances to PR' says: invoke `/oc-docs pr`, then `/oc-git-sync v<semver>`, 'oc-release-ops resumes after merge'. It never mentions the signed tag. oc-release-ops/SKILL.md:278-281 says '**After the PR merges, run `/oc-git-release <semver>`.** This is the step … because this handoff named no verb and oc-git-ops had none to name', and CLAUDE.md records that 13 releases shipped against 3 tags for exactly that reason; `npm run deploy` now refuses an untagged catalog. The shared protocol — the copy bundled into every skill — still describes the pre-v1.8.3 handoff. Compounding it, §4 :289 routes the phrase 'Tag the release' to oc-release-ops `/oc-release plan`, while oc-git-ops' frontmatter (:20-22) claims the same phrase ('tag the release') for `/oc-git-release`, and the oc-release-ops frontmatter (:24) claims it too — two skills advertise the same trigger with different verbs, and the router picks the one that cannot tag.

**Evidence.** orchestrator.md:206 `… then oc-git-ops \`/oc-git-sync v<semver>\` with the bump commit (the pre-PR gate runs as usual); oc-release-ops resumes after merge |` (no `/oc-git-release`); :289 `| "Cut a release" / … / "Tag the release" | oc-release-ops | /oc-release plan |`; skills/oc-release-ops/SKILL.md:278 `**After the PR merges, run \`/oc-git-release <semver>\`.**`; skills/oc-git-ops/SKILL.md:20-22 `Owns the release tag that oc-release-ops hands off. Use for … /oc-git-release, … "tag the release"`; Upstream row :150 'oc-git-ops (release PR / tag)' names no verb.

**Proposed fix.** Extend :206 (or add a row 'release PR merged → oc-release-ops → oc-git-ops `/oc-git-release <semver>` (signed tag; deploy refuses without it)'); split the §4 row so 'Tag the release' → oc-git-ops `/oc-git-release`; remove 'tag the release' from one of the two frontmatter descriptions and mirror in §7.

### skills/orchestrator.md:274 — §4 Smart Routing routes 18 of the 32 command-bearing skills; 14 are unreachable by intent, including a quality gate and the pipeline terminal
*category:* routing · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 item 1 (skill-local table lacks the four v1.9 rows) — partial; docs/audits/2026-06-29-c

**Problem.** The §4 table (:274-294) has routes for oc-app-architect, reverse-spec, stack-forge, bug-check, docs-forge, repo-ops, code-auditor, ux-engineer, integrations-engineer, api-dev, deploy-ops, git-ops, scale-ops, release-ops, qa-ops, data-ops, compliance-ops, security-hardening. No row routes to oc-security-auditor (a §2 'quality gate'), oc-monitoring-ops (the §2 pipeline terminal), oc-migration-ops, oc-dash-forge, oc-orchestrator (`/oc-ops`), oc-claude-api, oc-rag-forge, oc-agent-forge, oc-prompt-ops, oc-cost-ops, oc-telemetry-ops, oc-signal-forge, oc-modularize-ops, oc-fleet-ops — all of which declare commands in frontmatter. §4 says 'Claude routes to the right skill and phase based on the request' (:270-271); for 14 skills the router has no rule. The skill-local copy (oc-orchestrator/SKILL.md:523-540) routes oc-dash-forge, which §4 omits, and omits seven skills §4 has — the two tables have diverged in both directions.

**Evidence.** orchestrator.md:276-294 rows enumerated (18 distinct Route-to skills); frontmatter `commands` non-empty for all 32 non-protocol skills (script output); skills/oc-orchestrator/SKILL.md:520-521 'This operationalizes the routing table currently in orchestrator.md'; :538 `| "dashboard", "analytics UI", "BI design" | oc-dash-forge | /oc-data-forge |` (absent from §4); §4 has bug-check/api-dev/release-ops/qa-ops/data-ops/compliance-ops/security-hardening rows the skill-local table lacks.

**Proposed fix.** Add one §4 row per unrouted skill using the trigger phrases from its own §7 description (e.g. 'Threat model this app' → oc-security-auditor /oc-security posture; 'Set up monitoring' → oc-monitoring-ops /oc-monitor setup; 'Migrate from X to Y' → oc-migration-ops /oc-migrate assess; 'Design a dashboard' → oc-dash-forge /oc-data-forge; 'Build an agent' → oc-agent-forge; 'Kubernetes/terraform' → oc-fleet-ops /oc-fleet topology …), then regenerate the skill-local table from §4 (or the reverse) so they cannot diverge.

### skills/orchestrator.md:338 — §7 descriptions: 11 of 32 blocks do not match the SKILL.md frontmatter despite the 'should match exactly' rule
*category:* docs-drift · *independently reported 2×* · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 item 13 ('Sprint 5 adds the one still missing + the two new = 35')

**Problem.** Line 339 says each skill's frontmatter description 'should match exactly'. A whitespace-normalized diff (scripts/lib/frontmatter.mjs parser) finds 21 exact matches and 11 mismatches. First differing phrase per skill (§7 vs frontmatter): oc-code-auditor (:388) lacks `"security audit"` and ends `any code-level quality question. For fast pre-commit checks, escalate…` vs FM `any code quality question.`; oc-cost-ops (:528) FM adds `Pairs with oc-prompt-ops … and oc-telemetry-ops…`; oc-dash-forge (:411) `Dashboard and dense-information` vs FM `Specialized dashboard and dense-information` (FM also lists /dashboard, /dataviz-design and eleven extra trigger phrases); oc-deploy-ops (:454) `audit gate → staging → production.` vs FM `→ production → monitoring.`; oc-git-ops (:447) `branch, commit, PR, sync.` vs FM `…, sync, release tag.` (FM adds /oc-git-release and 'tag the release'); oc-integrations-engineer (:419) FM adds `When the destination is the data warehouse…`; oc-migration-ops (:438) `live systems. Database migrations` vs FM `live systems: database migrations` (FM also lists /oc-migration, /oc-move-to, /oc-platform-move, ecosystem-upgrade triggers); oc-monitoring-ops (:460) `Sits after oc-deploy-ops —` vs FM `Sits after oc-deploy-ops in the pipeline —` (FM has 9 more triggers); oc-orchestrator (:474) FM adds `, or any question about pipeline state across projects`; oc-security-auditor (:395) `(CSP, TLS, DNS, WAF), and attack-surface mapping. Runs ABOVE` vs FM `(CSP, TLS, DNS, WAF, Cloudflare config), and attack surface mapping. Operates ABOVE` (FM also lists /oc-sec, /oc-posture); oc-telemetry-ops (:537) `usage metering to a local` vs FM `usage metering that records which skills and phases actually run, to a local`. Because §7 is the trigger-optimization surface and the v2.0 plan promises to sync new descriptions 'verbatim' into it, the drift means trigger phrases added to frontmatter since the blocks were written (e.g. 'tag the release', '/oc-posture', 'ecosystem upgrade') are invisible to anyone tuning from §7.

**Evidence.** Script output: `exact matches: 21`; `MISMATCH oc-git-ops (§7 line 447) §7: …flow: branch, commit, PR, sync. Chains to… FM: …flow: branch, commit, PR, sync, release tag. Chains to…`; `MISMATCH oc-deploy-ops (§7 line 454) §7: …audit gate → staging → production. Use for… FM: …→ production → monitoring. Use for…`; orchestrator.md:339 `Each skill's YAML frontmatter \`description\` field should match exactly:`.

**Proposed fix.** Regenerate §7 from frontmatter (a `gen-orchestrator-descriptions` step, or make the §7 block the source and have gen-skills-catalog assert equality) so the two cannot drift; until then paste the 11 frontmatter descriptions into their blocks.

### skills/README.md:61 — skills/README.md phase column disagrees with frontmatter for three skills (hand-maintained table, no check)
*category:* generated-surface · *independently reported 2×*

**Problem.** The README skill table (the copy that ships in every zip via make-skills-zip.sh:53 and mirrors to the public repo) says oc-stack-forge is `plan` (frontmatter phases: plan,build), oc-ux-engineer `plan+build` (frontmatter: plan) and oc-integrations-engineer `plan+build` (frontmatter: build). /skills, /skills.json, list_skills and the architecture diagram all read frontmatter, so the README contradicts every other surface. Nothing in gen-skills-catalog.mjs, check-release-surfaces.mjs or the tests compares the table to frontmatter.

**Evidence.** skills/README.md:61 "| oc-stack-forge | plan | Universal stack advisor |" vs skills/oc-stack-forge/SKILL.md:7 `phases: [plan, build]`; skills/README.md:62 "| oc-ux-engineer | plan+build |" vs skills/oc-ux-engineer/SKILL.md:7 `phases: [plan]`; skills/README.md:66 "| oc-integrations-engineer | plan+build |" vs skills/oc-integrations-engineer/SKILL.md:7 `phases: [build]`. All other 30 rows match.

**Proposed fix.** Decide the truth per skill (integrations-engineer has a Planner phase — likely frontmatter should be [plan, build]; ux-engineer's Design Planner/Generator loop suggests [plan, build]; stack-forge is arguably plan-only), then align both surfaces, and make gen-skills-catalog.mjs or `/oc-repo catalog` diff the README phase column against frontmatter.

### src/lib/flags/registry.js:283 — Ten verbs are advertised in descriptions but declared in no `commands:` block, so they sit outside the skills.command.<verb>.enabled gate the registry keeps in exact sync with commands
*category:* verb-gate-drift · *surfaced by the routing lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md:1296 (MCP-side invisibility of the same aliases)

**Problem.** src/lib/flags/registry.js:277-280 states the flag source is 'every verb that appears in commands: across the SKILL.md set', and the two sets are today in exact sync — 69 declared roots, 69 registry entries, no difference in either direction. But ten verbs are advertised to the router in `description:` text only and therefore have no flag at all: /oc-git-commit (oc-bug-check:22), /oc-ux-engineer and /oc-app-architect (oc-dash-forge:30), /oc-migration, /oc-upgrade, /oc-refactor, /oc-swap, /oc-move-to, /oc-platform-move (oc-migration-ops, 'ALWAYS trigger on'), /oc-rev-spec (oc-reverse-spec:18). Turning off skills.command.oc-migrate.enabled leaves six alias triggers advertised; the verb gate cannot reach the aliases it does not know about, and no validator compares /oc-* tokens in `description` against declared verbs.

**Evidence.** Script diff: declared roots (69) minus registry verbs (69) = empty both ways; description-advertised verbs with no `commands:` entry = the ten listed. src/lib/flags/registry.js:277-282 comment; :283-307 the verb array; scripts/check-skill-flags.mjs gates on frontmatter commands only.

**Proposed fix.** Add a build-time check (gen-skills-catalog.mjs or check-skill-flags.mjs) asserting every /oc-* token in a description is either that skill's own declared verb or another skill's declared verb; then either declare the aliases (and register their flags) or delete them from the descriptions.

### src/lib/mcp/routing.js:31 — 15 skills have no natural-language routing rule at all, and "build an agent" (oc-agent-forge's own trigger) routes to oc-app-architect
*category:* routing

**Problem.** INTENT_HINTS covers 18 skills. oc-agent-forge, oc-claude-api, oc-cost-ops, oc-fleet-ops, oc-modularize-ops, oc-prompt-ops, oc-rag-forge, oc-signal-forge, oc-telemetry-ops (plus the six §4 rows in the separate finding) have no rule, so the trigger phrases their descriptions promise ("build an agent", "prompt caching", "what did this cost", "which skills do people use", "update all skills") fall to the orchestrator over MCP; worse, the generic `build (an?|the) ` clause at :31 captures "build an agent" for oc-app-architect with confident:true, overriding oc-agent-forge's description.

**Evidence.** route("build an agent") → `oc-app-architect /oc-discover true`; route("prompt caching"), route("rag pipeline"), route("what did this cost"), route("token cost"), route("which skills do people use"), route("modularize"), route("fleet") → `oc-orchestrator /oc-ops false`.

**Proposed fix.** Generate the NL hints from each skill's description trigger phrases at gen-mcp-catalog time (quoted "..." phrases in `description` are already the Claude Code trigger contract), ordered most-specific-first, instead of a hand table; at minimum add rows for the AI-native quartet and the instrumentation pair and move the app-architect catch-all to the end.

### src/lib/mcp/server.js:247 — MCP write_checkpoint claims to persist "per the opchain checkpoint protocol" but performs no schema validation on either transport, while checkpoint.mjs already exports validate()
*category:* cross-skill-contract

**Problem.** The tool description (:143-144) tells clients the checkpoint is stored per the protocol, but write_checkpoint (:247-273) accepts any non-array object up to 64 KiB and stores it verbatim (KV via index.js:611-620; Map via local-server.mjs:58). No `schema_version`, `skill`, `status`, `updated_at` or `next_actions` shape is checked, and the protocol document itself is not served over MCP (see the references/ finding), so an MCP session has neither the contract nor a validator. The repo's validator is exported at checkpoint.mjs:964 (`validate`, `SCHEMA_VERSION`, `ACCEPTED_SCHEMA_VERSIONS`) and is zero-deps Node, yet neither transport calls it. read_checkpoint then hands back whatever was written, so a malformed checkpoint silently becomes the resume state.

**Evidence.** server.js:251-253 is the only content check (`typeof a.checkpoint !== "object" || Array.isArray(...)`); grep -n validate src/lib/mcp/server.js mcp/local-server.mjs → no hits; checkpoint.mjs:964 `export { validate, ... }`.

**Proposed fix.** Factor the pure shape rules out of checkpoint.mjs (or import `validate` directly in local-server.mjs, and a Worker-safe subset in server.js) and reject writes with `isError` + the error list; at minimum require `schema_version ∈ ACCEPTED_SCHEMA_VERSIONS`, `skill === <tool arg>`, `status ∈ STATUS_ENUM`, and `next_actions` array. Expose the protocol via a `get_checkpoint_protocol` tool/resource so the client can read what it is being held to.

### tests/checkpoint.test.js:5 — No test covers merge-checkpoint.mjs, session-state.cjs, or the doctor/update/done/reset/init/list/show CLI paths
*category:* tooling

**Problem.** tests/checkpoint.test.js imports only validate/rank/pickNext/recommendedAction/token helpers (lines 5-18); every command function (cmdDoctor, cmdUpdate, cmdDone, cmdReset, cmdInit, cmdList, cmdShow, cmdStatus) is untested, which is how the doctor path-reconstruction bug and the update-does-not-restamp gap persist. tests/install-git-drivers.test.js:48 only asserts the git config string contains 'merge-checkpoint.mjs'; the driver's merge semantics (the thing the protocol's 2026-05-15 incident note is about) have zero coverage, and the one-sided-telemetry drop above passes silently. package.json:53 `test:hooks` runs test-gate + test-suggestion only; session-state.cjs has no suite.

**Evidence.** `grep -rln merge-checkpoint tests/` → only tests/install-git-drivers.test.js (line 48 `expect(git(repo, "config", "merge.opchain-checkpoint.driver")).toContain("scripts/merge-checkpoint.mjs")`); `grep -rln session-state tests plugins/opchain/hooks package.json` → only hooks.json; tests/checkpoint.test.js:5-18 import list.

**Proposed fix.** Add tests/merge-checkpoint.test.js (spawn the driver on fixture triples), a session-state hook suite in test:hooks, and CLI integration tests driven through OPCHAIN_CHECKPOINTS_DIR for doctor/update/done/reset.


## LOW — upheld (143)

### .checkpoints/oc-code-auditor.checkpoint.json:1 — Live oc-code-auditor checkpoint carries loop_state and verified_tree keys that its SKILL.md never defines, and has sat in_progress 20d with 3 critical / 12 high open
*category:* live-checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md P3c, P3d, P3e (abandon verb)

**Problem.** The live file's skill_state includes `loop_state: "open"` and `verified_tree` — names proposed in punchlist P3c/P3d but absent from skills/oc-code-auditor/SKILL.md (:431-441) — so the data implements a contract no doc defines. It is `in_progress` since 2026-08-22 (doctor: 20d stale) with findings_by_severity {critical:3, high:12}; session-state.cjs:79-85 will print it as an open loop every session, and its next_actions[0] is the OSS-readiness triage the v2.0 plan blocks on.

**Evidence.** node read of .checkpoints/oc-code-auditor.checkpoint.json → skill_state keys include `loop_state`, `verified_tree`; status in_progress, updated_at 2026-08-22T08:18:58Z; doctor: `⚠ [oc-code-auditor] in_progress but last updated 20d ago`; `grep -n loop_state skills/oc-code-auditor/SKILL.md` → none.

**Proposed fix.** Either document loop_state/verified_tree in oc-code-auditor's skill_state section or reconcile the live checkpoint (blocked on OSS split → status blocked with a blocker, or rotate to history/).

### .checkpoints/oc-code-auditor.checkpoint.json:23 — oc-code-auditor's coordination note names three open gate PRs but two more are open on the same files
*category:* incomplete-reference · *surfaced by the live-checkpoints lens*

**Problem.** next_actions[1] (line 23) says "Coordinate with open PRs #499/#505/#507 which already touch these files." `gh pr list --state open` also returns #504 ("fix(gate): scope the wrapper re-scan to what the wrapper runs") and #506 ("fix(gate): treat exec/caffeinate/builtin/script as transparent prefixes (GATE-09)") — #506 addresses the same GATE-09 exec/prefix bypass family the Tier 0 item lists, so a session coordinating only the three named PRs would duplicate #506's work.

**Evidence.** gh pr list --state open → 507 claude/gate-span-false-positives, 506 claude/recursing-bell-e379d5, 505 claude/gate-substitution-holes, 504 claude/gate-wrapper-scope, 499 claude/magical-hertz-e4e291. All five touch plugins/opchain/hooks/pre-commit-gate.cjs.

**Proposed fix.** Amend next_actions[1] to name all five open gate PRs (#499, #504, #505, #506, #507) and note which CRITICAL each already covers.

### .checkpoints/oc-orchestrator.checkpoint.json:7 — Live checkpoint is `complete` at v1.5.0 with next_actions pointing at v1.6, three minor releases and 81 days stale
*category:* live-checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md Tier 1 §0.1 table row '27d | ... oc-orchestrator ... | complete | no'

**Problem.** updated_at 2026-06-22, status complete, step v1.5.0-shipped-and-live, next_actions[0] 'Next theme is v1.6 ...'. The catalog is at v1.9.0 (tagged 2026-09-02). SKILL.md's own Principle 7 (:995-996) says stale data is worse than no data; the plugin's oc-ops.md:14-16 and session-state.cjs:4-8 exist specifically because of this file's staleness.

**Evidence.** .checkpoints/oc-orchestrator.checkpoint.json:7 `"updated_at": "2026-06-22T16:35:00Z"`, :10 `"status": "complete"`; next_actions[0] text 'Next theme is v1.6'; plugins/opchain/hooks/session-state.cjs:4-5 'the orchestrator checkpoint sat `complete` at v1.5.0 for 27 days'.

**Proposed fix.** Restamp via `node scripts/checkpoint.mjs update oc-orchestrator --phase=... --step=v1.9.0-shipped --next_actions:json='[...]'` at the next inflection point, or archive with `checkpoint reset` if the coordinator state is not maintained.

### .checkpoints/oc-orchestrator.checkpoint.json:160 — Four checkpoints carry generated_files paths that predate the oc- rename or point at deleted files
*category:* dangling-pointer · *surfaced by the live-checkpoints lens*

**Problem.** context_primer.generated_files holds nine dangling entries across four files. oc-orchestrator (entries 0-3): .checkpoints/stack-forge.checkpoint.json, .checkpoints/orchestrator.checkpoint.json, .checkpoints/app-architect.checkpoint.json, .checkpoints/git-ops.checkpoint.json — all pre-oc- names whose real files exist with the prefix. oc-stack-forge (entries 0, 1, 13): skills/stack-forge/packs/_schema.json, .../CONTRIBUTING.md, .../typescript/pack.yml — all exist under skills/oc-stack-forge/packs/. oc-ux-engineer (entry 9): site/src/components/RoadmapTimeline.astro, genuinely deleted (only RoadmapForm.astro remains) yet still listed in skill_state.components_owned. oc-app-architect (entry 8): site/src/blog/2026-07-03-we-deleted-our-deploy-pipeline-on-purpose.md, absent from site/src/blog/.

**Evidence.** `node scripts/checkpoint.mjs doctor` reports eight of the nine (it truncates oc-orchestrator's fourth). `ls skills/oc-stack-forge/packs/_schema.json` succeeds; `ls site/src/components/ | grep -i roadmap` returns only RoadmapForm.astro.

**Proposed fix.** Rewrite the pre-rename paths with the oc- prefix, drop the deleted RoadmapTimeline.astro from both generated_files and skill_state.components_owned, and either restore or remove the missing blog post entry.

### .checkpoints/oc-stack-forge.checkpoint.json:1 — Live checkpoint's skill_state is release-tracking state, not the documented stack-decision shape; 81 days stale
*category:* live-checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md §0.5 (project_dir — now fixed) and Tier 1 §0.1 (27d-stale `complete` checkpoints not flagged); docs/audits/2

**Problem.** The tracked checkpoint (protocol_version 1.1, status complete, updated_at 2026-06-22, project 'opchain.dev v1.4') has skill_state keys release_target, linear_parent, linear_pr_tickets, linear_patch_tracker, linear_cancelled, branch, scope_at_cut, skills_to_bump, skills_unchanged, deferred_to_v15, deferred_to_v16_plus, depends_on, deploy_method — none of stack_path / decisions / features_planned / gap_analysis_done from SKILL.md:461-473. oc-data-ops following SKILL.md:160-163 would find no decisions.* keys. progress_summary is still 2330 chars.

**Evidence.** python3 -c "import json;d=json.load(open('.checkpoints/oc-stack-forge.checkpoint.json'));print(list(d['skill_state']))" → ['release_target','linear_parent','linear_pr_tickets','linear_patch_tracker','linear_cancelled','branch','scope_at_cut','skills_to_bump','skills_unchanged','deferred_to_v15','deferred_to_v16_plus','depends_on','deploy_method']; updated_at '2026-06-22T16:35:00Z'; len(progress_summary)=2330; project_dir already corrected to /Users/aidanelsesser/repos/opchain.

**Proposed fix.** Archive the v1.4 release-tracking body to .checkpoints/history/ and reset skill_state to the documented shape (or an explicit 'no project decision recorded' stub) so readers find the contract they are told to expect.

### .checkpoints/oc-stack-forge.checkpoint.json:95 — oc-stack-forge packs two real file paths into one generated_files entry, which the doctor path check cannot evaluate
*category:* format · *surfaced by the live-checkpoints lens*

**Problem.** One generated_files entry reads "tests/pack-dispatch.test.js + tests/api-dev-adapters.test.js (PR 3, 29218da — extended in PR 4)". Both files exist individually, but the entry is a sentence, not a path: scripts/checkpoint.mjs:728 strips only the " (" suffix, leaving "tests/pack-dispatch.test.js + tests/api-dev-adapters.test.js", which then fails the ARTIFACT_PREFIXES filter at :730 (tests/ is not listed) and is skipped entirely. Had the prefix list included tests/, this would have produced a false "missing path" warning.

**Evidence.** `ls tests/pack-dispatch.test.js tests/api-dev-adapters.test.js` — both present. The concatenated form is the only multi-path entry in any checkpoint's generated_files.

**Proposed fix.** Split into two entries and move the "(PR 3, 29218da — extended in PR 4)" provenance into a parenthetical on each, matching the one-path-per-entry convention the rest of the array follows.

### .checkpoints/README.md:17 — Fifteen skills have never written a checkpoint despite shipping artifacts that are in git history
*category:* missing-state · *surfaced by the live-checkpoints lens*

**Problem.** 17 of 33 skills have a .checkpoints/<id>.checkpoint.json. The absent fifteen (oc-agent-forge, oc-api-dev, oc-claude-api, oc-dash-forge, oc-data-ops, oc-fleet-ops, oc-integrations-engineer, oc-migration-ops, oc-modularize-ops, oc-prompt-ops, oc-rag-forge, oc-reverse-spec, oc-scale-ops, oc-security-auditor, oc-signal-forge) include several with hard evidence of having run: oc-prompt-ops owns prompts/opchain-eval/ (eval.yaml, inputs.jsonl, expected.jsonl), landed in 3f1ccb7 and touched again by 7820a18 and 385e28e, and is one of the three documented eval_scores owners (oc-checkpoint-protocol/SKILL.md:660); oc-migration-ops is the skill the protocol names (:706-707) as owning the "1.0" → "1.1" forward sweep, and all seventeen live files are stamped "1.1"; oc-security-auditor is a mandatory deploy-gate participant. Because oc-orchestrator's registry and `/oc-ops next` derive entirely from checkpoint files, those fifteen skills are invisible to every coordination surface.

**Evidence.** `for s in skills/oc-*/; do [ -f .checkpoints/$s.checkpoint.json ] || echo $s; done` lists the fifteen plus oc-checkpoint-protocol (not directly invoked). prompts/opchain-eval/ exists with four files; `git log --oneline -3 -- prompts/opchain-eval` → 385e28e, 7820a18, 3f1ccb7.

**Proposed fix.** Have each of these skills write a minimal checkpoint on its first run of a session, and add a `checkpoint coverage` command (punchlist P8) that reports which catalog skills have never produced state — so silence is distinguishable from never-ran.

### .checkpoints/README.md:58 — README schema table drifts from validator and protocol: next_actions marked optional string[]; pm_refs shape differs; recently_done/resumed_from undocumented everywhere
*category:* docs-drift

**Problem.** README:58 lists `next_actions` as optional `string[]`; the validator hard-errors on empty next_actions when in_progress (checkpoint.mjs:254) and accepts `{text, done_when}` objects (:257-268, protocol:150-153). README:59 gives pm_refs as `{ provider, id, role?, url? }` while protocol:560-568 adds `created_by_skill` and `first_seen_at`. `done` writes `recently_done[]` (checkpoint.mjs:887-889) and the write table tells skills to record `resumed_from` (protocol:261); neither key appears in the protocol schema (:82-166) or README table (:43-63). A validator tightening on unknown keys, or a reader looking for the resume trail, has nothing to go on.

**Evidence.** .checkpoints/README.md:58 `| next_actions |   | string[] | Ordered...`; scripts/checkpoint.mjs:254 `if (data.status === "in_progress" && naLen === 0) errors.push(...)`; :887 `data.recently_done = [];`; protocol:261 `record resumed_from when known`; `grep -n recently_done skills/oc-checkpoint-protocol/SKILL.md` → none.

**Proposed fix.** Update README:58-59 to `string | {text, done_when}` and 'required while in_progress'; add `recently_done` and `resumed_from` rows to both the README table and protocol schema.

### .checkpoints/README.md:92 — README glyph legend claims one vocabulary shared with oc-orchestrator; the orchestrator never uses ⛔ and shows user_decision blockers as 🚫, while checkpoint.mjs prints status words, not glyphs
*category:* docs-drift

**Problem.** README:90-101 says the legend (✅ 🔄 ⏳ 🚫 ⛔ ⚠) is 'used by checkpoint output and the oc-orchestrator alike'. oc-orchestrator's rendered examples (:304-310, :399-404, :589-599, :615-622) use ✅ 🔄 ⏳ 🚫 ⚠️ but never ⛔; its F-003 blocker (a user_decision in the protocol example) is rendered 🚫 BLOCKER, which per the legend means 'blocked (has an open blocker)' not 'decision waiting on you'. checkpoint.mjs status prints the status enum words in the table (:600) and uses ⛔ (:552) / 🚫 (:568, brief only) / ⚠ without VS16 (:597); ✅ 🔄 ⏳ appear nowhere in the CLI.

**Evidence.** `grep -n "⛔" skills/oc-orchestrator/SKILL.md` → no match; skills/oc-orchestrator/SKILL.md:310 `🚫 BLOCKER: F-003 rate limiting`; .checkpoints/README.md:92 `One vocabulary, used by checkpoint output and the oc-orchestrator alike`; scripts/checkpoint.mjs:600 prints `${d.status}` text.

**Proposed fix.** Either render the legend glyphs in cmdStatus's table and use ⛔ for user_decision in oc-orchestrator's examples, or soften README:92 to 'used by oc-orchestrator rendering; the CLI uses ⛔/🚫/⚠ only'.

### .checkpoints/README.md:107 — Merge-driver docs justify it with oc-bug-check conflicts, but that file is gitignored and its telemetry paths match no tracked checkpoint
*category:* docs-drift · *known:* docs/plans/2026-09-03-v2.0-self-improving-release-plan.md §4.4 row 11 (arrays atomic / TELEMETRY_PATHS newer-wins) — adjacent

**Problem.** README:105-110, .gitattributes:1-3 and merge-checkpoint.mjs:5-9 all motivate the driver with 'two PRs that both ran /oc-bugcheck bump updated_at and skill_state.last_run.at'. .gitignore:91 excludes oc-bug-check.checkpoint.json, so that case never reaches a merge. TELEMETRY_PATHS (merge-checkpoint.mjs:53-60) are all oc-bug-check key names; no tracked checkpoint's skill_state uses last_run/run_history/streak/bypasses/carried_debt (live key survey), so the driver's effective newer-wins coverage on tracked files is top-level `updated_at` only and every other divergence is a conflict. Protocol:449 also says `.gitattributes` 'registers' the driver; it only maps — registration is the per-clone git config written by install-git-drivers.mjs:79-85 on `npm prepare`.

**Evidence.** .checkpoints/README.md:107-110; .gitignore:91 `.checkpoints/oc-bug-check.checkpoint.json`; scripts/merge-checkpoint.mjs:53-60 TELEMETRY_PATHS; skills/oc-checkpoint-protocol/SKILL.md:449 `.gitattributes registers a custom merge driver`; scripts/install-git-drivers.mjs:79-85.

**Proposed fix.** Rewrite README:107-110 and the driver header to describe what it does for tracked files today (updated_at newer-wins, recursive object merge, arrays atomic) and say registration is `npm prepare` (install-git-drivers.mjs), .gitattributes only maps.

### .github/workflows/mirror-public.yml:37 — mirror-public.yml's input validation checks only one of the three hook scripts and none of the commands, so a missing session-state.cjs/next-suggestion.cjs/commands/ would mirror a broken plugin silently
*category:* release-plan

**Problem.** The 'Validate mirror inputs' loop names plugin.json, hooks.json and pre-commit-gate.cjs but not session-state.cjs or next-suggestion.cjs (both referenced from hooks.json:19 and :30) nor plugins/opchain/commands/. hooks.json would then reference files absent from the public snapshot.

**Evidence.** .github/workflows/mirror-public.yml:36-38 `for f in ... plugins/opchain/.claude-plugin/plugin.json plugins/opchain/hooks/hooks.json plugins/opchain/hooks/pre-commit-gate.cjs .claude-plugin/marketplace.json; do`.

**Proposed fix.** Add `plugins/opchain/hooks/session-state.cjs plugins/opchain/hooks/next-suggestion.cjs plugins/opchain/commands` to the list, or derive the list from hooks.json.

### .opchain/qa.yaml:56 — Generated manifest cites a nonexistent artifact path and an untracked gap id
*category:* generated-surface

**Problem.** A contract row's `artifact` points at a file that does not exist (oc-checkpoint-protocol has no references/checkpoint-protocol.md; the canonical protocol is its SKILL.md), violating the manifest's own field rule; and the coverage comment defers to `QA-G1`, an id that appears nowhere else in the repo.

**Evidence.** .opchain/qa.yaml:56 `artifact: "skills/oc-checkpoint-protocol/references/checkpoint-protocol.md"` — `ls skills/oc-checkpoint-protocol/references/` = INTEGRATION.md, WALKTHROUGH.md, orchestrator.md; qa-manifest.md:77 `contracts[].artifact points at the thing both sides agree on`; .opchain/qa.yaml:35 `QA-G1 tracks the gap` — `grep -rn QA-G1` matches only that line.

**Proposed fix.** Point the artifact at `skills/oc-checkpoint-protocol/SKILL.md` (or a bundled copy such as `skills/oc-bug-check/references/checkpoint-protocol.md`), and replace `QA-G1` with a real tracker (checkpoint next_action or GitHub issue) or a `last_audit` gap entry.

### CLAUDE.md:79 — CLAUDE.md repo-layout comment still says skills/ holds 29 skills
*category:* docs-drift

**Problem.** The tree comment reads `skills/ # Skill source definitions (the product) — 29 skills,` while the catalog has been 33 since v1.9.0 (2026-09-02); README.md:51, marketplace.json and every site surface say 33.

**Evidence.** `ls skills | grep -c '^oc-'` → 33; CLAUDE.md:79 `— 29 skills,`.

**Proposed fix.** Change to 33 (or drop the literal and point at skills/README.md, which already says "Full list + phases").

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:609 — Four §4/§4.4 anchors are off by one to five lines (cosmetic but they are the insertion points)
*category:* anchor-drift · *surfaced by the release-plan lens*

**Problem.** Four remaining anchors point just off their targets. (a) oc-orchestrator skill-local routing table `:526-540` — the table header is :525 and :526 is the `|---|---|---|` separator, so the range starts on the separator and the sentence "has no v1.9 rows" is verified only by reading :527-540. (b) oc-code-auditor "reinforced at `:490`" — :490 is blank; the reinforcing sentence runs :491-493. (c) oc-repo-ops `/oc-repo catalog` `:117` — the heading is :116. (d) oc-checkpoint-protocol Wire 1.1 section `:629-713` — the section runs :629-709 and :713 is `## Principles`, so cloning "that shape" by line range copies the Principles heading. None changes a conclusion; all are insertion points a Sprint 2/3/5 agent will use.

**Evidence.** skills/oc-orchestrator/SKILL.md:525 `| Intent Signal | Route to | Phase |`, :540 last row. skills/oc-code-auditor/SKILL.md:489 ` ``` `, :490 blank, :491-493 "The comment is intentionally compact — full findings live in the checkpoint…". skills/oc-repo-ops/SKILL.md:116 ``## `/oc-repo catalog` ``. skills/oc-checkpoint-protocol/SKILL.md:629 `## Wire 1.1 extensions…`, :709 last line of the section, :711 `---`, :713 `## Principles`.

**Proposed fix.** Retarget to `:525-540`, `:491-493`, `:116`, `:629-709`. Confirmed-exact anchors needing no change: oc-orchestrator :184-186/:214/:324/:467; oc-app-architect :448/:466-469/:490-515; oc-code-auditor :54/:420-428/:461/:488/:541; oc-git-ops :130-136/:274-310; oc-prompt-ops :235; oc-release-ops :119/:292/:310; oc-monitoring-ops references/incident-response.md:16-46 and SKILL.md:692; oc-repo-ops references/pr-readiness-gate.md:14; oc-checkpoint-protocol :47-48; scripts/checkpoint.mjs:389; oc-telemetry-ops :159; oc-cost-ops :147; plugins/opchain/hooks/pre-commit-gate.cjs:175; plugins/opchain/hooks/next-suggestion.cjs "The 12 commands" (:231, accurate — 12 COMMANDS entries and 12 files in plugins/opchain/commands/).

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:615 — v2.0 plan §4.4 says the postmortem template has no 'Lessons Learned' section — it already does
*category:* release-plan

**Problem.** The Sprint 3 row (and the §4.4 finding table at :694) instructs 'Create a "Lessons Learned" section in the postmortem template (`references/incident-response.md:16-46` has none — Summary/Timeline/Impact/Root Cause/Mitigation/Resolution/Action Items)'. Lines 16-46 are the *Incident* template; the Post-Mortem Template (:224-281) already carries `## Lessons Learned`. Only the `:lessons:` start/end markers are net-new, so the plan's create step and its line citation are wrong today.

**Evidence.** skills/oc-monitoring-ops/references/incident-response.md:7 '## Incident Template', :16-46 Summary…Action Items (incident), :222 '## Post-Mortem Template', :273 '## Lessons Learned'. Plan :615 and :694 'no "Lessons Learned" block exists to wrap'.

**Proposed fix.** Re-anchor the plan row to incident-response.md:273 and reduce the Sprint 3 work item to 'wrap the existing section in `<!-- opchain:oc-monitoring-ops:lessons:<incident-id>:start/end -->`'.

### docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:695 — §4.4 row 4 quotes oc-bug-check text from `SKILL.md:293` while citing `SKILL.md:121`
*category:* anchor-drift · *surfaced by the release-plan lens*

**Problem.** §4.4 row 4 reads: the verdict enum is `PASS / FAIL / UNSUPPORTED` (`SKILL.md:121`, "The gate produces one of three verdicts"). Line 121 is a comparison-table row that carries the enum but not that sentence; the quoted sentence is at :293. The enum claim is correct, so this is a citation error rather than a wrong fact — but it is the row that overturns an earlier correction, so a reviewer re-checking it at :121 will not find the quoted evidence.

**Evidence.** skills/oc-bug-check/SKILL.md:121 `| **Verdict** | PASS / FAIL / UNSUPPORTED | Grade A-F (nuanced) |`; :293 `The gate produces one of three verdicts:`. `grep -n 'three verdicts' skills/oc-bug-check/SKILL.md` → 293 only.

**Proposed fix.** Cite both: `SKILL.md:121` for the enum and `:293` for the quoted sentence.

### plugins/opchain/hooks/hooks.json:10 — Commit gate PreToolUse timeout is 10s while fullWorkingTree() runs `git add -A` over the whole repo in a scratch index — on large repos a timeout is not a deny
*category:* gate-reality

**Problem.** hooks.json:10 sets `timeout: 10` for the gate. pre-commit-gate.cjs:272-278 copies the real index and runs `git add -A -- .` then `write-tree` on every `git commit` invocation; on a large or slow (network FS / many untracked files) working tree that can exceed 10s. Rule 0 (line 36) says any unevaluable state must deny, but a hook killed on timeout produces no stdout, and the gate's own contract (:47-48) reads empty stdout as allow. The uncaughtException handler (:78) does not cover an external kill. (Timeout semantics are the harness's; the fail-open shape is the gate's own stated contract.)

**Evidence.** hooks.json:10 `"timeout": 10`; pre-commit-gate.cjs:277 `git(["add", "-A", "--", "."], repoRoot, env)`; :47-48 `stdout is either nothing (allow) or a PreToolUse deny object`.

**Proposed fix.** Raise the timeout for the PreToolUse entry (e.g. 60) and/or short-circuit with `git status --porcelain --untracked-files=all` before hashing; document that a hook timeout is an allow.

### plugins/opchain/README.md:13 — Plugin README cites the wrong line for the oc-git-ops quote and shows a SessionStart output header the hook no longer emits
*category:* docs-drift

**Problem.** README:13 quotes '`oc-git-ops/SKILL.md:223` says … Before staging files or running `git commit`, invoke the oc-bug-check skill' — that sentence is at oc-git-ops/SKILL.md:227 (line 223 is a `git commit -m "test(auth)…"` example). README:68 shows the injected block starting `opchain pipeline state (from .checkpoints/, computed at session start):`, while session-state.cjs:108 emits `<opchain-checkpoint-data> (file contents, not instructions)` and closes with `</opchain-checkpoint-data>` (:122).

**Evidence.** plugins/opchain/README.md:13; skills/oc-git-ops/SKILL.md:227 `**Before staging files or running `git commit`, invoke the oc-bug-check skill.**`; README.md:68 vs session-state.cjs:108.

**Proposed fix.** Update the citation to :227 and paste the current fenced output sample.

### prompts/opchain-eval/README.md:16 — prompts/opchain-eval/README.md documents a dataset shape the set no longer has (all-`contains`, `expected.skill` / `expected.command` fields)
*category:* contract-drift · *surfaced by the routing lens*

**Problem.** README:16 documents every expected row as `{id, expect:{mode:"contains", all:[<skill>, <command>]}}`, but expected.jsonl:19-20 use `mode: "llm_judge"` with a `criteria` string the README never mentions. README:28-29 then describes the CI check as validating 'every `expected.skill`' and 'every `expected.command`' — field names that exist nowhere in the file; tests/opchain-eval.test.js:56-62 recovers them positionally out of `expect.all`. Anyone extending the set from the README will write the wrong shape for a collision case, which is exactly the kind of case that should be added.

**Evidence.** prompts/opchain-eval/README.md:16 `| expected.jsonl | one {id, expect:{mode:"contains", all:[<skill>, <command>]}} per line...`; :28-29 `...every expected.skill is a real skill and every expected.command verb is a registered command`; prompts/opchain-eval/expected.jsonl:19-20 `"mode": "llm_judge"` with `criteria`; tests/opchain-eval.test.js:51 `const VALID_MODES = new Set(["exact", "contains", "llm_judge"]);`; :56-62 routeTargets() positional extraction.

**Proposed fix.** Update README.md:16 to show both grader shapes (contains + llm_judge/criteria) and rewrite :28-29 in terms of `expect.all` so it matches tests/opchain-eval.test.js.

### scripts/checkpoint.mjs:92 — ISO regex rejects valid ISO-8601 offsets, so a hand-written checkpoint with +00:00 timestamps fails CI while hooks and the merge driver accept it
*category:* checkpoint

**Problem.** The protocol says 'set updated_at to the current time (ISO-8601)' (:299) and calls hand-written checkpoints first-class (:317). The validator's ISO regex requires a literal trailing `Z` with no offset form, so `2026-09-10T00:00:00+00:00` (valid ISO-8601 UTC) is a hard error (verified: `created_at must be ISO-8601 UTC`). session-state.cjs:64, next-suggestion.cjs:167 and merge-checkpoint.mjs:84-85 all use Date.parse and accept offsets, so the hooks and driver silently work on a file CI rejects. README:50 says only `Date.toISOString()` which always emits Z, but that is guidance a non-Node writer won't follow.

**Evidence.** scripts/checkpoint.mjs:92 `const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;`; scratch validate of iso.checkpoint.json → `✗ iso.checkpoint.json  created_at must be ISO-8601 UTC / updated_at must be ISO-8601 UTC`; protocol:299 `set updated_at to the current time (ISO-8601)`.

**Proposed fix.** Either accept `(?:Z|[+-]00:00)` (or any offset, normalising) in the regex, or state 'ISO-8601 UTC with a literal Z suffix' at protocol:299/:308 and README:50.

### scripts/checkpoint.mjs:838 — Scaffolded checkpoints hardcode project 'opchain.dev' even when the CLI is copied to another repo
*category:* tooling

**Problem.** Protocol:475-477 invites users to copy scripts/checkpoint.mjs into their own repo. scaffoldCheckpoint() fixes `project: "opchain.dev"` regardless of ROOT, so `checkpoint update <skill>` on a missing file in a copied CLI writes a checkpoint whose required `project` field names the wrong project (verified: fresh scaffold → project=opchain.dev).

**Evidence.** scripts/checkpoint.mjs:838 `project: "opchain.dev",`; scratch: `scaffold project= opchain.dev`.

**Proposed fix.** Derive project from `basename(ROOT)` or package.json name, falling back to 'opchain.dev' only when ROOT is this repo.

### skills/oc-agent-forge/SKILL.md:22 — governance.breaking_change_policy points at skills/CHANGELOG.md, which the zip channel still does not ship
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:580 (repo-only-dependency, CONFIRMED, fix:S)

**Problem.** The file exists in the repo and in the plugin channel (plugins/opchain/skills/CHANGELOG.md), but scripts/make-skills-zip.sh adds only the per-skill directories plus README.md, so users installing from opchain-skills.zip or a per-skill zip are pointed at a path that is not in their download.

**Evidence.** SKILL.md:22 '  breaking_change_policy: skills/CHANGELOG.md'; scripts/make-skills-zip.sh:47 'items+=("${dir%/}")' and :53 '[[ -f README.md ]] && items+=(README.md)' — no CHANGELOG.md entry; `ls plugins/opchain/skills/CHANGELOG.md` → present (plugin channel only).

**Proposed fix.** Add CHANGELOG.md to the zip's `items` list (one line in make-skills-zip.sh) or point the policy at the public URL /docs/CHANGELOG.md.

### skills/oc-agent-forge/SKILL.md:372 — Evaluator FAILs a round on `trajectory-valid ≥ 0.85`, a target no section ever declares
*category:* docs-drift

**Problem.** The Planner's 'Declare the metric targets up front' example, the Build Contract's Metric Targets block, and `skill_state.targets` define task_success, tool_calls_p95 and cost_per_task_usd only. The example Evaluator report then fails the round on trajectory-valid 0.83 vs '≥ 0.85' and calls the delta a 'Regression' — a threshold the Evaluator invented, contradicting :303 ('Targets are absent or unjustified' is a pushback reason).

**Evidence.** SKILL.md:372 '| trajectory-valid (no redundant work) | 0.83 | ≥ 0.85 | FAIL |'; SKILL.md:291-295 '### Metric Targets (from Planner) - task-success ≥ 0.90 … - tool-calls per task ≤ 25 at p95 - cost per task ≤ $0.40 - p95 wall-clock ≤ [budget]'; SKILL.md:502 '"targets": { "task_success": 0.90, "tool_calls_p95": 25, "cost_per_task_usd": 0.40 }'.

**Proposed fix.** Add `trajectory_valid` (e.g. ≥ 0.85) to the Planner targets list (:179-180), the Build Contract block (:291-295) and `skill_state.targets` (:502), or drop the row from the example report.

### skills/oc-api-dev/SKILL.md:485 — 'CI catches this via tests/api-dev-adapters.test.js snapshot' overstates what the test checks
*category:* docs-drift

**Problem.** The failure mode says a lagging committed api-dev-adapters.json is caught by a CI snapshot. The test regenerates into a scratch dir and asserts a hard-coded 13-adapter list; it never compares the tracked src/generated/api-dev-adapters.json, and ci.yml has no generated-file drift step for src/generated (only bundle and .claude/skills sync checks). The lag is caught only indirectly because pretest/prebuild regenerate the file.

**Evidence.** grep -n -E 'src/generated|tracked|committed|it\(' tests/api-dev-adapters.test.js -> no tracked-file comparison; :70 'emits 13 language adapters'. ci.yml steps 47-52 check sync-bundles and .claude/skills only.

**Proposed fix.** Reword to 'pretest/prebuild regenerate the file, and tests/api-dev-adapters.test.js pins the expected adapter list, so a new pack fails the test until it is added'.

### skills/oc-api-dev/SKILL.md:541 — 04-integrations.md mis-attributed to oc-integrations-engineer in Reads-from
*category:* docs-drift · *independently reported 2×*

**Problem.** oc-code-auditor and oc-security-auditor never mention oc-api-dev (no Reads-from row, no prose); oc-reverse-spec has no Read-by row for oc-api-dev. orchestrator.md:142 repeats these edges as the declared source of truth.

**Evidence.** oc-app-architect/SKILL.md:251 '04-integrations.md | Third-party services, webhooks, retry logic'; oc-integrations-engineer/SKILL.md:666 'oc-app-architect | 04-integrations.md -> discovery baseline'.

**Proposed fix.** Add reciprocal rows on the sibling side (oc-code-auditor: api/openapi.yaml -> handler audit; oc-security-auditor: CORS/rate-limit declarations; oc-reverse-spec Read-by: endpoint inventory) or drop the unreciprocated rows.

### skills/oc-api-dev/TRYIT.md:1 — Fifteen TRYIT.md files still promise a Try-It chat ('up to {{maxExchanges}} exchanges') and ship in the zip/plugin; the only 'reader' is a stale comment
*category:* generated-surface · *known:* docs/audits/2026-07-04-portability-audit.md:590,620,690,725,735,755,790 (per-skill TRYIT orphan findings); docs/plans/2026-09-03-v2.0-self-improving-r

**Problem.** Every TRYIT.md (api-dev, app-architect, bug-check, code-auditor, dash-forge, deploy-ops, git-ops, integrations-engineer, migration-ops, monitoring-ops, orchestrator, reverse-spec, scale-ops, stack-forge, ux-engineer) opens with a persona prompt for the removed Try-It chat and an unrendered `{{maxExchanges}}` template variable. make-skills-zip.sh (:8, :36, :64) deliberately packages them and sync-plugin-skills copies them into the plugin, so users receive 15 prompt files for a surface that no longer exists. `grep -rn TRYIT site/src src scripts` finds no consumer except site/src/lib/skills.ts:3, whose comment claims the catalog 'pairs it with the TRYIT.md prompts via a build-time glob' — no such glob exists in the file. Separately, 29 skills declare `tryable: true` while only 15 have a TRYIT.md; the v2.0 plan (Q1) declares `tryable` vestigial but says nothing about the TRYIT.md files themselves.

**Evidence.** skills/oc-api-dev/TRYIT.md:1 "...This is a short demo — the user gets up to {{maxExchanges}} exchanges." (same first line in all 15). site/src/lib/skills.ts:3 "// and pairs it with the TRYIT.md prompts via a build-time glob." with no other TRYIT reference in that file. scripts/make-skills-zip.sh:36 "# examples/, TRYIT.md, packs/ — everything Claude Code needs". `grep -c '^tryable: true' skills/oc-*/SKILL.md` → 29 files. site/src/content.config.ts:54-57 keeps `tryable` optional 'for backward compatibility'.

**Proposed fix.** Delete the 15 TRYIT.md files and the make-skills-zip.sh comments naming them, fix the skills.ts:3 comment, and either drop `tryable` from all frontmatter or leave it with the content.config.ts note as the single documented explanation.

### skills/oc-app-architect/SKILL.md:6 — Stale version strings: 'v1.2' vs '(v1.3+)' vs 'v1.1', and '(lands Sprint 3)' for skills that shipped in 1.5.0
*category:* docs-drift · *independently reported 2×*

**Problem.** shortDesc says 'v1.2 reads PM tickets and writes sprints back via PM-MCP'; the section header says 'PM-Tool MCP Integration (v1.3+)'; the failure-modes text says the skill 'operates as v1.1'. CHANGELOG has no 1.2 entry and dates the PM-MCP runtime to 1.3.0. The AI-branch table still says oc-agent-forge and oc-prompt-ops '(lands Sprint 3)' although CHANGELOG 1.5.0 lists both as shipped and both exist at 1.9.0.

**Evidence.** SKILL.md:6 `v1.2 reads PM tickets`; :681 `## PM-Tool MCP Integration (v1.3+)`; :780 `skill operates as v1.1 (no PM`; :206 `harness loop shape (lands Sprint 3)`; CHANGELOG.md:428 `## [1.3.0] — 2026-05 — PM-MCP runtime + release-ops`

**Proposed fix.** Drop `tryable` from frontmatter and delete TRYIT.md once the schema field is removed, or leave both if a /demo surface is planned to reuse them (then say so in the schema comment).

### skills/oc-app-architect/SKILL.md:206 — Stale future-tense notes: 'lands Sprint 3' for shipped v1.5 skills and 'oc-cost-ops (v1.6) Will own…'
*category:* docs-drift

**Problem.** The AI-App Branch table says oc-agent-forge's and oc-prompt-ops' contributions '(lands Sprint 3)' — both skills shipped in v1.5 (skills/CHANGELOG.md:416-421) and are at 1.9.0. oc-claude-api:288 says '`oc-cost-ops` (v1.6) | Will own live spend tracking + cost-regression alerts; this skill sets static ceilings today' — oc-cost-ops shipped in v1.6 (CHANGELOG :387). Readers are told chains they can use today are still pending.

**Evidence.** skills/oc-app-architect/SKILL.md:206 `| … | **oc-agent-forge** | agent topology, tool budgets, harness loop shape (lands Sprint 3) |`; :207 `… **oc-prompt-ops** | eval-dataset + drift-detection plan (lands Sprint 3) |`; skills/oc-claude-api/SKILL.md:288 `| \`oc-cost-ops\` (v1.6) | Will own live spend tracking…`; skills/CHANGELOG.md:416 `## [1.5.0] — 2026-06-22 — "Build the AI app"`.

**Proposed fix.** Delete '(lands Sprint 3)' at :206-207; rewrite claude-api:288 in present tense ('owns live spend tracking + cost-regression gate; this skill sets static ceilings').

### skills/oc-app-architect/SKILL.md:295 — 'Phase 3e punch list' — no 3e exists; punch list is 3d
*category:* docs-drift · *independently reported 2×*

**Problem.** The data-heavy trigger list includes 'downstream of a data-architect handoff'. No oc-data-architect exists in skills/ and orchestrator.md never mentions data-architect (grep: 0 hits); oc-dash-forge carries the same stale name. The nearest current concept is oc-data-ops' contracted marts (orchestrator.md:153).

**Evidence.** SKILL.md:291 `or downstream of a data-architect handoff`; grep -n 'data-architect' skills/orchestrator.md → none

**Proposed fix.** Replace with 'downstream of an oc-data-ops handoff' (and fix oc-dash-forge:459/473).

### skills/oc-app-architect/SKILL.md:383 — 'The only checkpoint artifact that IS gitignored is usage.sqlite' is false in this repo
*category:* docs-drift

**Problem.** The scaffold note asserts every *.checkpoint.json must be committed and only usage.sqlite is ignored. The reference repo deliberately ignores `.checkpoints/oc-bug-check.checkpoint.json` (.gitignore:91, rationale :79-90) because oc-bug-check always runs fresh; a scaffold following this text for a user project would track a file the ecosystem treats as local-only.

**Evidence.** SKILL.md:383-384 `The only checkpoint artifact that IS gitignored is \`.checkpoints/usage.sqlite\` … the \`*.checkpoint.json\` files must be committed`; .gitignore:91 `.checkpoints/oc-bug-check.checkpoint.json`

**Proposed fix.** Reword to 'ignore `.checkpoints/usage.sqlite*` and `.checkpoints/oc-bug-check.checkpoint.json`; commit every other `*.checkpoint.json`'.

### skills/oc-app-architect/SKILL.md:554 — Launch handoffs name subcommands absent from the targets' frontmatter commands:
*category:* cross-skill-contract

**Problem.** `/oc-audit pre-deploy` (:554), `/oc-security posture` (:555) and `/oc-deploy prod` (:557) are documented in the targets' bodies (oc-code-auditor:41, oc-security-auditor:62/337, oc-deploy-ops:38/317) but not in their frontmatter `commands:` lists, which do enumerate other subcommands (`/oc-audit full`, `/oc-deploy staging`, `/oc-deploy audit`). Verb-level flags inherit, so routing works today; the frontmatter contract is incomplete on the target side.

**Evidence.** oc-code-auditor/SKILL.md frontmatter commands: `/oc-audit`, `/oc-audit full`; oc-deploy-ops frontmatter commands: `/oc-deploy`, `/oc-deploy staging`, `/oc-deploy audit`; SKILL.md:557 `execute \`/oc-deploy prod\``

**Proposed fix.** Add the three subcommands to the targets' frontmatter (or trim the targets' partial subcommand lists to verbs only) so the handoff verbs are declared where the catalog reads them.

### skills/oc-app-architect/SKILL.md:633 — File tree lists artifacts no phase writes; two bundled references are never read from SKILL.md
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:603

**Problem.** GOVERNANCE.md (:633) and design/component-registry.json (:621) appear in the file tree but no phase describes producing them (component-registry.json is oc-ux-engineer's output at its :451; oc-git-ops:455 credits GOVERNANCE.md to oc-app-architect 'or the project-governance skill', also not a catalog id). checklists/launch-checklist.md (:630) is never named by Phase 7. Conversely references/phase-planning.md is never cited from SKILL.md (only from spec-template.md:519), and architecture-patterns.md / spec-template appear only as bare Source labels (:249-252) with no `references/` read instruction — the catalog validator's dangling-citation check (gen-skills-catalog.mjs:126-140) only sees backticked `references/…` paths, so these stay invisible to it.

**Evidence.** SKILL.md:633 `└── GOVERNANCE.md`; grep -n 'GOVERNANCE' skills/oc-app-architect/SKILL.md → :633 only; grep -n 'phase-planning' skills/oc-app-architect/SKILL.md → none

**Proposed fix.** Either add the producing step (e.g. Phase 7 writes checklists/launch-checklist.md; Phase 4 reads `references/phase-planning.md`; Phase 2 reads `references/spec-template.md` and `references/architecture-patterns.md`) or remove the orphan entries.

### skills/oc-bug-check/references/check-patterns.md:50 — check-patterns.md adds a `.skip` → WARN rule absent from the SKILL.md pattern table and .bugcheck.json config
*category:* docs-drift

**Problem.** check-patterns.md:50-55 greps `\.(only|skip)` and assigns `.skip` a WARN, but the SKILL.md anti-pattern table (:219-227) and the `.bugcheck.json` anti_patterns config (:418-426, only `test_only`) know nothing of `.skip`, so the reference introduces a verdict the config cannot tune.

**Evidence.** grep -n 'skip' skills/oc-bug-check/SKILL.md → no `.skip` anti-pattern row; check-patterns.md:50, :54.

**Proposed fix.** Add a `.skip | WARN` row to :219-227 and a `test_skip` key to the config, or drop `.skip` from the reference grep.

### skills/oc-bug-check/SKILL.md:30 — Three of four bundled references are never pointed at from SKILL.md
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:342-345 (orphaned references, CONFIRMED fix:S) and :144-147 (no pointer to checkpoint-protocol.md) — both 

**Problem.** :30 (`references/orchestrator.md`) is the only `references/` pointer in the skill. check-patterns.md, output-templates.md and the bundled checkpoint-protocol.md are shipped but unreachable from the instruction chain, so the model neither loads the implementation detail nor the checkpoint write protocol.

**Evidence.** grep -n 'references/' skills/oc-bug-check/SKILL.md → only line 30; grep -rn 'check-patterns\|output-templates\|checkpoint-protocol.md' skills/oc-bug-check/SKILL.md skills/oc-bug-check/TRYIT.md → 0 hits.

**Proposed fix.** Add 'see references/check-patterns.md' at Checks 4/5/6/7, 'see references/output-templates.md' at Verdicts, and 'read references/checkpoint-protocol.md' in Session Persistence.

### skills/oc-bug-check/SKILL.md:51 — oc-bug-check's body advertises argument forms its frontmatter does not declare
*category:* frontmatter-drift · *surfaced by the executability lens* · *known:* docs/audits/2026-09-11-skillchain-2.0-audit.md registers the same class for 11 other skills (e.g. oc-code-auditor:10, oc-deploy-ops:10, oc-orchestrato

**Problem.** The body command menu lists `/oc-bugcheck run --all` (:53), `/oc-bugcheck config strict` (:58) and `/oc-bugcheck config lenient` (:59). The frontmatter `commands:` block declares only the bare forms (`/oc-bugcheck run`, `/oc-bugcheck config`). Since the hosted skills catalog, the MCP catalog and the flag registry are generated from frontmatter (scripts/gen-skills-catalog.mjs validates command verbs against src/lib/flags/registry.js), these three forms are advertised nowhere outside the skill body.

**Evidence.** skills/oc-bug-check/SKILL.md:53 `  /oc-bugcheck run --all    Run on entire codebase (not just changes)`; :58-59 `  /oc-bugcheck config strict    Enable strict mode (zero warnings allowed)` / `  /oc-bugcheck config lenient   Allow warnings, block only on errors`; frontmatter `commands:` at :10-17 lists `/oc-bugcheck`, `/oc-bugcheck run`, `/oc-bugcheck fix`, `/oc-bugcheck config`, `/oc-bugcheck report`, `/oc-bugcheck history`, `/oc-bugcheck bypass`.

**Proposed fix.** Either promote the three forms into frontmatter `commands:` (and add the matching `skills.command.*` registry flags), or mark them in the menu as arguments to an already-declared verb rather than separate commands.

### skills/oc-bug-check/SKILL.md:653 — 'Universal' dependency scan cannot run on the no-stack path the same section describes
*category:* docs-drift · *independently reported 2×*

**Problem.** :653-654 says that with no recognised stack the gate 'runs only the universal checks (anti-patterns, secrets, dependency scan)' and :660 reports 'Ran 3 of 7 checks', but :667 states that on exactly that repo `npm audit` 'errors with ENOLOCK', and the only scanners specified are npm (:280) and pip-audit/safety (check-patterns.md:184-188). The dependency check is stack-conditional, not universal.

**Evidence.** grep -n -i 'typecheck\|type_check' skills/oc-stack-forge/packs/_schema.json → 0 hits; cat packs/swift/pack.yml → testRunner/buildCmd/lintCmd only.

**Proposed fix.** Make the dependency scan stack-conditional (skip with a WARN when no lockfile/manager is detected) and change the UNSUPPORTED report to 'Ran 2 of 7 checks'.

### skills/oc-bug-check/SKILL.md:693 — PM-MCP section cites the integrations section but not the protocol doc it must follow; broker sentence over-generalises
*category:* cross-skill-contract · *known:* docs/audits/2026-07-04-portability-audit.md:347-350 flags the dangling oc-integrations-engineer pointer for per-skill installs (different angle, still

**Problem.** :693-694 points at 'oc-integrations-engineer for the canonical PM-MCP patterns' only; oc-integrations-engineer/SKILL.md:464-465 says 'Every PM-MCP write made by an opchain skill must follow' `references/pm-mcp-protocol.md` and :471 'downstream skills cite this section AND the protocol doc'. :733 'Brokered audit log carries the canonical record' presents the regulated-environment broker/redactor (oc-integrations-engineer:494-497, pm-mcp-protocol.md:347-359) as the universal case.

**Evidence.** grep -n 'pm-mcp-protocol' skills/oc-bug-check/SKILL.md → 0 hits.

**Proposed fix.** Cite `oc-integrations-engineer/references/pm-mcp-protocol.md` §2/§4 for the comment write + update-in-place idempotency, and qualify :733 with 'in brokered (regulated) deployments'.

### skills/oc-checkpoint-protocol/references/INTEGRATION.md:127 — INTEGRATION.md names target verbs absent from target frontmatter (/status, /oc-rev-status)
*category:* cross-skill-contract

**Problem.** INTEGRATION.md:127, :136, :182 tell oc-app-architect to make `/status` read the checkpoint, and :200 tells oc-reverse-spec that `/oc-rev-status` reads from the new location; neither verb is in the respective skill's frontmatter `commands:` (they exist only in body text).

**Evidence.** oc-app-architect frontmatter commands: /oc-app … /oc-launch (no /status; body :55, :582 has it); oc-reverse-spec frontmatter: /oc-reverse-spec … /oc-rev-sprint (no /oc-rev-status; body :60, :93 has it).

**Proposed fix.** Either add the verbs to the targets' frontmatter or reference the frontmatter verbs (/oc-build, /oc-reverse-spec) in INTEGRATION.md.

### skills/oc-checkpoint-protocol/SKILL.md:261 — Write Protocol tells skills to record `resumed_from`, a field defined nowhere
*category:* checkpoint

**Problem.** The Session-resume row says 'record `resumed_from` when known', but the schema (:88-172), .checkpoints/README.md, and scripts/checkpoint.mjs never define, validate, or display it.

**Evidence.** grep -rn 'resumed_from' scripts/checkpoint.mjs .checkpoints/README.md skills/orchestrator.md → 0 hits; validator has no unknown-key rejection so the write is harmless but undocumented.

**Proposed fix.** Add `resumed_from` to the schema block as optional (shape + meaning) or drop it from :261.

### skills/oc-checkpoint-protocol/SKILL.md:383 — Bundled INTEGRATION.md and WALKTHROUGH.md are never cited by SKILL.md
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:367 CONFIRMED — still open

**Problem.** SKILL.md points at no file under its own references/ — a reader never learns the per-skill integration guide or the end-to-end resume walkthrough exists.

**Evidence.** grep -n 'INTEGRATION\|WALKTHROUGH\|references/' skills/oc-checkpoint-protocol/SKILL.md → no matches; both files exist (ls references/).

**Proposed fix.** Link references/WALKTHROUGH.md from the Tooling section (:383) and references/INTEGRATION.md from the Scaffold / Validation text.

### skills/oc-checkpoint-protocol/SKILL.md:414 — doctor --online described as 'vs local HEAD'; code compares to the approved release baseline
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:635 (adjacent finding about baking opchain.dev's /api/health into the generic protocol; the 'local HEAD' w

**Problem.** SKILL.md:415 says `doctor --online` 'also compare[s] deployed /api/health vs local HEAD'. The implementation compares the live version to `.github/monitoring/release-baseline.json` and its comment says raw local/main equality is deliberately not the contract.

**Evidence.** scripts/checkpoint.mjs:748-750 ('Raw local/main equality is deliberately not the contract'), :766 ('!= approved release baseline'), :790 tip text.

**Proposed fix.** Change :415 to 'compare deployed /api/health vs the approved release baseline'.

### skills/oc-checkpoint-protocol/SKILL.md:623 — pm_refs privacy section cites scenarios that exist nowhere
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:630 CONFIRMED — still open

**Problem.** Lines 620-625 point readers at `mcp-enterprise-f500` and `mcp-enterprise-defense` 'scenarios' for the broker + redactor path; no such file, doc, or scenario exists in the repo or any shipped artifact — only prose mentions in oc-security-auditor/SKILL.md:553-554 and oc-integrations-engineer/SKILL.md:495-496.

**Evidence.** grep -rln 'mcp-enterprise-f500' . (excl. node_modules) returns only SKILL.md prose and bundled checkpoint-protocol.md copies.

**Proposed fix.** Drop the parenthetical or link to a real doc.

### skills/oc-claude-api/references/migration-playbooks.md:21 — Migration scope-sizing command assumes ripgrep with no grep fallback
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:645 [oc-claude-api] Migration playbook's scope-sizing command assumes ripgrep (`rg`) is installed (CONFIRM

**Problem.** Still open: Step 0 gives only `rg -l "<old-model-id>" --type-not md | ...` with no prerequisite note or `grep -rl` alternative.

**Evidence.** `command -v rg` resolves only to Claude Code's shell shim in this environment (`ls /opt/homebrew/bin/rg` -> No such file); no other line in the skill mentions ripgrep or grep as a fallback.

**Proposed fix.** Add a `grep -rl --exclude='*.md' "<old-model-id>" .` alternative on the next line.

### skills/oc-claude-api/references/model-routing.md:49 — model-routing.md rule contradicts itself: '`max` is Opus-tier only' but 'works on ... Sonnet 4.6'
*category:* docs-drift

**Problem.** '- **`max` is Opus-tier only.** `output_config.effort: "max"` works on Fable 5, Opus 4.6+, and Sonnet 4.6 - it errors on Haiku 4.5 and Sonnet 4.5.' The bold lead and the sentence disagree (Sonnet 4.6 is not Opus-tier).

**Evidence.** references/model-routing.md:49-50 verbatim as quoted; SKILL.md:143 also lists `max` in the generic effort range for 4.6+ models.

**Proposed fix.** Reword the lead to '`max` is not universal' (or 'not on Haiku 4.5 / Sonnet 4.5').

### skills/oc-claude-api/SKILL.md:19 — Frontmatter description limits migrations to '4.6 -> 4.7' while the body covers 4.7 -> 4.8 and Mythos Preview -> Fable 5
*category:* docs-drift · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:640 [oc-claude-api] governance.breaking_change_policy points at skills/CHANGELOG.md, which is not shipped 

**Problem.** description: '... between model versions (4.6 -> 4.7, retired-model replacements)'. The Migration Playbooks section (:228-229) and references/migration-playbooks.md:59-71 also cover 4.7 -> 4.8 and -> Fable 5. The orchestrator.md §7 copy (:493-500) must match the frontmatter, so both need the same edit.

**Evidence.** SKILL.md:228 'Moves existing Claude API code across model versions (4.6 -> 4.7 -> 4.8, Mythos Preview -> Fable 5)'; references/migration-playbooks.md:59 '### 4.7 -> 4.8', :64 '### -> Fable 5'; orchestrator.md:496 carries the identical '(4.6 -> 4.7, retired-model replacements)' text.

**Proposed fix.** Add CHANGELOG.md to the zip's items list in make-skills-zip.sh (fixes all 33 skills at once), or point the policy at the public mirror URL.

### skills/oc-claude-api/SKILL.md:286 — Cross-skill table says oc-integrations-engineer owns 'provider clients on Bedrock/Vertex/Foundry'; that skill never mentions them
*category:* docs-drift

**Problem.** '| `oc-integrations-engineer` | Owns third-party API auth (incl. provider clients on Bedrock/Vertex/Foundry) |'. A session with a Bedrock/Vertex client would hand off to a skill that documents no such coverage.

**Evidence.** `grep -niE 'bedrock|vertex|foundry' skills/oc-integrations-engineer/SKILL.md` -> 0 hits (only Anthropic-shipped MCP servers at :458, :488).

**Proposed fix.** Drop the parenthetical, or add a Bedrock/Vertex/Foundry client-auth row to oc-integrations-engineer if that ownership is intended.

### skills/oc-code-auditor/references/ai-safety-rules.md:95 — ai-safety-rules.md points at a sibling skill's reference file that is absent on per-skill installs
*category:* executability · *independently reported 2×* · *known:* docs/audits/2026-07-04-portability-audit.md:650 ([oc-code-auditor] ai-safety-rules.md points to a sibling skill's reference file — CONFIRMED, unchange

**Problem.** AI-TOOL-004's fix text says '(see oc-agent-forge `references/tool-budgets.md`)'. Inside oc-code-auditor/references/ there is no tool-budgets.md; the file lives at skills/oc-agent-forge/references/tool-budgets.md. Because the zip/plugin install each skill as its own directory, the bare `references/...` form resolves to a missing file. Same unanchored pattern at oc-cost-ops/references/pricing-reference.md:4 ('`oc-claude-api`'s `references/model-routing.md`'). Both already flagged in the portability audit and still open.

**Evidence.** skills/oc-code-auditor/references/ai-safety-rules.md:95 "max-iterations guard (see oc-agent-forge `references/tool-budgets.md`)."; `ls skills/oc-code-auditor/references/` has no tool-budgets.md; `ls skills/oc-agent-forge/references/` → tool-budgets.md present. skills/oc-cost-ops/references/pricing-reference.md:4 "copied from `oc-claude-api`'s `references/model-routing.md`".

**Proposed fix.** Use the relative sibling link form (`../../oc-agent-forge/references/tool-budgets.md`) the other skills use, with 'if not installed, skip' wording.

### skills/oc-code-auditor/references/security-checklist.md:168 — security-checklist.md contradicts itself on wrangler `[vars]` and only inspects wrangler.toml (not wrangler.jsonc)
*category:* executability

**Problem.** ':168 Secrets are in wrangler.toml `[vars]` or Workers secrets' accepts plaintext [vars] as a secret store while :173 requires '`wrangler.toml` doesn't contain production secrets'. Separately, :168/:173/:177 look only at wrangler.toml; a wrangler.jsonc project (including opchain itself) is silently skipped by the :177 grep.

**Evidence.** security-checklist.md:168, :173, :177 'grep -n "password\|secret\|token\|key" wrangler.toml 2>/dev/null'; ls wrangler.toml -> MISSING, wrangler.jsonc present in this repo.

**Proposed fix.** Rewrite :168 to '[vars] hold non-secret config only; secrets via `wrangler secret put`' and make :177 glob wrangler.{toml,jsonc,json}.

### skills/oc-code-auditor/references/ux-audit-checklist.md:3 — Reference/demo prose drift: ux checklist claims SKILL.md carries automated commands; TRYIT.md grades 1-10 against SKILL.md's A-F
*category:* docs-drift

**Problem.** ux-audit-checklist.md:3-4 says 'The SKILL.md gives the overview and automated check commands' but SKILL.md 1e (:163-175) is a severity table only — the commands live in the checklist itself (:52-71). TRYIT.md:10 instructs 'Grade the overall code quality (1-10)' while SKILL.md's headline is an A-F letter grade (:237) mapped to 0..10 only in eval_scores (:408-409).

**Evidence.** ux-audit-checklist.md:3-4, :52-71; SKILL.md:163-175, :237, :408; TRYIT.md:10 (still consumed by scripts/make-skills-zip.sh and site/src/lib/skills.ts).

**Proposed fix.** Drop 'and automated check commands' from ux-audit-checklist.md:3; change TRYIT.md:10 to the A-F grade (with the 0..10 score mapping if a number is wanted).

### skills/oc-code-auditor/SKILL.md:55 — `/checkpoint` is listed as a command but nothing implements it and no frontmatter declares it
*category:* routing · *known:* docs/audits/2026-07-04-portability-audit.md:720 (same unprefixed-verb / frontmatter-omission pattern flagged on oc-git-ops); docs/audits/2026-06-29-ch

**Problem.** The menu advertises '/checkpoint  Show checkpoint status' with no definition in this skill, no plugin command, no frontmatter entry, and no definition in orchestrator.md or the checkpoint protocol. It is a shared convention across 29 skill menus, handled only conversationally.

**Evidence.** SKILL.md:55; ls plugins/opchain/commands/checkpoint.md -> MISSING; grep -n '/checkpoint' skills/orchestrator.md skills/oc-checkpoint-protocol/SKILL.md -> 0 command definitions; grep -l '/checkpoint ' skills/*/SKILL.md | wc -l -> 29.

**Proposed fix.** Either define `/checkpoint` once in orchestrator.md §1 (with the `node scripts/checkpoint.mjs status <skill>` fallback) or replace it in this menu with '/oc-audit status'.

### skills/oc-compliance-ops/references/compliance-profile.md:37 — Capture methods claimed to 'mirror' hardening verify methods, but two of four names differ
*category:* docs-drift

**Problem.** compliance-profile.md:37-38 states capture `method: file | cmd | http | manual (mirrors the hardening manifest's verify methods)`. hardening-manifest.md:66-69 defines `http | test | config | manual`. `file`≈`config` and `cmd`≈`test` semantically, but the vocabularies are not mirrors; a session reusing a hardening `verify:` block verbatim as a `capture:` block (SKILL.md:169-171 invites cross-referencing) would write an unknown method.

**Evidence.** compliance-profile.md:37 '#   file | cmd | http | manual (mirrors the'; :38 '#   hardening manifest's verify methods)'; hardening-manifest.md:67 '| `test` | Run `cmd`; exit 0 = pass', :68 '| `config` | Assert a file contains/matches'.

**Proposed fix.** Reword to 'corresponds to (file≈config, cmd≈test)' or align the capture vocabulary to the hardening names.

### skills/oc-compliance-ops/SKILL.md:59 — Handoff names `/oc-security readiness`, absent from oc-security-auditor frontmatter commands
*category:* routing

**Problem.** The register seed source is `/oc-security readiness` (SKILL.md:59, :124-125, :255). oc-security-auditor's frontmatter `commands:` (:10-18) lists only top-level aliases (/oc-security, /oc-secaudit, /oc-sec, /oc-threat-model, /oc-owasp, /oc-hardening, /oc-attack-surface, /oc-posture); `readiness` exists only in the body (:63, :223). Same drift class as the /oc-release verify item; flag gating still works because subcommands inherit /oc-security (registry.js:291).

**Evidence.** skills/oc-security-auditor/SKILL.md:10-18 frontmatter commands (no subcommands); :63 '/oc-security readiness [framework]  SOC2 / ISO27001 / HIPAA readiness gap analysis'; :223 '### Framework Readiness (`/oc-security readiness [framework]`)'.

**Proposed fix.** Add the body subcommands (at least `/oc-security readiness`) to oc-security-auditor frontmatter `commands:`; oc-compliance-ops text is otherwise accurate about the verb.

### skills/oc-compliance-ops/SKILL.md:77 — `/checkpoint` menu verb is not a frontmatter command and nothing implements it
*category:* routing · *known:* docs/audits/2026-07-04-portability-audit.md:527 (same finding for oc-monitoring-ops) and :339-340 (oc-app-architect)

**Problem.** The Command Reference lists `/checkpoint  Show oc-compliance-ops checkpoint`. It is not in frontmatter `commands:` (:10-18), has no plugins/opchain/commands/*.md file (12 files, none for checkpoint), and no `skills.command` flag verb. The same line appears in 28 SKILL.md menus, so this is an orchestrator-level convention rather than a compliance-ops error; the portability audit already logs the class.

**Evidence.** SKILL.md:77 '  /checkpoint              Show oc-compliance-ops checkpoint'; grep -ln '^  /checkpoint' skills/*/SKILL.md | wc -l → 28; ls plugins/opchain/commands/ → no checkpoint command; grep '"/checkpoint"' src/lib/flags/registry.js → none.

**Proposed fix.** Resolve once in skills/orchestrator.md (define `/checkpoint` as a prose verb every skill honours, or drop it from all 28 menus) rather than per skill.

### skills/oc-compliance-ops/SKILL.md:92 — Live checkpoint uses a skill_state shape the SKILL.md never documents (no-profile case)
*category:* live-checkpoint · *independently reported 2×* · *known:* docs/plans/coordination-gaps-punchlist.md P3b (:116-119) — the audit gate is a markdown table

**Problem.** SKILL.md:98 'This file existing is the switch that activates the deploy-gate row' and :189 'The deploy-gate row this feeds is presence-checked' describe a gate row. The row exists only as a `ls .opchain/compliance.yaml && echo …` snippet and a markdown table line in oc-deploy-ops/SKILL.md:214-223/:237; scripts/deploy.mjs has no compliance, comply, or audit-gate reference. The text does not claim mechanical enforcement, so a session is not misled, but nothing warns mechanically if the bundle is missing — already tracked as P3b for the whole audit gate.

**Evidence.** .checkpoints/oc-compliance-ops.checkpoint.json:8 '"phase": "assess"'; :28-32 skill_state {profile: null, conditional_gate, verdict, claim_boundary}; SKILL.md:240-247 documents manifest_path/frameworks/tier/register/gaps_chained/last_evidence only.

**Proposed fix.** Document the no-profile checkpoint shape in SKILL.md (e.g. `manifest_path: null`, `last_evidence: null`, `scope_verdict: "none-yet"`) and have `/oc-comply status` tolerate absent keys; optionally rewrite the live checkpoint to that shape.

### skills/oc-compliance-ops/SKILL.md:266 — oc-docs-forge and oc-monitoring-ops edges are unreciprocated in the peers' own tables
*category:* cross-skill-contract

**Problem.** SKILL.md:266 says oc-docs-forge reads this skill ('Policy docs ride the PR documentation packet') and :258 says this skill reads oc-monitoring-ops artifacts. orchestrator.md:146 and :154 carry both edges, but oc-docs-forge/SKILL.md's Reads-from/Read-by tables (:197-209) and oc-monitoring-ops/SKILL.md's (:577-592) contain no oc-compliance-ops row, so neither peer's own text knows about the relationship.

**Evidence.** grep -n 'compliance\|comply' skills/oc-docs-forge/SKILL.md → no hits; grep -n 'compliance\|comply' skills/oc-monitoring-ops/SKILL.md → no hits; orchestrator.md:146 '... oc-compliance-ops (policy docs riding the PR packet)'.

**Proposed fix.** Add an oc-compliance-ops row to oc-docs-forge's 'Reads from' table and to oc-monitoring-ops' 'Read by' table, matching orchestrator.md:146/154.

### skills/oc-cost-ops/references/cost-attribution.md:75 — Mandatory validate step depends on a repo-only CLI
*category:* tooling · *known:* docs/audits/2026-07-04-portability-audit.md:397 (CONFIRMED, repo-only-dependency, still open)

**Problem.** Step 5 of the write procedure is unconditional: 'Validate (`npm run checkpoint:validate`)'. That script exists only in this repo (package.json:51 → scripts/checkpoint.mjs); plugins/opchain/ ships hooks/ + commands/ + skills/ and no checkpoint CLI. v1.8.1 (skills/CHANGELOG.md:293-303) made a missing CLI 'neither a blocker nor product progress' in oc-orchestrator and the protocol, but this step was not updated to match.

**Evidence.** cost-attribution.md:75-76; `ls plugins/opchain/` → LICENSE NOTICE README.md commands hooks skills; `grep -rln checkpoint.mjs plugins/opchain/hooks plugins/opchain/commands` → next-suggestion.cjs, oc-ops.md only (references, not the script).

**Proposed fix.** Phrase as 'if the checkpoint CLI is available, run `npm run checkpoint:validate`; otherwise check the non-negative / object-shape rules in references/checkpoint-protocol.md § cost by hand'.

### skills/oc-cost-ops/references/cost-attribution.md:87 — Blog-post citation does not match any post and the promised number has already shipped
*category:* docs-drift

**Problem.** The text says cost-per-feature is 'the honest number the v1.5 blog post ("What it cost to ship v1.5") promised and could not yet produce'. The v1.5 post (site/src/blog/2026-06-23-v1-5-build-the-ai-app.md) contains no cost promise (`grep -i cost` → 0 hits), and the number was produced two days after this skill shipped in site/src/blog/2026-06-27-what-building-opchain-with-opchain-cost.md (then corrected in 2026-06-28-our-cost-report-was-wrong-by-13x.md).

**Evidence.** cost-attribution.md:87-88; `grep -n -i cost site/src/blog/2026-06-23-v1-5-build-the-ai-app.md` → empty; 2026-06-27 post front matter: 'We pointed oc-cost-ops at our own Claude Code history and priced every phase of building opchain.'

**Proposed fix.** Cite the 2026-06-27 post (and the 06-28 correction) as the delivered number, or drop the sentence.

### skills/oc-cost-ops/SKILL.md:17 — Frontmatter description drifts from the orchestrator.md §7 copy
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:660 (CONFIRMED, doc-drift, still open)

**Problem.** SKILL.md's description ends with 'Pairs with oc-prompt-ops (cost-regression gate alongside the score gate) and oc-telemetry-ops (feeds the public /dashboard cost stats).' The canonical §7 copy in skills/orchestrator.md:529-535 ends at '"spend per feature".' with no pairing sentence, so the two trigger surfaces differ. No build check enforces parity (scripts/gen-skills-catalog.mjs only checks description length, :38/:69).

**Evidence.** SKILL.md:23-25 vs skills/orchestrator.md:533-535.

**Proposed fix.** Sync one copy to the other (the audit-era 'Trigger liberally' tail was already removed; the 'Pairs with' sentence still is not mirrored).

### skills/oc-cost-ops/SKILL.md:42 — Opening narrative still speaks as if cost attribution does not exist
*category:* docs-drift

**Problem.** 'v1.5 added four AI-native skills; the predictable next question is "what did that cost me?" — and today the honest answer across opchain is "we don't precisely know."' The skill shipped in 1.6.0 (skills/CHANGELOG.md:385-392), the live checkpoint carries $1,078.74 attributed across four models, and /dashboard renders 'attributed by oc-cost-ops' (site/src/pages/dashboard.astro:78-80). The 'today' framing is stale v1.5-era text.

**Evidence.** SKILL.md:42-44; skills/CHANGELOG.md:385 `## [1.6.0] — 2026-06-25 — "The instrumented pipeline"`; .checkpoints/oc-cost-ops.checkpoint.json cost.total_usd 1078.74.

**Proposed fix.** Rewrite in past tense ('before v1.6 the honest answer was ...') or cut the paragraph to the one-line purpose statement.

### skills/oc-cost-ops/SKILL.md:132 — Validator warn condition stated without the `budget_usd > 0` guard
*category:* docs-drift

**Problem.** SKILL.md says the validator warns when `total_usd > budget_usd`; the implementation only warns when `budget_usd > 0 && total_usd > budget_usd` (scripts/checkpoint.mjs:337). budget-gates.md:21 shows `--usd <n>` with no lower bound, so a zero budget (spend frozen) is accepted by the validator and never trips. The bundled protocol states the `> 0` condition correctly (checkpoint-protocol.md:655).

**Evidence.** SKILL.md:132 'The validator warns (does not error) when `total_usd > budget_usd`'; scripts/checkpoint.mjs:337 `if (typeof t === "number" && typeof b === "number" && b > 0 && t > b)`.

**Proposed fix.** State the `budget_usd > 0` condition in SKILL.md:132 and budget-gates.md:10, and say explicitly that a 0 budget means 'no ceiling' (or change the validator so 0 means no spend allowed).

### skills/oc-cost-ops/SKILL.md:208 — 'Gate run' and 'Routing recommended' rows name no checkpoint keys
*category:* checkpoint

**Problem.** The When-to-Write table says a gate run saves 'gate verdict + the cost delta vs baseline' and a routing run saves 'per-phase tier recommendation in `skill_state`', but no field names are given anywhere in SKILL.md or the references. A session cannot write (or a later session read) these consistently; the live checkpoint has no skill_state at all.

**Evidence.** SKILL.md:208-209; `grep -n skill_state skills/oc-cost-ops/SKILL.md skills/oc-cost-ops/references/{budget-gates,cost-attribution,model-tier-routing,pricing-reference}.md` → only SKILL.md:209; .checkpoints/oc-cost-ops.checkpoint.json has no skill_state.

**Proposed fix.** Name the keys (e.g. `skill_state.last_gate: {verdict, mode, delta_pct, baseline_per_eval, at}` and `skill_state.route_recommendation: [{phase, current, recommend, est_delta_usd}]`).

### skills/oc-dash-forge/references/design-principles.md:190 — Accessibility floor '≥12px even for captions' is violated by the skill's own caption spec, worked example and boilerplate — and the audit passes it
*category:* docs-drift

**Problem.** design-principles.md:190 'Type sizes don't break below 12px. Even for captions' (listed under 'Every oc-dash-forge output must pass these'), yet design-principles.md:138 sets captions at 11–12px, example-walkthrough.md:151 uses caption size 10 and its audit (:226) passes 'Type ramp: 4 sizes (22/14/12/10)', and react-patterns.md:146,151 ship text-[10px]. The /oc-df-audit table (SKILL.md:383-397) has no minimum-size check, so the contradiction is invisible to the gate.

**Evidence.** Lines as cited.

**Proposed fix.** Either relax the floor to 10px for ops captions or raise the example/boilerplate to 12px and add a min-size row to the audit table.

### skills/oc-dash-forge/SKILL.md:22 — Frontmatter description drifts from the canonical orchestrator.md §7 block
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:680; v2.0 plan §4.4 #13 / Sprint 5 touches §7 for count parity only

**Problem.** orchestrator.md §7 requires each block to match the skill's frontmatter description exactly; the oc-dash-forge block (orchestrator.md:411-417) is a condensed older copy lacking /dashboard, /dataviz-design, 'dashboard mockup', 'dense information display', 'design a report view' and the archetype elaboration present in SKILL.md:22-31.

**Evidence.** diff of SKILL.md:22-31 vs skills/orchestrator.md:411-417 as read.

**Proposed fix.** Regenerate the §7 block from the frontmatter (sync-bundles / sync-plugin-skills / gen-mcp-catalog afterwards).

### skills/oc-dash-forge/SKILL.md:175 — 'The 4-Phase Pipeline' heading enumerates five phases (0–4)
*category:* docs-drift

**Problem.** Heading says 4-Phase; the diagram (178-186), progress table (429-435) and resume prompt (checkpoint-schema.md:203 'X of 5 phases') all count five.

**Evidence.** Lines as cited.

**Proposed fix.** Rename to 'The 5-Phase Pipeline (0–4)'.

### skills/oc-dash-forge/SKILL.md:394 — Type-ramp limit contradicts itself (4 steps vs ≤5 sizes)
*category:* docs-drift

**Problem.** Phase 2 deliverable: 'Type ramp: 4 steps max' (SKILL.md:307) and design-principles.md:133 'One type ramp, 4 levels max', but the /oc-df-audit pass criterion is 'Type ramp | ≤5 sizes across the whole dashboard' (SKILL.md:394).

**Evidence.** Lines as cited.

**Proposed fix.** Pick one number (4) and use it in the audit row.

### skills/oc-dash-forge/TRYIT.md:1 — TRYIT.md is an orphaned site-demo prompt with an unexpanded {{maxExchanges}} template; tryable: true drives nothing
*category:* generated-surface · *known:* docs/audits/2026-07-04-portability-audit.md:690 ([oc-dash-forge] TRYIT.md ships to users as an orphaned site-demo prompt) — still open

**Problem.** TRYIT.md:1 contains a raw {{maxExchanges}} placeholder and nothing in the build consumes it; SKILL.md:9 'tryable: true' is likewise unconsumed since the Try-It chat was removed. The file still ships in the zip/mirror/plugin copy as skill text.

**Evidence.** `grep -rn 'maxExchanges\|TRYIT\|tryable'` over scripts/, src/, site/src → 0 hits (only skills/, plugins/opchain/skills/, specs/ and roadmap/ archives); specs/spec/02-architecture.md:273 'tryable frontmatter no longer drives anything'; CLAUDE.md states POST /api/try/* were removed.

**Proposed fix.** Delete TRYIT.md and the tryable frontmatter key (or wire a consumer).

### skills/oc-data-ops/SKILL.md:18 — Frontmatter description is ~1015 chars against the 1024-char build limit
*category:* generated-surface

**Problem.** The folded `description:` block measures ~1015 characters; scripts/gen-skills-catalog.mjs fails the build above DESCRIPTION_MAX = 1024. Nine characters of headroom means the next NOT-clause or trigger phrase added to this description breaks `npm run build`.

**Evidence.** SKILL.md:18-32 description block; node measurement of the folded scalar → 1015 chars. scripts/gen-skills-catalog.mjs:38 'const DESCRIPTION_MAX = 1024;' and :69-71 throws when `data.description.length > DESCRIPTION_MAX`.

**Proposed fix.** Trim the description (e.g. drop the parenthetical OAuth/webhooks clause at SKILL.md:31-32, which the oc-integrations-engineer NOT-line already carries) to leave ≥60 chars of headroom.

### skills/oc-data-ops/SKILL.md:202 — When-to-write table saves per-contract verdicts + evidence pointers but the checkpoint example stores only aggregate counts
*category:* checkpoint

**Problem.** The 'Verify verdict recorded' row promises a per-contract verdict (PASS / PASS (fixtures) / BLOCKED / VIOLATION) with evidence pointers, but the documented skill_state has only `contracts: {total, pass, violation, blocked, pass_fixtures}`. A resuming session cannot tell which two contracts are in VIOLATION from the checkpoint alone, even though next_actions refers to 'the 2 VIOLATION contracts'.

**Evidence.** SKILL.md:202 '| Verify verdict recorded | Per-contract verdict (PASS / PASS (fixtures) / BLOCKED / VIOLATION) + evidence pointers |'; SKILL.md:227 '"contracts": { "total": 9, "pass": 7, "violation": 2, "blocked": 0, "pass_fixtures": 0 }'; SKILL.md:219 'Re-run /oc-data-ops verify on the 2 VIOLATION contracts'.

**Proposed fix.** Add a `contracts.by_dataset: { "<layer.dataset>": { "verdict": ..., "evidence": "<path or pointer>" } }` shape to the skill_state example, or state that per-contract evidence lives next to `.opchain/data-contracts/.verified/`.

### skills/oc-deploy-ops/SKILL.md:448 — SKILL.md never directs the session to the bundled references/checkpoint-protocol.md or gives a write instruction for its checkpoint
*category:* checkpoint · *known:* docs/audits/2026-07-04-portability-audit.md:194 '[oc-deploy-ops] SKILL.md never tells the model to read the bundled checkpoint schema and gives no imp

**Problem.** The Checkpoint Integration section gives a location, an event table and a partial skill_state fragment but never says to read references/checkpoint-protocol.md (bundled next to it) or how to create the file; the only CLI it cites (scripts/checkpoint.mjs) is repo-only. Known portability-audit item, still true today (`grep -c checkpoint-protocol SKILL.md` -> 0).

**Evidence.** skills/oc-deploy-ops/SKILL.md:448-476; `grep -n 'checkpoint-protocol' skills/oc-deploy-ops/SKILL.md` -> no output; skills/oc-deploy-ops/references/checkpoint-protocol.md exists (712 lines)

**Proposed fix.** Add 'Read references/checkpoint-protocol.md for the envelope and write rules' at the top of Checkpoint Integration, as the orchestrator welcome line does for orchestrator.md.

### skills/oc-deploy-ops/SKILL.md:466 — skill_state template omits the URL fields the text promises to save and that oc-monitoring-ops is told to read; live checkpoint uses different key names
*category:* checkpoint

**Problem.** 'When to Write' says Init saves 'Platform, environments, URLs, auth' (:457) and the monitoring handoff says oc-monitoring-ops reads 'version, commit SHA, prod URL' from this checkpoint (:367-368), but the skill_state template (:466-476) has no URL, platform or SHA field beyond staging_version/prod_version. The live checkpoint records production_url, staging_url, production_sha, staging_smoke_results/production_smoke_results — none of which match the template's smoke_results key.

**Evidence.** skills/oc-deploy-ops/SKILL.md:457, :367-368, :466-476 template keys current_env/staging_version/prod_version/prev_prod_version/last_deploy/smoke_results/rollback_available; .checkpoints/oc-deploy-ops.checkpoint.json skill_state keys production_url, staging_url, production_sha, staging_smoke_results, production_smoke_results

**Proposed fix.** Extend the template with platform, staging_url, production_url and the SHA fields actually written, and name the smoke-results keys per env; note that anything oc-monitoring-ops must read belongs in a non-private section (context_primer / pm_refs), not skill_state.

### skills/oc-deploy-ops/SKILL.md:551 — Render provider audit gate prescribes opchain-repo-only npm scripts for user projects
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:448 '[oc-deploy-ops] Render provider audit gate prescribes opchain-repo npm scripts (validate-pm-mcp, gen-

**Problem.** 'Audit gate: `npm run validate-pm-mcp` + `npm run gen-catalog` run via the build-time pipeline' — both scripts exist only in opchain's own package.json (they validate the opchain skill catalog and .opchain/pm.yaml). A Node project deployed to Render will not have them; the Django alternative on the next line is the only executable variant.

**Evidence.** skills/oc-deploy-ops/SKILL.md:551-553; package.json `gen-catalog => node scripts/gen-skills-catalog.mjs`, `validate-pm-mcp => node scripts/validate-pm-mcp.mjs`

**Proposed fix.** Replace with generic Node gate commands (lint/typecheck/test/npm audit) and mention the opchain scripts only as opchain's own example.

### skills/oc-fleet-ops/SKILL.md:229 — Stale release-time text: '1.7' / 'S4 build' framing in a 1.9.0 skill
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:457 — still open

**Problem.** Line 229 'fleet-ops is broad; it ships 1.7 with a first-class shortlist', the table header '1.7 status' at :233, ':280 1.7 edits that row', and :376 'Planned companion docs for the S4 build (not yet written)' are written from the 1.7.0 (2026-06-26) release's point of view. S4 is a sprint id from docs/releases/1.7-plan.md, meaningless to a reader of the shipped skill. 'A later minor release promotes any of these' (:242-243) has been false through 1.8.x and 1.9.0.

**Evidence.** frontmatter version: 1.9.0 (SKILL.md:4); skills/CHANGELOG.md:17 '[1.9.0] — 2026-09-02'; docs/releases/1.7-plan.md:809 '| **S4 — oc-fleet-ops** | ... full body + 4 references ...'. No 1.8.x/1.9.0 CHANGELOG entry touches oc-fleet-ops references (`grep -n fleet skills/CHANGELOG.md` → only :365-374 under 1.7.0).

**Proposed fix.** Replace '1.7' with 'today' / drop the version column, replace 'for the S4 build' with 'not yet written', and either write the references or remove the promise that a later minor release promotes environments.

### skills/oc-git-ops/SKILL.md:6 — shortDesc stamps the PM feature as 'v1.2' while the only PM section in the body is headed '(v1.3+)'
*category:* docs-drift

**Problem.** The catalog card text says 'v1.2 is PM-aware'; the body says PM-Tool MCP Integration is v1.3+ and never mentions the actual 1.2 feature (pm_refs). skills/CHANGELOG.md has no 1.2 entry at all. On a version-1.9.0 skill both stamps are stale and they disagree with each other.

**Evidence.** SKILL.md:6 'shortDesc: ... v1.2 is PM-aware.'; :559 '## PM-Tool MCP Integration (v1.3+)'. grep -nE '\[1\.2|pm_refs' skills/CHANGELOG.md -> no matches; earliest heading is :428 '## [1.3.0] — 2026-05 — PM-MCP runtime + release-ops'. oc-checkpoint-protocol/SKILL.md:545 'pm_refs ... (introduced in skill release 1.2)'.

**Proposed fix.** Drop the version stamp from shortDesc ('...closes the release ledger; PM-MCP aware') or align it to '(v1.3+)'.

### skills/oc-git-ops/SKILL.md:354 — Claude.ai-sandbox paths hardcoded (/home/claude, /mnt/user-data/outputs) and two different PR-description output paths
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:477 (CONFIRMED, env-assumption; still open)

**Problem.** Phase 0 clones into /home/claude/<project-name> (:66, :90-91, :103); PR creation writes /tmp/pr-description.md for gh (:351) but tells the user it was saved to /mnt/user-data/outputs/pr-description.md (:354). Neither path exists outside the Claude.ai sandbox and the two disagree.

**Evidence.** SKILL.md:90 'git clone <repo-url> /home/claude/<project-name>'; :351 '--body-file /tmp/pr-description.md'; :354 'echo "PR description saved to: /mnt/user-data/outputs/pr-description.md"'. Neither /home/claude nor /mnt/user-data exists on this host.

**Proposed fix.** Use the project directory (e.g. $PROJECT_DIR/.opchain/pr-description.md or the checkpoint's project_dir) in both :351 and :354, and replace /home/claude/<project-name> with '<your workspace>/<project-name>'.

### skills/oc-git-ops/SKILL.md:481 — oc-git-ops contradicts itself on merged_prs: per-event append on PR merge vs 'not once per merge'
*category:* docs-drift

**Problem.** The When-to-Write table row `PR merged | Append {...} to skill_state.merged_prs. Re-stamp updated_at.` (:481) prescribes a write per merge; the next paragraph (:485-487) says 'Restamp merged_prs at sensible inflection points ... not once per merge', echoing the protocol anti-pattern (:342-354). A session reading the table alone re-creates the per-merge churn the protocol forbids.

**Evidence.** skills/oc-git-ops/SKILL.md:481 `| **PR merged** | Append ... to skill_state.merged_prs. Re-stamp updated_at. |`; :485-487 `Restamp merged_prs at sensible inflection points ... not once per merge.`

**Proposed fix.** Change :481 to 'PR merged | Note it; batch the merged_prs append into the next inflection-point restamp (see below)'.

### skills/oc-integrations-engineer/references/pm-mcp-protocol.md:18 — Tool-name registry declares author-environment MCP connector names as 'the source of truth'
*category:* tooling · *known:* docs/audits/2026-07-04-portability-audit.md:502

**Problem.** :18 "The registry below is the source of truth" with connector-specific names (`mcp__claude_ai_Linear__*`, `mcp__mcp-server-github__*`, `mcp__atlassian__*`). On a machine whose MCP servers are named differently every registry-resolved call misses and, per SKILL.md:594-596, the PM loop degrades silently to "pm-mcp not configured". The `tool_overrides` escape hatch (:37-47) exists but the text presents it as a regulated-environment case, not the common one. Still open.

**Evidence.** pm-mcp-protocol.md:15-19, :21-30; scripts/lib/pm-mcp-checks.mjs:15-42 hard-codes the same names; :49-51 frames overrides as 'Regulated environments ... almost always need this'.

**Proposed fix.** Reword :18 to 'the default names as exposed by the Anthropic-shipped connectors; verify against your session's tool list and set `tool_overrides` when they differ', and have the SKILL.md 'MCP unconfigured' branch (:594) print the resolved name it tried.

### skills/oc-integrations-engineer/SKILL.md:60 — /checkpoint is listed as a command but no such verb exists anywhere (suite-wide, 28 skills)
*category:* docs-drift

**Problem.** :60 `/checkpoint           Show checkpoint status`. There is no plugin command, no orchestrator.md verb and no registry flag for `/checkpoint`; the checkpoint protocol documents `npm run checkpoint:status` / `node scripts/checkpoint.mjs status` instead. A session typing `/checkpoint` gets nothing. 28 SKILL.md files share the line.

**Evidence.** `ls plugins/opchain/commands/` -> oc-audit, oc-bugcheck, oc-commit, oc-comply, oc-data-ops, oc-deploy, oc-docs, oc-harden, oc-ops, oc-qa, oc-release, oc-repo; `grep -n '/checkpoint\b' skills/orchestrator.md` -> no hits; `grep -l '  /checkpoint' skills/*/SKILL.md | wc -l` -> 28.

**Proposed fix.** Replace the row with `npm run checkpoint:status` (with the file-tool fallback for installs without the CLI) or add a real `/checkpoint` plugin command in plugins/opchain/commands/ and register it.

### skills/oc-integrations-engineer/SKILL.md:684 — Cloudflare-Workers-only secret and auth guidance stated as universal principles
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:730

**Problem.** :684 "Never store secrets in code. Wrangler secrets or KV. Period." and the secret-audit checklist at :434 ("Stored in wrangler secrets or KV (not .env or code)?") are platform-conditional facts presented as principles; the only bundled auth reference (oauth-patterns.md:3) is Workers/Hono/KV-specific. On the Django/Rails/Go/Rust targets oc-stack-forge advertises, a session may flag correct platform-native secret storage as a failure. Still open.

**Evidence.** Quoted lines verified verbatim; `grep -n -i 'django\|rails\|vercel\|aws' skills/oc-integrations-engineer/SKILL.md skills/oc-integrations-engineer/references/oauth-patterns.md` -> no hits.

**Proposed fix.** Generalise :684 and :434 to 'the platform's secret store (wrangler secrets/KV on Workers, env-injected secrets manager elsewhere)' and add a short platform table to oauth-patterns.md or a note that the code is Workers-flavoured.

### skills/oc-integrations-engineer/TRYIT.md:1 — TRYIT.md and `tryable: true` are vestiges of the removed Try-It chat, still shipped in every zip
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:735

**Problem.** TRYIT.md:1 is an un-rendered `{{maxExchanges}}` demo-persona template for the Try-It chat that CLAUDE.md records as removed (POST /api/try/* now 410). content.config.ts:54-57 keeps `tryable` only as a schema leftover; skills.ts:3 claims to pair the collection "with the TRYIT.md prompts via a build-time glob" but no such glob exists in the file; make-skills-zip.sh still packages TRYIT.md. A model browsing the installed skill can adopt the demo constraints. Still open.

**Evidence.** `grep -rn -i 'tryit' site/src` -> only the comment at site/src/lib/skills.ts:3; content.config.ts:54 "`tryable` was used by the now-removed Try-It chat"; TRYIT.md:1 contains `{{maxExchanges}}`.

**Proposed fix.** Delete skills/*/TRYIT.md and the `tryable` frontmatter key, drop the TRYIT lines from scripts/make-skills-zip.sh and the stale comment in site/src/lib/skills.ts, remove `tryable` from content.config.ts.

### skills/oc-migration-ops/references/migration-playbooks.md:444 — 'Structural Refactor Playbook' is duplicated with divergent step lists
*category:* docs-drift

**Problem.** Two `## Structural Refactor Playbook` sections (:361 and :444) each contain a 'Monorepo Restructure' and 'Module Extraction' subsection; the first gives 7 steps, the second 8 steps plus a checklist and verification table. A session loading the playbook gets two orderings for the same migration type.

**Evidence.** `grep -n '^## \|^### ' skills/oc-migration-ops/references/migration-playbooks.md` -> :361/:363/:375 and :444/:446/:471.

**Proposed fix.** Delete the shorter first copy (:361-387) and keep the checklist-backed version.

### skills/oc-migration-ops/SKILL.md:142 — `ask_user_input` is a dead tool reference
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:760 [oc-migration-ops] Harness assumptions: nonexistent ask_user_input tool (CONFIRMED, env-assumption)

**Problem.** 'If ambiguous, ask ONE clarifying question using `ask_user_input`' - no tool by that name exists in Claude Code (degrades to asking in text).

**Evidence.** `grep -l ask_user_input skills/*/SKILL.md` -> 4 files; tool absent from the Claude Code tool set.

**Proposed fix.** Replace with 'ask one clarifying question' (or AskUserQuestion).

### skills/oc-migration-ops/SKILL.md:156 — Assessment step tells the session to read `wrangler.toml`; current Cloudflare projects (including this repo) use `wrangler.jsonc`
*category:* docs-drift

**Problem.** 'For Cloudflare Workers apps, also read `wrangler.toml` for bindings' - a jsonc-configured project yields no file; the same assumption repeats in the platform-move playbook (references/migration-playbooks.md:345, :347).

**Evidence.** `ls wrangler.jsonc` in this repo; CLAUDE.md 'wrangler.jsonc # Worker config'.

**Proposed fix.** Say 'wrangler.jsonc / wrangler.toml'.

### skills/oc-migration-ops/SKILL.md:793 — oc-monitoring-ops / oc-deploy-ops are said to write into the migration parent ticket; neither skill documents that behaviour
*category:* cross-skill-contract

**Problem.** 'deploy tickets parent-link to the migration parent, incident tickets back-reference if any incident is traced to a migration step'. oc-deploy-ops parent-links deploy tickets to 'each linked ticket'; oc-monitoring-ops parent-links incidents to the most recent deploy ticket read from oc-deploy-ops skill_state. Neither mentions a migration parent.

**Evidence.** skills/oc-deploy-ops/SKILL.md:765-766; skills/oc-monitoring-ops/SKILL.md:673-675; `grep -n -i migration skills/oc-monitoring-ops/SKILL.md` -> no hits.

**Proposed fix.** Soften to 'may parent-link' or add the migration-parent lookup (via pm_refs role source) to both sibling skills.

### skills/oc-migration-ops/TRYIT.md:6 — TRYIT.md lists five migration types; SKILL.md defines seven
*category:* docs-drift

**Problem.** Demo prompt classifies into 'database, framework, auth, platform, structural'; SKILL.md:117-125 also defines Dependency and Ecosystem.

**Evidence.** skills/oc-migration-ops/TRYIT.md:6 vs SKILL.md:124-125.

**Proposed fix.** Add 'dependency, ecosystem' to the TRYIT list.

### skills/oc-modularize-ops/SKILL.md:32 — governance.breaking_change_policy points at skills/CHANGELOG.md, which the skill zip does not ship
*category:* plugin · *known:* docs/audits/2026-07-04-portability-audit.md:770 (CONFIRMED, repo-only-dependency, fix:S)

**Problem.** Frontmatter names skills/CHANGELOG.md as the breaking-change policy. make-skills-zip.sh packs only skill directories plus skills/README.md, so installed users cannot resolve the path. Ecosystem-wide (every skill's frontmatter carries the same line), but it is this skill's text.

**Evidence.** skills/oc-modularize-ops/SKILL.md:32 'breaking_change_policy: skills/CHANGELOG.md'; scripts/make-skills-zip.sh:47 'items+=("${dir%/}")' and :53 '[[ -f README.md ]] && items+=(README.md)' — no CHANGELOG.md entry.

**Proposed fix.** Either add CHANGELOG.md to the zip's items list or point breaking_change_policy at the public URL (https://opchain.dev/changelog).

### skills/oc-modularize-ops/SKILL.md:327 — PM state names plan-pending / equivalence-verified are outside pm-mcp-protocol's universal + extended vocabulary
*category:* cross-skill-contract

**Problem.** The child-ticket state machine uses `plan-pending → in_progress → equivalence-verified → done` (+ `blocked`). Appendix A of the PM protocol lists only staging-verified, shipped, rolled-back, blocked, resolved-pending-postmortem, and its validator rule flags SKILL.md state names outside pm.yaml / Appendix A as 'State drift' (warn). `plan-pending` is shared with oc-migration-ops; `equivalence-verified` is unique to this skill.

**Evidence.** skills/oc-modularize-ops/SKILL.md:327 '`plan-pending → in_progress → equivalence-verified → done`'; skills/oc-integrations-engineer/references/pm-mcp-protocol.md:268 (validator row: 'State names referenced in SKILL.md prose … appear in `pm.yaml` `states` or are documented in this protocol's "extended state vocabulary" appendix. | State drift | **warn**'); :278 '## Appendix A — Extended state vocabulary' with rows at :285-290 not including either name.

**Proposed fix.** Add `plan-pending` (oc-migration-ops, oc-modularize-ops) and `equivalence-verified` (oc-modularize-ops) rows to pm-mcp-protocol.md Appendix A, or map them to the universal states in this skill's text.

### skills/oc-modularize-ops/SKILL.md:380 — All four companion reference docs are still 'not yet written' 2.5 months after 1.7.0
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:522 (PARTIAL, missing-bundled-file, fix:L)

**Problem.** The references/ section honestly labels modularization-fitness.md, golden-fixtures.md, seam-patterns.md and equivalence-verification.md as planned. None exist; references/ holds only the two synced bundles. The should-we? scoring rubric and the equivalence-normalization rules the gates depend on therefore live nowhere.

**Evidence.** skills/oc-modularize-ops/SKILL.md:380 'Planned companion docs for this skill (not yet written):'; ls skills/oc-modularize-ops/references/ → checkpoint-protocol.md, orchestrator.md only; ls of the four named files → 'No such file or directory'.

**Proposed fix.** Write the four docs (the 1.7 plan's Phase 0 table and R-rows are most of the content) or trim the section to the one or two that will actually ship and drop the rest.

### skills/oc-monitoring-ops/SKILL.md:6 — shortDesc dates the PM-incident feature to v1.2 while the section header and protocol say v1.3+
*category:* docs-drift

**Problem.** Frontmatter shortDesc: 'v1.2 opens PM incident tickets when alerts fire.' The body section that implements it is titled 'PM-Tool MCP Integration (v1.3+)' and the runtime contract it defers to is 'PM-MCP Protocol (v1.3+)'; the catalog CHANGELOG attributes the PM-MCP runtime to 1.3.0 and has no 1.2 entry. With every skill at 1.9.0 the version tag in a one-line description is stale marketing text that contradicts the body. oc-deploy-ops carries the identical mismatch.

**Evidence.** SKILL.md:6 vs :629 '## PM-Tool MCP Integration (v1.3+)'; skills/oc-integrations-engineer/references/pm-mcp-protocol.md:1 '# PM-MCP Protocol (v1.3+)'; skills/CHANGELOG.md:428 '## [1.3.0] — 2026-05 — PM-MCP runtime + release-ops'; `grep -n -E '^## \[1\.[0-2]' skills/CHANGELOG.md` → none. oc-deploy-ops/SKILL.md:6 'v1.2 creates deploy tickets' vs :718 '(v1.3+)'.

**Proposed fix.** Drop the version tag from shortDesc ('...incidents. Opens PM incident tickets when alerts fire.') here and in oc-deploy-ops:6, or align both to 1.3.

### skills/oc-monitoring-ops/SKILL.md:30 — Frontmatter description differs from the orchestrator.md §7 canonical copy that 'should match exactly'
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:780

**Problem.** Still open. The SKILL.md description adds 'in the pipeline', 'uptime check', 'logging strategy', 'on-call', 'SLI', 'is prod healthy', 'why is it slow', 'error rate', 'status page' that the §7 canonical entry lacks; the protocol mandates exact match, and the bundled copy of that rule ships inside this skill.

**Evidence.** skills/orchestrator.md:339 'Each skill's YAML frontmatter `description` field should match exactly:'; :460-466 canonical oc-monitoring-ops entry ends at '"set up Sentry", "SLO", "runbook".' SKILL.md:30-37 has the longer trigger list.

**Proposed fix.** Copy SKILL.md:30-37 into orchestrator.md:460-466 (the richer trigger list is the better one), then `node scripts/sync-skill-bundles.mjs`.

### skills/oc-monitoring-ops/SKILL.md:96 — SKILL.md never points at its bundled references/checkpoint-protocol.md (suite-wide: 30 of 33 skills)
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:254

**Problem.** Still open. The 'Session Persistence (Checkpoint Protocol)' and 'Checkpoint Integration' sections describe when/what to write but never tell the session to read the bundled contract, so the 712-line references/checkpoint-protocol.md is shipped but orphaned. This is the norm rather than the exception — only oc-app-architect, oc-orchestrator and oc-reverse-spec cite theirs — so it is a suite-level fix, recorded here for completeness.

**Evidence.** `grep -n checkpoint-protocol skills/oc-monitoring-ops/SKILL.md` → no output. `grep -l 'references/checkpoint-protocol.md' skills/*/SKILL.md` → oc-app-architect, oc-orchestrator, oc-reverse-spec only. Bundle is in sync (diff vs frontmatter-stripped skills/oc-checkpoint-protocol/SKILL.md → identical).

**Proposed fix.** Add one line under SKILL.md:96 ('Read `references/checkpoint-protocol.md` for the wire schema and write rules.') — ideally via a suite-wide template so all 30 skills get it.

### skills/oc-monitoring-ops/SKILL.md:176 — Setup wizard names a nonexistent tool `ask_user_input`
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:785

**Problem.** Still open. 'Use `ask_user_input` for remaining unknowns' — no such tool exists in Claude Code (the structured-question tool is AskUserQuestion). Sessions degrade to prose questions, so the wizard works, but the instruction is not executable as written. Four skills share the string.

**Evidence.** SKILL.md:176. `grep -rl ask_user_input skills/*/SKILL.md | wc -l` → 4.

**Proposed fix.** Replace with 'Ask the user (AskUserQuestion when available) for remaining unknowns' across the four skills.

### skills/oc-monitoring-ops/TRYIT.md:1 — TRYIT.md and `tryable: true` have no consumer — {{maxExchanges}} is never filled and the file still ships in the zip
*category:* tooling · *known:* docs/audits/2026-07-04-portability-audit.md:790

**Problem.** Still open, and now fully orphaned: the email-gated Try-It chat that consumed TRYIT prompts was removed (CLAUDE.md), nothing in the repo substitutes the `{{maxExchanges}}` placeholder, and the zip builder explicitly carries TRYIT.md into the user-facing install. A model browsing the installed skill directory can adopt the 'short demo' persona.

**Evidence.** TRYIT.md:1 '...the user gets up to {{maxExchanges}} exchanges.' `grep -rn maxExchanges site/src src scripts mcp` → no hits (repo-wide only docs/audits mentions). site/src/lib/skills.ts:3 comment claims a TRYIT.md glob but the file has no other tryit/tryable reference. scripts/make-skills-zip.sh:8,36,64 list TRYIT.md as shipped. SKILL.md:9 `tryable: true`.

**Proposed fix.** Delete TRYIT.md and the `tryable` frontmatter key (or exclude TRYIT.md in make-skills-zip.sh) once the /demo page is confirmed not to read it.

### skills/oc-orchestrator/SKILL.md:26 — Frontmatter description drifts from the canonical §7 copy in orchestrator.md
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:800 '[oc-orchestrator] Frontmatter description drifts from the canonical copy in skills/orchestrator.md se

**Problem.** Frontmatter description contains 'or any question about pipeline state across projects' (:26); the canonical block in skills/orchestrator.md §7 (bundled into every skill's references/orchestrator.md) omits that clause.

**Evidence.** skills/orchestrator.md:474-480 vs skills/oc-orchestrator/SKILL.md:22-28.

**Proposed fix.** Sync one to the other (the §7 copy is declared canonical).

### skills/oc-orchestrator/SKILL.md:233 — oc-orchestrator's registry example uses the /home/claude paths the same file forbids 118 lines later
*category:* self-contradiction · *surfaced by the executability lens*

**Problem.** The Registry Schema example — the shape a session copies when registering a project — hardcodes `"path": "/home/claude/acme-core"` (:233) and `"path": "/home/claude/meridian"` (:242). The `/oc-ops scan` section in the same file states the rule and the reason it was removed: 'searches **roots derived at runtime** — never a hardcoded path ... (The old `/home/claude/*` literal was wrong on every runtime except one; don't reintroduce it.)' (:346-352). A session reading top-to-bottom copies the forbidden literal from the schema example before reaching the prohibition.

**Evidence.** skills/oc-orchestrator/SKILL.md:233 `      "path": "/home/claude/acme-core",`; :242 `      "path": "/home/claude/meridian",`; :350-352 `(The old \`/home/claude/*\` literal was wrong on every runtime except one; don't reintroduce it.)`

**Proposed fix.** Replace the two example paths with runtime-shaped placeholders (e.g. `"/Users/<you>/repos/acme-core"` or `"{cwd}/../acme-core"`) and add a one-line pointer from the schema block to the scan-roots rule at :346.

### skills/oc-orchestrator/SKILL.md:557 — Fallback routing uses a nonexistent `ask_user_input` tool
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:805 '[oc-orchestrator] Environment assumptions: nonexistent ask_user_input tool'

**Problem.** Fallback step 2 says to ask one clarifying question 'using `ask_user_input` with 2-3 options'. No such tool exists in Claude Code; the same phantom appears in three other skills.

**Evidence.** grep -rln ask_user_input skills/*/SKILL.md -> oc-migration-ops, oc-orchestrator, oc-monitoring-ops, oc-security-auditor; no tool by that name is available in this runtime.

**Proposed fix.** Say 'ask one clarifying question in chat with 2-3 options' and drop the tool name.

### skills/oc-orchestrator/SKILL.md:599 — Retired bare skill names in examples and live state ('integrations', 'app-architect', 'orchestrator', 'bug-check', 'checkpoint-protocol')
*category:* docs-drift

**Problem.** The pipeline view example lists `⏳ integrations     Not needed` (:599) and the monorepo example uses `storefront-app-architect.checkpoint.json` (:295); the live checkpoint records `routed_to: "app-architect"` and `skills_invoked_this_session: ["orchestrator","app-architect","bug-check","checkpoint-protocol"]`. None are current skill ids.

**Evidence.** skills/oc-orchestrator/SKILL.md:295, :599; .checkpoints/oc-orchestrator.checkpoint.json:243-248, :253.

**Proposed fix.** Use oc-integrations-engineer / oc-app-architect etc. in the examples and restamp the live routing entry with oc- ids.

### skills/oc-orchestrator/SKILL.md:757 — `update oc-orchestrator --skill_state…` is not an executable form; object values need the `:json` suffix
*category:* tooling

**Problem.** The only write instruction is the elided `update oc-orchestrator --skill_state…`. The CLI parses `--path=value` as a string unless the key carries `:json`, so writing the documented nested registry requires e.g. `--skill_state.registry:json='{...}'` or dotted paths; a session copying the text cannot produce a valid write.

**Evidence.** scripts/checkpoint.mjs:811-814 `if (lhs.endsWith(":json")) { isJson = true; ... value = JSON.parse(value) }`; usage at :864 `checkpoint update <skill> [--field=value ...]`.

**Proposed fix.** Give one concrete example: `node scripts/checkpoint.mjs update oc-orchestrator --skill_state.active_project=acme-core --skill_state.routing_history+:json='{...}'`.

### skills/oc-orchestrator/SKILL.md:850 — Count string '~18 skills are instructed to read references/orchestrator.md' is wrong (32 of 33 today)
*category:* docs-drift · *independently reported 2×*

**Problem.** The rename-rationale note (:850-853) understates the blast radius: gen-skills-catalog.mjs:106-113 fails the build unless every skill except oc-checkpoint-protocol carries the bootstrap line, and 32 do today. A reader sizing a rename of orchestrator.md from this note would under-count by 14.

**Evidence.** `grep -l references/orchestrator.md skills/*/SKILL.md | wc -l` -> 32; `grep -L` -> only skills/oc-checkpoint-protocol/SKILL.md.

**Proposed fix.** Replace "~18 skills" with "every skill except oc-checkpoint-protocol (build-enforced by gen-skills-catalog.mjs)".

### skills/oc-prompt-ops/SKILL.md:301 — Migration hand-off verb ambiguity: this skill says migrate gates on /oc-prompt drift, oc-claude-api asks for a 'regression run'; re-tuning hand-off to oc-claude-api names no verb
*category:* cross-skill-contract

**Problem.** SKILL.md:379 and drift-detection.md:42-44,84 say `oc-claude-api migrate` gates its diff on `/oc-prompt drift`; oc-claude-api/SKILL.md:247 hands the diff to oc-prompt-ops 'for a regression run against the golden set' (i.e. regress) and never names drift. SKILL.md:301 and drift-detection.md:98 hand per-case deltas 'to `oc-claude-api` for prompt re-tuning' — oc-claude-api's frontmatter verbs are migrate, cache-audit, tool-use, cost; none is a re-tune entry point. Neither drift nor regress is in this skill's frontmatter commands.

**Evidence.** sed -n '247p' skills/oc-claude-api/SKILL.md → 'Hand the diff to `oc-prompt-ops` for a regression run against the golden set before merge'. sed -n '10,15p' skills/oc-claude-api/SKILL.md → commands: /oc-claude-api, migrate, cache-audit, tool-use, cost.

**Proposed fix.** State one verb on both sides ('migrate runs /oc-prompt drift <name> against the new pinned model') and name the re-tune entry as '/oc-claude-api migrate (re-tune step)' or a plain task hand-off.

### skills/oc-qa-ops/references/qa-manifest.md:94 — Consumption contract does not cover a present manifest with no `coverage:` block — the repo's own manifest is that case
*category:* cross-skill-contract

**Problem.** Downstream behavior is specified for absent, unparseable, and unknown-version manifests, but not for a valid manifest that omits `coverage:` entirely; the dogfood manifest omits it by design, so oc-bug-check's 'compare against coverage.global' step is undefined here.

**Evidence.** qa-manifest.md:94-104 (three cases: present, unparseable, unrecognized version); .opchain/qa.yaml:34-36 `# Coverage is intentionally absent until Vitest emits measured data`; oc-bug-check/SKILL.md:174-177 assumes `coverage.global` exists.

**Proposed fix.** Add one sentence: a manifest without `coverage:` applies no budget and emits nothing (or a single informational line).

### skills/oc-qa-ops/SKILL.md:152 — orchestrator.md pipeline-map row omits oc-code-auditor from oc-qa-ops's reads
*category:* cross-skill-contract

**Problem.** SKILL.md lists oc-code-auditor in Reads-from, but the shared pipeline map's oc-qa-ops row (bundled into every skill) lists only app-architect, api-dev, data-ops, bug-check, scale-ops.

**Evidence.** skills/oc-qa-ops/SKILL.md:202 `| oc-code-auditor | Findings + test-bootstrap output feed the gap-audit ...`; skills/orchestrator.md:152 `| **oc-qa-ops** | oc-app-architect (...), oc-api-dev (...), oc-data-ops (...), oc-bug-check (...), oc-scale-ops (...) | ...`.

**Proposed fix.** Add oc-code-auditor (findings + test-bootstrap output) to the reads column of orchestrator.md:152 and resync bundles.

### skills/oc-rag-forge/references/vector-db-decision.md:80 — vector-db-decision.md cites 'the hybrid section of SKILL.md', which does not exist
*category:* docs-drift

**Problem.** The anti-patterns list sends the reader to a SKILL.md section that has no heading; hybrid guidance is a Designer bullet and a command entry.

**Evidence.** grep -n '^#.*[Hh]ybrid' skills/oc-rag-forge/SKILL.md -> 0 hits; hybrid content is at SKILL.md:155-158 (Designer persona bullet) and :66 (/oc-rag hybrid command).

**Proposed fix.** Cite 'the Default to hybrid bullet in SKILL.md Phase 1' or add a short '### Hybrid search' subsection under Phase 1.

### skills/oc-rag-forge/SKILL.md:22 — governance.breaking_change_policy points at skills/CHANGELOG.md, which is never bundled into the skill zip
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:825 (CONFIRMED, repo-only-dependency) — still open

**Problem.** On every installed copy the policy path dangles; shared by all 15 skills that carry a governance block.

**Evidence.** grep -n CHANGELOG scripts/make-skills-zip.sh -> 0 hits; grep -l 'breaking_change_policy: skills/CHANGELOG.md' skills/*/SKILL.md | wc -l -> 15.

**Proposed fix.** Point the policy at a URL (opchain.dev/changelog or the public mirror's CHANGELOG) or add CHANGELOG.md to the combined zip.

### skills/oc-release-ops/references/site-release-surfaces.md:91 — `site-release-surfaces.md` F7 still names `scripts/gen-og.mjs`, which does not exist
*category:* stale-reference · *surfaced by the release-plan lens* · *known:* §4.4 row 8 (:699); plan §6 F7

**Problem.** F7's "where" column reads "`site/src/layouts/Base.astro` (`ROUTE_OG_IMAGES`) + `scripts/gen-og.mjs`". The real generator is `scripts/gen-og-images.mjs`; `gen-og` is only the npm alias. A 2.0 release agent adding OG cards for oc-hindsight and oc-evolve will look for a file that is not there. Registered in §4.4 row 8 and scheduled for Sprint 5, but the text is wrong today and the file ships publicly.

**Evidence.** skills/oc-release-ops/references/site-release-surfaces.md:91 as quoted. `ls scripts/gen-og.mjs` → absent; `scripts/gen-og-images.mjs` exists (its own header at :7 reads `Run: node scripts/gen-og-images.mjs`). package.json:31 `"gen-og": "node scripts/gen-og-images.mjs"`.

**Proposed fix.** One-word fix now rather than in Sprint 5: `scripts/gen-og.mjs` → `scripts/gen-og-images.mjs` (npm alias `gen-og`). It names no 2.0 identity so it merges as ordinary substrate.

### skills/oc-release-ops/references/version-locations.md:68 — version-locations.md points at a test glob and a lockstep script that do not exist
*category:* docs-drift

**Problem.** 'Future location additions' step 4 says to add a regression test under `tests/oc-release-ops-*.test.js` — no file matches; the real release guards are tests/release-surfaces.test.js, tests/check-release-tag.test.js, tests/release-sequence.test.js and tests/site-release-chip.test.js. Steps :5-6 and :65-66 still route lockstep enforcement to `scripts/check-version-lockstep.mjs` 'when that script exists' or the `validate-pm-mcp.mjs` family; the check that actually exists (scripts/check-release-surfaces.mjs, added v1.6, plus scripts/check-release-tag.mjs) is not named anywhere in this file.

**Evidence.** ls tests/oc-release-ops-* → no matches; ls tests | grep release → check-release-tag.test.js release-sequence.test.js release-surfaces.test.js site-release-chip.test.js; ls scripts/check-version-lockstep.mjs → No such file.

**Proposed fix.** Name scripts/check-release-surfaces.mjs + tests/release-surfaces.test.js as the lockstep guard and drop the check-version-lockstep.mjs / tests/oc-release-ops-* placeholders.

### skills/oc-repo-ops/SKILL.md:101 — 'strict mode' is referenced but defined nowhere
*category:* executability

**Problem.** SKILL.md:101 says warnings block only 'unless strict mode is enabled', but no command variant, flag, config key, env var, or checkpoint field enables strict mode anywhere: grep -rn -i strict over skills/oc-repo-ops/ (excluding the two synced bundles), plugins/opchain/commands/oc-repo.md and skills/oc-git-ops/SKILL.md returns only this line. oc-git-ops cannot request it and a user cannot turn it on as written.

**Evidence.** SKILL.md:101 'Warnings do not block unless strict mode is enabled, but they must appear in the'; grep result: single hit.

**Proposed fix.** Either define it (e.g. '/oc-repo verify --strict' in frontmatter commands, or a skill_state.strict boolean set by the user) or drop the clause and keep 'warnings never block; they must appear in the PR body or checkpoint'.

### skills/oc-repo-ops/SKILL.md:118 — Opchain-internal build runbook (src/lib/flags, npm run gen-*) ships as public skill content
*category:* plugin · *known:* docs/audits/2026-08-22-oss-readiness-audit.md F11

**Problem.** SKILL.md:118-127 ('For Opchain itself, verify: … src/lib/flags/registry.js … npm run gen-catalog / gen-mcp-catalog … sync-bundles:check') and pr-readiness-gate.md:26-35 still carry monorepo-internal paths that the mirror and plugin publish verbatim. The text is self-consistent today (it scopes them 'For Opchain itself' and :129-130 tells other repos to infer equivalents), so this is the open F11 register item, not a new contradiction.

**Evidence.** SKILL.md:118 'For Opchain itself, verify:'; SKILL.md:121 '`src/lib/flags/registry.js` has one registry flag per skill and command flags'; pr-readiness-gate.md:32 '- `src/lib/flags/registry.js`'; audit F11 at docs/audits/2026-08-22-oss-readiness-audit.md:1013-1016 cites the same lines and is still unaddressed.

**Proposed fix.** Move the opchain-specific block to an opchain-only reference (or CLAUDE.md) and keep the generic 'infer catalog surfaces from package scripts, content collections, generated files, and docs' rule in the shipped skill; blocked on the OSS split per the v2.0 plan.

### skills/oc-repo-ops/SKILL.md:126 — Plugin/cache parity described as conditional on a 'personal plugin path' though an unconditional in-repo check exists and is unnamed
*category:* docs-drift

**Problem.** SKILL.md:126-127 ('Packaged plugin/cache parity is checked when the personal plugin path is in scope for the task') and pr-readiness-gate.md:35 ('packaged plugin/cache, when plugin distribution is in scope') predate 31c1e60 (2026-08-26), which materialised plugins/opchain/skills inside the repo and added scripts/sync-plugin-skills.mjs. package.json now runs `npm run sync-plugin-skills:check` unconditionally in prebuild and pretest, and the live gate run recorded it (.checkpoints/oc-repo-ops.checkpoint.json:11 lists 'sync-plugin-skills:check'). The text names sync-bundles:check (:125) but not the plugin check, and keeps a conditional that no longer applies to opchain.

**Evidence.** SKILL.md:125 'Skill bundle sync does not drift (npm run sync-bundles:check).'; SKILL.md:126-127 'Packaged plugin/cache parity is checked when the personal plugin path is in scope for the task.'; package.json prebuild: '… npm run sync-bundles:check && npm run sync-plugin-skills:check …'; git log --diff-filter=A -- scripts/sync-plugin-skills.mjs → 31c1e60 2026-08-26.

**Proposed fix.** Replace :126-127 with 'Plugin skill copy does not drift (npm run sync-plugin-skills:check).' and update pr-readiness-gate.md:35 to 'packaged plugin copy (plugins/opchain/skills)'.

### skills/oc-repo-ops/SKILL.md:139 — Documented checkpoint example drifts from the live checkpoint (phase name, skill_state keys)
*category:* docs-drift

**Problem.** The Checkpoint Integration example writes phase 'pr-readiness' (SKILL.md:139) while the live .checkpoints/oc-repo-ops.checkpoint.json:8 uses 'pr-verify'; the documented skill_state (SKILL.md:151-159) omits internal_links_verified, related_untracked_files_staged and last_verify{at,branch,base,verdict,blocking_findings} that the live file carries (:34-43). phase is 'Skill-defined' (.checkpoints/README.md:51) so the validator does not catch the mismatch, and oc-git-ops reads this checkpoint for the verdict (oc-git-ops/SKILL.md:336-341).

**Evidence.** SKILL.md:139 '"phase": "pr-readiness",'; .checkpoints/oc-repo-ops.checkpoint.json:8 '"phase": "pr-verify",'; live :34 internal_links_verified, :35 related_untracked_files_staged, :37 last_verify.

**Proposed fix.** Pick one phase name (pr-verify matches the verb) and update the example; add the three extra skill_state keys to the example or drop them from the live file at the next verify run.

### skills/oc-reverse-spec/SKILL.md:42 — Says oc-app-architect Phase 6 decomposes features into sprints; that is Phase 4 (/oc-roadmap), Phase 6 is the build loop
*category:* docs-drift

**Problem.** Phase attribution is wrong on the motivating bullet; the rest of the skill (:428, :434) uses Phase 6 correctly as the consumer of sprint-plan.md.

**Evidence.** SKILL.md:42 '**oc-app-architect Phase 6** can't decompose features into sprints (no spec.md or sprint-plan.md to reference)'. oc-app-architect/SKILL.md:328 '## Phase 4: Sprint Plan (`/oc-roadmap`)'; :392 '## Phase 6: Build Loop (`/oc-build`)'.

**Proposed fix.** Change to 'oc-app-architect Phase 4 (`/oc-roadmap`) can't decompose features into sprints'.

### skills/oc-reverse-spec/SKILL.md:422 — Cites an oc-stack-forge 'retroactive use mode' that oc-stack-forge does not define
*category:* cross-skill-contract

**Problem.** No mode by that name exists in the target; the closest documented standalone use is 'Gap analysis on existing codebases (with oc-reverse-spec)' with no verb or input path for stack-forge-audit.md.

**Evidence.** SKILL.md:422 'This output is designed to feed directly into oc-stack-forge's retroactive use mode.' `grep -n -i retroactive skills/oc-stack-forge/SKILL.md` → no matches; oc-stack-forge/SKILL.md:442 '- Gap analysis on existing codebases (with oc-reverse-spec)'; :481 '| oc-reverse-spec | Existing stack → gap analysis baseline |'.

**Proposed fix.** Reword to 'feeds oc-stack-forge's gap-analysis use on existing codebases (oc-stack-forge Cross-Skill Reads)', or have oc-stack-forge name the mode and the file it reads.

### skills/oc-reverse-spec/SKILL.md:529 — '8-11 markdown files' undercounts the documented output tree
*category:* docs-drift

**Problem.** Output Structure lists 7 mandatory + 4 conditional spec docs plus design/ (2), gap-analysis.md, stack-forge-audit.md and app-architect-ready/ (2) — 13 to 17 files. The PM-mirror child-ticket loop at :546 iterates 'each generated spec file', so the count sets expectations for ticket volume.

**Evidence.** SKILL.md:529 'A oc-reverse-spec run produces 8-11 markdown files'; :223-244 tree; :248-249 only 05/08 named conditional in text, 09/10 conditional in tree comments (:234-235).

**Proposed fix.** State '7–11 spec docs plus up to 6 companion files' or drop the number.

### skills/oc-scale-ops/SKILL.md:180 — Points the reader at another skill's skill_state key (oc-qa-ops load_plan.exists)
*category:* cross-skill-contract

**Problem.** SKILL.md:180-181 '(The oc-qa-ops checkpoint's `load_plan.exists` only signals that a plan is in the manifest — read the manifest for scenarios.)' names a field that oc-qa-ops documents under skill_state, which the checkpoint protocol declares private to the owning skill.

**Evidence.** skills/oc-qa-ops/SKILL.md:182 ('"skill_state": {') … :187 ('"load_plan": { "exists": true, "handed_to": "oc-scale-ops" }'); skills/oc-checkpoint-protocol/SKILL.md:376 ('Never read `skill_state` — it's private to the owning skill').

**Proposed fix.** Delete the parenthetical, or point at oc-qa-ops's context_primer.generated_files ('.opchain/qa.yaml', oc-qa-ops/SKILL.md:175-180) and the manifest itself as the only sources.

### skills/oc-scale-ops/SKILL.md:460 — PM comment points at the local checkpoint file as the 'full report'; checkpoint section names no field or key that would hold it
*category:* checkpoint

**Problem.** SKILL.md:460 'Full report: .checkpoints/oc-scale-ops.checkpoint.json' is posted into the PM ticket, but the checkpoint section (:406-420) documents six write events with no skill_state key names and no JSON example (contrast oc-qa-ops:165-190), and the readiness/load-test reports (:100-129, :228-254) have no declared output path. PM readers get a repo-local path with no defined content.

**Evidence.** sed -n '406,420p' skills/oc-scale-ops/SKILL.md (prose table only); grep -n 'skill_state\|report_path' skills/oc-scale-ops/SKILL.md → 0 hits.

**Proposed fix.** Declare a report output path (e.g. docs/scale/<date>-readiness.md), record it in context_primer.generated_files, and link that path from the PM comment; add a minimal checkpoint JSON example naming the skill_state keys.

### skills/oc-security-auditor/SKILL.md:96 — Handoff verb `/oc-audit security` is absent from oc-code-auditor's frontmatter `commands:`
*category:* cross-skill-contract

**Problem.** This skill invokes `/oc-audit security` four times; the target's frontmatter lists only `/oc-audit` and `/oc-audit full`. The verb is documented in oc-code-auditor's body and the flag registry gates by parent verb (subcommands inherit), so routing works today, but the frontmatter contract does not carry it.

**Evidence.** SKILL.md:94, 96, 99, 376 `/oc-audit security`. skills/oc-code-auditor/SKILL.md:10-12 `commands: - /oc-audit - /oc-audit full`; body :37 and :363 document `/oc-audit security`. src/lib/flags/registry.js:283 registers `/oc-audit` only.

**Proposed fix.** Add `/oc-audit security` (and `/oc-audit pre-deploy`, which oc-deploy-ops:178 and oc-app-architect:554 also invoke) to oc-code-auditor's frontmatter commands, or state in orchestrator.md that frontmatter lists parent verbs only.

### skills/oc-security-auditor/SKILL.md:212 — OWASP fallback edition pinned with a stale 'current as of 2025' claim
*category:* docs-drift

**Problem.** The offline fallback asserts the 2021 edition is 'current as of 2025'; OWASP published Top 10:2025 in late 2025 and today is 2026-09-11, so the parenthetical is wrong and the fallback categories (A01-A10 at :214-218) are the previous edition. Impact is limited because :210-211 says to web-search first.

**Evidence.** SKILL.md:211-212 'Fallback if search is unavailable — the 2021 edition (current as of 2025):'; :214-218 list the 2021 categories.

**Proposed fix.** Update the fallback to the 2025 edition and drop the dated parenthetical ('fallback edition: 2025; confirm via web search').

### skills/oc-security-auditor/SKILL.md:225 — Readiness/regulated framework lists disagree across four sites
*category:* docs-drift

**Problem.** `/oc-security readiness` is documented as supporting different framework sets in the command reference and the pillar text, and the PM-MCP section names CMMC and FedRAMP as regulated-run crosswalk frameworks that readiness does not support.

**Evidence.** SKILL.md:63 'SOC2 / ISO27001 / HIPAA'; :225 'Supported: SOC2, ISO27001, HIPAA, PCI-DSS'; :505 'SOC2 / HIPAA / CMMC / ISO'; :537 'regulated runs (SOC2, HIPAA, CMMC, FedRAMP)'.

**Proposed fix.** Pick one supported list at :225 and reuse it at :63, :505, :537 (or state that CMMC/FedRAMP crosswalks are produced only when the user supplies the control catalogue).

### skills/oc-security-auditor/SKILL.md:343 — Nonexistent tool names `web_fetch` and `ask_user_input`
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:760, :785, :805 (same `ask_user_input` finding confirmed for oc-migration-ops, oc-monitoring-ops, oc-orche

**Problem.** Step 0 of posture and the headers check name tools that do not exist in Claude Code (the real tools are AskUserQuestion and WebFetch). The model falls back to plain-text questions / no fetch, so the tier prompt and live header check degrade silently.

**Evidence.** SKILL.md:343 'Use `ask_user_input`:'; :243 'If a URL is available, use web_fetch.' `grep -n 'ask_user_input\|web_fetch' skills/orchestrator.md skills/oc-checkpoint-protocol/SKILL.md` → none (not a shared alias). Only 4 skills use `ask_user_input`, this is the only `web_fetch` user.

**Proposed fix.** Replace with 'ask the user (AskUserQuestion when available)' at :343 and 'fetch the URL (WebFetch or curl -sI)' at :243.

### skills/oc-security-auditor/SKILL.md:369 — 'One checkpoint per app' in a monorepo collides with the single fixed checkpoint path
*category:* checkpoint · *known:* docs/plans/coordination-gaps-punchlist.md P7a — Stable checkpoint identity (checkpoint identity is a bare name string with collisions)

**Problem.** Monorepo scoping says to write one checkpoint per app, but the only documented location is `{project-dir}/.checkpoints/oc-security-auditor.checkpoint.json`; per-app files would overwrite each other unless each app is its own project-dir, which the text does not say.

**Evidence.** SKILL.md:366-369 'assess per-app ... Write one checkpoint per app, not one per repo.'; :421-422 single location. docs/plans/coordination-gaps-overhaul.md:178 'checkpoint identity is a bare name string with collisions'.

**Proposed fix.** State that per-app assessment writes to `<app-dir>/.checkpoints/oc-security-auditor.checkpoint.json` (app dir as project-dir) or defer to the P7a identity scheme once it lands.

### skills/oc-security-auditor/SKILL.md:439 — skill_state `scope` enum does not match the Posture Report template's Scope enum
*category:* docs-drift

**Problem.** The checkpoint example uses `"scope": "posture"` while the report template enumerates `full | threat-model | compliance | hardening`; a comparer or reader keyed on either value misses the other.

**Evidence.** SKILL.md:439 `"scope": "posture"`; references/output-templates.md:125 '**Scope:** [full | threat-model | compliance | hardening]'.

**Proposed fix.** Use one enum (`posture | threat-model | compliance | hardening`) in both places.

### skills/oc-security-auditor/SKILL.md:553 — Cited scenarios `mcp-enterprise-f500` / `mcp-enterprise-defense` exist nowhere in the repo
*category:* docs-drift · *known:* docs/audits/2026-07-04-portability-audit.md:497 and :630 (this skill's lines are cited inside :633)

**Problem.** The cross-domain/regulated section points the reader at broker/redactor rules 'described in scenarios' that are not a file, reference, or doc anywhere; the reader cannot follow the pointer.

**Evidence.** SKILL.md:552-554. `grep -rn 'mcp-enterprise-f500' --exclude-dir=node_modules --exclude-dir=.git .` returns only prose mentions in skills/*/SKILL.md and bundled references/checkpoint-protocol.md copies; no scenario file under docs/, specs/, or skills/*/references/.

**Proposed fix.** Replace the scenario names with a concrete pointer (oc-integrations-engineer references/pm-mcp-protocol.md broker section) or delete the sentence; fix the protocol source (:600-608 region) and `npm run sync-bundles` so the 33 copies follow.

### skills/oc-security-auditor/SKILL.md:566 — BAA/DPA failure mode keys on a fact no config records
*category:* executability

**Problem.** The rule 'BAA / DPA missing on the configured PM provider → refuse to write the body of compliance findings' cannot be evaluated: neither `.opchain/pm.yaml` nor `.opchain/compliance.yaml` documents a BAA/DPA field, so the session has no source for the condition.

**Evidence.** SKILL.md:566-567. `grep -rn 'BAA\|DPA' skills/oc-integrations-engineer/SKILL.md skills/oc-integrations-engineer/references/pm-mcp-protocol.md skills/oc-compliance-ops/references/compliance-profile.md` → none (only a trigger phrase in oc-compliance-ops:25).

**Proposed fix.** Add an optional `agreements: { baa: bool, dpa: bool }` to the pm.yaml schema (oc-integrations-engineer) or to `.opchain/compliance.yaml`, and reference it here; otherwise say 'ask the user once and record the answer in skill_state'.

### skills/oc-security-hardening/references/hardening-manifest.md:112 — Reference's 'established' id families omit `data.*`, which this repo's own manifest uses
*category:* docs-drift

**Problem.** The id-family list is presented as the established namespaces, but the skill's source repo already ships a control outside it.

**Evidence.** references/hardening-manifest.md:112-114 lists `headers.*`, `csp.*`, `api.*`, `platform.*`, `secrets.*`, `deps.*`, `detect.*`; .opchain/hardening.yaml:30 `id: data.lead-retention`.

**Proposed fix.** Add `data.*` (retention / data-handling controls) to the family list, or re-id the control under `platform.*`/`api.*`.

### skills/oc-security-hardening/SKILL.md:201 — 'Manual controls loud-skip, printed with the age of last_manual_check' — check-hardening.mjs prints the instructions only, never the age
*category:* tooling

**Problem.** Three documents promise the gate output lists manual controls with their last-check age (oc-security-hardening :201, oc-deploy-ops :211 'listed in the gate output with their age', hardening-manifest.md :69). The runner's manualCheck returns `{ skipped: true, detail: \`MANUAL: ${spec.instructions}\` }` — age appears only inside a failure message when `max_age_days` is exceeded (:192). Minor, but the deploy log a reviewer reads will not show what the skill says it shows.

**Evidence.** scripts/check-hardening.mjs:181-195 (manualCheck), :194 `return { skipped: true, detail: \`MANUAL: ${spec.instructions}\` };`. skills/oc-security-hardening/SKILL.md:201; skills/oc-deploy-ops/SKILL.md:211; skills/oc-security-hardening/references/hardening-manifest.md:69.

**Proposed fix.** In manualCheck, compute `ageDays` whenever `last_manual_check` parses and include it in the skipped detail (`MANAL … (last checked 12d ago)`); add a fixture to tests/hardening-gate.test.js asserting the age appears.

### skills/oc-security-hardening/SKILL.md:227 — `/oc-harden fix --import` is the skill's only flag and is defined nowhere
*category:* docs-drift

**Problem.** The unmanaged-control scan says `/oc-harden fix --import` backfills a manifest entry, but the Command Reference and frontmatter list `fix` with no flag, and no sentence says what `--import` takes (control id? class? all?) or how it differs from plain `fix`.

**Evidence.** SKILL.md:227; Command Reference :66-74 and frontmatter :10-17 have no `--import`; no other occurrence in SKILL.md or references/hardening-manifest.md.

**Proposed fix.** Add a menu line or a sentence under `/oc-harden fix` defining `--import <control-id|class>` (skips steps 1-2, records the existing control with `source_finding: "import: <origin>"`).

### skills/oc-security-hardening/SKILL.md:266 — oc-stack-forge 'Read by' table lacks the reciprocal row, and the artifact read is unnamed
*category:* cross-skill-contract

**Problem.** This skill and orchestrator.md both say it reads oc-stack-forge for platform idiom, but stack-forge's Read-by table does not list oc-security-hardening, and neither side says which stack-forge artifact (checkpoint vs `packs/<stack>/pack.yml`) carries the idiom.

**Evidence.** SKILL.md:266; skills/orchestrator.md:155; skills/oc-stack-forge/SKILL.md:483-489 'Read by' lists oc-app-architect, oc-code-auditor, oc-scale-ops, oc-deploy-ops, oc-docs-forge only.

**Proposed fix.** Add `| oc-security-hardening | Platform idiom for config-as-code controls |` to stack-forge's Read-by table; at SKILL.md:266 name the artifact (checkpoint `context_primer` or the pack path).

### skills/oc-signal-forge/SKILL.md:26 — Description says 'Hands rendered output to oc-dash-forge' — signal-forge explicitly does not render
*category:* docs-drift

**Problem.** The frontmatter description (:26) says the skill 'Hands rendered output to oc-dash-forge', contradicting :59-60 ('Signal Forge does not render charts'), the Boundaries row :250 (rendering owned by oc-dash-forge) and :274 ('render the validated signal'). What is handed over is the validated signal's read contract; dash-forge does the rendering. The description is synced verbatim into the orchestrator.md registry and the site catalog, so the wording propagates.

**Evidence.** skills/oc-signal-forge/SKILL.md:26 vs :59-60 and :250; skills/orchestrator.md:553 carries the same sentence in the auto-synced registry block (:546-558).

**Proposed fix.** Reword to 'Hands the validated signal (stable read contract) to oc-dash-forge for rendering.' and re-sync orchestrator.md §7.

### skills/oc-signal-forge/SKILL.md:33 — governance.last_reviewed predates the v1.9 estate-seam edits by two months
*category:* docs-drift

**Problem.** `last_reviewed: 2026-06-26` is the v1.7 scaffold date, but the body was materially edited for v1.9 (the 'Estate seam (v1.9)' paragraph :175-179, the oc-data-ops Boundaries row :255, the description :28-30) without restamping, so the governance block misreports when the text was last reviewed.

**Evidence.** `git log -S'Estate seam (v1.9)' -- skills/oc-signal-forge/SKILL.md` → 385e28e 2026-09-01 'release(v1.9.0)'; `git log -S'last_reviewed: 2026-06-26'` → edfe551 2026-06-26 (v1.7 scaffold). Skills introduced in v1.9 carry `last_reviewed: 2026-08-28` (e.g. skills/oc-data-ops/SKILL.md:35).

**Proposed fix.** Restamp `last_reviewed` on the next governance pass (or as part of fixing the HIGH items above).

### skills/oc-signal-forge/SKILL.md:128 — oc-signal-forge describes a numeric 5/10 verdict for a gate that emits four pass/fail axes
*category:* verdict-enum-drift · *surfaced by the executability lens*

**Problem.** The Evaluator is specified as a four-axis gate — 'graded on four axes' (:199-200), axis table at :202-207, 'FAIL -> Builder fixes -> re-verify, same loop until all four axes pass' (:215), and the checkpoint records `signals[].status` / `ground_truth_check` / a `★ verify-gate` row (:315-316, :348). Two other passages describe a 0-10 score instead: ':128 'a 5/10 verdict is a fine and expected outcome of an honest first pass' and :367-368 'A skeptical 5/10 first pass is fine; a confirmation-biased 10/10 is a failure of the gate.' There is no rubric in the skill that produces a number, and no checkpoint field to record one.

**Evidence.** skills/oc-signal-forge/SKILL.md:199-200 `The skeptical pass. The Evaluator's job is to **disprove the number**, graded on four axes:`; :215 `**FAIL → Builder fixes → re-verify**, same loop until all four axes pass.`; :128 `— a 5/10 verdict is a fine and expected outcome of an honest first pass.`; :367-368 `A skeptical 5/10 first pass is fine; a confirmation-biased 10/10 is a failure of the gate.`; :348 `| Evaluator verdict | \`signals[].status\`, \`ground_truth_check\`, \`last_verified\`, \`★ verify-gate\` |`

**Proposed fix.** Rewrite :128 and :367-368 in the four-axis vocabulary ('a first pass that fails two of four axes is expected'), or add a 0-10 rubric plus a `signals[].score` field and an `eval_scores` emission the way oc-code-auditor:405-411 does.

### skills/oc-signal-forge/SKILL.md:194 — 'covered in the middleware/transform bullet below' points upward and sampling correction is not covered anywhere
*category:* docs-drift

**Problem.** Lines 194-195 say 'idempotency keys, late-data windows, and sampling correction are covered in the middleware/transform bullet below.' The middleware/transform bullet is above (:185-187) and covers only idempotency and late-data; 'sampling correction' appears nowhere else in the file. This reads like a stub left when the planned harvester-patterns.md reference was removed.

**Evidence.** `grep -n -i 'sampling' skills/oc-signal-forge/SKILL.md` → :149 (schema 'sampling rate'), :194 (this sentence), :206 (Evaluator axis 'sampling-bias'), :358 (planned doc). The only middleware/transform bullet is :185-187 ('clean, dedupe, enrich, aggregate; with idempotency ... and late-data handling'), which precedes :194.

**Proposed fix.** Change 'below' to 'above' and either add a sampling-correction clause to the :185-187 bullet or drop it from :194 until references/harvester-patterns.md is written.

### skills/oc-stack-forge/references/feature-decomposition.md:1 — feature-decomposition.md is scoped to the Cloudflare stack while SKILL.md calls /oc-feature universal
*category:* docs-drift

**Problem.** The reference is titled 'Feature Decomposition for Cloudflare Stack' and :4-5 says 'read it when decomposing features that target a Cloudflare-native stack (Workers, D1, KV, Pages)' (with FastAPI substitutions at :205), but SKILL.md:411 says /oc-feature works 'regardless of platform' and :423 'This ordering is universal across stacks'; the Platform Matrix adds Django/Rails/Go/Rust targets the reference never covers.

**Evidence.** skills/oc-stack-forge/references/feature-decomposition.md:1,3-5,205; skills/oc-stack-forge/SKILL.md:411, :423, :501.

**Proposed fix.** Retitle the reference 'Feature Decomposition (Hono/D1 + FastAPI worked examples)' and add a one-paragraph mapping for the other matrix stacks, or scope SKILL.md:411/:423 honestly.

### skills/oc-stack-forge/references/typed-pipeline.md:87 — typed-pipeline.md mounts routes at '/oc-api' — a bulk rename artifact in sample code
*category:* docs-drift

**Problem.** `app.route("/oc-api", userRoutes);` is user-project sample code where `/api` was rewritten to `/oc-api`. The sibling references test and guard `/api/users` and `/api/*`, so a user copying the sample mounts routes at a path the auth middleware and tests do not cover.

**Evidence.** skills/oc-stack-forge/references/typed-pipeline.md:87; skills/oc-stack-forge/references/testing-patterns.md:99,101,227,232 use '/api/users'; skills/oc-stack-forge/references/error-handling.md:229 `app.use("/api/*", authMiddleware)`.

**Proposed fix.** Change :87 back to `app.route("/api", userRoutes);`.

### skills/oc-stack-forge/SKILL.md:293 — Repo-relative sibling paths (../oc-app-architect/..., ../oc-deploy-ops/SKILL.md, ../../src/lib/pack-dispatch.js) do not resolve after install
*category:* executability · *known:* docs/audits/2026-07-04-portability-audit.md:131, :141 (repo-relative sibling paths), :434 (pack-dispatch import unexecutable outside the repo)

**Problem.** :293 and :327-330 link `../oc-app-architect/references/scaffold-guide.md` and `../oc-deploy-ops/SKILL.md`; :358 imports `../../src/lib/pack-dispatch.js`. All resolve inside the monorepo (verified) but not from a user project or a per-skill zip, so the per-stack quick references and the mobile dispatcher are dead on user machines. Still open; already in the register.

**Evidence.** ls skills/oc-app-architect/references/scaffold-guide.md skills/oc-deploy-ops/SKILL.md src/lib/pack-dispatch.js → all exist in-repo; scripts/make-skills-zip.sh ships references/, packs/, TRYIT.md only (no src/lib).

**Proposed fix.** Point at the installed-skill location (~/.claude/skills/<id>/...) or inline the four scaffold/deploy summaries; ship pack-dispatch with the plugin or describe the mobile envelope as a manual template.

### skills/oc-stack-forge/SKILL.md:337 — Platform Matrix violates its own admission rule: Go/Fly.io and Rust/Shuttle rows have no /demo scenario
*category:* docs-drift

**Problem.** :334-341 says a stack earns a matrix row only with a scaffold recipe, an oc-deploy-ops section, AND 'At least one in-action /demo scenario', and 'Adding a stack without all three is a oc-stack-forge bug'. Django (django-render-shipped) and Rails (legacy-revive) have scenarios; the Go (:301) and Rust (:302) rows have none.

**Evidence.** grep -n 'title:' site/src/data/walkthroughs/*.ts → 'Django + Postgres + Render, shipped by opchain' (django-render-shipped.ts:15), 'Legacy Rails app, one new feature' (legacy-revive.ts:10); no Go/Fly.io or Rust/Shuttle title; grep -il shuttle site/src/data/walkthroughs/*.ts → only django-render-shipped.ts (passing mention).

**Proposed fix.** Either add Go and Rust walkthroughs or soften rule 2 to 'scaffold recipe + deploy section required; a /demo scenario is the goal'.

### skills/oc-stack-forge/SKILL.md:346 — Stale 'landing in PR 6 / PR 6.5 / PR 3' text — all four mobile packs have shipped
*category:* docs-drift

**Problem.** :347-348 'landing in PRs 6 + 6.5 of the v1.4 sequence', :385 'landing in PR 6', :398-405 'Why this lands in PR 3, ahead of the first real mobile pack ... PR 6 (ADEV-336) ships the first mobile pack' describe future work that landed before v1.5 (the live checkpoint's own progress_table has pr-6 and pr-6-5 rows).

**Evidence.** grep -l 'kind: mobile' skills/oc-stack-forge/packs/*/pack.yml → flutter, ios-swiftui, kotlin-android, react-native-expo; ls skills/oc-stack-forge/packs/*/mobile.md → same four; .checkpoints/oc-stack-forge.checkpoint.json progress_table ids include 'pr-6', 'pr-6-5'.

**Proposed fix.** Rewrite :347-348 and :385 in the present tense (list the four packs), and delete or fold :398-405 into a one-line history note.

### skills/oc-stack-forge/SKILL.md:384 — oc-stack-forge mobile-dispatch section still speaks in future tense about a PR that landed ('landing in PR 6', 'Why this lands in PR 3')
*category:* docs-drift

**Problem.** Line 384-385 says the checklist content lives in `skills/oc-stack-forge/packs/ios-swiftui/mobile.md`, 'landing in PR 6', and the :398 heading 'Why this lands in PR 3, ahead of the first real mobile pack' with body 'PR 6 (ADEV-336) ships the first mobile pack'. packs/ios-swiftui/mobile.md exists and the dispatcher test tests/pack-dispatch.test.js exists, so the sprint-planning narrative is stale shipped-product text (and leaks an internal ticket id).

**Evidence.** skills/oc-stack-forge/SKILL.md:384-385 "(e.g. `skills/oc-stack-forge/packs/ios-swiftui/mobile.md`, landing in PR 6)"; :398 "### Why this lands in PR 3, ahead of the first real mobile pack"; :400 "PR 6 (ADEV-336) ships the first mobile pack". `ls skills/oc-stack-forge/packs/ios-swiftui/mobile.md` → exists; `ls tests/pack-dispatch.test.js` → exists.

**Proposed fix.** Rewrite :384-405 in present tense (the pack and dispatcher exist; tests/pack-dispatch.test.js locks the dispatcher) and drop the PR/ticket narrative.

### skills/oc-ux-engineer/references/ux-audit-checklist.md:3 — Bundled references/ux-audit-checklist.md is never cited and belongs to `/oc-audit ux`
*category:* docs-drift

**Problem.** SKILL.md cites only `references/orchestrator.md`; nothing points at `references/ux-audit-checklist.md`. The file's own header says it is 'Detailed checks for the `/oc-audit ux` mode' and refers to 'The SKILL.md' giving 'automated check commands' — that is oc-code-auditor's SKILL.md (which cites it at :165). The copy here is byte-identical to oc-code-auditor's and is dead weight in this skill's zip, or an intended Evaluator aid that the text never tells the model to read.

**Evidence.** `grep -n "references/" skills/oc-ux-engineer/SKILL.md` -> only :29 orchestrator.md; `diff skills/oc-ux-engineer/references/ux-audit-checklist.md skills/oc-code-auditor/references/ux-audit-checklist.md` -> IDENTICAL; checklist:3 `Detailed checks for the \`/oc-audit ux\` mode`

**Proposed fix.** Either cite it from the Design Evaluator step (Step 3, ~line 309) and fix its header to name this skill, or remove the copy from oc-ux-engineer/references/.

### skills/oc-ux-engineer/SKILL.md:7 — `phases: [plan]` disagrees with the README catalog row and the skill's own build loop
*category:* docs-drift

**Problem.** Frontmatter declares `phases: [plan]`, but skills/README.md lists oc-ux-engineer as `plan+build` (alongside oc-app-architect, which declares `[plan, build]`). The body runs a Design Build Loop (258) and attaches to oc-app-architect Phase 6 *build* sprints (540-552), so one of the two surfaces is wrong.

**Evidence.** SKILL.md:7 `phases: [plan]`; skills/README.md:62 `| oc-ux-engineer            | plan+build  | Tri-design harness |`; skills/oc-app-architect/SKILL.md:7 `phases: [plan, build]`

**Proposed fix.** Pick one: set `phases: [plan, build]` here, or change the README row to `plan`.

### skills/oc-ux-engineer/SKILL.md:43 — Command-reference header names `/oc-ux-engineer`, which is not a command
*category:* routing

**Problem.** `## /oc-ux-engineer — Command Reference` presents `/oc-ux-engineer` as the entry verb, but frontmatter commands are all `/oc-uxe ...` and the flag registry gates `/oc-uxe` only. oc-dash-forge repeats the non-verb ('invoked by `/oc-ux-engineer`', 'called from `/oc-ux-engineer`'), so a session may type a slash command that no gate or plugin recognises. Most siblings use their real base verb in this header (`/oc-audit`, `/oc-data-forge`).

**Evidence.** SKILL.md:10-20 commands (all `/oc-uxe*`); src/lib/flags/registry.js:292 `"/oc-uxe"`; skills/oc-dash-forge/SKILL.md:104 `invoked by \`/oc-ux-engineer\``, :200 `called from \`/oc-ux-engineer\``

**Proposed fix.** Change the header to `## /oc-uxe — Command Reference` and have oc-dash-forge say 'invoked by oc-ux-engineer (`/oc-uxe dash`)'.

### skills/oc-ux-engineer/SKILL.md:540 — Section heading uses the retired 'Tri-Dev' name
*category:* docs-drift

**Problem.** `## Tri-Dev Plugin Mode (/oc-uxe attach)` names tri-dev, which orchestrator.md declares retired ('Its build harness lives inside oc-app-architect Phase 6'). The body of the section correctly says oc-app-architect Phase 6 (546), and the intro (40-41) and command block (60-62) call it the APP-ARCHITECT PLUGIN, so the heading is the only stale token.

**Evidence.** skills/orchestrator.md:708 `**Tri-dev is retired.** Its build harness lives inside oc-app-architect Phase 6.`; SKILL.md:60 `APP-ARCHITECT PLUGIN`; :540 `## Tri-Dev Plugin Mode`

**Proposed fix.** Rename the heading to `## App-Architect Plugin Mode (/oc-uxe attach)`.

### skills/oc-ux-engineer/SKILL.md:581 — oc-ux-engineer documents an --force flag on /oc-uxe attach that appears in no command reference
*category:* undeclared-flag · *surfaced by the executability lens*

**Problem.** Sprint Detection offers 'Override: `/oc-uxe attach --force` or `/oc-uxe detach`' (:581). The Command Reference at :58-59 lists `/oc-uxe attach` and `/oc-uxe detach` with no flag, the frontmatter `commands:` list carries no flag, and nothing else in the skill defines what --force overrides (presumably the keyword auto-detection at :579-580). A session asked to force-attach has no defined behaviour to execute.

**Evidence.** skills/oc-ux-engineer/SKILL.md:581 `- Override: \`/oc-uxe attach --force\` or \`/oc-uxe detach\``; :58-59 `  /oc-uxe attach        Activate Design Evaluator for current oc-app-architect Phase 6 build session` / `  /oc-uxe detach        Deactivate Design Evaluator (code-only evaluation)`.

**Proposed fix.** Add `--force` to the Command Reference entry at :58 with a one-line definition ('attach even when the sprint contract has no UI keywords'), or drop it from :581.

### skills/orchestrator.md:76 — §2 ASCII map: Phase 3 and Phase 6 sub-bullets for oc-ux-engineer are swapped
*category:* orchestrator

**Problem.** Under 'Phase 3: design pipeline' the child line reads 'the build loop invokes oc-ux-engineer on UI sprints'; under 'Phase 6: build loop (Generator → Evaluator)' the child reads 'the design phase invokes oc-ux-engineer on UI sprints'. Each phase's bullet describes the other phase. The Upstream row (:137) and §3 (:203, 'oc-app-architect (Phase 6) → oc-ux-engineer … as a build-loop step') put the invocation in Phase 6.

**Evidence.** orchestrator.md:76-80: `├── Phase 3: design pipeline` / `│     ├── the build loop invokes oc-ux-engineer on UI sprints (when routed through it)` / … / `├── Phase 6: build loop (Generator → Evaluator)` / `│     └── the design phase invokes oc-ux-engineer on UI sprints (when routed through it)`.

**Proposed fix.** Swap the two child lines (Phase 3: 'the design phase invokes oc-ux-engineer…', Phase 6: 'the build loop invokes oc-ux-engineer…').

### skills/orchestrator.md:77 — The shared pipeline map's Phase 3 and Phase 6 oc-ux-engineer bullets are transposed
*category:* self-contradiction · *surfaced by the executability lens*

**Problem.** In the canonical Pipeline Map, the sub-bullet under 'Phase 3: design pipeline' reads 'the build loop invokes oc-ux-engineer on UI sprints' (:77) while the sub-bullet under 'Phase 6: build loop (Generator -> Evaluator)' reads 'the design phase invokes oc-ux-engineer on UI sprints' (:80). The two descriptions are swapped: Phase 3 is the design phase (oc-app-architect:267 `## Phase 3: Design Pipeline (/oc-design)`) and Phase 6 is the build loop (oc-app-architect:392). Every skill reads this file on activation.

**Evidence.** skills/orchestrator.md:76-80 `├── Phase 3: design pipeline` / `│     ├── the build loop invokes oc-ux-engineer on UI sprints (when routed through it)` / `├── Phase 6: build loop (Generator → Evaluator)` / `│     └── the design phase invokes oc-ux-engineer on UI sprints (when routed through it)`. skills/oc-app-architect/SKILL.md:267 `## Phase 3: Design Pipeline (\`/oc-design\`)`; :392 `## Phase 6: Build Loop (\`/oc-build\`)`.

**Proposed fix.** Swap the two sub-bullet texts at :77 and :80.


## Refuted on verification (43) — recorded so they are not re-raised

- **.checkpoints/oc-bug-check.checkpoint.json:35** — Live checkpoint writes `eval_scores+` (object) instead of the `eval_scores` array, and omits every documented skill_state field except last_run  
  _source-truth: REFUTED — the load-bearing fact is false of the current tree. `grep -n 'eval_scores' .checkpoints/oc-bug-check.checkpoint.json` returns exactly one hit, line 33: `"eval_scores": [` — a proper wire-1.1 ARRAY whose single  · known-or-deferred: ALREADY RESOLVED in the tree. .checkpoints/oc-bug-check.checkpoint.json now carries a well-formed wire-1.1 array at line 33 ('"eval_scores": [' with rubric/score/max/at/dimensions, matching skills/oc-bug-check/SKILL.md:5 · impact: Stale: the defect no longer exists in the tree. .checkpoints/oc-bug-check.checkpoint.json now carries a correct wire-1.1 array at line 33 (`"eval_scores": [` with rubric/score/max/at/dimensions, :34-45); there is no `eva_
- **plugins/opchain/commands/oc-commit.md:7** — commands/oc-commit.md promises 'the commit gate will block git commit otherwise' but the gate is opt-in and silent in any repo without .checkpoints/ or .opchain/  
  _known-or-deferred: The facts hold (pre-commit-gate.cjs:170-179 arms only on OPCHAIN_GATE=1 or an existing .checkpoints/ or .opchain/), but this is intentional with a stated reason documented immediately: plugins/opchain/README.md:55-57 "Op_
- **scripts/checkpoint.mjs:851** — `checkpoint update` leaves protocol_version at "1.0" on existing files, contradicting 'new writes stamp 1.1'  
  _known-or-deferred: The mechanics are right (writeValidated at :850-852 restamps only updated_at; SCHEMA_VERSION is applied only in scaffoldCheckpoint at :836), but the division of labour is stated explicitly beside the cited text: skills/o_
- **skills/oc-claude-api/SKILL.md:332** — `skill_state.cost` shadows the wire-1.1 top-level `cost` field owned by oc-cost-ops, and the ceilings it holds are unreadable by oc-cost-ops  
  _known-or-deferred: Refuted — intentional and permitted by the protocol it is accused of shadowing. skills/oc-checkpoint-protocol/SKILL.md:725 '`skill_state` is an opaque bag', :376 'Never read `skill_state` — it's private to the owning ski_
- **skills/oc-prompt-ops/SKILL.md:10** — Frontmatter commands lists 3 verbs; the body documents 8 /oc-prompt subcommands, so MCP/skills.json never advertise regress, drift, baseline, goldset, judge  
  _known-or-deferred: Facts check out (frontmatter :10-13 lists three verbs, the body :68-82 documents eight, mcp-catalog.json carries the same three) but this is the repo-wide intentional convention, not oc-prompt-ops drift: oc-code-auditor _
- **skills/oc-qa-ops/SKILL.md:140** — Load-plan handoff names /oc-scale verbs absent from oc-scale-ops frontmatter  
  _known-or-deferred: Line facts hold (skills/oc-qa-ops/SKILL.md:140 cites `/oc-scale loadtest` and `/oc-scale budget`; skills/oc-scale-ops/SKILL.md:11-12 declares only /oc-scale and /oc-scale audit; the verbs are body headings at :133 and :1_
- **skills/oc-qa-ops/SKILL.md:104** — oc-qa-ops states as fact that 'oc-bug-check's test check reads' .opchain/qa.yaml budgets — nothing mechanical reads qa.yaml, and the live manifest has no coverage block to read  
  _known-or-deferred: The cited text is not wrong today. Every opchain skill gate is agent-executed prose by design, and oc-bug-check/SKILL.md:174-184 does contain the explicit instruction to read `.opchain/qa.yaml` budgets when present (with_
- **skills/oc-telemetry-ops/references/aggregation.md:57** — `eval_score_trend` has two contradictory sources: this skill says the never-written `events` table, oc-bug-check/oc-code-auditor say their checkpoint `eval_scores`  
  _known-or-deferred: Refuted as deferred, and the 'contradiction' does not hold as stated. The `events(id, run_id, kind, label, score, at)` table IS defined in skills/oc-telemetry-ops/references/local-metering.md:38-46 and created by scripts_
- **skills/oc-data-ops/SKILL.md:243** — Chains-to table lists oc-dash-forge and oc-migration-ops but no phase step invokes either  
  _known-or-deferred: False premise. The 'invoke actively' semantics come from a different table (skills/orchestrator.md:130 Upstream/Downstream Map); oc-data-ops/SKILL.md:243 is headed only '| Chains to | Why |' with no invocation claim, and_
- **skills/oc-migration-ops/SKILL.md:97** — Pipeline box summary contradicts the Cross-Skill tables (reads 4 vs 7 skills; chains to 2 vs 7)  
  _known-or-deferred: Abbreviated-summary convention, not contradiction. skills/oc-migration-ops/SKILL.md:96-102 is an ASCII architecture box that names the two headline chains and the detail table at :552-559 is the full list; the orchestrat_
- **skills/oc-rag-forge/SKILL.md:10** — Frontmatter lists 3 of the 12 commands the body documents  
  _known-or-deferred: Intentional featured-subset convention. scripts/gen-skills-catalog.mjs:88-89 only requires `commands` to be an array — nothing anywhere requires exhaustiveness — and the three tri-agent forge skills are uniform: oc-rag-f_
- **.checkpoints/oc-monitoring-ops.checkpoint.json:77** — Live checkpoint skill_state and progress_table do not match the shapes this skill documents, so /oc-monitor status cannot render as specified  
  _known-or-deferred: Intentional by protocol. skills/oc-checkpoint-protocol/SKILL.md:725-726 states 'Private state stays private. skill_state is an opaque bag — other skills don't read it, and the protocol doesn't define its contents', and :_
- **.checkpoints/oc-ux-engineer.checkpoint.json:1** — Live checkpoint skill_state carries none of the documented keys  
  _known-or-deferred: Same protocol rationale as the monitoring case: skills/oc-checkpoint-protocol/SKILL.md:725-726 declares skill_state an opaque bag whose contents the protocol deliberately does not define, and oc-ux-engineer/SKILL.md:629-_
- **plugins/opchain/commands/oc-harden.md:5** — Plugin `/oc-harden` runs `baseline` while SKILL.md says bare `/oc-harden` shows the menu  
  _known-or-deferred: Intentional and consistent: plugins/opchain/commands/oc-harden.md:5 dispatches an explicit verb, exactly as oc-comply.md (scope), oc-qa.md (pyramid) and oc-repo.md (audit) do, and skills/orchestrator.md:293 routes 'Harde_
- **site/src/content.config.ts:54** — `tryable` is a vestigial frontmatter field carried by all 33 skills for a feature removed from the site; no schema requires or consumes it  
  _known-or-deferred: Deliberate with a recorded decision: docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:137 states '**`tryable` is vestigial** — site/src/content.config.ts:54 keeps it on the schema for backward compatibility only_
- **skills/oc-agent-forge/SKILL.md:474** — Only one checkpoint phase name (`planned`) is ever defined; build/eval/regress phases and steps are unnamed  
  _known-or-deferred: `phase` is explicitly free-form by contract: skills/oc-checkpoint-protocol/SKILL.md:99 `"phase": "build-loop", // Current phase name (skill-defined)`. The two-column When-to-Write table is the catalog pattern, not an oc-_
- **skills/oc-api-dev/SKILL.md:9** — tryable: true refers to the removed Try-It chat surface  
  _known-or-deferred: Same recorded decision as F-304: docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:137 declares `tryable` vestigial but deliberately retained for catalog consistency ('carries no product claim either way'), and s_
- **skills/oc-app-architect/SKILL.md:472** — Sibling checkpoints are read for content that only lives in their private skill_state  
  _known-or-deferred: The premise is not established. skills/oc-checkpoint-protocol/SKILL.md:374-377 explicitly permits a sibling skill to read `header`, `progress`, `progress_table`, `context_primer` and `blockers` and only forbids `skill_st_
- **skills/oc-data-ops/SKILL.md:123** — Builder invokes `/oc-data-ops verify` 'scoped to the staging contracts' but verify has no scoping argument  
  _known-or-deferred: SKILL.md:123-125 reads '- Ingestion first — the Builder invokes `/oc-data-ops verify` scoped to the staging contracts before transforms begin (the Verifier stays the sole grader).' Read in context this is a statement of _
- **skills/oc-data-ops/SKILL.md:69** — `/checkpoint` listed in the menu is not in frontmatter commands and no plugin command implements it  
  _known-or-deferred: Self-refuting as written: the finding itself states this is the checkpoint protocol's shared verb handled in prose and is catalog-wide (oc-api-dev, oc-app-architect, oc-claude-api, oc-agent-forge, oc-code-auditor, oc-com_
- **skills/oc-docs-forge/SKILL.md:9** — tryable: true advertises a Try-It surface that no longer exists and this skill ships no TRYIT.md  
  _known-or-deferred: Intentional with a stated reason, and the text is not wrong today: site/src/content.config.ts:54-57 explicitly records the decision to keep `tryable` on the schema as optional dead metadata after the Try-It removal ('no _
- **skills/oc-docs-forge/SKILL.md:58** — Body command menu lists /checkpoint, which is absent from frontmatter commands:  
  _known-or-deferred: Self-refuting and by design: the finding itself concludes 'it is by design rather than a docs-forge defect'. /checkpoint is a protocol-wide utility (oc-checkpoint-protocol/SKILL.md defines it as one every adopting skill _
- **skills/oc-git-ops/SKILL.md:456** — 'the project-governance skill' is not an opchain skill id  
  _known-or-deferred: Not wrong today: SKILL.md:455-456 only attributes the possible origin of a GOVERNANCE.md file ('generated by oc-app-architect or the project-governance skill') inside a conditional 'if a GOVERNANCE.md file exists' — it n_
- **skills/oc-migration-ops/references/migration-playbooks.md:735** — Retired skill name `tri-dev` used in the rename/merge example  
  _known-or-deferred: Refuted as intentional and not wrong today. skills/oc-migration-ops/references/migration-playbooks.md:733-737 is the 'Step Template: Skill Rename / Merge' — a template whose worked example is by nature a skill that no lo_
- **skills/oc-qa-ops/SKILL.md:9** — `tryable: true` advertises a demo mode nothing serves  
  _known-or-deferred: Deliberate and recorded. The v2.0 plan §Q1 (docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:137) states 'tryable is vestigial — site/src/content.config.ts:54 keeps it on the schema for backward compatibility on_
- **skills/oc-rag-forge/SKILL.md:178** — Designer's 'Retrieval Design doc' has no path, and the two descriptions of where it lands disagree with oc-app-architect  
  _known-or-deferred: The claimed contradiction does not hold. skills/oc-rag-forge/SKILL.md:178 and :244-246 define an approval gate, not a file artifact; SKILL.md:425 says RAG Forge 'returns the retrieval design into the architecture spec', _
- **skills/oc-repo-ops/SKILL.md:9** — tryable: true is a dead frontmatter field for a removed feature  
  _known-or-deferred: Same recorded decision as F-383 and a duplicate of it. docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:137 explicitly rules tryable vestigial and states it 'carries no product claim either way', and site/src/co_
- **skills/oc-scale-ops/SKILL.md:53** — /checkpoint listed as a utility command but no such command exists (catalog-wide pattern)  
  _known-or-deferred: Refuted as intentional with a stated reason: /checkpoint is a shared protocol-level utility command, not a plugin slash-command file. skills/oc-checkpoint-protocol/SKILL.md:496 '## /checkpoint Command' / :498 'Any skill _
- **skills/oc-ux-engineer/TRYIT.md:1** — TRYIT.md describes the removed Try-It chat  
  _known-or-deferred: Refuted as an explicitly recorded, intentional state. docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:137 states verbatim that '**`tryable` is vestigial** — site/src/content.config.ts:54 keeps it on the schema _
- **.checkpoints/oc-cost-ops.checkpoint.json:12** — No checkpoint anywhere sets cost.budget_usd, so the budget gate oc-cost-ops is built around has never been armed  
  _known-or-deferred: Refuted as a defect: the cited text is not wrong today. skills/oc-cost-ops/SKILL.md:46 says "every checkpoint **can** carry a budget that gates when tripped" and :74 lists /oc-cost budget as the verb that sets one — cond_
- **.checkpoints/oc-cost-ops.checkpoint.json:15** — The only live cost attribution assigns 100% of spend to a bucket named "interactive", which is not a skill phase  
  _known-or-deferred: Refuted: by_phase is specified as a free-form name->number map (skills/oc-cost-ops/SKILL.md:125 and oc-checkpoint-protocol/SKILL.md:645 "optional, name -> >= 0"), so "interactive" at .checkpoints/oc-cost-ops.checkpoint.j_
- **.checkpoints/oc-bug-check.checkpoint.json:5** — oc-bug-check.project_dir points at a disposable audit worktree, unlike every other checkpoint  
  _known-or-deferred: Refuted as intentional-by-design. .checkpoints/oc-bug-check.checkpoint.json is deliberately gitignored (.gitignore:91, with the rationale at :80-90 — its run telemetry rewrites on every pre-commit gate run and generated _
- **.checkpoints/oc-monitoring-ops.checkpoint.json:85** — oc-monitoring-ops.last_health_check still reports version 244bf13 from 2026-09-02 while the same checkpoint says production serves 78567c2  
  _known-or-deferred: Refuted: the fields are self-dating historical observation records, not current-state claims, and the checkpoint states current state unambiguously elsewhere. Verified .checkpoints/oc-monitoring-ops.checkpoint.json:85-95_
- **.checkpoints/oc-security-hardening.checkpoint.json:44** — Three v1.9 assurance checkpoints are status:complete asserting live verification at 244bf13, which production has not served since 2026-09-05  
  _known-or-deferred: Refuted: each cited record explicitly scopes itself to the SHA and release it was taken at, so none of them asserts anything false today. .checkpoints/oc-security-hardening.checkpoint.json:8 step 'v1.9-live-replay-pass' _
- **.checkpoints/oc-app-architect.checkpoint.json:346** — oc-app-architect.v20_release.ground_truth is a 2026-09-03 snapshot the 2026-09-08 rewrite did not refresh; two of its rows were already false when saved  
  _known-or-deferred: Refuted: the block is an explicitly dated planning snapshot, not a claim about today. Verified .checkpoints/oc-app-architect.checkpoint.json:345 `"planned_at": "2026-09-03T15:31:51.000Z"` immediately above :346 `"ground__
- **skills/oc-code-auditor/SKILL.md:457** — oc-code-auditor's findings report has no file path and no checkpoint carrier, yet three consumers are told to read it  
  _known-or-deferred: REFUTED as explicitly deferred by a recorded decision. docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:614 (L3 reciprocal-edit table) assigns to Sprint 3: 'oc-code-auditor | durable `docs/audits/<date>-<scope>._
- **skills/oc-scale-ops/SKILL.md:14** — oc-scale-ops claims the bare phrase "load test" with no sibling carve-out; the qa-ops/scale-ops pin is the only one asserted in a single direction  
  _known-or-deferred: Facts check out (skills/oc-scale-ops/SKILL.md:13-16 quotes "load test" with no sibling named; skills/oc-qa-ops/SKILL.md:26 quotes "plan a load test" and :29-30 carves out to oc-scale-ops; tests/routing-disambiguation.tes_
- **skills/orchestrator.md:274** — Fourteen of the example phrases in orchestrator §4 are claimed verbatim by no skill description, so the router table and the trigger surface are maintained independently  
  _known-or-deferred: The drift is real but the column is already declared illustrative on the cited line: skills/orchestrator.md:274 is the header `| User says (examples) | Route to | Phase |` — "(examples)" states exactly what the finding's_
- **docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:1189** — `claude/v2-0-staging-mockup` already contains the whole v2.0 product half — the two new skill dirs and a 35× lockstep bump to 2.0.0 — contradicting the plan's "Nothing built yet"  
  _known-or-deferred: The cited anchor is misread. docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:1189 sits at the end of the plan-revision/verification bullet list (:1165-1189, 'Verification of the merged findings was cut short by_
- **skills/oc-hindsight/SKILL.md:3** — `claude/demo-rebuild-2-0` is pushed to origin carrying oc-hindsight/oc-evolve stamped `version: 1.9.0` — merging it trips `check-release-tag` countDrift and freezes production deploys  
  _known-or-deferred: The mechanic is already documented as an explicit, intentional constraint. Plan :62-73 (sequencing constraint 1) spells out exactly this case by name: 'The moment `skills/oc-hindsight/` and `skills/oc-evolve/` exist on `_
- **docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:35** — Plan's test floor is 579 vitest tests; the tree is at 607, so every sprint definition-of-done is under-set by 28  
  _known-or-deferred: Refuted as stated. The plan's :35 row does not claim a current count — §0's header at :26 labels the whole table 'Ground truth at planning time (2026-09-03, all resolved fresh)' and the row itself reads '579 vitest + 13 _
- **scripts/check-release-surfaces.mjs:117** — `check-release-surfaces.mjs` probes eleven surfaces while its own comment says eight and its failure hint says L1–L10  
  _known-or-deferred: Refuted as stated. The failure hint at scripts/check-release-surfaces.mjs:160 points at 'live-claim surfaces L1-L10', and the referenced doc skills/oc-release-ops/references/site-release-surfaces.md numbers exactly L1 th_
- **docs/plans/2026-09-03-v2.0-self-improving-release-plan.md:40** — `codex/v2-workflow-skills` touches no `skills/` in the three-dot diff, but is pre-v1.9 and would delete four shipped skills and the release-tag gate if merged  
  _known-or-deferred: The stated risk is mechanically false. The finding's own evidence refutes it: `git diff --stat main...codex/v2-workflow-skills` is 6 files (3 checkpoints, docs/releases/2.0-plan.md, package.json -1 line, site/src/pages/c_