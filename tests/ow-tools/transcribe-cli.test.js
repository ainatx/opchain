// ow-tools design §5.1 and §8: the transcription pipeline end to end against
// stub binaries, plus every privacy refusal. No real model runs here; the
// speed spike (scripts/ow-tools-spike.mjs) covers the real tools.
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { PLUGIN, cleanup, cli, git, gitRepo, sparseFile, stub, tempDir, write } from "./helpers.js";
import { DIARIZATION_REVISION, WHISPER_MODELS } from "../../plugins/ow-tools/lib/core.mjs";

// Each case spawns bin/ow-tools (and git/stubs): ~0.2-0.6 s idle, several
// times that under machine load, so these suites get 30 s, not vitest's 5 s.
const SPAWN = { timeout: 30_000 };

afterAll(cleanup);

const NODE_DIR = dirname(process.execPath);
const lockHash = createHash("sha256").update(readFileSync(join(PLUGIN, "python", "uv.lock"))).digest("hex").slice(0, 12);

const WHISPER_JSON = JSON.stringify({
  result: { language: "en" },
  transcription: [
    { offsets: { from: 0, to: 3000 }, text: " Walk me through the last order.", tokens: [
      { text: " Walk", offsets: { from: 100, to: 400 } }, { text: " me", offsets: { from: 400, to: 600 } },
      { text: " through", offsets: { from: 600, to: 900 } }, { text: " the", offsets: { from: 900, to: 1000 } },
      { text: " last", offsets: { from: 1000, to: 1400 } }, { text: " order.", offsets: { from: 1400, to: 2000 } },
    ] },
    { offsets: { from: 3000, to: 6000 }, text: " We do about forty a week.", tokens: [
      { text: " We", offsets: { from: 3100, to: 3300 } }, { text: " do", offsets: { from: 3300, to: 3500 } },
      { text: " about", offsets: { from: 3500, to: 3900 } }, { text: " forty", offsets: { from: 3900, to: 4400 } },
      { text: " a", offsets: { from: 4400, to: 4500 } }, { text: " week.", offsets: { from: 4500, to: 5200 } },
    ] },
  ],
});
const TURNS_JSON = JSON.stringify({
  model: "pyannote/speaker-diarization-community-1", pyannote_audio: "4.0.7-stub", device: "cpu", seconds: 0.1,
  turns: [{ start: 0, end: 2.5, speaker: "SPEAKER_00" }, { start: 2.8, end: 6, speaker: "SPEAKER_01" }],
  exclusive_turns: [{ start: 0, end: 2.6, speaker: "SPEAKER_00" }, { start: 2.6, end: 6, speaker: "SPEAKER_01" }],
});

// A machine with every requirement, all stubbed. Returns paths and env.
function verifiedSidecar(modelFile) {
  const st = statSync(modelFile);
  writeFileSync(`${modelFile}.verified`, JSON.stringify({ size: st.size, mtimeMs: st.mtimeMs, ino: st.ino, sha256: WHISPER_MODELS["large-v3-turbo"].sha256 }));
}

function machine({ ffmpegFails = false, withWhisper = true, verifiedModel = true } = {}) {
  const d = tempDir();
  const bin = join(d, "bin");
  mkdirSync(bin);
  const home = join(d, "home");
  const tmp = join(d, "tmp");
  mkdirSync(tmp);
  const envLog = join(d, "uv-env.txt");
  writeFileSync(join(d, "whisper.json"), WHISPER_JSON);
  writeFileSync(join(d, "turns.json"), TURNS_JSON);
  stub(bin, "ffmpeg", ffmpegFails
    ? 'echo "Invalid data found when processing input" >&2; exit 1'
    : `[ "$1" = "-version" ] && { echo "ffmpeg version 9.9-stub"; exit 0; }\nprintf '%s\\n' "$@" > "${join(d, "ffmpeg-argv.txt")}"\nfor a; do last="$a"; done\nhead -c 320044 /dev/zero > "$last"`);
  if (withWhisper) {
    stub(bin, "whisper-cli", `[ "$1" = "--version" ] && { echo "whisper.cpp version: 0.0-stub"; exit 0; }
while [ $# -gt 0 ]; do [ "$1" = "-of" ] && base="$2"; shift; done
cp "${join(d, "whisper.json")}" "$base.json"`);
  }
  stub(bin, "uv", `env > "${envLog}"
printf '%s\\n' "$@" > "${join(d, "uv-argv.txt")}"
next=""; for a; do
  if [ "$next" = wav ]; then next=out; continue; fi
  if [ "$next" = out ]; then cp "${join(d, "turns.json")}" "$a"; next=done; fi
  case "$a" in *diarize.py) next=wav;; esac
done`);
  sparseFile(join(home, "models", "ggml-large-v3-turbo.bin"), 1624555275);
  // A machine whose Whisper model passed the full SHA-256 check once (SA-004):
  // the sidecar ow-tools writes after that check, for this exact file.
  if (verifiedModel) verifiedSidecar(join(home, "models", "ggml-large-v3-turbo.bin"));
  write(join(home, `venv-${lockHash}`, "bin", "python"), "");
  mkdirSync(join(home, "hf", "hub", "models--pyannote--speaker-diarization-community-1", "snapshots", DIARIZATION_REVISION), { recursive: true });
  const env = {
    PATH: `${bin}:${NODE_DIR}:/usr/bin:/bin`,
    OW_TOOLS_HOME: home,
    TMPDIR: tmp,
    HF_TOKEN: "planted-token-must-not-pass",
    TZ: "UTC",
  };
  const ws = join(d, "opchain-work", "intake", "meridian-tile");
  const audio = write(join(ws, "audio", "fit-call.m4a"), "not really audio");
  return { d, ws, audio, env, envLog, tmp };
}

describe("ow-tools transcribe", SPAWN, () => {
  it("writes transcript.json and transcript.md beside the audio folder", () => {
    const m = machine();
    const r = cli(["transcribe", m.audio, "--speakers", "2", "--json"], { env: m.env });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.json).toMatchObject({ status: "done", speakers: ["SPEAKER_00", "SPEAKER_01"], duration_s: 10 });
    const doc = JSON.parse(readFileSync(join(m.ws, "transcript.json"), "utf8"));
    expect(doc).toMatchObject({
      ow_artefact: "ow-tools/transcript",
      schema: 1,
      written_by: expect.stringMatching(/^ow-tools \d+\.\d+\.\d+ \(protocol 1\)$/),
      workstream: "intake/meridian-tile",
      subject: "audio/fit-call.m4a",
      origin: "third-party (recording)",
      clock: "tool",
      language: "en",
      source: { audio: "audio/fit-call.m4a", duration_s: 10 },
    });
    expect(doc.segments.map((s) => [s.speaker, s.text])).toEqual([
      ["SPEAKER_00", "Walk me through the last order."],
      ["SPEAKER_01", "We do about forty a week."],
    ]);
    expect(JSON.stringify(doc)).not.toContain(m.d); // relative paths only (R2)
    const md = readFileSync(join(m.ws, "transcript.md"), "utf8");
    expect(md).toMatch(/^---\now_artefact: ow-tools\/transcript\nschema: 1\n/);
    expect(md).toContain("[00:03] SPEAKER_01: We do about forty a week.");
    expect(r.json.samples.SPEAKER_01[0].text).toBe("We do about forty a week.");
  });

  it("runs speaker separation offline, without the token, and removes its temp folder", () => {
    const m = machine();
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(0);
    const env = readFileSync(m.envLog, "utf8");
    expect(env).toMatch(/^HF_HUB_OFFLINE=1$/m);
    expect(env).toMatch(/^TRANSFORMERS_OFFLINE=1$/m);
    expect(env).toMatch(/^UV_OFFLINE=1$/m);
    expect(env).not.toContain("planted-token-must-not-pass");
    expect(readdirSync(m.tmp)).toEqual([]);
  });

  // SA-002: ffmpeg picks a demuxer from content, so a "recording" that is a
  // playlist could reach other files or the network without the whitelist.
  // F-004: uv run must not sync (install into) the environment.
  it("limits ffmpeg to the local file protocol and runs uv without syncing", () => {
    const m = machine();
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(0);
    const ff = readFileSync(join(m.d, "ffmpeg-argv.txt"), "utf8").trim().split("\n");
    const w = ff.indexOf("-protocol_whitelist");
    expect(w).toBeGreaterThanOrEqual(0);
    expect(ff[w + 1]).toBe("file");
    expect(w).toBeLessThan(ff.indexOf("-i"));
    const uv = readFileSync(join(m.d, "uv-argv.txt"), "utf8").trim().split("\n");
    expect(uv.slice(0, 3)).toEqual(["run", "--frozen", "--no-sync"]);
  });

  // SA-004: the speaker model is loaded at one pinned revision, and the
  // Whisper model's hash is checked before every run, not only by doctor.
  it("passes the pinned pyannote revision to diarize.py and treats another cached revision as not fetched", () => {
    const m = machine();
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(0);
    const uv = readFileSync(join(m.d, "uv-argv.txt"), "utf8").trim().split("\n");
    expect(uv[uv.indexOf("--revision") + 1]).toBe(DIARIZATION_REVISION);
    expect(DIARIZATION_REVISION).toMatch(/^[0-9a-f]{40}$/);
    const snapshots = join(m.env.OW_TOOLS_HOME, "hf", "hub", "models--pyannote--speaker-diarization-community-1", "snapshots");
    rmSync(join(snapshots, DIARIZATION_REVISION), { recursive: true });
    mkdirSync(join(snapshots, "0000000000000000000000000000000000000000"), { recursive: true });
    const r = cli(["transcribe", m.audio, "--force", "--json"], { env: m.env });
    expect(r.status).toBe(3);
    expect(r.json.missing).toContain("speaker model pyannote/speaker-diarization-community-1");
  });

  it("hashes the Whisper model before a run and refuses one whose SHA-256 does not match (exit 3)", () => {
    const m = machine({ verifiedModel: false }); // right size, wrong bytes, no earlier verification
    const r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status).toBe(3);
    expect(r.json.missing.join("\n")).toMatch(/Whisper model large-v3-turbo \(present but SHA-256 does not match/);
    expect(existsSync(join(m.ws, "transcript.json"))).toBe(false);
    // A sidecar for another file (size, time or inode differ) is not trusted either.
    const model = join(m.env.OW_TOOLS_HOME, "models", "ggml-large-v3-turbo.bin");
    const st = statSync(model);
    writeFileSync(`${model}.verified`, JSON.stringify({ size: st.size, mtimeMs: st.mtimeMs + 1, ino: st.ino, sha256: WHISPER_MODELS["large-v3-turbo"].sha256 }));
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(3);
  });

  it("takes the audio/ folder ow-start names when it holds one recording, and asks which when it holds two", () => {
    const m = machine();
    let r = cli(["transcribe", join(m.ws, "audio"), "--banner", "CONFIDENTIAL", "--json"], { env: m.env });
    expect(r.status, r.stdout).toBe(0);
    expect(readFileSync(join(m.ws, "transcript.md"), "utf8").split("\n")[10]).toBe("CONFIDENTIAL");
    write(join(m.ws, "audio", "second-call.mp4"), "x");
    r = cli(["transcribe", join(m.ws, "audio"), "--force", "--json"], { env: m.env });
    expect(r.status).toBe(2);
    expect(r.json.message).toMatch(/holds 2 recordings; name one: fit-call\.m4a, second-call\.mp4/);
  });

  it("refuses a recording outside an audio/ folder (exit 4)", () => {
    const m = machine();
    const elsewhere = write(join(m.ws, "fit-call.m4a"), "x");
    const r = cli(["transcribe", elsewhere, "--json"], { env: m.env });
    expect(r.status).toBe(4);
    expect(r.json.message).toMatch(/folder named "audio"/);
  });

  it("refuses to write a committable transcript inside a git repo, then accepts once ignored", () => {
    const m = machine();
    gitRepo(m.d);
    let r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status).toBe(4);
    expect(r.json.add_to_gitignore).toEqual(["opchain-work/**/audio/", "opchain-work/**/transcript.*"]);
    expect(existsSync(join(m.ws, "transcript.json"))).toBe(false);
    writeFileSync(join(m.d, ".gitignore"), "opchain-work/**/audio/\nopchain-work/**/transcript.*\n");
    r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status, r.stdout).toBe(0);
  });

  it("refuses a recording that is already committed", () => {
    const m = machine();
    gitRepo(m.d);
    git(m.d, "add", "-f", m.audio);
    writeFileSync(join(m.d, ".gitignore"), "opchain-work/**/audio/\nopchain-work/**/transcript.*\n");
    const r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status).toBe(4);
    expect(r.json.not_ignored).toEqual(["opchain-work/intake/meridian-tile/audio/fit-call.m4a"]);
  });

  it("won't overwrite a transcript without --force, and takes --out for a second recording", () => {
    const m = machine();
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(0);
    expect(cli(["transcribe", m.audio, "--json"], { env: m.env }).status).toBe(4);
    const out = join(m.d, "opchain-work", "plans", "meridian-tile", "workshops", "W1");
    const r = cli(["transcribe", m.audio, "--out", out, "--json"], { env: m.env });
    expect(r.status).toBe(0);
    expect(JSON.parse(readFileSync(join(out, "transcript.json"), "utf8"))).toMatchObject({
      workstream: "plans/meridian-tile",
      source: { audio: "../../../../intake/meridian-tile/audio/fit-call.m4a" },
    });
  });

  it("names what is missing (exit 3) and writes nothing", () => {
    const m = machine({ withWhisper: false });
    const r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status).toBe(3);
    expect(r.json.missing).toEqual(["whisper-cli (whisper.cpp)"]);
    expect(existsSync(join(m.ws, "transcript.md"))).toBe(false);
  });

  it("reports a tool failure in one line (exit 5) and still removes the temp folder", () => {
    const m = machine({ ffmpegFails: true });
    const r = cli(["transcribe", m.audio, "--json"], { env: m.env });
    expect(r.status).toBe(5);
    expect(r.json.message).toBe("ffmpeg could not read the recording: Invalid data found when processing input");
    expect(readdirSync(m.tmp)).toEqual([]);
  });
});

describe("ow-tools speakers", SPAWN, () => {
  it("records the roles the user types and re-renders the transcript", () => {
    const m = machine();
    cli(["transcribe", m.audio, "--json"], { env: m.env });
    const json = join(m.ws, "transcript.json");
    let r = cli(["speakers", json, "--json"], { env: m.env });
    expect(r.json.unconfirmed).toEqual(["SPEAKER_00", "SPEAKER_01"]);
    r = cli(["speakers", json, "--set", "SPEAKER_00=you", "--set", "SPEAKER_01=client (owner)", "--json"], { env: m.env });
    expect(r.status).toBe(0);
    expect(r.json.unconfirmed).toEqual([]);
    const md = readFileSync(join(m.ws, "transcript.md"), "utf8");
    expect(md).toContain("[00:03] client (owner): We do about forty a week.");
    expect(md).toContain("- SPEAKER_00: you");
  });

  it.each([
    [["--set", "SPEAKER_09=you"], /no speaker SPEAKER_09/],
    [["--set", "SPEAKER_00=you | client"], /no line breaks/],
    [["--set", "you"], /SPEAKER_NN=<role>/],
  ])("refuses %j (exit 2)", (args, re) => {
    const m = machine();
    cli(["transcribe", m.audio, "--json"], { env: m.env });
    const r = cli(["speakers", join(m.ws, "transcript.json"), ...args, "--json"], { env: m.env });
    expect(r.status).toBe(2);
    expect(r.json.message).toMatch(re);
  });
});
