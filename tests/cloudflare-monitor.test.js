import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  checkEnvironment,
  classifyDeployRelevantPaths,
  validateBaseline,
} from "../.github/scripts/cloudflare-monitor.mjs";

const baseline = {
  schemaVersion: 1,
  status: "approved-release-baseline",
  release: {
    tag: "v1.8.3",
    tagObject: "a".repeat(40),
    sourceSha: "b".repeat(40),
    sourceShortSha: "bbbbbbb",
  },
  environments: {
    production: {
      worker: "worker-prod",
      hostname: "example.com",
      domainEnvironment: "production",
      deploymentId: "11111111-1111-4111-8111-111111111111",
      versionId: "22222222-2222-4222-8222-222222222222",
      trafficPercentage: 100,
      scriptEtag: "c".repeat(64),
      handlers: ["fetch"],
      bindings: ["ASSETS"],
      observabilityEnabled: true,
    },
    staging: {
      worker: "worker-staging",
      hostname: "staging.example.com",
      domainEnvironment: "production",
      deploymentId: "33333333-3333-4333-8333-333333333333",
      versionId: "44444444-4444-4444-8444-444444444444",
      trafficPercentage: 100,
      scriptEtag: "c".repeat(64),
      handlers: ["fetch"],
      bindings: ["ASSETS"],
      observabilityEnabled: true,
    },
  },
  deployLag: {
    semantics: "approved-release-baseline-with-deploy-relevant-diff",
    nonDeployPathPrefixes: [".checkpoints/", ".github/", "docs/", "tests/"],
    nonDeployPaths: ["CLAUDE.md", "README.md"],
  },
};

function response(result, { ok = true, success = true, status = 200, errors = [] } = {}) {
  return { ok, status, json: async () => ({ success, errors, result }) };
}

function goodFetch() {
  return vi.fn(async (url) => {
    if (url.endsWith("/deployments")) {
      return response({
        deployments: [
          {
            id: baseline.environments.production.deploymentId,
            created_on: "2026-08-29T14:47:30Z",
            versions: [{ version_id: baseline.environments.production.versionId, percentage: 100 }],
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            created_on: "2026-08-20T00:00:00Z",
            versions: [{ version_id: "66666666-6666-4666-8666-666666666666", percentage: 100 }],
          },
        ],
      });
    }
    if (url.includes("/versions/")) {
      return response({
        id: baseline.environments.production.versionId,
        resources: {
          script: { etag: "c".repeat(64), handlers: ["fetch"] },
          bindings: [{ name: "ASSETS", type: "assets" }],
        },
      });
    }
    if (url.includes("/workers/domains?")) {
      return response([{
        hostname: "example.com",
        service: "worker-prod",
        cert_id: "certificate",
      }]);
    }
    if (url.endsWith("/script-settings")) {
      return response({ observability: { enabled: true, logs: { enabled: true, invocation_logs: true } } });
    }
    throw new Error(`unexpected URL: ${url}`);
  });
}

describe("release baseline", () => {
  it("accepts the complete approved schema", () => {
    expect(validateBaseline(structuredClone(baseline))).toMatchObject({ schemaVersion: 1 });
  });

  it("refuses a baseline without exact 100% traffic", () => {
    const candidate = structuredClone(baseline);
    candidate.environments.production.trafficPercentage = 99;
    expect(() => validateBaseline(candidate)).toThrow(/exactly 100/);
  });

  it("refuses a baseline that drops required evidence", () => {
    const candidate = structuredClone(baseline);
    candidate.environments.production.bindings = [];
    expect(() => validateBaseline(candidate)).toThrow(/ASSETS/);
  });
});

describe("control-plane check", () => {
  it("proves deployment, fingerprint, traffic, handler, binding, domain, and logs", async () => {
    const fetchImpl = goodFetch();
    const result = await checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    });
    expect(result).toMatchObject({
      deploymentId: baseline.environments.production.deploymentId,
      versionId: baseline.environments.production.versionId,
      trafficPercentage: 100,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("fails closed when a newer deployment replaced the approved baseline", async () => {
    const fetchImpl = goodFetch();
    fetchImpl.mockImplementationOnce(async () => response({
      deployments: [{
        id: "77777777-7777-4777-8777-777777777777",
        created_on: "2026-08-30T00:00:00Z",
        versions: [{ version_id: "88888888-8888-4888-8888-888888888888", percentage: 100 }],
      }],
    }));
    await expect(checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    })).rejects.toThrow(/does not match baseline/);
  });

  it("fails closed on split traffic", async () => {
    const fetchImpl = goodFetch();
    fetchImpl.mockImplementationOnce(async () => response({
      deployments: [{
        id: baseline.environments.production.deploymentId,
        created_on: "2026-08-29T14:47:30Z",
        versions: [
          { version_id: baseline.environments.production.versionId, percentage: 90 },
          { version_id: "99999999-9999-4999-8999-999999999999", percentage: 10 },
        ],
      }],
    }));
    await expect(checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    })).rejects.toThrow(/traffic is 90/);
  });

  it("fails closed when the custom domain moves to another Worker", async () => {
    const fetchImpl = goodFetch();
    const original = fetchImpl.getMockImplementation();
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(async () => response([{
      hostname: "example.com",
      service: "other-worker",
      environment: "production",
      cert_id: "certificate",
    }]));
    await expect(checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    })).rejects.toThrow(/points to other-worker/);
  });

  it("fails closed when observability is disabled", async () => {
    const fetchImpl = goodFetch();
    const original = fetchImpl.getMockImplementation();
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(async () => response({
      observability: { enabled: false, logs: { enabled: false, invocation_logs: false } },
    }));
    await expect(checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    })).rejects.toThrow(/observability/);
  });

  it("fails closed when automatic invocation logs are disabled", async () => {
    const fetchImpl = goodFetch();
    const original = fetchImpl.getMockImplementation();
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(original);
    fetchImpl.mockImplementationOnce(async () => response({
      observability: { enabled: true, logs: { enabled: true, invocation_logs: false } },
    }));
    await expect(checkEnvironment({
      baseline,
      environmentName: "production",
      accountId: "account",
      apiToken: "token",
      fetchImpl,
      apiBase: "https://api.example.test",
    })).rejects.toThrow(/automatic invocation logs/);
  });

  it("fails closed on API errors without echoing the token", async () => {
    const fetchImpl = vi.fn(async () => response(null, {
      ok: false,
      success: false,
      status: 403,
      errors: [{ message: "forbidden" }],
    }));
    let error;
    try {
      await checkEnvironment({
        baseline,
        environmentName: "production",
        accountId: "account",
        apiToken: "do-not-log",
        fetchImpl,
        apiBase: "https://api.example.test",
      });
    } catch (caught) {
      error = caught;
    }
    expect(error?.message).toMatch(/HTTP 403/);
    expect(error?.message).not.toContain("do-not-log");
  });
});

describe("deploy-relevant diff", () => {
  it("treats the v1.8.3 docs/checkpoint gap and monitor implementation as non-deploying", () => {
    const result = classifyDeployRelevantPaths([
      ".checkpoints/oc-release-ops.checkpoint.json",
      "docs/runbooks/oss-split-execution-handoff.md",
      ".github/workflows/canary.yml",
      "tests/cloudflare-monitor.test.js",
      "CLAUDE.md",
    ], baseline.deployLag);
    expect(result.deployRelevant).toEqual([]);
    expect(result.nonDeploy).toHaveLength(5);
  });

  it("conservatively flags Worker, site, build, dependency, skill, and license changes", () => {
    const result = classifyDeployRelevantPaths([
      "src/index.js",
      "site/src/pages/index.astro",
      "src/removed-runtime-file.js",
      "scripts/build-site.sh",
      "package-lock.json",
      "skills/oc-release-ops/SKILL.md",
      "LICENSE",
      "NOTICE",
    ], baseline.deployLag);
    expect(result.deployRelevant).toHaveLength(8);
    expect(result.nonDeploy).toEqual([]);
  });
});

describe("workflow safety", () => {
  const canary = readFileSync(new URL("../.github/workflows/canary.yml", import.meta.url), "utf8");
  const lag = readFileSync(new URL("../.github/workflows/deploy-lag.yml", import.meta.url), "utf8");

  it("runs both monitors once on every fourth day-of-month at offset times", () => {
    expect(canary).toContain('cron: "47 13 */4 * *"');
    expect(lag).toContain('cron: "17 14 */4 * *"');
  });

  it("does not send curl or wget traffic to either public hostname", () => {
    for (const workflow of [canary, lag]) {
      expect(workflow).not.toMatch(/(?:curl|wget).*https?:\/\/(?:staging\.)?opchain\.dev/i);
    }
  });

  it("never mutates deploy-lag issues from a feature-branch dispatch", () => {
    expect(lag).toContain("if: github.ref == 'refs/heads/main'");
    expect(lag).toContain("if: github.ref != 'refs/heads/main'");
    expect(lag).not.toContain("ref: main");
  });
});
