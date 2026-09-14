import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const runnerSource = fileURLToPath(new URL("../../scripts/lib/execution-kits/role-runner.mjs", import.meta.url));
const artifacts = [];

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function copiedRunner() {
  const directory = mkdtempSync(join(tmpdir(), "opchain-role-artifact-"));
  artifacts.push(directory);
  const artifact = join(directory, "role-runner.mjs");
  copyFileSync(runnerSource, artifact);
  return import(`${pathToFileURL(artifact).href}?artifact=${Date.now()}`);
}

function request(command, input = { a: "fixed", z: 2 }, overrides = {}) {
  const canonicalInput = JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))));
  return {
    input,
    manifest: {
      schema: "opchain.execution-manifest",
      version: 1,
      role: "artifact-test",
      input_digest: sha256(canonicalInput),
      command,
      cwd: ".",
      env: {},
      timeout_ms: 1_000,
      retry: { max_attempts: 1, backoff_ms: 0, retryable_exit_codes: [75] },
      output: { max_stdout_bytes: 256, max_stderr_bytes: 256 },
      capabilities: { network: "inherited", filesystem: "inherited", isolation: "none" },
      ...overrides,
    },
  };
}

afterEach(() => {
  while (artifacts.length) rmSync(artifacts.pop(), { recursive: true, force: true });
});

describe("copied role-runner artifact", () => {
  it("holds manifest command and retry policy immutable across an in-flight retry", async () => {
    const { ROLE_RUNNER_HOST_CAPABILITIES, runRole } = await copiedRunner();
    if (!ROLE_RUNNER_HOST_CAPABILITIES.process_groups) return;
    const pending = request([process.execPath, "-e", "setTimeout(() => process.exit(75), 50)"], { a: "fixed", z: 2 }, { retry: { max_attempts: 2, backoff_ms: 25, retryable_exit_codes: [75] } });
    const running = runRole(pending);
    pending.manifest.command = [process.execPath, "-e", "process.exit(0)"];
    pending.manifest.retry = { max_attempts: 1, backoff_ms: 0, retryable_exit_codes: [] };
    await expect(running).resolves.toMatchObject({ status: "FAIL", attempts: 2, failure_code: "RETRY_EXHAUSTED", isolation: "none" });
  });

  it("keeps separate role inputs and identities separate in a copied artifact", async () => {
    const { ROLE_RUNNER_HOST_CAPABILITIES, runRole } = await copiedRunner();
    if (!ROLE_RUNNER_HOST_CAPABILITIES.process_groups) return;
    const echo = [process.execPath, "-e", "let body='';process.stdin.on('data', part => body += part);process.stdin.on('end', () => process.stdout.write(body))"];
    const [first, second] = await Promise.all([runRole(request(echo, { role: "first" })), runRole(request(echo, { role: "second" }))]);
    expect(first).toMatchObject({ status: "PASS", stdout: '{"role":"first"}', isolation: "none" });
    expect(second).toMatchObject({ status: "PASS", stdout: '{"role":"second"}', isolation: "none" });
    expect(first.run_id).not.toBe(second.run_id);
  });

  it("enforces retry bounds in a copied artifact", async () => {
    const { ROLE_RUNNER_HOST_CAPABILITIES, runRole } = await copiedRunner();
    if (!ROLE_RUNNER_HOST_CAPABILITIES.process_groups) return;
    const result = await runRole(request([process.execPath, "-e", "process.exit(75)"], { a: "fixed", z: 2 }, { retry: { max_attempts: 2, backoff_ms: 0, retryable_exit_codes: [75] } }));
    expect(result).toMatchObject({ status: "FAIL", attempts: 2, failure_code: "RETRY_EXHAUSTED" });
  });

  it("returns contract-failure artifacts from a copied artifact", async () => {
    const { runRole } = await copiedRunner();
    const malformed = await runRole({ manifest: { schema: "opchain.execution-manifest", version: 1, command: undefined }, input: {} });
    const unsupported = await runRole(request([process.execPath, "-e", "process.exit(0)"], { a: "fixed", z: 2 }, { capabilities: { network: "none", filesystem: "none", isolation: "none" } }));
    expect(malformed).toMatchObject({ status: "ERROR", failure_code: "INVALID_MANIFEST", manifest_digest: null, run_id: null, isolation: "none" });
    expect(unsupported).toMatchObject({ status: "UNSUPPORTED", failure_code: "UNSUPPORTED_CAPABILITY", isolation: "none" });
  });
});
