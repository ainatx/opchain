// In-process stand-ins for everything `ow-tools health` reaches (Sprint T
// contract, Test requirements): TLS with generated certificates, the OSV
// advisory API, the npm registry, the IANA RDAP list, an RDAP server and the
// listed app. They are injected through health's module parameters (resolver,
// connector), never through an environment variable or a flag.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { createServer as netServer } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { join } from "node:path";

export const HAS_OPENSSL = spawnSync("sh", ["-c", "command -v openssl"]).status === 0;
export const PUBLIC_TEST_ADDRESS = "203.0.113.10"; // TEST-NET-3: never routed, not a blocked range
export const DOWN_ADDRESS = "203.0.113.99";
const LONG_HOSTS = ["api.osv.dev", "registry.npmjs.org", "data.iana.org", "rdap.example.test"];

function cert(dir, name, days, hosts) {
  const key = join(dir, `${name}.key`);
  const crt = join(dir, `${name}.pem`);
  const r = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", String(days), "-subj", `/CN=${hosts[0]}`, "-addext", `subjectAltName=${hosts.map((h) => `DNS:${h}`).join(",")}`], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`openssl failed: ${r.stderr.split("\n").pop()}`);
  return { key: readFileSync(key), cert: readFileSync(crt) };
}

const day = 86400000;

// handlers: (req, body) → { status, json?, text?, headers? }
function defaultRoutes(now) {
  return {
    "api.osv.dev": (req, body) => {
      if (req.method === "POST" && req.url === "/v1/querybatch") {
        const q = JSON.parse(body).queries;
        return { status: 200, json: { results: q.map((x) => (x.package.name === "lodash" ? { vulns: [{ id: "GHSA-test-0001", modified: "2026-01-01T00:00:00Z" }] } : x.package.name === "left-pad" ? { vulns: [{ id: "GHSA-test-0002" }] } : {})) } };
      }
      if (req.url === "/v1/vulns/GHSA-test-0001") return { status: 200, json: { id: "GHSA-test-0001", database_specific: { severity: "HIGH" } } };
      if (req.url === "/v1/vulns/GHSA-test-0002") return { status: 200, json: { id: "GHSA-test-0002", database_specific: { severity: "LOW" } } };
      return { status: 404, json: {} };
    },
    "registry.npmjs.org": (req) => {
      if (req.url === "/lodash/latest") return { status: 200, json: { name: "lodash", version: "4.17.21" } };
      if (req.url === "/left-pad/latest") return { status: 200, json: { name: "left-pad", version: "2.0.0" } };
      return { status: 404, json: {} };
    },
    "data.iana.org": (req) => (req.url === "/rdap/dns.json" ? { status: 200, json: { services: [[["com", "net"], ["http://rdap.example.test/insecure/", "https://rdap.example.test/"]], [["org"], ["https://rdap.example.test/org/"]]] } } : { status: 404, json: {} }),
    "rdap.example.test": (req) => {
      if (req.url === "/domain/example.com") return { status: 200, json: { ldhName: "example.com", events: [{ eventAction: "registration", eventDate: "2000-01-01T00:00:00Z" }, { eventAction: "expiration", eventDate: new Date(now + 200 * day).toISOString() }] } };
      if (req.url === "/domain/soon.com") return { status: 200, json: { events: [{ eventAction: "expiration", eventDate: new Date(now + 10 * day).toISOString() }] } };
      return { status: 404, json: {} };
    },
    "app.example.com": (req) => {
      if (req.url === "/health") return { status: 200, text: "ok" };
      if (req.url === "/moved") return { status: 301, text: "", headers: { location: "https://elsewhere.example.org/next" } };
      if (req.url === "/big") return { status: 200, text: "x".repeat(200 * 1024) };
      return { status: 404, text: "" };
    },
  };
}

export async function startStubs(dir, { now = Date.now(), addresses = {}, routes = {} } = {}) {
  const long = cert(dir, "long", 365, LONG_HOSTS);
  const short = cert(dir, "short", 20, ["app.example.com"]);
  const requests = [];
  const handlers = { ...defaultRoutes(now), ...routes };
  const handle = (req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const host = String(req.headers.host || "").replace(/:\d+$/, "");
      requests.push({ host, method: req.method, path: req.url, headers: { ...req.headers }, body });
      const h = handlers[host];
      const out = h ? h(req, body) : { status: 404, text: "" };
      res.writeHead(out.status, { "content-type": out.json ? "application/json" : "text/plain", ...(out.headers || {}) });
      res.end(out.json ? JSON.stringify(out.json) : out.text || "");
    });
  };
  const a = createServer({ key: long.key, cert: long.cert }, handle);
  const b = createServer({ key: short.key, cert: short.cert }, handle);
  await Promise.all([a, b].map((s) => new Promise((r) => s.listen(0, "127.0.0.1", r))));
  // A port nothing listens on, for the unreachable host.
  const dead = netServer();
  await new Promise((r) => dead.listen(0, "127.0.0.1", r));
  const deadPort = dead.address().port;
  await new Promise((r) => dead.close(r));

  const resolverCalls = [];
  const connectorCalls = [];
  const deps = {
    resolver: async (host) => {
      resolverCalls.push(host);
      if (addresses[host]) return addresses[host];
      if (host === "down.example.com") return [DOWN_ADDRESS];
      return [PUBLIC_TEST_ADDRESS];
    },
    connector: ({ address, port, servername, inspect = false }) => {
      connectorCalls.push({ address, port, servername });
      if (address === DOWN_ADDRESS) return tlsConnect({ host: "127.0.0.1", port: deadPort, servername });
      const target = servername === "app.example.com" ? b : a;
      return tlsConnect({ host: "127.0.0.1", port: target.address().port, servername, ca: [long.cert, short.cert], rejectUnauthorized: !inspect });
    },
    env: { ...process.env, OW_TOOLS_HOME: join(dir, "home") },
    timeoutMs: 5000,
  };
  return {
    deps,
    requests,
    resolverCalls,
    connectorCalls,
    close: () => Promise.all([a, b].map((s) => new Promise((r) => s.close(r)))),
  };
}
