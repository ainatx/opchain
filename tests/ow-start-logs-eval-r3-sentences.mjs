// Evaluator OW-08 R3 untuned sets. Written 2026-10-17 BEFORE reading the round-3 checker
// (scripts/ow-start-logs-acceptance.mjs @ 1f8bcb5f) or any round-3 sentence file.
// plain = plain wording (a miss is a defect); implied = idiom / marker-less (a miss is accepted).

export const OURS3 = [
  ["G01", "plain", "I charged the extra screens at my weekend rate."],
  ["G02", "plain", "We spent two full days on the stock import."],
  ["G03", "plain", "My hours on the field list ran well past the estimate."],
  ["G04", "plain", "Our cost for the hosting is passed on with a small mark-up."],
  ["G05", "plain", "I put about six hours into the label template."],
  ["G06", "plain", "We are losing money on this milestone."],
  ["G07", "plain", "The work took us twice as long as we planned."],
  ["G08", "plain", "My day rate for the training session is the same as last time."],
  ["G09", "plain", "I'll invoice the extra visit at my usual hourly price."],
  ["G10", "plain", "We under-priced the export work."],
  ["G11", "plain", "Our margin on this phase is thin."],
  ["G12", "plain", "The importer cost us a week more than we budgeted."],
  ["G13", "plain", "I worked through the weekend on the order view."],
  ["G14", "plain", "We're charging the rush fee for this change."],
  ["G15", "plain", "My estimate for the clean-up was off by a day and a half."],
  ["G16", "plain", "We discounted the second workshop by 15%."],
  ["G17", "plain", "The developer spent most of Monday on the sync on our side."],
  ["G18", "implied", "Let's say this one paid for the coffee and not much else."],
  ["G19", "implied", "We're in the red on the photo work."],
  ["G20", "implied", "This milestone has been a bit of a money pit for us."],
];

// Legitimate client effort, scheduling, figures, terms, owners, decisions (must pass).
export const LEGIT3 = [
  ["H01", "Your team spent two full days counting stock last month."],
  ["H02", "Your bookkeeper works on the invoices every Monday morning."],
  ["H03", "The client ops lead will spend Friday afternoon on the product photos."],
  ["H04", "Your packers worked through the weekend before the holiday market."],
  ["H05", "Your staff take about a day and a half to close each month."],
  ["H06", "Your hourly pickup slots run from 9 to 5."],
  ["H07", "Your day rate for the pottery class is listed on your website."],
  ["H08", "Your margin on the mugs is what you want to protect."],
  ["H09", "Your carrier's rates went up in October."],
  ["H10", "The client owner will review the order view on Thursday 6 November."],
  ["H11", "Your wholesale orders are about twice the size of retail ones."],
  ["H12", "We agreed the export runs every night at 2am."],
  ["H13", "Your busiest week in 2025 had about 210 orders."],
  ["H14", "Your accountant charges a fixed monthly fee."],
  ["H15", "The studio was closed for a week in August for the kiln repair."],
  ["H16", "Me: send the revised field list, by 7 November 2026."],
  ["H17", "Thanks for the two-hour session on Tuesday."],
  ["H18", "Your price list goes up by 5% in January."],
  ["H19", "The client owner decided to keep phone orders on the sheet until March."],
  ["H20", "Your team will need about three hours to test the order view."],
];

export const NAMES3 = [
  ["J01", "email", "Write to studio.owner@larkspur.example with the photos."],
  ["J02", "phone", "Call 512 555 0161 about the delivery."],
  ["J03", "phone", "The warehouse number is 1-512-555-0172."],
  ["J04", "phone", "Ring +61 2 9374 4000 for the Sydney supplier."],
  ["J05", "honorific", "Ms Ferreira will confirm the glaze list."],
  ["J06", "from-org", "We heard back: Tobias from Northwind Freight confirmed the date."],
  ["J07", "known", "Marcus asked for the export by Friday."],
  ["J08", "cc", "cc: Lena Park, Tom Reyes"],
  ["J09", "user", "Robin will draft the order page."],
  ["J10", "honorific", "Dr. Amara Singh signed off the label safety sheet."],
];
export const NAME_CONTROLS3 = [
  ["K01", "Glaze orders from Amaco arrive on Wednesday."],
  ["K02", "The client owner from Larkspur Ceramics joined the call."],
  ["K03", "Stock from the Austin warehouse ships on Tuesdays."],
  ["K04", "cc: the bookkeeper"],
  ["K05", "QuickBooks Online and Shopify stay in place."],
  ["K06", "We meet again in May, after the April market."],
  ["K07", "Version 2.1 of the order sheet goes live on 3 November."],
  ["K08", "Order 1042 shipped late because of the label printer."],
];

export const PRIVATE3 = [
  ["L01", "Deftwright"], ["L02", "DeftWright"], ["L03", "deft wright"], ["L04", "deft-wright"],
  ["L05", "DEFT_WRIGHT"], ["L06", "llc-ops"], ["L07", "Llc Ops"], ["L08", "llc_ops"], ["L09", "LLCOPS"], ["L10", "deftwright.com"],
];
export const PRIVATE_CONTROLS3 = [
  ["M01", "a deft wording"], ["M02", "the Wright brothers"], ["M03", "an LLC"], ["M04", "ops lead"], ["M05", "shipwright"],
];
