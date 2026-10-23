// Release compatibility: current outputs pass without rewriting historical fixture bytes.
import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as handoff from "../scripts/ow-handoff-acceptance.mjs";
import * as draft from "../scripts/ow-draft-acceptance.mjs";
import * as handoffHelpers from "./ow-handoff-helpers.mjs";
import * as draftHelpers from "./ow-draft-helpers.mjs";

afterAll(() => { handoffHelpers.cleanup(); draftHelpers.cleanup(); });

const STATUS = "opchain-work/STATUS.md";
const CASES = [
  { skill: "ow-handoff", name: "start", grader: handoff, helpers: handoffHelpers },
  { skill: "ow-draft", name: "m-brief", grader: draft, helpers: draftHelpers },
];

function versionEdits({ skill, name, grader }, version, part = "both") {
  const view = grader.runView(name);
  const edits = {};
  const oldWriter = `${skill} 1.0.0 (protocol 1)`;
  if (part !== "status") {
    const headers = view.written().filter((f) => view.read(f)?.includes(oldWriter));
    expect(headers.length).toBeGreaterThan(0);
    for (const file of headers) edits[file] = (text) => text.replace(oldWriter, `${skill} ${version} (protocol 1)`);
  }
  if (part !== "headers") {
    const before = view.priorRead(STATUS) ?? "";
    edits[STATUS] = (text) => {
      expect(text.startsWith(before)).toBe(true);
      const added = text.slice(before.length);
      expect(added).toContain(`| ${skill} 1.0.0 |`);
      return before + added.replaceAll(`| ${skill} 1.0.0 |`, `| ${skill} ${version} |`);
    };
  }
  return edits;
}

for (const c of CASES) describe(`${c.skill} version compatibility`, () => {
  it("still accepts the historical 1.0.0 golden", () => {
    const results = c.grader.runCase(c.name);
    expect(results.map((r) => r.check)).toEqual(expect.arrayContaining(["headers", "status"]));
    expect(results.filter((r) => r.problems.length)).toEqual([]);
  });

  it("accepts current 1.0.1 headers and appended STATUS with historical records intact", () => {
    const view = c.grader.runView(c.name);
    const originals = new Map(view.written().map((f) => [f, view.read(f)]));
    const edits = versionEdits(c, "1.0.1");
    const dir = c.helpers.mutated(c.name, edits);
    const results = c.grader.runCase(c.name, dir);
    expect(results.filter((r) => r.problems.length)).toEqual([]);
    const current = c.grader.runView(c.name, dir);
    for (const file of Object.keys(edits).filter((f) => f !== STATUS)) {
      expect(current.read(file)).toContain(`${c.skill} 1.0.1 (protocol 1)`);
    }
    const priorStatus = view.priorRead(STATUS) ?? "";
    expect(current.read(STATUS).slice(0, priorStatus.length)).toBe(priorStatus);
    expect(current.read(STATUS).slice(priorStatus.length)).toContain(`| ${c.skill} 1.0.1 |`);
    for (const [file, original] of originals) {
      expect(readFileSync(join(c.grader.FIXTURES, c.name, "expected", file), "utf8")).toBe(original);
    }
  });

  for (const version of ["1.0.2", "2.0.0"]) for (const part of ["headers", "status"]) {
    it(`rejects unsupported ${version} in ${part} independently`, () => {
      const dir = c.helpers.mutated(c.name, versionEdits(c, version, part));
      const results = c.grader.runCase(c.name, dir);
      const affected = results.find((r) => r.check === part);
      const unchanged = results.find((r) => r.check === (part === "headers" ? "status" : "headers"));
      expect(affected.problems.length).toBeGreaterThan(0);
      expect(unchanged.problems).toEqual([]);
    });
  }
});
