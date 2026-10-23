// Semantic answer-key checks after a model run; does not execute the model.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const fixture = new URL(".", import.meta.url).pathname;
const book = JSON.parse(readFileSync(join(fixture, "casebook.json"), "utf8"));
const [id, destArg] = process.argv.slice(2);
const item = book.cases.find((c) => c.id === id);
if (!item || !destArg) throw new Error("usage: node grade.mjs <case-id> <scratch-dir>");
const dest = resolve(destArg);
if (readFileSync(join(dest, "case-id"), "utf8").trim() !== id) throw new Error("case ID does not match prepared run");
const problems = [];
if (item.refusal) {
  const out = join(dest, "opchain-work");
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  const actual = Object.fromEntries(walk(out).map((p) => [relative(out, p), hash(p)]));
  const before = JSON.parse(readFileSync(join(dest, "input-manifest.json"), "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(before)) problems.push("refusal changed the graded opchain-work input or wrote a new file");
}
for (const check of item.checks) {
  if (check.exists || check.absent) {
    const rel = check.exists || check.absent;
    if (existsSync(join(dest, "opchain-work", rel)) !== Boolean(check.exists)) problems.push(`${rel}: ${check.exists ? "missing" : "unexpected"}`);
  } else if (check.number) {
    const [rel, expected] = check.number;
    const path = join(dest, "opchain-work", rel);
    const body = existsSync(path) ? readFileSync(path, "utf8") : "";
    const numbers = [...body.matchAll(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?/g)].map(([value]) => Number(value.replaceAll(",", "")));
    if (!numbers.includes(expected)) problems.push(`${rel}: missing numeric value ${expected}`);
  } else {
    const [rel, phrase] = check.contains || check.not_contains;
    const path = rel === "printed.md" ? join(dest, rel) : join(dest, "opchain-work", rel);
    const body = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (Boolean(check.contains) !== body.toLowerCase().includes(phrase.toLowerCase())) problems.push(`${rel}: ${check.contains ? "missing" : "leaked"} ${phrase}`);
  }
}
if (problems.length) {
  console.error(`${id}: ${problems.length} semantic check(s) failed\n${problems.join("\n")}`);
  process.exitCode = 1;
} else console.log(`${id}: semantic checks passed; human reviewer still inspects chronology, source citations, approvals and native copies`);
