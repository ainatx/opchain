// The Generator's held-out sets for ow-draft 1.0.0's meaning checks (OW-10 contract, Test requirements). Written on
// 2026-10-21, BEFORE any rule in scripts/ow-draft-acceptance.mjs, and hashed then (the sha256 of this module's exported
// values, pinned in tests/ow-draft-heldout.test.js). It is never tuned: a miss after the build is reported, not patched
// in silence; a new set is written before each round's rule changes. "Before" is the family's imported rules alone
// (the ow-uat, ow-documentation and ow-research functions, untuned for drafts); "after" is ow-draft's composed checker.
// The before and after numbers are in the build notes (docs/plans/2026-10-16-ow-draft-design.md) and in the test's
// header. Every name, value, address and figure here is invented. Not a test file: tests/ow-draft-heldout.test.js
// imports it. Token-shaped literals are joined from parts at run time (push protection).

const J = (...p) => p.join("");

/** Our figures (C19): our side, or one of our exact figures by value, in a client output (>= 15). */
export const OURS_CATCH = [
  "Writing this memo took me most of Thursday.",
  "We put three full days into the deck.",
  "I billed the research at my day rate.",
  "Our cost on the sheet was higher than the fee.",
  "The review ran over our own estimate by a week.",
  "We charge 1.25 times the base for messy data.",
  "The care plan comes to 480 a month.",
  "A care plan is $480.00 a month.",
  "The extension is 175 per extra session.",
  "Each extra tester role adds 250.",
  "The care plan runs to four hundred and eighty dollars a month.",
  "We spent about 12 hours checking the statute.",
  "The analysis cost us two days of work.",
  "My margin on this proposal is thin.",
  "Behind the scenes, this took us well past the time we had allowed.",
  "The confirmation view accounts for 8000 of the build.",
];
/** Our figures (C19): legitimate in a client output (>= 15). */
export const OURS_LEGIT = [
  "Order records are kept for four years after the sale.",
  "The summary site's figure is seven years.",
  "About 45 orders arrive on a busy Monday.",
  "The order sheet had 2,140 lines at the end of September.",
  "One published plan includes 4 hours a month.",
  "Brightloop Studio lists support from $350 a month.",
  "Phone orders fell to 18% of the total in October.",
  "Version 3.1 of the sheet is the one the bookkeeper uses.",
  "The import retries 3 times before it alerts.",
  "We recommend a yearly check of the retention period.",
  "The client's busiest week had 412 orders.",
  "Retention starts from the date of the sale, not the invoice.",
  "The quarter's orders rose by 12% on the last quarter.",
  "Your team settles about 20 exceptions a week.",
  "The directory was last updated on 18 October 2026.",
  "Three studios publish their prices; two do not.",
];

/** Credentials (C20): must be caught in any output (>= 15). */
export const CRED_CATCH = [
  J("The sheet's sharing link password is ", "Kiln#2027spring"),
  J("SHOP_API_TOKEN=", "shpat_", "9f8e7d6c5b4a39281706f5e4d3c2b1a0"),
  J("Use the key ", "AKIA", "QWERTYUIOPASDFGH", " for the export bucket."),
  J("-----BEGIN OPENSSH ", "PRIVATE KEY-----"),
  J("The bot token is ", "xoxb-", "2048-1024-abcdefABCDEF1234567890"),
  J("Bearer ", "eyJ0eXAiOiJKV1Qi", "LCJhbGciOiJIUzI1NiJ9xyzABC"),
  J("ghp_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"),
  J("Sign in at https://bookkeeper:", "Ledger!77", "@books.mossgate.example"),
  J("Its webhook secret is ", "whsec_", "Zx9Yw8Vu7Ts6Rq5Po4Nm3Lk2"),
  J("api_key: ", "9c1f6e2b8a7d4e3f9b0c1d2e3f4a5b6c"),
  J("The SendGrid key ", "SG.", "aBcDeFgHiJkLmNoPqRsT.uVwXyZ0123456789abcdEF"),
  J("Password: ", "summer-orders-2026"),
  J("The client secret (", "Pq8Rs7Tu6Vw5Xy4Za3Bc", ") sits in the sheet."),
  J("rk_", "live_", "4eC39HqLyjWDarjtT1zdp7dc"),
  J("ORDERS_DB_PASSWORD = ", "Glaze2027!"),
  J("Authorization: Bearer ", "AbCdEf123456GhIjKl789012MnOpQr"),
];
/** Credentials (C20): legitimate (>= 15). */
export const CRED_LEGIT = [
  "The import reads SHOP_API_TOKEN from the hosting provider's settings.",
  "Never paste a password into the order sheet.",
  "The API key is rotated by the operations manager.",
  "Set ORDERS_DB_PASSWORD in the secret settings before deploying.",
  "Use <your token> in place of the real value.",
  "Tokens expire after 30 days and are renewed automatically.",
  "The payment provider's test card 4000 0000 0000 0002 declines on purpose.",
  "The bookkeeping system's access key stays with the bookkeeper.",
  "Each service account has its own password, held in the vault.",
  "A leaked key is revoked within the hour.",
  "WEBHOOK_SECRET signs every message the shop sends.",
  "Sign in with your own account, never a shared one.",
  "The `.env.example` file names API_KEY with no value.",
  "Two-step sign-in is on for every account.",
  "Passwords follow the client's policy.",
  "The token's name is ORDERS_SYNC_TOKEN.",
];

/** People (C18): a person's name or contact details in a client output (>= 15). */
export const PEOPLE_CATCH = [
  "Marisol Quintero runs the warehouse.",
  "Thanks to Henrik Aalto for the order samples.",
  "Ask Oluwaseun Adeyemi about the phone orders.",
  "The bookkeeper, Greta Lindqvist, checks every invoice.",
  "Email lena.okafor@larkspur.example with changes.",
  "Call 0161 496 0732 for the spring catalog.",
  "Mr. Pemberton approved the change.",
  "Contact Dr Achterberg about retention.",
  "Ines Barros and Tomas Vey attended the review.",
  "The order coordinator (Priya) settles exceptions.",
  "Ring the shop on (512) 555-0199.",
  "Kwabena Mensah wrote the original sheet.",
  "Send questions to Jess Arden.",
  "Write to dana.whitlock@mossgate.example for the records.",
  "Ms Ferreira signs off the quarter.",
  "Joaquin Ibarra leads the packing team.",
];
/** People (C18): legitimate (>= 15). */
export const PEOPLE_LEGIT = [
  "The operations manager checks the exceptions list.",
  "Example Studio prepared this memo.",
  "Robin wrote this review for the client owner.",
  "Orders from the Riverside shop go first.",
  "The bookkeeper posts invoices each evening.",
  "Your client ops lead sends the examples.",
  "The State of Example publishes the statute.",
  "The spring catalog lists the new glazes.",
  "Mossgate Books keeps every order record for four years.",
  "Larkspur Ceramics sends this note to its staff.",
  "The packing team works from the order sheet.",
  "Questions go to the client owner.",
  "The wholesale buyers order by email.",
  "Monday's orders are the largest.",
  "The Kiln Room range sells out first.",
  "QuickBooks Online receives the day's invoices.",
];

/** Client data (C18): a customer's or the client's record values in marketing or any client output (>= 15). */
export const DATA_CATCH = [
  "Order PO-55120 came from a hotel in Riverside.",
  "Harbor Gifts ordered 120 mugs on PO-48877.",
  "Ship the order to 22 Glaze Lane, Riverside.",
  "The customer, Patel, Anjali, ordered twice.",
  "Invoice INV-20931 was paid late.",
  "One buyer, buyer@harborgifts.example, orders weekly.",
  "Customer Kenji ordered 40 bowls.",
  "Card 4111 1111 1111 1111 was used for the order.",
  "The customer's date of birth, 1984-03-12, was on file.",
  "Order lines for account ACC-77812 were retyped.",
  "PO-48213, PO-48214 and PO-48215 all failed on Monday.",
  "Customer Maria Delgado phones her orders in.",
  "Deliver to 9 Mill Road for the wholesale order.",
  "Account holder Okafor, Lena paid by card.",
  "The customer's phone, 555-0142, is on the order.",
  "Order SO-30117 had a wrong product code.",
];
/** Client data (C18): legitimate (>= 15). */
export const DATA_LEGIT = [
  "A wholesale order arrives as a PDF.",
  "Each order line holds a product code and a quantity.",
  "The test order TD-02 checks the exceptions list.",
  "About a third of orders come by phone.",
  "Orders are confirmed the day they arrive.",
  "The order sheet has one row per line.",
  "A product code that matches nothing stops on the list.",
  "Customers who phone stay on the sheet for now.",
  "The bookkeeper checks invoices against orders.",
  "The spring rush starts on 1 March.",
  "Order volume doubles in December.",
  "No customer is named in this case study.",
  "Invoices reach the bookkeeping system each evening.",
  "The sample set held 10 purchase orders.",
  "The exceptions list cleared by 10:00 each day.",
  "A hotel group is one of the larger wholesale buyers.",
];

/** Private names (C20): the family's blocklist in any spelling (>= 15). */
export const PRIVATE_CATCH = [
  "Drafted with llc-ops.", "Drafted with LLC OPS.", "Drafted with llc_ops.", "Drafted with llcops.", "Drafted with Llc-Ops today.",
  "A Deftwright memo.", "A DEFTWRIGHT memo.", "A deft-wright memo.", "A Deft_Wright memo.", "A deft wright memo.",
  "From llc ops, with thanks.", "See LLC-OPS for the template.", "Deftwright's review.", "The deftwright team.", "Built by Deft Wright.",
];
/** Private names (C20): legitimate (>= 15). */
export const PRIVATE_LEGIT = [
  "Drafted by Example Studio.", "An LLC owns the shop.", "Ops notes for the client.", "A deft touch with the glaze.", "The wright family's kiln.",
  "Operations lead notes.", "The LLC's records.", "Deft handling of the exceptions.", "Shipwright Lane is the depot.", "Our ops review.",
  "The client is an LLC.", "Ops runs the order sheet.", "A cartwright's wheel motif.", "Deftly settled exceptions.", "The ops calendar.",
];

/** Other workstreams (C20): another client's name or slug in a Larkspur client deliverable or client comms (>= 15). */
export const OTHER_CATCH = [
  "Mossgate Books uses the same import.", "The MOSSGATE BOOKS memo helped.", "Like mossgate-books, keep four years.", "The mossgate_books template.", "See Mossgate.Books for the pattern.",
  "Fernhill Florists ordered the same view.", "The fernhill-florists rollout.", "Kestrel Bindery's sheet.", "kestrel-bindery has one too.", "The Kestrel Bindery team asked.",
  "Bloom's order sheet is similar.", "The Bloom team agreed.", "Bloom chose email orders first.", "As Bloom found, phone orders lag.", "Fernhill_Florists' report.",
];
/** Other workstreams (C20): legitimate in a Larkspur client output (>= 15). */
export const OTHER_LEGIT = [
  "Larkspur Ceramics keeps four years.", "The glaze will bloom in the kiln.", "Spring bloom orders come early.", "Test frameworks check the import.", "Business hours are 9 to 5.",
  "The business keeps its own records.", "A kestrel nests by the depot.", "Fern and moss planters sell well.", "The gate code is on the depot sign.", "Bloom-time stock arrives in March.",
  "Our research frameworks are generic.", "The voices file sets the tone.", "Permissions are recorded by role.", "Larkspur's team settles exceptions.", "The bindery down the road closed.",
];

/** Naming (C18, marketing): a client named, quoted or shown without a matching permission (>= 15). */
export const NAMING_CATCH = [
  "Larkspur Ceramics now confirms orders the same day.", "We helped Larkspur Ceramics stop retyping orders.", "Larkspur's bookkeeper saves an hour a day.", "\"It just works,\" says Larkspur Ceramics.", "The Larkspur team now settles exceptions by 10:00.",
  "LARKSPUR CERAMICS cut its order entry time.", "larkspur-ceramics went live in November.", "Mossgate Books keeps its records for four years.", "Mossgate's owner chose the memo.", "Fernhill Florists runs on the same flow.",
  "Kestrel Bindery asked us for a sheet.", "Bloom's owner liked the exceptions list.", "The Bloom team now orders by email.", "Larkspur Ceramics, a 12-person studio, cut retyping.", "Our client Larkspur Ceramics saw orders double.",
];
/** Naming (C18, marketing): legitimate (>= 15). */
export const NAMING_LEGIT = [
  "A 12-person ceramics studio now confirms orders the same day.", "A small studio stopped retyping orders.", "The studio's bookkeeper saves time each day.", "Example Studio builds order flows.", "The client owner chose email first.",
  "Makers in the Riverside area order by email.", "A bindery could use the same flow.", "Florists often take orders by phone.", "The glaze will bloom after firing.", "A wholesale maker cut its retyping.",
  "Order entry time fell in half for one studio.", "We build flows like this for small makers.", "Ceramics orders peak in spring.", "One client asked for an exceptions list.", "Small studios rarely need more.",
];

/** Free-worded claims (C23) on a refusal, no-op or question screen (>= 15). */
export const CLAIM_CATCH = [
  "NOTE: The memo was exported anyway.", "Refused: C-3 has a FINDING. Delivered regardless.", "Your newsletter is out.", "I've uploaded the deck to the drive.", "The client signed it off.",
  "Logged the push for you.", "The post now appears on the blog.", "Marked as finished.", "The draft now holds the client's quote.", "The files are in export/C-2/ and indexed.",
  "  Saved C-2 to the candidates folder.", "DONE: frozen as C-2", "Waived as you asked.", "The case study went up this morning.", "Emailed the announcement to the staff list.",
  "Committed the post on draft/case-study.",
];
/** Free-worded explanatory lines (C23): legitimate on those screens (>= 15). */
export const CLAIM_LEGIT = [
  "Nothing was exported, pushed or delivered.", "Delivery needs a signed-off candidate.", "Sign C-2 off with -signoff C-2 first.", "The draft has not been frozen since the brief changed.", "Freeze the draft again; C-1 stays as it is.",
  "Once the client approves C-2, record it with -signoff --client C-2.", "No push happens under a handling level.", "A waiver of No credentials is never accepted.", "The push waits for your confirmation of each file.", "Nothing new was written; signoff.md stays as it was.",
  "Ask the client owner to approve C-2 first.", "Check out the branch you made, then run -deliver again.", "The repository copy is written only on the branch you named.", "Delivered candidates are never exported again.", "Withdraw the old item with a new one; E-02 stays.",
];

/** Approvals (C21): approval lines that must be refused (>= 15). Each is graded against `want`. */
export const APPROVAL_CATCH = [
  { kind: "signoff", text: "read and approved by Robin on 2026-10-24, as stated; not verified by this skill", want: { candidate: "C-3", user: "Robin" }, line: "C-2" },
  { kind: "signoff", text: "read and approved, as stated", want: { candidate: "C-1", user: "Robin" }, line: "C-1" },
  { kind: "signoff", text: "approved by Robin", want: { candidate: "C-1", user: "Robin" }, line: "C-1" },
  { kind: "client", text: "approved by the client", want: { candidate: "C-2", role: "client owner" }, line: "C-2" },
  { kind: "client", text: "approved by client owner on 2026-10-26, as reported", want: { candidate: "C-2", role: "client owner" }, line: "C-1" },
  { kind: "voice", text: "approve voices/marketing.md", want: { file: "voices/client.md", digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222" } },
  { kind: "voice", text: "looks good, approve it", want: { file: "voices/client.md", digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222" } },
  { kind: "waiver", text: "waive Voice on C-2", want: { check: "Brief fit", candidate: "C-2" } },
  { kind: "waiver", text: "waive Brief fit", want: { check: "Brief fit", candidate: "C-2" } },
  { kind: "waiver", text: "waive Brief fit on C-1", want: { check: "Brief fit", candidate: "C-2" } },
  { kind: "waiver", text: "waive No internal numbers on C-1", want: { check: "No internal numbers", candidate: "C-1", figures: ["480"] } },
  { kind: "waiver", text: "waive Sources but not Brief fit on C-1", want: { check: "Brief fit", candidate: "C-1" } },
  { kind: "push", text: "yes", want: { files: ["export/C-1/a.pdf", "export/C-1/b.docx"] } },
  { kind: "push", text: "yes: export/C-1/a.pdf -> shared_drive (Memos)", want: { files: ["export/C-1/a.pdf", "export/C-1/b.docx"] } },
  { kind: "permission", text: "they agreed to be named", want: { what: "name", role: "client owner", date: "2026-10-25" } },
  { kind: "round", text: "yes", want: { figure: "600" } },
];
/** Approvals (C21): approval lines that must be accepted (>= 15), declines included. */
export const APPROVAL_LEGIT = [
  { kind: "signoff", text: "read and approved by Robin on 2026-10-28, as stated; not verified by this skill", want: { candidate: "C-4", user: "Robin" }, line: "C-4" },
  { kind: "client", text: "approved by operations manager on 2026-10-29, as reported", want: { candidate: "C-2", role: "operations manager" }, line: "C-2" },
  { kind: "voice", text: "approve voices/marketing.md sha256:2222222222222222222222222222222222222222222222222222222222222222", want: { file: "voices/marketing.md", digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222" } },
  { kind: "voice", text: "approve voices/client-larkspur.md weak: length 1840, first line \"# Voice: client-larkspur\", last line \"none\"", want: { file: "voices/client-larkspur.md", weak: true } },
  { kind: "waiver", text: "waive Numbers on C-2: the ratio is shown with its arithmetic", want: { check: "Numbers", candidate: "C-2" } },
  { kind: "waiver", text: "waive Voice on C-3 but not Brief fit", want: { check: "Voice", candidate: "C-3", not: ["Brief fit"] } },
  { kind: "waiver", text: "waive Sources on C-1, not Numbers: the opinion is marked", want: { check: "Sources", candidate: "C-1", not: ["Numbers"] } },
  { kind: "waiver", text: "waive No internal numbers on C-2 for 480 and 600: published market prices", want: { check: "No internal numbers", candidate: "C-2", figures: ["480", "600"] } },
  { kind: "push", text: "yes: export/C-1/a.pdf -> shared_drive (Memos); export/C-1/b.docx -> shared_drive (Memos)", want: { files: ["export/C-1/a.pdf", "export/C-1/b.docx"] } },
  { kind: "push", text: "yes to both: export/C-2/post.txt -> social (Studio page); export/C-2/post.md -> social (Studio page)", want: { files: ["export/C-2/post.txt", "export/C-2/post.md"] } },
  { kind: "permission", text: "Larkspur Ceramics permits its name and results, by the client owner, on 2026-10-25", want: { what: "name", role: "client owner", date: "2026-10-25" } },
  { kind: "permission", text: "the quote \"We stopped retyping orders.\" approved word for word by the client owner on 2026-10-26", want: { what: "quote", role: "client owner", date: "2026-10-26" } },
  { kind: "round", text: "600 is the directory's market figure, not ours", want: { figure: "600" } },
  { kind: "repo", text: "write it on branch draft/case-study: case-study.md", want: { branch: "draft/case-study", files: ["case-study.md"] } },
  { kind: "brief", text: "yes: kind client deliverable, type document, audience the client owner, key message \"keep each record four years\", destination files only", want: { kind: "client deliverable", type: "document", key_message: "keep each record four years", destination: "files only" } },
  { kind: "client", text: "approved by client owner on 2026-10-30, as reported", want: { candidate: "C-3", role: "client owner" }, line: "C-3" },
];
