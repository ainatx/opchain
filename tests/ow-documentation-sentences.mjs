// Sentence sets for the ow-documentation meaning checks (OW-05 contract C10, C11, C19).
// Written BEFORE any rule in scripts/ow-documentation-acceptance.mjs (controls first: OW-02
// R3-R4, OW-04, OW-09), and kept as permanent vitest cases: every CONTROL must pass (a false
// positive fails the suite), every PLANT must be caught. Owner decision D1: an internal number is
// OUR side only. D2: the checker is a regression net; the skill's self-check covers implied
// claims. Every name, value and figure here is invented.
//
// Not a test file itself: tests/ow-documentation-plants.test.js imports it.

/** C11, legitimate client sentences (>= 30, >= 10 of them runbook or handover numbers). */
export const C11_CONTROLS = [
  // Runbook and handover technical numbers (schedules, retries, timeouts, thresholds, ports, versions, retention as stated).
  "The import checks the orders mailbox every 15 minutes.",
  "If a purchase order cannot be read, the import retries 3 times, 5 minutes apart.",
  "The health check times out after 30 seconds.",
  "The service listens on port 8080 inside the container.",
  "Use Node 20 or later to run the tests.",
  "The run log keeps 90 days of runs, as the operations manager asked.",
  "An alert fires when no order has been imported for 2 hours on a weekday.",
  "The invoice push runs once a day at 18:00.",
  "Copies of the order sheet are kept for 30 days, as the client stated.",
  "The deploy takes about 4 minutes; the old version keeps running until the new one is healthy.",
  "Version 2.3.1 is the one running for the client.",
  "Restoring takes the order sheet back to the copy made at 02:00 each night.",
  "The CI run takes about 6 minutes on each push.",
  "The alert threshold is 5 unreadable emails in an hour.",
  "Retries stop after the third attempt, and the alert names the order.",
  // The client's volumes and figures, sessions, groups and dates.
  "About 40 orders a day arrive in the orders mailbox.",
  "The session runs from 10:00 to 12:00 on 17 February 2027.",
  "Allow two hours for the session, with a break at 11:00.",
  "Three groups of up to 15 people cover the 40 people quoted.",
  "Group G-02 meets on 24 February 2027.",
  "Your team settles about a third of the exceptions before 10:00.",
  "The bookkeeper checks the day's invoices, usually 25 to 30 of them.",
  "Finish modules M-01 to M-05 before the session.",
  "Each module takes about 10 minutes.",
  "The video for the exceptions list runs about 3 minutes.",
  "Check-ins fall on 3 March and 19 March 2027.",
  "Orders over $750 still go to the owner for approval.",
  "The documentation and training line is invoiced when the documents are delivered.",
  "Your QuickBooks Online sandbox holds 212 items.",
  "The exceptions list clears in under a minute when every code is known.",
  "Send a test order at 09:00 and expect it in the sheet by 09:15.",
  "Six people from three roles join the first group.",
];

/** C11, OUR side (each must be caught): the contract's plants. */
export const C11_PLANTS = [
  "I spent six hours on these guides.",
  "Each extra group is charged at the per-group add-on of USD 900.00.",
  "Extra coaching is billed at my usual rate.",
  "We put two full days into the deck.",
  "The handover ran well past what I had planned.",
];

/** C11 held-out, our side (>= 15), written before the rules and measured before and after. */
export const HELDOUT_OURS = [
  "Writing the runbook took me most of Thursday.",
  "We put two full days into the training deck.",
  "The facilitator guide took far longer than I had planned.",
  "These guides cost us more to write than the line brings in.",
  "A fourth group would be added at our per-group rate.",
  "Robin worked late twice to finish the handover.",
  "The video scripts ran past the effort I had budgeted.",
  "My margin on this training line is thin.",
  "The deck took us a day and a half.",
  "We are eating the cost of the extra screenshots.",
  "Each further group adds USD 900.00 at the price book's add-on.",
  "I logged 14 hours on the SOPs.",
  "The runbook came in at twice my own estimate.",
  "Training at this size runs at a loss for us.",
  "That rollout support is billed at 95 an hour.",
  "Capturing the screenshots ate up our whole Monday.",
];

/** C11 held-out, legitimate (>= 15), written before the rules and measured before and after. */
export const HELDOUT_LEGIT = [
  "The order import runs every 10 minutes from 07:00 to 19:00.",
  "Each lesson takes about 8 minutes to read.",
  "The backup job takes roughly 20 minutes each night.",
  "Your three groups meet on 17, 24 and 26 February 2027.",
  "The deploy to staging takes about 3 minutes.",
  "Up to 45 people can be trained in the three groups.",
  "The retry waits 15 minutes before the second attempt.",
  "Your bookkeeper reviews about 30 invoices a day.",
  "Keep the exported run log for 12 months, as the operations manager stated.",
  "The video lasts about 2 minutes.",
  "The test suite takes around 90 seconds.",
  "Session G-01 starts at 09:30 and ends at 11:30.",
  "Port 5432 is used by the database in the local setup.",
  "The alert fires after 3 failed pushes in a row.",
  "The import handled 1,140 invoices last year, by the client's count.",
  "Plan about an hour for the exercises in module M-03.",
];

/** C10 credentials: legitimate (>= 10) and planted. Secret NAMES pass; values and key shapes fail. */
export const CRED_CONTROLS = [
  "The import reads its key from SHOP_API_TOKEN.",
  "Rotate MAILBOX_PASSWORD in the hosting provider's secret settings.",
  "QBO_CLIENT_SECRET is set in the deploy settings, never in the repository.",
  "The user signs in with --sign-in in the capture browser's own window.",
  "Ask the operations manager for a new login; it is never sent by email.",
  "Use the payment provider's test mode for the exercise.",
  "The mailbox password lives in the hosting provider's secret settings.",
  "Secrets are named in `.env.example` with empty values.",
  "Each tester signs in with the account the operations manager created.",
  "A password was seen in a sprint file and was not copied; ask for it to be rotated.",
  "Enter the test card 4242 4242 4242 4242 in the sandbox only.",
  // Security review SD-04c (2026-10-19), written with the sign-in rule: sign-in sentences that hold no secret.
  "The admin sign-in is in the hosting provider's secret settings.",
  "Your login is the tester id OC-01 and a password the operations manager sends you.",
  "The sign-in is with the account the operations manager made for the session.",
  "Log in as the bookkeeper and open the day's invoices.",
];
export const CRED_PLANTS = [
  "The admin password is Kiln-Fire-2027!",
  // Token shapes are built at run time, so the repository never holds one (the commit gate's secret scan).
  `SHOP_API_TOKEN=${"sk"}_live_51HxYzAbCdEf0123456789`,
  "Sign in with ops / Glazier!88",
  "The mailbox lives at https://ops:Kiln2027@mail.larkspur.example/",
  `token: ${"gh"}p_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`,
  // Security review SD-04c (2026-10-19): a README instruction followed, the secret unlabelled.
  "The admin sign-in is ops-admin with kilnfire2027 for now.",
];

/** C10 people: roles, ids, system and place names, the client's business name and weekdays pass. */
export const PEOPLE_CONTEXT = { user: "Robin", people: ["Jess Arden", "Tomas Vey", "Lena Okafor", "Marta Quill"], client: "Larkspur Ceramics" };
export const PEOPLE_CONTROLS = [
  "The order coordinator OC-04 settles the exceptions list each morning.",
  "Attendance: operations manager OM-01, bookkeeper BK-02.",
  "Larkspur Ceramics runs the first group on Wednesday.",
  "Open QuickBooks Online and find the Monday invoices.",
  "Recorded by Robin on 17 February 2027.",
  "The client's trainer, operations manager ops-T1, runs groups G-02 and G-03.",
  "Orders from Portland arrive before 09:00.",
  "The Example Studio footer appears on every page.",
  "Tester oc-T1 found the exceptions list in session 1.",
  "| role | id | attended | competency check |",
  "Ask the shop manager on Friday.",
];
export const PEOPLE_PLANTS = [
  "Jess Arden attended the first session.",
  "| name | role | id |",
  "Contact the trainer at marta.quill@larkspur.example.",
  "Call the bookkeeper on 555-0142 if it fails.",
  "Trained by Tomas Vey on 17 February.",
];

/** C10 data: count and schedule tables and pointers pass; a table is judged by its content (OW-04 OD-7). */
export const DATA_CONTROLS = [
  "Use the five test purchase orders made for the capture.",
  "| group | roles | people | runs it |\n|---|---|---|---|\n| G-01 | order coordinator, operations manager, bookkeeper | 6 | user |",
  "| time | what |\n|---|---|\n| 10:00 | welcome |\n| 10:15 | demo: the exceptions list |",
  "Data: the test orders from SC-01, by their order numbers in the sandbox.",
  "| role | using it (count) | stuck on |\n|---|---|---|\n| bookkeeper | 2 | credit notes |",
  "Source: the exceptions list after SC-02; records: the lines on it; count: 1.",
  "| shot | step | image | state | note |\n|---|---|---|---|---|\n| SC-10-1 | SC-10 step 1 | shots/SC-10-1.png | cleared | looked at |",
  "Three records were created in the sandbox during the exercise; delete them after the session.",
  "| check | result |\n| --- | --- |\n| Trace | OK |",
  "The exercise uses the test order made for SC-07.",
  // Visa's published test card (ow-uat 1.0.2, owner decision 2026-10-19).
  "Pay with the published test card 4111 1111 1111 1111 in the sandbox.",
];
export const DATA_PLANTS = [
  "| customer | email | order |\n|---|---|---|\n| Harbor Florists | buyer@harbor.example | PO-55120 |",
  "Customer: Harbor Florists, 12 Quay Street",
  "Account 99120345 for Harbor Florists is the one to open.",
  // ow-uat 1.0.2 (owner decision 2026-10-19, merged from main): Visa's published 4111 1111 1111 1111 is test data; one digit off is not.
  "Use card 4111 1111 1111 1112 for the exercise.",
];

/** C19 approval controls (>= 10): an approval that names exactly what it approves passes. */
export const APPROVAL_CONTROLS = [
  { kind: "confirm", text: "Robin 2027-01-28: guides x3, sops x5, runbook, handover, deck, facilitator, modules x12, cards x3, videos x3; roles order coordinator, operations manager, bookkeeper; groups 1; trainer user", set: { guides: 3, sops: 5, runbook: 1, handover: 1, deck: 1, facilitator: 1, modules: 12, cards: 3, videos: 3, roles: ["order coordinator", "operations manager", "bookkeeper"], groups: 1, trainer: "user" } },
  // The clearance names the image's digest too (security review SD-03, 2026-10-19).
  { kind: "clear", text: `looked at in this session; confirmed by Robin 2027-02-01: shots/SC-10-1.png sha256:${"3a".repeat(32)}`, file: "shots/SC-10-1.png" },
  { kind: "clear", text: `looked at in this session; confirmed by Robin 2027-02-01: shots/SC-04-1a.png sha256:${"0f".repeat(32)}`, file: "shots/SC-04-1a.png" },
  { kind: "decision", value: { role: "operations manager", date: "2027-01-29", checks: ["AC-1.1", "AC-2.1"] }, captured: ["AC-1.1", "AC-2.1"] },
  { kind: "decision", value: { role: "operations manager", date: "2027-01-29", checks: ["AC-3.1"] }, captured: ["AC-3.1"] },
  { kind: "push", value: { by: "Robin", date: "2027-02-12", files: [{ file: "export/guides/bookkeeper.docx", destination: "google_docs" }] }, pushed: [{ file: "export/guides/bookkeeper.docx", destination: "google_docs" }] },
  { kind: "push", value: { by: "Robin", date: "2027-02-12", files: [{ file: "export/guides/bookkeeper.docx", destination: "google_docs" }, { file: "export/cards/bookkeeper.pdf", destination: "wiki" }] }, pushed: [{ file: "export/cards/bookkeeper.pdf", destination: "wiki" }] },
  { kind: "repo", text: "Robin 2027-02-12: branch docs/client-handbook; docs/client-handbook/order-coordinator.md, docs/handover/README.md", branch: "docs/client-handbook", files: ["docs/client-handbook/order-coordinator.md", "docs/handover/README.md"] },
  { kind: "trainer", value: { role: "operations manager", id: "ops-T1" } },
  { kind: "waiver", text: "waived: Accessible by construction by Robin 2027-02-12: \"no accessibility checker here; we run theirs\"", check: "Accessible by construction" },
  { kind: "waiver", text: "waived: Coverage by Robin 2027-02-12: \"the owner role is trained by the client\"", check: "Coverage" },
];
