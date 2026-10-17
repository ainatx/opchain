// Sprint T: T3 `ow-tools health` (C11–C15), the network rules (C25 c, d) and
// pip-audit's pinned argv (O8). Network checks run against in-process stubs
// injected through health's module parameters; nothing here reaches the
// internet (Test requirements: no live-internet test in CI).
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_THRESHOLDS, health, pipAuditArgs, readHealthConfig, sendable } from "../../plugins/ow-tools/lib/health.mjs";
import { packageSet, readLockfile } from "../../plugins/ow-tools/lib/lockfiles.mjs";
import { blockedAddress, createNet } from "../../plugins/ow-tools/lib/net.mjs";
import { digestTree } from "../../plugins/ow-tools/lib/digest.mjs";
import { HAS_OPENSSL, startStubs } from "./health-stubs.mjs";
import { ROOT, cleanup, cli, stub, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
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
      env: { ...process.env, HOME: home, PATH: `${bin}:${NODE_DIR}:/usr/bin:/bin`, OW_FENCE_LOG: log, OW_FENCE_FS: "1", OW_FENCE_NET: "0" },
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
    expect(byCheck(r.json, "advisories").reason).toBe("network off (4 packages read: 3 public, 1 held back)");
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
    expect(pipAuditArgs("/w/requirements.txt")).toEqual(["-r", "/w/requirements.txt", "--disable-pip", "--no-deps", "--format", "json", "--progress-spinner", "off"]);
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
