import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  DEFAULT_REQUIRED_CHECKS,
  createPolicy,
  createReceipt,
  createRepositoryIdentity,
  createToolchain,
  receiptPath,
  validateReceipt,
} = require("../../scripts/lib/verification-receipt.cjs");

const scratches = [];
afterEach(() => {
  while (scratches.length) rmSync(scratches.pop(), { recursive: true, force: true });
});

function passingChecks() {
  return DEFAULT_REQUIRED_CHECKS.map((id) => ({ id, status: "PASS", exit_code: 0, duration_ms: 1 }));
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "opchain receipt contract "));
  scratches.push(root);
  const common = join(root, "repository common.git");
  const worktree = join(root, "candidate worktree");
  mkdirSync(common, { recursive: true });
  mkdirSync(worktree, { recursive: true });
  const repository = createRepositoryIdentity({ git_common_dir: common });
  const policy = createPolicy({
    required_checks: [...DEFAULT_REQUIRED_CHECKS].reverse(),
    config: { path: ".bugcheck.json", content: '{"strict":true}\n' },
  });
  const toolchain = createToolchain({
    components: [
      { name: "node", version: process.version },
      { name: "git", version: "2.51.0" },
    ],
  });
  const receipt = createReceipt({
    run_id: "run-0001",
    repository,
    candidate: { tree: "a".repeat(40) },
    policy,
    toolchain,
    verifier: { name: "opchain-candidate-verifier", version: "1" },
    started_at: "2026-09-13T12:00:00.000Z",
    verified_at: "2026-09-13T12:00:01.000Z",
    checks: passingChecks(),
  });
  return { common, worktree, repository, policy, toolchain, receipt };
}

describe("verification receipt v1 contract", () => {
  it("derives PASS and validates every candidate-binding fingerprint", () => {
    const { receipt } = fixture();
    expect(receipt.verdict).toBe("PASS");
    expect(
      validateReceipt(receipt, {
        repository_id: receipt.repository.id,
        candidate_tree: receipt.candidate.tree,
        policy_fingerprint: receipt.policy.fingerprint,
        toolchain_fingerprint: receipt.toolchain.fingerprint,
        verdict: "PASS",
      }),
    ).toMatchObject({ ok: true, errors: [] });
  });

  it("rejects an edited verdict instead of trusting a handwritten PASS", () => {
    const { receipt } = fixture();
    const edited = structuredClone(receipt);
    edited.checks.find((check) => check.id === "tests").status = "FAIL";
    expect(validateReceipt(edited)).toMatchObject({ ok: false });
  });

  it("derives a non-authorizing verdict when a required capability is unsupported", () => {
    const { receipt, repository, policy, toolchain } = fixture();
    const checks = passingChecks();
    checks.find((check) => check.id === "tests").status = "UNSUPPORTED";
    const unsupported = createReceipt({
      ...receipt,
      run_id: "run-unsupported",
      repository,
      policy,
      toolchain,
      checks,
    });
    expect(unsupported.verdict).toBe("UNSUPPORTED");
    expect(validateReceipt(unsupported, { verdict: "PASS" })).toMatchObject({ ok: false });
  });

  it("fingerprints normalized policy rather than input key or check order", () => {
    const one = createPolicy({
      required_checks: ["tests", "lint"],
      config: { content: "{}", path: ".bugcheck.json" },
    });
    const two = createPolicy({
      config: { path: ".bugcheck.json", content: "{}" },
      required_checks: ["lint", "tests"],
    });
    expect(one.fingerprint).toBe(two.fingerprint);
    expect(one.required_checks).toEqual(["lint", "tests"]);
  });

  it("locates immutable receipts under the Git common dir, outside a spaced worktree", () => {
    const { common, worktree, policy } = fixture();
    const target = receiptPath({
      git_common_dir: common,
      candidate_tree: "b".repeat(40),
      policy_fingerprint: policy.fingerprint,
      run_id: "run-with-safe-id",
    });
    expect(target.startsWith(`${realpathSync(common)}/`)).toBe(true);
    expect(target.startsWith(`${realpathSync(worktree)}/`)).toBe(false);
    expect(target).toContain("verification-receipts/v1");
  });
});
