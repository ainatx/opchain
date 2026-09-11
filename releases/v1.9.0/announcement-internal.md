# opchain v1.9.0 — Assurance and governed delivery ops

opchain v1.9.0 is live with four new skills that turn assurance work into
reviewable repository state: QA Ops declares the test pyramid and contract
matrix, Data Ops designs and verifies data pipelines, Compliance Ops maintains
an honest control/evidence register, and Security Hardening executes findings
behind a deploy-time manifest gate. The catalog grows from 29 to 33 skills.
This release also dogfoods the new rail on opchain.dev itself: hosted MCP
checkpoints now use private signed server-issued sessions, bounded writes,
strict Origin validation, rate limits, and 30-day retention; the release
sequence, QA strategy, privacy inventory, and
deployment hardening are mechanically verified. Full notes:
https://opchain.dev/changelog#v1-9

Migration note: v1.9 resets and deletes the 16 pre-v1.9 hosted MCP
checkpoints because they cannot be bound to server-issued sessions. Local
on-disk checkpoints are unaffected.

Registry note: v1.9 preserves the existing
`io.github.asfbay-bit/opchain-skills` listing and hosted endpoint across the
source-repository ownership transfer.
