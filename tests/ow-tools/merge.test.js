// ow-tools design §5.1 step 4: Whisper words → speaker turns.
import { describe, expect, it } from "vitest";
import { mergeTranscript, speakerStats, wordsFromWhisper } from "../../plugins/ow-tools/lib/merge.mjs";

const tok = (text, from, to) => ({ text, offsets: { from, to } });
const seg = (from, to, tokens) => ({ offsets: { from, to }, text: tokens.map((t) => t.text).join(""), tokens });

describe("wordsFromWhisper", () => {
  it("joins sub-word pieces and punctuation, and drops special tokens", () => {
    const w = wordsFromWhisper({
      result: { language: "en" },
      transcription: [
        seg(0, 2000, [tok("[_BEG_]", 0, 0), tok(" Some", 10, 300), tok("body", 300, 500), tok(" re", 500, 700), tok("types", 700, 900), tok(".", 900, 1000), tok("[_TT_50]", 1000, 1000)]),
      ],
    });
    expect(w.language).toBe("en");
    expect(w.segments[0].words.map((x) => x.text)).toEqual([" Somebody", " retypes."]);
    expect(w.segments[0].words[1]).toMatchObject({ start: 0.5, end: 1 });
  });

  it("keeps a segment without token detail as one run", () => {
    const w = wordsFromWhisper({ transcription: [{ offsets: { from: 0, to: 1500 }, text: " Hello there." }] });
    expect(w.segments[0].words).toEqual([{ start: 0, end: 1.5, text: " Hello there." }]);
  });
});

const words = (list) => ({ segments: [{ start: list[0][1], end: list.at(-1)[2], words: list.map(([text, start, end]) => ({ text, start, end })) }] });

describe("mergeTranscript", () => {
  const turns = [
    { start: 0, end: 2, speaker: "SPEAKER_00" },
    { start: 2, end: 4, speaker: "SPEAKER_01" },
  ];

  it("splits a Whisper segment at the speaker change", () => {
    const r = mergeTranscript(words([[" Who", 0.1, 0.4], [" checks?", 0.5, 1.2], [" I", 2.1, 2.3], [" do.", 2.4, 2.9]]), turns);
    expect(r.segments).toEqual([
      { start: 0.1, end: 1.2, speaker: "SPEAKER_00", text: "Who checks?", overlap: false },
      { start: 2.1, end: 2.9, speaker: "SPEAKER_01", text: "I do.", overlap: false },
    ]);
  });

  it("prefers the exclusive turns when pyannote gives them", () => {
    const exclusive = [
      { start: 0, end: 1.5, speaker: "SPEAKER_00" },
      { start: 1.5, end: 4, speaker: "SPEAKER_01" },
    ];
    const r = mergeTranscript(words([[" yes", 1.6, 1.9]]), turns, exclusive);
    expect(r.segments[0].speaker).toBe("SPEAKER_01");
  });

  it("marks words said over each other", () => {
    const overlapping = [...turns, { start: 1.5, end: 2.5, speaker: "SPEAKER_01" }];
    const r = mergeTranscript(words([[" right", 1.6, 1.9]]), overlapping);
    expect(r.segments[0].overlap).toBe(true);
  });

  it("absorbs a one-word flip shorter than half a second", () => {
    const jittery = [
      { start: 0, end: 1, speaker: "SPEAKER_00" },
      { start: 1, end: 1.3, speaker: "SPEAKER_01" },
      { start: 1.3, end: 3, speaker: "SPEAKER_00" },
    ];
    const r = mergeTranscript(words([[" about", 0.5, 0.9], [" forty", 1.05, 1.25], [" a week", 1.4, 2]]), jittery);
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0]).toMatchObject({ speaker: "SPEAKER_00", text: "about forty a week" });
  });

  it("labels words far from any turn UNKNOWN, and a near miss with the nearest turn", () => {
    const r = mergeTranscript(words([[" late", 4.5, 4.8], [" orphan", 9, 9.4]]), turns);
    expect(r.segments.map((s) => s.speaker)).toEqual(["SPEAKER_01", "UNKNOWN"]);
    expect(r.speakers.at(-1).id).toBe("UNKNOWN");
  });

  it("is deterministic regardless of turn order", () => {
    const w = words([[" a", 0.1, 0.2], [" b", 2.2, 2.3]]);
    expect(mergeTranscript(w, [...turns].reverse())).toEqual(mergeTranscript(w, turns));
  });
});

describe("speakerStats", () => {
  it("sums talk time and keeps roles", () => {
    const s = speakerStats(
      [
        { start: 0, end: 2, speaker: "SPEAKER_01" },
        { start: 2, end: 3.5, speaker: "SPEAKER_00" },
        { start: 4, end: 5, speaker: "SPEAKER_01" },
      ],
      { SPEAKER_00: "you" },
    );
    expect(s).toEqual([
      { id: "SPEAKER_00", role: "you", talk_s: 1.5 },
      { id: "SPEAKER_01", role: null, talk_s: 3 },
    ]);
  });
});
