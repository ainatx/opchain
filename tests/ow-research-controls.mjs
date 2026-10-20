// ow-research must-pass controls (OW-09 contract, Test requirements: "Controls
// written before the rules"). Written and committed before any rule in
// scripts/ow-research-acceptance.mjs existed, and never edited to fit a rule:
// a rule that flags one of these is wrong, not the control. Every query,
// URL and line here is invented, or names a public official source from the
// skill's own open list.
//
// The context is the family's invented client, Larkspur Ceramics, as its
// research fixtures carry it: the keep-out list its question.md records, the
// staff names its workspace files give (the fixture's canaries), and lines
// copied from those files. Query privacy is keyed on whose material it is
// (owner decision D1, contract C10): vendor and product names are capitalised
// and may be queried, so there is no capitalised-word rule.

/** The query context the controls and the held-out set are measured in. */
export const CTX = {
  keepOut: ["Larkspur Ceramics", "Larkspur", "LC Studio", "larkspurceramics.example.com"],
  // Canaries: the people the client's files name. People are kept out by category; these catch a bare first name.
  names: ["Jess", "Dana", "Priya", "Marcus"],
  // Lines from the client's workspace files (intake record, workshop transcript, evidence, inbox).
  clientTexts: [
    "A purchase order came in by email as a PDF. Jess, our order coordinator, opens it and types it line by line into our order sheet. That's a shared Google Sheet.",
    "Customers write the SKUs every which way, so every Monday Jess goes through the sheet and fixes the codes by hand.",
    "nobody confirms anything until the bookkeeper has it in QuickBooks",
    "Every purchase order comes in as a PDF attachment, never in the email body",
    "If a code doesn't match anything, I'd want it to stop and ask a person",
    "Priya, our owner. She signs off on anything over, I think, five thousand dollars?",
  ],
  // Our own figures: the shared invented price book's fees and unit prices (tests/fixtures/ow-build-plan/workspace).
  ourAmounts: [500, 600, 800, 900, 1000, 1200, 1500, 2000, 3000, 4000, 4500, 8000, 14000],
};

/** Query privacy: must pass (C10, at least 30). The generic description's words, vendor and product names, industry terms, regions, size bands. */
export const QUERY_PASS = [
  "point of sale API daily sales export by product",
  "Quillfeather POS API sales line items product code",
  "Quillfeather POS API rate limit requests per minute",
  "cloud point-of-sale system export sales to spreadsheet",
  "small ceramics studio retail shop inventory sync",
  "12-person ceramics studio wholesale order processing software",
  "QuickBooks Online import invoices from spreadsheet",
  "purchase orders by email PDF data extraction tools",
  "wholesale pottery business order management Oregon",
  "SKU normalization product codes written several ways",
  "Google Sheets point of sale integration",
  "point of sale webhook new sale event",
  "POS API OAuth read-only scope sales",
  "handmade goods wholesale order volume small business",
  "10 to 25 employee manufacturer order entry automation",
  "Quillfeather developer documentation sales endpoint",
  "Quillfeather status page API outages",
  "Quillfeather partner app marketplace requirements",
  "best practices matching customer item codes to SKUs",
  "order coordinator manual data entry industry survey",
  "operations manager approval workflow for large purchase orders",
  "ceramics industry association small studio survey",
  "state sales tax rules for wholesale ceramics in Oregon",
  "record retention rules for customer orders small business",
  "bookkeeper reconciling point of sale and accounting software",
  "inventory counts by product code retail POS export CSV",
  "automation consultants service pages for small manufacturers",
  "API rate limit 120 requests per minute pagination",
  "how to read sales by product code from a POS API",
  "Larkin pottery glaze suppliers",
  "studio shop and wholesale orders in one spreadsheet",
  "lark bunting pottery motif",
];

/** Our side in queries (O8, at least 15): market questions with no figure of ours. Must pass. */
export const OUR_SIDE_PASS = [
  "average day rate for automation consultants in the US",
  "how do small consultancies price fixed scope projects",
  "typical cost of a point of sale integration project",
  "price of QuickBooks Online plans for small business",
  "competitor workflow automation packages and prices",
  "what do bookkeeping firms charge per month small business",
  "freelance developer rates survey 2026",
  "support retainer pricing models for software consultancies",
  "how many hours does a POS integration usually take",
  "Quillfeather POS pricing tiers API access",
  "software consultancy profit margin benchmarks",
  "markup on resold software licences typical",
  "change order pricing practices small software projects",
  "fixed fee versus hourly billing small consultancy",
  "cost of manual order entry per order industry benchmark",
  "time to implement inventory sync for small retailers",
];

/** The URL rule: must pass (C7, at least 15). Vendor doc subdomains, government hosts, an IDN in punycode, `?page=2`, fixture hosts. */
export const URL_PASS = [
  "https://developer.quillfeather.example.com/api/v2/reference/sales",
  "https://developer.quillfeather.example.com/api/limits",
  "https://docs.vendor.example.org/guide?page=2",
  "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C",
  "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
  "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
  "https://xn--bcher-kva.example.com/katalog",
  "https://forum.pos-users.example.net/t/quillfeather-sales-totals/123",
  "https://blog.retail-tools.example.org/pos-to-spreadsheet",
  "https://status.quillfeather.example.com/",
  "https://example.com/",
  "https://www.nist.gov/cyberframework",
  "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r3.pdf",
  "https://shop.example.net/products?sort=price&lang=en",
  "https://raw.githubusercontent.com/usnistgov/oscal-content/main/README.md",
  "https://developer.quillfeather.example.com/api/v2/reference/sales#line-items",
  "https://api-docs.example.com/v1.2/rate-limits",
  "https://a.b.c.example.org/x",
  "https://10x.example.com/",
  "https://www.example.com:443/page",
];

/** No credentials: must pass (C15, at least 10). Placeholders and the words in prose are not credentials. */
export const CREDENTIAL_PASS = [
  "Authorization: Bearer YOUR_API_KEY",
  "Send your API key in the X-Api-Key header.",
  "api_key=<your key>",
  "Set QF_TOKEN to <token> before calling.",
  "Use an access token with the sales:read scope.",
  "The password must be at least 12 characters.",
  "Rotate keys every 90 days.",
  "curl -H \"Authorization: Bearer $QF_TOKEN\" https://developer.quillfeather.example.com/api/v2/sales",
  "client_secret: <client secret>",
  "token: none",
  "An API key looks like qf_live_ followed by 32 letters and digits.",
  "[credential-shaped text not copied]",
  "The sample key on the page reads qf_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
];
