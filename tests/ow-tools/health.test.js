// Sprint T: T3 `ow-tools health` (C11–C15), the network rules (C25 c, d) and
// pip-audit's pinned argv (O8). Network checks run against in-process stubs
// injected through health's module parameters; nothing here reaches the
// internet (Test requirements: no live-internet test in CI).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { request as httpRequest } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { cpSync, existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADVISORY_CAP, DEFAULT_THRESHOLDS, cvss3Score, cvss3Severity, health, healthText, pipAuditArgs, rateAdvisory, readHealthConfig, sendable } from "../../plugins/ow-tools/lib/health.mjs";
import { npmAlias, packageSet, parseNpm, parseYarn, readLockfile, specSource, versionSource } from "../../plugins/ow-tools/lib/lockfiles.mjs";
import { attempts as fenceAttempts, installLoopbackFence, uninstallLoopbackFence } from "./loopback-fence.mjs";
import { blockedAddress, createNet } from "../../plugins/ow-tools/lib/net.mjs";
import { digestTree } from "../../plugins/ow-tools/lib/digest.mjs";
import { HAS_OPENSSL, startStubs } from "./health-stubs.mjs";
import { ROOT, cleanup, cli, stub, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
// F-016: every in-process stub run in this file is fenced to loopback, so a
// regression that bypasses the injected connector fails with nothing sent.
beforeAll(installLoopbackFence);
afterAll(() => {
  uninstallLoopbackFence();
  expect(fenceAttempts).toEqual([]);
});
const FIX = join(ROOT, "tests", "fixtures", "ow-tools", "sprint-t");
const FENCE = join(ROOT, "tests", "ow-tools", "fence.mjs");
const NODE_DIR = process.execPath.replace(/\/node$/, "");
const CANARY = "zqcanary";

function workspace({ lock = "npm-v3", config } = {}) {
  const d = join(tempDir(), "care", "harbor-cafe");
  cpSync(join(FIX, "health"), d, { recursive: true });
  const lf = lock.startsWith("npm") ? "package-lock.json" : lock.startsWith("pnpm") ? "pnpm-lock.yaml" : "yarn.lock";
  cpSync(join(FIX, "lockfiles", lock, lf), join(d, "app", lf));
  cpSync(join(FIX, "lockfiles", lock, "package.json"), join(d, "app", "package.json"));
  const backup = write(join(d, "backups", "nightly.sql.gz"), "not opened");
  const yesterday = new Date(Date.now() - 86400000);
  utimesSync(backup, yesterday, yesterday);
  if (config) writeFileSync(join(d, "health.yaml"), config);
  else if (lf !== "package-lock.json") writeFileSync(join(d, "health.yaml"), readFileSync(join(d, "health.yaml"), "utf8").replace("lockfiles: [package-lock.json]", `lockfiles: [${lf}]`));
  return d;
}
const byCheck = (r, check, target) => r.results.find((x) => x.check === check && (target === undefined || x.target === target || x.target.endsWith(target)));

describe("health.yaml strict reader (C11)", SPAWN, () => {
  it("accepts the documented shape", () => {
    const cfg = readHealthConfig(readFileSync(join(FIX, "health", "health.yaml"), "utf8"), "/w");
    expect(cfg).toMatchObject({
      repo: "/w/app",
      registry: "public",
      lockfiles: ["package-lock.json"],
      private_scopes: ["@harbor"],
      hosts: [{ host: "app.example.com", port: 443 }],
      domains: ["example.com"],
      urls: ["https://app.example.com/health", "https://app.example.com/moved"],
      backups: ["/w/backups/nightly.sql.gz"],
      thresholds: DEFAULT_THRESHOLDS,
    });
  });

  it.each([
    ["an unknown key", `schema: 1\nwebhook: ${CANARY}\n`, "webhook"],
    ["an unknown threshold", `schema: 1\nthresholds:\n  speed: ${CANARY}\n`, "thresholds.speed"],
    ["an anchor", `schema: 1\nhosts: &x [${CANARY}.example.com]\n`, "hosts"],
    ["an alias", `schema: 1\nrepo: *${CANARY}\n`, "repo"],
    ["a multi-line value", `schema: 1\nrepo: |\n  ${CANARY}\n`, "repo"],
    ["a URL with userinfo", `schema: 1\nurls: [https://user:${CANARY}@app.example.com/]\n`, "urls"],
    ["a URL with only a user", `schema: 1\nurls:\n  - https://${CANARY}@app.example.com/\n`, "urls"],
    ["a non-https URL", `schema: 1\nurls: [http://app.example.com/${CANARY}]\n`, "urls"],
    ["a URL with a query string", `schema: 1\nurls: [https://app.example.com/?token=${CANARY}]\n`, "urls"],
    ["an IP address as a host", `schema: 1\nhosts: [10.0.0.1]\n`, "hosts"],
    ["localhost", `schema: 1\nhosts: [localhost]\n`, "hosts"],
    ["a bad threshold", `schema: 1\nthresholds: { cert_days: ${CANARY} }\n`, "thresholds.cert_days"],
    ["a registry other than public", `schema: 1\nregistry: ${CANARY}\n`, "registry"],
  ])("refuses %s, naming the key and never the value (exit 4)", (_, yaml, key) => {
    const d = tempDir();
    const f = write(join(d, "health.yaml"), yaml);
    const r = cli(["health", "--config", f, "--json"]);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json).toMatchObject({ reason: "config-invalid", key });
    expect(r.stdout + r.stderr).not.toContain(CANARY);
    expect(r.stdout).not.toContain("10.0.0.1");
  });
});

describe.skipIf(!HAS_OPENSSL)("ow-tools health against stub services (C12–C14)", SPAWN, () => {
  async function run(d, opts = {}) {
    const stubs = await startStubs(tempDir(), opts);
    try {
      const r = await health({ config: join(d, "health.yaml"), noNetwork: false }, stubs.deps);
      return { r, stubs };
    } finally {
      await stubs.close();
    }
  }

  it("C12: every check is OK, attention or not checked; the default thresholds apply (O10)", async () => {
    const d = workspace();
    const { r } = await run(d);
    for (const x of r.results) expect(["OK", "attention", "not checked"]).toContain(x.result);
    for (const x of r.results.filter((y) => y.result === "not checked")) expect(x.reason).toBeTruthy();
    expect(byCheck(r, "tls", "app.example.com")).toMatchObject({ result: "attention" }); // 20 days ≤ 30
    expect(byCheck(r, "tls", "app.example.com").detail).toMatch(/\((19|20) days\)/);
    expect(byCheck(r, "advisories", "lodash@4.17.21")).toMatchObject({ result: "attention", detail: "GHSA-test-0001 (high)" });
    expect(byCheck(r, "advisories", "left-pad@1.3.0")).toMatchObject({ result: "OK" }); // low: listed, below the threshold
    expect(byCheck(r, "advisories", "left-pad@1.3.0").detail).toMatch(/listed below the threshold: GHSA-test-0002 \(low\)/);
    expect(byCheck(r, "outdated", "left-pad")).toMatchObject({ result: "attention", detail: "1.3.0 installed, 2.0.0 latest" });
    expect(byCheck(r, "outdated", "lodash")).toMatchObject({ result: "OK" });
    expect(byCheck(r, "outdated", "internal-lib")).toMatchObject({ result: "not checked", reason: "not a public-registry package" });
    expect(byCheck(r, "domain", "example.com")).toMatchObject({ result: "OK" });
    expect(byCheck(r, "http", "https://app.example.com/health")).toMatchObject({ result: "OK", detail: "HTTP 200" });
    expect(byCheck(r, "backup")).toMatchObject({ result: "OK" });
  });

  it("C12: a threshold in health.yaml overrides the default", async () => {
    const d = workspace();
    writeFileSync(join(d, "health.yaml"), readFileSync(join(d, "health.yaml"), "utf8").replace("cert_days: 30", "cert_days: 10"));
    const { r } = await run(d);
    expect(byCheck(r, "tls", "app.example.com").result).toBe("OK");
  });

  it("C12: one unreachable host doesn't fail the run; a missing lockfile is not checked (no lockfile)", async () => {
    const d = workspace({ config: "schema: 1\nrepo: app-without-lockfile\nhosts: [down.example.com, app.example.com]\n" });
    mkdirSync(join(d, "app-without-lockfile"));
    const { r } = await run(d);
    expect(r.status).toBe("done");
    expect(byCheck(r, "tls", "down.example.com")).toMatchObject({ result: "not checked", reason: "unreachable" });
    expect(byCheck(r, "tls", "app.example.com").result).toBe("attention");
    expect(byCheck(r, "advisories", "repo")).toMatchObject({ result: "not checked", reason: "no lockfile" });
  });

  it("C12: domain expiry over RDAP, with the IANA list cached in the data folder for 30 days", async () => {
    const d = workspace({ config: "schema: 1\ndomains: [example.com, soon.com, example.net, nowhere.zz]\n" });
    const stubs = await startStubs(tempDir());
    try {
      const r = await health({ config: join(d, "health.yaml") }, stubs.deps);
      expect(byCheck(r, "domain", "example.com").result).toBe("OK");
      expect(byCheck(r, "domain", "soon.com")).toMatchObject({ result: "attention" });
      expect(byCheck(r, "domain", "nowhere.zz")).toMatchObject({ result: "not checked", reason: "no RDAP server for this domain's ending" });
      expect(stubs.requests.filter((q) => q.host === "rdap.example.test").every((q) => q.path.startsWith("/domain/"))).toBe(true); // the https base, never the http one
      expect(existsSync(join(stubs.deps.env.OW_TOOLS_HOME, "rdap", "dns.json"))).toBe(true);
      const before = stubs.requests.filter((q) => q.host === "data.iana.org").length;
      await health({ config: join(d, "health.yaml") }, stubs.deps);
      expect(stubs.requests.filter((q) => q.host === "data.iana.org").length).toBe(before);
    } finally {
      await stubs.close();
    }
  });

  it("C14: read-only — GET to listed URLs, POST only to the advisory API, no redirect followed, no cookie or auth header, no write in the repository", async () => {
    const d = workspace();
    const before = digestTree(d).sha256;
    const { r, stubs } = await run(d);
    expect(digestTree(d).sha256).toBe(before);
    for (const q of stubs.requests) {
      if (q.method === "POST") expect(`${q.host}${q.path}`).toBe("api.osv.dev/v1/querybatch");
      else expect(q.method).toBe("GET");
      expect(Object.keys(q.headers).sort()).toEqual(q.method === "POST" ? ["accept", "connection", "content-length", "content-type", "host", "user-agent"] : ["accept", "connection", "host", "user-agent"]);
      expect(q.headers["user-agent"]).toMatch(/^ow-tools\/\d+\.\d+\.\d+ \(health; read-only\)$/);
    }
    expect(stubs.requests.filter((q) => q.path === "/moved")).toHaveLength(1);
    // Every request went through the injected connector to the checked address
    // (a regression here once let Node resolve and connect by itself).
    expect(stubs.connectorCalls.length).toBe(stubs.requests.length + 1); // + the TLS check
    for (const q of stubs.requests) expect(stubs.connectorCalls.some((c) => c.servername === q.host && c.address === "203.0.113.10"), q.host).toBe(true);
    expect(stubs.resolverCalls).not.toContain("elsewhere.example.org");
    expect(byCheck(r, "http", "https://app.example.com/moved")).toMatchObject({ result: "attention", detail: "HTTP 301, redirects to elsewhere.example.org; not followed" });
  });

  it("C13: the same project in seven lockfile forms parses to one package set", () => {
    const sets = ["npm-v1", "npm-v2", "npm-v3", "pnpm-v6", "pnpm-v9", "yarn-v1", "yarn-berry"].map((k) => {
      const f = k.startsWith("npm") ? "package-lock.json" : k.startsWith("pnpm") ? "pnpm-lock.yaml" : "yarn.lock";
      return packageSet(readLockfile(join(FIX, "lockfiles", k, f)).packages).map((p) => `${p.name}@${p.version}`);
    });
    for (const s of sets) expect(s).toEqual(["@babel/code-frame@7.12.13", "internal-lib@1.0.0", "left-pad@1.3.0", "lodash@4.17.21"]);
  });

  it.each([["npm-v3", true], ["yarn-v1", true], ["pnpm-v9", true], ["yarn-berry", true], ["pnpm-v6", false]])(
    "C13: only public-registry packages are sent (%s, registry: public %s); private ones are not checked (private registry)",
    async (lock, declared) => {
      const d = workspace({ lock });
      if (!declared) writeFileSync(join(d, "health.yaml"), readFileSync(join(d, "health.yaml"), "utf8").replace("registry: public\n", ""));
      const { r, stubs } = await run(d);
      const sent = stubs.requests.map((q) => `${q.path} ${q.body}`).join("\n");
      expect(sent).not.toContain("internal-lib");
      expect(byCheck(r, "advisories", "internal-lib@1.0.0")).toMatchObject({ result: "not checked", reason: "private registry" });
      const batch = stubs.requests.find((q) => q.path === "/v1/querybatch");
      if (lock.startsWith("pnpm") && !declared) {
        expect(batch).toBeUndefined();
        expect(byCheck(r, "advisories", "lodash@4.17.21").reason).toMatch(/^registry not recorded in the lockfile/);
      } else {
        expect(JSON.parse(batch.body)).toEqual({ queries: ["@babel/code-frame@7.12.13", "left-pad@1.3.0", "lodash@4.17.21"].map((s) => ({ package: { name: s.slice(0, s.lastIndexOf("@")), ecosystem: "npm" }, version: s.slice(s.lastIndexOf("@") + 1) })) });
      }
    },
  );

  it("C13: a private scope is never sent, whatever the lockfile says", () => {
    const pkgs = [{ name: "@harbor/ui", version: "1.0.0", source: "public" }, { name: "lodash", version: "4.17.21", source: "public" }];
    const { send, held } = sendable(pkgs, { private_scopes: ["@harbor"], registry: null });
    expect(send.map((p) => p.name)).toEqual(["lodash"]);
    expect(held[0]).toMatchObject({ name: "@harbor/ui", why: "private scope" });
  });

  it("C25 (d): loopback, private, link-local, CGNAT and metadata answers are refused at connect time", async () => {
    const plants = { "app.example.com": ["127.0.0.1"], "data.iana.org": ["10.0.0.5"], "api.osv.dev": ["169.254.169.254"], "registry.npmjs.org": ["100.64.0.1"] };
    const d = workspace({ config: "schema: 1\nhosts: [app.example.com]\nurls: [https://app.example.com/health]\ndomains: [example.com]\n" });
    const { r, stubs } = await run(d, { addresses: plants });
    expect(byCheck(r, "tls").reason).toBe("address-not-allowed");
    expect(byCheck(r, "http").reason).toBe("address-not-allowed");
    expect(byCheck(r, "domain").reason).toBe("address-not-allowed");
    expect(stubs.connectorCalls).toEqual([]);
    for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fe80::1", "fd00:ec2::254", "fc00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "2002:a00:1::", "224.0.0.1", "not-an-ip"]) {
      expect(blockedAddress(a), a).toBe(true);
    }
    for (const a of ["192.0.2.5", "192.0.0.8", "198.18.0.1"]) expect(blockedAddress(a), a).toBe(true);
    for (const a of ["203.0.113.10", "8.8.8.8", "192.0.43.10", "2606:4700::1111"]) expect(blockedAddress(a), a).toBe(false);
  });

  it("net.mjs refuses what the rules forbid before any socket", async () => {
    const stubs = await startStubs(tempDir());
    const net = createNet({ hosts: ["app.example.com"], ...stubs.deps });
    const reason = (p) => p.then(() => "sent", (e) => e.reason);
    try {
      expect(await reason(net.request("https://app.example.com/health", { method: "POST", body: "{}" }))).toBe("method-not-allowed");
      expect(await reason(net.request("https://app.example.com/health", { method: "PUT" }))).toBe("method-not-allowed");
      expect(await reason(net.request("http://app.example.com/health"))).toBe("not-https");
      expect(await reason(net.request("https://u:p@app.example.com/"))).toBe("userinfo");
      expect(await reason(net.request("https://other.example.com/"))).toBe("not-a-destination");
      expect(await reason(net.certificate("203.0.113.10"))).toBe("not-a-destination");
      expect(await reason(net.request("https://app.example.com/big"))).toBe("too-large");
      expect(stubs.requests.filter((q) => q.method !== "GET")).toEqual([]);
    } finally {
      await stubs.close();
    }
  });

  it("C14: never reads .npmrc, .pypirc, .netrc or a keychain, even with all of them planted", () => {
    const d = workspace();
    const home = tempDir();
    for (const f of [".npmrc", ".pypirc", ".netrc"]) {
      write(join(home, f), `//registry.npmjs.org/:_authToken=${CANARY}\n`);
      write(join(d, "app", f), `token=${CANARY}\n`);
    }
    const bin = join(tempDir(), "bin");
    mkdirSync(bin);
    const touched = join(bin, "security-was-called");
    stub(bin, "security", `touch "${touched}"`);
    const log = join(tempDir(), "fence.log");
    const r = spawnSync(process.execPath, ["--import", FENCE, join(ROOT, "tests", "ow-tools", "health-child.mjs"), tempDir(), join(d, "health.yaml")], {
      encoding: "utf8",
      env: { ...process.env, HOME: home, PATH: `${bin}:${NODE_DIR}:/usr/bin:/bin`, OW_FENCE_LOG: log, OW_FENCE_FS: "1", OW_FENCE_NET: "loopback" },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).summary.attention).toBeGreaterThan(0);
    const reads = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.kind === "fs.read").map((x) => x.target);
    expect(reads.some((p) => p.endsWith("package-lock.json"))).toBe(true); // the spy works
    for (const p of reads) expect(p, p).not.toMatch(/\.(npmrc|pypirc|netrc)$|keychain/i);
    expect(existsSync(touched)).toBe(false);
  });
});

describe("ow-tools health under --no-network and the fence (C15, C25 c)", SPAWN, () => {
  const fenced = (args, extra = {}) => {
    const log = join(tempDir(), "fence.log");
    writeFileSync(log, "");
    const r = cli(args, { env: { NODE_OPTIONS: `--import ${FENCE}`, OW_FENCE_LOG: log, ...extra } });
    const attempts = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return { ...r, attempts };
  };

  it("C15: --no-network does lockfile parsing and backup age only, with zero socket attempts", () => {
    const d = workspace();
    const r = fenced(["health", "--config", join(d, "health.yaml"), "--no-network", "--json"], { OW_TOOLS_HOME: join(tempDir(), "home") });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.attempts).toEqual([]);
    expect(r.json.network).toBe("off");
    for (const c of ["tls", "domain", "http", "outdated", "python-advisories"]) {
      for (const x of r.json.results.filter((y) => y.check === c)) expect(x.reason, c).toBe("network off");
    }
    expect(byCheck(r.json, "advisories")).toMatchObject({ reason: "network off", detail: "4 packages read: 3 would be sent, 1 held back" });
    expect(byCheck(r.json, "backup").result).toBe("OK");
    expect(r.json.requests).toEqual([]);
  });

  it("C25 (c): with the network on, the only names looked up are the fixed destinations and the listed hosts", () => {
    const d = workspace();
    const r = fenced(["health", "--config", join(d, "health.yaml"), "--json"], { OW_TOOLS_HOME: join(tempDir(), "home") });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.attempts.length).toBeGreaterThan(0);
    const allowed = new Set(["api.osv.dev", "registry.npmjs.org", "data.iana.org", "app.example.com"]);
    for (const a of r.attempts) {
      expect(a.kind, JSON.stringify(a)).toBe("dns.lookup");
      expect(allowed.has(a.target), a.target).toBe(true);
    }
    expect(r.json.results.filter((x) => x.result !== "not checked").map((x) => x.check).sort()).toEqual(["backup"]);
  });
});

describe("pip-audit (O8): no-install mode only, argv pinned", SPAWN, () => {
  it("pins the argv: -r with --disable-pip and --no-deps, never the installing mode", () => {
    // OD-7: pinned to OSV, so Python names go to a destination already on the list.
    expect(pipAuditArgs("/w/requirements.txt")).toEqual(["-r", "/w/requirements.txt", "--disable-pip", "--no-deps", "--vulnerability-service", "osv", "--format", "json", "--progress-spinner", "off"]);
  });

  async function withStub(requirements) {
    const d = workspace({ config: "schema: 1\npython: app/requirements.txt\n" });
    if (requirements !== undefined) writeFileSync(join(d, "app", "requirements.txt"), requirements);
    const bin = join(tempDir(), "bin");
    mkdirSync(bin);
    const argvLog = join(bin, "argv.txt");
    stub(bin, "pip-audit", `printf '%s\\n' "$@" > "${argvLog}"; echo "NETRC=$NETRC PIP_CONFIG_FILE=$PIP_CONFIG_FILE" >> "${argvLog}"\necho '{"dependencies":[{"name":"requests","version":"2.31.0","vulns":[{"id":"PYSEC-0000-1"}]},{"name":"idna","version":"3.6","vulns":[]}]}'; exit 1`);
    const old = process.env.PATH;
    process.env.PATH = `${bin}:${old}`;
    try {
      const r = await health({ config: join(d, "health.yaml") }, { env: { ...process.env, OW_TOOLS_HOME: join(tempDir(), "home") } });
      return { r, argv: existsSync(argvLog) ? readFileSync(argvLog, "utf8").trim().split("\n") : null };
    } finally {
      process.env.PATH = old;
    }
  }

  it("runs the stub with exactly that argv and no .netrc or pip config, and reports its findings", async () => {
    const { r, argv } = await withStub();
    expect(argv.slice(0, -1)).toEqual(pipAuditArgs(argv[1]));
    expect(argv.at(-1)).toBe("NETRC=/dev/null PIP_CONFIG_FILE=/dev/null");
    expect(byCheck(r, "python-advisories")).toMatchObject({ result: "attention", target: "python requirements: requests@2.31.0", detail: "PYSEC-0000-1" });
  });

  it("does not run pip-audit at all on an unpinned requirements file", async () => {
    const { r, argv } = await withStub("requests>=2\n");
    expect(argv).toBeNull();
    expect(byCheck(r, "python-advisories").reason).toMatch(/not fully pinned/);
  });
});

// ---- Sprint T round 2 -------------------------------------------------------------
// Each block names the evaluator plant (H-, eval-round-1) or review finding
// (SA-/F-) it pins, so none of them can be reintroduced without a failure.

const lockfileOf = (form) => (form.startsWith("npm") ? "package-lock.json" : form.startsWith("pnpm") ? "pnpm-lock.yaml" : "yarn.lock");

// Remove the registry URL lodash resolved from, in whatever form the lockfile
// records it, so its source becomes "unrecorded" in every form.
function unrecordLodash(form, text) {
  if (form.startsWith("npm")) {
    const j = JSON.parse(text);
    if (j.packages) delete j.packages["node_modules/lodash"].resolved;
    if (j.dependencies) delete j.dependencies.lodash.resolved;
    return JSON.stringify(j, null, 2);
  }
  if (form === "yarn-v1") return text.replace(/(lodash@\^4\.17\.21:\n {2}version "4\.17\.21"\n) {2}resolved "[^"]+"\n/, "$1");
  return text; // pnpm and yarn berry never record it
}

describe.skipIf(!HAS_OPENSSL)("round 2: what leaves the machine (Bug 1, H17, H18, SA-014)", SPAWN, () => {
  async function runWith(d) {
    const stubs = await startStubs(tempDir());
    try {
      const r = await health({ config: join(d, "health.yaml") }, stubs.deps);
      return { r, stubs, sent: stubs.requests.map((q) => `${q.method} ${q.host}${q.path} ${q.body}`).join("\n") };
    } finally {
      await stubs.close();
    }
  }

  it("Bug 1: an npm v1 git or tarball dependency is never sent, even under registry: public", async () => {
    const d = workspace({ lock: "npm-v1" });
    const lock = JSON.parse(readFileSync(join(d, "app", "package-lock.json"), "utf8"));
    lock.dependencies["acme-core"] = { version: "git+ssh://git@github.example/acme-client/acme-core.git#0123456789abcdef", from: "git+ssh://git@github.example/acme-client/acme-core.git" };
    lock.dependencies["acme-ui"] = { version: "https://npm.acme-client.internal/acme-ui/-/acme-ui-2.0.0.tgz" };
    lock.dependencies["acme-alias"] = { version: "npm:left-pad@1.3.0" };
    lock.dependencies["acme-local"] = { version: "file:../acme-local" };
    writeFileSync(join(d, "app", "package-lock.json"), JSON.stringify(lock));
    const pkg = JSON.parse(readFileSync(join(d, "app", "package.json"), "utf8"));
    Object.assign(pkg.dependencies, { "acme-core": "github:acme-client/acme-core", "acme-ui": "https://npm.acme-client.internal/acme-ui/-/acme-ui-2.0.0.tgz" });
    writeFileSync(join(d, "app", "package.json"), JSON.stringify(pkg));
    expect(readFileSync(join(d, "health.yaml"), "utf8")).toMatch(/^registry: public$/m);
    const { r, sent } = await runWith(d);
    expect(sent).not.toMatch(/acme|git\+ssh|npm\.acme-client|github\.example|file:/);
    for (const n of ["acme-core", "acme-ui"]) {
      expect(r.results.find((x) => x.check === "advisories" && x.target.includes(`: ${n}@`)), n).toMatchObject({ result: "not checked", reason: "private registry" });
    }
    // Round 3 (Bug 3): the alias is checked as the package it names.
    expect(r.results.some((x) => x.target.includes("acme-alias"))).toBe(false);
    expect(sent).toContain('{"package":{"name":"left-pad","ecosystem":"npm"},"version":"1.3.0"}');
    expect(byCheck(r, "outdated", "acme-core")).toMatchObject({ result: "not checked" });
    // The same file under --no-network says what would and wouldn't be sent.
    const off = await health({ config: join(d, "health.yaml"), noNetwork: true }, { env: { ...process.env, OW_TOOLS_HOME: join(tempDir(), "h") } });
    // Round 3 (Bug 3): acme-alias is left-pad@1.3.0, already in the lockfile.
    expect(byCheck(off, "advisories").detail).toBe("6 packages read: 3 would be sent, 3 held back");
  });

  it("Bug 1 / OD-1: a version that isn't plain semver is held in every source state", () => {
    const cfg = { private_scopes: [], registry: "public" };
    for (const version of ["git+https://git.example/x.git#abc", "github:acme/x", "https://h.example/x-1.0.0.tgz", "npm:other@1.0.0", "file:../x", "acme/x", "1.0", "latest"]) {
      for (const source of ["public", "unrecorded", "private", "local"]) {
        expect(sendable([{ name: "x", version, source }], cfg).send, `${version} ${source}`).toEqual([]);
      }
    }
    expect(versionSource("git+ssh://git@h/x.git")).toBe("private");
    // Each shape by itself (R01): no other layer may be what holds them.
    const shapes = ["git+https://git.example/x.git#abc", "github:acme/x", "gitlab:acme/x", "bitbucket:acme/x", "https://h.example/x-1.0.0.tgz", "npm:other@1.0.0", "acme/x", "1.0", "latest", "v1.0.0", "*"];
    expect(shapes.map(versionSource)).toEqual(shapes.map(() => "private"));
    // An npm v1 entry has no key spec, so its version alone decides.
    expect(parseNpm({ lockfileVersion: 1, dependencies: { g: { version: "github:acme/g#abc", resolved: "https://registry.npmjs.org/g/-/g-1.0.0.tgz" } } })[0].source).toBe("private");
    // The parsers apply it themselves, before sendable's backstop sees anything.
    const v1 = { lockfileVersion: 1, dependencies: { a: { version: "git+ssh://git@h/a.git#1" }, b: { version: "https://h.example/b-1.0.0.tgz" }, c: { version: "1.0.0" } } };
    expect(parseNpm(v1).map((x) => `${x.name}:${x.source}`)).toEqual(["a:private", "b:private", "c:unrecorded"]);
    expect(parseYarn('"d@github:acme/d":\n  version "github:acme/d#abc"\n').packages.map((x) => x.source)).toEqual(["private"]);
    expect(versionSource("file:../x")).toBe("local");
    expect(versionSource("1.2.3-beta.1+build.7")).toBe(null);
  });

  it.each(["npm-v1", "npm-v2", "npm-v3", "pnpm-v6", "pnpm-v9", "yarn-v1", "yarn-berry"])(
    "H17 / H18: in %s, a package whose registry isn't recorded is sent only under registry: public",
    async (form) => {
      for (const declared of [false, true]) {
        const d = workspace({ lock: form });
        const f = join(d, "app", lockfileOf(form));
        writeFileSync(f, unrecordLodash(form, readFileSync(f, "utf8")));
        if (!declared) writeFileSync(join(d, "health.yaml"), readFileSync(join(d, "health.yaml"), "utf8").replace("registry: public\n", ""));
        const { r, stubs } = await runWith(d);
        const batch = stubs.requests.find((q) => q.path === "/v1/querybatch");
        const names = batch ? JSON.parse(batch.body).queries.map((q) => q.package.name) : [];
        expect(names.includes("lodash"), `${form} declared=${declared}`).toBe(declared);
        expect(stubs.requests.some((q) => q.path === "/lodash/latest"), `${form} npm declared=${declared}`).toBe(declared);
        if (!declared) expect(byCheck(r, "advisories", "lodash@4.17.21").reason).toMatch(/^registry not recorded in the lockfile/);
      }
    },
  );

  it("SA-014: the project's own npm scope is held back without being listed", async () => {
    const d = workspace({ lock: "npm-v3" });
    const lock = JSON.parse(readFileSync(join(d, "app", "package-lock.json"), "utf8"));
    lock.packages["node_modules/@harbor-co/ui"] = { version: "1.0.0", resolved: "https://registry.npmjs.org/@harbor-co/ui/-/ui-1.0.0.tgz" };
    writeFileSync(join(d, "app", "package-lock.json"), JSON.stringify(lock));
    const pkg = JSON.parse(readFileSync(join(d, "app", "package.json"), "utf8"));
    pkg.name = "@harbor-co/app";
    pkg.dependencies["@harbor-co/ui"] = "^1.0.0";
    writeFileSync(join(d, "app", "package.json"), JSON.stringify(pkg));
    const { r, sent } = await runWith(d);
    expect(sent).not.toContain("@harbor-co");
    expect(byCheck(r, "advisories", "@harbor-co/ui@1.0.0")).toMatchObject({ result: "not checked", reason: "private scope" });
    expect(sendable([{ name: "@harbor-co/ui", version: "1.0.0", source: "public" }], { private_scopes: [], ownScope: "@harbor-co" }).held[0].why).toBe("private scope");
  });
});

describe.skipIf(!HAS_OPENSSL)("round 2: advisories that can't be rated are never OK (SA-012 / F-013)", SPAWN, () => {
  const osv = (vulnsFor, details) => ({
    "api.osv.dev": (req, body) => {
      if (req.method === "POST") return { status: 200, json: { results: JSON.parse(body).queries.map((q) => ({ vulns: (vulnsFor[q.package.name] || []).map((id) => ({ id })) })) } };
      const id = decodeURIComponent(req.url.replace("/v1/vulns/", ""));
      return details(id);
    },
  });
  async function rows(routes) {
    const d = workspace();
    const stubs = await startStubs(tempDir(), { routes });
    try {
      return await health({ config: join(d, "health.yaml") }, stubs.deps);
    } finally {
      await stubs.close();
    }
  }

  it("a MAL- entry is critical; a CVSS-only advisory is rated from its vector; a failed detail fetch is attention", async () => {
    const r = await rows(osv({ lodash: ["MAL-2026-0001"], "left-pad": ["GHSA-cvss-only"], "@babel/code-frame": ["GHSA-gone"] }, (id) => {
      if (id === "MAL-2026-0001") return { status: 200, json: { id, summary: "Malicious code", database_specific: { "malicious-packages-origins": [{ source: "ossf" }] } } };
      if (id === "GHSA-cvss-only") return { status: 200, json: { id, severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N" }] } }; // 8.1
      return { status: 503, json: {} };
    }));
    expect(byCheck(r, "advisories", "lodash@4.17.21")).toMatchObject({ result: "attention", detail: "MAL-2026-0001 (critical)" });
    expect(byCheck(r, "advisories", "left-pad@1.3.0")).toMatchObject({ result: "attention", detail: "GHSA-cvss-only (high)" });
    expect(byCheck(r, "advisories", "@babel/code-frame@7.12.13")).toMatchObject({ result: "attention" });
    expect(byCheck(r, "advisories", "@babel/code-frame@7.12.13").detail).toMatch(/unknown \(detail not fetched\).*severity not available/);
  });

  it("an advisory with no severity at all is attention, not 'listed below the threshold'", async () => {
    const r = await rows(osv({ lodash: ["GHSA-bare"] }, (id) => ({ status: 200, json: { id } })));
    expect(byCheck(r, "advisories", "lodash@4.17.21")).toMatchObject({ result: "attention" });
    expect(byCheck(r, "advisories", "lodash@4.17.21").detail).toMatch(/GHSA-bare \(unknown\); severity not available/);
  });

  it("ids past the 200th are not rated, and that makes the package attention", async () => {
    expect(ADVISORY_CAP).toBe(200);
    const ids = Array.from({ length: 201 }, (_, k) => `GHSA-low-${String(k).padStart(3, "0")}`);
    const r = await rows(osv({ lodash: ids }, (id) => ({ status: 200, json: { id, database_specific: { severity: "LOW" } } })));
    const row = byCheck(r, "advisories", "lodash@4.17.21");
    expect(row.result).toBe("attention");
    expect(row.detail).toContain("GHSA-low-200 (not rated (more than 200 advisories))");
    expect(row.advisories.filter((a) => a.severity === "low")).toHaveLength(200);
  });

  it("rates CVSS 3 vectors to the published bands", () => {
    expect(cvss3Severity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")).toBe("critical"); // 9.8
    expect(cvss3Severity("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N")).toBe("critical"); // 9.1
    expect(cvss3Severity("CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N")).toBe("high"); // 8.1
    expect(cvss3Severity("CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N")).toBe("moderate"); // 6.1
    expect(cvss3Severity("CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N")).toBe("low"); // 1.6
    expect(cvss3Severity("CVSS:4.0/AV:N")).toBe(null);
    expect(rateAdvisory({ id: "GHSA-x", database_specific: { severity: "MEDIUM" } })).toBe("moderate");
  });
});

describe.skipIf(!HAS_OPENSSL)("round 2: the network rules' variants (H03, H09, H10, H15)", SPAWN, () => {
  async function run(config, opts = {}) {
    const d = workspace({ config });
    const stubs = await startStubs(tempDir(), opts);
    try {
      const r = await health({ config: join(d, "health.yaml") }, stubs.deps);
      return { r, stubs };
    } finally {
      await stubs.close();
    }
  }

  it("H03: a redirect to the same host is reported, not followed", async () => {
    const { r, stubs } = await run("schema: 1\nurls: [https://app.example.com/same]\n");
    expect(byCheck(r, "http")).toMatchObject({ result: "attention", detail: "HTTP 302, redirects to app.example.com; not followed" });
    expect(stubs.requests.map((q) => q.path)).toEqual(["/same"]);
  });

  it.each([
    [["203.0.113.10", "10.0.0.5"]],
    [["10.0.0.5", "203.0.113.10"]],
    [["203.0.113.10", "::1"]],
    [["2606:4700::1111", "fd00:ec2::254"]],
  ])("H10: a DNS answer %j with any blocked address is refused, and nothing connects", async (answer) => {
    const { r, stubs } = await run("schema: 1\nhosts: [app.example.com]\nurls: [https://app.example.com/health]\n", { addresses: { "app.example.com": answer } });
    expect(byCheck(r, "tls").reason).toBe("address-not-allowed");
    expect(byCheck(r, "http").reason).toBe("address-not-allowed");
    expect(stubs.connectorCalls).toEqual([]);
  });

  it("H09: with several public answers, the socket goes to the address that was checked first", async () => {
    const { stubs } = await run("schema: 1\nhosts: [app.example.com]\nurls: [https://app.example.com/health]\n", { addresses: { "app.example.com": ["203.0.113.10", "203.0.113.11", "203.0.113.12"] } });
    expect(stubs.connectorCalls.length).toBe(2);
    for (const c of stubs.connectorCalls) expect(c.address).toBe("203.0.113.10");
  });

  it("H15: a certificate or a domain exactly 30 days from expiry is attention (the threshold is ≤ 30)", async () => {
    const stubsForDate = await startStubs(tempDir());
    const validTo = Date.parse(new X509Certificate(stubsForDate.certs.short).validTo);
    await stubsForDate.close();
    const old = process.env.OW_TOOLS_NOW;
    process.env.OW_TOOLS_NOW = new Date(validTo - 30 * 86400000 - 3600000).toISOString(); // 30 days and an hour before expiry
    try {
      const now = Date.parse(process.env.OW_TOOLS_NOW);
      const { r } = await run("schema: 1\nhosts: [app.example.com]\ndomains: [edge.com]\n", { now });
      expect(byCheck(r, "tls")).toMatchObject({ result: "attention" });
      expect(byCheck(r, "tls").detail).toMatch(/\(30 days\)$/);
      expect(byCheck(r, "domain")).toMatchObject({ result: "attention" });
      expect(byCheck(r, "domain").detail).toMatch(/\(30 days\)$/);
    } finally {
      if (old === undefined) delete process.env.OW_TOOLS_NOW;
      else process.env.OW_TOOLS_NOW = old;
    }
  });

  it("F-016: Node fires a request's 'socket' event before it writes a byte, which is where net.mjs checks the socket", async () => {
    let bytes = 0;
    const srv = createTcpServer((s) => s.on("data", (b) => (bytes += b.length)));
    await new Promise((res) => srv.listen(0, "127.0.0.1", res));
    const req = httpRequest({ host: "127.0.0.1", port: srv.address().port, method: "POST", path: "/x", agent: false, headers: { "content-length": "5" } });
    req.on("socket", () => req.destroy(new Error("stop")));
    req.on("error", () => {});
    req.end("hello");
    await new Promise((res) => setTimeout(res, 200));
    srv.close();
    expect(bytes).toBe(0);
    expect(readFileSync(join(ROOT, "plugins", "ow-tools", "lib", "net.mjs"), "utf8")).toMatch(/req\.on\("socket", \(sock\) => \{\n\s+if \(sock\?\.\[CHECKED\] !== address\) req\.destroy/);
  });
});

describe("round 2: health's text output (Bug 14)", () => {
  it("prints the result in one column and the reason in the detail column", () => {
    const text = healthText({ summary: { ok: 1, attention: 0, not_checked: 1 }, network: "off", note: "n", results: [{ check: "tls", target: "app.example.com", result: "not checked", reason: "network off" }, { check: "advisories", target: "package-lock.json", result: "not checked", reason: "network off", detail: "4 packages read" }] });
    expect(text).not.toMatch(/not checked \(/);
    expect(text).toContain("not checked  tls                app.example.com — network off");
    expect(text).toContain("package-lock.json — network off; 4 packages read");
  });
});

// ---- Sprint T round 3 -------------------------------------------------------------

// Bug 3: in every lockfile form, an alias is checked under its real name and
// version, and a local, git or URL package never leaves. Each form gets the
// same three planted packages, written the way that package manager writes them.
const PLANT = {
  "npm-v1": (t) => {
    const j = JSON.parse(t);
    Object.assign(j.dependencies, {
      "acme-shim": { version: "npm:left-pad@1.2.0", resolved: "https://registry.npmjs.org/left-pad/-/left-pad-1.2.0.tgz", integrity: "sha512-EEEE" },
      "acme-local": { version: "file:../acme-local" },
      "acme-git": { version: "git+ssh://git@git.example.test/acme/acme-git.git#0123abc", from: "git+ssh://git@git.example.test/acme/acme-git.git" },
    });
    return JSON.stringify(j);
  },
  npm: (t) => {
    const j = JSON.parse(t);
    Object.assign(j.packages, {
      "node_modules/acme-shim": { name: "left-pad", version: "1.2.0", resolved: "https://registry.npmjs.org/left-pad/-/left-pad-1.2.0.tgz", integrity: "sha512-EEEE" },
      "node_modules/acme-local": { resolved: "../acme-local", link: true },
      "../acme-local": { name: "acme-local", version: "3.2.1" },
      "node_modules/acme-git": { version: "1.0.0", resolved: "git+ssh://git@git.example.test/acme/acme-git.git#0123abc" },
    });
    return JSON.stringify(j);
  },
  "pnpm-v6": (t) =>
    t.replace("packages:\n\n", "packages:\n\n  /left-pad@1.2.0:\n    resolution: {integrity: sha512-EEEE}\n    dev: false\n\n  file:../acme-local:\n    resolution: {directory: ../acme-local, type: directory}\n    name: acme-local\n    version: 3.2.1\n    dev: false\n\n  git.example.test/acme/acme-git/0123abc:\n    resolution: {commit: 0123abc, repo: git@git.example.test:acme/acme-git.git, type: git}\n    name: acme-git\n    version: 1.0.0\n    dev: false\n\n")
      .replace("dependencies:\n  internal-lib:", "dependencies:\n  acme-shim:\n    specifier: npm:left-pad@1.2.0\n    version: /left-pad@1.2.0\n  acme-local:\n    specifier: file:../acme-local\n    version: file:../acme-local\n  internal-lib:"),
  "pnpm-v9": (t) =>
    t.replace("packages:\n\n", "packages:\n\n  acme-local@file:../acme-local:\n    resolution: {directory: ../acme-local, type: directory}\n\n  acme-git@git+ssh://git@git.example.test/acme/acme-git.git#0123abc:\n    resolution: {commit: 0123abc, repo: git@git.example.test:acme/acme-git.git, type: git}\n    version: 1.0.0\n\n  left-pad@1.2.0:\n    resolution: {integrity: sha512-EEEE}\n\n")
      .replace("    dependencies:\n      internal-lib:", "    dependencies:\n      acme-shim:\n        specifier: npm:left-pad@1.2.0\n        version: left-pad@1.2.0\n      acme-local:\n        specifier: file:../acme-local\n        version: file:../acme-local\n      internal-lib:"),
  "yarn-v1": (t) =>
    `${t}\n"acme-shim@npm:left-pad@1.2.0":\n  version "1.2.0"\n  resolved "https://registry.yarnpkg.com/left-pad/-/left-pad-1.2.0.tgz#eeee"\n  integrity sha512-EEEE\n\n"acme-local@file:../acme-local":\n  version "3.2.1"\n\n"acme-tarball@https://npm.acme-client.internal/acme-tarball-1.0.0.tgz":\n  version "1.0.0"\n\n"acme-gh@github:acme/acme-gh":\n  version "1.0.0"\n  resolved "https://codeload.github.com/acme/acme-gh/tar.gz/0123abc"\n`,
  "yarn-berry": (t) =>
    `${t}\n"acme-shim@npm:left-pad@1.2.0":\n  version: 1.2.0\n  resolution: "left-pad@npm:1.2.0"\n  checksum: 10c0/eeee\n  languageName: node\n  linkType: hard\n\n"acme-local@file:../acme-local::locator=fixture-app%40workspace%3A.":\n  version: 3.2.1\n  resolution: "acme-local@file:../acme-local#../acme-local::hash=1&locator=fixture-app%40workspace%3A."\n  languageName: node\n  linkType: hard\n\n"acme-gh@github:acme/acme-gh#0123abc":\n  version: 1.0.0\n  resolution: "acme-gh@https://github.com/acme/acme-gh.git#commit=0123abc"\n  languageName: node\n  linkType: hard\n`,
};
const plantFor = (form) => PLANT[form] || PLANT.npm;

describe.skipIf(!HAS_OPENSSL)("round 3: yarn key specs and npm aliases (Bug 3)", SPAWN, () => {
  async function runWith(d) {
    const stubs = await startStubs(tempDir());
    try {
      const r = await health({ config: join(d, "health.yaml") }, stubs.deps);
      return { r, stubs };
    } finally {
      await stubs.close();
    }
  }

  it.each(["npm-v1", "npm-v2", "npm-v3", "pnpm-v6", "pnpm-v9", "yarn-v1", "yarn-berry"])(
    "%s: the alias is checked as left-pad@1.2.0; no local, git, URL or alias name is sent, with or without registry: public",
    async (form) => {
      for (const declared of [true, false]) {
        const d = workspace({ lock: form });
        const f = join(d, "app", lockfileOf(form));
        writeFileSync(f, plantFor(form)(readFileSync(f, "utf8")));
        if (!declared) writeFileSync(join(d, "health.yaml"), readFileSync(join(d, "health.yaml"), "utf8").replace("registry: public\n", ""));
        const pkgs = packageSet(readLockfile(f).packages);
        expect(pkgs.map((p) => p.name).filter((n) => /^acme-(shim)$/.test(n)), form).toEqual([]);
        // A pnpm v9 git key keeps its name: the version is what follows the first "@".
        if (form === "pnpm-v9") expect(pkgs.find((p) => p.name === "acme-git")).toMatchObject({ source: "private" });
        const { r, stubs } = await runWith(d);
        const sent = stubs.requests.map((q) => `${q.method} ${q.host}${q.path} ${q.body}`).join("\n");
        expect(sent, `${form} declared=${declared}`).not.toMatch(/acme|git\.example|codeload|file:|0123abc/);
        const batch = stubs.requests.find((q) => q.path === "/v1/querybatch");
        const queries = batch ? JSON.parse(batch.body).queries.map((q) => `${q.package.name}@${q.version}`) : [];
        // left-pad 1.2.0 is sent where the lockfile records the public registry,
        // or where registry: public covers an unrecorded one.
        const recorded = ["npm-v1", "npm-v2", "npm-v3", "yarn-v1"].includes(form);
        expect(queries.includes("left-pad@1.2.0"), `${form} declared=${declared}`).toBe(declared || recorded);
        for (const x of r.results.filter((y) => /acme/.test(y.target))) expect(x.result, `${form}: ${x.target}`).toBe("not checked");
      }
    },
  );

  it("the evaluator's yarn v1 repro: file: and tarball keys are held back by their key spec, alias by its real name", () => {
    const text = '"acme-billing-internal@file:../acme-billing-internal":\n  version "3.2.1"\n  dependencies:\n    lodash "^4.17.21"\n\n"acme-tarball@https://npm.acme-client.internal/acme-tarball-1.0.0.tgz":\n  version "1.0.0"\n\n"acme-internal-shim@npm:left-pad@1.3.0":\n  version "1.3.0"\n  resolved "https://registry.yarnpkg.com/left-pad/-/left-pad-1.3.0.tgz#abc"\n\nlodash@^4.17.21:\n  version "4.17.21"\n  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz#abc"\n';
    const pkgs = packageSet(parseYarn(text).packages);
    expect(pkgs.map((p) => `${p.name}@${p.version}:${p.source}`)).toEqual(["acme-billing-internal@3.2.1:local", "acme-tarball@1.0.0:private", "left-pad@1.3.0:public", "lodash@4.17.21:public"]);
    for (const registry of [null, "public"]) {
      expect(sendable(pkgs, { private_scopes: [], registry }).send.map((p) => p.name)).toEqual(["left-pad", "lodash"]);
    }
  });

  it("reads every key spec form", () => {
    expect(["file:../x", "link:../x", "portal:../x", "workspace:*", "exec:./gen.js", "./x", "../x", "~/x"].map(specSource)).toEqual(Array(8).fill("local"));
    expect(["git+ssh://git@h/x.git", "git://h/x.git", "github:acme/x", "gitlab:acme/x", "bitbucket:acme/x", "gist:abc", "https://h.example/x.tgz", "http://h.example/x.tgz", "ssh://h/x", "acme/x", "acme/x#v1"].map(specSource)).toEqual(Array(11).fill("private"));
    expect(["^1.2.3", "1.2.3", "~1.0", "~1.0.0", "*", "latest", ">=1 <2", "npm:left-pad@1.3.0"].map(specSource)).toEqual(Array(8).fill(null));
    expect(["/abs/x"].map(specSource)).toEqual(["local"]);
    expect(npmAlias("npm:left-pad@1.3.0")).toEqual({ name: "left-pad", version: "1.3.0" });
    expect(npmAlias("npm:@scope/real@^2.0.0")).toEqual({ name: "@scope/real", version: "^2.0.0" });
    expect(npmAlias("npm:left-pad")).toEqual({ name: "left-pad", version: null });
    expect(npmAlias("npm:vue@3.4.0")).toEqual({ name: "vue", version: "3.4.0" });
    expect(npmAlias("^1.0.0")).toBe(null);
    // yarn berry's own registry form is no alias.
    for (const s of ["npm:^7.12.13", "npm:7.12.13", "npm:~1.0", "npm:>=1 <2", "npm:*", "npm:v1.2.3"]) expect(npmAlias(s), s).toBe(null);
    // A berry key with a tag (npm:latest) is named by its resolution, not its spec.
    expect(parseYarn('__metadata:\n  version: 8\n\n"lodash@npm:latest":\n  version: 4.17.21\n  resolution: "lodash@npm:4.17.21"\n').packages.map((p) => `${p.name}@${p.version}`)).toEqual(["lodash@4.17.21"]);
    // A multi-key yarn v1 entry: one local spec makes the whole entry local.
    expect(parseYarn('"x@^1.0.0", "x@file:../x":\n  version "1.0.0"\n  resolved "https://registry.yarnpkg.com/x/-/x-1.0.0.tgz"\n').packages[0].source).toBe("local");
  });
});

describe.skipIf(!HAS_OPENSSL)("round 3: an advisory answer ow-tools can't fully read is never OK (Bug 5)", SPAWN, () => {
  // npm-v3 sends three packages, in this order: @babel/code-frame, left-pad, lodash.
  const answer = (make) => ({
    "api.osv.dev": (req, body) => (req.method === "POST" ? { status: 200, json: make(JSON.parse(body).queries) } : { status: 200, json: { id: "x", database_specific: { severity: "LOW" } } }),
  });
  async function rows(routes) {
    const d = workspace();
    const stubs = await startStubs(tempDir(), { routes });
    try {
      return await health({ config: join(d, "health.yaml") }, stubs.deps);
    } finally {
      await stubs.close();
    }
  }
  const NAMES = ["@babel/code-frame@7.12.13", "left-pad@1.3.0", "lodash@4.17.21"];

  it.each([
    ["no results at all", () => ({}), NAMES, /gave no answer/],
    ["an empty results list", () => ({ results: [] }), NAMES, /gave no answer/],
    ["results shorter than the queries", (q) => ({ results: q.slice(0, 2).map(() => ({})) }), ["lodash@4.17.21"], /gave no answer/],
    ["a null result", (q) => ({ results: q.map((_, k) => (k === 1 ? null : {})) }), ["left-pad@1.3.0"], /gave no answer/],
    ["a next_page_token", (q) => ({ results: q.map((_, k) => (k === 0 ? { vulns: [], next_page_token: "p2" } : {})) }), ["@babel/code-frame@7.12.13"], /more advisories for it than one page/],
    ["vulns that aren't a list", (q) => ({ results: q.map((_, k) => (k === 2 ? { vulns: { id: "GHSA-x" } } : {})) }), ["lodash@4.17.21"], /unexpected shape/],
    ["an id with a space", (q) => ({ results: q.map((_, k) => (k === 2 ? { vulns: [{ id: "GHSA bad" }] } : {})) }), ["lodash@4.17.21"], /couldn't read/],
    ["an id over 80 characters", (q) => ({ results: q.map((_, k) => (k === 2 ? { vulns: [{ id: `GHSA-${"x".repeat(80)}` }] } : {})) }), ["lodash@4.17.21"], /couldn't read/],
    ["an entry with no id", (q) => ({ results: q.map((_, k) => (k === 2 ? { vulns: [{}] } : {})) }), ["lodash@4.17.21"], /couldn't read/],
  ])("%s: the package is attention, and so is the file's summary", async (_, make, flagged, why) => {
    const r = await rows(answer(make));
    for (const k of NAMES) {
      const row = byCheck(r, "advisories", k);
      if (flagged.includes(k)) {
        expect(row, k).toMatchObject({ result: "attention" });
        expect(row.detail, k).toMatch(why);
      } else expect(row, k).toBeUndefined(); // clean: counted in the summary
    }
    const summary = r.results.find((x) => x.check === "advisories" && x.target === "package-lock.json");
    expect(summary.result).toBe("attention");
    expect(summary.detail).toContain(`${flagged.length} whose answer ow-tools couldn't fully read`);
    expect(r.results.filter((x) => x.check === "advisories" && x.result === "OK")).toEqual([]);
  });

  it("a full, readable answer still gives OK", async () => {
    const r = await rows(answer((q) => ({ results: q.map(() => ({})) })));
    expect(r.results.find((x) => x.check === "advisories" && x.target === "package-lock.json")).toMatchObject({ result: "OK", detail: "3 package(s) sent to the advisory service; 3 with no known advisory" });
  });
});

describe("round 3: the rating boundaries (R09, R10)", () => {
  it.each([
    ["CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H", 7.0, "high"],
    ["CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:H", 9.0, "critical"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8, "critical"],
    ["CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H", 7.2, "high"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H", 7.5, "high"],
    ["CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N", 5.5, "moderate"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1, "moderate"],
    ["CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N", 4.3, "moderate"],
    ["CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N", 3.7, "low"],
  ])("%s scores %d (the published NVD score) and rates %s", (vector, score, band) => {
    expect(cvss3Score(vector)).toBe(score);
    expect(cvss3Severity(vector)).toBe(band);
  });

  it("a MAL- entry is critical whatever severity it also names", () => {
    for (const severity of ["LOW", "MODERATE", "MEDIUM", "HIGH"]) {
      expect(rateAdvisory({ id: "MAL-2026-0002", database_specific: { severity } }), severity).toBe("critical");
      expect(rateAdvisory({ id: "GHSA-x", database_specific: { severity, "malicious-packages-origins": [{ source: "ossf" }] } }), severity).toBe("critical");
    }
    expect(rateAdvisory({ id: "MAL-2026-0003", severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N" }] })).toBe("critical");
  });

  it.skipIf(!HAS_OPENSSL)("a MAL- entry with a LOW severity makes its package attention (critical), through the service", async () => {
    const d = workspace();
    const stubs = await startStubs(tempDir(), {
      routes: {
        "api.osv.dev": (req, body) =>
          req.method === "POST"
            ? { status: 200, json: { results: JSON.parse(body).queries.map((q) => ({ vulns: q.package.name === "lodash" ? [{ id: "MAL-2026-0002" }] : [] })) } }
            : { status: 200, json: { id: "MAL-2026-0002", database_specific: { severity: "LOW" } } },
      },
    });
    try {
      const r = await health({ config: join(d, "health.yaml") }, stubs.deps);
      expect(byCheck(r, "advisories", "lodash@4.17.21")).toMatchObject({ result: "attention", detail: "MAL-2026-0002 (critical)" });
    } finally {
      await stubs.close();
    }
  });
});

describe("round 3: special-purpose addresses (R13, R15, Bug 7)", () => {
  it.each([
    ["2001:0:4136:e378:8000:63bf:3fff:fdd2", "Teredo 2001::/32"],
    ["2001::1", "Teredo 2001::/32"],
    ["192.88.99.1", "6to4 relay anycast 192.88.99.0/24"],
    ["192.88.99.254", "6to4 relay anycast 192.88.99.0/24"],
    ["3fff::1", "documentation 3fff::/20"],
    ["3fff:fff:ffff::1", "documentation 3fff::/20"],
    ["2001:2::1", "benchmarking 2001:2::/48"],
    ["2001:2:0:ffff::1", "benchmarking 2001:2::/48"],
    ["::a9fe:a9fe", "IPv4-compatible link-local"],
    ["64:ff9b::a9fe:a9fe", "NAT64 link-local"],
    ["64:ff9b::7f00:1", "NAT64 loopback"],
    ["64:ff9b::a00:1", "NAT64 private"],
    ["2002:a9fe:a9fe::", "6to4 link-local"],
    ["2002:7f00:1::", "6to4 loopback"],
    ["2002:c0a8:1::", "6to4 private"],
    // The re-review's PoC 2 list.
    ["fec0::1", "site-local"],
    ["64:ff9b:1::a00:1", "local-use NAT64"],
    ["::ffff:0:7f00:1", "IPv4-translated"],
    ["100::1", "discard-only"],
    ["2001:10::1", "ORCHID"],
    ["::ffff:169.254.169.254", "IPv4-mapped metadata"],
    ["fd00:ec2::254", "ULA metadata"],
    ["2002:7f00:1::1", "6to4 loopback"],
  ])("blocks %s (%s)", (a) => {
    expect(blockedAddress(a)).toBe(true);
  });

  it.each(["2606:4700::1111", "2a00:1450:4001::200e", "2001:4860:4860::8888", "3fff:1000::1", "2001:3::1", "2001:2:1::1", "64:ff9b::808:808", "2002:808:808::", "93.184.215.14"])(
    "allows the public address %s",
    (a) => {
      expect(blockedAddress(a)).toBe(false);
    },
  );
});
