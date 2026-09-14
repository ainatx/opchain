// Every invocable skill is reachable by natural language over MCP `route`.
//
// The 2026-09-11 skillchain audit found the intent table in
// src/lib/mcp/routing.js covered 17 of 33 skills, so Codex and other MCP
// clients could not reach any v1.8/v1.9 skill by describing the work. This
// suite pins the fix from four sides:
//
//   1. every skills/<id> except oc-checkpoint-protocol (a protocol, not an
//      entry point) is the target of at least one intent row;
//   2. every row's `phase` is a verb its target skill declares in frontmatter
//      `commands:` — a phase the router hands back must itself route;
//   3. every quoted example phrase in skills/orchestrator.md §4 "Smart Routing
//      Table" routes to that row's skill and phase, so the documented table and
//      the implementation cannot drift apart silently;
//   4. every prompts/opchain-eval input routes to its expected skill.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml"; // namespace import: js-yaml 5 dropped the default export
import { INTENT_HINTS, route } from "../src/lib/mcp/routing.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = process.env.OPCHAIN_SKILLS_DIR ?? join(ROOT, "skills");
const NOT_INVOCABLE = new Set(["oc-checkpoint-protocol"]);

function frontmatter(id) {
  const raw = readFileSync(join(SKILLS_DIR, id, "SKILL.md"), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${id}/SKILL.md has no frontmatter block`);
  return yaml.load(m[1]);
}

const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SKILLS_DIR, d.name, "SKILL.md")))
  .map((d) => {
    const fm = frontmatter(d.name);
    return { id: d.name, commands: Array.isArray(fm.commands) ? fm.commands.map(String) : [] };
  });
const byId = new Map(skills.map((s) => [s.id, s]));
const catalog = { skills };

describe("MCP intent routing covers the catalog", () => {
  it("reads the full skills tree", () => {
    expect(skills.length).toBeGreaterThanOrEqual(33);
  });

  it("every invocable skill is the target of at least one intent row", () => {
    const targets = new Set(INTENT_HINTS.map((h) => h.skill));
    const missing = skills.map((s) => s.id).filter((id) => !NOT_INVOCABLE.has(id) && !targets.has(id));
    expect(missing, `skills with no natural-language routing row: ${missing.join(", ")}`).toEqual([]);
  });

  it("every intent row targets a real skill", () => {
    for (const h of INTENT_HINTS) {
      expect(byId.has(h.skill), `intent row targets unknown skill ${h.skill}`).toBe(true);
    }
  });

  it("every intent row's phase is a command its target skill declares", () => {
    for (const h of INTENT_HINTS) {
      const declared = byId.get(h.skill)?.commands ?? [];
      expect(declared, `${h.skill} does not declare ${h.phase}`).toContain(h.phase);
    }
  });

  it("every phase handed back routes to the same skill when sent as a command", () => {
    for (const h of INTENT_HINTS) {
      const r = route(h.phase, catalog);
      expect(r.skill, `${h.phase} → ${r.skill}, expected ${h.skill}`).toBe(h.skill);
      expect(r.matchedCommand).not.toBeNull();
    }
  });
});

// ── prompts/opchain-eval ↔ routing.js ────────────────────────────────────────
// The eval set grades an LLM's routing; this router is the deterministic one
// MCP clients get. Both must agree on the expected skill for every case, so a
// collision decision cannot be made on one surface and missed on the other.
describe("MCP route() agrees with the opchain-eval expected skill", () => {
  const readJsonl = (f) =>
    readFileSync(join(ROOT, "prompts", "opchain-eval", f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const expected = new Map(readJsonl("expected.jsonl").map((r) => [r.id, r.expect.all[0]]));
  for (const { id, input } of readJsonl("inputs.jsonl")) {
    it(`${id}: "${input}" → ${expected.get(id)}`, () => {
      expect(route(input, catalog).skill).toBe(expected.get(id));
    });
  }
});

// ── skills/orchestrator.md §4 ↔ routing.js ───────────────────────────────────
function smartRoutingRows() {
  const md = readFileSync(join(SKILLS_DIR, "orchestrator.md"), "utf8");
  const section = md.split("### Smart Routing Table")[1]?.split(/\n---\n/)[0];
  if (!section) throw new Error("orchestrator.md has no Smart Routing Table section");
  const rows = [];
  for (const line of section.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    // | "phrase" / "phrase" | oc-skill | /oc-verb |
    if (cells.length < 4 || !/^oc-[a-z-]+$/.test(cells[2])) continue;
    const phrases = [...cells[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    rows.push({ phrases, skill: cells[2], phase: cells[3] });
  }
  return rows;
}

describe("orchestrator.md §4 Smart Routing Table routes as documented", () => {
  const rows = smartRoutingRows();

  it("has a row for every invocable skill", () => {
    const documented = new Set(rows.map((r) => r.skill));
    const missing = skills.map((s) => s.id).filter((id) => !NOT_INVOCABLE.has(id) && !documented.has(id));
    expect(missing).toEqual([]);
  });

  for (const row of rows) {
    for (const phrase of row.phrases) {
      it(`"${phrase}" → ${row.skill} ${row.phase}`, () => {
        const r = route(phrase, catalog);
        expect(r.skill).toBe(row.skill);
        expect(r.phase).toBe(row.phase);
        expect(r.confident).toBe(true);
      });
    }
  }
});
