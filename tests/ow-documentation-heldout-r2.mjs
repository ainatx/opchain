// The Generator's held-out sets for the ow-documentation 1.0.1 fixes (the OW-05 follow-ups: evaluation round 2's
// m1 to m7 and owner decision OD-1 of 2026-10-21). Written on 2026-10-21, BEFORE any rule changed in
// scripts/ow-documentation-acceptance.mjs, and measured once against the checker at dcb2eb75 (before) and once
// after the fixes; its sha256 is in the PR body and docs/plans/2026-10-16-ow-documentation-design.md §13.7. It is
// never tuned: a miss after the fixes is reported, not patched in silence. Every name, value, address and figure
// here is invented. Vendor-shaped token literals are written as joined strings, so no whole one is in the file.
// Not a test file: tests/ow-documentation-eval-r2.test.js imports it.

/** m1: a free-worded claim that something was done, appended to a refusal or no-op screen (must be caught). */
export const SCREEN_CLAIMS = [
  "Both cards are in place in export/cards/.",
  "The update went out to the client this morning.",
  "Training record filed under docs/larkspur-ceramics/.",
  "OK: the runbook export is complete.",
  "Your check-in answers are stored in adoption.md.",
  "Moved the deck to the Ops handbook folder.",
  "We've already shared the SOPs with the operations manager.",
  "The repo copy has been placed on docs/client-handbook.",
  "  Also generated Word copies of every guide.",
  "INFO: the delivery date is now set to 15 February 2027.",
  "The guides got published to the wiki.",
  "Handover published; the developer can start.",
  "Everything in export/ is up to date now.",
  "Rollout closed as of today.",
];
/** m1: text appended to the screen's own Refused: or Nothing to do: line (must be caught). */
export const REFUSED_LINE_CLAIMS = [
  " The guides were exported anyway.",
  " I recorded the delivery date as well.",
  " G-04 is added to the plan regardless.",
  " The day 14 notes are saved.",
  " Pushed the runbook to the wiki first.",
  " The waiver went through.",
  " Saved a copy just in case.",
  " Your answers have been kept in docs.yaml.",
  " Export done for the guides only.",
  " The rollout is now closed.",
];
/** m1: lines a refusal or no-op screen may print (must pass). */
export const SCREEN_CONTROLS = [
  "Record the delivery date with -delivered once the documents reach the client.",
  "The rollout closes on 26 March 2027; run --close then.",
  "CO-05 needs the client's signature before G-04 can be added.",
  "uat.yaml has no production decision for this environment.",
  "The facilitator guide is the file to fix; export again after that.",
  "Nothing was pushed, exported or delivered in this run.",
  "The documents reach the client only after you confirm each push.",
  "Capture runs against the test environment, as uat.yaml records.",
  "The waiver you typed names No credentials, which is never waived.",
  "Day 30's check-in opens on 18 March 2027.",
  "The bookkeeper guide still has one placeholder: SC-12 step 2.",
  "When CO-05 is signed, say -rollout --add-group CO-05.",
];
/** m1: text after the Refused: line's first sentence that only explains (must pass). */
export const REFUSED_LINE_CONTROLS = [
  " Ask the client to sign it first.",
  " The check-in can be recorded from that date.",
  " Fix the file, then export again.",
  " Nothing changes until then.",
];

/** OD-1: a one-word client of another workstream, in its exact forms (must be caught in a client output). */
export const ONE_WORD_CLIENTS = [
  { slug: "bloom", client: "Bloom" },
  { slug: "anchor", client: "Anchor" },
  { slug: "tessellate", client: "Tessellate" },
];
export const ONE_WORD_CATCH = [
  "We built the same order sheet for Bloom last spring.",
  "Bloom's bookkeeper checks invoices the same way.",
  "Copied from the Bloom team's runbook.",
  "The Anchor rollout used three groups as well.",
  "As in the Anchor handover, deploys run from main.",
  "Layout taken from docs/anchor/guides/bookkeeper.md.",
  "See opchain-work/plans/bloom/ for the earlier map.",
  "Tessellate uses the same QuickBooks Online export.",
  "Tessellate's SOPs list the same exception path.",
  "Ask how the Tessellate project handled refunds.",
  "The guides for Anchor ran to six pages.",
];
/** OD-1: the same words used as ordinary words (must pass). */
export const ONE_WORD_CONTROLS = [
  "Glazes bloom in the second firing.",
  "A white bloom on the glaze means it cooled too fast.",
  "Drop anchor bolts into the shelving before loading.",
  "The anchor link jumps to the Settings section.",
  "Tessellate the tiles before you photograph the set.",
  "Fern and bloom patterns sell best in spring.",
  "Tessellated tiles need a grout line of 2 mm.",
  "Each anchor in the guide links to a task.",
  "The blooming glaze is batch GL-14.",
  "Anchors hold the shelving to the wall.",
];

/** m2a: folders under opchain-work/ that are no client, and their words in a client output (must pass). */
export const NON_CLIENT_FOLDERS = [
  "opchain-work/research/frameworks/soc2/manifest.md",
  "opchain-work/logs/business/decisions.md",
  "opchain-work/research/business/notes.md",
];
export const NON_CLIENT_CONTROLS = [
  "Two test frameworks run in CI.",
  "The frameworks folder in the repository holds the test setup.",
  "Business hours are 9:00 to 17:00.",
  "The operations manager is on call in business hours only.",
  "Frameworks change less often than the app.",
  "A business day ends at 17:00.",
  "The business rules live in the order sheet.",
  "Testing frameworks are listed in the README.",
  "The business owner signs the sheet.",
  "Framework updates ship monthly.",
];

/** m2c: a name or slug written with dots (must be caught). The answer key's names here: Halvorsen Labs, north-star. */
export const DOTTED_OTHER_CATCH = [
  "See mossgate.books for the layout.",
  "Copied from Mossgate.Books' deck.",
  "As in fernhill.florists, the card is one page.",
  "The FERNHILL.FLORISTS runbook has the same alert.",
  "The guide follows mossgate.books.guides.",
];
export const DOTTED_KEY_CATCH = [
  "Made with halvorsen.labs templates.",
  "Built on the north.star kit.",
  "Built on the NORTH.STAR kit.",
  "Made with HALVORSEN.LABS templates.",
  "Made with Halvorsen . Labs templates.",
];
export const DOTTED_CONTROLS = [
  "Books close. Mossy glazes ship on Monday.",
  "Open books.md for the layout.",
  "The north star of this guide is one task per page.",
  "Labs open at 9. Halve the batch when it is cold.",
  "The florists.csv sheet is the test data.",
  "Fern. Hill. Gate. are the three shelf labels.",
  "Use north.example for the test origin.",
  "The kiln's star rating is on the card.",
  "Mossgate is a street name in the test data.",
  "Visit books.example to see the sample.",
];

/** m3: Larkspur's documentation_price (4000) in a client document, forms round 2 did not try (must be caught). */
export const PRICE_DOC = [
  "The documentation and training line is four thousand even.",
  "Documentation and training came in at 4,000.",
  "The training line: 4 thousand.",
  "The documentation line costs EUR 4.000,00.",
  "Training and documentation, €4,000.",
  "The line for documentation is 4,000/-.",
  "The documentation and training line was USD 4000.",
  "We priced the documentation at 4000.",
  "Training is quoted at 4,000 for the three groups.",
  "The line for the guides and training is 4,000.",
];
/** m3: client figures with 4000 or 4,000 that are not our price (must pass). */
export const PRICE_CONTROLS = [
  "Invoices over 4,000 need the operations manager's approval.",
  "Purchase orders above 4,000 need two sign-offs.",
  "Refunds of more than 4,000 go to the bookkeeper.",
  "Supplier quotes over 4,000 need a second quote.",
  "Credit notes over 4,000 are checked twice.",
  "Order totals above 4,000 trigger a deposit request.",
  "The charge limit on the shop card is 4,000 a month.",
  "Payments of 4,000 or more need a second approver.",
  "The import's cost limit is 4000 API calls a day.",
  "Invoiced orders reach 4,000 in a busy month.",
];
/** m3: a docs.yaml line under scope: whose value is the price (must be caught). */
export const PRICE_YAML = [
  "documentation_cost: 4000",
  "fee: 4000",
  "total: 4000",
  "value: \"4,000\"",
  "line_total: 4000.00",
  "charge: 4000",
  "budget: 4000",
  "documentation: 4000",
  "sku_amount: 4000",
  "billing: { amount: 4000 }",
];
/** m3: docs.yaml lines that hold 4000 inside another value (must pass). */
export const PRICE_YAML_CONTROLS = [
  "note: about 4,000 orders a month",
  "origin_note: the test origin listens on 4000 locally",
  "orders_per_month: 3200",
  "rows_limit_note: up to 4000 rows per import",
  "groups_note: three groups of up to 15",
  "sku_note: the price stays in contract-inputs.md",
  "volume: 40000",
  "batch: LC-4000",
  "max_rows: 400",
  "version: 4.0.0",
];

/** m4: credential shapes (must be caught). */
export const CRED_CATCH = [
  "Publish with " + "npm_" + "Q7wE2rT9yU4iO1pA6sD3fG8hJ5kL0zX2cV7b.",
  "Authorization: Basic " + "a2lsbi1vcHM6Rmlyay0yMDI3IQ==",
  "Authorization: Bearer " + "eyJhbGciOiJIUzI1NiJ9" + ".eyJzdWIiOiJvcHMifQ.Q2xheTIwMjdLaWxu",
  "Alerts post to https://hooks.slack" + ".com/services/T0K1L2N3M/B4P5Q6R7S/" + "Zq8Wx3Vb6Nm1Lk4Jh7Gf2Ds5",
  "The Discord alert URL is https://discord.com/api/webhooks/" + "112233445566778899/" + "Kiln-Alert_9fQ2LmZ8sT4vW1xY6bN3cR7d",
  "Google Maps key: " + "AIza" + "SyB7kQ2mN9pR4tV6wX8zA1cD3fG5hJ0lM2n",
  "Mailgun key " + "key-" + "3f9a1c7e5b2d8f4a6c0e9b1d7f3a5c8e",
  "The SAS link ends ?sv=2024-05-04&sig=" + "Lq8%2Bz3Vb6Nm1Lk4Jh7Gf2Ds5Aq9Wx3Vb6Nm1Lk4%3D",
  "mongodb+srv://orders:" + "Kiln-Glaze-2027" + "@cluster0.larkspur.example/shop",
  "PGPASSWORD=Stoneware88 psql -h db.larkspur.example",
];
/** m4: names, placeholders and headers without a value (must pass). */
export const CRED_CONTROLS = [
  "Authorization: Bearer $API_TOKEN",
  "Authorization: Basic <base64 of user:password>",
  "The Slack webhook URL is in the hosting provider's secret settings.",
  "SLACK_WEBHOOK_URL is set in the hosting dashboard.",
  "npm publish uses the NPM_TOKEN secret.",
  "Alerts post to https://hooks.slack.com/services/<team>/<bot>/<secret>.",
  "The session token expires after 15 minutes.",
  "Basic authentication is off in production.",
  "The header is Authorization: Bearer <token>.",
  "PGPASSWORD is read from the environment.",
];

/** m5: people not on the key's list, in shapes round 2 named (must be caught). */
export const PEOPLE_CATCH = [
  "Ask Corvin Ashdale for the stockroom key.",
  "Thaddeus Moor runs the Monday import.",
  "Wren Calloway and Idris Fenn attended G-02.",
  "Sent by Oriel Marsh on Tuesday.",
  "Contact: Bexley Arundel.",
  "The trainer, Linnea Varga, leads G-01.",
  "Quill Harrow approved the layout.",
  "Jory Penhallow will cover the stockroom.",
  "Speak to Ffion Treharne before changing prices.",
  "Signed off by Ottilie Grange.",
];
/** m5: capitalised words that are not people, in the same shapes (must pass). */
export const PEOPLE_CONTROLS = [
  "Ask Accounts Payable for the code.",
  "QuickBooks Online runs the nightly sync.",
  "Shop Floor and Kiln Room attended G-03.",
  "Order Coordinators attended G-02.",
  "Larkspur Ceramics attended the demo.",
  "Cloud Scheduler runs the import at 06:00.",
  "Ask Customer Service for the refund form.",
  "Google Drive holds the exports.",
  "The Monday Import runs at 06:00.",
  "Sent by Order Desk on Tuesday.",
];
/** m5: a customer's data in prose (must be caught by the data check). */
export const DATA_CATCH = [
  "Brightwater Interiors, a customer since 2021, owes 3,480.",
  "The customer's account is 5521-7730-0094.",
  "Account 3390-1145-7782 belongs to a wholesale buyer.",
  "The real invoice from Granite & Gable (INV-88213) is the template.",
  "Use the real order PO-77104 from Cedar Row Tiles.",
  "Customer: Ashgrove Florist, balance 912.40.",
  "Kestrel Supply Ltd still owes 2,100 from March.",
  "Their account number is 4410 2287 9931.",
  "The order from Pell & Rowe Ltd (PO-40291) shipped late.",
  "The real customer list goes in column B.",
];
/** m5: test data, counts and pointers (must pass). */
export const DATA_CONTROLS = [
  "Test customer TC-02 owes 120 in the test data.",
  "Account numbers look like 0000-0000-0000 in the sample.",
  "PO numbers are five digits.",
  "Purchase orders come from the Orders Mailbox.",
  "About 30 wholesale accounts owe money at month end.",
  "Larkspur Ceramics owes nothing to the hosting provider.",
  "The sample order SO-0001 is synthetic.",
  "See the test data's TD-03 for a customer with a balance.",
  "The report lists accounts by id, never by name.",
  "Version 2.1.0 of the order sheet changed the account column.",
];

/** m6: an edit to runbook.md in a -write runbook run after delivered.md (must be caught; nothing but a new gap's guide is written then). */
export const POST_DELIVERY_RUNBOOK_EDITS = [
  { what: "a new entry appended", find: "## Open items", put: "### OP-11: The label printer is offline\n\n- **When:** the label_print_failed alert fires\n- **Check:** the printer's status page\n- **Do:** restart the printer\n- **If that fails:** call the hosting provider\n- **Source:** alerts.yaml: label_print_failed\n\n## Open items" },
  { what: "an entry's Do line edited", find: "- **Do:** ", put: "- **Do:** first, " },
  { what: "an entry retired", find: "### OP-01: ", put: "### OP-01 (retired 2027-02-16): " },
  { what: "a setting added", find: "## Settings", put: "## Settings\n\n- The label printer's queue holds 50 jobs. [user-confirmed 2027-02-16]" },
  { what: "an open item added", find: "## Open items", put: "## Open items\n\n- The label printer's vendor console was not checked." },
  { what: "the title reworded", find: "# Runbook: Larkspur Ceramics", put: "# Runbook: Larkspur Ceramics (updated)" },
  { what: "a line removed from Settings", find: "## Settings\n", put: "## Settings\n<!-- trimmed -->\n" },
  { what: "an entry's Check line edited", find: "- **Check:** ", put: "- **Check:** in the morning, " },
  { what: "an entry's If that fails line edited", find: "- **If that fails:** ", put: "- **If that fails:** after two tries, " },
  { what: "a section added at the end of the client part", find: "## Open items", put: "## Contacts\n\n- The operations manager, by role.\n\n## Open items" },
];

/** m7: the Delivered screen's ow-handoff-notes It will read: line changed (must be caught). */
export const DELIVERED_READS_EDITS = [
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, docs.yaml, deliveries.yaml"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, docs.yaml, deliveries.yaml, secrets-seen.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, deliveries.yaml, secrets-seen.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, docs.yaml, secrets-seen.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, handover/, docs.yaml, deliveries.yaml, secrets-seen.log"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "the documents"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log (values included)"],
  ["runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log", "runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log, price-book.yaml"],
];
