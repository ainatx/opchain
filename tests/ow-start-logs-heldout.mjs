// OW-08 round 2: a held-out set written BEFORE any rule was changed for round 2
// (coordinator instruction, 2026-10-17). Frozen: never edited to fit the rules.
// Its before and after rates are reported, and pinned in
// tests/ow-start-logs-acceptance.test.js as measured, so a later change that
// moves them is visible. Every sentence is invented.

/** Our side (D1): our effort, hours, rates, costs, margin, overruns, in plain wording. Must be flagged. */
export const HELDOUT_OURS = [
  "I'll be invoicing the extra mapping work at my normal hourly figure.",
  "That job swallowed nearly two full days of my week.",
  "Our cost on the integration came in higher than expected.",
  "We priced the change below our usual level to keep things moving.",
  "My time on the data clean-up ran to roughly fourteen hours.",
  "The export work is costing me more than I charged for it.",
  "Our rates for rush changes are higher than standard work.",
  "We've burned through most of the hours we set aside for this.",
  "I'm charging this at cost, with nothing on top.",
  "The extra round is billable on my side.",
  "I estimated three days and it took five.",
  "Our profit on this phase is close to nothing.",
  "My fee for the training session is separate.",
  "We spent a week and a half on the mapping alone.",
  "The quote I gave you was too low for the work involved.",
];

/** The client's side (D1): their schedule, figures, ratios, costs, terms and dates. Must pass. */
export const HELDOUT_LEGIT = [
  "Your warehouse team loads two trucks every afternoon.",
  "Your bookkeeper spends Friday mornings reconciling invoices.",
  "Your new price list takes effect on 1 November.",
  "About one in five of your orders includes a custom glaze.",
  "Your contractor chain pays its invoices within 30 days.",
  "Thanks for the extra half hour at the end of the call.",
  "Your shipping costs rose sharply last quarter.",
  "Client owner: send the updated price list, by 24 October 2026.",
  "We agreed to meet again on Tuesday 27 October.",
  "Your margin on wholesale orders is lower than on retail.",
  "Your team will need about a day to test the new order view.",
  "The order coordinator handles roughly sixty purchase orders a week.",
  "Me: share the draft order view, by 30 October 2026.",
  "Your busiest season starts in March and runs to May.",
  "Your accountant charges you by the hour for year-end work.",
];

/** People by role (C12): one line per category; the known names are the ones the meeting used. Must be flagged. */
export const HELDOUT_NAMES = ["Lena", "Sam"];
export const HELDOUT_PEOPLE = [
  "Reach the ops lead at lena.ortiz@larkspur.example.",
  "Her mobile is (512) 555-0199.",
  "Call 555 0123 for the warehouse.",
  "Mr Okafor approves the invoices.",
  "Dr. Patel signs off the safety sheet.",
  "Sam from Northwind will send the pallets.",
  "Bcc: Lena",
  "Lena confirmed the March date.",
  "+1 512 555 0177 is the after-hours line.",
  "Sam's team handles returns.",
];

/** No private names (C13): catalogs.json's private skill and business, however written. Must be flagged. */
export const HELDOUT_PRIVATE = [
  "the LLC-OPS checklist",
  "run it through llc ops first",
  "file it under llc_ops",
  "the llcops template",
  "LLC Ops has a renewal list",
  "Deftwright invoices go out on Fridays",
  "a deft wright renewal",
  "DEFT-WRIGHT branding",
  "the Deft_wright folder",
  "deftwright's renewals",
];
