// Evaluator OW-08 R2 untuned sets. Written 2026-10-17 BEFORE reading the round-2 checker
// (scripts/ow-start-logs-acceptance.mjs @ 8553905f), tests/ow-start-logs-heldout.mjs or the
// round-2 sentence files. Kind: plain = plain wording (a miss is a defect);
// implied = idiom / marker-less implied claim (a miss is accepted, owner decision D2).

export const OURS2 = [
  ["A01", "plain", "My consulting rate for the extra screens is unchanged."],
  ["A02", "plain", "I bill by the half day for site visits."],
  ["A03", "plain", "Our fee for the second workshop stays where it was."],
  ["A04", "plain", "I spent most of Tuesday on the export mapping."],
  ["A05", "plain", "The mapping cost me about ten hours."],
  ["A06", "plain", "We've used up the hours we set aside for the importer."],
  ["A07", "plain", "We're running over our estimate on the label printing."],
  ["A08", "plain", "My margin on the hardware is small."],
  ["A09", "plain", "I add 20% on top for rush jobs."],
  ["A10", "plain", "The price includes a 10% contingency on my side."],
  ["A11", "plain", "We are losing money on the photo clean-up."],
  ["A12", "plain", "I'll charge the travel separately at cost."],
  ["A13", "plain", "Our hourly rate goes up in the new year."],
  ["A14", "plain", "This work is outside the fixed price, so I'll bill it at my hourly rate."],
  ["A15", "plain", "It took me three full days to clean the product list."],
  ["A16", "plain", "Our estimate for the stock sync was 12 hours and we're at 18."],
  ["A17", "plain", "I discounted my rate for this phase."],
  ["A18", "plain", "The developer time on our side came to about two weeks."],
  ["A19", "plain", "My time on the extra report is not covered by the quote."],
  ["A20", "plain", "We are about a week behind our own plan for the importer."],
  ["A21", "plain", "I put in an extra evening to finish the field list."],
  ["A22", "plain", "Internal note: check the deposit before the next call."],
  ["A23", "implied", "This one is a labour of love at this point."],
  ["A24", "implied", "We're basically doing the extra report for free."],
  ["A25", "implied", "Let's just say this phase won't make me rich."],
];

export const LEGIT2 = [
  ["B01", "Thanks for the hour-long walkthrough of the warehouse on Monday."],
  ["B02", "Your team spends about three hours every Friday reconciling the stock count."],
  ["B03", "Your average wholesale order is about 40 boxes."],
  ["B04", "The client ops lead will send the supplier list by 28 October."],
  ["B05", "We agreed that the online shop stays open during the switchover."],
  ["B06", "Your shipping charge to the islands is a flat rate per order."],
  ["B07", "Your accountant charges you monthly, so the export runs on the first."],
  ["B08", "Your wholesale buyers pay within 45 days of the invoice."],
  ["B09", "About one order in twenty is returned, mostly for breakage."],
  ["B10", "The studio owner decided to keep the current label size."],
  ["B11", "Still open: whether the markets stock moves to the same sheet."],
  ["B12", "Me: send the draft order page, by 6 November 2026."],
  ["B13", "Your kiln runs about 12 hours a firing, three firings a week."],
  ["B14", "Your price list has 140 products across six ranges."],
  ["B15", "The bookkeeper will confirm the tax codes by Friday 31 October."],
  ["B16", "Your busiest month last year was December, with about 300 orders."],
  ["B17", "Thanks for the clear answers on how refunds work today."],
  ["B18", "We decided to launch the new order page before the holiday market."],
  ["B19", "Your staff cost for packing is the biggest line in your budget."],
  ["B20", "Your margin on the large planters is what you want to protect."],
  ["B21", "The client owner prefers updates by email rather than a call."],
  ["B22", "Your delivery partner raised their rates in September."],
];

export const NAMES2 = [
  ["C01", "email", "Send it to orders@larkspur.example by Friday."],
  ["C02", "phone", "Ring the warehouse on (512) 555 0188."],
  ["C03", "phone", "Text 5125550199 when the pallets arrive."],
  ["C04", "honorific", "Mr. Okonkwo will sign the order."],
  ["C05", "honorific", "Prof Hale reviewed the glaze safety sheet."],
  ["C06", "from-org", "Marisol from Northwind Freight confirmed Tuesday."],
  ["C07", "known", "Dana will send the export by Friday."],
  ["C08", "known", "Thanks again, Jess, for the walkthrough."],
  ["C09", "cc", "cc: Ana Lima"],
  ["C10", "user", "Robin will send the draft field list."],
  ["C11", "phone", "Call +44 20 7946 0958 for the UK supplier."],
];
export const NAME_CONTROLS2 = [
  ["D01", "The ops lead from Larkspur Ceramics will send the export."],
  ["D02", "Payments from Shopify settle every Tuesday."],
  ["D03", "The client owner and the bookkeeper attended from the studio."],
  ["D04", "Labels from Avery fit the new printer."],
  ["D05", "The Austin market runs every Saturday in November."],
  ["D06", "Orders arrive from Etsy and from the website."],
  ["D07", "QuickBooks Online stays the source for invoices."],
  ["D08", "We meet again on Wednesday 5 November."],
  ["D09", "Clay from Laguna arrives on Thursday."],
  ["D10", "The vendor account manager from the invoicing tool will call back."],
];

export const PRIVATE2 = [
  ["E01", "Deftwright"], ["E02", "deftwright"], ["E03", "DEFT WRIGHT"], ["E04", "Deft-wright"],
  ["E05", "deft_wright"], ["E06", "llc-ops"], ["E07", "LLC OPS"], ["E08", "llc_ops"],
  ["E09", "llcops"], ["E10", "Deftwright's"], ["E11", "LLC-Ops"],
];
export const PRIVATE_CONTROLS2 = [
  ["F01", "a deft fix"], ["F02", "the wheelwright"], ["F03", "LLC"], ["F04", "the ops lead"], ["F05", "Wright Street studio"],
];
