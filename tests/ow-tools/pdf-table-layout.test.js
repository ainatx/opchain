// The model handoff exposed overlapping identifiers in narrow PDF table cells.
// Exercise the real exporter and rendered word boxes, not a template text pin.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { cleanup, cli, has, tempDir, write } from "./helpers.js";

afterAll(cleanup);
const ready = has("pandoc") && has("typst") && has("pdftotext");

describe.skipIf(!ready)("PDF table layout (real pandoc, Typst and Poppler)", { timeout: 30_000 }, () => {
  it("keeps plain identifiers and inline code inside their cell without inserting hidden characters", () => {
    const root = join(tempDir(), "opchain-work");
    write(join(root, "brand.yaml"), "schema: 1\nname: Example Studio\nlang: en-US\n");
    const row = (value) => `| one two three | one two three | one two three | one two three | one two three | one two three | ${value} | one two three |`;
    const unicodePath = "cafe\u0301/cafe\u0301/invoice.csv";
    const src = write(join(root, "table.md"), `# Accounts\n\n| H1 | H2 | H3 | H4 | H5 | H6 | H7 | H8 |\n|---|---|---|---|---|---|---|---|\n${row("MAILBOX_PASSWORD")}\n${row("`QBO_CLIENT_ID`")}\n${row(`\`${unicodePath}\``)}\n`);
    const exported = cli(["export", src, "--formats", "pdf", "--json"]);
    expect(exported.status, exported.stdout + exported.stderr).toBe(0);
    const pdf = join(root, "export", "table.pdf");
    const boxes = spawnSync("pdftotext", ["-bbox", pdf, "-"], { encoding: "utf8" });
    expect(boxes.status, boxes.stderr).toBe(0);
    const words = [...boxes.stdout.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]*)<\/word>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), right: Number(m[3]), text: m[5] }));
    const left = words.find((w) => w.text === "H7");
    const next = words.find((w) => w.text === "H8");
    expect(left).toBeDefined();
    expect(next).toBeDefined();
    const identifiers = words.filter((w) => w.y > left.y + 5 && w.x >= left.x - 0.5 && w.x < next.x - 6);
    expect(identifiers.length).toBeGreaterThan(2);
    for (const word of identifiers) expect(word.right, JSON.stringify(word)).toBeLessThanOrEqual(next.x - 5.5);
    expect(identifiers.map((w) => w.text).join("").normalize("NFC")).toBe(("MAILBOX_PASSWORDQBO_CLIENT_ID" + unicodePath).normalize("NFC"));
    for (const word of identifiers) expect(word.text).not.toMatch(/^\p{Mark}/u);
    const text = spawnSync("pdftotext", ["-raw", pdf, "-"], { encoding: "utf8" });
    expect(text.status, text.stderr).toBe(0);
    expect(text.stdout).not.toMatch(/[\u200b\u200c\u200d\ufeff]/);
  });
});
