// Network fence (Sprint T contract, Test requirements; C15, C25, C27): a
// `--import` preload that replaces every way Node opens a socket, resolves a
// name or fetches, with a recorder that throws. Each attempt is appended to
// the file named by OW_FENCE_LOG as one JSON line. With OW_FENCE_FS set, it
// also records every path the process opens for reading (C14's fs spy).
import { appendFileSync } from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";

const require = createRequire(import.meta.url);
const LOG = process.env.OW_FENCE_LOG;
let inRecord = false;
const record = (kind, target) => {
  if (!LOG || inRecord) return;
  inRecord = true;
  try {
    appendFileSync(LOG, `${JSON.stringify({ kind, target: String(target ?? "") })}\n`);
  } finally {
    inRecord = false;
  }
};
const trap = (kind, describe) =>
  function fenced(...args) {
    record(kind, describe(...args));
    throw Object.assign(new Error(`network fence: ${kind} blocked`), { code: "EFENCE" });
  };
const hostOf = (a) => (typeof a === "object" && a ? a.host || a.hostname || a.path || a.servername : a);

const net = require("node:net");
const tls = require("node:tls");
const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");
const dgram = require("node:dgram");
let http2 = null;
try {
  http2 = require("node:http2");
} catch {
  /* absent */
}

// OW_FENCE_NET: unset = every socket, DNS and fetch call fails; "loopback" =
// only 127.0.0.1 sockets are allowed (the in-process stub servers); "0" = off.
const NET = !["0", "loopback"].includes(process.env.OW_FENCE_NET ?? "");
if (process.env.OW_FENCE_NET === "loopback") {
  const { installLoopbackFence } = await import("./loopback-fence.mjs");
  installLoopbackFence();
}
if (NET) {
  net.connect = trap("net.connect", (a, b) => (typeof a === "number" ? `${b}:${a}` : hostOf(a)));
  net.createConnection = net.connect;
  net.Socket.prototype.connect = trap("net.Socket.connect", (a, b) => (typeof a === "number" ? `${b}:${a}` : hostOf(a)));
  tls.connect = trap("tls.connect", (a, b) => (typeof a === "number" ? `${b}:${a}` : hostOf(a)));
  dns.lookup = trap("dns.lookup", (h) => h);
  for (const k of Object.keys(dns)) if (/^resolve/.test(k) && typeof dns[k] === "function") dns[k] = trap(`dns.${k}`, (h) => h);
  if (dns.promises) {
    dns.promises.lookup = trap("dns.promises.lookup", (h) => h);
    for (const k of Object.keys(dns.promises)) if (/^resolve/.test(k)) dns.promises[k] = trap(`dns.promises.${k}`, (h) => h);
  }
  for (const [name, mod] of [["http", http], ["https", https]]) {
    mod.request = trap(`${name}.request`, (a) => (typeof a === "string" || a instanceof URL ? new URL(a).host : hostOf(a)));
    mod.get = trap(`${name}.get`, (a) => (typeof a === "string" || a instanceof URL ? new URL(a).host : hostOf(a)));
  }
  dgram.createSocket = trap("dgram.createSocket", () => "udp");
  if (http2) http2.connect = trap("http2.connect", (a) => String(a));
  globalThis.fetch = trap("fetch", (a) => {
    try {
      return new URL(String(a?.url ?? a)).host;
    } catch {
      return String(a);
    }
  });
  globalThis.WebSocket = trap("WebSocket", (a) => String(a));
}

if (process.env.OW_FENCE_FS) {
  const fs = require("node:fs");
  const wrap = (obj, name) => {
    const orig = obj[name];
    obj[name] = function recordedRead(p, ...rest) {
      record("fs.read", typeof p === "number" ? `fd:${p}` : p);
      return orig.call(this, p, ...rest);
    };
  };
  for (const n of ["readFileSync", "openSync", "readFile", "open", "createReadStream"]) wrap(fs, n);
  for (const n of ["readFile", "open"]) wrap(fs.promises, n);
}
syncBuiltinESMExports();
