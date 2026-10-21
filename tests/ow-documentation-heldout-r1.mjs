// The Generator's held-out sets for the ow-documentation evaluation round 1 fixes (OW-05). Written on
// 2026-10-20, BEFORE any round-1 rule changed in scripts/ow-documentation-acceptance.mjs, and measured once
// against the checker at 1eb730cd (before) and once after the fixes; its sha256 is in
// sprints/release-2.1/ow-05/eval-round-1.md. It is never tuned: a miss after the fixes is reported, not
// patched in silence. Every name, value, address and figure here is invented. Not a test file:
// tests/ow-documentation-eval-r1.test.js imports it.

/** m1: a free-worded success claim on a refusal, no-op or question screen (must be caught). */
export const SCREEN_CLAIMS = [
  "I've exported the runbook anyway.",
  "The deck was pushed to the Ops handbook.",
  "Delivery recorded for 15 February 2027.",
  "Saved your answer to docs.yaml.",
  "The check-in has been written to adoption.md.",
  "G-02's attendance is recorded.",
  "The rollout plan was updated with G-04.",
  "Screenshots captured for SC-01 to SC-06.",
  "Closed the rollout as asked.",
  "Sent the guides to the shared drive.",
  "I committed the handbook to the client's repository.",
  "Uploaded export/sops/SOP-01.docx to the wiki.",
  "Created docs.yaml for the new client.",
  "The waiver is noted and the export went ahead.",
];
/** m1: legitimate explanatory lines on those screens (must pass). */
export const SCREEN_CONTROLS = [
  "Nothing was exported, pushed or delivered.",
  "The documents have not been delivered yet; say when they arrive.",
  "delivered.md is never rewritten; an update goes in delivered-update-01.md.",
  "Once the change order is signed, the group can be added.",
  "The day 14 check-in can be recorded from 3 March 2027.",
  "No session was recorded for G-02.",
  "Fill the placeholder with -capture, then export again.",
  "Ask the operations manager to sign CO-05 first.",
  "Nothing new was written; delivered.md stays as it was.",
  "guides/bookkeeper.md holds what No credentials looks for; take it out and export again.",
];
/** m1, X11: a commit or merge in the client's repository claimed on any screen (must be caught). */
export const COMMIT_CLAIMS = [
  "Committed the copy on branch docs/client-handbook.",
  "Merged docs/client-handbook into main for you.",
  "The handbook branch was pushed to origin.",
];
export const COMMIT_CONTROLS = [
  "The repository copy is on branch docs/client-handbook in ../larkspur-repo: commit docs/ there; this skill commits nothing.",
  "Commit the copy yourself when you have read it.",
];

/** m2: the documentation line's price (Larkspur's documentation_price, 4000.00) in a client document (must be caught). */
export const PRICE_IN_DOC = [
  "The documentation and training line came to $4,000.00.",
  "Training and documentation: US$4000.",
  "This line is 4,000 USD on the quote.",
  "The documentation line was quoted at 4 000.",
  "We quoted the training line at $4k.",
  "The documentation and training line costs four thousand dollars.",
  "The line was 4000.00 in the signed quote.",
  "Documentation and training (4K) is invoiced on delivery.",
];
/** m2: the same digits as a client figure, not the price (must pass). */
export const PRICE_CONTROLS = [
  "Your team ships about 4,000 orders a year.",
  "Order 40001 is the first test order.",
  "The import handles up to 4000 rows per file.",
  "Glaze batch 4000-B is the test batch.",
  "About 4,000 customers are on the mailing list.",
];
/** m2: a price key in docs.yaml (a line under scope:, must be caught). */
export const PRICE_KEYS = ["line_price: 4000", "documentation_price: '4000.00'", "price: 4000", "unit_price: 400"];
export const PRICE_KEY_CONTROLS = ["sku_note: the line's price stays in contract-inputs.md", "groups_note: one group of up to 15"];

/** m3: credential values and shapes (must be caught). */
export const CRED_CATCH = [
  "SMTP_PASSWORD=Gr4n1te-Kiln-77",
  "export QBO_CLIENT_SECRET='b7Hq2LmX9pZr4Tw8'",
  "-----BEGIN OPENSSH PRIVATE KEY-----",
  "-----BEGIN PRIVATE KEY----- MIIEvQIBADANBgkqhkiG9w0BAQEFAASC",
  "The QBO_CLIENT_SECRET is currently Hk38fPq2Zx7LmN4vRt9w.",
  "WEBHOOK_TOKEN: 9fKq2LxP7mZt4RwB8nVc",
  "api_key = AIzaSyD4kL9mN2pQ7rT5vW8xZ1bC3dF6gH0jK",
  "mysql://admin:Sh3lfLif3@db.example:3306/shop",
  "SHOPIFY_ACCESS_TOKEN=shp" + "at_4f9c2b7e1a8d3f6c0b5e9a2d7c4f1b8e",
  "The mailbox's app password (QwRt7yUi9oPa2sDf) is in the old notes.",
];
/** m3: secret names, placeholders and configuration that is not a secret (must pass). */
export const CRED_CONTROLS = [
  "QBO_CLIENT_SECRET=<set in the hosting dashboard>",
  "Set API_TOKEN=your-token-here only in your local .env file.",
  "WEBHOOK_SECRET is rotated every 90 days.",
  "SECRET_KEY_BASE must be at least 64 characters.",
  "DATABASE_URL=${DATABASE_URL}",
  "Set LOG_LEVEL=info in the test environment.",
  "SESSION_TOKEN_TTL=86400",
  "API_KEY_HEADER=X-Api-Key",
  "The build id is LarkspurUat4Build2027.",
  "Commit 3f9c2a1 added the retry.",
];

/** m4: people the key does not list, by name, title or contact (must be caught). */
export const PEOPLE_CATCH = [
  "Hand the card to Rosa Klein on the packing bench.",
  "Dr. Osei approved the refund rule.",
  "Ms Varga runs the Tuesday session.",
  "Ring the warehouse on 020 7946 0958 if a pallet is late.",
  "Call (512) 555-0173 for the courier.",
  "Nadia, the bookkeeper, checks the invoices.",
  "G-03 attendees included Felix Brandt and Ruth Achebe.",
  "Kenji will run G-02.",
  "The trainer is Hannah Weiss.",
  "Signed off by Luis Ortega-Ramos.",
  "Mobile: +44 7700 900456 for the studio.",
];
/** m4: systems, places, meetings, roles and ids (must pass). */
export const PEOPLE_CONTROLS = [
  "Open Google Sheets and pick the Orders tab.",
  "The Kiln Room is used for group G-02.",
  "Packing Bench B holds the label printer.",
  "Use QuickBooks Online to check invoices.",
  "The Weekly Review covers open gaps.",
  "Larkspur Ceramics' Order Desk answers on weekdays.",
  "The Shopify Admin shows the order.",
  "The operations manager (OM-01) signs the sheet.",
  "Tester OC-02 confirmed the import.",
  "Read the Getting Started page first.",
  "In February, group G-01 trains first.",
  "The Eastside Studio hosts G-03.",
];

/** m5: a customer's data in a document's prose (must be caught by the data check). */
export const DATA_CATCH = [
  "Refund customer Garcia, Elena for order 10577.",
  "The shipping address 41 Harbour Street, Leeds goes on the label.",
  "Customer DOB: 12/04/1979.",
  "Client record CU-2231 belongs to Selma Brink, born 1990-07-21.",
  "Deliver to Flat 2, 9 Mill Lane.",
  "The customer at 77 Kiln Avenue complained twice.",
  "Customer ref 55120 (Ida Moss, ida.moss@shopmail.example) asked for a copy.",
  "Her date of birth, 3 March 1968, is on the account.",
];
/** m5: test data, places and counts (must pass). */
export const DATA_CONTROLS = [
  "Ship to the test address in TD-04.",
  "The address field takes up to 3 lines.",
  "Dates of birth are never stored in the Orders app.",
  "The Mill Lane studio is where G-02 trains.",
  "Kiln 2, Room 4 holds the stock.",
  "Step 3, Screen 2 shows the totals.",
  "Customer C-0001 is synthetic test data.",
  "The report lists 12 Street sales and 30 wholesale sales.",
];

/** m6: an answer key's private names (Brackenridge Labs, br-ops) in other spellings (must be caught). */
export const KEY_NAMES = ["Brackenridge Labs", "br-ops"];
export const KEY_NAME_SPELLINGS = [
  "Made with brackenridge labs' template.",
  "Made with Brackenridge-Labs' template.",
  "Made with BRACKENRIDGE_LABS' template.",
  "Made with BrackenridgeLabs' template.",
  "Made with brackenridgelabs' template.",
  "Run by BR OPS this week.",
  "Run by BR-OPS this week.",
  "Run by br_ops this week.",
];
export const KEY_NAME_CONTROLS = [
  "Bracken ferns line the path to the studio.",
  "Lab results come back on Tuesday.",
  "Open the ops report each Friday.",
  "Brush the glaze on in two coats.",
];

/** Owner decision 2026-10-20: another workstream's client name or slug in a client output (must be caught). */
export const OTHER_CLIENTS = [
  { slug: "fernhill-florists", client: "Fernhill Florists" },
  { slug: "quarry-bay-pottery", client: "Quarry Bay Pottery" },
];
export const OTHER_CLIENT_CATCH = [
  "The same steps work for Fernhill Florists.",
  "See fernhill-florists/runbook.md for a longer example.",
  "Quarry Bay Pottery uses this alert too.",
  "Copied from the quarry_bay_pottery handover.",
  "As we did at FERNHILL FLORISTS, keep the card short.",
  "QuarryBayPottery's deck had five slides.",
  "Fernhill's team liked the card format.",
];
/** The current client's own name, and ordinary words (must pass in a client output). */
export const OTHER_CLIENT_CONTROLS = [
  "Larkspur Ceramics' team trains in G-01.",
  "Fern-pattern plates ship on Tuesday.",
  "The quarry tiles are stocked in bay 4.",
  "Florists order in bulk before Easter.",
  "Pottery classes run on Saturdays.",
];

/** m10: a secrets-seen.log line whose session field carries more than the verb (must be caught), and the verb forms (must pass). */
export const SEEN_SESSION_CATCH = ["--session G-01 (value ends in 27)", "--session G-01, length 9", "-start; it was Kiln2027", "--checkin 14 password=hunter22"];
export const SEEN_SESSION_CONTROLS = ["--session G-01", "-start", "-write guides", "--checkin 14", "-capture", "--session TT-01"];
