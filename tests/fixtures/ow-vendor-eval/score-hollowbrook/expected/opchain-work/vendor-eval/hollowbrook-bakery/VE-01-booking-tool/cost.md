---
ow_artefact: ow-vendor-eval/cost
schema: 1
written_by: ow-vendor-eval 1.0.0 (protocol 1)
workstream: hollowbrook-bakery
subject: vendor-eval/hollowbrook-bakery/VE-01-booking-tool/scope.md
created: 2026-11-13
clock: user-stated
origin: skill
evaluation: VE-01
---
# Cost over the horizon: a booking tool for the baking classes

Horizon: 36 months, 12 seats, as scope.md records them. Prices carry their own dates. A price rise is a risk, in words, never computed.

## Pennyroyal Book
- price: 18.00 USD per seat per month, as quoted by the vendor on 2026-11-03 (inbox/pennyroyal-quote.md)
- horizon: 36 months × 12 seats
- command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/cost-pennyroyal.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Pennyroyal Book seats × months","amount":"7776.00"}],"total":"7776.00"}
- cost over the horizon: 7776.00 USD

## Sallowmere Bookings
- price: 21.00 USD per seat per month, as quoted by the vendor on 2026-11-04 (inbox/sallowmere-email.md)
- horizon: 36 months × 12 seats
- command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/cost-sallowmere.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Sallowmere Bookings seats × months","amount":"9072.00"}],"total":"9072.00"}
- cost over the horizon: 9072.00 USD

## Thistledown Slots
- price: 16.00 USD per seat per month, as quoted by the vendor on 2026-11-05 (inbox/thistledown-email.md)
- horizon: 36 months × 12 seats
- command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/cost-thistledown.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Thistledown Slots seats × months","amount":"6912.00"}],"total":"6912.00"}
- cost over the horizon: 6912.00 USD

## Wrenfold Reserve
- price: 25.00 USD per seat per month, as quoted by the vendor on 2026-11-05 (inbox/wrenfold-email.md)
- horizon: 36 months × 12 seats
- command: ow-tools calc total --items vendor-eval/hollowbrook-bakery/VE-01-booking-tool/calc/cost-wrenfold.json --currency USD
- output: {"currency":"USD","lines":[{"label":"Wrenfold Reserve seats × months","amount":"10800.00"}],"total":"10800.00"}
- cost over the horizon: 10800.00 USD
