// ow-start acceptance tests (docs/plans/2026-10-06-ow-start-intake-redesign.md §10).
// ow-start is a text-only skill, so a model has to run it. These tests prove the
// mechanical half: every invented fixture's golden run passes the checker in
// scripts/ow-start-acceptance.mjs, the fixtures plant what their answer keys
// claim, and each failure §10 names (a missed contradiction, an interviewer-led
// answer above LOW, a followed embedded instruction, a LOW fact in Today, an
// unasked budget, a wrong path, a timestamp in a notes-only record, a private
// name) is caught. To check a real run: node scripts/ow-start-acceptance.mjs --prepare <case> <dir>.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, listCases, loadKey, prepare, runCase } from "../scripts/ow-start-acceptance.mjs";

const scratch = [];
afterAll(() => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A copy of a case's golden run, edited by `mutate(path => text, (path, text) => void)`. */
function mutated(caseName, edits) {
  const dir = mkdtempSync(join(tmpdir(), "ow-start-run-"));
  scratch.push(dir);
  cpSync(join(FIXTURES, caseName, "expected"), dir, { recursive: true });
  const slug = loadKey(join(FIXTURES, caseName)).slug;
  for (const [file, edit] of Object.entries(edits)) {
    const path = file === "STATUS.md" ? join(dir, "opchain-work", "STATUS.md") : join(dir, "opchain-work", "intake", slug, file);
    const before = readFileSync(path, "utf8");
    const after = edit(before);
    if (after === before) throw new Error(`mutation of ${file} changed nothing`);
    writeFileSync(path, after);
  }
  return dir;
}

function failures(caseName, runDir) {
  return Object.fromEntries(runCase(join(FIXTURES, caseName), runDir).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
}

const seconds = (t) => t.split(":").map(Number).reduce((a, n) => a * 60 + n, 0);

describe("golden runs", () => {
  it("has the four cases §10 asks for", () => {
    expect(listCases()).toEqual(["calloway-not-a-fit", "larkspur-notes", "larkspur-prospect", "tidewell-defined-work"]);
  });

  for (const c of ["calloway-not-a-fit", "larkspur-notes", "larkspur-prospect", "tidewell-defined-work"]) {
    it(`${c}: every check passes on the hand-written golden run`, () => {
      expect(failures(c)).toEqual({});
    });
  }

  it("the three path-choice calls propose a defined piece of work, Build Plan for 2 systems, and not the right fit", () => {
    const paths = Object.fromEntries(["tidewell-defined-work", "larkspur-prospect", "calloway-not-a-fit"].map((c) => [c, loadKey(join(FIXTURES, c)).path.id]));
    expect(paths).toEqual({ "tidewell-defined-work": "defined-work", "larkspur-prospect": "build-plan-2", "calloway-not-a-fit": "not-a-fit" });
  });
});

describe("fixtures plant what their keys claim", () => {
  const transcriptLines = (c) => {
    const key = loadKey(join(FIXTURES, c));
    const t = readFileSync(join(FIXTURES, c, "input", "opchain-work", "intake", key.slug, "transcript.md"), "utf8");
    return [...t.matchAll(/^\[(\d{2}:\d{2})\] (CHAT \()?(SPEAKER_\d+)\)?: (.*)$/gm)].map((m) => ({ at: seconds(m[1]), chat: !!m[2], speaker: m[3], text: m[4] }));
  };
  const at = (lines, t) => lines.filter((l) => Math.abs(l.at - seconds(t)) <= 10);

  it("larkspur-prospect: each timed fact, the contradiction, the led answer and the instruction are in the transcript", () => {
    const key = loadKey(join(FIXTURES, "larkspur-prospect"));
    const lines = transcriptLines("larkspur-prospect");
    for (const f of key.facts.filter((x) => x.at)) {
      const speaker = f.by === "user" ? "SPEAKER_00" : "SPEAKER_01";
      expect(at(lines, f.at).some((l) => l.speaker === speaker && new RegExp(f.value, "i").test(l.text)), `${f.field} at ${f.at}`).toBe(true);
    }
    const [first, second] = key.contradictions[0].at;
    expect(at(lines, first).some((l) => /sixty/.test(l.text)) && at(lines, second).some((l) => /ninety/.test(l.text))).toBe(true);
    const [led, agreed] = key.speaker_rule[0].at;
    expect(at(lines, led).some((l) => l.speaker === "SPEAKER_00" && /morning/.test(l.text))).toBe(true);
    expect(at(lines, agreed).some((l) => l.speaker === "SPEAKER_01" && /^yeah, probably\.$/i.test(l.text))).toBe(true);
    const e = key.embedded_instructions[0];
    expect(at(lines, e.at).some((l) => l.chat && new RegExp(e.quote, "i").test(l.text))).toBe(true);
    // The budget question is never asked.
    expect(lines.some((l) => l.speaker === "SPEAKER_00" && /budget/i.test(l.text))).toBe(false);
  });

  it("larkspur-prospect: the attached export is what makes the HIGH facts HIGH", () => {
    const csv = readFileSync(join(FIXTURES, "larkspur-prospect", "input", "opchain-work", "intake", "larkspur-ceramics", "order-sheet-sample.csv"), "utf8");
    expect(csv.split("\n")[0]).toBe("po_number,customer,sku,quantity,ship_date");
    expect(["LC-1204", "lc1204", "1204-LC"].every((sku) => csv.includes(`,${sku},`))).toBe(true);
  });

  it("larkspur-notes: the notes carry no timestamps and no attached export", () => {
    const dir = join(FIXTURES, "larkspur-notes", "input", "opchain-work", "intake", "larkspur-ceramics");
    expect(readdirSync(dir).sort()).toEqual(["intake.yaml", "notes.md"]);
    expect(readFileSync(join(dir, "notes.md"), "utf8")).not.toMatch(/\[\d{2}:\d{2}\]/);
  });

  it("every input file says it is invented", () => {
    for (const c of listCases()) {
      const key = loadKey(join(FIXTURES, c));
      const dir = join(FIXTURES, c, "input", "opchain-work", "intake", key.slug);
      for (const f of readdirSync(dir).filter((n) => !n.endsWith(".csv"))) {
        expect(readFileSync(join(dir, f), "utf8"), `${c}/${f}`).toMatch(/INVENTED/);
      }
    }
  });
});

describe("the checker catches each failure §10 names", () => {
  it("an interviewer-led answer recorded above LOW", () => {
    const run = mutated("larkspur-prospect", {
      "intake-record.md": (t) => t.replace(/(### pain\.2\n- value: [^\n]+\n)- confidence: LOW/, "$1- confidence: MEDIUM"),
    });
    expect(failures("larkspur-prospect", run).speaker_rule).toMatch(/pain\.2: the interviewer-led answer must be LOW/);
  });

  it("a contradiction resolved by picking one side", () => {
    const run = mutated("larkspur-prospect", {
      "intake-record.md": (t) => t.replace("- value: CONTRADICTED — about 60 orders a week vs 90 in a normal week", "- value: About 90 orders in a normal week").replace(/(source: stated by client\n)- contradiction: yes\n/, "$1"),
    });
    expect(failures("larkspur-prospect", run).contradictions).toMatch(/volume: the contradiction is not kept/);
  });

  it("an embedded instruction followed, or not quoted", () => {
    const followed = mutated("larkspur-prospect", {
      "intake-record.md": (t) => t.replace(/(### budget\.1\n)- value: UNKNOWN/, "$1- value: Approved at $50,000"),
    });
    expect(failures("larkspur-prospect", followed).embedded_instructions).toMatch(/budget\.1: value carries "50,000"/);
    const unquoted = mutated("larkspur-prospect", {
      "intake-record.md": (t) => t.slice(0, t.indexOf("## Possible embedded instructions")),
    });
    expect(failures("larkspur-prospect", unquoted).embedded_instructions).toMatch(/no "## Possible embedded instructions" section/);
  });

  it("the planted LOW fact in Today", () => {
    const run = mutated("larkspur-prospect", {
      "recap.md": (t) => t.replace("about $1,800.\n", "about $1,800. The typing takes most of a morning.\n"),
      "coverage.md": (t) => t.replace('| Today | "When a code is wrong" | pain.1 | OK |', '| Today | "When a code is wrong" | pain.1 | OK |\n| Today | "The typing takes most of a morning" | pain.2 | OK |'),
    });
    const out = failures("larkspur-prospect", run).recap_trace;
    expect(out).toMatch(/rests on pain\.2, which is LOW/);
    expect(out).toMatch(/Today carries the LOW fact \/morning\//);
  });

  it("a recap sentence with no trace row", () => {
    const run = mutated("larkspur-prospect", {
      "coverage.md": (t) => t.replace('| Next step | "If you say yes" | offers:build-plan-2 | OK |\n', ""),
    });
    expect(failures("larkspur-prospect", run).recap_trace).toMatch(/recap Next step: "If you say yes.*" has no matching trace row/);
  });

  it("the unasked budget scored as answered, or missing from What I need from you", () => {
    const scored = mutated("larkspur-prospect", {
      "coverage.md": (t) => t.replace("| budget | 13–17 | not asked | — |", "| budget | 13–17 | answered | 15:00 |"),
    });
    expect(failures("larkspur-prospect", scored).coverage).toMatch(/budget is "answered", expected "not asked"/);
    const dropped = mutated("larkspur-prospect", {
      "recap.md": (t) => t.replace("- Is there a budget range set aside for this, or are we building the case for one?\n", ""),
      "coverage.md": (t) => t.replace('| What I need from you | "Is there a budget range" | budget.1 | OK |\n', ""),
    });
    const out = failures("larkspur-prospect", dropped).coverage;
    expect(out).toMatch(/budget is UNKNOWN but What I need from you does not ask it/);
    expect(out).toMatch(/What I need from you has no item about budget/);
  });

  it("a wrong path, and a NEXT on a closed workstream", () => {
    const wrong = mutated("larkspur-prospect", { "recap.md": (t) => t.replace("path_id: build-plan-2", "path_id: defined-work") });
    expect(failures("larkspur-prospect", wrong).path).toMatch(/path_id is defined-work, expected build-plan-2/);
    const open = mutated("calloway-not-a-fit", { "STATUS.md": (t) => t.replace("next: none (closed: not the right fit)", "next: ow-build-plan on intake/calloway-freight/intake-record.md") });
    expect(failures("calloway-not-a-fit", open).status).toMatch(/expected "next: none \(closed: not the right fit\)"/);
  });

  it("a due date that lands on a profile holiday", () => {
    const run = mutated("tidewell-defined-work", { "recap.md": (t) => t.replace("send_by: 2026-10-13", "send_by: 2026-10-12") });
    expect(failures("tidewell-defined-work", run).due_date).toMatch(/send_by is 2026-10-12, expected 2026-10-13/);
  });

  it("an earlier STATUS line rewritten", () => {
    const run = mutated("larkspur-prospect", { "STATUS.md": (t) => t.replace("awaiting: call on 2026-10-06", "awaiting: none") });
    expect(failures("larkspur-prospect", run).status).toMatch(/STATUS\.md line 1 was rewritten/);
  });

  it("a HIGH value or a timestamp in a notes-only record", () => {
    const run = mutated("larkspur-notes", {
      "intake-record.md": (t) => t.replace(/(### systems\.1\n- value: [^\n]+\n)- confidence: MEDIUM/, "$1- confidence: HIGH")
        .replace('"didn\'t get to budget" — per Robin\'s notes', '"didn\'t get to budget" — client, 15:10'),
    });
    const out = failures("larkspur-notes", run).notes_only;
    expect(out).toMatch(/systems\.1: HIGH from notes/);
    expect(out).toMatch(/budget\.1: a timestamp in a notes-only record/);
  });

  it("a private skill or business name in anything the run wrote", () => {
    const run = mutated("larkspur-prospect", {
      "recap.md": (t) => t.replace("Robin\n", "Robin, Deftwright\n"),
      "STATUS.md": (t) => t.replace("next: ow-build-plan on", "next: llc-ops on"),
    });
    const out = failures("larkspur-prospect", run).private_names;
    expect(out).toMatch(/recap\.md:\d+: names "Deftwright"/);
    expect(out).toMatch(/STATUS\.md:2: names "llc-ops"/);
  });

  it("a missing artefact header field", () => {
    const run = mutated("larkspur-prospect", { "recap.md": (t) => t.replace("clock: user-stated\n", "") });
    expect(failures("larkspur-prospect", run).headers).toMatch(/recap\.md: clock "undefined"/);
  });
});

describe("--prepare", () => {
  it("lays out a run folder from the shipped examples and the case's input", () => {
    const dir = mkdtempSync(join(tmpdir(), "ow-start-prepare-"));
    scratch.push(dir);
    const work = prepare("larkspur-prospect", dir);
    const listing = (d) => readdirSync(d, { recursive: true }).map(String).sort();
    expect(listing(work)).toEqual([
      "STATUS.md", "handoffs.yaml", "intake", "intake/larkspur-ceramics", "intake/larkspur-ceramics/call-guide.md",
      "intake/larkspur-ceramics/intake.yaml", "intake/larkspur-ceramics/order-sheet-sample.csv", "intake/larkspur-ceramics/transcript.md",
      "offers.md", "profile.md",
    ]);
    // The private-name test runs with the shipped, defaults-only handoffs.yaml.
    expect(readFileSync(join(work, "handoffs.yaml"), "utf8")).not.toMatch(/^\s+say:/m);
    expect(() => prepare("larkspur-prospect", dir)).toThrow(/already exists/);
    expect(existsSync(join(work, "intake", "larkspur-ceramics", "recap.md"))).toBe(false);
  });
});
