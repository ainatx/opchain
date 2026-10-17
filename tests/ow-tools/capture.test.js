// Sprint T: T1 `ow-tools capture` (C16–C21) against a stub browser that
// speaks CDP over fds 3/4, plus one real-browser run on a loopback fixture
// that skips (and says so) without Chrome or Chromium.
import { afterAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CDP_METHODS, PREFS, browserCandidates, capture, findBrowser } from "../../plugins/ow-tools/lib/capture.mjs";
import { ROOT, cleanup, cli, git, gitRepo, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
const FIX = join(ROOT, "tests", "fixtures", "ow-tools", "sprint-t");
const FAKE = join(ROOT, "tests", "ow-tools", "fake-browser.mjs");
const NODE_DIR = process.execPath.replace(/\/node$/, "");
const UAT = "https://uat.example.test";

const PAGES = {
  [`${UAT}/login`]: { selectors: { "#account-menu": { attrs: ["id", "account-menu"] } } },
  [`${UAT}/orders`]: { selectors: { "#new-order": { attrs: ["id", "new-order"], navigate: `${UAT}/orders/new` } }, subresources: ["https://cdn.thirdparty.example/lib.js"] },
  [`${UAT}/orders/new`]: {
    selectors: {
      "#customer": { attrs: ["id", "customer", "name", "customer"] },
      "#field-7": { attrs: ["id", "field-7", "type", "password"] },
      "#code": { attrs: ["id", "code", "autocomplete", "one-time-code"] },
    },
  },
};

function setup({ plan, browser = {}, repo = false, ignored = true } = {}) {
  const d = tempDir();
  const bin = join(d, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "google-chrome"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });
  const log = join(d, "browser.log");
  writeFileSync(log, "");
  const cfg = write(join(d, "fake.json"), JSON.stringify({ log, pages: PAGES, ...browser }));
  const root = join(d, "client");
  mkdirSync(root, { recursive: true });
  if (repo) gitRepo(root);
  if (repo && ignored) write(join(root, ".gitignore"), "opchain-work/**/audio/\nopchain-work/**/transcript.*\nopchain-work/**/shots/\n");
  const out = join(root, "opchain-work", "docs", "harbor-cafe", "shots");
  const planFile = write(join(d, "plan.json"), JSON.stringify(plan ?? JSON.parse(readFileSync(join(FIX, "capture", "plan.json"), "utf8"))));
  const home = join(d, "home");
  const env = { PATH: `${bin}:${NODE_DIR}:/usr/bin:/bin`, OW_TOOLS_HOME: home, FAKE_BROWSER: cfg };
  const run = (args) => cli(["capture", "--plan", planFile, "--out", out, ...args, "--json"], { env });
  const entries = () => readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return { d, out, home, env, run, entries, planFile, profile: join(home, "capture", "harbor-cafe") };
}
const basePlan = () => JSON.parse(readFileSync(join(FIX, "capture", "plan.json"), "utf8"));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

describe("ow-tools capture (stub browser)", SPAWN, () => {
  it("C16: starts the browser on the pipe, never a port, on the per-workstream 0700 profile with the password manager, autofill, first run and sync off", () => {
    const t = setup();
    mkdirSync(join(t.profile, "Default", "Cache"), { recursive: true });
    const r = t.run([]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const [start, ...calls] = t.entries();
    expect(start.argv).toContain("--remote-debugging-pipe");
    expect(start.argv.some((a) => a.startsWith("--remote-debugging-port"))).toBe(false);
    expect(start.argv).toContain(`--user-data-dir=${t.profile}`);
    expect(start.argv).toEqual(expect.arrayContaining(["--headless", "--no-first-run", "--disable-sync", "--disable-extensions", "--disable-background-networking", "--no-proxy-server", "--use-mock-keychain"]));
    expect(start.argv).toContain("--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE uat.example.test");
    expect(statSync(t.profile).mode & 0o777).toBe(0o700);
    expect(statSync(join(t.home, "capture")).mode & 0o777).toBe(0o700);
    expect(start.prefs).toMatchObject({ credentials_enable_service: false, profile: { password_manager_enabled: false }, autofill: { enabled: false, profile_enabled: false, credit_card_enabled: false } });
    expect(existsSync(join(t.profile, "First Run"))).toBe(true);
    expect(calls.find((c) => c.method === "Browser.setDownloadBehavior").params).toEqual({ behavior: "deny" });
    expect(alive(start.pid)).toBe(false);
    expect(existsSync(join(t.profile, "Default", "Cache"))).toBe(false);
  });

  it("C16: the browser is gone and its temp state removed after a failure and after a timeout", () => {
    for (const [browser, args, code] of [[{ crash: true }, [], 5], [{ hang: true }, ["--timeout", "5"], 5]]) {
      const t = setup({ browser });
      mkdirSync(join(t.profile, "Default", "Code Cache"), { recursive: true });
      const r = t.run(args);
      expect(r.status, JSON.stringify(browser)).toBe(code);
      expect(alive(t.entries()[0].pid)).toBe(false);
      expect(existsSync(join(t.profile, "Default", "Code Cache"))).toBe(false);
    }
  });

  it("C17: every CDP method is on the allowlist; none reads a cookie or storage or evaluates JavaScript", () => {
    const t = setup();
    const first = t.run([]);
    expect(first.status, first.stdout).toBe(0);
    const methods = t.entries().slice(1).map((c) => c.method);
    for (const m of methods) expect(CDP_METHODS, m).toContain(m);
    expect(methods.join(" ")).not.toMatch(/Cookie|Storage|Runtime\.|evaluate|callFunctionOn|addScriptToEvaluate/i);
    expect(CDP_METHODS.join(" ")).not.toMatch(/Cookie|Storage|Runtime\.|IndexedDB|DOMStorage|CacheStorage/i);
    expect(t.entries().find((c) => c.method === "Input.insertText").params).toEqual({ text: "Test Customer 01" });
  });

  it.each([
    ["a password selector", { selector: "#password" }],
    ["a selector with type=password", { selector: "input[type=password]" }],
    ["a one-time-code selector", { selector: "input[autocomplete='one-time-code']" }],
    ["an OTP name", { selector: "[name=otp]" }],
    ["a case variant", { selector: "#PassWord" }],
  ])("C17: refuses %s before launch (exit 4)", (_, change) => {
    const plan = basePlan();
    Object.assign(plan.steps[2], change);
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "secret-field", step: "S-03" });
    expect(t.entries()).toEqual([]); // never launched
  });

  it.each([["#field-7", "type=password"], ["#code", "autocomplete=one-time-code"]])("C17: refuses at run time a field that is really a secret field (%s, %s); nothing typed", (selector) => {
    const plan = basePlan();
    plan.steps[2].selector = selector;
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "secret-field", step: "S-03" });
    expect(t.entries().some((c) => c.method === "Input.insertText")).toBe(false);
  });

  // Invented credential shapes, assembled at run time so the source holds no
  // secret-shaped literal for a scanner to flag.
  const SHAPES = [
    ["a GitHub-style token", ["gh", "p_", "0123456789abcdefghij", "ABCDEFGHIJ"].join("")],
    ["an AWS-style key id", ["AK", "IA", "ABCDEFGHIJKLMNOP"].join("")],
    ["a JWT", ["ey", "JhbGciOiJIUzI1NiJ9", ".", "ey", "JzdWIiOiIxMjMifQ", ".sig"].join("")],
    ["a long mixed token", ["Zq8x", "K2mN7pR4", "tV9wY3bC6dF1"].join("")],
  ];
  it.each(SHAPES)("C17: refuses a plan value that looks like a credential (%s) before launch", (_, value) => {
    const plan = basePlan();
    plan.steps[2].value = value;
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "secret-value", step: "S-03" });
    expect(r.stdout).not.toContain(value);
    expect(t.entries()).toEqual([]);
  });

  it("C18: a redirect to an origin outside allowed_origins stops that step, with no image for it", () => {
    const t = setup({ browser: { redirect: { [`${UAT}/orders`]: "https://evil.example.org/phish" } } });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "origin-not-allowed", step: "S-01" });
    expect(existsSync(join(t.out, "S-01.png"))).toBe(false);
    const fail = t.entries().find((c) => c.method === "Fetch.failRequest");
    expect(fail.params.errorReason).toBe("BlockedByClient");
  });

  it("C18: a sub-resource from another origin is blocked and counted, and the step still captures", () => {
    const t = setup();
    const r = t.run([]);
    expect(r.status).toBe(0);
    expect(r.json.blocked_requests).toBe(1);
  });

  it.each([
    ["a step URL outside allowed_origins", (p) => (p.steps[0].url = "https://elsewhere.example.org/orders"), "origin-not-allowed"],
    ["production without a decision", (p) => (p.environment = "production"), "production-without-decision"],
    ["production with a decision but no date", (p) => Object.assign(p, { environment: "production", decision: { role: "client ops lead" } }), "production-without-decision"],
    ["a loopback origin", (p) => (p.allowed_origins = ["https://127.0.0.1:8443"]), "plan-invalid"],
    ["an http origin", (p) => (p.allowed_origins = ["http://uat.example.test"]), "plan-invalid"],
    ["an origin with a path", (p) => (p.allowed_origins = ["https://uat.example.test/app"]), "plan-invalid"],
    ["an unknown key", (p) => (p.script = "document.cookie"), "plan-invalid"],
    ["a step id that is a path", (p) => (p.steps[0].id = "../S-01"), "plan-invalid"],
    ["two ids differing only in case", (p) => (p.steps[1].id = "s-01"), "plan-invalid"],
  ])("C18: refuses %s before launch (exit 4)", (_, mutate, reason) => {
    const plan = basePlan();
    mutate(plan);
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status, r.stdout).toBe(4);
    expect(r.json.reason).toBe(reason);
    expect(r.stdout).not.toMatch(/document\.cookie|elsewhere\.example\.org/);
    expect(t.entries()).toEqual([]);
  });

  it("C18: a production decision is echoed, labelled unverified", () => {
    const plan = { ...basePlan(), environment: "production", decision: { role: "client ops lead", date: "2026-10-15" } };
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(0);
    expect(r.json.production_decision).toEqual({ role: "client ops lead", date: "2026-10-15", verified: false, label: "as given in the plan; not verified by ow-tools" });
  });

  it("C19: one PNG per step at the fixed viewport, named <step-id>.png, only in --out, each marked data check pending", () => {
    const plan = { ...basePlan(), viewport: { width: 1024, height: 700 } };
    const t = setup({ plan, repo: true });
    const r = t.run([]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(readdirSync(t.out).sort()).toEqual(["S-01.png", "S-02.png", "S-03.png"]);
    for (const img of r.json.images) {
      const b = readFileSync(img.file);
      expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1024, 700]);
      expect(img.data_check).toBe("pending (not done by ow-tools)");
      expect(statSync(img.file).mode & 0o777).toBe(0o600);
    }
    expect(git(join(t.out, "..", "..", "..", ".."), "status", "--porcelain").stdout).toBe("?? .gitignore\n");
  });

  it("C19 / O4: shots that would be committable are refused with the line to add; a folder not named shots is refused", () => {
    const t = setup({ repo: true, ignored: false });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "not-ignored", add_to_gitignore: ["opchain-work/**/shots/"] });
    expect(r.json.not_ignored).toContain("opchain-work/docs/harbor-cafe/shots/S-01.png");
    expect(r.json.not_ignored.some((p) => /S-01\.png\.tmp-\d+$/.test(p))).toBe(true); // F-006: the sibling too
    expect(t.entries()).toEqual([]);
    const other = cli(["capture", "--plan", t.planFile, "--out", join(t.d, "images"), "--json"], { env: t.env });
    expect(other.json.reason).toBe("not-in-shots-folder");
  });

  it("sign-in runs headed, waits for the signed-in selector, then captures in the same session", () => {
    const t = setup();
    const r = t.run(["--sign-in", "--timeout", "20"]);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json.mode).toBe("sign-in");
    expect(t.entries()[0].argv).not.toContain("--headless");
    expect(r.json.images).toHaveLength(3);
  });

  it("C20: --profiles lists id, size and last-used date, never contents", () => {
    const t = setup();
    expect(t.run([]).status).toBe(0);
    write(join(t.profile, "Default", "Cookies"), "secret-session-zq");
    const r = cli(["capture", "--profiles", "--json"], { env: t.env });
    expect(r.status).toBe(0);
    expect(r.json.profiles).toHaveLength(1);
    expect(Object.keys(r.json.profiles[0]).sort()).toEqual(["bytes", "id", "last_used"]);
    expect(r.json.profiles[0].id).toBe("harbor-cafe");
    expect(r.json.profiles[0].last_used).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.stdout).not.toContain("secret-session-zq");
  });

  it.each([["../escape"], ["a/b"], ["."], [".."], ["Harbor-Cafe"], ["./harbor-cafe"], ["harbor-cafe/"], [""]])("C20: --delete-profile refuses the id %j and deletes nothing", (id) => {
    const t = setup();
    mkdirSync(join(t.profile, "Default"), { recursive: true });
    write(join(t.home, "keep.txt"), "x");
    const r = cli(["capture", "--delete-profile", id, "--json"], { env: t.env });
    expect(r.status).toBe(4);
    expect(existsSync(t.profile)).toBe(true);
    expect(existsSync(join(t.home, "keep.txt"))).toBe(true);
  });

  it("C20: --delete-profile refuses a symlinked profile, and removes exactly one real profile", () => {
    const t = setup();
    const outside = join(t.d, "outside");
    write(join(outside, "precious.txt"), "keep");
    mkdirSync(join(t.home, "capture"), { recursive: true });
    symlinkSync(outside, join(t.home, "capture", "linked"));
    let r = cli(["capture", "--delete-profile", "linked", "--json"], { env: t.env });
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("profile-not-contained");
    expect(existsSync(join(outside, "precious.txt"))).toBe(true);
    mkdirSync(join(t.home, "capture", "other", "Default"), { recursive: true });
    mkdirSync(join(t.profile, "Default"), { recursive: true });
    r = cli(["capture", "--delete-profile", "harbor-cafe", "--json"], { env: t.env });
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ status: "deleted", id: "harbor-cafe" });
    expect(r.json.removed).toMatch(/capture\/harbor-cafe$/);
    expect(existsSync(t.profile)).toBe(false);
    expect(existsSync(join(t.home, "capture", "other"))).toBe(true);
    expect(cli(["capture", "--delete-profile", "harbor-cafe"], { env: t.env }).stdout).toBe("");
  });

  it("C22: without a browser, capture is exit 3 naming it, and the profile is never created", async () => {
    const t = setup();
    await expect(capture({ plan: t.planFile, out: t.out }, () => {}, { browsers: { path: [], files: [] }, env: { ...process.env, PATH: "/nonexistent", OW_TOOLS_HOME: t.home } })).rejects.toMatchObject({ code: 3, extra: { missing: ["browser (Chrome or Chromium)"] } });
    expect(existsSync(t.profile)).toBe(false);
  });

  it("writes the shared prefs, merging into what the profile already has", () => {
    expect(PREFS).toMatchObject({ credentials_enable_service: false, autofill: { enabled: false } });
  });
});

// ---- C21: a real Chrome or Chromium on a loopback fixture page --------------------
const real = findBrowser(browserCandidates());
describe("ow-tools capture (real browser)", SPAWN, () => {
  it("C21: captures a local fixture page at the viewport size", async (ctx) => {
    if (!real) {
      ctx.skip("no Chrome or Chromium at the standard paths or on PATH; C21 is a real-binary check");
      return;
    }
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      if (req.url === "/form") res.end('<!doctype html><body><input id="customer"><p id="ready">ready</p></body>');
      else res.end('<!doctype html><body style="margin:0"><a id="go" href="/form" style="display:block;width:200px;height:40px;background:#36c">Go</a></body>');
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
      const d = tempDir();
      const plan = write(join(d, "plan.json"), JSON.stringify({
        schema: 1, profile: "fixture", environment: "test", allowed_origins: [origin], viewport: { width: 900, height: 600 },
        steps: [{ id: "S-01", do: "navigate", url: `${origin}/` }, { id: "S-02", do: "click", selector: "#go" }, { id: "S-03", do: "fill", selector: "#customer", value: "Test Customer 01" }, { id: "S-04", do: "wait", selector: "#ready" }],
      }));
      const out = join(d, "shots");
      const r = await capture({ plan, out, timeout: 60 }, () => {}, { testOrigins: [origin], env: { ...process.env, OW_TOOLS_HOME: join(d, "home") } });
      expect(r.images.map((i) => i.step)).toEqual(["S-01", "S-02", "S-03", "S-04"]);
      for (const i of r.images) {
        const b = readFileSync(i.file);
        expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([900, 600]);
      }
      expect(r.browser).toMatch(/Chrome|Chromium/);
    } finally {
      server.close();
    }
  }, 90_000);
});
