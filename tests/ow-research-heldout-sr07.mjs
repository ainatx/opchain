// ow-research held-out set for our own numbers in a query (security review SR-07; owner decision
// 2026-10-19 on O8). Written and measured before the by-value rule and before any change to the
// our-side rules, and frozen: never edited to fit a rule. (One commit per round, so it lands with the rule.) tests/ow-research-acceptance.test.js
// reports the rates and pins them as measured.
//
// The owner's reading of O8: a market question ("typical hourly rate for bookkeeping") may be
// searched; a query that reveals OUR OWN numbers may not, attributed or not. A figure that appears in
// the workstream's own internal files (the price book, the quote's internal appendix, the ledger, the
// margin view) is blocked by value, in whatever form it is written. A shape rule for un-attributed
// figures ("estimate 40 hours", "35% margin") is adopted only if it blocks no market control.
//
// Every query is invented. The internal files are the invented Larkspur Ceramics fixtures below; the
// figures in them are invented too (owner decision D3: no real prices).
//
// Before the rule (Query privacy as merged with #626's our-side rules, in the controls' context CTX):
// 1 of 18 must-flag flagged ("180 an hour …", by the rate shape), 20 of 20 must-pass passed. The
// after-rule numbers are in the acceptance test.

/** The workstream's own internal files the by-value rule reads, as the fixtures hold them (repo-relative). */
export const SR07_INTERNAL_FILES = [
  "tests/fixtures/ow-build-plan/workspace/opchain-work/price-book.yaml",
  "tests/fixtures/ow-build-plan/unpriced-package/expected/opchain-work/plans/larkspur-ceramics/quote.md",
  "tests/fixtures/ow-build-plan/unpriced-package/expected/opchain-work/plans/larkspur-ceramics/quote-items.json",
  "tests/fixtures/ow-build/invoice-booking/expected/opchain-work/builds/larkspur-ceramics/ledger.md",
  "tests/fixtures/ow-build/update/expected/opchain-work/builds/larkspur-ceramics/margin.md",
];

/** Our own numbers, with no first-person word: must be flagged. */
export const SR07_HELDOUT_FLAG = [
  // A figure from the internal files, in some form.
  "is 2,500 reasonable for an email to spreadsheet integration",
  "data clean-up across a sheet and quickbooks 1900 cheap",
  "uat extra session 175 normal for consultants",
  "internal tool with a confirmation view 8k too much",
  "fixed price 17,450 for small manufacturer automation fair",
  "pos integration 31 hours over budget common",
  "180 an hour for automation work too low",
  "milestone share 5,200 against 5,580 burn normal",
  "1.25 multiplier for messy data in integration pricing",
  "booking deposit 6980 on a software project",
  // A figure of ours that is in no file, said without "we" or "our".
  "consultancy contingency 15% on integration quotes",
  "estimated 60 hours for a quickbooks connector reasonable",
  "retainer 650 monthly for small business automation support",
  "2x markup on resold pos hardware normal",
  "inventory dashboard project price 9,500 fair",
  "is a 25 percent margin ok for it consulting",
  "charging 1,800 for a sales report dashboard",
  "three day estimate for a pos api connector realistic",
];

/** Market questions, some with figures that are not ours: must pass. */
export const SR07_HELDOUT_PASS = [
  "typical hourly rate for bookkeeping",
  "average hourly rate for integration consultants 2026",
  "how many hours does a quickbooks integration take on average",
  "typical markup on resold pos hardware",
  "average contingency percentage on fixed price software projects",
  "pos systems with a 14 day free trial",
  "top 10 inventory apps for small retailers",
  "35 percent of small retailers still use spreadsheets survey",
  "quickbooks online plans compared 2026 prices",
  "retail pos for shops with 500 products",
  "20 to 50 employee manufacturer order automation",
  "pos api 100 requests per minute limit",
  "what do it consultants charge for a 40 hour integration",
  "average project budget for small business software 2026",
  "freelance developer day rates by country",
  "typical retainer for managed it services small office",
  "is 1.5 million skus too many for a cloud pos",
  "shopify versus square monthly fees for small shops",
  "ceramics wholesale minimum order 500 pieces",
  "cloud pos that handles 2000 orders a day",
];
