// The Generator's held-out sets for ow-draft 1.0.0 (tests/ow-draft-heldout.mjs), written on 2026-10-21 before any
// rule and hashed then: the sha256 of the module's exported values is pinned below, so a later edit to a set fails
// here. Measured once with the family's imported rules alone ("before") and once with ow-draft's composed checker
// ("after"), at the build commit:
//
//   category        before (catch / legit)   after (catch / legit)
//   our figures     16/16 · 16/16            16/16 · 16/16
//   credentials     16/16 · 16/16            16/16 · 16/16
//   people          12/16 · 16/16            16/16 · 16/16
//   client data     13/16 · 16/16            16/16 · 16/16
//   private names   15/15 · 15/15            15/15 · 15/15
//   other clients   14/15 · 11/15            15/15 · 15/15
//   Naming          12/15 · 14/15            14/15 · 15/15   (miss: "The Larkspur team …", a capital "The"; reported, not tuned)
//   screen claims    6/16 · 14/15            16/16 · 15/15
//   approvals        1/16 · 13/16            16/16 · 16/16
//
// The people "after" includes one fix driven by the contract's known plant "Ask Jamal Ortiz" (an imperative opening a
// sentence read as half a name), which also catches the held-out "Ask Oluwaseun Adeyemi". The sets are never tuned:
// a miss stays a recorded miss (KNOWN_MISSES) until a round's own new set measures a fix.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as H from "./ow-draft-heldout.mjs";
import { approvalProblem, claimWords, credentialFindings, dataFindings, esc, namingFindings, otherClientFindings, otherClientRules, ourFiguresFindings, peopleFindings, privateNameFindings } from "../scripts/ow-draft-acceptance.mjs";
import { internalFigures } from "../scripts/ow-research-acceptance.mjs";

const ROOT = join(import.meta.dirname, "..");
export const HELDOUT_SHA = "cc9cc7fb04cd72ecba2f131666f2cfd9e158dfad6ab27830aa504a584eefdc38";
const KNOWN_MISSES = ["The Larkspur team now settles exceptions by 10:00."];

const book = readFileSync(join(ROOT, "tests/fixtures/ow-draft/worlds/studio/opchain-work/price-book.yaml"), "utf8");
const P = "tests/fixtures/ow-build-plan/unpriced-package/expected/opchain-work/plans/larkspur-ceramics";
const figures = internalFigures([{ rel: "price-book.yaml", text: book }, { rel: "plans/larkspur-ceramics/quote.md", text: readFileSync(join(ROOT, P, "quote.md"), "utf8") }, { rel: "plans/larkspur-ceramics/quote-items.json", text: readFileSync(join(ROOT, P, "quote-items.json"), "utf8") }]);
const items = new Map([["E-03", { id: "E-03", "round figure": "4000, the client's own threshold, not ours", figure: "4,000" }]]);
const fake = { all: () => ["opchain-work/intake/mossgate-books/intake.yaml", "opchain-work/intake/fernhill-florists/intake.yaml", "opchain-work/plans/kestrel-bindery/plan.yaml", "opchain-work/intake/bloom/intake.yaml", "opchain-work/research/frameworks/open-basics/2026-10-01/manifest.yaml", "opchain-work/voices/samples/client/sample-1.md", "opchain-work/intake/larkspur-ceramics/intake.yaml"], read: (f) => ({ "opchain-work/intake/mossgate-books/intake.yaml": "client: Mossgate Books\n", "opchain-work/intake/fernhill-florists/intake.yaml": "client: Fernhill Florists\n", "opchain-work/plans/kestrel-bindery/plan.yaml": "client: Kestrel Bindery\n", "opchain-work/intake/bloom/intake.yaml": "client: Bloom\n", "opchain-work/intake/larkspur-ceramics/intake.yaml": "client: Larkspur Ceramics\n" })[f] ?? "" };
const rules = otherClientRules(fake, { ws: "larkspur-ceramics", client: "Larkspur Ceramics" });
const clients = [{ slug: "larkspur-ceramics", name: "Larkspur Ceramics" }, { slug: "mossgate-books", name: "Mossgate Books" }, { slug: "fernhill-florists", name: "Fernhill Florists" }, { slug: "kestrel-bindery", name: "Kestrel Bindery" }, { slug: "bloom", name: "Bloom" }];
const names = ["Mossgate Books", "Larkspur Ceramics", "Kestrel Bindery", "Fernhill Florists", "Example Studio"];
const SETS = [
  ["our figures", H.OURS_CATCH, H.OURS_LEGIT, (s) => ourFiguresFindings(s, { user: "Robin", figures, items })],
  ["credentials", H.CRED_CATCH, H.CRED_LEGIT, (s) => credentialFindings(s)],
  ["people", H.PEOPLE_CATCH, H.PEOPLE_LEGIT, (s) => peopleFindings(s, { user: "Robin", business: "Example Studio", client: "Larkspur Ceramics", names })],
  ["client data", H.DATA_CATCH, H.DATA_LEGIT, (s) => dataFindings(s, { user: "Robin", client: "Larkspur Ceramics" })],
  ["private names", H.PRIVATE_CATCH, H.PRIVATE_LEGIT, (s) => privateNameFindings(s)],
  ["other clients", H.OTHER_CATCH, H.OTHER_LEGIT, (s) => otherClientFindings(s, rules)],
  ["Naming", H.NAMING_CATCH, H.NAMING_LEGIT, (s) => namingFindings(s, clients)],
  ["screen claims", H.CLAIM_CATCH, H.CLAIM_LEGIT, (s) => claimWords(s)],
];

describe("the held-out sets (hashed before the rules; never tuned)", () => {
  it("the sets are the ones hashed on 2026-10-21", () => {
    const keys = Object.keys(H).sort();
    expect(createHash("sha256").update(JSON.stringify(keys.map((k) => [k, H[k]]))).digest("hex")).toBe(HELDOUT_SHA);
    for (const [, c, l] of SETS) { expect(c.length).toBeGreaterThanOrEqual(15); expect(l.length).toBeGreaterThanOrEqual(15); }
  });
  for (const [label, catchSet, legit, fn] of SETS) {
    it(`${label}: every must-catch sentence is caught (known misses recorded)`, () => {
      const miss = catchSet.filter((s) => !fn(s).length);
      expect(miss).toEqual(miss.filter((s) => KNOWN_MISSES.includes(s)));
    });
    it(`${label}: no legitimate sentence is flagged`, () => expect(legit.filter((s) => fn(s).length)).toEqual([]));
  }
  it("approvals: every bad approval is refused and every good one accepted, declines included", () => {
    expect(H.APPROVAL_CATCH.filter((a) => !approvalProblem(a.kind, a.text, a.want, { line: a.line }).length).map((a) => a.text)).toEqual([]);
    expect(H.APPROVAL_LEGIT.filter((a) => approvalProblem(a.kind, a.text, a.want, { line: a.line }).length).map((a) => a.text)).toEqual([]);
  });
  void esc;
});
