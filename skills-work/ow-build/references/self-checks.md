# Self-checks (every verb)

Each is a **same-session self-check: the same assistant that wrote the output, applying a checklist; a discipline, not an independent review.** Each reports OK, FINDING or NOT-CHECKED (reason), agent-checked, recorded where the phase file says; fix and re-run while any is FINDING.

| Check | Runs in | Passes when |
|---|---|---|
| No internal numbers | client outputs, `spec/` | No hours, effort, rates, margin, unit prices or modifiers, however worded; `spec/` names no price |
| Trace | `-update` | Every "This week" sentence maps to a commit, builder report, checkpoint row or note |
| No false done | `-update`, `-demo`, `-ready` | Nothing is called done, working, available or ready without a passing acceptance check; such a sentence traces to a passing builder report or a demo record, never to a note or commit alone |
| Priced and signed before work | `-change`, `-update`, `-demo` | No change-order work is reported started, handed to the builder or put in `spec/` before a signed amendment |
| Ledger arithmetic | `-start`, `-invoice` | Amounts match the quote and signed change orders: tool output recorded, else `not machine-checked` |
| No private names | every output | No private skill, no business, not the builder's name or say: lines |

"However worded" means by meaning, not by one phrase: an overrun, an estimate, days or weeks of work, a multiplier or surcharge, an amount in words, a percentage paid, "coming along" or "taken care of" all count.
