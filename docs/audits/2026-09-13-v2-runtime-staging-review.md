# 2.0 runtime staging review

Scope: the six findings in the shared runtime review, the imported 1.9.2 repair
baseline at 93dc854, the shared runtime evidence bridge, distributed skills and
the Slate and Emerald site preview. This review authorizes staging assessment
only. It does not close unrelated historical repository audits or approve a
production release.

## Code review

The six findings have implementation coverage in
[the alignment plan](../plans/2026-09-13-v2-runtime-alignment.md). Checkpoint writes
serialize concurrent access and replace files atomically. Tracking permission
comes from local SQLite state. Bundles include the helper and storage modules
that telemetry imports. Source updates stage generated files before installation,
retain backups and reject concurrent source changes, including plugin runtime
files. Build tools stay outside the consumer update path.

The new task evidence command reuses the existing prompt grader. It records the
full instruction bundle, dataset partition, model and policy identity, provider
outputs and case results during execution. Candidate evaluation preserves the
frozen baseline and requires improvement without a newly failed case. A legacy
score file cannot acquire missing execution evidence through this command.

The installed artifact test runs evaluation using only distributed files and an
explicit fixture transport. This checks packaging, not real model quality.
Bundled third party code includes its license files.

## Security review

| Boundary | Review result |
|---|---|
| Source and package files into a consumer repository | Manifests verify complete file content. Update rollback and concurrent edit checks are covered by tests. No telemetry consent is imported. |
| Local learning candidates into active context | Candidate and evidence digests are bound to external Ed25519 reviewer signatures. Keys inside the consuming repository are rejected. Expiry and evidence are checked again at read time. |
| Task content sent to a provider | Endpoint, model and credentials are explicit. The new command requires HTTPS except localhost, rejects credentials in URLs, refuses redirects and bounds requests to 30 seconds. Results are created privately without replacing an existing result file. |
| Public site and MCP endpoint | Existing authentication, write rate limits, session separation, retention and hardening checks remain active. The preview changes no public authorization boundary. |
| Preview into production | A preview marker blocks the production deploy command before credentials, build or deployment, including when bypass environment variables are set. |

No new blocking security finding remains in this scoped review. The local runtime
cannot prove that a human holds a key, that a provider performed a real model run,
or that two agent roles used independent contexts. External review and host
acceptance remain required before the release cut. Learning stays off by default.

## Validation and visual review

The full test run passed 1,210 tests before the final two acceptance cases were
added. The follow up run passed 38 tests, including the installed evaluation
command and production preview refusal. The exact staged candidate is subsequently
verified by the repository verifier; its receipt is the deployment gate evidence.

The site and Worker built. Release surfaces and hardening checks passed. Browser
checks passed 55 distinct cases across routes, accessibility, diagram geometry,
changelog behavior and scenario selection after refreshing the existing GitHub
roadmap feed. Dark and light desktop previews and mobile architecture were
inspected visually. The preview banner is visible and no release date is shown.
Some existing route tests exclude known color contrast debt; this is not a claim
of full site accessibility certification.

## Release work still open

Real provider acceptance with independently reviewed evidence, externally controlled
reviewer setup, native host acceptance, wire migration decisions, repository split
and a signed release rehearsal remain in the release plan. No production deploy
or 2.0 release tag is part of this staging task.
