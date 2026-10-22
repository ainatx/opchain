---
ow_artefact: ow-handoff/accounts
schema: 1
written_by: ow-handoff 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: handoffs/larkspur-ceramics/handoff.yaml
created: 2027-02-01
clock: user-stated
origin: skill
systems_map: present
accounts_steps:
  - { step: inventory, rec: 6, date: 2027-02-01 }
  - { step: scan, rec: 7, date: 2027-02-01 }
  - { step: rotate, rec: 8, date: 2027-02-01 }
scan: { status: CLEAN, reason: "none", command: "ow-tools scan-secrets ../larkspur-repo --json", exit: 0 }
---
# Accounts: Larkspur Ceramics

## Accounts
| What | Kind | Owner of record | Billing | Runs as | Recovery and MFA | Who has access | Source · confidence (internal) | Where the client keeps the login |
|---|---|---|---|---|---|---|---|---|
| The repository | repository | builder | client | n/a | client | builder (admin), operations manager (owner once transferred) | HIGH seen (the repository host's settings page) | your password manager, entry Repository |
| Hosting | hosting account | client | client | n/a | client | operations manager (owner), builder (deploy) | HIGH seen (the hosting console) | your password manager, entry Hosting |
| The orders mailbox | email sender | client | client | n/a | client | order coordinator, the service (MAILBOX_PASSWORD) | MEDIUM stated (operations manager 2027-02-01) | your password manager, entry Orders mailbox |
| The order sheet | SaaS | client | client | n/a | client | order coordinator, operations manager, the service | HIGH seen (the sheet's sharing settings) | your password manager, entry Order sheet |
| QuickBooks Online connection | integration | client | client | builder | client | bookkeeper, operations manager, the service (QBO_CLIENT_ID) | HIGH seen (the app settings page) | your password manager, entry QuickBooks Online |
| The order import job | scheduled job | client | client | client | client | the service | HIGH seen (the hosting console) | not applicable |

## Transfer items
| Id | Account | Kind | How control moves |
|---|---|---|---|
| TR-01 | The repository | ownership | an ownership transfer in the repository host's settings |
| TR-02 | QuickBooks Online connection | re-authorise | re-authorised by the bookkeeper under a client identity in QuickBooks Online's app settings |

## Rotate items
| Secret | Places used | Source |
|---|---|---|
| MAILBOX_PASSWORD | hosting secret settings; the order import job | .env.example; uat/larkspur-ceramics/secrets-seen.log (a password, bookkeeper) |
| QBO_CLIENT_SECRET | hosting secret settings; the QuickBooks Online connection | .env.example |
| SHOP_API_TOKEN | hosting secret settings; CI secrets | .env.example |

## Repository scan
`ow-tools scan-secrets ../larkspur-repo --json`, exit 0, status CLEAN, no rows. CLEAN means only that nothing read matched the scanner's rules, never that the history holds no secret.

Not read: binary-looking files (a NUL byte, UTF-16 text) and commit and tag messages; paths gitleaks' built-in allowlist skips; octopus merges' own changes, older stash entries, reflogs and submodule histories. Not scanned: none.

Commit and tag messages: read by Robin 2027-02-01; no secret found.

Uncommitted files, listed by name and not scanned: none found.

## Completeness
A systems map exists (plans/larkspur-ceramics/map/systems.md): the completeness prompt is not needed.

## Records
None yet.

## Self-checks
Self-checks (same-session self-check, not an independent review): No credentials OK · Repository secrets OK · All in the client's name OK · Trace OK · No private names OK
