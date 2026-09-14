# oc-update — final silo evaluation

## Source-mode follow-up

Added automatic source-checkout detection before network access, plus explicit
`--source`. Uses the current checkout's generators in temporary staging and
refreshes generated references/runtimes, plugin mirror files and internal local
links. Shared transaction handling now journals link targets for exact rollback.

Validation after this addition: **687 repository tests passed**; **80 targeted
tests passed on Node 22.13**, including **21 source-mode tests**. Independent
review found that source edits during a no-op/read-only check could evade the
snapshot guard; the guard now runs before every return, with regression tests
and an independent reproduction confirming the fix.

Ran the actual bundled skill against the user's source repository using normal
automatic detection: **exit 0, Opchain 1.9.0 already current; files verified**.
No release download occurred. Checkpoint and telemetry file hashes, local link
targets, Git HEAD and clean working status all remained unchanged. Telemetry
remains **OFF**. This synchronized the existing checkout; it did not install the
unreleased 2.0 candidate into the active branch.

The earlier consumer-mode evaluation below remains the baseline record.

**Verdict: PASS for the isolated candidate.** Combined 2.0 release validation
remains pending integration; no release/deployment was performed.

Scope: `/oc-update`, read-only check, repo-local updater, bootstrap, full skill
payload, portable telemetry/checkpoint runtimes, plugin command and release plan.
Baseline: `4d39b93`, branch `codex/oc-update-v2`. Tests ran in disposable consumer
directories, with fake first-party transport; no production endpoint was used.

## Evidence

| Check | Result |
|---|---|
| Full repository suite, Node 24.19 | **666 passed**, 48 files |
| Updater/artifact/runtime subset, Node 24.19 | **59 passed** |
| Same subset, minimum Node 22.13.0 | **59 passed** |
| Plugin commit-gate and suggestion suites | **35 + 13 passed** |
| Repository pretest gates | Frontmatter, flags, references, PM protocol, generated bundle/plugin parity passed |
| Full build | Passed; Astro 81 pages, site asset assembly, Worker build |
| Astro check | 0 errors, 0 warnings (40 existing informational hints) |
| Whitespace check | Passed |

The generic skill-creator validator rejects Opchain's catalog frontmatter fields
(`version`, `commands`, `phases`, etc.). The repository's canonical skill validator
accepts and validates this required Opchain schema; do not remove catalog fields
to satisfy the generic validator. All referenced candidate resources are bundled.

## Contract outcomes

- Complete artifact built from 34 baseline-plus-candidate skills, 334 files,
  approximately 6 MB. All canonical file bytes and license notices verified.
- Actual distributed CLI executed against a mocked first-party release endpoint:
  check makes no install, install verifies, rerun reports already current.
- Enabled, disabled, absent consent; missing/corrupt database; active and closed
  WAL databases tested. Checkpoint bytes, IDs, timestamps and history preserved.
- Unrelated skills, host configuration and custom extra files retained. Updated
  upstream files backed up; unchanged obsolete managed files removed; customized
  obsolete files retained. Missing files and executable modes repaired.
- Bad digests, invalid paths/receipts, symlinks, newer installed versions,
  concurrent locks, partial downloads and HTML fallback responses fail closed.
- Simulated write/verification failure restores original bytes/modes; obstructed
  rollback retains the lock and journal. A truncated bootstrap does not execute
  an incomplete downloaded updater.
- Installed telemetry status/record and checkpoint list/status execute in the
  consuming repository, including from a subdirectory. No npm scripts required.

## Independent evaluator

A separate evaluator read the skill fresh, built the full artifact, and exercised
real CLI runs with disposable repos and fake network transport. Four original
findings were corrected and independently rechecked:

1. SQLite read-only connections could create WAL/SHM files. Health checks now use
   a private temporary snapshot; the original closed-WAL reproduction changes no
   consuming-repo files.
2. macOS alias paths could bypass CLI dispatch and silently exit 0. Canonical
   argument-path comparison now executes through symlinked parent directories.
3. Global-only update requests could fall into fresh local installation. The
   skill now detects no-local-install before dispatch and routes global/plugin
   updates to the host manager. The raw bootstrap intentionally supports fresh
   local installation; no actual plugin-manager update was tested here.
4. An unhealthy check-only result incorrectly said skills were ready. Output now
   says the check completed without installing, with exit 2 for telemetry health.

Scores: functionality 9/10, completeness 8/10, code quality 8/10, command UX 8/10.
The remaining completeness gate is the real combined 36-skill 2.0 release and
host-level invocation rehearsal, specified in the release addendum.
