---
ow_artefact: ow-build-plan/acceptance
schema: 1
written_by: ow-build-plan 1.0.0 (protocol 1)
workstream: fernhill-florists
subject: plans/fernhill-florists/scope.md
created: 2026-11-12
clock: user-stated
origin: skill
---
# Acceptance checks: Fernhill Florists

INVENTED TEST FIXTURE: Fernhill Florists' signed plan (ow-build-plan's route-next-stage run continued off-fixture), as ow-build's starting state.

## WP-1 Wedding orders into an online order book

### AC-1.1
- when: a wedding order is taken by phone
- then: it is in the order book with date, venue, flowers and contact, typed once
- how we check: enter 5 wedding orders from last June's diary; all 5 are in the order book as written
- test data: 5 wedding orders from the June 2026 diary photo (E-02)
- cases: 5
- kind: normal

### AC-1.2
- when: an order is entered with no wedding date
- then: the form refuses it and says the date is missing
- how we check: enter 1 order with the date left out
- test data: 1 order made for the test
- cases: 1
- kind: error

### AC-1.3
- when: a couple changes their flowers
- then: the order shows the change and who made it
- how we check: change 2 of the 5 orders from AC-1.1
- test data: the orders from AC-1.1
- cases: 2
- kind: normal

## WP-2 The van driver's day sheet

### AC-2.1
- when: it is 7:00 on a delivery day
- then: the driver's day sheet lists that day's deliveries in route order
- how we check: make the sheets for 3 June days; each matches the diary's deliveries
- test data: 3 June 2026 days from the diary (E-02)
- cases: 3
- kind: normal

### AC-2.2
- when: an order for the day has no address
- then: it is at the top of the sheet marked "address missing"
- how we check: remove the address from 1 order and make the sheet
- test data: 1 order from AC-1.1, address removed
- cases: 1
- kind: error

## WP-3 Web shop bouquet orders into the order book

### AC-3.1
- when: the web shop's daily export is in the shared folder
- then: its bouquet orders are in the order book by 8:00
- how we check: drop 2 days of exports; every order arrives
- test data: 2 daily web shop exports from June 2026 (E-04)
- cases: 2
- kind: normal

### AC-3.2
- when: a day's export is missing at 8:00
- then: the shop owner gets a message that the export is missing
- how we check: leave the folder empty for one day
- test data: an empty folder
- cases: 1
- kind: error

### AC-3.3
- when: the same export is dropped twice
- then: no order appears twice in the order book
- how we check: drop one export twice
- test data: 1 export from AC-3.1
- cases: 1
- kind: error

## WP-4 A weekly wedding summary for the owner

### AC-4.1
- when: it is Friday at 9:00
- then: the owner has the coming week's weddings with the flowers to order
- how we check: make the summary for 2 June weeks; each matches the diary
- test data: 2 June 2026 weeks from the diary (E-02)
- cases: 2
- kind: normal
