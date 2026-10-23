# Releasing the ow- distribution

The text skills have individual `metadata.version` values. The source
`v2.1.0` tag seals the whole released family. ow-tools is a separate code
plugin with its own version and public snapshot tag.

## Build and check the downloads

Run `npm run make-work-zip`. This validates the catalog and cross-skill
contracts before writing anything under `public/`. It creates:

- `/opchain-work-skills.zip`: all built ow- folders, with installation README.
- `/work/<id>.zip`: one complete skill, with protocol, LICENSE and NOTICE.
- `/work/manifest.json`: versions and archive SHA-256s.

The archive file order and timestamps are fixed, so an unchanged source gives
the same hashes. Tests exercise copy installation and extraction into a clean
`.claude/skills/` folder; a host session must still establish that it recognizes
the installed skill. claude.ai takes an individual skill zip, not the combined
folder-install archive. The download manifest shares the download origin; it
is a byte-integrity check, not an independent signature.

## Pin ow-tools without a circular hash

The public mirror replaces its `main` snapshot on updates. A version tag keeps
the selected snapshot reachable. The marketplace on `main` then points to the
version tag **and** its full commit SHA. It cannot point at the commit that
contains that same pointer: changing the pointer changes the commit. Use two
reviewed source steps instead:

1. Land the final ow-tools version, its regenerated `SECURITY-MANIFEST.md`, and
   its tests in source `main`. Wait for the mirror run to finish. Keep the
   opchain family release untagged at this point.
2. In a fresh public mirror clone, verify `main` contains that plugin version
   and the intended code. Create `ow-tools-v<plugin-version>` at that exact
   mirror commit and push that tag without force. Never move an existing tag;
   if its contents are wrong, bump the plugin version and repeat.
3. In the reviewed source checkout run:

   ```bash
   node scripts/prepare-ow-tools-pin.mjs --mirror /absolute/path/to/public-mirror --commit FULL_MIRROR_COMMIT_SHA
   node scripts/gen-ow-tools-manifest.mjs
   ```

   The preparation script verifies the local and actual public tag, compares
   the plugin's full file inventory and bytes with the reviewed source, and
   checks every file-table hash in the pinned security manifest. It writes the
   marketplace's `ref` and `sha`, and `ow-tools-release.json` at the source root.
   The record also binds the exact marketplace descriptor bytes and a complete
   `runtimeFiles` inventory of installed files, their SHA-256s and Git executable
   modes. Both the current source and the tagged source must still match that
   inventory at release time. Added, removed, changed or symlinked runtime paths
   fail the gate. Only the marketplace pointer and generated security manifest
   are excluded from this inventory to avoid a circular hash. Runtime
   overlays such as marketplace-level hooks, commands, agents, skills or
   dependencies are rejected; the installed snapshot supplies those components.
   It creates no tag and pushes nothing. Only the marketplace pointer and
   generated security manifest may differ between the snapshot and the next
   source step.
4. Review, test and merge those pointer changes. Wait for the new mirror run.
   Verify the public marketplace contains the pin. Install from a clean host
   and confirm the installed cache's commit and security manifest hash match
   `ow-tools-release.json`.
5. Publish the record's `securityManifestSha256` on `/work/ow-tools`, and put the
   same hash plus the mirror tag and commit in the signed source release tag's
   message. This is the hash of the **pinned installed snapshot's manifest**.
   The current source manifest can differ after its marketplace is updated;
   substituting that newer hash would make an honest installation fail review.

The workflow checks source freshness immediately before its mirror push. A
queued old run skips publication when mirrored inputs have changed; changes
only outside those inputs do not suppress a valid refresh. This reduces stale
overwrites, but the cross-repository check and push are not one atomic action.
After the pin lands, verify the public marketplace again before release.

Until steps 2–5 are evidenced, SA-001 remains open. The source release/tag gate
and live-site release guard refuse a 2.1 release missing the pin record. The
prepared code itself is not proof that the public snapshot or host install
exists.

## Seal the family at the cut

After all released skills and the real ow-tools pin have landed, bump the
opchain version and release seal through the normal release process, then run:

```bash
node scripts/seal-work-release.mjs
```

Review and commit `work-release.json` and `release-seal.json` with the release.
The first records every shipped skill version, every file's content hash, the
protocol hash and the ow-tools pin record hash. The seal binds its exact bytes.
`check-release-tag` requires this binding from 2.1 onward; old releases keep
their original seal format. It checks both HEAD and the signed tag, including
their actual file inventories and their ow-tools marketplace descriptors. It
refuses a content change hidden behind an unchanged family release.

Then follow the ordinary signed-tag, local tag check, push, remote tag check,
staging and production flow. Neither helper commits, signs or deploys.

## Model provenance and trigger evidence

ow-tools 1.3.1 pins pyannote's publisher revision for fetch and offline run,
and hashes Whisper before every transcription. The provenance source and test
boundary are in `docs/audits/2026-10-22-rel-01-model-provenance.md`. No model
download or real transcription was performed by the automated regression tests.

`node scripts/ow-trigger-queries.mjs --prompts` emits capture inputs and
`--results <file>` scores the captured routing decisions. The fixture README
defines the result shape. The checker does not call a model; synthetic answers
prove only that the checker works. REL-02's actual model runs, real jobs and
calendar-based evidence remain separate release requirements.
