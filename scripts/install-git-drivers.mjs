#!/usr/bin/env node
/**
 * Registers per-clone git plumbing that cannot be committed:
 *
 *   1. the merge drivers .gitattributes refers to (checkpoint JSON);
 *   2. a pre-commit hook that regenerates the generated skill mirrors.
 *
 * Runs from `npm prepare`, so it executes after `npm install` on a
 * fresh clone (the standard Husky-style pattern). Git merge drivers and
 * hooks have to live under `.git/` — they can't be shared via committed
 * files — so this is the one bit of bootstrapping we have to repeat
 * per checkout. Idempotent: safe to re-run.
 *
 * Why the hook: plugins/opchain/skills and every
 * skills/<id>/references/{orchestrator,checkpoint-protocol}.md are generated
 * from skills/. CI only *checks* them (sync-plugin-skills:check,
 * sync-bundles:check), and an edit under skills/ that forgot the regeneration
 * reached CI twice in one week (PR #484 on 2026-09-05, PR #490 on 2026-09-08).
 * A check that can only say "you forgot" after the push is the wrong shape for
 * a mechanical step; the hook does the step. CI keeps the check so a clone that
 * skipped `npm install` still cannot merge drift.
 *
 * Silent skip when:
 *   - not in a git working tree (e.g. npm install from a tarball)
 *   - `git` binary missing
 *   - $OPCHAIN_SKIP_GIT_DRIVERS=1 (CI escape hatch)
 */

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const HOOK_MARKER = "opchain: regenerate generated skill mirrors";

export const PRE_COMMIT_HOOK = `#!/usr/bin/env sh
# ${HOOK_MARKER}
#
# Installed by scripts/install-git-drivers.mjs (npm prepare). Deleting this
# file is safe; the next \`npm install\` re-creates it.
#
# plugins/opchain/skills and skills/<id>/references/{orchestrator,
# checkpoint-protocol}.md are generated from skills/. CI only checks them, so
# an edit under skills/ that skipped the regeneration failed CI twice in one
# week (PR #484, PR #490). When skills/ is staged, regenerate and stage the
# mirrors too. Skip once with OPCHAIN_SKIP_MIRROR_SYNC=1 — CI then fails on the
# drift, which is the point.
[ "\${OPCHAIN_SKIP_MIRROR_SYNC:-0}" = "1" ] && exit 0
git diff --cached --name-only --diff-filter=ACDMR | grep -q '^skills/' || exit 0
[ -f scripts/sync-skill-bundles.mjs ] && [ -f scripts/sync-plugin-skills.mjs ] || exit 0
node scripts/sync-skill-bundles.mjs || exit 1
node scripts/sync-plugin-skills.mjs || exit 1
git add -A plugins/opchain/skills
git diff --name-only -- 'skills/*/references/orchestrator.md' 'skills/*/references/checkpoint-protocol.md' \\
  | xargs -r git add --
`;

const drivers = [
  {
    name: "opchain-checkpoint",
    description: "Auto-resolve telemetry conflicts in .checkpoints/*.checkpoint.json",
    driver: "node scripts/merge-checkpoint.mjs %O %A %B %P",
    recursive: "binary",
  },
];

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : null;
}

function setConfig(key, value, cwd) {
  const r = spawnSync("git", ["config", key, value], { cwd, stdio: "inherit" });
  if (r.status !== 0) {
    process.stderr.write(`install-git-drivers: failed to set ${key}\n`);
    process.exit(1);
  }
}

export function installMergeDrivers(cwd = process.cwd()) {
  for (const d of drivers) {
    setConfig(`merge.${d.name}.name`, d.description, cwd);
    setConfig(`merge.${d.name}.driver`, d.driver, cwd);
    setConfig(`merge.${d.name}.recursive`, d.recursive, cwd);
  }
}

/**
 * Write the pre-commit hook into the clone's hooks directory (honours
 * core.hooksPath). Never overwrites a hook we did not write: a foreign
 * pre-commit is left alone and the snippet is printed for manual merging.
 */
export function installPreCommitHook(cwd = process.cwd()) {
  const hooksDir = git(["rev-parse", "--git-path", "hooks"], cwd);
  if (!hooksDir) return { installed: false, reason: "no-git" };
  const hookPath = resolve(cwd, hooksDir, "pre-commit");
  if (existsSync(hookPath)) {
    const current = readFileSync(hookPath, "utf8");
    if (!current.includes(HOOK_MARKER)) {
      process.stderr.write(
        `install-git-drivers: ${hookPath} already exists and is not ours — leaving it alone.\n` +
          `Append this to keep the generated skill mirrors in sync:\n${PRE_COMMIT_HOOK}`,
      );
      return { installed: false, reason: "foreign-hook", path: hookPath };
    }
    if (current === PRE_COMMIT_HOOK) return { installed: true, changed: false, path: hookPath };
  }
  mkdirSync(join(hookPath, ".."), { recursive: true });
  writeFileSync(hookPath, PRE_COMMIT_HOOK);
  chmodSync(hookPath, 0o755);
  return { installed: true, changed: true, path: hookPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.OPCHAIN_SKIP_GIT_DRIVERS === "1") process.exit(0);
  const inRepo = spawnSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
  if (inRepo.status !== 0) process.exit(0);
  installMergeDrivers();
  installPreCommitHook();
}
