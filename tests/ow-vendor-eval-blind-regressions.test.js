// Permanent controls for the first blind recommendation. The raw 10/16 capture remains frozen in /tmp;
// these tests exercise the actual comparators against fixture-derived positive and negative variants.
import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as C from "../scripts/ow-vendor-eval-acceptance.mjs";
import { FIXTURES, loadKey, runView } from "../scripts/ow-vendor-eval-acceptance.mjs";
import { cleanup, mutated } from "./ow-vendor-eval-helpers.mjs";

afterAll(cleanup);
const E = "opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool";
const key = loadKey(join(FIXTURES, "recommend-larkspur"));
const view = (edits) => runView("recommend-larkspur", mutated("recommend-larkspur", edits));
const pdfInfo = !spawnSync("pdfinfo", ["-v"], { encoding: "utf8" }).error;
const smallPdf = (pages) => {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(" ")}] /Count ${pages} >>`, ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>")];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf);
};

describe("blind recommendation checker controls", () => {
  it("BL-01: accepts a source-faithful STATUS quote and an honest layout failure; catches an approval claim", () => {
    const prior = runView("recommend-larkspur", mutated("recommend-larkspur")).priorRead("opchain-work/STATUS.md");
    const quoted = prior.split("\n").find((l) => l.includes("scores.md | next: ow-vendor-eval"));
    expect(quoted).toBeTruthy();
    const add = `> ${quoted}\nHandling: no (stored and confirmed this session); no higher level found in the relevant sources. Scenario clock: October 27, 2026, prospectively declared; tool date 2026-10-27. Historical awaiting entries were displayed, not treated as approval.\nNeeds fixing: the native PDF is two pages; one-page layout was not achieved. The source and exports are frozen after this invocation. No choice, waiver, vendor contact or send was recorded.\n`;
    expect(C.CHECKS.screen(key, view({ "printed.md": (t) => `${add}${t}` }))).toEqual([]);
    expect(C.CHECKS.screen(key, view({ "printed.md": (t) => `The client approved this recommendation.\n${t}` }))).toEqual(expect.arrayContaining([expect.stringMatching(/claims "approved"/)]));
    for (const line of ["Handling: no; a decision is approved and the recommendation was sent.", "Needs fixing: layout failed. The recommendation is approved and was sent."]) {
      expect(C.CHECKS.screen(key, view({ "printed.md": (t) => `${line}\n${t}` })).join("\n"), line).toMatch(/claims "(?:approved|sent)"/);
    }
    expect(C.CHECKS.screen(key, view({ "printed.md": (t) => `Needs fixing: layout failed. No choice, waiver, vendor contact or send was recorded. A decision was recorded.\n${t}` })).join("\n")).toMatch(/claims "recorded"/);
  });

  it("BL-02: visible NEXT indentation is immaterial, but placeholders and failure handoffs are rejected", () => {
    const flush = (t) => t.replace(/^ {4}(NEXT|IF IT IS NOT AVAILABLE):/gm, "$1:").replace(/^ {10}(It will read:|\[no folder attached:)/gm, "      $1");
    expect(C.CHECKS.next(key, view({ "printed.md": flush }))).toEqual([]);
    expect(C.CHECKS.screen(key, view({ "printed.md": flush }))).toEqual([]);
    const placeholder = view({ "printed.md": (t) => flush(t).replace("decide tallowmere", "decide <vendor>") });
    expect(C.CHECKS.next(key, placeholder).join("\n")).toMatch(/slot unfilled/);
    const failed = view({ "printed.md": (t) => `Needs fixing: the native PDF is two pages.\n${t}` });
    expect(C.CHECKS.next(key, failed).join("\n")).toMatch(/expected \[\]/);
  });

  it("BL-03: known vendor contact wording is not a person; an unknown person remains blocked", () => {
    const note = "Ask Brackenfold whether every item can be exported.";
    const fileEdits = { [`${E}/recommendation.md`]: (t) => t.replace("## What to confirm\n", `## What to confirm\n${note}\n`), [`${E}/export/client/recommendation.md`]: (t) => t.replace("## What to confirm\n", `## What to confirm\n${note}\n`) };
    expect(C.CHECKS.private_names(key, view(fileEdits))).toEqual([]);
    const person = Object.fromEntries(Object.entries(fileEdits).map(([file, edit]) => [file, (t) => edit(t).replace(note, "Ask Alice whether every item can be exported.")]));
    expect(C.CHECKS.private_names(key, view(person)).join("\n")).toMatch(/person's name.*Alice/);
  });

  it("BL-04: vendor-keyed cost prose is checked by value, not waived", () => {
    const cost = new Map([["Tallowmere Stock", { cost: 2592 }], ["Brackenfold Inventory", { cost: 3168 }]]);
    const prose = "## Cost\nTallowmere Stock: cost over 36 months × 4 seats: 2592.00 USD.\nBrackenfold Inventory: cost over 36 months × 4 seats: 3168.00 USD.\n";
    expect(C.recommendationAgainstCost({ client: prose }, cost)).toEqual([]);
    expect(C.recommendationAgainstCost({ client: prose.replace("3168.00", "3169.00") }, cost).join("\n")).toMatch(/Brackenfold Inventory.*3169.*3168/);
    expect(C.recommendationAgainstCost({ client: prose.replace(/Brackenfold Inventory:.+\n/, "") }, cost).join("\n")).toMatch(/leaves out Brackenfold Inventory/);
  });

  it("BL-05: equivalent risk wording passes; omitted export risk and absent runner-up condition fail", () => {
    const compact = "Lock-in remains possible: test export and a usable exit. Contract length and renewal need confirmation. Prices may rise.";
    const withRisk = view({ [`${E}/recommendation.md`]: (t) => t.replace(/## Risks\n[\s\S]*?\n## What to confirm/, `## Risks\n${compact}\n## What to confirm`) });
    expect(C.CHECKS.recommendation(key, withRisk).join("\n")).not.toMatch(/## Risks does not cover/);
    const noExit = view({ [`${E}/recommendation.md`]: (t) => t.replace(/## Risks\n[\s\S]*?\n## What to confirm/, "## Risks\nLock-in is possible. Contract length needs confirmation. Prices may rise.\n## What to confirm") });
    expect(C.CHECKS.recommendation(key, noExit).join("\n")).toMatch(/## Risks does not cover/);
    const noCondition = view({ [`${E}/recommendation.md`]: (t) => t.replace("It would be the better choice if it confirmed a full export of items and counts and shipped its API.", "Its export is unconfirmed and its API is on the roadmap.") });
    expect(C.CHECKS.recommendation(key, noCondition).join("\n")).toMatch(/what would make it the better choice/);
  });

  it("BL-06: written-out original declaration date passes; a fresh date without source update fails", () => {
    const original = "No relationships with the vendors considered (stated by Robin on 2026-10-20).";
    const written = "No relationships with the vendors considered (stated by Robin on October 20, 2026).";
    expect(C.CHECKS.conflicts(key, view({ [`${E}/recommendation.md`]: (t) => t.replace(original, written) }))).toEqual([]);
    expect(C.CHECKS.conflicts(key, view({ [`${E}/recommendation.md`]: (t) => t.replace(original, written.replace("20", "27")) })).join("\n")).toMatch(/none line is exactly/);
  });

  it.skipIf(!pdfInfo)("BL-07: native one-page PDF passes and a two-page PDF fails the real-run recommendation check", () => {
    for (const [pages, shouldFail] of [[1, false], [2, true]]) {
      const dir = mutated("recommend-larkspur");
      writeFileSync(join(dir, E, "export/recommendation.pdf"), smallPdf(pages));
      const problems = C.CHECKS.recommendation(key, runView("recommend-larkspur", dir)).join("\n");
      expect(problems.includes("client recommendation must be one page"), problems).toBe(shouldFail);
    }
  });
});
