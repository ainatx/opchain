// ow- edges (cross-talk contract R15, docs/audits/2026-09-18-ow-pack-design-audit.md):
// each skill's skill.edges.yaml, reciprocity inside the family, one writer
// verb per file, and NEXT targets that resolve. A scratch two-skill family
// proves each rule catches what it claims; then the real skills-work/ tree is
// copied and the same failures are planted in it.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import { appendOnlyFiles, checkEdges, checkFamily, checkVerbs } from "../scripts/check-skill-contracts.mjs";

const ROOT = join(import.meta.dirname, "..");
const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
const temp = (prefix) => { const d = realpathSync(mkdtempSync(join(tmpdir(), prefix))); scratch.push(d); return d; };

// ── a scratch family: ow-alpha hands report.md to ow-beta ────────────────────

const PROTOCOL = "# ow- protocol (version 1)\n\n`STATUS.md` is the one shared file, and it is append-only.\n";
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
  it("passes as built, and reads STATUS.md as append-only from the protocol", () => {
    const cats = family();
    expect(checkEdges(cats)).toEqual([]);
    expect(checkFamily(cats)).toEqual([]);
    expect([...appendOnlyFiles(cats[1])]).toEqual(["STATUS.md"]);
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

  it("a second writer verb for one file, in the same skill or another", () => {
    const same = edges({ alphaEdges: ALPHA_EDGES.replace("writes:\n", "writes:\n  - { path: terms.md, verb: /ow-alpha }\n") });
    expect(same).toMatch(/terms\.md: 2 writers \(ow-alpha \/ow-alpha-accept, ow-alpha \/ow-alpha\)|terms\.md: 2 writers \(ow-alpha \/ow-alpha, ow-alpha \/ow-alpha-accept\)/);
    const other = edges({ betaEdges: BETA_EDGES.replace("writes:\n", "writes:\n  - { path: report.md, verb: /ow-beta }\n") });
    expect(other).toMatch(/report\.md: 2 writers \(ow-alpha \/ow-alpha, ow-beta \/ow-beta\); one writer verb per file/);
  });

  it("append-only logs are the only shared files, and must be declared as appends", () => {
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: STATUS.md, verb: /ow-beta, append: true }", "{ path: STATUS.md, verb: /ow-beta }") }))
      .toMatch(/STATUS\.md is append-only \(protocol\); \/ow-beta must declare append: true/);
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: summary.md, verb: /ow-beta }", "{ path: summary.md, verb: /ow-beta, append: true }") }))
      .toMatch(/summary\.md is not an append-only file in the protocol/);
  });

  it("a writer verb the skill does not declare, and seeding from another skill", () => {
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: summary.md, verb: /ow-beta }", "{ path: summary.md, verb: /ow-alpha }") }))
      .toMatch(/writer verb `\/ow-alpha` is not one of ow-beta's declared verbs/);
    expect(edges({ betaEdges: BETA_EDGES.replace("{ path: summary.md, verb: /ow-beta }", "{ path: summary.md, verb: /ow-beta, seeded_by: /ow-alpha }") }))
      .toMatch(/seeded_by `\/ow-alpha` is not one of ow-beta's declared verbs/);
  });

  it("empty absent, mismatch and unavailable cases; a destination no example declares", () => {
    expect(edges({ betaEdges: BETA_EDGES.replace("if_absent: Ask for the report", "if_absent: —") })).toMatch(/reads\[0\] \(report\.md\): if_absent is empty/);
    expect(edges({ betaEdges: BETA_EDGES.replace("if_mismatch: Report the fields found", "if_mismatch: proceed as if it passed") })).toMatch(/if_mismatch may never proceed as if the input passed/);
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("if_unavailable: report.md stands alone", "if_unavailable: \"\"") })).toMatch(/hands_off\[0\] \(Report done\): if_unavailable is empty/);
    expect(edges({ alphaEdges: ALPHA_EDGES.replace("destination: contract", "destination: lawyer") })).toMatch(/destination `lawyer` is not declared in any family examples\/handoffs\.yaml/);
  });

  it("an edges row the body's tables do not carry", () => {
    expect(edges({ betaBody: BETA_BODY.replace("| ow-alpha | report.md: `title` |", "| ow-alpha | the report |") })).toMatch(/the body's "## Reads from" table does not name report\.md/);
    expect(edges({ alphaBody: ALPHA_BODY.replace('"use ow-beta on report.md" | report.md |', '"hand it to beta" | report.md |') })).toMatch(/does not carry "use ow-beta on report\.md"/);
  });

  it("a missing or unreadable edges file fails with a reason", () => {
    expect(edges({ betaEdges: null })).toMatch(/ow-beta\/skill\.edges\.yaml: missing/);
    expect(edges({ betaEdges: "schema: 1\nskill: [\n" })).toMatch(/ow-beta\/skill\.edges\.yaml: not valid YAML/);
  });
});

describe("NEXT targets resolve", () => {
  it("a dangling NEXT: a verb nobody declares, a verb another skill owns, an unknown destination, an unknown skill", () => {
    expect(next({ alphaBody: ALPHA_BODY.replace("(where slash commands exist: /ow-beta)", "(where slash commands exist: /ow-beta-run)") }))
      .toMatch(/NEXT's verb `\/ow-beta-run` is not declared by any skill, add-on or planned skill/);
    expect(next({ alphaBody: ALPHA_BODY.replace("(where slash commands exist: /ow-beta)", "(where slash commands exist: /ow-alpha-accept)") }))
      .toMatch(/NEXT says "use ow-beta" but its verb `\/ow-alpha-accept` belongs to ow-alpha/);
    expect(next({ alphaBody: ALPHA_BODY.replace("NEXT: handoffs.yaml `contract`", "NEXT: handoffs.yaml `lawyer`") }))
      .toMatch(/names handoffs\.yaml `lawyer`, which no family examples\/handoffs\.yaml declares/);
    expect(next({ alphaBody: ALPHA_BODY.replace('say "use ow-beta on report.md"', 'say "use ow-zeta on report.md"') }))
      .toMatch(/NEXT names `ow-zeta`/);
  });

  it("a planned skill's declared verb resolves, and a destination in an IF line is checked too", () => {
    const planned = ALPHA_BODY.replace('NEXT: say "use ow-beta on report.md"   (where slash commands exist: /ow-beta)', 'NEXT: say "use ow-gamma to start report.md"   (where slash commands exist: /ow-gamma-start)')
      .replace("IF IT IS NOT AVAILABLE: report.md stands alone.", "IF IT IS NOT AVAILABLE: handoffs.yaml `build`: its say: line, {files} = report.md.");
    expect(next({ alphaBody: planned })).toBe("");
    expect(next({ alphaBody: planned.replace("handoffs.yaml `build`", "handoffs.yaml `builder`") })).toMatch(/names handoffs\.yaml `builder`/);
  });

  it("the merged verb index accepts a planned skill's declared verb", () => {
    const cats = family({ alphaBody: `${ALPHA_BODY}\nLater: \`/ow-gamma-start\`, never \`/ow-gamma-run\`.\n` });
    expect(checkVerbs(null, { catalogs: cats })).toEqual([
      expect.stringMatching(/`\/ow-gamma-run` is not declared by any skill's frontmatter commands/),
    ]);
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

  it("a second writer planted in ow-start fails", () => {
    const cats = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("  - { path: intake/<client>/send-ahead.md, verb: /ow-start-prep }\n", "  - { path: intake/<client>/send-ahead.md, verb: /ow-start-prep }\n  - { path: intake/<client>/recap.md, verb: /ow-start-prep }\n") });
    expect(checkEdges(cats).join("\n")).toMatch(/intake\/<\*>\/recap\.md: 2 writers \(ow-start \/ow-start-extract, ow-start \/ow-start-prep\)|intake\/<\*>\/recap\.md: 2 writers \(ow-start \/ow-start-prep, ow-start \/ow-start-extract\)/);
  });

  it("a one-sided self edge planted in ow-start fails", () => {
    const cats = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace(/ {2}- from: ow-start\n {4}verb: \/ow-start-prep\n {4}path: intake\/<client>\/call-guide\.md\n(?: {4}[^\n]+\n)+/, "") });
    expect(checkEdges(cats).join("\n")).toMatch(/hands off intake\/<client>\/call-guide\.md to ow-start, but skills-work\/ow-start\/skill\.edges\.yaml has no reads row for it from ow-start/);
  });

  // Contract C4 and C5 on ow-build-plan itself.
  it("C5: contract-inputs.md planted as a second verb's output fails", () => {
    const cats = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("  - { path: plans/<client>/risks.md, verb: /ow-build-plan-scope }\n", "  - { path: plans/<client>/risks.md, verb: /ow-build-plan-scope }\n  - { path: plans/<client>/contract-inputs.md, verb: /ow-build-plan-scope }\n") });
    expect(checkEdges(cats).join("\n")).toMatch(/plans\/<\*>\/contract-inputs\.md: 2 writers \(ow-build-plan \/ow-build-plan-scope, ow-build-plan \/ow-build-plan-quote --accepted\); one writer verb per file/);
  });

  it("C5: another family skill writing ow-build-plan's quote fails", () => {
    const cats = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("writes:\n", "writes:\n  - { path: plans/<client>/quote.md, verb: /ow-start-extract }\n") });
    expect(checkEdges(cats).join("\n")).toMatch(/plans\/<\*>\/quote\.md: 2 writers \(ow-start \/ow-start-extract, ow-build-plan \/ow-build-plan-quote\)|plans\/<\*>\/quote\.md: 2 writers \(ow-build-plan \/ow-build-plan-quote, ow-start \/ow-start-extract\)/);
  });

  it("C4: a one-sided edge between ow-start and ow-build-plan fails, in either direction", () => {
    const noRead = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace(/ {2}- from: ow-start\n {4}path: intake\/<client>\/recap\.md\n(?: {4}[^\n]+\n)+/, "") });
    expect(checkEdges(noRead).join("\n")).toMatch(/ow-start\/skill\.edges\.yaml: hands off intake\/<client>\/recap\.md to ow-build-plan, but skills-work\/ow-build-plan\/skill\.edges\.yaml has no reads row for it from ow-start/);
    const noHand = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("      - { path: intake/<client>/coverage.md, fields: [must-ask statuses] }\n", "") });
    expect(checkEdges(noHand).join("\n")).toMatch(/ow-build-plan\/skill\.edges\.yaml: reads intake\/<client>\/coverage\.md from ow-start, but skills-work\/ow-start\/skill\.edges\.yaml has no hands_off row to ow-build-plan carrying it/);
    const field = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("fields: [path_id, path_label, path_kind, path_systems]", "fields: [path_id, path_label, path_kind, path_systems, path_price]") });
    expect(checkEdges(field).join("\n")).toMatch(/reads field `path_price` of intake\/<client>\/recap\.md/);
  });

  it("C4: a dangling NEXT planted in ow-build-plan fails", () => {
    const verb = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("(where slash commands exist: /ow-build-start)", "(where slash commands exist: /ow-build-run)") });
    expect(checkFamily(verb).join("\n")).toMatch(/ow-build-plan\/SKILL\.md:\d+: NEXT's verb `\/ow-build-run` is not declared/);
    const dest = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("NEXT: handoffs.yaml `contract`", "NEXT: handoffs.yaml `lawyer`") });
    expect(checkFamily(dest).join("\n")).toMatch(/ow-build-plan\/SKILL\.md:\d+: names handoffs\.yaml `lawyer`/);
    const owner = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace('say "use ow-build to start plans/<client>/"', 'say "use ow-build-plan to start plans/<client>/"') });
    expect(checkFamily(owner).join("\n")).toMatch(/NEXT says "use ow-build-plan" but its verb `\/ow-build-start` belongs to ow-build/);
  });

  it("C9: the signed NEXT names /ow-build-start with the build destination as its unavailable branch", () => {
    const body = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "SKILL.md"), "utf8");
    const block = body.slice(body.indexOf("DONE: client signed"), body.indexOf("A quick quote over the limit"));
    expect(block).toMatch(/NEXT: say "use ow-build to start plans\/<client>\/" {3}\(where slash commands exist: \/ow-build-start\)/);
    expect(block).toMatch(/IF IT IS NOT AVAILABLE: handoffs\.yaml `build`\n/);
    expect(body).toMatch(/A `handoffs\.yaml` line below is never printed as written: print that key's say: line exactly, `\{files\}` filled in, or the public default/);
    expect(readFileSync(join(ROOT, "skills-work", "ow-build-plan", "references", "phase-quote.md"), "utf8")).toMatch(/or, with none, `give build-request\.md to whoever builds it`\. Nothing else goes on that line\./);
  });

  // Round 2 (eval-round-1 bugs 2 and 10): the slips the Evaluator planted.
  it("bug 2: --quick declared honestly as a mode of the quote's writer passes; as a second writer it fails", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "skill.edges.yaml"), "utf8");
    expect(edges).toMatch(/path: plans\/<client>\/quote\.md, verb: \/ow-build-plan-quote, modes: \[--quick\]/);
    const second = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("writes:\n", "writes:\n  - { path: plans/<client>/quote.md, verb: /ow-build-plan-quote --quick }\n") });
    expect(checkEdges(second).join("\n")).toMatch(/plans\/<\*>\/quote\.md: 2 writers/);
    const bogus = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("verb: /ow-build-plan-quote, modes: [--quick] }\n  - { path: plans/<client>/quote-items.json", "verb: /ow-build-plan-quote, modes: [--quick, --bogus] }\n  - { path: plans/<client>/quote-items.json") });
    expect(checkEdges(bogus).join("\n")).toMatch(/mode `\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
  });

  it("bug 10: a writer mode the body never documents fails", () => {
    const cats = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("verb: /ow-build-plan-quote --accepted }", "verb: /ow-build-plan-quote --bogus }") });
    expect(checkEdges(cats).join("\n")).toMatch(/writer mode `\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
  });

  it("bug 10: one file spelled with an opchain-work/ prefix, ./ or other case is still one file", () => {
    for (const spelled of ["opchain-work/plans/<client>/contract-inputs.md", "plans/<client>/./contract-inputs.md", "plans/<client>/Contract-Inputs.md"]) {
      const cats = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("  - { path: plans/<client>/risks.md, verb: /ow-build-plan-scope }\n", `  - { path: plans/<client>/risks.md, verb: /ow-build-plan-scope }\n  - { path: ${spelled}, verb: /ow-build-plan-scope }\n`) });
      expect(checkEdges(cats).join("\n"), spelled).toMatch(/plans\/<\*>\/contract-inputs\.md: 2 writers/);
    }
  });

  it("bug 10: a hands_off verb that resolves nowhere, or to another skill, fails", () => {
    const dangling = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-start\n", "    verb: /ow-build-run\n") });
    expect(checkEdges(dangling).join("\n")).toMatch(/verb `\/ow-build-run` is not declared by any skill, add-on or planned skill/);
    const other = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-start\n", "    verb: /ow-build-plan-start\n") });
    expect(checkEdges(other).join("\n")).toMatch(/verb `\/ow-build-plan-start` belongs to ow-build-plan, not to ow-build/);
  });

  it("bug 10 (R15): a NEXT template whose say differs from its edges row, and a handoff with no template, fail", () => {
    const differs = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace('say "use ow-build-plan to map plans/<client>/"', 'say "use ow-build-plan to draw the map of plans/<client>/"') });
    const out = checkEdges(differs).join("\n");
    expect(out).toMatch(/the handoff "use ow-build-plan to map plans\/<client>\/" has no NEXT template in ow-build-plan's body/);
    expect(out).toMatch(/the NEXT template "use ow-build-plan to draw the map of plans\/<client>\/" matches no hands_off say/);
    const noDest = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("    NEXT: handoffs.yaml `contract`\n", "    NEXT: send it on\n") });
    expect(checkEdges(noDest).join("\n")).toMatch(/the handoff to handoffs\.yaml `contract` has no NEXT template/);
  });

  it("bug 1: ow-start's handoff to ow-build-plan names the verb that routes it", () => {
    const edges = readFileSync(join(ROOT, "skills-work", "ow-start", "skill.edges.yaml"), "utf8");
    expect(edges).toMatch(/to: ow-build-plan\n {4}verb: \/ow-build-plan /);
    const routing = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "references", "routing-and-resume.md"), "utf8");
    for (const row of [/\| `build-plan` \| `\/ow-build-plan-offer` for this intake \|/, /\| `defined-work` \| `\/ow-build-plan-quote --quick` for this intake \|/, /\| `next-stage` \| `\/ow-build-plan-start` for this intake \| .*\*\*Never an offer\*\*/, /## 2\.2 A follow-on request: `handoffs\/<slug>\/fixes\/FIX-nn\.md`\n\nRuns `\/ow-build-plan-offer`/, /\*\*the quote is done: never run `-quote` again from here\.\*\*/]) {
      expect(routing).toMatch(row);
    }
    const noRoute = realTree({ "ow-start/skill.edges.yaml": (t) => t.replace("    verb: /ow-build-plan      #", "    verb: /ow-build-run      #") });
    expect(checkEdges(noRoute).join("\n")).toMatch(/verb `\/ow-build-run` is not declared/);
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
    expect(all(realTree({ [R3]: (t) => t.replace(/## 2\. `\/ow-build-plan on <path>`[\s\S]*$/, "") }))).toMatch(/no route for handoffs\/<client>\/fixes\/FIX-nn\.md/);
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

  it("C4 and C16: a second writer spelled with '..' or as a follow-on folder", () => {
    const dots = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("writes:\n", "writes:\n  - { path: plans/<client>/export/../contract-inputs.md, verb: /ow-build-plan-scope }\n") });
    expect(all(dots)).toMatch(/plans\/<\*>\/contract-inputs\.md: 2 writers/);
    const folder = realTree({ "ow-build-plan/skill.edges.yaml": (t) => t.replace("writes:\n", "writes:\n  - { path: plans/<client>-<n>/plan.yaml, verb: /ow-build-plan-offer }\n") });
    expect(all(folder)).toMatch(/plans\/<\*>\/plan\.yaml: 2 writers/);
  });

  it("C5: a slash hint with a mode the owner's body never documents, on a NEXT or a later template line", () => {
    const when = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("(where slash commands exist: /ow-build-plan-quote --signed <date>)", "(where slash commands exist: /ow-build-plan-quote --bogus <date>)") });
    expect(all(when)).toMatch(/`\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
    const next = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("(where slash commands exist: /ow-build-plan-quote --accepted <date>)", "(where slash commands exist: /ow-build-plan-quote --bogus <date>)") });
    expect(all(next)).toMatch(/NEXT's `\/ow-build-plan-quote --bogus` is not a mode ow-build-plan's body documents/);
  });

  it("C6: shared: true on a client file instead of a hands-off row", () => {
    const cats = realTree({
      "ow-build-plan/skill.edges.yaml": (t) => t.replace("reads:\n", "reads:\n  - from: ow-start\n    path: intake/<client>/call-guide.md\n    shared: true\n    fields: [the must-ask list]\n    if_absent: Ask\n    if_mismatch: Use what parses\n"),
      "ow-build-plan/SKILL.md": (t) => t.replace("| ow-start | `intake/<client>/coverage.md`", "| ow-start | intake/<client>/call-guide.md: must-asks | Ask | Use what parses |\n| ow-start | `intake/<client>/coverage.md`"),
    });
    expect(all(cats)).toMatch(/shared: true is for workspace files at the top of opchain-work\/ .*intake\/<client>\/call-guide\.md is a client file/);
  });

  it("C7 and C8 (protocol §9): a NEXT template without its 'It will read:' or no-folder line", () => {
    const read = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("          It will read: plan.yaml, evidence.md, systems/\n", "") });
    expect(all(read)).toMatch(/this NEXT template has no "It will read:" line \(protocol §9\)/);
    const folder = realTree({ "ow-build-plan/SKILL.md": (t) => t.replace("          It will read: plan.yaml, evidence.md, systems/\n          [no folder attached: attach them when you say it]\n", "          It will read: plan.yaml, evidence.md, systems/\n") });
    expect(all(folder)).toMatch(/this NEXT template has no "\[no folder attached: …\]" line/);
    // The accepted block's signing line carries both (round 1 bug 14 residue).
    const body = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "SKILL.md"), "utf8");
    expect(body).toMatch(/WHEN IT IS SIGNED: say "use ow-build-plan to record the signing[^\n]*\n {10}It will read: [^\n]*\n {10}\[no folder attached: attach them when you say it\]/);
  });

  it("item 7: the example schedule is sized to the plan's weeks, and the one example price is a stated placeholder", () => {
    const book = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", "price-book.yaml"), "utf8");
    for (const [tier, weeks, collect, deliver] of [["one_system", 1, 2, 5], ["two_systems", 2, 4, 10], ["three_plus_or_mvp", 2, 4, 10]]) {
      expect(book).toMatch(new RegExp(`${tier}: \\{ collection_business_days: ${collect}, delivery_business_days: ${deliver} \\}`));
      expect(deliver).toBe(5 * weeks);
    }
    const offers = readFileSync(join(ROOT, "skills-work", "ow-build-plan", "examples", "offers.md"), "utf8");
    expect(offers).not.toMatch(/not prices/);
    expect(offers).toMatch(/hourly_help: \{ price: 1000 \} +# placeholder/);
  });
});
