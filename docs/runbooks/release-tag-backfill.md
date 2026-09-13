# Release-tag backfill for the historical ledger (issue #464)

**Status: draft procedure for the maintainer.** Every step below runs on a
laptop that holds the release signing key. Nothing in this document has been
executed; no tag has been created or pushed.

## Why

`.github/workflows/release-ledger.yml` compares the shipped release cards on
`/changelog` with the tags in git and keeps issue #464 open while they
disagree. As of 2026-09-11 it reports 10 of 15 shipped releases without a tag:
`v1.0` through `v1.7` plus `v1.4.2` and `v1.4.3`. Every release from v1.8.0 on
is tagged, and `scripts/check-release-tag.mjs` blocks a production deploy of an
untagged catalog version, so the backlog cannot grow. It also cannot shrink on
its own.

What a missing historical tag still costs: no `git checkout v1.6.0`, no release
diff or bisect between two shipped versions, and `/oc-release plan` falling back
to scraping `changelog.astro` for anything older than v1.8.

## Anchors

The identity of a release is the lockstep catalog version, the `version:`
frontmatter every `skills/<id>/SKILL.md` shares. The anchor for each tag is the
first commit on `main` where the catalog reads that version, found with the
command in the appendix. One release never moved the catalog: v1.4.2 was an
emergency changelog-only entry, so its anchor is the commit that landed the
changelog entry, which is the rule issue #464 states.

| Card | Tag | Anchor | Date | Anchor commit subject |
|---|---|---|---|---|
| `v1-0` | `v1.0.0` | `5431127` | 2026-04-17 | Merge pull request #6 from asfbay-bit/sprint/1-single-source-of-truth |
| `v1-1` | `v1.1.0` | `a9ca29f` | 2026-04-17 | Merge pull request #13 from asfbay-bit/feat/add-dash-forge |
| `v1-2` | `v1.2.0` | `77234e3` | 2026-05-05 | feat(v1.2): PM-tool MCP integration across the skill catalog |
| `v1-3` | `v1.3.0` | `776bb75` | 2026-05-08 | merge: v1.3 sprint 3 and sprint 4 work |
| `v1-4` | `v1.4.0` | `b8dd3eb` | 2026-05-12 | chore(release): v1.4 — pack registry GA, /coverage page, skill bumps |
| `v1-4-2` | `v1.4.2` | `c197522` | 2026-06-05 | docs(changelog): add emergency v1.4.2 release entry (#255). Catalog never carried 1.4.2. |
| `v1-4-3` | `v1.4.3` | `a98d373` | 2026-06-12 | release: v1.4.3 — extend opchain to Codex (#272) |
| `v1-5` | `v1.5.0` | `4cd8208` | 2026-06-21 | release(v1.5.0): lockstep bump + changelog cut — "Build the AI app" |
| `v1-6` | `v1.6.0` | `7820a18` | 2026-06-25 | v1.6 — The instrumented pipeline |
| `v1-7` | `v1.7.0` | `967d9dc` | 2026-06-26 | chore(release): v1.7 "Seams & Signals" live-claim site flip (L1–L7) |

The ledger accepts any patch tag on a minor line (`v1.4.0` satisfies the
`v1-4` card) and needs the exact tag for a patch card (`v1.4.2`, `v1.4.3`).

Review each anchor before signing. Two are worth a second look: `v1.0.0` and
`v1.1.0` fall on the same day, which matches the sprint cadence at the time but
means "first commit at 1.1.0" is only hours after "first commit at 1.0.0".

## Procedure

1. **Disable the publisher first.** A `v*` tag push runs
   `.github/workflows/publish-mcp-registry.yml` *as stored at the tagged
   commit*. Several anchors predate the monotonicity guard and the publisher
   pin, and one would republish a stale `server.json`. In the repository's
   Actions tab open *Publish to MCP Registry* and choose *Disable workflow*.
2. **Fetch and confirm the anchors resolve:**

   ```bash
   git fetch origin main --tags
   for sha in 5431127 a9ca29f 77234e3 776bb75 b8dd3eb c197522 a98d373 4cd8208 7820a18 967d9dc; do
     git merge-base --is-ancestor "$sha" origin/main && echo "ok   $sha" || echo "MISSING $sha"
   done
   ```

3. **Create signed annotated tags.** Signed, to match every tag since v1.8.1
   and the `-s` rule `check-release-tag` applies to the current release:

   ```bash
   git tag -s v1.0.0 5431127 -m "release: v1.0.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.1.0 a9ca29f -m "release: v1.1.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.2.0 77234e3 -m "release: v1.2.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.3.0 776bb75 -m "release: v1.3.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.4.0 b8dd3eb -m "release: v1.4.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.4.2 c197522 -m "release: v1.4.2 (tag backfilled 2026-09; see #464)"
   git tag -s v1.4.3 a98d373 -m "release: v1.4.3 (tag backfilled 2026-09; see #464)"
   git tag -s v1.5.0 4cd8208 -m "release: v1.5.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.6.0 7820a18 -m "release: v1.6.0 (tag backfilled 2026-09; see #464)"
   git tag -s v1.7.0 967d9dc -m "release: v1.7.0 (tag backfilled 2026-09; see #464)"
   git tag -v v1.0.0 v1.1.0 v1.2.0 v1.3.0 v1.4.0 v1.4.2 v1.4.3 v1.5.0 v1.6.0 v1.7.0
   ```

4. **Push them in one go, then check that no publisher run started:**

   ```bash
   git push origin v1.0.0 v1.1.0 v1.2.0 v1.3.0 v1.4.0 v1.4.2 v1.4.3 v1.5.0 v1.6.0 v1.7.0
   ```

   Open *Publish to MCP Registry* in the Actions tab and confirm the run list
   did not grow. If it did, cancel the run before it reaches the publish step.

5. **Re-enable the publisher.** Nothing needs re-publishing: v1.9.0 is the
   active registry entry and run 33677209947 already published it.
6. **Close the ledger.** Dispatch *Release ledger* by hand. With the count at
   zero it closes #464 itself; the next Monday run reopens it if drift returns.
7. **Record it.** Append the ten tags to `skill_state.releases` in
   `.checkpoints/oc-git-ops.checkpoint.json` in one update, the way
   `/oc-git-release` does for a current release.

## What this does not touch

- `scripts/check-release-tag.mjs` inspects only the current catalog version
  (1.9.0 today). Historical tags carry no release seal and are never asked for
  one.
- `release-seal.json`, `server.json`, and the MCP registry entry are unchanged.
- No tag is moved. If an anchor turns out to be wrong after the push, cut a
  corrected patch tag rather than force-moving a published one.

## Appendix: how the anchors were found

```bash
for c in $(git log --first-parent --reverse --format=%H origin/main -- 'skills/*/SKILL.md'); do
  f=$(git ls-tree -r --name-only "$c" -- skills | grep -E '^skills/(oc-)?app-architect/SKILL\.md$' | head -1)
  [ -z "$f" ] && continue
  v=$(git show "$c:$f" | sed -n 's/^version:[[:space:]]*"\{0,1\}\([0-9][0-9.]*\)"\{0,1\}.*/\1/p' | head -1)
  [ -n "$v" ] && echo "$v $c"
done | awk '!seen[$1]++'
```

`v1.4.2` came from `git log -S'id="v1-4-2"' -- site/src/pages/changelog.astro`
because the catalog never carried that version.
