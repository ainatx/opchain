// A stand-in for Chrome in the capture tests (Sprint T contract, Test
// requirements): speaks the DevTools protocol over fds 3 and 4, records its
// argv, the profile's Preferences at launch and every method it receives, and
// returns canned PNGs at the emulated viewport. FAKE_BROWSER names a JSON
// file: { log, pages: { url: { selectors: { sel: { attrs, navigate } } } },
// redirect: { url: target }, hang: bool, crash: bool, writeSession: bool }.
// writeSession: write cookie and storage files at start, as a signed-in
// Chrome would (the round-3 signal and SIGKILL tests).
import { appendFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Socket } from "node:net";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const cfg = JSON.parse(readFileSync(process.env.FAKE_BROWSER, "utf8"));
const log = (o) => appendFileSync(cfg.log, `${JSON.stringify(o)}\n`);
const argv = process.argv.slice(2);
const profile = (argv.find((a) => a.startsWith("--user-data-dir=")) || "").slice("--user-data-dir=".length);
let prefs = null;
try {
  prefs = JSON.parse(readFileSync(`${profile}/Default/Preferences`, "utf8"));
} catch {
  prefs = null;
}
// What the profile held when the browser started: the start-of-run clean
// (F-023, R26) and the start-of-run wipe (SA-019) are judged by this.
const at = (...p) => existsSync(join(profile, ...p));
const atLaunch = {
  cache: at("Default", "Cache") || at("GPUPersistentCache") || at("Default", "Code Cache"),
  session: at("Default", "Cookies") || at("Default", "Network", "Cookies") || at("Default", "Local Storage"),
};
log({ argv, prefs, pid: process.pid, atLaunch });
if (cfg.writeSession) {
  for (const p of [["Default", "Cookies"], ["Default", "Network", "Cookies"], ["Default", "Local Storage", "leveldb", "000003.log"]]) {
    mkdirSync(join(profile, ...p.slice(0, -1)), { recursive: true });
    writeFileSync(join(profile, ...p), "session-zq");
  }
}

const out = createWriteStream(null, { fd: 4 });
const send = (o) => out.write(`${JSON.stringify(o)}\0`);
const reply = (id, result = {}, sessionId) => send({ id, result, ...(sessionId ? { sessionId } : {}) });
const event = (method, params, sessionId) => send({ method, params, ...(sessionId ? { sessionId } : {}) });

let viewport = { width: 800, height: 600 };
let current = "about:blank";
let fetchOn = false;
let requestSeq = 0;
const pendingFetch = new Map(); // requestId → resolve(bool)
const nodes = new Map(); // nodeId → { url, selector }
let nextNode = 2;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function png(w, h) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 0, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.alloc((w + 1) * h))), chunk("IEND", Buffer.alloc(0))]);
}

// One request through the Fetch guard; resolves true when continued.
function guarded(url, sessionId, redirectedFrom, resourceType = "Document") {
  if (!fetchOn) return Promise.resolve(true);
  const requestId = `r${++requestSeq}`;
  return new Promise((resolve) => {
    pendingFetch.set(requestId, resolve);
    event("Fetch.requestPaused", { requestId, request: { url, method: "GET" }, resourceType, frameId: "F", ...(redirectedFrom ? { redirectedRequestId: redirectedFrom } : {}) }, sessionId);
  });
}

let popupSent = false;
async function navigate(url, sessionId) {
  event("Page.frameStartedLoading", { frameId: "F" }, sessionId);
  // Like Chrome, a blocked navigation still loads the error page.
  const blocked = () => {
    current = "chrome-error://chromewebdata/";
    setTimeout(() => event("Page.loadEventFired", { timestamp: 1 }, sessionId), 5);
    return "net::ERR_BLOCKED_BY_CLIENT";
  };
  if (!(await guarded(url, sessionId))) return blocked();
  const target = cfg.redirect?.[url];
  if (target && !(await guarded(target, sessionId, "redir"))) return blocked();
  // A page that opens a second window (window.open, target=_blank).
  if (cfg.popup && !popupSent) {
    popupSent = true;
    event("Target.targetCreated", { targetInfo: { targetId: "T2", type: "page", url: "https://uat.example.test/popup" } });
  }
  current = target || url;
  // A page may load a sub-resource from another origin.
  for (const sub of cfg.pages?.[current]?.subresources || []) guarded(sub, sessionId, undefined, "Script").then(() => {});
  setTimeout(() => event("Page.loadEventFired", { timestamp: 1 }, sessionId), 5);
  return null;
}

let buf = Buffer.alloc(0);
// A socket on the pipe, not an fs stream: a blocked fs read on fd 3 sits in
// the thread pool and holds process.exit() until it returns, so the fake
// would outlive Browser.close the way real Chrome doesn't.
new Socket({ fd: 3, readable: true, writable: false }).on("data", async (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (let i = buf.indexOf(0); i >= 0; i = buf.indexOf(0)) {
    const msg = JSON.parse(buf.subarray(0, i).toString("utf8"));
    buf = buf.subarray(i + 1);
    log({ method: msg.method, params: msg.params });
    handle(msg);
  }
});

async function handle({ id, method, params = {}, sessionId }) {
  const page = cfg.pages?.[current] || {};
  switch (method) {
    case "Browser.getVersion":
      return reply(id, { product: "FakeChrome/1.0" });
    case "Browser.close":
      reply(id);
      return setTimeout(() => process.exit(0), 5);
    case "Target.getTargets":
      return reply(id, { targetInfos: [{ targetId: "T1", type: "page", url: current }] });
    case "Target.attachToTarget":
      return reply(id, { sessionId: "S1" });
    case "Emulation.setDeviceMetricsOverride":
      viewport = { width: params.width, height: params.height };
      return reply(id, {}, sessionId);
    case "Fetch.enable":
      fetchOn = true;
      return reply(id, {}, sessionId);
    case "Fetch.continueRequest":
    case "Fetch.failRequest": {
      const r = pendingFetch.get(params.requestId);
      pendingFetch.delete(params.requestId);
      reply(id, {}, sessionId);
      return r?.(method === "Fetch.continueRequest");
    }
    case "Page.navigate": {
      if (cfg.hang) return undefined;
      if (cfg.crash) process.exit(1);
      const err = await navigate(params.url, sessionId);
      return reply(id, { frameId: "F", ...(err ? { errorText: err } : {}) }, sessionId);
    }
    case "Page.getFrameTree":
      return reply(id, { frameTree: { frame: { id: "F", url: current } } }, sessionId);
    case "DOM.getDocument":
      return reply(id, { root: { nodeId: 1 } }, sessionId);
    case "DOM.querySelector": {
      if (!page.selectors?.[params.selector]) return reply(id, { nodeId: 0 }, sessionId);
      const n = nextNode++;
      nodes.set(n, { url: current, selector: params.selector });
      return reply(id, { nodeId: n }, sessionId);
    }
    case "DOM.describeNode": {
      const n = nodes.get(params.nodeId);
      return reply(id, { node: { nodeId: params.nodeId, attributes: cfg.pages[n.url].selectors[n.selector].attrs || [] } }, sessionId);
    }
    case "DOM.getBoxModel":
      return reply(id, { model: { content: [10, 10, 110, 10, 110, 50, 10, 50] } }, sessionId);
    case "Input.dispatchMouseEvent": {
      reply(id, {}, sessionId);
      const last = [...nodes.values()].at(-1);
      const to = last && cfg.pages[last.url]?.selectors[last.selector]?.navigate;
      if (params.type === "mouseReleased" && to) await navigate(to, sessionId);
      return undefined;
    }
    case "Page.captureScreenshot":
      return reply(id, { data: png(viewport.width, viewport.height).toString("base64") }, sessionId);
    default:
      return reply(id, {}, sessionId);
  }
}
