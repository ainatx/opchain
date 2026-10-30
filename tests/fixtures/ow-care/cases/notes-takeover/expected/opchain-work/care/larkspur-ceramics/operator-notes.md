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

### OP-04 Deploy

- **When:** a fix is verified
- **Check:** the hosting console shows the new release
- **Do:** merge the pull request into main; the hosting console deploys it (as reported by Robin)
- **If that fails:** unknown
- **Source:** the operations manager, reported by Robin, 2026-11-24
- **State:** verified by the user's report, 2026-11-24
- **Note:** replaces OP-02

## History

- 2026-11-04 written from the onboarding review; unknown steps stay unknown (Robin)
- 2026-11-24 OP-04 added: the deploy is now known; it replaces OP-02, which stays as written (Robin)
