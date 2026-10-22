// Sentence sets for the ow-draft meaning checks (OW-10 contract C18 to C21 and C23). Written BEFORE any rule in
// scripts/ow-draft-acceptance.mjs (controls first: OW-02 R3-R4, OW-04, OW-09, OW-05), and kept as permanent vitest
// cases: every CONTROL must pass in every kind it names (a false positive fails the suite), every PLANT must be caught.
// Owner decision CD1: an internal number is OUR side only; the client's figures, research figures about the market and
// third parties' published prices are allowed. CD2: the checker is a regression net; the skill's same-session
// self-check covers implied claims. Every name, value, figure and address here is invented.
//
// Each entry is a string or { s, kinds }: `kinds` limits where it is planted (client = a client deliverable,
// marketing, internal, comms = client comms). Without it, an entry is planted in every kind its check applies to.
// The figures the rules compare with are the fixtures' own: the shared invented price book (with the world's 480
// care plan), Larkspur's quote appendix and quote-items.json. Not a test file: tests/ow-draft-plants.test.js imports it.

/** C19, our figures: legitimate sentences (>= 30, >= 10 of them technical numbers). */
export const OURS_CONTROLS = [
  // Technical numbers: statute periods, market prices of others, the client's volumes, sheet values, percentages
  // from sources, versions and dates.
  "The State of Example's statute requires each order record to be kept for at least four years after the sale.",
  "One compliance summary site says most states require seven years.",
  "Keep each record for 4 years from the date of the sale.",
  "Brightloop Studio publishes support from $350 a month with 3 hours included.",
  "The import runs every 15 minutes during opening hours.",
  "About 40 purchase orders arrive by email each day.",
  "The sheet totals 212 order lines for September.",
  "28% of the sampled orders arrived by phone, as the client's own count shows.",
  "Version 2.4 of the order sheet added the exceptions column.",
  "The statute text is current through the 2026 regular session.",
  "Retention starts on 1 January 2027 for orders placed after that date.",
  "The cost comparison uses the client's own figures for October 2026.",
  { s: "Orders over 4,000 need the owner's approval [E-03].", kinds: ["client"] },
  // The client's figures, people counts and dates.
  "Your team of 12 handles about 300 orders a week in spring.",
  "Six people join the first session on 3 March 2027.",
  "The review covers the quarter from July to September 2026.",
  "Phone orders are about a third of the volume.",
  "Email purchase orders now reach the order sheet the same day.",
  "The weekly email replaces the standing call from 2 November 2026.",
  "Monday's clean-up took your order coordinator about two hours before the change.",
  "Your bookkeeper checks 25 to 30 invoices a day.",
  // Opinions and recommendations, worded as the author's view, with no figure of ours.
  "We recommend keeping every order record for four years, the statute's period.",
  "In our view, the summary site's seven-year figure is too general to rely on.",
  "We suggest a yearly check of the statute text after each regular session.",
  "I would keep the phone orders on the order sheet until the spring rush ends.",
  // Market figures that are not ours.
  "Most studios in one paid directory charge between 300 and 700 a month.",
  "A care plan of 5 hours is common in the published plans we found.",
  "Published support plans start at $350 a month.",
  "One studio lists 3 included hours on its plan.",
  "Retention periods in the summary site's table run from 3 to 10 years.",
  "The directory lists 14 studios.",
  "Prices in the directory were current on 18 October 2026.",
];

/** C19, our figures: the contract's plants (each must be caught where the kind is checked). */
export const OURS_PLANTS = [
  "This report took me about 40 hours to put together.",
  "We spent 40 hours on this.",
  "The care plan is at my usual rate.",
  "At my usual rate, the review would be quick.",
  "Our margin on this work is about 30%.",
  "The memo ran well past what I had planned.",
  { s: "A care plan of 480 dollars a month covers the basics.", kinds: ["client", "comms"] },
  { s: "The care plan costs 480.00 a month.", kinds: ["client", "comms"] },
  { s: "The care plan costs four hundred eighty a month.", kinds: ["client", "comms"] },
  { s: "The care plan is 0.48k a month.", kinds: ["client", "comms"] },
  { s: "A report view adds 600 to the work.", kinds: ["client", "comms"] },
  { s: "The confirmation view was 8,000 of the work.", kinds: ["client", "comms"] },
  { s: "The extra session would be 175 per session.", kinds: ["client", "comms"] },
];

/** C20, credentials: legitimate sentences (>= 10): names, where a secret lives, placeholders, published test data. */
export const CRED_CONTROLS = [
  "The order import reads its token from the SHOP_API_TOKEN setting.",
  "The mailbox password lives in the hosting provider's secret settings.",
  "Set API_KEY=<your key> before the first run.",
  "Use the payment provider's published test card 4242 4242 4242 4242 in test mode only.",
  "Ask the operations manager to rotate the bookkeeping system's access token.",
  "The invoices sync signs in with its own service account, not a person's.",
  "Your API key is never written in this report.",
  "Keep secrets out of the order sheet; the sheet holds order lines only.",
  "WEBHOOK_SECRET is set in the hosting provider's settings, never in the repository.",
  "A token that has leaked is revoked and a new one issued.",
  "The `.env.example` file lists every setting by name, with no values.",
  "Passwords are changed every 90 days under the client's policy.",
];
/** C20, credentials: the must-catch shapes OW-05 missed, built from parts at run time (push protection). */
const J = (...parts) => parts.join("");
export const CRED_PLANTS = [
  J("-----BEGIN ", "RSA PRIVATE KEY-----"),
  J("AWS_SECRET_ACCESS_KEY=", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLE", "KEY"),
  J("The QBO_CLIENT_SECRET (currently ", "Qx7tR2mN9vB4kL8pW3zY", ") is in the settings."),
  J("npm_", "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"),
  J("Authorization: Basic ", "b3BzLWFkbWluOmtpbG5maXJlMjAyNw=="),
  J("Post alerts to https://hooks.chat.example.com/services/", "T0123ABCD/B0456EFGH/", "xYz9AbC8dEf7GhI6jKl5MnO4"),
  J("The status page is at https://ops-admin:", "kilnfire2027", "@status.larkspur.example/"),
  J("ey", "JhbGciOiJIUzI1NiJ9.", "eyJzdWIiOiJvcHMtYWRtaW4ifQ.", "c2lnbmF0dXJlLXZhbHVlLWhlcmU"),
  J("The payment key is sk_", "live_", "51HxQ2bK7mN4pR8tV3wY6zA9cE2fG5h"),
];

/** People and the business: who the people rules know (C18). */
export const PEOPLE_CONTEXT = { user: "Robin", business: "Example Studio", people: ["Dana Whitlock", "Jess Arden"] };
/** C18, personal data: legitimate sentences (>= 10): roles, the business's own name, places, product names. */
export const PEOPLE_CONTROLS = [
  "The order coordinator settles the exceptions list each morning.",
  "Your operations manager approves orders over the threshold.",
  "Example Studio wrote this memo for the client owner.",
  "The bookkeeper posts the day's invoices before 18:00.",
  "Orders from the Riverside shop arrive by email.",
  "The client owner decided on 13 October 2026 that email orders come first.",
  "The statute is published by the State of Example.",
  "The new exceptions list sits beside the order sheet.",
  "Your client ops lead sends last week's purchase orders as examples.",
  "Robin prepared this review.",
  "Contact the client owner through the usual channel.",
  "The glaze line in the spring catalog sells fastest.",
];
/** C18, personal data: plants (OW-05's untuned shapes included). */
export const PEOPLE_PLANTS = [
  "Dana Whitlock runs the shop.",
  "Bram de Vries and Lotte Jansen attended.",
  "Ask Jamal Ortiz before you change the sheet.",
  "Write to orders.manager@larkspur.example with questions.",
  "Call the shop on +1 512 555 0147 to confirm.",
];

/** C18, client data in marketing: plants and controls. */
export const DATA_PLANTS = [
  "Order PO-48213 from a wholesale customer arrived on 2 October.",
  "One customer, Anjali Patel, ordered 40 mugs.",
  "The customer's email, buyer@harborgifts.example, was on every order.",
  "Ship to 14 Kiln Street, Riverside.",
];
export const DATA_CONTROLS = [
  "A wholesale order arrives as a PDF attached to an email.",
  "About 40 orders a day reach the order sheet.",
  "Each order line keeps the product code and the quantity.",
  "Orders are confirmed to the customer the day they arrive.",
  "A test order, TD-01, is used to check the flow.",
  "The exceptions list shows the product code that matched nothing.",
  "The sheet holds one row per order line.",
  "Customers who phone their orders in stay on the order sheet for now.",
  "No customer's details appear in this case study.",
  "The studio sends about 300 orders a week in spring.",
];

/** C20, private names (any spelling) and other workstreams (owner rulings 2026-10-20 and 2026-10-21). */
export const PRIVATE_PLANTS = [
  "Prepared with llc ops.",
  "Prepared with llc-ops.",
  "Prepared with LLC_Ops.",
  "Deftwright prepared this.",
  "A Deft wright report.",
  "DEFT-WRIGHT notes.",
];
export const OTHER_PLANTS = [
  { s: "This is the approach Mossgate Books took last year.", kinds: ["comms"] },
  { s: "See mossgate-books for the earlier memo.", kinds: ["comms"] },
  { s: "The Mossgate_Books memo set the pattern.", kinds: ["comms"] },
  { s: "The mossgate.books memo set the pattern.", kinds: ["comms"] },
  { s: "Bloom's team does this differently.", kinds: ["client", "comms"] },
  { s: "The Bloom team does this differently.", kinds: ["client", "comms"] },
  { s: "Unlike Bloom, the studio keeps four years.", kinds: ["client", "comms"] },
  { s: "Larkspur Ceramics keeps its records for four years.", kinds: ["client"] },
  { s: "Fernhill Florists asked the same question.", kinds: ["client", "comms"] },
  { s: "The kestrel-bindery folder has the template.", kinds: ["client", "comms"] },
];
export const OTHER_CONTROLS = [
  "The glaze will bloom in the second firing.",
  "Spring bloom orders peak in March.",
  "Use test frameworks for the order import.",
  "Orders arrive during business hours.",
  "Your business keeps its records for four years.",
  "A kestrel nests near the Riverside shop.",
  "The research frameworks folder is not a client.",
  "Fern and hill plants ship in the spring.",
  "Moss and gate fittings are listed in the catalog.",
  "Bloom-time pricing is the client's own.",
];

/** C18, Naming in marketing (decision 6): a client named, quoted or shown only with a matching permission. */
export const NAMING_PLANTS = [
  "Larkspur Ceramics cut its order entry time in half.",
  "\"We stopped retyping orders,\" says Larkspur Ceramics.",
  "Larkspur's order coordinator now settles exceptions before 10:00.",
  "We worked with Larkspur Ceramics on its order flow.",
  "Bloom's team asked for the same flow.",
];
export const NAMING_CONTROLS = [
  "A 12-person ceramics studio cut its order entry time in half.",
  "A small studio's order coordinator now settles exceptions before 10:00.",
  "Example Studio builds order flows for small makers.",
  "The client owner chose email orders first.",
  "A wholesale maker in the Riverside area asked for the same flow.",
  "Purchase orders now reach the order sheet without retyping.",
  "The bookkeeper no longer retypes invoices.",
  "We build flows like this one for small studios.",
  "The glaze will bloom after the second firing.",
  "Ceramics studios often take orders by email and phone.",
];

/** C21, approvals and confirmations, graded on what was approved (contract C21: >= 10 controls, declines included). */
export const APPROVAL_CONTROLS = [
  { kind: "signoff", text: "read and approved by Robin on 2026-10-24, as stated; not verified by this skill", want: { candidate: "C-2", user: "Robin" }, line: "C-2" },
  { kind: "client", text: "approved by client owner on 2026-10-26, as reported", want: { candidate: "C-1", role: "client owner" }, line: "C-1" },
  { kind: "voice", text: "approve voices/client.md sha256:1111111111111111111111111111111111111111111111111111111111111111", want: { file: "voices/client.md", digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111" } },
  { kind: "waiver", text: "waive Brief fit on C-1 because the memo is shorter on purpose", want: { check: "Brief fit", candidate: "C-1" } },
  { kind: "waiver", text: "waive Brief fit on C-1 but not Voice: the length is on purpose", want: { check: "Brief fit", candidate: "C-1", not: ["Voice"] } },
  { kind: "waiver", text: "waive No internal numbers on C-1 for 480: Northpine's published price, not ours", want: { check: "No internal numbers", candidate: "C-1", figures: ["480"] } },
  { kind: "push", text: "yes: export/C-1/order-record-retention.pdf -> shared_drive (Mossgate / Memos); export/C-1/order-record-retention.docx -> shared_drive (Mossgate / Memos)", want: { files: ["export/C-1/order-record-retention.pdf", "export/C-1/order-record-retention.docx"] } },
  { kind: "permission", text: "Larkspur Ceramics permits its name, by the client owner, on 2026-10-25, until 2027-10-25", want: { what: "name", role: "client owner", date: "2026-10-25" } },
  { kind: "round", text: "600 is a market figure: the directory's upper end", want: { figure: "600" } },
  { kind: "repo", text: "write case-study.md into src/content/blog/ on branch draft/case-study", want: { branch: "draft/case-study", files: ["case-study.md"] } },
  { kind: "brief", text: "kind marketing, type document, audience small makers, key message \"orders stop being retyped\", destination blog", want: { kind: "marketing", type: "document", key_message: "orders stop being retyped", destination: "blog" } },
  { kind: "signoff", text: "read and approved by Robin on 2026-10-27, as stated; not verified by this skill", want: { candidate: "C-3", user: "Robin" }, line: "C-3" },
];
/** C21: the contract's plants (each refused). */
export const APPROVAL_PLANTS = [
  { kind: "signoff", text: "read and approved by Robin on 2026-10-24, as stated; not verified by this skill", want: { candidate: "C-2", user: "Robin" }, line: "C-1" },
  { kind: "voice", text: "approve the voice", want: { file: "voices/client.md", digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111" } },
  { kind: "waiver", text: "waive Voice on C-1", want: { check: "Brief fit", candidate: "C-1" } },
  { kind: "push", text: "yes: export/C-1/a.pdf -> shared_drive (X); export/C-1/b.pdf -> shared_drive (X); export/C-1/c.pdf -> shared_drive (X)", want: { files: ["export/C-1/a.pdf", "export/C-1/b.pdf", "export/C-1/c.pdf", "export/C-1/d.pdf"] } },
  { kind: "signoff", text: "approved", want: { candidate: "C-1", user: "Robin" }, line: "C-1" },
];

/** C23: the contract's named free-worded claims and controls on refusal, no-op and question screens. */
export const SCREEN_PLANTS = [
  "NOTE: Exported the memo",
  "Refused: C-2 has a FINDING. Signed off anyway.",
  "Your post is live",
  "Pushed to the shared drive",
  "The client approved it",
  "Published to the blog folder",
  "Your waiver is noted and the check is skipped",
  "Pushed blog.md; confirm the rest?",
];
export const SCREEN_CONTROLS = [
  "Record the client's approval with -signoff C-2 --client.",
  "Delivery needs a signed-off candidate.",
];
