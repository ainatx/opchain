// OW-08 follow-ups: a held-out set written BEFORE any rule was changed for the follow-up PR
// (coordinator instruction after evaluation round 3, 2026-10-17). Frozen: never edited to fit the
// rules. Its before and after rates are reported, and pinned as measured, in
// tests/ow-start-logs-acceptance.test.js. Every sentence is invented.

/** Our side (D1), plain wording: our effort, hours, rates, charges, costs and overruns, with named subjects too. Must be flagged. */
export const HELDOUT4_OURS = [
  "Our developer spent most of Thursday fixing the stock sync.",
  "The import took us three days longer than we planned.",
  "My team put in a full weekend on the label printer.",
  "We went over our estimate for the order view by about a day.",
  "I'm billing the extra review session at my standard hourly rate.",
  "Our designer's time on the new logo isn't covered by the fixed price.",
  "We ate the cost of the second test round ourselves.",
  "I'll charge the rush delivery on top of the agreed price.",
  "The clean-up cost us most of a week on our side.",
  "We spent far more hours on the export than we budgeted.",
  "My hourly rate for out-of-scope work is higher than the project rate.",
  "Our contractor billed us for two extra days on the importer.",
  "I underpriced the photo clean-up, so I'm losing money on it.",
  "We're about half a day over our own budget on the label work.",
  "The developer's time on the report came out of our margin.",
];

/** Legitimate scheduling and client-side sentences, aimed at the round-3 false positives. Must pass. */
export const HELDOUT4_LEGIT = [
  "Our next call is at the usual time, Thursday at 10am your time.",
  "We'll send the meeting notes separately from the order export.",
  "We spent the first hour at your warehouse looking at the packing bench.",
  "Our office is closed on Friday 31 October, so the call moves to Monday.",
  "We'll add the two new product ranges to the test set.",
  "Let's keep our weekly slot on Tuesday mornings.",
  "Our time zone is an hour ahead of yours, so 9am for you is 10am for us.",
  "Your team spent most of Monday reconciling the stock count.",
  "We'll spend the first half of the next call on returns.",
  "Your bookkeeper invoices your wholesale customers separately.",
  "Our usual check-in is fifteen minutes, so this one runs short.",
  "We used up the agenda before the hour, so we ended early.",
  "Your team's hours on the packing line went up in November.",
  "We'll invoice nothing until the plan is signed, as agreed.",
  "Our days on site are Wednesday and Thursday next week.",
];
