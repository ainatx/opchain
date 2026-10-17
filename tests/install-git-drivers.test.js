import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CI_WORKFLOW_PATH,
  CLAUDE_MD_END,
  CLAUDE_MD_START,
  HOOK_MARKER,
  POST_COMMIT_HOOK,
  POST_COMMIT_MARKER,
  POST_COMMIT_SNIPPET,
  POST_COMMIT_SNIPPET_MARKER,
  PRE_COMMIT_HOOK,
  PRE_PUSH_HOOK,
  PRE_PUSH_MARKER,
  PRE_PUSH_SNIPPET,
  PRE_PUSH_SNIPPET_MARKER,
  VENDORED_RUNTIME_DIR,
  VERIFICATION_MARKER,
  outgoingBypasses,
} from "../scripts/install-git-drivers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "install-git-drivers.mjs");
const REAL_VERIFIER = readFileSync(join(ROOT, "scripts", "verify-candidate.mjs"), "utf8");
const REAL_VERIFIER_HAS_BYPASS_VERBS = REAL_VERIFIER.includes("bypass-record") && REAL_VERIFIER.includes("bypass-list");

// Every git call runs in a throwaway repo with its own identity, so the
// developer's global config (signing, hooksPath, templates) cannot leak in.
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
delete GIT_ENV.OPCHAIN_PUSH_BYPASS;
delete GIT_ENV.OPCHAIN_GATE;

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: GIT_ENV });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.trim();
}

function gitResult(cwd, args, env = GIT_ENV) {
  return spawnSync("git", args, { cwd, encoding: "utf8", env });
}

function install(cwd, args = [], env = GIT_ENV) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8", env });
}

// Every commit changes a file: receipts bind to trees, so two commits sharing
// a tree would share a receipt and hide exactly what these tests look for.
let changeCounter = 0;
function commit(cwd, message, extra = [], env = GIT_ENV) {
  changeCounter += 1;
  const file = `change-${changeCounter}.txt`;
  writeFileSync(join(cwd, file), `${message}\n`);
  const add = gitResult(cwd, ["add", file], env);
  if (add.status !== 0) return add;
  return gitResult(cwd, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", message, ...extra], env);
}

// A stand-in for the enrolled runtime's verify-candidate.mjs. `run` records a
// receipt marker for the staged tree (a gated commit); `bypass-record` writes
// the interface's record when no marker covers the commit's tree;
// `bypass-list` reports receipt / record / trailer / rewrite per commit in a
// range, with the real verifier's rules: a trailer is a Git trailer with a
// value, and a rewrite is excused only when its original had a receipt or a
// trailer. The hooks under test only depend on that interface.
const STUB_VERIFIER = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
const args = process.argv.slice(2);
const action = args.shift();
const opt = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const repo = opt("--repo") || process.cwd();
const g = (...a) => { const r = spawnSync("git", a, { cwd: repo, encoding: "utf8" }); return (r.stdout || "").trim(); };
const commonValue = g("rev-parse", "--git-common-dir");
const common = isAbsolute(commonValue) ? commonValue : join(repo, commonValue);
const receipts = join(common, "opchain", "test-receipts");
const records = join(common, "opchain", "bypasses", "v1");
const hasReceipt = (tree) => existsSync(join(receipts, tree));
const trailerOf = (sha) => Boolean(g("log", "-1", "--format=%(trailers:key=Opchain-Bypass,valueonly)", sha))
  || /^bypassed\\s*\\(\\s*\\S/i.test(g("log", "-1", "--format=%(trailers:key=bugcheck,valueonly)", sha));
const readRecord = (sha) => { try { return JSON.parse(readFileSync(join(records, sha + ".json"), "utf8")); } catch { return null; } };
if (action === "run") {
  const tree = g("write-tree");
  mkdirSync(receipts, { recursive: true });
  writeFileSync(join(receipts, tree), "PASS");
  process.stdout.write("[stub] verified " + tree.slice(0, 7) + "\\n");
  process.exit(0);
}
if (action === "bypass-record") {
  const commit = g("rev-parse", opt("--commit"));
  const tree = g("rev-parse", commit + "^{tree}");
  if (hasReceipt(tree)) process.exit(0);
  mkdirSync(records, { recursive: true });
  writeFileSync(join(records, commit + ".json"), JSON.stringify({
    schema: "opchain.bypass-record", version: 1, commit, tree, at: new Date().toISOString(),
    reason: opt("--reason"), source: opt("--source") || "no-verify", approved_by: null,
    ...(opt("--rewritten-from") ? { rewritten_from: g("rev-parse", opt("--rewritten-from")) } : {}),
  }));
  process.exit(0);
}
if (action === "bypass-list") {
  const shas = g("rev-list", opt("--range")).split("\\n").filter(Boolean);
  const out = shas.map((commit) => {
    const tree = g("rev-parse", commit + "^{tree}");
    const record = join(records, commit + ".json");
    const original = (readRecord(commit) || {}).rewritten_from;
    const rewrite = Boolean(original) && (hasReceipt(g("rev-parse", original + "^{tree}")) || trailerOf(original));
    return { commit, tree, receipt: hasReceipt(tree) ? "PASS" : "none", bypassRecord: existsSync(record), trailer: trailerOf(commit), rewrite };
  });
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}
process.stderr.write("stub: unknown action " + action + "\\n");
process.exit(2);
`;

let repo;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "oc-git-drivers-"));
  git(repo, "init", "-q", "-b", "main");
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

function hookPath(name) {
  return join(repo, ".git", "hooks", name);
}

function runtimeDir() {
  return join(repo, ".git", "opchain", "commit-gate", "v1");
}

function recordPath(sha) {
  return join(repo, ".git", "opchain", "bypasses", "v1", `${sha}.json`);
}

// Seed, enroll, then swap the runtime verifier for the stub so commits are
// deterministic and cheap. The installer copy stays real: the hooks call it.
function enroll({ stub = true } = {}) {
  writeFileSync(join(repo, "README.md"), "seed\n");
  git(repo, "add", "README.md");
  expect(commit(repo, "seed").status).toBe(0);
  const r = install(repo, ["--enroll"]);
  expect(r.status, r.stderr).toBe(0);
  if (stub) writeFileSync(join(runtimeDir(), "verify-candidate.mjs"), STUB_VERIFIER);
  return r;
}

describe("install-git-drivers: per-clone bootstrap", () => {
  it("installs the verifier hook without registering an unavailable merge driver", () => {
    const r = install(repo);
    expect(r.status, r.stderr).toBe(0);
    const mergeDriver = spawnSync("git", ["config", "--get", "merge.opchain-checkpoint.driver"], {
      cwd: repo,
      encoding: "utf8",
      env: GIT_ENV,
    });
    expect(mergeDriver.status).toBe(1);

    const hook = hookPath("pre-commit");
    expect(readFileSync(hook, "utf8")).toBe(PRE_COMMIT_HOOK);
    expect(statSync(hook).mode & 0o111, "hook must be executable").not.toBe(0);
  });

  it("installs managed post-commit and pre-push hooks with their markers", () => {
    expect(install(repo).status).toBe(0);
    for (const [name, content, marker] of [
      ["post-commit", POST_COMMIT_HOOK, POST_COMMIT_MARKER],
      ["pre-push", PRE_PUSH_HOOK, PRE_PUSH_MARKER],
    ]) {
      const hook = hookPath(name);
      expect(readFileSync(hook, "utf8")).toBe(content);
      expect(content).toContain(marker);
      expect(statSync(hook).mode & 0o111, `${name} must be executable`).not.toBe(0);
    }
    // The hooks run the runtime copy of this installer, so the runtime carries it,
    // along with the bypass ledger library the verifier loads beside itself.
    expect(existsSync(join(runtimeDir(), "install-git-drivers.mjs"))).toBe(true);
    expect(existsSync(join(runtimeDir(), "lib", "bypass-record.cjs"))).toBe(true);
    expect(existsSync(join(repo, ".opchain")), "npm prepare must not enroll").toBe(false);
  });

  it("is idempotent", () => {
    install(repo);
    const before = ["pre-commit", "post-commit", "pre-push"].map((name) => readFileSync(hookPath(name), "utf8"));
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(["pre-commit", "post-commit", "pre-push"].map((name) => readFileSync(hookPath(name), "utf8"))).toEqual(before);
  });

  it("never overwrites a pre-commit hook it did not write", () => {
    const hook = hookPath("pre-commit");
    mkdirSync(dirname(hook), { recursive: true });
    writeFileSync(hook, "#!/bin/sh\necho someone-elses-hook\n");
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(readFileSync(hook, "utf8")).toBe("#!/bin/sh\necho someone-elses-hook\n");
    expect(r.stderr).toContain("not managed by opchain");
    expect(r.stderr).toContain(VERIFICATION_MARKER);
  });

  it("never overwrites foreign post-commit or pre-push hooks, and prints each manual snippet", () => {
    for (const name of ["post-commit", "pre-push"]) {
      mkdirSync(dirname(hookPath(name)), { recursive: true });
      writeFileSync(hookPath(name), `#!/bin/sh\necho foreign ${name}\n`);
    }
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(readFileSync(hookPath("post-commit"), "utf8")).toBe("#!/bin/sh\necho foreign post-commit\n");
    expect(readFileSync(hookPath("pre-push"), "utf8")).toBe("#!/bin/sh\necho foreign pre-push\n");
    expect(r.stderr).toContain(POST_COMMIT_SNIPPET_MARKER);
    expect(r.stderr).toContain(PRE_PUSH_SNIPPET_MARKER);
    expect(r.stderr).toContain("--hook post-commit");
    expect(r.stderr).toContain("--hook pre-push");
    // A foreign hook blocks explicit enrollment the same way for every hook.
    const enrollResult = install(repo, ["--enroll"]);
    expect(enrollResult.status).toBe(1);
    expect(enrollResult.stderr).toContain("BLOCKED");
    expect(existsSync(join(repo, ".opchain"))).toBe(false);
  });

  it("keeps a hook composed from the snippets, which never end the host hook early (A-03, A-07)", { timeout: 30_000 }, () => {
    const composed = {
      "post-commit": `#!/bin/sh\necho before\n${POST_COMMIT_SNIPPET}\necho host-continued > "$(git rev-parse --show-toplevel)/.host-post-commit"\n`,
      "pre-push": `#!/bin/sh\n${PRE_PUSH_SNIPPET}\necho host-continued > "$(git rev-parse --show-toplevel)/.host-pre-push"\n`,
    };
    for (const [name, content] of Object.entries(composed)) {
      mkdirSync(dirname(hookPath(name)), { recursive: true });
      writeFileSync(hookPath(name), content, { mode: 0o755 });
    }
    // The snippets carry their own markers, not the whole-file managed ones.
    expect(POST_COMMIT_SNIPPET).not.toContain(POST_COMMIT_MARKER);
    expect(PRE_PUSH_SNIPPET).not.toContain(PRE_PUSH_MARKER);
    const r = enroll();
    expect(r.status, r.stderr).toBe(0);
    for (const [name, content] of Object.entries(composed)) expect(readFileSync(hookPath(name), "utf8")).toBe(content);
    expect(commit(repo, "gated").status).toBe(0);
    expect(existsSync(join(repo, ".host-post-commit")), "the snippet's exit must not end the host hook").toBe(true);
    const doctor = install(repo, ["--doctor"]);
    expect(doctor.stdout).toContain("composed with the opchain step");
  });

  it("leaves a hook with an edited opchain step alone, and --doctor does not advise replacing it (A-03)", { timeout: 30_000 }, () => {
    const edited = `${POST_COMMIT_HOOK}\n# my own step\necho keep-me\n`.replace("verifier runtime is missing;", "verifier runtime is gone;");
    mkdirSync(dirname(hookPath("post-commit")), { recursive: true });
    writeFileSync(hookPath("post-commit"), edited, { mode: 0o755 });
    const r = install(repo);
    expect(r.status).toBe(0);
    expect(readFileSync(hookPath("post-commit"), "utf8")).toBe(edited);
    expect(r.stderr).toContain("carries an opchain marker but matches no version opchain wrote");
    expect(install(repo, ["--enroll"]).status).toBe(1);
    expect(readFileSync(hookPath("post-commit"), "utf8")).toBe(edited);
    const doctor = install(repo, ["--doctor"]);
    expect(doctor.stdout).toContain("FAIL  hook:post-commit:");
    expect(doctor.stdout).toContain("/oc-enroll will not replace it");
    expect(doctor.stdout).not.toMatch(/hook:post-commit:[^\n]*re-run \/oc-enroll/);
  });

  it("does not count a snippet after an exit as composed", { timeout: 20_000 }, () => {
    const early = `#!/bin/sh\necho mine\nexit 0\n${POST_COMMIT_SNIPPET}\n`;
    mkdirSync(dirname(hookPath("post-commit")), { recursive: true });
    writeFileSync(hookPath("post-commit"), early, { mode: 0o755 });
    const r = install(repo);
    expect(r.stderr).toContain("carries an opchain marker but matches no version opchain wrote");
    expect(readFileSync(hookPath("post-commit"), "utf8")).toBe(early);
    expect(install(repo, ["--doctor"]).stdout).toContain("FAIL  hook:post-commit:");
  });

  it("replaces a byte-identical earlier managed version (A-03)", { timeout: 20_000 }, () => {
    const shown = spawnSync("git", ["-C", ROOT, "show", "ffad47cf:scripts/install-git-drivers.mjs"], { encoding: "utf8" });
    if (shown.status !== 0) return; // a checkout without that history (the public mirror)
    const match = /export const PRE_COMMIT_HOOK = `([\s\S]*?)`;\n/.exec(shown.stdout);
    expect(match).not.toBeNull();
    const previous = new Function("HOOK_MARKER", `return \`${match[1]}\`;`)("opchain: regenerate generated skill mirrors");
    mkdirSync(dirname(hookPath("pre-commit")), { recursive: true });
    writeFileSync(hookPath("pre-commit"), previous, { mode: 0o755 });
    expect(install(repo, ["--doctor"]).stdout).toContain("is an older managed version; re-run /oc-enroll");
    expect(install(repo).status).toBe(0);
    expect(readFileSync(hookPath("pre-commit"), "utf8")).toBe(PRE_COMMIT_HOOK);
  });

  it("honours core.hooksPath", () => {
    git(repo, "config", "core.hooksPath", ".githooks");
    const r = install(repo);
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(repo, ".githooks", "pre-commit"), "utf8")).toContain(HOOK_MARKER);
    expect(readFileSync(join(repo, ".githooks", "post-commit"), "utf8")).toContain(POST_COMMIT_MARKER);
    expect(readFileSync(join(repo, ".githooks", "pre-push"), "utf8")).toContain(PRE_PUSH_MARKER);
  });

  it("skips entirely under OPCHAIN_SKIP_GIT_DRIVERS=1", () => {
    const r = spawnSync(process.execPath, [SCRIPT], {
      cwd: repo,
      encoding: "utf8",
      env: { ...GIT_ENV, OPCHAIN_SKIP_GIT_DRIVERS: "1" },
    });
    expect(r.status).toBe(0);
    expect(() => statSync(hookPath("pre-commit"))).toThrow();
    expect(() => statSync(hookPath("post-commit"))).toThrow();
  });

  it("explicit enrollment names all three hooks and the runtime", () => {
    const r = enroll();
    expect(r.stdout).toContain("enrolled Git commit boundary");
    expect(r.stdout).toContain("bypass record");
    expect(r.stdout).toContain("push guard");
    expect(r.stdout).toContain("verifier runtime");
    expect(existsSync(join(repo, ".opchain"))).toBe(true);
  });
});

// Each integration fixture initializes and commits a repository through real
// hooks and multiple Node generators; allow slow CI without relaxing assertions.
describe("the pre-commit hook", () => {
  // Stand-in sync scripts: each writes a marker into the mirror it owns, the
  // way the real generators rewrite plugins/opchain/skills and
  // skills/<id>/references/*.md from skills/.
  function scaffold() {
    mkdirSync(join(repo, "scripts"), { recursive: true });
    mkdirSync(join(repo, "skills", "oc-demo", "references"), { recursive: true });
    mkdirSync(join(repo, "plugins", "opchain", "skills"), { recursive: true });
    writeFileSync(
      join(repo, "scripts", "sync-skill-bundles.mjs"),
      `import { writeFileSync } from "node:fs";
writeFileSync("skills/oc-demo/references/orchestrator.md", "regenerated bundle\\n");`,
    );
    writeFileSync(
      join(repo, "scripts", "sync-plugin-skills.mjs"),
      `import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("plugins/opchain/skills/oc-demo", { recursive: true });
writeFileSync("plugins/opchain/skills/oc-demo/SKILL.md", "regenerated mirror\\n");`,
    );
    writeFileSync(join(repo, "scripts", "merge-checkpoint.mjs"), "process.exit(0);\n");
    writeFileSync(join(repo, "package.json"), '{"name":"opchain-dev"}\n');
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 1\n");
    writeFileSync(join(repo, "skills", "oc-demo", "references", "orchestrator.md"), "stale bundle\n");
    writeFileSync(join(repo, "plugins", "opchain", "skills", ".keep"), "");
    git(repo, "add", "-A");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "seed");
    expect(install(repo).status).toBe(0);
    expect(git(repo, "config", "merge.opchain-checkpoint.driver")).toContain("scripts/merge-checkpoint.mjs");
  }

  it("regenerates and stages both mirrors when skills/ is staged", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 2\n");
    git(repo, "add", "skills/oc-demo/SKILL.md");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "bump");

    const committed = git(repo, "show", "--name-only", "--format=", "HEAD").split("\n").sort();
    expect(committed).toEqual([
      "plugins/opchain/skills/oc-demo/SKILL.md",
      "skills/oc-demo/SKILL.md",
      "skills/oc-demo/references/orchestrator.md",
    ]);
    expect(git(repo, "show", "HEAD:skills/oc-demo/references/orchestrator.md")).toBe("regenerated bundle");
    expect(git(repo, "status", "--porcelain")).toBe("");
  });

  it("does nothing when skills/ is not part of the commit", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "README.md"), "hello\n");
    git(repo, "add", "README.md");
    git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "docs");
    expect(git(repo, "show", "--name-only", "--format=", "HEAD")).toBe("README.md");
  });

  it("can be skipped once with OPCHAIN_SKIP_MIRROR_SYNC=1, leaving the drift for CI", { timeout: 20_000 }, () => {
    scaffold();
    writeFileSync(join(repo, "skills", "oc-demo", "SKILL.md"), "version: 3\n");
    git(repo, "add", "skills/oc-demo/SKILL.md");
    const r = spawnSync("git", ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "skip"], {
      cwd: repo,
      encoding: "utf8",
      env: { ...GIT_ENV, OPCHAIN_SKIP_MIRROR_SYNC: "1" },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(git(repo, "show", "--name-only", "--format=", "HEAD")).toBe("skills/oc-demo/SKILL.md");
  });
});

describe("the post-commit hook", () => {
  it("stays inert in a repository that is installed but not enrolled", { timeout: 20_000 }, () => {
    expect(install(repo).status).toBe(0);
    const r = commit(repo, "unenrolled", ["--no-verify"]);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(repo, ".git", "opchain", "bypasses"))).toBe(false);
    expect(r.stderr).not.toContain("bypassed the gate");
  });

  it("records a --no-verify commit and says so; a gated commit leaves no record", { timeout: 30_000 }, () => {
    enroll();
    const gated = commit(repo, "gated");
    expect(gated.status, gated.stderr).toBe(0);
    expect(existsSync(recordPath(git(repo, "rev-parse", "HEAD")))).toBe(false);
    expect(gated.stderr).not.toContain("bypassed the gate");

    const bypassed = commit(repo, "skipped the gate", ["--no-verify"]);
    expect(bypassed.status, bypassed.stderr).toBe(0);
    const sha = git(repo, "rev-parse", "HEAD");
    expect(existsSync(recordPath(sha))).toBe(true);
    const record = JSON.parse(readFileSync(recordPath(sha), "utf8"));
    expect(record).toMatchObject({ schema: "opchain.bypass-record", commit: sha, source: "no-verify" });
    expect(bypassed.stderr).toContain(`commit ${sha.slice(0, 7)} bypassed the gate — recorded`);
    expect(bypassed.stderr).toContain("Opchain-Bypass");
  });

  it("takes the reason from the Opchain-Bypass trailer", { timeout: 30_000 }, () => {
    enroll();
    const r = commit(repo, "wip", ["--no-verify", "--trailer", "Opchain-Bypass: owner approved in chat; tests FAIL on main"]);
    expect(r.status, r.stderr).toBe(0);
    const record = JSON.parse(readFileSync(recordPath(git(repo, "rev-parse", "HEAD")), "utf8"));
    expect(record.reason).toBe("owner approved in chat; tests FAIL on main");
    expect(r.stderr).toContain("reason: owner approved in chat");
  });

  it("marks a rebase rewrite as such", { timeout: 30_000 }, () => {
    enroll();
    git(repo, "checkout", "-qb", "feature");
    expect(commit(repo, "feature work").status).toBe(0);
    const original = git(repo, "rev-parse", "HEAD");
    git(repo, "checkout", "-q", "main");
    expect(commit(repo, "main moved").status).toBe(0);
    git(repo, "checkout", "-q", "feature");
    const rebase = gitResult(repo, ["-c", "commit.gpgsign=false", "rebase", "-q", "main"]);
    expect(rebase.status, rebase.stderr).toBe(0);
    const record = JSON.parse(readFileSync(recordPath(git(repo, "rev-parse", "HEAD")), "utf8"));
    expect(record.source).toBe("rebase");
    // Provenance names the picked commit; the text excuses nothing (A-01).
    expect(record.rewritten_from).toBe(original);
    expect(record.reason).toBe(`rebase of ${original.slice(0, 12)}`);
  });

  it.skipIf(!REAL_VERIFIER_HAS_BYPASS_VERBS)("records through the real runtime verifier", { timeout: 60_000 }, () => {
    enroll({ stub: false });
    const r = commit(repo, "real bypass", ["--no-verify"]);
    expect(r.status, r.stderr).toBe(0);
    const sha = git(repo, "rev-parse", "HEAD");
    expect(existsSync(recordPath(sha)), r.stderr).toBe(true);
    expect(JSON.parse(readFileSync(recordPath(sha), "utf8"))).toMatchObject({ schema: "opchain.bypass-record", commit: sha });
  });
});

describe("the pre-push hook", () => {
  let remote;

  function push(args, env = GIT_ENV) {
    return gitResult(repo, ["push", "-q", "origin", ...args], env);
  }

  beforeEach(() => {
    remote = mkdtempSync(join(tmpdir(), "oc-git-drivers-remote-"));
    expect(gitResult(remote, ["init", "-q", "--bare", "-b", "main"]).status).toBe(0);
  });

  afterEach(() => {
    rmSync(remote, { recursive: true, force: true });
  });

  function enrollWithRemote() {
    enroll();
    git(repo, "remote", "add", "origin", remote);
    // The seed predates enrollment, so it has no receipt: the first push is the
    // documented one-time use of the loud escape hatch.
    const first = push(["main"], { ...GIT_ENV, OPCHAIN_PUSH_BYPASS: "1" });
    expect(first.status, first.stderr).toBe(0);
    expect(first.stderr).toContain("allowed by OPCHAIN_PUSH_BYPASS=1");
    expect(first.stderr).toContain("seed");
  }

  it("refuses history that predates enrollment unless OPCHAIN_PUSH_BYPASS=1", { timeout: 30_000 }, () => {
    enroll();
    git(repo, "remote", "add", "origin", remote);
    const refused = push(["main"]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("REFUSED");
    expect(refused.stderr).toContain(git(repo, "rev-parse", "--short=7", "HEAD"));
  });

  it("allows gated commits, refuses an unaccounted bypass, allows it once it carries the trailer", { timeout: 60_000 }, () => {
    enrollWithRemote();
    expect(commit(repo, "gated").status).toBe(0);
    const clean = push(["main"]);
    expect(clean.status, clean.stderr).toBe(0);
    expect(clean.stderr).not.toContain("opchain");

    expect(commit(repo, "sneaky", ["--no-verify"]).status).toBe(0);
    const sha = git(repo, "rev-parse", "HEAD");
    const refused = push(["main"]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("REFUSED");
    expect(refused.stderr).toContain(sha.slice(0, 7));
    expect(refused.stderr).toContain("sneaky");
    expect(refused.stderr).toContain("bypass record: yes");
    expect(refused.stderr).toContain("--trailer");
    expect(git(remote, "rev-parse", "main")).not.toBe(sha);

    const amend = gitResult(repo, ["-c", "commit.gpgsign=false", "commit", "-q", "--amend", "--no-verify", "--no-edit", "--trailer", "Opchain-Bypass: owner said ship it; vitest flake #565"]);
    expect(amend.status, amend.stderr).toBe(0);
    const allowed = push(["main"]);
    expect(allowed.status, allowed.stderr).toBe(0);
    expect(git(remote, "rev-parse", "main")).toBe(git(repo, "rev-parse", "HEAD"));
  });

  it("lets OPCHAIN_PUSH_BYPASS=1 through with a warning that names the commits", { timeout: 60_000 }, () => {
    enrollWithRemote();
    expect(commit(repo, "sneaky", ["--no-verify"]).status).toBe(0);
    const r = push(["main"], { ...GIT_ENV, OPCHAIN_PUSH_BYPASS: "1" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).toContain("allowed by OPCHAIN_PUSH_BYPASS=1");
    expect(r.stderr).toContain("sneaky");
    expect(git(remote, "rev-parse", "main")).toBe(git(repo, "rev-parse", "HEAD"));
  });

  it("excuses commits a rebase rewrote and ignores merge commits", { timeout: 60_000 }, () => {
    enrollWithRemote();
    git(repo, "checkout", "-qb", "feature");
    expect(commit(repo, "feature work").status).toBe(0);
    git(repo, "checkout", "-q", "main");
    expect(commit(repo, "main moved").status).toBe(0);
    expect(push(["main"]).status).toBe(0);
    git(repo, "checkout", "-q", "feature");
    expect(gitResult(repo, ["-c", "commit.gpgsign=false", "rebase", "-q", "main"]).status).toBe(0);
    const rebased = push(["feature"]);
    expect(rebased.status, rebased.stderr).toBe(0);

    // A merge from main has no receipt either; it is never examined.
    expect(commit(repo, "main moved again").status).toBe(0);
    git(repo, "checkout", "-q", "main");
    expect(commit(repo, "more main").status).toBe(0);
    expect(push(["main"]).status).toBe(0);
    git(repo, "checkout", "-q", "feature");
    expect(gitResult(repo, ["-c", "commit.gpgsign=false", "merge", "-q", "--no-ff", "main", "-m", "merge main"]).status).toBe(0);
    const merged = push(["feature"]);
    expect(merged.status, merged.stderr).toBe(0);
  });

  it("refuses a --no-verify commit laundered through rebase --force-rebase (A-01)", { timeout: 60_000 }, () => {
    enrollWithRemote();
    expect(commit(repo, "sneaky", ["--no-verify"]).status).toBe(0);
    const original = git(repo, "rev-parse", "HEAD");
    expect(push(["main"]).status).not.toBe(0);
    // A later committer date makes the replay a different commit.
    const rebase = gitResult(repo, ["-c", "commit.gpgsign=false", "rebase", "-q", "--force-rebase", "HEAD~1"], { ...GIT_ENV, GIT_COMMITTER_DATE: "2030-01-01T00:00:00Z" });
    expect(rebase.status, rebase.stderr).toBe(0);
    const rewritten = git(repo, "rev-parse", "HEAD");
    expect(rewritten).not.toBe(original);
    expect(JSON.parse(readFileSync(recordPath(rewritten), "utf8"))).toMatchObject({ source: "rebase", rewritten_from: original });
    const refused = push(["main"]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("REFUSED");
    expect(refused.stderr).toContain(rewritten.slice(0, 7));

    // A record whose reason merely says it was a rewrite is not an excuse either.
    writeFileSync(recordPath(rewritten), JSON.stringify({ schema: "opchain.bypass-record", version: 1, commit: rewritten, reason: "rewritten by rebase; the original commits were gated", source: "rebase" }));
    expect(push(["main"]).status).not.toBe(0);
  });

  it.skipIf(!REAL_VERIFIER_HAS_BYPASS_VERBS)("refuses a push covered only by a PASS under a weaker policy (A-08)", { timeout: 90_000 }, () => {
    writeFileSync(join(repo, "check.mjs"), "process.exit(1);\n");
    writeFileSync(join(repo, ".bugcheck.json"), JSON.stringify({ verification: { required_checks: ["tests"], commands: { tests: ["node", "check.mjs"] }, timeout_ms: 10_000 } }));
    writeFileSync(join(repo, "weak.json"), JSON.stringify({ verification: { required_checks: ["secrets"], commands: {}, timeout_ms: 10_000 } }));
    git(repo, "add", "-A");
    enroll({ stub: false });
    git(repo, "remote", "add", "origin", remote);
    expect(push(["main"], { ...GIT_ENV, OPCHAIN_PUSH_BYPASS: "1" }).status).toBe(0);
    writeFileSync(join(repo, "subject.txt"), "weakly verified\n");
    git(repo, "add", "subject.txt");
    const runtime = join(runtimeDir(), "verify-candidate.mjs");
    const weak = spawnSync(process.execPath, [runtime, "run", "--repo", repo, "--policy", "weak.json", "--json"], { cwd: repo, encoding: "utf8", env: GIT_ENV });
    expect(weak.status, weak.stderr).toBe(0);
    const bypassed = gitResult(repo, ["-c", "commit.gpgsign=false", "commit", "-q", "--no-verify", "-m", "weakly verified"]);
    expect(bypassed.status, bypassed.stderr).toBe(0);
    const sha = git(repo, "rev-parse", "HEAD");
    expect(existsSync(recordPath(sha))).toBe(true);
    const listed = spawnSync(process.execPath, [runtime, "bypass-list", "--repo", repo, "--range", `${sha}^!`, "--json"], { cwd: repo, encoding: "utf8", env: GIT_ENV });
    expect(JSON.parse(listed.stdout)[0].receipt).toBe("PASS_UNMATCHED");
    const refused = push(["main"]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("REFUSED");
    expect(refused.stderr).toContain(sha.slice(0, 7));
  });

  it("fails closed on a force-push over a remote tip this clone has never fetched (A-02)", { timeout: 60_000 }, () => {
    enrollWithRemote();
    const other = mkdtempSync(join(tmpdir(), "oc-git-drivers-other-"));
    try {
      expect(gitResult(other, ["clone", "-q", remote, "."]).status).toBe(0);
      writeFileSync(join(other, "theirs.txt"), "theirs\n");
      expect(gitResult(other, ["add", "theirs.txt"]).status).toBe(0);
      expect(gitResult(other, ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "theirs"]).status).toBe(0);
      expect(gitResult(other, ["-c", "core.hooksPath=/dev/null", "push", "-q", "origin", "main"]).status).toBe(0);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
    expect(commit(repo, "sneaky", ["--no-verify"]).status).toBe(0);
    const forced = push(["--force", "main"]);
    expect(forced.status, forced.stderr).not.toBe(0);
    expect(forced.stderr).toContain("REFUSED");
    expect(forced.stderr).toContain("sneaky");
  });

  it("throws instead of returning no offenders when the outgoing range cannot be listed (A-02)", { timeout: 30_000 }, () => {
    enroll();
    const info = { root: repo, commonDir: join(repo, ".git"), gitDir: join(repo, ".git") };
    expect(() => outgoingBypasses(info, { localSha: "1".repeat(40), remoteSha: "0".repeat(40), remote: "origin" })).toThrow(/could not list/);
  });

  it("is a precondition failure, not a pass, when the runtime cannot list bypasses", { timeout: 30_000 }, () => {
    enrollWithRemote();
    expect(commit(repo, "gated").status).toBe(0);
    writeFileSync(join(runtimeDir(), "verify-candidate.mjs"), "process.exit(9);\n");
    const r = push(["main"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("BLOCKED");
    expect(r.stderr).toContain("bypass guard could not run");
  });
});

describe("--doctor", () => {
  function policy(commands) {
    writeFileSync(join(repo, ".bugcheck.json"), JSON.stringify({ verification: { required_checks: Object.keys(commands), commands } }));
  }

  it("names every missing piece without installing anything", { timeout: 20_000 }, () => {
    const r = install(repo, ["--doctor"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("FAIL  enrollment:");
    expect(r.stdout).toContain("FAIL  runtime:");
    expect(r.stdout).toContain("FAIL  hook:pre-commit: not installed");
    expect(r.stdout).toContain("FAIL  hook:post-commit: not installed");
    expect(r.stdout).toContain("FAIL  hook:pre-push: not installed");
    expect(r.stdout).toContain("FAIL  policy: .bugcheck.json is missing");
    expect(r.stdout).toMatch(/opchain doctor: FAIL/);
    expect(existsSync(hookPath("pre-commit"))).toBe(false);
    expect(existsSync(join(repo, ".opchain"))).toBe(false);
  });

  it("checks that every declared command resolves and node_modules is a real install", { timeout: 30_000 }, () => {
    enroll({ stub: false });
    writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "consumer", devDependencies: { vitest: "^4" }, scripts: { test: "node check.mjs", lint: "node lint.mjs" } }));
    policy({
      tests: ["npm", "test"],
      lint: ["npm", "run", "lint"],
      types: ["npm", "run", "typecheck"],
      ghost: ["definitely-not-a-binary-xyz", "--version"],
      direct: ["node", "check.mjs"],
    });
    let r = install(repo, ["--doctor"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("PASS  enrollment: .opchain/ present");
    expect(r.stdout).toContain("PASS  runtime:");
    expect(r.stdout).toContain("PASS  hook:pre-commit:");
    expect(r.stdout).toContain("PASS  hook:post-commit:");
    expect(r.stdout).toContain("PASS  hook:pre-push:");
    expect(r.stdout).toContain("PASS  policy: .bugcheck.json");
    expect(r.stdout).toContain("PASS  command:tests:");
    expect(r.stdout).toContain("PASS  command:lint:");
    expect(r.stdout).toContain("PASS  command:direct:");
    expect(r.stdout).toContain('FAIL  command:types: "typecheck" is not a script in ./package.json');
    expect(r.stdout).toContain("FAIL  command:ghost: definitely-not-a-binary-xyz is not on PATH");
    expect(r.stdout).toContain("FAIL  node_modules:.: ./node_modules is missing");

    // The audit's exit-127 shape: a node_modules that is only a .vite cache.
    mkdirSync(join(repo, "node_modules", ".vite"), { recursive: true });
    policy({ tests: ["npm", "test"] });
    r = install(repo, ["--doctor"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("FAIL  node_modules:.: ./node_modules holds only caches (.vite)");

    mkdirSync(join(repo, "node_modules", "left-pad"), { recursive: true });
    writeFileSync(join(repo, "node_modules", ".package-lock.json"), "{}\n");
    r = install(repo, ["--doctor"]);
    expect(r.status, r.stdout).toBe(0);
    expect(r.stdout).toContain("PASS  node_modules:.: ./node_modules has 1 packages");
    expect(r.stdout).toMatch(/opchain doctor: PASS/);
  });

  it("flags a policy without a verification block and a stale runtime copy", { timeout: 30_000 }, () => {
    enroll();
    writeFileSync(join(repo, ".bugcheck.json"), JSON.stringify({ mode: "strict" }));
    const r = install(repo, ["--doctor"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FAIL  policy: .bugcheck.json has no "verification" block');
    expect(r.stdout).toContain("WARN  runtime:");
    expect(r.stdout).toContain("re-run /oc-enroll");
  });
});

describe("--ci", () => {
  const TEMPLATE = readFileSync(join(ROOT, "plugins", "opchain", "templates", "opchain-evidence.yml"), "utf8");

  it("vendors the runtime, writes the workflow, and refuses to overwrite it without --force", { timeout: 30_000 }, () => {
    writeFileSync(join(repo, "README.md"), "seed\n");
    git(repo, "add", "README.md");
    expect(commit(repo, "seed").status).toBe(0);

    const r = install(repo, ["--ci"]);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(join(repo, ".opchain")), "--ci implies enrollment").toBe(true);
    expect(readFileSync(join(repo, CI_WORKFLOW_PATH), "utf8")).toBe(TEMPLATE);
    expect(r.stdout).toContain(`wrote ${CI_WORKFLOW_PATH}`);
    for (const file of [
      "scripts/verify-candidate.mjs",
      "scripts/lib/verification-receipt.cjs",
      "scripts/lib/bypass-record.cjs",
      "scripts/lib/release-evidence.mjs",
      "src/lib/mcp/checkpoint-contract.js",
      "package.json",
    ]) {
      expect(existsSync(join(repo, VENDORED_RUNTIME_DIR, file)), file).toBe(true);
      expect(r.stdout).toContain(`wrote ${join(VENDORED_RUNTIME_DIR, file)}`);
    }
    expect(JSON.parse(readFileSync(join(repo, VENDORED_RUNTIME_DIR, "package.json"), "utf8")).type).toBe("module");
    expect(r.stdout).toContain("commit .opchain/runtime/");

    // The vendored evidence gate must load from its new home.
    const vendored = spawnSync(process.execPath, [join(repo, VENDORED_RUNTIME_DIR, "scripts/lib/release-evidence.mjs"), "--repo", repo, "--print-candidate", "--json"], { cwd: repo, encoding: "utf8", env: GIT_ENV });
    expect(vendored.status, vendored.stderr).toBe(0);
    expect(JSON.parse(vendored.stdout)).toMatchObject({ ok: true, candidate: git(repo, "rev-parse", "HEAD") });

    writeFileSync(join(repo, CI_WORKFLOW_PATH), "name: customised\n");
    const refused = install(repo, ["--ci"]);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("REFUSED");
    expect(refused.stderr).toContain("--force");
    expect(readFileSync(join(repo, CI_WORKFLOW_PATH), "utf8")).toBe("name: customised\n");

    const forced = install(repo, ["--ci", "--force"]);
    expect(forced.status, forced.stderr).toBe(0);
    expect(readFileSync(join(repo, CI_WORKFLOW_PATH), "utf8")).toBe(TEMPLATE);
  });

  it("the template runs the base branch's verifier and policy and skips evidence for the Dependabot actor only", () => {
    // A-05: the gate that judges a pull request comes from the base ref.
    expect(TEMPLATE).toContain('git archive "origin/$BASE_REF" .opchain/runtime');
    expect(TEMPLATE).toContain('git show "origin/$BASE_REF:.bugcheck.json"');
    expect(TEMPLATE).toContain('node "$RUNNER_TEMP/opchain-base/.opchain/runtime/scripts/verify-candidate.mjs" run --repo . --json');
    expect(TEMPLATE).toContain('node "$runtime/scripts/lib/release-evidence.mjs" --stage pr --repo .');
    expect(TEMPLATE).not.toContain("node .opchain/runtime/scripts/verify-candidate.mjs");
    expect(TEMPLATE).not.toContain("GITHUB_ENV\"");
    // The base runtime is extracted before PR code runs; installs skip lifecycle scripts.
    expect(TEMPLATE.indexOf("git archive")).toBeLessThan(TEMPLATE.indexOf("npm ci"));
    expect(TEMPLATE).toContain("npm ci --ignore-scripts");
    expect(TEMPLATE).toContain('NODE_OPTIONS: ""');
    expect(TEMPLATE).toContain("CODEOWNERS");
    expect(TEMPLATE).toContain("if: github.event.pull_request.user.login != 'dependabot[bot]'\n");
    expect(TEMPLATE).not.toContain("github.actor");
    expect(TEMPLATE).not.toContain("labels");
    expect(TEMPLATE).toContain("fetch-depth: 0");
    // A-04: the template says what CI cannot see.
    expect(TEMPLATE).toContain("leaves nothing for CI to read");
  });

  it("this repository's CI skips evidence on the Dependabot actor, not a label (C-07)", () => {
    const ci = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
    expect(ci).toContain("if: github.event.pull_request.user.login != 'dependabot[bot]'\n");
    expect(ci).not.toContain("pull_request.labels");
  });
});

describe("--claude-md", () => {
  it("creates, appends to, and idempotently updates the managed section", () => {
    const file = join(repo, "CLAUDE.md");
    let r = install(repo, ["--claude-md"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("created");
    const created = readFileSync(file, "utf8");
    expect(created).toContain(CLAUDE_MD_START);
    expect(created).toContain(CLAUDE_MD_END);
    for (const verb of ["/oc-commit", "/oc-pr", "/oc-git-sync", "/oc-deploy", "/oc-bugcheck", "/oc-enroll"]) expect(created).toContain(verb);
    expect(created).toContain("--no-verify");
    expect(existsSync(hookPath("pre-commit")), "--claude-md installs nothing").toBe(false);

    r = install(repo, ["--claude-md"]);
    expect(r.stdout).toContain("unchanged");
    expect(readFileSync(file, "utf8")).toBe(created);

    writeFileSync(file, "# My project\n\nHand-written guidance.\n");
    r = install(repo, ["--claude-md"]);
    expect(r.stdout).toContain("appended");
    const appended = readFileSync(file, "utf8");
    expect(appended.startsWith("# My project\n\nHand-written guidance.\n\n")).toBe(true);
    expect(appended).toContain(CLAUDE_MD_START);

    // An edited stale section is replaced in place, the surrounding text kept.
    writeFileSync(file, `intro\n\n${CLAUDE_MD_START}\nold text\n${CLAUDE_MD_END}\n\noutro\n`);
    r = install(repo, ["--claude-md"]);
    expect(r.stdout).toContain("updated");
    const updated = readFileSync(file, "utf8");
    expect(updated.startsWith("intro\n\n")).toBe(true);
    expect(updated.endsWith("\n\noutro\n")).toBe(true);
    expect(updated).not.toContain("old text");
    expect(updated).toContain("/oc-commit");
  });
});
