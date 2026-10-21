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
