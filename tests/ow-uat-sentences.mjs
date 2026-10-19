// Sentence sets for the ow-uat meaning checks (Sprint 3 contract C6, C7, C8).
// Written BEFORE the rules in scripts/ow-uat-acceptance.mjs (Sprint 2's lesson:
// controls first), and kept as permanent vitest cases: every CONTROL must pass
// (a false positive fails the suite), every PLANT must be caught. Owner decision
// D1: an internal number is OUR side only. D2: the checker is a regression net;
// the skill's self-check covers implied claims. All names and values here are
// invented; the client records cited are the invented Larkspur fixtures.
//
// Not a test file itself: tests/ow-uat-plants.test.js imports it.

/** C6, legitimate client sentences (>= 30): the quoted UAT line, session dates and
 *  durations, counts, a signed change order's price, payment terms, deemed and
 *  backstop dates, fix dates and rounds against the quoted bounds (O7), and the
 *  client's own figures, ratios and schedule. */
export const C6_CONTROLS = [
  "User acceptance testing is part of the fixed price: 3 tester roles, 3 sessions, and up to 2 fix rounds within 5 business days each.",
  "The UAT line in your quote is USD 2,250.00, inside the fixed price.",
  "Session 2 runs on 12 January 2027 from 10:00 to 12:00.",
  "Allow about two hours for each session.",
  "10 of 10 cases passed in session 3.",
  "Three records were created in the QuickBooks Online sandbox during testing; please delete them.",
  "Change order CO-01, signed on 7 December 2026, added two checks for USD 2,600.00.",
  "Invoices are due within 14 days.",
  "If you neither sign this request nor send us a qualifying defect report, it will be deemed accepted on 7 December 2026.",
  "UAT-04 was fixed on 15 January 2027, within the 5 business days quoted, at no charge.",
  "UAT-04 was fixed on 22 January 2027, after the 5 business days quoted, at no charge.",
  "This was the second of the 2 fix rounds quoted.",
  "The 20% acceptance payment falls due when you sign this request.",
  "Your September set holds 10 purchase orders, and the test used all 10.",
  "Your team re-keys about a third of the order lines by hand today.",
  "Your December volume is roughly twice the usual month.",
  "Each tester needs about an hour to run their scenarios.",
  "Your testers will have two weeks between the second session and the confirmation run.",
  "The confirmation run on 21 January 2027 took the order coordinator ninety minutes.",
  "The bookkeeper checked 10 invoices against the order sheet.",
  "We will run the confirmation session with your operations manager on 26 January 2027.",
  "We tested the import on a week of your October orders.",
  "The extra test session needs a signed change order before it is booked.",
  "Each order line keeps the unit price from your own price list.",
  "Orders over $750 still go to the owner for approval.",
  "98% of the sampled product codes matched.",
  "The delivery backstop date is 15 January 2027.",
  "Fixes inside the agreed scope are made at no charge.",
  "The punch list holds 2 minor items, each fixed after handoff at no charge.",
  "The documentation and training line, USD 4,000.00, is invoiced when the documents are delivered.",
  "Your $1,200 monthly courier bill is not affected by the new flow.",
  "Session 1 lasted three hours, with a break at 11:00.",
  "Testing ran from 4 to 21 January 2027.",
  "Retesting the fix took the bookkeeper ten minutes.",
  "One more session than the 3 quoted would be a change order, priced and signed before it is booked.",
];

/** C6, OUR side (each must be caught): our hours or effort on fixes, rates and
 *  price-book internals, our cost or margin, overruns against our own plan. */
export const C6_PLANTS = [
  "We spent two days on the discount fix.",
  "The retest took us a whole morning.",
  "Fixing UAT-04 cost us more than the UAT line.",
  "Extra sessions are charged at our session rate.",
  "The fixes ran past what we had planned.",
  "That is a day and a half of developer time.",
  "We lose money on another fix round.",
  "Our margin on testing is thin.",
  "The extension is priced at the price book's per-session rate.",
  "The UAT price includes a 1.25 multiplier for the extra role.",
  "We are 12 hours over our estimate on fixes.",
  "Robin put a week and a half into the fixes.",
  "Each extra session is USD 175.00 at the extension rate.",
  "The fix work went well over budget.",
];

/** C7 credentials: legitimate (>= 10) and planted. */
export const C7_CREDENTIAL_CONTROLS = [
  "Your login comes from the client operations manager.",
  "Ask the operations manager to reset the bookkeeper tester's login.",
  "Use the payment provider's test mode for SC-04.",
  "Sign in with the tester id the operations manager gives you.",
  "Never send a password by email; the operations manager hands out logins.",
  "The bookkeeper tester account was created by the client operations manager.",
  "A password was seen in the results file and was not copied.",
  "kind: password | role: bookkeeper | source: uat/larkspur-ceramics/evidence/results-session-1.csv row 7 | session: 1",
  "The staging mailbox uses the test sender account the builder created.",
  "Reset tokens for the sandbox are handled by the client.",
  "If your login does not work, tell the operations manager.",
  "API keys stay with the builder and are never in this pack.",
];
export const C7_CREDENTIAL_PLANTS = [
  "password: Kiln-2027!",
  "The bookkeeper signs in as bk-T1 with password Glaze#44.",
  // Built at run time: the invented live-key shape, written out whole, is read as a real key by GitHub's push protection.
  `api_key=${["sk", "live", "51Hx9Q2eZvKYlo2CabcdEFGH1234"].join("_")}`,
  "token: ghp_16C7e42F292c6912E7710c838347Ae178B4a",
  "Open https://ops:Kiln2027@staging.example.test to start.",
  "Password is Spring2027",
  "AWS key AKIAIOSFODNN7EXAMPLE was in the note.",
];

/** C7 people: legitimate (>= 10) and planted. `PEOPLE_CONTEXT` is what the checker knows of the fixture. */
export const PEOPLE_CONTEXT = { user: "Robin", people: ["Jess Arden", "Tomas Vey", "Lena Okafor", "Jess", "Priya"], client: "Larkspur Ceramics" };
export const C7_PEOPLE_CONTROLS = [
  "The order coordinator oc-T1 ran SC-01.",
  "Testers: order coordinator (oc-T1), operations manager (ops-T1), bookkeeper (bk-T1).",
  "Recorded by Robin; not verified by this skill.",
  "The client operations manager hands out logins.",
  "signed 2027-01-27 by operations manager on request 2; signature not verified by this skill",
  "Each tester writes their id, not their name.",
  "The bookkeeper reported UAT-09 by email.",
  "ops-T1 could not attend on 12 January 2027.",
  "The owner signs off spending over the limit.",
  "Results from Larkspur Ceramics' session 1 were imported on 8 January 2027.",
  "Run by the user with the operations manager on 26 January 2027.",
  "The test runs in QuickBooks Online's sandbox, set up by the client on Monday.",
];
export const C7_PEOPLE_PLANTS = [
  "Jess ran SC-01 and it failed.",
  "Tester: Tomas Vey (order coordinator)",
  "Questions to jess.arden@larkspur.example.",
  "Call the bookkeeper on +1 512 555 0142.",
  "SC-06 was tested by Lena Okafor.",
  "| tester id | Name | scenario |",
];

/** C7 data: legitimate pointers (>= 10) and planted record values (the invented Larkspur inbox). */
export const C7_DATA_CONTROLS = [
  "Data: September purchase orders; source: the client's September set; 10 orders; fields: order number, customer, product code, quantity.",
  "Use the 3 purchase orders with one code altered, by their order numbers in the September set.",
  "10 of 10 cases passed.",
  "Records: the 10 orders from AC-1.1, located by order number in the order sheet.",
  "fields: [order number, customer, product code, quantity]",
  "count: 10",
  "Product codes are in the LC-nnnn form.",
  "The test customer made for AC-5.2 is not in QuickBooks Online.",
  "Evidence: oc-T1-confirmation.png (cleared).",
  "ids: the first 10 order numbers of the September set",
  "Send 2 emails with an image instead of a PDF.",
];
export const C7_DATA_PLANTS = [
  "| PO-88231 | Ridgeline Builders | LC-1204 | 40 |",
  "Customer: Northgate Homes, PO-88219, 25 tiles.",
  "Send the order from Harlow Kitchens for 6 of LC-3301.",
  "Expected: the sheet shows PO-88213, Ridgeline Builders, LC-1204, quantity 40.",
  "Ship to: Site 14, Ridgeline Commons",
];

/** C8: who tested. `FALSE_PASS_CONTEXT`: AC-5.2 passed only "user alone"; UAT-05 is fixed, not retested. */
export const FALSE_PASS_CONTEXT = { userAlone: ["AC-5.2"], notRetested: ["UAT-05"], retested: ["UAT-03"] };
export const C8_CONTROLS = [
  "AC-5.2 was checked by the builder; not tested by your people.",
  "UAT-05 is fixed in build larkspur-uat-3; its retest is due in session 3.",
  "UAT-03 passed its retest in RUN-03.",
  "The bookkeeper ran SC-06 and it passed.",
  "Your testers ran every required scenario except AC-5.2 in session 3.",
  "Your team confirmed AC-1.1 in session 3.",
  "UAT-03 is fixed and passed its retest.",
  "The order coordinator confirmed AC-2.1 on 21 January 2027.",
  "AC-5.2 passed in a run by the user alone on 18 November 2026.",
  "Signing this request accepts the build against the agreed acceptance checks.",
  "The builder reported UAT-05 fixed on 15 January 2027.",
];
export const C8_PLANTS = [
  "Your team confirmed AC-5.2.",
  "Your bookkeeper verified AC-5.2 in session 3.",
  "UAT-05 is fixed.",
  "UAT-05 has been resolved.",
  "AC-5.2 was tested by your people.",
];

// ── HELD-OUT sets ──────────────────────────────────────────────────────────
// Written on 2026-10-17 BEFORE any rule in scripts/ow-uat-acceptance.mjs existed
// and kept out of the tuning. Measured once, after the rules and the known sets
// above passed (the first measurement, reported in the Sprint 3 report):
//   our side 14/15 caught (missed: "ate up most of our Thursday");
//   legitimate client sentences 0/15 flagged (0% false positives);
//   credentials 4/5 caught (missed: "<value> as the pass"), 0/5 flagged;
//   people 5/5, 0/5; data 5/5, 0/5; who-tested 5/5, 0/5.
// The two misses were then grown into the net (rules marked "added after the
// held-out measurement"), so from here on these are regression cases too.
export const HELDOUT_OURS = [
  "Sorting out the billing-address bug ate up most of our Thursday.",
  "Honestly, this round of fixes has been a money pit for us.",
  "Each additional session is billed at a flat 175 a time.",
  "The fix effort came in well above the budget we set ourselves.",
  "Our developer logged nine hours against UAT-03.",
  "We've already sunk three evenings into the stock-on-hand issue.",
  "At this point the testing phase is running at a loss.",
  "That retest round costs us roughly what the whole UAT line pays.",
  "We had allowed one day for fixes and needed four.",
  "The extension rate from our price book applies to the extra session.",
  "Rework on the invoice sync took the two of us most of a week.",
  "Our hourly cost for retesting is higher than for building.",
  "We underestimated the fix work by about half.",
  "Behind the scenes the fixes consumed 30 billable hours.",
  "The extra role pushes our cost up by a quarter.",
];
export const HELDOUT_LEGIT = [
  "Your order coordinator spent about an hour on the exceptions list in session 1.",
  "The confirmation run is booked for Thursday 21 January 2027, 10:00 to 12:00.",
  "Half of the September orders came from two customers.",
  "The fix for UAT-05 reached the test environment on 15 January 2027.",
  "We will retest UAT-03 and UAT-04 in the next session, at no charge.",
  "Your stock sheet updates every morning at 7:00.",
  "The bookkeeper's sample covered 20 items, all in the LC-nnnn form.",
  "The acceptance payment is 20% of the fixed price, USD 3,490.00, due within 14 days of the invoice.",
  "The UAT line covers 3 tester roles; a fourth role would be a change at the quoted per-role price.",
  "Two of your testers could not attend on 12 January 2027.",
  "Session 3 lasted two and a half hours.",
  "Every one of the 9 acceptance checks passed on build larkspur-uat-4.",
  "Records created during testing: 3 invoices and 1 customer in the sandbox.",
  "Your team processes roughly 60 orders a week.",
  "The deemed acceptance date moved to 11 December 2026 after our notice that we could not reproduce the report.",
];
export const HELDOUT_OTHER = {
  credentials: {
    caught: ["The sandbox admin is ops@example.test with Glazier!88 as the pass.", "Log in as bk-T1, secret word Teapot77.", "Here is the key: AKIAIOSFODNN7EXAMPLE", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123def456", "pwd=Mugs-and-Jugs-2027"],
    legit: ["The client operations manager holds every tester login.", "Passwords are reset by whoever owns the test environment.", "The sandbox runs in the payment provider's test mode.", "No credential appears in this pack.", "The tester id is not a password."],
  },
  people: {
    caught: ["SC-06 was run by Lena Okafor from accounts.", "Call Tomas on 512-555-0199 if the sandbox is down.", "Results came from jess.arden@larkspur.example.", "Tester (full name): Marco Diaz", "Thanks to Jess for catching the discount bug."],
    legit: ["SC-06 was run by the bookkeeper (bk-T1).", "Call the operations manager if the sandbox is down.", "Results came from the order coordinator's results file.", "Tester id: oc-T1", "Thanks to the order coordinator for catching the discount bug."],
  },
  data: {
    caught: ["Example: Ridgeline Builders ordered 40 of LC-1204 on PO-88231.", "| PO-88219 | Northgate Homes | 25 |", "Customer Harlow Kitchens, 6 tiles of LC-3301.", "Use order PO-88213 (Ridgeline Builders, 40 sage wall tiles).", "Ship to: Site 14, Ridgeline Commons"],
    legit: ["Use the September purchase orders by order number; 10 orders; fields: customer, product code, quantity.", "Source: the client's September set; count: 3.", "10 of 10 cases passed.", "The customer made for the test is not in QuickBooks Online.", "Records are located by order number in the order sheet."],
  },
  false_pass: {
    caught: ["Your bookkeeper confirmed that AC-5.2 works.", "UAT-04 is resolved.", "Your testers verified the clean-up of product codes (AC-4.1).", "The discount problem (UAT-03) has been sorted.", "AC-5.2 was signed off by your team."],
    legit: ["AC-5.2 was checked by the builder; not tested by your people.", "UAT-04 is fixed in build larkspur-uat-3; the retest is due in session 3.", "The bookkeeper ran SC-06 and it passed in RUN-04.", "UAT-03 passed its retest in RUN-03.", "Your testers ran every required scenario in session 3."],
  },
};
/** The context the held-out who-tested sentences are judged in: two checks the user alone ran, two problems fixed and not yet retested. */
export const HELDOUT_FALSE_PASS_CONTEXT = { userAlone: ["AC-5.2", "AC-4.1"], notRetested: ["UAT-04", "UAT-03"] };

// ── ROUND-2 HELD-OUT sets (OW-04, after evaluation round 1) ──────────────────
// Written on 2026-10-17 BEFORE any round-2 rule change, from the category
// definitions only (D1 our side, OD-3 data shapes, C8 who tested), and measured
// twice: against the round-1 rules ("before") and against the round-2 rules
// ("after", before any of these misses were grown into the net):
//   our side   before 13/15 caught, after 13/15 (missed both times: "blew through
//              the contingency we had planned for", "Two of our people spent the
//              morning ...")
//   legitimate before 14/15 pass (flagged: "Your month-end close took three days
//              before ..."), after 15/15
//   data       before 1/10 by the data rule (5/10 by any check), after 9/10 (10/10
//              by any check; missed: a pipe row with no outer pipes)
//   who tested before 6/10, after 10/10; the legitimate set: 0/15 flagged by the
//              data, who-tested, people or credentials rule, before and after
// The three misses were then grown into the net (rules marked "added after the
// round-2 held-out measurement"), so from here on these are regression cases too.
export const HELDOUT2_OURS = [
  "We put roughly six hours into reproducing the label bug.",
  "Our developer needed most of a week to finish the stock-sync fix.",
  "Fixing the export took us longer than the two days we had pencilled in.",
  "Our internal rate for a retest session is 140 per hour.",
  "The extra role you asked for doubles our testing cost.",
  "This round of fixes put the project over our own estimate by about a fifth.",
  "Our margin on the UAT line is now close to nothing.",
  "We booked nine hours against the reconciliation fix.",
  "Behind the scenes, the confirmation-email change cost us an extra afternoon.",
  "The rework blew through the contingency we had planned for.",
  "Our cost for the third session was higher than what we charge for it.",
  "Each retest costs us about 45 minutes of developer time.",
  "Our team logged 3.5 days on the fixes so far.",
  "We underestimated the export work by roughly 50 percent.",
  "Two of our people spent the morning chasing the date-format problem.",
];
export const HELDOUT2_LEGIT = [
  "Your bookkeeper's session is planned for 45 minutes on 19 January.",
  "The quoted UAT line covers three tester roles, two sessions and two fix rounds.",
  "Testing ran from 12 to 21 January, and 10 of 10 cases passed.",
  "The second payment of 40 percent is due when you sign this request.",
  "Your order coordinator created 6 test orders in the staging shop.",
  "Each fix is due within 5 business days of the report, as quoted.",
  "The label problem was fixed on 14 January, two business days after the quoted 5, at no charge.",
  "Your team usually spends about two days a month on the stock count.",
  "Change order CO-02 adds 1,200.00 to the fixed price, as you signed on 8 January.",
  "If you neither sign nor report a reproducible failure, this request is deemed accepted on 7 December 2026.",
  "Please allow about an hour for the operations manager's checklist.",
  "Your shop manager ran 4 of the 5 scenarios; the fifth is scheduled for Thursday.",
  "The acceptance invoice follows your signature, with payment due in 14 days.",
  "Your month-end close took three days before; the new export should cut that to one.",
  "The quote includes one more fix round if a retest fails.",
];
/** The amounts a client may see in HELDOUT2_LEGIT (cents): the signed change order. */
export const HELDOUT2_CTX = { user: "Robin", legit: new Set([120000]) };
export const HELDOUT2_DATA = [
  "Order 55102, maria.k@example.net, 3 x Celadon bowl, 84.00",
  "Customer | Phone | Postcode\nH. Brandt | 555-0147 | 78704",
  "Use this one: 4111 1111 1111 1111, exp 09/29, for the card test.",
  "INV-20931; 2026-11-03; Harbour Florists; 1,240.50; paid",
  "acct 99812-77, j.ruiz@example.org, net 30, Austin TX",
  "| sku | qty | price |\n|---|---|---|\n| GL-1001 | 4 | 12.00 |\n| GL-1002 | 2 | 9.50 |\n| GL-1003 | 7 | 4.25 |\n| GL-1004 | 1 | 30.00 |\n| GL-1005 | 3 | 18.75 |\n| GL-1006 | 5 | 6.40 |",
  "Ship to 42 Mill Lane, Bristol BS1 4XY, tel 0117 496 0123",
  "member #A88213, gold tier, priya.n@example.com, renews 2027-03-01",
  "2026-10-02,ORD-77812,Oak Street Cafe,(512) 555-0199,shipped",
  "Tracking 1Z999AA10123456784 for the order to Delgado Supply, 3 boxes, 12.4 kg",
];
/** C8 context for HELDOUT2_FALSE_PASS: AC-3.2 and AC-6.1 passed only "user alone"; UAT-12 and UAT-09 are fixed, not retested. */
export const HELDOUT2_FALSE_PASS_CONTEXT = { userAlone: ["AC-3.2", "AC-6.1"], notRetested: ["UAT-12", "UAT-09"], retested: ["UAT-02"] };
export const HELDOUT2_FALSE_PASS = [
  "Your order coordinator tested AC-3.2 and it passed.",
  "AC-6.1 was confirmed by your team in session 2.",
  "UAT-12 is resolved.",
  "We have fixed UAT-09 and it now works as agreed.",
  "Your testers checked every acceptance check, including AC-6.1.",
  "All checks were run by your people.",
  "UAT-12 no longer occurs.",
  "The bookkeeper verified the export behaviour in AC-3.2.",
  "Both remaining problems (UAT-09 and UAT-12) are now corrected.",
  "Your staff have tested and approved all of the acceptance checks.",
];

// ── The Evaluator's untuned round-1 set (OW-04, h/sentences.mjs), kept (C17) ──
// Written by the Evaluator before reading the rules. Round 1 measured: our side
// 22/30 caught, 2/30 legitimate flagged; credentials 18/22, people 14/22, data
// 2/22 by the data rule, who-tested 5/12. Round 2 rules (R1-8 to R1-10, OD-3)
// were written against these slips; the remaining misses are named below.
export const EV1_OURS = [
  "We spent two full days chasing the import fix.", "The retest cost us most of an afternoon.", "Our developer put roughly six hours into UAT-05.",
  "Fixing the totals took about a day and a half of build time on our side.", "Extra test sessions are billed at our hourly session rate.",
  "Any further fix round would be charged at the UAT extension rate of 95 per hour.", "Each additional tester role adds 15% to the UAT line.",
  "This round of fixes cost us more than we charged for testing.", "We are losing money on this acceptance phase.", "Our margin on the UAT line is gone after round two.",
  "The fixes ran well past the effort we had budgeted.", "We went three days over our own plan on the fix phase.", "Acceptance testing took twice as long as we estimated internally.",
  "The builder logged 14 hours against UAT-07.", "Our time on this defect came to roughly 9 hours.", "We absorbed about 2 developer-days fixing the tax rounding.",
  "Internally this fix was sized at half a day.", "Our cost for the extra session was about 400.", "The extension would be priced at 1.5 times our usual daily rate.",
  "Our estimate for the fix was four hours; it took eleven.", "The retest took our developer the whole morning.", "We put in a long weekend to get build larkspur-uat-4 out.",
  "That correction alone used a third of the hours we had set aside for testing.", "We underestimated the fix effort by about half.", "Sessions beyond the third are charged at 120 each.",
  "Robin spent the best part of Thursday on the fix.", "Fixes so far have taken us 18 hours in total.", "Our hourly rate for acceptance-test extensions is 85.",
  "The time we logged on UAT-03 is over the fix budget we set ourselves.", "Developer effort on the regression came to roughly a week.",
];
export const EV1_CLIENT = [
  "Session 2 runs on Tuesday 12 January from 10:00 to 12:00.", "Allow about two hours for your scenarios.", "10 of 10 cases passed in RUN-04.",
  "3 records were created during testing; please delete them after sign-off.", "Your testers logged 4 problems in session 1.",
  "The acceptance test covers three tester roles, three sessions, two fix rounds and five fix days, as quoted.", "The acceptance payment is due within 14 days of the invoice.",
  "The acceptance payment is 20% of the project price, as the 40/40/20 schedule says.", "UAT-05 was fixed on 14 January, after the 5 business days quoted, at no charge.",
  "Your bookkeeper processes about 300 invoices a month.", "Your December volume is roughly twice a normal month.", "About a third of your orders come through the wholesale channel.",
  "Your warehouse team spends about two hours a day re-keying orders today.", "Two of your three testers attended session 1.", "The pass rate across every scenario in RUN-04 was 100%.",
  "Session 3 on 21 January was the final confirmation run.", "Each scenario takes 20 to 30 minutes.", "Change order CO-01, signed at the price on the change order, is part of this acceptance.",
  "Your stock list has 1,140 active products.", "Testing ran over three weeks, from 7 January to 26 January.", "Fix round 2 of 2 closed on 22 January.",
  "Your operations manager will hand each tester their login.", "The bookkeeper tester (bk-T1) needs about an hour for SC-06.", "Your team reported UAT-09 on 18 January; it was logged the same day.",
  "Today your month-end close takes about four days.", "Half of your testers work in the warehouse.", "Your order coordinator handles roughly 60 orders a week.",
  "Each tester spent about 90 minutes on session 2.", "UAT-09 went to the builder on 18 January and came back in build larkspur-uat-4 four business days later, within the quoted bounds.",
  "The 40% booking payment and the 40% build payment are already paid; this signature triggers the final 20%.",
];
export const EV1_CRED_PLANTS = [
  "password: Tulip-4471", "The login for oc-T1 is oc-t1 / Spring2026!", "api_key = sk_test_51HxyzAbCdEfGh1234567890Qw",
  "Open https://ops:Hunter22@staging.larkspur.example/login to start.", "pwd=Bluebird99", "The test account's passcode is 482913.",
  "Use the token ghp_16C7e42F292c6912E7710c838347Ae178B4a for the sandbox.", "Sign in as tester2 with the password welcome123.",
  "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123def456", "The sandbox key is AKIAIOSFODNN7EXAMPLE.", "PIN: 7731",
];
export const EV1_CRED_CONTROLS = [
  "Your login comes from the operations manager.", "Ask the operations manager to reset the bookkeeper tester's login.", "Use the payment provider's test mode for SC-06.",
  "If you forget your password, the operations manager can reset it.", "No password is written in this pack.", "Sign in with the test account the operations manager gives you.",
  "The token on the packing slip is the order reference, not a login.", "SC-03 checks that a wrong password is refused.", "The sign-in page is at the staging address in your invitation.",
  "Key: SC-01 to SC-04 are required scenarios.", "Passwords and keys stay with the operations manager.",
];
export const EV1_PEOPLE_PLANTS = [
  "Tester: Lena Okafor (oc-T1)", "Contact jane.doe@example.com if the build is down.", "Call the operations manager on 555-0142.", "SC-02 was run by Tomas Vey.",
  "+1 (512) 555-0199", "Thanks to Jess from the warehouse for running SC-04.", "Reported by L. Okafor.", "The bookkeeper, Okafor, confirmed the totals.",
  "Email the results to testers@larkspur-ceramics.example.", "JESS ARDEN will sign the request.", "SC-05 was run by Maria Lopez.",
];
export const EV1_PEOPLE_CONTROLS = [
  "The order coordinator tester (oc-T1) ran SC-01.", "Recorded by Robin.", "ops-T1 will run the exception scenarios.", "The operations manager hands out logins.",
  "The bookkeeper role tests the invoice export.", "Your operations manager approved running SC-06 in the sandbox on 4 January.", "Session 1 is with the order coordinator and the bookkeeper.",
  "Microsoft Excel opens the results template.", "Orders from New York and Texas are in scope.", "Session 3 is on Thursday 21 January.", "QuickBooks Online receives the invoices.",
  "The Operations Manager signs on behalf of Larkspur Ceramics.",
];
/** Data plants the generic shapes (OD-3) catch; the prose ones are the self-check's (named below). */
export const EV1_DATA_PLANTS = [
  "| 10482 | Hannah's Bakery | 3 x Stoneware Mug | 54.00 |", "Use order #10482 for Greenleaf Cafe, total 1,284.50.", "Customer: Oakridge Pottery Supply, 14 Mill Lane.",
  "Customer email: orders@fernwaydeli.example", "Ship to 22 Harbor Rd, Portland, ME 04101.", "10482,Hannah's Bakery,2026-11-02,54.00,paid", "Card ending 4242 was charged 54.00.",
  "Order 10483 from Willow & Wren: 12 bowls, 6 plates, total 402.00.",
  // A record noun and an ID-like token in prose: a named skip in round 2, caught since round 3 (the round-2 DP09 rule).
  "Check that invoice INV-2026-0441 to Fernway Deli totals 980.00.",
];
/** Owner decision OD-3: prose that names one record value with no delimited row, contact, card or ID shape stays with the self-check. */
export const EV1_DATA_SELF_CHECK = [
  "SKU MUG-STN-12 at 18.00, quantity 24.", "The invoice for Brightwater Hotel shows 312.40 instead of 321.40.",
];
export const EV1_DATA_CONTROLS = [
  "Data: orders in the staging mailbox, ids 10480 to 10489, 10 records, fields total, tax and status.", "10 of 10 cases passed.",
  "Use the 12 synthetic orders the builder loaded (source: the test data sheet).", "Records created: 3 test orders, ids T-001 to T-003.", "Fields checked: order total, tax and shipping.",
  "Source: the QuickBooks Online sandbox; locator: invoices dated January 2027; count 20.", "The scenario uses the anonymised customer list (ids C-001 to C-050).",
  "Expected result: every order total matches its invoice total (10 cases).", "Pick any five orders from last week in the order sheet copy.", "Each order has a total, a tax line and a status.",
];
/** Mossgate request 1: AC-1.1, AC-1.2 and AC-2.1 passed only with the user alone. Larkspur defect-fixed: UAT-03 to UAT-05 fixed, not retested. */
export const EV1_FP_PLANTS = [
  ["m", "Your shop manager confirmed AC-1.1."], ["m", "Your team tested and approved AC-2.1."], ["m", "Your people ran all three checks."], ["m", "AC-1.2 was verified by your staff."],
  ["m", "Your tester signed off every check."], ["m", "The shop's own tester passed AC-1.1 and AC-1.2."], ["l", "UAT-05 is fixed."], ["l", "UAT-05 has been resolved."],
  ["l", "UAT-05 now works."], ["l", "The fix for UAT-05 is complete and working."], ["l", "UAT-05: repaired."], ["l", "We've corrected UAT-05."],
];
export const EV1_FP_CONTROLS = [
  ["m", "AC-1.1 was checked by the builder; not tested by your people."], ["m", "Your tester did not attend on 12 and 17 November 2026."],
  ["l", "UAT-05 was fixed in build larkspur-uat-3; retest due in session 3."], ["l", "UAT-05 is with the builder for round 1."], ["l", "Your team logged UAT-05 in session 1."],
  ["m", "Robin ran AC-1.1, AC-1.2 and AC-2.1 alone on 18 November 2026."], ["l", "Fixed in build larkspur-uat-3; your operations manager will retest it on 21 January."],
  ["m", "Please run AC-1.1 yourselves if you would like your people to test it."], ["l", "UAT-05 will be retested in session 3."], ["m", "None of the checks was tested by your people."],
];

// ── The Evaluator's untuned round-2 set (OW-04, h/sentences2.mjs), kept (C17) ──
// Written by the Evaluator before reading the round-2 rules. Round 2 measured:
// our side 16/20 caught (O10, O11, O16, O20 slipped), 1/20 legitimate flagged
// (L12); data 9/10 (DP09, prose); who tested 9/10 (FPP03), 3/10 legitimate
// flagged (FPC06 to FPC08); people 9/10 (PP09); credentials 6/10 (CR02 to CR04,
// CR09). Round 3 (R2-2, R2-9) catches every plant and passes every control.
export const EV2_OURS = {
  O01: "Getting UAT-05 right cost us roughly two working days.",
  O02: "We burned an afternoon reproducing the discount problem.",
  O03: "Our side spent about 7 hours on the retests.",
  O04: "The extra session would be billed at our day rate.",
  O05: "Each extra fix round is charged at 250.",
  O06: "This round of fixes put us over our budget for the job.",
  O07: "Our margin on testing is now negative.",
  O08: "We planned for one fix round and needed three, so we are over our own plan.",
  O09: "Developer time on the invoice fix: about 1.5 days.",
  O10: "Robin's time on the sandbox setup was most of Monday.",
  O11: "We are eating the cost of the third round.",
  O12: "Internally we booked 12 hours to acceptance testing.",
  O13: "The fix took us longer than our estimate of half a day.",
  O14: "The UAT extension rate applies to any further session.",
  O15: "Our cost for the regression fix was about 600.",
  O16: "That is roughly 20% more effort than we allowed for testing.",
  O17: "We logged three days on the stock-sync defect.",
  O18: "Per-role add-ons are priced at 30% of the UAT line.",
  O19: "The retest took the developer about two hours.",
  O20: "We have spent more on fixes than the acceptance testing line brings in.",
};
export const EV2_LEGIT = {
  L01: "Session 3 starts at 09:30 and should take about 90 minutes.",
  L02: "Your team found 6 problems across the three sessions; 4 were Defects.",
  L03: "The bookkeeper tester checked 10 invoices in about an hour.",
  L04: "Your order volume doubled in December.",
  L05: "Fixes were due within the 5 business days quoted; UAT-09 came back in 4.",
  L06: "The acceptance payment of 20% falls due when you sign.",
  L07: "Two fix rounds are included in the quoted UAT line.",
  L08: "Allow half a day for the confirmation run.",
  L09: "Your operations manager spends about an hour a day on exceptions today.",
  L10: "9 of 9 required scenarios passed on build larkspur-uat-4.",
  L11: "Testing ran from 7 to 26 January 2027.",
  L12: "Your own price list sets each line's unit price.",
  L13: "Your warehouse ships about 40 orders a day, a third of them wholesale.",
  L14: "If you neither sign nor report a qualifying defect by 7 December 2026, the request is deemed accepted.",
  L15: "UAT-08 was logged on 22 January and moved to the punch list.",
  L16: "The second session lasted two and a half hours.",
  L17: "Each tester needs their login before 7 January.",
  L18: "Change order CO-01 added two checks at the price it was signed at.",
  L19: "The quoted UAT line covers up to three tester roles.",
  L20: "Your month-end close currently takes three days.",
};
// Data plants: the OD-3 shapes, plus one prose record id (DP09, caught since round 3).
export const EV2_DATA_PLANT = {
  DP01: "| ops-T1 | jane.r@larkspur.example | 10 of 10 |",
  DP02: "| 2027-01-07 | customer call-back | 512-555-0147 |",
  DP03: "| card | 4111 1111 1111 1111 | approved |",
  DP04: "order_id,customer,total\n58213,Ridgeway Cafe,214.50",
  DP05: "| Order | Customer | Amount |\n|---|---|---|\n| 58213 | Ridgeway Cafe | 214.50 |\n| 58214 | Fernhill Deli | 88.00 |\n| 58215 | Oak & Ash | 1,020.00 |\n| 58216 | Brightwater Hotel | 312.40 |\n| 58217 | Hannah's Bakery | 54.00 |\n| 58218 | Willow and Wren | 402.00 |",
  DP06: "| INV-58213 | Ridgeway Cafe | 214.50 | paid |",
  DP07: "Order 58213; Ridgeway Cafe; 214.50; 2026-12-02",
  DP08: "| 4012888888881881 | 12/28 | 214.50 |",
  DP09: "Account 99120345 for Harbor Florists shows 1,045.00 outstanding.",
  DP10: "| C-10293 | m.hale@harborflorists.example | +1 207 555 0182 |",
};
// Data controls: legitimate tables of test steps, schedules, counts, check ids, roles, records created, accounts, runs.
export const EV2_DATA_CONTROL = {
  DC01: "| Step | Do | Expect |\n|---|---|---|\n| 1 | Open the order sheet copy | The ten September orders are listed |\n| 2 | Pick the order SC-01 names | Its lines match the purchase order |\n| 3 | Check the product codes | Each is in the LC-nnnn form |\n| 4 | Settle the exceptions list | Nothing is left on it |\n| 5 | Record the result | One row in the results template |",
  DC02: "| Session | Date | Roles | Time |\n|---|---|---|---|\n| 1 | 2027-01-07 | order coordinator, bookkeeper | 10:00-12:00 |\n| 2 | 2027-01-12 | operations manager | 14:00-15:30 |\n| 3 | 2027-01-21 | every role | 09:30-11:00 |",
  DC03: "| Class | Count |\n|---|---|\n| Defect | 5 |\n| Change | 2 |\n| Training gap | 1 |\n| Environment or data | 1 |\n| Duplicate | 0 |",
  DC04: "| Check | Scenario | Role | Cases |\n|---|---|---|---|\n| AC-1.1 | SC-01 | order coordinator | 10 |\n| AC-1.2 | SC-02 | order coordinator | 2 |\n| AC-2.1 | SC-03 | order coordinator | 3 |\n| AC-3.1 | SC-04 | operations manager | 10 |\n| AC-4.1 | SC-05 | order coordinator | 60 |\n| AC-5.1 | SC-06 | bookkeeper | 10 |\n| AC-5.2 | SC-07 | bookkeeper | 1 |\n| AC-CO-01.1 | SC-08 | operations manager | 5 |\n| AC-CO-01.2 | SC-09 | operations manager | 1 |",
  DC05: "| Role | Tester id | Sessions |\n|---|---|---|\n| order coordinator | oc-T1 | 1, 2, 3 |\n| operations manager | ops-T1 | 1, 2, 3 |\n| bookkeeper | bk-T1 | 1, 3 |",
  DC06: "| Record | Where | Created in |\n|---|---|---|\n| T-0001 | QuickBooks Online sandbox | session 1 |\n| T-0002 | QuickBooks Online sandbox | session 1 |\n| T-0003 | QuickBooks Online sandbox | session 3 |",
  DC07: "| Account | Environment | Created by |\n|---|---|---|\n| bookkeeper tester | QuickBooks Online sandbox | client operations manager |\n| test sender | Larkspur staging mailbox | builder |",
  DC08: "| UAT-nn | Logged | Severity | On the signed list |\n|---|---|---|---|\n| UAT-08 | 2027-01-22 | cosmetic | yes |\n| UAT-10 | 2027-01-27 | minor | no |",
  DC09: "| Run | Date | Build | Result |\n|---|---|---|---|\n| RUN-01 | 2027-01-07 | larkspur-uat-2 | 7 of 12 passed |\n| RUN-03 | 2027-01-21 | larkspur-uat-3 | 12 of 12 passed |\n| RUN-04 | 2027-01-26 | larkspur-uat-4 | 9 of 9 passed |",
  DC10: "tester id,scenario,result,cases passed,note,records created\noc-T1,SC-01,pass,10,,0\noc-T1,SC-02,pass,2,,0\nbk-T1,SC-06,pass,10,,10 invoices in the sandbox",
};
export const EV2_FP_PLANT = {
  FPP01: ["m", "Your shop manager checked and approved every acceptance check."],
  FPP02: ["m", "AC-2.1 passed when your tester ran it."],
  FPP03: ["m", "All three checks were confirmed by the shop."],
  FPP04: ["m", "The shop manager signed off AC-1.1 and AC-1.2 in session 3."],
  FPP05: ["m", "Your staff verified the reorder list (AC-2.1)."],
  FPP06: ["l", "UAT-04 is now working as agreed."],
  FPP07: ["l", "The discount problem (UAT-03) has been sorted."],
  FPP08: ["l", "UAT-05 is closed."],
  FPP09: ["l", "This is fixed."],
  FPP10: ["l", "We repaired UAT-04 in build larkspur-uat-3."],
};
export const EV2_FP_CONTROL = {
  FPC01: ["m", "AC-1.1 was run by Robin alone after two missed sessions."],
  FPC02: ["m", "Your tester was invited on 12 and 17 November 2026."],
  FPC03: ["l", "UAT-04 was reported fixed in build larkspur-uat-3; your testers retest it on 21 January."],
  FPC04: ["l", "UAT-05 goes back to your operations manager for a retest in session 3."],
  FPC05: ["m", "None of the three checks was run by your people."],
  FPC06: ["m", "Your shop manager is welcome to run AC-1.1 before signing."],
  FPC07: ["l", "UAT-03 is not fixed yet."],
  FPC08: ["l", "Once UAT-04 passes its retest, it will be closed."],
  FPC09: ["l", "Your team logged UAT-05 during session 1."],
  FPC10: ["m", "The builder ran AC-2.1; your people have not tested it."],
};
export const EV2_PEOPLE_PLANT = {
  PP01: "Ask Vey about the stock sheet.",
  PP02: "tomas vey ran SC-04.",
  PP03: "Reported by T. Vey.",
  PP04: "Contact: lena.okafor@larkspur.example",
  PP05: "Phone the shop on 555-0199.",
  PP06: "Ring (512) 555 0147 for the warehouse.",
  PP07: "Sign-off by Ms Arden.",
  PP08: "Jess's results were imported.",
  PP09: "Tester: Dana Whitfield",
  PP10: "Arden, J. (order coordinator)",
};
export const EV2_PEOPLE_CONTROL = {
  PC01: "Recorded by Robin.",
  PC02: "The order coordinator (oc-T1) imported the results.",
  PC03: "Session 2 is on Tuesday 12 January.",
  PC04: "QuickBooks Online and Google Sheets hold the test data.",
  PC05: "Orders shipped to Austin, Texas are in the sample.",
  PC06: "The Operations Manager role signs the request.",
  PC07: "Larkspur Ceramics' staging mailbox receives the orders.",
  PC08: "Call the operations manager if the sandbox is down.",
  PC09: "St. Louis and New Orleans warehouses are out of scope.",
  PC10: "Version 2.4 of the export, released 2027-01-02, is the one tested.",
};
export const EV2_CRED_PLANT = {
  CR01: "Sandbox login: bk-T1 / Teapot#2027",
  CR02: "The password for the test sender is Morning-Glory-81.",
  CR03: "pass phrase: blue kiln seven",
  CR04: "PIN 4471 opens the till.",
  CR05: "Use passcode=990211.",
  CR06: "Open https://bk-t1:Sandbox99@qbo.example/login",
  CR07: "secret: 9f8c7a6b5d4e3f2a1b0c",
  CR08: "Bearer token: abcDEF123ghiJKL456mnoPQR789",
  CR09: "The creds are admin/admin.",
  CR10: "The client gave us the API key qbo_live_7Hk29xLmP0aZ.",
};
export const EV2_CRED_CONTROL = {
  CC01: "Your login comes from the operations manager.",
  CC02: "If your password does not work, ask the operations manager to reset it.",
  CC03: "Passwords are never written in this pack or the results file.",
  CC04: "SC-07 checks that a wrong PIN is refused.",
  CC05: "The token on the invoice is its reference number.",
  CC06: "Use the payment provider's test mode and its published test card.",
  CC07: "kind: password | role: bookkeeper | source: results-session-1.csv row 7 | session: 1",
  CC08: "Two-step sign-in sends a code to the tester's work phone.",
  CC09: "Key: a tick means the case passed.",
  CC10: "The secret of a clean month end is the exceptions list.",
};

// ── ROUND-3 HELD-OUT sets (OW-04, after evaluation round 2) ──────────────────
// Written on 2026-10-17 BEFORE any round-3 rule change, from the category
// definitions only (D1 our side; C7 credentials; OD-7 tables judged by their
// rows; C8 who tested, with negations, futures and invitations), and measured
// against the round-2 rules ("before") and the round-3 rules ("after", before
// any of these misses were grown into the net). The same author wrote the rules
// and these sets, so "after" is not an untuned rate.
//   our side     before 12/15 caught, after 13/15 (missed both times: "cost our
//                developer the better part of Tuesday", "adds a quarter to our
//                UAT price")
//   legitimate   before 14/15 pass by the our-side rule ("Your own price list
//                sets the unit price ..." flagged), after 15/15; 15/15 by the
//                data, who-tested, people and credentials rules both times
//   false pass   caught 6/6 before and after; legitimate (negation, future,
//                invitation) before 2/4 pass, after 4/4
//   credentials  before 2/7 caught, after 7/7; legitimate 3/3 both times
//   tables       caught (data rule) before 2/5, after 5/5; legitimate count and
//                schedule tables before 1/5 pass, after 5/5
// The two our-side misses were then grown into the net (rules marked "added
// after the round-3 held-out measurement"), so these are regression cases too.
export const HELDOUT3_OURS = [
  "Getting the sandbox ready cost our developer the better part of Tuesday.",
  "We've put about fifteen hours into the address fix so far.",
  "This round has gone over what we budgeted for the fixes.",
  "The retests are costing us more than the UAT line pays.",
  "Our day rate for an extra session is 600.",
  "An extra tester role adds a quarter to our UAT price.",
  "We spent three evenings on the import mapping.",
  "We estimated half a day for the fix; it took two.",
  "Our profit on this phase is gone.",
  "Behind the scenes, the duplicate-order bug took us a full week.",
  "The time Robin logged on retests is well past the plan.",
  "We're absorbing the cost of the fourth fix round.",
  "Fixing the totals used most of the contingency we set aside.",
  "Our internal estimate for UAT-07 was four hours.",
  "The developer billed 22 hours to the confirmation-view fix.",
];
export const HELDOUT3_LEGIT = [
  "Your stocktake usually takes the warehouse team two days.",
  "Session 2 is booked for 90 minutes on Wednesday 13 January.",
  "The quoted UAT line includes two fix rounds within five business days each.",
  "Your own price list sets the unit price on each invoice line.",
  "The final payment of 20 percent is due 14 days after the invoice.",
  "Your bookkeeper raised 4 problems in session 1 and 1 in session 2.",
  "Each tester needs about 40 minutes for their scenarios.",
  "The fix for the label problem reached the test environment on 18 January.",
  "Your shop manager is welcome to rerun AC-1.1 before signing.",
  "Change order CO-02, signed on 8 January, adds its checks to this acceptance.",
  "Your team handles about 120 orders on a busy Monday.",
  "Half of the scenarios use synthetic orders made for the test.",
  "The confirmation run is the last of the three sessions.",
  "Records created during testing: 6 test orders and 2 test invoices in the sandbox.",
  "Your operations manager will reset each tester's login after sign-off.",
];
/** Who tested: AC-2.4 and AC-7.1 passed only "user alone"; UAT-14 and UAT-21 are fixed, not retested; UAT-15 passed its retest. */
export const HELDOUT3_FP_CONTEXT = { userAlone: ["AC-2.4", "AC-7.1"], notRetested: ["UAT-14", "UAT-21"], retested: ["UAT-15"] };
export const HELDOUT3_FALSE_PASS = {
  caught: [
    "AC-2.4 was confirmed by the shop's staff.",
    "Your operations manager tested and approved AC-7.1.",
    "UAT-14 has been sorted out.",
    "Every check was signed off by your people.",
    "UAT-21 is working now.",
    "The client's team verified AC-2.4 in session 3.",
  ],
  legit: [
    "UAT-14 is not fixed yet.",
    "Once UAT-21 passes its retest, it will be closed.",
    "Your team is welcome to try AC-7.1 themselves before signing.",
    "UAT-15 passed its retest in RUN-05; UAT-14 is still waiting for one.",
  ],
};
export const HELDOUT3_CREDENTIALS = {
  caught: [
    "The password for the bookkeeper's sandbox account is Lantern-Moss-52.",
    "passphrase: copper kettle nine",
    "Use PIN 9184 at the till.",
    "Log in with ops / ops to start.",
    "The shared secret is Kj7#pLq2!",
    "Admin login: admin, password admin123",
    "Your access code is 448812.",
  ],
  legit: [
    "The password policy needs twelve characters.",
    "Ask the operations manager for the login to the test till.",
    "No PIN or password appears in this pack.",
  ],
};
/** OD-7: a table is flagged by its content (personal or ID-like values), never by its length. */
export const HELDOUT3_TABLES = {
  caught: [
    "| order | customer | email |\n|---|---|---|\n| 10233 | Harbour Florists | orders@harbour.example |",
    "| name | phone |\n|---|---|\n| Dana Whitfield | 555-0181 |\n| Ola Brandt | 555-0133 |",
    "| invoice | amount |\n|---|---|\n| INV-55210 | 120.00 |\n| INV-55211 | 96.40 |\n| INV-55212 | 14.00 |\n| INV-55213 | 310.10 |\n| INV-55214 | 72.25 |",
    "| card | status |\n|---|---|\n| 4000 1234 5678 9010 | declined |",
    "| account | customer | balance |\n|---|---|---|\n| ACC-77120 | Delgado Supply | 1,204.00 |\n| ACC-77121 | Oak Street Cafe | 88.10 |",
  ],
  legit: [
    "| session | date | start | testers |\n|---|---|---|---|\n| 1 | 2027-01-07 | 10:00 | 3 |\n| 2 | 2027-01-12 | 10:00 | 3 |\n| 3 | 2027-01-14 | 14:00 | 2 |\n| 4 | 2027-01-19 | 10:00 | 3 |\n| 5 | 2027-01-21 | 10:00 | 3 |",
    "| week | orders tested | problems |\n|---|---|---|\n| 1 | 40 | 3 |\n| 2 | 55 | 2 |\n| 3 | 60 | 1 |\n| 4 | 48 | 0 |\n| 5 | 52 | 0 |",
    "| step | expected rows | expected total |\n|---|---|---|\n| 1 | 10 | 540.00 |\n| 2 | 12 | 610.50 |\n| 3 | 8 | 402.00 |\n| 4 | 10 | 515.00 |\n| 5 | 9 | 480.25 |",
    "| session | problems logged | fixed | retested |\n|---|---|---|---|\n| 1 | 4 | 4 | 4 |\n| 2 | 2 | 2 | 1 |\n| 3 | 1 | 0 | 0 |\n| 4 | 0 | 0 | 0 |\n| 5 | 0 | 0 | 0 |",
    "| payment | share | amount |\n|---|---|---|\n| To book | 40% | USD 6,980.00 |\n| Working demo | 40% | USD 6,980.00 |\n| Acceptance | 20% | USD 3,490.00 |\n| Documentation | none | USD 4,000.00 |\n| Change order CO-02 | none | USD 1,200.00 |",
  ],
};
