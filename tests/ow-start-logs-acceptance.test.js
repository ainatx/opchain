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
import { FIXTURES, followUpFindings, listLogsCases, loadKey, parseTranscript, peopleFindings, runCase, runView, statusLineProblems } from "../scripts/ow-start-logs-acceptance.mjs";
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
    expect(cases.length).toBeGreaterThanOrEqual(41);
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
    // Measured 2026-10-17: 11/15 caught (misses: rate wording with no amount: "our hourly charge",
    // "my day rate", "I charge a premium", and "take a small hit"); 0/15 false positives. Reported, not tuned.
    expect({ recall, fp }).toEqual({ recall: 11, fp: 0 });
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
