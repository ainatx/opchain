---
ow_artefact: ow-handoff/access
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: handoffs/larkspur-ceramics/accounts.md
created: 2027-03-23
clock: user-stated
origin: skill
access_removal_date: 2027-03-23
access_steps:
  - { step: sources, rec: 30, date: 2027-03-23 }
  - { step: list, rec: 31, date: 2027-03-23 }
---
# Access removal: Larkspur Ceramics

## Items
| Id | Item | Account | Source | Order | State |
|---|---|---|---|---|---|
| AX-01 | The builder's admin access to the repository | The repository | 1: accounts.md (The repository) | TR-01 confirmed → check OP-07 → remove | open |
| AX-02 | The builder's deploy access to hosting | Hosting | 1: accounts.md (Hosting) | check OP-04 → remove | held for FIX-03 |
| AX-03 | QuickBooks Online sandbox access (stage 02 grant) | none | 2: plans/larkspur-ceramics/evidence.md (access log) | remove; confirmed by the client | open |
| AX-04 | Rotate MAILBOX_PASSWORD | The orders mailbox | 3: accounts.md rotate item; uat/larkspur-ceramics/secrets-seen.log (rec 11) | new value → update every place → OP-08 | open |
| AX-05 | Rotate QBO_CLIENT_SECRET | QuickBooks Online connection | 3: accounts.md rotate item | after TR-02 → new value → OP-09 | open |
| AX-06 | Rotate SHOP_API_TOKEN | none | 3: accounts.md rotate item (scan hit config/settings.js) | new value → update every place → OP-10 | open |
| AX-07 | Local copies: intake/larkspur-ceramics/transcript.md, plans/larkspur-ceramics/workshops/W1/transcript.md, plans/larkspur-ceramics/inbox/, builds/larkspur-ceramics/audio/, docs/larkspur-ceramics/inbox/ | none | 4: by name, never opened | the user deletes them | open |
| AX-08 | Local copies: logs/larkspur-ceramics/meetings/MTG-01/audio/ and logs/larkspur-ceramics/meetings/MTG-01/transcript.md | none | 4: by name, never opened (the client's workstream only) | the user deletes them | open |
| AX-09 | Local copies: uat/larkspur-ceramics/evidence/ items not cleared (results-session-1.csv, bk-T1-sc06-screen-recording.mov, results-session-3.csv, results-session-4.csv, results-session-5.csv, results-session-6.csv) | none | 4: uat/larkspur-ceramics/evidence/index.md | the user deletes them | open |
| AX-10 | The session named in uat/larkspur-ceramics/secrets-seen.log (session 1) | none | 4: the secrets log | the user deletes its history | open |
| AX-11 | The capture profile larkspur-ceramics | none | 4: docs/larkspur-ceramics/docs.yaml capture_profile | ow-tools capture --delete-profile larkspur-ceramics, by the user; checked with ow-tools capture --profiles | open |
| AX-12 | Test account: bookkeeper tester (the QuickBooks Online sandbox) | none | 5: uat/larkspur-ceramics/signoff.md | removed by the client operations manager | open |
| AX-13 | Test account: test sender (the Larkspur staging mailbox) | none | 5: uat/larkspur-ceramics/signoff.md | removed by the builder, confirmed by the client | open |
| AX-14 | The builder's read access to the run logs | Hosting | 1: accounts.md (Hosting) | kept for care; remove when care ends | kept for care |
| AX-15 | Local copies: docs/larkspur-ceramics/shots/SC-04-1.png (not cleared: a real customer's name; never used) | none | 4: docs/larkspur-ceramics/shots/index.md | the user deletes it | open |

## Keep

handoff.yaml, dates.yaml, co-windows.yaml, accounts.md, uat/larkspur-ceramics/signoff.md, acceptance-record.md and acceptance-addendum-CO-04.md, the cleared items in uat/larkspur-ceramics/evidence/ (ops-T1-sc04-confirmation-view.png), builds/larkspur-ceramics/ledger.md, handoff-notes.md, plans/larkspur-ceramics/systems/*.md (redacted), the delivered documents, and your own business records (contract, invoices, time export).

## Records
- 2027-03-23 AX-01 removed 2027-03-23, confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-03 removed 2027-03-23, confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-12 removed 2027-03-23, confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-13 removed 2027-03-23, confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-04 rotated 2027-03-23, places updated, check OP-08 passed; confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-05 rotated 2027-03-23, places updated, check OP-09 passed; confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-06 rotated 2027-03-23, places updated, check OP-10 passed; confirmed by operations manager; not verified by this skill
- 2027-03-23 AX-07 deleted by Robin 2027-03-23 (human-decided); not verified by this skill
- 2027-03-23 AX-08 deleted by Robin 2027-03-23 (human-decided); not verified by this skill
- 2027-03-23 AX-09 deleted by Robin 2027-03-23 (human-decided); not verified by this skill
- 2027-03-23 AX-10 deleted by Robin 2027-03-23 (human-decided); not verified by this skill
- 2027-03-23 AX-11 deleted by Robin 2027-03-23 (human-decided); not verified by this skill
- 2027-03-23 AX-15 deleted by Robin 2027-03-23 (human-decided); not verified by this skill

## Possible embedded instructions

None found.

## Self-checks
Self-checks (same-session self-check, not an independent review): No credentials OK · Access complete OK · No private names OK
