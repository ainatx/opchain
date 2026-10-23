#!/usr/bin/env node
// Prepare a marketplace pointer only after the public mirror has an immutable
// snapshot. Never creates or pushes a tag; it verifies the operator's tag.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib/catalogs.mjs";
import { sha256 } from "./lib/work-release.mjs";
import { checkOwToolsMarketplace, checkOwToolsRuntimeFiles, owToolsGitRuntimeFiles, owToolsRuntimeFiles } from "./lib/ow-tools-release.mjs";

const URL = "https://github.com/asfbay-bit/opchain-skills.git";
const PLUGIN = "plugins/ow-tools";
const RECORD = "ow-tools-release.json";
function gitRun(args, cwd, { binary = false } = {}) {
  const result = spawnSync("git", args, { cwd, encoding: binary ? undefined : "utf8" });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr?.toString().trim() ?? "unknown error"}`);
  if (binary) return result.stdout;
  return args[0] === "show" ? result.stdout : result.stdout.trim();
}

export function prepareOwToolsPin({ root = ROOT, mirror, commit, git = gitRun, write = true } = {}) {
  if (!mirror || !/^[0-9a-f]{40}$/.test(commit ?? "")) throw new Error("provide --mirror <local public-mirror clone> and --commit <full lowercase SHA>");
  const manifestPath = join(root, PLUGIN, ".claude-plugin/marketplace.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const version = JSON.parse(readFileSync(join(root, PLUGIN, ".claude-plugin/plugin.json"), "utf8")).version;
  const shapeError = checkOwToolsMarketplace(manifest, version);
  if (shapeError) throw new Error(shapeError);
  const tag = `ow-tools-v${version}`;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("invalid plugin version");
  const origin = git(["remote", "get-url", "origin"], mirror);
  if (![URL, "git@github.com:asfbay-bit/opchain-skills.git"].includes(origin)) throw new Error("mirror origin is not the public opchain-skills repository");
  if (git(["rev-parse", `${tag}^{commit}`], mirror) !== commit) throw new Error("the local release tag does not resolve to the supplied commit");
  const remote = new Map(git(["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`], mirror).split("\n").filter(Boolean).map((line) => { const [sha, ref] = line.split(/\s+/); return [ref, sha]; }));
  if ((remote.get(`refs/tags/${tag}^{}`) ?? remote.get(`refs/tags/${tag}`)) !== commit) throw new Error("the public release tag is missing or resolves to a different commit");
  const currentRuntime = owToolsRuntimeFiles(root);
  const runtimeFiles = owToolsGitRuntimeFiles({ cwd: mirror, ref: commit, git });
  const runtimeError = checkOwToolsRuntimeFiles(runtimeFiles, currentRuntime);
  if (runtimeError) throw new Error(`the public snapshot differs from reviewed source: ${runtimeError}`);
  const publishedManifest = git(["show", `${commit}:${PLUGIN}/SECURITY-MANIFEST.md`], mirror);
  if (!publishedManifest.startsWith(`# ow-tools ${version} — security manifest\n`)) throw new Error("the public snapshot has no matching security manifest");
  // Check its file table against the pinned snapshot, including the old
  // marketplace pointer. This hash describes what users actually install.
  const listed = [...(publishedManifest.split("\n## Files\n")[1] ?? "").matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)];
  const allFiles = [...Object.keys(runtimeFiles), ".claude-plugin/marketplace.json"].sort();
  if (listed.map((row) => row[1]).sort().join("\n") !== allFiles.join("\n")) throw new Error("the pinned security manifest has an incomplete file table");
  for (const [, path, hash] of listed) if (sha256(git(["show", `${commit}:${PLUGIN}/${path}`], mirror, { binary: true })) !== hash) throw new Error(`pinned security manifest digest mismatch: ${path}`);
  const source = { source: "git-subdir", url: URL, path: PLUGIN, ref: tag, sha: commit };
  if (manifest.plugins?.length !== 1 || manifest.plugins[0].name !== "ow-tools") throw new Error("marketplace must contain ow-tools only");
  manifest.plugins[0].source = source;
  const marketplaceText = `${JSON.stringify(manifest, null, 2)}\n`;
  const record = { schemaVersion: 1, version, source, securityManifestSha256: sha256(publishedManifest), marketplaceSha256: sha256(marketplaceText), runtimeFiles };
  if (write) {
    writeFileSync(manifestPath, marketplaceText);
    writeFileSync(join(root, RECORD), `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

export function checkOwToolsPin(root = ROOT) {
  try {
    if (!existsSync(join(root, RECORD))) return "ow-tools-release.json is missing; pin a durable public mirror snapshot before the release cut";
    const record = JSON.parse(readFileSync(join(root, RECORD), "utf8"));
    const version = JSON.parse(readFileSync(join(root, PLUGIN, ".claude-plugin/plugin.json"), "utf8")).version;
    const marketplaceText = readFileSync(join(root, PLUGIN, ".claude-plugin/marketplace.json"), "utf8");
    const marketplace = JSON.parse(marketplaceText);
    const shapeError = checkOwToolsMarketplace(marketplace, version);
    if (shapeError) return shapeError;
    if (record.schemaVersion !== 1 || record.version !== version || !/^[0-9a-f]{64}$/.test(record.securityManifestSha256)) return "invalid ow-tools release integrity record";
    if (sha256(marketplaceText) !== record.marketplaceSha256) return "ow-tools marketplace bytes differ from the release integrity record";
    const source = record.source;
    if (source?.source !== "git-subdir" || source.url !== URL || source.path !== PLUGIN || source.ref !== `ow-tools-v${version}` || !/^[0-9a-f]{40}$/.test(source.sha)) return "ow-tools release source is not pinned to its version tag and full commit";
    const installed = marketplace.plugins?.[0]?.source;
    if (marketplace.plugins?.length !== 1 || marketplace.plugins[0].name !== "ow-tools" || !installed || Object.keys(installed).length !== Object.keys(source).length || Object.entries(source).some(([key, value]) => installed[key] !== value)) return "ow-tools marketplace differs from the recorded release pin";
    return checkOwToolsRuntimeFiles(record.runtimeFiles, owToolsRuntimeFiles(root));
  } catch (error) { return `ow-tools release pin unreadable: ${error.message}`; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const value = (flag) => { const at = process.argv.indexOf(flag); return at >= 0 ? process.argv[at + 1] : undefined; };
    const record = prepareOwToolsPin({ mirror: value("--mirror"), commit: value("--commit") });
    console.log(`Prepared ${RECORD}: ${record.source.ref} @ ${record.source.sha}. Regenerate the current SECURITY-MANIFEST.md; publish the recorded pinned manifest hash through the signed source release and the site.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
