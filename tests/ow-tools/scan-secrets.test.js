// ow-tools 1.3.0 `scan-secrets` (design §5.5, §16; OW-06 contract C8 and
// § Security review, Part 1). Three halves:
//   - stub gitleaks (always run): the redaction gate, the strict row pattern,
//     exit codes, the argv and environment ow-tools passes, signals, the
//     timeout and a killed run's leftovers;
//   - the repository checks and the hostile-repository PoCs that need only git;
//   - real gitleaks (skipped, and labelled so, when gitleaks 8.19+ is absent):
//     HITS and CLEAN on run-time fake keys, every allowlist and git-config
//     route a repository could use to hide a key or run code, and redaction
//     proofs that grep every output channel and every file ow-tools and
//     gitleaks wrote.
// Fake keys are invented and generated at run time from a fixed seed, so no
// key-shaped string is ever committed here; every repository is built at
// layout time with a fixed author and date and no signing or hooks.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { semverAtLeast } from "../../plugins/ow-tools/lib/core.mjs";
import {
  GITLEAKS_CONFIG,
  GIT_CONFIG,
  GIT_MIN,
  LEAKS_EXIT,
  LOG_OPTS,
  PRIVATE_PREFIX,
  REPORT_TEMPLATE,
  TEMPLATE_FILE,
  gitEnv,
  parseReport,
  readTemplate,
  sweepStale,
} from "../../plugins/ow-tools/lib/scan-secrets.mjs";
import { BIN, PLUGIN, ROOT, cleanup, tempDir } from "./helpers.js";

const SLOW = { timeout: 120_000 };
afterAll(cleanup);

// ---- the machine ------------------------------------------------------------------
const whichAll = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { encoding: "utf8" }).stdout.trim();
const REAL_GIT = whichAll("git");
const GIT_VERSION = REAL_GIT ? (spawnSync(REAL_GIT, ["--version"], { encoding: "utf8" }).stdout.match(/(\d+\.\d+\.\d+)/) || [])[1] : null;
const GIT_OK = Boolean(GIT_VERSION && semverAtLeast(GIT_VERSION, GIT_MIN));
const REAL_GL = whichAll("gitleaks");
const GL_VERSION = REAL_GL ? (spawnSync(REAL_GL, ["version"], { encoding: "utf8" }).stdout.match(/(\d+\.\d+\.\d+)/) || [])[1] : null;
const GL_OK = GIT_OK && Boolean(GL_VERSION && semverAtLeast(GL_VERSION, "8.19.0"));
const NEEDS_GIT = GIT_OK ? "" : ` [SKIPPED: needs git ${GIT_MIN}+, found ${GIT_VERSION || "none"}]`;
const NEEDS_GL = GL_OK ? "" : ` [SKIPPED: needs gitleaks 8.19+ and git ${GIT_MIN}+; found gitleaks ${GL_VERSION || "none"}, git ${GIT_VERSION || "none"}]`;
const gitIt = (name, fn, opts = SLOW) => it.skipIf(!GIT_OK)(`${name}${NEEDS_GIT}`, opts, fn);
const realIt = (name, fn, opts = SLOW) => it.skipIf(!GL_OK)(`${name}${NEEDS_GL}`, opts, fn);
const FENCE = join(ROOT, "tests", "ow-tools", "fence.mjs");

// ---- invented fake keys, made at run time ---------------------------------------------
function chars(seed, n, alphabet) {
  let out = "";
  for (let i = 0; out.length < n; i++) for (const b of createHash("sha256").update(`ow-tools-fixture:${seed}:${i}`).digest()) if (out.length < n) out += alphabet[b % alphabet.length];
  return out;
}
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = "0123456789";
const PARTS = {
  aws: chars("aws", 16, B32),
  github: chars("github", 36, ALNUM),
  stripe: chars("stripe", 24, ALNUM),
  slack: [chars("slack-a", 12, DIGITS), chars("slack-b", 12, DIGITS), chars("slack-c", 24, ALNUM)],
  pem: [0, 1, 2, 3].map((i) => chars(`pem-${i}`, 64, `${ALNUM}+/`)),
  env: chars("env", 16, B32),
  merge: chars("merge", 36, ALNUM),
};
const FAKE = {
  aws: `${"AK"}${"IA"}${PARTS.aws}`,
  github: `${"gh"}${"p_"}${PARTS.github}`,
  stripe: `${"sk_"}${"live_"}${PARTS.stripe}`,
  slack: `${"xo"}${"xb-"}${PARTS.slack.join("-")}`,
  pem: [`-----BEGIN ${"RSA PRIVATE"} KEY-----`, ...PARTS.pem, `-----END ${"RSA PRIVATE"} KEY-----`].join("\n"),
  env: `${"AK"}${"IA"}${PARTS.env}`,
  merge: `${"gh"}${"p_"}${PARTS.merge}`,
};
// Every 12-character window of every generated part: a secret, part of one, or
// a partly redacted one (gitleaks --redact=N) all fail.
const WINDOWS = Object.values(PARTS).flat().flatMap((p) => Array.from({ length: p.length - 11 }, (_, i) => p.slice(i, i + 12)));
function leaks(text) {
  return WINDOWS.filter((w) => text.includes(w));
}
function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}
function leaksInFiles(dir) {
  return filesUnder(dir).filter((f) => leaks(readFileSync(f, "latin1")).length > 0);
}

// ---- repositories, built at layout time ---------------------------------------------
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
  GIT_AUTHOR_DATE: "2026-10-20T09:00:00Z",
  GIT_COMMITTER_DATE: "2026-10-20T09:00:00Z",
};
const LAYOUT_CFG = ["-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", "-c", "init.defaultBranch=main", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false"];
function g(cwd, ...args) {
  const r = spawnSync(REAL_GIT || "git", [...LAYOUT_CFG, ...args], { cwd, env: LAYOUT_ENV, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`layout: git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}
function put(dir, files) {
  for (const [f, t] of Object.entries(files)) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), t);
  }
}
// A repository with one commit of `files`; returns its folder and that commit.
function layout(files, { init = [] } = {}) {
  const dir = join(tempDir("owt-scan-"), "repo");
  mkdirSync(dir);
  g(dir, "init", "-q", ...init);
  put(dir, files);
  g(dir, "add", "-A");
  g(dir, "commit", "-qm", "first");
  return { dir, first: g(dir, "rev-parse", "HEAD") };
}
const commitAll = (dir, msg) => {
  g(dir, "add", "-A");
  g(dir, "commit", "-qm", msg);
  return g(dir, "rev-parse", "HEAD");
};
const AWS_FILE = () => ({ "config/settings.ini": `[cloud]\nregion = eu-west-1\naws_access_key_id = ${FAKE.aws}\n` });

// ---- the CLI ---------------------------------------------------------------------------
const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;
// Each run gets its own TMPDIR, so the test can see what was left behind.
function scan(repo, { path, env = {}, args = [], cwd } = {}) {
  const tmp = tempDir("owt-tmp-");
  const r = spawnSync(BIN, ["scan-secrets", repo, "--json", ...args], {
    encoding: "utf8",
    cwd,
    env: { ...process.env, TMPDIR: tmp, ...(path ? { PATH: path } : {}), ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* not JSON */
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json, tmp, left: readdirSync(tmp) };
}
const textScan = (repo, o = {}) => {
  const tmp = tempDir("owt-tmp-");
  const r = spawnSync(BIN, ["scan-secrets", repo], { encoding: "utf8", env: { ...process.env, TMPDIR: tmp, ...(o.path ? { PATH: o.path } : {}) } });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, left: readdirSync(tmp) };
};
// A PATH folder with this machine's git and node and nothing else (Homebrew's
// bin folder would bring the real gitleaks along).
let toolsBin = null;
function tools() {
  if (toolsBin) return toolsBin;
  toolsBin = join(tempDir("owt-tools-"), "bin");
  mkdirSync(toolsBin);
  if (REAL_GIT) symlinkSync(REAL_GIT, join(toolsBin, "git"));
  symlinkSync(process.execPath, join(toolsBin, "node"));
  return toolsBin;
}

// ---- a stub gitleaks ------------------------------------------------------------------
const HELP_FLAGS = ["--log-opts", "--config", "--exit-code", "--gitleaks-ignore-path", "--ignore-gitleaks-allow", "--no-banner", "--redact", "--report-format", "--report-path", "--report-template"];
function helpText(flags = HELP_FLAGS) {
  return `scan git repositories for secrets\n\nUsage:\n  gitleaks git [flags] [repo]\n\nFlags:\n${flags.map((f) => `      ${f} string   about ${f}`).join("\n")}\n`;
}
// o: version, help, rows (report text), exit, leak (print and drop the fake
// keys), git ("ok" | "fail" | "none"), sleep, record (dir for argv, env,
// config and template copies, the pid, a started marker).
function stubGitleaks(o = {}) {
  const dir = tempDir("owt-stub-");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const rec = o.record || join(dir, "rec");
  mkdirSync(rec, { recursive: true });
  writeFileSync(join(dir, "help.txt"), o.help ?? helpText());
  writeFileSync(join(dir, "rows.txt"), o.rows ?? "");
  writeFileSync(join(dir, "leak.txt"), Object.values(FAKE).join("\n"));
  const lines = [
    "#!/bin/sh",
    `case "$1" in version) echo ${q(o.version ?? "8.30.1")}; exit 0;; esac`,
    `if [ "$1" = git ] && [ "$2" = --help ]; then cat ${q(join(dir, "help.txt"))}; exit 0; fi`,
    `echo $$ > ${q(join(rec, "pid"))}`,
    `printf '%s\\n' "$@" > ${q(join(rec, "argv"))}`,
    `env > ${q(join(rec, "env"))}`,
    'report=""; tmpl=""; cfg=""; logopts=""; prev=""; target=""',
    'for a in "$@"; do case "$prev" in --report-path) report="$a";; --report-template) tmpl="$a";; --config) cfg="$a";; --log-opts) logopts="$a";; esac; prev="$a"; target="$a"; done',
    `[ -n "$tmpl" ] && cp "$tmpl" ${q(join(rec, "template"))}`,
    `[ -n "$cfg" ] && cp "$cfg" ${q(join(rec, "config"))}`,
    o.git === "none" ? "" : o.git === "fail" ? 'git -C "$target/missing" log -p -U0 $logopts > /dev/null 2>&1' : 'git -C "$target" log -p -U0 $logopts > /dev/null 2>&1',
    o.leak ? `cat ${q(join(dir, "leak.txt"))}; cat ${q(join(dir, "leak.txt"))} >&2; cp ${q(join(dir, "leak.txt"))} ./scanner-leak.txt; cp ${q(join(dir, "leak.txt"))} "$(dirname "$report")/scanner-leak.txt"` : "",
    o.noReport ? "" : `cat ${q(join(dir, "rows.txt"))} > "$report"`,
    `: > ${q(join(rec, "started"))}`,
    o.sleep ? `sleep ${o.sleep}` : "",
    `exit ${o.exit ?? (o.rows ? LEAKS_EXIT : 0)}`,
  ];
  writeFileSync(join(bin, "gitleaks"), `${lines.filter(Boolean).join("\n")}\n`);
  chmodSync(join(bin, "gitleaks"), 0o755);
  return { bin, rec, path: `${bin}:${tools()}:/usr/bin:/bin` };
}
// The real gitleaks behind a wrapper that keeps a copy of ow-tools' private
// folder (report included) as it was when gitleaks finished, for the
// redaction proofs.
function realWrapper() {
  const dir = tempDir("owt-real-");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const capture = join(dir, "capture");
  writeFileSync(
    join(bin, "gitleaks"),
    [
      "#!/bin/sh",
      'report=""; prev=""; for a in "$@"; do [ "$prev" = --report-path ] && report="$a"; prev="$a"; done',
      `${q(REAL_GL)} "$@"`,
      "rc=$?",
      `[ -n "$report" ] && cp -R "$(dirname "$report")" ${q(capture)}`,
      "exit $rc",
      "",
    ].join("\n"),
  );
  chmodSync(join(bin, "gitleaks"), 0o755);
  return { path: `${bin}:${tools()}:/usr/bin:/bin`, capture };
}
const row = (path, commit, line, rule) => `${JSON.stringify(path)}\t${commit}\t${line}\t"${rule}"\n`;
const SHA = "a".repeat(40);

// =========================================================================================
describe("scan-secrets: the report and its row pattern", () => {
  it("parses strict rows, decodes only \\\" and \\\\, de-duplicates and sorts", () => {
    const text = row("b.txt", SHA, 3, "aws-access-token") + row('we"ird\\name.txt', SHA, 1, "github-pat") + row("b.txt", SHA, 3, "aws-access-token") + row("a dir/é.txt", "b".repeat(64), 0, "private-key");
    expect(parseReport(text)).toEqual([
      { path: "a dir/é.txt", commit: "b".repeat(64), line: 0, rule: "private-key" },
      { path: "b.txt", commit: SHA, line: 3, rule: "aws-access-token" },
      { path: 'we"ird\\name.txt', commit: SHA, line: 1, rule: "github-pat" },
    ]);
    expect(parseReport("")).toEqual([]);
  });

  it("fails a row with any other escape, a control or format character, an extra column or a bad field", () => {
    const bad = [
      '"x\\ny.txt"\t' + SHA + '\t1\t"r"', // newline escape
      '"x\\ty.txt"\t' + SHA + '\t1\t"r"', // tab escape
      '"x\\u202ey.txt"\t' + SHA + '\t1\t"r"', // a bidi control
      '"x\\x00.txt"\t' + SHA + '\t1\t"r"',
      `"x.txt"\t${SHA}\t1\t"r"\t${FAKE.aws}`, // the match as an extra column
      `"x.txt"\t${SHA}\t1\t"${FAKE.aws}"`, // the match as a rule id
      `"x.txt"\t${SHA}\t1\t"${FAKE.github}"`,
      `"x.txt"\t${FAKE.aws}\t1\t"r"`, // the match as a commit
      `"x.txt"\t${SHA.slice(1)}\t1\t"r"`,
      `"x.txt"\t${SHA}\t01\t"r"`,
      `"x.txt"\t${SHA}\t-1\t"r"`,
      `x.txt\t${SHA}\t1\t"r"`, // unquoted
      `"/etc/x"\t${SHA}\t1\t"r"`, // absolute
      `"a/../b"\t${SHA}\t1\t"r"`,
      `"a//b"\t${SHA}\t1\t"r"`,
      `"${"x".repeat(1025)}"\t${SHA}\t1\t"r"`,
      ` "x.txt"\t${SHA}\t1\t"r"`,
      `"x.txt" ${SHA} 1 "r"`,
    ];
    for (const b of bad) expect(parseReport(`${row("ok.txt", SHA, 1, "r")}${b}\n`), b.slice(0, 40)).toEqual({ invalid: 2 });
    expect(parseReport(`${row("ok.txt", SHA, 1, "r")}\n${row("ok2.txt", SHA, 1, "r")}`)).toEqual({ invalid: 2 }); // a blank line
  });

  it("the shipped template is exactly the one the row pattern reads, read by real path from the plugin folder", () => {
    expect(readFileSync(TEMPLATE_FILE, "utf8")).toBe(REPORT_TEMPLATE);
    expect(readTemplate()).toBe(REPORT_TEMPLATE);
    expect(TEMPLATE_FILE.startsWith(PLUGIN)).toBe(true);
    // Only path, commit, line and rule id; never the secret, the match, the line text, the author or a link.
    expect(REPORT_TEMPLATE).toBe('{{range .}}{{printf "%q\\t%s\\t%d\\t%q\\n" .File .Commit .StartLine .RuleID}}{{end -}}\n');
    for (const f of [".Secret", ".Match", ".Line", ".Author", ".Email", ".Message", ".Link", ".Fingerprint"]) expect(REPORT_TEMPLATE).not.toContain(f);
    const outside = join(tempDir(), "scan-secrets.tmpl");
    writeFileSync(outside, REPORT_TEMPLATE);
    expect(() => readTemplate(outside)).toThrow(/not a plain file there|missing/);
  });

  it("git is run with argv only (no shell), and nothing in lib/scan-secrets.mjs prints a scanner's output", () => {
    const src = readFileSync(join(PLUGIN, "lib", "scan-secrets.mjs"), "utf8");
    // spawn and spawnSync with an argv array, never a shell or exec's command string.
    expect(src).toMatch(/^import \{ spawn, spawnSync \} from "node:child_process";$/m);
    expect(src).not.toMatch(/shell:\s*true|execSync|execFile|"sh", \["-c"/);
    expect(src).not.toMatch(/stdout\.write|stderr\.write\(r\.|console\./);
    expect(src).toMatch(/stdio: \[input === null \? "ignore" : "pipe", capture \? "pipe" : "ignore", capture \? "pipe" : "ignore"\]/);
    // gitleaks is the one call made without capture: its output is discarded.
    const call = src.split("\n").filter((l) => l.includes("runner.exec(tools.gitleaks"));
    expect(call.length).toBe(1);
    expect(call[0]).not.toMatch(/capture/);
  });
});

// =========================================================================================
describe("scan-secrets with a stub gitleaks (always run)", SLOW, () => {
  let repo;
  beforeAll(() => {
    if (!GIT_OK) return;
    repo = layout(AWS_FILE());
  });

  gitIt("a scanner that prints, logs and drops the match: nothing reaches ow-tools' output, and nothing is left on disk", () => {
    const s = stubGitleaks({ leak: true, rows: row("config/settings.ini", repo.first, 3, "aws-access-token") });
    const r = scan(repo.dir, { path: s.path });
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ status: "HITS", hits: 1, rows: [{ path: "config/settings.ini", commit: repo.first, line: 3, rule: "aws-access-token" }] });
    expect(leaks(r.stdout + r.stderr)).toEqual([]);
    expect(r.left).toEqual([]); // the private folder, the report and the scanner's own file are gone
    const t = textScan(repo.dir, { path: s.path });
    expect(t.status).toBe(0);
    expect(leaks(t.stdout + t.stderr)).toEqual([]);
    expect(t.stdout).toMatch(/^HITS: 1 finding\(s\)/);
  });

  gitIt("a scanner that puts the match in a report row: NOT-CHECKED (report-row-invalid), the report deleted unread, nothing printed", () => {
    for (const bad of [
      `"config/settings.ini"\t${repo.first}\t3\t"aws-access-token"\t${FAKE.aws}\n`,
      `"config/settings.ini"\t${repo.first}\t3\t"${FAKE.aws}"\n`,
      `${JSON.stringify(`config/settings.ini\n${FAKE.github}`)}\t${repo.first}\t3\t"github-pat"\n`,
      `"${FAKE.pem.split("\n").join("\\n")}"\t${repo.first}\t3\t"private-key"\n`,
      `config/settings.ini:3: aws_access_key_id = ${FAKE.aws}\n`,
    ]) {
      const s = stubGitleaks({ rows: row("ok.txt", repo.first, 1, "generic-api-key") + bad, leak: true });
      const r = scan(repo.dir, { path: s.path });
      expect(r.status, bad.slice(0, 30)).toBe(4);
      expect(r.json).toMatchObject({ status: "refused", reason: "report-row-invalid", result: "NOT-CHECKED" });
      expect(r.json.message).toMatch(/^NOT-CHECKED: this repository has not been scanned for committed secrets: report row 2 /);
      expect(leaks(r.stdout + r.stderr)).toEqual([]);
      expect(r.left).toEqual([]);
    }
  });

  gitIt("a gitleaks without --redact or --report-template is never run on the history (scanner-cannot-redact)", () => {
    for (const drop of ["--redact", "--report-template", "--report-format", "--report-path"]) {
      const s = stubGitleaks({ help: helpText(HELP_FLAGS.filter((f) => f !== drop)), rows: row("x.txt", repo.first, 1, "r") });
      const r = scan(repo.dir, { path: s.path });
      expect(r.status, drop).toBe(4);
      expect(r.json).toMatchObject({ reason: "scanner-cannot-redact", result: "NOT-CHECKED" });
      expect(existsSync(join(s.rec, "argv")), drop).toBe(false); // only `version` and `git --help` ran
    }
    for (const drop of ["--config", "--gitleaks-ignore-path", "--ignore-gitleaks-allow", "--log-opts", "--exit-code"]) {
      const s = stubGitleaks({ help: helpText(HELP_FLAGS.filter((f) => f !== drop)) });
      const r = scan(repo.dir, { path: s.path });
      expect(r.status, drop).toBe(4);
      expect(r.json.reason, drop).toBe("scanner-unsupported");
      expect(existsSync(join(s.rec, "argv")), drop).toBe(false);
    }
    // --report-template must not be satisfied by --report-format alone.
    const s = stubGitleaks({ help: helpText(HELP_FLAGS.filter((f) => f !== "--report-template")).replace("--report-format", "--report-format --report-templates-dir") });
    expect(scan(repo.dir, { path: s.path }).json.reason).toBe("scanner-cannot-redact");
  });

  gitIt("missing or too old: gitleaks below 8.19 or absent, git below 2.45.1, each exit 3 naming it, nothing run", () => {
    const old = stubGitleaks({ version: "8.18.4" });
    let r = scan(repo.dir, { path: old.path });
    expect(r.status).toBe(3);
    expect(r.json).toMatchObject({ status: "missing", result: "NOT-CHECKED" });
    expect(r.json.missing).toEqual(["gitleaks 8.19 or newer (found 8.18.4)"]);
    expect(existsSync(join(old.rec, "argv"))).toBe(false);
    r = scan(repo.dir, { path: `${tools()}:/nonexistent` });
    expect(r.status).toBe(3);
    expect(r.json.missing[0]).toMatch(/^gitleaks 8\.19 or newer$/);
    // An old git first on PATH.
    const s = stubGitleaks();
    const oldGit = join(tempDir(), "bin");
    mkdirSync(oldGit);
    writeFileSync(join(oldGit, "git"), "#!/bin/sh\necho 'git version 2.39.5 (Apple Git-154)'\n");
    chmodSync(join(oldGit, "git"), 0o755);
    r = scan(repo.dir, { path: `${oldGit}:${s.path}` });
    expect(r.status).toBe(3);
    expect(r.json.missing).toEqual(["git 2.45.1 or newer (found 2.39.5)"]);
    expect(existsSync(join(s.rec, "argv"))).toBe(false);
    expect(r.left).toEqual([]);
  });

  gitIt("a gitleaks or git reached through a relative PATH entry (the current folder, perhaps the repository itself) is never run", () => {
    const cwd = tempDir();
    const marker = join(tempDir(), "planted");
    mkdirSync(join(cwd, "bin"));
    for (const n of ["gitleaks", "git"]) {
      writeFileSync(join(cwd, "bin", n), `#!/bin/sh\necho ${n} >> ${q(marker)}\necho 'gitleaks 9.9.9 git version 9.9.9'\nexit 0\n`);
      chmodSync(join(cwd, "bin", n), 0o755);
      writeFileSync(join(cwd, n), readFileSync(join(cwd, "bin", n)));
      chmodSync(join(cwd, n), 0o755);
    }
    const s = stubGitleaks();
    const r = scan(repo.dir, { path: `bin::.:${s.path}`, cwd });
    expect(r.status, r.stdout).toBe(0);
    expect(r.json.scanner.gitleaks).toBe("8.30.1"); // the stub, found in an absolute folder
    expect(existsSync(marker)).toBe(false);
  });

  gitIt("CLEAN and HITS are both exit 0; the JSON status says which", () => {
    const clean = scan(repo.dir, { path: stubGitleaks().path });
    expect(clean.status).toBe(0);
    expect(clean.json).toMatchObject({ status: "CLEAN", result: "CLEAN", hits: 0, rows: [] });
    const hits = scan(repo.dir, { path: stubGitleaks({ rows: row("config/settings.ini", repo.first, 3, "aws-access-token") }).path });
    expect(hits.status).toBe(0);
    expect(hits.json).toMatchObject({ status: "HITS", result: "HITS", hits: 1 });
  });

  gitIt("every other outcome is NOT-CHECKED: a failed scanner, an exit code that disagrees with the report, no report, no git run, git failing", () => {
    const cases = [
      [{ exit: 1 }, 5, "scan-failed", /gitleaks stopped \(exit 1\); its output is not shown/],
      [{ exit: 2, rows: row("x.txt", SHA, 1, "r") }, 5, "scan-failed", /gitleaks stopped \(exit 2\)/],
      [{ exit: 0, rows: row("x.txt", SHA, 1, "r") }, 5, "scan-failed", /exit code and its report disagree/],
      [{ exit: LEAKS_EXIT, rows: "" }, 5, "scan-failed", /exit code and its report disagree/],
      [{ noReport: true }, 5, "scan-failed", /no report/],
      [{ git: "none" }, 5, "scan-failed", /did not read the history through git/],
      [{ git: "fail" }, 5, "scan-failed", /git stopped part-way through the history \(exit 128\)/],
    ];
    for (const [o, code, reason, msg] of cases) {
      const r = scan(repo.dir, { path: stubGitleaks(o).path });
      expect(r.status, JSON.stringify(o)).toBe(code);
      expect(r.json, JSON.stringify(o)).toMatchObject({ reason, result: "NOT-CHECKED" });
      expect(r.json.message).toMatch(msg);
      expect(r.left).toEqual([]);
    }
  });

  gitIt("argv and environment: the fixed config, an empty ignore folder, --ignore-gitleaks-allow, the hardened log options, the private copy as target, and no GITLEAKS_* or user git variable", () => {
    const s = stubGitleaks();
    const evil = join(tempDir(), "evil.toml");
    writeFileSync(evil, '[allowlist]\npaths = [".*"]\n');
    const r = scan(repo.dir, {
      path: s.path,
      env: { GITLEAKS_CONFIG: evil, GITLEAKS_CONFIG_TOML: '[allowlist]\npaths = [".*"]', GIT_DIR: "/nonexistent", GIT_CONFIG_PARAMETERS: "'core.fsmonitor'='true'", GIT_EXTERNAL_DIFF: "false", GIT_TRACE: join(tempDir(), "trace") },
    });
    expect(r.status).toBe(0);
    const argv = readFileSync(join(s.rec, "argv"), "utf8").trim().split("\n");
    const after = (f) => argv[argv.indexOf(f) + 1];
    expect(argv[0]).toBe("git");
    for (const f of ["--no-banner", "--redact", "--ignore-gitleaks-allow"]) expect(argv).toContain(f);
    expect(after("--exit-code")).toBe(String(LEAKS_EXIT));
    expect(after("--report-format")).toBe("template");
    const priv = dirname(after("--report-path"));
    expect(priv).toMatch(new RegExp(`/${PRIVATE_PREFIX}[A-Za-z0-9]{6}$`));
    expect(realpathSync(dirname(priv))).toBe(realpathSync(r.tmp));
    expect(after("--report-template")).toBe(join(priv, "report.tmpl"));
    expect(after("--config")).toBe(join(priv, "gitleaks.toml"));
    expect(after("--gitleaks-ignore-path")).toBe(join(priv, "empty"));
    expect(after("--log-opts")).toBe(LOG_OPTS.join(" "));
    expect(LOG_OPTS).toEqual(expect.arrayContaining(["--full-history", "--all", "--no-ext-diff", "--no-textconv", "--diff-merges=remerge"]));
    expect(argv.at(-1)).toBe(join(priv, "history.git")); // never the repository itself
    expect(readFileSync(join(s.rec, "config"), "utf8")).toBe(GITLEAKS_CONFIG);
    expect(GITLEAKS_CONFIG).toMatch(/\[extend\]\nuseDefault = true\n$/);
    expect(GITLEAKS_CONFIG).not.toMatch(/allowlist/);
    expect(readFileSync(join(s.rec, "template"), "utf8")).toBe(REPORT_TEMPLATE);
    const env = Object.fromEntries(readFileSync(join(s.rec, "env"), "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    expect(Object.keys(env).filter((k) => /^GITLEAKS/.test(k))).toEqual([]);
    for (const k of ["GIT_DIR", "GIT_CONFIG_PARAMETERS", "GIT_EXTERNAL_DIFF", "GIT_TRACE"]) expect(env[k], k).toBeUndefined();
    expect(env).toMatchObject({ GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_ATTR_NOSYSTEM: "1" });
    expect(env.PATH.split(":")[0]).toBe(join(priv, "bin")); // the status wrapper first
    expect(env.HOME).toBe(join(priv, "home"));
    const cfg = Object.fromEntries(Array.from({ length: Number(env.GIT_CONFIG_COUNT) }, (_, i) => [env[`GIT_CONFIG_KEY_${i}`], env[`GIT_CONFIG_VALUE_${i}`]]));
    expect(cfg).toMatchObject({
      "core.fsmonitor": "false", "core.pager": "cat", "core.hooksPath": "/dev/null", "core.attributesFile": "/dev/null",
      "core.useReplaceRefs": "false", "core.commitGraph": "false", "core.multiPackIndex": "false",
      "log.showSignature": "false", "gpg.program": "false", "protocol.allow": "never", "color.ui": "never",
    });
    expect(Object.keys(cfg).length).toBe(GIT_CONFIG.length);
    expect(r.left).toEqual([]);
  });

  gitIt("--timeout: a scan that runs too long is stopped (exit 5, timeout), its processes killed, its folder removed", () => {
    const s = stubGitleaks({ sleep: 30 });
    const t0 = Date.now();
    const r = scan(repo.dir, { path: s.path, args: ["--timeout", "2"] });
    expect(Date.now() - t0).toBeLessThan(20_000);
    expect(r.status).toBe(5);
    expect(r.json).toMatchObject({ reason: "timeout", result: "NOT-CHECKED" });
    expect(r.left).toEqual([]);
    const pid = Number(readFileSync(join(s.rec, "pid"), "utf8"));
    expect(alive(pid)).toBe(false);
    for (const bad of ["0", "591", "x"]) expect(scan(repo.dir, { path: s.path, args: ["--timeout", bad] }).status, bad).toBe(2);
  });

  for (const [sig, code] of [["SIGTERM", 143], ["SIGINT", 130]]) {
    gitIt(`${sig} mid-scan: the scanner is killed and the private folder (with its partial report) is gone before ow-tools exits`, async () => {
      const s = stubGitleaks({ sleep: 30, rows: row("config/settings.ini", repo.first, 3, "aws-access-token") });
      const tmp = tempDir("owt-tmp-");
      const child = spawn(BIN, ["scan-secrets", repo.dir, "--json"], { env: { ...process.env, TMPDIR: tmp, PATH: s.path }, stdio: "ignore" });
      const exited = new Promise((res) => child.on("exit", (c, signal) => res({ c, signal })));
      await waitFor(() => existsSync(join(s.rec, "started")));
      const priv = readdirSync(tmp).filter((n) => n.startsWith(PRIVATE_PREFIX));
      expect(priv.length).toBe(1);
      expect(existsSync(join(tmp, priv[0], "report.txt"))).toBe(true);
      expect(statSync(join(tmp, priv[0])).mode & 0o777).toBe(0o700);
      child.kill(sig);
      const { c } = await exited;
      expect(c).toBe(code);
      expect(readdirSync(tmp)).toEqual([]);
      const pid = Number(readFileSync(join(s.rec, "pid"), "utf8"));
      await waitFor(() => !alive(pid));
    });
  }

  gitIt("SIGKILL leaves the folder; the next run removes it (only this user's, only when its owner is gone, never through a symlink)", async () => {
    const s = stubGitleaks({ sleep: 30 });
    const tmp = tempDir("owt-tmp-");
    const child = spawn(BIN, ["scan-secrets", repo.dir], { env: { ...process.env, TMPDIR: tmp, PATH: s.path }, stdio: "ignore" });
    const exited = new Promise((res) => child.on("exit", res));
    await waitFor(() => existsSync(join(s.rec, "started")));
    child.kill("SIGKILL");
    await exited;
    const left = readdirSync(tmp).filter((n) => n.startsWith(PRIVATE_PREFIX));
    expect(left.length).toBe(1);
    // The orphaned scanner (its own process group) is stopped by the test.
    try {
      process.kill(-Number(readFileSync(join(s.rec, "pid"), "utf8")), "SIGKILL");
    } catch {
      /* gone */
    }
    // A live owner's folder, a symlink with the same shape and an unrelated folder stay.
    const live = join(tmp, `${PRIVATE_PREFIX}Live01`);
    mkdirSync(live);
    writeFileSync(join(live, "owner.pid"), `${process.pid}\n`);
    const elsewhere = tempDir();
    writeFileSync(join(elsewhere, "keep.txt"), "keep");
    symlinkSync(elsewhere, join(tmp, `${PRIVATE_PREFIX}Link01`));
    mkdirSync(join(tmp, "unrelated"));
    const r = spawnSync(BIN, ["scan-secrets", repo.dir, "--json"], { encoding: "utf8", env: { ...process.env, TMPDIR: tmp, PATH: stubGitleaks().path } });
    expect(r.status).toBe(0);
    expect(readdirSync(tmp).sort()).toEqual([`${PRIVATE_PREFIX}Link01`, `${PRIVATE_PREFIX}Live01`, "unrelated"]);
    expect(readFileSync(join(elsewhere, "keep.txt"), "utf8")).toBe("keep");
    expect(sweepStale(tmp)).toEqual([]);
  });

  gitIt("the private folder is 0700 and everything in it (git's and the scanner's files included) is the user's alone", () => {
    const s = stubGitleaks({ rows: row("config/settings.ini", repo.first, 3, "aws-access-token") });
    // A mode-preserving copy of the folder, taken while the scanner runs.
    const copy = join(tempDir(), "copy");
    const script = readFileSync(join(s.bin, "gitleaks"), "utf8").replace(/^exit /m, `cp -Rp "$(dirname "$report")" ${q(copy)}\nexit `);
    writeFileSync(join(s.bin, "gitleaks"), script);
    expect(scan(repo.dir, { path: s.path }).status).toBe(0);
    const all = [copy, ...filesUnder(copy)];
    const walkDirs = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? [join(d, e.name), ...walkDirs(join(d, e.name))] : []));
    all.push(...walkDirs(copy));
    expect(all.length).toBeGreaterThan(10);
    expect(statSync(copy).mode & 0o777).toBe(0o700);
    for (const p of all) expect(statSync(p).mode & 0o077, p.slice(copy.length)).toBe(0);
    expect(filesUnder(copy).map((f) => f.slice(copy.length + 1))).toEqual(expect.arrayContaining(["report.txt", "history.git/HEAD", "history.git/objects/info/alternates", "owner.pid"]));
  });
});

// =========================================================================================
describe("scan-secrets: the repository (contained, its own, its full history)", SLOW, () => {
  gitIt("not a folder, not a repository, or a folder inside someone else's repository: not-a-git-repo; ow-tools never looks in a parent folder", () => {
    const s = stubGitleaks();
    const { dir } = layout(AWS_FILE());
    const sub = join(dir, "config");
    for (const [p, re] of [[join(dir, "nope"), /does not exist/], [join(dir, "config", "settings.ini"), /is not a folder/], [sub, /no \.git folder in it; ow-tools never looks in a parent folder/], [tempDir(), /not a git repository/]]) {
      const r = scan(p, { path: s.path });
      expect(r.status, p).toBe(4);
      expect(r.json).toMatchObject({ reason: "not-a-git-repo", result: "NOT-CHECKED" });
      expect(r.json.message).toMatch(re);
    }
    expect(existsSync(join(s.rec, "argv"))).toBe(false);
  });

  gitIt("a symlinked repository, a symlinked .git, a .git file pointing outside (a linked worktree), a control character: repo-not-contained", () => {
    const s = stubGitleaks();
    const { dir } = layout(AWS_FILE());
    const link = join(tempDir(), "link");
    symlinkSync(dir, link);
    const dotLink = join(tempDir(), "dotlink");
    mkdirSync(dotLink);
    symlinkSync(join(dir, ".git"), join(dotLink, ".git"));
    const wt = join(tempDir(), "wt");
    g(dir, "worktree", "add", "-q", wt);
    const ctl = join(tempDir(), "a\nb");
    mkdirSync(ctl);
    for (const [p, re] of [[link, /is a symlink/], [dotLink, /\.git is a symlink/], [wt, /points to a git folder outside/], [ctl, /control character/]]) {
      const r = scan(p, { path: s.path });
      expect(r.status, p).toBe(4);
      expect(r.json.reason, p).toBe("repo-not-contained");
      expect(r.json.message).toMatch(re);
    }
    expect(existsSync(join(s.rec, "argv"))).toBe(false);
  });

  gitIt("a shallow clone or a partial clone: history-incomplete (gitleaks would call the missing part clean)", () => {
    const s = stubGitleaks();
    const { dir } = layout(AWS_FILE());
    put(dir, { "b.txt": "b\n" });
    commitAll(dir, "second");
    g(dir, "config", "uploadpack.allowFilter", "true");
    const shallow = join(tempDir(), "shallow");
    g(tempDir(), "clone", "-q", "--depth", "1", `file://${dir}`, shallow);
    const partial = join(tempDir(), "partial");
    g(tempDir(), "clone", "-q", "--filter=blob:none", "--no-checkout", `file://${dir}`, partial);
    for (const [p, re] of [[shallow, /shallow clone/], [partial, /partial clone/]]) {
      const r = scan(p, { path: s.path });
      expect(r.status, p).toBe(4);
      expect(r.json.reason, p).toBe("history-incomplete");
      expect(r.json.message).toMatch(re);
    }
    expect(existsSync(join(s.rec, "argv"))).toBe(false);
  });

  gitIt("a bare repository and an empty one scan; the empty one is CLEAN with no refs", () => {
    const s = stubGitleaks();
    const { dir } = layout(AWS_FILE());
    const bare = join(tempDir(), "bare.git");
    g(tempDir(), "clone", "-q", "--bare", dir, bare);
    const b = scan(bare, { path: s.path });
    expect(b.status).toBe(0);
    expect(b.json.repo_files).toEqual({ ".gitleaks.toml": "no working tree", ".gitleaksignore": "no working tree" });
    const empty = join(tempDir(), "empty");
    mkdirSync(empty);
    g(empty, "init", "-q");
    const e = scan(empty, { path: s.path });
    expect(e.status).toBe(0);
    expect(e.json).toMatchObject({ status: "CLEAN", refs: 0, hits: 0 });
    expect(e.json.note).toMatch(/no commits/);
  });

  gitIt("a repository git refuses as another user's (dubious ownership) is refused, never read with a widened safe.directory", () => {
    // A stand-in git that answers show-ref as git does for another user's repository.
    const s = stubGitleaks();
    const fake = join(tempDir(), "bin");
    mkdirSync(fake);
    writeFileSync(join(fake, "git"), `#!/bin/sh\ncase "$*" in *show-ref*) echo "fatal: detected dubious ownership in repository at '/x'" >&2; exit 128;; *--version*) echo 'git version 2.55.0';; *) exec ${q(REAL_GIT)} "$@";; esac\n`);
    chmodSync(join(fake, "git"), 0o755);
    const { dir } = layout(AWS_FILE());
    const r = scan(dir, { path: `${fake}:${s.path}` });
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "repo-not-owned", result: "NOT-CHECKED" });
    expect(r.json.message).toMatch(/never widens git's safe\.directory/);
    const src = readFileSync(join(PLUGIN, "lib", "scan-secrets.mjs"), "utf8");
    expect(src).not.toMatch(/safe\.directory["']?\s*,\s*["']\*/);
    expect(GIT_CONFIG.map(([k]) => k)).not.toContain("safe.directory");
  });
});

// =========================================================================================
// Hostile repository config: each key writes a marker file if git ever runs it.
// The control proves each PoC is live (a plain git command in the repository
// runs it); the scan must never.
function hostile() {
  const work = tempDir("owt-hostile-");
  const marker = join(work, "MARKER");
  const evil = join(work, "evil.sh");
  writeFileSync(evil, `#!/bin/sh\necho "ran: $0 $*" >> ${q(marker)}\ncat > /dev/null 2>&1 || true\nexit 0\n`);
  chmodSync(evil, 0o755);
  const { dir, first } = layout({ ...AWS_FILE(), "notes.txt": "a\n", ".gitattributes": "*.txt diff=evil\n" });
  put(dir, { "notes.txt": "a\nb\n" });
  commitAll(dir, "second");
  // A commit carrying a (fake) signature, so log.showSignature would call gpg.program.
  const raw = g(dir, "cat-file", "commit", "HEAD");
  const sig = ["-----BEGIN PGP ", "SIGNATURE-----"].join("");
  const signed = raw.replace(/^(committer .*)$/m, `$1\ngpgsig ${sig}\n \n ${chars("sig", 40, ALNUM)}\n -----END PGP SIGNATURE-----`);
  const sigFile = join(work, "commit.txt");
  writeFileSync(sigFile, `${signed}\n`);
  const signedSha = g(dir, "hash-object", "-t", "commit", "-w", sigFile);
  g(dir, "update-ref", "refs/heads/main", signedSha);
  writeFileSync(join(work, "include.cfg"), `[core]\n\tfsmonitor = ${evil}\n`);
  // Set last: no layout command runs under them.
  const cfg = [
    ["core.fsmonitor", evil], ["include.path", join(work, "include.cfg")], ["diff.external", evil],
    ["diff.evil.textconv", evil], ["diff.evil.command", evil], ["log.showSignature", "true"], ["gpg.program", evil],
    ["core.pager", evil], ["pager.log", evil], ["core.sshCommand", evil], ["core.alternateRefsCommand", evil],
    ["uploadpack.packObjectsHook", evil], ["core.hooksPath", join(work, "hooks")], ["core.editor", evil],
  ];
  mkdirSync(join(work, "hooks"));
  for (const h of ["post-checkout", "pre-upload-pack", "reference-transaction", "post-index-change", "fsmonitor-watchman"]) {
    writeFileSync(join(work, "hooks", h), `#!/bin/sh\necho "hook ${h}" >> ${q(marker)}\n`);
    chmodSync(join(work, "hooks", h), 0o755);
  }
  for (const [k, v] of cfg) spawnSync(REAL_GIT, ["config", k, v], { cwd: dir, env: LAYOUT_ENV });
  return { dir, first, marker };
}
const naive = (cwd, ...args) => spawnSync(REAL_GIT, args, { cwd, timeout: 20_000, env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" }, encoding: "utf8" });

describe("scan-secrets: a hostile repository runs nothing (Part 1, item 4)", SLOW, () => {
  gitIt("the PoCs are live: plain git in the repository runs fsmonitor (and its include), the signature program, textconv and the external diff, each on its own", () => {
    const h = hostile();
    const ran = (...args) => {
      rmSync(h.marker, { force: true });
      naive(h.dir, ...args);
      return existsSync(h.marker) ? readFileSync(h.marker, "utf8") : "";
    };
    expect(ran("status")).toMatch(/ran: \S+evil\.sh [12] /); // the fsmonitor hook protocol
    expect(ran("-c", "core.fsmonitor=false", "log", "-1", "--format=%H")).toMatch(/ran: \S+evil\.sh .*--verify/); // gpg.program, no diff shown
    expect(ran("-c", "core.fsmonitor=false", "-c", "log.showSignature=false", "log", "-p", "-1", "--", "notes.txt")).toMatch(/ran: \S+evil\.sh \S*notes|ran: \S+evil\.sh \S+/); // textconv only
    expect(ran("-c", "core.fsmonitor=false", "-c", "log.showSignature=false", "diff", "HEAD~1", "HEAD", "--", "notes.txt")).toMatch(/ran: \S+evil\.sh notes\.txt /); // diff.external (path first of its seven arguments)
  });

  gitIt("with a stub gitleaks running gitleaks' own git log on the private copy: no marker, and the scan completes", () => {
    const h = hostile();
    const r = scan(h.dir, { path: stubGitleaks().path });
    expect(r.status, r.stdout).toBe(0);
    expect(existsSync(h.marker) ? readFileSync(h.marker, "utf8") : "").toBe("");
  });

  realIt("with real gitleaks: no marker, and the key is still found", () => {
    const h = hostile();
    const r = scan(h.dir, { path: realWrapper().path });
    expect(r.status, r.stdout).toBe(0);
    expect(r.json.rows).toContainEqual({ path: "config/settings.ini", commit: h.first, line: 3, rule: "aws-access-token" });
    expect(existsSync(h.marker) ? readFileSync(h.marker, "utf8") : "").toBe("");
  });

  gitIt("no network, child processes included: a partial clone's promisor remote at a local listener is never contacted", async () => {
    const hits = [];
    const server = createServer((sock) => {
      hits.push(Date.now());
      sock.destroy();
    });
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    try {
      const { dir } = layout({ ...AWS_FILE(), "b.txt": "b\n" });
      g(dir, "config", "uploadpack.allowFilter", "true");
      const partial = join(tempDir(), "partial");
      g(tempDir(), "clone", "-q", "--filter=blob:none", "--no-checkout", `file://${dir}`, partial);
      g(partial, "config", "remote.origin.url", `http://127.0.0.1:${server.address().port}/repo.git`);
      // Control: plain git lazily fetches from the listener.
      naive(partial, "-c", "protocol.allow=always", "log", "-p", "--all");
      await sleep(300);
      expect(hits.length).toBeGreaterThan(0);
      hits.length = 0;
      // The CLI refuses before any git runs ...
      const r = scan(partial, { path: stubGitleaks().path });
      expect(r.json.reason).toBe("history-incomplete");
      // ... and the environment ow-tools gives git shuts it off by itself:
      // the same log in the repository, under that environment, fails without
      // a connection.
      const priv = tempDir("owt-priv-");
      for (const d of ["home", "tmp", "empty"]) mkdirSync(join(priv, d));
      const env = gitEnv(priv, { GIT_CEILING_DIRECTORIES: dirname(partial) });
      const own = spawnSync(REAL_GIT, ["-C", partial, "log", "-p", "--all"], { env, encoding: "utf8" });
      const fetchOnly = spawnSync(REAL_GIT, ["-C", partial, "fetch", "origin"], { env, encoding: "utf8" });
      await sleep(300);
      expect(own.status).not.toBe(0);
      expect(fetchOnly.status).not.toBe(0);
      expect(hits).toEqual([]);
      // With the promisor markers removed so the pre-check passes, the scan
      // still makes no connection and is NOT-CHECKED, never CLEAN.
      for (const f of readdirSync(join(partial, ".git", "objects", "pack"))) if (f.endsWith(".promisor")) rmSync(join(partial, ".git", "objects", "pack", f));
      const cfgPath = join(partial, ".git", "config");
      writeFileSync(cfgPath, readFileSync(cfgPath, "utf8").replace(/^\s*(promisor|partialclone)\s*=.*$/gim, ""));
      const r2 = scan(partial, { path: stubGitleaks().path });
      await sleep(300);
      expect(r2.status).toBe(5);
      expect(r2.json).toMatchObject({ reason: "scan-failed", result: "NOT-CHECKED" });
      expect(hits).toEqual([]);
    } finally {
      server.close();
    }
  });

  gitIt("the Node network fence sees no socket, DNS or fetch call from scan-secrets", () => {
    const { dir } = layout(AWS_FILE());
    const log = join(tempDir(), "fence.log");
    writeFileSync(log, "");
    const s = GL_OK ? realWrapper() : stubGitleaks();
    const r = scan(dir, { path: s.path, env: { NODE_OPTIONS: `--import ${FENCE}`, OW_FENCE_LOG: log } });
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(log, "utf8").trim()).toBe("");
    expect(r.stderr).not.toMatch(/network fence/);
  });
});

// =========================================================================================
describe("scan-secrets with real gitleaks", SLOW, () => {
  // The title carries the versions, so every reporter (and each evaluation
  // round's record) shows what the real-binary half ran against.
  realIt(`ran against gitleaks ${GL_VERSION || "none"} and git ${GIT_VERSION || "none"}`, () => {
    expect(GL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(spawnSync(REAL_GL, ["git", "--help"], { encoding: "utf8" }).stdout).toMatch(/--report-template/);
  });

  realIt("HITS: run-time fake keys committed and later removed are found by path, commit, line and rule; an untracked .env is never scanned; nothing leaks anywhere", () => {
    const { dir, first } = layout({
      ...AWS_FILE(),
      "src/github.js": `export const token = "${FAKE.github}";\n`,
      "billing/keys.py": `STRIPE = "${FAKE.stripe}"\n`,
      "ops/slack.yaml": `bot_token: ${FAKE.slack}\n`,
      "deploy/id_rsa": `${FAKE.pem}\n`,
    });
    rmSync(join(dir, "config"), { recursive: true });
    rmSync(join(dir, "src"), { recursive: true });
    rmSync(join(dir, "billing"), { recursive: true });
    rmSync(join(dir, "ops"), { recursive: true });
    rmSync(join(dir, "deploy"), { recursive: true });
    put(dir, { "README.md": "# A repository\n" });
    commitAll(dir, "remove the keys");
    // In the working tree only, never committed:
    writeFileSync(join(dir, ".env"), `AWS_ACCESS_KEY_ID=${FAKE.env}\n`);
    const w = realWrapper();
    const r = scan(dir, { path: w.path });
    expect(r.status, r.stderr).toBe(0);
    expect(r.json.status).toBe("HITS");
    const got = new Set(r.json.rows.map((x) => `${x.path} ${x.commit} ${x.line} ${x.rule}`));
    for (const want of [
      `config/settings.ini ${first} 3 aws-access-token`,
      `src/github.js ${first} 1 github-pat`,
      `billing/keys.py ${first} 1 stripe-access-token`,
      `ops/slack.yaml ${first} 1 slack-bot-token`,
      `deploy/id_rsa ${first} 1 private-key`,
    ]) expect(got.has(want), want).toBe(true);
    expect(r.json.rows.some((x) => x.path === ".env")).toBe(false);
    for (const x of r.json.rows) expect(Object.keys(x)).toEqual(["path", "commit", "line", "rule"]);
    // Redaction proofs: every output channel, the text mode, and every file
    // in ow-tools' private folder as it was when gitleaks finished (its
    // report included); and nothing left afterwards.
    expect(leaks(r.stdout + r.stderr)).toEqual([]);
    const t = textScan(dir, { path: w.path });
    expect(t.status).toBe(0);
    expect(leaks(t.stdout + t.stderr)).toEqual([]);
    const files = filesUnder(w.capture).map((f) => f.slice(w.capture.length + 1)).sort();
    expect(files).toEqual(expect.arrayContaining(["report.txt", "report.tmpl", "gitleaks.toml", "git-status", "history.git/objects/info/alternates"]));
    expect(leaksInFiles(w.capture)).toEqual([]);
    expect(filesUnder(join(w.capture, "history.git", "objects")).map((f) => f.slice(w.capture.length + 1))).toEqual(["history.git/objects/info/alternates"]); // no object copied
    expect(r.left).toEqual([]);
    expect(t.left).toEqual([]);
  });

  realIt("CLEAN is exit 0 and says what was and wasn't scanned", () => {
    const { dir } = layout({ "a.txt": "nothing here\n" });
    writeFileSync(join(dir, ".env"), `AWS_ACCESS_KEY_ID=${FAKE.env}\n`);
    const r = scan(dir, { path: realWrapper().path });
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ status: "CLEAN", hits: 0, refs: 2, scanner: { gitleaks: GL_VERSION, git: GIT_VERSION } });
    expect(r.json.scanned).toMatch(/the working tree was not scanned/);
    const t = textScan(dir, { path: realWrapper().path });
    expect(t.stdout).toMatch(/^CLEAN: no committed secret found in /);
  });

  // Each route a repository (or the session) could use to hide a key. The
  // control shows the route works on a plain gitleaks run in place; the scan
  // must still find the key.
  // A control run must itself succeed: a gitleaks error is not "hidden".
  const plainGitleaks = (target, { env = {}, cwd } = {}) => {
    const r = spawnSync(REAL_GL, ["git", "--no-banner", "--report-format", "json", "--report-path", "-", target], { cwd: cwd || tempDir(), env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", ...env }, encoding: "utf8" });
    if (![0, 1].includes(r.status)) throw new Error(`control gitleaks run failed (exit ${r.status})`);
    return JSON.parse(r.stdout).length;
  };
  const fingerprint = (dir) => {
    const r = spawnSync(REAL_GL, ["git", "--no-banner", "--report-format", "json", "--report-path", "-", dir], { env: { PATH: process.env.PATH, HOME: process.env.HOME }, encoding: "utf8" });
    return JSON.parse(r.stdout).map((f) => f.Fingerprint);
  };
  const found = (r, first) => r.json?.rows?.some((x) => x.path === "config/settings.ini" && x.commit === first && x.rule === "aws-access-token");

  realIt("allowlists the repository or the session controls are ignored: .gitleaks.toml, .gitleaksignore (in the repository and in the current folder), GITLEAKS_CONFIG, GITLEAKS_CONFIG_TOML, gitleaks:allow", () => {
    const allowAll = '[extend]\nuseDefault = true\n[allowlist]\npaths = [".*"]\n';
    const routes = {
      "repo .gitleaks.toml": () => {
        const x = layout(AWS_FILE());
        writeFileSync(join(x.dir, ".gitleaks.toml"), allowAll);
        return { ...x };
      },
      "committed .gitleaks.toml": () => {
        const x = layout({ ...AWS_FILE(), ".gitleaks.toml": allowAll });
        return { ...x };
      },
      "repo .gitleaksignore": () => {
        const x = layout(AWS_FILE());
        writeFileSync(join(x.dir, ".gitleaksignore"), `${fingerprint(x.dir).join("\n")}\n`);
        return x;
      },
      "cwd .gitleaksignore": () => {
        const x = layout(AWS_FILE());
        const cwd = tempDir();
        writeFileSync(join(cwd, ".gitleaksignore"), `${fingerprint(x.dir).join("\n")}\n`);
        return { ...x, cwd };
      },
      GITLEAKS_CONFIG: () => {
        const x = layout(AWS_FILE());
        const f = join(tempDir(), "allow.toml");
        writeFileSync(f, allowAll);
        return { ...x, env: { GITLEAKS_CONFIG: f } };
      },
      GITLEAKS_CONFIG_TOML: () => ({ ...layout(AWS_FILE()), env: { GITLEAKS_CONFIG_TOML: allowAll } }),
      "gitleaks:allow": () => layout({ "config/settings.ini": `[cloud]\nregion = eu-west-1\naws_access_key_id = ${FAKE.aws} # gitleaks:allow\n` }),
    };
    for (const [name, make] of Object.entries(routes)) {
      const x = make();
      expect(plainGitleaks(x.dir, { env: x.env, cwd: x.cwd }), `control: ${name} hides the key from a plain run`).toBe(0);
      const r = scan(x.dir, { path: realWrapper().path, env: x.env, cwd: x.cwd });
      expect(r.status, name).toBe(0);
      expect(found(r, x.first), name).toBe(true);
      if (name === "repo .gitleaks.toml") expect(r.json.repo_files[".gitleaks.toml"]).toBe("present, ignored");
      if (name === "repo .gitleaksignore") expect(r.json.repo_files[".gitleaksignore"]).toBe("present, ignored");
    }
  });

  realIt("git settings and history tricks that hide a key from a scan in place are ignored: colour, big-file threshold, -diff attributes, replace refs, hidden refs, format.pretty", () => {
    const routes = {
      "color.diff=always": (x) => g(x.dir, "config", "color.diff", "always"),
      "core.bigFileThreshold=1": (x) => g(x.dir, "config", "core.bigFileThreshold", "1"),
      "info/attributes -diff": (x) => writeFileSync(join(x.dir, ".git", "info", "attributes"), "* -diff\n"),
      "worktree .gitattributes -diff": (x) => writeFileSync(join(x.dir, ".gitattributes"), "* -diff\n"),
      "core.attributesFile -diff": (x) => {
        const f = join(tempDir(), "attrs");
        writeFileSync(f, "* binary\n");
        g(x.dir, "config", "core.attributesFile", f);
      },
      "replace ref": (x) => {
        writeFileSync(join(x.dir, "config", "settings.ini"), "[cloud]\nregion = eu-west-1\n");
        commitAll(x.dir, "clean");
        const tree = g(x.dir, "rev-parse", "HEAD^{tree}");
        const stand = g(x.dir, "commit-tree", tree, "-m", "first");
        g(x.dir, "replace", x.first, stand);
      },
      "format.pretty=oneline": (x) => g(x.dir, "config", "format.pretty", "oneline"),
      "log.abbrevCommit": (x) => g(x.dir, "config", "log.abbrevCommit", "true"),
    };
    for (const [name, apply] of Object.entries(routes)) {
      const x = layout(AWS_FILE());
      apply(x);
      if (!/format|abbrev/.test(name)) expect(plainGitleaks(x.dir), `control: ${name} hides the key from a plain run`).toBe(0);
      const r = scan(x.dir, { path: realWrapper().path });
      expect(r.status, `${name}: ${r.stdout}`).toBe(0);
      expect(found(r, x.first), name).toBe(true);
    }
    // Hidden refs: a branch hidden from upload-pack (and so from `git clone
    // --mirror`) is still scanned, because the copy is built from show-ref.
    const x = layout({ "a.txt": "a\n" });
    g(x.dir, "checkout", "-qb", "hidden");
    put(x.dir, AWS_FILE());
    const hiddenSha = commitAll(x.dir, "hidden");
    g(x.dir, "checkout", "-q", "main");
    g(x.dir, "config", "transfer.hideRefs", "refs/heads/hidden");
    g(x.dir, "config", "uploadpack.hideRefs", "refs/heads/hidden");
    const mirror = join(tempDir(), "m.git");
    naive(tempDir(), "clone", "-q", "--mirror", "--no-local", x.dir, mirror);
    expect(plainGitleaks(mirror), "control: a mirror clone misses the hidden branch").toBe(0);
    const r = scan(x.dir, { path: realWrapper().path });
    expect(found(r, hiddenSha)).toBe(true);
  });

  realIt("history gitleaks' defaults miss, or a plain clone would, is scanned: a key added only in a merge commit, on a detached HEAD, in a stash, in a sha256 repository", () => {
    // A merge commit that adds a file (an "evil merge").
    const m = layout({ "a.txt": "base\n" });
    g(m.dir, "checkout", "-qb", "side");
    put(m.dir, { "b.txt": "side\n" });
    commitAll(m.dir, "side");
    g(m.dir, "checkout", "-q", "main");
    put(m.dir, { "c.txt": "main\n" });
    commitAll(m.dir, "main");
    g(m.dir, "merge", "-q", "--no-ff", "--no-commit", "side");
    put(m.dir, { "merged/token.txt": `token = ${FAKE.merge}\n` });
    const mergeSha = commitAll(m.dir, "merge");
    expect(plainGitleaks(m.dir), "control: gitleaks' default log options skip merge diffs").toBe(0);
    let r = scan(m.dir, { path: realWrapper().path });
    expect(r.json.rows).toContainEqual({ path: "merged/token.txt", commit: mergeSha, line: 1, rule: "github-pat" });
    // A commit only HEAD reaches (detached, on no branch or tag).
    const d = layout({ "a.txt": "a\n" });
    g(d.dir, "checkout", "-q", "--detach");
    put(d.dir, AWS_FILE());
    const detached = commitAll(d.dir, "detached");
    expect(g(d.dir, "branch", "--contains", detached)).toMatch(/HEAD detached/);
    r = scan(d.dir, { path: realWrapper().path });
    expect(found(r, detached)).toBe(true);
    // A key only in a stash (refs/stash).
    const st = layout({ "config/settings.ini": "[cloud]\nregion = eu-west-1\n" });
    put(st.dir, AWS_FILE());
    g(st.dir, "stash", "-q");
    expect(readFileSync(join(st.dir, "config", "settings.ini"), "utf8")).not.toMatch(/aws_access_key_id/);
    r = scan(st.dir, { path: realWrapper().path });
    expect(r.json.rows.some((x) => x.path === "config/settings.ini" && x.rule === "aws-access-token"), JSON.stringify(r.json.rows)).toBe(true);
    // sha256.
    const s = layout(AWS_FILE(), { init: ["--object-format=sha256"] });
    r = scan(s.dir, { path: realWrapper().path });
    expect(s.first).toMatch(/^[0-9a-f]{64}$/);
    expect(found(r, s.first)).toBe(true);
  });

  realIt("PoC: gitleaks reports no leaks when git can't read the history; ow-tools says NOT-CHECKED, never CLEAN", () => {
    const { dir, first } = layout(AWS_FILE());
    const blob = g(dir, "rev-parse", `${first}:config/settings.ini`);
    rmSync(join(dir, ".git", "objects", blob.slice(0, 2), blob.slice(2)));
    // Control: gitleaks itself exits 0 with nothing found.
    const plain = spawnSync(REAL_GL, ["git", "--no-banner", "--exit-code", "42", dir], { encoding: "utf8", env: { PATH: process.env.PATH, HOME: process.env.HOME } });
    expect(plain.status).toBe(0);
    const r = scan(dir, { path: realWrapper().path });
    expect(r.status).toBe(5);
    expect(r.json).toMatchObject({ reason: "scan-failed", result: "NOT-CHECKED" });
    expect(r.json.message).toMatch(/git stopped part-way through the history/);
  });

  realIt("file names: spaces and accents are reported as they are; a name gitleaks can only print with an escape stops the scan, and nothing from it is shown", () => {
    const ok = layout({ "a dir/été notes.ini": `aws_access_key_id = ${FAKE.aws}\n` });
    const r = scan(ok.dir, { path: realWrapper().path });
    expect(r.json.rows).toContainEqual({ path: "a dir/été notes.ini", commit: ok.first, line: 1, rule: "aws-access-token" });
    const bad = layout({ [`odd\nname.ini`]: `aws_access_key_id = ${FAKE.aws}\n` });
    const b = scan(bad.dir, { path: realWrapper().path });
    expect(b.status).toBe(4);
    expect(b.json.reason).toBe("report-row-invalid");
    expect(leaks(b.stdout + b.stderr)).toEqual([]);
    expect(b.left).toEqual([]);
  });

  realIt("a bare repository is scanned like a working one", () => {
    const { dir, first } = layout(AWS_FILE());
    const bare = join(tempDir(), "bare.git");
    naive(tempDir(), "clone", "-q", "--bare", dir, bare);
    const r = scan(bare, { path: realWrapper().path });
    expect(found(r, first)).toBe(true);
  });
});

// =========================================================================================
describe("scan-secrets: doctor, version and what the plugin says", SLOW, () => {
  const doctorWith = (bin) => {
    const called = join(tempDir(), "called");
    const stubs = join(tempDir(), "stubs");
    mkdirSync(stubs);
    for (const name of ["brew", "apt", "apt-get", "curl", "sudo"]) {
      writeFileSync(join(stubs, name), `#!/bin/sh\necho ${name} >> ${q(called)}\n`);
      chmodSync(join(stubs, name), 0o755);
    }
    const r = spawnSync(BIN, ["doctor", "--json", "--quick"], { encoding: "utf8", env: { ...process.env, PATH: `${bin ? `${bin}:` : ""}${stubs}:${tools()}:/usr/bin:/bin`, OW_TOOLS_HOME: join(tempDir(), "home") } });
    const json = JSON.parse(r.stdout);
    return { json, rows: Object.fromEntries(json.checks.map((c) => [c.id, c])), ran: existsSync(called) ? readFileSync(called, "utf8") : "" };
  };
  const mac = process.platform === "darwin";

  gitIt("doctor reports the gitleaks and git requirements and prints their install lines; it runs no package manager", () => {
    const old = stubGitleaks({ version: "8.18.4" });
    let d = doctorWith(old.bin);
    expect(d.rows.gitleaks).toMatchObject({ ok: false, for: ["scan-secrets"], detail: "gitleaks 8.18.4 (needs 8.19.0 or newer)", fix: mac ? "brew upgrade gitleaks" : "install gitleaks 8.19.0 or newer with your package manager" });
    expect(d.json.capabilities["scan-secrets"]).toEqual({ ready: false, missing: ["gitleaks"] });
    d = doctorWith(null);
    if (!existsSync("/usr/bin/gitleaks")) expect(d.rows.gitleaks).toMatchObject({ ok: false, detail: "not found", fix: mac ? "brew install gitleaks" : "install gitleaks 8.19.0 or newer with your package manager" });
    d = doctorWith(stubGitleaks().bin);
    expect(d.rows.gitleaks).toMatchObject({ ok: true, detail: "gitleaks 8.30.1", fix: null });
    expect(d.rows.git).toMatchObject({ ok: true, for: ["scan-secrets"], detail: `git ${GIT_VERSION}`, fix: null });
    expect(d.json.capabilities["scan-secrets"]).toEqual({ ready: true });
    expect(d.ran).toBe("");
  });

  it("the manifest, README and /ow-tools say what scan-secrets runs, sends and writes", () => {
    const manifest = readFileSync(join(PLUGIN, "SECURITY-MANIFEST.md"), "utf8");
    const programs = manifest.slice(manifest.indexOf("## Programs it runs"), manifest.indexOf("## Network"));
    const network = manifest.slice(manifest.indexOf("## Network"), manifest.indexOf("## Files it writes"));
    const files = manifest.slice(manifest.indexOf("## Files it writes"), manifest.indexOf("## Files\n"));
    expect(programs).toMatch(/`gitleaks git --redact --report-format template/);
    expect(programs).toMatch(/`git show-ref --head` in the repository/);
    expect(network).toMatch(/\| `scan-secrets` \(1\.3\.0\) \| Nothing\..*protocol\.allow=never.*GIT_NO_LAZY_FETCH=1.*\| Nothing \|/);
    expect(files).toMatch(/`ow-tools-scan-\*`.*0700.*Nothing is written in the scanned repository/);
    expect(manifest).toMatch(/\| `templates\/scan-secrets\.tmpl` \| `[0-9a-f]{64}` \|/);
    const readme = readFileSync(join(PLUGIN, "README.md"), "utf8");
    expect(readme).toMatch(/\*\*scan-secrets\*\*.*redacted form only.*`CLEAN` and `HITS` both exit 0/);
    expect(readme).toMatch(/gitleaks 8\.19 or newer/);
    expect(readme).toMatch(/- \*\*1\.3\.0:\*\* `scan-secrets`/);
    const skill = readFileSync(join(PLUGIN, "skills", "ow-tools", "SKILL.md"), "utf8");
    expect(skill).toMatch(/`ow-tools scan-secrets <repo> \[--json\]`/);
    const help = spawnSync(BIN, ["help"], { encoding: "utf8" }).stdout;
    expect(help).toMatch(/ow-tools scan-secrets <repo> \[--timeout SECONDS\]/);
    expect(help).toMatch(/CLEAN and HITS are both exit 0/);
    expect(spawnSync(BIN, ["help", "network"], { encoding: "utf8" }).stdout).toMatch(/scan-secrets {2}nothing/);
  });

  it("the redaction detector itself catches each key, part of one, and a partly redacted one", () => {
    for (const v of Object.values(FAKE)) expect(leaks(`x ${v} y`).length, v.slice(0, 6)).toBeGreaterThan(0);
    expect(leaks(`token ${FAKE.github.slice(0, 20)}`).length).toBeGreaterThan(0); // the first part only
    expect(leaks(`token ghp_REDACTED${FAKE.github.slice(-14)}`).length).toBeGreaterThan(0); // gitleaks --redact=60 style
    expect(leaks(`rows: config/settings.ini ${SHA} 3 aws-access-token`)).toEqual([]);
  });
});

// ---- small helpers ----------------------------------------------------------------------
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 20_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await sleep(50);
  }
  throw new Error("timed out waiting");
}
