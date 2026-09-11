#!/usr/bin/env node
// check-release-tag.mjs
//
// Guards the other half of the release ledger from check-release-surfaces.mjs.
// That script asks "do the site surfaces agree with each other?"; this one asks
// "does a git tag exist for the release those surfaces are claiming?"
//
// ── why this exists ─────────────────────────────────────────────────────────
// oc-release-ops Phase 5 hands off to oc-git-ops for "the merge / tag", and
// orchestrator.md §3 lists the same edge. Both are prose, and orchestrator.md
// itself records why prose does not hold an edge: measured across 87 sessions,
// cross-skill prose produced zero autonomous invocations. The result, audited
// 2026-08-26: thirteen shipped releases on /changelog, three tags in git.
// v1.0 through v1.7 all shipped untagged. Consequences that actually bit:
//
//   * .github/workflows/publish-mcp-registry.yml runs `on: push: tags: v*`,
//     so ten releases never republished the MCP registry pointer.
//   * `/oc-release plan` reads `git log <last-release-tag>..HEAD` and had to
//     fall back to scraping changelog.astro.
//   * No `git checkout v1.6.0`. No bisect across releases.
//
// ── the trigger signal ──────────────────────────────────────────────────────
// The lockstep catalog version — the `version:` frontmatter shared by every
// skills/<id>/SKILL.md. oc-release-ops Principle 3 makes it the SSOT for the
// release semver, and src/lib/discovery.js surfaces it as /skills.json
// `catalogVersion`. A release deploy always moves it; a blog or hotfix deploy
// never does.
//
// That precision is the point. A guard that demanded a tag on EVERY production
// deploy would fire on every content deploy, and a guard that cries wolf gets
// disabled — taking the protection with it. That is rule 3 of the commit gate
// (plugins/opchain/hooks/pre-commit-gate.cjs), learned the same way.
//
// Header.CURRENT_RELEASE cannot serve as the signal: it is major.minor ("v1.8"),
// so it is blind to a patch release. The catalog version is full semver.
//
// Run:   node scripts/check-release-tag.mjs
//        node scripts/check-release-tag.mjs --local   # signed pre-push gate
//        node scripts/check-release-tag.mjs --json    # machine-readable gate result
// Exit:  0 when the release tag and seal are valid, 1 when any release-ledger
//        or signature invariant is unprovable.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RELEASE_SEAL_PATH = "release-seal.json";
const PUBLISHER_WORKFLOW_PATH = ".github/workflows/publish-mcp-registry.yml";
const MCP_SERVER_PATH = "server.json";

/** Run git, returning trimmed stdout, or null on any failure. Never throws. */
function realGit(args, cwd) {
  try {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (r.status !== 0) return null;
    // Workflow digests seal exact blob bytes; do not discard their trailing
    // newline. Other git probes are scalar/list values and remain trimmed.
    return args[0] === "show" ? (r.stdout || "") : (r.stdout || "").trim();
  } catch {
    return null;
  }
}

/** Parse the small, versioned baseline marker that every release tag inherits. */
function parseReleaseSeal(text, version) {
  if (typeof text !== "string" || text.trim() === "") return null;
  try {
    const seal = JSON.parse(text);
    const keys = Object.keys(seal).sort().join(",");
    if (keys !== "catalogVersion,generation,publisherWorkflowSha256,schemaVersion,serverJsonSha256") return null;
    if (seal.schemaVersion !== 1 || seal.catalogVersion !== version) return null;
    if (!Number.isSafeInteger(seal.generation) || seal.generation < 1 || seal.generation > 9999) return null;
    if (!/^[0-9a-f]{64}$/.test(seal.publisherWorkflowSha256)) return null;
    if (!/^[0-9a-f]{64}$/.test(seal.serverJsonSha256)) return null;
    return {
      schemaVersion: seal.schemaVersion,
      catalogVersion: seal.catalogVersion,
      generation: seal.generation,
      publisherWorkflowSha256: seal.publisherWorkflowSha256,
      serverJsonSha256: seal.serverJsonSha256,
    };
  } catch {
    return null;
  }
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Read the lockstep catalog version from skills/<id>/SKILL.md frontmatter.
 *
 * Returns { version, disagreement } — `disagreement` is non-null when the
 * skills do not all agree, which means a bump is half-applied. oc-release-ops
 * calls the bump atomic for exactly this reason; a split catalog is a bug
 * whichever way you look at it, so we surface it rather than picking a winner.
 */
export function readCatalogVersion(skillsDir) {
  if (!existsSync(skillsDir)) return { version: null, disagreement: null, count: 0, ids: [] };

  const seen = new Map(); // version -> [skill ids]
  let count = 0;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) continue;

    let text;
    try {
      text = readFileSync(skillMd, "utf8");
    } catch {
      continue;
    }
    // Frontmatter only — a `version:` deeper in the body is prose, not the field.
    const fm = text.startsWith("---") ? text.slice(3, text.indexOf("\n---", 3)) : text;
    const m = fm.match(/^version:\s*(\S+)\s*$/m);
    if (!m) continue;

    count += 1;
    const v = m[1];
    if (!seen.has(v)) seen.set(v, []);
    seen.get(v).push(entry.name);
  }

  const allIds = [...seen.values()].flat().sort();
  if (seen.size === 0) return { version: null, disagreement: null, count, ids: allIds };
  if (seen.size > 1) {
    const detail = [...seen.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([v, ids]) => `${v} (${ids.length}: ${ids.slice(0, 3).join(", ")}${ids.length > 3 ? "…" : ""})`)
      .join(" vs ");
    return { version: null, disagreement: detail, count, ids: allIds };
  }
  return { version: [...seen.keys()][0], disagreement: null, count, ids: allIds };
}

/**
 * Is the release the catalog claims actually tagged in git?
 *
 * FAIL CLOSED. Every state we cannot evaluate — no git, no catalog, a split
 * catalog — is a refusal, never a pass. A gate whose error path is "allow" is
 * a formality; the commit gate learned that the expensive way (GATE-03).
 */
export function checkReleaseTag({
  cwd = ROOT,
  git = realGit,
  skillsDir = join(ROOT, "skills"),
  fetch = true,
  verifyRemote = true,
} = {}) {
  const { version, disagreement, count, ids } = readCatalogVersion(skillsDir);

  if (disagreement) {
    return {
      ok: false,
      version: null,
      tag: null,
      reason: "catalog-split",
      errors: [
        `skills/*/SKILL.md do not agree on a version: ${disagreement}.`,
        "A half-applied bump. Finish (or revert) `/oc-release bump` before deploying.",
      ],
    };
  }

  if (!version) {
    return {
      ok: false,
      version: null,
      tag: null,
      reason: "no-catalog",
      errors: [
        `could not read a version from any SKILL.md under ${skillsDir} (${count} scanned).`,
        "Refusing to certify a release whose version cannot be determined.",
      ],
    };
  }

  const tag = `v${version}`;

  if (git(["rev-parse", "--git-dir"], cwd) === null) {
    return {
      ok: false,
      version,
      tag,
      reason: "no-git",
      errors: ["not a git repository (or git unavailable) — cannot verify the release tag."],
    };
  }

  // Best-effort: a stale local tag list would fail an honest deploy.
  if (fetch) git(["fetch", "origin", "--tags", "--quiet"], cwd);

  // Validate the new release baseline before telling an operator to create the
  // tag. Discovering a stale seal after a published tag exists would require a
  // new version, because release tags are immutable.
  const headSealText = git(["show", `HEAD:${RELEASE_SEAL_PATH}`], cwd);
  const headSeal = parseReleaseSeal(headSealText, version);
  if (!headSeal) {
    return {
      ok: false,
      version,
      tag,
      reason: "release-seal-invalid",
      errors: [
        `${RELEASE_SEAL_PATH} at HEAD is missing, malformed, or does not name catalog ${version}.`,
        "Update the release seal atomically with every catalog-version bump.",
      ],
    };
  }

  const localTag = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], cwd);
  if (!localTag) {
    const headWorkflow = git(["show", `HEAD:${PUBLISHER_WORKFLOW_PATH}`], cwd);
    const headServer = git(["show", `HEAD:${MCP_SERVER_PATH}`], cwd);
    if (
      headWorkflow === null ||
      sha256(headWorkflow) !== headSeal.publisherWorkflowSha256 ||
      headServer === null ||
      sha256(headServer) !== headSeal.serverJsonSha256
    ) {
      return {
        ok: false,
        version,
        tag,
        reason: "release-seal-workflow-mismatch",
        errors: [
          `${RELEASE_SEAL_PATH} does not seal the publisher workflow and server.json at HEAD.`,
          "Refresh both SHA-256 fields before creating the immutable release tag.",
        ],
      };
    }
    return {
      ok: false,
      version,
      tag,
      reason: "missing-tag",
      errors: [`the catalog is at ${version}, but no ${tag} tag exists.`],
    };
  }

  const tagType = git(["cat-file", "-t", `refs/tags/${tag}`], cwd);
  if (tagType !== "tag") {
    return {
      ok: false,
      version,
      tag,
      reason: "unsigned-tag",
      errors: [`${tag} is lightweight, not a signed annotated release tag.`],
    };
  }
  if (git(["verify-tag", "--raw", tag], cwd) === null) {
    return {
      ok: false,
      version,
      tag,
      reason: "invalid-tag-signature",
      errors: [`${tag} does not have a valid signature trusted by this release environment.`],
    };
  }

  // The tag must describe code that is actually in what we are shipping.
  // A tag on an unrelated branch would satisfy "exists" and mean nothing.
  // `--is-ancestor` communicates through the exit code, so success is "" (exit
  // 0, no stdout) and failure is null — distinguishable because "" !== null.
  const reachable = git(["merge-base", "--is-ancestor", tag, "HEAD"], cwd) !== null;
  if (!reachable) {
    return {
      ok: false,
      version,
      tag,
      reason: "unreachable-tag",
      errors: [`${tag} exists but is not an ancestor of HEAD — it describes code you are not shipping.`],
    };
  }

  // Version/count plus ancestry is still too weak. v1.8.3 was bumped before
  // its publisher workflow was hardened, so the unsafe ancestor 438ab5f has a
  // complete same-version catalog. The release seal marks the reviewed baseline
  // for that catalog version. Later content descendants inherit it and still
  // pass; older same-version ancestors and half-applied future bumps fail closed.
  const tagSealText = git(["show", `${tag}:${RELEASE_SEAL_PATH}`], cwd);
  const tagSeal = parseReleaseSeal(tagSealText, version);
  if (!tagSeal) {
    return {
      ok: false,
      version,
      tag,
      reason: "tag-release-seal-invalid",
      errors: [`${tag} predates the reviewed ${version} release baseline or contains an invalid ${RELEASE_SEAL_PATH}.`],
    };
  }
  if (JSON.stringify(tagSeal) !== JSON.stringify(headSeal)) {
    return {
      ok: false,
      version,
      tag,
      reason: "tag-release-seal-mismatch",
      errors: [`${tag} does not contain the release seal committed for the ${version} baseline.`],
    };
  }

  const taggedWorkflow = git(["show", `${tag}:${PUBLISHER_WORKFLOW_PATH}`], cwd);
  if (taggedWorkflow === null || sha256(taggedWorkflow) !== tagSeal.publisherWorkflowSha256) {
    return {
      ok: false,
      version,
      tag,
      reason: "tag-publisher-workflow-mismatch",
      errors: [`${tag} does not contain the publisher workflow sealed by the reviewed ${version} baseline.`],
    };
  }
  const taggedServer = git(["show", `${tag}:${MCP_SERVER_PATH}`], cwd);
  if (taggedServer === null || sha256(taggedServer) !== tagSeal.serverJsonSha256) {
    return {
      ok: false,
      version,
      tag,
      reason: "tag-server-json-mismatch",
      errors: [`${tag} does not contain the MCP registry payload sealed by the reviewed ${version} baseline.`],
    };
  }

  // Bind the tag to the release it names. Existence + ancestry alone is too
  // weak: a mistakenly placed v1.8.3 tag on any old ancestor would otherwise
  // unlock production. Compare every tagged skill version with the current
  // lockstep catalog, including the skill count so a partial tree cannot pass.
  const taggedVersionsText = git(
    ["grep", "-E", "^version:[[:space:]]*[^[:space:]]+", tag, "--", "skills/*/SKILL.md"],
    cwd,
  );
  if (taggedVersionsText === null) {
    return {
      ok: false,
      version,
      tag,
      reason: "tag-catalog-unreadable",
      errors: [`could not read the lockstep catalog from ${tag}; refusing to trust an unverified tag tree.`],
    };
  }

  // Path-ful grep output (`<tag>:skills/<id>/SKILL.md:version: X`) so the
  // comparison is by skill IDENTITY, not just count — a same-count swap or
  // rename after the tag must not pass as the sealed catalog.
  const taggedSkills = new Map();
  for (const line of taggedVersionsText.split("\n")) {
    const m = line.match(/skills\/([^/]+)\/SKILL\.md:version:\s*(\S+)\s*$/);
    if (m) taggedSkills.set(m[1], m[2]);
  }
  const taggedVersions = [...taggedSkills.values()];
  const mismatchedVersions = [...new Set(taggedVersions.filter((tagged) => tagged !== version))];
  const addedIds = ids.filter((id) => !taggedSkills.has(id));
  const removedIds = [...taggedSkills.keys()].filter((id) => !ids.includes(id)).sort();
  if (addedIds.length > 0 || removedIds.length > 0 || mismatchedVersions.length > 0) {
    // Identity drift with agreeing versions is the deploy-freeze window: skills
    // were added, removed, or swapped after the tag, at the same lockstep
    // version. The tag is fine — the working tree is a NEW release still
    // wearing the old number.
    const countDrift = mismatchedVersions.length === 0;
    const driftBits = [
      addedIds.length ? `added since the tag: ${addedIds.join(", ")}` : null,
      removedIds.length ? `removed since the tag: ${removedIds.join(", ")}` : null,
    ].filter(Boolean);
    const detail = countDrift
      ? driftBits.join("; ")
      : `found ${mismatchedVersions.join(", ")} instead of ${version}`;
    const errors = [`${tag} does not contain the complete ${version} catalog (${detail}).`];
    if (countDrift) {
      errors.push(
        `The skill set changed after ${tag} was cut without a version bump — ` +
          `this tree is the NEXT release still wearing the ${version} number.`,
      );
    }
    return {
      ok: false,
      version,
      tag,
      reason: "tag-version-mismatch",
      countDrift,
      errors,
    };
  }

  if (!verifyRemote) {
    return { ok: true, version, tag, reason: "tagged-local", errors: [] };
  }

  const onOrigin = git(
    ["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    cwd,
  );
  if (onOrigin === null) {
    return {
      ok: false,
      version,
      tag,
      reason: "remote-unverifiable",
      errors: [`could not verify ${tag} on origin — remote lookup failed, so the release ledger is unprovable.`],
    };
  }
  if (onOrigin === "") {
    return {
      ok: false,
      version,
      tag,
      reason: "unpushed-tag",
      errors: [`${tag} exists locally but was never pushed — publish-mcp-registry never fired for it.`],
    };
  }

  const localCommit = git(["rev-parse", `${tag}^{commit}`], cwd);
  const remoteRefs = new Map(
    onOrigin.split("\n").map((line) => {
      const [sha, ref] = line.trim().split(/\s+/, 2);
      return [ref, sha];
    }),
  );
  const remoteObject = remoteRefs.get(`refs/tags/${tag}`);
  const remoteCommit = remoteRefs.get(`refs/tags/${tag}^{}`) ?? remoteRefs.get(`refs/tags/${tag}`);
  if (!remoteObject || remoteObject !== localTag) {
    return {
      ok: false,
      version,
      tag,
      reason: "remote-tag-object-mismatch",
      errors: [`origin ${tag} is not the same signed tag object verified locally.`],
    };
  }
  if (!localCommit || !remoteCommit || localCommit !== remoteCommit) {
    return {
      ok: false,
      version,
      tag,
      reason: "remote-tag-mismatch",
      errors: [`local ${tag} does not resolve to the same commit as origin — refusing an ambiguous release tag.`],
    };
  }

  return { ok: true, version, tag, reason: "tagged", errors: [] };
}

/** The remediation text is shared by the CLI and deploy.mjs so they cannot drift. */
export function remediation({ version, tag, reason, countDrift }) {
  if (reason === "unpushed-tag") {
    return `Push it:\n    git push origin ${tag}\n`;
  }
  if (reason === "tag-version-mismatch" && countDrift) {
    return (
      `${tag} is immutable — do NOT re-tag it around the changed skills.\n` +
      `Cut the next release instead:\n` +
      `    /oc-release bump <next-semver>       # skills/*/SKILL.md + release-seal.json, atomically\n` +
      `    (merge the bump to main, then)\n` +
      `    /oc-git-release <next-semver>\n\n` +
      `Until then production is intentionally frozen; staging stays open:\n` +
      `    npm run deploy:staging\n`
    );
  }
  if (reason === "missing-tag") {
    return (
      `Tag the release before shipping it:\n` +
      `    git tag -s ${tag} -m "release: ${tag}"\n` +
      `    node scripts/check-release-tag.mjs --local\n` +
      `    git push origin ${tag}\n\n` +
      `Or run /oc-git-release ${version}, which does both and records the tag\n` +
      `in the oc-git-ops checkpoint.\n`
    );
  }
  return "";
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const localOnly = process.argv.includes("--local");
  const result = checkReleaseTag({ verifyRemote: !localOnly });
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  }
  console.log("RELEASE TAG CHECK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  catalog version:  ${result.version ?? "(unreadable)"}`);
  console.log(`  expected tag:     ${result.tag ?? "(n/a)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (result.ok) {
    const suffix = localOnly ? "passes the signed local pre-push gate" : "matches the same signed tag object on origin";
    console.log(`✓ ${result.tag} carries the reviewed release seal, is an ancestor of HEAD, and ${suffix}`);
    process.exit(0);
  }
  console.error(`✗ release-tag check failed:\n  - ${result.errors.join("\n  - ")}`);
  const fix = remediation(result);
  if (fix) console.error(`\n${fix}`);
  process.exit(1);
}
