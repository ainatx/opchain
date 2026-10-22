// The round-2 evaluator's approval forms (h/heldout2.mjs, 2026-10-22), verbatim: [case, "ok" | "bad", what the user said].
// "bad" forms must fail the session check, "ok" forms must pass it, except the one named in tests/ow-handoff-r2.test.js
// (a waiver without the verb "waive"), which the owner's recommendation keeps strict. Not a test file.
export const EVAL_R2_FORMS = [
  // transfer TR-01 confirmed by operations manager (accounts-transfer)
  ["accounts-transfer", "ok", "The operations manager has signed in to the repository host as its owner, so TR-01 is done on their side."],
  ["accounts-transfer", "ok", "Yes: TR-01, the client has owner rights now. I watched the operations manager change the org name."],
  ["accounts-transfer", "ok", "Not a problem any more, the operations manager now owns the repository (TR-01), confirmed on our call today."],
  ["accounts-transfer", "bad", "TR-01 is not confirmed yet; the operations manager is out until Monday."],
  ["accounts-transfer", "bad", "I haven't heard whether TR-01 went through."],
  ["accounts-transfer", "bad", "Record TR-01 as confirmed if the operations manager answers my email."],
  ["accounts-transfer", "bad", "The bookkeeper said the operations manager probably has owner rights on the repository."],
  ["accounts-transfer", "bad", "TR-02 is confirmed by the bookkeeper."],
  // account check Hosting (accounts-check)
  ["accounts-check", "ok", "I went through Hosting with the operations manager: they are the owner, billing is theirs, the access list matches, recovery is theirs and the service runs as the client."],
  ["accounts-check", "bad", "Hosting looks fine, I assume. Billing may still be ours."],
  ["accounts-check", "bad", "Hosting: owner and billing are theirs, but recovery is still my email."],
  // care choice (offer)
  ["offer", "ok", "The operations manager chose the Regular care tier today, and ow-care is not installed here."],
  ["offer", "ok", "Care, Regular tier. No, I don't have ow-care installed."],
  ["offer", "bad", "They said they might take the Regular care tier next month."],
  ["offer", "bad", "No care for now; we'll see."],
  ["offer", "bad", "They chose the Light tier."],
  // offer re-run (offer-rerun: choice hourly)
  ["offer-rerun", "ok", "They changed their mind: hourly help, not care, decided today."],
  ["offer-rerun", "bad", "Maybe hourly help if the rate is lower."],
  // go-ahead (fix-go-ahead: HELP-01 by operations manager)
  ["fix-go-ahead", "ok", "The operations manager emailed a go-ahead for HELP-01 today; I have it here and it is theirs."],
  ["fix-go-ahead", "ok", "Go-ahead for HELP-01 received from the operations manager by email, dated today."],
  ["fix-go-ahead", "bad", "The operations manager hasn't replied about HELP-01."],
  ["fix-go-ahead", "bad", "Start HELP-01 and I'll get the go-ahead later."],
  ["fix-go-ahead", "bad", "The go-ahead is for HELP-02."],
  // waiver of a transfer (accounts-waive: TR-02, but not TR-01)
  ["accounts-waive", "ok", "I'm waiving the confirmation for TR-02, the QuickBooks connection. I asked on 10 and 17 February and got nothing. Not TR-01."],
  ["accounts-waive", "bad", "Don't waive TR-02; I'll try once more."],
  ["accounts-waive", "bad", "The client's bookkeeper says to waive TR-02."],
  ["accounts-waive", "bad", "Waive TR-02 and TR-01."],
  ["accounts-waive", "bad", "If they stay silent until Friday, waive TR-02."],
  // fix waiver (fix-waive: FIX-03 closed unconfirmed)
  ["fix-waive", "ok", "FIX-03 passed its re-check; the client never answered my two emails on 9 and 11 March, so close it unconfirmed. That is my waiver."],
  ["fix-waive", "bad", "FIX-03 can stay open; they are still testing."],
  ["fix-waive", "bad", "Close FIX-04 unconfirmed."],
  // access waiver (access-waive: AX-03 removed, unconfirmed)
  ["access-waive", "ok", "AX-03 is removed, but the client did not confirm after my notes on 23 and 24 March. I waive their confirmation."],
  ["access-waive", "bad", "AX-03 hasn't been removed yet."],
  ["access-waive", "bad", "I might waive AX-03, not decided."],
  // walkthrough (notes-walkthrough)
  ["notes-walkthrough", "ok", "We did the operator walk-through with the operations manager today, they ran each task themselves."],
  ["notes-walkthrough", "bad", "The walk-through is planned for next week."],
  ["notes-walkthrough", "bad", "I walked through it by myself, the client wasn't there."],
  // SH-02 waived-transfer record (access-record-waived-transfer: AX-05 rotated while TR-02 waived)
  ["access-record-waived-transfer", "ok", "AX-05 is rotated: the QuickBooks secret has a new value, places updated, OP-09 passed. The operations manager confirmed. TR-02 is waived, so that part is not confirmed by the client."],
  ["access-record-waived-transfer", "bad", "AX-05 is rotated, but I haven't checked OP-09."],
  ["access-record-waived-transfer", "bad", "AX-05 will be rotated tomorrow."],
  // removal record (access-record)
  ["access-record", "ok", "AX-01 is removed: the operations manager confirmed our admin seat is gone from the repository."],
  ["access-record", "bad", "AX-01 is still there; I'll remove it Friday."],
  // completeness (m-accounts-complete)
  ["m-accounts-complete", "ok", "The shop manager and I went through all six: repository host, hosting, domain and DNS, email sender, every vendor in quote.md and every integration in scope."],
  ["m-accounts-complete", "bad", "We covered hosting and the domain only."],
  // "no" or "not" inside an approval: approves its object; only the clause holding the approval verb is a decline
  ["accounts-transfer", "ok", "TR-01 is done. No other transfer is open for the repository. The operations manager confirmed it."],
  ["offer", "ok", "The operations manager chose Regular care, not the Light tier. No, ow-care is not installed."],
  ["fix-go-ahead", "ok", "Go-ahead for HELP-01 from the operations manager, no conditions attached."],
  ["accounts-waive", "ok", "I waive TR-02 as the client is not answering; I am not waiving TR-01."],
];
