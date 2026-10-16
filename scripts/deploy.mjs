#!/usr/bin/env node
/**
 * scripts/deploy.mjs — single entry point for `npm run deploy` and
 * `npm run deploy:staging`.
 *
 * Why this wrapper exists: it loads `.dev.vars` into the build env so the
 * same vars the Worker uses at runtime are available at build time, and it
 * inlines the PUBLIC_POSTHOG_* build-time envs that client analytics needs.
 *
 * History: this wrapper used to also assert LINEAR_API_KEY and set
 * OPCHAIN_REQUIRE_LINEAR=1, because `/changelog` was driven by a build-time
 * Linear pull (scripts/gen-roadmap.mjs) and a missing/unreachable key would
 * silently ship an empty roadmap. The roadmap now comes from GitHub Issues
 * (scripts/gen-roadmap.mjs → site/src/data/roadmap.json, an anonymous read
 * run by hand, not by this wrapper), so Linear is no longer on the deploy
 * path and Linear being down can't break a deploy. That gate was removed
 * (2026-06-19); see CLAUDE.md → Deploy flow.
 *
 * This wrapper:
 *   1. Loads `.dev.vars` into process.env.
 *   2. Plumbs the inlined PUBLIC_POSTHOG_* build-time envs (formerly
 *      baked into the npm script).
 *   3. Requires a clean checkout before and after generation.
 *   4. Requires candidate-bound executable and audit evidence.
 *   5. Runs the hardening gate, captures the active rollback version, and
 *      deploys through Wrangler.
 *   6. Verifies the live SHA, hardening manifest, and smoke suite; any miss
 *      automatically rolls traffic back to the captured version.
 *   7. With --refresh-baseline (or OPCHAIN_REFRESH_BASELINE=1), rewrites
 *      .github/monitoring/release-baseline.json from the deployment it just
 *      made and prints the branch/commit/PR commands for a human to run.
 *      Without the flag it warns that the baseline is stale, as before.
 *
 * Local dev (`npm run dev`) is unaffected — wrangler reads .dev.vars
 * on its own there.
 *
 * The pure pieces (latestDeployment, refreshBaseline, baselineRefreshRefusal,
 * baselinePrCommands) are exported for tests; the deploy itself only runs when
 * this file is the entry point.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkReleaseTag, remediation } from "./check-release-tag.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT  = path.resolve(path.dirname(__filename), "..");
const DEV_VARS   = path.join(REPO_ROOT, ".dev.vars");
const BASELINE   = path.join(REPO_ROOT, ".github/monitoring/release-baseline.json");
export const BASELINE_PATH = ".github/monitoring/release-baseline.json";

const STAGING = process.argv.includes("--staging");
const TARGET  = STAGING ? "staging" : "production";
const TARGET_URL = STAGING ? "https://staging.opchain.dev" : "https://opchain.dev";
const REFRESH_BASELINE = process.argv.includes("--refresh-baseline") || process.env.OPCHAIN_REFRESH_BASELINE === "1";

function loadDevVars() {
  if (!fs.existsSync(DEV_VARS)) return { loaded: 0, source: null };
  const content = fs.readFileSync(DEV_VARS, "utf8");
  let loaded = 0;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Don't override env already exported in the parent shell —
    // shell wins so a developer can override a stale .dev.vars
    // without editing the file.
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
      loaded += 1;
    }
  }
  return { loaded, source: DEV_VARS };
}

function execute(cmd, args) {
  console.log(`\n[deploy:${TARGET}] $ ${cmd} ${args.join(" ")}`);
  return spawnSync(cmd, args, {
    stdio: "inherit",
    env: process.env,
    cwd: REPO_ROOT,
    shell: process.platform === "win32",
    timeout: 20 * 60 * 1000,
    killSignal: "SIGTERM",
  });
}

function run(cmd, args) {
  const result = execute(cmd, args);
  if (result.status !== 0) {
    console.error(
      `\n[deploy:${TARGET}] ${cmd} exited with status ${result.status ?? "unknown"}`,
    );
    process.exit(result.status ?? 1);
  }
  return result;
}

/** Capture stdout of a command, or null if it fails. Never throws. */
function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : null;
}

/**
 * Every deploy must use the exact fetched `origin/main` commit.
 *
 * CLAUDE.md has said so in prose since the 2026-05-13 deploy gap, when staging
 * sat on 7303ab6 — a feature-branch SHA not on main — while prod ran 6 days
 * stale. Prose did not hold it: nothing in this file checked the branch until
 * now. The point of staging is "what production is about to become"; a staging
 * deploy from an unmerged branch silently breaks the "I looked at staging, it's
 * safe to ship" gate, because what you looked at is not what ships.
 *
 * The staging-only escape hatch is deliberate and loud:
 * OPCHAIN_ALLOW_OFF_MAIN_STAGING=1. Production has no branch bypass.
 */
function assertDeployFromMain() {
  if (process.env.OPCHAIN_ALLOW_OFF_MAIN_STAGING === "1") {
    if (!STAGING) {
      console.error(`[deploy:${TARGET}] ✗ OPCHAIN_ALLOW_OFF_MAIN_STAGING is not valid for production`);
      process.exit(1);
    }
    console.warn(
      `[deploy:${TARGET}] ⚠ OPCHAIN_ALLOW_OFF_MAIN_STAGING=1 — skipping the ` +
        `staging-from-main check. staging.opchain.dev will NOT be a faithful ` +
        `preview of production.`,
    );
    return;
  }

  // Fetch so origin/main is current; a stale ref could bless stale or
  // unreviewed bytes.
  const fetched = capture("git", ["fetch", "origin", "main", "--quiet"]) !== null;
  if (!fetched) {
    console.error(`[deploy:${TARGET}] ✗ could not fetch origin/main — refusing to deploy`);
    process.exit(1);
  }

  const head = capture("git", ["rev-parse", "HEAD"]);
  const main = capture("git", ["rev-parse", "origin/main"]);
  if (!head || !main) {
    console.error(`[deploy:${TARGET}] ✗ cannot resolve HEAD and origin/main — refusing to deploy`);
    process.exit(1);
  }

  if (head !== main) {
    const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "(detached)";
    const subject = capture("git", ["log", "-1", "--format=%s", "HEAD"]) || "";
    console.error(
      `\n[deploy:${TARGET}] ✗ REFUSING: HEAD is not the fetched origin/main commit.\n` +
        `\n    branch:  ${branch}` +
        `\n    HEAD:    ${head.slice(0, 12)}  ${subject}\n` +
        `\nDeploys must use the exact reviewed origin/main commit. Staging must preview` +
        `\nwhat production will run, and production must not serve unmerged bytes.` +
        `\n(This is the 2026-05-13 failure mode — see CLAUDE.md § Deployment.)\n` +
        `\nDo this instead:` +
        `\n    git checkout main && git pull && npm run deploy:staging\n` +
        (STAGING
          ? `\nIf you genuinely need a branch preview, say so out loud:` +
            `\n    OPCHAIN_ALLOW_OFF_MAIN_STAGING=1 npm run deploy:staging\n`
          : ""),
    );
    process.exit(1);
  }

  console.log(`[deploy:${TARGET}] ✓ HEAD matches fetched origin/main`);
}

/**
 * A production deploy must not publish a release the ledger has no tag for.
 *
 * The 2026-08-26 audit: thirteen shipped releases on /changelog, three tags in
 * git. v1.0 through v1.7 all went out untagged, so publish-mcp-registry (which
 * fires `on: push: tags: v*`) never republished the registry pointer for any of
 * them, and `/oc-release plan` lost its `git log <last-tag>..HEAD` input.
 *
 * oc-release-ops has always SAID it hands the tag to oc-git-ops. Prose does not
 * hold an edge — orchestrator.md §3 says so itself, and oc-git-ops did not even
 * have a tag verb until v1.8.3. This is where the edge actually holds.
 *
 * Scope is deliberately narrow: the guard fires only when the lockstep catalog
 * version has moved somewhere no tag follows, i.e. when this deploy would
 * publish a NEW release. Blog deploys, hotfixes, and content pushes never touch
 * the catalog version and never see this check. A guard that fired on every prod
 * deploy would be disabled inside a month, which is the failure mode the commit
 * gate's rule 3 exists to prevent.
 *
 * Staging is exempt on purpose: you deploy staging to eyeball a release BEFORE
 * committing to it, and tagging an unreviewed build is backwards.
 *
 * Escape hatch is deliberate and loud: OPCHAIN_ALLOW_UNTAGGED_RELEASE=1.
 */
function assertReleaseTagged() {
  if (STAGING) return;

  const result = checkReleaseTag({ cwd: REPO_ROOT });
  if (result.ok) {
    console.log(`[deploy:${TARGET}] \u2713 release ${result.tag} is tagged and pushed`);
    return;
  }

  const bypassableReasons = new Set(["missing-tag", "unpushed-tag"]);
  if (process.env.OPCHAIN_ALLOW_UNTAGGED_RELEASE === "1" && bypassableReasons.has(result.reason)) {
    console.warn(
      `[deploy:${TARGET}] \u26a0 OPCHAIN_ALLOW_UNTAGGED_RELEASE=1 — bypassing the ` +
        `release-tag check. This ships a release with no tag and the MCP ` +
        `Registry publisher will not fire.`,
    );
    return;
  }

  const fix = remediation(result);
  console.error(
    `\n[deploy:${TARGET}] \u2717 REFUSING: the release ledger is incomplete.\n` +
      `\n    ${result.errors.join("\n    ")}\n` +
      `\nA production deploy publishes this catalog version to every consumer of` +
      `\n/skills.json. Shipping it untagged means no bisect point, no release diff,` +
      `\nand no MCP-registry republish (that workflow triggers on \`v*\` tags).` +
      `\n(This is the 2026-08-26 ledger audit — see docs/plans/2026-08-26-git-ops-per-release.md.)\n` +
      (fix ? `\n${fix}` : "") +
      (bypassableReasons.has(result.reason)
        ? `\nIf you genuinely mean to ship a missing or unpushed tag, say so out loud:` +
          `\n    OPCHAIN_ALLOW_UNTAGGED_RELEASE=1 npm run deploy\n`
        : `\nOPCHAIN_ALLOW_UNTAGGED_RELEASE=1 cannot bypass integrity, identity, ` +
          `\nsignature, reachability, or schema failures. Repair the release ledger.\n`),
  );
  process.exit(1);
}

function assertCleanCheckout(moment) {
  const status = capture("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status === null) {
    console.error(`[deploy:${TARGET}] ✗ cannot inspect the working tree at ${moment}`);
    process.exit(1);
  }
  if (status) {
    console.error(
      `[deploy:${TARGET}] ✗ refusing a ${TARGET} deploy from a dirty tree (${moment}):\n` +
      status.split("\n").map((line) => `    ${line}`).join("\n"),
    );
    process.exit(1);
  }
  console.log(`[deploy:${TARGET}] ✓ working tree clean (${moment})`);
}

function assertNoHardeningOverrides() {
  const forbidden = ["OPCHAIN_HARDENING_ROOT", "OPCHAIN_HARDENING_PATH"]
    .filter((name) => process.env[name]);
  if (forbidden.length) {
    console.error(
      `[deploy:${TARGET}] ✗ refusing test-only hardening override(s): ${forbidden.join(", ")}`,
    );
    process.exit(1);
  }
}

/**
 * The newest deployment in a `wrangler deployments list --json` inventory and
 * its 100% version. Pure; throws on an inventory with no fully-active version.
 */
export function latestDeployment(inventory) {
  const deployments = (typeof inventory === "string" ? JSON.parse(inventory) : inventory)
    .slice()
    .sort((a, b) => Date.parse(a.created_on) - Date.parse(b.created_on));
  const current = deployments.at(-1);
  const active = current?.versions?.find((version) => Number(version.percentage) === 100);
  if (!active?.version_id) throw new Error("no 100% active version");
  return { deploymentId: current.id ?? null, versionId: active.version_id, percentage: Number(active.percentage), createdOn: current.created_on ?? null };
}

function captureDeploymentInventory() {
  const args = ["wrangler", "deployments", "list", ...(STAGING ? ["--env", "staging"] : []), "--json"];
  const raw = capture("npx", args);
  if (!raw) return null;
  try { return latestDeployment(raw); }
  catch (error) { console.error(`[deploy:${TARGET}] ✗ invalid deployment inventory: ${error.message}`); return null; }
}

function captureRollbackVersion() {
  const current = captureDeploymentInventory();
  if (!current) {
    console.error(`[deploy:${TARGET}] ✗ could not capture the active rollback version`);
    process.exit(1);
  }
  console.log(`[deploy:${TARGET}] rollback version ${current.versionId}`);
  return current.versionId;
}

/** `wrangler versions view <id> --json`, or null. Shape is Cloudflare's version object. */
function captureVersionDetail(versionId) {
  const raw = capture("npx", ["wrangler", "versions", "view", versionId, ...(STAGING ? ["--env", "staging"] : []), "--json"]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function rollbackAfterFailure(versionId, failure) {
  console.error(`[deploy:${TARGET}] ✗ ${failure}; rolling back to ${versionId}`);
  const args = [
    "wrangler", "rollback", versionId,
    ...(STAGING ? ["--env", "staging"] : []),
    "--yes", "--message", `automatic rollback: ${failure}`,
  ];
  const rolledBack = execute("npx", args);
  if (rolledBack.status !== 0) {
    console.error(`[deploy:${TARGET}] ✗ AUTOMATIC ROLLBACK FAILED; the new version may still be serving`);
    process.exit(2);
  }
  console.error(`[deploy:${TARGET}] ✓ rollback completed; deploy remains failed`);
  process.exit(1);
}

async function verifyLiveVersion() {
  const expected = capture("git", ["rev-parse", "--short", "HEAD"]);
  if (!expected) return { ok: false, detail: "could not resolve deploying SHA" };
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(`${TARGET_URL}/api/health?deploy=${Date.now()}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { "Cache-Control": "no-cache" },
      });
      const body = await response.json();
      if (response.ok && body?.version === expected) {
        return { ok: true, detail: `live version ${body.version}`, version: body.version };
      }
    } catch {}
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  return { ok: false, detail: `live /api/health did not converge to ${expected}` };
}

/**
 * The scheduled Canary and Deploy lag monitors verify Cloudflare against
 * .github/monitoring/release-baseline.json. A deploy that is not followed by a
 * baseline refresh turns both monitors red on every scheduled run until someone
 * notices: on 2026-09-05 production moved to 78567c2 while the baseline still
 * said v1.9.0, and four scheduled runs failed before anyone looked. Without
 * --refresh-baseline this does not refresh the baseline — it makes the
 * obligation impossible to miss at the moment it starts. Prints, never fails:
 * the deploy itself succeeded.
 */
function warnIfBaselineStale(liveVersion) {
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  } catch (err) {
    console.warn(`[deploy:${TARGET}] ⚠ could not read ${path.relative(REPO_ROOT, BASELINE)}: ${err.message}`);
    return;
  }
  // The approved runtime is the tagged release unless a reviewed post-release
  // hotfix is recorded as `runtime` (docs/runbooks/cloudflare-challenge.md).
  const approved = baseline?.runtime?.shortSha ?? baseline?.release?.sourceShortSha;
  const tag = baseline?.runtime?.shortSha
    ? `${baseline?.release?.tag} + approved runtime`
    : baseline?.release?.tag;
  const recorded = baseline?.environments?.[TARGET];
  if (approved && liveVersion && liveVersion.startsWith(approved)) {
    console.log(`[deploy:${TARGET}] baseline ${tag} (${approved}) still describes what is live; no refresh needed`);
    return;
  }
  const listArgs = STAGING ? "deployments list --env staging --json" : "deployments list --json";
  console.warn(`
[deploy:${TARGET}] ⚠ MONITORING BASELINE IS NOW STALE
  live version:      ${liveVersion}
  approved baseline: ${tag} (${approved}) — ${TARGET} deployment ${recorded?.deploymentId ?? "unrecorded"}
  Canary and Deploy lag will fail on every scheduled run until the baseline is
  refreshed. Follow docs/runbooks/cloudflare-challenge.md → "After an intentional
  deployment", steps 4–6:
    npx wrangler ${listArgs}                        # new deployment + version ids
    node .github/scripts/cloudflare-monitor.mjs control-plane   # verify with credentials
    node .github/scripts/cloudflare-monitor.mjs deploy-diff
  then open the baseline PR. ${STAGING ? "A staging branch preview also invalidates the staging half of the baseline." : "Do not bless an unreviewed SHA by editing the baseline alone."}
  Hint: re-run with --refresh-baseline (or OPCHAIN_REFRESH_BASELINE=1) and this
  script writes the baseline from the deployment it just made and prints the
  git/gh commands for the PR.
`);
}

/**
 * Rewrite the approved baseline from a deployment this script just made and
 * verified. Pure: returns a new object plus a change log; never touches disk.
 *
 *   target        "staging" | "production"
 *   liveVersion   short SHA /api/health returned after the deploy
 *   fullSha       `git rev-parse HEAD` of the deployed tree
 *   deployment    latestDeployment() result for that environment
 *   versionDetail optional `wrangler versions view --json` object; when absent
 *                 scriptEtag/handlers/bindings are carried over and reported
 *   approval      text for runtime.approval when the SHA is not the tagged
 *                 release (the reviewed PRs between the tag and HEAD)
 *
 * Rules (docs/runbooks/cloudflare-challenge.md → After an intentional
 * deployment, step 4):
 *   - environments[target] gets the new deployment/version ids and 100% traffic;
 *   - production deploys also move the approved runtime: a SHA equal to the
 *     tagged release removes the `runtime` block, any other SHA writes it;
 *   - staging deploys never move the runtime (production is still serving the
 *     old one) — the staging half is refreshed and the caller is told to run
 *     again after production;
 *   - pointInTimeEvidence.healthVersion follows production.
 */
export function refreshBaseline(baseline, { target, liveVersion, fullSha, deployment, versionDetail = null, approval = null, now = new Date().toISOString() }) {
  if (!["staging", "production"].includes(target)) throw new Error(`unknown target ${target}`);
  if (!/^[0-9a-f]{40}$/.test(fullSha ?? "")) throw new Error("fullSha must be a 40-hex commit SHA");
  if (!liveVersion || !fullSha.startsWith(liveVersion)) throw new Error(`live version ${liveVersion} is not a prefix of deployed SHA ${fullSha}`);
  if (!deployment?.deploymentId || !deployment?.versionId) throw new Error("deployment must carry deploymentId and versionId");
  if (Number(deployment.percentage) !== 100) throw new Error(`deployment ${deployment.deploymentId} is at ${deployment.percentage}% — the baseline records only 100% traffic`);
  const next = structuredClone(baseline);
  const changes = [];
  const carriedOver = [];
  const env = next.environments?.[target];
  if (!env) throw new Error(`baseline has no environments.${target}`);

  for (const [key, value] of [["deploymentId", deployment.deploymentId], ["versionId", deployment.versionId], ["trafficPercentage", 100]]) {
    if (env[key] !== value) { changes.push(`environments.${target}.${key}: ${env[key]} → ${value}`); env[key] = value; }
  }
  const script = versionDetail?.resources?.script;
  const bindings = versionDetail?.resources?.bindings;
  if (typeof script?.etag === "string" && /^[0-9a-f]{64}$/.test(script.etag)) {
    if (env.scriptEtag !== script.etag) { changes.push(`environments.${target}.scriptEtag: ${env.scriptEtag?.slice(0, 8)}… → ${script.etag.slice(0, 8)}…`); env.scriptEtag = script.etag; }
  } else carriedOver.push("scriptEtag");
  if (Array.isArray(script?.handlers) && script.handlers.length) {
    const handlers = [...script.handlers].sort();
    if (JSON.stringify(handlers) !== JSON.stringify(env.handlers)) { changes.push(`environments.${target}.handlers: ${JSON.stringify(env.handlers)} → ${JSON.stringify(handlers)}`); env.handlers = handlers; }
  } else carriedOver.push("handlers");
  if (Array.isArray(bindings) && bindings.length) {
    const names = [...new Set(bindings.map((b) => b?.name).filter(Boolean))].sort();
    if (JSON.stringify(names) !== JSON.stringify(env.bindings)) { changes.push(`environments.${target}.bindings: ${JSON.stringify(env.bindings)} → ${JSON.stringify(names)}`); env.bindings = names; }
  } else carriedOver.push("bindings");

  const releaseSha = next.release?.sourceSha;
  if (target === "production") {
    if (fullSha === releaseSha) {
      if (next.runtime) { changes.push(`runtime: removed (production serves the tagged release ${next.release.tag})`); delete next.runtime; }
    } else {
      const previous = next.runtime?.sha === fullSha ? next.runtime : null;
      const text = approval ?? previous?.approval ?? `TODO: list the reviewed PRs between ${next.release?.tag ?? releaseSha?.slice(0, 7)} and ${liveVersion} before opening the PR.`;
      if (next.runtime?.sha !== fullSha || next.runtime?.approval !== text) {
        changes.push(`runtime: ${next.runtime?.shortSha ?? "(none)"} → ${liveVersion}`);
        next.runtime = { sha: fullSha, shortSha: liveVersion, approval: text };
      }
    }
    next.pointInTimeEvidence = {
      ...(next.pointInTimeEvidence ?? {}),
      healthVersion: liveVersion,
      continuousCustomDomainProbe: false,
      note: `Production serves ${liveVersion} as of ${now} (deployment ${deployment.deploymentId}, version ${deployment.versionId}); recorded by scripts/deploy.mjs --refresh-baseline after the live smoke suite passed. Verify with node .github/scripts/cloudflare-monitor.mjs control-plane before merging.`,
    };
    changes.push(`pointInTimeEvidence.healthVersion → ${liveVersion}`);
  }
  return { baseline: next, changes, carriedOver, pendingProduction: target === "staging" };
}

/** POSIX single-quoting: nothing inside is expanded when the line is pasted. */
function shellQuote(text) {
  return `'${String(text).replace(/'/g, `'\\''`)}'`;
}

const PR_BODY_DELIMITER = "OPCHAIN_BASELINE_PR_BODY";

/**
 * The exact commands a human runs to open the baseline PR. Never executed here.
 * Paste-safe (audit C-08): the title is single-quoted and the body goes through
 * `--body-file -` with a QUOTED heredoc, so the backticks in it never run as
 * command substitution and its newlines arrive as real newlines. The PR entry is
 * multi-line; its terminator line must stay unindented.
 */
export function baselinePrCommands({ target, liveVersion, changes, carriedOver = [], pendingProduction = false }) {
  const branch = `chore/baseline-${liveVersion}`;
  const title = `chore(monitoring): refresh release baseline to ${liveVersion} (${target})`;
  const body = [
    `Baseline refreshed by \`scripts/deploy.mjs --refresh-baseline\` after the ${target} deploy of ${liveVersion}.`,
    "",
    "Changes:",
    ...changes.map((c) => `- ${c}`),
    ...(carriedOver.length ? ["", `Carried over from the previous baseline (wrangler did not return them): ${carriedOver.join(", ")}. Verified by \`cloudflare-monitor.mjs control-plane\` below.`] : []),
    "",
    "Verification:",
    "- [ ] `node .github/scripts/cloudflare-monitor.mjs control-plane` green locally with credentials",
    "- [ ] `node .github/scripts/cloudflare-monitor.mjs deploy-diff` green",
    ...(pendingProduction ? ["", "Staging only: production is still on the previous baseline. Deploy production and re-run with --refresh-baseline before merging."] : []),
  ].join("\n");
  return [
    `node .github/scripts/cloudflare-monitor.mjs control-plane   # must be green before you commit`,
    `node .github/scripts/cloudflare-monitor.mjs deploy-diff`,
    `git switch -c ${branch}`,
    `git add ${BASELINE_PATH}`,
    `git commit -s -m ${shellQuote(title)}`,
    `git push -u origin ${branch}`,
    `gh pr create --title ${shellQuote(title)} --body-file - <<'${PR_BODY_DELIMITER}'\n${body}\n${PR_BODY_DELIMITER}`,
  ];
}

/**
 * --refresh-baseline records the deployment as APPROVED, so it must only follow a
 * deploy of the exact fetched origin/main (audit C-09). A staging branch preview
 * (OPCHAIN_ALLOW_OFF_MAIN_STAGING=1 — the same signal assertDeployFromMain and the
 * stale-baseline warning's "branch preview" note key on) is never approved bytes.
 * Pure: returns the refusal text, or null when the refresh may proceed.
 */
export function baselineRefreshRefusal({ allowOffMain, head, originMain }) {
  if (allowOffMain) {
    return "OPCHAIN_ALLOW_OFF_MAIN_STAGING=1 is set: a branch preview is not a reviewed deployment, so it cannot become the approved monitoring baseline. Redeploy staging from main, then refresh.";
  }
  if (!head || !originMain) return "cannot resolve HEAD and origin/main, so the deployed tree cannot be shown to be the reviewed main commit.";
  if (head !== originMain) {
    return `HEAD ${head.slice(0, 12)} is not origin/main ${originMain.slice(0, 12)}; only an exact-main deploy can become the approved baseline.`;
  }
  return null;
}

function currentRefreshRefusal() {
  return baselineRefreshRefusal({
    allowOffMain: process.env.OPCHAIN_ALLOW_OFF_MAIN_STAGING === "1",
    head: capture("git", ["rev-parse", "HEAD"]),
    originMain: capture("git", ["rev-parse", "origin/main"]),
  });
}

function refreshBaselineFile(liveVersion) {
  const refusal = currentRefreshRefusal();
  if (refusal) {
    console.warn(`[deploy:${TARGET}] ⚠ --refresh-baseline refused: ${refusal}`);
    warnIfBaselineStale(liveVersion);
    return;
  }
  let baseline;
  try { baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")); }
  catch (err) { console.warn(`[deploy:${TARGET}] ⚠ cannot refresh: ${path.relative(REPO_ROOT, BASELINE)} unreadable: ${err.message}`); return; }
  const fullSha = capture("git", ["rev-parse", "HEAD"]);
  const deployment = captureDeploymentInventory();
  if (!fullSha || !deployment) { console.warn(`[deploy:${TARGET}] ⚠ cannot refresh the baseline without HEAD and the deployment inventory; falling back to the stale-baseline warning`); warnIfBaselineStale(liveVersion); return; }
  const versionDetail = captureVersionDetail(deployment.versionId);
  const releaseSha = baseline?.release?.sourceSha;
  const approval = releaseSha && releaseSha !== fullSha
    ? `Post-tag commits from main after ${baseline.release.tag}: ${(capture("git", ["log", "--format=%h %s", `${releaseSha}..HEAD`]) || "(git log unavailable)").split("\n").join("; ")}. Deployed to ${TARGET} by scripts/deploy.mjs after the live hardening replay and smoke suite passed. Review and tighten this text before merging.`
    : null;
  let result;
  try { result = refreshBaseline(baseline, { target: TARGET, liveVersion, fullSha, deployment, versionDetail, approval }); }
  catch (err) { console.warn(`[deploy:${TARGET}] ⚠ baseline refresh refused: ${err.message}`); warnIfBaselineStale(liveVersion); return; }
  if (!result.changes.length) { console.log(`[deploy:${TARGET}] baseline already records this deployment; nothing to refresh`); return; }
  fs.writeFileSync(BASELINE, JSON.stringify(result.baseline, null, 2) + "\n");
  console.log(`\n[deploy:${TARGET}] ✓ wrote ${BASELINE_PATH}:\n${result.changes.map((c) => `    ${c}`).join("\n")}`);
  if (result.carriedOver.length) console.warn(`[deploy:${TARGET}] ⚠ carried over from the previous baseline (wrangler versions view returned no usable detail): ${result.carriedOver.join(", ")} — control-plane must confirm them`);
  if (result.pendingProduction) console.warn(`[deploy:${TARGET}] ⚠ staging half refreshed; production still serves the previous baseline. Deploy production with --refresh-baseline before opening the PR.`);
  console.log(`\n[deploy:${TARGET}] baseline PR — run these yourself (nothing below was executed):\n${baselinePrCommands({ target: TARGET, liveVersion, ...result }).map((c) => `    ${c}`).join("\n")}\n`);
}

async function deploy() {
  if (!STAGING && fs.existsSync(path.join(REPO_ROOT, "release-preview.json"))) {
    throw new Error("This tree is a staging preview. Complete the release review and remove release-preview.json before production.");
  }
  if (REFRESH_BASELINE && process.env.OPCHAIN_ALLOW_OFF_MAIN_STAGING === "1") {
    console.error(`[deploy:${TARGET}] ✗ REFUSING: --refresh-baseline with OPCHAIN_ALLOW_OFF_MAIN_STAGING=1. ${baselineRefreshRefusal({ allowOffMain: true })}`);
    process.exit(1);
  }
  assertDeployFromMain();
  assertCleanCheckout("preflight");
  assertReleaseTagged();
  run("node", ["scripts/lib/release-evidence.mjs", "--stage", "deploy"]);

  const { loaded, source } = loadDevVars();
  if (source) {
    console.log(`[deploy:${TARGET}] loaded ${loaded} var(s) from ${path.relative(REPO_ROOT, source)}`);
  }
  assertNoHardeningOverrides();

  // Client analytics are opt-in for self-hosters. The public opchain project key
  // is safe to expose in browser code, but must never be silently baked into a
  // fork. Official operators enable the known defaults explicitly; any caller
  // can instead supply its own PUBLIC_POSTHOG_KEY/HOST environment variables.
  if (process.env.OPCHAIN_OFFICIAL_ANALYTICS === "1") {
    process.env.PUBLIC_POSTHOG_KEY ||= "phc_m4mpaJBA3EsEFRiGeVQWESFX8pz6CtS6B8y85Va6rmJV"; // gitleaks:allow — public browser identifier
    process.env.PUBLIC_POSTHOG_HOST ||= STAGING
      ? "https://t.staging.opchain.dev"
      : "https://t.opchain.dev";
  }

  console.log(`[deploy:${TARGET}] preflight ok`);

  run("npm", ["run", "prebuild"]);
  assertCleanCheckout("after prebuild");
  // Verify the exact generated catalog/assets Wrangler is about to deploy.
  run("npm", ["run", "hardening:verify"]);
  const rollbackVersion = captureRollbackVersion();
  run("npx", STAGING ? ["wrangler", "deploy", "--env", "staging"] : ["wrangler", "deploy"]);

  const versionCheck = await verifyLiveVersion();
  if (!versionCheck.ok) rollbackAfterFailure(rollbackVersion, versionCheck.detail);
  console.log(`[deploy:${TARGET}] ✓ ${versionCheck.detail}`);

  for (const [cmd, args, label] of [
    ["node", ["scripts/check-hardening.mjs", "--target", TARGET_URL], "live hardening replay failed"],
    ["npm", ["run", STAGING ? "smoke:staging" : "smoke:prod"], "live smoke suite failed"],
  ]) {
    const result = execute(cmd, args);
    if (result.status !== 0) rollbackAfterFailure(rollbackVersion, label);
  }

  console.log(`\n[deploy:${TARGET}] done.`);
  if (REFRESH_BASELINE) refreshBaselineFile(versionCheck.version);
  else warnIfBaselineStale(versionCheck.version);
}

if (process.argv[1] && fs.existsSync(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  await deploy();
}
