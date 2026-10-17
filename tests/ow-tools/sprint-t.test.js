// Sprint T cross-cutting checks: residual fixes (F-005, F-006, SA-007 a,
// SA-008, F-010), the T5 meeting row (C24), stable reason codes (C22), the
// calls table against the CLI (C23), the network fence (C25, C27), the
// spawn-target ↔ manifest check (C28), the manifest's 1.1.0 sections (C30)
// and the version (C31).
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FLAGS, VERBS } from "../../plugins/ow-tools/lib/cli.mjs";
import { semverAtLeast } from "../../plugins/ow-tools/lib/doctor.mjs";
import { assertIgnored, withTmpSiblings } from "../../plugins/ow-tools/lib/guards.mjs";
import { clean, readiness } from "../../plugins/ow-tools/lib/status.mjs";
import { workstreamOf, writeTranscript } from "../../plugins/ow-tools/lib/transcribe.mjs";
import { PLUGIN, ROOT, cleanup, cli, gitRepo, stub, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
const DESIGN = readFileSync(join(ROOT, "docs", "plans", "2026-10-09-ow-tools-design.md"), "utf8");
const MANIFEST = readFileSync(join(PLUGIN, "SECURITY-MANIFEST.md"), "utf8");
const FENCE = join(ROOT, "tests", "ow-tools", "fence.mjs");
const libFiles = readdirSync(join(PLUGIN, "lib")).filter((f) => f.endsWith(".mjs"));
const lib = (f) => readFileSync(join(PLUGIN, "lib", f), "utf8");
const section = (start, end) => DESIGN.slice(DESIGN.indexOf(start), end ? DESIGN.indexOf(end, DESIGN.indexOf(start) + 1) : undefined);

// A PATH holding node and nothing else (no git).
function nodeOnly() {
  const bin = join(tempDir(), "node-only");
  mkdirSync(bin);
  symlinkSync(process.execPath, join(bin, "node"));
  return bin;
}

const DOC = {
  ow_artefact: "ow-tools/transcript", schema: 1, written_by: "ow-tools 1.1.0 (protocol 1)", workstream: "logs/acme", subject: "audio/x.m4a",
  created: "2026-10-16", clock: "tool", origin: "third-party (recording)", language: "en",
  source: { audio: "audio/x.m4a", sha256: "x", duration_s: 10 },
  pipeline: { normalise: "ffmpeg", transcribe: "whisper", diarize: "pyannote", merge: "ow-tools" },
  speakers: [{ id: "SPEAKER_00", role: null, talk_s: 5 }],
  segments: [{ start: 0, end: 5, speaker: "SPEAKER_00", text: "Hello.", overlap: false }],
};

describe("residual fixes", SPAWN, () => {
  it("F-005: without git, the ignore check is exit 3, never a pass", () => {
    const d = tempDir();
    gitRepo(d);
    const audio = write(join(d, "opchain-work", "intake", "acme", "audio", "call.m4a"), "x");
    const r = cli(["transcribe", audio, "--json"], { env: { PATH: nodeOnly() } });
    expect(r.status).toBe(3);
    expect(r.json.missing).toEqual(["git"]);
  });

  it("F-006: the guard covers the .tmp- sibling, and transcripts are written 0600", () => {
    const d = tempDir();
    gitRepo(d);
    writeFileSync(join(d, ".gitignore"), "transcript.json\ntranscript.md\n");
    const out = join(d, "opchain-work", "intake", "acme");
    let err;
    try {
      assertIgnored(withTmpSiblings([join(out, "transcript.json"), join(out, "transcript.md")]));
    } catch (e) {
      err = e;
    }
    expect(err.extra.reason).toBe("not-ignored");
    expect(err.extra.not_ignored).toEqual([`opchain-work/intake/acme/transcript.json.tmp-${process.pid}`, `opchain-work/intake/acme/transcript.md.tmp-${process.pid}`]);
    const plain = join(tempDir(), "ws");
    writeTranscript(plain, DOC);
    for (const f of ["transcript.json", "transcript.md"]) expect(statSync(join(plain, f)).mode & 0o777, f).toBe(0o600);
    expect(readdirSync(plain).sort()).toEqual(["transcript.json", "transcript.md"]);
  });

  it("SA-007 (a): speakers --set refuses to rewrite a transcript that would be committable", () => {
    const d = tempDir();
    gitRepo(d);
    const ws = join(d, "copied");
    writeTranscript(ws, DOC);
    const json = join(ws, "transcript.json");
    const before = readFileSync(json, "utf8");
    const r = cli(["speakers", json, "--set", "SPEAKER_00=you", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("not-ignored");
    expect(readFileSync(json, "utf8")).toBe(before);
    expect(cli(["speakers", json, "--json"]).status).toBe(0); // reading still works
  });

  it("SA-008: bidi controls and zero-width characters are stripped from the hook's lines", () => {
    expect(clean("intake/acme ‮evil‬ ok​⁦x⁩﻿")).toBe("intake/acme evil ok x");
    const d = tempDir();
    write(join(d, "opchain-work", "STATUS.md"), "2026-10-08 (clock: tool) | ow-start 1.1.0 | intake/acme/recap.md | next: ow-start extract ‮intake/acme‬ | awaiting: none\n");
    const r = cli(["hook", "session-start"], { input: JSON.stringify({ cwd: d }), env: { OW_TOOLS_HOME: join(d, "h") } });
    expect(r.stdout).toContain("next: ow-start extract intake/acme");
    expect(r.stdout).not.toMatch(/[‪-‮⁦-⁩​-‏﻿]/);
  });

  it("F-010: Typst's version gate is a full semver compare", () => {
    expect(semverAtLeast("1.0.0", "0.14.0")).toBe(true);
    expect(semverAtLeast("0.15.1", "0.14.0")).toBe(true);
    expect(semverAtLeast("0.14.0", "0.14.0")).toBe(true);
    expect(semverAtLeast("0.13.9", "0.14.0")).toBe(false);
    expect(semverAtLeast("0.9.0", "0.14.0")).toBe(false);
    expect(semverAtLeast("v0.14.0-rc1", "0.14.0")).toBe(true);
  });
});

describe("T5: the ow-start meeting row needs no code change (C24)", SPAWN, () => {
  function meetingRepo(lines) {
    const d = tempDir();
    gitRepo(d);
    if (lines) writeFileSync(join(d, ".gitignore"), lines);
    const mtg = join(d, "opchain-work", "logs", "acme", "meetings", "MTG-01");
    const audio = write(join(mtg, "audio", "x.m4a"), "x");
    return { d, mtg, audio };
  }
  const OW_START_LINES = "opchain-work/**/audio/\nopchain-work/**/transcript.*\n";

  it("the 1.0.0 guards accept the meeting path under ow-start's two .gitignore lines; workstream is logs/<workstream>", () => {
    const { mtg, audio } = meetingRepo(OW_START_LINES);
    expect(() => assertIgnored([audio, ...withTmpSiblings([join(mtg, "transcript.json"), join(mtg, "transcript.md")])])).not.toThrow();
    expect(workstreamOf(mtg)).toBe("logs/acme");
    // Through the CLI: the guards pass, so the run reaches the requirement check (exit 3), not a refusal.
    const r = cli(["transcribe", join(mtg, "audio") + "/", "--out", mtg + "/", "--json"], { env: { PATH: `${nodeOnly()}:/usr/bin:/bin`, OW_TOOLS_HOME: join(tempDir(), "h") } });
    expect(r.status, r.stdout).toBe(3);
    expect(r.json.missing).toContain("ffmpeg");
  });

  it("without the lines, the same call is refused (exit 4)", () => {
    const { mtg } = meetingRepo(null);
    const r = cli(["transcribe", join(mtg, "audio"), "--out", mtg, "--json"], { env: { PATH: `${nodeOnly()}:/usr/bin:/bin` } });
    expect(r.status).toBe(4);
    expect(r.json.not_ignored).toContain("opchain-work/logs/acme/meetings/MTG-01/audio/x.m4a");
  });

  it("design §4.2 carries the row exactly as the amendment gives it", () => {
    expect(section("### 4.2", "**Partial installs.**")).toContain("`ow-tools transcribe logs/<workstream>/meetings/MTG-nn/audio/<file> --out logs/<workstream>/meetings/MTG-nn/`");
  });
});

describe("reason codes and the calls table (C22, C23)", () => {
  const thrown = new Set();
  for (const f of libFiles) for (const m of lib(f).matchAll(/(?:refused|stepFail)\(\s*"([a-z-]+)"/g)) thrown.add(m[1]);
  const table = section("### 14.3", "### 14.4");
  const listed = new Set([...table.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]));

  it("C22: every reason code thrown in lib/ is in design §14.3 with an exit code and a next step, and every listed code is thrown", () => {
    expect(thrown.size).toBeGreaterThan(30);
    for (const c of thrown) expect(listed.has(c), c).toBe(true);
    for (const c of listed) expect(thrown.has(c), c).toBe(true);
    for (const row of table.split("\n").filter((l) => /^\| `/.test(l))) {
      const cells = row.split("|").map((x) => x.trim());
      expect(["4", "5"]).toContain(cells[2]);
      expect(cells[5].length, row).toBeGreaterThan(5);
    }
  });

  it("C23: every `ow-tools <verb> --flag` in design §4.2 is a real verb and flag", () => {
    const calls = section("### 4.2", "**Partial installs.**");
    const found = [...calls.matchAll(/`ow-tools ([a-z-]+)([^`]*)`/g)];
    expect(found.length).toBeGreaterThan(15);
    const notBuilt = new Set(["scan-secrets"]);
    for (const [, verb, rest] of found) {
      if (notBuilt.has(verb)) {
        expect(calls).toMatch(/\*\*not built\*\*: `scan-secrets`/);
        continue;
      }
      expect(VERBS, verb).toContain(verb);
      for (const [, flag] of rest.matchAll(/--([a-z][a-z-]*)/g)) expect(Object.keys(FLAGS), `${verb} --${flag}`).toContain(flag);
    }
    const verbsUsed = new Set(found.map((f) => f[1]));
    for (const v of ["transcribe", "speakers", "export", "calc", "capture", "health", "digest"]) expect(verbsUsed.has(v), v).toBe(true);
  });

  it("C22: every caller row has an absent-case; unstated ones are flagged for the caller's sprint", () => {
    const rows = section("### 4.2", "**Partial installs.**").split("\n").filter((l) => /\(1\.1\.0/.test(l));
    expect(rows.length).toBe(11);
    for (const r of rows) {
      const cells = r.split("|").map((x) => x.trim()).filter(Boolean);
      expect(cells.at(-1).length, r).toBeGreaterThan(20);
      if (/Not stated in the caller's design/.test(cells.at(-1))) expect(cells.at(-1)).toMatch(/\*\*proposed\*\*.*Flagged for Sprint/);
    }
  });
});

// ---- C25 (a, b), C27: the network fence ------------------------------------------
const NET_MODULES = /from "node:(net|tls|http|https|http2|dgram|dns)(\/promises)?"/;
function staticGraph(entry) {
  const seen = new Set();
  const visit = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const [, spec] of lib(f).matchAll(/^import [^;]*? from "\.\/([^"]+)";/gm)) visit(spec);
  };
  visit(entry);
  return seen;
}

describe("network fence (C25, C27)", SPAWN, () => {
  it("C25 (a): modules reachable from the no-network verbs import no network module and name no fetch or WebSocket", () => {
    const graph = staticGraph("cli.mjs");
    expect(graph.has("health.mjs")).toBe(false); // loaded only for the health verb
    expect(graph.has("net.mjs")).toBe(false);
    expect(graph).toContain("export.mjs");
    for (const f of graph) {
      const text = lib(f);
      expect(text, f).not.toMatch(NET_MODULES);
      expect(text, f).not.toMatch(/\bfetch\s*\(|globalThis\.fetch|\bWebSocket\b/);
    }
    // Only net.mjs (and health through it) touches the network modules.
    for (const f of libFiles) if (NET_MODULES.test(lib(f))) expect(["net.mjs"], f).toContain(f);
    expect(lib("cli.mjs")).toMatch(/await import\("\.\/health\.mjs"\)/);
  });

  const fenced = (args, extra = {}) => {
    const log = join(tempDir(), "fence.log");
    writeFileSync(log, "");
    const r = cli(args, { env: { NODE_OPTIONS: `--import ${FENCE}`, OW_FENCE_LOG: log, ...extra.env }, input: extra.input });
    return { ...r, attempts: readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
  };

  it("the fence itself records and blocks", () => {
    const r = spawnSync(process.execPath, ["--import", FENCE, "-e", "require('node:dns').lookup('example.com', () => {})"], { encoding: "utf8", env: { ...process.env, OW_FENCE_LOG: join(tempDir(), "f.log") } });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/network fence: dns\.lookup blocked/);
  });

  it("C25 (b): every no-network verb, doctor and the hook run with zero socket, DNS or fetch attempts", () => {
    const d = tempDir();
    const md = write(join(d, "doc.md"), "# Title\n\nText.\n");
    const sheet = join(d, "sheet");
    write(join(sheet, "A.csv"), "x,y\n1,\n");
    write(join(sheet, "model.md"), "## Sheet: A\n\n| Cell | Formula | Format |\n| --- | --- | --- |\n| B2 | =A2*2 | |\n");
    write(join(d, "opchain-work", "STATUS.md"), "2026-10-08 (clock: tool) | ow-start 1.1.0 | intake/acme/recap.md | next: ow-start extract intake/acme/ | awaiting: none\n");
    const items = write(join(d, "items.json"), JSON.stringify([{ label: "a", amount: "1.00" }]));
    const ledger = write(join(d, "l.json"), JSON.stringify({ schema: 1, months: [{ id: "M-01", included: 60, entries: [] }] }));
    const env = { OW_TOOLS_HOME: join(d, "home") };
    for (const args of [
      ["version", "--json"],
      ["doctor", "--json", "--quick"],
      ["digest", md, "--json"],
      ["digest", sheet, "--json"],
      ["calc", "today", "--json"],
      ["calc", "date", "--from", "2026-10-16", "--business-days", "3", "--json"],
      ["calc", "total", "--items", items, "--json"],
      ["calc", "split", "--total", "100", "--schedule", "50/50", "--json"],
      ["calc", "hours", "--ledger", ledger, "--rollover", "0.25,unused,1", "--json"],
      ["export", sheet, "--formats", "xlsx", "--json"],
      ["export", md, "--formats", "docx", "--json"],
      ["export", md, "--formats", "pptx", "--json"],
      ["export", md, "--json"],
      ["transcribe", join(d, "nope", "audio"), "--json"],
      ["speakers", join(d, "nope.json"), "--json"],
      ["capture", "--profiles", "--json"],
      ["help"],
    ]) {
      const r = fenced(args, { env });
      expect(r.attempts, args.join(" ")).toEqual([]);
      expect(r.stderr, args.join(" ")).not.toMatch(/network fence/);
    }
    const hook = fenced(["hook", "session-start"], { env, input: JSON.stringify({ cwd: d }) });
    expect(hook.attempts).toEqual([]);
    expect(hook.stdout).toContain("<ow-workstreams>");
  });

  it("C27: doctor is print-only: no stub package manager or browser is ever run, and it opens no socket", () => {
    const d = tempDir();
    const bin = join(d, "bin");
    mkdirSync(bin);
    const called = join(d, "called");
    for (const name of ["brew", "curl", "npm", "npx", "pip", "pipx", "uv", "google-chrome", "chromium", "pip-audit", "security"]) stub(bin, name, `echo ${name} >> "${called}"`);
    const r = fenced(["doctor", "--json"], { env: { PATH: `${bin}:${process.execPath.replace(/\/node$/, "")}:/bin:/usr/bin`, OW_TOOLS_HOME: join(d, "home") } });
    expect(r.status).toBe(0);
    expect(r.attempts).toEqual([]);
    const ran = existsSync(called) ? readFileSync(called, "utf8").trim().split("\n") : [];
    // uv --version is a version probe; nothing else of these may run.
    expect(ran.filter((x) => !["uv", "security"].includes(x))).toEqual([]);
    const byId = Object.fromEntries(r.json.checks.map((c) => [c.id, c]));
    expect(byId.browser).toMatchObject({ ok: true });
    expect(byId["pip-audit"]).toMatchObject({ ok: true, optional: true });
    const none = fenced(["doctor", "--json"], { env: { PATH: `${process.execPath.replace(/\/node$/, "")}:/nonexistent`, HOME: join(d, "nohome"), OW_TOOLS_HOME: join(d, "home") } });
    const ids = Object.fromEntries(none.json.checks.map((c) => [c.id, c]));
    expect(ids["pip-audit"]).toMatchObject({ ok: false, optional: true });
    expect(ids["pip-audit"].fix).toMatch(/^(brew install pip-audit|pipx install pip-audit)$/);
    if (!ids.browser.ok) expect(ids.browser.fix).toMatch(/^(brew install --cask google-chrome|install Google Chrome or Chromium with your package manager)$/);
    for (const c of none.json.checks) if (c.fix) expect(c.fix, c.id).not.toMatch(/\|\s*(sh|bash)\b/);
  });

  it("C27: the hook's readiness line is cheap (no browser start) and within 160 characters", () => {
    const d = tempDir();
    const bin = join(d, "bin");
    mkdirSync(bin);
    const called = join(d, "called");
    stub(bin, "google-chrome", `touch "${called}"`);
    const line = readiness({ PATH: `${bin}:/nonexistent`, HOME: join(d, "h"), OW_TOOLS_HOME: join(d, "h") });
    expect(existsSync(called)).toBe(false);
    expect(line).toMatch(/capture ready/);
    const worst = readiness({ PATH: "/nonexistent", HOME: join(d, "h"), OW_TOOLS_HOME: join(d, "h") }).replace("capture ready", "capture missing browser");
    expect(`  ${worst}`.length).toBeLessThanOrEqual(160);
  });
});

// ---- C28, C30, C31 -----------------------------------------------------------------
describe("manifest and version (C28, C30, C31)", SPAWN, () => {
  it("C28: every program lib/ runs appears in the manifest's Programs table; no browser download", () => {
    const programs = MANIFEST.slice(MANIFEST.indexOf("## Programs it runs"), MANIFEST.indexOf("## Network"));
    const targets = new Set();
    for (const f of libFiles) {
      for (const [, cmd] of lib(f).matchAll(/\brun\("([^"]+)"/g)) targets.add(cmd);
      for (const [, cmd] of lib(f).matchAll(/versionOf\("([^"]+)"/g)) targets.add(cmd);
      for (const [, cmd] of lib(f).matchAll(/spawn(?:Sync)?\("([^"]+)"/g)) targets.add(cmd);
    }
    expect([...targets].sort()).toEqual(["ffmpeg", "git", "pandoc", "pip-audit", "security", "typst", "unzip", "uv", "whisper-cli", "zip"]);
    for (const t of targets) expect(programs, t).toContain(`\`${t}`);
    expect(lib("cdp.mjs")).toMatch(/spawn\(binary, args/); // the browser: a found binary, never a fetched one
    expect(programs).toMatch(/Chrome or Chromium \(1\.1\.0\): `--remote-debugging-pipe`/);
    for (const f of libFiles) expect(lib(f), f).not.toMatch(/chrome-for-testing|storage\.googleapis\.com|download.*chromium/i);
  });

  it("C30: the manifest is current for 1.1.0 and its Network, Programs and Files sections say what C25 and C28 test", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "scripts", "gen-ow-tools-manifest.mjs"), "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(MANIFEST.split("\n")[0]).toBe("# ow-tools 1.1.0 — security manifest");
    const network = MANIFEST.slice(MANIFEST.indexOf("## Network"), MANIFEST.indexOf("## Files it writes"));
    for (const dest of ["api.osv.dev", "registry.npmjs.org", "data.iana.org", "allowed_origins", "--no-network"]) expect(network).toContain(dest);
    expect(network).toMatch(/\| every other verb \| Nothing \| Nothing\./);
    const files = MANIFEST.slice(MANIFEST.indexOf("## Files it writes"), MANIFEST.indexOf("## Files\n"));
    for (const w of ["<step-id>.png", "$OW_TOOLS_HOME/capture/<workstream>/", "rdap/dns.json", "<name>.export.json", "<name>.pptx", "<name>.xlsx"]) expect(files).toContain(w);
  });

  it("C31: version 1.1.0 everywhere, and version --json lists every capability", () => {
    const plugin = JSON.parse(readFileSync(join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
    const market = JSON.parse(readFileSync(join(PLUGIN, ".claude-plugin", "marketplace.json"), "utf8"));
    expect(plugin.version).toBe("1.1.0");
    expect(market.metadata.version).toBe("1.1.0");
    expect(market.plugins[0].version).toBe("1.1.0");
    const r = cli(["version", "--json"], { env: { OW_TOOLS_HOME: join(tempDir(), "h") } });
    expect(r.json.version).toBe("1.1.0");
    expect(Object.keys(r.json.capabilities).sort()).toEqual(["calc", "capture", "digest", "export", "health", "pptx", "transcribe", "xlsx"]);
    for (const c of ["calc", "digest", "xlsx", "health"]) expect(r.json.capabilities[c].ready, c).toBe(true);
    expect(cli(["help"]).stdout).toMatch(/ow-tools 1\.1\.0/);
  });

  it("README and /ow-tools say what health and capture send", () => {
    const readme = readFileSync(join(PLUGIN, "README.md"), "utf8");
    expect(readme).not.toMatch(/never sends? (audio or )?text anywhere/);
    for (const s of ["api.osv.dev", "registry.npmjs.org", "data.iana.org", "--no-network", "--delete-profile"]) expect(readme).toContain(s);
    const skill = readFileSync(join(PLUGIN, "skills", "ow-tools", "SKILL.md"), "utf8");
    expect(skill).toMatch(/ow-tools health/);
    expect(skill).toMatch(/ow-tools capture/);
  });

  it("the plugin is still Node built-ins and ./ only, with no package.json", () => {
    expect(existsSync(join(PLUGIN, "package.json"))).toBe(false);
    for (const f of libFiles) {
      for (const [, spec] of lib(f).matchAll(/from "([^"]+)"/g)) expect(spec.startsWith("node:") || spec.startsWith("./"), `${f}: ${spec}`).toBe(true);
      for (const [, spec] of lib(f).matchAll(/import\("([^"]+)"\)/g)) expect(spec.startsWith("./"), `${f}: ${spec}`).toBe(true);
    }
  });
});

describe("round 2: what the help and doctor say", SPAWN, () => {
  it("Bug 13: help network names pip-audit's own requests and says where they go (OD-7)", () => {
    const r = cli(["help", "network"]);
    expect(r.stdout).toMatch(/pip-audit[\s\S]*api\.osv\.dev itself \(--vulnerability-service osv\)/);
  });

  it("SA-011: doctor tells a macOS user to choose Always Allow for the browser's keychain item", () => {
    const d = tempDir();
    const bin = join(d, "bin");
    mkdirSync(bin);
    stub(bin, "google-chrome", "exit 0");
    const r = cli(["doctor", "--json", "--quick"], { env: { PATH: `${bin}:${process.execPath.replace(/\/node$/, "")}:/bin:/usr/bin`, OW_TOOLS_HOME: join(d, "home") } });
    const browser = r.json.checks.find((c) => c.id === "browser");
    if (process.platform === "darwin") expect(browser.detail).toMatch(/Chrome Safe Storage.*Always Allow/);
    expect(readFileSync(join(PLUGIN, "README.md"), "utf8")).toMatch(/Always Allow/);
  });
});
