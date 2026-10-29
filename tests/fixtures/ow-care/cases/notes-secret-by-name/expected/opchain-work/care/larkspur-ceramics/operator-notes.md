---
ow_artefact: ow-care/operator-notes
schema: 1
written_by: ow-care 1.0.0 (protocol 1)
workstream: larkspur-ceramics
subject: onboarding.md
created: 2026-11-04
clock: user-stated
origin: skill
---
# Operator notes: Larkspur Ceramics

## Entries

### OP-01 Start the orders app

- **When:** the app must be started locally
- **Check:** the README steps run
- **Do:** npm install, then npm start (larkspur-repo/README.md)
- **If that fails:** unknown
- **Source:** larkspur-repo/README.md
- **State:** found

### OP-02 Deploy

- **When:** a fix is ready
- **Check:** unknown
- **Do:** unknown
- **If that fails:** unknown
- **Source:** unknown
- **State:** unknown

### OP-03 Restart the nightly import

- **When:** the import stalls
- **Check:** unknown
- **Do:** unknown
- **If that fails:** unknown
- **Source:** unknown
- **State:** unknown

### OP-04 Rotate the payment key

- **When:** a person with access leaves
- **Check:** a test payment still succeeds
- **Do:** rotate STRIPE_SECRET_KEY in the host's secret store; the value is never written here
- **If that fails:** unknown
- **Source:** reported by Robin, 2026-11-24
- **State:** unknown until tried

## History

- 2026-11-04 written from the onboarding review; unknown steps stay unknown (Robin)
- 2026-11-24 OP-04 added: the payment key is named, never copied (Robin)
