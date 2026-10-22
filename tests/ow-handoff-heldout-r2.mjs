// Evaluation round 2's held-out sets for ow-handoff (OW-06 PR 2, sprints/release-2.1/ow-06/eval-round-2.md, M1b).
// Not a test file: tests/ow-handoff-measure-r2.mjs measures them and tests/ow-handoff-r2.test.js pins the result.
// Everything is invented.
//
// Order of work: written and hashed (HELDOUT_R2_DIGEST below) after reading the round-2 report and before any rule
// in scripts/ow-handoff-acceptance.mjs changed, then measured on the round-1 checker ("before") and the fixed one
// ("after"). None of these is one of the evaluator's sentences; his 45 forms are kept separately, as controls and
// plants, in tests/ow-handoff-r2.test.js. The set is new wording for the same shapes: a colon after the first words
// of a line, a "no" or "not" outside the clause that holds the approval verb, "I'm waiving", a terse care choice,
// a waiver that names its item by a pronoun.

/** [case, what the user said, ok]: ok means the session supports the record the golden writes. */
export const SESSIONS_R2 = [
  // must pass: the user's own words
  ["accounts-transfer", "Done: TR-01, the operations manager now owns the repository.", true],
  ["accounts-transfer", "Confirmed by phone: the operations manager has owner rights on TR-01.", true],
  ["accounts-transfer", "The operations manager has owner rights on the repository, TR-01, and nothing else is needed.", true],
  ["accounts-transfer", "TR-01 is finished, no further steps are left. The operations manager confirmed it today.", true],
  ["accounts-check", "Hosting check done: the operations manager is the owner, billing is theirs, the access list matches, recovery is theirs and it runs as the client.", true],
  ["accounts-check", "Checked Hosting with the operations manager, no problems: owner, billing and recovery are all theirs.", true],
  ["offer", "Care, Regular tier. ow-care isn't installed here.", true],
  ["offer", "The client picked Regular care (not Light). ow-care is not installed.", true],
  ["offer", "Care it is, Regular tier, decided today. I have no ow-care here.", true],
  ["offer-rerun", "Hourly help, not care: the client decided today.", true],
  ["offer-rerun", "They switched to hourly help; no care plan after all.", true],
  ["fix-go-ahead", "HELP-01 has the operations manager's go-ahead, emailed today, no strings attached.", true],
  ["fix-go-ahead", "Go-ahead for HELP-01: the operations manager emailed it today.", true],
  ["accounts-waive", "I'm waiving TR-02, the QuickBooks connection; the bookkeeper has not replied since 10 February. Not TR-01.", true],
  ["accounts-waive", "I am waiving the confirmation for TR-02. Except TR-01.", true],
  ["fix-waive", "I waive the confirmation on FIX-03 since the client has not answered; the re-check passed.", true],
  ["fix-waive", "FIX-03: I waive it, the order coordinator never replied to my emails.", true],
  ["access-waive", "I'm waiving AX-03's confirmation; nobody at the client answered on 23 or 24 March.", true],
  ["access-record", "AX-01 is removed: the operations manager checked and our seat is gone.", true],
  ["access-record", "The operations manager removed AX-01 yesterday. No issues.", true],
  ["access-record-waived-transfer", "AX-05 rotated: new secret in place, OP-09 passed, the operations manager confirmed. TR-02 is waived.", true],
  ["access-regrant", "AX-01 is re-granted: the operations manager did it today for FIX-03.", true],
  ["notes-walkthrough", "Walkthrough done today with the operations manager: they ran the restore and the import check themselves.", true],
  ["m-accounts-complete", "Complete: the shop manager and I covered the repository host, hosting, domain and DNS, the email sender, every vendor in quote.md and every integration in scope.", true],
  ["fix-status", "FIX-03 went out today, no problems.", true],
  ["fix-hours", "HELP-01 took 3 hours, no more.", true],
  ["fix-not-a-defect", "FIX-05 is withdrawn: the order coordinator said so on the phone.", true],
  ["start-keep-frozen", "Keep scope.md as it is; I don't want it re-copied.", true],
  ["close-care-installed", "ow-care is installed; it is set up on this machine.", true],
  // must fail: a decline, a condition, a hedge, a relay, the wrong item, a partial list
  ["accounts-transfer", "Probably done, the operations manager said it was close.", false],
  ["accounts-transfer", "TR-01 isn't done, the operations manager asked for another day.", false],
  ["accounts-transfer", "Mark TR-01 done after the call tomorrow.", false],
  ["accounts-transfer", "My bookkeeper thinks the operations manager owns the repository now, TR-01.", false],
  ["accounts-transfer", "TR-02 is done and TR-01 is still open.", false],
  ["accounts-check", "Hosting is probably the client's. I have not checked recovery.", false],
  ["accounts-check", "The operations manager owns Hosting once billing moves over.", false],
  ["offer", "The client chose Light care. ow-care is not installed.", false],
  ["offer", "Regular care, if the price drops. ow-care is not installed.", false],
  ["offer", "The client rejected care. ow-care is not installed.", false],
  ["offer", "The client chose Regular care. I am not sure about ow-care.", false],
  ["offer-rerun", "Hourly help only if care gets too dear.", false],
  ["offer-rerun", "The client didn't pick hourly help.", false],
  ["fix-go-ahead", "The operations manager has not given a go-ahead for HELP-01.", false],
  ["fix-go-ahead", "My colleague says the client is happy for HELP-01 to start.", false],
  ["fix-go-ahead", "Go-ahead for HELP-02 from the operations manager.", false],
  ["accounts-waive", "Waive TR-02 and also TR-01.", false],
  ["accounts-waive", "I won't waive TR-02 yet.", false],
  ["accounts-waive", "The bookkeeper told me to waive TR-02.", false],
  ["accounts-waive", "I'll waive TR-02 on Friday if nothing comes back.", false],
  ["fix-waive", "I won't close FIX-03 unconfirmed.", false],
  ["fix-waive", "Close FIX-03 unconfirmed once the re-check passes.", false],
  ["access-waive", "I waive AX-04.", false],
  ["access-waive", "Maybe I'll waive AX-03.", false],
  ["access-record", "AX-01 will be removed on Friday.", false],
  ["access-record", "AX-01 is removed, I assume.", false],
  ["notes-walkthrough", "The walkthrough didn't happen.", false],
  ["notes-walkthrough", "We will do the walkthrough on Friday.", false],
  ["m-accounts-complete", "All covered except the domain and DNS.", false],
  ["m-accounts-complete", "Complete, I think, mostly.", false],
  ["fix-hours", "HELP-01 might take 3 hours.", false],
  ["start-refreeze", "Don't refreeze scope.md.", false],
  ["start-keep-frozen", "Keep acceptance.md frozen.", false],
  ["close-care-installed", "ow-care might be installed.", false],
];

/** A given name and an O' or Mc surname in a client output (the imported people rule's recall gap). Each must be caught. */
export const NAMES_R2 = ["Call Brendan McGrath on the kiln line.", "Cormac O'Brien signed off the page.", "Ask Aoife McKenna about the import.", "Declan O'Sullivan owns the shop floor."];
/** Names of things that are not people. Each must pass. */
export const NAMES_R2_CONTROLS = ["The McGraw-style theme settings are in the config.", "The O'Reilly book is cited in the README.", "Open the McAfee page in the hosting console.", "Mc Donald's is a place name in the demo data."];

/** sha256 of JSON.stringify of both lists above, in the order declared. */
export const HELDOUT_R2_DIGEST = "33135c4ba5ecb39e3b68580bc9c74a5378c520e68b0caaad596a60403cb22747";
