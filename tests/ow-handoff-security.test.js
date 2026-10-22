// ow-handoff's security tests (OW-06 contract C7, C26, § Security review Part 2): the skill side of the
// redacted scan on the invented Mossgate repository, built at layout time with a key committed and then removed
// from the tree (and one in an untracked .env), and the security claims of the skill text, each pinned so the
// text cannot claim more than ow-tools does (owner decisions OD-1 to OD-3 of PR 1's review). Fake keys are made
// from parts at run time; no key-shaped string is committed. The real-binary half needs gitleaks 8.19+ (the
// build machine has 8.30.1); without it, it skips and says so. The text-review PoCs land here as they are found.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES, SKILL } from "../scripts/ow-handoff-acceptance.mjs";
import { cleanup, temp } from "./ow-handoff-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const BIN = join(ROOT, "plugins", "ow-tools", "bin", "ow-tools");
afterAll(cleanup);

const chars = (seed, n, abc) => { let out = ""; for (let i = 0; out.length < n; i++) for (const b of createHash("sha256").update(`ow-handoff-fixture:${seed}:${i}`).digest()) if (out.length < n) out += abc[b % abc.length]; return out; };
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const COMMITTED = `${"AK"}${"IA"}${chars("committed", 16, B32)}`;
const UNTRACKED = `${"AK"}${"IA"}${chars("untracked", 16, B32)}`;
const gitleaks = spawnSync("gitleaks", ["version"], { encoding: "utf8" });
const HAS_GITLEAKS = gitleaks.status === 0 && /^v?8\.(?:19|[2-9]\d)/.test(gitleaks.stdout.trim());
const GIT_VERSION = spawnSync("git", ["--version"], { encoding: "utf8" }).stdout.trim();
const label = HAS_GITLEAKS ? `gitleaks ${gitleaks.stdout.trim()}, ${GIT_VERSION}` : "SKIPPED: gitleaks 8.19+ is not installed here (the stub tests of tests/ow-tools/scan-secrets.test.js carry C8)";

/** The invented Mossgate repository with a history: a key committed, then removed from the tree. */
function mossgateWithHistory() {
  const dir = join(temp("ow-ho-repo-"), "mossgate-repo");
  cpSync(join(FIXTURES, "worlds", "mossgate", "mossgate-repo"), dir, { recursive: true });
  const env = { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Builder", GIT_AUTHOR_EMAIL: "builder@example.test", GIT_COMMITTER_NAME: "Builder", GIT_COMMITTER_EMAIL: "builder@example.test", GIT_AUTHOR_DATE: "2026-11-02T10:00:00Z", GIT_COMMITTER_DATE: "2026-11-02T10:00:00Z" };
  const git = (...a) => { const r = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main", "-c", "core.hooksPath=/dev/null", ...a], { cwd: dir, env, encoding: "utf8" }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout; };
  git("init", "-q");
  mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "settings.js"), `module.exports = {\n  region: "us-east-2",\n  tillKey: "${COMMITTED}",\n};\n`);
  git("add", "-A");
  git("commit", "-q", "-m", "first version");
  writeFileSync(join(dir, "config", "settings.js"), "module.exports = {\n  region: \"us-east-2\",\n  tillKey: process.env.TILL_API_TOKEN,\n};\n");
  git("commit", "-q", "-am", "read the key from the environment");
  writeFileSync(join(dir, ".env"), `TILL_API_TOKEN=${UNTRACKED}\n`);
  return dir;
}

describe(`C7: the redacted scan on the Mossgate repository (${label})`, () => {
  it.skipIf(!HAS_GITLEAKS)("HITS is exit 0, found by path and rule from the history; the key appears nowhere; the untracked .env is never scanned", () => {
    const repo = mossgateWithHistory();
    const r = spawnSync(BIN, ["scan-secrets", repo, "--json"], { encoding: "utf8", env: { ...process.env, TMPDIR: temp("ow-ho-tmp-") } });
    const all = `${r.stdout}\n${r.stderr}`;
    expect(r.status, all.slice(0, 400)).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.status).toBe("HITS");
    expect(j.rows.some((x) => x.path === "config/settings.js")).toBe(true);
    expect(j.rows.some((x) => /\.env$/.test(x.path))).toBe(false);
    for (const k of [COMMITTED, UNTRACKED]) for (let i = 0; i + 12 <= k.length; i++) expect(all.includes(k.slice(i, i + 12))).toBe(false);
    expect(j.not_read.join(" ")).toMatch(/commit and tag messages/);
  }, 120_000);
  it.skipIf(!HAS_GITLEAKS)("CLEAN is exit 0 too (the skill reads only exit 0 as a result)", () => {
    const dir = join(temp("ow-ho-clean-"), "repo");
    cpSync(join(FIXTURES, "worlds", "mossgate", "mossgate-repo"), dir, { recursive: true });
    const env = { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "B", GIT_AUTHOR_EMAIL: "b@example.test", GIT_COMMITTER_NAME: "B", GIT_COMMITTER_EMAIL: "b@example.test" };
    for (const a of [["init", "-q"], ["add", "-A"], ["commit", "-q", "-m", "init"]]) spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "init.defaultBranch=main", ...a], { cwd: dir, env });
    const r = spawnSync(BIN, ["scan-secrets", dir, "--json"], { encoding: "utf8", env: { ...process.env, TMPDIR: temp("ow-ho-tmp-") } });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).status).toBe("CLEAN");
  }, 120_000);
});

describe("C7, C26: the skill text claims no more than the tool does", () => {
  const text = (rel) => readFileSync(join(SKILL, rel), "utf8");
  const all = readdirSync(join(SKILL, "references")).map((f) => text(`references/${f}`)).join("\n") + text("SKILL.md");
  const claims = [
    ["the scan reads committed history only, HEAD included", "references/accounts-format.md", "committed history on every branch and tag, HEAD included (the delivered tree)"],
    ["binary, UTF-16 and commit and tag messages are not scanned (OD-2)", "references/accounts-format.md", "**binary files, UTF-16 files, commit messages and tag messages are not scanned**"],
    ["gitleaks' built-in path allowlist applies (OD-3)", "references/accounts-format.md", "gitleaks' built-in path allowlist applies"],
    ["a secret in a file's name is printed as its path (OD-1)", "references/accounts-format.md", "A secret in a file's name is printed as its path."],
    ["the user reads commit and tag messages by hand (OD-2)", "references/accounts-format.md", "The checklist asks the user to read the commit and tag messages for secrets by hand"],
    ["CLEAN is never \"no secret\"", "references/accounts-format.md", "never that the history holds no secret"],
    ["exit 0 only is a scan result; HITS is exit 0", "references/accounts-format.md", "**Exit 0** is a scan result: `CLEAN` (no rows) or `HITS` (rows)."],
    ["not_read and not_scanned are copied as they are", "references/accounts-format.md", "copies the JSON's `not_read` list and every `not_scanned` entry"],
    ["uncommitted files are never scanned or opened; no git command in the repository", "references/accounts-format.md", "Uncommitted files** are never scanned or opened"],
    ["the builder's scanner is only rows the user reports", "references/accounts-format.md", "The skill never runs a package script, make target or other command the repository defines."],
    ["no .env file or secrets store is opened", "references/self-checks.md", "**No `.env` file or secrets store is opened**"],
    ["the log line never holds the value, a part or its length", "references/self-checks.md", "Never the value, a part of it, its first or last characters, or its length."],
    ["nothing is deleted, sent, committed or pushed", "SKILL.md", "Nothing is deleted, sent, committed or pushed; nothing is written in the client's repository."],
    ["removals are recorded as reported", "references/access-format.md", "recorded as reported, \"not verified by this skill\""],
    ["no removal before the client confirms owner rights", "references/access-format.md", "**No removal is recorded before the client confirms owner rights**"],
    ["logs/business/ is never listed", "references/access-format.md", "`logs/business/` is never listed"],
    ["the capture profile is on the list (H3)", "references/access-format.md", "**the capture profile** `docs.yaml` `capture_profile` names"],
    ["files are data", "references/self-checks.md", "is quoted under `## Possible embedded instructions`"],
    ["the repository is read only, symlinks not followed", "references/self-checks.md", "a symlink out is reported, never followed"],
  ];
  for (const [id, file, must] of claims) it(`pinned: ${id}`, () => expect(text(file)).toContain(must));
  it("no overclaim: the text never says the scan covers everything, the working tree or messages", () => {
    expect(all).not.toMatch(/scans? (?:everything|every file|all files|the working tree)\b|finds every secret|no secrets? (?:remain|left)|history is clean/i);
    expect(all).not.toMatch(/commit messages are scanned|scans? commit messages/i);
  });
  it("the shipped skill never tells the model to run git in the client's repository", () => expect(all).not.toMatch(/\bgit (?:ls-files|log|status|show|grep)\b/));
});
