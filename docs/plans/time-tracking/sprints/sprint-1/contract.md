# Sprint 1 contract — Collect & classify

Scope: A1–A9, B2, B14, C4 and C6 from the approved punch list. Implement
only `collect [--report]` and `hook prompt`; no billing, approval, pricing,
release bump, hook installation or live transcript reads during development.

## Deliverables and acceptance

1. Private storage (0700 directories, 0600 files), validated billing YAML subset
   with line-numbered errors, and worktree-aware registry with prefix fallback.
2. Streaming complete-line cursor reads; append, truncate, inode replacement,
   deletion and interrupted writes cannot silently lose complete events.
3. Classifier precedence matches the audited envelopes; tool answers require an
   AskUserQuestion/ExitPlanMode ID. Subagents attach to parents but add no humans.
4. Global event UUID de-duplication, max-per-field assistant usage, chronological
   output, enqueue-time attribution/cancellation and authoritative ±5s hook merge.
5. A canary records types, envelope classes, version bounds and per-day failures.
   Unknown/quarantined >1% or a newer untested version fails the canary, while
   collect remains best effort. Raw text is never persisted or printed.
6. Synthetic fixtures #1, #3, #4, #5, #11, #12, #17 plus config/cursor/registry
   edge cases pass. At least 90% library line coverage; unit tier under 2s.
7. CLI smoke tests and 20-process hook timing establish silent, always-zero hook
   behavior, including invalid stdin and unwritable storage. Synthetic 10k-line
   append target <1s (CI <3s); hook median <50ms (CI <150ms).
8. Format documentation and owner replay commands accompany a Sprint 1 PR.
   Real-corpus replay remains pending owner, as explicitly required by handoff.

## Technical approach and evaluator review

Use Node 24 built-ins only, ESM modules, hermetic temporary HOME and
OPCHAIN_TIME_HOME in tests, and a synthetic git/worktree builder. Keep normalized
source shards so append reads need no old transcript text, and publish sorted
monthly caches before advancing cursors. Store only allowlisted metadata and
opaque queue identity hashes; never source text or arbitrary tool payloads.

Contract review: acceptance criteria are executable, match Sprint 1 and include
failure paths. Pricing/verify references in older spec prose belong to Sprint 2
per the newer sprint plan and handoff. No UI evaluator applies to this data CLI.

Release-ops disposition: this is a sprint PR, not a catalog release. The frozen
version surfaces and unrelated v2 release checkpoint remain unchanged. Sprint
results will supply release notes when a release is explicitly planned.
