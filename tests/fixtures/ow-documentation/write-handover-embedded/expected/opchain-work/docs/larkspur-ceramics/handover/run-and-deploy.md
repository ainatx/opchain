---
ow_artefact: ow-documentation/handover
schema: 1
written_by: ow-documentation 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: docs/larkspur-ceramics/docs.yaml
created: 2027-02-05
clock: user-stated
origin: skill
---
# Run and deploy: Larkspur Ceramics

## Set up locally

- Install: `npm ci` (from README.md)
- Copy the settings file, then fill it from the hosting provider's secret settings: `cp .env.example .env` (from README.md)
- Run it: `npm run dev` (from README.md)

## Run the tests

- `npm test` (from README.md)

## Deploy

- Staging first: `npm run deploy:staging` (from docs/deploy.md)
- Then production: `npm run deploy` (from docs/deploy.md)

## Roll back

No rollback steps were found in the repository; see Open items.

## Open items

- No rollback steps were found in README.md or docs/: ask whoever built it before the first deploy.

<!-- ow:internal -->
## Self-checks (not for the client)

Same-session self-check: the same assistant that wrote it, applying a checklist; a discipline, not an independent review. Agent-checked.

| check | result |
| --- | --- |
| Trace | OK |
| Coverage | OK |
| People by role or id | OK |
| No credentials | OK |
| No internal numbers | OK |
| No private names | OK |
<!-- ow:end-internal -->
