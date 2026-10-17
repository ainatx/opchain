// Sprint T: T1 `ow-tools capture` (C16–C21) against a stub browser that
// speaks CDP over fds 3/4, plus one real-browser run on a loopback fixture
// that skips (and says so) without Chrome or Chromium.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CDP_METHODS, PREFS, TEMP_STATE, browserCandidates, capture, findBrowser, secretName } from "../../plugins/ow-tools/lib/capture.mjs";
import { ROOT, cleanup, cli, git, gitRepo, has, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
const FIX = join(ROOT, "tests", "fixtures", "ow-tools", "sprint-t");
const FAKE = join(ROOT, "tests", "ow-tools", "fake-browser.mjs");
const NODE_DIR = process.execPath.replace(/\/node$/, "");
const UAT = "https://uat.example.test";

const PAGES = {
  [`${UAT}/login`]: { selectors: { "#account-menu": { attrs: ["id", "account-menu"] } } },
  [`${UAT}/orders`]: { selectors: { "#new-order": { attrs: ["id", "new-order"], navigate: `${UAT}/orders/new` } }, subresources: ["https://cdn.thirdparty.example/lib.js", "https://uat.example.test.evil.org/x.js"] },
  [`${UAT}/orders/new`]: {
    selectors: {
      "#customer": { attrs: ["id", "customer", "name", "customer"] },
      "#field-7": { attrs: ["id", "field-7", "type", "password"] },
      "#code": { attrs: ["id", "code", "autocomplete", "one-time-code"] },
      "#field-a": { attrs: ["name", "otp_code"] },
      "#field-b": { attrs: ["id", "mfaCode"] },
      "#field-c": { attrs: ["name", "password"] },
      "#field-d": { attrs: ["name", "x7", "autocomplete", "cc-number"] },
      "#leave": { attrs: ["id", "leave"], navigate: "https://evil.example.org/" },
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
    expect(start.argv).toEqual(expect.arrayContaining(["--headless", "--no-first-run", "--disable-sync", "--disable-extensions", "--disable-background-networking", "--no-proxy-server"]));
    expect(start.argv.some((a) => /mock-keychain|password-store/.test(a))).toBe(false); // SA-011: the real keychain
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
    expect(r.json.blocked_requests).toBe(2);
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

// ---- Sprint T round 2 -------------------------------------------------------------

describe("round 2: secret fields by their words (Bug 2, C01)", SPAWN, () => {
  it.each([
    "#otp_code", "[name=otp_code]", "#otpCode", "#otp1", "#mfaCode", "input[name=mfa_code]", "input[name=pin_code]", "#pincode", "#one_time_code",
    "#card_number", "#ssn_last4", "#user_pw", "#smsCode", "#verificationCode", "#access_token", "#cvv2", "[data-field=twoFactor]",
  ])("refuses a fill on %s before launch", (selector) => {
    const plan = basePlan();
    plan.steps[2].selector = selector;
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status, selector).toBe(4);
    expect(r.json).toMatchObject({ reason: "secret-field", step: "S-03" });
    expect(t.entries()).toEqual([]);
  });

  it.each([["#field-a", "name=otp_code"], ["#field-b", "id=mfaCode"], ["#field-c", "name=password, no type"], ["#field-d", "autocomplete=cc-number"]])(
    "refuses at run time a field whose attributes say it is secret (%s, %s); nothing typed",
    (selector) => {
      const plan = basePlan();
      plan.steps[2].selector = selector;
      const t = setup({ plan });
      const r = t.run([]);
      expect(r.status).toBe(4);
      expect(r.json).toMatchObject({ reason: "secret-field", step: "S-03" });
      expect(t.entries().some((c) => c.method === "Input.insertText")).toBe(false);
      expect(t.entries().some((c) => c.method === "DOM.describeNode")).toBe(true);
    },
  );

  it("still fills ordinary fields", () => {
    for (const ok of ["#customer", "#shipping_address", "#passenger", "#spinner", "#opinion"]) expect(secretName(ok), ok).toBe(false);
    for (const bad of ["otp", "OTP_CODE", "Password", "one-time-code", "2fa", "ssnLast4"]) expect(secretName(bad), bad).toBe(true);
  });
});

describe("round 2: origins, popups and the plan's text (C06, C07, C14, SA-013, F-021)", SPAWN, () => {
  it("C06: a sub-resource on a look-alike host (uat.example.test.evil.org) is blocked; only exact origins pass", () => {
    const t = setup();
    const r = t.run([]);
    expect(r.status).toBe(0);
    expect(r.json.blocked_requests).toBe(2);
    const failed = t.entries().filter((c) => c.method === "Fetch.failRequest").length;
    expect(failed).toBe(2);
  });

  it("C07: a click that takes the page to another origin stops that step, with no image for it", () => {
    const plan = { ...basePlan(), steps: [{ id: "S-01", do: "navigate", url: `${UAT}/orders/new` }, { id: "S-02", do: "click", selector: "#leave" }] };
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "origin-not-allowed", step: "S-02" });
    expect(existsSync(join(t.out, "S-01.png"))).toBe(true);
    expect(existsSync(join(t.out, "S-02.png"))).toBe(false);
  });

  it("C14: a second window the page opens is closed", () => {
    const t = setup({ browser: { popup: true } });
    expect(t.run([]).status).toBe(0);
    expect(t.entries().find((c) => c.method === "Target.closeTarget")?.params).toEqual({ targetId: "T2" });
  });

  it.each(["https://localhost.", "https://foo.localhost.", "https://[::]", "https://[::ffff:7f00:1]", "https://127.1", "https://0x7f000001", "https://[::1]", "https://LOCALHOST"])(
    "SA-013: refuses the loopback origin %s before launch",
    (o) => {
      const plan = basePlan();
      plan.allowed_origins = [o];
      plan.steps = [{ id: "S-01", do: "navigate", url: `${o}/` }];
      delete plan.sign_in;
      const t = setup({ plan });
      const r = t.run([]);
      expect(r.status, o).toBe(4);
      expect(r.json.reason).toBe("plan-invalid");
      expect(r.json.message).toMatch(/loopback/);
    },
  );

  it.each(["https://169.254.169.254", "https://[fe80::1]", "https://[::ffff:169.254.169.254]"])("refuses the link-local (metadata) origin %s before launch", (o) => {
    const plan = basePlan();
    plan.allowed_origins = [o];
    plan.steps = [{ id: "S-01", do: "navigate", url: `${o}/` }];
    delete plan.sign_in;
    const r = setup({ plan }).run([]);
    expect(r.status).toBe(4);
    expect(r.json.message).toMatch(/link-local or cloud-metadata/);
  });

  it("F-021: an unknown key that isn't a plain word is never echoed", () => {
    const plan = basePlan();
    const key = `x‮zz${"y".repeat(300)}</ow-workstreams>`;
    plan[key] = 1;
    const t = setup({ plan });
    const r = t.run([]);
    expect(r.status).toBe(4);
    expect(r.json.message).toContain("an unknown key");
    expect(r.stdout).not.toMatch(/‮|yyyy|ow-workstreams/);
    plan.steps[0].note = 1;
    delete plan[key];
    expect(setup({ plan }).run([]).json.message).toContain('unknown key "note"');
  });
});

describe("round 2: the profile at rest (SA-011, F-023)", SPAWN, () => {
  const SESSION_FILES = [["Default", "Cookies"], ["Default", "Network", "Cookies"], ["Default", "Local Storage", "leveldb", "000003.log"], ["Default", "IndexedDB", "x"], ["Default", "Service Worker", "Database", "x"], ["Default", "Session Storage", "x"]];
  const plant = (profile) => SESSION_FILES.forEach((p) => write(join(profile, ...p), "session-zq"));
  const present = (profile) => SESSION_FILES.filter((p) => existsSync(join(profile, ...p))).length;
  const production = () => ({ ...basePlan(), environment: "production", decision: { role: "client ops lead", date: "2026-10-15" } });

  it("wipes cookies and site storage after a production run, and says so", () => {
    const t = setup({ plan: production() });
    plant(t.profile);
    const r = t.run([]);
    expect(r.status).toBe(0);
    expect(present(t.profile)).toBe(0);
    expect(r.json.session).toMatch(/^wiped/);
  });

  it("wipes them after a production run that fails, too", () => {
    const t = setup({ plan: production(), browser: { crash: true } });
    plant(t.profile);
    expect(t.run([]).status).toBe(5);
    expect(present(t.profile)).toBe(0);
  });

  it("keeps the session for a test-environment run, and says where", () => {
    const t = setup();
    plant(t.profile);
    const r = t.run([]);
    expect(r.status).toBe(0);
    expect(present(t.profile)).toBe(SESSION_FILES.length);
    expect(r.json.session).toBe(`kept in ${t.profile} (delete with --delete-profile harbor-cafe)`);
  });

  it("F-023: removes the GPU and service-worker caches too, at the start and the end of a run", () => {
    expect(TEMP_STATE).toEqual(expect.arrayContaining([["GPUPersistentCache"], ["Default", "Service Worker", "CacheStorage"]]));
    const t = setup();
    for (const p of [["GPUPersistentCache", "x"], ["Default", "Service Worker", "CacheStorage", "x"]]) write(join(t.profile, ...p), "page content");
    expect(t.run([]).status).toBe(0);
    expect(existsSync(join(t.profile, "GPUPersistentCache"))).toBe(false);
    expect(existsSync(join(t.profile, "Default", "Service Worker", "CacheStorage"))).toBe(false);
  });

  it("SA-011 (real browser): the cookie key isn't the public mock key, and a production run leaves no cookie store", async (ctx) => {
    const sqlite = has("sqlite3");
    if (!real || !sqlite) {
      ctx.skip(`needs Chrome or Chromium and sqlite3 (browser: ${Boolean(real)}, sqlite3: ${sqlite}); real-binary check`);
      return;
    }
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html", "set-cookie": "session=ZQSESSION-4242; Max-Age=3600; Path=/" });
      res.end("<!doctype html><body>hi</body>");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
      const d = tempDir();
      const home = join(d, "home");
      const plan = (env, extra = {}) => write(join(d, `${env}.json`), JSON.stringify({ schema: 1, profile: `cookie-${env}`, environment: env, allowed_origins: [origin], steps: [{ id: "S-01", do: "navigate", url: `${origin}/` }], ...extra }));
      const deps = { testOrigins: [origin], env: { ...process.env, OW_TOOLS_HOME: home } };
      await capture({ plan: plan("test"), out: join(d, "shots"), timeout: 60 }, () => {}, deps);
      const stores = ["Cookies", join("Network", "Cookies")].map((p) => join(home, "capture", "cookie-test", "Default", p)).filter((p) => existsSync(p));
      expect(stores.length).toBeGreaterThan(0);
      const hex = stores.map((db) => spawnSync("sqlite3", [db, "select hex(encrypted_value) from cookies where name='session'"], { encoding: "utf8" }).stdout.trim()).find(Boolean);
      expect(hex, "the page's cookie is in the store").toBeTruthy();
      const enc = Buffer.from(hex, "hex");
      // The fixed key --use-mock-keychain used (the review's PoC). It must not open the cookie now.
      const key = pbkdf2Sync(["mock", "password"].join("_"), "saltysalt", 1003, 16, "sha1");
      let opened = false;
      try {
        const dec = createDecipheriv("aes-128-cbc", key, Buffer.alloc(16, " "));
        opened = Buffer.concat([dec.update(enc.subarray(3)), dec.final()]).toString("latin1").includes("ZQSESSION-4242");
      } catch {
        opened = false;
      }
      expect(opened).toBe(false);
      const r = await capture({ plan: plan("production", { decision: { role: "client ops lead", date: "2026-10-16" } }), out: join(d, "second", "shots"), timeout: 60 }, () => {}, deps);
      expect(r.session).toMatch(/^wiped/);
      for (const p of ["Cookies", join("Network", "Cookies"), "Local Storage"]) expect(existsSync(join(home, "capture", "cookie-production", "Default", p)), p).toBe(false);
    } finally {
      server.close();
    }
  }, 120_000);
});
