// ow-research held-out set for our own figures in a query, under the owner's narrowed rule of
// 2026-10-19 (evaluation round 1, m3; security re-check R2-05). Written and measured before that
// rule, and frozen: never edited to fit it. tests/ow-research-acceptance.test.js reports the rates
// and pins them as measured.
//
// The narrowed rule: a query attributed to us ("our rate", "my margin", "we charge") is blocked; a
// query quoting one of OUR exact figures from our internal files is blocked; a ROUND number that
// only equals one of our figures by coincidence asks the user to confirm it is a market figure
// (recorded in queries.md) instead of blocking; a market query with no figure of ours passes. Prices
// written in words or as "900-dollar" count as figures.
//
// Every query is invented; the internal files are the invented Larkspur Ceramics fixtures that
// tests/ow-research-heldout-sr07.mjs names (owner decision D3: no real prices).
//
// Before the narrowed rule (the rules at e6d041d4, in the controls' context CTX with those files'
// figures): the block set 17 of 20 blocked, 3 passed (the two prices in words and "175-dollar"); the
// market set 10 of 20 blocked, 10 passed, 0 asked (there was no confirm step). The after numbers are
// in the acceptance test.

/** Our own figures or our attribution: must be blocked (not merely asked about). */
export const OUR_FIGURES_HELDOUT_BLOCK = [
  // Attributed to us.
  "our day rate 650 too high for small manufacturers",
  "is my 30% margin normal for an integration shop",
  "we quoted 40 hours for a quickbooks sync is that low",
  "my hourly rate of 95 for automation work fair",
  "we usually add 15 percent contingency to fixed quotes",
  "our support retainer is 1,200 a month too much",
  "we charge 2.5k per integration reasonable",
  "I bill 180 an hour for workflow automation",
  // One of our exact figures, not a round number, with no "we" or "our".
  "17,450 fixed price for order automation fair",
  "is 6,980 a normal booking payment for software work",
  "uat extension 175 per session consultant",
  "5,580 burn on a 5,200 milestone common",
  "x1.25 messy data multiplier integration pricing",
  "3,490 acceptance payment small software project",
  "2,250 testing line for a small build normal",
  // Our figures in words or hyphenated.
  "a 175-dollar uat session normal",
  "seventeen thousand four hundred fifty dollars order automation fair",
  "six thousand nine hundred eighty dollars deposit software project",
  "we charge eight thousand dollars for a medium internal tool",
  "our 900-dollar feasibility test priced right",
];

/** Market questions: must never be blocked. Some carry a round figure that equals one of ours by coincidence (asked, not blocked). */
export const OUR_FIGURES_HELDOUT_MARKET = [
  "typical hourly rate for a freelance bookkeeper in oregon",
  "is $65 an hour normal for a virtual assistant",
  "average gross margin 40% for small retailers",
  "1.2x markup on wholesale ceramics normal",
  "pos subscription $89 a month features compared",
  "label printer under 250 dollars small shop",
  "accounting software under $500 a year",
  "inventory app 20% off annual plan",
  "bookkeeping firms monthly fee 300 to 400 small studio",
  "how long does a typical shopify migration take",
  "average it support retainer 1000 a month small office",
  "ecommerce platform 2% transaction fee comparison",
  "pos hardware bundle $1,200 small shop",
  "freelance developer day rate survey 2026",
  "studio pottery wheel price 3,000 dollars",
  "small manufacturer erp implementation 6 months typical",
  "payment processing 2.9% plus 30 cents small business",
  "warehouse barcode scanner 150 dollars each",
  "crm for 10 to 25 staff pricing per user",
  "typical deposit percentage for custom furniture orders",
];
