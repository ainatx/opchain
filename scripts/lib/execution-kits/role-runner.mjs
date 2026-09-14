import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const MAX_TIMEOUT_MS = 900_000;
const MAX_OUTPUT_BYTES = 1_048_576;
const KILL_GRACE_MS = 1_000;
const POSIX_GROUP_HOSTS = new Set(["darwin", "linux"]);

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("input must be canonical JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError("input must be canonical JSON");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function resultBase(manifest, inputDigest) {
  const manifestForDigest = { ...manifest };
  delete manifestForDigest.input_digest;
  delete manifestForDigest.manifest_digest;
  const manifestDigest = digest(canonicalJson(manifestForDigest));
  return {
    input_digest: inputDigest,
    manifest_digest: manifestDigest,
    run_id: digest(canonicalJson({ manifest_digest: manifestDigest, input_digest: inputDigest })),
    isolation: "none",
  };
}

function failure(base, failureCode, status = "ERROR", extra = {}) {
  return {
    status,
    attempts: 0,
    exit_code: null,
    stdout: "",
    stderr: "",
    duration_ms: 0,
    failure_code: failureCode,
    ...base,
    ...extra,
  };
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return "INVALID_MANIFEST";
  if (manifest.schema !== "opchain.execution-manifest" || manifest.version !== 1) return "INVALID_MANIFEST";
  if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(manifest.role || "")) return "INVALID_MANIFEST";
  if (!Array.isArray(manifest.command) || manifest.command.length === 0 || !manifest.command.every((arg) => typeof arg === "string" && arg)) return "INVALID_MANIFEST";
  if (typeof manifest.cwd !== "string" || manifest.cwd.startsWith("/") || manifest.cwd.split(/[\\/]/).includes("..")) return "INVALID_MANIFEST";
  if (!Number.isInteger(manifest.timeout_ms) || manifest.timeout_ms < 1 || manifest.timeout_ms > MAX_TIMEOUT_MS) return "INVALID_MANIFEST";
  const retry = manifest.retry;
  if (!retry || !Number.isInteger(retry.max_attempts) || retry.max_attempts < 1 || retry.max_attempts > 3 || !Number.isInteger(retry.backoff_ms) || retry.backoff_ms < 0 || retry.backoff_ms > 60_000 || !Array.isArray(retry.retryable_exit_codes) || !retry.retryable_exit_codes.every((code) => Number.isInteger(code) && code >= 0 && code <= 255)) return "INVALID_MANIFEST";
  const output = manifest.output;
  if (!output || !Number.isInteger(output.max_stdout_bytes) || !Number.isInteger(output.max_stderr_bytes) || output.max_stdout_bytes < 1 || output.max_stdout_bytes > MAX_OUTPUT_BYTES || output.max_stderr_bytes < 1 || output.max_stderr_bytes > MAX_OUTPUT_BYTES) return "INVALID_MANIFEST";
  if (!manifest.capabilities || manifest.capabilities.isolation !== "none") return "INVALID_MANIFEST";
  if (manifest.capabilities.network !== "inherited" || manifest.capabilities.filesystem !== "inherited") return "UNSUPPORTED_CAPABILITY";
  if (manifest.env !== undefined && (!manifest.env || typeof manifest.env !== "object" || Array.isArray(manifest.env) || !Object.values(manifest.env).every((value) => typeof value === "string"))) return "INVALID_MANIFEST";
  return null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminateGroup(child, signal) {
  if (!child.pid) return;
  try { process.kill(-child.pid, signal); } catch { /* Child may have already exited. */ }
}

function executeAttempt(manifest, inputBytes) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let child;
    try {
      child = spawn(manifest.command[0], manifest.command.slice(1), {
        cwd: manifest.cwd,
        env: { ...process.env, ...manifest.env },
        detached: true,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({ kind: "spawn", error, stdout: "", stderr: "", duration_ms: Date.now() - startedAt });
      return;
    }

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let ended = false;
    let terminalCause = null;
    let forceTimer;
    const finish = (value) => {
      if (ended) return;
      ended = true;
      clearTimeout(timeoutTimer);
      clearTimeout(forceTimer);
      resolve({ ...value, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), duration_ms: Date.now() - startedAt });
    };
    const stop = (kind) => {
      if (terminalCause) return;
      terminalCause = kind;
      terminateGroup(child, "SIGTERM");
      forceTimer = setTimeout(() => terminateGroup(child, "SIGKILL"), KILL_GRACE_MS);
    };
    const append = (which, chunk, limit) => {
      const next = Buffer.concat([which === "stdout" ? stdout : stderr, Buffer.from(chunk)]);
      if (which === "stdout") stdout = next.subarray(0, limit); else stderr = next.subarray(0, limit);
      if (next.length > limit) stop("output");
    };
    child.stdout.on("data", (chunk) => append("stdout", chunk, manifest.output.max_stdout_bytes));
    child.stderr.on("data", (chunk) => append("stderr", chunk, manifest.output.max_stderr_bytes));
    child.on("error", (error) => finish({ kind: "spawn", error }));
    child.on("close", (code) => finish({ kind: terminalCause || "exit", code }));
    const timeoutTimer = setTimeout(() => stop("timeout"), manifest.timeout_ms);
    child.stdin.on("error", () => {});
    child.stdin.end(inputBytes);
  });
}

/** Runs one explicit, local POSIX role invocation. Process separation is not a sandbox. */
export async function runRole({ manifest, input }) {
  let inputBytes;
  let inputDigest;
  try {
    inputBytes = Buffer.from(canonicalJson(input), "utf8");
    inputDigest = digest(inputBytes);
  } catch {
    return failure({ input_digest: null, manifest_digest: null, run_id: null, isolation: "none" }, "INVALID_INPUT");
  }
  const manifestError = validateManifest(manifest);
  const invalidBase = { input_digest: inputDigest, manifest_digest: null, run_id: null, isolation: "none" };
  if (manifestError) return failure(invalidBase, manifestError, manifestError === "UNSUPPORTED_CAPABILITY" ? "UNSUPPORTED" : "ERROR");
  let manifestSnapshot;
  let base;
  try {
    // This is the only manifest read after validation. Every asynchronous
    // attempt uses the immutable canonical copy, not caller-owned objects.
    manifestSnapshot = JSON.parse(canonicalJson(manifest));
    base = resultBase(manifestSnapshot, inputDigest);
  }
  catch { return failure(invalidBase, "INVALID_MANIFEST"); }
  if (manifestSnapshot.input_digest !== inputDigest) return failure(base, "INPUT_DIGEST_MISMATCH");
  if (!POSIX_GROUP_HOSTS.has(process.platform)) return failure(base, "UNSUPPORTED_HOST", "UNSUPPORTED");

  let last;
  for (let attempt = 1; attempt <= manifestSnapshot.retry.max_attempts; attempt += 1) {
    last = await executeAttempt(manifestSnapshot, inputBytes);
    const retryable = last.kind === "timeout" || (last.kind === "exit" && manifestSnapshot.retry.retryable_exit_codes.includes(last.code));
    if (!retryable || attempt === manifestSnapshot.retry.max_attempts) {
      const failureCode = last.kind === "timeout" ? "TIMEOUT" : last.kind === "output" ? "OUTPUT_LIMIT" : last.kind === "spawn" ? "SPAWN_ERROR" : last.code === 0 ? null : "NONZERO_EXIT";
      return {
        status: failureCode ? "FAIL" : "PASS",
        attempts: attempt,
        exit_code: last.kind === "exit" ? last.code : null,
        stdout: last.stdout,
        stderr: last.stderr,
        duration_ms: last.duration_ms,
        failure_code: retryable && failureCode && manifestSnapshot.retry.max_attempts > 1 ? "RETRY_EXHAUSTED" : failureCode,
        ...base,
      };
    }
    await wait(manifestSnapshot.retry.backoff_ms);
  }
  return failure(base, "RETRY_EXHAUSTED");
}

export const ROLE_RUNNER_HOST_CAPABILITIES = Object.freeze({
  process_groups: POSIX_GROUP_HOSTS.has(process.platform),
  isolation: "none",
});
