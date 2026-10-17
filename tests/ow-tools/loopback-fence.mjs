// A loopback-only fence for the in-process stub suites (F-016): sockets may
// connect to 127.0.0.1 (the stub servers) and nowhere else, and no name is
// ever looked up. A regression that let Node resolve and connect by itself
// (the build-time `agent: false` bug) fails here with nothing sent, instead
// of reaching the real api.osv.dev. Installed for a whole test file.
import { createRequire, syncBuiltinESMExports } from "node:module";

const require = createRequire(import.meta.url);
const net = require("node:net");
const dns = require("node:dns");
const saved = {};
export const attempts = [];

const fail = (kind, target) => {
  attempts.push({ kind, target: String(target) });
  throw Object.assign(new Error(`loopback fence: ${kind} ${target} blocked`), { code: "EFENCE" });
};

export function installLoopbackFence() {
  if (saved.connect) return;
  saved.connect = net.Socket.prototype.connect;
  saved.lookup = dns.lookup;
  saved.plookup = dns.promises.lookup;
  net.Socket.prototype.connect = function fencedConnect(...args) {
    const o = Array.isArray(args[0]) ? args[0][0] : args[0];
    if (o && typeof o === "object" && o.path) return saved.connect.apply(this, args); // unix sockets (IPC)
    const host = typeof o === "object" && o ? o.host : args[1];
    if (host !== "127.0.0.1") fail("connect", host ?? "(default host)");
    return saved.connect.apply(this, args);
  };
  // `listen(0, "127.0.0.1")` looks up the literal itself; only names fail.
  dns.lookup = function fencedLookup(h, ...rest) {
    return h === "127.0.0.1" ? saved.lookup.call(this, h, ...rest) : fail("dns.lookup", h);
  };
  dns.promises.lookup = async (h, ...rest) => (h === "127.0.0.1" ? saved.plookup(h, ...rest) : fail("dns.promises.lookup", h));
  syncBuiltinESMExports();
}

export function uninstallLoopbackFence() {
  if (!saved.connect) return;
  net.Socket.prototype.connect = saved.connect;
  dns.lookup = saved.lookup;
  dns.promises.lookup = saved.plookup;
  delete saved.connect;
  syncBuiltinESMExports();
}
