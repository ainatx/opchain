// `ow-tools doctor` (design §6): check every requirement, print the command
// that fixes it. Print-only (decision 4): nothing here installs, downloads or
// runs a package manager. The Hugging Face token is checked for presence only.
import { statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import {
  DIARIZATION_MODEL,
  KEYCHAIN_SERVICE,
  PY_PROJECT,
  VERSION,
  WHISPER_MODELS,
  WHISPER_MODEL_URL,
  dataHome,
  diarizationCached,
  hfHome,
  isFile,
  modelPath,
  run,
  sha256File,
  venvDir,
  which,
} from "./core.mjs";

const mac = () => platform() === "darwin";
const pkg = (formula) => (mac() ? `brew install ${formula}` : `install ${formula} with your package manager`);
const q = (s) => `"${s}"`;

function versionOf(cmd, args, re) {
  const r = run(cmd, args);
  return (r.stdout + r.stderr).match(re)?.[1] || null;
}

function tokenStored() {
  if (mac()) {
    // No -w: presence only. The value is never read here.
    return run("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE]).status === 0;
  }
  try {
    const st = statSync(join(homedir(), ".config", "ow-tools", "hf-token"));
    return st.isFile() && (st.mode & 0o077) === 0;
  } catch {
    return false;
  }
}

export function fetchCommand(env = process.env) {
  const token = mac()
    ? `"$(security find-generic-password -s ${KEYCHAIN_SERVICE} -w)"`
    : '"$(cat ~/.config/ow-tools/hf-token)"';
  return [
    `HF_TOKEN=${token}`,
    `HF_HOME=${q(hfHome(env))}`,
    `UV_PROJECT_ENVIRONMENT=${q(venvDir(env))}`,
    `uv run --frozen --project ${q(PY_PROJECT)} python ${q(join(PY_PROJECT, "diarize.py"))} --fetch`,
  ].join(" ");
}

export function checks({ verifyModel = true, env = process.env } = {}) {
  const out = [];
  const add = (id, caps, ok, detail, fix) => out.push({ id, for: caps, ok, detail, fix: ok ? null : fix });
  const node = process.versions.node;
  add("node", ["all"], Number(node.split(".")[0]) >= 20, `Node ${node}`, pkg("node"));

  const ff = which("ffmpeg", env) && versionOf("ffmpeg", ["-version"], /ffmpeg version (\S+)/);
  add("ffmpeg", ["transcribe"], Boolean(ff), ff ? `ffmpeg ${ff}` : "not found", pkg("ffmpeg"));
  const wc = which("whisper-cli", env) && versionOf("whisper-cli", ["--version"], /version:?\s*(\S+)/);
  add("whisper-cli", ["transcribe"], Boolean(wc), wc ? `whisper.cpp ${wc}` : "not found", pkg("whisper-cpp"));

  const m = WHISPER_MODELS["large-v3-turbo"];
  const mp = modelPath("large-v3-turbo", env);
  let modelOk = isFile(mp) && statSync(mp).size === m.bytes;
  let modelDetail = modelOk ? "present" : "not found";
  if (modelOk && verifyModel) {
    modelOk = sha256File(mp) === m.sha256;
    modelDetail = modelOk ? "present, SHA-256 matches" : "present but SHA-256 does not match; download it again";
  }
  add("whisper-model", ["transcribe"], modelOk, `${m.file}: ${modelDetail}`,
    `mkdir -p ${q(join(dataHome(env), "models"))} && curl -fL -o ${q(mp)} ${WHISPER_MODEL_URL(m.file)}   # ~1.6 GB, not gated`);

  const uv = which("uv", env) && versionOf("uv", ["--version"], /uv (\S+)/);
  add("uv", ["transcribe"], Boolean(uv), uv ? `uv ${uv}` : "not found", pkg("uv"));
  const venvOk = isFile(join(venvDir(env), "bin", "python"));
  add("python-env", ["transcribe"], venvOk, venvOk ? `Python 3.12 environment at ${venvDir(env)}` : "not built for this plugin version",
    `UV_PROJECT_ENVIRONMENT=${q(venvDir(env))} uv sync --frozen --project ${q(PY_PROJECT)}   # fetches Python 3.12 and pyannote (~1 GB); your python3 is untouched`);

  const cached = diarizationCached(env);
  if (!cached) {
    const tok = tokenStored();
    add("hf-token", ["transcribe"], tok, tok ? "stored outside every repository" : "not stored",
      [
        `1. Sign in at huggingface.co and accept the terms of https://huggingface.co/${DIARIZATION_MODEL}`,
        "2. Create a read token at https://huggingface.co/settings/tokens",
        mac()
          ? `3. security add-generic-password -s ${KEYCHAIN_SERVICE} -a "$USER" -w   # prompts for the token`
          : "3. mkdir -p ~/.config/ow-tools && (umask 077; cat > ~/.config/ow-tools/hf-token)   # paste, then Ctrl-D",
      ].join("\n"));
  }
  add("speaker-model", ["transcribe"], cached, cached ? `${DIARIZATION_MODEL} cached; runs offline` : "not fetched",
    `${fetchCommand(env)}   # one time; afterwards the token can be deleted`);

  const pd = which("pandoc", env) && versionOf("pandoc", ["--version"], /pandoc (\S+)/);
  add("pandoc", ["export"], Boolean(pd), pd ? `pandoc ${pd}` : "not found", pkg("pandoc"));
  const ty = which("typst", env) && versionOf("typst", ["--version"], /typst (\S+)/);
  const tyOk = Boolean(ty) && ty.split(".").map(Number)[1] >= 14;
  add("typst", ["export"], tyOk, ty ? `typst ${ty}${tyOk ? "" : " (needs 0.14 or newer for tagged PDF/UA-1)"}` : "not found", pkg("typst"));
  for (const z of ["zip", "unzip"]) add(z, ["export"], Boolean(which(z, env)), which(z, env) ? "present" : "not found", pkg(z));
  return out;
}

export function capabilities(list) {
  const caps = {};
  for (const cap of ["transcribe", "export"]) {
    const miss = list.filter((c) => (c.for.includes(cap) || c.for.includes("all")) && !c.ok).map((c) => c.id);
    caps[cap] = miss.length ? { ready: false, missing: miss } : { ready: true };
  }
  caps.calc = { ready: true };
  return caps;
}

export function doctor(opts = {}) {
  const list = checks(opts);
  return {
    status: list.every((c) => c.ok) ? "ready" : "incomplete",
    version: VERSION,
    data_home: dataHome(opts.env),
    capabilities: capabilities(list),
    checks: list,
    note: "ow-tools installs nothing itself. Run the printed commands in your own terminal, then run ow-tools doctor again.",
  };
}

export function doctorText(r) {
  const lines = [`ow-tools ${r.version} — ${r.status}`, `data folder: ${r.data_home}`, ""];
  for (const [cap, s] of Object.entries(r.capabilities)) lines.push(`${cap}: ${s.ready ? "ready" : `missing ${s.missing.join(", ")}`}`);
  lines.push("");
  for (const c of r.checks) {
    lines.push(`${c.ok ? "ok  " : "MISS"} ${c.id.padEnd(14)} ${c.detail}`);
    if (c.fix) lines.push(...c.fix.split("\n").map((l) => `       fix: ${l}`));
  }
  lines.push("", r.note);
  return lines.join("\n");
}
