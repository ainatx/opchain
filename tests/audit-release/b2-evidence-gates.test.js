import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { evaluateReleaseEvidence } from "../../scripts/lib/release-evidence.mjs";

const require = createRequire(import.meta.url);
const { createPolicy, createReceipt, createRepositoryIdentity, createToolchain } = require("../../scripts/lib/verification-receipt.cjs");

const candidate = "a".repeat(40);
const tree = "b".repeat(40);
const candidateIdentity = { kind: "git_tree_projection", id: `sha256:${"e".repeat(64)}` };
const now = "2026-09-13T20:00:00Z";
const repository = createRepositoryIdentity({ git_common_dir: mkdtempSync(join(tmpdir(), "opchain-b2-git-")) });
const policy = createPolicy({ required_checks: ["tests"], config: { present: false } });
const toolchain = createToolchain({ components: [{ name: "node", version: process.version }] });

function receipt(overrides = {}) {
  return createReceipt({
    repository,
    candidate: { tree },
    policy,
    toolchain,
    verifier: { name: "opchain-candidate-verifier", version: "1" },
    started_at: now,
    verified_at: now,
    checks: [{ id: "tests", status: "PASS", exit_code: 0, duration_ms: 1 }],
    ...overrides,
  });
}

function checkpoint(skill, evidencePolicy, { artifact = candidateIdentity, verdict = "PASS" } = {}) {
  return {
    protocol_version: "1.1",
    skill,
    project: "fixture",
    project_dir: "/fixture",
    created_at: now,
    updated_at: now,
    record_updated_at: now,
    phase: "verify",
    step: "complete",
    status: "complete",
    progress_summary: `${skill} fixture`,
    handoffs: [{
      id: `${skill}-fixture`,
      contract_version: "1.0",
      type: "verification.verdict",
      created_at: now,
      verified_at: now,
      producer: { skill, run_id: "fixture-run" },
      candidate: artifact,
      payload: { verdict, policy: evidencePolicy },
    }],
  };
}

function evaluate(stage, checkpoints, extra = {}) {
  return evaluateReleaseEvidence({
    stage,
    candidate,
    candidateIdentity,
    tree,
    repositoryId: repository.id,
    receipt: receipt(),
    checkpoints,
    ...extra,
  });
}

describe("B2 candidate-bound evidence evaluator", () => {
  it("accepts PR evidence only when executable, Docs, and Repo checks bind the candidate", () => {
    const result = evaluate("pr", {
      "oc-docs-forge": checkpoint("oc-docs-forge", "pr-docs-v1"),
      "oc-repo-ops": checkpoint("oc-repo-ops", "pr-readiness-v1"),
    });
    expect(result.verdict).toBe("PASS");
    expect(result.checks.map((check) => check.status)).toEqual(["PASS", "PASS", "PASS"]);
  });

  it("fails required evidence that is missing, stale, incomplete, or under the wrong policy", () => {
    const stale = { kind: "git_tree_projection", id: `sha256:${"c".repeat(64)}` };
    const result = evaluate("pr", {
      "oc-docs-forge": checkpoint("oc-docs-forge", "pr-docs-v1", { artifact: stale }),
      "oc-repo-ops": checkpoint("oc-repo-ops", "other-policy", { verdict: "INCOMPLETE" }),
    });
    expect(result.verdict).toBe("FAIL");
    expect(result.checks.filter((check) => check.status === "FAIL")).toHaveLength(2);
  });

  it("rejects an executable receipt from another repository or tree", () => {
    const result = evaluateReleaseEvidence({
      stage: "pr",
      candidate,
      candidateIdentity,
      tree: "d".repeat(40),
      repositoryId: repository.id,
      receipt: receipt(),
      checkpoints: {
        "oc-docs-forge": checkpoint("oc-docs-forge", "pr-docs-v1"),
        "oc-repo-ops": checkpoint("oc-repo-ops", "pr-readiness-v1"),
      },
    });
    expect(result.verdict).toBe("FAIL");
    expect(result.checks[0].detail).toMatch(/candidate_tree/);
  });

  it("keeps missing compliance evidence warn-only while required deploy audits fail closed", () => {
    const pass = evaluate("deploy", {
      "oc-code-auditor": checkpoint("oc-code-auditor", "pre-deploy-code-audit-v1"),
      "oc-security-auditor": checkpoint("oc-security-auditor", "pre-deploy-security-posture-v1"),
    }, { complianceProfilePresent: true });
    expect(pass.verdict).toBe("PASS");
    expect(pass.warnings).toEqual([expect.objectContaining({ id: "oc-compliance-ops", status: "WARN" })]);

    const fail = evaluate("deploy", {
      "oc-code-auditor": checkpoint("oc-code-auditor", "pre-deploy-code-audit-v1"),
    });
    expect(fail.verdict).toBe("FAIL");
    expect(fail.checks).toContainEqual(expect.objectContaining({ id: "oc-security-auditor", status: "FAIL" }));
  });

  it("wires the deploy entry point before build or platform mutation", () => {
    const source = readFileSync(join(process.cwd(), "scripts/deploy.mjs"), "utf8");
    const evidence = source.indexOf('run("node", ["scripts/lib/release-evidence.mjs", "--stage", "deploy"]);');
    const prebuild = source.indexOf('run("npm", ["run", "prebuild"]);');
    expect(evidence).toBeGreaterThan(0);
    expect(evidence).toBeLessThan(prebuild);
  });
});

// Preview identity must block production before credentials, build or deployment.
it("refuses production for a marked preview even with release bypass flags", () => {
  const result = spawnSync(process.execPath, ["scripts/deploy.mjs"], {
    cwd: process.cwd(), encoding: "utf8",
    env: { ...process.env, OPCHAIN_ALLOW_UNTAGGED_RELEASE: "1", OPCHAIN_ALLOW_OFF_MAIN_STAGING: "1" },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("This tree is a staging preview");
  expect(result.stdout).not.toContain("preflight ok");
});
