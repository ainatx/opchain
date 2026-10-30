// Prospective model fixture preparation. Writes only to the supplied scratch directory.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";

const fixture = new URL(".", import.meta.url).pathname;
const book = JSON.parse(readFileSync(join(fixture, "casebook.json"), "utf8"));
const [id, destArg] = process.argv.slice(2);
const item = book.cases.find((c) => c.id === id);
if (!item || !destArg) throw new Error("usage: node prepare.mjs <case-id> <new-absolute-scratch-dir>");
const dest = resolve(destArg);
if (existsSync(dest)) throw new Error(`scratch directory already exists: ${dest}`);
mkdirSync(dest, { recursive: true });
const out = join(dest, "opchain-work");
cpSync(join(fixture, "seed", item.seed, "opchain-work"), out, { recursive: true });
for (const [rel, instruction] of Object.entries(item.overrides)) {
  if (rel.startsWith("/") || rel.split("/").includes("..")) throw new Error(`unsafe path: ${rel}`);
  const path = join(out, rel);
  mkdirSync(dirname(path), { recursive: true });
  const [mode, content] = instruction.split(/: (.*)/s);
  if (mode === "APPEND") writeFileSync(path, `${readFileSync(path, "utf8").trimEnd()}\n${content}\n`);
  else if (mode === "CREATE" || mode === "REPLACE") writeFileSync(path, `---\now_artefact: ow-care/input\nschema: 1\nwritten_by: fixture (protocol 1)\nworkstream: larkspur-ceramics\nsubject: ${rel}\ncreated: ${item.clock.slice(0, 10)}\nclock: scenario\norigin: user-stated\n---\n${content}\n`);
  else throw new Error(`unknown override: ${mode}`);
}
mkdirSync(join(dest, "session"));
writeFileSync(join(dest, "session", "answers.md"), `# Prospective OW-07 session — ${id}\n\nClock, declared before output: ${item.clock}.\nTool availability, declared before output: ow-tools ${item.tool}. If absent, the version command does not answer. If present, use the installed local tool only; health endpoints are stubbed and no client network is contacted.\n\nInvoke: ${item.verb} on opchain-work/care/larkspur-ceramics/ (or the applicable input path for start/onboard).\n\nUser answers: ${item.session_answers}\n\nWrite the assistant's visible response to ../printed.md. Work only inside opchain-work/ for graded artefacts. Place runtime receipts and native export inspection in ../receipts/, outside opchain-work/. No actual client month is represented.\n`);
writeFileSync(join(dest, "case-id"), `${id}\n`);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
writeFileSync(join(dest, "input-manifest.json"), JSON.stringify(Object.fromEntries(walk(out).map((p) => [relative(out, p), hash(p)])), null, 2));
console.log(`${id}: prepared ${dest}; read session/answers.md before the model run`);
