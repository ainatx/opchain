import { mkdirSync, chmodSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export function timePaths(env = process.env) {
  if (!env.OPCHAIN_TIME_HOME && !env.HOME) throw new Error("HOME or OPCHAIN_TIME_HOME is required");
  const root = resolve(env.OPCHAIN_TIME_HOME || join(env.HOME, ".opchain", "time"));
  return { root, events: join(root, "events"), sources: join(root, "events", ".sources"),
    cursor: join(root, "cursor.json"), registry: join(root, "registry.json"),
    prompts: join(root, "prompts.jsonl"), canary: join(root, "canary.json") };
}

export function privateDir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

export function writePrivate(path, value) {
  privateDir(dirname(path));
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, value, { mode: 0o600, flag: "wx" });
  renameSync(temp, path);
}

export function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

export function clientPath(paths, client) {
  if (typeof client !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(client) || client === "internal") {
    throw new Error("Invalid client id");
  }
  return join(paths.root, client);
}

export function absolutePath(value) {
  return typeof value === "string" && !value.includes("\0") && isAbsolute(value);
}
