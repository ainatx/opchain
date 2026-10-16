# opchain 2.1 architecture — Jev router + enforcement map (draft)

`design/architecture-v2.1-jev.html` is a self-contained page: open it in a browser. The only
external resource is Google Fonts. It was built with the architecture-diagram-pro (Forge)
skill on 2026-10-09. It is a design proposal, not a site change.

**How to read it.** Hover or focus a band to dim the others and open its detail panel.
Hover the **ENFORCEMENT MAP** button to preview the overlay, or click it to pin (Esc
unpins). The overlay dims every band but leaves the numbered ◆ chokepoint markers
lit. Legend items have hover/focus popovers. "◐ theme" switches dark and light; light
also follows `prefers-color-scheme`.

## Layers

| Layer | What it shows | How it is labelled |
|---|---|---|
| Foundation strip | `oc-checkpoint-protocol`, `oc-orchestrator`, `oc-update` (frontmatter `foundation`) | allowlist pips where they apply |
| **SESSION · ROUTE** band | Row 1: the session timeline. SessionStart `session-state.cjs` → UserPromptSubmit `route-prompt.cjs` → model turn (Skill tool) → Stop `next-suggestion.cjs` + `task-end.cjs`. Row 2: the router. Explicit `/oc-*` check → redact → state → Jev request 1 → Jev request 2 → tiered decision. Row 3: planned Jev uses, the eval loop, shadow (default), live injection | router = **routed** (blue); SessionStart/Stop = **informs** (dotted); planned = **planned 2.1+** (violet, dotted) |
| Routing bus | Left-gutter line from the model turn's Skill-tool call into every pipeline band | **routed**: suggests only allowlisted skills |
| 6 pipeline bands | CONCEPT·SPEC (8), DESIGN (4), AI-NATIVE (4), BUILD (5), DEPLOY (7), OPERATE·LEARN (5). That makes 33 skills, plus 3 in the foundation strip = **36** | each chip shows its literal frontmatter `phases:` line, a `core`/`allow` router pip, and a rose stripe when a chokepoint checks its output |
| Edges | A few representative §3 handoffs per band, plus three cross-band ones: app-architect → git-ops (right gutter, the 0/229 edge), deploy-ops → monitoring-ops, and the routing bus | §3 prose handoffs = **convention** (grey dashed); edges with a chokepoint = **enforced** (rose solid) |
| **Overlay: enforcement map** | 8 cards in lifecycle order: ① spec → build, ② commit, ③ post-commit, ④ push, ⑤ PR, ⑥ release (also on SessionStart), ⑦ deploy, ⑧ artifact-keyed rows. Matching ◆ markers sit in the bands | **enforced** |
| Info cards | What held, what did not, router status | audit numbers |

**Bands vs frontmatter phases.** The brief asked for bands taken from frontmatter
`phases:`. Frontmatter has only four values (`foundation`, `plan`, `build`,
`ai-native`), so it cannot produce concept → spec → design → build → deploy on its own. The
bands use the lifecycle stage from `skills/orchestrator.md` §2 and the live
`/architecture` page. Each chip still prints its exact frontmatter phases, and the
"frontmatter phases" legend popover explains the difference. Where a skill sits in a
band is a judgement call. Examples: `oc-api-dev` and `oc-data-ops` are in DESIGN, and
`oc-bug-check` is in DEPLOY, beside the commit chokepoint it serves.

**Palette.** This uses the opchain 2.0 Slate & Emerald tokens (`site/src/styles/tokens.css`),
dark and light. There are no warm hues: `--warning` (khaki) and `--tri-agent`
(chartreuse) are deliberately unused. The page is cool slate with an emerald accent,
which is the decided 2.0 pairing rather than a same-hue match. The diagram's single
register is **mechanism** (how an edge holds), not skill archetype:
routed = `--secondary` blue, enforced = `--audit-gate` rose,
convention = `--subtle`, informs = `--info`, planned = `--tertiary` violet. All component
colours are `var(--…)`. Hex appears only inside the `:root` / light-theme token blocks.

## Every claim and its source

The router, hooks, orchestrator.md §3 and verifier changes are **uncommitted** in
`/Users/aidanelsesser/repos/opchain/.claude/worktrees/opchain-chain-fixes`
(abbreviated `CF/` below). Another session edited them while this diagram was being
built. `route-dispatch.cjs` was rewritten at 00:13 CDT and `route-prompt.cjs` shortly
after. The diagram reflects the state re-read at about 00:20 CDT on 2026-10-09. Before
adopting it, re-check the rows marked †.

| Claim on the diagram | Source |
|---|---|
| 36 skills; each chip's phases | `skills/oc-*/SKILL.md` frontmatter `phases:` (this worktree) |
| Band placement | `skills/orchestrator.md` §2 Pipeline Map; `site/src/pages/architecture.astro` bands (discover/plan/ai/build/ship/monitor) |
| UserPromptSubmit → `route-prompt.cjs`, 10 s registered / 8 s budget, fail open, silence rules | `CF/plugins/opchain/hooks/route-prompt.cjs` header; `CF/plugins/opchain/hooks/hooks.json` |
| Shadow is the default; `OPCHAIN_ROUTE_MODE=live` injects † | `CF/plugins/opchain/hooks/route-prompt.cjs` ("SHADOW IS THE DEFAULT", `mode = … === "live" ? "live" : "shadow"`) |
| Redact first; state = request + conversation {previous_request ≤200, assistant_last ≤400} + repo {branch, ahead/behind, dirty, open_pr, enrolled, checkpoint} † | `route-prompt.cjs` "What the router sees"; `CF/plugins/opchain/hooks/lib/route-dispatch.cjs` `redactSecrets`, `normalizeConversation`, `route()` |
| TypeSafe Jev, model pinned `jev-1.13.0`, endpoint `/v1/systemone` | `route-dispatch.cjs` header + `DEFAULT_MODEL` |
| Request 1: Choice `which` over routable skills + `none`; Nouls acts / procedure / prose; gate = mean(acts, procedure, 1−prose) ≥ 0.5 | `route-dispatch.cjs` `buildRequest1`, `gateScore`, `DEFAULT_THRESHOLDS.gate` |
| Request 2: rerank top 3; `fits::<id>` Noul and `verb::<id>` Choice per candidate; top p ≥ 0.35 | `route-dispatch.cjs` `buildRequest2`, `SHORTLIST_SIZE`, `minTopProb` |
| Tiered threshold: 7 core skills at fits ≥ 0.4, others ≥ 0.9; p = min(top, fits, gate) | `route-dispatch.cjs` `CORE_SKILLS`, `coreFits`, `otherFits`, `evaluate()` |
| Evidence allowlist of 12 skills; `allow` pips † | `CF/plugins/opchain/hooks/route-spec.json` `suggestAllow`; `CF/scripts/route-spec.overrides.json` `suggest.allow` + `reason` |
| Output line "invoke the Skill tool with skill X and args /verb" | `route-dispatch.cjs` `decisionText()` |
| Explicit `/oc-*` mention routes deterministically, p = 1, no Jev call | `route-dispatch.cjs` `explicitMention()` and its early return in `route()` |
| Outcome records label the previous prompt; `route-eval outcomes`; day-8 go/no-go † | `route-prompt.cjs` "Outcome records"; `CF/scripts/route-eval.mjs` header; `CF/docs/runbooks/skill-router-eval.md` |
| Eval: 574 prompts, 41 positives; precision 0.92 git-ops / 0.88 deploy-ops | `route-dispatch.cjs` comment above `CORE_SKILLS`; `route-spec.overrides.json` `suggest.reason` |
| Planned Jev uses, in order: verifier FAIL triage, Stop handoff detection, semantic gate rows | owner decision 2026-10-09 (this task's brief); not in code |
| SessionStart: change-triggered `next:`, age tag, behind-origin, `enrolled: no`, plugin drift, release resume via `additionalContext` | `CF/plugins/opchain/hooks/session-state.cjs` header |
| Stop next-suggestion: the §3 handoff target, `systemMessage` (no model turn); task-end stamp | `CF/plugins/opchain/hooks/next-suggestion.cjs` and `task-end.cjs` headers |
| Enforcement map rows ①–⑧ (mechanisms and wording) | `CF/skills/orchestrator.md` §3 "Enforcement map" |
| INCONCLUSIVE on timeout / exit 127 / env failure, exit 2, never authorizes | `CF/plugins/opchain/scripts/verify-candidate.mjs` (exit codes, `EXIT_INCONCLUSIVE`); `CF/plugins/opchain/scripts/lib/verification-receipt.cjs` (`INCONCLUSIVE_STATUSES`) |
| post-commit bypass record; pre-push refuses without trailer | `CF/plugins/opchain/scripts/install-git-drivers.mjs` header; orchestrator.md §3 |
| "Convention" label; zero autonomous invocations across 87 sessions | `CF/skills/orchestrator.md` §3 preamble |
| 0/229 deftwright PRs entered oc-git-ops | `docs/audits/2026-10-08-opchain-effectiveness-audit.md` I-01 (copied into this worktree from `release-2-1-site`) |
| 72/72 tool-named vs 80/143 shorthand (one lane 0/33) | audit §3.1 |
| Pre-commit verifier the only enforcement that held; FAIL 41% / 22% | audit summary item 2, §3.3 |
| docs-forge → repo-ops held because CI checks it | audit I-08 Evidence |
| next-suggestion 0/62 followed; SessionStart fired 53/55 and 27/41, acted on ≤1 / ≤4 | audit summary item 2, §3.3 |
| ≥18 unrecorded bypasses (I-04); app-architect skipped Phase 2 artifacts (I-09); auditor ≈$370 → 23 HIGH / 106 MEDIUM | audit I-04, I-09, summary item 4 |

## Judgement calls and gaps

- **Edges drawn vs edges listed.** The §3 handoff table has about 30 rows. The bands draw a
  few representative edges each and list the others in the detail panel. Drawing all
  30 on a chip grid would cross every row.
- **"Enforced" on git-ops → docs-forge → repo-ops.** The *invocation* is still prose. What
  `evidence:pr` enforces is that the PR carries both handoffs. The edge is drawn rose
  because the edge's outcome is what must hold; the DEPLOY detail panel says this.
- **⑥ appears twice.** It sits on SessionStart (release resume) and on release-ops →
  git-ops (`check-release-tag` at the production deploy). §3 lists both chokepoints for
  that row.
- **⑧ is the artifact-keyed row.** The brief listed seven chokepoints. §3 has a sixth
  row (security / integrations / eval), shown as ⑧ so the seven keep the brief's numbers.
- **Router ≠ gate.** The router is never drawn rose. It suggests, fails open, and injects
  nothing in shadow mode.

## What would change in the site to adopt this

Nothing under `site/` was modified.

**`site/src/components/PipelineDiagram.astro`.** It is not imported by any page. Its own
header says it was kept for a planned refactor.
- Either retire it, or make it the static, no-JS fallback for this diagram: same six bands,
  plus a SESSION·ROUTE row above the foundation bars. Its `Node.kind` union would gain
  `route` / `hook`, and `Edge` would gain a `holds: "routed" | "enforced" | "convention" |
  "informs" | "planned"` field that replaces the `shape` field.
- It currently draws 23 of 36 skills and leaves out `oc-bug-check` and `oc-release-ops`. Both
  carry chokepoints (② ③ ⑥), so a 2.1 version must include them.
- Its learning row (`wire-1-2`, `scorecard-kit`) predates the router's outcome records.
  The new eval loop belongs in the SESSION·ROUTE row, not there.

**`site/src/components/MobileArchitecture.astro`.**
- Add a collapsible `<details class="ma-band">` before Discover for SESSION·ROUTE. Stack it
  vertically: SessionStart → UserPromptSubmit → explicit? → Jev req 1 → req 2 → decision
  → shadow | live → Stop. Keep the planned 2.1+ list as a caption, not boxes.
- Mobile has no hover, so the enforcement map should be a toggle button that sets
  `aria-expanded`. It opens a stacked list of the eight chokepoint cards and marks the
  matching skills in each band with a numbered ◆ badge. Do not draw a dimming overlay.
- About 526 hard-coded hex literals here, and about 771 in `architecture.astro`, would need
  to become tokens. The memory note on the 2.0 recolour flagged these as the largest
  open item. The mechanism register (`--route`, `--enforce`, `--convention`, `--informs`,
  `--planned`) should be added to `tokens.css` as aliases of `--secondary`,
  `--audit-gate`, `--subtle`, `--info` and `--tertiary`.

**`site/src/pages/architecture.astro`.** The brief did not ask about this page, but it now
states things that are wrong for 2.1:
- Line ~1504 says the commit gate is enforced by "a PreToolUse hook" and that "nothing
  mechanically blocks a PR today". §3 now says the plugin's legacy PreToolUse parser is
  not an enforcement boundary, and `evidence:pr` does block a PR.
- Line ~282 says oc-orchestrator "enforces audit gates before deploys" and "reads all 33
  checkpoints". It enforces nothing, and there are 36 skills.
- The desktop page already has a CP overlay. Per the skill's one-overlay rule, the
  enforcement map should replace it, and checkpoints move to an info card.
