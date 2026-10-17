// OW-08 (Sprint L): every planted failure for ow-start 1.1.0's logs, kept as a
// permanent case (contract C18). Each plant edits a copy of the real tree or of
// a golden run and expects the named check to fail; the unedited copy passes.
// A skip is allowed only when it names an owner decision, with an honest label.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { checkEdges, checkFamily, checkVerbs } from "../scripts/check-skill-contracts.mjs";
import { validateCatalog } from "../scripts/gen-skills-catalog.mjs";
import { pinProblems } from "./ow-text-pins.mjs";

const ROOT = join(import.meta.dirname, "..");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
const temp = (prefix) => { const d = realpathSync(mkdtempSync(join(tmpdir(), prefix))); scratch.push(d); return d; };
const rep = (a, b) => (t) => { if (!t.includes(a)) throw new Error(`no match: ${a.slice(0, 70)}`); return t.split(a).join(b); };

/** A copy of skills-work/ with `edit` applied, loaded as the catalogs. */
function realTree(edit = {}) {
  const dir = temp("ow08-real-");
  cpSync(join(ROOT, "skills-work"), dir, { recursive: true });
  for (const [rel, fn] of Object.entries(edit)) {
    const p = join(dir, rel);
    const before = readFileSync(p, "utf8");
    const after = fn(before);
    if (after === before) throw new Error(`edit of ${rel} changed nothing`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, after);
  }
  return loadCatalogs({ env: { OPCHAIN_WORK_SKILLS_DIR: dir } });
}
const contracts = (cats) => [...checkVerbs(null, { catalogs: cats }), ...checkFamily(cats), ...checkEdges(cats)].join("\n");
const E = "ow-start/skill.edges.yaml", B = "ow-start/SKILL.md", IDX = "ow-start/references/logs-status-and-index.md";

describe("C1, C2, C3: the real tree passes as built (the control)", () => {
  it("catalog, contracts and edges are clean, with ten verbs and twelve index rows", () => {
    const cats = loadCatalogs({ env: {} });
    expect(contracts(cats)).toBe("");
    expect(validateCatalog(cats.find((c) => c.prefix === "ow-"))).toContain("ow-start");
    const edges = readFileSync(join(ROOT, "skills-work", E), "utf8");
    expect(edges.match(/index: true/g)).toHaveLength(12);
    const body = readFileSync(join(ROOT, "skills-work", B), "utf8");
    expect(body).toMatch(/^ {2}version: "1\.1\.0"$/m);
    expect(body).toMatch(/^ow-start 1\.1\.0 · protocol 1/m);
    expect(body.match(/^ {2}commands: (.*)$/m)[1].split(" ")).toHaveLength(10);
  });
});

describe("C1: writers exact per verb, NEXT targets, hand-off fields", () => {
  const plants = [
    ["-action writing notes.md", { [E]: rep("writes:\n", "writes:\n  - { path: logs/<workstream>/meetings/MTG-nn/notes.md, verb: /ow-start-action }\n") }, /logs\/<\*>\/meetings\/mtg-nn\/notes\.md: 2 writers/],
    ["-log-decision editing notes.md", { [E]: rep("writes:\n", "writes:\n  - { path: logs/<workstream>/meetings/MTG-nn/notes.md, verb: /ow-start-log-decision }\n") }, /logs\/<\*>\/meetings\/mtg-nn\/notes\.md: 2 writers/],
    ["-log writing a file", { [E]: rep("writes:\n", "writes:\n  - { path: logs/<workstream>/log.md, verb: /ow-start-log }\n") }, /does not name logs\/<workstream>\/log\.md in the Writes column of `\/ow-start-log`/],
    ["/ow-status writing a file", { [E]: rep("writes:\n", "writes:\n  - { path: logs/<workstream>/status.md, verb: /ow-status }\n") }, /does not name logs\/<workstream>\/status\.md in the Writes column of `\/ow-status`/],
    ["a second writer of DEC-nn.md", { [E]: rep("writes:\n", "writes:\n  - { path: logs/<workstream>/decisions/DEC-nn.md, verb: /ow-start-action }\n") }, /logs\/<\*>\/decisions\/dec-nn\.md: 2 writers/],
    ["a field read but not offered", { [E]: rep("    fields: [items and their sources, attendees]\n    if_absent:", "    fields: [items and their sources, attendees, purpose]\n    if_absent:") }, /reads field `purpose` of logs\/<workstream>\/meetings\/MTG-nn\/agenda\.md/],
    ["a NEXT with no slash hint (K18)", { [B]: rep('meeting logs/<workstream>/meetings/MTG-nn/"   (where slash commands exist: /ow-start-log-meeting)', 'meeting logs/<workstream>/meetings/MTG-nn/"') }, /this NEXT template has no slash hint/],
    ["a dangling NEXT", { [B]: rep("(where slash commands exist: /ow-start-log-decision)", "(where slash commands exist: /ow-start-log-decisions)") }, /NEXT's verb `\/ow-start-log-decisions` is not declared/],
    ["a 'use ow-start on <path>' say (ow-start has no routes:)", {
      [E]: rep("say: use ow-start to log the meeting logs/<workstream>/meetings/MTG-nn/", "say: use ow-start on logs/<workstream>/meetings/MTG-nn/"),
      [B]: rep("use ow-start to log the meeting logs/<workstream>/meetings/MTG-nn/", "use ow-start on logs/<workstream>/meetings/MTG-nn/"),
    }, /"use ow-start on logs\/<workstream>\/meetings\/MTG-nn\/" hands a file to ow-start, which declares no routes/],
    ["a self hand-off with no reads row for its file", { [E]: rep("  - from: ow-start\n    verb: /ow-start-log-meeting\n    path: logs/<workstream>/meetings/MTG-nn/notes.md\n", "  - from: ow-start\n    verb: /ow-start-log-meeting\n    path: logs/<workstream>/meetings/MTG-nn/minutes.md\n") }, /hands off logs\/<workstream>\/meetings\/MTG-nn\/notes\.md to ow-start, but .* has no reads row for it from ow-start/],
    ["a NEXT whose say drifts from its edges row", { [B]: rep('say "use ow-start to log the decisions in logs/<workstream>/meetings/MTG-nn/notes.md"', 'say "use ow-start to log decisions from logs/<workstream>/meetings/MTG-nn/notes.md"') }, /the handoff "use ow-start to log the decisions in logs\/<workstream>\/meetings\/MTG-nn\/notes\.md" has no NEXT template/],
    ["a NEXT template without its no-folder line", { [B]: rep("          [no folder attached: attach agenda.md when you say it]\n", "") }, /this NEXT template has no "\[no folder attached: …\]" line/],
  ];
  for (const [name, edit, want] of plants) it(`${name} fails`, () => expect(contracts(realTree(edit))).toMatch(want));
});

describe("C3: the index edges rule (owner decision O1)", () => {
  const plants = [
    ["the design's builds/<client>/demos/M<n>/ folder, which ow-build does not write", {
      [E]: rep("path: builds/<client>/demos/M<n>-record.md, fields: [created, demo_date]", "path: builds/<client>/demos/M<n>/, fields: [created, demo_date]"),
      [IDX]: rep("`builds/<client>/demos/M<n>-record.md`", "`builds/<client>/demos/M<n>/`"),
    }, /indexes builds\/<client>\/demos\/M<n>\/ from ow-build, which .* does not write/],
    ["an index row that reads a body section", { [E]: rep("path: builds/<client>/changes/CO-nn.md, fields: [created, status]", "path: builds/<client>/changes/CO-nn.md, fields: [created, What changes]") }, /index field "What changes" is not a header key/],
    ["an index row that reads a body section named like a key", { [E]: rep("path: builds/<client>/changes/CO-nn.md, fields: [created, status]", "path: builds/<client>/changes/CO-nn.md, fields: [created, pricing_lines]") }, /index field `pricing_lines` is not a header key ow-build documents/],
    ["an index path the reference does not cite", { [IDX]: rep("| Decision (acceptance) | ow-uat | `uat/<client>/signoff.md` | `created`, `acceptance` |\n", "") }, /logs-status-and-index\.md does not cite uat\/<client>\/signoff\.md/],
    ["an index row from a non-family skill (the user)", { [E]: rep("{ from: ow-care, index: true, reference: references/logs-status-and-index.md, path: care/<client>/reports/M-nn.md", "{ from: user, index: true, reference: references/logs-status-and-index.md, path: care/<client>/reports/M-nn.md") }, /an index row reads from `user`, which is not a family skill, planned skill or add-on/],
    ["an index row from a non-family skill (another catalog)", { [E]: rep("{ from: ow-care, index: true, reference: references/logs-status-and-index.md, path: care/<client>/reports/M-nn.md", "{ from: oc-docs-forge, index: true, reference: references/logs-status-and-index.md, path: care/<client>/reports/M-nn.md") }, /an index row reads from `oc-docs-forge`, which is not a family skill/],
    ["an index row with no reference", { [E]: rep("{ from: ow-build, index: true, reference: references/logs-status-and-index.md, path: builds/<client>/changes/CO-nn.md", "{ from: ow-build, index: true, path: builds/<client>/changes/CO-nn.md") }, /an index row names the reference that cites it/],
    ["index: yes instead of true", { [E]: rep("{ from: ow-build, index: true, reference: references/logs-status-and-index.md, path: builds/<client>/changes/CO-nn.md", "{ from: ow-build, index: yes please, reference: references/logs-status-and-index.md, path: builds/<client>/changes/CO-nn.md") }, /index must be true or left out/],
  ];
  for (const [name, edit, want] of plants) it(`${name} fails`, () => expect(contracts(realTree(edit))).toMatch(want));

  it("an index row needs no hand-off and no body row; a plain reads row of the same file does", () => {
    const plain = realTree({ [E]: rep("{ from: ow-build, index: true, reference: references/logs-status-and-index.md, path: builds/<client>/changes/CO-nn.md", "{ from: ow-build, reference: references/logs-status-and-index.md, path: builds/<client>/changes/CO-nn.md") });
    const out = contracts(plain);
    expect(out).toMatch(/the body's "## Reads from" table does not name builds\/<client>\/changes\/CO-nn\.md/);
    expect(out).toMatch(/reads builds\/<client>\/changes\/CO-nn\.md from ow-build, but .* has no hands_off row to ow-start carrying it/);
  });
});

describe("C2: the body budget and the description, enforced by the catalog", () => {
  const ow = (cats) => cats.find((c) => c.prefix === "ow-");
  it("a 4,600-token body fails gen-skills-catalog (ow-start's 4,500 cap, under the catalog's 5,000)", () => {
    const body = readFileSync(join(ROOT, "skills-work", B), "utf8");
    const end = body.indexOf("\n---", 3) + 4;
    const pad = "x".repeat(4600 * 4 - (body.length - end));
    const cats = realTree({ [B]: (t) => `${t}\n${pad}\n` });
    expect(() => validateCatalog(ow(cats))).toThrow(/ow-start\/SKILL\.md: body is ~460\d tokens, over the 4500-token budget/);
  });
  it("a 1,025-character description fails gen-skills-catalog", () => {
    const cats = realTree({ [B]: (t) => t.replace(/(description: >\n)([\s\S]*?)(\nlicense:)/, (m, a, d, c) => {
      const text = d.replace(/\s+/g, " ").trim();
      return `${a}  ${text}${" more".repeat(Math.ceil((1025 - text.length) / 5))}${c}`;
    }) });
    expect(() => validateCatalog(ow(cats))).toThrow(/description is 10\d\d chars, over the 1024 limit/);
  });
  it("the description no longer excludes meetings, names ow-start early and excludes only the meetings other skills record", () => {
    const fm = readFileSync(join(ROOT, "skills-work", B), "utf8").split("\n---")[0];
    const desc = fm.slice(fm.indexOf("description: >") + 14).split("\nlicense:")[0].replace(/\s+/g, " ").trim();
    expect(desc).not.toMatch(/internal meetings/i);
    expect(desc).toMatch(/NOT for meetings another ow- skill records \(Build Plan workshops, demos, UAT sessions, care calls\)/);
    expect(desc.indexOf("ow-start")).toBeLessThan(200);
    expect(desc).not.toMatch(/[<>]/);
  });
});

describe("C15, C20: text pins for the rules the goldens cannot see", () => {
  const pins = (edit) => pinProblems(realTree(edit).find((c) => c.prefix === "ow-").dir).join("\n");
  const BPR = "ow-build-plan/references/routing-and-resume.md", BR = "ow-build/references/routing-and-resume.md";
  it("the real tree keeps every pin", () => expect(pinProblems(join(ROOT, "skills-work"))).toEqual([]));
  const plants = [
    ["a logs/ line added to ow-build-plan's resume groups", { [BPR]: rep("`builds/<slug>/…` and `uat/<slug>/…` all belong to the group `<slug>`", "`builds/<slug>/…`, `uat/<slug>/…` and `logs/<slug>/…` all belong to the group `<slug>`") }, /a logs line joins no ow-build-plan group/],
    ["a logs/ line added to ow-build's resume groups", { [BR]: rep("`handoffs/<slug>/…` and `docs/<slug>/…` all belong to `<slug>`", "`handoffs/<slug>/…`, `docs/<slug>/…` and `logs/<slug>/…` all belong to `<slug>`") }, /a logs line joins no ow-build group/],
    ["ow-build's group list made implicit", { [BR]: rep("2. Group by the client slug in the path field: `plans/<slug>/…`, `builds/<slug>/…`, `uat/<slug>/…`, `handoffs/<slug>/…` and `docs/<slug>/…` all belong to `<slug>`.", "2. Group by the client slug: every path whose second segment is the slug belongs to `<slug>`.") }, /logs: a logs line joins no sibling group \(ow-build\)/],
    ["the changelog's #605 line dropped", { "ow-start/CHANGELOG.md": (t) => t.replace(/^- \*\*#605[^\n]*\n/m, "") }, /changelog: #605's in-place edit/],
    ["the changelog's #616 line dropped", { "ow-start/CHANGELOG.md": (t) => t.replace(/^- \*\*#616[^\n]*\n/m, "") }, /changelog: #616's in-place edit/],
    ["superseding no longer closes the review", { "ow-start/references/phase-log-decision.md": (t) => t.replace(/^- Superseding a decision whose newest line[^\n]*\n/m, "") }, /logs: superseding closes the old review/],
    ["the follow-up sent by the skill", { "ow-start/references/phase-log-meeting.md": rep("Never send it: tell the user to copy it and add names.", "Send it to the attendees.") }, /logs: the follow-up is never sent/],
  ];
  for (const [name, edit, want] of plants) it(`${name} fails`, () => expect(pins(edit)).toMatch(want));
});
