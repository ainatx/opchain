export const REFERENCE_RESOURCE_VERSION = "1";
export const REFERENCE_MANIFEST_SCHEMA = "opchain.skill-references/1.0";

const SKILL_ID = /^[a-z][a-z0-9-]*$/;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function normalizeReferencePath(value) {
  if (typeof value !== "string") return null;
  let decoded;
  try { decoded = decodeURIComponent(value); }
  catch { return null; }
  if (decoded.includes("\\") || decoded.includes("\0") || decoded.startsWith("/")) return null;
  const segments = decoded.split("/");
  if (segments.length < 2 || segments[0] !== "references") return null;
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment) || segment === "." || segment === "..")) return null;
  return segments.join("/");
}

export function referenceUri(skill, path) {
  const safe = normalizeReferencePath(path);
  if (!SKILL_ID.test(skill) || !safe) return null;
  const relative = safe.slice("references/".length).split("/").map(encodeURIComponent).join("/");
  return `opchain://skill/${skill}/references/v${REFERENCE_RESOURCE_VERSION}/${relative}`;
}

export function referenceManifestUri(skill) {
  if (!SKILL_ID.test(skill)) return null;
  return `opchain://skill/${skill}/references/v${REFERENCE_RESOURCE_VERSION}/manifest.json`;
}

export function parseReferenceUri(uri) {
  if (typeof uri !== "string") return null;
  const canonical = uri.match(/^opchain:\/\/skill\/([a-z][a-z0-9-]*)\/references\/v(\d+)\/(.+)$/);
  if (canonical) {
    if (canonical[2] !== REFERENCE_RESOURCE_VERSION) return null;
    if (canonical[3] === "manifest.json") return { skill: canonical[1], manifest: true, version: canonical[2] };
    const path = normalizeReferencePath(`references/${canonical[3]}`);
    return path ? { skill: canonical[1], path, manifest: false, version: canonical[2] } : null;
  }
  // Compatibility alias for the path used by pre-C1 clients and audit probes.
  const legacy = uri.match(/^opchain:\/\/skill\/([a-z][a-z0-9-]*)\/(references\/.+)$/);
  if (!legacy) return null;
  const path = normalizeReferencePath(legacy[2]);
  return path ? { skill: legacy[1], path, manifest: false, version: REFERENCE_RESOURCE_VERSION, alias: true } : null;
}

export function buildReferenceManifest(skill, entries, { skillVersion = "" } = {}) {
  if (!SKILL_ID.test(skill)) throw new Error(`invalid skill id "${skill}"`);
  const files = [];
  const seen = new Set();
  for (const entry of entries ?? []) {
    const item = typeof entry === "string" ? { path: entry } : entry;
    const path = normalizeReferencePath(item?.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    files.push({
      path,
      uri: referenceUri(skill, path),
      mimeType: item.mimeType || (path.endsWith(".json") ? "application/json" : "text/markdown"),
      ...(Number.isInteger(item.bytes) && item.bytes >= 0 ? { bytes: item.bytes } : {}),
      ...(typeof item.sha256 === "string" && item.sha256 ? { sha256: item.sha256 } : {}),
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    schema: REFERENCE_MANIFEST_SCHEMA,
    resourceVersion: REFERENCE_RESOURCE_VERSION,
    skill,
    skillVersion: String(skillVersion || ""),
    files,
  };
}
