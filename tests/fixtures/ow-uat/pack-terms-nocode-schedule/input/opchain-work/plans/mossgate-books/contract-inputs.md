---
ow_artefact: ow-build-plan/contract-inputs
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: mossgate-books
subject: plans/mossgate-books/quote.md
created: 2026-10-27
clock: user-stated
origin: skill
client: Mossgate Books
accepted: 2026-10-27
acceptance_note: client accepted 2026-10-27, recorded by Robin; not verified by this skill
quote: plans/mossgate-books/quote.md
scope: plans/mossgate-books/quick-scope.md
currency: USD
fixed_price: 2100.00
schedule: 40/40/20
payments: [840.00, 840.00, 420.00]
payment_terms_days: 14
documentation_sku: declined
contract_clauses:
  deemed_acceptance: { ref: "TEST-1", business_days: 10, calendar: "us-federal", wording: "INVENTED TEST CLAUSE, not contract wording: a sign-off request is deemed accepted ten business days after it is sent unless the client signs it or reports a failing acceptance check with steps to reproduce it; checks the provider ran when the client's testers did not attend count." }
  delivery_backstop: { ref: "TEST-2", business_days: 10, calendar: "us-federal", wording: "INVENTED TEST CLAUSE, not contract wording: on the two-payment schedule the delivery half falls due once the provider has finished all it can alone and a listed client dependency is still outstanding, no sooner than the later of ten business days after acceptance and five business days after a readiness notice, plus one day per business day of delay the provider caused." }
---
# Contract inputs: Mossgate Books

INVENTED TEST FIXTURE: the accepted quick quote's contract inputs, in the shape ow-build-plan writes them (the parts ow-build reads), as the starting state for ow-build's quick-quote cases. The shop declined the documentation & training line. The contract_clauses block carries INVENTED TEST CLAUSES (not contract wording), for ow-uat's deemed-acceptance and backstop cases.

This is contract input, not a contract. Client accepted 2026-10-27, recorded by Robin; not verified by this skill. This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.

## Documentation & training
Declined.

## Contract clauses
INVENTED TEST CLAUSE, not contract wording: TEST-1 (deemed acceptance, 10 business days, us-federal) and TEST-2 (delivery backstop, 10 business days, us-federal), as in the header.
