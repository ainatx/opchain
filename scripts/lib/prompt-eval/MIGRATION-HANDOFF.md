# Post-split 2.0 migration handoff

Reuse the small APIs, not a new engine: `loadDataset`, `runDataset`,
`freezeBaseline`, `evaluateRegression`, `createHttpJsonAdapter`,
`attributeCost`, `freezeCostBaseline`, and `evaluateCostGate`. They preserve the
version-1 dataset identity and result/baseline invariants; callers select the
adapter, supply the model and credentials, and provide explicit cost rates.

For a copied artifact, include `scripts/prompt-eval.mjs`, `scripts/cost.mjs`,
every local module under `scripts/lib/prompt-eval/` and `scripts/lib/cost/`, and
the declared `js-yaml` and `zod` dependencies. These modules import only Node
built-ins, `js-yaml`, `zod`, and sibling local files—never an authoring tree,
plugin cache, or remote runtime. Keep `tests/audit-eval/` with the copy.

Do not add Hindsight, Evolve, telemetry, another grader, or a provider registry
to this substrate. A future engine may call these APIs and consume their
versioned artifacts, but must keep its own lifecycle state and policy outside
this package.

## F3 artifact evidence

- [x] A disposable artifact copies the two CLIs, both local runtime trees, and
  declared `js-yaml` / `zod` dependencies; resolution is asserted outside the
  source checkout and plugin cache.
- [x] Its real CLIs prove eval → baseline → regress and usage → cost → budget.
- [x] Its local mock-provider path proves missing inputs, credentials, both
  baselines, pricing, and interruption fail closed.
- [ ] Independent review is next; no post-F3 engine work is authorized.

Remaining active effort: 0 minutes pending independent review; that wait is an
external dependency, not implementation work.
