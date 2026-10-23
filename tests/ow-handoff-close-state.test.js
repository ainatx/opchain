import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { closeBlockers, FIXTURES, runCase, runView } from "../scripts/ow-handoff-acceptance.mjs";

const H = "opchain-work/handoffs/larkspur-ceramics";
const dirs = [];
afterAll(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));
const history = (text, state) => text.replace(/## History\n[\s\S]*?(?=\n## |$)/, `## History\n- 2027-03-20 ${state}\n`);
const inputView = (caseName, edits) => {
  const view = runView(caseName);
  return { ...view, priorRead: (file) => file in edits ? edits[file] : view.priorRead(file), priorAll: () => [...new Set([...view.priorAll(), ...Object.keys(edits)])] };
};
const help = (state) => `---\nid: HELP-99\n---\n## History\n- 2027-03-19 requested\n- 2027-03-20 ${state}\n`;
const closeProblems = (inputs, outputs = {}) => {
  const caseName = "close-care-installed";
  const dir = mkdtempSync(join(tmpdir(), "ow-close-state-"));
  dirs.push(dir);
  const caseDir = join(dir, "case"), runDir = join(dir, "run");
  mkdirSync(caseDir);
  cpSync(join(FIXTURES, caseName, "answer-key.yaml"), join(caseDir, "answer-key.yaml"));
  cpSync(join(FIXTURES, caseName, "expected"), runDir, { recursive: true });
  cpSync(join(FIXTURES, caseName, "session"), join(runDir, "session"), { recursive: true });
  for (const [files, root] of [[inputs, join(caseDir, "input")], [outputs, runDir]]) for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return runCase(caseName, runDir, { caseDir }).filter((result) => result.problems.length);
};

describe("close blockers follow actual help and care state", () => {
  for (const [state, blocks] of [["requested", false], ["go-ahead 2027-03-20 by operations manager, as reported", true], ["hours recorded: 3 (Robin)", true], ["invoiced", false], ["declined", false]]) {
    it(`HELP at ${state} ${blocks ? "blocks" : "does not block"} close`, () => {
      const view = inputView("close-hourly", { [`${H}/help/HELP-99.md`]: help(state) });
      const blockers = closeBlockers(view, view.key);
      expect(blockers.filter((line) => line.startsWith("HELP-99"))).toEqual(blocks ? [`HELP-99 is at ${state.startsWith("go-ahead") ? "go-ahead" : "hours recorded"}`] : []);
    });
  }
  const base = runView("close-care-installed");
  const pending = history(base.priorRead(`${H}/fixes/FIX-01.md`), "fixed; re-check OP-01 passed; waiting for client confirmation");
  const held = `${base.priorRead(`${H}/access.md`).replace(/(\| AX-14[^\n]*\| )kept for care( \|)/, "$1held for FIX-01$2")}`;
  it("care installed carries a covered fix and access held for that fix", () => {
    expect(held).not.toBe(base.priorRead(`${H}/access.md`));
    const view = inputView("close-care-installed", { [`${H}/fixes/FIX-01.md`]: pending, [`${H}/access.md`]: held });
    expect(closeBlockers(view, view.key)).toEqual([]);
  });
  it("an absent or newer negative ow-care answer keeps both blockers", () => {
    const offer = base.priorRead(`${H}/after-offer.md`);
    for (const answer of [offer.replace("ow-care: installed", "ow-care: not installed"), offer.replace("## Self-checks", "- 2027-03-26 choice: care, tier Regular; ow-care: not installed (the user, 2027-03-26).\n\n## Self-checks")]) {
      const view = inputView("close-care-installed", { [`${H}/fixes/FIX-01.md`]: pending, [`${H}/access.md`]: held, [`${H}/after-offer.md`]: answer });
      expect(closeBlockers(view, view.key)).toEqual(["FIX-01 is fixed", "access item AX-14 is held for FIX-01"]);
    }
  });
  it("care does not excuse hourly work or access held for a different item", () => {
    const view = inputView("close-care-installed", { [`${H}/fixes/FIX-01.md`]: pending, [`${H}/access.md`]: held.replace("held for FIX-01", "held for HELP-99"), [`${H}/help/HELP-99.md`]: help("go-ahead 2027-03-20 by operations manager, as reported") });
    expect(closeBlockers(view, view.key)).toEqual(["HELP-99 is at go-ahead", "access item AX-14 is held for HELP-99"]);
  });
  it("rejects a golden close that silently omits the carried fix", () => {
    const bad = closeProblems({ [`${H}/fixes/FIX-01.md`]: pending, [`${H}/access.md`]: held });
    expect(bad.find((result) => result.check === "close")?.problems).toEqual(expect.arrayContaining([expect.stringContaining("FIX-01 is not carried free"), expect.stringContaining("AX-14 held for FIX-01 is not carried with its removal step")]));
  });
  it("accepts the full close output only when the fix carries free and held access has its removal step", () => {
    const path = `${H}/care-start.md`;
    const original = readFileSync(join(FIXTURES, "close-care-installed", "expected", path), "utf8");
    const carried = original.replace("None: every covered fix was verified before close.", "- FIX-01: carried free; AX-14 kept for care; remove when FIX-01 is verified.");
    const inputs = { [`${H}/fixes/FIX-01.md`]: pending, [`${H}/access.md`]: held };
    expect(closeProblems(inputs, { [path]: carried })).toEqual([]);
    expect(closeProblems(inputs, { [path]: carried.replace("remove when FIX-01 is verified", "remove when care ends") }).find((result) => result.check === "close")?.problems).toEqual([expect.stringContaining("AX-14 held for FIX-01 is not carried with its removal step")]);
  });
});
