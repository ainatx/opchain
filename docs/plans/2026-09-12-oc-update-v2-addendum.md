# v2.0 addition: oc-update

> **Architecture superseded 2026-09-13:** the user approved [Option C shared runtime](2026-09-13-v2-shared-runtime.md), including all Option B corrections. That decision controls runtime, approval, evaluation, packaging and gate mechanics. Earlier sections below are historical where they conflict. Current release target: 36 skills / 15 commands.

Authorized 2026-09-12: develop and test in isolation, include in the 2.0 release.
Branch: `codex/oc-update-v2`, based on `4d39b93`. The active checkout is not
the development directory. This is a release candidate, not a live release.

## User experience

Existing installation: **`/oc-update`**. Checking only: **`/oc-update check`**.
Hosts without registered commands: **“Use oc-update to update this repo.”**

For older installations missing the skill, the release will expose:

```sh
curl -fsSL https://opchain.dev/update | sh
```

Codex-only first install: append `-s -- --target=codex` after `sh`.
An agent can bootstrap from the same endpoint after the user's update request.
The endpoint must be published and verified before advertising this command.

The skill invokes a dependency-free Node.js updater. The shell bootstrap downloads
the script completely before executing it; the updater fetches a release
descriptor and a content-addressed JSON payload, checks SHA-256 and every skill's
version/resources, prepares all changes, saves backups, installs, and verifies.
The 34-skill candidate payload is about 6 MB; consumers need Node.js 22.13+,
and the bootstrap also needs curl. No npm install, archive tool, or package
registry account is required. Windows users can invoke the downloaded Node
script; the one-line shell bootstrap requires a POSIX shell.

Integrity digests bind payload bytes and detect corruption/mixed deployments;
they are not an independent publisher signature. HTTPS at opchain.dev is the
trust boundary. The updater performs no telemetry upload.

## Release scope adjustment

The previously approved 2.0 plan has two new skills (`oc-hindsight`, `oc-evolve`).
Add **`oc-update`** as the third:

| Surface | Previous 2.0 target | Revised target |
|---|---|---|
| Skill catalog | 35 | **36** (33 existing + 3 new) |
| Plugin commands | 14 | **15** (`/oc-update` added) |
| Tri-agent count | 11 | **11** (updater is deterministic) |
| Checkpoint wire | 1.2 | **1.2**, unchanged by this feature |

This addendum supersedes 35-skill/14-command references elsewhere in the older
plan. Keep the existing release theme. The isolated branch has 34 skills because
the other two candidates live elsewhere. It retains the branch baseline version
1.9.0 strictly for integration testing; **never publish this candidate as 1.9.0**.
The release cut bumps all 36 skill versions together to 2.0.0.

## Integration sequence

1. **Isolated build (this work):** skill, plugin command, updater, portable
   telemetry/checkpoint helpers, release asset builder, targeted tests, and
   behavioral evaluation. Test all installs in temporary consumer repos.
2. **After OSS split C7:** port the product-owned files to the product repo's
   2.0 skills branch. Keep the site asset wiring in the site repo. Review the
   split manifest: updater/helper source scripts and their tests must be included
   in product ownership; don't leave them reachable only in the old monorepo.
3. **After 2.0 substrate is available:** rebuild bundled helper copies from the
   new canonical runtimes. The current portable runtime generator assumes two
   standalone runtime files; planned telemetry imports from `checkpoint.mjs`
   require an explicit runtime dependency closure. Bundle those imports and test
   them after integration. Include newly required scorecard/hindsight/evolve kits
   in their owning skills or product package. Do not claim the entire 2.0 install
   works based only on this 1.9-baseline run.
4. **Before product-half PR:** merge/rebase this silo with hindsight/evolve;
   register 36 skill identities and 15 plugin commands, regenerate flags, catalogs,
   shared references, plugin copies, MCP catalog, release counts, release notes,
   and website install text. `oc-update` remains off `main` until the cut, per the
   existing identity-based deploy guard. This scope addition does not waive OSS
   split or production gates.
5. **Release dress rehearsal:** build the exact 2.0 artifact. Install from a
   published staging descriptor into empty, 1.9, and customized consumer repos.
   Verify all 36 skills, the updater itself, runtime dependency closure, new wire
   compatibility, and telemetry enabled/disabled/absent cases. Then exercise
   actual `/oc-update` and `/oc-update check` through each supported host.
6. **Cut and publish:** publish matching updater bootstrap, JS, descriptor and
   digest-addressed payload. Keep the previous release payload available across
   deployment transitions or retry a failed mixed-deployment download from
   scratch (never modify installed files on such a failure). Confirm HTTP body
   types, cache policy, and file hashes before putting the command on `/install`.

## Contract and boundaries

**Source-checkout addition:** `/oc-update` now recognizes an Opchain Git source
root before contacting the release server. It stages the current `skills/` and
generator inputs, runs that checkout's canonical generators, verifies their
output, and refreshes generated references/runtimes, the plugin skill mirror,
and internal `.claude/skills` links. `--source` explicitly requires this mode;
`--check` remains read-only. Authored definitions, current Git branch, telemetry,
and checkpoints are preserved. No upstream fetch/pull or import from another
worktree is implied. This allows dogfooding in the authoring repo before the
release assets are published. Treat the generated plugin mirror as owned output;
old files are backed up before replacement/removal. Concurrent source edits
during generation cause the operation to stop, even for a check/current result.

- Auto-update existing `.claude/skills`, `.agents/skills`, legacy `.codex/skills`.
  Legacy copies gain `.agents/skills` for current Codex discovery. Explicit
  target flags select Claude, Codex, or both; fresh automatic install is Claude.
- Preserve `.checkpoints/` byte-for-byte. Telemetry consent, IDs, timestamps,
  SQLite history, and other checkpoints never get rewritten by the updater.
- Preserve unrelated skills and custom extra files. Back up overwritten files;
  remove obsolete *managed* files only when unmodified. Legacy extra files have
  no trustworthy ownership history, so retain them. No blanket directory delete.
- Keep user host/plugin settings. Do not install or enable hooks, replace global
  plugin caches, or configure external accounts. This is repo skill-file updating.
- Narrow `.gitignore` additions keep SQLite sidecars and local backups out of
  commits; do not ignore checkpoint JSON or create `.opchain/` as a side effect
  (that directory currently participates in plugin gate opt-in).
- Return 2 when enabled telemetry is unhealthy; preserve consent, explain the
  database problem. Return 1 on updater failure; retain recovery information when
  rollback cannot finish. Interrupted runs retain a lock and backup journal.

Current Codex discovery is documented at
[Build skills](https://learn.chatgpt.com/docs/build-skills): repo-local
`.agents/skills` is the supported location. Legacy `.codex/skills` is retained
only for compatibility with Opchain's prior install instructions.

## Verification record

See [the sprint contract](../../sprints/repo-updater/contract.md) and
[evaluation](../../sprints/repo-updater/eval.md). These verify the silo against its
current baseline; the combined 2.0 rehearsal above remains a release requirement.
