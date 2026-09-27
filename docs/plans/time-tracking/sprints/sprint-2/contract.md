# Sprint 2 contract — Derive & ledger

Generator proposal and Evaluator contract review, 2026-09-27. Approved planning scope is A10–A18, C2 and ledger-only draft/verify. No planning interview, renderer, catalog release, hook installation or real transcript reads.

## Testable acceptance

- Typed session blocks preserve subagent continuity, idle splitting, capped/uncapped tails, local midnight and DST. Automated-only blocks contribute zero time (#2, #7).
- One global allocation over registered and internal sessions. Last-touch uses human timestamps; split-even counts sessions once. 200 seeded randomized days satisfy the union bound (#8, #9).
- Matter precedence: active checkpoint source/child, PR metadata, branch rules/reflog, default; smallest matters merge to the daily limit (#10).
- Seven sourced price families with current cache multipliers; global message maxima before client/day filtering. Synthetic skipped, unknowns reported and approval refused (#6).
- Rounding operates once per selected scope and distributes integer increments with largest remainder, excluding subminimum scopes (#16).
- Metadata-only activity and deterministic narrative <=240 characters. Prompt canary absent from persisted outputs (#17).
- Locked, append-only, hash-chained ledger validates revisions and immutable approvals; 20 concurrent appends, stale dead PID recovery, corruption and tampering fail verification (#14, #18).
- Golden fixture day and verify CLI, repeated draft adds no events, approved drift preserves entries. New module line coverage >=90%; unit suite <2s.

## Technical approach and clarified seams

Node 24 built-ins only. Pure derivation produces content-hashed entries with allocation proofs; transactional append/fold runs under the ledger lock. Raw allocation proofs are verified independently of rounded billing increments (rounding may exceed raw union). Cache and git metadata are inputs; prompts are never narrative inputs. Current checkpoint state without activation timestamps cannot establish historical activity and is ignored. PR enrichment is local metadata only; no network required.

All registered clients must agree on timezone, idle/tail and overlap policy for one globally consistent allocation; disagreement fails with a config error instead of independently double-allocating. All client ledgers participate in verify; generation drift is surfaced. These choices close ambiguity in the planning contract.

## Evaluator review

Criteria are executable and bounded. Add adversarial coverage for same-session cwd transitions, tie handling, lost matters on re-derive, concurrent repeated drafts, inconsistent policies, partial ledger writes and edited/approved lifecycle. Price fixture uses real published rows, plus injected unknown model. Owner confirmation and the 14-day corpus replay remain pending-owner acceptance, not implementation blockers. Sprint 1 PR #569 is open with CI green and must land first. No catalog version is changed.
