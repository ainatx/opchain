import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS, costOf, longlistOf, nextScoreRunId, nextVendorFileId, runView, scoresOf, vendorFileId } from "../scripts/ow-vendor-eval-acceptance.mjs";
import { cleanup, mutated } from "./ow-vendor-eval-helpers.mjs";

afterAll(cleanup);
const E = "opchain-work/vendor-eval/larkspur-ceramics/VE-01-inventory-tool";
const key = { ws: "larkspur-ceramics", eval: "VE-01-inventory-tool", tools: true };

describe("independent review regressions", () => {
  it("OW11-IR-01: allocates persisted, distinct paths for vendors sharing their first word, including after resume", () => {
    const used = new Set();
    const first = nextVendorFileId("Northgate Records", "K-01", used);
    used.add(first);
    const second = nextVendorFileId("Northgate Services", "K-02", used);
    expect([first, second]).toEqual(["northgate", "northgate-k-02"]);
    expect(new Set([first, second]).size).toBe(2);
    expect(vendorFileId({ vendor: "Northgate Services", file_id: second })).toBe(second);
    expect(vendorFileId({ vendor: "Northgate Records" })).toBe(first); // old captured row
    expect(nextVendorFileId("Northgate Solutions", "K-02", new Set([first, second]))).toBe("northgate-k-02-2");
    const longlist = `---\nworkstream: business\n---\n# Longlist\n\n| id | vendor | file_id | source | relationship | knock-out |\n| --- | --- | --- | --- | --- | --- |\n| K-01 | Northgate Records | northgate | user-stated 2026-10-23 | none (stated by Robin on 2026-10-23) | in |\n| K-02 | Northgate Services | northgate-k-02 | user-stated 2026-10-23 | none (stated by Robin on 2026-10-23) | in |\n`;
    const rel = "opchain-work/vendor-eval/business/VE-01-test/longlist.md";
    const view = { read: (p) => p === rel ? longlist : null };
    const k = { ws: "business", eval: "VE-01-test" };
    expect(longlistOf(view, k).map((r) => r.slug)).toEqual([first, second]);
    expect(CHECKS.longlist(k, view)).toEqual([]);
    expect(CHECKS.longlist(k, { read: (p) => p === rel ? longlist.replace("northgate-k-02", "northgate") : null }).join("\n")).toMatch(/reuses file_id/);
  });

  it("OW11-IR-02: rescores new evidence with a fresh S-02 score and cost calc while preserving S-01 bytes", () => {
    const base = mutated("score-again");
    const old = (path) => readFileSync(join(base, E, path), "utf8");
    const score = old("scores.md");
    const initialTable = score.match(/## Scores\n([\s\S]*?)(?=\n## Totals)/)[1].trim();
    const revisedTable = initialTable.replace("3 (VF-03, HIGH)", "2 (VF-07, MEDIUM)");
    const tItems = JSON.parse(old("calc/totals-tallowmere.json"));
    tItems[0].quantity = 2;
    const bItems = old("calc/totals-brackenfold.json");
    const tCost = [{ label: "Tallowmere Stock seats × months", quantity: 144, unit_price: 24 }];
    const bCost = old("calc/cost-brackenfold.json");
    const scoreSection = `\n## Re-score S-02\nrevision: none\nnew evidence: Tallowmere Stock VF-07\n\n${revisedTable}\n\n- Tallowmere Stock: 230.00 points, not money (ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-tallowmere-S-02.json)\n- Brackenfold Inventory: 90.00 points, not money (ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/totals-brackenfold-S-02.json)\n`;
    const costSection = `\n## Re-score S-02: Tallowmere Stock\n- price: 24.00 USD per seat per month, as quoted by the vendor on 2026-10-27 (inbox/tallowmere-new-price.md)\n- horizon: 36 months × 4 seats\n- command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/cost-tallowmere-S-02.json --currency USD\n- cost over the horizon: 3456.00 USD\n\n## Re-score S-02: Brackenfold Inventory\n- price: 22.00 USD per seat per month, as published on 2026-10-18 (research/larkspur-ceramics/RS-02-inventory-tools/findings.md F-05)\n- horizon: 36 months × 4 seats\n- command: ow-tools calc total --items vendor-eval/larkspur-ceramics/VE-01-inventory-tool/calc/cost-brackenfold-S-02.json --currency USD\n- cost over the horizon: 3168.00 USD\n`;
    const edits = {
      [`${E}/scores.md`]: (t) => t.replace("\n## Self-checks (same-session self-check)", `${scoreSection}\n## Self-checks (same-session self-check)`) + "- /ow-vendor-eval-score · S-02 · 2026-10-27\n",
      [`${E}/cost.md`]: (t) => t + costSection,
      [`${E}/vendors/tallowmere.md`]: (t) => t.replace("\n## Possible embedded instructions", "\n### VF-07\n- criterion: CR-01\n- fact: The revised workflow needs a workaround.\n- source: user-stated 2026-10-27\n- kind: stated by user\n- level: MEDIUM\n- date: 2026-10-27\n\n## Possible embedded instructions"),
      [`${E}/inbox/tallowmere-new-price.md`]: () => "Tallowmere Stock quoted 24.00 USD per seat per month on 2026-10-27.\n",
      [`${E}/calc/totals-tallowmere-S-02.json`]: () => JSON.stringify(tItems) + "\n",
      [`${E}/calc/totals-brackenfold-S-02.json`]: () => bItems,
      [`${E}/calc/cost-tallowmere-S-02.json`]: () => JSON.stringify(tCost) + "\n",
      [`${E}/calc/cost-brackenfold-S-02.json`]: () => bCost,
    };
    const dir = mutated("score-again", edits);
    const run = runView("score-again", dir);
    expect(nextScoreRunId(score)).toBe("S-02");
    expect(scoresOf(run, key).scoreRun).toBe("S-02");
    expect(scoresOf(run, key).totals.get("Tallowmere Stock")).toBe(230);
    expect(costOf(run, key).get("Tallowmere Stock").cost).toBe(3456);
    expect(CHECKS.write_once(key, run)).toEqual([]);
    expect(CHECKS.scores(key, run)).toEqual([]);
    expect(CHECKS.cost(key, run)).toEqual([]);
    const staleRecommendation = runView("recommend-larkspur", mutated("recommend-larkspur", edits));
    expect(CHECKS.recommendation(key, staleRecommendation).join("\n")).toMatch(/scores\.md has|cost\.md has/);
    const repeated = mutated("score-again", { ...edits, [`${E}/scores.md`]: (t) => t + scoreSection + scoreSection });
    expect(() => scoresOf(runView("score-again", repeated), key)).toThrow(/appears twice/);
    for (const path of ["calc/totals-tallowmere.json", "calc/totals-brackenfold.json", "calc/cost-tallowmere.json", "calc/cost-brackenfold.json"]) expect(readFileSync(join(dir, E, path), "utf8")).toBe(old(path));
  });
});
