// Source-aligned tolerances found by the isolated model run. The original 13/17
// capture stays frozen; these regressions use fresh invented runs, never edit it.
import { afterAll, describe, expect, it } from "vitest";
import { citationProblem } from "../scripts/ow-documentation-acceptance.mjs";
import { cleanup, failures, mutated, rep } from "./ow-documentation-helpers.mjs";

afterAll(cleanup);
const DOCS = "opchain-work/docs/larkspur-ceramics";
const GUIDE = `${DOCS}/guides/bookkeeper.md`;
const gradeGuide = (edit) => failures("write-guides", mutated("write-guides", { [GUIDE]: edit }));
const resultRow = (result) => rep("| No internal numbers | OK |", `| No internal numbers | ${result} |`);

describe("guide labels accept typographic apostrophes without weakening the required content", () => {
  it("accepts a right curly apostrophe in each When you'd do it label", () => {
    expect(gradeGuide((t) => t.replaceAll("When you'd do it:", "When you’d do it:"))).toEqual({});
  });

  it.each([
    ["missing label", "At the end of the day. [SC-06]"],
    ["misspelt label", "When youd do it: At the end of the day. [SC-06]"],
    ["missing source", "When you’d do it: At the end of the day."],
  ])("still rejects a %s", (_, line) => {
    const out = gradeGuide((t) => t.replace(/^When you'd do it:.*$/m, line));
    expect(out.documents).toMatch(/has no "When you'd do it:" line with its source/);
  });

  it("still rejects an invented scenario after a typographic label", () => {
    const out = gradeGuide((t) => t.replace(/^When you'd do it:.*$/m, "When you’d do it: At the end of the day. [SC-999]"));
    expect(out.trace).toMatch(/SC-999 is not a scenario/);
  });
});

const sourceContext = (files = {}, repoFiles = []) => ({
  key: { slug: "larkspur-ceramics" },
  view: {
    exists: (file) => Object.hasOwn(files, file),
    read: (file) => files[file] ?? null,
  },
  scen: [], future: [], mapRoles: [], roles: [], repoFiles,
});
const frozenDocs = "environment:\n  name: The staging mailbox\nscope:\n  roles: [bookkeeper]\n";

describe("docs.yaml citations resolve the frozen workstream source", () => {
  it.each(["docs.yaml", "docs.yaml environment", "docs.yaml: environment.name", "docs.yaml scope.roles"])("resolves %s", (cite) => {
    expect(citationProblem(cite, sourceContext({ [`${DOCS}/docs.yaml`]: frozenDocs }))).toBeNull();
  });

  it("accepts the frozen environment source in a guide", () => {
    expect(gradeGuide((t) => t.replace(/^## What changed for you\s*$/m, "## What changed for you\n\nThese steps use the agreed test environment. [docs.yaml environment]"))).toEqual({});
  });

  it("does not substitute a repository namesake for a missing frozen source", () => {
    expect(citationProblem("docs.yaml environment", sourceContext({}, ["docs.yaml"]))).toMatch(/was not read for this workstream/);
  });

  it.each(["docs.yaml missing", "docs.yaml environment.missing", "docs.yaml __proto__", "docs.yaml scope.constructor"])("rejects an absent or inherited field in %s", (cite) => {
    expect(citationProblem(cite, sourceContext({ [`${DOCS}/docs.yaml`]: frozenDocs }))).toMatch(/has no field/);
  });

  it.each(["docs.yaml environment trailing words", "docs.yaml environment/name"])("rejects malformed field syntax in %s even with a repository namesake", (cite) => {
    expect(citationProblem(cite, sourceContext({ [`${DOCS}/docs.yaml`]: frozenDocs }, ["docs.yaml"]))).toMatch(/not a docs.yaml field citation/);
  });

  it("rejects an invalid YAML source", () => {
    expect(citationProblem("docs.yaml environment", sourceContext({ [`${DOCS}/docs.yaml`]: "environment: [" }))).toMatch(/not valid YAML/);
  });

  it("does not resolve another workstream's frozen file", () => {
    const file = "opchain-work/docs/other-client/docs.yaml";
    expect(citationProblem(`${file} environment`, sourceContext({ [file]: frozenDocs }))).toMatch(/not in the client's repository/);
  });

  it("still rejects an invented repository source", () => {
    expect(citationProblem("docs/nonexistent.md", sourceContext({ [`${DOCS}/docs.yaml`]: frozenDocs }))).toMatch(/not in the client's repository/);
  });
});

describe("No internal numbers checklist prose is distinguished from disclosures", () => {
  it.each([
    "OK: no internal effort, rates, costs, margin or documentation price",
    "OK: no hours, effort, unit prices, costs, margins or price-book internals.",
    "OK: no costs and margins.",
  ])("accepts a complete value-free absence list: %s", (result) => {
    expect(gradeGuide(resultRow(result))).toEqual({});
  });

  it.each([
    "OK: no disclosure; our margin is 35%.",
    "OK: no costs except USD400.",
    "OK: no costs except 400 dollars.",
    "OK: no internal effort, rates, costs, margin or documentation price; our margin is 35%.",
    "OK: no internal effort, rates, costs, margin or documentation price. I spent six hours on it.",
    "OK: no internal effort, rates, costs, margin or documentation price; our rate is USD120 per hour.",
    "OK: no margin of 35%.",
    "OK: our cost was USD400.",
  ])("still rejects the disclosure in %s", (result) => {
    expect(gradeGuide(resultRow(result)).internal_numbers).toMatch(/a row of its internal section carries/);
  });

  it("does not exempt an extra disclosure cell", () => {
    const out = gradeGuide(resultRow("OK: no costs and margins | Our margin is 35%"));
    expect(out.internal_numbers).toMatch(/a row of its internal section carries/);
  });

  it("preserves RC-04c: a different internal row still cannot disclose effort", () => {
    const out = gradeGuide(rep("| No private names | OK |", "| No private names | OK |\n| Time on this guide | I spent six hours on it, well past what I had planned |"));
    expect(out.internal_numbers).toMatch(/a row of its internal section carries/);
  });
});

describe("capture metadata is not a filename-based permission to write", () => {
  it.each(["run-notes.md", "stray.md", "larkspur-repo/src/unrequested.md"])("still grades the extra write %s", (file) => {
    const out = failures("write-guides", mutated("write-guides", { [file]: () => "# An extra write\n" }));
    expect(out.writes).toContain(`${file}: written outside the configured repository folders`);
  });
});
