// Shared fixtures for the ow-tools suites. Every test works in its own temp
// folder; nothing touches the real ~/.local/share/ow-tools.
import { spawnSync } from "node:child_process";
import { chmodSync, closeSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync, ftruncateSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync, crc32 } from "node:zlib";

export const ROOT = join(import.meta.dirname, "..", "..");
export const PLUGIN = join(ROOT, "plugins", "ow-tools");
export const BIN = join(PLUGIN, "bin", "ow-tools");

const scratch = [];
export function tempDir(prefix = "owt-") {
  const d = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(d);
  return d;
}
export function cleanup() {
  while (scratch.length) rmSync(scratch.pop(), { recursive: true, force: true });
}

export function write(path, text) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
  return path;
}

export function stub(dir, name, script) {
  const p = join(dir, name);
  writeFileSync(p, `#!/bin/sh\n${script}\n`);
  chmodSync(p, 0o755);
  return p;
}

// A file of the exact size without writing its bytes (sparse on APFS/ext4).
export function sparseFile(path, bytes) {
  mkdirSync(join(path, ".."), { recursive: true });
  const fd = openSync(path, "w");
  ftruncateSync(fd, bytes);
  closeSync(fd);
}

export function cli(args, { env = {}, input, cwd } = {}) {
  const r = spawnSync(BIN, args, {
    encoding: "utf8",
    cwd,
    input,
    env: { ...process.env, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* text mode */
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

export function git(cwd, ...args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}
export function gitRepo(dir) {
  git(dir, "init", "-q");
  return dir;
}

export function png(w = 40, h = 20, rgb = [0x1f, 0x4e, 0x79]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// All PDF text an inspector would see: raw bytes plus every Flate stream.
export function pdfText(buf) {
  let out = buf.toString("latin1");
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(out.slice(0, buf.length)))) {
    const start = m.index + m[0].length;
    const end = buf.indexOf("endstream", start, "latin1");
    if (end < 0) break;
    try {
      out += inflateSync(buf.subarray(start, end)).toString("latin1");
    } catch {
      /* not Flate, or trailing EOL */
      try {
        out += inflateSync(buf.subarray(start, end - 1)).toString("latin1");
      } catch {
        /* skip */
      }
    }
    re.lastIndex = end;
  }
  return out;
}

export function unzipText(docx, part) {
  const r = spawnSync("unzip", ["-p", docx, part], { encoding: "utf8" });
  return r.stdout;
}

export const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;
