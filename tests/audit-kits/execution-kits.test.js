import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ROLE_RUNNER_HOST_CAPABILITIES, runRole } from "../../scripts/lib/execution-kits/role-runner.mjs";
import { validateExpression } from "../../scripts/lib/execution-kits/sql-expression-validator.mjs";

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function manifest(command, overrides = {}) {
  const input = { a: "fixed", z: 2 };
  return {
    input,
    manifest: {
      schema: "opchain.execution-manifest",
      version: 1,
      role: "audit-test",
      input_digest: sha256('{"a":"fixed","z":2}'),
      command,
      cwd: ".",
      env: {},
      timeout_ms: 1_000,
      retry: { max_attempts: 1, backoff_ms: 0, retryable_exit_codes: [75] },
      output: { max_stdout_bytes: 64, max_stderr_bytes: 64 },
      capabilities: { network: "inherited", filesystem: "inherited", isolation: "none" },
      ...overrides,
    },
  };
}

describe("execution kits: local role runner", () => {
  it.runIf(ROLE_RUNNER_HOST_CAPABILITIES.process_groups)("uses the identical canonical input bytes and immutable identity", async () => {
    const request = manifest([process.execPath, "-e", "let value='';process.stdin.on('data', part => value += part);process.stdin.on('end', () => process.stdout.write(value))"]);
    const result = await runRole(request);
    expect(result).toMatchObject({ status: "PASS", attempts: 1, stdout: '{"a":"fixed","z":2}', isolation: "none", input_digest: request.manifest.input_digest });
    expect(result.run_id).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.manifest_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it.runIf(ROLE_RUNNER_HOST_CAPABILITIES.process_groups)("preserves output-limit cause even when a child resists termination", async () => {
    const noisy = await runRole(manifest([process.execPath, "-e", "process.stdout.write('x'.repeat(128))"]));
    expect(noisy.failure_code).toBe("OUTPUT_LIMIT");
    const resistant = await runRole(manifest([process.execPath, "-e", "process.on('SIGTERM', () => {}); process.stdout.write('x'.repeat(128)); setInterval(() => {}, 1000)"], { timeout_ms: 1_000 }));
    expect(resistant.failure_code).toBe("OUTPUT_LIMIT");
    const timedOut = await runRole(manifest([process.execPath, "-e", "setInterval(() => {}, 1000)"], { timeout_ms: 25 }));
    expect(timedOut.failure_code).toBe("TIMEOUT");
  });

  it.runIf(ROLE_RUNNER_HOST_CAPABILITIES.process_groups)("bounds retries to the declared attempt count", async () => {
    const request = manifest([process.execPath, "-e", "process.exit(75)"], { retry: { max_attempts: 2, backoff_ms: 0, retryable_exit_codes: [75] } });
    const result = await runRole(request);
    expect(result).toMatchObject({ status: "FAIL", attempts: 2, failure_code: "RETRY_EXHAUSTED" });
  });

  it("rejects mismatched immutable input digests before spawning", async () => {
    const request = manifest([process.execPath, "-e", "process.exit(0)"], { input_digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000" });
    const result = await runRole(request);
    expect(result).toMatchObject({ status: "ERROR", failure_code: "INPUT_DIGEST_MISMATCH", attempts: 0 });
  });

  it("returns stable artifacts for malformed manifests and invalid input", async () => {
    const malformed = await runRole({ manifest: { schema: "opchain.execution-manifest", version: 1, command: undefined }, input: {} });
    expect(malformed).toMatchObject({ status: "ERROR", failure_code: "INVALID_MANIFEST", attempts: 0, isolation: "none", manifest_digest: null, run_id: null });
    const invalidInput = await runRole({ manifest: undefined, input: undefined });
    expect(invalidInput).toMatchObject({ status: "ERROR", failure_code: "INVALID_INPUT", attempts: 0, isolation: "none" });
  });

  it("rejects unenforceable capability claims", async () => {
    const request = manifest([process.execPath, "-e", "process.exit(0)"], { capabilities: { network: "none", filesystem: "none", isolation: "none" } });
    await expect(runRole(request)).resolves.toMatchObject({ status: "UNSUPPORTED", failure_code: "UNSUPPORTED_CAPABILITY", attempts: 0 });
  });
});

describe("execution kits: narrow SQL expression validator", () => {
  const columns = [{ name: "amount", type: "numeric" }, { name: "tax_rate", type: "numeric" }];
  const policy = { allow_functions: ["coalesce"], require_nonempty: true };

  it("renders a supported expression deterministically", () => {
    expect(validateExpression({ expression: "coalesce(amount, 0) * tax_rate", dialect: "postgres", columns, policy })).toMatchObject({ status: "VALID", rendered: "coalesce(amount, 0) * tax_rate" });
  });

  it("returns invalid for contract violations", () => {
    expect(validateExpression({ expression: "missing + 1", dialect: "postgres", columns, policy })).toMatchObject({ status: "INVALID", diagnostics: [{ code: "UNKNOWN_COLUMN" }] });
    expect(validateExpression({ expression: "sum(amount)", dialect: "postgres", columns, policy })).toMatchObject({ status: "INVALID", diagnostics: [{ code: "DISALLOWED_FUNCTION" }] });
  });

  it("returns unsupported for another dialect and syntax outside the grammar", () => {
    expect(validateExpression({ expression: "amount", dialect: "sqlite", columns, policy })).toMatchObject({ status: "UNSUPPORTED" });
    expect(validateExpression({ expression: "select amount", dialect: "postgres", columns, policy })).toMatchObject({ status: "UNSUPPORTED" });
  });
});
