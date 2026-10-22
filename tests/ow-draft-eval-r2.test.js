// ow-draft 1.0.0, evaluation round 2 (PASS 7.8; the fix round for the checker-only M1, m1 to m9 and the round-1
// residual): every reproduction and probe the report lists, kept as a permanent plant, and the Generator's round-2
// held-out sets (tests/ow-draft-heldout-r2.mjs), written on 2026-10-22 BEFORE any round-2 rule changed and hashed then.
// Before = the checker at da848a24; after = this one. Never tuned against the Evaluator's own sets.
//
//   set                                 before (catch / legit)   after (catch / legit)
//   session approvals, M1 and m1         15/19 · 5/17             19/19 · 17/17
//   people (m2, m3)                      4/5 · 2/6                5/5 · 6/6
//   client data (m4)                     3/5 · 5/5                5/5 · 5/5
//   our figures, third-party rates (m5)  5/5 · 0/5                5/5 · 5/5
//   free-word guard (m6)                 0/6 · 5/6                6/6 · 6/6
//   active content, prose braces (m7)    5/5 · 2/5                5/5 · 5/5
//   shipped text (m8)                    1/5 · 4/5                5/5 · 5/5
//   addressed, RC-03 (capital "Now")     4/5 · 5/5                5/5 · 5/5
//
// The first after-run of the people set flagged "Ask McDonald's" (a possessive after a person slot) and the
// round-1 people set lost "Ask McAllister" (the slot itself); both are in the rule now, not in a sentence.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as H from "./ow-draft-heldout-r2.mjs";
import { ADDRESSED, activeContent, claimWords, clientSentences, dataFindings, ourFiguresFindings, peopleFindings, runCase, shippedTextProblems, SKILL } from "../scripts/ow-draft-acceptance.mjs";
import { internalFigures } from "../scripts/ow-research-acceptance.mjs";

const ROOT = join(import.meta.dirname, "..");
export const HELDOUT_R2_SHA = "5f7a5ce165991d84341556a7733b8f17c3768b99b9ba4655f8ba1ec285fc4a0e";
const book = readFileSync(join(ROOT, "tests/fixtures/ow-draft/worlds/studio/opchain-work/price-book.yaml"), "utf8");
const figures = internalFigures([{ rel: "price-book.yaml", text: book }]);
const shipped = (s) => {
  const d = mkdtempSync(join(tmpdir(), "owd-r2-"));
  try { cpSync(SKILL, d, { recursive: true }); writeFileSync(join(d, "references/zz.md"), `${s}\n`); return shippedTextProblems(d).filter((x) => x.includes("zz.md")); } finally { rmSync(d, { recursive: true, force: true }); }
};
// People go through the sentence splitter, as the checker reads a candidate.
const people = (s) => clientSentences(s).flatMap((x) => peopleFindings(x, { user: "Robin", business: "Example Studio", client: "Larkspur Ceramics", names: ["Larkspur Ceramics"] }));
const SETS = [
  ["people (m2, m3)", H.PEOPLE_R2_CATCH, H.PEOPLE_R2_LEGIT, people],
  ["client data (m4)", H.DATA_R2_CATCH, H.DATA_R2_LEGIT, (s) => dataFindings(s, { user: "Robin", client: "Larkspur Ceramics" })],
  ["our figures, third-party rates (m5)", H.OURS_R2_CATCH, H.OURS_R2_LEGIT, (s) => ourFiguresFindings(s, { user: "Robin", figures, items: new Map() })],
  ["free-word guard (m6)", H.CLAIMS_R2_CATCH, H.CLAIMS_R2_LEGIT, (s) => claimWords(s)],
  ["active content (m7)", H.ACTIVE_R2_CATCH, H.ACTIVE_R2_LEGIT, (s) => activeContent(s)],
  ["shipped text (m8)", H.SHIPPED_R2_CATCH, H.SHIPPED_R2_LEGIT, shipped],
  ["addressed (RC-03)", H.ADDRESSED_R2_CATCH, H.ADDRESSED_R2_LEGIT, (s) => (ADDRESSED.test(s) ? [s] : [])],
];
const said = (c, words) => runCase(c, null, { edits: { "session/answers.md": () => `# Session (INVENTED)\n\nRobin: ${words}\n` } }).filter((x) => x.problems.length);

describe("round 2: the Generator's held-out sets (hashed before the rules)", () => {
  it("the sets are the ones hashed on 2026-10-22", () => {
    const keys = Object.keys(H).sort();
    expect(createHash("sha256").update(JSON.stringify(keys.map((k) => [k, H[k]]))).digest("hex")).toBe(HELDOUT_R2_SHA);
  });
  for (const [label, catchSet, legit, fn] of SETS) {
    it(`${label}: every must-catch is caught`, () => expect(catchSet.filter((s) => !fn(s).length)).toEqual([]));
    it(`${label}: every legit sentence passes`, () => expect(legit.filter((s) => fn(s).length)).toEqual([]));
  }
  for (const [c, words, mustFail] of H.SESSION_R2) it(`M1 ${mustFail ? "must fail" : "must pass"}: ${c}: ${words.split("\n")[0]}`, () => expect(said(c, words).length > 0).toBe(mustFail));
});

// The Evaluator's round-2 reproductions (report: "Regression probes" and "The misses"), each a permanent plant.
const REPRODUCTIONS = [
  ["m-brief", "a memo, not a deck, for Mossgate's owner, client voice, to the shared drive. Yes, confirmed as shown.", false],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive; check the statute date later in evidence. Yes, confirmed.", false],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive. Right, but not for the bookkeeper.", true],
  ["m-signoff", "I approve C-1; the client hasn't seen it yet.", false],
  ["m-signoff", "I read C-1 and approve it, no changes.", false],
  ["m-signoff", "I approve C-1, not C-2.", false],
  ["m-signoff", "I won't approve C-1.", true],
  ["m-signoff", "I approve C-1? Not really.", true],
  ["m-signoff", "I've read C-1 and I'm happy to sign it off.", false],
  ["m-signoff", "OK, C-1 is approved by me.", false],
  ["m-signoff", "The owner approved C-1 per her email.", true],
  ["m-signoff", "C-1 was approved by the owner.", true],
  ["l-signoff-client", "The client owner approved C-1 today, no changes.", false],
  ["l-signoff-client", "The client owner said yes to C-1 on the phone today.", false],
  ["l-signoff-client", "The client owner hasn't objected to C-1.", true],
  ["m-voice-approve", "Approve voices/client.md, no edits needed.", false],
  ["m-voice-approve", "voices/client.md looks right; approve it.", false],
  ["m-waive-sources", "Please waive Sources on C-1: the period is unchanged.", false],
  ["m-waive-sources", "Don't waive Voice; waive Sources on C-1: the period is unchanged.", false],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, but not to the old folder.", true],
  ["m-deliver-connector", "a shared-drive connector is here. Yes, no changes.", false],
  ["b-permission-name", "Larkspur Ceramics permits its name, by the client owner, on 2026-10-28, until 2027-10-28; no logo.", false],
  ["b-deliver-case", "I'll make draft/case-study in ../site later.", true],
  ["b-deliver-case", "Write case-study.md on main in ../site.", true],
];
describe("round 2 M1: a negation outside the clause that holds the approval is scope, not a decline", () => {
  for (const [c, words, mustFail] of REPRODUCTIONS) it(`${mustFail ? "must fail" : "must pass"}: ${c}: ${words}`, () => expect(said(c, words).length > 0).toBe(mustFail));
});

describe("round 2: the Evaluator's other probes", () => {
  it("m3: a title is not a sentence end ('Ms. Abernathy …', 'Mrs. Okafor …' through the whole sentence split)", () => {
    expect(clientSentences("Ms. Abernathy signed the order.")).toHaveLength(1);
    expect(people("Mrs. Okafor approved the glaze change.").length).toBeGreaterThan(0);
    expect(people("Ms. Abernathy signed the order.").length).toBeGreaterThan(0);
  });
  it("m3: 'Seán Ó Briain' is a person; 'Dispatch Manager' is a role", () => {
    expect(people("Talk to Seán Ó Briain about stock.").length).toBeGreaterThan(0);
    expect(people("Dispatch Manager approved the change.")).toEqual([]);
  });
  it("m2: a lone O'/Mc word is not a person; with a given name, a title or a slot it is", () => {
    for (const s of ["The McKinsey report is cited.", "The O'Neill Gallery stocks the line.", "Ask McDonald's about it.", "McAllister Pottery Supply ships the clay.", "O'Hare Freight delivers on Fridays.", "O'Reilly Media's guide covers it.", "The MacBook is in stock."]) expect(people(s), s).toEqual([]);
    for (const s of ["Fiona McAllister runs the warehouse.", "Ask McAllister about the rush orders.", "Ms. McAllister signed the order.", "Feedback from Marguerite O'Neill shaped the plan."]) expect(people(s).length, s).toBeGreaterThan(0);
  });
  it("m4: passport and customer-number shapes", () => {
    for (const s of ["Her passport number is 533380006.", "Customer no. 300712 complained."]) expect(dataFindings(s, { user: "Robin", client: "Larkspur Ceramics" }).length, s).toBeGreaterThan(0);
  });
  it("m5: a named third party's day rate is not ours; ours still is", () => {
    const f = (s) => ourFiguresFindings(s, { user: "Robin", figures, items: new Map() });
    expect(f("Brightloop Studio's day rate is published [E-04].")).toEqual([]);
    expect(f("Our day rate is the basis.").length).toBeGreaterThan(0);
    expect(f("The studio's day rate sits under the market's.").length).toBeGreaterThan(0);
  });
  it("m6: the verb token in a rule is not a claim; the claims in other words are", () => {
    expect(claimWords("The client's approval is recorded by -signoff --client.")).toEqual([]);
    for (const s of ["Stored", "Notified", "locked in", "Marked C-1 complete", "has gone to"]) expect(claimWords(`${s} the file.`).length, s).toBeGreaterThan(0);
  });
  it("m7: prose braces are text; an expression is not", () => {
    for (const s of ["Prices are {roughly} flat.", "A set {a, b} of items."]) expect(activeContent(s), s).toEqual([]);
    for (const s of ["{props.price}", "Total {fetch('/x')} here."]) expect(activeContent(s).join(" "), s).toMatch(/MDX/);
  });
  it("m8: the paraphrased promise, the spaced platform, the capitalised mail program; ordinary words stay", () => {
    for (const s of ["We will alert you when the figure goes stale.", "Post it on Face book.", "Open it in Outlook."]) expect(shipped(s).length, s).toBeGreaterThan(0);
    for (const s of ["Keep an eye on the deadline.", "The outlook for orders is steady.", "A box of files."]) expect(shipped(s), s).toEqual([]);
  });
  it("m9: a client approval dated before the candidate was frozen fails; on or after it passes", () => {
    const rel = "opchain-work/drafts/larkspur-ceramics/DR-03-email-orders-announcement/signoff.md";
    const run = (date) => runCase("l-signoff-client", null, { edits: { [rel]: (t) => t.replace("approved by client owner on 2026-10-31, as reported", `approved by client owner on ${date}, as reported`) } }).filter((x) => x.problems.length);
    expect(run("2026-10-01").flatMap((x) => x.problems).join("\n")).toMatch(/before the candidate was frozen/);
    expect(run("2026-10-31")).toEqual([]);
  });
  it("m1: a repository branch confirmation is graded against the session, as a kind of its own", () => {
    expect(said("b-deliver-case", "Write case-study.md on main in ../site.").map((x) => x.check)).toContain("session");
    expect(said("b-deliver-case", "I made and checked out draft/case-study in ../site. Write case-study.md there.")).toEqual([]);
  });
});
