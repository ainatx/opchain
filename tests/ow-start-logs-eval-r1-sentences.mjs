// Copied verbatim into the repo in OW-08 round 2 as permanent tests (contract C18), from the
// Evaluator's harness h/untuned-sentences.mjs; tests/ow-start-logs-acceptance.test.js reads it.
// Evaluator OW-08 R1 untuned sets. Written 2026-10-17 BEFORE reading
// scripts/ow-start-logs-acceptance.mjs, tests/ow-start-logs-sentences.mjs or
// references/self-checks-logs.md. Kind: plain = plain wording (miss is a defect);
// implied = idiom / marker-less implied claim (miss accepted by owner decision).

// ---- OUR-side paraphrases in a follow-up (must be flagged) ----
export const OURS = [
  ['U01','plain','Our hourly charge for this phase stays the same.'],
  ['U02','plain','My day rate covers the on-site visit to the studio.'],
  ['U03','plain','I charge a premium for weekend deployments.'],
  ['U04','plain','We will take a small hit on margin to keep the launch date.'],
  ['U05','plain','This took me about nine hours to put together.'],
  ['U06','plain','I have already put two days into the export script.'],
  ['U07','plain','Billed at 140 dollars an hour, the extra screens come to 1,120 dollars.'],
  ['U08','plain','At my standard rate this would be about four thousand dollars.'],
  ['U09','plain','Our margin on this piece is thin.'],
  ['U10','plain','We are running about 20% over our own estimate on the importer.'],
  ['U11','plain','I padded the estimate by 1.5x for the unknowns.'],
  ['U12','plain','We have used most of the build hours we budgeted.'],
  ['U13','plain','I logged eleven hours against the inventory sync this week.'],
  ['U14','plain','The fee for the extra design round is 800 dollars.'],
  ['U15','plain','My rate goes up in January.'],
  ['U16','plain','We are at roughly 70% of the budgeted effort.'],
  ['U17','plain','The markup on the label stock is 15%.'],
  ['U18','plain','The extra screens add 12 hours of work on our side.'],
  ['U19','plain','We will absorb the cost of the extra revision.'],
  ['U20','plain','I will bill the extra review time separately.'],
  ['U21','plain','Our blended rate does not change for the second phase.'],
  ['U22','plain','That puts us six hours past our plan for this milestone.'],
  ['U23','plain','My hosting cost is 12 dollars a month, which I pass through at cost.'],
  ['U24','plain','The effort on our side was roughly three developer days.'],
  ['U25','plain','We are over budget on the label printer work.'],
  ['U26','plain','Our profit on the first milestone was lower than planned.'],
  ['U27','plain','I quoted this at a discounted rate.'],
  ['U28','implied','I am eating the overrun on the label printer work.'],
  ['U29','implied','We quoted low, so we are under water on this one.'],
  ['U30','implied','I worked late on Sunday to get the prototype ready.'],
  ['U31','implied','It cost us more time than expected to clean the CSV.'],
  ['U32','plain','<!-- ow:internal --> remember to chase the deposit'],
];

// ---- Legitimate meeting / follow-up sentences (must pass) ----
export const LEGIT = [
  ['L01','Thanks for the 45-minute call this morning.'],
  ['L02','Your team ships about 60 orders in a busy week.'],
  ['L03','The client ops lead sends the product export by 23 October.'],
  ['L04','We agreed to launch the wholesale page before the November market.'],
  ['L05','Your shop manager will confirm the glaze names by Friday 31 October.'],
  ['L06','You will send the shipping zones spreadsheet by 30 October.'],
  ['L07','We decided to keep the current payment processor.'],
  ['L08','Your current shipping rate to Canada is a flat fee per box.'],
  ['L09','Your wholesale customers pay on 30-day terms.'],
  ['L10','The studio closes for two weeks over the holidays.'],
  ['L11','Your average order is around 85 dollars.'],
  ['L12','Still open: whether gift cards carry over to the new shop.'],
  ['L13','The studio owner will check with the accountant about sales tax by 6 November.'],
  ['L14','We will send a first draft of the order page by 4 November.'],
  ['L15','Your busiest season runs from mid-November to the end of December.'],
  ['L16','You mentioned that about a third of orders are local pickup.'],
  ['L17','We confirmed that the mailing list stays with its current provider.'],
  ['L18','The studio manager owns the product photos, due 10 November.'],
  ['L19','Your returns run at about 3 percent of orders.'],
  ['L20','Thanks again for walking us through the packing room.'],
  ['L21','Your hourly pickup slots stay as they are.'],
  ['L22','Your staff spend about two hours a day on manual stock updates.'],
  ['L23','The price of the large planter goes up in January to cover clay costs.'],
  ['L24','We decided the gift-wrap option is out of scope for the first release.'],
  ['L25','The developer will share a test link for the stock counts by 12 November.'],
  ['L26','Your bookkeeper asked for the order export as a CSV.'],
  ['L27','Your wholesale discount stays at the level your price list shows.'],
  ['L28','We will hold the next check-in on Thursday 6 November at 10am.'],
  ['L29','The kiln runs about 14 hours per firing, so firing days stay fixed.'],
  ['L30','Your packing team works eight-hour shifts on Mondays and Thursdays.'],
];

// ---- People names (must be flagged) and role/product controls (must pass) ----
export const NAMES = [
  ['N01','email','If anything changes, reach me at robin@example.com.'],
  ['N02','phone','Call the studio on 555-0142 if anything changes.'],
  ['N03','phone','Our number is +1 (512) 555-0199.'],
  ['N04','honorific','Ms. Okafor confirmed the glaze list.'],
  ['N05','honorific','Mr Alvarez will pay the deposit by Friday.'],
  ['N06','honorific','Dr. Lee will review the returns policy.'],
  ['N07','from-org','Jordan from Larkspur Ceramics will send the export.'],
  ['N08','from-org','Hannah from Example Studio will draft the order page.'],
  ['N09','cc','cc: Priya Natarajan'],
  ['N10','email','Send the file to hannah.k@larkspur.example by Friday.'],
  ['N11','phone','Text 512.555.0177 when the boxes arrive.'],
  ['N12','honorific','Mrs. Chen will bring the samples.'],
];
export const NAME_CONTROLS = [
  ['P01','The ops lead will send the export by Friday.'],
  ['P02','Larkspur Ceramics moves its online shop to the new platform in November.'],
  ['P03','The Saturday market in San Marcos takes card payments.'],
  ['P04','We will launch in May, before the June craft fair.'],
  ['P05','Orders from Etsy now go to the new shop.'],
  ['P06','Stoneware from Laguna arrives on Monday.'],
  ['P07','The studio owner prefers USPS Priority Mail for wholesale boxes.'],
  ['P08','Your Square reader works with the new checkout.'],
  ['P09','The Holiday Market opens on Friday 21 November.'],
  ['P10','cc: the studio owner'],
  ['P11','Thanks from all of us at Example Studio.'],
  ['P12','Google Sheets stays the source for stock counts until April.'],
  ['P13','The Austin warehouse ships on Tuesdays and Thursdays.'],
  ['P14','Mailchimp keeps the customer list.'],
  ['P15','Glaze samples from Amaco come in on Wednesday.'],
];

// ---- Private names (must be flagged) and controls (must pass). Written before the checker. ----
export const PRIVATE = [
  ['V01','The brief came over from Deftwright last week.'],
  ['V02','Thanks from the deftwright team.'],
  ['V03','DEFTWRIGHT will send the draft.'],
  ['V04','Deft wright will send the draft.'],
  ['V05','Deft-Wright will send the draft.'],
  ['V06','Draft prepared with llc-ops.'],
  ['V07','Draft prepared with LLC-OPS.'],
  ['V08','Draft prepared with llc ops.'],
  ['V09','Draft prepared with llc_ops.'],
  ['V10','DeftWright LLC owns the template.'],
  ['V11','See deft_wright for the source.'],
  ['V12','Deftwright’s template was used.'],
];
export const PRIVATE_CONTROLS = [
  ['W01','The client ops lead made a deft fix to the export.'],
  ['W02','The boatwright down the road supplies crates.'],
  ['W03','The LLC filing is the client owner’s question.'],
  ['W04','The ops lead runs the Monday stock count.'],
  ['W05','Wright Street is where the studio is.'],
];

// ---- STATUS grammar: legitimate lines (must pass) and bad lines (must fail). ----
// Workstream larkspur-ceramics, MTG-02 attendees: you, client ops lead, client owner.
const P = '2026-10-20 (clock: user-stated) | ow-start 1.1.0 | ';
const W = 'logs/larkspur-ceramics/';
const NX = 'next: ow-start /ow-start-action logs/larkspur-ceramics/';
export const STATUS_OK = [
  ['S01', P + W + 'meetings/MTG-02/agenda.md | next: ow-start /ow-start-log-meeting logs/larkspur-ceramics/ | awaiting: meeting on 2026-10-20'],
  ['S02', P + W + 'meetings/MTG-02/notes.md | next: none (closed: held 2026-10-20) | awaiting: none'],
  ['S03', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client ops lead) by 2026-10-23'],
  ['S04', P + W + 'meetings/MTG-02/notes.md#A-04 | ' + NX + ' | awaiting: A-04 (you) by 2026-10-24'],
  ['S05', P + W + 'meetings/MTG-02/notes.md#A-05 | ' + NX + ' | awaiting: A-05 (client owner), no date'],
  ['S06', P + W + 'meetings/MTG-02/notes.md#A-03 | next: none (closed: done) | awaiting: none (done 2026-10-22)'],
  ['S07', P + W + 'meetings/MTG-02/notes.md#A-04 | next: none (closed: dropped) | awaiting: none (dropped 2026-10-22)'],
  ['S08', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client ops lead) by 2026-11-02'],
  ['S09', P + W + 'decisions/DEC-02.md | ' + NX + ' | awaiting: DEC-02 review by 2026-12-01'],
  ['S10', P + W + 'decisions/DEC-02.md | next: none (closed: reviewed) | awaiting: none (reviewed 2026-12-01, kept)'],
  ['S11', P + W + 'decisions/DEC-01.md | next: none (closed: superseded by DEC-02) | awaiting: none (superseded 2026-10-20)'],
  ['S12', '2026-10-20 (clock: tool) | ow-start 1.1.0 | ' + W + 'meetings/MTG-02/notes.md#A-06 | ' + NX + ' | awaiting: A-06 (client owner) by 2026-10-31'],
];
export const STATUS_BAD = [
  ['X01','client words in awaiting', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client ops lead) glaze list by 2026-10-23'],
  ['X02','name as owner', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (Maria) by 2026-10-23'],
  ['X03','description in path (folder)', P + W + 'meetings/MTG-02-glaze-review/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client ops lead) by 2026-10-23'],
  ['X04','description in path (anchor)', P + W + 'meetings/MTG-02/notes.md#A-03-glaze-list | ' + NX + ' | awaiting: A-03 (client ops lead) by 2026-10-23'],
  ['X05','free text in next', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' chase the glaze list | awaiting: A-03 (client ops lead) by 2026-10-23'],
  ['X06','client name in prep awaiting', P + W + 'meetings/MTG-02/agenda.md | next: ow-start /ow-start-log-meeting logs/larkspur-ceramics/ | awaiting: meeting on 2026-10-20 with Larkspur'],
  ['X07','free text in closed reason', P + W + 'meetings/MTG-02/notes.md#A-03 | next: none (closed: done, list received) | awaiting: none (done 2026-10-22)'],
  ['X08','role not an attendee', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client accountant) by 2026-10-23'],
  ['X09','next: none without closed (amendment form)', P + W + 'meetings/MTG-02/notes.md#A-03 | next: none | awaiting: A-03 (client ops lead) by 2026-10-23'],
  ['X10','date not ISO', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (client ops lead) by 23 October'],
  ['X11','email as owner', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-03 (ops@larkspur.example) by 2026-10-23'],
  ['X12','client text after review', P + W + 'decisions/DEC-02.md | ' + NX + ' | awaiting: DEC-02 review by 2026-12-01 (glaze supplier)'],
  ['X13','awaiting id mismatches path id', P + W + 'meetings/MTG-02/notes.md#A-03 | ' + NX + ' | awaiting: A-07 (client ops lead) by 2026-10-23'],
  ['X14','other workstream in next', P + W + 'meetings/MTG-02/notes.md#A-03 | next: ow-start /ow-start-action logs/business/ | awaiting: A-03 (client ops lead) by 2026-10-23'],
];
