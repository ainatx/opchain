#!/usr/bin/env node
// Replay `.opchain/hardening.yaml` at the deploy chokepoint.
//
// The manifest is executable configuration, so this runner deliberately does
// not invoke a shell. Test commands are restricted to reviewed local package
// scripts/binaries, config paths stay inside the repository, and HTTP probes
// stay on the explicitly supplied deploy origin.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const SCRIPT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(process.env.OPCHAIN_HARDENING_ROOT || SCRIPT_ROOT);
const MANIFEST = resolve(process.env.OPCHAIN_HARDENING_PATH || join(ROOT, ".opchain/hardening.yaml"));
const argv = process.argv.slice(2);
const targetIndex = argv.indexOf("--target");
const BASE_URL = targetIndex >= 0 ? argv[targetIndex + 1] : null;
const PRE_DEPLOY = argv.includes("--pre-deploy") || !BASE_URL;

function insideRoot(path) {
  const rel = relative(realpathSync(ROOT), realpathSync(path));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function configCheck(spec) {
  if (typeof spec.path !== "string" || (!spec.contains && !spec.pattern)) {
    return { ok: false, detail: "config verify needs path and contains/pattern" };
  }
  const path = resolve(ROOT, spec.path);
  if (!existsSync(path) || !insideRoot(path)) return { ok: false, detail: "config path is missing or outside the repository" };
  const value = readFileSync(path, "utf8");
  if (typeof spec.contains === "string") return { ok: value.includes(spec.contains), detail: `contains ${JSON.stringify(spec.contains)}` };
  try {
    return { ok: new RegExp(spec.pattern).test(value), detail: `matches /${spec.pattern}/` };
  } catch {
    return { ok: false, detail: "invalid config regex" };
  }
}

function safeCommand(command) {
  if (typeof command !== "string" || !command.trim()) return null;
  if (!/^[A-Za-z0-9_./:=@+\- ]+$/.test(command)) return null;
  const parts = command.trim().split(/ +/);
  if (parts[0] === "npm" && parts[1] === "test" && parts.length === 2) return parts;
  if (
    parts[0] === "npm" &&
    parts[1] === "run" &&
    /^(?:test|check|lint|validate)(?:(?::|-)[A-Za-z0-9_-]+)*$/.test(parts[2] || "") &&
    parts.length === 3
  ) return parts;
  if (
    parts[0] === "node" &&
    /^scripts\/(?:check|lint|validate|test)-[A-Za-z0-9_.-]+\.mjs$/.test(parts[1] || "") &&
    parts.length === 2
  ) {
    const script = resolve(ROOT, parts[1]);
    return existsSync(script) && insideRoot(script) ? parts : null;
  }
  if (
    parts[0] === "npx" &&
    parts[1] === "--no" &&
    parts[2] === "--" &&
    parts[3] === "vitest" &&
    parts[4] === "run"
  ) {
    const localBin = resolve(ROOT, "node_modules/.bin/vitest");
    if (!existsSync(localBin) || !insideRoot(localBin)) return null;
    const targets = parts.slice(5);
    if (!targets.every((target) => {
      if (!/^(?:tests?|src)\/[A-Za-z0-9_./-]+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(target)) return false;
      const path = resolve(ROOT, target);
      return existsSync(path) && insideRoot(path);
    })) return null;
    return [localBin, ...parts.slice(4)];
  }
  return null;
}

function testCheck(spec) {
  const command = safeCommand(spec.cmd);
  if (!command) return { ok: false, detail: "unsafe or unsupported test command (shell syntax and remote npx downloads are forbidden)" };
  const result = spawnSync(command[0], command.slice(1), { cwd: ROOT, encoding: "utf8", shell: false });
  const tail = `${result.stdout || ""}${result.stderr || ""}`.trim().split("\n").slice(-4).join("\n");
  return { ok: result.status === 0, detail: tail || `exit ${result.status}` };
}

async function httpCheck(spec) {
  if (typeof spec.url !== "string" || !/^\/(?!\/)/.test(spec.url)) {
    return { ok: false, detail: "HTTP verify URL must be relative to the deploy target" };
  }
  const requestMethod = String(spec.request_method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(requestMethod)) {
    return { ok: false, detail: "HTTP verify request_method must be GET or POST" };
  }
  if (requestMethod === "POST" && (!spec.json || typeof spec.json !== "object" || Array.isArray(spec.json))) {
    return { ok: false, detail: "HTTP POST verify requires a json mapping" };
  }
  if (requestMethod !== "POST" && spec.json !== undefined) {
    return { ok: false, detail: "HTTP verify json is only valid with POST" };
  }
  if (spec.expect !== undefined && !spec.header) {
    return { ok: false, detail: "HTTP verify expect requires header" };
  }
  if (!["status", "header", "body_contains", "response_shape"].some((key) => spec[key] !== undefined)) {
    return { ok: false, detail: "HTTP verify requires at least one response assertion" };
  }
  if (spec.status !== undefined) {
    const status = Number(spec.status);
    if (!Number.isInteger(status) || status < 100 || status > 599) {
      return { ok: false, detail: "HTTP verify status must be an HTTP status code" };
    }
  }
  if (spec.response_shape !== undefined && spec.response_shape !== "mcp-session-token") {
    return { ok: false, detail: `unsupported HTTP response_shape ${spec.response_shape}` };
  }
  if (PRE_DEPLOY) return { skipped: true, detail: "live HTTP replay waits for a deploy target" };
  let base;
  try { base = new URL(BASE_URL); } catch { return { ok: false, detail: "invalid --target URL" }; }
  if (base.protocol !== "https:" || base.username || base.password) {
    return { ok: false, detail: "deploy target must be credential-free HTTPS" };
  }
  const url = new URL(spec.url, base);
  if (url.origin !== base.origin) return { ok: false, detail: "HTTP verify escaped the deploy target origin" };
  try {
    const response = await fetch(url, {
      method: requestMethod,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: requestMethod === "POST"
        ? { "Content-Type": "application/json", Origin: base.origin }
        : undefined,
      body: requestMethod === "POST" ? JSON.stringify(spec.json) : undefined,
    });
    if (spec.status !== undefined && response.status !== Number(spec.status)) {
      return { ok: false, detail: `HTTP ${response.status}; expected ${spec.status}` };
    }
    if (spec.header) {
      const actual = response.headers.get(String(spec.header)) || "";
      if (!actual) return { ok: false, detail: `missing header ${spec.header}` };
      if (spec.expect !== undefined && !actual.includes(String(spec.expect))) {
        return { ok: false, detail: `${spec.header} did not contain ${spec.expect}` };
      }
    }
    let responseBody = null;
    if (spec.body_contains !== undefined || spec.response_shape !== undefined) {
      responseBody = await response.text();
    }
    if (spec.body_contains !== undefined) {
      const body = responseBody ?? "";
      if (!body.includes(String(spec.body_contains))) {
        return { ok: false, detail: `response body did not contain ${spec.body_contains}` };
      }
    }
    if (spec.response_shape !== undefined) {
      if (spec.response_shape !== "mcp-session-token") {
        return { ok: false, detail: `unsupported HTTP response_shape ${spec.response_shape}` };
      }
      try {
        const envelope = JSON.parse(responseBody ?? "");
        if (envelope.jsonrpc !== "2.0" || envelope.error || envelope.result?.isError) {
          return { ok: false, detail: "MCP session probe returned a JSON-RPC/tool error" };
        }
        const toolResult = JSON.parse(envelope.result?.content?.[0]?.text ?? "");
        const token = toolResult.sessionId;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/i.test(token ?? "")) {
          return { ok: false, detail: "MCP session probe did not return a signed token" };
        }
      } catch {
        return { ok: false, detail: "MCP session probe returned malformed JSON" };
      }
    }
    return { ok: true, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: String(error) };
  }
}

function manualCheck(spec) {
  if (!spec.instructions) return { ok: false, detail: "manual verify needs instructions" };
  if (spec.max_age_days !== undefined) {
    const maxAgeDays = Number(spec.max_age_days);
    if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) {
      return { ok: false, detail: "manual max_age_days must be a finite non-negative number" };
    }
    const checked = Date.parse(spec.last_manual_check || "");
    if (!Number.isFinite(checked)) return { ok: false, detail: "manual max_age_days requires a valid last_manual_check" };
    const ageDays = (Date.now() - checked) / 86_400_000;
    if (ageDays < 0) return { ok: false, detail: "manual last_manual_check cannot be in the future" };
    if (ageDays > maxAgeDays) return { ok: false, detail: `manual check is ${Math.floor(ageDays)}d old` };
  }
  return { skipped: true, detail: `MANUAL: ${spec.instructions}` };
}

function cspStageCheck(control) {
  if (control.id !== "csp.stage") return { ok: true };
  const order = ["inventory", "report-only", "reviewed", "enforce"];
  if (!order.includes(control.stage)) return { ok: false, detail: "csp.stage has an invalid stage" };
  if (!Array.isArray(control.stage_history) || control.stage_history.length === 0) {
    return { ok: false, detail: "csp.stage requires non-empty stage_history" };
  }
  if (control.stage === "enforce" && !control.stage_history.some((stamp) => stamp.stage === "reviewed")) {
    return { ok: false, detail: "csp.stage enforce requires a reviewed history stamp" };
  }
  let previous = -1;
  let previousDate = -Infinity;
  const now = Date.now();
  for (const [position, stamp] of control.stage_history.entries()) {
    const index = order.indexOf(stamp?.stage);
    const date = Date.parse(stamp?.date || "");
    if (index < 0 || !Number.isFinite(date)) {
      return { ok: false, detail: "csp.stage history needs valid stage/date stamps" };
    }
    if (date > now) return { ok: false, detail: "csp.stage history cannot contain future dates" };
    if (date < previousDate) return { ok: false, detail: "csp.stage history dates must be chronological" };
    if (index < previous) return { ok: false, detail: "csp.stage history must advance in order" };
    if (position === 0 && index !== 0) return { ok: false, detail: "csp.stage history must begin at inventory" };
    if (previous >= 0 && index > previous + 1) {
      return { ok: false, detail: "csp.stage history cannot skip rollout stages" };
    }
    previous = index;
    previousDate = date;
  }
  if (control.stage_history.at(-1)?.stage !== control.stage) {
    return { ok: false, detail: "csp.stage must match the latest stage_history stamp" };
  }
  if (control.stage === "report-only") {
    const end = Date.parse(control.review_window_ends || "");
    if (!Number.isFinite(end)) return { ok: false, detail: "csp.stage report-only requires review_window_ends" };
    if (Date.now() - end > 14 * 86_400_000) {
      return { ok: false, detail: "csp.stage report-only review window is more than 14 days overdue" };
    }
  }
  return { ok: true };
}

async function verify(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return { ok: false, detail: "verify entry must be a mapping" };
  if (spec.method === "config") return configCheck(spec);
  if (spec.method === "test") return testCheck(spec);
  if (spec.method === "http") return httpCheck(spec);
  if (spec.method === "manual") return manualCheck(spec);
  return { ok: false, detail: `unknown verify method ${JSON.stringify(spec.method)}` };
}

if (!existsSync(MANIFEST)) {
  console.log("HARDENING MANIFEST CHECK\n⤳ no .opchain/hardening.yaml; conditional gate inactive");
  process.exit(0);
}

let manifest;
try {
  manifest = yaml.load(readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`HARDENING MANIFEST CHECK\n✗ could not parse manifest: ${error.message}`);
  process.exit(1);
}

if (manifest?.version !== 1 || !Array.isArray(manifest.controls) || manifest.controls.length === 0) {
  console.error("HARDENING MANIFEST CHECK\n✗ expected version: 1 and a non-empty controls list");
  process.exit(1);
}

let failed = 0;
let skipped = 0;
console.log(`HARDENING MANIFEST CHECK (${PRE_DEPLOY ? "deploying SHA" : BASE_URL})`);
for (const control of manifest.controls) {
  if (!control?.id || !control?.control || !control?.verify) {
    console.error("✗ malformed control: id, control, and verify are required");
    failed += 1;
    continue;
  }
  const cspStage = cspStageCheck(control);
  if (!cspStage.ok) {
    console.error(`✗ ${control.id}: ${cspStage.detail}`);
    failed += 1;
    continue;
  }
  const checks = Array.isArray(control.verify) ? control.verify : [control.verify];
  if (checks.length === 0) {
    console.error(`✗ ${control.id}: verify list must not be empty`);
    failed += 1;
    continue;
  }
  for (const check of checks) {
    const result = await verify(check);
    if (result.ok) console.log(`✓ ${control.id}/${check.method}: ${result.detail}`);
    else if (result.skipped) { console.log(`⤳ ${control.id}/${check.method}: ${result.detail}`); skipped += 1; }
    else { console.error(`✗ ${control.id}/${check.method}: ${result.detail}`); failed += 1; }
  }
}

console.log(`${failed ? "✗" : "✓"} ${manifest.controls.length} control(s), ${failed} failed, ${skipped} manual/live skip(s)`);
process.exit(failed ? 1 : 0);
