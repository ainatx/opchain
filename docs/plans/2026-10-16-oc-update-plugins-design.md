# /oc-update plugins — design

**Date:** 2026-10-16 · **Status:** APPROVED 2026-10-16 (decisions in §7). Not built; S1 starts after the 2.1 Jev branch merges.
**Release:** after the 2.1 "Jev" consolidation (`claude/consolidate-2-1-updates-6054cf`) merges. That branch rewrites `update.mjs` (components banner, `doctor`), so this work starts on top of it, not on today's `main`.
**Owner decisions (2026-10-16):** `/oc-update` should keep a repository's Opchain plugins current, not only its skills. The four open questions are settled in §7.

## 1. Why

`/oc-update` ships skills and nothing else. The 2.1 update's biggest change is in the **plugin**: the Jev prompt router (`hooks/route-prompt.cjs`, a new `UserPromptSubmit` hook), plus commit-gate runtime fixes. A user who runs `/oc-update` gets the new skill text and keeps running the old hooks. The 2026-10-08 effectiveness audit (I-11) saw the same gap from the other side. Asked to "update opchain", a session improvised a global-settings side-install because the command couldn't do it.

## 2. What testing established (2026-10-16)

The Jev branch was merged onto `main` (6c31e9ed) in a scratch worktree. It merged with no conflicts, and every generated mirror and catalog check passed.

| Path | Result |
|---|---|
| Skills, consumer mode: the **v2.0.4 updater** (what consumers have installed) upgrading to a simulated 2.1.0 bundle that adds a new skill id. Run over `.claude/skills`, `.claude`+`.agents`, and a legacy `.codex/skills` | ✅ 6/6. The new skill lands in every location, the receipt tracks it, checkpoints are byte-identical, unrelated skills are kept, no lock is left, and no plugin or hook files are written |
| Plugin at **project scope** (`claude plugin install --scope project`) from the real public mirror, for both `opchain@opchain` and `ow-tools@opchain-work-tools` | ✅ Writes `extraKnownMarketplaces` + `enabledPlugins` to `.claude/settings.json`. Committing that file makes it repo-wide |
| Plugin update when the post-Jev snapshot is pushed **still at version 2.0.4** | ❌ `claude plugin update` says "already at the latest version". The cache is keyed by version, so `route-prompt.cjs` never arrives |
| The same after bumping `plugin.json` + `marketplace.json` to 2.1.0 | ✅ Updates 2.0.4 → 2.1.0, and the router hook is present |
| `/oc-update doctor` (Jev branch) | Flags duplicates, version mismatch and uncommitted installs correctly. But it ignores `CLAUDE_CONFIG_DIR`, and ignores `scope`/`projectPath` in `installed_plugins.json` |
| `ow-start` | Not distributed by any route. `catalogs.json` keeps the ow- catalog out of every output on purpose. `ow-tools` installs, but its `/ow-start-transcribe` serves a skill consumers can't get |

`tests/update-new-skills.test.js` makes the first row permanent. It runs the vendored v2.0.4 updater CLI, plus this tree's updater, against a bundle built from the current tree with one minor bump and a new skill. Once the Jev branch is rebased onto a `main` that has this test, it checks that branch's bundle.

**Release prerequisite, independent of this design:** Jev must ship as a version bump (2.1.0 via `/oc-release bump`; `check-release-surfaces.mjs` already covers `plugin.json` and `marketplace.json`). Without the bump, no plugin user gets the router.

## 3. Scope

In:
- Keep the two first-party plugins current **for the repository being updated**: `opchain@opchain` and `ow-tools@opchain-work-tools`.
- Add them at project scope on explicit request.
- Stop a repository from loading the same 36 skills twice (repo-local copy + plugin).
- Fix the two `doctor` gaps from §2. They share the discovery code below.

Out:
- User-scope (global) plugin installs. Those belong to the user's whole machine, not this repository. `/oc-update` reports them and leaves them alone.
- Codex. It has no plugin system, so `.agents/skills` updates stay skills-only, and the output says so.
- Distributing `ow-start` or any other ow- skill. That needs its own catalog-wiring PR (`catalogs.json` `outputs`).
- The time CLI (still `git pull`).

## 4. Constraints

- **Claude Code does the plugin work.** The updater runs the `claude` CLI with a fixed argv (`execFileSync`, no shell). It never writes `.claude/settings.json`, `installed_plugins.json` or the plugin cache itself.
- **Only known marketplaces.** It acts on a plugin only when its marketplace source in the repo's settings matches the constant below. A cloned repo's `settings.json` can't redirect `/oc-update` to another source.

  | Plugin | Marketplace | Source constant |
  |---|---|---|
  | `opchain@opchain` | `opchain` | github `asfbay-bit/opchain-skills` |
  | `ow-tools@opchain-work-tools` | `opchain-work-tools` | url `https://raw.githubusercontent.com/asfbay-bit/opchain-skills/main/plugins/ow-tools/.claude-plugin/marketplace.json` |

- **`--check` stays read-only.** `claude plugin marketplace update` rewrites the marketplace cache, so check mode never calls it. For `opchain`, the available version is the bundle version from `latest.json`, which is already fetched; plugin and skills are lockstep. `ow-tools` has its own version (1.0.0), and check mode reports it as "installed X; run `/oc-update` to compare".
- **No commits.** Same rule as skills. A changed `.claude/settings.json` is reported as "enabled for you, NOT yet for the repo — commit `.claude/settings.json`".
- **Restart.** Any plugin change ends with "restart Claude Code to load the new hooks".
- Checkpoints, telemetry and lock/recovery behaviour are unchanged. Plugin steps run after the skill transaction commits, so a plugin failure never rolls back skills, and the exit code says which part failed.

## 5. Design

### 5.1 Discovery (shared by update, check and doctor)

`pluginState(root)` returns one row per known plugin: `{ id, marketplace, sourceOk, enabledHere, scope, installedVersion, installPath }`.
- Config dir: `process.env.CLAUDE_CONFIG_DIR ?? ~/.claude`.
- Enabled here: `enabledPlugins[id] === true` in `<root>/.claude/settings.json` (project) or `settings.local.json` (local).
- Installed: the entries for `id` in `<config>/plugins/installed_plugins.json` (schema `version: 2`; each is `{scope, version, installPath, projectPath}`). An entry counts for this repo when `scope === 'user'`, or when it is `project`/`local` and `realpath(projectPath) === realpath(root)`.

`doctor` uses this in place of its cache-directory walk. That fixes both §2 gaps and adds `ow-tools` as a surface.

### 5.2 `/oc-update` (default)

1. Skills, exactly as today.
2. Plugins: for each known plugin with `enabledHere && sourceOk`, run `claude plugin marketplace update <marketplace>`, then `claude plugin update <id> --scope <project|local>`. Report `id: before → after` or `already current`.
3. `claude` not on PATH → "plugins: skipped (Claude Code CLI not found). In Claude Code run `/plugin marketplace update opchain` and `/plugin update opchain@opchain`." Skills still succeed, with exit 0.

**First run after a release.** A consumer's `/oc-update` runs the *installed* updater, which predates this feature. So on that first run the old code installs the new skills and has no plugin step. The fix is for the new updater to also expose `update.mjs plugins`, and for SKILL.md to tell the agent to run it after a successful update. The old SKILL.md text the agent read doesn't say that, so the first run after upgrading still misses plugins. The second run handles them. `doctor` keeps flagging the stale plugin until it is updated.

### 5.3 `--with-plugins[=opchain,ow-tools]`

Adds plugins at project scope: `claude plugin marketplace add <source constant> --scope project`, then `claude plugin install <id> --scope project`.
- A bare `--with-plugins` means `opchain` only. `ow-tools` runs code on the machine (its README asks admins to approve it separately), so it is installed only when named.
- Codex-only installs (`.agents/skills` and no `.claude/skills`) → refused with an explanation.

### 5.4 Duplicate guard

When `opchain@opchain` is enabled for this repo **and** receipt-managed `oc-*` skills exist in `.claude/skills`, Claude Code loads 36 skills twice: every description twice, and possibly two versions.
- `/oc-update` warns, and keeps updating both until the user picks one surface.
- `--with-plugins` refuses unless one of these is given: `--drop-local-skills` (removes the receipt-managed `.claude/skills/oc-*` copies, with a backup, leaving `.agents/skills` alone) or `--keep-both`.

### 5.5 Output

The components banner becomes truthful per host. Under Claude Code with the CLI: "This command ships: skills, plugin hooks, commit-gate runtime (project-scope plugins). Cannot update: user-scope plugins (use /plugin update), time CLI (git pull)." Without the CLI it prints today's banner.

## 6. Sprint plan

| Sprint | Deliverables | Tests | Done when |
|---|---|---|---|
| **S1 — discovery + doctor** | `pluginState()`; `doctor` switched to it (CLAUDE_CONFIG_DIR, scope/projectPath, ow-tools surface) | Unit tests against fake config dirs in tmp: user/project/other-project/local entries, missing file, schema v1 | `doctor` reports correctly for the 4-entry layout seen on 2026-10-16 (1 user + 3 project scopes for other repos) |
| **S2 — keep enabled plugins current** | §5.2 plugin step, `update.mjs plugins` subcommand, `--check` behaviour, exit-code split, SKILL.md instruction | A stub `claude` on PATH that records argv and fakes `installed_plugins.json`. Covers: enabled+known → 2 calls; unknown source → skipped; no CLI → message, exit 0; `--check` → zero CLI calls | `update-new-skills` still passes; the stub tests pass |
| **S3 — add plugins + duplicate guard** | §5.3, §5.4, `--drop-local-skills` with backup | Stub CLI: bare flag installs only opchain; refuses with local copies; drop-local backs up and removes only receipt-managed files; Codex-only refused | Rehearsal repo goes local-skills → plugin-only in one command, with no duplicate in `doctor` |
| **S4 — docs + live rehearsal** | `skills/oc-update/SKILL.md` rules (§3 out-of-scope list, restart, commit settings.json); plugin README; `/install` page; CHANGELOG | Opt-in live test (skipped in CI): the 2026-10-16 scratch rehearsal (local mirror, `CLAUDE_CONFIG_DIR` in tmp) as a script | Live rehearsal green against a staged mirror at the release version |

Effort: CLAUDE about 6–8 h over four sprints; USER about 1 h (the gate, and one live rehearsal on a real repo).

## 7. Owner decisions (2026-10-16)

| # | Question | Decision |
|---|---|---|
| 1 | First-run gap (§5.2) | **The second `/oc-update` updates plugins**, plus a **release-notes line**: the 2.1 notes tell plugin users to run `/plugin marketplace update opchain` and `/plugin update opchain@opchain` once (add `--scope project` for a repo-wide install), then restart. That line belongs to the Jev release (`skills/CHANGELOG.md` and the `/changelog` entry on that branch), not to this build. |
| 2 | `ow-tools` in a bare `--with-plugins` | **Off.** A bare flag adds `opchain` only; `ow-tools` is installed only when named (`--with-plugins=ow-tools` or `=opchain,ow-tools`), because it runs code on the machine. |
| 3 | Duplicate guard default (§5.4) | **Warn only.** `/oc-update` keeps updating both surfaces and says how to pick one; nothing is removed without `--drop-local-skills`. `--with-plugins` still refuses until `--drop-local-skills` or `--keep-both` is given. |
| 4 | Local scope | **Same as project.** An entry enabled in `.claude/settings.local.json` is updated with `--scope local`; the output says it isn't shared with the repo. |
