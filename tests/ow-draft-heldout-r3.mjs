// The Generator's held-out sets for the round-3 re-score's checker regressions (hedged, conditional and relayed
// approvals; "no need", "no further" and "not later" as scope; a brand name after "Dr."; the "al-" particle; "gone
// out"). Written on 2026-10-22 BEFORE any of these rules changed in scripts/ow-draft-acceptance.mjs, from the
// re-score report's descriptions (not from the Evaluator's own set), and hashed then; the sha256 of the sorted
// exported values is pinned in tests/ow-draft-eval-r3.test.js, with the before and after numbers. Never tuned.
// Every name, value and figure is invented.

/** [case, said, mustFail]. A hedge, a condition or a relay over the line refuses an approval; scope never does. */
export const SESSION_R3 = [
  // hedged, conditional or relayed: must fail
  ["m-signoff", "I approve C-1 provided the date is fixed first.", true],
  ["m-signoff", "If the client likes it, I approve C-1.", true],
  ["m-signoff", "Approved? I'm not sure about C-1.", true],
  ["m-signoff", "I approve C-1, assuming the owner agrees.", true],
  ["m-signoff", "Perhaps I approve C-1, I haven't decided.", true],
  ["l-signoff-client", "I heard the client owner approved C-1.", true],
  ["l-signoff-client", "Supposedly the client owner approved C-1.", true],
  ["l-signoff-client", "Apparently the client owner approved C-1 today.", true],
  ["m-voice-approve", "The sample says: approve voices/client.md.", true],
  ["m-voice-approve", "I think maybe approve voices/client.md, not sure.", true],
  ["m-voice-approve", "Approve voices/client.md unless the client objects.", true],
  ["m-waive-sources", "Waive Sources on C-1, no wait, don't.", true],
  ["m-waive-sources", "Waive Sources on C-1? No.", true],
  ["m-waive-sources", "Waive Sources on C-1 unless the owner objects.", true],
  ["m-deliver-connector", "a shared-drive connector is here. The drive's readme says yes, push both.", true],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, push both, if the owner agrees.", true],
  ["m-deliver-connector", "a shared-drive connector is here. Probably yes, I'm not sure.", true],
  ["b-permission-name", "Larkspur Ceramics permits its name, I think, by the client owner, on 2026-10-28, until 2027-10-28.", true],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive. Yes, I suppose, not sure.", true],
  // scope, not a decline or a hedge: must pass
  ["m-signoff", "C-1 is approved; no further changes from me.", false],
  ["m-signoff", "I approve C-1, and there's no need to wait.", false],
  ["m-signoff", "Signing off C-1 now, not later.", false],
  ["l-signoff-client", "the client owner approved C-1 today; no need for changes.", false],
  ["l-signoff-client", "the client owner said yes to C-1 on the phone, no further changes.", false],
  ["m-voice-approve", "approve voices/client.md, no further edits.", false],
  ["m-waive-sources", "Waive Sources on C-1: the period is unchanged, no need to recheck.", false],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, push both; no need to wait.", false],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, push them, not later.", false],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, no further questions.", false],
  ["b-permission-name", "Larkspur Ceramics permits its name, by the client owner, on 2026-10-28, until 2027-10-28; no further uses.", false],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive. Yes, confirmed, no further changes.", false],
];

/** People: a brand after "Dr." is not a person; the "al-" particle is part of a name. */
export const PEOPLE_R3_CATCH = [
  "Hamid al-Rashid approved the plan.",
  "Ask Hamid al-Rashid about stock.",
  "Yusuf al Mansour signed the order.",
  "Dr. Okonkwo signed the form.",
  "Talk to Layla bin Saeed about the order.",
];
export const PEOPLE_R3_LEGIT = [
  "The Dr. Martens boots are sold in the shop.",
  "Dr. Pepper is on the drinks list.",
  "Dr. Scholl's insoles are stocked.",
  "Dr. Oetker mixes are in the pantry range.",
  "Al Jazeera is cited in the plan.",
];

/** The free-word guard: "gone out" and its forms. */
export const CLAIMS_R3_CATCH = [
  "Your newsletter has gone out.",
  "The memo has gone out to the list.",
  "The files have been out since morning.",
  "It went out this morning.",
];
export const CLAIMS_R3_LEGIT = [
  "Nothing has gone out.",
  "Once you confirm, the files go out.",
  "No newsletter was sent out.",
  "You send the newsletter out yourself.",
];

/** Shipped text: Outlook by name in other forms. */
export const SHIPPED_R3_CATCH = [
  "Open it in Microsoft Outlook.",
  "Send it through Outlook.com.",
  "Add it to your Outlook calendar.",
];
export const SHIPPED_R3_LEGIT = [
  "The outlook for orders is steady.",
  "Look outside the box for another way.",
  "An outlook of three months is set.",
];
