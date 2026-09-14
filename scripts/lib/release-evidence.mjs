#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCheckpointHandoff, HANDOFF_TYPES } from "../../src/lib/mcp/checkpoint-contract.js";

const require = createRequire(import.meta.url);
const { createRepositoryIdentity, sha256Bytes, validateReceipt } = require("./verification-receipt.cjs");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED = Object.freeze({
  pr: [
    { skill: "oc-docs-forge", policy: "pr-docs-v1" },
    { skill: "oc-repo-ops", policy: "pr-readiness-v1" },
  ],
  deploy: [
    { skill: "oc-code-auditor", policy: "pre-deploy-code-audit-v1" },
    { skill: "oc-security-auditor", policy: "pre-deploy-security-posture-v1" },
  ],
});

const COMPLIANCE = Object.freeze({ skill: "oc-compliance-ops", policy: "deploy-compliance-evidence-v1" });

function git(root, ...args) {
  const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || "unknown error").trim()}`);
  return (result.stdout || "").trim();
}

function repositoryContext(root = ROOT) {
  const repo = realpathSync(git(root, "rev-parse", "--show-toplevel"));
  const common = git(repo, "rev-parse", "--git-common-dir");
  const commonDir = realpathSync(isAbsolute(common) ? common : resolve(repo, common));
  let objectFormat = "sha1";
  try { objectFormat = git(repo, "rev-parse", "--show-object-format"); } catch {}
  const candidate = git(repo, "rev-parse", "HEAD");
  const projected = git(repo, "ls-tree", "-rz", "--full-tree", candidate)
    .split("\0")
    .filter(Boolean)
    .filter((entry) => !entry.slice(entry.indexOf("\t") + 1).startsWith(".checkpoints/"))
    .join("\0");
  return {
    root: repo,
    candidate,
    candidateIdentity: { kind: "git_tree_projection", id: sha256Bytes(projected) },
    tree: git(repo, "rev-parse", "HEAD^{tree}"),
    repositoryId: createRepositoryIdentity({ git_common_dir: commonDir, object_format: objectFormat }).id,
  };
}

function checkpointResult(checkpoint, spec, candidateIdentity) {
  try {
    const handoff = getCheckpointHandoff(checkpoint, {
      type: HANDOFF_TYPES.VERIFICATION_VERDICT,
      artifactId: candidateIdentity.id,
    });
    if (handoff.producer.skill !== spec.skill) throw new Error(`producer must be ${spec.skill}`);
    if (handoff.candidate.kind !== candidateIdentity.kind || handoff.candidate.id !== candidateIdentity.id) {
      throw new Error(`candidate must be ${candidateIdentity.kind} ${candidateIdentity.id}`);
    }
    if (handoff.payload.policy !== spec.policy) throw new Error(`policy must be ${spec.policy}`);
    if (handoff.payload.verdict !== "PASS") throw new Error(`verdict is ${handoff.payload.verdict}`);
    return { id: spec.skill, status: "PASS", detail: `${spec.policy} covers ${candidateIdentity.id}` };
  } catch (error) {
    const detail = error.errors?.length ? `${error.message}: ${error.errors.join("; ")}` : error.message;
    return { id: spec.skill, status: "FAIL", detail };
  }
}

export function evaluateReleaseEvidence({
  stage,
  candidate,
  candidateIdentity = { kind: "git_commit", id: candidate },
  tree,
  repositoryId,
  receipt,
  checkpoints = {},
  complianceProfilePresent = false,
} = {}) {
  if (!REQUIRED[stage]) throw new TypeError("stage must be pr or deploy");
  const checks = [];
  const receiptResult = validateReceipt(receipt, {
    repository_id: repositoryId,
    candidate_tree: tree,
    verdict: "PASS",
  });
  checks.push(receiptResult.ok
    ? { id: "executable-verification", status: "PASS", detail: `A receipt covers tree ${tree}` }
    : { id: "executable-verification", status: "FAIL", detail: receiptResult.errors.join("; ") });

  for (const spec of REQUIRED[stage]) {
    const checkpoint = checkpoints[spec.skill];
    checks.push(checkpoint
      ? checkpointResult(checkpoint, spec, candidateIdentity)
      : { id: spec.skill, status: "FAIL", detail: "required checkpoint evidence is missing" });
  }

  if (stage === "deploy" && complianceProfilePresent) {
    const checkpoint = checkpoints[COMPLIANCE.skill];
    const result = checkpoint
      ? checkpointResult(checkpoint, COMPLIANCE, candidateIdentity)
      : { id: COMPLIANCE.skill, status: "FAIL", detail: "compliance evidence is missing" };
    checks.push({ ...result, status: result.status === "PASS" ? "PASS" : "WARN" });
  }

  const failed = checks.filter((check) => check.status === "FAIL");
  const warnings = checks.filter((check) => check.status === "WARN");
  return { ok: failed.length === 0, verdict: failed.length ? "FAIL" : "PASS", stage, candidate, tree, checks, warnings };
}

function enforcedReceipt(context) {
  const result = spawnSync(process.execPath, [
    join(context.root, "scripts/verify-candidate.mjs"),
    "enforce", "--repo", context.root, "--json",
  ], { cwd: context.root, encoding: "utf8" });
  let report;
  try { report = JSON.parse((result.stdout || "").trim()); } catch {}
  if (result.status !== 0 || !report?.ok || !report.receipt_path) {
    throw new Error(report?.error || (result.stderr || "candidate verifier did not return a PASS receipt").trim());
  }
  return JSON.parse(readFileSync(report.receipt_path, "utf8"));
}

function parseArgs(argv) {
  const args = { root: ROOT, checkpointDir: null, json: false };
  const rest = [...argv];
  while (rest.length) {
    const flag = rest.shift();
    if (flag === "--stage") args.stage = rest.shift();
    else if (flag === "--repo") args.root = resolve(rest.shift() || "");
    else if (flag === "--checkpoint-dir") args.checkpointDir = resolve(rest.shift() || "");
    else if (flag === "--print-candidate") args.printCandidate = true;
    else if (flag === "--json") args.json = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!args.printCandidate && !REQUIRED[args.stage]) throw new Error("--stage must be pr or deploy");
  return args;
}

function readCheckpoint(checkpointDir, skill) {
  const file = join(checkpointDir, `${skill}.checkpoint.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
    const context = repositoryContext(args.root);
    if (args.printCandidate) {
      const report = { ok: true, candidate: context.candidate, tree: context.tree, candidate_identity: context.candidateIdentity };
      process.stdout.write(`${args.json ? JSON.stringify(report) : `${report.candidate_identity.kind} ${report.candidate_identity.id}`}\n`);
      return 0;
    }
    const specs = [...REQUIRED[args.stage] || []];
    if (args.stage === "deploy" && existsSync(join(context.root, ".opchain/compliance.yaml"))) specs.push(COMPLIANCE);
    const checkpointDir = args.checkpointDir || join(context.root, ".checkpoints");
    const checkpoints = Object.fromEntries(specs.map((spec) => [spec.skill, readCheckpoint(checkpointDir, spec.skill)]));
    const report = evaluateReleaseEvidence({
      stage: args.stage,
      candidate: context.candidate,
      candidateIdentity: context.candidateIdentity,
      tree: context.tree,
      repositoryId: context.repositoryId,
      receipt: enforcedReceipt(context),
      checkpoints,
      complianceProfilePresent: existsSync(join(context.root, ".opchain/compliance.yaml")),
    });
    const output = args.json ? JSON.stringify(report) : [
      `release evidence: ${report.verdict} (${report.stage}, ${report.candidate})`,
      ...report.checks.map((check) => `  ${check.status.padEnd(4)} ${check.id}: ${check.detail}`),
    ].join("\n");
    (report.ok ? process.stdout : process.stderr).write(`${output}\n`);
    return report.ok ? 0 : 1;
  } catch (error) {
    const report = { ok: false, verdict: "FAIL", error: error.message };
    process.stderr.write(`${args?.json ? JSON.stringify(report) : `release evidence: FAIL — ${error.message}`}\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await main();

export { main, REQUIRED };
