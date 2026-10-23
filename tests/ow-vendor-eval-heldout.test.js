// The held-out sets for ow-vendor-eval's nets (tests/ow-vendor-eval-heldout.mjs), written and hashed before the rules
// (OW-11 contract, test requirements). This test pins the sets' digest, so a set cannot move after a rule is written,
// and measures each category with this skill's net: the "after" numbers in the set file's header.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HELD_OUT, OUR_FIGURES } from "./ow-vendor-eval-heldout.mjs";
import * as C from "../scripts/ow-vendor-eval-acceptance.mjs";
import { otherClientMatchers, otherClientFindings } from "../scripts/ow-documentation-acceptance.mjs";

const ROOT = join(import.meta.dirname, "..");
const RFP = readFileSync(join(ROOT, "tests/fixtures/ow-vendor-eval/formal-elmridge/input/opchain-work/vendor-eval/town-of-elmridge/VE-01-permit-system/inbox/rfp-permit-system.md"), "utf8");
const others = otherClientMatchers([{ slug: "fernhill-florists", name: "Fernhill Florists" }, { slug: "mossgate-books", name: "Mossgate Books" }, { slug: "bloom", name: "Bloom" }], { client: "Larkspur Ceramics" });
const ctx = { user: "Robin", client: "Larkspur Ceramics" };
/** Each category's net: true when it flags the sentence. */
const NETS = {
  ourFigures: (s) => C.internalNumberFindings(s, OUR_FIGURES).length > 0,
  formal: (s) => C.formalWordFindings(s, { agency: [RFP] }).length > 0,
  claims: (s) => C.screenClaims(s).length > 0,
  approvals: ([a, k]) => !C.approvalAnswer(a, k, { procurement: "Elmridge permit system RFP 2026-14" }).ok,
  otherWorkstreams: (s) => otherClientFindings(s, others).length > 0,
  credentials: (s) => C.veCredentialFindings(s).length > 0,
  people: (s) => C.vePeopleFindings(s, ctx).length > 0,
  data: (s) => C.veDataFindings(s, ctx).length > 0,
  embedded: (s) => C.ADDRESSED_VE.test(s),
};
/** The after numbers recorded in the set file's header: [must-catch caught, legitimate passed]. */
const AFTER = { ourFigures: [15, 15], formal: [15, 15], claims: [15, 15], approvals: [15, 15], otherWorkstreams: [15, 15], credentials: [10, 10], people: [10, 10], data: [10, 10], embedded: [15, 15] };

describe("held-out sets (hashed before the rules)", () => {
  it("the sets are the ones written before the rules (their digest is pinned)", () => {
    expect(`sha256:${createHash("sha256").update(JSON.stringify(HELD_OUT)).digest("hex")}`).toBe("sha256:49170310e8e0dcd386210bb7970c9ed9bd1a71b91992d7f67c949b3570bfab31");
  });
  it("each category is sized like OW-05's and OW-10's (15 and 15; 10 and 10 for credentials, people and data)", () => {
    for (const [k, set] of Object.entries(HELD_OUT)) {
      const n = ["credentials", "people", "data"].includes(k) ? 10 : 15;
      expect(set.mustCatch.length, k).toBeGreaterThanOrEqual(n);
      expect(set.legitimate.length, k).toBeGreaterThanOrEqual(n);
    }
  });
  for (const [k, set] of Object.entries(HELD_OUT)) {
    it(`${k}: ${AFTER[k][0]}/${set.mustCatch.length} caught, ${AFTER[k][1]}/${set.legitimate.length} passed (the header's after numbers)`, () => {
      const caught = set.mustCatch.filter((s) => NETS[k](s)).length;
      const passed = set.legitimate.filter((s) => !NETS[k](s)).length;
      expect([caught, passed], JSON.stringify({ missed: set.mustCatch.filter((s) => !NETS[k](s)), flagged: set.legitimate.filter((s) => NETS[k](s)) })).toEqual(AFTER[k]);
    });
  }
  it("the header records the same after numbers", () => {
    const head = readFileSync(join(ROOT, "tests/ow-vendor-eval-heldout.mjs"), "utf8");
    for (const [k, [c, p]] of Object.entries(AFTER)) {
      const label = { ourFigures: "our figures", formal: "formal", claims: "free-worded claims", approvals: "approvals", otherWorkstreams: "other workstreams", credentials: "credentials", people: "people", data: "data", embedded: "embedded (vendor)" }[k];
      expect(head, k).toMatch(new RegExp(`//\\s+${label.replace(/[()]/g, "\\$&")}\\s+\\d+:\\s+\\d+ → ${c}\\s+\\d+:\\s+\\d+ → ${p}`));
    }
  });
});
