# Run and deploy: Larkspur Ceramics

INVENTED TEST FIXTURE. This page describes the executable offline subset, not a
real client system. Inherited configuration and architecture documents remain
fictional background; the fixture needs no credentials or installation.

## Tests

Use Node 20 or later. `npm test` (README.md#tests) runs the six order-processing
tests. The preparer's external receipt records the actual local result; the
skill may report it with that attribution, never as its own execution.

## Local deployment demonstration

`npm run deploy:staging`, then `npm run deploy` (docs/deploy.md), write example
JSON artifacts below `dist/`. These commands do not contact a hosting provider
or prove that the larger fictional application's integrations work.

## Limitations

No mailbox import, PDF parsing, user interface, real sheet write or QuickBooks
connection is implemented by this fixture. Real deployment instructions and
real customer acceptance require a real project and remain outside this exercise.
