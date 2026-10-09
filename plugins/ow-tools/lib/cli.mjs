// ow-tools command line (design §4). One verb per call; `--json` prints one
// JSON object with a `status` field; exit codes are the contract in core.mjs.
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { EXIT, OwError, VERSION, usage } from "./core.mjs";
import { calc } from "./calc.mjs";
import { capabilities, checks, doctor, doctorText } from "./doctor.mjs";
import { exportDoc } from "./export.mjs";
import { sessionStart } from "./status.mjs";
import { speakers, transcribe } from "./transcribe.mjs";

const HELP = `ow-tools ${VERSION} — the code add-on for the ow- skills (Claude Code only)

  ow-tools version [--json]
  ow-tools doctor [--json] [--quick]
  ow-tools transcribe <workstream>/audio/[<file>] [--out DIR] [--speakers N] [--banner TEXT]
                      [--language auto|en|…] [--model large-v3-turbo|medium] [--device cpu|mps] [--force]
  ow-tools speakers <transcript.json> [--set SPEAKER_00=<role> …]
  ow-tools export <file.md> [--brand brand.yaml] [--out DIR] [--formats pdf,docx]
  ow-tools calc today [--tz ZONE]
  ow-tools calc date --from YYYY-MM-DD (--days N | --business-days N) [--holidays D1,D2,…]
  ow-tools calc total --items items.json [--currency USD]
  ow-tools calc split --total 12000.00 --schedule 40/40/20

Exit codes: 0 done · 2 usage · 3 a requirement is missing · 4 refused by a rule · 5 a tool failed.
ow-tools never installs anything, never sends audio or text anywhere, and never prints a credential.`;

const FLAGS = {
  json: "bool", quick: "bool", force: "bool",
  out: "str", speakers: "int", language: "str", model: "str", device: "str", banner: "str",
  set: "list", brand: "str", formats: "csv",
  tz: "str", from: "str", days: "int", "business-days": "int", holidays: "csv",
  items: "str", currency: "str", total: "str", schedule: "str",
};

export function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      pos.push(a);
      continue;
    }
    const [k, inline] = a.slice(2).split(/=(.*)/s, 2);
    const kind = FLAGS[k];
    if (!kind) throw usage(`unknown option --${k}`);
    if (kind === "bool") {
      opts[k] = true;
      continue;
    }
    const v = inline ?? argv[++i];
    if (v === undefined) throw usage(`--${k} needs a value`);
    if (kind === "int") {
      if (!/^-?\d+$/.test(v)) throw usage(`--${k} must be a whole number`);
      opts[k] = Number(v);
    } else if (kind === "list") (opts[k] ||= []).push(v);
    else if (kind === "csv") opts[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
    else opts[k] = v;
  }
  return { pos, opts };
}

function print(result, json, text) {
  process.stdout.write(json ? `${JSON.stringify(result, null, 2)}\n` : `${text ?? JSON.stringify(result, null, 2)}\n`);
}

function transcribeText(r) {
  const lines = [`Transcript written: ${r.transcript.md}`, `Recording: ${Math.round(r.duration_s)} s · took ${Object.entries(r.timings).map(([k, v]) => `${k.replace("_s", "")} ${v} s`).join(", ")}`, ""];
  lines.push(...samplesText(r.samples), "", `Next: ${r.next}`);
  return lines.join("\n");
}

function samplesText(samples) {
  const out = [];
  for (const [id, lines] of Object.entries(samples)) {
    out.push(`${id}:`);
    for (const l of lines) out.push(`  [${new Date(l.start * 1000).toISOString().slice(14, 19)}] ${l.text}`);
  }
  return out;
}

export async function main(argv, { stdin } = {}) {
  const [verb, ...rest] = argv;
  if (!verb || verb === "help" || verb === "--help" || verb === "-h") {
    print({ status: "help", text: HELP }, false, HELP);
    return EXIT.OK;
  }
  if (verb === "hook") {
    // SessionStart: never fails the session; prints nothing on any error.
    try {
      const input = stdin ? JSON.parse(stdin || "{}") : {};
      process.stdout.write(sessionStart(input));
    } catch {
      /* silent by design */
    }
    return EXIT.OK;
  }
  const { pos, opts } = parseArgs(rest);
  const json = Boolean(opts.json);
  switch (verb) {
    case "version": {
      const caps = capabilities(checks({ verifyModel: false }));
      const r = { status: "ok", name: "ow-tools", version: VERSION, node: process.versions.node, capabilities: caps };
      print(r, json, `ow-tools ${VERSION} · ${Object.entries(caps).map(([k, v]) => `${k} ${v.ready ? "ready" : "missing " + v.missing.join(", ")}`).join(" · ")}`);
      return EXIT.OK;
    }
    case "doctor": {
      const r = doctor({ verifyModel: !opts.quick });
      print(r, json, doctorText(r));
      return EXIT.OK;
    }
    case "transcribe": {
      const log = json ? () => {} : (m) => process.stderr.write(`ow-tools: ${m}…\n`);
      const r = await transcribe({ audio: pos[0], ...opts }, log);
      print(r, json, transcribeText(r));
      return EXIT.OK;
    }
    case "speakers": {
      const r = speakers({ transcript: pos[0], set: opts.set || [] });
      const text = [
        ...r.speakers.map((s) => `${s.id}: ${s.role || "not yet confirmed"}`),
        "",
        ...samplesText(r.samples),
        ...(r.unconfirmed.length ? ["", `Not yet confirmed: ${r.unconfirmed.join(", ")}`] : []),
      ].join("\n");
      print(r, json, text);
      return EXIT.OK;
    }
    case "export": {
      const r = await exportDoc({ file: pos[0], brand: opts.brand, out: opts.out, formats: opts.formats });
      const text = [
        `Exported "${r.title}":`,
        ...Object.values(r.outputs).map((p) => `  ${p}`),
        `PDF SHA-256: ${r.sha256.pdf || "no PDF"} · source SHA-256: ${r.sha256.source}`,
        `Brand: ${r.brand}`,
        ...r.notes.map((n) => `Note: ${n}`),
        `Checked: ${r.checked.join("; ")}.`,
        r.statement,
      ].join("\n");
      print(r, json, text);
      return EXIT.OK;
    }
    case "calc": {
      const [sub] = pos;
      const r = calc(sub, {
        tz: opts.tz,
        from: opts.from,
        days: opts.days,
        businessDays: opts["business-days"],
        holidays: opts.holidays || [],
        items: opts.items,
        currency: opts.currency,
        total: opts.total,
        schedule: opts.schedule,
      });
      print({ status: "ok", ...r }, json, JSON.stringify(r));
      return EXIT.OK;
    }
    default:
      throw usage(`unknown verb "${verb}"; run ow-tools help`);
  }
}

export async function run(argv) {
  const json = argv.includes("--json");
  try {
    const stdin = argv[0] === "hook" && !process.stdin.isTTY ? readFileSync(0, "utf8") : "";
    return await main(argv, { stdin });
  } catch (err) {
    const code = err instanceof OwError ? err.code : EXIT.FAILED;
    const message = err instanceof OwError ? err.message : `unexpected error: ${err?.message || err}`;
    const status = { 2: "usage", 3: "missing", 4: "refused", 5: "failed" }[code];
    if (json) process.stdout.write(`${JSON.stringify({ status, message, ...(err.extra || {}) }, null, 2)}\n`);
    else process.stderr.write(`ow-tools: ${message}\n`);
    return code;
  }
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (invokedDirectly) {
  if (Number(process.versions.node.split(".")[0]) < 20) {
    process.stderr.write("ow-tools: Node.js 20 or newer is required\n");
    process.exitCode = EXIT.MISSING;
  } else {
    process.exitCode = await run(process.argv.slice(2));
  }
}
