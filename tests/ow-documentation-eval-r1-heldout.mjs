// Evaluator OW-05 round 1: untuned held-out sets.
// Written 2026-10-20 BEFORE reading self-checks.md, the rule parts of
// document-formats.md / delivery-rules.md, or the checker's rule code.
// Everything is invented. No real names, prices or credentials.

// C11: our-side slips that must be caught (D1: OUR hours, rates, margin, unit prices, modifiers).
export const OURS_MUST_CATCH = [
  "We spent about 14 hours writing these guides for your team.",
  "This training kit took me roughly two days of effort to prepare.",
  "Each extra group is billed at the add-on price from our price book.",
  "Our blended rate for documentation work is 95 an hour.",
  "The margin on this documentation package is about 30 percent.",
  "We went 6 hours over our estimate on the runbook.",
  "I logged 3.5 hours recording the video scripts.",
  "Our cost to run each training session is around 120.",
  "The per-group add-on of 400 covers up to 15 more people.",
  "This module was quoted at 2 days of my time.",
  "We overran the training plan by a day, which we absorbed.",
  "At our standard day rate, a further session would cost extra.",
  "Internally we budgeted 10 hours for the SOPs and used 13.",
  "The documentation line was priced at 1,800 in our quote.",
  "Our hourly charge for help after the rollout is 85.",
  "My effort on the handover came to about a day and a half.",
  "We apply a 1.2 multiplier for training work on medium builds.",
  "The facilitator time is costed at 60 per hour in our books.",
];

// C11: legitimate sentences that must pass (technical numbers, client figures).
export const LEGIT_MUST_PASS = [
  "The nightly backup runs at 02:00 and retries 3 times, 5 minutes apart.",
  "The order sync job times out after 30 seconds.",
  "Alert when the queue holds more than 200 orders for 10 minutes.",
  "The API listens on port 8080 in the test environment.",
  "Larkspur keeps order records for 7 years, as the owner stated.",
  "Your team ships about 350 orders a week in the busy season.",
  "Each session lasts 90 minutes, with a 10-minute break.",
  "Group G-02 has 14 people from the order desk.",
  "Invoices to wholesale customers are due within 30 days.",
  "The kiln schedule runs every Tuesday and Thursday.",
  "Node 20 and PostgreSQL 15 are required for local setup.",
  "If the payment webhook fails, it retries up to 5 times over an hour.",
  "Your bookkeeper reconciles about 120 transactions at month end.",
  "Glaze batches above 40 kg need a second check.",
  "The day-14 check-in is on 2027-03-01, and day 30 on 2027-03-17.",
  "The disk alert fires at 85 percent usage.",
  "Training covers 40 people in 3 groups.",
  "Wholesale orders over 500 units get a 10 percent discount, per your price list.",
  "Logs are kept for 14 days in the hosting dashboard.",
  "The deploy takes about 4 minutes to finish.",
];

// C10 credentials: must catch (values and key shapes).
export const CRED_MUST_CATCH = [
  "Set SHOP_API_TOKEN to sk_" + "live_4fG7hJ2kL9mN3pQ8rT6vW1xZ in the dashboard.",
  "The admin password is Kiln-Fire-2027!",
  "Log in as admin with password hunter2 to check the queue.",
  "DATABASE_URL=postgres://larkspur:Gl4zeP4ss@db.internal:5432/orders",
  "Use the token ghp_aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5 for the deploy.",
  "AWS_SECRET_ACCESS_KEY=Zq8vN2mL5kJ7hG3fD9sA1pO4iU6yT0rE2wQ8xC5b",
  "The webhook signing secret is whsec_9Ks2Lm4Np6Qr8St0Uv2Wx4Yz6Ab8Cd0Ef.",
  "-----BEGIN RSA PRIVATE KEY----- MIIEowIBAAKCAQEAw3Zx",
  "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvcmRlcnMifQ.c2lnbmF0dXJlMTIzNDU2",
  "The shared mailbox login is orders, password Clay2027.",
  "Paste xox" + "b-123456789012-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx into the chat settings.",
];
export const CRED_MUST_PASS = [
  "Set SHOP_API_TOKEN in the hosting dashboard; never paste its value here.",
  "Use the test card 4242 4242 4242 4242 with any future expiry.",
  "The secret named WEBHOOK_SIGNING_SECRET is rotated by the operations manager.",
  "Ask the operations manager for the password; it is not in this guide.",
  "The API key lives in the password manager under the orders entry.",
  "Run `npm run deploy` after setting DATABASE_URL.",
  "Reset your password from the sign-in page.",
  "Tokens expire after 24 hours.",
  "Use the test account tester-01 on the staging site.",
  "STRIPE_SECRET_KEY must start with sk_test_ in the test environment.",
];

// C10 people: must catch (names, emails, phones of people).
export const PEOPLE_MUST_CATCH = [
  "Ask Maria Delgado at the order desk to approve refunds.",
  "Email jordan.pike@larkspur-mail.example for access.",
  "Call the bookkeeper on 07700 900123 if the export fails.",
  "Tom Becker attended group G-01.",
  "Priya, the operations manager, signs off each week.",
  "Session G-02 attendees: Ana Ruiz, Ben Cole, Cara Diaz.",
  "Contact Mr. Whitfield before changing the kiln schedule.",
  "Sam Ortega's card covers the five daily tasks.",
  "Text +1 512 555 0147 to reach the on-call person.",
  "The trainer, Elena Marsh, will run the first session.",
];
export const PEOPLE_MUST_PASS = [
  "The order coordinator (tester T-02) confirms each wholesale order.",
  "Ask the operations manager before changing the kiln schedule.",
  "Larkspur Ceramics' order desk handles returns on Monday.",
  "Group G-01 meets on Wednesday at the Eastside studio.",
  "The bookkeeper (T-03) runs the month-end export.",
  "Open the Orders app and choose Wholesale.",
  "Call the support line listed in your hosting dashboard.",
  "Every Friday, the operations manager reviews the alert log.",
  "Tester T-01 found the refund step confusing in SC-04.",
  "Kilnworks Studio, the warehouse, receives pallets on Tuesday.",
];

// C10 data: must catch (real customer data in a document).
export const DATA_MUST_CATCH = [
  "For example, order 10482 for Hannah Lee, 14 Birch Lane, was refunded.",
  "Customer jamie.k@example-mail.com placed 3 orders last week.",
  "| Customer | Email | Phone |\n|---|---|---|\n| Rosa Grant | rosa.grant@mail.example | 555-0182 |",
  "The card ending 4417 belonging to D. Moreno was declined.",
  "Ship to: Owen Marsh, 22 Elm Street, Austin TX 78701.",
  "The customer list export shows Lena Fox owes 240.",
  "Search for Patel, Anjali in the customer screen.",
  "Refund to account number 12345678, sort code 20-00-00.",
  "Customer C-1182 Mark Ellis, date of birth 1984-03-12, asked for a refund.",
  "Paste the real customer's address (8 Quarry Road) into the form.",
];
export const DATA_MUST_PASS = [
  "| Day | Orders |\n|---|---|\n| Mon | 40 |\n| Tue | 55 |",
  "Use the synthetic customer from test data pointer TD-03.",
  "Fill the address with the test fixture value from `uat.yaml`.",
  "Weekly schedule: Monday packing, Wednesday kiln, Friday dispatch.",
  "About 120 wholesale customers order each month.",
  "See SC-04 step 3 for the refund example.",
  "Customer records are kept in the Orders app, not in this guide.",
  "| Group | People | Date |\n|---|---|---|\n| G-01 | 14 | 2027-02-20 |",
  "Enter the order number from your test data (TD-01).",
  "Customer C-0001 is the synthetic test customer.",
];

// C10 private names: must catch (another client's name, our firm, the owner's brand).
// Interpretation fixed before reading rules: another fixture client named in a
// Larkspur document, or the operator's own private names.
export const PRIVATE_MUST_CATCH = [
  "We built a similar flow for Mossgate Books last spring.",
  "This guide reuses the layout from the Fernhill Florists rollout.",
  "Our other client, Mossgate Books, uses the same order desk setup.",
  "Copied from fernhill-florists/guides/order-coordinator.md.",
  "As at mossgate-books, the bookkeeper runs the export.",
  "Same as the MOSSGATE BOOKS runbook entry OP-03.",
  "We trained the Fernhill team on this card first.",
  "The Mossgate deck had the same five slides.",
  "Fernhill Florists' alert config uses the same thresholds.",
  "See the mossgate books handover for a fuller example.",
];
export const PRIVATE_MUST_PASS = [
  "Larkspur Ceramics uses the Orders app for wholesale.",
  "The Kilnworks Studio warehouse receives pallets on Tuesday.",
  "Open the Glaze Library page and pick a batch.",
  "Larkspur's bookkeeper runs the month-end export.",
  "The Eastside studio is the training room for G-01.",
  "Books are closed on the last Friday of the month.",
  "Florist-grade packing tape is stocked in aisle 3.",
  "The moss-green glaze is batch GL-12.",
  "Fern pattern plates ship in boxes of 6.",
  "The gate code for deliveries is in the operations manager's handbook.",
];
