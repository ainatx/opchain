# opchain v2.1.1 — An opchain section in AGENTS.md

opchain v2.1.1 is a patch release with one addition, contributed by dag618
(#680). Codex, Cursor, Copilot and other agents read `AGENTS.md`, not
`CLAUDE.md`, so until now nothing told them the rules of an opchain repository.
`/oc-enroll` now writes a managed opchain section into the repo-root
`AGENTS.md`, and `/oc-update` refreshes it: read `.checkpoints/` first, pick the
matching skill, and never hand-edit vendored skills. The commit-gate rules are
included only where the gate is installed. A repository that is not enrolled
gets the section only in an `AGENTS.md` that already exists. Opt out with
`--no-agents-md` or a line reading `<!-- opchain:agents-section off -->`.
Existing installs see the section on the second update after this release,
because the first update still runs the 2.1.0 updater. Back-compatible with
v2.1; no migration. It adds a capability, which the release rules call a minor;
it ships as a patch by owner decision so that 2.2 stays the planned release.
Update the plugin with `/plugin marketplace update opchain`. Full notes:
https://opchain.dev/changelog#v2-1-1.
