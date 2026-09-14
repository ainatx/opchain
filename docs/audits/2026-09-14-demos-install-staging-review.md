# Demo and install staging review

The user approved the three Markdown demo drafts and the install upgrade prompt,
then lifted the staging hold. This review covers the candidate based on the
previous staging commit `63bb189`, including repair commit
`9176f021832ff7d1dd66039f77b8fa1f03e44a09` and these site additions.

## Code review

The repair uses real filesystem paths and encoded URLs for three release CLI
entrypoints, so escaped or symlinked invocation executes the gates. The updater
reads local consent from a private SQLite snapshot, preserves original database
bytes and checkpoints, and reports unknown or unhealthy consent accurately.
Git Ops and Cost Ops references now describe the implemented enrollment, receipt
and baseline behavior. Their distributed copies match. The simulation review
recorded 63 entrypoint checks, 80 updater checks, six cost checks and a 20/20
replay of the original updater scenario. The normal combined gate passed 8/8
before integration; the final site candidate must earn its own fresh receipt.

The three new typed walkthroughs preserve the approved full exchanges, include
example artifacts and participate in the existing picker and search. The total
is now 15. Summaries and artifact contents label the new results as scripted.
The install prompt is one text constant shared with the rendered button and
selectable text. Clipboard failure opens the text and announces the fallback.
A mobile install definition table now stacks to prevent horizontal overflow.
The generated MCP catalog updates only the repaired Cost Ops reference digest.

## Security review

The runtime diff restores gate execution and uses existing path inspection and
private snapshot handling to avoid mutating local consent. It adds no new network
endpoint or permission. The site additions are static data rendered by existing
escaped templates. The copy handler writes the bundled prompt after a user click;
it does not run the prompt, download an installer or alter local settings.
The prompt requires a published 2.0 release, distinguishes host plugins and source
checkouts, preserves local data and does not opt users into learning or hooks.
Learning examples retain the external reviewer requirement and explicitly reject
a candidate that regresses a contract. No blocking code or security finding was
identified within this staging change. Existing dependency advisory debt and
separate release acceptance remain outside this change.

## Validation

- Site build completed successfully.
- Demo index, engine and artifact kind tests: 26 passed.
- Browser checks for changelog, all scenarios, search and mobile behavior: 52 passed.
- New prompt tested at 375 and 1280 pixels in both palettes, with exact copied
  text, manual fallback and no scoped WCAG A/AA violations.
- New scenario transcripts and artifacts checked on desktop and mobile.
- Install prompt and learning demo visually inspected.

The final commit must pass the enrolled commit gate and typed deploy evidence.
The normal staging wrapper then verifies hardening, health and smoke checks.
Live browser verification and deployment identity are recorded after deployment.
This is staging authorization, not production approval or authentic model evidence.
