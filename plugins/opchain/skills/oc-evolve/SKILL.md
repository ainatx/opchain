---
name: oc-evolve
displayName: OC · Evolve
version: 1.9.0
license: Apache-2.0
shortDesc: "Governed behavior change: cluster recurring failures into rules, prove them by regression, adopt by hand."
phases: [foundation, ai-native]
triAgent: true
tryable: false
commands:
  - /oc-evolve
  - /oc-evolve reflect
  - /oc-evolve propose
  - /oc-evolve review
  - /oc-evolve adopt
  - /oc-evolve retire
  - /oc-evolve revalidate
  - /oc-evolve graduate
  - /oc-evolve status
description: >
  Governed behavior-change workflow for the opchain pipeline. A
  Reflector/Planner sweeps repo-local outcome signals and freezes an
  improvement hypothesis plus eval contract; a Rule Generator drafts reviewable
  one-file-per-rule diffs; an isolated Adversarial Evaluator uses oc-prompt-ops
  to run held-out and full-suite regressions without seeing generator
  reasoning. Rules require human review and adoption, decay unless
  revalidated, and never outrank a skill contract or repo policy. Only adopted
  rules re-inject. Use for /oc-evolve, "what keeps going wrong", "propose a
  rule", "adopt the lesson", "retro the pipeline", "graduate the rule
  upstream", "self-improvement loop". NOT routing or what-next (oc-orchestrator),
  NOT the eval runner itself (oc-prompt-ops), NOT the lesson store (oc-hindsight).
governance:
  breaking_change_policy: skills/CHANGELOG.md
  last_reviewed: 2026-09-08
  owner: opchain
  docs:
    - { path: SKILL.md, kind: contract, lifecycle: stable }
---

# Evolve

**On first invocation, read `references/orchestrator.md` and follow its welcome protocol.**

The pipeline notices what keeps going wrong and proposes a rule to stop it —
then has to prove the rule works before a human decides whether it applies.
Evolve looks backward and governs. It never routes and it never ships.

## /oc-evolve — Command Reference

```
OC-EVOLVE COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  REFLECT
  /oc-evolve                    Rule ledger summary + this menu
  /oc-evolve reflect            Sweep ALL outcome signals cross-skill (eval
                                history, scorecard trends, hindsight lessons,
                                FAIL reports, audit findings, postmortems) →
                                cluster patterns (recurrence ≥ 3 or it is not
                                a pattern)
  /oc-evolve status             Every rule: lifecycle, precedence, evidence,
                                eval_delta, expiry

  RULE LIFECYCLE
  proposed → validating → approved → adopted → revalidating → retired

  /oc-evolve propose [cluster]  Draft a rule from a cluster →
                                .opchain/rules/<id>.md (status: proposed)
  /oc-evolve review [id]        Rule + evidence for human review → validating
                                ★ nothing advances without you
  /oc-evolve adopt [id]         ★ Prove-before-adopt: oc-prompt-ops
                                baseline-and-regress must PASS, then a human
                                approves → adopted
  /oc-evolve revalidate [id]    Re-run against the current baseline
  /oc-evolve retire [id]        Withdraw a rule; stops re-injecting
  /oc-evolve graduate [id]      Package an adopted rule as an upstream change
                                proposal → hands to oc-release-ops

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Workflow and agent isolation

1. **Reflector/Planner** sweeps eligible signals, clusters recurrence ≥ 3, chooses
   one bounded improvement hypothesis, and freezes: affected skills, source
   evidence, scoped cases, full-suite baseline, success floor, cost ceiling,
   expiry policy.
2. **Rule Generator** drafts candidate rules against that contract. It may
   produce alternatives; it cannot select a winner or change lifecycle state.
3. **Adversarial Evaluator** receives only the frozen contract, candidate diffs,
   cited evidence and eval fixtures. It runs source and precedence validation,
   scoped tests, held-out cases and the complete `oc-prompt-ops` suite. Its job
   is to disprove the rule. It never reads Generator reasoning.
4. **Human governor** reviews rule and evidence, then approves or rejects.
   Passing evaluation is necessary and never sufficient.

## The rule ledger

One Markdown file per rule at `.opchain/rules/<id>.md` — a deliberate
merge-hygiene choice, so parallel PRs adding different rules touch different
files and never conflict.

Frontmatter carries `id`, `status`, `precedence: learned-rule` (always lowest),
`scope` / `target_skill`, `evidence[]` (source path + anchor + verbatim
excerpt), `recurrence`, the lifecycle timestamps, `baseline_ref` (the frozen
baseline it was proven against) and `eval_delta`. The body is the rule text.

**Precedence is always lowest.** A learned rule never outranks a skill contract
or a repo policy. If a rule and a contract disagree, the contract wins and the
rule is flagged for retirement — the loop cannot quietly rewrite its own
constitution.

## Recurrence ≥ 3

A pattern observed twice is a coincidence with a narrative attached. The
threshold exists because the expensive failure mode here is not a bad rule —
it is a plausible rule generated from noise, adopted because the evidence
looked tidy, and then silently shaping every future run.

## Boundaries

| Concern | Owner |
|---|---|
| Routing, what-next, cross-project status | `oc-orchestrator` — Evolve governs rules, never routes |
| Eval runner, goldsets, judge config, baseline mechanics | `oc-prompt-ops` — Evolve orchestrates it, never reimplements it |
| Usage metering and `/dashboard` aggregates | `oc-telemetry-ops` — telemetry records *that* skills ran; Evolve interprets *how well* |
| Operational memory and retrieval lifecycle | `oc-hindsight` — Evolve reads active lessons as evidence |
| Semver, changelog, shipping a graduated change | `oc-release-ops` — graduate produces a packet, not a release |
| Branch / commit / PR mechanics | `oc-git-ops` — graduation PRs skip no gates |

## Principles

1. **Prove before adopt.** A rule that has not beaten the baseline is a hypothesis.
2. **A human adopts.** Every lifecycle transition that changes behavior is a person's decision.
3. **Rules decay.** Unrevalidated rules expire rather than accumulating into folklore.
4. **Lowest precedence, always.** The loop may not overrule the contract it runs under.
5. **Recurrence ≥ 3.** Below that it is not a pattern, it is a story.
