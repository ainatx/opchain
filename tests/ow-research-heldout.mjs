// ow-research held-out sets (OW-09 contract, C7 and C10: "a held-out set,
// written before the rules and measured before and after every round").
// Written and committed with the controls, before any rule existed, and frozen:
// never edited to fit the rules. tests/ow-research-acceptance.test.js reports
// each set's rates and pins them as measured, so a later change that moves
// them is visible. Every query and URL is invented, or names a public official
// source from the skill's own open list. Measured in the context CTX of
// tests/ow-research-controls.mjs.
//
// Before the rules (no detector): Query privacy flagged 0 of 16 must-flag and
// passed 16 of 16 must-pass; the URL rule refused 0 of 16 must-flag and passed
// 16 of 16 must-pass. The after-rules numbers are in the acceptance test.

/** Query privacy: must be flagged (keep-out terms in any spelling, people, pasted client text, our own numbers). */
export const QUERY_HELDOUT_FLAG = [
  "larkspur ceramics point of sale",
  "Larkspur-Ceramics quillfeather account",
  "larkspurceramics wholesale orders",
  "site:larkspurceramics.example.com shop hours",
  "LC Studio pottery reviews",
  "jess order coordinator ceramics studio",
  "Priya owner ceramics business approval limit",
  "dana@larkspurceramics.example.com",
  "ceramics studio contact 503-555-0147",
  "every Monday Jess goes through the sheet and fixes the codes",
  "customers write the SKUs every which way so",
  "nobody confirms anything until the bookkeeper has it",
  "is 95 an hour too low for pos integration work",
  "we charged 4200 for a quickbooks sync fair price",
  "Ms Rivera ceramics studio owner",
  "larkspur_ceramics api key",
];

/** Query privacy: must pass. */
export const QUERY_HELDOUT_PASS = [
  "pottery studio point of sale with wholesale accounts",
  "Quillfeather POS sales API pagination",
  "Quillfeather API authentication read only key scopes",
  "small ceramics business order sheet automation",
  "email PDF purchase order parsing accuracy",
  "QuickBooks Online invoice API create invoice",
  "retail point of sale end of day sales report export",
  "wholesale order SKU variants normalisation",
  "typical hourly rate for integration consultants",
  "automation consultancy pricing pages",
  "ceramics trade association member survey 2026",
  "Oregon business records retention requirements",
  "point of sale vendor changelog API deprecation",
  "how long does a QuickBooks integration take",
  "Quillfeather webhooks new sale event",
  "studio shop sales by product code daily CSV",
];

/** The URL rule: must be refused. */
export const URL_HELDOUT_FLAG = [
  "https://2130706433/",
  "https://0177.0.0.1/",
  "https://0x7f.0.0.1/",
  "https://[0:0:0:0:0:ffff:7f00:1]/",
  "https://[fe80::1%25en0]/",
  "https://169.254.169.254/latest/meta-data/",
  "https://kubernetes.internal./",
  "https://nas.home.arpa/",
  "https://wiki.corp/",
  "https://hidden.onion/",
  "https://127-0-0-1.sslip.io/",
  "https://c0a80001.nip.io/",
  "https://admin:pw@vendor.example.com/",
  "https://vendor.example.com:8080/docs",
  "https://vendor.example.com/export?token=abcdef123456",
  "HTTP://VENDOR.EXAMPLE.COM/",
];

/** The URL rule: must pass. */
export const URL_HELDOUT_PASS = [
  "https://developer.vendor.example.com/reference/orders",
  "https://statutes.example.org/title-12/chapter-4",
  "https://xn--caf-dma.example.net/menu",
  "https://docs.example.com/search?q=rate+limits&page=3",
  "https://example.org/a/b/c.html",
  "https://status.vendor.example.net/incidents/2026-10",
  "https://community.example.net/t/12345",
  "https://www.ecfr.gov/current/title-45/part-164",
  "https://csrc.nist.gov/projects/cybersecurity-framework/filters",
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
  "https://v2.api.example.com/docs",
  "https://1password-alternatives.example.com/",
  "https://cdn.example.com/files/report-2026.pdf",
  "https://help.example.org/articles/oauth-scopes#read-only",
  "https://example.com/tokenizer-guide",
  "https://example.net/docs?section=keys",
];
