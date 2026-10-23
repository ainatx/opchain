---
ow_artefact: ow-handoff/operator-notes
schema: 1
written_by: ow-handoff 1.0.2 (protocol 1)
workstream: larkspur-ceramics
subject: docs
created: 2027-04-01
clock: user-stated
origin: skill
---
### OP-01 Restart the import

- **When:** the import stalls
- **Check:** the run log shows no line for 30 minutes
- **Do:** ask the hosting console to restart the job
- **If that fails:** hold the orders and tell the client
- **Source:** runbook.md

### OP-02 Rotate the mail password

- **When:** a person with access leaves
- **Check:** the sender still delivers
- **Do:** rotate SMTP_PASSWORD in the host's secret store
- **If that fails:** unknown
- **Source:** accounts.md

### OP-03 Deploy

- **When:** a fix is verified
- **Check:** unknown
- **Do:** unknown
- **If that fails:** unknown
- **Source:** unknown

### OP-04 Backups

- **When:** monthly
- **Check:** unknown
- **Do:** unknown
- **If that fails:** unknown
- **Source:** unknown
