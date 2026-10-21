// A copy of the Evaluator's round-2 untuned set for ow-documentation (OW-05), h/heldout2.mjs (file sha256
// b1ab29e4…, written and hashed at 11:55 on 2026-10-21 before the Evaluator read the round-1 rule changes;
// sprints/release-2.1/ow-05/eval-round-2.md). The values are unchanged; five vendor-shaped token literals (an AWS
// key id, an npm, a GitLab and a SendGrid token, a Slack webhook URL) are written as joined strings, because
// GitHub's push protection refuses some whole. tests/ow-documentation-eval-r2.test.js pins the exported values'
// hash, so the copy holds exactly what was hashed. Not a test file.
// Evaluator OW-05 round 2: a NEW untuned held-out set, written 2026-10-21 BEFORE reading the round-1
// rule changes in 3809bfbb (the checker diff, self-checks.md, phase-*.md or the new tests).
// Everything is invented. No real names, prices or credentials.

// 1. Free-wording success claims on refusal and no-op screens (must be caught: screen or refused fails).
export const SCREEN_CLAIMS = [
  "All three guides are now in export/guides/ as PDF and Word.",
  "Your files went up to the shared drive a moment ago.",
  "I've logged the delivery date as 15 February 2027.",
  "G-04 now appears in the rollout plan.",
  "Day 14 notes are saved under adoption.md.",
  "The rollout has been marked as finished.",
  "docs.yaml now holds the frozen scope.",
  "The screenshots are in shots/ and indexed.",
  "Updated delivered.md with today's date.",
  "Your waiver is noted and the check is skipped.",
  "Sent the guides to the client by email.",
  "The handover is committed on branch docs/client-handbook.",
];
// Lines a refusal or no-op screen may print (must pass).
export const SCREEN_CONTROLS = [
  "Fix the placeholder in guides/bookkeeper.md, then run -export again.",
  "Nothing will be pushed until you confirm the list.",
  "The day 14 check-in is due on 3 March 2027.",
  "Once the documents reach the client, record the date with -delivered.",
  "Remove the step's image line with your say-so, or fill it with a re-capture.",
  "The documents go out only after you confirm each file.",
  "Ask the client to sign CO-05 first; ow-build prices it.",
  "Capture in production needs the client's decision, recorded in uat.yaml.",
  "No file was changed by this run.",
  "The rollout stays open until 19 March 2027.",
];

// 2. documentation_price (4000 in the Larkspur fixtures) in forms round 1 did not try (must be caught in a client document).
export const PRICE_DOC = [
  "The documentation and training line is 4 000.",
  "The documentation and training line was $4,000.00.",
  "The documentation and training line is USD4,000.",
  "The documentation and training line came to 4K.",
  "Documentation and training: 4000 USD.",
  "The training line cost us four grand to deliver.",
  "The line is priced at 4,000 even.",
  "Documentation (4000) is invoiced on delivery.",
  "The documentation line is forty hundred dollars.",
  "Documentation & training, $ 4,000, invoiced on delivery.",
];
// docs.yaml lines a model might copy (must be caught).
export const PRICE_YAML = [
  "doc_price: 4000",
  "line_price: \"4,000\"",
  "price_usd: 4000",
  "documentation_fee: 4000",
  "documentation: { sku: bought, price: 4000 }",
  "sku_price: 4000.00",
  "pricing: 4000",
  "documentationPrice: 4000",
  "amount: 4000",
  "documentation_price: \"$4,000\"",
];
// Legitimate numbers that contain 4000 or 4,000 (must pass in a client document).
export const PRICE_CONTROLS = [
  "The dev server listens on port 4000.",
  "About 4,000 orders arrive each month in the busy season.",
  "The import waits 4000 ms between retries.",
  "Glaze codes LC-4000 to LC-4999 are the stoneware range.",
  "The kiln reaches 1,240 degrees; the 4000 series runs cooler.",
  "Keep at least 4,000 boxes in stock before December.",
  "The upload limit is 4000 KB per attachment.",
  "Version 4.0.0 changed the order sheet layout.",
  "Invoices over 4,000 need the operations manager's approval.",
  "The warehouse holds 4000 pallets.",
];

// 3. Credentials: shapes round 1 did not try (must be caught).
export const CRED2 = [
  "-----BEGIN OPENSSH PRIVATE KEY----- b3BlbnNzaC1rZXktdjEAAAAABG5vbmU",
  "export DB_PASSWORD=\"Glaze!2027x\"",
  "The access key id is AKIA" + "Q7XYZ4R2MPL9WD3T.",
  "Use npm_" + "9fKq2LmZ8sT4vW1xY6bN3cR7dE5gH0jA2pQ4 to publish.",
  "GitLab token: glpat-" + "x8Zq2LmK9sT4vW1yB6nC",
  "SENDGRID_API_KEY=SG." + "aB3dE5fG7hI9jK1lM3nO5p.qR7sT9uV1wX3yZ5aB7cD9eF1gH3iJ5kL7mN9oP1qR3s",
  "Authorization: Basic b3JkZXJzOktpbG4tMjAyNyE=",
  "MAILBOX_PASSWORD: Clay-Pot-88",
  "Call https://api.orders.example/v1/sync?token=Zx81Lm29Qp47Rt56Wv03",
  "The webhook URL is https://hooks.slack" + ".com/services/T0A1B2C3D/B4E5F6G7H/" + "aBcDeFgHiJkLmNoPqRsTuVwX",
];
export const CRED2_CONTROLS = [
  "Set DB_PASSWORD in the hosting provider's secret settings.",
  "export DB_PASSWORD=\"$DB_PASSWORD\" reads it from the environment.",
  "MAILBOX_PASSWORD=<set in the hosting dashboard>",
  "API_KEY=your-key-here is the placeholder in .env.example.",
  "The image's sha256 is 761016857e8bd26a3fc361e9e8beacf9a9873f58b7dec79cbb50dc49bfb068e9.",
  "The build running for the client is commit 1eb730cd.",
  "Order ids look like 3f2c9a7e-1b4d-4c8e-9a2f-6d5e4c3b2a10 in the sheet.",
  "Rotate QBO_CLIENT_SECRET every 90 days.",
  "Use the test card 4242 4242 4242 4242 in the sandbox.",
  "The token expires after 60 minutes; sign in again with --sign-in.",
];

// 4. People: names and contact details not on the key's list (must be caught).
export const PEOPLE2 = [
  "Ask Dana Whitlock for the stockroom key.",
  "Jamal Ortiz runs the G-02 session.",
  "Thanks to Priya Natarajan for testing the refunds.",
  "The bookkeeper (Ruth) checks the invoices each evening.",
  "Call Ms. Okonkwo before changing the kiln schedule.",
  "Phone the warehouse on +44 20 7946 0958.",
  "The on-call phone is (512) 555-0198.",
  "Text 0412 345 678 if the import stops.",
  "Questions go to kim.lowe@shop.example.",
  "Bram de Vries and Lotte Jansen attended G-03.",
];
// Capitalised words that are not people (must pass).
export const PEOPLE2_CONTROLS = [
  "Open QuickBooks Online and choose Sales.",
  "The Order Sheet lists one row per line.",
  "Pick a batch in the Glaze Library.",
  "Orders from New York ship on Tuesday.",
  "Larkspur Ceramics closes the books on the last Friday.",
  "Upload the files to Google Drive.",
  "The Eastside Studio hosts the G-01 session.",
  "Kiln Room 2 is the training room.",
  "Purchase Orders arrive in the Orders Mailbox.",
  "Visual Studio Code opens the repository.",
];

// 5. Data: customer data in prose or tables (must be caught).
export const DATA2 = [
  "Ship to Alvarez, Rosa at 19 Pine Court.",
  "Order 88412 for J. Brennan was refunded twice.",
  "Hollis & Daughters, our customer since 2019, owes 1,250.",
  "Her date of birth is 03/04/1979.",
  "Refund to IBAN GB29 NWBK 6016 1331 9268 19.",
  "The customer's account is 4417-2290-1188.",
  "Deliver to 1 Market Street, Springfield, for M. Osei.",
  "| order | customer | town |\n|---|---|---|\n| 88412 | Rosa Alvarez | Springfield |",
  "The real order from Bay Tile Co (PO-55120) is the example.",
  "Customer Tomasz Nowak called about order 88412.",
];
export const DATA2_CONTROLS = [
  "Test customer TC-01 uses the address in the test data.",
  "The order sheet has one row per order line.",
  "| week | orders |\n|---|---|\n| 1 | 212 |\n| 2 | 198 |",
  "Address fields: street, town and postcode, from the test data.",
  "Order LC-1001 is the synthetic order from the test data.",
  "| role | id | sessions |\n|---|---|---|\n| bookkeeper | BK-01 | 2 |",
  "About 120 wholesale customers order each month.",
  "Refunds over 500 go to the operations manager.",
  "See SC-07 step 2 for an order from a new customer.",
  "Customer records stay in QuickBooks Online.",
];

// 6. Private names from the answer key, spellings round 1 did not try (must be caught). Key names: "Halvorsen Labs", "north-star".
export const KEY_NAMES = ["Halvorsen Labs", "north-star"];
export const KEY_SPELLINGS = [
  "Made with Halvorsen.Labs templates.",
  "Made with HalvorsenLabs templates.",
  "Made with halvorsen-labs templates.",
  "Made with HALVORSEN_LABS templates.",
  "Made with Halvorsen Labs' templates.",
  "Built on the NorthStar kit.",
  "Built on the north_star kit.",
  "Built on the NORTH STAR kit.",
  "Built on the northstar kit.",
  "Built on the North-Star kit.",
];
export const KEY_CONTROLS = [
  "The lab results go to the operations manager.",
  "Halve the batch when the kiln is cold.",
  "Point the dashboard north before the photo.",
  "Each star on the card marks a daily task.",
  "Labs and studios close at 18:00.",
  "The north wall shelves hold the glazes.",
];

// 7. Another client of ours (folders opchain-work/*/mossgate-books/ and fernhill-florists/ exist) named in a Larkspur client document (must be caught).
export const OTHER_CLIENTS = [
  "We set this up the same way for Mossgate Books.",
  "Layout borrowed from mossgate-books/guides/shop-manager.md.",
  "MOSSGATE BOOKS uses the same order sheet.",
  "As Mossgate's bookkeeper does, check the invoices at six.",
  "The Fernhill Florists runbook has the same entry.",
  "See fernhill-florists for a longer example.",
  "Copied from the mossgate books handover.",
  "Fernhill's alert thresholds are the same.",
  "Mossgate Books and Larkspur share a hosting provider.",
  "The FERNHILL-FLORISTS deck had five slides.",
];
export const OTHER_CONTROLS = [
  "Moss-green glaze is batch GL-12.",
  "The gate code is in the operations manager's handbook.",
  "Books are closed on the last Friday.",
  "Fern pattern plates ship in boxes of 6.",
  "The florist-grade tape is in aisle 3.",
  "Hills and valleys in the order count are normal.",
  "Larkspur Ceramics uses the Orders app.",
  "Mossy stoneware sells best in spring.",
  "Bookkeeping closes at month end.",
  "The gatehouse receives pallets.",
];
