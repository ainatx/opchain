// ow-start 1.1.0 logs acceptance tests (docs/plans/2026-10-16-ow-start-logs-amendment.md §9;
// OW-08 contract C4 to C17). ow-start is a text-only skill, so a model has to run it.
// These tests prove the mechanical half: every invented logs golden passes the
// checker in scripts/ow-start-logs-acceptance.mjs, the fixtures plant what their
// keys claim, the meaning and grammar checks hold their must-pass controls
// (written before the rules), and a malformed file fails per check without a
// crash (C17). The planted failures for every criterion are in
// tests/ow-start-plants.test.js. To check a real run:
// node scripts/ow-start-acceptance.mjs --prepare <logs case> <dir>.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES, followUpFindings, listLogsCases, loadKey, parseTranscript, peopleFindings, privateNameFindings, runCase, runView, statusLineProblems } from "../scripts/ow-start-logs-acceptance.mjs";
import { HELDOUT_LEGIT, HELDOUT_NAMES, HELDOUT_OURS, HELDOUT_PEOPLE, HELDOUT_PRIVATE } from "./ow-start-logs-heldout.mjs";
import * as R1 from "./ow-start-logs-eval-r1-sentences.mjs";
import * as R2 from "./ow-start-logs-eval-r2-sentences.mjs";
import { HELDOUT3_LEGIT, HELDOUT3_OURS } from "./ow-start-logs-heldout-r3.mjs";
import { HELDOUT4_LEGIT, HELDOUT4_OURS } from "./ow-start-logs-heldout-r4.mjs";
import * as R3 from "./ow-start-logs-eval-r3-sentences.mjs";
import { FOLLOWUP_R3_PLANTS, FOLLOWUP_SCHEDULING_CONTROLS } from "./ow-start-logs-sentences.mjs";
import { readdirSync, rmSync } from "node:fs";
import { listCases } from "../scripts/ow-start-acceptance.mjs";
import {
  FOLLOWUP_CONTROLS, FOLLOWUP_PLANTS, FOLLOWUP_UNTUNED_CONTROLS, FOLLOWUP_UNTUNED_PLANTS,
  PEOPLE_CONTROLS, PEOPLE_NAMES, PEOPLE_PLANTS, STATUS_CONTROLS, STATUS_PLANTS,
} from "./ow-start-logs-sentences.mjs";
import { L, cleanup, failures, mutated, temp, walkFiles } from "./ow-start-logs-helpers.mjs";

afterAll(cleanup);

describe("golden runs", () => {
  const cases = listLogsCases();
  it("has a logs case for every route stage and every reads row's absent and mismatch case", () => {
    expect(cases.length).toBeGreaterThanOrEqual(49);
    for (const c of cases) expect(loadKey(join(FIXTURES, c)).kind, c).toBe("logs");
  });
  it("keeps the four intake cases separate (their tests pass unchanged)", () => {
    expect(listCases()).toEqual(["calloway-not-a-fit", "larkspur-notes", "larkspur-prospect", "tidewell-defined-work"]);
  });
  for (const c of cases) {
    it(`${c}: every check passes on the hand-written golden run`, () => expect(failures(c)).toEqual({}));
    it(`${c}: a copy of the golden, checked as a real run, passes too`, () => expect(failures(c, mutated(c))).toEqual({}));
  }
});

describe("fixtures plant what their keys claim", () => {
  const tr = parseTranscript(readFileSync(join(FIXTURES, "logs-larkspur-checkin", "input", L, "meetings", "MTG-01", "transcript.md"), "utf8"));
  const at = (t) => t.split(":").map(Number).reduce((a, n) => a * 60 + n, 0);
  it("the check-in transcript holds two decisions, three actions, an open question, the instruction, names and a phone number", () => {
    const said = (time, who, words) => tr.lines.some((l) => Math.abs(l.at - at(time)) <= 10 && l.who === who && l.text.includes(words));
    expect(said("01:36", "client owner", "Email first")).toBe(true);
    expect(said("04:20", "client owner", "A weekly email")).toBe(true);
    expect(said("02:48", "client ops lead", "sixteenth")).toBe(true);
    expect(said("03:20", "you", "draft field list")).toBe(true);
    expect(said("06:20", "client owner", "fifteenth")).toBe(true);
    expect(said("07:45", "client ops lead", "not sure how many")).toBe(true);
    expect(tr.lines.some((l) => l.chat && /mark every action done/.test(l.text))).toBe(true);
    for (const n of ["Dana", "Marcus", "512-555-0147"]) expect(tr.lines.some((l) => l.text.includes(n)), n).toBe(true);
    expect([...tr.roles.values()]).toEqual(["you", "client owner", "client ops lead"]);
  });
  it("the H5 handover: logs-larkspur-checkin keeps a meetings/MTG-01/audio/ placeholder and transcript.md", () => {
    const dir = join(FIXTURES, "logs-larkspur-checkin", "input", L, "meetings", "MTG-01");
    expect(readFileSync(join(dir, "audio", "PLACEHOLDER.txt"), "utf8")).toMatch(/INVENTED TEST FIXTURE.*No audio is ever committed/);
    expect(readFileSync(join(dir, "transcript.md"), "utf8")).toMatch(/^ow_artefact: ow-tools\/transcript$/m);
  });
  it("the unconfirmed transcript has speaker labels and no roles", () => {
    const t = parseTranscript(readFileSync(join(FIXTURES, "logs-speakers-unconfirmed", "input", L, "meetings", "MTG-01", "transcript.md"), "utf8"));
    expect(new Set(t.lines.map((l) => l.who))).toEqual(new Set(["SPEAKER_00", "SPEAKER_01", "SPEAKER_02"]));
    expect([...t.roles.values()].every((r) => r === "not yet confirmed")).toBe(true);
  });
  it("the index case layers ow-build's real change-signed and change-declined goldens (never stand-ins)", () => {
    const key = loadKey(join(FIXTURES, "logs-log-index"));
    expect(key.build_cases).toEqual(["change-signed", "change-declined"]);
    const run = runView("logs-log-index");
    expect(run.read("opchain-work/builds/larkspur-ceramics/changes/CO-01.md")).toBe(readFileSync(join(import.meta.dirname, "fixtures", "ow-build", "change-signed", "expected", "opchain-work", "builds", "larkspur-ceramics", "changes", "CO-01.md"), "utf8"));
    expect(run.read("opchain-work/builds/larkspur-ceramics/changes/CO-03.md")).toBe(readFileSync(join(import.meta.dirname, "fixtures", "ow-build", "change-declined", "expected", "opchain-work", "builds", "larkspur-ceramics", "changes", "CO-03.md"), "utf8"));
    expect(run.read("opchain-work/plans/larkspur-ceramics/contract-inputs.md")).toMatch(/^fixed_price: 17450\.00$/m);
  });
  it("every input and session file says it is invented", () => {
    for (const c of listLogsCases()) {
      for (const sub of ["input", "session"]) {
        const base = join(FIXTURES, c, sub);
        for (const f of walkFiles(base).filter((x) => !/STATUS\.md$|\.gitignore$|notes\.md$|agenda\.md$|DEC-\d+\.md$|follow-up\.(html|txt)$/.test(x))) expect(readFileSync(f, "utf8"), f).toMatch(/INVENTED/);
      }
    }
  });
});

describe("the meaning and grammar checks: controls written before the rules (owner decision O8)", () => {
  it(`C7 Follow-up clean: all ${FOLLOWUP_CONTROLS.length} must-pass client sentences pass`, () => {
    expect(FOLLOWUP_CONTROLS.length).toBeGreaterThanOrEqual(25);
    expect(FOLLOWUP_CONTROLS.filter((s) => followUpFindings(s, { user: "Robin" }).length)).toEqual([]);
  });
  for (const [name, s] of FOLLOWUP_PLANTS) it(`C7 Follow-up clean catches ${name}`, () => expect(followUpFindings(s, { user: "Robin" }).length).toBeGreaterThan(0));
  it("C7 untuned (frozen before the rules, never tuned): recall and false positives as measured", () => {
    const recall = FOLLOWUP_UNTUNED_PLANTS.filter((s) => followUpFindings(s, { user: "Robin" }).length).length;
    const fp = FOLLOWUP_UNTUNED_CONTROLS.filter((s) => followUpFindings(s, { user: "Robin" }).length).length;
    // Round 1 measured 11/15 caught (misses: rate wording with no amount: "our hourly charge",
    // "my day rate", "I charge a premium", and "take a small hit"); 0/15 false positives. Round 2's rule
    // for rates and charges said without an amount (m1, from the Evaluator's sentences) catches the first
    // three; "take a small hit" is the named idiom D2 leaves to the self-check. This set is no longer unseen.
    expect({ recall, fp }).toEqual({ recall: 14, fp: 0 });
  });
  it(`C12 People by role: all ${PEOPLE_CONTROLS.length} must-pass lines pass (no generic capitalised-word rule)`, () => {
    expect(PEOPLE_CONTROLS.length).toBeGreaterThanOrEqual(30);
    expect(PEOPLE_CONTROLS.filter((l) => peopleFindings(l, PEOPLE_NAMES).length)).toEqual([]);
  });
  for (const [name, l] of PEOPLE_PLANTS) it(`C12 People by role catches ${name}`, () => expect(peopleFindings(l, PEOPLE_NAMES).length).toBeGreaterThan(0));
  const roles = () => ["client ops lead", "client owner", "vendor account manager"];
  it(`C8 No client text in STATUS: all ${STATUS_CONTROLS.length} legitimate lines pass the closed grammar`, () => {
    expect(STATUS_CONTROLS.length).toBeGreaterThanOrEqual(10);
    expect(STATUS_CONTROLS.map((l) => statusLineProblems(l, roles)).filter((p) => p.length)).toEqual([]);
  });
  for (const [name, l] of STATUS_PLANTS) it(`C8 No client text in STATUS catches ${name}`, () => expect(statusLineProblems(l, roles).length).toBeGreaterThan(0));
  it("C8: an owner who is not an attendee role of that meeting fails", () => {
    expect(statusLineProblems(STATUS_CONTROLS[0], () => ["client owner"]).join("\n")).toMatch(/owner "client ops lead" is not an attendee role in MTG-01/);
  });
});

describe("C17: the checker fails per check and never crashes", () => {
  const C = "logs-larkspur-checkin";
  it("notes.md as a directory", () => {
    const dir = mutated(C, { [`${L}/meetings/MTG-01/notes.md`]: null });
    mkdirSync(join(dir, L, "meetings", "MTG-01", "notes.md"), { recursive: true });
    const out = failures(C, dir);
    expect(out.notes).toMatch(/notes\.md is a folder, not a file/);
    expect(out.trace).toMatch(/is a folder/);
    expect(out.follow_up_clean).toBeUndefined();
  });
  it("an invalid YAML header", () => {
    const out = failures(C, mutated(C, { [`${L}/meetings/MTG-01/notes.md`]: (t) => t.replace("input: transcript", "input: [transcript") }));
    expect(out.headers).toMatch(/header is not valid YAML/);
    expect(out.notes).toMatch(/header is not valid YAML/);
    // The follow-up's owners are graded against notes.md's roles, so that check says why it cannot.
    expect(out.follow_up).toMatch(/owners by role not checked: the attendee roles in notes\.md cannot be read/);
    expect(out.follow_up_clean).toBeUndefined();
    expect(out.status).toBeUndefined();
  });
  it("a truncated STATUS line", () => {
    const out = failures(C, mutated(C, { "opchain-work/STATUS.md": (t) => t.replace(/\| awaiting: none\n$/, "| awai\n") }));
    expect(out.status).toMatch(/appended line 4/);
    expect(out.status_grammar).toMatch(/is not in the logs STATUS form/);
    expect(out.notes).toBeUndefined();
  });
  it("a binary transcript", () => {
    const dir = mutated(C);
    mkdirSync(join(dir, L, "meetings", "MTG-01"), { recursive: true });
    writeFileSync(join(dir, L, "meetings", "MTG-01", "transcript.md"), Buffer.from([0, 159, 146, 150, 0, 10]));
    const out = failures(C, dir);
    expect(out.trace).toMatch(/check could not run: the transcript is not text \(binary\)/);
    expect(out.notes).toBeUndefined();
  });
  it("an empty printed screen", () => {
    const out = failures(C, mutated(C, { "printed/log-meeting.md": " \n" }));
    expect(out.route).toMatch(/printed\/log-meeting\.md is empty/);
    expect(out.notes).toBeUndefined();
  });
  it("a missing answer-key field or an unknown check", () => {
    const dir = temp("ow08-key-");
    expect(runCase(join(FIXTURES, "no-such-case"), dir)[0].problems[0]).toMatch(/could not be loaded/);
  });
});

describe("round 1: the Evaluator's sentence sets, permanent (written before the Evaluator read the checker)", () => {
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  const names = ["Dana", "Jess", "Marcus", "Robin"];
  for (const [id, kind, s] of R1.OURS.filter(([, k]) => k === "plain")) it(`${id} (plain, our side) is caught: "${s.slice(0, 50)}"`, () => expect(ff(s).length).toBeGreaterThan(0));
  it("the implied ones (D2: the self-check's): U29 and U31 caught; U28 and U30 accepted misses", () => {
    const missed = R1.OURS.filter(([, k, s]) => k === "implied" && !ff(s).length).map(([id]) => id);
    expect(missed).toEqual(["U28", "U30"]);
  });
  for (const [id, s] of R1.LEGIT) it(`${id} (legitimate) passes: "${s.slice(0, 50)}"`, () => expect(ff(s)).toEqual([]));
  for (const [id, cat, s] of R1.NAMES) it(`${id} (${cat}) is caught`, () => expect(peopleFindings(s, names).length).toBeGreaterThan(0));
  for (const [id, s] of R1.NAME_CONTROLS) it(`${id} (people control) passes: "${s}"`, () => expect(peopleFindings(s, names)).toEqual([]));
  for (const [id, s] of R1.PRIVATE) it(`${id} (private name) is caught: "${s}"`, () => expect(privateNameFindings(s).length).toBeGreaterThan(0));
  for (const [id, s] of R1.PRIVATE_CONTROLS) it(`${id} (private-name control) passes`, () => expect(privateNameFindings(s)).toEqual([]));
  const roles = () => ["you", "client ops lead", "client owner"];
  for (const [id, l] of R1.STATUS_OK) it(`${id} (STATUS, legitimate) passes`, () => expect(statusLineProblems(l, roles)).toEqual([]));
  for (const [id, d, l] of R1.STATUS_BAD) it(`${id} (STATUS: ${d}) fails`, () => expect(statusLineProblems(l, roles).length).toBeGreaterThan(0));
  it("the supplementary probes: the skill's own example, sentence-initial nouns, acronym roles, joined private names", () => {
    for (const s of ["The extra workshop is at our day rate.", "My rate goes up in January.", "We are over budget on the field list."]) expect(ff(s).length, s).toBeGreaterThan(0);
    for (const s of ["Payments from Square arrive on Fridays.", "Clay from Laguna is late.", "Boxes from Uline come on Monday.", "Traffic from Instagram doubled.", "Glaze from Amaco will arrive on Monday.", "Stoneware from Laguna arrives on Monday.", "cc: the studio owner"]) expect(peopleFindings(s, names), s).toEqual([]);
    for (const s of ["Jordan from Larkspur Ceramics will send the export.", "Call the studio on 555-0142.", "cc: Priya Natarajan"]) expect(peopleFindings(s, names).length, s).toBeGreaterThan(0);
    for (const s of ["llcops", "llc ops", "llc_ops", "Deft_wright"]) expect(privateNameFindings(s).length, s).toBeGreaterThan(0);
    const line = (r) => `2026-10-20 (clock: user-stated) | ow-start 1.1.0 | logs/larkspur-ceramics/meetings/MTG-02/notes.md#A-03 | next: ow-start /ow-start-action logs/larkspur-ceramics/ | awaiting: A-03 (${r}) by 2026-10-23`;
    for (const r of ["client CFO", "client IT lead", "client's bookkeeper"]) expect(statusLineProblems(line(r), () => null), r).toEqual([]);
    for (const r of ["Dana", "CFO"]) expect(statusLineProblems(line(r), () => null).length, r).toBeGreaterThan(0);
  });
});

describe("round 2: a held-out set written before any round-2 rule changed (reported, never tuned)", () => {
  // Before (round 1's rules): our side 10/15 caught, 0/15 legitimate flagged, people 9/10, private names 5/10.
  // After (round 2's rules):  our side 11/15 caught, 0/15 legitimate flagged, people 10/10, private names 10/10.
  // The four our-side misses ("my normal hourly figure", "priced the change below our usual level",
  // "billable on my side", "the quote I gave you was too low") were left for round 2's Evaluator, who
  // named them (m1); round 3's rules catch all four, so this set is no longer unseen: 15/15, 0/15.
  // Round 3's own unseen set is tests/ow-start-logs-heldout-r3.mjs (below).
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  it("our side: 15 of 15 caught (11 at round 2)", () => expect(HELDOUT_OURS.filter((s) => ff(s).length).length).toBe(15));
  it("legitimate client sentences: 0 of 15 flagged", () => expect(HELDOUT_LEGIT.filter((s) => ff(s).length)).toEqual([]));
  it("people: 10 of 10 caught", () => expect(HELDOUT_PEOPLE.filter((s) => peopleFindings(s, HELDOUT_NAMES).length).length).toBe(10));
  it("private names: 10 of 10 caught", () => expect(HELDOUT_PRIVATE.filter((s) => privateNameFindings(s).length).length).toBe(10));
});

describe("round 3: a new held-out set written before any round-3 rule changed (reported, never tuned)", () => {
  // Measured on round 2's rules (8553905f), before any round-3 change: our side 9/15 caught, 1/15
  // legitimate flagged ("Your price list goes up by about 5% in the new year": the ratio rule fired on the
  // client's own price). After round 3's rules: 13/15 caught, 0/15 flagged. The false positive was found
  // by this set; the rule now leaves a ratio alone when the price is the client's ("your price"), which is
  // the one change this set informed, and is disclosed as such. The two misses ("Our team spent the whole
  // of Wednesday rebuilding the import.", "This phase is not paying for itself on our side.") are left
  // unfixed on purpose for the next Evaluator, as round 2's four were. Round 3's Evaluator ruled the first plain
  // (m2) and the second an idiom (accepted); the follow-up's named-subject rule catches the first, so this set is
  // no longer unseen: 14/15. The follow-up's own unseen set is tests/ow-start-logs-heldout-r4.mjs (below).
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  it("our side: 14 of 15 caught (9 before round 3's rules, 13 after; the idiom is the accepted miss)", () => {
    expect(HELDOUT3_OURS.filter((s) => !ff(s).length)).toEqual(["This phase is not paying for itself on our side."]);
  });
  it("legitimate client sentences: 0 of 15 flagged (1 before)", () => expect(HELDOUT3_LEGIT.filter((s) => ff(s).length)).toEqual([]));
});

describe("round 2: the Evaluator's sentence sets, permanent (written before the Evaluator read the round-2 checker)", () => {
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  const names = ["Dana", "Jess", "Marcus", "Robin"];
  // m1: the five plain misses of round 2 (A02, A04, A06, A09, A19) are caught by round 3's rules.
  for (const [id, , s] of R2.OURS2.filter(([, k]) => k === "plain")) it(`${id} (plain, our side) is caught: "${s.slice(0, 50)}"`, () => expect(ff(s).length).toBeGreaterThan(0));
  it("the implied ones (A23 to A25) are the self-check's (owner decision D2): accepted misses", () => {
    expect(R2.OURS2.filter(([, k, s]) => k === "implied" && !ff(s).length).map(([id]) => id)).toEqual(["A23", "A24", "A25"]);
  });
  for (const [id, s] of R2.LEGIT2) it(`${id} (legitimate) passes the follow-up and people checks`, () => expect([...ff(s), ...peopleFindings(s, names)]).toEqual([]));
  // m6: C03 (ten digits, unformatted) and C11 (a UK number) are caught.
  for (const [id, cat, s] of R2.NAMES2) it(`${id} (${cat}) is caught`, () => expect(peopleFindings(s, names).length).toBeGreaterThan(0));
  for (const [id, s] of R2.NAME_CONTROLS2) it(`${id} (people control) passes`, () => expect(peopleFindings(s, names)).toEqual([]));
  for (const [id, s] of R2.PRIVATE2) it(`${id} (private name) is caught: "${s}"`, () => expect(privateNameFindings(s).length).toBeGreaterThan(0));
  for (const [id, s] of R2.PRIVATE_CONTROLS2) it(`${id} (private-name control) passes`, () => expect(privateNameFindings(s)).toEqual([]));
});

describe("follow-up: a held-out set written before any follow-up rule changed (reported, never tuned)", () => {
  // Measured on main's rules (fd437ac8, ow-start 1.1.0), before any follow-up change: our side 11/15 caught, 3/15
  // scheduling sentences flagged ("Our time zone is an hour ahead of yours…", "Our usual check-in is fifteen
  // minutes…", "Our days on site are…"). After the follow-up's rules: 13/15 caught, 0/15 flagged. The rules were
  // written from the Evaluator's round-3 misses and probes and from the scheduling controls, never from this set.
  // The two misses ("We ate the cost of the second test round ourselves.", "We spent far more hours on the export
  // than we budgeted.") are left unfixed on purpose for the next Evaluator.
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  it("our side: 13 of 15 caught (11 before)", () => {
    expect(HELDOUT4_OURS.filter((s) => !ff(s).length)).toEqual(["We ate the cost of the second test round ourselves.", "We spent far more hours on the export than we budgeted."]);
  });
  it("legitimate scheduling sentences: 0 of 15 flagged (3 before)", () => expect(HELDOUT4_LEGIT.filter((s) => ff(s).length)).toEqual([]));
});

describe("follow-up: the scheduling controls, written before the rules (owner decision O8)", () => {
  // Before the follow-up's rules, 18 of these 30 were flagged (11 of the Evaluator's 18 probes); now none is.
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  it(`all ${FOLLOWUP_SCHEDULING_CONTROLS.length} must-pass scheduling and client-side sentences pass`, () => {
    expect(FOLLOWUP_SCHEDULING_CONTROLS.length).toBe(30);
    expect(FOLLOWUP_SCHEDULING_CONTROLS.filter((s) => ff(s).length)).toEqual([]);
  });
  for (const s of FOLLOWUP_R3_PLANTS) it(`our side, round 3's plain miss, is caught: "${s.slice(0, 50)}"`, () => expect(ff(s).length).toBeGreaterThan(0));
});

describe("round 3: the Evaluator's sentence sets, permanent (written before the Evaluator read the round-3 checker)", () => {
  const ff = (s) => followUpFindings(s, { user: "Robin" });
  const names = ["Dana", "Jess", "Marcus", "Robin"];
  // G13 ("I worked through the weekend on the order view.") is the class of round 1's accepted U30; the Evaluator
  // did not count it as a defect. G07 and G17 were round 3's plain misses (m2) and are caught now.
  for (const [id, , s] of R3.OURS3.filter(([id, k]) => k === "plain" && id !== "G13")) it(`${id} (plain, our side) is caught: "${s.slice(0, 50)}"`, () => expect(ff(s).length).toBeGreaterThan(0));
  it("G13 and the implied ones: G19 caught; G13, G18 and G20 the accepted misses", () => {
    expect(R3.OURS3.filter(([id, k, s]) => (k === "implied" || id === "G13") && !ff(s).length).map(([id]) => id)).toEqual(["G13", "G18", "G20"]);
  });
  for (const [id, s] of R3.LEGIT3) it(`${id} (legitimate) passes the follow-up and people checks`, () => expect([...ff(s), ...peopleFindings(s, names)]).toEqual([]));
  for (const [id, cat, s] of R3.NAMES3) it(`${id} (${cat}) is caught`, () => expect(peopleFindings(s, names).length).toBeGreaterThan(0));
  for (const [id, s] of R3.NAME_CONTROLS3) it(`${id} (people control) passes`, () => expect(peopleFindings(s, names)).toEqual([]));
  for (const [id, s] of R3.PRIVATE3) it(`${id} (private name) is caught: "${s}"`, () => expect(privateNameFindings(s).length).toBeGreaterThan(0));
  for (const [id, s] of R3.PRIVATE_CONTROLS3) it(`${id} (private-name control) passes`, () => expect(privateNameFindings(s)).toEqual([]));
});

describe("R1-4: screens are graded on prescribed text and structure only (round 2 D1′)", () => {
  // Owner decision R1-4: a screen is graded only on the text the references prescribe for it, and on
  // structure. Structure is a single unit: an id, a date, a path or verb, a file name, a workstream, or
  // a role of logs-schema.md. Prescribed text is the list below, each entry checked against the file that
  // prescribes it. So a key's `says`, `ask` and `must` are each one prescribed text (its <workstream>
  // filled in), and each `tokens` entry is a unit, a prescribed text, or a prescribed text followed by
  // one unit (a NEXT line's quoted words and its path). Golden wording ("D1 is logged already as DEC-01")
  // and golden layout ("A-01: client ops lead", a "- " bullet) can be neither. `never` and `must_not` are
  // guards: they only fail a wrong screen, so any regex may serve.
  const S = join(import.meta.dirname, "..", "skills-work", "ow-start");
  const read = (f) => readFileSync(join(S, f), "utf8");
  const LI = "references/logs-status-and-index.md", SC = "references/self-checks-logs.md", PLM = "references/phase-log-meeting.md", SK = "SKILL.md", LS = "references/logs-schema.md";
  const PRESCRIBED = [
    ["Appended:", LI], ["Open in <workstream>:", LI], ["Nothing logged yet for <workstream>", LI], ["reported overdue", LI],
    ["no date in its header", LI], ["which workstream", LI], ["confirm it", LI], ["Index copies nothing", LI],
    // the /ow-status tables' columns: the family's own terms only; single generic words ("client", "next", "due",
    // "item", "logged") add nothing as graded text (follow-up nit)
    ["last step", LI], ["awaiting", LI], ["workstream", LI], ["owner role", LI],
    // the screen words of §5 (follow-up: prescribed refusal, no-op and question words)
    ["Refused:", LI], ["Nothing was written", LI], ["Nothing is written until you answer.", LI], ["Nothing is shown until you answer.", LI],
    ["records no decisions", LI], ["Self-checks", LI], ["It will read:", LI], ["IF IT IS NOT AVAILABLE:", LI],
    // the checks, by name
    ["People by role", SC], ["No private names", SC], ["No client text in STATUS", SC], ["Trace", SC], ["Owner and date", SC],
    ["Follow-up clean", SC], ["Never edited", SC], ["refused", SC], ["can never be waived", SC],
    ["who is who by role", PLM], ["fully logged", PLM], ["your notes", PLM], ["use ow-tools to transcribe", PLM],
    ["redo that agenda or start a new meeting", "references/phase-prep-meeting.md"], ["not a fit call", "references/phase-extract.md"],
    ["not installed here", "references/phase-setup.md"],
    ["DONE:", SK], ["NEXT:", SK], ["NEXT: none", SK], ["never sent", SK], ["no folder attached", SK], ["where slash commands exist:", SK],
    ["use ow-start to log the decisions in", SK], ["use ow-start to log the meeting", SK],
    ["none (closed: done)", LS], ["none (closed: dropped)", LS], ["none (closed: reviewed)", LS], ["no date", LS],
  ];
  const ROLES = read(LS).match(/\*\*People by role, everywhere\*\*: (.*?)\. No name/)[1].match(/`([^`]+)`/g).map((r) => r.slice(1, -1));
  const keys = listLogsCases().map((c) => [c, loadKey(join(FIXTURES, c))]);
  const SLUGS = [...new Set(["larkspur-ceramics", "business", ...keys.map(([, k]) => k.workstream).filter(Boolean)])];
  const W = new Set(PRESCRIBED.flatMap(([p]) => (/<workstream>/.test(p) ? SLUGS.map((s) => p.replace("<workstream>", s)) : [p])));
  const UNIT = [/^(?:MTG|DEC|CO|A|Q|D|M|W)-?\d+$/, /^SPEAKER_\d+$/, /^\d{4}-\d{2}-\d{2}$/, /^[\w.<>-]*\/[\w.<>#/-]*$/, /^[\w.-]+\.(?:md|yaml|yml|html|txt|vtt|json)(?:#[\w-]+)?$/];
  const unit = (t) => UNIT.some((r) => r.test(t)) || SLUGS.includes(t) || ROLES.includes(t);
  const unescape = (p) => String(p).replace(/\\(.)/g, "$1");
  const literal = (p) => p === unescape(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /** Why a graded phrase is not prescribed text or structure (null when it is). */
  const phraseProblem = (p) => (!literal(p) ? "is a regex, not literal prescribed text" : W.has(unescape(p)) ? null : "is not text a reference prescribes");
  const tokenProblem = (t) => {
    if (unit(t) || W.has(t)) return null;
    const w = [...W].find((x) => t.startsWith(`${x} `) && unit(t.slice(x.length + 1)));
    return w ? null : "is neither one unit of structure, nor prescribed text, nor prescribed text and one unit";
  };
  const problems = (k) => [
    ...[...(k.route?.says ?? []), ...(k.route?.ask ? [k.route.ask] : []), ...(k.screen?.must ?? [])].map((p) => [p, phraseProblem(p)]),
    ...[...(k.route?.tokens ?? []), ...(k.screen?.tokens ?? [])].flat().map((t) => [t, tokenProblem(String(t))]),
  ].filter(([, why]) => why).map(([p, why]) => `"${p}" ${why}`);

  it("every prescribed text is in the file that prescribes it, and the roles come from logs-schema.md", () => {
    expect(PRESCRIBED.filter(([p, f]) => !read(f).includes(p))).toEqual([]);
    expect(ROLES).toEqual(["you", "client ops lead", "client owner", "vendor account manager"]);
  });
  for (const [c, k] of keys) it(`${c}: every graded phrase and token is prescribed text or structure`, () => expect(problems(k)).toEqual([]));
  it("the round-2 golden wording and layout can never be graded, as a phrase or as a token", () => {
    const golden = ["D1 is logged already as DEC-01", "D2 does not parse", "DEC-02 supersedes it", "MTG-01, logged with no agenda", "A-01: client ops lead", "^- MTG-01", "larkspur-ceramics \\(MTG-02, meeting on 2026-10-20\\)", "Refuse", "A-01 reported overdue"];
    for (const g of golden) {
      expect(phraseProblem(g), g).not.toBeNull();
      expect(tokenProblem(g), g).not.toBeNull();
    }
    for (const ok of ["Open in larkspur-ceramics:", "Nothing logged yet for meridian-tile", "fully logged"]) expect(phraseProblem(ok), ok).toBeNull();
    for (const ok of ["A-01", "client ops lead", "notes.md#A-03", "/ow-start-transcribe", "none (closed: done)", "use ow-start to log the meeting logs/business/meetings/MTG-01/"]) expect(tokenProblem(ok), ok).toBeNull();
  });
});

describe("C17, round 1: the Evaluator's malformed-file probes fail per check, without a crash", () => {
  const probe = (c, fn) => { const dir = mutated(c); fn(dir); return runCase(join(FIXTURES, c), dir).filter((r) => r.problems.length).map((r) => r.check); };
  it("agenda.md as a folder", () => {
    const failed = probe("logs-prep-items", (d) => { const p = join(d, L, "meetings/MTG-02/agenda.md"); rmSync(p); mkdirSync(p); });
    expect(failed).toContain("agenda");
    expect(failed).not.toContain("status");
  });
  it("DEC-01.md with an invalid YAML header", () => {
    const failed = probe("logs-decision-from-meeting", (d) => writeFileSync(join(d, L, "decisions/DEC-01.md"), "---\nid: [DEC-01\n---\n# x\n"));
    expect(failed).toEqual(expect.arrayContaining(["headers", "decision"]));
    expect(failed).not.toContain("status");
  });
  it("STATUS.md deleted, and STATUS.md as a folder", () => {
    for (const fn of [(d) => rmSync(join(d, "opchain-work/STATUS.md")), (d) => { const p = join(d, "opchain-work/STATUS.md"); rmSync(p); mkdirSync(p); }]) {
      const failed = probe("logs-larkspur-checkin", fn);
      expect(failed).toContain("status");
      expect(failed).not.toContain("notes");
    }
  });
  it("a binary follow-up.html", () => {
    const failed = probe("logs-larkspur-checkin", (d) => writeFileSync(join(d, L, "meetings/MTG-01/follow-up.html"), Buffer.from([0, 1, 2, 255, 0])));
    expect(failed).toContain("follow_up");
    expect(failed).not.toContain("notes");
  });
  it("the printed screen as a folder", () => {
    const failed = probe("logs-log-index", (d) => { const p = join(d, "printed/log.md"); rmSync(p); mkdirSync(p); });
    expect(failed).toEqual(expect.arrayContaining(["route", "index"]));
    expect(failed).not.toContain("status");
  });
  it("an invalid brand.yaml under the run", () => {
    const failed = probe("logs-larkspur-checkin", (d) => { mkdirSync(join(d, "opchain-work"), { recursive: true }); writeFileSync(join(d, "opchain-work/brand.yaml"), "colors: [x\n"); });
    expect(failed).not.toContain("notes");
  });
});
