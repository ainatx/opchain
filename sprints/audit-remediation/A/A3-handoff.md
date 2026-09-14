# Workstream A — Sprint A3 Handoff

Status: the first independent review returned two enrollment gaps. Their minimum
correction and builder verification are complete; renewed independent acceptance is
pending. Workstream A is not release-complete until that review is accepted.

Worktree: `/Users/aidanelsesser/.codex/worktrees/37c7/opchain`

Starting HEAD: `aef40809fef4bbded9a47c936c7c544631397fb6`
(`v1.9.1`, detached). No commits, tags, remote operations, releases, installed-cache
changes, real-repository configuration changes, or service actions were performed.

## Completed criteria

- [x] Actual partial-staging commit verifies and commits the staged candidate while
  leaving the divergent working copy untouched.
- [x] A tracked bug-check checkpoint commits normally because the authorization
  receipt lives beneath the Git common directory, outside the candidate.
- [x] Compound mutate/add/commit and command-substitution commits reach the real Git
  hook and are blocked when their candidate fails.
- [x] `git -C`, explicit `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`, and linked
  worktree commits resolve the effective candidate and repository identity.
- [x] Missing required executables produce an `UNSUPPORTED` receipt and block.
- [x] A check that stages a late mutation changes the effective tree, prevents a
  receipt write, and blocks the commit.
- [x] Repo and plugin Claude configurations register no competing commit decision;
  the installed Git `pre-commit` hook is the sole local authorizer.
- [x] Explicit enrollment remains inherited and tested: unenrolled repositories skip;
  `.opchain`, `.checkpoints`, or `OPCHAIN_GATE=1` enroll.
- [x] One available native Claude Code host loaded the temporary plugin from a path
  containing spaces and completed every registered hook.
- [x] F01–F06, F17, F18, and F25 are mapped to current evidence below.
- [x] Fresh plugin-only, repo-only, and combined explicit enrollment installs the
  Git authorizer plus verifier/receipt runtime and protects later commits.
- [x] Required setup with a foreign hook exits nonzero, leaves the hook unchanged,
  and prints the exact final-decision integration snippet.
- [x] Nested package `node_modules` dependencies are available to declared checks
  without entering the candidate tree.
- [x] Git-aware checks receive isolated single-commit metadata; inherited live Git
  pointers are removed before check execution.

## Finding revalidation

| Finding | Current result | Evidence |
|---|---|---|
| F01 | Closed at authorization boundary; inherited alias compatibility retained | Git hook trusts only the candidate receipt; legacy nested/flat alias harness remains 149/149 |
| F02 | Closed | Actual commit with a tracked checkpoint; receipt stored externally |
| F03 | Closed | Actual partial-staging commit records the staged blob, not the divergent working file |
| F04 | Closed | A1 receipt validation plus A2/A3 exact repository/tree/policy/toolchain/verifier matching |
| F05 | Closed | Actual compound-command and command-substitution attempts are blocked by Git `pre-commit` |
| F06 | Closed for the tested Git surfaces | `git -C`, explicit Git environment/alternate index, and linked worktree fixtures |
| F17 | Closed after review correction | Both Claude configurations have no `PreToolUse` decision; `/oc-enroll` installs one canonical Git boundary and foreign-hook setup fails closed |
| F18 | Closed for the available macOS host | Quoted registered plugin paths plus native spaced-path SessionStart/Stop success; canonical Git commits also run from spaced paths |
| F25 | Closed in A1 and unchanged | Header-only generic, RSA, EC, and OpenSSH regression fixture |

F01's alias repair and F25's scanner repair are inherited A1 work. F02–F06's
receipt/verifier foundation is inherited A1/A2 work. A3 adds acceptance evidence and
the residual ownership/documentation correction; it does not reimplement those fixes.

## Hook ownership

- `.claude/settings.json`: repository Stop hygiene only; no commit PreToolUse.
- `plugins/opchain/hooks/hooks.json`: plugin SessionStart and Stop only; no commit
  PreToolUse.
- `scripts/install-git-drivers.mjs`: the canonical Git `pre-commit` owner. It
  copies the verifier and receipt library beneath Git common storage, installs the
  hook, finishes mirror mutation, resolves the effective repository, preserves
  explicit enrollment, and invokes `verify-candidate.mjs run`.
- `plugins/opchain/commands/oc-enroll.md`: the plugin-only actionable entry point.
  Generated plugin runtime copies are a coordinator packaging step listed in
  `A3-integration-request.md`.
- `plugins/opchain/hooks/pre-commit-gate.cjs`: retained as an unregistered legacy
  compatibility artifact. Its parser/checkpoint fixtures still pass, but it is not
  authorization evidence and is not claimed as native-host enforcement.

## Test evidence

Final builder commands:

```text
node --check scripts/verify-candidate.mjs
node --check scripts/install-git-drivers.mjs
npx vitest run tests/audit-commit/receipt.test.js tests/audit-commit/compatibility.test.js tests/audit-commit/candidate-verifier.test.js tests/audit-commit/commit-boundary.test.js tests/audit-commit/enrollment.test.js tests/install-git-drivers.test.js
node plugins/opchain/hooks/test-gate.cjs
git diff --check
```

Results:

- Syntax: PASS.
- A-owned focused Vitest: PASS — 6 files, 33/33 tests, no skips.
- Unregistered legacy gate compatibility harness: PASS — 149/149 fixtures.
- Diff whitespace: PASS.

The first A3 run passed eight of nine assertions. The linked-worktree commit and
receipt were correct; one assertion compared Git's relative `.git` spelling to the
equivalent absolute common-directory path. The assertion now canonicalizes both
paths. Its targeted rerun passed 1 test with 5 tests intentionally unselected, and
the later combined run passed all 25 tests with no skips.

## Native-host evidence and limits

Native evidence (not a script-fixture claim):

- Host: Claude Code 2.1.259 on the available macOS machine.
- Invocation used a disposable Git repository and `--plugin-dir` pointing to a
  temporary copy under `plugin with spaces`.
- The host reported the plugin as inline version 1.9.1.
- SessionStart outcome: success, exit 0.
- Stop outcome: success, exit 0.
- The prompt used no tools and `--no-session-persistence`; the temporary tree was
  removed afterward. Cost: $0.03632.

Explicitly not tested or unavailable in this sprint:

- No Windows, Linux, alternate shell, older/newer Claude Code, or other native-host
  matrix was available.
- No real plugin install/update/cache journey was run; `--plugin-dir` deliberately
  avoided the installed cache. Plugin-only enrollment is artifact-only disposable
  evidence, not a native `/oc-enroll` host claim.
- No native Claude Bash commit interception was tested because A3 removes that
  ownership. Actual commit enforcement is proven at the Git hook in disposable
  repositories, not inferred from the native plugin smoke.
- Deliberate `git commit --no-verify` remains outside local enforcement by Git
  design. Protected CI verification is required for an independent trust boundary.

## Changed A3 files

- `.claude/settings.json`
- `plugins/opchain/hooks/hooks.json`
- `plugins/opchain/hooks/test-gate.cjs`
- `plugins/opchain/commands/oc-enroll.md`
- `plugins/opchain/commands/oc-bugcheck.md`
- `plugins/opchain/commands/oc-commit.md`
- `scripts/install-git-drivers.mjs`
- `scripts/verify-candidate.mjs`
- `skills/oc-bug-check/SKILL.md`
- `tests/audit-commit/compatibility.test.js`
- `tests/audit-commit/commit-boundary.test.js`
- `tests/audit-commit/candidate-verifier.test.js`
- `tests/audit-commit/enrollment.test.js`
- `sprints/audit-remediation/A/A3-contract.md`
- `sprints/audit-remediation/A/A3-handoff.md`
- `sprints/audit-remediation/A/A3-integration-request.md`

## Coordinator requests

See `A3-integration-request.md` for the exact packaging, package-command, protected
CI, generated-mirror, and plugin README updates. Those shared/generated files remain
untouched here.

## Independent-review correction

The first A3 review failed two real criteria:

1. Removing plugin PreToolUse left fresh plugin-only repositories with no way to
   install the replacement Git hook or its runtime.
2. An enrolled repository with a foreign pre-commit hook returned setup success
   while remaining unenforced.

The correction adds an explicit `/oc-enroll` wrapper and `--enroll --repo` installer
mode. The packaged source runtime is copied beneath the Git common directory before
the hook is installed, so later commits survive removal of the source/plugin artifact.
Repo-only, plugin-only, and combined journeys exercise later commits. Required foreign
hook setup now exits 1 with `BLOCKED`, preserves the file byte-for-byte, and prints the
installed-runtime verifier snippet. `OPCHAIN_SKIP_GIT_DRIVERS=1` remains a package
preparation escape hatch but now fails explicit enrollment rather than faking success.

Coordinator CI integration also identified two materialization requirements. Candidate
package dependency mounts now cover root and nested `node_modules` directories adjacent
to candidate `package.json` files. Candidate checks receive isolated Git metadata whose
single `HEAD` tree equals `OPCHAIN_CANDIDATE_TREE`; a fixture deliberately inherits live
Git pointers and writes a ref, then proves the live repository was unchanged.

## Next step

- [ ] Independent A3 acceptance review against `A3-contract.md`.
- [ ] If accepted, coordinator integrates A1–A3 plus the listed package/CI requests.

Estimated remaining A-owned active effort: 0 minutes unless review returns a
specific failed criterion. Independent review and coordinator wait time are external.
