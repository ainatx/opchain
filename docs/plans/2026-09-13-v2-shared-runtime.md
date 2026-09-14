# 2.0 shared runtime — approved Option C

Approved by the user on 2026-09-13, with no release deadline. Includes Option B's
fixes and contract corrections. This is the current architecture decision and
supersedes conflicting mechanics in the September 3 plan, its appendices, the
older release spec, and the September 12 updater addendum. Historical plans remain
for context; their 35-skill/14-command counts are not current release targets.

## Boundary

Build in `codex/oc-update-v2`, preserving existing work. Canonical runtime modules
live under `scripts/runtime/`; `scripts/opchain.mjs` dispatches separate feature
commands. Existing checkpoint, telemetry and updater implementations remain
canonical modules rather than being rewritten. Existing domain skills remain.
The user subsequently approved applying all review recommendations, updating site and release plans, importing the color work, and deploying staging. Commits needed for the staging gate are authorized. Production publication, global plugin edits and a repository split remain outside this task.
The OSS split remains a release integration prerequisite, not a prerequisite to
isolated development in this approved worktree. Target: 36 skills, 16 plugin
commands, 2.0.0 at the eventual release cut. The integration tree identifies its artifacts as 2.0.0 with release-preview.json marking staging-only status. Released history remains 1.9.2. No release date is set.

## Shared contracts

- Immutable event IDs identify individual evaluated outcomes. Duplicate copies
  deduplicate; conflicting payloads under the same ID fail. Source paths are
  provenance, not identity. Distinct IDs sharing a source remain distinct.
- Evaluation separates frozen pre-change baseline from post-proposal candidate.
  Evidence binds candidate bytes and task outcomes; routing alone cannot prove
  improvement. Adoption requires improvement on the target task and no regression
  on held-out/full-suite cases. Synthetic grader tests are not an adoption run.
- Activation requires a cryptographically verified receipt binding candidate and
  evaluation evidence. Trusted public keys are provided by the caller from outside
  the consuming repository; the runtime never enrolls a signer from a candidate.
  TTY presence, a writable checkpoint and arbitrary Approved-by trailers are not
  human authentication. Independent control of signer/trust policy is an operator
  prerequisite; this local runtime cannot protect against an actor controlling
  both the process and its trust configuration. No signing or automatic approval
  helper is exposed through the agent CLI.
- Retrieval checks expiry, status, approval and current candidate digest every
  time. Learned material is returned as advisory data; never persisted into
  CLAUDE.md. Kill switches govern reads. A session already containing retrieved
  material must restart to remove that context.
- Shared persistence uses validated records, safe paths and serialized
  writes. Learning state does not imply enrollment in the commit gate.
- One runtime manifest declares available commands and bundled dependency closure.
  Owning skills carry self-contained copies generated from the same canonical
  sources, allowing standalone ZIPs and repo-local installs. No plugin-only kit
  prerequisite; host hooks are optional adapters, not the engines themselves.
- Existing updater recovery gains immutable before/after identities and a pinned
  release digest. Recovery never overwrites post-interruption user edits.

## Host capability boundary

CLI operations work wherever the supported Node runtime and local filesystem are
available. Repo-local Claude/Codex installs receive the same engines. Automatic
prompt/session hooks are not installed by the updater. Hosts can invoke the
read-only context adapter explicitly; automatic registration remains a separate
setup operation. The explicit evaluation command can call a selected provider through the existing prompt runner and record its inputs, outputs and grades. It does not create isolated model contexts or authenticate the provider or reviewer. Approval verification remains separate.

## Implementation sequence and acceptance

1. Shared core and separate scorecard/hindsight/evolve modules with temporary-repo
   tests for event identity, provenance, invalid signatures, mutation, lifecycle,
   expiry, switches and idempotence.
2. Existing runtime fixes: crash journal + recovery, consumer project metadata,
   explicit/compatible gate enrollment and refusal of unbound PASS.
3. Unified CLI and manifest-driven dependency packaging; thin skill/host adapters;
   artifact-only consumer tests, including no access to authoring-repo helpers.
4. Run the complete repository and hook suites, independent evaluator, source
   synchronization, and document the remaining real-host/release acceptance.

Wire 1.2 rotation/migration, production host setup, live independently generated
model evidence, and the exact signed 2.0 release dress rehearsal remain separately
tracked release work. Do not describe a successful fixture lifecycle as a live
self-improvement outcome or stamp the release complete.
