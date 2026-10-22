// Must-pass controls and held-out sets for ow-handoff's meaning checks (OW-06 contract C19, C20, Test
// requirements). Not a test file: tests/ow-handoff-acceptance.test.js grades them. Everything is invented.
//
// Order of work: these sets were written and hashed (HELDOUT_DIGEST below) before ow-handoff's own layering on
// the imported rules (the frozen-figure allowance and the offer-term rule in scripts/ow-handoff-acceptance.mjs),
// then measured with the imported rules alone ("before") and with the layering ("after"). Key-shaped values are
// generated from parts at run time, so no key-shaped string is committed.
//
// Measured by tests/ow-handoff-measure.mjs (node tests/ow-handoff-measure.mjs), the build round, 2026-10-21:
//   internal numbers  controls passed before 31/32   after 32/32
//                     ours caught     before 17/18   after 18/18 ; legitimate passed before 18/20  after 20/20
//   credentials       values caught   15/15 ; controls passed 10/10   (imported rules; no layering)
//   people            names caught    9/10  ; controls passed 10/10   (imported rules; the miss is a UK mobile in
//                     "+44 7700 900123" form, ow-documentation's PHONE_WIDE: reported, not patched here)
//   other workstreams caught          10/10 ; controls passed 10/10   (the pinned #644 rule)
//   approvals         bad caught      10/10 ; good passed     10/10   (approvalProblem)
// Internal numbers, before: a tier price that did not match the frozen copy was missed, and the frozen hourly and
// urgent prices were false positives (one control, two legitimate sentences). The layering fixed those; its first
// draft let "We put 30 hours into the takeover check" through (30 is a frozen figure), so a sentence attributed to
// us never takes the frozen-figure allowance.

/** ≥ 30 client sentences that must pass No internal numbers; the first 12 are day counts, windows, business days and frozen terms. */
export const INTERNAL_CONTROLS = [
  "You have 30 days of fixes from the day you receive these notes.",
  "Your fixes run until 26 March 2027.",
  "The builder's access is removed on 23 March 2027, three business days before the window ends.",
  "Change order CO-04: 30 days from 9 February 2027, until 11 March 2027.",
  "Please decide by 23 March 2027 (provisional).",
  "Regular: 6 hours a month, a reply within 2 business days, 3000 a month.",
  "Light: 3 hours a month, a reply within 3 business days, 1500 a month.",
  "Full: 15 hours a month, a reply within 1 business day, 6000 a month.",
  "Hourly help: 1000 an hour; urgent work: 1200 an hour.",
  "Half of the unused hours roll over for one month; 30 days' notice.",
  "Care starts on 27 March 2027.",
  "The window ends on the later of the planned end and 30 days after delivery.",
  "The import runs every 15 minutes between 07:00 and 19:00.",
  "The invoice push retries 3 times before it alerts.",
  "About 40 orders arrive on a weekday.",
  "The alert fires after 5 unreadable order emails in an hour.",
  "The confirmation view opens on port 8080.",
  "You need Node 20 or later.",
  "The weekly report runs every Monday at 07:00.",
  "The deploy takes about 4 minutes.",
  "Six accounts are listed; two transfers are pending.",
  "FIX-01 and FIX-02 came from the punch list.",
  "AC-1.1 passed 10 of 10 cases on 26 January 2027.",
  "OP-08 rotates MAILBOX_PASSWORD; run OP-04 after it.",
  "The reorder spreadsheet keeps 12 months of reorders.",
  "Three alerts are configured: two in alerts.yaml and one on the hosting dashboard.",
  "The till export holds about 200 sales a week.",
  "The order sheet has one row per purchase order line.",
  "Signed on 27 January 2027 by the operations manager on request 2.",
  "Report a fix by email with what you saw and when.",
  "The service keeps run logs for 30 days, as the client stated.",
  "Booking paid; working demo paid; acceptance requested.",
];
/** Our side: each must be caught in a client output. */
export const INTERNAL_HELDOUT_OURS = [
  "I spent 14 hours on the handover.",
  "The notes took me two days to put together.",
  "Anything else is at my usual rate.",
  "This ran well past what I had planned.",
  "Our cost on the integration was higher than the line.",
  "The handover took us longer than we quoted.",
  "We put 30 hours into the takeover check.",
  "My margin on the build was thin.",
  "I billed 3.5 hours to this fix internally.",
  "It took me about 6 hours to chase the transfers.",
  "Our internal rate for this work is higher.",
  "We spent most of a week on the access list.",
  "Regular: 6 hours a month, a reply within 2 business days, 3600 a month.",
  "Hourly help: 1100 an hour.",
  "The care tier costs us more than it brings in.",
  "I worked late three nights on the operator notes.",
  "We ran 20 percent over our plan on the handoff.",
  "The price book puts this at a multiplier of 1.5.",
];
/** Legitimate client figures: each must pass. */
export const INTERNAL_HELDOUT_LEGIT = [
  "You have 30 days of fixes.",
  "The builder's access is removed on 23 March 2027.",
  "Regular: 6 hours a month, a reply within 2 business days, 3000 a month.",
  "Hourly help: 1000 an hour.",
  "The job runs at 06:00 every day.",
  "The push retries 3 times.",
  "About 60 invoices go out each month.",
  "The mailbox keeps 90 days of email.",
  "The repository has 2 branches: main and docs/client-handbook.",
  "Change order CO-04's fix period ends on 11 March 2027.",
  "Three business days before the window end.",
  "Care starts the day after 26 March 2027.",
  "The weekly report covers 7 days of sales.",
  "The hosting plan allows 3 deploys an hour.",
  "Five checks passed on build larkspur-uat-6.",
  "The alert waits 2 hours on a weekday.",
  "The reorder form saves up to 50 rows at once.",
  "Notice is 30 days.",
  "Half of the unused hours roll over for one month.",
  "Urgent work: 1200 an hour.",
];
/** Credential values (generated from parts, never committed whole): each must be caught. */
export const credentialValues = () => {
  const j = (...p) => p.join("");
  return [
    j("-----BEGIN ", "OPENSSH PRIVATE KEY-----"),
    j("-----BEGIN ", "RSA PRIVATE KEY-----"),
    j("AWS_SECRET_", "ACCESS_KEY=", "wJalrXUtnFEMI", "K7MDENGbPxRfi", "CYEXAMPLEKEYab"),
    j("SHOP_API_TOKEN (", "Zq8L", "mRw2", "Tn6V", "b4Xc", "9Pd1", "Hs7k", ")"),
    j("postgres://app:", "Gl4ze-Kiln-77", "@db.example.test:5432/orders"),
    j("https://ops:", "Kiln-Fire-2027", "@ci.example.test/"),
    j("eyJhbGciOiJIUzI1NiJ9", ".eyJzdWIiOiJvcHMifQ", ".dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    j("s", "k", "_", "li", "ve", "_", "Zq8Lm", "Rw2Tn6", "Vb4Xc9", "Pd1Hs7"),
    j("QBO_CLIENT_SECRET=", "Xk29", "LmQ8", "Rt4v", "Nz7w", "Pq3s"),
    j("MAILBOX_PASSWORD: ", "Kiln", "Glaze", "-", "2027", "!x"),
    j("The till token is ", "tk", "_8Jd2", "Lq9Wm", "3Xv7Rp", "1Zs4"),
    j("password: ", "Ceramic", "Kiln", "#88"),
    j("mongodb+srv://ops:", "Pq7-Rw2", "@cluster0.example.test/orders"),
    j("ghp", "_", "A1b2C3d4", "E5f6G7h8", "I9j0K1l2", "M3n4O5p6Q7"),
    j("xox", "b-", "1234567890", "-0987654321", "-AbCdEfGhIjKlMnOpQrStUvWx"),
  ];
};
/** Credential controls (names, pointers, published test data): each must pass. */
export const CREDENTIAL_CONTROLS = [
  "Rotate SHOP_API_TOKEN on the access-removal date.",
  "The value lives in the hosting provider's secret settings.",
  "Your password manager, entry Hosting.",
  "MAILBOX_PASSWORD and QBO_CLIENT_SECRET are named in .env.example.",
  "The secret's name is TILL_API_TOKEN; its value is never written here.",
  "Sign in with the operations manager's own account.",
  "Use the payment provider's published test card 4242 4242 4242 4242 in test mode only.",
  "The scan found one hit in config/settings.js at line 12 (generic-api-key).",
  "A password reset to the client's own email moves the recovery.",
  "The CI secret named DEPLOY_KEY is updated in the CI settings.",
];
/** People: each must be caught. */
export const PEOPLE_HELDOUT = [
  "Thanks to Jess Arden for the walk-through.",
  "Tomas Vey confirmed the transfer.",
  "Ask Lena Okafor about the till export.",
  "Mr. Whitfield signs the domain over.",
  "Call +44 7700 900123 if the import stops.",
  "Email ops.lead@larkspur.example for access.",
  "Priya Natarajan runs the reorder form.",
  "Dr. Abara owns the hosting account.",
  "Kenji will remove the test sender.",
  "Maria Delgado confirmed owner rights.",
];
export const PEOPLE_CONTROLS = [
  "The operations manager confirmed the transfer.",
  "The bookkeeper re-authorised the connection.",
  "The order coordinator reported FIX-03.",
  "Larkspur Ceramics owns the repository.",
  "Recorded by Robin.",
  "The shop manager confirmed completeness.",
  "QuickBooks Online holds the invoices.",
  "Monday's report reached the shop manager.",
  "The test sender account is removed.",
  "OC-04 tested the exceptions list.",
];
/** Another workstream's name and slug in Larkspur's client output, every spelling: each must be caught. */
export const OTHER_CLIENT_HELDOUT = [
  "The same setup as Mossgate Books.",
  "See handoffs/mossgate-books/ for the other one.",
  "As for Mossgate_Books.",
  "Like MossgateBooks.",
  "mossgate books had the same alert.",
  "MOSSGATE BOOKS chose care too.",
  "The Mossgate-Books runbook is similar.",
  "Mossgate's team uses the same host.",
  "the Mossgate deck covers this.",
  "mossgate.books has a reorder form.",
];
export const OTHER_CLIENT_CONTROLS = [
  "Moss grows on the gate.",
  "The books balance at month end.",
  "The business keeps its own records.",
  "The gate code is not in these notes.",
  "Larkspur Ceramics owns every account.",
  "logs/business/ is the consultant's own folder.",
  "The bookkeeper checks the books.",
  "Mossy stone tiles are a product line.",
  "A gated release is not used here.",
  "The reorder form saves each book order.",
];
const NOTE = "This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.";
/** Approvals: [kind, line, ok]. ≥ 10 controls (ok) and ≥ 10 bad, declines included. */
export const APPROVALS = [
  ["transfer", `2027-02-03 transfer TR-01: client has owner rights, confirmed by operations manager (as reported). ${NOTE}`, true],
  ["transfer", `2027-03-15 transfer TR-02: done, confirmed by bookkeeper (as reported). ${NOTE}`, true],
  ["check", `2027-02-03 account check Hosting: role owner, billing theirs, access list matches, recovery theirs, runs as the client; confirmed by operations manager (as reported). ${NOTE}`, true],
  ["complete", `2026-12-11 completeness: confirmed against repository host, hosting, domain and DNS, email sender, every vendor in quote.md, every integration in scope; by Robin and shop manager. ${NOTE}`, true],
  ["waive", `2027-03-20 waiver TR-01, The repository: not confirmed; confirmation requested 2027-03-10, 2027-03-15; waived by Robin. ${NOTE}`, true],
  ["waive", `2027-03-20 waiver AX-03, the sandbox grant: not confirmed; confirmation requested 2027-03-12; waived by Robin; but not AX-04. ${NOTE}`, true],
  ["choice", `2027-03-05 choice: care, tier Regular; decided_on 2027-03-05; recorded_by Robin; care start: the day after window_end (2027-03-27); ow-care: not installed (the user, 2027-03-05). ${NOTE}`, true],
  ["choice", `2027-03-08 choice: hourly; decided_on 2027-03-08; recorded_by Robin. ${NOTE}`, true],
  ["go-ahead", `2027-03-10 go-ahead 2027-03-09 by operations manager, as reported. ${NOTE}`, true],
  ["choice", `2027-03-09 choice: none; decided_on 2027-03-09; recorded_by Robin. ${NOTE}`, true],
  ["transfer", "2027-02-03 transfer TR-01: done.", false],
  ["transfer", `2027-02-03 transfer: confirmed. ${NOTE}`, false],
  ["check", `2027-02-03 account check Hosting: approved. ${NOTE}`, false],
  ["check", `2027-02-03 account check Hosting: role owner, billing theirs; confirmed by operations manager (as reported). ${NOTE}`, false],
  ["complete", `2026-12-11 completeness: confirmed against repository host, hosting, email sender; by Robin. ${NOTE}`, false],
  ["waive", `2027-03-20 waiver: approved. ${NOTE}`, false],
  ["waive", `2027-03-20 waiver TR-01: waived by Robin. ${NOTE}`, false],
  ["choice", `2027-03-05 choice: care. ${NOTE}`, false],
  ["go-ahead", `2027-03-10 go-ahead. ${NOTE}`, false],
  ["go-ahead", "2027-03-10 go-ahead 2027-03-09 by operations manager, as reported.", false],
];

/** sha256 of the held-out sets (JSON of the arrays, credential values excluded: they are generated). A change to any set fails a test; write a new set for a new round instead. */
export const HELDOUT_DIGEST = "27d998ae3b6bb0af8f45621228be6553649b775d9bbc5a007bd44bc77ec24de9";
