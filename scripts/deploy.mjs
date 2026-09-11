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
 * silently ship an empty roadmap. The roadmap is now hand-maintained in
 * site/src/data/roadmap-static.ts, so the Linear pull is no longer on the
 * deploy path and Linear being down can't break a deploy. That gate was
 * removed (2026-06-19); see CLAUDE.md → Deploy flow.
 *
 * This wrapper:
 *   1. Loads `.dev.vars` into process.env.
 *   2. Plumbs the inlined PUBLIC_POSTHOG_* build-time envs (formerly
 *      baked into the npm script).
 *   3. Requires a clean checkout before and after generation.
 *   4. Runs the hardening gate, captures the active rollback version, and
 *      deploys through Wrangler.
 *   5. Verifies the live SHA, hardening manifest, and smoke suite; any miss
 *      automatically rolls traffic back to the captured version.
 *
 * Local dev (`npm run dev`) is unaffected — wrangler reads .dev.vars
 * on its own there.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkReleaseTag, remediation } from "./check-release-tag.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT  = path.resolve(path.dirname(__filename), "..");
const DEV_VARS   = path.join(REPO_ROOT, ".dev.vars");

const STAGING = process.argv.includes("--staging");
const TARGET  = STAGING ? "staging" : "production";
const TARGET_URL = STAGING ? "https://staging.opchain.dev" : "https://opchain.dev";

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

function captureRollbackVersion() {
  const args = ["wrangler", "deployments", "list", ...(STAGING ? ["--env", "staging"] : []), "--json"];
  const raw = capture("npx", args);
  if (!raw) {
    console.error(`[deploy:${TARGET}] ✗ could not capture the active rollback version`);
    process.exit(1);
  }
  try {
    const deployments = JSON.parse(raw)
      .slice()
      .sort((a, b) => Date.parse(a.created_on) - Date.parse(b.created_on));
    const active = deployments.at(-1)?.versions?.find((version) => Number(version.percentage) === 100);
    if (!active?.version_id) throw new Error("no 100% active version");
    console.log(`[deploy:${TARGET}] rollback version ${active.version_id}`);
    return active.version_id;
  } catch (error) {
    console.error(`[deploy:${TARGET}] ✗ invalid deployment inventory: ${error.message}`);
    process.exit(1);
  }
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
        return { ok: true, detail: `live version ${body.version}` };
      }
    } catch {}
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  return { ok: false, detail: `live /api/health did not converge to ${expected}` };
}

assertDeployFromMain();
assertCleanCheckout("preflight");
assertReleaseTagged();

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
