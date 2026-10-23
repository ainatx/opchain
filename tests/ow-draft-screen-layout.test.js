import { describe, expect, it } from "vitest";
import { closedScreenProblems, nextBlockProblems, printedSays, runCase, runView } from "../scripts/ow-draft-acceptance.mjs";

// Markdown removes the four-space code-block prefix from the published examples.
// Change only NEXT-family lines; DONE, step 0, list rows and delivery listings are unchanged.
const rendered = (text) => text
  .replace(/^ {4}(?=(?:NEXT|IF IT IS NOT AVAILABLE|THEN|VOICE|QUESTIONS): )/gm, "")
  .replace(/^ {10}(?=(?:It will read:|\[no folder attached:))/gm, "      ");
const layouts = { "Markdown source (4/10)": (text) => text, "rendered example (0/6)": rendered };
const screen = (name) => runView(name).printed();
const check = (name, text, only = ["screen", "next"]) => Object.fromEntries(
  runCase(name, null, { edits: { "printed.md": () => text }, only }).map(({ check, problems }) => [check, problems]),
);
const allProblems = (result) => Object.values(result).flat();

for (const [layout, format] of Object.entries(layouts)) describe(layout, () => {
  for (const name of ["m-write", "m-route-no-brief", "m-signoff-again", "m-deliver", "b-deliver-case"]) {
    it(`accepts the exact ${name} screen`, () => {
      const only = ["screen", "next", ...(["m-deliver", "b-deliver-case"].includes(name) ? ["deliver"] : [])];
      expect(allProblems(check(name, format(screen(name)), only))).toEqual([]);
    });
  }

  it("preserves optional VOICE and QUESTIONS headings and say-line order", () => {
    const text = format(`    NEXT: say "use ow-draft"   (where slash commands exist: /ow-draft)
          It will read: STATUS.md, drafts/
          [no folder attached: attach opchain-work/ when you say it]
    IF IT IS NOT AVAILABLE: each draft folder shows where it stands.
    VOICE: say "use ow-draft-voice client"   (where slash commands exist: /ow-draft-voice)
          It will read: the samples you name
          [no folder attached: attach them when you say it]
    QUESTIONS: say "use ow-research-question"   (where slash commands exist: /ow-research-question)
          It will read: the question, in your words
          [no folder attached: say the question when you say it]
`);
    expect(nextBlockProblems(text)).toEqual([]);
    expect(printedSays(text)).toEqual(["use ow-draft", "use ow-draft-voice client", "use ow-research-question"]);
    const [first, voice] = text.split(/(?=^(?: {4})?VOICE:)/m);
    expect(printedSays(voice + first)).toEqual(["use ow-draft-voice client", "use ow-research-question", "use ow-draft"]);
  });

  for (const [name, change] of [
    ["wrong read list", (t) => t.replace("It will read: draft.md, brief.md, evidence.md", "It will read: draft.md")],
    ["missing read list", (t) => t.replace(/^ +It will read:.*\n/m, "")],
    ["missing attachment instruction", (t) => t.replace(/^ +\[no folder attached:.*\n/m, "")],
    ["reversed sublines", (t) => t.replace(/^( +It will read:.*)\n( +\[no folder attached:.*)$/m, "$2\n$1")],
    ["missing slash hint", (t) => t.replace("   (where slash commands exist: /ow-draft-freeze)", "")],
    ["wrong slash hint", (t) => t.replace("(where slash commands exist: /ow-draft-freeze)", "(where slash commands exist: /ow-draft-write)")],
    ["missing unavailable fallback", (t) => t.replace(/^(?: {4})?IF IT IS NOT AVAILABLE:.*\n/m, "")],
    ["wrong unavailable fallback", (t) => t.replace("keep a dated copy of the draft you read, and do not change it.", "continue without a copy.")],
    ["changed NEXT command", (t) => t.replace("use ow-draft-freeze on", "use ow-draft-write on")],
  ]) it(`rejects ${name}`, () => {
    expect(allProblems(check("m-write", change(format(screen("m-write"))))).length).toBeGreaterThan(0);
  });

  it("does not let an added valid say line escape the expected command order", () => {
    const extra = format(`    QUESTIONS: say "use ow-research-question"   (where slash commands exist: /ow-research-question)
          It will read: the question, in your words
          [no folder attached: say the question when you say it]
`);
    expect(check("m-write", extra + format(screen("m-write"))).next.join("\n")).toMatch(/expected, in this order/);
  });

  it("still forbids NEXT on the plain folder-list screen", () => {
    const block = screen("m-write").slice(screen("m-write").indexOf("    NEXT:"));
    const result = check("f-list-every-draft", screen("f-list-every-draft") + format(block), ["folder", "next"]);
    expect(result.folder.join("\n")).toMatch(/prints no NEXT block/);
    expect(result.next.length).toBeGreaterThan(0);
  });

  it("keeps delivery destinations and filenames exact", () => {
    const text = format(screen("m-deliver"));
    expect(check("m-deliver", text.replace(" to the client's shared folder", " to the public folder"), ["deliver"]).deliver.join("\n")).toMatch(/say: line exactly/);
    expect(check("m-deliver", text.replace("export/C-1/order-record-retention.pdf", "candidates/C-1.md"), ["deliver"]).deliver.join("\n")).toMatch(/client files in export/);
  });

  it("still requires the exact repository-copy commit line", () => {
    const text = format(screen("b-deliver-case"));
    expect(check("b-deliver-case", text.replace(/^(?: {4})?THEN:.*\n/m, ""), ["deliver"]).deliver.join("\n")).toMatch(/no commit line/);
    expect(check("b-deliver-case", text.replace("on branch draft/case-study", "on branch main"), ["deliver"]).deliver.join("\n")).toMatch(/no commit line/);
  });

  it("keeps closed screens closed, including claims hidden under a fallback", () => {
    const text = format(screen("m-route-no-brief"));
    expect(closedScreenProblems(text)).toEqual([]);
    expect(closedScreenProblems(text + "Delivered the document.\n").join("\n")).toMatch(/not a prescribed line|says something was/);
    expect(closedScreenProblems(text + "DONE: draft written -> drafts/mossgate-books/draft.md\n").join("\n")).toMatch(/prints DONE/);
    const hidden = text + " ".repeat(format === rendered ? 6 : 10) + "Delivered the document.\n";
    expect(allProblems(check("m-route-no-brief", hidden)).length).toBeGreaterThan(0);
  });
});

describe("layout limits", () => {
  for (const [name, change] of [
    ["column-zero heading with ten-space sublines", (t) => t.replace(/^ {4}(?=(?:NEXT|IF IT IS NOT AVAILABLE):)/gm, "")],
    ["four-space heading with six-space sublines", (t) => t.replace(/^ {10}/gm, "      ")],
    ["tabbed sublines", (t) => rendered(t).replace(/^ {6}/gm, "\t")],
  ]) it(`rejects ${name}`, () => {
    expect(nextBlockProblems(change(screen("m-write"))).join("\n")).toMatch(/NEXT subline must have/);
  });

  for (const prefix of [" ", "  ", "        ", "\t", "> ", "- ", "# "]) {
    it(`does not strip an arbitrary prefix ${JSON.stringify(prefix)}`, () => {
      const text = rendered(screen("m-write")).replace(/^(NEXT:|IF IT IS NOT AVAILABLE:)/gm, `${prefix}$1`);
      expect(printedSays(text)).toEqual([]);
      expect(allProblems(check("m-write", text)).length).toBeGreaterThan(0);
    });
  }

  it("rejects a rendered continuation without a heading", () => {
    expect(nextBlockProblems("      It will read: draft.md, brief.md, evidence.md\n").join("\n")).toMatch(/outside a NEXT block/);
  });
});
