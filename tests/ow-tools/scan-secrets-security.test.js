// Security review of ow-tools 1.3.0 `scan-secrets` (OW-06 PR 1, contract § Security review, Part 1),
// 2026-10-21: one PoC per finding (SS-01 to SS-11), report
// docs/audits/2026-10-21-ow-tools-1.3-scan-secrets-security-review.md.
//
// Until a finding is fixed, its PoC asserts today's verdict (the slip), so the suite stays green and the PoC is
// proven to run. When the fix lands, add the finding's id to FIXED: the same PoC must then show the scan catching
// it or, where the agreed fix is a stated residual, the design and the plugin's text saying so. It stays as a
// permanent plant (contract § Security review: "PoCs kept as permanent plants", in a FIXED set as OW-05's).
//
// Real gitleaks and git (skipped, and labelled so, without gitleaks 8.19+ and git 2.45.1+). Fake keys are
// invented and made at run time from a fixed seed: no key-shaped string is committed here. Every repository is
// built with a clean environment (a git hook's GIT_DIR never reaches the layout).
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { inflateSync } from "node:zlib";
import { semverAtLeast } from "../../plugins/ow-tools/lib/core.mjs";
import { GIT_MIN } from "../../plugins/ow-tools/lib/scan-secrets.mjs";
import { BIN, PLUGIN, ROOT, cleanup, tempDir } from "./helpers.js";

afterAll(cleanup);
/** Findings whose fix has landed: their PoCs are plants. All eleven landed in the round-1 fix pass (2026-10-21):
 *  SS-01, SS-05, SS-09, SS-10 and SS-11 in code; SS-02 (OD-1), SS-03, SS-04 (OD-2), SS-06, SS-07 and SS-08 (OD-3)
 *  as stated residuals and qualified claims, with the code parts SS-03 and SS-07 asked for. */
const FIXED = new Set(["SS-01", "SS-02", "SS-03", "SS-04", "SS-05", "SS-06", "SS-07", "SS-08", "SS-09", "SS-10", "SS-11"]);
const fixed = (id) => FIXED.has(id.replace(/[a-z]$/, ""));
const SLOW = { timeout: 120_000 };

// ---- the machine ---------------------------------------------------------------------------------
const whichAll = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { encoding: "utf8" }).stdout.trim();
const REAL_GIT = whichAll("git");
const GIT_VERSION = REAL_GIT ? (spawnSync(REAL_GIT, ["--version"], { encoding: "utf8" }).stdout.match(/(\d+\.\d+\.\d+)/) || [])[1] : null;
const REAL_GL = whichAll("gitleaks");
const GL_VERSION = REAL_GL ? (spawnSync(REAL_GL, ["version"], { encoding: "utf8" }).stdout.match(/(\d+\.\d+\.\d+)/) || [])[1] : null;
const GL_OK = Boolean(GIT_VERSION && semverAtLeast(GIT_VERSION, GIT_MIN) && GL_VERSION && semverAtLeast(GL_VERSION, "8.19.0"));
const NEEDS = GL_OK ? "" : ` [SKIPPED: needs gitleaks 8.19+ and git ${GIT_MIN}+; found gitleaks ${GL_VERSION || "none"}, git ${GIT_VERSION || "none"}]`;
const realIt = (name, fn, opts = SLOW) => it.skipIf(!GL_OK)(`${name}${NEEDS}`, opts, fn);
const NODE_DIR = dirname(process.execPath);
const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

// ---- invented fake keys, made at run time -----------------------------------------------------------
function chars(seed, n, alphabet) {
  let out = "";
  for (let i = 0; out.length < n; i++) for (const b of createHash("sha256").update(`ow-tools-sec-review:${seed}:${i}`).digest()) if (out.length < n) out += alphabet[b % alphabet.length];
  return out;
}
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const aws = (seed) => `${"AK"}${"IA"}${chars(seed, 16, B32)}`;
const ghToken = (seed) => `${"gh"}${"p_"}${chars(seed, 36, ALNUM)}`;
const line = (seed) => `aws_access_key_id = ${aws(seed)}\n`;
const windows = (secret) => Array.from({ length: secret.length - 15 }, (_, i) => secret.slice(4 + i, 16 + i));
const holds = (text, secret) => windows(secret).some((w) => text.includes(w));

// ---- repositories ------------------------------------------------------------------------------------
const LAYOUT_ENV = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_TERMINAL_PROMPT: "0",
  GIT_AUTHOR_NAME: "Fixture Author",
  GIT_AUTHOR_EMAIL: "author@example.invalid",
  GIT_COMMITTER_NAME: "Fixture Author",
  GIT_COMMITTER_EMAIL: "author@example.invalid",
  GIT_AUTHOR_DATE: "2026-10-21T09:00:00Z",
  GIT_COMMITTER_DATE: "2026-10-21T09:00:00Z",
};
const CFG = ["-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", "-c", "init.defaultBranch=main", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "protocol.file.allow=always"];
function g(cwd, ...args) {
  const r = spawnSync(REAL_GIT || "git", [...CFG, ...args], { cwd, env: LAYOUT_ENV, encoding: "utf8", input: "" });
  if (r.status !== 0) throw new Error(`layout: git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}
const gIn = (cwd, input, ...args) => spawnSync(REAL_GIT || "git", [...CFG, ...args], { cwd, env: LAYOUT_ENV, encoding: "utf8", input }).stdout.trim();
function repo(init = []) {
  const dir = join(tempDir("owt-sec-"), "repo");
  mkdirSync(dir);
  g(dir, "init", "-q", ...init);
  return dir;
}
function put(dir, files) {
  for (const [f, t] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), t);
  }
}
function commit(dir, files, msg = "change") {
  put(dir, files);
  g(dir, "add", "-A");
  g(dir, "commit", "-qm", msg);
  return g(dir, "rev-parse", "HEAD");
}
const layout = (files) => {
  const dir = repo();
  commit(dir, files, "first");
  return dir;
};

// ---- the CLI ----------------------------------------------------------------------------------------
function scan(dir, { env = {}, cwd, text = false } = {}) {
  const tmp = tempDir("owt-sec-tmp-");
  const r = spawnSync(BIN, ["scan-secrets", dir, ...(text ? [] : ["--json"])], {
    encoding: "utf8",
    cwd,
    env: { ...process.env, TMPDIR: tmp, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* text mode, or not JSON */
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json, left: readdirSync(tmp) };
}

// ---- what the design and the plugin say ------------------------------------------------------------------
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const DESIGN = () => read("docs/plans/2026-10-09-ow-tools-design.md");
const section = (text, head) => {
  const i = text.indexOf(head);
  if (i < 0) return "";
  const j = text.indexOf("\n### ", i + head.length);
  return text.slice(i, j < 0 ? undefined : j);
};
const RESIDUALS = () => section(DESIGN(), "### 16.3");
const README = () => readFileSync(join(PLUGIN, "README.md"), "utf8");
const SKILL = () => readFileSync(join(PLUGIN, "skills", "ow-tools", "SKILL.md"), "utf8");
const MANIFEST = () => readFileSync(join(PLUGIN, "SECURITY-MANIFEST.md"), "utf8");
/** A fix is either the scan catching it, or (where the owner accepts it) the residual stated in §16.3. */
const caughtOrStated = (r, re) => r.json?.status === "HITS" || re.test(RESIDUALS());

// A control for every "never read" PoC: the same key in an ordinary added file is found, so a CLEAN is the route's
// doing, not the key's.
const control = (seed) => {
  const r = scan(layout({ "settings.ini": line(seed) }));
  expect(r.json?.status, `control for ${seed}: ${r.stdout}`).toBe("HITS");
};

// ── SS-01 (MEDIUM): a type change is filtered out, so a key that replaced a symlink is never read ──────────
describe("SS-01: --diff-filter=tuxdb drops type changes; a key in a file that replaced a symlink is CLEAN", () => {
  realIt("SS-01: a symlink replaced by a regular file holding a key (secrets.ini) is never scanned", () => {
    control("ss01");
    const dir = repo();
    symlinkSync("../shared/secrets.ini", join(dir, "secrets.ini"));
    commit(dir, {}, "link the shared settings");
    rmSync(join(dir, "secrets.ini"));
    const c = commit(dir, { "secrets.ini": line("ss01") }, "settings in the repository");
    expect(g(dir, "show", "--name-status", "--format=", c)).toMatch(/^T\tsecrets\.ini$/m); // git calls it a type change
    const r = scan(dir);
    expect(r.status, r.stdout).toBe(0);
    if (fixed("SS-01")) expect(r.json.rows).toContainEqual(expect.objectContaining({ path: "secrets.ini", commit: c, rule: "aws-access-token" }));
    else expect(r.json.status).toBe("CLEAN");
  });
});

// ── SS-02 (LOW): gitleaks' built-in global allowlist is steered by path names ────────────────────────────
describe("SS-02: the built-in global path allowlist lets a repository hide a key by naming its path", () => {
  for (const [id, file] of [
    ["SS-02a", "gitleaks.toml/prod.env"], // the allowlist regex gitleaks\.toml is unanchored: any path containing it
    ["SS-02b", "deploy/ci-gitleaks.toml.env"],
    ["SS-02c", "app/node_modules/settings/.env"],
    ["SS-02d", "venv/lib/settings.py"],
    ["SS-02e", "credentials.pdf"], // a text file, by extension only
  ]) {
    realIt(`${id}: a key in ${file} is never reported`, () => {
      control(id);
      const r = scan(layout({ [file]: line(id) }));
      expect(r.status, r.stdout).toBe(0);
      if (fixed(id)) {
        expect(caughtOrStated(r, /built-in (global )?(path )?allowlist|gitleaks\\?\.toml|node_modules/i)).toBe(true);
        expect(README()).not.toMatch(/The repository can't switch the scan off/);
      } else expect(r.json.status).toBe("CLEAN");
    });
  }
});

// ── SS-03 (LOW): history the design says is scanned, or doesn't list as a residual, is not ─────────────────
describe("SS-03: history coverage is narrower than the claims", () => {
  realIt("SS-03a: a key added only in an octopus merge (three parents) is never read (remerge skips octopus merges)", () => {
    control("ss03a");
    const dir = layout({ "f.txt": "base\n" });
    g(dir, "checkout", "-qb", "b1");
    commit(dir, { "f1.txt": "1\n" });
    g(dir, "checkout", "-q", "main");
    g(dir, "checkout", "-qb", "b2");
    commit(dir, { "f2.txt": "2\n" });
    g(dir, "checkout", "-q", "main");
    commit(dir, { "fm.txt": "m\n" });
    g(dir, "merge", "-q", "--no-ff", "--no-edit", "b1", "b2");
    put(dir, { "evil.ini": line("ss03a") });
    g(dir, "add", "-A");
    g(dir, "commit", "-q", "--amend", "--no-edit");
    expect(g(dir, "cat-file", "-p", "HEAD").match(/^parent /gm)).toHaveLength(3);
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-03a")) expect(caughtOrStated(r, /octopus/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN");
  });

  realIt("SS-03b: a key in an older stash entry (stash@{1}) is never read; only refs/stash (the newest) is a ref", () => {
    const dir = layout({ "f.txt": "base\n" });
    put(dir, { "f.txt": line("ss03b") });
    g(dir, "stash", "-q");
    put(dir, { "f.txt": "other\n" });
    g(dir, "stash", "-q");
    expect(g(dir, "stash", "list").split("\n")).toHaveLength(2);
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-03b")) expect(caughtOrStated(r, /stash@\{1\}|older stash|stash entr/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN");
  });

  realIt("SS-03c: a ref that points straight at a blob holding a key is skipped by git log --all", () => {
    const dir = layout({ "f.txt": "base\n" });
    const blob = gIn(dir, line("ss03c"), "hash-object", "-w", "--stdin");
    g(dir, "update-ref", "refs/keep/settings", blob);
    const r = scan(dir);
    expect(r.status).toBe(0);
    expect(r.json.refs).toBe(3); // HEAD, main and the blob ref were all copied ...
    if (fixed("SS-03c")) expect(caughtOrStated(r, /(blob|tree)[^.]*\bref|ref[^.]*\b(blob|tree)/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN"); // ... and the blob never read
  });

  realIt("SS-03d: a commit reachable only from ORIG_HEAD (after a reset) is not scanned, and §16.3 names reflogs only", () => {
    const dir = layout({ "f.txt": "base\n" });
    commit(dir, { "f.txt": line("ss03d") }, "key");
    g(dir, "reset", "-q", "--hard", "HEAD~1");
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-03d")) expect(caughtOrStated(r, /ORIG_HEAD|FETCH_HEAD|pseudo-?ref/i)).toBe(true);
    else {
      expect(r.json.status).toBe("CLEAN");
      expect(RESIDUALS()).not.toMatch(/ORIG_HEAD|FETCH_HEAD|pseudo-?ref/i);
    }
  });

  realIt("SS-03e: a repository whose commits have no ref left is CLEAN, with the note that it has no commits", () => {
    const dir = layout({ "settings.ini": line("ss03e") });
    g(dir, "update-ref", "-d", "refs/heads/main");
    expect(g(dir, "count-objects", "-v")).toMatch(/^count: [1-9]/m); // the commit and the key are still there
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-03e")) expect(r.json.status === "CLEAN" ? r.json.note : "").not.toMatch(/no commits/);
    else expect(r.json).toMatchObject({ status: "CLEAN", refs: 0, note: expect.stringMatching(/has no commits/) });
  });

  realIt("SS-03f: a submodule's history is not scanned with its superproject, and the submodule folder is refused with advice that doesn't cover it", () => {
    const sub = layout({ "settings.ini": line("ss03f") });
    const sup = layout({ "f.txt": "base\n" });
    g(sup, "submodule", "-q", "add", sub, "vendor-sub");
    g(sup, "commit", "-qm", "add the submodule");
    const top = scan(sup);
    const inner = scan(join(sup, "vendor-sub"));
    const own = scan(join(sup, ".git", "modules", "vendor-sub"));
    expect(own.json?.status, own.stdout).toBe("HITS"); // the history is on this machine and scannable
    if (fixed("SS-03f")) expect(top.json.status === "HITS" || (/submodule/i.test(RESIDUALS()) && /submodule|\.git\/modules/i.test(`${JSON.stringify(top.json)} ${inner.json?.message}`))).toBe(true);
    else {
      expect(top.json.status).toBe("CLEAN");
      expect(inner.json).toMatchObject({ reason: "repo-not-contained", message: expect.stringMatching(/scan the repository it belongs to/) });
    }
  });
});

// ── SS-04 (LOW): content gitleaks' git mode never reads, not stated ─────────────────────────────────────────
describe("SS-04: binary-looking files and commit messages are never read", () => {
  realIt("SS-04a: a NUL byte before the key makes the file binary to git: CLEAN", () => {
    const r = scan(layout({ "creds.txt": `x\0y\n${line("ss04a")}` }));
    expect(r.status).toBe(0);
    if (fixed("SS-04a")) expect(caughtOrStated(r, /binary|NUL/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN");
  });

  realIt("SS-04b: a UTF-16 settings file (Windows PowerShell 5.1's `>`) is binary to git: CLEAN", () => {
    const text = line("ss04b");
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
    const dir = repo();
    writeFileSync(join(dir, ".env"), utf16);
    g(dir, "add", "-A");
    g(dir, "commit", "-qm", "env");
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-04b")) expect(caughtOrStated(r, /UTF-16|binary/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN");
  });

  realIt("SS-04c: a key only in a commit message or a tag message is never read", () => {
    const dir = repo();
    put(dir, { "f.txt": "base\n" });
    g(dir, "add", "-A");
    g(dir, "commit", "-qm", `deploy with ${line("ss04c").trim()}`);
    g(dir, "tag", "-a", "v1", "-m", line("ss04c-tag"));
    const r = scan(dir);
    expect(r.status).toBe(0);
    if (fixed("SS-04c")) expect(caughtOrStated(r, /commit message|tag message/i)).toBe(true);
    else expect(r.json.status).toBe("CLEAN");
  });
});

// ── SS-05 (LOW): a gitleaks or git the repository controls can still run ─────────────────────────────────────
describe("SS-05: binary lookup trusts PATH folders the repository can control", () => {
  const planted = (dir, where) => {
    const marker = join(tempDir("owt-sec-mark-"), "ran");
    mkdirSync(where, { recursive: true });
    for (const n of ["gitleaks", "git"]) {
      writeFileSync(join(where, n), `#!/bin/sh\necho "${n} $*" >> ${q(marker)}\n[ "$1" = version ] && echo 8.30.1\n[ "$1" = --version ] && echo "git version ${GIT_VERSION || "2.55.0"}"\nexit 0\n`);
      chmodSync(join(where, n), 0o755);
    }
    return marker;
  };

  realIt("SS-05a: an absolute PATH folder inside the repository (direnv's PATH_add bin): its gitleaks and git run before the repository is inspected", () => {
    const dir = layout({ "f.txt": "base\n" });
    const marker = planted(dir, join(dir, "bin"));
    const r = scan(dir, { env: { PATH: `${join(dir, "bin")}:${NODE_DIR}:${dirname(REAL_GIT)}:${dirname(REAL_GL)}:/usr/bin:/bin` } });
    if (fixed("SS-05a")) expect(existsSync(marker), r.stdout).toBe(false);
    else {
      expect(readFileSync(marker, "utf8")).toMatch(/^gitleaks version$/m);
      expect(readFileSync(marker, "utf8")).toMatch(/^git --version$/m);
    }
  });

  realIt("SS-05b: doctor and version --json (ow-handoff's readiness check) run ./gitleaks and ./git from a relative PATH entry, and call scan-secrets ready", () => {
    const dir = layout({ "f.txt": "base\n" });
    const marker = planted(dir, dir);
    const env = { ...process.env, PATH: `.:${NODE_DIR}:/usr/bin:/bin`, OW_TOOLS_HOME: join(tempDir("owt-sec-home-"), "h") };
    const doc = spawnSync(BIN, ["doctor", "--json", "--quick"], { cwd: dir, env, encoding: "utf8" });
    const ver = spawnSync(BIN, ["version", "--json"], { cwd: dir, env, encoding: "utf8" });
    const ran = existsSync(marker) ? readFileSync(marker, "utf8") : "";
    if (fixed("SS-05b")) expect(ran).toBe("");
    else {
      expect(ran).toMatch(/^gitleaks version$/m);
      expect(JSON.parse(doc.stdout).capabilities["scan-secrets"]).toEqual({ ready: true });
      expect(JSON.parse(ver.stdout).capabilities["scan-secrets"]).toEqual({ ready: true });
    }
  });
});

// ── SS-06 (LOW): the scan changes the client's repository (object timestamps) ──────────────────────────────
describe("SS-06: remerge-diff freshens the repository's objects through the alternates", () => {
  realIt("SS-06: a clean merge's objects are re-written by the remerge, so git touches the repository's pack file", () => {
    const dir = layout({ "f.txt": "a\nb\nc\n" });
    g(dir, "checkout", "-qb", "two");
    commit(dir, { "t.txt": "t\n" });
    g(dir, "checkout", "-q", "main");
    commit(dir, { "m.txt": "m\n" });
    g(dir, "merge", "-q", "--no-ff", "--no-edit", "two");
    g(dir, "gc", "-q");
    const old = new Date("2020-01-01T00:00:00Z");
    const objects = [];
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else {
          utimesSync(p, old, old);
          objects.push(p);
        }
      }
    };
    walk(join(dir, ".git", "objects"));
    const r = scan(dir);
    expect(r.json?.status, r.stdout).toBe("CLEAN");
    const touched = objects.filter((p) => statSync(p).mtimeMs > old.getTime() + 1000).map((p) => p.slice(dir.length + 1));
    if (fixed("SS-06")) expect(touched.length === 0 || /timestamp|modification time|mtime|freshen/i.test(MANIFEST())).toBe(true);
    else {
      expect(touched.some((p) => p.endsWith(".pack"))).toBe(true);
      expect(MANIFEST()).toMatch(/Nothing is written in the scanned repository/);
    }
  });
});

// ── SS-07 (LOW): committed secret text reaches the private folder, compressed, unseen by the proofs ─────────
describe("SS-07: git's remerge objects in the private folder hold committed text; the proofs grep raw bytes", () => {
  it("SS-07a: the shipped proof method (raw bytes, latin1) cannot see a key inside a zlib-compressed git object", () => {
    const secret = aws("ss07a");
    const dir = repo();
    const id = gIn(dir, line("ss07a"), "hash-object", "-w", "--stdin");
    const raw = readFileSync(join(dir, ".git", "objects", id.slice(0, 2), id.slice(2)));
    expect(holds(raw.toString("latin1"), secret)).toBe(false); // what leaksInFiles() does
    expect(holds(inflateSync(raw).toString("latin1"), secret)).toBe(true); // what it would need to do
  });

  realIt("SS-07b: during a scan, history.git/objects/tmp_objdir-remerge-diff-* holds the key; §16.3 says a leftover is 'never a match'", () => {
    const secret = aws("ss07b");
    const dir = repo();
    // 300 merges, each conflicting with a side that added the key; the resolution keeps the other side.
    let stream = "";
    let m = 0;
    const blob = (s) => {
      m += 1;
      stream += `blob\nmark :${m}\ndata ${Buffer.byteLength(s)}\n${s}\n`;
      return m;
    };
    const cm = (parents, fm) => {
      m += 1;
      stream += `commit refs/heads/main\nmark :${m}\ncommitter A <a@example.invalid> ${1790000000 + m} +0000\ndata 1\nc\n`;
      if (parents[0]) stream += `from :${parents[0]}\n`;
      for (const p of parents.slice(1)) stream += `merge :${p}\n`;
      stream += `M 644 :${fm} f.txt\n`;
      return m;
    };
    let c = cm([], blob("base\n"));
    for (let i = 0; i < 300; i++) {
      const a = cm([c], blob(`aws_access_key_id = ${secret}\nA${i}\n`));
      const b = cm([c], blob(`B${i}\n`));
      c = cm([a, b], blob(`B${i}\n`));
    }
    const fi = spawnSync(REAL_GIT, ["fast-import", "--quiet"], { cwd: dir, env: LAYOUT_ENV, input: stream });
    expect(fi.status).toBe(0);
    let found = { files: 0, inflated: 0 };
    for (let attempt = 0; attempt < 3 && found.files === 0; attempt++) {
      const tmp = tempDir("owt-sec-tmp-");
      const snap = tempDir("owt-sec-snap-");
      const sh = `"$1" scan-secrets "$2" --json > /dev/null 2>&1 & p=$!\nwhile kill -0 $p 2>/dev/null; do for d in "$3"/ow-tools-scan-*/history.git/objects/tmp_objdir-*; do [ -d "$d" ] && cp -R "$d" "$4"/ 2>/dev/null; done; done\nwait $p`;
      spawnSync("bash", ["-c", sh, "poll", BIN, dir, tmp, snap], { env: { ...process.env, TMPDIR: tmp }, timeout: 100_000 });
      const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
      const files = walk(snap);
      const inflated = files.filter((f) => {
        try {
          return holds(inflateSync(readFileSync(f)).toString("latin1"), secret);
        } catch {
          return false;
        }
      });
      found = { files: files.length, inflated: inflated.length };
      expect(readdirSync(tmp)).toEqual([]); // removed at the end, as designed
    }
    expect(found.files, "the poll caught git's remerge objects").toBeGreaterThan(0);
    expect(found.inflated).toBeGreaterThan(0);
    if (fixed("SS-07")) expect(`${RESIDUALS()}\n${MANIFEST()}`).toMatch(/temporary (merge )?objects|tmp_objdir|remerge objects/i);
    else expect(RESIDUALS()).toMatch(/never a match/);
  });
});

// ── SS-08 (LOW): a secret in a path is printed, and three texts say it never is ───────────────────────────
describe("SS-08: a file or folder name holding a secret is printed verbatim; the claims are absolute", () => {
  realIt("SS-08: a token-shaped folder name reaches stdout in JSON and text mode (and a path-only rule needs no content)", () => {
    const token = ghToken("ss08");
    const dir = layout({ [`keys/${token}/creds.ini`]: line("ss08") });
    const r = scan(dir);
    const t = scan(dir, { text: true });
    const p12 = scan(layout({ [`${ghToken("ss08-p12")}.p12`]: "not a real archive\n" }));
    if (fixed("SS-08")) {
      const claims = !/never what it is/.test(README()) && !/prints or stores a credential or a secret a scan found/.test(SKILL());
      expect(!holds(r.stdout + t.stdout, token) || claims).toBe(true);
    } else {
      expect(holds(r.stdout, token)).toBe(true);
      expect(holds(t.stdout, token)).toBe(true);
      expect(p12.json.rows).toContainEqual(expect.objectContaining({ rule: "pkcs12-file" }));
      expect(holds(p12.stdout, ghToken("ss08-p12"))).toBe(true);
      expect(README()).toMatch(/never what it is/);
    }
  });
});

// ── SS-09 (LOW): refs whose names differ only in case can never be scanned on a case-insensitive volume ──────
const CASE_INSENSITIVE = (() => {
  const d = tempDir("owt-sec-case-");
  writeFileSync(join(d, "A"), "");
  return existsSync(join(d, "a"));
})();
describe("SS-09: the private copy writes loose refs under their own names", () => {
  it.skipIf(!GL_OK || !CASE_INSENSITIVE)(`SS-09: packed refs refs/heads/Secret and refs/heads/secret (or A and a/b) make every scan NOT-CHECKED${CASE_INSENSITIVE ? NEEDS : " [SKIPPED: case-sensitive temp volume]"}`, SLOW, () => {
    const dir = layout({ "f.txt": "base\n" });
    const base = g(dir, "rev-parse", "HEAD");
    g(dir, "checkout", "-qb", "tmp");
    const key = commit(dir, { "k.ini": line("ss09") }, "key");
    g(dir, "checkout", "-q", "main");
    g(dir, "branch", "-qD", "tmp");
    rmSync(join(dir, ".git", "refs", "heads", "main"), { force: true });
    writeFileSync(join(dir, ".git", "packed-refs"), `# pack-refs with: peeled fully-peeled sorted \n${key} refs/heads/Secret\n${base} refs/heads/main\n${base} refs/heads/secret\n`);
    expect(g(dir, "show-ref").split("\n")).toHaveLength(3);
    const r = scan(dir);
    if (fixed("SS-09")) expect(r.json).toMatchObject({ status: "HITS" });
    else expect(r.json).toMatchObject({ result: "NOT-CHECKED", reason: "scan-failed", message: expect.stringMatching(/could not copy the refs/) });
  });
});

// ── SS-10 (INFO): the partial-clone pre-check reads two spellings only (the scan still fails safe, offline) ──
describe("SS-10: promisor = 1 and an included extensions.partialClone pass the text check", () => {
  realIt("SS-10: a lazy-fetch repository the pre-check misses is scan-failed, not history-incomplete; the listener sees nothing", async () => {
    const hits = [];
    const server = createServer((s) => {
      hits.push(Date.now());
      s.destroy();
    });
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    try {
      const dir = layout({ "a.ini": line("ss10"), "b.txt": "x\n" });
      commit(dir, { "b.txt": "y\n" });
      const blob = g(dir, "rev-parse", "HEAD~1:a.ini");
      rmSync(join(dir, ".git", "objects", blob.slice(0, 2), blob.slice(2)));
      g(dir, "config", "core.repositoryformatversion", "1");
      writeFileSync(join(dir, ".git", "config"), `${readFileSync(join(dir, ".git", "config"), "utf8")}[remote "origin"]\n\turl = http://127.0.0.1:${server.address().port}/repo.git\n\tpromisor = 1\n[include]\n\tpath = extra.cfg\n`);
      writeFileSync(join(dir, ".git", "extra.cfg"), "[extensions]\n\tpartialClone = origin\n");
      // Live: plain git in the repository lazily fetches the missing blob from the listener.
      spawnSync(REAL_GIT, ["-c", "protocol.allow=always", "cat-file", "-p", blob], { cwd: dir, env: { ...LAYOUT_ENV, GIT_TERMINAL_PROMPT: "0" }, timeout: 20_000 });
      await new Promise((r) => setTimeout(r, 300));
      expect(hits.length).toBeGreaterThan(0);
      hits.length = 0;
      const r = scan(dir);
      await new Promise((res) => setTimeout(res, 300));
      expect(hits).toEqual([]); // the guarantee that matters holds either way
      expect(r.json.result).toBe("NOT-CHECKED");
      if (fixed("SS-10")) expect(r.json.reason).toBe("history-incomplete");
      else expect(r.json.reason).toBe("scan-failed");
    } finally {
      server.close();
    }
  });
});

// ── SS-11 (INFO): containment stops at .git; packed-refs (and refs/, objects/) can point outside ────────────
describe("SS-11: a symlinked packed-refs outside the repository is followed", () => {
  realIt("SS-11: packed-refs is a symlink to a file outside the folder: read, and the scan reports CLEAN", () => {
    const dir = layout({ "f.txt": "base\n" });
    g(dir, "pack-refs", "--all");
    const outside = join(tempDir("owt-sec-out-"), "packed-refs");
    writeFileSync(outside, readFileSync(join(dir, ".git", "packed-refs")));
    rmSync(join(dir, ".git", "packed-refs"));
    symlinkSync(outside, join(dir, ".git", "packed-refs"));
    const r = scan(dir);
    if (fixed("SS-11")) expect(r.json?.reason === "repo-not-contained" || /packed-refs/i.test(RESIDUALS())).toBe(true);
    else expect(r.json).toMatchObject({ status: "CLEAN", refs: 2 });
  });
});
