#!/usr/bin/env node

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASELINE = join(REPO_ROOT, ".github/monitoring/release-baseline.json");
const FULL_SHA = /^[0-9a-f]{40}$/;
const SHORT_SHA = /^[0-9a-f]{7,12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ETAG = /^[0-9a-f]{64}$/;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function validateBaseline(value) {
  invariant(value && typeof value === "object" && !Array.isArray(value), "baseline must be an object");
  invariant(value.schemaVersion === 1, "baseline schemaVersion must be 1");
  invariant(value.status === "approved-release-baseline", "baseline status is not approved-release-baseline");

  const release = value.release;
  invariant(release && typeof release === "object", "baseline.release is required");
  invariant(/^v\d+\.\d+\.\d+$/.test(release.tag), "release.tag must be a full v-prefixed semver");
  invariant(FULL_SHA.test(release.tagObject), "release.tagObject must be a full SHA");
  invariant(FULL_SHA.test(release.sourceSha), "release.sourceSha must be a full SHA");
  invariant(SHORT_SHA.test(release.sourceShortSha), "release.sourceShortSha must be a short SHA");
  invariant(release.sourceSha.startsWith(release.sourceShortSha), "release short SHA must prefix sourceSha");

  // A reviewed post-release hotfix deployed from main. Optional; when present
  // the environments were built from this SHA, not the tagged release, and
  // collectDeployDiff proves it descends from the release and sits on main.
  const runtime = value.runtime;
  if (runtime !== undefined) {
    invariant(runtime && typeof runtime === "object" && !Array.isArray(runtime), "baseline.runtime must be an object when present");
    invariant(FULL_SHA.test(runtime.sha), "runtime.sha must be a full SHA");
    invariant(SHORT_SHA.test(runtime.shortSha), "runtime.shortSha must be a short SHA");
    invariant(runtime.sha.startsWith(runtime.shortSha), "runtime short SHA must prefix runtime.sha");
    invariant(runtime.sha !== release.sourceSha, "runtime.sha restates the release SHA; drop the runtime block instead");
    invariant(isNonEmptyString(runtime.approval), "runtime.approval must name the reviewed approval for this post-release runtime");
  }

  const environments = value.environments;
  invariant(environments && typeof environments === "object", "baseline.environments is required");
  for (const name of ["production", "staging"]) {
    const environment = environments[name];
    invariant(environment && typeof environment === "object", `baseline environment ${name} is required`);
    invariant(isNonEmptyString(environment.worker), `${name}.worker is required`);
    invariant(isNonEmptyString(environment.hostname), `${name}.hostname is required`);
    invariant(isNonEmptyString(environment.domainEnvironment), `${name}.domainEnvironment is required`);
    invariant(UUID.test(environment.deploymentId), `${name}.deploymentId must be a UUID`);
    invariant(UUID.test(environment.versionId), `${name}.versionId must be a UUID`);
    invariant(environment.trafficPercentage === 100, `${name}.trafficPercentage must be exactly 100`);
    invariant(ETAG.test(environment.scriptEtag), `${name}.scriptEtag must be a sha256-style etag`);
    invariant(
      Array.isArray(environment.handlers) && environment.handlers.includes("fetch"),
      `${name}.handlers must include fetch`,
    );
    invariant(
      Array.isArray(environment.bindings) && environment.bindings.includes("ASSETS"),
      `${name}.bindings must include ASSETS`,
    );
    invariant(environment.observabilityEnabled === true, `${name}.observabilityEnabled must be true`);
  }

  const deployLag = value.deployLag;
  invariant(deployLag && typeof deployLag === "object", "baseline.deployLag is required");
  invariant(
    deployLag.semantics === "approved-release-baseline-with-deploy-relevant-diff",
    "deployLag semantics are not approved",
  );
  for (const key of ["nonDeployPathPrefixes", "nonDeployPaths"]) {
    invariant(Array.isArray(deployLag[key]), `deployLag.${key} must be an array`);
    invariant(deployLag[key].every(isNonEmptyString), `deployLag.${key} must contain non-empty paths`);
  }

  return value;
}

export function readBaseline(path = DEFAULT_BASELINE) {
  return validateBaseline(JSON.parse(readFileSync(path, "utf8")));
}

/**
 * The exact commit the recorded environments were built from: the signed
 * release, or — after a reviewed post-release hotfix — the `runtime` block.
 * Every consumer that compares "what is live" against "what was approved"
 * (deploy-diff, deploy.mjs, checkpoint doctor) must use this, not `release`.
 */
export function approvedRuntime(baseline) {
  const { release, runtime } = baseline;
  if (!runtime) {
    return {
      sha: release.sourceSha,
      shortSha: release.sourceShortSha,
      label: `${release.tag} (${release.sourceShortSha})`,
    };
  }
  return {
    sha: runtime.sha,
    shortSha: runtime.shortSha,
    label: `${release.tag} (${release.sourceShortSha}) + approved runtime ${runtime.shortSha}`,
  };
}

function formatApiErrors(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (errors.length === 0) return "Cloudflare API returned an unsuccessful response";
  return errors.map((error) => error?.message || `code ${error?.code ?? "unknown"}`).join("; ");
}

async function apiGet(path, { apiToken, fetchImpl, apiBase }) {
  const response = await fetchImpl(`${apiBase}${path}`, {
    headers: {
      authorization: `Bearer ${apiToken}`,
      accept: "application/json",
      "user-agent": "opchain-control-plane-monitor/1",
    },
  });
  const payload = await response.json().catch(() => null);
  invariant(response.ok, `Cloudflare API ${path} returned HTTP ${response.status}`);
  invariant(payload?.success === true, formatApiErrors(payload));
  return payload.result;
}

function latestDeployment(deployments) {
  return [...deployments].sort((left, right) => {
    return Date.parse(right.created_on || 0) - Date.parse(left.created_on || 0);
  })[0];
}

export async function checkEnvironment({
  baseline,
  environmentName,
  accountId,
  apiToken,
  fetchImpl = globalThis.fetch,
  apiBase = "https://api.cloudflare.com/client/v4",
}) {
  invariant(isNonEmptyString(accountId), "CLOUDFLARE_ACCOUNT_ID is required");
  invariant(isNonEmptyString(apiToken), "CLOUDFLARE_API_TOKEN is required");
  invariant(typeof fetchImpl === "function", "fetch is unavailable");

  const expected = baseline.environments[environmentName];
  invariant(expected, `unknown baseline environment: ${environmentName}`);
  const worker = encodeURIComponent(expected.worker);
  const account = encodeURIComponent(accountId);
  const context = { apiToken, fetchImpl, apiBase };

  const deploymentResult = await apiGet(
    `/accounts/${account}/workers/scripts/${worker}/deployments`,
    context,
  );
  const deployments = deploymentResult?.deployments;
  invariant(Array.isArray(deployments) && deployments.length > 0, `${environmentName}: no deployments returned`);
  const current = latestDeployment(deployments);
  invariant(
    current?.id === expected.deploymentId,
    `${environmentName}: current deployment ${current?.id ?? "missing"} does not match baseline ${expected.deploymentId}`,
  );
  invariant(Array.isArray(current.versions), `${environmentName}: current deployment has no version split`);
  const active = current.versions.find((version) => version.version_id === expected.versionId);
  invariant(active, `${environmentName}: baseline version ${expected.versionId} is not active`);
  invariant(
    Number(active.percentage) === expected.trafficPercentage,
    `${environmentName}: baseline version traffic is ${active.percentage}, expected ${expected.trafficPercentage}`,
  );
  invariant(current.versions.length === 1, `${environmentName}: expected exactly one active version`);
  const totalTraffic = current.versions.reduce((sum, version) => sum + Number(version.percentage || 0), 0);
  invariant(totalTraffic === 100, `${environmentName}: deployment traffic totals ${totalTraffic}, expected 100`);

  const version = await apiGet(
    `/accounts/${account}/workers/scripts/${worker}/versions/${encodeURIComponent(expected.versionId)}`,
    context,
  );
  invariant(version?.id === expected.versionId, `${environmentName}: version detail returned the wrong id`);
  const script = version?.resources?.script;
  invariant(script?.etag === expected.scriptEtag, `${environmentName}: script etag differs from the approved baseline`);
  invariant(Array.isArray(script.handlers), `${environmentName}: version detail has no handlers`);
  for (const handler of expected.handlers) {
    invariant(script.handlers.includes(handler), `${environmentName}: expected handler ${handler} is missing`);
  }
  const bindings = version?.resources?.bindings;
  invariant(Array.isArray(bindings), `${environmentName}: version detail has no bindings`);
  for (const binding of expected.bindings) {
    invariant(
      bindings.some((candidate) => candidate?.name === binding),
      `${environmentName}: expected binding ${binding} is missing`,
    );
  }

  const domains = await apiGet(
    `/accounts/${account}/workers/domains?hostname=${encodeURIComponent(expected.hostname)}&service=${worker}`,
    context,
  );
  invariant(Array.isArray(domains), `${environmentName}: domain list is malformed`);
  const domain = domains.find((candidate) => candidate.hostname === expected.hostname);
  invariant(domain, `${environmentName}: custom domain ${expected.hostname} is missing`);
  invariant(isNonEmptyString(domain.cert_id), `${environmentName}: custom domain ${expected.hostname} has no certificate`);
  invariant(
    domain.service === expected.worker,
    `${environmentName}: ${expected.hostname} points to ${domain.service ?? "nothing"}, expected ${expected.worker}`,
  );
  if (isNonEmptyString(domain.environment)) {
    invariant(
      domain.environment === expected.domainEnvironment,
      `${environmentName}: ${expected.hostname} has environment ${domain.environment}, expected ${expected.domainEnvironment}`,
    );
  }

  const settings = await apiGet(
    `/accounts/${account}/workers/scripts/${worker}/script-settings`,
    context,
  );
  invariant(
    settings?.observability?.enabled === expected.observabilityEnabled,
    `${environmentName}: Worker observability is not enabled`,
  );
  invariant(settings?.observability?.logs?.enabled === true, `${environmentName}: invocation logs are not enabled`);
  invariant(
    settings?.observability?.logs?.invocation_logs === true,
    `${environmentName}: automatic invocation logs are not enabled`,
  );

  return {
    environmentName,
    hostname: expected.hostname,
    worker: expected.worker,
    deploymentId: current.id,
    versionId: active.version_id,
    trafficPercentage: Number(active.percentage),
    scriptEtag: script.etag,
  };
}

export function classifyDeployRelevantPaths(paths, deployLag) {
  const unique = [...new Set(paths.filter(isNonEmptyString))].sort();
  const nonDeploy = [];
  const deployRelevant = [];
  for (const path of unique) {
    const ignored = deployLag.nonDeployPaths.includes(path)
      || deployLag.nonDeployPathPrefixes.some((prefix) => path.startsWith(prefix));
    (ignored ? nonDeploy : deployRelevant).push(path);
  }
  return { deployRelevant, nonDeploy };
}

function git(args) {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  invariant(result.status === 0, `git ${args.join(" ")} failed: ${(result.stderr || "").trim()}`);
  return (result.stdout || "").trim();
}

function isAncestor(run, ancestor, descendant) {
  try {
    run(["merge-base", "--is-ancestor", ancestor, descendant]);
    return true;
  } catch {
    return false;
  }
}

export function collectDeployDiff(baseline, { run = git } = {}) {
  const { tag } = baseline.release;
  const sourceSha = baseline.release.sourceSha;
  run(["cat-file", "-e", `${sourceSha}^{commit}`]);
  const tagRef = `refs/tags/${tag}`;
  const tagObject = run(["rev-parse", tagRef]);
  invariant(tagObject === baseline.release.tagObject, `${tag} tag object differs from the approved baseline`);
  invariant(run(["cat-file", "-t", tagObject]) === "tag", `${tag} is not an annotated tag object`);
  const taggedSha = run(["rev-parse", `${tag}^{commit}`]);
  invariant(taggedSha === sourceSha, `${tag} does not peel to the approved release SHA`);
  run(["rev-parse", "--verify", "origin/main"]);
  invariant(isAncestor(run, sourceSha, "origin/main"), `${tag} (${baseline.release.sourceShortSha}) is not an ancestor of origin/main`);

  // A post-release runtime is only approved as a descendant of the signed
  // release that is itself on the default branch: never a branch preview,
  // never a rewrite of what was tagged.
  const runtime = approvedRuntime(baseline);
  if (baseline.runtime) {
    run(["cat-file", "-e", `${runtime.sha}^{commit}`]);
    invariant(
      isAncestor(run, sourceSha, runtime.sha),
      `approved runtime ${runtime.shortSha} does not descend from ${tag} (${baseline.release.sourceShortSha})`,
    );
    invariant(isAncestor(run, runtime.sha, "origin/main"), `approved runtime ${runtime.shortSha} is not on origin/main`);
  }

  // Do not filter statuses: deleting a runtime/build input is deploy-relevant too.
  const output = run(["diff", "--name-only", `${runtime.sha}..origin/main`]);
  const paths = output ? output.split("\n") : [];
  return { ...classifyDeployRelevantPaths(paths, baseline.deployLag), baseSha: runtime.sha, baseShortSha: runtime.shortSha };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

async function runControlPlane() {
  const baseline = readBaseline(option("--baseline") || DEFAULT_BASELINE);
  const requested = option("--environment") || process.env.MONITOR_ENVIRONMENT || "all";
  invariant(["all", "production", "staging"].includes(requested), `invalid environment: ${requested}`);
  const names = requested === "all" ? ["production", "staging"] : [requested];
  const results = [];
  for (const environmentName of names) {
    const result = await checkEnvironment({
      baseline,
      environmentName,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    });
    results.push(result);
    console.log(
      `\u2713 ${environmentName}: ${result.hostname} -> ${result.worker}; deployment ${result.deploymentId}; `
      + `version ${result.versionId} at ${result.trafficPercentage}%`,
    );
  }
  console.log(`\u2713 control-plane baseline matches ${approvedRuntime(baseline).label}`);
  console.log(
    "Assurance limit: this does not probe custom-domain HTTP responses, latency, assets, dependencies, or /mcp reachability.",
  );
  return results;
}

function runDeployDiff() {
  const baseline = readBaseline(option("--baseline") || DEFAULT_BASELINE);
  const outputPath = option("--output");
  const result = collectDeployDiff(baseline);
  if (outputPath) writeFileSync(outputPath, `${result.deployRelevant.join("\n")}${result.deployRelevant.length ? "\n" : ""}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${result.deployRelevant.length > 0}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `changed_count=${result.deployRelevant.length}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `ignored_count=${result.nonDeploy.length}\n`);
    // baseline_sha is the commit main was diffed against: the runtime when one
    // is approved, otherwise the release. release_sha/runtime_sha split them.
    appendFileSync(process.env.GITHUB_OUTPUT, `baseline_sha=${result.baseSha}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `baseline_tag=${baseline.release.tag}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `release_sha=${baseline.release.sourceSha}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `runtime_sha=${baseline.runtime ? baseline.runtime.sha : ""}\n`);
  }
  console.log(`approved release baseline: ${baseline.release.tag} (${baseline.release.sourceSha})`);
  if (baseline.runtime) {
    console.log(`approved post-release runtime: ${baseline.runtime.sha} — ${baseline.runtime.approval}`);
  }
  console.log(`deploy-relevant paths on origin/main since ${baseline.runtime ? "the approved runtime" : "the release"}: ${result.deployRelevant.length}`);
  for (const path of result.deployRelevant) console.log(`  deploy: ${path}`);
  console.log(`explicitly non-deploying paths on origin/main since baseline: ${result.nonDeploy.length}`);
  for (const path of result.nonDeploy) console.log(`  ignore: ${path}`);
  return result;
}

async function main() {
  const command = process.argv[2];
  if (command === "control-plane") await runControlPlane();
  else if (command === "deploy-diff") runDeployDiff();
  else throw new Error("usage: cloudflare-monitor.mjs <control-plane|deploy-diff> [options]");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}
