import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const OW_TOOLS_PLUGIN = "plugins/ow-tools";
export const OW_TOOLS_PIN_EXCLUSIONS = new Set([".claude-plugin/marketplace.json", "SECURITY-MANIFEST.md"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const validPath = (path) => typeof path === "string" && path.length > 0 && !/[\\\0\r\n\t]/.test(path) && path.split("/").every((part) => part && part !== "." && part !== "..");
const ordered = (entries) => Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));

/** The only exclusions are the circular marketplace pointer and its generated manifest. */
export function owToolsRuntimeFiles(root) {
  for (const dir of ["plugins", OW_TOOLS_PLUGIN]) {
    const stat = lstatSync(join(root, dir));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`ow-tools runtime directory must not be a symlink: ${dir}`);
  }
  const entries = [];
  function walk(dir, prefix = "") {
    for (const name of readdirSync(dir)) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!validPath(path)) throw new Error(`invalid ow-tools runtime path: ${JSON.stringify(path)}`);
      const target = join(dir, name);
      const stat = lstatSync(target);
      if (stat.isSymbolicLink()) throw new Error(`ow-tools runtime symlink is forbidden: ${path}`);
      if (stat.isDirectory()) { walk(target, path); continue; }
      if (!stat.isFile()) throw new Error(`ow-tools runtime path is not a regular file: ${path}`);
      if (!OW_TOOLS_PIN_EXCLUSIONS.has(path)) entries.push([path, { sha256: sha256(readFileSync(target)), mode: stat.mode & 0o111 ? "100755" : "100644" }]);
    }
  }
  walk(join(root, OW_TOOLS_PLUGIN));
  return ordered(entries);
}

/** Read exact Git blobs; mode checks reject symlinks and submodule substitutions. */
export function owToolsGitRuntimeFiles({ cwd, ref, git }) {
  const tree = git(["ls-tree", "-r", "-z", ref, "--", OW_TOOLS_PLUGIN], cwd);
  if (typeof tree !== "string" || !tree) throw new Error(`could not list ow-tools runtime at ${ref}`);
  const entries = [];
  const seen = new Set();
  for (const row of tree.split("\0").filter(Boolean)) {
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40}|[a-f0-9]{64})\t([\s\S]+)$/.exec(row);
    if (!match) throw new Error(`invalid ow-tools Git inventory at ${ref}`);
    const [, mode, type, , fullPath] = match;
    if (!fullPath.startsWith(`${OW_TOOLS_PLUGIN}/`)) throw new Error(`invalid ow-tools Git path at ${ref}: ${fullPath}`);
    const path = fullPath.slice(OW_TOOLS_PLUGIN.length + 1);
    if (!validPath(path) || seen.has(path)) throw new Error(`invalid or duplicate ow-tools Git path at ${ref}: ${path}`);
    seen.add(path);
    if (type !== "blob" || !["100644", "100755"].includes(mode)) throw new Error(`ow-tools runtime Git mode is forbidden at ${ref}: ${path} (${mode})`);
    if (OW_TOOLS_PIN_EXCLUSIONS.has(path)) continue;
    const content = git(["show", `${ref}:${fullPath}`], cwd, { binary: true });
    if (!Buffer.isBuffer(content)) throw new Error(`could not read exact ow-tools runtime bytes at ${ref}: ${path}`);
    entries.push([path, { sha256: sha256(content), mode }]);
  }
  return ordered(entries);
}

export function checkOwToolsRuntimeFiles(expected, actual) {
  if (!expected || typeof expected !== "object" || Array.isArray(expected) || !Object.hasOwn(expected, ".claude-plugin/plugin.json")) return "ow-tools release record has no complete runtime inventory";
  for (const [path, file] of Object.entries(expected)) {
    if (!validPath(path) || OW_TOOLS_PIN_EXCLUSIONS.has(path) || !file || typeof file !== "object" || Array.isArray(file) || Object.keys(file).sort().join(",") !== "mode,sha256" || !/^[a-f0-9]{64}$/.test(file.sha256) || !["100644", "100755"].includes(file.mode)) return `invalid ow-tools runtime inventory entry: ${path}`;
  }
  if (Object.keys(expected).sort().join("\n") !== Object.keys(actual).sort().join("\n")) return "ow-tools runtime file inventory differs from the pinned snapshot";
  for (const [path, file] of Object.entries(expected)) {
    if (actual[path].sha256 !== file.sha256 || actual[path].mode !== file.mode) return `ow-tools runtime differs from the pinned snapshot: ${path}`;
  }
  return null;
}

// Marketplace entries can overlay hooks/commands on the pinned plugin. Keep
// this marketplace descriptor-only; runtime behavior comes from the snapshot.
export function checkOwToolsMarketplace(marketplace, version) {
  const only = (value, keys) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key));
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) return "invalid ow-tools marketplace version";
  if (!only(marketplace, ["$schema", "name", "owner", "metadata", "plugins"]) || marketplace.name !== "opchain-work-tools") return "unexpected ow-tools marketplace identity or fields";
  if (!only(marketplace.owner, ["name", "email", "url"]) || typeof marketplace.owner.name !== "string" || !marketplace.owner.name.trim()) return "ow-tools marketplace requires a named owner";
  if (!only(marketplace.metadata, ["description", "version"]) || marketplace.metadata.version !== version) return "ow-tools marketplace metadata differs from the plugin version";
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) return "marketplace must contain ow-tools only";
  const entry = marketplace.plugins[0];
  if (!only(entry, ["name", "source", "description", "version", "category", "keywords"]) || entry.name !== "ow-tools" || entry.version !== version) return "ow-tools marketplace must not overlay runtime components or dependencies on the pinned plugin";
  if (!only(entry.source, ["source", "url", "path", "ref", "sha"])) return "ow-tools marketplace source has unreviewed fields";
  return null;
}
