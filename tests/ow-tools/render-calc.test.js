// ow-tools design §5.1 (transcript.md) and §5.4 (calc).
import { describe, expect, it } from "vitest";
import { DATA_SENTENCE, clock, header, renderTranscript } from "../../plugins/ow-tools/lib/render.mjs";
import { addDate, fromMinor, split, toMinor, total } from "../../plugins/ow-tools/lib/calc.mjs";

const doc = (over = {}) => ({
  ow_artefact: "ow-tools/transcript",
  schema: 1,
  written_by: "ow-tools 1.0.0 (protocol 1)",
  workstream: "intake/meridian-tile",
  subject: "audio/fit-call.m4a",
  created: "2026-10-09",
  clock: "tool",
  origin: "third-party (recording)",
  source: { audio: "audio/fit-call.m4a", sha256: "x", duration_s: 600 },
  pipeline: { normalise: "ffmpeg 8", transcribe: "whisper.cpp 1.9.5 large-v3-turbo", diarize: "pyannote.audio 4.0.7 community-1 (cpu)", merge: "ow-tools 1.0.0" },
  speakers: [
    { id: "SPEAKER_00", role: "you", talk_s: 200 },
    { id: "SPEAKER_01", role: null, talk_s: 300 },
  ],
  segments: [
    { start: 3.2, end: 6, speaker: "SPEAKER_00", text: "Walk me through the last order.", overlap: false },
    { start: 462.9, end: 470, speaker: "SPEAKER_01", text: "We do about forty a week, more in March.", overlap: false },
    { start: 471, end: 472, speaker: "SPEAKER_01", text: "Right.", overlap: true },
  ],
  ...over,
});

describe("transcript.md", () => {
  it("opens with the ow-protocol v1 artefact header and the data sentence", () => {
    const md = renderTranscript(doc());
    expect(md.startsWith(header(doc()))).toBe(true);
    expect(md.split("\n").slice(0, 10)).toEqual([
      "---",
      "ow_artefact: ow-tools/transcript",
      "schema: 1",
      "written_by: ow-tools 1.0.0 (protocol 1)",
      "workstream: intake/meridian-tile",
      "subject: audio/fit-call.m4a",
      "created: 2026-10-09",
      "clock: tool",
      "origin: third-party (recording)",
      "---",
    ]);
    expect(md).toContain(DATA_SENTENCE);
  });

  it("puts banner_text on the first line after the header, verbatim", () => {
    const md = renderTranscript(doc({ banner: "CONFIDENTIAL — client material" }));
    expect(md.split("\n")[10]).toBe("CONFIDENTIAL — client material");
  });

  it("uses typed roles, marks the unconfirmed and overlapping speech, and quotes in mm:ss", () => {
    const md = renderTranscript(doc());
    expect(md).toContain("[00:03] you: Walk me through the last order.");
    expect(md).toContain("[07:42] SPEAKER_01: We do about forty a week, more in March.");
    expect(md).toContain("- SPEAKER_01: not yet confirmed");
    expect(md).toContain("[07:51] SPEAKER_01: Right. (overlapping speech)");
  });

  it("switches to h:mm:ss past an hour and never writes an absolute path", () => {
    const md = renderTranscript(doc({ source: { audio: "audio/long.m4a", sha256: "x", duration_s: 4000 } }));
    expect(md).toContain("[0:07:42]");
    expect(md).not.toMatch(/\/Users\/|\/home\//);
    expect(clock(3725, true)).toBe("1:02:05");
  });
});

describe("calc date", () => {
  it("counts business days past weekends and listed holidays, never the start day", () => {
    expect(addDate({ from: "2026-10-09", businessDays: 1 }).date).toBe("2026-10-12"); // Fri → Mon
    const r = addDate({ from: "2026-11-25", businessDays: 1, holidays: ["2026-11-26", "2026-11-27"] });
    expect(r).toMatchObject({ date: "2026-11-30", holidays_skipped: ["2026-11-26", "2026-11-27"] });
  });
  it("goes backwards for a negative count", () => {
    expect(addDate({ from: "2026-10-12", businessDays: -3 }).date).toBe("2026-10-07");
  });
  it("adds calendar days across a month end", () => {
    expect(addDate({ from: "2026-10-09", days: 14 }).date).toBe("2026-10-23");
    expect(addDate({ from: "2026-10-23", days: 60 }).date).toBe("2026-12-22");
  });
  it("refuses impossible dates and ambiguous counts", () => {
    expect(() => addDate({ from: "2026-02-30", days: 1 })).toThrow(/not a real date/);
    expect(() => addDate({ from: "2026-10-09", days: 1, businessDays: 1 })).toThrow(/exactly one/);
  });
});

describe("calc total and split", () => {
  it("adds in minor units with no floating-point drift", () => {
    expect(toMinor("0.1") + toMinor("0.2")).toBe(toMinor("0.3"));
    const r = total({ items: [{ label: "integration", quantity: 3, unit_price: "1999.99" }, { label: "report", amount: "0.01" }], currency: "USD" });
    expect(r).toEqual({ currency: "USD", lines: [{ label: "integration", amount: "5999.97" }, { label: "report", amount: "0.01" }], total: "5999.98" });
  });
  it("refuses two currencies in one total", () => {
    expect(() => total({ items: [{ amount: 1, currency: "USD" }, { amount: 1, currency: "EUR" }] })).toThrow(/one currency/);
  });
  it("splits so the parts add up exactly, remainder on the last", () => {
    expect(split({ total: "13000", schedule: "40/40/20" }).amounts).toEqual(["5200.00", "5200.00", "2600.00"]);
    const odd = split({ total: "100.01", schedule: "50/50" }).amounts;
    expect(odd).toEqual(["50.00", "50.01"]);
    expect(fromMinor(odd.map((a) => toMinor(a)).reduce((a, b) => a + b))).toBe("100.01");
  });
  it("refuses a schedule that doesn't add up to 100", () => {
    expect(() => split({ total: "10", schedule: "40/40" })).toThrow(/add up to 100/);
  });
});
