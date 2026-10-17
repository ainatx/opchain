// Sprint T: T7 digest (C1, C2) and T4 calc hours (C3, C4, C5), plus F-007
// (the streamed hash doctor uses) and F-008 (calc date keys).
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, readFileSync, renameSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIGEST_NOTE, digest, digestTree } from "../../plugins/ow-tools/lib/digest.mjs";
import { addDate, hours, parseRollover } from "../../plugins/ow-tools/lib/calc.mjs";
import { PLUGIN, ROOT, cleanup, cli, has, tempDir, write } from "./helpers.js";

const SPAWN = { timeout: 30_000 };
afterAll(cleanup);
const FIX = join(ROOT, "tests", "fixtures", "ow-tools", "sprint-t");
const ledger = (name) => JSON.parse(readFileSync(join(FIX, "hours", name), "utf8"));

function tree() {
  const d = join(tempDir(), "pack");
  write(join(d, "a.txt"), "alpha\n");
  write(join(d, "sub", "b.json"), '{"b":1}\n');
  write(join(d, "sub", "deeper", "c.md"), "# c\n");
  write(join(d, "Z-upper.txt"), "upper sorts before lower in byte order\n");
  return d;
}

describe("ow-tools digest (T7)", SPAWN, () => {
  it("C1: a file's digest is the SHA-256 of its bytes and always carries the note", () => {
    const f = write(join(tempDir(), "doc.md"), "# Candidate\n\nText.\n");
    const r = cli(["digest", f, "--json"]);
    expect(r.status).toBe(0);
    expect(r.json).toMatchObject({ kind: "file", form: "file-bytes", note: DIGEST_NOTE });
    expect(DIGEST_NOTE).toBe("detects accidental change only; not tamper-evidence");
    if (has("shasum")) expect(r.json.sha256).toBe(spawnSync("shasum", ["-a", "256", f], { encoding: "utf8" }).stdout.split(" ")[0]);
    const text = cli(["digest", f]);
    expect(text.stdout).toContain(r.json.sha256);
    expect(text.stdout).toContain(DIGEST_NOTE);
  });

  it("C2: a folder digest ignores mtime, mode, cp -R and creation order", () => {
    const d = tree();
    const base = digestTree(d).sha256;
    utimesSync(join(d, "a.txt"), new Date(2000, 0, 1), new Date(2000, 0, 1));
    chmodSync(join(d, "a.txt"), 0o600);
    expect(digestTree(d).sha256).toBe(base);
    const copy = join(tempDir(), "copy");
    cpSync(d, copy, { recursive: true });
    expect(digestTree(copy).sha256).toBe(base);
    const other = join(tempDir(), "reordered");
    write(join(other, "sub", "deeper", "c.md"), "# c\n");
    write(join(other, "Z-upper.txt"), "upper sorts before lower in byte order\n");
    write(join(other, "sub", "b.json"), '{"b":1}\n');
    write(join(other, "a.txt"), "alpha\n");
    expect(digestTree(other).sha256).toBe(base);
  });

  it("C2: it changes on any byte change, rename, add or remove", () => {
    const seen = new Set();
    const d = tree();
    seen.add(digestTree(d).sha256);
    writeFileSync(join(d, "a.txt"), "alphA\n");
    seen.add(digestTree(d).sha256);
    renameSync(join(d, "sub", "b.json"), join(d, "sub", "b2.json"));
    seen.add(digestTree(d).sha256);
    write(join(d, "new.txt"), "");
    seen.add(digestTree(d).sha256);
    spawnSync("rm", [join(d, "Z-upper.txt")]);
    seen.add(digestTree(d).sha256);
    expect(seen.size).toBe(5);
  });

  it.each([["a file link", "file"], ["a folder link", "dir"], ["a link at the top", "top"]])("C2: %s anywhere gives exit 4 naming the path", (_, kind) => {
    const d = tree();
    let target = d;
    if (kind === "file") symlinkSync(join(d, "a.txt"), join(d, "sub", "link.txt"));
    if (kind === "dir") symlinkSync(join(d, "sub"), join(d, "sub", "deeper", "loop"));
    if (kind === "top") {
      target = join(tempDir(), "top-link");
      symlinkSync(d, target);
    }
    const r = cli(["digest", target, "--json"]);
    expect(r.status).toBe(4);
    expect(r.json.reason).toBe("symlink-in-tree");
    if (kind === "file") expect(r.json.path).toBe("sub/link.txt");
    if (kind === "dir") expect(r.json.path).toBe("sub/deeper/loop");
  });

  it("C2 / O12: Finder litter is skipped and listed, and doesn't change the digest", () => {
    const d = tree();
    const base = digestTree(d).sha256;
    write(join(d, ".DS_Store"), "finder");
    write(join(d, "sub", "._b.json"), "resource fork");
    const r = digest({ target: d });
    expect(r.sha256).toBe(base);
    expect(r.skipped).toEqual([".DS_Store", "sub/._b.json"]);
    expect(r.files).toBe(4);
  });

  it("C2: a name the shell form would escape is refused rather than digested differently", () => {
    const d = tree();
    write(join(d, "bad\\name.txt"), "x");
    expect(() => digestTree(d)).toThrow(/backslash or a control character/);
  });

  it.skipIf(!(has("shasum") && has("find") && has("sort") && has("xargs")))("C2: the documented one-liner gives the same hex", () => {
    const d = tree();
    write(join(d, ".DS_Store"), "finder");
    write(join(d, "sp ace", "x y.txt"), "spaces\n");
    const r = spawnSync("sh", ["-c", `(cd "$1" && find . -type f ! -name .DS_Store ! -name '._*' -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256) | shasum -a 256`, "sh", d], { encoding: "utf8" });
    expect(r.stdout.split(" ")[0]).toBe(digestTree(d).sha256);
  });

  it("F-007: the streamed helper is what doctor's model check and every hash use", () => {
    const core = readFileSync(join(PLUGIN, "lib", "core.mjs"), "utf8");
    expect(core).toMatch(/import \{ sha256File \} from "\.\/hash\.mjs"/);
    expect(core).not.toMatch(/createHash/);
    expect(readFileSync(join(PLUGIN, "lib", "hash.mjs"), "utf8")).toMatch(/readSync\(fd, buf, 0, CHUNK/);
    expect(readFileSync(join(PLUGIN, "lib", "digest.mjs"), "utf8")).toMatch(/from "\.\/hash\.mjs"/);
  });
});

describe("ow-tools calc hours (T4)", SPAWN, () => {
  it("C3: reproduces the ow-care §6 example exactly", () => {
    const r = hours({ ledger: ledger("care-example.json"), rollover: "0.25,unused,1" });
    const [m1, m2] = r.months;
    expect(m1).toMatchObject({ id: "M-01", included: 480, rolled_in: 0, available: 480, extra: 0, rolled_over: 45, lapsed: 135 });
    expect(m1.used).toEqual({ care: 210, health: 45, report: 45, meeting: 0, total: 300 });
    expect(m2).toMatchObject({ id: "M-02", rolled_in: 45, available: 525, extra: 75, extra_approved: 75, rolled_over: 0, lapsed: 0 });
    expect(m2.used.total).toBe(600);
  });

  it("C3: rolled in + included + extra = used + rolled over + lapsed, every fixture month", () => {
    for (const [file, rule] of [["care-example.json", "0.25,unused,1"], ["lapse.json", "0.25,unused,1"], ["lapse.json", "0.25,included,1"], ["lapse.json", "0.5,unused,2"]]) {
      for (const m of hours({ ledger: ledger(file), rollover: rule }).months) {
        expect(m.rolled_in + m.included + m.extra, `${file} ${rule} ${m.id}`).toBe(m.used.total + m.rolled_over + m.lapsed);
      }
    }
  });

  it("C3: runs from the CLI with --json", () => {
    const r = cli(["calc", "hours", "--ledger", join(FIX, "hours", "care-example.json"), "--rollover", "0.25,unused,1", "--json"]);
    expect(r.status).toBe(0);
    expect(r.json.months[1].available).toBe(525);
  });

  it("C4: a rolled-in hour unused at the end of the next month lapses", () => {
    const [m1, m2, m3] = hours({ ledger: ledger("lapse.json"), rollover: "0.25,unused,1" }).months;
    expect(m1.rolled_over).toBe(45);
    expect(m2).toMatchObject({ rolled_in: 45, rolled_over: 120, lapsed: 360 + 45 });
    expect(m3).toMatchObject({ rolled_in: 120, credit: 60 });
  });

  it("C4: a minute count that isn't a quarter-hour, or past available without an extra, is exit 4 naming the entry id only", () => {
    const quarter = ledger("care-example.json");
    quarter.months[0].entries[0].minutes = 200;
    const d = tempDir();
    const f = write(join(d, "l.json"), JSON.stringify(quarter));
    let r = cli(["calc", "hours", "--ledger", f, "--rollover", "0.25,unused,1", "--json"]);
    expect(r).toMatchObject({ status: 4 });
    expect(r.json).toMatchObject({ reason: "not-quarter-hour", entry: "CARE-01" });
    const over = ledger("care-example.json");
    over.months[1].extra_approved = 60;
    write(f, JSON.stringify(over));
    r = cli(["calc", "hours", "--ledger", f, "--rollover", "0.25,unused,1", "--json"]);
    expect(r.status).toBe(4);
    expect(r.json).toMatchObject({ reason: "over-available", entry: "REPORT-M-02", month: "M-02" });
  });

  it("C4: a negative value or an unknown kind is exit 2", () => {
    const neg = ledger("care-example.json");
    neg.months[0].entries[0].minutes = -15;
    expect(() => hours({ ledger: neg, rollover: "0.25,unused,1" })).toThrow(expect.objectContaining({ code: 2 }));
    const kind = ledger("care-example.json");
    kind.months[0].entries[0].kind = "travel";
    expect(() => hours({ ledger: kind, rollover: "0.25,unused,1" })).toThrow(expect.objectContaining({ code: 2 }));
    const gap = ledger("care-example.json");
    gap.months[1].id = "M-03";
    expect(() => hours({ ledger: gap, rollover: "0.25,unused,1" })).toThrow(/must have id M-02/);
    expect(() => parseRollover("0.25,half,1")).toThrow(expect.objectContaining({ code: 2 }));
    expect(() => parseRollover("1.5,unused,1")).toThrow(expect.objectContaining({ code: 2 }));
  });

  it("C5 / O11: of: included is min(own unused, a share of included rounded down to the quarter-hour)", () => {
    const [m1, m2] = hours({ ledger: ledger("lapse.json"), rollover: "0.25,included,1" }).months;
    expect(m1.rolled_over).toBe(Math.min(180, 120)); // 0.25 × 480 = 120 < 180 unused
    expect(m2.rolled_over).toBe(120); // 480 unused, capped at 120
    const tight = { schema: 1, months: [{ id: "M-01", included: 480, entries: [{ id: "C-1", kind: "care", minutes: 420 }] }] };
    expect(hours({ ledger: tight, rollover: "0.25,included,1" }).months[0].rolled_over).toBe(60); // own unused 60 < 120
  });

  it("C5 / O11: months: N keeps each month's rollover for N months, oldest used first", () => {
    const L = { schema: 1, months: [
      { id: "M-01", included: 480, entries: [] },
      { id: "M-02", included: 480, entries: [] },
      { id: "M-03", included: 480, entries: [{ id: "C-3", kind: "care", minutes: 600 }] },
      { id: "M-04", included: 480, entries: [] },
    ] };
    const [m1, m2, m3, m4] = hours({ ledger: L, rollover: "0.25,unused,2" }).months;
    expect(m1.rolled_over).toBe(120);
    expect(m2).toMatchObject({ rolled_in: 120, rolled_over: 240, lapsed: 360 }); // M-01's still valid
    // M-03: 240 rolled in; M-01's batch (oldest) is used first, then M-02's.
    // 600 = 120 (M-01's) + 120 (M-02's) + 360 own; a quarter of the 120 own
    // unused rolls on, the rest lapses, and M-01's (now empty) batch ends.
    expect(m3).toMatchObject({ rolled_in: 240, available: 720, extra: 0, rolled_over: 30, lapsed: 90 });
    expect(m4.rolled_in).toBe(30);
  });

  it("F-008: both calc date modes return the same keys; --holidays with --days is a usage error", () => {
    const a = addDate({ from: "2026-10-09", days: 3 });
    const b = addDate({ from: "2026-10-09", businessDays: 3 });
    expect(Object.keys(a).filter((k) => k !== "days").sort()).toEqual(Object.keys(b).filter((k) => k !== "business_days").sort());
    expect(a).toMatchObject({ calendar: "every day", holidays_skipped: [] });
    const r = cli(["calc", "date", "--from", "2026-10-09", "--days", "3", "--holidays", "2026-10-12", "--json"]);
    expect(r.status).toBe(2);
    expect(r.json.message).toMatch(/--holidays only applies to --business-days/);
  });
});

describe("calc hours: refusals never quote ledger text", () => {
  it("names the entry id, never another field", () => {
    const L = ledger("care-example.json");
    L.months[0].entries[0].minutes = 7;
    try {
      hours({ ledger: L, rollover: "0.25,unused,1" });
    } catch (err) {
      expect(err.message).toBe("CARE-01 is not a whole quarter-hour (minutes must be a multiple of 15)");
      return;
    }
    throw new Error("not refused");
  });
});
