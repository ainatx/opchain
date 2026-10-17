// `ow-tools capture` (design §5.6, amendment T1): screenshots of a running
// test environment for ow-documentation, from a declarative plan (navigate,
// click, fill test data, wait, shot), in an installed Chrome or Chromium on a
// dedicated per-workstream profile. ow-tools never reads, types or stores a
// credential, never evaluates JavaScript, and never reads a cookie: the user
// signs in themselves in the headed window (`--sign-in`).
//
// The profile does hold the signed-in test session, like any browser
// profile. It lives in the ow-tools data folder (0700), is listed by
// `--profiles` and removed by `--delete-profile`, and ow-handoff's access
// removal names it.
import { chmodSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { dataHome, failed, isFile, localDate, missing, refused, usage, which } from "./core.mjs";
import { CDP_METHODS, killTree, launchBrowser } from "./cdp.mjs";
import { assertIgnored, withTmpSiblings, writePrivate } from "./guards.mjs";
import { sha256File } from "./hash.mjs";

export const SHOTS_IGNORE_LINES = ["opchain-work/**/shots/"];
export const DATA_CHECK = "pending (not done by ow-tools)";
export const ENVIRONMENTS = ["test", "uat", "staging", "demo", "production"];
const PROFILE_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;
const STEP_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const KINDS = ["navigate", "click", "fill", "wait", "shot"];
const MAX_STEPS = 200;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

// A field ow-tools never types into: by type, by autocomplete, or by a name,
// id or selector matching this pattern (design §5.6).
export const SECRET_NAME =
  /pass(?:word|wd|code|phrase)?|pwd|\botp\b|one-?time|totp|\bmfa\b|2fa|secret|token|api[-_]?key|\bpin\b|cvv|cvc|card-?num|cc-?(?:num|csc|exp)|\bssn\b|security[-_]?code|verification[-_]?code|auth[-_]?code/i;
const SECRET_AUTOCOMPLETE = /\b(current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp(?:-month|-year)?)\b/i;
// A plan value that looks like a credential is refused, whatever the field.
export const SECRET_VALUE = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bsk[-_](?:live|test|proj)?[-_]?[A-Za-z0-9]{20,}/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /^(?=\S{24,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
];

// ---- browser -------------------------------------------------------------------
export function browserCandidates(env = process.env) {
  const home = env.HOME || homedir();
  return {
    path: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"],
    files: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      join(home, "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
      join(home, "Applications", "Chromium.app", "Contents", "MacOS", "Chromium"),
    ],
  };
}

// PATH first, then the standard install paths. Nothing is ever downloaded.
export function findBrowser(cands = browserCandidates(), env = process.env) {
  for (const name of cands.path) {
    const p = which(name, env);
    if (p) return p;
  }
  return cands.files.find((f) => isFile(f)) || null;
}

// ---- plan ------------------------------------------------------------------------
const planBad = (msg, extra = {}) => refused("plan-invalid", `capture plan: ${msg}`, extra);

function checkKeys(obj, allowed, where) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw planBad(`${where} must be an object`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw planBad(`${where}: unknown key "${k}" (allowed: ${allowed.join(", ")})`);
}

function line(v, max, what) {
  if (typeof v !== "string" || !v.length || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) throw planBad(`${what} must be one line of 1-${max} characters`);
  return v;
}

function origin(text, testOrigins, what) {
  if (testOrigins.includes(text)) return text;
  let u;
  try {
    u = new URL(text);
  } catch {
    throw planBad(`${what} is not a URL`);
  }
  if (u.protocol !== "https:") throw planBad(`${what} must be https://`);
  if (u.username || u.password) throw planBad(`${what} must not hold a user name or password`);
  if (u.origin !== text.replace(/\/$/, "")) throw planBad(`${what} must be an origin only (scheme, host, port), with no path`);
  const h = u.hostname;
  if (h === "localhost" || h.endsWith(".localhost") || /^\[?(::1|0:0:0:0:0:0:0:1)\]?$/.test(h) || /^(127|0)\./.test(h)) throw planBad(`${what} must not be a loopback address`);
  return u.origin;
}

function inOrigins(url, origins, what) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw planBad(`${what} is not a URL`);
  }
  if (u.username || u.password) throw planBad(`${what} must not hold a user name or password`);
  if (!origins.includes(u.origin)) throw refused("origin-not-allowed", `capture plan: ${what} is outside allowed_origins`, { step: what });
  return u.href;
}

function secretField(text) {
  return SECRET_NAME.test(text) || /type\s*=\s*["']?password/i.test(text) || SECRET_AUTOCOMPLETE.test(text);
}

export function readPlan(json, { testOrigins = [] } = {}) {
  checkKeys(json, ["schema", "profile", "environment", "decision", "allowed_origins", "viewport", "sign_in", "steps"], "the plan");
  if (json.schema !== 1) throw planBad("schema must be 1");
  if (typeof json.profile !== "string" || !PROFILE_ID.test(json.profile)) throw planBad("profile must be the workstream id: lowercase letters, digits and -");
  if (!ENVIRONMENTS.includes(json.environment)) throw planBad(`environment must be one of ${ENVIRONMENTS.join(", ")}`);
  let decision = null;
  if (json.environment === "production") {
    if (json.decision === undefined) throw refused("production-without-decision", "capture plan: environment is production but the plan has no decision (the client's recorded decision: role and date)");
    checkKeys(json.decision, ["role", "date"], "decision");
    line(json.decision.role, 60, "decision.role");
    if (typeof json.decision.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(json.decision.date) || Number.isNaN(Date.parse(json.decision.date))) {
      throw refused("production-without-decision", "capture plan: decision.date must be the date of the client's decision, YYYY-MM-DD");
    }
    decision = { role: json.decision.role, date: json.decision.date };
  } else if (json.decision !== undefined) throw planBad("decision is only for environment: production");
  if (!Array.isArray(json.allowed_origins) || !json.allowed_origins.length || json.allowed_origins.length > 20) throw planBad("allowed_origins must list 1-20 origins");
  const origins = json.allowed_origins.map((o, k) => origin(o, testOrigins, `allowed_origins[${k}]`));
  const viewport = { ...DEFAULT_VIEWPORT };
  if (json.viewport !== undefined) {
    checkKeys(json.viewport, ["width", "height"], "viewport");
    for (const k of ["width", "height"]) {
      const v = json.viewport[k];
      if (!Number.isInteger(v) || v < 320 || v > 3840) throw planBad(`viewport.${k} must be a whole number from 320 to 3840`);
      viewport[k] = v;
    }
  }
  let signIn = null;
  if (json.sign_in !== undefined) {
    checkKeys(json.sign_in, ["url", "done_selector"], "sign_in");
    signIn = { url: inOrigins(line(json.sign_in.url, 2000, "sign_in.url"), origins, "sign_in.url"), done: line(json.sign_in.done_selector, 300, "sign_in.done_selector") };
  }
  if (!Array.isArray(json.steps) || json.steps.length > MAX_STEPS) throw planBad(`steps must be a list of at most ${MAX_STEPS}`);
  const seen = new Set();
  const steps = json.steps.map((s, k) => {
    if (!s || typeof s !== "object") throw planBad(`step ${k + 1} must be an object`);
    const id = s.id;
    if (typeof id !== "string" || !STEP_ID.test(id)) throw planBad(`step ${k + 1}: id must be 1-40 letters, digits, "_" or "-" (it names the image)`);
    if (seen.has(id.toLowerCase())) throw planBad(`step ${id}: the id appears twice`, { step: id });
    seen.add(id.toLowerCase());
    if (!KINDS.includes(s.do)) throw planBad(`step ${id}: do must be one of ${KINDS.join(", ")}`, { step: id });
    const allowedKeys = { navigate: ["url"], click: ["selector"], fill: ["selector", "value"], wait: ["selector", "timeout_ms"], shot: [] }[s.do];
    checkKeys(s, ["id", "do", ...allowedKeys], `step ${id}`);
    const step = { id, do: s.do };
    if (s.do === "navigate") step.url = inOrigins(line(s.url, 2000, `step ${id} url`), origins, id);
    if (["click", "fill", "wait"].includes(s.do)) step.selector = line(s.selector, 300, `step ${id} selector`);
    if (s.do === "fill") {
      if (secretField(step.selector)) throw refused("secret-field", `capture plan: step ${id} targets a password, one-time-code or similar field; ow-tools never types into one (the user signs in with --sign-in)`, { step: id });
      if (typeof s.value !== "string" || s.value.length > 500 || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(s.value)) throw planBad(`step ${id}: value must be text of at most 500 characters`, { step: id });
      if (SECRET_VALUE.some((re) => re.test(s.value))) throw refused("secret-value", `capture plan: step ${id} carries a value that looks like a credential; plans hold test data only`, { step: id });
      step.value = s.value;
    }
    if (s.do === "wait") {
      const t = s.timeout_ms ?? 10000;
      if (!Number.isInteger(t) || t < 100 || t > 60000) throw planBad(`step ${id}: timeout_ms must be 100 to 60000`, { step: id });
      step.timeout = t;
    }
    return step;
  });
  if (!steps.length && !signIn) throw planBad("give steps, or sign_in for a sign-in run");
  return { profile: json.profile, environment: json.environment, decision, origins, viewport, signIn, steps };
}

// ---- profiles -------------------------------------------------------------------
export const captureRoot = (env) => join(dataHome(env), "capture");
const LAST_USED = ".ow-tools-last-used";

function treeBytes(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const st = lstatSync(p);
    if (st.isDirectory()) n += treeBytes(p);
    else n += st.size;
  }
  return n;
}

export function listProfiles(env) {
  const root = captureRoot(env);
  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  return names
    .filter((n) => PROFILE_ID.test(n))
    .map((id) => {
      const p = join(root, id);
      const st = lstatSync(p);
      if (!st.isDirectory()) return null;
      let last = null;
      try {
        last = readFileSync(join(p, LAST_USED), "utf8").trim().slice(0, 10);
      } catch {
        last = null;
      }
      return { id, bytes: treeBytes(p), last_used: /^\d{4}-\d{2}-\d{2}$/.test(last || "") ? last : null };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// The one delete ow-tools does: a profile folder, confined to the data folder.
export function deleteProfile(id, env) {
  if (typeof id !== "string" || !PROFILE_ID.test(id)) {
    throw refused("profile-id-invalid", "a profile id is lowercase letters, digits and - only (no /, no .., no other characters)");
  }
  const root = captureRoot(env);
  let rootSt;
  try {
    rootSt = lstatSync(root);
  } catch {
    throw refused("profile-not-found", "there are no capture profiles");
  }
  if (rootSt.isSymbolicLink() || !rootSt.isDirectory()) throw refused("profile-not-contained", "the capture folder is not a plain folder; nothing deleted");
  const target = join(root, id);
  let st;
  try {
    st = lstatSync(target);
  } catch {
    throw refused("profile-not-found", "no capture profile with that id");
  }
  if (st.isSymbolicLink()) throw refused("profile-not-contained", "that profile is a symlink; nothing deleted");
  if (!st.isDirectory()) throw refused("profile-not-contained", "that profile is not a folder; nothing deleted");
  const realRoot = realpathSync(root);
  const real = realpathSync(target);
  const rel = relative(realRoot, real);
  if (!rel || rel.startsWith("..") || rel.includes(sep)) throw refused("profile-not-contained", "that profile is not directly inside the capture folder; nothing deleted");
  const bytes = treeBytes(real);
  rmSync(real, { recursive: true, force: true });
  return { status: "deleted", id, removed: real, bytes };
}

// ---- the browser run ---------------------------------------------------------------
export const PREFS = Object.freeze({
  credentials_enable_service: false,
  credentials_enable_autosignin: false,
  profile: { password_manager_enabled: false, default_content_setting_values: { automatic_downloads: 2, notifications: 2, geolocation: 2, media_stream_camera: 2, media_stream_mic: 2 } },
  autofill: { enabled: false, profile_enabled: false, credit_card_enabled: false },
  download: { prompt_for_download: false },
  safebrowsing: { enabled: false },
  translate: { enabled: false },
  signin: { allowed: false },
  sync: { requested: false },
});

function deepMerge(a, b) {
  const out = { ...(a && typeof a === "object" && !Array.isArray(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  return out;
}

export function prepareProfile(id, env) {
  const root = captureRoot(env);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const rootSt = lstatSync(root);
  if (rootSt.isSymbolicLink()) throw refused("profile-not-contained", "the capture folder is a symlink; refusing to use it");
  const dir = join(root, id);
  mkdirSync(join(dir, "Default"), { recursive: true, mode: 0o700 });
  if (lstatSync(dir).isSymbolicLink()) throw refused("profile-not-contained", "that profile is a symlink; refusing to use it");
  chmodSync(root, 0o700);
  chmodSync(dir, 0o700);
  const prefsPath = join(dir, "Default", "Preferences");
  let cur = {};
  try {
    cur = JSON.parse(readFileSync(prefsPath, "utf8"));
  } catch {
    cur = {};
  }
  writeFileSync(prefsPath, JSON.stringify(deepMerge(cur, PREFS)), { mode: 0o600 });
  writeFileSync(join(dir, "First Run"), "", { mode: 0o600 });
  return dir;
}

export function browserArgs({ profileDir, headless, viewport, origins }) {
  const hosts = [...new Set(origins.map((o) => new URL(o).hostname))];
  return [
    "--remote-debugging-pipe",
    `--user-data-dir=${profileDir}`,
    ...(headless ? ["--headless"] : []),
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-domain-reliability",
    "--disable-client-side-phishing-detection",
    "--disable-breakpad",
    "--disable-features=Translate,OptimizationHints,MediaRouter,AutofillServerCommunication,PasswordManagerOnboarding",
    "--metrics-recording-only",
    "--no-pings",
    "--use-mock-keychain",
    "--password-store=basic",
    "--no-proxy-server",
    `--host-resolver-rules=MAP * ~NOTFOUND , ${hosts.map((h) => `EXCLUDE ${h}`).join(" , ")}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank",
  ];
}

// Browser caches can hold page content; they go after every run.
const TEMP_STATE = [["Default", "Cache"], ["Default", "Code Cache"], ["Default", "GPUCache"], ["Default", "DawnGraphiteCache"], ["Default", "DawnWebGPUCache"], ["ShaderCache"], ["GrShaderCache"], ["GraphiteDawnCache"], ["Crashpad"], ["SingletonLock"], ["SingletonSocket"], ["SingletonCookie"]];
function cleanTempState(dir) {
  for (const parts of TEMP_STATE) rmSync(join(dir, ...parts), { recursive: true, force: true });
}

function pngSize(buf) {
  if (buf.length < 24 || buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Unref'd: a wait that lost its race must not keep the process alive.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms).unref());
const stepFail = (reason, msg, extra) => failed(msg, { reason, ...extra });

async function session(b, plan, log) {
  const s = b.session;
  const version = await s.send("Browser.getVersion");
  await s.send("Browser.setDownloadBehavior", { behavior: "deny" });
  await s.send("Target.setDiscoverTargets", { discover: true });
  const { targetInfos } = await s.send("Target.getTargets");
  let page = targetInfos.find((t) => t.type === "page");
  if (!page) page = { targetId: (await s.send("Target.createTarget", { url: "about:blank" })).targetId };
  const { sessionId } = await s.send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
  const call = (m, p) => s.send(m, p, sessionId);
  // A second window (target=_blank, window.open) is closed, never captured.
  s.on((m) => {
    if (m.method === "Target.targetCreated" && m.params.targetInfo.type === "page" && m.params.targetInfo.targetId !== page.targetId) {
      s.send("Target.closeTarget", { targetId: m.params.targetInfo.targetId }).catch(() => {});
    }
  });
  const guard = { blockedDocument: false, blockedOther: 0 };
  s.on((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === "Page.javascriptDialogOpening") call("Page.handleJavaScriptDialog", { accept: false }).catch(() => {});
    if (m.method !== "Fetch.requestPaused") return;
    const url = m.params.request.url;
    let allowed = /^(data|blob|about):/.test(url);
    if (!allowed) {
      try {
        allowed = plan.origins.includes(new URL(url).origin);
      } catch {
        allowed = false;
      }
    }
    if (allowed) call("Fetch.continueRequest", { requestId: m.params.requestId }).catch(() => {});
    else {
      if (m.params.resourceType === "Document") guard.blockedDocument = true;
      else guard.blockedOther++;
      call("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "BlockedByClient" }).catch(() => {});
    }
  });
  await call("Page.enable");
  await call("DOM.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: plan.viewport.width, height: plan.viewport.height, deviceScaleFactor: 1, mobile: false });
  await call("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  log(`browser ready (${String(version.product || "").slice(0, 60)})`);
  return { s, call, sessionId, guard, product: String(version.product || "") };
}

async function query(x, selector) {
  const { root } = await x.call("DOM.getDocument", { depth: 0 });
  try {
    const { nodeId } = await x.call("DOM.querySelector", { nodeId: root.nodeId, selector });
    return nodeId || null;
  } catch {
    return null; // an invalid selector finds nothing
  }
}

async function waitSelector(x, selector, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const id = await query(x, selector);
    if (id) return id;
    if (Date.now() > end) return null;
    await sleep(200);
  }
}

async function attrs(x, nodeId) {
  const { node } = await x.call("DOM.describeNode", { nodeId });
  const a = node.attributes || [];
  const out = {};
  for (let k = 0; k + 1 < a.length; k += 2) out[a[k].toLowerCase()] = a[k + 1];
  return out;
}

async function navigateAndSettle(x, url) {
  const loaded = x.s.waitFor((m) => m.sessionId === x.sessionId && m.method === "Page.loadEventFired", 30000, "the page to load");
  loaded.catch(() => {});
  const r = await x.call("Page.navigate", { url });
  if (r.errorText) return false;
  await loaded.catch(() => {});
  return true;
}

// After a click, a navigation may start; give it a moment, then let it load.
async function settle(x) {
  const started = x.s.waitFor((m) => m.sessionId === x.sessionId && m.method === "Page.frameStartedLoading", 600, "a navigation");
  started.catch(() => {});
  try {
    await started;
    await x.s.waitFor((m) => m.sessionId === x.sessionId && m.method === "Page.loadEventFired", 30000, "the page to load").catch(() => {});
  } catch {
    /* no navigation */
  }
}

async function mainOrigin(x) {
  const t = await x.call("Page.getFrameTree");
  try {
    return new URL(t.frameTree.frame.url).origin;
  } catch {
    return null;
  }
}

async function runStep(x, plan, step, outDir) {
  x.guard.blockedDocument = false;
  if (step.do === "navigate") {
    const ok = await navigateAndSettle(x, step.url);
    if (!ok && !x.guard.blockedDocument) throw stepFail("navigation-failed", `step ${step.id}: the page did not load`, { step: step.id });
  } else if (step.do === "click" || step.do === "fill") {
    const nodeId = await query(x, step.selector);
    if (!nodeId) throw stepFail("selector-not-found", `step ${step.id}: nothing on the page matches the selector (signed out? run --sign-in)`, { step: step.id });
    if (step.do === "fill") {
      const a = await attrs(x, nodeId);
      if (a.type?.toLowerCase() === "password" || SECRET_AUTOCOMPLETE.test(a.autocomplete || "") || SECRET_NAME.test(a.name || "") || SECRET_NAME.test(a.id || "")) {
        throw refused("secret-field", `step ${step.id}: the field is a password, one-time-code or similar field; nothing was typed`, { step: step.id });
      }
      await x.call("DOM.focus", { nodeId });
      await x.call("Input.insertText", { text: step.value });
    } else {
      await x.call("DOM.scrollIntoViewIfNeeded", { nodeId });
      const { model } = await x.call("DOM.getBoxModel", { nodeId });
      const c = model.content;
      const px = (c[0] + c[4]) / 2;
      const py = (c[1] + c[5]) / 2;
      for (const type of ["mousePressed", "mouseReleased"]) await x.call("Input.dispatchMouseEvent", { type, x: px, y: py, button: "left", clickCount: 1 });
      await settle(x);
    }
  } else if (step.do === "wait") {
    if (!(await waitSelector(x, step.selector, step.timeout))) throw stepFail("selector-not-found", `step ${step.id}: the selector did not appear in time`, { step: step.id });
  }
  const here = await mainOrigin(x);
  if (x.guard.blockedDocument || !plan.origins.includes(here)) {
    throw refused("origin-not-allowed", `step ${step.id}: the page went to an origin outside allowed_origins; stopped, and no image was written for this step`, { step: step.id });
  }
  const { data } = await x.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const buf = Buffer.from(data, "base64");
  const size = pngSize(buf);
  if (!size || size.width !== plan.viewport.width || size.height !== plan.viewport.height) {
    throw stepFail("screenshot-size", `step ${step.id}: the screenshot is not the plan's viewport size`, { step: step.id });
  }
  const file = join(outDir, `${step.id}.png`);
  writePrivate(file, buf);
  return { step: step.id, file, ...size, sha256: sha256File(file), data_check: DATA_CHECK };
}

export async function capture(opts, log = () => {}, deps = {}) {
  const env = deps.env || process.env;
  if (opts.profiles) return { status: "ok", profiles: listProfiles(env), note: "Ids, sizes and last-used dates only; ow-tools never reads what a profile holds." };
  if (opts.deleteProfile !== undefined) return deleteProfile(opts.deleteProfile, env);
  if (!opts.plan) throw usage("usage: ow-tools capture --plan <plan.json> --out <…>/shots/ [--sign-in] [--timeout SECONDS] | --profiles | --delete-profile <id>");
  let raw;
  try {
    raw = JSON.parse(readFileSync(opts.plan, "utf8"));
  } catch {
    throw usage("could not read a JSON capture plan from --plan");
  }
  const plan = readPlan(raw, { testOrigins: deps.testOrigins || [] });
  if (opts.signIn && !plan.signIn) throw planBad("--sign-in needs sign_in: { url, done_selector } in the plan");
  const timeout = opts.timeout ?? (opts.signIn ? 300 : 120);
  if (!Number.isInteger(timeout) || timeout < 5 || timeout > 590) throw usage("--timeout is 5 to 590 seconds");
  let outDir = null;
  if (plan.steps.length) {
    if (!opts.out) throw usage("--out <…>/shots/ is required when the plan has steps");
    outDir = resolve(opts.out);
    if (basename(outDir) !== "shots") throw refused("not-in-shots-folder", 'screenshots go in a folder named "shots" (e.g. opchain-work/docs/<client>/shots/)');
    assertIgnored(withTmpSiblings(plan.steps.map((s) => join(outDir, `${s.id}.png`))), SHOTS_IGNORE_LINES);
  }
  const binary = findBrowser(deps.browsers || browserCandidates(env), env);
  if (!binary) throw missing("capture needs Chrome or Chromium. Run ow-tools doctor for the exact step.", { missing: ["browser (Chrome or Chromium)"] });
  if (outDir) mkdirSync(outDir, { recursive: true });

  const profileDir = prepareProfile(plan.profile, env);
  const headless = !opts.signIn;
  const b = launchBrowser(binary, browserArgs({ profileDir, headless, viewport: plan.viewport, origins: plan.origins }), { env });
  const images = [];
  let timer;
  let product = "";
  let blocked = 0;
  try {
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(() => reject(stepFail("timeout", `capture stopped after ${timeout} s`)), timeout * 1000);
    });
    const spawnErr = b.spawnError.then((err) => {
      throw failed(`the browser did not start: ${String(err?.code || err).slice(0, 80)}`);
    });
    const exitedEarly = b.exited.then(() => {
      throw stepFail("browser-exited", "the browser closed before the run finished");
    });
    const work = (async () => {
      const x = await session(b, plan, log);
      product = x.product;
      if (opts.signIn) {
        log("sign in in the browser window; ow-tools waits for the page to show you are signed in");
        if (!(await navigateAndSettle(x, plan.signIn.url)) && !x.guard.blockedDocument) throw stepFail("navigation-failed", "the sign-in page did not load");
        if (!(await waitSelector(x, plan.signIn.done, (timeout - 5) * 1000))) throw stepFail("not-signed-in", "the signed-in page never appeared; nothing captured");
      }
      for (const step of plan.steps) {
        log(`step ${step.id} (${step.do})`);
        images.push(await runStep(x, plan, step, outDir));
      }
      blocked = x.guard.blockedOther;
      await b.session.send("Browser.close").catch(() => {});
    })();
    exitedEarly.catch(() => {});
    spawnErr.catch(() => {});
    work.catch(() => {});
    await Promise.race([work, timedOut, spawnErr, b.exited.then(() => work)]);
  } catch (err) {
    if (err && typeof err === "object" && "extra" in err && images.length) err.extra = { ...err.extra, written: images.map((i) => i.file) };
    throw err;
  } finally {
    clearTimeout(timer);
    // Every exit path closes the browser: asked first, then killed.
    if (b.proc.exitCode === null && b.proc.signalCode === null) b.session.send("Browser.close").catch(() => {});
    await Promise.race([b.exited, sleep(3000)]);
    killTree(b.proc);
    await Promise.race([b.exited, sleep(2000)]);
    cleanTempState(profileDir);
    writeFileSync(join(profileDir, LAST_USED), `${localDate()}\n`, { mode: 0o600 });
  }
  return {
    status: "done",
    mode: opts.signIn ? "sign-in" : "capture",
    environment: plan.environment,
    production_decision: plan.decision ? { ...plan.decision, verified: false, label: "as given in the plan; not verified by ow-tools" } : null,
    profile: plan.profile,
    viewport: plan.viewport,
    browser: product.slice(0, 60),
    images,
    blocked_requests: blocked,
    note: "Every image still needs its data check (real customer data, credentials, a person's name, email or photo) before it is used; ow-tools did not do it.",
  };
}

export function captureText(r) {
  if (r.profiles) return r.profiles.length ? r.profiles.map((p) => `${p.id}  ${(p.bytes / 1048576).toFixed(1)} MB  last used ${p.last_used || "unknown"}`).join("\n") : "no capture profiles";
  if (r.status === "deleted") return `Deleted capture profile ${r.id}: ${r.removed} (${(r.bytes / 1048576).toFixed(1)} MB)`;
  const lines = [`Captured ${r.images.length} image(s) in ${r.environment} (${r.mode}, profile ${r.profile}, ${r.viewport.width}×${r.viewport.height}):`];
  for (const i of r.images) lines.push(`  ${i.file}  data check: ${i.data_check}`);
  if (r.production_decision) lines.push(`Production decision: ${r.production_decision.role}, ${r.production_decision.date} (${r.production_decision.label})`);
  if (r.blocked_requests) lines.push(`${r.blocked_requests} request(s) to origins outside the plan were blocked`);
  lines.push(r.note);
  return lines.join("\n");
}

export { CDP_METHODS };
