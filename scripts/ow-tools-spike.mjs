#!/usr/bin/env node
// ow-tools transcription speed spike (ow-tools design §10; ow-start open
// question 2): is a 20-minute two-person call transcribed and separated in
// under ~5 minutes on this machine, with speakers attributed correctly?
//
// Builds a synthetic recording from tests/fixtures/ow-tools/synthetic-fit-call.txt
// with two macOS `say` voices (so the true speaker of every second is known),
// runs the real `ow-tools transcribe`, and scores it. Synthetic voices are
// cleaner than a real call: treat accuracy here as an upper bound.
//
//   node scripts/ow-tools-spike.mjs [--out DIR] [--minutes 20] [--rate 175]
//        [--model large-v3-turbo|medium] [--device cpu|mps] [--label NAME] [--reuse]
//        [--voices "Reed (English (US))" "Samantha (English (US))"]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BIN = join(ROOT, "plugins", "ow-tools", "bin", "ow-tools");

function args(argv) {
  const o = { minutes: 20, rate: 175, model: "large-v3-turbo", device: "cpu", label: null, reuse: false, voices: ["Reed (English (US))", "Samantha (English (US))"] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--reuse") o.reuse = true;
    else if (a === "--voices") o.voices = [argv[++i], argv[++i]];
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
  }
  o.minutes = Number(o.minutes);
  o.rate = Number(o.rate);
  o.out ??= join(tmpdir(), "ow-tools-spike");
  o.label ??= `${o.model}-${o.device}`;
  return o;
}

function sh(cmd, a, opts = {}) {
  const r = spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} ${a.slice(0, 3).join(" ")}… failed: ${(r.stderr || "").slice(-400)}`);
  return r;
}

const wavSeconds = (p) => (readFileSync(p).length - 44) / 32000; // 16 kHz mono s16 with a 44-byte header

function buildRecording(o, ws) {
  const script = readFileSync(join(ROOT, "tests", "fixtures", "ow-tools", "synthetic-fit-call.txt"), "utf8")
    .split("\n")
    .filter((l) => /^[YC]: /.test(l))
    .map((l) => ({ who: l[0], text: l.slice(3).trim() }));
  const parts = join(o.out, "parts");
  mkdirSync(parts, { recursive: true });
  const durations = script.map((line, i) => {
    const p = join(parts, `${String(i).padStart(3, "0")}.wav`);
    const voice = line.who === "Y" ? o.voices[0] : o.voices[1];
    sh("say", ["-v", voice, "-r", String(o.rate), "--file-format=WAVE", "--data-format=LEI16@16000", "-o", p, "--", line.text]);
    return wavSeconds(p);
  });
  const speech = durations.reduce((a, b) => a + b, 0);
  const gap = Math.min(3, Math.max(0.35, (o.minutes * 60 - speech) / (script.length - 1)));
  const silence = join(parts, "gap.wav");
  sh("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", gap.toFixed(3), "-c:a", "pcm_s16le", silence]);
  const gapS = wavSeconds(silence);
  const list = [];
  const truth = [];
  let t = 0;
  script.forEach((line, i) => {
    list.push(`file '${join(parts, `${String(i).padStart(3, "0")}.wav`)}'`);
    truth.push({ who: line.who, start: t, end: t + durations[i], text: line.text });
    t += durations[i];
    if (i < script.length - 1) {
      list.push(`file '${silence}'`);
      t += gapS;
    }
  });
  writeFileSync(join(parts, "list.txt"), list.join("\n") + "\n");
  const audioDir = join(ws, "audio");
  mkdirSync(audioDir, { recursive: true });
  const audio = join(audioDir, "synthetic-fit-call.m4a");
  // AAC in an .m4a, as a Meet recording download would carry it.
  sh("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(parts, "list.txt"), "-c:a", "aac", "-b:a", "96k", "-ar", "48000", audio]);
  writeFileSync(join(o.out, "truth.json"), JSON.stringify({ duration_s: t, gap_s: gapS, voices: o.voices, rate: o.rate, truth }, null, 2));
  return { audio, truth, duration: t };
}

function score(doc, truth) {
  // Map each detected speaker to Y or C by the time it overlaps each.
  const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const votes = {};
  for (const s of doc.segments) {
    for (const g of truth) {
      const ov = overlap(s, g);
      if (!ov) continue;
      votes[s.speaker] ??= { Y: 0, C: 0 };
      votes[s.speaker][g.who] += ov;
    }
  }
  const map = Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, v.Y >= v.C ? "Y" : "C"]));
  let right = 0;
  let total = 0;
  let wordsRight = 0;
  let wordsTotal = 0;
  for (const s of doc.segments) {
    const words = s.text.split(/\s+/).filter(Boolean).length;
    let segRight = 0;
    let segTotal = 0;
    for (const g of truth) {
      const ov = overlap(s, g);
      segTotal += ov;
      if (map[s.speaker] === g.who) segRight += ov;
    }
    right += segRight;
    total += segTotal;
    if (segTotal > 0) {
      wordsRight += (words * segRight) / segTotal;
      wordsTotal += words;
    }
  }
  const text = doc.segments.map((s) => s.text).join(" ").toLowerCase();
  const said = (re, who) => {
    const s = doc.segments.find((x) => re.test(x.text.toLowerCase()));
    return { found: Boolean(s), by: s ? map[s.speaker] ?? s.speaker : null, expected: who, at: s ? Math.round(s.start) : null };
  };
  return {
    speakers_found: doc.speakers.filter((s) => s.id !== "UNKNOWN").length,
    mapping: map,
    time_attributed_correctly: Math.round((right / total) * 1000) / 10,
    words_attributed_correctly: Math.round((wordsRight / wordsTotal) * 1000) / 10,
    planted: {
      contradiction_early: said(/(forty|40) orders a week/, "C"),
      contradiction_late: said(/(sixty|60), (sixty-five|65)/, "C"),
      interviewer_led_question: said(/two hours a day of retyping/, "Y"),
      interviewer_led_agreement: said(/^yeah, sure\.?$/, "C"),
      embedded_instruction: said(/ignore the above/, "C"),
      budget: said(/(fifteen thousand|15,000|15000)/, "C"),
      deadline: said(/march (first|1st|1)\b/, "C"),
      skus_by_hand: said(/by hand every monday/, "C"),
      promise: said(/written recap by tomorrow/, "Y"),
    },
    transcript_words: text.split(/\s+/).filter(Boolean).length,
  };
}

const o = args(process.argv.slice(2));
const ws = join(o.out, "opchain-work", "intake", "meridian-tile");
let rec;
if (o.reuse && existsSync(join(o.out, "truth.json"))) {
  const t = JSON.parse(readFileSync(join(o.out, "truth.json"), "utf8"));
  rec = { audio: join(ws, "audio", "synthetic-fit-call.m4a"), truth: t.truth, duration: t.duration_s };
} else {
  console.error("building the synthetic recording…");
  rec = buildRecording(o, ws);
}
console.error(`recording: ${(rec.duration / 60).toFixed(2)} min; running ow-tools transcribe (${o.label})…`);
const runDir = join(o.out, "runs", o.label);
const started = performance.now();
const r = sh(BIN, ["transcribe", rec.audio, "--out", runDir, "--speakers", "2", "--model", o.model, "--device", o.device, "--force", "--json"], { allowFail: true });
const wall = (performance.now() - started) / 1000;
const res = JSON.parse(r.stdout || "{}");
if (r.status !== 0) {
  console.error(`ow-tools transcribe exited ${r.status}: ${res.message || r.stderr}`);
  process.exit(r.status || 1);
}
const doc = JSON.parse(readFileSync(join(runDir, "transcript.json"), "utf8"));
const result = {
  label: o.label,
  machine: `${sh("sysctl", ["-n", "machdep.cpu.brand_string"], { allowFail: true }).stdout.trim()}, ${Math.round(Number(sh("sysctl", ["-n", "hw.memsize"], { allowFail: true }).stdout) / 2 ** 30)} GB`,
  recording_min: Math.round((rec.duration / 60) * 100) / 100,
  pipeline: doc.pipeline,
  timings_s: res.timings,
  wall_s: Math.round(wall * 10) / 10,
  realtime_factor: Math.round((wall / rec.duration) * 1000) / 1000,
  under_5_min: wall <= 300,
  ...score(doc, rec.truth),
};
writeFileSync(join(o.out, `result-${o.label}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
