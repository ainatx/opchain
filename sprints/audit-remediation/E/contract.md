# E1 contract — Local consent, privacy and PM identities

## Scope

Implement only E1 for findings F23, F24, F26 and F27. F22 aggregate/export
and all checkpoint-store integration remain E2 work.

## Acceptance criteria

- Consent is read only from machine-local, gitignored telemetry storage; a
  cloned tracked checkpoint can never enable recording or create a store.
- Existing telemetry data is retained through disable/re-enable and legacy
  checkpoint data is neither deleted nor treated as authorization.
- Enabled records accept only catalog skill IDs, catalog command verbs without
  arguments, known phases/tiers/outcomes, and finite non-negative numeric values.
- PM validation discovers every skill with a PM integration section and parses
  PM YAML with the repository YAML parser.
- PM protocol distinguishes immutable retry identity from outcome/revision
  identity, including fail-to-pass and changed-contract cases.
- Tests are synthetic/local only; no PM calls, exports, generated artifacts, or
  shared checkpoint implementation changes.

## E2 integration request

C's accepted atomic store API must support local-only, ignored telemetry metadata
without updating a tracked checkpoint. E2 will consume the exact API/version after
coordinator acceptance; no dependency is required for E1.

## E2 contract — Aggregate/export and store integration

- `aggregate` creates a schema-versioned local preview from grouped queries only;
  it carries an explicit denominator status and never divides by an inferred or
  zero value.
- `export --out=<new-file>` writes the same anonymized artifact only to an
  explicit new local path; raw runs, handles, timestamps, and arbitrary event
  labels are absent.
- Event writes are local-consent-gated and restricted to bounded categories,
  labels, scores, and a run owned by the current local handle.
- Aggregate metadata is written through C's versioned local checkpoint store
  with `expectedRevision`, including one conflict reread/retry; no E-owned
  replacement writer exists.
- PM marker construction keeps retry identity stable while distinguishing a
  fail→pass event and a changed contract revision.

## E2 correction acceptance

- Aggregate checkpoint metadata must be stored only under
  `.checkpoints/.local/telemetry` through C's API and must fail closed until Git
  confirms that private target is ignored.
- The aggregation module may receive only SQL-grouped weekly eval rows.
- PM marker construction must be exercised by executable composition and
  pre-write reconciliation with a mocked provider, including uncertain delivery
  replay, fail→pass, and contract revision changes.

## E3 contract — fresh-consumer privacy and update journeys

- A fresh Git project must enable, record, aggregate, and export without a test
  fixture manually creating an ignore file. Initialization uses C's public store
  API to create the consumer-local ignore convention before private metadata.
- A cloned or fresh project without local consent records no data; disable stops
  writes, re-enable starts a fresh local handle, and events cannot attach across
  handle epochs.
- Journey evidence covers malformed enabled inputs, explicit and unavailable
  denominators, small-cell suppression, raw-free export, uncertain PM replay,
  and distinct pass/revision comments using mocks only.
- Non-Git projects are an explicit portability limit: record remains local but
  aggregate/export metadata fails closed until a supported ignored path exists.
