// The PR #652 evaluator's untuned ow-vendor-eval answer forms (harness vendor-appr.mjs, 2026-10-23), kept as permanent plants.
// [kind, answer, expected]: "A" accepted, "D" declined, "N" recorded as a decline ("no"). The evaluator marked a few forms
// "?" (uncertain); they are left out. Two forms the evaluator expected to pass are declined on purpose: the closed
// question asks for "yes <date>" exactly (lower case, no final full stop), so "Yes 2026-10-20" and "yes 2026-10-20." are
// declined; the answer to a closed question is a form, not prose.
export const EVALUATOR_VENDOR = [
  ["agree", "yes 2026-10-20", "A"], ["agree", "Yes 2026-10-20", "D"], ["agree", "yes 2026-10-20.", "D"],
  ["agree", "yes 2026-10-20 but wait", "D"], ["agree", "yes 2026-10-20 if Pat agrees", "D"], ["agree", "maybe yes 2026-10-20", "D"],
  ["agree", "no", "N"], ["agree", "no: weights are wrong", "N"], ["agree", "yes", "D"], ["agree", "yes 2026-10-20, the client says", "D"],
  ["agree", "I think yes 2026-10-20", "D"],
  ["choose", "yes 2026-10-21", "A"], ["choose", "yes 2026-10-21 (the client emailed)", "D"],
  ["bidder", "I am not a bidder on RFP-7.", "A"], ["bidder", "I'm not a bidder in RFP-7", "A"],
  ["bidder", "I am not a bidder on RFP-7 and I may bid later.", "D"], ["bidder", "I am not a bidder on RFP-7 and Pat is.", "D"],
  ["bidder", "Pat says I am not a bidder on RFP-7.", "D"], ["bidder", "I might not be a bidder on RFP-7.", "D"],
  ["bidder", "I am not a bidder on RFP-7 unless the deadline moves.", "D"], ["bidder", "I am not a bidder on RFP-7 if the panel agrees", "D"],
  ["relationship", "none", "A"], ["relationship", "None", "A"], ["relationship", "none, I think", "D"],
  ["relationship", "yes: partner programme", "A"], ["relationship", "yes: Pat says we are partners", "D"],
  ["demo", "yes", "A"], ["demo", "yes, mostly", "D"], ["demo", "yes if the notes are mine", "D"],
  ["figure", "the vendor's", "A"], ["figure", "the vendor's, I think", "D"], ["figure", "mine", "A"],
];
