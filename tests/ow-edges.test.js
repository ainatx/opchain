// ow- edges (cross-talk contract R15, docs/audits/2026-09-18-ow-pack-design-audit.md):
// each skill's skill.edges.yaml, reciprocity inside the family, one writer
// verb per file, and NEXT targets that resolve. A scratch two-skill family
// proves each rule catches what it claims; then the real skills-work/ tree is
// copied and the same failures are planted in it.
import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { checkEdges, checkFamily, checkVerbs } from "../scripts/check-skill-contracts.mjs";
import { BANS, PINS, pinProblems } from "./ow-text-pins.mjs";

const ROOT = join(import.meta.dirname, "..");
// A scratch folder made inside a test is removed in the background once that test finishes, so a file's folders never
// pile up for one long afterAll; one made outside a test waits for afterAll, which also waits for removals still running.
const scratch = [];
const pending = new Set();
const keep = (d) => {
  try { onTestFinished(() => { const job = rm(d, { recursive: true, force: true }).catch(() => {}).finally(() => pending.delete(job)); pending.add(job); }); } catch { scratch.push(d); }
  return d;
};
afterAll(async () => { scratch.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })); await Promise.all(pending); }, 120_000);
const temp = (prefix) => keep(realpathSync(mkdtempSync(join(tmpdir(), prefix))));

// ── a scratch family: ow-alpha hands report.md to ow-beta ────────────────────

const PROTOCOL = "# ow- protocol (version 2)\n\n`STATUS.md` keeps one plain line per step.\n";
const HANDOFFS = "ow_artefact: ow-alpha/handoffs\nschema: 1\ncontract:\nbuild:\n";

const frontmatter = (id, verbs) => [
  `name: ${id}`, "description: >", `  ${id} is a scratch skill. Use for ${verbs[0]}.`, "license: Apache-2.0",
  "metadata:", '  version: "1.0.0"', '  protocol: "1"', "  bundle: core", "  network: none", `  commands: ${verbs.join(" ")}`,
].join("\n");

const ALPHA_BODY = `# ow-alpha

Open \`references/ow-protocol.md\` and run its step 0. If you cannot open it, say so and stop.

## Reads from

| From | Path | If absent | If mismatch |
|---|---|---|---|
| the user | notes.md | Ask for notes | Use what parses |

## Hands off to

| When | Next skill | Say | Writes for it | If not available |
|---|---|---|---|---|
| Report done | ow-beta | "use ow-beta on report.md" | report.md | report.md stands alone |
| Accepted | handoffs.yaml contract | its say: line | terms.md | send terms.md to whoever drafts contracts |

    DONE: report -> report.md
    NEXT: say "use ow-beta on report.md"   (where slash commands exist: /ow-beta)
          It will read: report.md
          [no folder attached: attach report.md when you say it]
    IF IT IS NOT AVAILABLE: report.md stands alone.

    DONE: terms -> terms.md
    NEXT: handoffs.yaml \`contract\`: its say: line, {files} = terms.md
    IF IT IS NOT AVAILABLE: send terms.md to whoever drafts your contracts.
`;

const BETA_BODY = `# ow-beta

Open \`references/ow-protocol.md\` and run its step 0. If you cannot open it, say so and stop.

## Verbs

| Verb | Does |
|---|---|
| \`/ow-beta on <path>\` | Takes a handed-over file (\`references/route.md\`) |

## Reads from

| From | Path | If absent | If mismatch |
|---|---|---|---|
| ow-alpha | report.md: \`title\` | Ask for the report | Report the fields found |

## Hands off to

| When | Next skill | Say | If not available |
|---|---|---|---|
| Done | none | none | Nothing follows |

    DONE: summary -> summary.md
    NEXT: none. The workstream is closed in STATUS.md.
`;

const ALPHA_EDGES = `schema: 1
skill: ow-alpha
writes:
  - { path: report.md, verb: /ow-alpha }
  - { path: terms.md, verb: /ow-alpha-accept }
  - { path: STATUS.md, verb: /ow-alpha, append: true }
reads:
  - { from: user, path: notes.md, if_absent: Ask for notes, if_mismatch: Use what parses }
hands_off:
  - when: Report done
    to: ow-beta
    verb: /ow-beta
    say: use ow-beta on report.md
    files: [{ path: report.md, fields: [title, date] }]
    if_unavailable: report.md stands alone
  - when: Accepted
    destination: contract
    files: [terms.md]
    if_unavailable: send terms.md to whoever drafts contracts
`;

const BETA_EDGES = `schema: 1
skill: ow-beta
routes: { verb: /ow-beta, reference: references/route.md, paths: [report.md] }
writes:
  - { path: summary.md, verb: /ow-beta }
  - { path: STATUS.md, verb: /ow-beta, append: true }
reads:
  - { from: ow-alpha, path: report.md, fields: [title], if_absent: Ask for the report, if_mismatch: Report the fields found }
hands_off:
  - { when: Done, to: none, files: [], if_unavailable: Nothing follows }
`;

function family({ alphaEdges = ALPHA_EDGES, betaEdges = BETA_EDGES, alphaBody = ALPHA_BODY, betaBody = BETA_BODY } = {}) {
  const dir = temp("ow-edges-");
  writeFileSync(join(dir, "ow-protocol.md"), PROTOCOL);
  const skill = (id, verbs, body, edges) => {
    mkdirSync(join(dir, id, "references"), { recursive: true });
    mkdirSync(join(dir, id, "examples"), { recursive: true });
    writeFileSync(join(dir, id, "references", "ow-protocol.md"), PROTOCOL);
    writeFileSync(join(dir, id, "SKILL.md"), `---\n${frontmatter(id, verbs)}\n---\n${body}`);
    if (edges !== null) writeFileSync(join(dir, id, "skill.edges.yaml"), edges);
  };
  skill("ow-alpha", ["/ow-alpha", "/ow-alpha-accept"], alphaBody, alphaEdges);
  skill("ow-beta", ["/ow-beta"], betaBody, betaEdges);
  writeFileSync(join(dir, "ow-beta", "references", "route.md"), "# Route\n\n`report.md` runs the summary.\n");
  writeFileSync(join(dir, "ow-alpha", "examples", "handoffs.yaml"), HANDOFFS);
  const ow = {
    id: "ow", dir, relDir: "skills-work", prefix: "ow-", verbPrefix: "/ow-", frontmatter: "agent-skills",
    protocol: { kind: "file", source: "ow-protocol.md", copy: "references/ow-protocol.md", version: 1 },
    edges: "skill.edges.yaml", planned: ["ow-gamma"], plannedVerbs: { "ow-gamma": ["/ow-gamma-start"] },
    addons: { "ow-tools": [] }, privateNames: ["llc-ops"], brandNames: ["Privateco"],
  };
  const oc = { id: "oc", dir: temp("oc-empty-"), relDir: "skills", prefix: "oc-", verbPrefix: "/oc-", frontmatter: "oc", protocol: { kind: "orchestrator" } };
  return [oc, ow];
}

const edges = (opts) => checkEdges(family(opts)).join("\n");
const next = (opts) => checkFamily(family(opts)).join("\n");

describe("edges: the scratch family", () => {
  it("passes as built", () => {
    const cats = family();
    expect(checkEdges(cats)).toEqual([]);
    expect(checkFamily(cats)).toEqual([]);
  });

  it("a one-sided edge: a hands-off file the receiver never reads", () => {
    const out = edges({ betaEdges: BETA_EDGES.replace(/ {2}- \{ from: ow-alpha[^\n]+\n/, "") });
    expect(out).toMatch(/ow-alpha\/skill\.edges\.yaml: hands off report\.md to ow-beta, but skills-work\/ow-beta\/skill\.edges\.yaml has no reads row for it from ow-alpha/);
  });

  it("a one-sided edge: a reads row the producer never hands off", () => {
    const out = edges({ alphaEdges: ALPHA_EDGES.replace("files: [{ path: report.md, fields: [title, date] }]", "files: []") });
    expect(out).toMatch(/ow-beta\/skill\.edges\.yaml: reads report\.md from ow-alpha, but skills-work\/ow-alpha\/skill\.edges\.yaml has no hands_off row to ow-beta carrying it/);
  });

  it("a reads row for a field the producer does not hand off, or a file it does not write", () => {
    expect(edges({ betaEdges: BETA_EDGES.replace("fields: [title]", "fields: [title, budget]") }))
      .toMatch(/reads field `budget` of report\.md, which skills-work\/ow-alpha\/skill\.edges\.yaml does not hand off/);
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("  - { path: report.md, verb: /ow-alpha }\n", "") }))
      .toMatch(/hands off report\.md, which ow-alpha does not write/);
  });

  it("a writer verb the skill does not declare, and seeding from another skill", () => {
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: summary.md, verb: /ow-beta }", "{ path: summary.md, verb: /ow-alpha }") }))
      .toMatch(/writer verb `\/ow-alpha` is not one of ow-beta's declared verbs/);
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: summary.md, verb: /ow-beta }", "{ path: summary.md, verb: /ow-beta, seeded_by: /ow-alpha }") }))
      .toMatch(/seeded_by `\/ow-alpha` is not one of ow-beta's declared verbs/);
  });

  it("a destination no example declares; absent, mismatch and unavailable cases are optional since 2026-11-03", () => {
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("destination: contract", "destination: lawyer") })).toMatch(/destination `lawyer` is not declared in any family examples\/handoffs\.yaml/);
    expect(edges({ betaEdges: BETA_EDGES.replace("if_absent: Ask for the report", "if_absent: —") })).toBe("");
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("if_unavailable: report.md stands alone", "if_unavailable: \"\"") })).toBe("");
    // Two writer verbs for one file are allowed now (the one-writer rule went with the audience reversal).
    expect(edges({ betaEdges: BETA_EDGES.replace("writes:\n", "writes:\n  - { path: report.md, verb: /ow-beta }\n") })).toBe("");
  });

  it("an edges row a body table the skill keeps does not carry; a skill that drops the table drops the check", () => {
    expect(edges({ betaBody: BETA_BODY.replace("| ow-alpha | report.md: `title` |", "| ow-alpha | the report |") })).toMatch(/the body's "## Reads from" table does not name report\.md/);
    expect(edges({ alphaBody: ALPHA_BODY.replace('"use ow-beta on report.md" | report.md |', '"hand it to beta" | report.md |') })).toMatch(/does not carry "use ow-beta on report\.md"/);
    expect(edges({ betaBody: BETA_BODY.replace(/## Reads from[\s\S]*?## Hands off to/, "## Hands off to") })).toBe("");
  });

  it("a missing or unreadable edges file fails with a reason", () => {
    expect(edges({ betaEdges: null })).toMatch(/ow-beta\/skill\.edges\.yaml: missing/);
    expect(edges({ betaEdges: "schema: 1\nskill: [\n" })).toMatch(/ow-beta\/skill\.edges\.yaml: not valid YAML/);
  });
});

// Owner decisions O1, OD-1 and O2 (Sprint 3, 2026-10-17): a file read in place where an
// earlier stage left it, carried by a chain whose every hop lists it, and a log only its
// own skill appends to. Each rule passes as built and fails on its planted slip.
describe("edges: in-place reads (O1, OD-1)", () => {
  // ow-beta reads alpha's terms.md where alpha left it; alpha's hand-off to beta lists it (OD-1).
  const inPlace = (path, from = "ow-alpha") => `  - { from: ${from}, path: ${path}, in_place: true, if_absent: Ask, if_mismatch: Use what parses }\n`;
  const carried = (path = "terms.md") => ALPHA_EDGES.replace("files: [{ path: report.md, fields: [title, date] }]", `files: [{ path: report.md, fields: [title, date] }, { path: ${path}, in_place: true }]`);
  const betaReadsTerms = (extra = "terms.md", alphaEdges = carried(extra)) => ({
    alphaEdges,
    betaEdges: BETA_EDGES.replace("reads:\n", `reads:\n${inPlace(extra)}`),
    betaBody: BETA_BODY.replace("| ow-alpha | report.md: `title` |", `| ow-alpha | ${extra}: in place | Ask | Use what parses |\n| ow-alpha | report.md: \`title\` |`),
  });

  it("an in-place read the producer writes, carried by every hop of a chain of hand-offs, passes", () => {
    expect(edges(betaReadsTerms())).toBe("");
  });

  it("OD-1 plant: a chain that reaches the reader but does not list the file fails", () => {
    // Alpha hands report.md to beta, so a chain exists; it never lists terms.md (the O1 rule accepted this).
    expect(edges(betaReadsTerms("terms.md", ALPHA_EDGES))).toMatch(/ow-beta\/skill\.edges\.yaml: reads terms\.md in place from ow-alpha, but no chain of hand-offs from ow-alpha to ow-beta lists it at every hop \(owner decision OD-1\)/);
  });

  it("OD-1 plants: an in-place hand-off entry for a file no skill writes, to a receiver that neither reads it nor hands it on, or not true", () => {
    expect(edges({ alphaEdges: carried("ghost.md") })).toMatch(/ow-alpha\/skill\.edges\.yaml: hands on ghost\.md in place, but no family skill writes it/);
    expect(edges({ alphaEdges: carried("terms.md") })).toMatch(/ow-alpha\/skill\.edges\.yaml: hands on terms\.md in place to ow-beta, which neither reads it nor hands it on in place/);
    expect(edges({ alphaEdges: carried("terms.md").replace("in_place: true }", "in_place: yes }") })).toMatch(/hands off terms\.md: in_place must be true or left out/);
  });

  it("O1 plant: an in-place read whose producer does not write the file fails", () => {
    expect(edges(betaReadsTerms("ledger.md", ALPHA_EDGES))).toMatch(/ow-beta\/skill\.edges\.yaml: reads ledger\.md in place from ow-alpha, which skills-work\/ow-alpha\/skill\.edges\.yaml does not write/);
  });

  it("O1 plant: an in-place read no chain of hand-offs reaches fails", () => {
    // ow-alpha reads beta's summary.md in place, but beta hands nothing on: no chain leads from beta to alpha.
    const out = edges({
      alphaEdges: ALPHA_EDGES.replace("reads:\n", `reads:\n${inPlace("summary.md", "ow-beta")}`),
      alphaBody: ALPHA_BODY.replace("| the user | notes.md |", "| ow-beta | summary.md: in place | Ask | Use what parses |\n| the user | notes.md |"),
    });
    expect(out).toMatch(/ow-alpha\/skill\.edges\.yaml: reads summary\.md in place from ow-beta, but no chain of hand-offs from ow-beta to ow-alpha lists it at every hop \(owner decision OD-1\)/);
  });

  it("O1 plant: in_place on a user file, or as a non-boolean, fails", () => {
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("{ from: user, path: notes.md,", "{ from: user, path: notes.md, in_place: true,") })).toMatch(/reads notes\.md in place from user; in_place is for a file a family skill writes/);
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("{ from: user, path: notes.md,", "{ from: user, path: notes.md, in_place: yes please,") })).toMatch(/in_place must be true or left out/);
  });

  it("without in_place, the same read is still one-sided", () => {
    const plain = betaReadsTerms("terms.md", ALPHA_EDGES);
    plain.betaEdges = plain.betaEdges.replace(", in_place: true", "");
    expect(edges(plain)).toMatch(/ow-beta\/skill\.edges\.yaml: reads terms\.md from ow-alpha, but skills-work\/ow-alpha\/skill\.edges\.yaml has no hands_off row to ow-beta carrying it/);
  });
});

// ── the real skills-work/ tree, copied ───────────────────────────────────────

function realTree(edit = {}) {
  const dir = temp("ow-real-");
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

describe("edges: the real family", () => {
  it("every ow- skill has an edges file and the real tree passes", () => {
    const cats = loadCatalogs({ env: {} });
    expect(checkEdges(cats)).toEqual([]);
  });

  it("ow-start declares the recap's path_* header as an output its next stage reads", () => {
    const text = readFileSync(join(ROOT, "skills-work", "ow-start", "skill.edges.yaml"), "utf8");
    expect(text).toMatch(/path: intake\/<client>\/recap\.md, fields: \[path_id, path_label, path_kind, path_systems/);
  });

  it("a one-sided self edge planted in ow-start fails", () => {
    const cats = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace(/ {2}- from: ow-start\n {4}verb: \/ow-start-prep\n {4}path: intake\/<client>\/call-guide\.md\n(?: {4}[^\n]+\n)+/, "") });
    expect(checkEdges(cats).join("\n")).toMatch(/hands off intake\/<client>\/call-guide\.md to ow-start, but skills-work\/ow-start\/skill\.edges\.yaml has no reads row for it from ow-start/);
  });

  // Contract C4 and C5 on ow-build-plan itself.
  it("C4: a one-sided edge between ow-start and ow-build-plan fails, in either direction", () => {
    const noRead = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace(/ {2}- from: ow-start\n {4}path: intake\/<client>\/recap\.md\n(?: {4}[^\n]+\n)+/, "") });
    expect(checkEdges(noRead).join("\n")).toMatch(/ow-start\/skill\.edges\.yaml: hands off intake\/<client>\/recap\.md to ow-build-plan, but skills-work\/ow-build-plan\/skill\.edges\.yaml has no reads row for it from ow-start/);
    const noHand = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("      - { path: intake/<client>/coverage.md, fields: [must-ask statuses] }\n", "") });
    expect(checkEdges(noHand).join("\n")).toMatch(/ow-build-plan\/skill\.edges\.yaml: reads intake\/<client>\/coverage\.md from ow-start, but skills-work\/ow-start\/skill\.edges\.yaml has no hands_off row to ow-build-plan carrying it/);
    const field = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("fields: [path_id, path_label, path_kind, path_systems]", "fields: [path_id, path_label, path_kind, path_systems, path_price]") });
    expect(checkEdges(field).join("\n")).toMatch(/reads field `path_price` of intake\/<client>\/recap\.md/);
  });

  it("bug 2: a writer mode the body never documents fails", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "skill.edges.yaml"), "utf8");
    expect(edges).toMatch(/path: plans\/<client>\/quote\.md, verb: \/ow-build-plan-quote, modes: \[[^\]]*--quick/);
    const bogus = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("verb: /ow-build-plan-quote, modes: [--whole-project", "verb: /ow-build-plan-quote, modes: [--bogus, --whole-project") });
    expect(checkEdges(bogus).join("\n")).toMatch(/mode `\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
  });

  it("bug 10: a writer mode the body never documents fails", () => {
    const cats = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("verb: /ow-build-plan-quote --accepted }", "verb: /ow-build-plan-quote --bogus }") });
    expect(checkEdges(cats).join("\n")).toMatch(/writer mode `\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
  });

  it("bug 10: a hands_off verb that resolves nowhere, or to another skill, fails", () => {
    const dangling = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-start\n", "    verb: /ow-build-launch\n") });
    expect(checkEdges(dangling).join("\n")).toMatch(/verb `\/ow-build-launch` is not declared by any skill, add-on or planned skill/);
    const other = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-start\n", "    verb: /ow-build-plan-start\n") });
    expect(checkEdges(other).join("\n")).toMatch(/verb `\/ow-build-plan-start` belongs to ow-build-plan, not to ow-build/);
  });

  it("bug 1: ow-start's handoff to ow-build-plan names the verb that routes it", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-start", "skill.edges.yaml"), "utf8");
    expect(edges).toMatch(/to: ow-build-plan\n {4}verb: \/ow-build-plan /);
    const noRoute = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-plan      #", "    verb: /ow-build-launch      #") });
    expect(checkEdges(noRoute).join("\n")).toMatch(/verb `\/ow-build-launch` is not declared/);
  });

  it("bug 12: the family ships one offers.md and one handoffs.yaml example", () => {
    for (const f of ["offers.md", "handoffs.yaml"]) {
      expect(readFileSync(join(ROOT, "skills-work", "ow-start", "examples", f), "utf8"), f).toBe(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", f), "utf8"));
    }
  });

  // Round 3 (eval-round-2 bug 7 and item 0): each slip the Evaluator planted fails.
  const R3 = "ow-build-plan/references/routing-and-resume.md";
  const all = (cats) => [...checkFamily(cats), ...checkEdges(cats)].join("\n");

  it("item 0 / C1: the routing reference missing, emptied, or without the routes it must cover", () => {
    expect(all(realTree({ [R3]: () => "" }))).toMatch(/routing-and-resume\.md: no route for intake\/<client>\/intake-record\.md/);
    expect(all(realTree({ [R3]: (t) => t.replace(/## 2\. `\/ow-build-plan on <path>`[\s\S]*$/, "") }))).toMatch(/no route for plans\/<client>\/, which/);
    const gone = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("reference: references/routing-and-resume.md", "reference: references/routing.md") });
    expect(all(gone)).toMatch(/routes reference references\/routing\.md does not exist/);
  });

  it("item 0 / C2: the body's verbs-table pointer to the routing reference removed", () => {
    const cats = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace(/\| `\/ow-build-plan on <path>` \|[^\n]*\n/, "") });
    expect(all(cats)).toMatch(/the "## Verbs" table has no `\/ow-build-plan on <path>` row pointing to `references\/routing-and-resume\.md`/);
  });

  it("C3 and C11: an 'on <path>' handoff with the wrong verb, or for a path the routes do not cover", () => {
    const verb = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-plan      #", "    verb: /ow-build-plan-map      #") });
    expect(all(verb)).toMatch(/must name ow-build-plan's routing verb \/ow-build-plan, not \/ow-build-plan-map/);
    const path = realTree({
      "ow-start/SKILL.md": (t) => t.split("use ow-build-plan on intake/<client>/intake-record.md").join("use ow-build-plan on intake/<client>/recap.md"),
      "ow-start/skill.edges.yaml": (t) => t.replace("say: use ow-build-plan on intake/<client>/intake-record.md", "say: use ow-build-plan on intake/<client>/recap.md"),
    });
    expect(all(path)).toMatch(/hands intake\/<client>\/recap\.md, which ow-build-plan's routes do not cover/);
  });

  it("C6: shared: true on a client file instead of a hands-off row", () => {
    const cats = realTree({
      "ow-build-plan/skill.edges.yaml": (t) => t.replace("reads:\n", "reads:\n  - from: ow-start\n    path: intake/<client>/call-guide.md\n    shared: true\n    fields: [the must-ask list]\n    if_absent: Ask\n    if_mismatch: Use what parses\n"),
    });
    expect(all(cats)).toMatch(/shared: true is for workspace files at the top of opchain-work\/ .*intake\/<client>\/call-guide\.md is a client file/);
  });

  it("item 7: the example schedule has real placeholders, and the one example price is a stated placeholder", () => {
    const book = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", "price-book.yaml"), "utf8");
    for (const [tier, collect, deliver] of [["one_system", 2, 5], ["two_systems", 4, 10], ["three_plus_or_mvp", 4, 10]]) {
      expect(book).toMatch(new RegExp(`${tier}: \\{ collection_business_days: ${collect}, delivery_business_days: ${deliver} \\}`));
    }
    // Owner decision (g): the deadlines are the user's numbers only; no rule ties them to the weeks.
    // The ban (tests/ow-text-pins.mjs) covers every ow- skill file and every spelling the evaluator tried.
    const week = BANS.find((b) => b.id.startsWith("no 5-a-week")).re;
    for (const said of ["5 × `weeks`", "5 a week", "5 * weeks", "five business days per week", "5x `build_plan_weeks`", "5 working days a week", "business days per week"]) expect(said).toMatch(week);
    for (const fine of ["40 orders a week", "fix_business_days: 5", "2 weeks from the start date", "a written update each week"]) expect(fine).not.toMatch(week);
    expect(pinProblems(join(ROOT, "skills-work")).filter((x) => x.includes("5-a-week"))).toEqual([]);
    const offers = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", "offers.md"), "utf8");
    expect(offers).not.toMatch(/not prices/);
    expect(offers).toMatch(/hourly_help: \{ price: 1000 \} +# placeholder/);
  });
});

// Eval round 4 follow-ups: the prose rules are pinned, and the checker slips of rounds 3 and 4 fail.
describe("eval round 4 follow-ups", () => {
  const plantedDir = (edit) => realTree(edit).find((c) => c.prefix === "ow-").dir;
  const pins = (edit) => pinProblems(plantedDir(edit)).join("\n");

  it("the real tree keeps every pinned rule and no banned wording", () => {
    expect(pinProblems(join(ROOT, "skills-work"))).toEqual([]);
  });

  for (const pin of PINS) {
    it(`pinned rule "${pin.id}": deleting it fails`, () => {
      const out = pins({ [pin.file]: (t) => (typeof pin.must === "string" ? t.split(pin.must).join("") : t.replace(new RegExp(pin.must.source, pin.must.flags.replace("g", "") + "g"), "")) });
      expect(out).toContain(`the pinned rule "${pin.id}" is missing or reworded`);
    });
  }

  const rep = (a, b) => (t) => { if (!t.includes(a)) throw new Error(`no match: ${a.slice(0, 60)}`); return t.replace(a, b); };

  const E = "ow-build-plan/skill.edges.yaml", B = "ow-build-plan/SKILL.md";
  const all = (cats) => [...checkFamily(cats), ...checkEdges(cats)].join("\n");

  it("K8: shared: true on a client file spelled with backslashes", () => {
    const cats = realTree({
      [E]: rep("reads:\n", "reads:\n  - from: ow-start\n    path: intake\\<client>\\call-guide.md\n    shared: true\n    fields: [the must-ask list]\n    if_absent: Ask\n    if_mismatch: Use what parses\n"),
    });
    expect(all(cats)).toMatch(/shared: true is for workspace files at the top of opchain-work\/ .*call-guide\.md is a client file/);
  });

  it("K14: routes.paths dropping a path the routing reference routes", () => {
    const cats = realTree({ [E]: rep("paths: [intake/<client>/intake-record.md, handoffs/<client>/fixes/FIX-nn.md, uat/<client>/defects/UAT-nn.md, plans/<client>/]", "paths: [intake/<client>/intake-record.md, handoffs/<client>/fixes/FIX-nn.md, uat/<client>/defects/UAT-nn.md]") });
    expect(all(cats)).toMatch(/routes\.paths does not list plans\/<slug>\/, which references\/routing-and-resume\.md routes/);
  });

  it("K16/K32: an edges writes: row the body's Verbs table never names", () => {
    for (const verb of ["/ow-build-plan-export", "/ow-build-plan-quote"]) {
      const cats = realTree({ [E]: rep("writes:\n", `writes:\n  - { path: plans/<client>/quote-r<n>.md, verb: ${verb} }\n`) });
      expect(all(cats), verb).toMatch(new RegExp(`the body's "## Verbs" table does not name plans/<client>/quote-r<n>\\.md in the Writes column of \`${verb}\``));
    }
    const noRow = realTree({ [E]: rep("writes:\n", "writes:\n  - { path: plans/<client>/notes.md, verb: /ow-build-plan-quote --signed }\n") });
    expect(all(noRow)).toMatch(/does not name plans\/<client>\/notes\.md in the Writes column of `\/ow-build-plan-quote --signed`/);
  });
});
