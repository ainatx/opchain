// Shared helpers for the ow-draft tests: a golden run copied into a real folder and edited (a planted failure), the
// site repository's .git built at layout time, and the checks that fail on a run. Not a test file. Replacements are
// literal: a planted sentence is inserted as written, never through `$1`-style patterns (OW-02 round 4's harness bug).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as yaml from "js-yaml";
import { FIXTURES, loadKey, prepare, runCase } from "../scripts/ow-draft-acceptance.mjs";

const scratch = [];
export const cleanup = () => scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
export const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); scratch.push(d); return d; };

/** The site repository's .git, built at layout time with a fixed author and date and no user or system git config. */
export function buildSiteGit(dir, branch = null) {
  const site = join(dir, "site");
  if (!existsSync(site) || existsSync(join(site, ".git"))) return false;
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Example Studio", GIT_AUTHOR_EMAIL: "studio@example.invalid", GIT_COMMITTER_NAME: "Example Studio", GIT_COMMITTER_EMAIL: "studio@example.invalid", GIT_AUTHOR_DATE: "2026-10-01T09:00:00Z", GIT_COMMITTER_DATE: "2026-10-01T09:00:00Z" };
  const git = (...a) => spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...a], { cwd: site, env, encoding: "utf8" });
  if (git("init", "-q", "-b", "main").status !== 0) { writeHead(site, branch ?? "main"); return true; }
  git("add", "-A");
  git("commit", "-q", "-m", "invented site");
  if (branch && branch !== "main") git("checkout", "-q", "-b", branch);
  return true;
}
/** Without git on the machine, the branch is all the checker reads: .git/HEAD. */
export function writeHead(site, branch) { mkdirSync(join(site, ".git"), { recursive: true }); writeFileSync(join(site, ".git", "HEAD"), `ref: refs/heads/${branch}\n`); }

const laidOut = new Map();
/** The case's run as a real folder (its starting state and golden output, the site's .git built), edited by `edits`. */
export function mutated(caseName, edits = {}, { branch } = {}) {
  if (!laidOut.has(caseName) || !existsSync(laidOut.get(caseName))) laidOut.set(caseName, layOut(caseName));
  const dir = temp("ow-draft-run-");
  cpSync(laidOut.get(caseName), dir, { recursive: true });
  if (branch) writeHead(join(dir, "site"), branch);
  for (const [rel, edit] of Object.entries(edits)) {
    const path = join(dir, rel);
    const before = existsSync(path) ? readFileSync(path, "utf8") : null;
    const after = edit(before);
    if (after === before) throw new Error(`mutation of ${rel} changed nothing`);
    mkdirSync(dirname(path), { recursive: true });
    if (after === null) rmSync(path, { recursive: true, force: true });
    else writeFileSync(path, after);
  }
  return dir;
}
function layOut(caseName) {
  const dir = temp("ow-draft-base-");
  prepare(caseName, dir);
  let home = caseName;
  while (typeof loadKey(join(FIXTURES, home)).run === "string") home = loadKey(join(FIXTURES, home)).run;
  if (existsSync(join(FIXTURES, home, "expected"))) cpSync(join(FIXTURES, home, "expected"), dir, { recursive: true });
  for (const sub of ["session"]) if (existsSync(join(FIXTURES, home, sub))) cpSync(join(FIXTURES, home, sub), join(dir, sub), { recursive: true });
  let branch = null;
  try { branch = yaml.load(readFileSync(join(dir, "session", "repo-state.yaml"), "utf8"))?.current_branch ?? null; } catch { branch = null; }
  buildSiteGit(dir, branch);
  // Binary exports are never committed: a stub stands in for each one a deliveries.yaml lists (as ow-tools would write it).
  const walkY = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkY(join(d, e.name)) : e.name === "deliveries.yaml" ? [join(d, e.name)] : [])) : []);
  for (const f of walkY(join(FIXTURES, home, "expected", "opchain-work", "drafts")).map((x) => join(dir, x.slice(join(FIXTURES, home, "expected").length + 1)))) {
    for (const e of yaml.load(readFileSync(f, "utf8"))?.deliveries ?? []) for (const x of e.exports ?? []) for (const b of x.files ?? []) {
      if (!/\.(?:pdf|docx|pptx|xlsx)$/.test(b)) continue;
      const p = join(dirname(f), b);
      if (!existsSync(p)) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, Buffer.from("PK stub export (INVENTED)")); }
    }
  }
  return dir;
}
/** { check: problems } for every check that fails on the run. */
export const failures = (caseName, runDir, opts = {}) => Object.fromEntries(runCase(caseName, runDir, opts).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
/** A literal replacement that must match: the plant fails loudly if the golden moved. */
export const rep = (a, b) => (t) => { if (t == null || !t.includes(a)) throw new Error(`no match: ${String(a).slice(0, 70)}`); const i = t.indexOf(a); return t.slice(0, i) + b + t.slice(i + a.length); };
export const append = (s) => (t) => `${t ?? ""}${s}`;
export const golden = (caseName, rel) => readFileSync(join(FIXTURES, caseName, "expected", rel), "utf8");
/** Insert a line literally at the start or the end of a `## ` section (or a slide), in memory. */
export function inSection(heading, line, where) {
  return (t) => {
    const lines = String(t).split("\n");
    const i = lines.findIndex((l) => l.trim() === heading);
    if (i < 0) throw new Error(`no heading ${heading}`);
    if (where === "start") { let j = i + 1; while (j < lines.length && lines[j].trim() === "") j++; lines.splice(j, 0, line, ""); }
    else { let j = i + 1; while (j < lines.length && !/^#{1,2} /.test(lines[j]) && !/^<!-- ow:internal -->/.test(lines[j]) && !/^::: notes/.test(lines[j])) j++; let k = j; while (k > i + 1 && lines[k - 1].trim() === "") k--; lines.splice(k, 0, "", line); }
    return lines.join("\n");
  };
}
