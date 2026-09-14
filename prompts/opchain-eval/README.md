# opchain-eval

opchain's own eval set — the dogfooding artifact for `oc-prompt-ops` / `/oc-prompt eval`.

It evaluates **opchain routing**: given a natural-language dev request, does
opchain pick the correct skill and its canonical entry command? That exercises
the two surfaces that decide which skill triggers — each skill's `description:`
frontmatter and the orchestrator routing table (`skills/orchestrator.md` §4) —
so trigger-copy drift shows up as a failing case instead of a silent mis-route
in production.

The set holds 42 cases and covers every invocable skill (all of `skills/` except
`oc-checkpoint-protocol`, which is a protocol and is never routed to). 27 of the
cases are **collision cases**: requests that two skills' trigger copy both claim,
such as "tag the release" (oc-git-ops `/oc-git-release`, not oc-release-ops),
`/oc-harden` versus `/oc-hardening`, or running a load test (oc-scale-ops) versus
planning one (oc-qa-ops).

## Files

| File | Shape |
|---|---|
| `inputs.jsonl` | one `{id, input}` per line — the request |
| `expected.jsonl` | one `{id, expect}` per line — the grader config for that case (two shapes, below) |
| `eval.yaml` | default grader (`contains`), judge config, and thresholds (`pass_rate: 1.0`, `regression_epsilon`) |

`expect` takes one of two shapes. In both, `expect.all` lists the expected skill
id and its command verb, in that order.

```jsonl
{"id": "route-001", "expect": {"mode": "contains", "all": ["oc-app-architect", "/oc-discover"]}}
{"id": "route-029", "expect": {"mode": "llm_judge", "all": ["oc-git-ops", "/oc-git-release"], "criteria": "The answer routes \"tag the release\" to oc-git-ops ... Routing to oc-release-ops (/oc-release ...) fails, even if the answer mentions oc-git-ops in passing."}}
```

- **`contains`** passes when the answer names every token in `all`. It is used
  only where one skill plausibly owns the request.
- **`llm_judge`** is used for every collision case. `contains` cannot grade a
  collision: an answer that routes to the wrong skill and names the right one in
  passing still contains both tokens. The judge scores the answer against
  `criteria`, which names the wrong-side skill and says that routing there fails.

Grading modes are defined in `skills/oc-prompt-ops/references/eval-datasets.md`.

## The gate

`pass_rate` is `1.0`: every case must pass. A lower threshold tolerates
`floor((1 - pass_rate) × N)` failures, and nothing stops those from being the
collision cases. At the old 0.90 over 28 cases, both `/oc-harden` cases could
fail together and the gate stayed green.

The cost of that strictness: a single noisy `llm_judge` verdict fails the gate,
even when the routing answer was right. Re-run before treating a lone judge
failure as a regression, and recalibrate the judge (`/oc-prompt judge`) if it
recurs. At `pass_rate: 1.0`, `regression_epsilon` has no effect: any drop from a
green baseline is already below the absolute threshold, so the epsilon check can
never be the one that fails.

## Run it

```
/oc-prompt eval prompts/opchain-eval
```

`oc-prompt-ops` joins inputs↔expected on `id`, routes each input, grades each case
with its mode, and compares the pass rate to the thresholds and the stored
baseline (see `skills/oc-prompt-ops/references/drift-detection.md`).

CI does not run an LLM. `tests/opchain-eval.test.js` checks that the set parses and
joins 1:1 on `id`; that each `expect.all` names a real `skills/<id>` and a
registered `/verb`; that every `llm_judge` case has a `criteria` naming a skill
other than the expected one; that the listed collision cases use `llm_judge`;
that every invocable skill appears in at least one case; and that `pass_rate`
tolerates zero failures.

## Extending

Add a paired line to `inputs.jsonl` and `expected.jsonl` with a new unique `id`.
In `expect.all`, name a real `skills/<id>` directory first and a registered
`/verb` second. If another skill's trigger copy also claims the request, use
`llm_judge` with a `criteria` string that names that skill as the failing route,
and add the id to `COLLISION_CASES` in `tests/opchain-eval.test.js`. Re-run the test
to keep the set honest.
