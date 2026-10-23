// A per-skill catalog is sealed as an exact inventory; its versions need not
// match the oc- lockstep version or one another.
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listSkillIds } from "./catalogs.mjs";
import { matter } from "./frontmatter.mjs";
import { checkOwToolsMarketplace, checkOwToolsRuntimeFiles, owToolsGitRuntimeFiles, owToolsRuntimeFiles } from "./ow-tools-release.mjs";

export const WORK_RELEASE_PATH = "work-release.json";
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function files(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (lstatSync(join(dir, entry.name)).isSymbolicLink()) throw new Error(`work release refuses symlink: ${rel}`);
    return entry.isDirectory() ? files(join(dir, entry.name), rel) : [rel];
  });
}

export function workReleaseManifest(root, releaseVersion) {
  const dir = join(root, "skills-work");
  const ids = listSkillIds(dir);
  if (!ids.length) throw new Error("work release requires a nonempty ow- catalog");
  const manifest = { schemaVersion: 1, releaseVersion, protocolSha256: sha256(readFileSync(join(dir, "ow-protocol.md"))), skills: {} };
  for (const id of ids) {
    if (!/^ow-[a-z0-9-]+$/.test(id)) throw new Error(`invalid ow- release id: ${id}`);
    const skill = join(dir, id);
    const version = matter(readFileSync(join(skill, "SKILL.md"), "utf8")).data.metadata?.version;
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`${id}: invalid per-skill release version`);
    manifest.skills[id] = { version, files: Object.fromEntries(files(skill).map((file) => [file, sha256(readFileSync(join(skill, file)))])) };
  }
  if (existsSync(join(root, "ow-tools-release.json"))) manifest.toolsReleaseSha256 = sha256(readFileSync(join(root, "ow-tools-release.json")));
  return manifest;
}

export function renderWorkRelease(root, version) {
  return `${JSON.stringify(workReleaseManifest(root, version), null, 2)}\n`;
}

/** Verify both the checked-out catalog and the exact tree a tag will inherit. */
export function checkWorkRelease({ cwd, version, seal, ref = "HEAD", git }) {
  const [major = 0, minor = 0] = (version ?? "0.0").split(".").map(Number);
  const required = major > 2 || (major === 2 && minor >= 1);
  if (!seal.workCatalogSha256) return required ? "release-seal.json must bind the ow- catalog for releases from 2.1 onward; run seal-work-release.mjs at the cut" : null;
  const text = git(["show", `${ref}:${WORK_RELEASE_PATH}`], cwd);
  if (typeof text !== "string" || sha256(text) !== seal.workCatalogSha256) return `${WORK_RELEASE_PATH} at ${ref} is not the sealed work catalog`;
  let expected;
  try { expected = renderWorkRelease(cwd, version); } catch (error) { return error.message; }
  if (text !== expected) return `${WORK_RELEASE_PATH} at ${ref} differs from the current ow- versions or contents; cut a new release for changed skills`;
  const manifest = JSON.parse(text);
  if (required && !manifest.toolsReleaseSha256) return "the ow- release manifest must bind the ow-tools integrity record";
  if (manifest.toolsReleaseSha256) {
    const toolsRecord = git(["show", `${ref}:ow-tools-release.json`], cwd);
    if (toolsRecord === null || sha256(toolsRecord) !== manifest.toolsReleaseSha256) return `${ref}:ow-tools-release.json differs from its sealed content`;
    try {
      const record = JSON.parse(toolsRecord);
      const marketplaceText = git(["show", `${ref}:plugins/ow-tools/.claude-plugin/marketplace.json`], cwd);
      const marketplace = JSON.parse(marketplaceText);
      const shapeError = checkOwToolsMarketplace(marketplace, record.version);
      if (shapeError || sha256(marketplaceText) !== record.marketplaceSha256) return `${ref}:ow-tools marketplace differs from the sealed descriptor: ${shapeError ?? "content hash mismatch"}`;
      const source = marketplace?.plugins?.[0]?.source;
      if (marketplace?.plugins?.length !== 1 || !source || Object.keys(source).length !== Object.keys(record.source).length || Object.entries(record.source).some(([key, value]) => source[key] !== value)) return `${ref}:ow-tools marketplace differs from the sealed source pin`;
      const currentRuntimeError = checkOwToolsRuntimeFiles(record.runtimeFiles, owToolsRuntimeFiles(cwd));
      if (currentRuntimeError) return `current ${currentRuntimeError}`;
      const taggedRuntimeError = checkOwToolsRuntimeFiles(record.runtimeFiles, owToolsGitRuntimeFiles({ cwd, ref, git }));
      if (taggedRuntimeError) return `${ref}: ${taggedRuntimeError}`;
    } catch (error) { return `${ref}:ow-tools release verification failed: ${error.message}`; }
  }
  const wanted = ["skills-work/ow-protocol.md"];
  for (const [id, skill] of Object.entries(manifest.skills)) {
    for (const [file, hash] of Object.entries(skill.files)) {
      const path = `skills-work/${id}/${file}`;
      wanted.push(path);
      const content = git(["show", `${ref}:${path}`], cwd);
      if (content === null || sha256(content) !== hash) return `${ref}:${path} differs from its sealed content`;
    }
  }
  const protocol = git(["show", `${ref}:skills-work/ow-protocol.md`], cwd);
  if (protocol === null || sha256(protocol) !== manifest.protocolSha256) return `${ref}:skills-work/ow-protocol.md differs from its sealed content`;
  const tree = git(["ls-tree", "-r", "--name-only", ref, "--", "skills-work"], cwd);
  if (tree === null) return `could not list the work catalog at ${ref}`;
  const actual = tree.split("\n").filter((path) => /^skills-work\/ow-[a-z0-9-]+\//.test(path) || path === "skills-work/ow-protocol.md").sort();
  if (actual.join("\n") !== wanted.sort().join("\n")) return `${ref} has a different ow- file inventory from the sealed release`;
  return null;
}
