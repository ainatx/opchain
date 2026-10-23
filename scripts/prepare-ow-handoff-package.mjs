#!/usr/bin/env node
// Preparation and evidence projection only. This does not run the skill or invent its output.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { prepare, runCase } from "./ow-handoff-acceptance.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "larkspur-repo";
const META = `${REPO}/.git/`;
const TOOLS = join(ROOT, "plugins/ow-tools/bin/ow-tools");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Hash bytes, including Git objects; never decode or print historical credential content. */
export function fileManifest(dir) {
  const out = {};
  const walk = (base) => {
    for (const name of readdirSync(base).sort()) {
      const file = join(base, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error(`symlink is not accepted: ${relative(dir, file)}`);
      if (stat.isDirectory()) walk(file);
      else if (stat.isFile()) out[relative(dir, file).split(sep).join("/")] = digest(readFileSync(file));
      else throw new Error(`unsupported file: ${relative(dir, file)}`);
    }
  };
  walk(dir);
  return out;
}

function command(program, args, cwd, env = process.env) {
  const result = spawnSync(program, args, { cwd, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  return { command: [program, ...args], cwd, exit: result.status, signal: result.signal,
    stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error?.message ?? null };
}

function mustRun(program, args, cwd, env) {
  const result = command(program, args, cwd, env);
  if (result.exit !== 0) throw new Error(`fixture command failed: ${program} ${args.join(" ")} (${result.exit ?? result.error})`);
  return result;
}

function freshPaths(dir, receipt) {
  if (existsSync(dir) || existsSync(receipt)) throw new Error("workspace and evidence paths must not exist; existing captures are never overwritten");
  mkdirSync(dirname(dir), { recursive: true });
  mkdirSync(dir);
}

/** A private synthetic repo only. No commits, config changes or hooks in the product checkout. */
function history(repo) {
  const env = {
    PATH: process.env.PATH, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture Builder", GIT_AUTHOR_EMAIL: "fixture@example.test",
    GIT_COMMITTER_NAME: "Fixture Builder", GIT_COMMITTER_EMAIL: "fixture@example.test",
    GIT_AUTHOR_DATE: "2027-02-16T09:00:00Z", GIT_COMMITTER_DATE: "2027-02-16T09:00:00Z",
  };
  const git = (...args) => mustRun("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], repo, env);
  // An empty template means there are no inherited hooks or configuration in this new test repo.
  git("init", "--quiet", "--initial-branch=main", "--template=");
  const settings = join(repo, "config/settings.js");
  const current = readFileSync(settings);
  writeFileSync(settings, "// Invented history: an unset configuration name, never a credential.\nexport const SHOP_API_TOKEN = null;\n");
  git("add", "--all");
  git("commit", "--quiet", "-m", "Synthetic fixture: unset configuration");
  git("branch", "fixture-history");
  writeFileSync(settings, current);
  git("add", "config/settings.js");
  git("commit", "--quiet", "-m", "Synthetic fixture: use environment setting");
  return { head: git("rev-parse", "HEAD").stdout.trim(), commits: Number(git("rev-list", "--count", "HEAD").stdout),
    refs: git("show-ref", "--head").stdout, status: git("status", "--porcelain").stdout };
}

export function preparePackage(destination) {
  const dir = resolve(destination);
  const receiptPath = `${dir}.preparation.json`;
  freshPaths(dir, receiptPath);
  prepare("package", dir);
  // Layered documentary cases include their predecessor's screen. Never give a
  // blind writer that screen as if it were the output of this new exercise.
  rmSync(join(dir, "printed.md"), { force: true });
  rmSync(join(dir, "printed"), { recursive: true, force: true });
  const repo = join(dir, REPO);
  const git = history(repo);
  const test = command("npm", ["--ignore-scripts", "test"], repo);
  const receipt = {
    schema: 1, kind: "ow-handoff-package-preparation", synthetic: true,
    actual_recorded_at: new Date().toISOString(), workspace: dir,
    scenario_date: "2027-02-17", planned_send: "2027-02-24", scenario_clock: "user-stated",
    fixture_case: "package", source_head: mustRun("git", ["rev-parse", "HEAD"], ROOT).stdout.trim(),
    preparer_sha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    adapter: { kind: "source-checkout", path: TOOLS, probe: command(TOOLS, ["version"], dir), public_install_proof: false },
    runtime: { node: process.version, npm: command("npm", ["--version"], repo), git: command("git", ["--version"], repo) },
    git, test, baseline_files: fileManifest(dir),
    limits: ["invented offline subset; not a real client job", "no hosted CI or deployment was executed",
      "inherited account scan records are synthetic; any new scan must retain its own actual output",
      "preparation executes tests; ow-handoff may only report them with attribution"],
  };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  if (test.exit !== 0) throw new Error(`fixture tests failed; raw result retained in ${receiptPath}`);
  return { dir, receiptPath, receipt };
}

/**
 * The existing grader reads by difference from fixture text, so preparer-owned Git
 * bytes need a disposable projection. Exclude only their exact unchanged baseline;
 * any new or changed repository file (including Git metadata) fails closed.
 */
export function projectPackage(capture, receiptPath, destination) {
  const dir = resolve(capture), out = resolve(destination);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  if (receipt.schema !== 1 || receipt.kind !== "ow-handoff-package-preparation" || receipt.workspace !== dir || receipt.synthetic !== true) {
    throw new Error("preparation receipt does not identify this capture");
  }
  if (out === dir || out.startsWith(`${dir}${sep}`)) throw new Error("projection must be outside the raw capture");
  const raw = fileManifest(dir);
  const baseline = receipt.baseline_files;
  if (!baseline || !Object.keys(baseline).some((p) => p.startsWith(META))) throw new Error("receipt has no prepared Git metadata");
  for (const path of new Set([...Object.keys(baseline), ...Object.keys(raw)])) {
    if (path.startsWith(`${REPO}/`) && raw[path] !== baseline[path]) {
      throw new Error(`repository input changed after preparation: ${path}`);
    }
  }
  const manifestPath = `${out}.manifest.json`;
  freshPaths(out, manifestPath);
  for (const path of Object.keys(raw)) {
    if (path.startsWith(META)) continue;
    const dest = join(out, path);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(dir, path), dest);
  }
  const projected = fileManifest(out);
  // Freeze protection: record both maps and verify no copying/transcoding changed a byte.
  for (const [path, hash] of Object.entries(raw)) {
    if (!path.startsWith(META) && projected[path] !== hash) throw new Error(`projection changed bytes: ${path}`);
  }
  const after = fileManifest(dir);
  if (JSON.stringify(raw) !== JSON.stringify(after)) throw new Error("raw capture changed during projection");
  const manifest = { schema: 1, synthetic: true, actual_recorded_at: new Date().toISOString(),
    raw_capture: dir, projection: out, preparation_receipt: resolve(receiptPath),
    preparation_receipt_sha256: digest(readFileSync(receiptPath)), raw_files: raw, projected_files: projected,
    excluded: Object.keys(raw).filter((path) => path.startsWith(META)),
    exclusion_reason: "unchanged preparer-owned nested Git metadata only; no model output excluded",
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  return { dir: out, manifestPath, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, capture, receipt, destination] = process.argv.slice(2);
    if (mode === "prepare" && capture && !receipt) {
      const result = preparePackage(capture);
      console.log(`Prepared synthetic package workspace: ${result.dir}\nPreparation receipt: ${result.receiptPath}`);
    } else if (mode === "grade" && capture && receipt && destination) {
      const result = projectPackage(capture, receipt, destination);
      const checks = runCase("package", result.dir);
      writeFileSync(`${result.dir}.grade.json`, JSON.stringify(checks, null, 2) + "\n", { flag: "wx" });
      for (const check of checks) for (const problem of check.problems) console.error(`${check.check}: ${problem}`);
      const pass = checks.filter(({ problems }) => !problems.length).length;
      console.log(`${pass}/${checks.length} named checks; projection manifest: ${result.manifestPath}`);
      process.exitCode = checks.some(({ problems }) => problems.length) ? 1 : 0;
    } else throw new Error("usage: prepare-ow-handoff-package.mjs prepare <new-workspace> | grade <raw-capture> <preparation-receipt> <new-projection>");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
