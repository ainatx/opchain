# Sprint 1 contract: Purchase orders in

INVENTED TEST FIXTURE: a builder's sprint contract in the opchain project format.

## Deliverables
- Read each purchase order PDF from the orders mailbox as it arrives.
- Write its lines to the order sheet with the product code settled.
- Send an email with no readable purchase order to the exceptions list.

## Testable criteria
| # | Criterion | How it is verified |
|---|---|---|
| AC-1.1 | 10 September orders arrive in the sheet within 15 minutes, every line correct | spec/06-testing.md AC-1.1 test data |
| AC-1.2 | 2 emails with images instead of PDFs are on the exceptions list | spec/06-testing.md AC-1.2 test data |
