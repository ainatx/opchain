# 03 — Security, Privacy & Billing Integrity

## Threat / risk model (single user, local)

| Risk | Control |
|---|---|
| Automated turns billed as your time (task notifications, scheduled tasks, CI events) | UserPromptSubmit hook as the primary signal. The transcript classifier ignores `origin.kind` for machine envelopes and quarantines unknown `<…>` content as non-billable (02 → *Event classification*, [P1]) |
| Prompt content (client secrets, code) persisted into billing files | The hook stores only `{ts, session_id, cwd}`. The classifier reads text only to classify, and no stored event carries text. A canary string in fixture prompts must never appear in the cache, ledger, CSV or Markdown |
| Rates and other clients' data committed to a client repo | All billing state lives under `~/.opchain/time/` [P10]. The repo holds only the gitignored `timesheets/`, and `verify` fails if that folder is tracked |
| Billing data entering model context or other clients' transcripts | `nudge` emits a `systemMessage` that the model doesn't see, naming the **current** repo's client only, and stays silent in unregistered repos [P8] |
| Billing data leaking into telemetry | No import of `scripts/telemetry.mjs`. The `oc-telemetry-ops` schema forbids project and client identifiers and stays that way |
| Double billing across parallel sessions, worktrees or clients | Global union over **all** projects, with unregistered work as `internal` [P7]. Cross-file de-duplication by `uuid` and `message.id` [P4]. `verify` checks the invariant |
| Billing a client for time spent in another repo | Unregistered repos compete in the allocation instead of being invisible [P7] |
| Inflated drafts from unattended agent runs | `agent_tail_cap_minutes: 30` by default; `agent_only_minutes` and `rounding_added_minutes` on every entry; both engagement models shown in `review` [P5][P14] |
| Understated or overstated AI cost | Subagent files included [P2]; global `message.id` de-duplication [P4]; cache multipliers; `approve` blocks any partly unpriced disbursement [P3] |
| Silent parser breakage when the transcript format changes | Format canary; `verify` fails when unknown or quarantined lines exceed 1% or when an untested `version` appears [P12] |
| Silent history rewrite of approved time | Append-only ledger. Approved entries change only through `amended` followed by a new approval. Re-deriving an approved day warns and never overwrites |
| Interleaved ledger lines from concurrent writers | `O_EXCL` lockfile with stale-lock recovery [P13] |
| Hook slowing down or blocking Claude Code | The prompt hook runs in under 50 ms and `nudge` in under 500 ms; both read from cache and always exit 0 [P6] |
| Hostile `billing.yaml` regex (ReDoS) | Rules are capped at 200 characters and run only on bounded inputs (branch names, PR titles) |
| Transcript retention | Claude Code deletes transcripts after `cleanupPeriodDays`. The normalized event cache and the ledger keep what billing needs, so approved history doesn't depend on transcripts surviving |

## Authorization

None; access relies on OS file permissions. Everything under `~/.opchain/time/`
is created with mode `0700` for directories and `0600` for files.

## Professional-responsibility notes (not legal advice)

- Bill actual time spent. Time saved by the AI is not billable time.
- AI costs belong on an invoice only as actual, disclosed costs. That's why the
  `ai_cost` line is separate and labelled "list-price equivalent". Re-decide the
  basis before it goes on a real invoice.
- Narratives describe the work, not client confidences. They're generated from
  metadata (commits, PRs, skills), and you approve every one.
- `spotcheck` provides a weekly check of approved entries against their raw
  evidence [P15].

OWASP web categories don't apply, since there's no server, input form or network.
