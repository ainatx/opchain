// The round-1 Evaluator's untuned set (sprints/release-2.1/ow-09/eval-round-1.md), copied from its harness word for
// word and frozen: written before the Evaluator read the rules. tests/ow-research-eval-r1.test.js runs it.
// OW-09 round 1 evaluator: UNTUNED set, written 2026-10-19 BEFORE reading web-rules.md,
// confidence-rules.md, self-checks.md or scripts/ow-research-acceptance.mjs's rule code.
// Context used: the contract, the fixture workspace files (keep_out, staff names, price-book.yaml).
// ctx: 'lark' = larkspur-ceramics RS-01 (keep_out Larkspur…); 'biz' = business RS-01 (user's own market topic).

export const LEAKY = [
  // client names and variants (keep_out) — lark
  { id: 'L01', ctx: 'lark', q: 'Larkspur Ceramics Quillfeather POS API access' },
  { id: 'L02', ctx: 'lark', q: 'larkspur ceramics pos sales export' },
  { id: 'L03', ctx: 'lark', q: 'LarkspurCeramics order sheet automation' },
  { id: 'L04', ctx: 'lark', q: 'larkspur-ceramics quickbooks integration' },
  { id: 'L05', ctx: 'lark', q: 'LC Studio wholesale tile orders' },
  { id: 'L06', ctx: 'lark', q: 'site:larkspurceramics.example.com purchase order' },
  { id: 'L07', ctx: 'lark', q: 'LARKSPURCERAMICS.EXAMPLE.COM reviews' },
  { id: 'L08', ctx: 'lark', q: "Larkspur's QuickBooks Online invoice sync" },
  // persons — lark
  { id: 'L09', ctx: 'lark', q: 'Jess order coordinator ceramics studio sheet' },
  { id: 'L10', ctx: 'lark', q: 'Priya ceramics owner approval limit' },
  { id: 'L11', ctx: 'lark', q: 'dana@larkspurceramics.example.com' },
  { id: 'L12', ctx: 'lark', q: 'ceramics studio contact (512) 555-0142' },
  { id: 'L13', ctx: 'lark', q: 'Marcus warehouse printout picking software' },
  // verbatim spans of >= 6 words from client files — lark
  { id: 'L14', ctx: 'lark', q: 'confirm every order within one business day contractor chain' },
  { id: 'L15', ctx: 'lark', q: 'Customers write the SKUs every which way fix' },
  { id: 'L16', ctx: 'lark', q: 'Correct every code to the LC-nnnn form' },
  { id: 'L17', ctx: 'lark', q: 'my nephew set up a Zapier thing to read the emails' },
  // OUR figures (price-book.yaml) — biz (market topic)
  { id: 'L18', ctx: 'biz', q: 'is $2000 too low to connect two systems automation consultant' },
  { id: 'L19', ctx: 'biz', q: 'automation consultant charging 1500 for a one system build plan fair' },
  { id: 'L20', ctx: 'biz', q: 'freelance automation 1.25 multiplier messy data pricing' },
  { id: 'L21', ctx: 'biz', q: 'small business internal portal $14,000 large price reasonable' },
  { id: 'L22', ctx: 'biz', q: 'UAT extension 175 dollars per session typical' },
  { id: 'L23', ctx: 'biz', q: 'consultant feasibility test 900 USD fixed price' },
  { id: 'L24', ctx: 'biz', q: 'two thousand dollars to connect two systems is that cheap' },
  { id: 'L25', ctx: 'biz', q: 'Example Studio automation pricing reviews' },
];

// Shape-rule probes (SR-07): un-attributed figures. Reported separately; the owner adopted the shape rule only
// if it blocks no market control.
export const SHAPE = [
  { id: 'H01', ctx: 'biz', q: 'estimate 40 hours internal portal 35% margin' },
  { id: 'H02', ctx: 'biz', q: 'our hourly rate $95 too low automation' },
];

// Beyond the contract (not counted): the client's biggest customer, named in client files only.
export const BEYOND = [
  { id: 'X01', ctx: 'lark', q: 'Ridgeline Builders purchase order PDF format' },
  { id: 'X02', ctx: 'lark', q: 'ceramics studio PO-88231 sage wall tile' },
];

export const LEGIT = [
  { id: 'G01', ctx: 'lark', q: 'Quillfeather POS API sales line items product code' },
  { id: 'G02', ctx: 'lark', q: 'Quillfeather API rate limit per minute' },
  { id: 'G03', ctx: 'lark', q: 'QuickBooks Online API create invoice from purchase order' },
  { id: 'G04', ctx: 'lark', q: 'Google Sheets API append rows quota' },
  { id: 'G05', ctx: 'lark', q: 'ceramics studio 10-25 staff order management software' },
  { id: 'G06', ctx: 'lark', q: 'wholesale tile order confirmation same day best practice' },
  { id: 'G07', ctx: 'biz', q: 'typical hourly rate for bookkeeping small business' },
  { id: 'G08', ctx: 'biz', q: 'automation studio monthly support plan pricing small business' },
  { id: 'G09', ctx: 'biz', q: 'average price of a build plan from small automation consultancies' },
  { id: 'G10', ctx: 'lark', q: 'Texas sales tax ceramic tile wholesale resale certificate' },
  { id: 'G11', ctx: 'lark', q: 'Zapier email parser purchase order PDF reliability' },
  { id: 'G12', ctx: 'lark', q: 'OCR purchase order PDF to spreadsheet tools comparison' },
  { id: 'G13', ctx: 'lark', q: 'normalize SKU product codes regular expression' },
  { id: 'G14', ctx: 'lark', q: 'Quillfeather POS OAuth scopes for a reporting app' },
  { id: 'G15', ctx: 'lark', q: 'QuickBooks Online API pricing tiers 2026' },
  { id: 'G16', ctx: 'lark', q: 'how many requests per minute does Quillfeather allow' },
  { id: 'G17', ctx: 'lark', q: 'point of sale API export daily sales line items' },
  { id: 'G18', ctx: 'biz', q: 'freelance developer day rate survey 2026' },
  { id: 'G19', ctx: 'biz', q: 'what do small consultancies charge for user acceptance testing' },
  { id: 'G20', ctx: 'lark', q: 'retail POS webhooks new sale event' },
  { id: 'G21', ctx: 'lark', q: 'California order record retention requirement years' },
  { id: 'G22', ctx: 'lark', q: 'NIST SP 800-53 rev 5 OSCAL catalog' },
  { id: 'G23', ctx: 'biz', q: 'GDPR article 30 records of processing small business' },
  { id: 'G24', ctx: 'biz', q: 'top 10 POS systems for small retail 2026' },
  { id: 'G25', ctx: 'biz', q: 'is a 15 percent wholesale discount common in the ceramics trade' },
];

// 15 confidence scenarios, described before reading confidence-rules.md. `expect`: 'pass' = the recorded
// level is allowed; 'flag' = the checker must flag it. Encoded into findings/sources after reading the schema.
export const CONF = [
  { id: 'K01', d: 'vendor reference (host in owners) states it; HIGH', expect: 'pass' },
  { id: 'K02', d: 'vendor reference (owner) only implies it; HIGH', expect: 'flag' },
  { id: 'K03', d: 'vendor reference (owner), basis inferred; HIGH', expect: 'flag' },
  { id: 'K04', d: 'one forum post alone states it; HIGH', expect: 'flag' },
  { id: 'K05', d: 'three forum posts on three different hosts agree; HIGH (SR-04: MEDIUM max)', expect: 'flag' },
  { id: 'K06', d: 'two secondaries, same publisher (two subdomains of one domain), counted as two independent; HIGH', expect: 'flag' },
  { id: 'K07', d: 'two independent secondaries of known standing state it; HIGH (SR-04 allows)', expect: 'pass' },
  { id: 'K08', d: 'one known-standing secondary + one forum agree; HIGH (forum never the step to HIGH)', expect: 'flag' },
  { id: 'K09', d: '"primary" class on a lookalike host not in owners; HIGH', expect: 'flag' },
  { id: 'K10', d: 'primary on a subdomain of an owner host; HIGH', expect: 'pass' },
  { id: 'K11', d: 'primary states it; a forum contradicts; HIGH but the contradiction is NOT under Conflicts', expect: 'flag' },
  { id: 'K12', d: 'two primary (owner) pages disagree; HIGH (must be UNKNOWN)', expect: 'flag' },
  { id: 'K13', d: 'downgrade attempt: primary states it, a forum contradicts, level set UNKNOWN (O6: stays HIGH)', expect: 'flag' },
  { id: 'K14', d: 'regulation from a summary site (secondary); MEDIUM (must be LOW)', expect: 'flag' },
  { id: 'K15', d: 'regulation from the official statutes host (owner) states it; HIGH', expect: 'pass' },
];

// Research-file sentences (findings.md Answer / claims / Gaps).
export const RLEGIT = [
  { id: 'R01', s: "The vendor's reference lists each sale's line items with a product code field (S-01)." },
  { id: 'R02', s: 'The API allows 120 requests a minute per account (S-03).' },
  { id: 'R03', s: 'A reporting app needs the read-sales scope, which the account owner grants.' },
  { id: 'R04', s: 'The forum post says the API returns totals only, which the reference contradicts.' },
  { id: 'R05', s: 'The partner page needs a login, so the app-listing terms are unknown.' },
  { id: 'R06', s: "Brightloop's support plan costs 450 dollars a month for up to 10 hours (S-02)." },
  { id: 'R07', s: 'Northpine charges 120 dollars an hour for support beyond the plan (S-01).' },
  { id: 'R08', s: 'Published bookkeeping rates run from 45 to 75 dollars an hour.' },
  { id: 'R09', s: "The client's shop takes about 90 orders a week, so 120 requests a minute is ample." },
  { id: 'R10', s: 'Order records must be kept for seven years from the order date (S-01).' },
];
export const RSLIP = [
  { id: 'P01', s: 'Building the sync would take us about 30 hours.' },
  { id: 'P02', s: 'Our price for this integration is 2,000 dollars.' },
  { id: 'P03', s: 'At our margin of 35% this API work is still worth quoting.' },
  { id: 'P04', s: 'We should add 25% to our estimate because of the messy codes.' },
  { id: 'P05', s: 'This is cheaper for us than the 900-dollar feasibility test we usually sell.' },
  { id: 'P06', s: 'Our cost to build this connector is roughly 1,200 dollars.' },
  { id: 'P07', s: 'I estimate 12 hours of my time for the OAuth set-up.' },
  { id: 'P08', s: 'We overran our plan by two days on the last integration like this.' },
  { id: 'P09', s: 'Our hourly rate of 95 dollars makes the polling approach expensive for the client.' },
  { id: 'P10', s: 'My effort for the API mapping is about a day and a half.' },
];
