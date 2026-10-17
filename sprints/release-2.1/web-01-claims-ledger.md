# WEB-01 claims ledger: router and enforcement claims on the held site branch

**Date:** 2026-10-17 · **Branch:** `claude/track-s-site` (held for the 2.1.0 cut, REL-02) · **Base:** `origin/main` @ `90e61149`
**For:** the JEV session (Track E), which checks every router claim before the cut (Track S §4; sprint plan § Track E, E3).
**Review:** the JEV session reviewed the router and enforcement copy against `main` on 2026-10-17 and approved it with four required edits (disclosure summary, squash-merge trailer claim, "billed", prompt provenance) and one nit (live-mode wording on `/install`). All are applied; the rows below reflect them, and §5 is closed.
**Shape:** Track E's `docs/plans/2026-10-09-v2.1-site-update.md` §D, re-pointed at `main`. Every source below is a file on `origin/main` @ `90e61149`; line numbers are as read on 2026-10-17. E0 (#608, `591e6329`) put the product half on `main`, so no claim cites a worktree any more.

Abbreviations: **AUD** = `docs/audits/2026-10-08-opchain-effectiveness-audit.md`. **TERMS** = the router release terms, `sprints/release-2.1/ow-family-sprint-plan.md` § Track E (lines 247–257). **RP** = `plugins/opchain/hooks/route-prompt.cjs`. **RD** = `plugins/opchain/hooks/lib/route-dispatch.cjs`. **IGD** = `scripts/install-git-drivers.mjs` (the plugin ships the same file under `plugins/opchain/scripts/`). **VC** = `scripts/verify-candidate.mjs`. **ORCH** = `skills/orchestrator.md`.

Site files (all on the branch): `install.astro`, `privacy.astro`, `security.astro`, `architecture.astro`, `glossary.astro`, `for-agencies.astro` under `site/src/pages/`; `EnforcementMap.astro`, `MobileArchitecture.astro`, `RouterLabel.astro` under `site/src/components/`; `site/src/data/router-status.ts`; the draft post `site/src/blog/2026-10-09-0-of-229-what-our-skills-did-when-nobody-checked.md` (**blog**).

## 1. Router claims

Every block of router copy carries `<RouterLabel />`, whose text is `ROUTER_LABEL` in `router-status.ts`: "experimental preview, shadow only, verdict pending" (decision D7 as given 2026-10-17). `site/tests/e2e/router-label.spec.ts` fails a router block without it.

| # | Claim | Where | Source on `main` |
|---|---|---|---|
| R1 | Label: "experimental preview, shadow only, verdict pending" | every router block (install `#router`, privacy `#router`, security posture row + `#router` + "Leaves the machine", architecture Jev rail desktop + mobile, enforcement-map footer, glossary "Skill router" + "Shadow mode", blog) | TERMS 1 ("experimental preview"); Track S D7 (`sprints/release-2.1/track-s-site-surfaces.md` §6) for "shadow only, verdict pending"; `skills/CHANGELOG.md:77–79` (`### Experimental`, "experimental preview") |
| R2 | With `TYPESAFE_API_KEY` set, the hook sends the redacted prompt and a repo summary to `api.typesafe.ai`. The summary covers the branch name, ahead/behind, dirty count, open PR, enrollment, and the active checkpoint's skill, phase and first next action (up to 200 characters). Credential-shaped text is redacted; names in the branch or that next action are sent as written | install, privacy, security, blog (word for word); glossary, mobile caption ("and the active checkpoint's next action"); architecture rail tooltip | TERMS 3; RD:69 (`DEFAULT_ENDPOINT`); RP:38–47 (state = request + repo), RP:363–458 (`aheadBehind`, `dirtyCount`, `openPr`, `enrolled`, `activeCheckpoint`); RP:423–446 (`activeCheckpoint`: skill, phase, first `next_actions` entry sliced to 200 characters, RP:439); RD:878 (`redactDeep(rawRepoState)`) with RD:468–517 (only credential-shaped patterns and `*_KEY`-style assignments are replaced, so other text in the branch name or next action passes as written); `plugins/opchain/README.md:193–196` |
| R3 | The previous prompt and the end of the last assistant message are sent only with `OPCHAIN_ROUTE_CONTEXT=1` | install, privacy, security, blog, glossary, mobile caption | TERMS 3; RP:38–45, RP:290–296; README:196–198 |
| R4 | Nothing is sent without a key, for slash commands, outside opchain projects, or for a typed `/oc-*` mention | install, privacy, security, blog | TERMS 3; RP:199 (no key), RP:281 (`/` and `<`), RP:323–337 (`isOpchainProject`), RD:845 (`explicitMention`, no model call); README:202–203 (negated, asked about, or part of a path does not count) |
| R5 | Decisions are logged locally to `$TMPDIR/opchain-route-log.jsonl` | install, privacy, security, blog | TERMS 3; RP:73 (`OPCHAIN_ROUTE_LOG` default); README:206 |
| R6 | Unsetting the key or setting `OPCHAIN_ROUTE=0` turns it off | install, privacy, security, blog, glossary | TERMS 3; RP:199–200 |
| R7 | Redaction before send, log or cache: private keys, provider keys and tokens (Anthropic, OpenAI, GitHub, Slack, AWS), JWTs, bearer headers, long hex, `*_KEY` / `*_TOKEN` / `*_SECRET` / `*_PASSWORD` assignments; redactor failure means nothing is sent | install, security | RD:468–517 (`SECRET_PATTERNS`, `SECRET_NAME`, `redactSecrets`); RP:38–45 ("Both pass through redactSecrets before anything else") |
| R8 | Live mode (`OPCHAIN_ROUTE_MODE=live`) is unsupported until the go/no-go records a GO; 2.1.0 ships shadow as the default either way | install, privacy, security, architecture (rail lane, anchor, aria-labels, mobile), glossary, blog | TERMS 4; RP:131 (shadow unless `=live`); `skills/CHANGELOG.md:93–96`; README:185–186; `docs/runbooks/skill-router-eval.md` §6 (go/no-go) |
| R9 | Shadow mode sends the same request and adds nothing to the conversation | install, privacy, security, architecture, glossary, blog | RP:13–16 ("routes and logs but injects nothing"); README:181–183 |
| R10 | Opt-in: get a key from TypeSafe; calls are made with your key, under your TypeSafe account and its terms; set `TYPESAFE_API_KEY`; read the shadow log | install `#router` (steps + copy block), glossary, blog | TERMS 5 ("Calls go to the user's own TypeSafe account"); RD:151–160 (`httpTransport` sends with the caller's `apiKey`). No billing claim is made: nothing on `main` establishes how TypeSafe bills |
| R11 | Up to two requests per routed prompt; decisions cached on your machine for 24 hours (`$TMPDIR/opchain-route-cache/`) | install, security, glossary (cache), architecture anchor | TERMS 5; RD:261, RD:290 (`buildRequest1`, `buildRequest2`); RD:90 (`DEFAULT_CACHE_TTL_MS`); RP:74 (cache dir default) |
| R12 | Claude Code's `$TMPDIR` can differ from your shell's; `OPCHAIN_ROUTE_LOG` pins the path | install | `docs/runbooks/skill-router-eval.md` §6 ("the hook's `$TMPDIR` is Claude Code's, which may differ from your shell's") |
| R13 | Offline evaluation only: 574 labelled past prompts, precision 0.92 oc-git-ops / 0.88 oc-deploy-ops, named as offline; it set the shipped thresholds | install, architecture rail, mobile caption (count only), blog | TERMS 2; `scripts/route-spec.overrides.json:256` (the 0.92 / 0.88 figures and "574 prompts"); RD:71–77 (thresholds tuned on that eval); `skills/CHANGELOG.md:92` ("offline (574 labelled past prompts)") |
| R14 | 574 labelled prompts from past Claude Code sessions on one machine, in opchain and a consumer repository, each labelled by what the session did next (an offline evaluation, not a measurement of use) | install, blog | `docs/runbooks/skill-router-eval.md:19–20` (the local Claude Code transcript corpus; each prompt labelled by what the session did next), `:42–44` (main-session files from the opchain and consumer-repository project dirs); `scripts/route-spec.overrides.json:256` (574) |
| R15 | Whether it changes skill use is not measured yet | install, architecture rail footer, mobile caption, glossary ("only evaluation so far is offline"), blog | TERMS 2; `skills/CHANGELOG.md:92–93`; README:184–185 |
| R16 | Classifier is TypeSafe's Jev model, `jev-1.13.0`, pinned | install, architecture, mobile, glossary, blog | RD:61–62, RD:70 (`DEFAULT_MODEL`) |
| R17 | opchain.dev never sees the request | install, privacy, security | RD:69 (the only endpoint), RD:151–160 (`httpTransport`, the only transport) |
| R18 | Rail mechanics: `route-prompt.cjs` on UserPromptSubmit, fail open, 8 s budget; request 1 Choice over skills + none with gate Nouls, gate = mean ≥ 0.5; request 2 reranks the top 3, top probability ≥ 0.35; core 7 at fits ≥ 0.6, others 0.9; 12-skill allowlist; p = min(top, fits, gate); explicit `/oc-*` skips Jev | architecture rail (desktop + mobile) | `plugins/opchain/hooks/hooks.json:14–20`; RP:27–35, RP:92 (`BUDGET_MS = 8000`); RD:36, RD:83 (`DEFAULT_THRESHOLDS`), RD:92 (`SHORTLIST_SIZE = 3`), RD:261–354; `scripts/route-spec.overrides.json:241–256` (allowlist); RD:845 |
| R19 | Every routed prompt is logged and the next prompt records what the session did (eval loop, `route-eval outcomes`) | architecture rail | RP:49–55 (outcome records); `docs/runbooks/skill-router-eval.md` §6 |
| R20 | Planned Jev uses (verifier FAIL triage, Stop handoff detection, semantic gate rows) are planned for v2.2, not built | architecture rail (desktop + mobile) | `sprints/release-2.1/ow-family-sprint-plan.md` "Not in v2.1.0" (Track E leftovers, all v2.2) |
| R21 | The router is a plugin hook; the zip install does not include it | install | `plugins/opchain/hooks/hooks.json:14–20`; `scripts/make-skills-zip.sh:1–13` (packages `skills/` only) |
| R22 | It never blocks | architecture rail, mobile | RP:28 ("this hook never exits non-zero (fail open)") |
| R23 | The router is not on the enforcement map; a suggestion is not a gate | enforcement-map footer | ORCH:185–199 (the map has no router row) |
| R24 | What TypeSafe keeps is governed by TypeSafe's terms, which opchain does not control or restate; opchain.dev receives none of the request | privacy `#router`; security `#router` ("opchain.dev receives none of it") | RD:69, RD:151–160 (the only endpoint and transport are TypeSafe's); the TypeSafe half is a deliberate non-claim: the page restates none of TypeSafe's terms (JEV wording, 2026-10-17) |

## 2. Enforcement claims

| # | Claim | Where | Source on `main` |
|---|---|---|---|
| E1 | Installing the plugin installs no gate; `/oc-enroll` per repository | install (plugin block, `#enroll`), blog | `plugins/opchain/commands/oc-enroll.md:6–8`; AUD:118–120 (I-02) |
| E2 | `/oc-enroll` installs pre-commit, post-commit, pre-push; refuses to overwrite a foreign hook and prints the snippet | install `#enroll`, glossary "Enrollment" | `oc-enroll.md:14–31`; IGD:237 (`MANAGED_HOOKS`), IGD:246–262, IGD:408 |
| E3 | `--doctor` items: enrollment, runtime, each hook, the `verification` block, command resolution, real `node_modules/` | install, blog | `oc-enroll.md:35–39`; IGD:732–769 (`doctor`) |
| E4 | `--ci` vendors into `.opchain/runtime/`, writes `.github/workflows/opchain-evidence.yml`, never overwrites without `--force` | install, security, EnforcementMap, blog | `oc-enroll.md:40–43`; IGD:48–51, IGD:94, IGD:885, IGD:1001; `plugins/opchain/templates/opchain-evidence.yml` |
| E5 | `--claude-md` writes a marked CLAUDE.md section naming the verbs and the bypass rule | install, glossary, blog | `oc-enroll.md:44–48`; `plugins/opchain/templates/CLAUDE.opchain.md:10`, `:22` |
| E6 | Pre-commit re-runs the `.bugcheck.json` checks on the exact staged tree and writes a receipt | install, EnforcementMap, glossary "Receipt", architecture legend | `oc-enroll.md:18–19`; VC:1–15 |
| E7 | A failing check prints name, exit code and output tail; the full log sits beside the receipt | install, blog | VC:74 (`DIAGNOSTIC_TAIL_LINES = 40`), VC:864–866 (`<run_id>.log`), VC:1101, VC:1136 |
| E8 | Timeout or exit 127 is INCONCLUSIVE (retry); missing dependencies are BLOCKED with no receipt | install, EnforcementMap, glossary "INCONCLUSIVE", blog | VC:6–9, VC:60–61, VC:80, VC:805–814, VC:1139; `scripts/lib/verification-receipt.cjs:14–22`, `:242–243` |
| E9 | An identical or checkpoint-only tree reuses its PASS receipt | install, glossary, blog | VC:6, VC:15, VC:980, VC:1122–1123 |
| E10 | Two worktrees committing at once take turns | install, blog | VC:1084 ("waiting for another verification") |
| E11 | post-commit runs under `--no-verify`, writes `.git/opchain/bypasses/v1/<sha>.json`, prints a warning | install, security, glossary "Bypass record", EnforcementMap, blog | `oc-enroll.md:20–23`; IGD:189; `scripts/lib/bypass-record.cjs:8–9`, `:50`; `plugins/opchain/README.md:120–125` |
| E12 | pre-push refuses a commit with neither a PASS receipt nor an `Opchain-Bypass:` trailer; a rebased or cherry-picked commit is excused only if its original was; a push whose outgoing range cannot be computed is refused | install, security, EnforcementMap, glossary, blog | `oc-enroll.md:24–27`; IGD:214–218, IGD:455–490, IGD:548–584 |
| E13 | `OPCHAIN_PUSH_BYPASS=1` lets unaccounted commits through loudly; use it once for pre-enrollment history | install, security | `oc-enroll.md:26–27`; IGD:93 |
| E14 | `/oc-bugcheck bypass` writes the trailer | install, blog | `CLAUDE.opchain.md:10`, `:22`; `skills/oc-bug-check/SKILL.md:18`, `:66` |
| E15 | The trailer travels with the commit to the pull request, where the PR evidence check lists it before merge; the local record never leaves the machine | security, glossary, blog | `scripts/lib/release-evidence.mjs:20`, `:104–118` (CI reads the trailers on the PR's commits, `--bypass-source trailers`); `scripts/lib/bypass-record.cjs:8–9` (the record lives under the clone's Git directory); E17 (no network in the commit hooks) |
| E16 | Local hooks are not a trust boundary; CI re-verifies | install, security, EnforcementMap, blog | `plugins/opchain/templates/opchain-evidence.yml` header; `release-evidence.mjs:108–114` |
| E17 | Nothing from the commit, post-commit or pre-push hooks is sent anywhere | security "Stays local" | Absence: no `http`/`https`/`fetch` import in VC, IGD, `bypass-record.cjs` or `verification-receipt.cjs` (grep, 2026-10-17) |
| E18 | Session start: up to three `gh pr view` calls through your own `gh`; `OPCHAIN_GH_BIN=0` disables; the release check makes no network call | security | `plugins/opchain/hooks/session-state.cjs:25`, `:52` (`GH_CALL_CAP = 3`), `:220–224`, `:29–32` (release resume reads local data only, no network) |
| E19 | Enforcement map rows (commit, bypass, PR, deploy, release, spec, security/integrations/eval) and their status pills | architecture `#enforcement-map` | ORCH:185–199; narrowed per row as below |
| E20 | Deploy wrapper: exact `origin/main` staging, live-SHA ancestor, clean tree, explicit `--prod`, unreadable live version refuses, checkpoint per deploy; shipped as a template | EnforcementMap, glossary "Audit gate", for-agencies, architecture Ship band | ORCH:196; `plugins/opchain/templates/deploy.mjs:5–50`, `:100`, `:112` |
| E21 | `check-release-tag` refuses an untagged catalog version; session start names `/oc-git-release <semver>`; opchain's own deploy only | EnforcementMap | ORCH:197; `scripts/deploy.mjs:45`; `session-state.cjs:389` |
| E22 | `scaffold-spec` writes `spec/01…10` stubs with a producer line; the build-phase refusal is specified, not wired | EnforcementMap, blog | ORCH:198; `scripts/scaffold-spec.mjs:13–21` |
| E23 | Hardening replay holds in opchain's own deploy; integrations and eval gates are named, not checked | EnforcementMap, blog | ORCH:199; `scripts/deploy.mjs:25–27`; `skills/CHANGELOG.md:57` ("Only the hardening replay is checked today") |
| E24 | PR-readiness legend: the sequence is a convention; `evidence:pr` holds it; `/oc-enroll --ci` adds it | architecture legend | ORCH:195; `.github/workflows/ci.yml` (`evidence:pr`); `oc-enroll.md:40–43` |
| E25 | Audit gates: oc-bug-check held by the enrolled pre-commit hook; oc-code-auditor and oc-security-auditor run by oc-deploy-ops as pre-deploy audits; the deploy command held by the wrapper | architecture legend, Audit Gates card, Ship band (desktop + mobile), glossary "Audit gate", for-agencies | ORCH:194, ORCH:196; ORCH:222–223 (handoffs: `/oc-deploy audit`, `/oc-audit pre-deploy`) |
| E26 | The orchestrator recommends the next skill, reads every skill's checkpoint, writes its own state, and enforces nothing | architecture orchestrator card, glossary "Orchestrator" | ORCH:185–190 (the map holds edges, not the orchestrator); `design/architecture-v2.1-jev.md:131–132` (the E3 correction) |
| E27 | Handoffs in skill text are conventions; edges hold only at a chokepoint | EnforcementMap lede, glossary "Skillchain", blog | ORCH:185–190; AUD:155 |
| E28 | oc-stack-forge receives platform decisions (handed, not auto-invoked) | architecture Plan band (desktop + mobile) | `skills/oc-app-architect/SKILL.md` (chains to oc-stack-forge "when you invoke it"; skill description) |

## 3. Measured numbers (blog, `/install`, EnforcementMap lede)

All from AUD. The blog names no business; it says "a consumer repository, a product build" (decision D6).

| Claim | Source |
|---|---|
| 229 PRs in eleven days, 213 merged; 269 Skill-tool calls, none into oc-git-ops / docs-forge / repo-ops / deploy-ops; 340 commits; 100+ staging deploys | AUD:7, AUD:10, AUD:112–113 (I-01) |
| "bugcheck: pass" in 112 of 174 pre-enrollment PR bodies, 7 cite a receipt; 12 of 229 PRs had a documentation section, 11 from Codex | AUD:73, AUD:74 |
| docs-forge → repo-ops held 10/10 in opchain; "## Documentation" 21% → 65% after the CI step | AUD:7, AUD:40 |
| SessionStart fired 53/55 and 27/41, engaged ≤1 / ≤4; Stop next-suggestion 62 fires, 0 followed; 17 of 24 told a session running oc-app-architect to run it | AUD:8, AUD:86, AUD:87 |
| Native gate the only enforcement that held; FAIL 41% / 22%; ≈23 h blocked (11.5 h + 11.4 h) | AUD:8, AUD:91 |
| 14 exit-127 runs, 9 timeouts, 21 trees FAIL → PASS byte-identical, the one-line hook message, 16 sessions probing the gate | AUD:125 (I-03) |
| At least 18 `--no-verify` bypasses with `bypasses: []`; one session 1 gate run then 8 bypasses over 31 h; a PR claiming an approval the transcript does not hold | AUD:8, AUD:130–131 (I-04) |
| Seven days and 193 commits with the plugin installed and no gate | AUD:73, AUD:118–120 (I-02) |
| Codex loaded oc-git-ops 31×, docs-forge 28×, repo-ops 26×, deploy-ops 29×; enrolled; verifier 85× with 0 bypasses | AUD:7, AUD:155 |
| 216 review spawns, four lanes: tool-named 72/72, shorthand `/oc-code-auditor` 80/143, one lane 0/33 (scoped to spawn prompts; never tied to the router) | AUD:67 |
| opchain: 41 of 46 CI failures since 2.0 were evidence plumbing | AUD:104 |
| July post: bypassing made "loud rather than impossible", a bet | `site/src/blog/2026-07-10-the-docs-bot-doesnt-grade-its-own-homework.md` |

## 4. Removed from Track E's copy (and why)

| Removed | Was on | Why |
|---|---|---|
| Precision 0.81, recall 0.95, silent on 98%; holdout 0.86 / 1.00 / 98%; ≈$0.0001 per prompt, $0.077 for 574 | install footnote, blog | TERMS 2 allows only the offline 0.92 / 0.88 figures; Track E's own §D found no committed file for these (C12) |
| `export OPCHAIN_ROUTE_MODE=live  # inject the one-line suggestion` | install copy block | TERMS 4 (C11) |
| "Set OPCHAIN_ROUTE_MODE=live to add suggestions" | glossary "Shadow mode" | TERMS 4 |
| "That is the form that got the skill invoked 72 of 72 times"; "in the tool-named form that scored 72 of 72"; "the form it follows best"; the rail footer's 72/72 | install intro, blog, EnforcementMap footer, architecture rail + mobile caption | TERMS 2: ties the audit's spawn-prompt result to the router, an effectiveness claim before a GO. The 72/72 finding stays where it is about handoffs (blog "Same files, different reader") |
| "Live suggestions wait for a week of shadow data" | install footnote | Replaced by the go/no-go wording (TERMS 4) |
| "v2.1 draft" / "2.1 DRAFT" labels; "JEV · PLANNED 2.1+" | architecture rail, mobile, legend | Replaced by the label (TERMS 1); the planned Jev uses are v2.2 (R20) |
| "That is the thesis of 2.1"; "What 2.1 changes" | blog | Two themes (O1, C16) |
| "/oc-audit + /oc-security are hard gates — oc-deploy-ops won't ship … until both pass" | for-agencies | Row 33: says where each gate is held (E25) |
| "routes every skill invocation … enforces audit gates before deploys … Reads all 33 checkpoints" | architecture orchestrator card | E3 correction (E26); 36 skills, and it enforces nothing |
| "3 audit gates block prod"; "all must pass before oc-deploy-ops will run the production sequence"; "enforces all 3 audit gates" | architecture Ship band (desktop + mobile) | Same claim the Audit Gates card already dropped (E25) |
| "The summary covers branch, ahead/behind, dirty count, open PR, enrollment and active checkpoint" | install, privacy, security, blog | JEV review: understated what is sent (the checkpoint's next action goes as free text). Replaced by R2 |
| "The trailer (unlike the local record) survives a squash merge"; "so the count survives a squash merge" | security, glossary, blog | JEV review: not reliable (a squash commit's message is whatever the merger keeps). Replaced by E15 |
| "billed to your own account"; "are billed there"; "calls bill your own TypeSafe account" | install (step 1 + copy block), glossary, blog | JEV review: nothing on `main` establishes billing. Replaced by R10 |
| "one maintainer's sessions"; "one maintainer's prompts, labelled after the fact"; "One person's past prompts" | install, blog | JEV review: replaced by the corpus description in R14 |
| "TypeSafe's own terms cover what it keeps" | privacy | JEV review: reworded as R24 |

## 5. Claims not tied to a file on `main`

**Closed (JEV review, 2026-10-17).** The three open items were resolved as follows; no claim on the branch is now without a source on `main` or a recorded JEV wording decision.

| Was | Resolution |
|---|---|
| "TypeSafe's own terms cover what it keeps" (privacy) | Kept, reworded as R24: "What TypeSafe keeps is governed by TypeSafe's terms, which opchain does not control or restate; opchain.dev receives none of the request." |
| "574 labelled past prompts from one maintainer's sessions" (install, blog) | Replaced by the corpus description the runbook supports (R14) |
| "Calls go to your own TypeSafe account and are billed there" (install, blog, glossary) | Replaced by "Calls are made with your key, under your TypeSafe account and its terms." (R10); no billing claim remains |
