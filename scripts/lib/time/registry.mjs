import { execFileSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { absolutePath, clientPath, readJson, writePrivate } from "./paths.mjs";

export function gitRoot(cwd) {
  try {
    const common = execFileSync("git", ["-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 1000 }).trim();
    return common.endsWith(`${sep}.git`) ? dirname(common) : common;
  } catch { return null; }
}

export function loadRegistry(paths) {
  const registry = readJson(paths.registry, {});
  if (!registry || Array.isArray(registry) || typeof registry !== "object") throw new Error("Invalid registry");
  for (const [root, client] of Object.entries(registry)) {
    if (!absolutePath(root)) throw new Error("Invalid registry path");
    clientPath(paths, client);
  }
  return registry;
}

export function addRepo(paths, cwd, client) {
  clientPath(paths, client);
  const root = gitRoot(cwd);
  if (!root) throw new Error("Not a git repository");
  const registry = loadRegistry(paths);
  registry[root] = client;
  writePrivate(paths.registry, `${JSON.stringify(registry, null, 2)}\n`);
  return root;
}

export function createResolver(registry) {
  const cache = new Map();
  const roots = Object.keys(registry).sort((a, b) => b.length - a.length);
  return function lookup(cwd) {
    if (!absolutePath(cwd)) return { repo: "internal", client: "internal" };
    if (cache.has(cwd)) return cache.get(cwd);
    const real = gitRoot(cwd);
    const path = resolve(cwd);
    const root = (real && registry[real] ? real : roots.find(r => path === r || path.startsWith(`${r}${sep}`)));
    const result = { repo: root || real || path, client: root ? registry[root] : "internal" };
    cache.set(cwd, result);
    return result;
  };
}
