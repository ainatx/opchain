// OW-08 round 3: a new held-out set written BEFORE any rule was changed for round 3
// (coordinator instruction after evaluation round 2, 2026-10-17). Frozen: never edited
// to fit the rules. Its before and after rates are reported, and pinned as measured in
// tests/ow-start-logs-acceptance.test.js. Every sentence is invented.

/** Our side (D1), plain wording: our effort, hours, rates, charges, costs, overruns. Must be flagged. */
export const HELDOUT3_OURS = [
  "I usually charge by the day for on-site work like this.",
  "Our team spent the whole of Wednesday rebuilding the import.",
  "We have burned most of the contingency already.",
  "I'm adding a rush fee of fifteen percent to this change.",
  "My hours on the label printer are not part of the fixed price.",
  "We underestimated the clean-up by about half.",
  "I'll invoice the extra screens at my standard day rate.",
  "This phase is not paying for itself on our side.",
  "We put a buffer of two days into our estimate.",
  "My cost for the extra licence is passed through with a small mark-up.",
  "It has been three late nights on my end to get the sync working.",
  "I priced the integration at a loss to win the work.",
  "I'm out of pocket on the travel to the warehouse.",
  "We'll need to bill the extra testing round on top of the plan.",
  "The prototype ate up most of the week for us.",
];

/** The client's side (D1): their effort, charges, figures, terms and dates. Must pass. */
export const HELDOUT3_LEGIT = [
  "Your packing team works an extra hour on Fridays in December.",
  "Your current courier charges a fuel surcharge on every parcel.",
  "About 15% of your orders ship to the islands.",
  "Your bookkeeper bills the studio monthly for her time.",
  "The client owner wants the new view live before 1 March.",
  "Me: draft the field mapping, by 28 October 2026.",
  "Thanks for the two-hour workshop on Tuesday.",
  "Your price list goes up by about 5% in the new year.",
  "Your warehouse lead spends most of Monday on returns.",
  "We agreed that phone orders stay on the sheet until spring.",
  "Your largest customer pays on 60-day terms.",
  "Still open: who signs off the stock count each month.",
  "Your team logged about 40 hours of overtime last month.",
  "The demo of the order view is on Thursday 12 November.",
  "Your accountant's fee for the year-end close is fixed.",
];
