# Local deployment demonstration

INVENTED TEST FIXTURE. No hosting account, network request or production system
is involved. These commands write only an example invoice artifact under this
repository's ignored `dist/` directory. They do not prove the fictional client's
deployment, integrations or acceptance checks.

1. Run the executable suite: `npm test`.
2. Write `dist/staging/orders.json`: `npm run deploy:staging`.
3. Inspect that local JSON artifact for `synthetic: true` and the example order.
4. Write `dist/production/orders.json`: `npm run deploy`.

The commands are defined in `package.json`; the local writer is
`scripts/deploy.mjs`. Running them again replaces only the example artifact.
There is no hosted deployment or hosted rollback to perform in this fixture.
