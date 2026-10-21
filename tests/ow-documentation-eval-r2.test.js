// Evaluation round 2 for ow-documentation (OW-05), made permanent with ow-documentation 1.0.1 (contract C24):
// - every plant and probe of the Evaluator's round-2 harness (sprints/release-2.1/ow-05/eval-round-2.md, scratch
//   h/probes2.mjs, probe-o6.mjs and r1-others-folders.mjs), with its plant code copied verbatim. A probe is graded
//   as the harness graded it: by the checks that fail on the edited golden and not on the same golden laid out
//   unedited (both laid out as real runs). U15 (withdrawn) and V09 (a nit outside the owner's definition of a client
//   output) are kept as controls, labelled; O03 is graded directly, as probe-o6.mjs graded it;
// - the Evaluator's untuned set (h/heldout2.mjs, copied as tests/ow-documentation-eval-r2-heldout.mjs) through
//   run-heldout2.mjs's grading, as a permanent held-out test;
// - the Generator's own held-out set for the 1.0.1 rule changes (tests/ow-documentation-heldout-r2.mjs, sha256
//   dfd070be…, hashed before any rule changed), with each measured miss labelled, not tuned;
// - the other-client rule's exported shape, which ow-draft (OW-10) imports.
// The scratch measurement plants each sentence in every place (eight document places, twelve refusal screens); this
// file keeps three refusal screens and one document place per sentence, rotating so every screen and place is used,
// so it stays fast.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as C from "../scripts/ow-documentation-acceptance.mjs";
import * as EV from "./ow-documentation-eval-r2-heldout.mjs";
import * as S from "./ow-documentation-heldout-r2.mjs";
import * as H from "./ow-documentation-helpers.mjs";

afterAll(H.cleanup, 120000);
const D = "opchain-work/docs/larkspur-ceramics";
const MEANING = ["internal_numbers", "people", "credentials", "data", "private_names"];
/** The Evaluator's grade (h/r1harness/lib.mjs): { check: problems } for every check that fails on the run. */
function grade(caseName, dir, opts = {}) {
  let res;
  try { res = C.runCase(caseName, dir, opts.caseDir ? { caseDir: opts.caseDir } : {}); } catch (e) { return { CRASH: String(e?.stack ?? e).slice(0, 300) }; }
  return Object.fromEntries(res.filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
}
/** The Evaluator's inSection: a line literally after a heading (start) or before the next heading (end). */
function inSection(heading, line, where = "start") {
  return (t) => {
    if (t == null) throw new Error("no file");
    const lines = t.split("\n");
    const i = lines.findIndex((l) => l.trim() === heading.trim());
    if (i < 0) throw new Error(`no heading ${heading}`);
    const lvl = heading.match(/^#+/)[0].length;
    if (where === "start") {
      let j = i + 1; while (j < lines.length && lines[j].trim() === "") j++;
      lines.splice(j, 0, line, "");
    } else {
      let j = i + 1;
      while (j < lines.length && !(new RegExp(`^#{1,${lvl}} `).test(lines[j])) && !/^<!-- ow:internal -->/.test(lines[j])) j++;
      let k = j; while (k > i + 1 && lines[k - 1].trim() === "") k--;
      lines.splice(k, 0, "", line);
    }
    return lines.join("\n");
  };
}
function diff(after, before) {
  const out = {};
  for (const [k, v] of Object.entries(after)) {
    const b = new Set(String(before[k] ?? "").split("\n"));
    const lines = String(v).split("\n").filter((l) => !b.has(l));
    if (lines.length) out[k] = lines.join("\n");
  }
  return out;
}
const re = (a, b) => (t) => { if (t == null || !a.test(t)) throw new Error(`no match ${a}`); return t.replace(a, b); };
const compose = (f, g) => (t) => g(f(t));
function probe(c, baseEdits, plantEdits, opts = {}) {
  const b = H.mutated(c, baseEdits);
  const merged = { ...baseEdits };
  for (const [k, v] of Object.entries(plantEdits)) merged[k] = baseEdits[k] ? compose(baseEdits[k], v) : v;
  const a = H.mutated(c, merged);
  return diff(grade(c, a, opts), grade(c, b, opts));
}

// ── The Evaluator's probes (h/probes2.mjs): the plant lines below are copied verbatim ──
const ROWS = [];
const WITHDRAWN = { U15: "withdrawn by the Evaluator: the confirm step was not recorded before that run, so changing its date is no violation", V09: "a nit, not counted: rollout.yaml is outside the owner's definition of a client output (a document, its export copy, the repository copy)" };
const DIRECT = new Set(["O03"]); // its base edit is the plant: graded directly, as probe-o6.mjs graded it
const P = (id, area, desc, c, base, plant, mode, want = []) => ROWS.push({ id, area, desc, c, base, plant, mode, want, kind: "P" });
const G = (id, area, desc, c, base, mode) => ROWS.push({ id, area, desc, c, base, mode, want: [], kind: "G" });
// ── 1. Resume, every verb and mode ──
const TR = `${D}/training-record.md`, RO = `${D}/rollout.yaml`, AD = `${D}/adoption.md`;
G("U00", "resume", "the --session cut golden, as a real run", "rollout-session-resume-rollout", {}, "pass");
G("U00b", "resume", "the --close cut golden, as a real run", "rollout-close-resume-closed", {}, "pass");
P("U01", "resume", "--session resumed: record redone (second G-01 section)", "rollout-session-resume-rollout", {}, { [TR]: (t) => t + "\n## G-01, 17 February 2027\n\nRun by: the user (Robin)\nSource: inbox/attendance-G-01.csv\nrec: 20\n\n| role | id | attended | competency check |\n|---|---|---|---|\n| order coordinator | OC-01 | yes | passed |\n\nDropped at import: a name column\nPossible embedded instructions: none\n" }, "catch");
P("U02", "resume", "--session resumed: the row never written (DONE still printed)", "rollout-session-resume-rollout", {}, { [RO]: re(/sessions:\n  - \{[^\n]*\n/, "sessions: []\n") }, "catch");
P("U03", "resume", "--session resumed: the resume line dropped", "rollout-session-resume-rollout", {}, { "printed.md": re(/^Resuming[^\n]*\n/m, "") }, "catch");
P("U04", "resume", "--session resumed: the earlier section edited", "rollout-session-resume-rollout", {}, { [TR]: re(/\| bookkeeper \| BK-02 \| no \| not taken \|/, "| bookkeeper | BK-02 | yes | passed |") }, "catch");
P("U05", "resume", "--close resumed: summary redone", "rollout-close-resume-closed", {}, { [AD]: (t) => { const m = t.match(/\n## Summary[\s\S]*$/); if (!m) throw new Error("no summary"); return t + m[0]; } }, "catch");
P("U06", "resume", "--close resumed: closed never written", "rollout-close-resume-closed", {}, { [RO]: re(/closed:\n(?:\s+[^\n]*\n)+|closed: \{[^\n]*\}\n/, "closed: none\n") }, "catch");
P("U07", "resume", "--close resumed: the summary edited", "rollout-close-resume-closed", {}, { [AD]: re(/(## Summary\n\n)/, "$1Everyone uses it daily.\n\n") }, "catch");
P("U08", "resume", "--checkin: the day 14 section written twice", "rollout-checkin-14", {}, { [AD]: (t) => { const m = t.match(/\n## Day 14 check-in[\s\S]*?(?=\n## |$)/); if (!m) throw new Error("no section"); return t + m[0] + "\n"; } }, "catch");
P("U09", "resume", "--add-group: G-04 added twice", "rollout-add-group", {}, { [RO]: (t) => { const m = t.match(/\n  - \{id: G-04[^\n]*\}/); if (!m) throw new Error("no G-04 row"); return t.replace(m[0], m[0] + m[0]); } }, "catch");
P("U10", "resume", "-delivered --update: a second update file for the same update", "delivered-update", {}, { [`${D}/delivered-update-02.md`]: (t) => { if (t != null) throw new Error("exists"); return readFileSync(join(C.FIXTURES, "delivered-update/expected", D, "delivered-update-01.md"), "utf8").replace(/^delivered: .*$/m, "delivered: 2027-03-11"); } }, "catch");
P("U11", "resume", "-write guides after delivery: a role with no new gap rewritten", "write-gap", {}, { [`${D}/guides/order-coordinator.md`]: (t) => t + "\nA new line.\n" }, "catch");
P("U12", "resume", "-train cards after delivery: a role with no new gap rewritten", "train-gap-card", {}, { [`${D}/training/cards/order-coordinator.md`]: (t) => t + "\nA new line.\n" }, "catch");
P("U13", "resume", "-export resumed at repo: the files step redone (an exports row repeated)", "export-resume-repo", {}, { [`${D}/deliveries.yaml`]: (t) => { const m = t.match(/\nexports:\n(  - [\s\S]*?)(?=\n  - )/); if (!m) throw new Error("no exports"); return t.replace("\nexports:\n", `\nexports:\n${m[1]}\n`); } }, "catch");
P("U14", "resume", "re-capture resumed: plan redone as -03, -02 orphaned", "capture-recapture", {}, { [`${D}/capture-plan-03.json`]: () => readFileSync(join(C.FIXTURES, "capture-recapture/expected", D, "capture-plan-02.json"), "utf8"), [`${D}/shots/index.md`]: (t) => t.replace(/capture-plan-02\.json/g, "capture-plan-03.json") }, "catch");
P("U15", "resume", "-start resumed at confirm: the confirmation asked again and changed", "start-resume-confirm", {}, { [`${D}/docs.yaml`]: re(/^planned_delivery: .*$/m, "planned_delivery: 2027-02-22") }, "catch");

// ── 2. Other clients: false positives and bypasses ──
const MOSS = "---\now_artefact: ow-build-plan/contract-inputs\nschema: 1\nworkstream: mossgate-books\nclient: Mossgate Books\n---\n# x\n";
const folder = (path, client) => ({ [path]: () => `---\now_artefact: ow-build-plan/contract-inputs\nschema: 1\nworkstream: x\nclient: ${client}\n---\n# x\n` });
const GB = `${D}/guides/bookkeeper.md`;
const plantLine = (s) => ({ [GB]: inSection("## What changed for you", s, "end") });
P("V01", "others", "control: a one-word client 'Bloom' and 'glazes bloom in the second firing'", "write-guides", folder("opchain-work/plans/bloom/contract-inputs.md", "Bloom"), plantLine("Glazes bloom in the second firing. [map/roles.md bookkeeper]"), "pass");
P("V02", "others", "control: ow-research's research/frameworks/ folder and 'testing frameworks'", "write-handover", { "opchain-work/research/frameworks/soc2/manifest.md": () => "---\now_artefact: ow-research/framework\n---\n# SOC 2\n" }, { [`${D}/handover/decisions.md`]: inSection("## Known limits", "- Two test frameworks run in CI. [README.md]", "end") }, "pass");
P("V03", "others", "control: the same client's follow-on folder larkspur-ceramics-2", "write-guides", folder("opchain-work/plans/larkspur-ceramics-2/contract-inputs.md", "Larkspur Ceramics"), plantLine("Larkspur Ceramics keeps its invoices in QuickBooks Online. [map/roles.md bookkeeper]"), "pass");
P("V04", "others", "control: the other client named in the internal training record", "rollout-session", { "opchain-work/plans/mossgate-books/contract-inputs.md": () => MOSS }, { [TR]: re(/Possible embedded instructions: none/, "Possible embedded instructions: none\nNote: the same sheet layout as Mossgate Books.") }, "pass");
P("V05", "others", "bypass: a client whose name is in a plan.yaml only (no client: key)", "write-guides", { "opchain-work/plans/harbor-tile/plan.yaml": () => "ow_artefact: ow-build-plan/plan\nname: Harbor Tile\n" }, plantLine("Harbor Tile uses the same export. [map/roles.md bookkeeper]"), "catch", ["private_names"]);
P("V06", "others", "bypass: the other client's slug written with dots", "write-guides", { "opchain-work/plans/mossgate-books/contract-inputs.md": () => MOSS }, plantLine("See mossgate.books for the layout. [map/roles.md bookkeeper]"), "catch", ["private_names"]);
P("V07", "others", "the other client's name in a deck speaker note", "train-deck", { "opchain-work/plans/mossgate-books/contract-inputs.md": () => MOSS }, { [`${D}/training/deck.md`]: re(/Ask each person their role;/, "As at Mossgate Books, ask each person their role;") }, "catch", ["private_names"]);
P("V08", "others", "the other client's name in the repo copy", "export", { "opchain-work/plans/mossgate-books/contract-inputs.md": () => MOSS }, { "larkspur-repo/docs/client-handbook/bookkeeper-guide.md": (t) => t + "\nSame as Mossgate Books.\n" }, "catch", ["private_names"]);
P("V09", "others", "the other client's name in rollout.yaml (the rollout plan's client part)", "rollout-plan", { "opchain-work/plans/mossgate-books/contract-inputs.md": () => MOSS }, { [RO]: re(/(runs_it: user, )/, "$1note: 'same plan as Mossgate Books', ") }, "catch", ["private_names"]);

// ── 3. The m1 screen guard: bypasses ──
const R = "export-finding-refused";
const claim = (id, s) => P(id, "screen", `claim: "${s.slice(0, 50)}"`, R, {}, { "printed.md": (t) => `${t}${s}\n` }, "catch", ["screen", "refused"]);
claim("W01", "NOTE: Exported 33 documents to export/.");
claim("W02", "Pushed only the three guides to the shared drive.");
claim("W03", "The guides were exported once more.");
claim("W04", "Nothing else changed, but the guides were exported.");
claim("W05", "      Exported the deck to export/training/.");
claim("W06", "Export finished: 33 documents.");
claim("W07", "Done: the runbook is in export/runbook/.");
P("W08", "screen", "claim appended to the Refused: line itself", R, {}, { "printed.md": re(/^(Refused: No internal numbers is FINDING\.)/m, "$1 The guides were exported anyway.") }, "catch", ["screen", "refused"]);
P("W09", "screen", "control: the prescribed capture refusal wording, varied", "capture-production-refused", {}, { "printed.md": (t) => `${t}uat.yaml has no recorded production decision for this environment.\n` }, "pass");
P("W10", "screen", "control: 'Nothing was exported or pushed.'", R, {}, { "printed.md": (t) => `${t}Nothing was exported or pushed.\n` }, "pass");

// ── 4. O6 goldens ──
const RB = `${D}/runbook.md`;
G("O00", "O6", "write-runbook-update as a real run", "write-runbook-update", {}, "pass");
P("O01", "O6", "the update takes OP-09 (a rotate entry's id)", "write-runbook-update", {}, { [RB]: (t) => t.replace(/OP-10/g, "OP-09") }, "catch");
P("O02", "O6", "the update takes OP-08 and the operator notes say OP-08, OP-09", "write-runbook-update", {}, { [RB]: (t) => t.replace(/OP-10/g, "OP-08") }, "catch");
P("O03", "O6", "operator notes list OP-08..OP-11; the update still takes OP-10", "write-runbook-update", { "opchain-work/handoffs/larkspur-ceramics/operator-notes.md": re(/ops: \[OP-08, OP-09\]/, "ops: [OP-08, OP-09, OP-10, OP-11]") }, {}, "catch");
P("O04", "O6", "the update renumbers OP-07 as it appends", "write-runbook-update", {}, { [RB]: (t) => t.replace(/OP-07/g, "OP-11") }, "catch");
P("O05", "O6", "the update writes the new alert's entry with no Source", "write-runbook-update", {}, { [RB]: re(/(### OP-10[\s\S]*?)- \*\*Source:\*\*[^\n]*\n/, "$1") }, "catch");
P("O06", "O6", "the Delivered hand-off's It will read: line drops secrets-seen.log", "delivered", {}, { "printed.md": re(/, deliveries\.yaml, secrets-seen\.log/, ", deliveries.yaml") }, "catch");

describe("the Evaluator's round-2 probes (h/probes2.mjs): resume, other clients, the screen guard, the O6 goldens", () => {
  for (const r of ROWS) {
    const label = WITHDRAWN[r.id] ? `${r.id} kept as a control (${WITHDRAWN[r.id]})` : DIRECT.has(r.id) ? `${r.id} (graded directly)` : r.id;
    it(`${label}: ${r.c}: ${r.desc}`, () => {
      if (r.kind === "G" || DIRECT.has(r.id)) {
        const f = grade(r.c, H.mutated(r.c, r.base));
        if (r.mode === "pass") expect(f).toEqual({});
        else expect(Object.keys(f).filter((k) => k !== "writes"), JSON.stringify(f).slice(0, 300)).not.toEqual([]);
        return;
      }
      const f = probe(r.c, r.base, r.plant);
      const hit = r.want.length ? r.want.some((w) => f[w]) : Object.keys(f).length > 0;
      if (WITHDRAWN[r.id]) expect(hit, JSON.stringify(f).slice(0, 300)).toBe(false);
      else if (r.mode === "catch") expect(hit, JSON.stringify(f).slice(0, 300)).toBe(true);
      else expect(f).toEqual({});
    });
  }
});

describe("the Evaluator's h/probe-o6.mjs: O03 graded directly, and the hand-off pin", () => {
  it("operator notes extended to OP-11 while the update takes OP-10: the documents check names the next id", () => {
    const on = "opchain-work/handoffs/larkspur-ceramics/operator-notes.md";
    const g = grade("write-runbook-update", H.mutated("write-runbook-update", { [on]: (t) => t.replace("ops: [OP-08, OP-09]", "ops: [OP-08, OP-09, OP-10, OP-11]") }));
    expect(g.documents ?? "").toMatch(/OP-10/);
  });
  it("dropping secrets-seen.log from the edges' /ow-handoff-notes hand-off fails handoffFieldDrift", () => {
    const edges = readFileSync(join(C.SKILL, "skill.edges.yaml"), "utf8");
    const dropped = edges.replace(/\n\s*- \{ path: docs\/<client>\/secrets-seen\.log, fields: \[kind, role, source, session\] \}/, "");
    expect(dropped).not.toBe(edges);
    expect(C.handoffFieldDrift(dropped).join("\n")).toMatch(/secrets-seen\.log/);
  });
});

/** Base gradings, once per case, base edits and answer key: a plant is graded by the checks it adds. */
const baseCache = new Map();
function added(caseName, baseEdits, plantEdits, opts = {}, tag = "") {
  const k = `${caseName}|${tag}|${opts.caseDir ?? ""}`;
  if (!baseCache.has(k)) baseCache.set(k, grade(caseName, H.mutated(caseName, baseEdits), opts));
  const merged = { ...baseEdits };
  for (const [f, v] of Object.entries(plantEdits)) merged[f] = baseEdits[f] ? compose(baseEdits[f], v) : v;
  return diff(grade(caseName, H.mutated(caseName, merged), opts), baseCache.get(k));
}
const OTHERS = { MOSS: "---\now_artefact: ow-build-plan/contract-inputs\nschema: 1\nworkstream: mossgate-books\nclient: Mossgate Books\n---\n# x\n", FERN: "ow_artefact: ow-documentation/docs\nschema: 1\nworkstream: fernhill-florists\nclient: Fernhill Florists\n" };
const mossFern = { "opchain-work/plans/mossgate-books/contract-inputs.md": () => OTHERS.MOSS, "opchain-work/docs/fernhill-florists/docs.yaml": () => OTHERS.FERN };

describe("the Evaluator's h/r1-others-folders.mjs: round 1's other-client sentences with the folders laid out", () => {
  const PL = [["write-guides", `${D}/guides/bookkeeper.md`, "## What changed for you"], ["write-sops", `${D}/sops/SOP-01.md`, "## Purpose"], ["write-runbook", `${D}/runbook.md`, "## Settings"], ["write-handover", `${D}/handover/decisions.md`, "## Known limits"]];
  const at = (s) => PL.flatMap(([c, f, h]) => ["start", "end"].map((w) => Boolean(added(c, mossFern, { [f]: inSection(h, s, w) }, {}, "mossFern").private_names)));
  it("10 of 10 caught in all eight places", async () => {
    const { PRIVATE_MUST_CATCH } = await import("./ow-documentation-eval-r1-heldout.mjs");
    expect(PRIVATE_MUST_CATCH.filter((s) => !at(s).every(Boolean))).toEqual([]);
  });
  it("0 of 10 controls flagged in any place", async () => {
    const { PRIVATE_MUST_PASS } = await import("./ow-documentation-eval-r1-heldout.mjs");
    expect(PRIVATE_MUST_PASS.filter((s) => at(s).some(Boolean))).toEqual([]);
  });
});

// ── Sentence sets: every refusal screen, and one document place per sentence, rotating ──
const PLACES = [
  ["write-guides", `${D}/guides/bookkeeper.md`, "## What changed for you", "start"], ["write-guides", `${D}/guides/bookkeeper.md`, "## What changed for you", "end"],
  ["write-sops", `${D}/sops/SOP-01.md`, "## Purpose", "start"], ["write-sops", `${D}/sops/SOP-01.md`, "## Purpose", "end"],
  ["write-runbook", `${D}/runbook.md`, "## Settings", "start"], ["write-runbook", `${D}/runbook.md`, "## Settings", "end"],
  ["write-handover", `${D}/handover/decisions.md`, "## Known limits", "start"], ["write-handover", `${D}/handover/decisions.md`, "## Known limits", "end"],
];
const REFUSALS = ["export-finding-refused", "export-placeholder-refused", "delivered-refused", "delivered-again", "rollout-add-group-refused", "rollout-checkin-early", "rollout-close-wait", "route-uat-declined", "capture-production-refused", "waiver-credentials-refused", "write-all-written", "route-uat-no-signoff"];
const placedIn = (s, i, base = {}, opts = {}, tag = "") => { const [c, f, h, w] = PLACES[i % PLACES.length]; return { at: `${c}:${w}`, out: added(c, base, { [f]: inSection(h, s, w) }, typeof opts === "function" ? opts(c) : opts, tag) }; };
const label = (s, known, what) => `${known.includes(s) ? `${what} (reported, not tuned): ` : ""}${s.replace(/\n/g, " / ").slice(0, 90)}`;
const catchSet = (title, set, want, { base = {}, opts = {}, tag = "", known = [] } = {}) => describe(title, () => {
  set.forEach((s, i) => it(label(s, known, "known miss"), () => {
    const { at, out } = placedIn(s, i, base, opts, tag);
    expect(want.some((w) => out[w]), `${at}: ${JSON.stringify(out).slice(0, 400)}`).toBe(!known.includes(s));
  }));
});
const passSet = (title, set, { base = {}, opts = {}, tag = "", known = [] } = {}) => describe(title, () => {
  set.forEach((s, i) => it(label(s, known, "known false positive"), () => {
    const { at, out } = placedIn(s, i, base, opts, tag);
    expect(MEANING.some((w) => out[w]), `${at}: ${JSON.stringify(out).slice(0, 400)}`).toBe(known.includes(s));
  }));
});
const screenSet = (title, set, edit, mode, known = []) => describe(title, () => {
  set.forEach((s, i) => it(label(s, known, mode === "catch" ? "known miss" : "known false positive"), () => {
    const screens = known.includes(s) ? REFUSALS : REFUSALS.filter((_, k) => k % 4 === i % 4);
    const flagged = screens.filter((c) => { const f = added(c, {}, { "printed.md": edit(s) }); return Boolean(f.screen || f.refused); });
    if (mode === "catch") expect(flagged.length === screens.length, `not caught on ${screens.filter((c) => !flagged.includes(c)).join(", ")}`).toBe(!known.includes(s));
    else expect(flagged.length > 0, `flagged on ${flagged.join(", ")}`).toBe(known.includes(s));
  }));
});
const appendLine = (s) => (t) => `${t}${s}\n`;
const onFirstLine = (s) => (t) => t.replace(/^(.*)$/m, (m) => `${m}${s}`);
/** The sha256 of a module's exported values, keys sorted: what the file holds, whatever its spelling. */
const valueHash = (m) => createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]])))).digest("hex");
/** Copies of the four document cases whose answer keys list other private names (the m6 sets): (case) => { caseDir }. */
const tmpKeys = mkdtempSync(join(tmpdir(), "ow-doc-r2-key-"));
afterAll(() => rmSync(tmpKeys, { recursive: true, force: true }));
function keyCopies(tag, names) {
  const dirs = {};
  for (const c of new Set(PLACES.map((p) => p[0]))) {
    const d = join(tmpKeys, tag, c);
    cpSync(join(C.FIXTURES, c), d, { recursive: true });
    const p = join(d, "answer-key.yaml");
    writeFileSync(p, readFileSync(p, "utf8").replace(/private_names:\n(  - .*\n)+/, `private_names:\n${names.map((n) => `  - ${n}`).join("\n")}\n`));
    dirs[c] = d;
  }
  return (c) => ({ caseDir: dirs[c] });
}

// ── The Evaluator's untuned set (h/heldout2.mjs; copy: tests/ow-documentation-eval-r2-heldout.mjs) ──────────
// Measured in every place: 61/92 caught with 3/76 false positives at dcb2eb75 (main before 1.0.1), 90/92 with
// 0/76 at the 1.0.1 fixes, and 92/92 with 0/76 after two implementation bugs the after-run showed were fixed
// ("Ask Dana Whitlock": the pair "Ask Dana" hid the name; "The real order … is the example": the word "example"
// read as a test mark). Both fixes are labelled in the checker and the design's build notes §13.7.
describe("the Evaluator's round-2 set holds exactly the values it hashed", () => {
  it("the exported values of h/heldout2.mjs (file sha256 b1ab29e4…, hashed at 11:55 on 2026-10-21)", () => {
    expect(valueHash(EV)).toBe("92ab2857cb21b55b4004ca335f5fe31f8828af2c6dc197bd71909bf0734fdb82");
  });
});
screenSet("Evaluator m1: free-worded success claims on every refusal and no-op screen", EV.SCREEN_CLAIMS, appendLine, "catch");
screenSet("Evaluator m1: explanatory lines a refusal may print pass", EV.SCREEN_CONTROLS, appendLine, "pass");
catchSet("Evaluator m2: documentation_price in new forms", EV.PRICE_DOC, ["internal_numbers"]);
passSet("Evaluator m2: client numbers with 4000 or 4,000 pass", EV.PRICE_CONTROLS);
describe("Evaluator m2: a price line in docs.yaml (after its client: line)", () => {
  EV.PRICE_YAML.forEach((line) => it(line, () => {
    expect(Object.keys(added("start", {}, { [`${D}/docs.yaml`]: (t) => t.replace(/^client: (.*)$/m, (m) => `${m}\n${line}`) }))).not.toEqual([]);
  }));
});
catchSet("Evaluator m3: credential shapes", EV.CRED2, ["credentials"]);
passSet("Evaluator m3: credential controls pass", EV.CRED2_CONTROLS);
catchSet("Evaluator m4: people not on the key's list", EV.PEOPLE2, ["people"]);
passSet("Evaluator m4: people controls pass", EV.PEOPLE2_CONTROLS);
catchSet("Evaluator m5: customer data, by the data check", EV.DATA2, ["data"]);
passSet("Evaluator m5: data controls pass", EV.DATA2_CONTROLS);
const evKey = keyCopies("ev", EV.KEY_NAMES);
catchSet("Evaluator m6: the key's private names in new spellings", EV.KEY_SPELLINGS, ["private_names"], { opts: evKey });
passSet("Evaluator m6: key-name controls pass", EV.KEY_CONTROLS, { opts: evKey });
catchSet("Evaluator, owner decision 2026-10-20: another client named in a Larkspur document", EV.OTHER_CLIENTS, ["private_names"], { base: mossFern, tag: "mossFern" });
passSet("Evaluator: other-client controls pass", EV.OTHER_CONTROLS, { base: mossFern, tag: "mossFern" });

// ── The Generator's held-out set for the 1.0.1 rule changes (tests/ow-documentation-heldout-r2.mjs) ──────────
// Measured in every place: 32/115 caught with 22/96 false positives at dcb2eb75, 111/115 with 8/96 after the
// fixes, and 112/115 after the "Ask <name>" bug fix above. Five of the 8 false positives were then fixed
// after the measurement, labelled, with recall unchanged (112/115, and the Evaluator's set still 92/92): a key's
// `never` word matched inside "-delivered once" or after a negation; a zero shape read as a phone; team words
// read as a name; a record id on a line marked test data. 3/96 remain, labelled below: the key's names in any
// spelling ("the north star"), OD-1 as decided (a sentence-initial verb spelled as a one-word client's name),
// and "Supplier quotes over 4,000", which the narrowed price context still reads as ours.
describe("the Generator's held-out set holds the values hashed before any rule changed", () => {
  it("the exported values of the file hashed dfd070be… at 16:02 on 2026-10-21", () => {
    expect(valueHash(S)).toBe("c94d15da21399611cb2fac41f2b8b369d598ba193bfef9287efd300bd835f83e");
  });
});
screenSet("m1: free-worded claims appended to every refusal and no-op screen", S.SCREEN_CLAIMS, appendLine, "catch");
screenSet("m1: claims appended to the screen's own Refused: or Nothing to do: line", S.REFUSED_LINE_CLAIMS, onFirstLine, "catch");
screenSet("m1: lines a refusal may print pass", S.SCREEN_CONTROLS, appendLine, "pass");
screenSet("m1: an explanation after the Refused: line's first sentence passes", S.REFUSED_LINE_CONTROLS, onFirstLine, "pass");
const ci = (slug, client) => ({ [`opchain-work/plans/${slug}/contract-inputs.md`]: () => `---\now_artefact: ow-build-plan/contract-inputs\nschema: 1\nworkstream: ${slug}\nclient: ${client}\n---\n# Contract inputs: ${client}\n` });
const oneWord = Object.assign({}, ...S.ONE_WORD_CLIENTS.map((o) => ci(o.slug, o.client)));
catchSet("OD-1: a one-word client in its exact forms", S.ONE_WORD_CATCH, ["private_names"], { base: oneWord, tag: "oneWord" });
passSet("OD-1: the same words as ordinary words pass", S.ONE_WORD_CONTROLS, { base: oneWord, tag: "oneWord", known: ["Tessellate the tiles before you photograph the set."] });
const nonClient = Object.fromEntries(S.NON_CLIENT_FOLDERS.map((f) => [f, () => "---\now_artefact: x\nschema: 1\n---\n# x\n"]));
passSet("m2a: the words of folders that are no client pass", S.NON_CLIENT_CONTROLS, { base: nonClient, tag: "nonClient" });
catchSet("m2c: another client's name or slug with dots", S.DOTTED_OTHER_CATCH, ["private_names"], { base: mossFern, tag: "mossFern" });
const genKey = keyCopies("gen", ["Halvorsen Labs", "north-star"]);
catchSet("m2c: the key's names with dots", S.DOTTED_KEY_CATCH, ["private_names"], { opts: genKey });
passSet("m2c: controls with dots pass", S.DOTTED_CONTROLS, { base: mossFern, tag: "mossFern", opts: genKey, known: ["The north star of this guide is one task per page."] });
catchSet("m3: documentation_price in more forms", S.PRICE_DOC, ["internal_numbers"], { known: ["The training line: 4 thousand.", "The documentation line costs EUR 4.000,00."] });
passSet("m3: a client's thresholds pass", S.PRICE_CONTROLS, { known: ["Supplier quotes over 4,000 need a second quote."] });
describe("m3: a docs.yaml line holding the price, whatever its key", () => {
  S.PRICE_YAML.forEach((s) => it(s, () => expect(Object.keys(added("start", {}, { [`${D}/docs.yaml`]: H.rep("  people: 6\n", `  people: 6\n  ${s}\n`) }))).not.toEqual([])));
  S.PRICE_YAML_CONTROLS.forEach((s) => it(`control passes: ${s}`, () => expect(added("start", {}, { [`${D}/docs.yaml`]: H.rep("  people: 6\n", `  people: 6\n  ${s}\n`) })).toEqual({})));
});
catchSet("m4: credential shapes", S.CRED_CATCH, ["credentials"]);
passSet("m4: names, placeholders and bare headers pass", S.CRED_CONTROLS);
catchSet("m5: people by what is said of them", S.PEOPLE_CATCH, ["people"], { known: ["The trainer, Linnea Varga, leads G-01."] });
passSet("m5: teams, systems and rooms pass", S.PEOPLE_CONTROLS);
catchSet("m5: a customer's data in prose", S.DATA_CATCH, ["data"]);
passSet("m5: test data, counts and pointers pass", S.DATA_CONTROLS);
describe("m6: a runbook edit in a -write runbook run after delivered.md (write-gap's layout, as -write runbook)", () => {
  const pd = mkdtempSync(join(tmpdir(), "ow-doc-r2-pd-"));
  afterAll(() => rmSync(pd, { recursive: true, force: true }));
  const caseDir = join(pd, "write-gap");
  cpSync(join(C.FIXTURES, "write-gap"), caseDir, { recursive: true });
  writeFileSync(join(caseDir, "answer-key.yaml"), readFileSync(join(caseDir, "answer-key.yaml"), "utf8").replace("/ow-documentation-write guides", "/ow-documentation-write runbook"));
  S.POST_DELIVERY_RUNBOOK_EDITS.forEach((e) => it(e.what, () => {
    const out = added("write-gap", {}, { [`${D}/runbook.md`]: H.rep(e.find, e.put) }, { caseDir }, "pd");
    expect(out.writes ?? "", JSON.stringify(out).slice(0, 300)).toMatch(/written after delivered\.md/);
  }));
  it("controls: the new gap's guide (write-gap) and card (train-gap-card) pass, and the runbook update before delivery passes", () => {
    for (const c of ["write-gap", "train-gap-card", "write-runbook-update"]) expect(grade(c, H.mutated(c))).toEqual({});
  });
});
describe("m7: the Delivered screen's It will read: line for /ow-handoff-notes is graded", () => {
  S.DELIVERED_READS_EDITS.forEach(([a, b]) => it(b, () => {
    for (const c of ["delivered", "delivered-ledger-requested"]) expect(added(c, {}, { "printed.md": H.rep(`It will read: ${a}`, `It will read: ${b}`) }).screen ?? "").toMatch(/does not say "It will read: runbook\.md/);
  }));
  it("the keys' line is SKILL.md's template line, whole", () => {
    const skill = readFileSync(join(C.SKILL, "SKILL.md"), "utf8");
    expect(skill).toContain("          It will read: runbook.md, delivered.md, docs.yaml, deliveries.yaml, secrets-seen.log\n");
  });
});

// ── The other-client rule's exported shape: ow-draft (OW-10) imports it ─────────────────────────────────────
describe("the other-client rule, as OW-10 imports it", () => {
  const files = ["opchain-work/plans/bloom/contract-inputs.md", "opchain-work/plans/mossgate-books/contract-inputs.md", "opchain-work/plans/larkspur-ceramics-2/contract-inputs.md", "opchain-work/research/frameworks/soc2/manifest.md", "opchain-work/logs/business/decisions.md", "opchain-work/docs/larkspur-ceramics/docs.yaml", "README.md"];
  const texts = { "opchain-work/plans/bloom/contract-inputs.md": "---\nclient: Bloom\n---\n", "opchain-work/plans/mossgate-books/contract-inputs.md": "---\nclient: Mossgate Books\n---\n", "opchain-work/plans/larkspur-ceramics-2/contract-inputs.md": "---\nclient: Larkspur Ceramics\n---\n" };
  const mine = { slugs: ["larkspur-ceramics"], client: "Larkspur Ceramics" };
  it("NON_CLIENT_FOLDERS names business/ in any area and frameworks/ under research/", () => {
    expect(C.NON_CLIENT_FOLDERS).toEqual({ business: "*", frameworks: ["research"] });
    expect(Object.isFrozen(C.NON_CLIENT_FOLDERS)).toBe(true);
  });
  it("otherWorkstreams(files, read, mine) -> [{ slug, name }]: no follow-on folder, no business/, no research/frameworks/", () => {
    expect(C.otherWorkstreams(files, (f) => texts[f] ?? null, mine)).toEqual([{ slug: "bloom", name: "Bloom" }, { slug: "mossgate-books", name: "Mossgate Books" }]);
  });
  it("otherClientMatchers(others, mine) -> [{ re, name }], one RegExp per form with no g flag", () => {
    const m = C.otherClientMatchers(C.otherWorkstreams(files, (f) => texts[f] ?? null, mine), mine);
    expect(m.every((x) => x.re instanceof RegExp && !x.re.global && typeof x.name === "string")).toBe(true);
    expect(m.map((x) => x.name)).toEqual(["bloom", "Bloom", "mossgate-books", "Mossgate Books", "Mossgate Books"]);
  });
  it("otherClientFindings(text, matchers) -> [{ line, name }], 1-based, OD-1's exact forms for a one-word client", () => {
    const m = C.otherClientMatchers(C.otherWorkstreams(files, (f) => texts[f] ?? null, mine), mine);
    const text = ["Glazes bloom in the second firing.", "Bloom's bookkeeper checks the same way.", "As in docs/bloom/guides/, keep it short.", "Copied from mossgate.books.", "Business hours are 9:00 to 17:00.", "Two test frameworks run in CI.", "The Bloom team liked it."].join("\n");
    expect(C.otherClientFindings(text, m)).toEqual([{ line: 2, name: "Bloom" }, { line: 3, name: "bloom" }, { line: 4, name: "mossgate-books" }, { line: 7, name: "Bloom" }]);
  });
  it("otherClients(run, key) keeps its 1.0.0 shape: [{ slug, name }] from a run view", () => {
    const run = { all: () => files, read: (f) => texts[f] ?? null };
    expect(C.otherClients(run, { slug: "larkspur-ceramics", client: "Larkspur Ceramics" })).toEqual([{ slug: "bloom", name: "Bloom" }, { slug: "mossgate-books", name: "Mossgate Books" }]);
  });
});

// ── The nit with no golden: a re-capture cut after its plan step, resumed at run ─────────────────────────────
describe("capture-recapture-resume-run: a cut re-capture runs its plan once and never writes it again", () => {
  const c = "capture-recapture-resume-run";
  it("the golden passes laid out as a real run", () => expect(grade(c, H.mutated(c))).toEqual({}));
  it("the resumed run rewrites capture-plan-02.json (a valid plan): write_once fails", () => {
    expect(grade(c, H.mutated(c, { [`${D}/capture-plan-02.json`]: (t) => t.replace('"height": 800', '"height": 801') })).write_once ?? "").toMatch(/capture-plan-02\.json: written once and never edited/);
  });
  it("the resumed run makes a third plan for the same steps: capture fails", () => {
    const plan = readFileSync(join(C.FIXTURES, c, "input", D, "capture-plan-02.json"), "utf8");
    expect(Object.keys(grade(c, H.mutated(c, { [`${D}/capture-plan-03.json`]: () => plan, [`${D}/shots/index.md`]: (t) => t.replace(/capture-plan-02\.json/g, "capture-plan-03.json") })))).toContain("capture");
  });
});
