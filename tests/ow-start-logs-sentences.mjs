// OW-08 (Sprint L): the sentences the logs' meaning and grammar checks are held to.
//
// Written FIRST, before any rule in scripts/ow-start-logs-acceptance.mjs, as the
// contract asks (C7, C8, C12; owner decision O8: the must-pass controls are the
// precision bar). Every sentence and line here is invented. Not a test file
// itself: tests/ow-start-logs-acceptance.test.js imports it.
//
// CONTROLS must pass (no finding) and PLANTS must fail. The UNTUNED sets were
// frozen at the same time and are never edited to fit the rules: their recall
// and false-positive rates are reported, not pinned to 100%.

/** C7 Follow-up clean: client sentences that must pass (D1: the client's side is allowed). */
export const FOLLOWUP_CONTROLS = [
  "Thanks for the 30-minute call today.",
  "Your team packs about 40 orders a week.",
  "The client ops lead sends the export by 23 October.",
  "Thanks for walking us through the order sheet on Tuesday.",
  "You decided to keep the shared order sheet as the one place orders are typed.",
  "About 3% of orders need a second look before they ship.",
  "Your bookkeeper invoices each order at the end of the day.",
  "Last month three pallets were reshipped after a wrong code.",
  "Your spring orders start on 1 March, so the work has to be ready before then.",
  "Client ops lead: send a week of purchase orders, by 23 October 2026.",
  "Me: send the draft field list, by 27 October 2026.",
  "Thanks for making time on Friday afternoon.",
  "Your warehouse lead picks from a printout of the sheet each morning.",
  "Whether the small customers who phone in orders stay on the sheet is still open.",
  "The client owner will confirm the March date with your biggest customer by 30 October.",
  "Your current process takes your coordinator most of the morning.",
  "We agreed to start with purchase orders from email and leave phone orders for later.",
  "The demo of the order view is planned for the week of 9 November.",
  "Your team will test with a full week of real orders.",
  "Orders over 500 units need the owner's sign-off.",
  "Your stock sheet is updated every evening at six.",
  "The client owner prefers one weekly email rather than a call.",
  "We will send a short written summary after each milestone.",
  "Thanks again for the clear answers on how invoices work today.",
  "The bookkeeper will check two invoices against the order sheet by Friday 30 October.",
  "Your busiest week last year had about 90 orders.",
  "The client ops lead found that roughly one order in ten has a code typed two ways.",
  "Payment for the Build Plan is due within 14 days of the invoice.",
  "Your price list changes twice a year.",
  "Your reshipping cost about $1,800 last month.",
];

/** C7 plants: the contract's named failures, one per category. Each must be flagged. */
export const FOLLOWUP_PLANTS = [
  ["a planted rate", "Extra work is billed at $150 an hour."],
  ["our hours", "I spent six hours on this."],
  ["our usual rate", "At my usual rate this would be quoted separately."],
  ["our effort", "It took us most of a week to map the codes."],
  ["our margin", "The margin on the clean-up is tight."],
  ["an overrun against our plan", "The mapping ran past what we estimated."],
  ["our cost", "This change is costing us more than the fixed price."],
  ["a multiplier on our price", "Rush work is priced at 1.5x the usual price."],
];

/** C7 untuned: fresh paraphrases of our internal numbers (should be flagged). Frozen 2026-10-17. */
export const FOLLOWUP_UNTUNED_PLANTS = [
  "I put in most of last weekend getting the field list right.",
  "Our hourly charge for anything outside the plan is the same as before.",
  "That piece ran well past what I had budgeted for it.",
  "We'll take a small hit on this one, but it's worth it.",
  "It ate about three evenings of my time.",
  "My day rate applies to the extra workshop.",
  "Between us, this job is barely breaking even.",
  "I've already sunk twelve hours into the mapping.",
  "The extra report would be a quarter on top of the usual price.",
  "We are well over our estimate for the clean-up.",
  "I charge a premium for rush work like this.",
  "That's roughly two developer-days of effort on my side.",
  "The margin on this phase is thin.",
  "Honestly it cost me more to build than I quoted.",
  "I logged 9.5 hours against the order view this week.",
];

/** C7 untuned: fresh legitimate client sentences (should pass). Frozen 2026-10-17. */
export const FOLLOWUP_UNTUNED_CONTROLS = [
  "Your coordinator spends about two hours a day retyping orders.",
  "The spring rush roughly doubles your order volume.",
  "Your biggest customer wants every order confirmed within one business day.",
  "Thanks for the hour you gave us on Thursday.",
  "Your team will have two weeks to test before the go-live date.",
  "About a quarter of your orders come in by phone.",
  "The owner wants a decision on the stock column by the end of the month.",
  "Your accountant closes the books on the fifth of each month.",
  "We agreed the order view comes first and the stock column waits.",
  "Your current tool costs you a monthly fee you would like to drop.",
  "Purchase orders over 1,000 units go to the owner first.",
  "Your warehouse ships twice a day, at ten and at three.",
  "I will send the draft field list on Monday.",
  "We spent the first half of the call on how returns work today.",
  "Your team lost a full day last month fixing one wrong shipment.",
];

/** C12 People by role: lines that must pass (roles, products, systems, places, weekdays, months, the client's business). */
export const PEOPLE_CONTROLS = [
  "client ops lead: send the export by 23 October 2026",
  "The client owner decided to keep the shared order sheet.",
  "- you (SPEAKER_00, confirmed by you)",
  "- vendor account manager (SPEAKER_01, confirmed by you)",
  "Larkspur Ceramics will send a week of purchase orders.",
  "QuickBooks Online stays the place invoices are made.",
  "The Google Sheet is the order sheet everyone uses.",
  "Orders ship from the warehouse in Austin.",
  "The meeting moved to Thursday afternoon.",
  "Spring orders start in March.",
  "The bookkeeper invoices on Friday.",
  "Example Studio sends the field list.",
  "Microsoft Excel exports are fine for the sample.",
  "The order coordinator fixes codes every Monday.",
  "Northwind Freight collects pallets on Tuesdays.",
  "The client's biggest customer is a contractor chain in Texas.",
  "Shopify is not in scope.",
  "December is the slowest month.",
  "The warehouse lead picks from a printout.",
  "Purchase orders arrive as PDF attachments from the Purchasing inbox.",
  "A-01: client ops lead, due 2026-10-16",
  "DEC-01 review by 2026-10-19",
  "The vendor's Support Desk answers within one business day.",
  "Zapier was tried two years ago and broke.",
  "The New Year holiday closes the warehouse.",
  "Ship dates follow the Central time zone.",
  "The client owner and the client ops lead attended.",
  "Labor Day falls in September.",
  "Q1: Which customers phone in their orders?",
  "Larkspur's Austin showroom takes walk-in orders.",
  "The Purchase Order PDF lists the SKU, quantity and ship date.",
  "Mailchimp sends the newsletter, not the order confirmations.",
];

/** C12 plants: one per category. `names` are the fixture's known speaker names. */
export const PEOPLE_NAMES = ["Dana", "Jess", "Marcus", "Priya", "Robin"];
export const PEOPLE_PLANTS = [
  ["an email address", "client ops lead (ops@larkspur.example)"],
  ["a phone number", "Call the warehouse lead on 512-555-0147 if the pallets slip."],
  ["a known speaker name", "Dana will send the export by 23 October."],
  ["the user's own name", "Robin will send the field list."],
  ["an honorific", "Ms. Alvarez will check the invoices."],
  ["a name from an organisation", "Teodora from Northwind Freight confirmed the pickup."],
  ["a cc: line", "cc: Tomas"],
];

/** C8 No client text in STATUS: legitimate logs lines that must pass the closed grammar. */
export const STATUS_CONTROLS = [
  "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-01 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-01 (client ops lead) by 2026-10-16",
  "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-02 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-02 (you) by 2026-10-19",
  "2026-10-13 (clock: tool) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-03 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-03 (client owner), no date",
  "2026-10-21 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-01 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-01 (client ops lead) by 2026-10-27",
  "2026-10-15 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-03 | next: none (closed: done) | awaiting: none (done 2026-10-15)",
  "2026-10-21 (clock: host-supplied) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-02 | next: none (closed: dropped) | awaiting: none (dropped 2026-10-21)",
  "2026-10-19 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/decisions/DEC-01.md | next: none (closed: reviewed) | awaiting: none (reviewed 2026-10-19, kept)",
  "2026-10-22 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/decisions/DEC-01.md | next: none (closed: superseded by DEC-02) | awaiting: none (superseded 2026-10-22)",
  "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/decisions/DEC-01.md | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: DEC-01 review by 2026-10-19",
  "2026-10-16 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-02/agenda.md | next: ow-start /ow-start-log-meeting logs/larkspur-ceramics/ | awaiting: meeting on 2026-10-20",
  "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md | next: none (closed: held 2026-10-13) | awaiting: none",
  "2026-10-27 (clock: assumed) | ow-start 1.1.0 | logs/business/meetings/MTG-01/notes.md#A-01 | next: ow-start /ow-start-action logs/business/ | awaiting: A-01 (vendor account manager) by 2026-10-30",
];

/** C8 plants: client text in a STATUS line, in each place it could hide. */
export const STATUS_PLANTS = [
  ["client words in awaiting:", "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-01 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-01 (client ops lead) send the order export by 2026-10-16"],
  ["a person's name as the owner", "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-01 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-01 (Dana) by 2026-10-16"],
  ["a description in the path", "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01-export-review/notes.md#A-01 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-01 (client ops lead) by 2026-10-16"],
  ["a closing reason in words", "2026-10-15 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-01/notes.md#A-03 | next: none (closed: the owner signed off the codes) | awaiting: none (done 2026-10-15)"],
  ["a title after the decision id", "2026-10-13 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/decisions/DEC-01.md | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: DEC-01 keep the order sheet review by 2026-10-19"],
];
