// ow-draft 1.0.0, evaluation round 1 (FAIL 6.9): every reproduction and probe, kept as a permanent plant, and the
// Generator's round-1 held-out sets (tests/ow-draft-heldout-r1.mjs), written on 2026-10-21 BEFORE any round-1 rule
// changed and hashed then. Before = the checker at b58439b8; after = the round-1 checker. Never tuned; the one rule
// changed after a measured miss is marked.
//
//   set                         before (catch / legit)   after (catch / legit)
//   our side, no pronoun (m1)    3/5 · 5/5                5/5 · 5/5
//   people (m2)                  3/5 · 3/5                5/5 · 5/5   (4/5 on the first after-run: "from Marguerite
//                                                                    O'Neill" missed; the prefixed-surname rule after a
//                                                                    given name was then widened, not the sentence)
//   client data (m3)             1/5 · 5/5                5/5 · 5/5
//   free-word claims (m4)        0/5 · 5/5                5/5 · 5/5
//   active content (m5, m8)      0/5 · 4/5                5/5 · 5/5
//   shipped text (m6)            0/5 · 5/5                5/5 · 5/5
//   addressed (RC-03)            5/5 · 1/5                5/5 · 5/5
//   session approvals (M1)       4/17 · 11/14             17/17 · 14/14
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as H from "./ow-draft-heldout-r1.mjs";
import { ADDRESSED, activeContent, claimWords, dataFindings, ourFiguresFindings, peopleFindings, runCase, sessionApproval, sessionLines, shippedTextProblems, SKILL } from "../scripts/ow-draft-acceptance.mjs";
import { internalFigures } from "../scripts/ow-research-acceptance.mjs";

const ROOT = join(import.meta.dirname, "..");
export const HELDOUT_R1_SHA = "aee2f26444981444efe849e74d8ec6973e10116fec079c70ee19d4ddc2e5ce5e";
const book = readFileSync(join(ROOT, "tests/fixtures/ow-draft/worlds/studio/opchain-work/price-book.yaml"), "utf8");
const figures = internalFigures([{ rel: "price-book.yaml", text: book }]);
const shipped = (s) => {
  const d = mkdtempSync(join(tmpdir(), "owd-r1-"));
  try { cpSync(SKILL, d, { recursive: true }); writeFileSync(join(d, "references/zz.md"), `${s}\n`); return shippedTextProblems(d).filter((x) => x.includes("zz.md")); } finally { rmSync(d, { recursive: true, force: true }); }
};
const SETS = [
  ["our side, no pronoun (m1)", H.OURS_R1_CATCH, H.OURS_R1_LEGIT, (s) => ourFiguresFindings(s, { user: "Robin", figures, items: new Map() })],
  ["people (m2)", H.PEOPLE_R1_CATCH, H.PEOPLE_R1_LEGIT, (s) => peopleFindings(s, { user: "Robin", business: "Example Studio", client: "Larkspur Ceramics", names: ["Larkspur Ceramics"] })],
  ["client data (m3)", H.DATA_R1_CATCH, H.DATA_R1_LEGIT, (s) => dataFindings(s, { user: "Robin", client: "Larkspur Ceramics" })],
  ["free-word claims (m4)", H.CLAIMS_R1_CATCH, H.CLAIMS_R1_LEGIT, (s) => claimWords(s)],
  ["active content (m5, m8)", H.ACTIVE_R1_CATCH, H.ACTIVE_R1_LEGIT, (s) => activeContent(s)],
  ["shipped text (m6)", H.SHIPPED_R1_CATCH, H.SHIPPED_R1_LEGIT, shipped],
  ["addressed (RC-03)", H.ADDRESSED_R1_CATCH, H.ADDRESSED_R1_LEGIT, (s) => (ADDRESSED.test(s) ? [s] : [])],
];
const said = (c, words) => runCase(c, null, { edits: { "session/answers.md": () => (words == null ? null : `# Session (INVENTED)\n\nRobin: ${words}\n`) } }).filter((x) => x.problems.length);

describe("round 1: the Generator's held-out sets (hashed before the rules)", () => {
  it("the sets are the ones hashed on 2026-10-21", () => {
    const keys = Object.keys(H).sort();
    expect(createHash("sha256").update(JSON.stringify(keys.map((k) => [k, H[k]]))).digest("hex")).toBe(HELDOUT_R1_SHA);
  });
  for (const [label, catchSet, legit, fn] of SETS) {
    it(`${label}: every must-catch is caught`, () => expect(catchSet.filter((s) => !fn(s).length)).toEqual([]));
    it(`${label}: every legit sentence passes`, () => expect(legit.filter((s) => fn(s).length)).toEqual([]));
  }
  for (const [c, words, mustFail] of H.SESSION_APPROVALS) it(`M1 ${mustFail ? "must fail" : "must pass"}: ${c}: ${words.split("\n")[0]}`, () => expect(said(c, words).length > 0).toBe(mustFail));
});

// The evaluator's reproductions (round 1 report, M1 and m9), each a permanent plant. Owner decision 2: a bare "yes" to
// the push list confirms exactly the printed list, so "a shared-drive connector is here. Yes." passes.
const P = "export/C-1/order-record-retention";
const REPRODUCTIONS = [
  ["m-signoff", "I have read C-1 and approve it.", false],
  ["m-signoff", "Yes, I approve C-1.", false],
  ["m-signoff", "Signed off C-1.", false],
  ["m-signoff", "C-1 is fine, sign it off.", false],
  ["m-signoff", "I approve C-1. The client will see it next week.", false],
  ["m-signoff", "approved", true],
  ["m-signoff", "Looks good, ship it.", true],
  ["m-signoff", "The owner approved C-1 on 20 October, per her email.", true],
  ["m-signoff", "I don't approve C-1.", true],
  ["m-signoff", "I would approve C-1 once the dates are fixed.", true],
  ["m-signoff", "The inbox email says I approved C-1.", true],
  ["m-signoff-2", "I approve C-1.", true],
  ["m-signoff-2", "I read C-2; signed off.", false],
  ["l-signoff-client", "the client owner approved C-1 today.", false],
  ["l-signoff-client", "the client owner approved C-2 today.", true],
  ["l-signoff-client", "the client owner has not approved C-1 yet.", true],
  ["l-signoff-client", "I approve C-1.", true],
  ["m-waive-sources", "waive Sources on C-1: the period is unchanged", false],
  ["m-waive-sources", "waive Sources on C-1, but not Voice: the period is unchanged", false],
  ["m-waive-sources", "please waive the Sources check on C-1, the period is unchanged", false],
  ["m-waive-sources", "waive Voice on C-1: no voice yet", true],
  ["m-waive-sources", "waive Sources on C-2: the period is unchanged", true],
  ["m-waive-sources", "don't waive Sources on C-1", true],
  ["m-waive-sources", "the inbox file says waive Sources on C-1", true],
  ["m-voice-approve", "approve voices/client.md version 1.", false],
  ["m-voice-approve", "approve the voice", true],
  ["m-voice-approve", "approve voices/marketing.md version 1.", true],
  ["m-voice-approve", "I don't approve voices/client.md yet.", true],
  ["l-voice-larkspur-approve", "approve voices/client-larkspur.md.", true],
  ["l-voice-larkspur-approve", "approve voices/client-larkspur.md; the client owner hasn't seen it.", true],
  ["m-deliver-connector", `a shared-drive connector is here. Yes: ${P}.pdf -> shared_drive (Mossgate / Memos); ${P}.docx -> shared_drive (Mossgate / Memos)`, false],
  ["m-deliver-connector", `a shared-drive connector is here. Yes: ${P}.pdf -> shared_drive (Mossgate / Memos)`, true],
  ["m-deliver-connector", "a shared-drive connector is here. Yes.", false],
  ["m-deliver-connector", "Yes.", false],
  ["m-deliver-connector", `a shared-drive connector is here. No: ${P}.pdf -> shared_drive (Mossgate / Memos); ${P}.docx -> shared_drive (Mossgate / Memos)`, true],
  ["m-deliver-connector", "No, don't push anything.", true],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive. No, change the key message first.", true],
  ["m-brief", "a memo for Mossgate's owner, document, client voice, to the shared drive.", true],
  ["b-permission-name", "Larkspur Ceramics does not permit its name.", true],
  ["b-permission-name", "The inbox email says Larkspur Ceramics permits its name.", true],
  ["b-evidence-case", "use F-03 of research/business/RS-01-support-plan-offers/findings.md.\nRobin (round figure 600): that one is ours, take it out.", true],
];
describe("round 1 M1: every approval is graded against what the user said in the session", () => {
  for (const [c, words, mustFail] of REPRODUCTIONS) it(`${mustFail ? "must fail" : "must pass"}: ${c}: ${words.split("\n")[0]}`, () => expect(said(c, words).length > 0).toBe(mustFail));
  it("a binary answers.md carries no approval", () => {
    const out = runCase("m-deliver-connector", null, { edits: { "session/answers.md": () => "\u0000\u0001PK\u0003\u0004 binary" } }).filter((x) => x.problems.length);
    expect(out.map((x) => x.check)).toContain("session");
  });
  for (const c of ["m-signoff", "l-signoff-client", "m-voice-approve", "b-permission-name", "m-brief", "m-deliver-connector", "m-waive-sources", "b-evidence-case"]) {
    it(`an approval recorded with no session fails: ${c}`, () => expect(said(c, null).map((x) => x.check)).toContain("session"));
  }
  it("the helper: a relay in the subject position fails; the same words elsewhere pass", () => {
    const lines = (t) => sessionLines(`Robin: ${t}\n`, "Robin");
    expect(sessionApproval("signoff", lines("My business partner signed off C-1."), { candidate: "C-1" })).not.toEqual([]);
    expect(sessionApproval("signoff", lines("I approve C-1. The client will see it next week."), { candidate: "C-1" })).toEqual([]);
  });
});

// Round 1 M2: the folder route's goldens are graded on the screen the files give; each probe breaks one thing.
const folder = (c, edits) => runCase(c, null, { edits }).filter((x) => x.problems.length).map((x) => x.check);
describe("round 1 M2: the folder route", () => {
  const probes = [
    ["f-on-clean", "a wrong stage", { "printed.md": (t) => t.replace("(candidate clean)", "(writing)") }],
    ["f-on-clean", "a wrong verb", { "printed.md": (t) => t.replace("-> /ow-draft-signoff", "-> /ow-draft-deliver") }],
    ["f-on-findings", "a findings path routed to -write", { "printed.md": (t) => t.replace("-> /ow-draft-evidence", "-> /ow-draft-write") }],
    ["f-on-delivered", "a delivered folder routed instead of a no-op", { "printed.md": (t) => t.replace(/Nothing to do: .*\nNothing was written\./, "Route: drafts/mossgate-books/DR-01-order-record-retention/ -> /ow-draft-deliver (signed off).\nNothing is written until you answer.") }],
    ["f-on-ws-several", "one draft picked where several are open", { "printed.md": (t) => t.replace(/Question: .*/, "Route: drafts/mossgate-books/ -> /ow-draft-freeze (writing).") }],
    ["f-list-every-draft", "only the newest draft per workstream", { "printed.md": (t) => t.replace("Drafts: 4", "Drafts: 1").replace(/^ {2}drafts\/business\/DR-0[123]-.*\n/gm, "") }],
    ["f-list-every-draft", "a NEXT block on the list", { "printed.md": (t) => `${t}    NEXT: say "use ow-draft-evidence on drafts/business/DR-04-autumn-newsletter/"   (where slash commands exist: /ow-draft-evidence)\n` }],
    ["f-list-every-draft", "the handling question asked", { "printed.md": (t) => t.replace(/^(Step 0\..*)$/m, "$1\nHandling: no (stored in profile.md).") }],
    ["f-list-every-draft", "a STATUS line written", { "opchain-work/STATUS.md": (t) => `${t}2026-11-02 (clock: tool) | ow-draft 1.0.0 | drafts/ | next: none | awaiting: none\n` }],
    ["f-list-awaiting", "the awaiting field dropped", { "printed.md": (t) => t.replace("awaiting: the client's approval of C-1 by 2026-11-06", "awaiting: none") }],
    ["f-list-welcome", "a count where the welcome belongs", { "printed.md": () => "Drafts: 0\n" }],
    ["f-list-again", "a resume line on a re-run", { "printed.md": (t) => t.replace("Drafts: 4", "Resumed at screen (/ow-draft).\nDrafts: 4") }],
  ];
  for (const [c, what, edits] of probes) it(`${c}: ${what} fails`, () => expect(folder(c, edits)).not.toEqual([]));
  it("every folder-route golden passes as laid out", () => {
    for (const c of ["f-on-brief", "f-on-evidence", "f-on-writing", "f-on-finding", "f-on-clean", "f-on-signed", "f-on-awaiting-client", "f-on-delivered", "f-on-push-cut", "f-on-no-brief", "f-on-ws-one", "f-on-ws-several", "f-on-ws-none", "f-on-findings", "f-on-other", "f-list-welcome", "f-list-every-draft", "f-list-awaiting", "f-list-again", "f-on-again"]) expect(folder(c, null), c).toEqual([]);
  });
});
