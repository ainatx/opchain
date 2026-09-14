# G — Reusable execution kits: G1 contract

Status: review-only design; no implementation is authorized by G1. Scope is one
local Node subprocess role runner and one explicitly scoped dbt-style SQL
expression adapter. This contract does not define a workflow engine, provider
integration, checkpoint store, eval runner, or sandbox.

## Goal and acceptance checklist

- [x] Define an opt-in, single-host role-launch interface.
- [x] Define immutable input manifests, bounded retries, and honest capability labels.
- [x] Define one SQL-expression validation/compilation adapter with a narrow dialect scope.
- [x] Record shared runtime dependencies and failure cases.
- [x] Clarify digest preimages, transport/caps/timeout/retry semantics, and the supported expression grammar.
- [x] G2: implement the local role runner and narrow SQL-expression validator, with bounded artifact-only tests.
- [x] G2 review corrections: preserve first terminal cause, reject unenforceable capabilities, and return stable invalid-manifest artifacts.
- [x] Independent G2 review and accepted error-artifact fixes.
- [x] G3: copied-artifact assurance for immutable in-flight role identity, separate inputs, retry bounds, and contract failures.
- [ ] Independent G3 review (estimated 20–40 minutes; remaining uncertainty is host/process-tree behavior on other supported host versions).

## 1. Local Node subprocess role runner

The caller must explicitly opt in by calling `runRole(request)`. The runner
starts exactly one local child process for one role invocation; it does not
discover providers, schedule other roles, persist checkpoints, or claim OS
sandboxing. The host is trusted and the child has the caller's normal user
permissions, filesystem visibility, network access, and environment unless the
caller supplies a narrower environment. `isolation: "none"` is mandatory in
the result; no stronger isolation label is permitted.

```js
runRole({
  manifest: {
    schema: "opchain.execution-manifest", version: 1,
    role: "lowercase-role-id", input_digest: "sha256:<64 lowercase hex>",
    command: ["node", "relative/script.js"], cwd: "relative/repo/path",
    env: { "KEY": "value" }, timeout_ms: 300000,
    retry: { max_attempts: 1, backoff_ms: 0, retryable_exit_codes: [75] },
    output: { max_stdout_bytes: 1048576, max_stderr_bytes: 1048576 },
    capabilities: { network: "inherited", filesystem: "inherited", isolation: "none" }
  },
  input: "immutable JSON value"
}) -> Promise<{
  status: "PASS" | "FAIL" | "UNSUPPORTED" | "ERROR",
  attempts: number, exit_code: number | null, stdout: string, stderr: string,
  duration_ms: number, isolation: "none", input_digest: string,
  failure_code: string | null
}>
```

The input transport is UTF-8 canonical JSON written once to the child's stdin;
stdin is closed after the write. The runner computes
`input_digest = sha256(canonicalJson(input))`, where the manifest is excluded
from that preimage. If a manifest digest is needed, it is
`manifest_digest = sha256(canonicalJson(manifest with input_digest and
manifest_digest removed))`; neither digest includes itself. A mismatch is
rejected before spawning. The manifest and input are read-only during the run;
each retry receives the same digest-verified bytes.

`command` must be a non-empty argv array (no shell string), `cwd` must be
repository-relative, timeout must be finite and bounded (1–900000 ms), and
`max_attempts` must be 1–3. Each stdout and stderr stream is capped at the
declared 1–1048576 bytes; exceeding either cap terminates the process and
returns `OUTPUT_LIMIT`. The runner starts a process group, sends termination to
the group at timeout, then force-kills it after a fixed 1000 ms grace period;
the result is `TIMEOUT` even if an uncooperative descendant survives. Retries
occur only for an exit code listed in `retryable_exit_codes` or a timeout;
never for malformed input, unsupported capabilities, spawn failure, output
limit, or contract violation. Backoff is capped at 60000 ms and does not create
an unbounded wait.

Failure codes are stable and machine-readable: `INVALID_MANIFEST`,
`INPUT_DIGEST_MISMATCH`, `UNSUPPORTED_CAPABILITY`, `SPAWN_ERROR`, `TIMEOUT`,
`NONZERO_EXIT`, `OUTPUT_LIMIT`, and `RETRY_EXHAUSTED`. A successful process
exit is not proof of sandboxing, SQL correctness, or external side effects.

## 2. dbt-style SQL-expression validation adapter

This adapter validates and renders a single expression in a caller-selected
PostgreSQL-compatible dialect. It is not a SQL engine, query planner, model
runner, database connector, or universal SQL validator. It accepts identifiers
and literals supplied in the manifest; it does not execute SQL or access the
network.

```js
validateExpression({
  expression: "amount * tax_rate",
  dialect: "postgres",
  columns: [{ name: "amount", type: "numeric" }, { name: "tax_rate", type: "numeric" }],
  policy: { allow_functions: ["coalesce"], require_nonempty: true }
}) -> {
  status: "VALID" | "INVALID" | "UNSUPPORTED",
  rendered: string | null,
  diagnostics: [{ code: string, message: string, position: number | null }],
  dialect: "postgres"
}
```

The adapter must reject statements, comments, multi-expression input, unknown
columns, disallowed functions, malformed syntax, and dialects other than
`postgres`. The supported grammar is deliberately small:

```text
expr       := or_expr
or_expr    := and_expr ("OR" and_expr)*
and_expr   := compare ("AND" compare)*
compare    := additive (("=" | "<>" | "<" | "<=" | ">" | ">=") additive)?
additive   := multiply (("+" | "-") multiply)*
multiply   := primary (("*" | "/" | "%") primary)*
primary    := identifier | number | string | "NULL" | function | "(" expr ")"
function   := allowed_name "(" expr ("," expr)* ")"
```

`identifier` is one supplied column name, `number` is a decimal literal, and
`string` is a single-quoted literal with doubled-quote escaping. Only function
names in `policy.allow_functions` are accepted; no casts, subqueries, window
functions, keywords beyond `NULL`/`AND`/`OR`, comments, semicolons, or postfix
syntax are in scope. The adapter may normalize quoting/whitespace and render a
deterministic expression, but must not claim semantic/type correctness beyond
the supplied column metadata and policy. `UNSUPPORTED` is required for syntax
outside this grammar or dialect capability; `INVALID` is for a recognized
contract violation.

## Shared runtime dependency manifest

The contract requires only Node.js built-ins: `child_process` for the local
process group and `crypto` for digest computation. `fs`/`path` are optional
implementation details, not mandatory runtime dependencies; the SQL adapter
requires no parser package or database connection. G1 does not import or
implement receipt, checkpoint, or eval systems, so there is no shared-runtime
coupling to those APIs. Any transitive dependency or SQL parser is a G2
coordinator decision.

## Verification record

G2 direct Node probes: **PASS** — canonical fixed input bytes and immutable
identity, output limit including a SIGTERM-resistant child, timeout/process-group
termination, bounded retry, digest-mismatch refusal, unenforceable capability
rejection, stable malformed-manifest and invalid-input artifacts, and
valid/invalid/unsupported SQL paths. Focused Vitest suite: **BLOCKED** — this
checkout lacks the declared `vitest` package, so its configuration cannot load;
no dependency was installed.

G3 copied-artifact probes: **PASS** — a runner copied into a temporary directory
keeps the canonical manifest command and retry policy stable after the caller
mutates both during a retry; separate inputs retain separate output and run
identity; retry limits and malformed-manifest artifacts hold. G3 adds no sandbox
claim, provider, or package. Focused Vitest remains **BLOCKED** by the absent
declared package; no dependency was installed. Required follow-up is independent
G3 review.
