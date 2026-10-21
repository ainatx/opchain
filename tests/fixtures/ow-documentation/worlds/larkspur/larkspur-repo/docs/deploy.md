# Deploying larkspur-orders

INVENTED TEST FIXTURE.

Deploys go to the hosting provider from the main branch.

1. Check the tests pass: `npm test`.
2. Deploy to staging first:

       npm run deploy:staging

3. Open the confirmation view on staging and check today's orders show.
4. Deploy to production:

       npm run deploy

The deploy takes about 4 minutes; the old version keeps running until the new one is healthy.
