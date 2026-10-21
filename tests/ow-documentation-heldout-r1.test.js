// The sentence sets of the ow-documentation evaluation round 1 (OW-05), permanent (contract C24):
// - the Evaluator's untuned sets (tests/ow-documentation-eval-r1-heldout.mjs, a copy of its h/heldout.mjs, hashed
//   before it read the rules);
// - the Generator's own held-out sets for the round's rule changes (tests/ow-documentation-heldout-r1.mjs, hashed before
//   any rule changed; measured before and after in sprints/release-2.1/ow-05/eval-round-1.md).
// Each sentence is planted literally in a client section of a real-run golden (a guide, an SOP, the runbook, the
// handover or a deck note, rotating), and must make its named check fail (a plant) or no meaning check fail (a
// control). The scratch measurement plants each one in all ten places; this file keeps one place each, so it stays fast.
//
// Both set files hold the same values as when they were hashed (file sha256 f82997a6… and f5dfd088…). Three invented
// vendor-token literals (a Stripe, a Slack and a Shopify shape) are written as two joined strings, because GitHub's push
// protection refuses them whole; the tests below pin each module's exported values instead of its bytes.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, runCase } from "../scripts/ow-documentation-acceptance.mjs";
import * as EV from "./ow-documentation-eval-r1-heldout.mjs";
import * as S from "./ow-documentation-heldout-r1.mjs";
import * as H from "./ow-documentation-helpers.mjs";

afterAll(H.cleanup);
const D = "opchain-work/docs/larkspur-ceramics";
const MEANING = ["internal_numbers", "people", "credentials", "data", "private_names"];
const failuresOf = (caseName, edits, opts = {}) => Object.fromEntries(runCase(caseName, H.mutated(caseName, edits), opts).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
function inSection(heading, line, where) {
  return (t) => {
    const lines = t.split("\n");
    const i = lines.findIndex((l) => l.trim() === heading);
    if (i < 0) throw new Error(`no heading ${heading}`);
    const lvl = heading.match(/^#+/)[0].length;
    if (where === "start") { let j = i + 1; while (j < lines.length && lines[j].trim() === "") j++; lines.splice(j, 0, line, ""); }
    else { let j = i + 1; while (j < lines.length && !new RegExp(`^#{1,${lvl}} `).test(lines[j]) && !/^<!-- ow:internal -->/.test(lines[j])) j++; let k = j; while (k > i + 1 && lines[k - 1].trim() === "") k--; lines.splice(k, 0, "", line); }
    return lines.join("\n");
  };
}
const ANCHOR = "Ask each person their role; record attendance by role and the client's id, never a name.";
/** The ten places, by index: a client section's start and end in four documents, and before and after a deck note. */
const PLACES = [
  ["write-guides", `${D}/guides/bookkeeper.md`, "## What changed for you", "start"], ["write-guides", `${D}/guides/bookkeeper.md`, "## What changed for you", "end"],
  ["write-sops", `${D}/sops/SOP-01.md`, "## Purpose", "start"], ["write-sops", `${D}/sops/SOP-01.md`, "## Purpose", "end"],
  ["write-runbook", `${D}/runbook.md`, "## Settings", "start"], ["write-runbook", `${D}/runbook.md`, "## Settings", "end"],
  ["write-handover", `${D}/handover/decisions.md`, "## Known limits", "start"], ["write-handover", `${D}/handover/decisions.md`, "## Known limits", "end"],
  ["train-deck", `${D}/training/deck.md`, null, "before"], ["train-deck", `${D}/training/deck.md`, null, "after"],
];
/** Other workstreams under opchain-work/ (owner decision 2026-10-20), each with the client name its files record. */
const others = (list) => Object.fromEntries(list.map((o) => [`opchain-work/plans/${o.slug}/contract-inputs.md`, () => `---\now_artefact: ow-build-plan/contract-inputs\nschema: 1\nworkstream: ${o.slug}\nclient: ${o.client}\n---\n# Contract inputs: ${o.client}\n`]));
function placed(s, i, extra = {}) {
  const multi = s.includes("\n");
  const [c, f, h, w] = PLACES[multi ? i % 8 : i % 10];
  const edit = h ? inSection(h, s, w) : H.rep(ANCHOR, w === "before" ? `${s} ${ANCHOR}` : `${ANCHOR} ${s}`);
  return { at: `${c}:${w}`, out: failuresOf(c, { ...extra, [f]: edit }) };
}
const catchSet = (label, set, want, { extra = {}, known = [] } = {}) => describe(label, () => {
  set.forEach((s, i) => {
    const miss = known.includes(s);
    it(`${miss ? "known miss (reported, not tuned): " : ""}${s.replace(/\n/g, " / ").slice(0, 90)}`, () => {
      const { at, out } = placed(s, i, extra);
      expect(want.some((w) => out[w]), `${at}: ${JSON.stringify(out).slice(0, 400)}`).toBe(!miss);
    });
  });
});
const passSet = (label, set, also = [], { extra = {} } = {}) => describe(label, () => {
  set.forEach((s, i) => it(s.replace(/\n/g, " / ").slice(0, 100), () => {
    const { at, out } = placed(s, i, extra);
    expect([...MEANING, ...also].filter((w) => out[w]), `${at}: ${JSON.stringify(out).slice(0, 400)}`).toEqual([]);
  }));
});

// ── The Evaluator's untuned sets (a copy of h/heldout.mjs, file sha256 f82997a6…) ──
/** The sha256 of a module's exported values, keys sorted: what the file holds, whatever its spelling. */
const valueHash = (m) => createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]])))).digest("hex");
describe("the Evaluator's untuned sets hold exactly the values it hashed", () => {
  it("the exported values of h/heldout.mjs (file sha256 f82997a6…, recorded before the Evaluator read the rules)", () => {
    expect(valueHash(EV)).toBe("bccd9ccde9c61d4189c1f6b82ed9e39aafd3e465c282ee64ba6e5d1f2dc8de3a");
  });
});
const EV_OTHERS = [{ slug: "mossgate-books", client: "Mossgate Books" }, { slug: "fernhill-florists", client: "Fernhill Florists" }];
catchSet("Evaluator C11: our-side slips are caught", EV.OURS_MUST_CATCH, ["internal_numbers"]);
passSet("Evaluator C11: legitimate numbers pass", EV.LEGIT_MUST_PASS);
catchSet("Evaluator C10: credential values and shapes are caught (m3)", EV.CRED_MUST_CATCH, ["credentials"]);
passSet("Evaluator C10: credential controls pass", EV.CRED_MUST_PASS);
catchSet("Evaluator C10: people the key does not list are caught (m4)", EV.PEOPLE_MUST_CATCH, ["people"]);
passSet("Evaluator C10: people controls pass", EV.PEOPLE_MUST_PASS);
catchSet("Evaluator C10: customer data in prose is caught by the data check (m5)", EV.DATA_MUST_CATCH, ["data"]);
passSet("Evaluator C10: data controls pass", EV.DATA_MUST_PASS);
catchSet("Evaluator, owner decision 2026-10-20: another workstream's client in a client output", EV.PRIVATE_MUST_CATCH, ["private_names"], { extra: others(EV_OTHERS) });
passSet("Evaluator: private-name controls pass with the other workstreams present", EV.PRIVATE_MUST_PASS, [], { extra: others(EV_OTHERS) });

// ── The Generator's held-out sets (tests/ow-documentation-heldout-r1.mjs) ────
describe("the Generator's held-out sets hold the values hashed before the rules changed", () => {
  it("the exported values of the file hashed f5dfd088… at 01:03 on 2026-10-20", () => {
    expect(valueHash(S)).toBe("d4b6f2b839097acbc19473629ae211f55f221b3b56bc33920d3de404646eda0a");
  });
});
const SCREENS = ["export-finding-refused", "delivered-refused", "delivered-again", "rollout-add-group-refused", "rollout-checkin-early", "rollout-close-wait", "route-uat-declined", "write-all-written", "start-sku-asked", "route-uat-closed"];
describe("m1: a success claim on a refusal, no-op or question screen", () => {
  S.SCREEN_CLAIMS.forEach((s, i) => {
    const miss = s === "The waiver is noted and the export went ahead.";
    it(`${miss ? "known miss (reported, not tuned): " : ""}${s}`, () => {
      const c = SCREENS[i % SCREENS.length];
      const out = failuresOf(c, { "printed.md": H.append(`${s}\n`) });
      expect(Boolean(out.screen), `${c}: ${JSON.stringify(out).slice(0, 300)}`).toBe(!miss);
    });
  });
  S.SCREEN_CONTROLS.forEach((s, i) => it(`control passes: ${s}`, () => {
    const c = SCREENS[i % SCREENS.length];
    expect(failuresOf(c, { "printed.md": H.append(`${s}\n`) })).toEqual({});
  }));
});
describe("X11: a commit, merge or git push in the client's repository, claimed on any screen", () => {
  S.COMMIT_CLAIMS.forEach((s) => it(s, () => expect(Object.keys(failuresOf("export", { "printed.md": H.append(`${s}\n`) }))).toContain("screen")));
  S.COMMIT_CONTROLS.forEach((s) => it(`control passes: ${s}`, () => expect(failuresOf("export", { "printed.md": H.append(`${s}\n`) })).toEqual({})));
});
catchSet("m2: the documentation line's price in a document", S.PRICE_IN_DOC, ["internal_numbers"]);
passSet("m2: the same digits as a client figure pass", S.PRICE_CONTROLS);
describe("m2: a price key in docs.yaml", () => {
  S.PRICE_KEYS.forEach((s) => it(s, () => expect(Object.keys(failuresOf("start", { [`${D}/docs.yaml`]: H.rep("  people: 6\n", `  people: 6\n  ${s}\n`) }))).toContain("start")));
  S.PRICE_KEY_CONTROLS.forEach((s) => it(`control passes: ${s}`, () => expect(failuresOf("start", { [`${D}/docs.yaml`]: H.rep("  people: 6\n", `  people: 6\n  ${s}\n`) })).toEqual({})));
});
catchSet("m3: credential values and shapes", S.CRED_CATCH, ["credentials"]);
passSet("m3: secret names, placeholders and settings pass", S.CRED_CONTROLS);
catchSet("m4: people the key does not list", S.PEOPLE_CATCH, ["people"]);
passSet("m4: systems, places, meetings, roles and ids pass", S.PEOPLE_CONTROLS);
catchSet("m5: a customer's data in prose", S.DATA_CATCH, ["data"]);
passSet("m5: test data, places and counts pass", S.DATA_CONTROLS);
describe("m6: the answer key's private names in other spellings", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ow-doc-r1-ho-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const caseDir = join(tmp, "write-guides");
  cpSync(join(FIXTURES, "write-guides"), caseDir, { recursive: true });
  const kp = join(caseDir, "answer-key.yaml");
  writeFileSync(kp, readFileSync(kp, "utf8").replace(/private_names:\n(  - .*\n)+/, `private_names:\n${S.KEY_NAMES.map((n) => `  - ${n}\n`).join("")}`));
  const at = (s, w) => failuresOf("write-guides", { [`${D}/guides/bookkeeper.md`]: inSection("## What changed for you", s, w) }, { caseDir });
  S.KEY_NAME_SPELLINGS.forEach((s, i) => it(s, () => expect(Object.keys(at(s, i % 2 ? "end" : "start"))).toContain("private_names")));
  S.KEY_NAME_CONTROLS.forEach((s) => it(`control passes: ${s}`, () => expect(at(s, "start")).toEqual({})));
});
catchSet("owner decision 2026-10-20: another workstream's client name or slug in a client output", S.OTHER_CLIENT_CATCH, ["private_names"], { extra: others(S.OTHER_CLIENTS) });
passSet("owner decision: the current client and ordinary words pass", S.OTHER_CLIENT_CONTROLS, [], { extra: others(S.OTHER_CLIENTS) });
describe("owner decision: an internal file naming another client passes (client outputs only)", () => {
  // The other workstreams' files are laid into the run folder, so the writes check sees them as written; the
  // meaning checks are what is graded here.
  const extra = others(S.OTHER_CLIENTS);
  const meaning = (out) => Object.keys(out).filter((k) => MEANING.includes(k));
  it("the training record (internal) names another workstream", () => {
    expect(meaning(failuresOf("rollout-session", { ...extra, [`${D}/training-record.md`]: H.append("Sheet layout as in fernhill-florists (Fernhill Florists).\n") }))).toEqual([]);
  });
  it("the screen to the user names another workstream", () => {
    expect(meaning(failuresOf("write-guides", { ...extra, "printed.md": H.append("Fernhill Florists and Quarry Bay Pottery are next in your queue.\n") }))).toEqual([]);
  });
  it("a follow-on folder of the same client is not another client", () => {
    expect(meaning(failuresOf("write-guides", { "opchain-work/plans/larkspur-ceramics-2/contract-inputs.md": () => "---\nclient: Larkspur Ceramics\n---\n", [`${D}/guides/bookkeeper.md`]: inSection("## What changed for you", "The same steps as larkspur-ceramics-2 and Larkspur Ceramics' team.", "start") }))).toEqual([]);
  });
});
describe("m10: the secrets-seen.log session field is the verb only", () => {
  const seen = (s) => failuresOf("rollout-session", { [`${D}/secrets-seen.log`]: H.rep("session: --session G-01", `session: ${s}`) });
  S.SEEN_SESSION_CATCH.forEach((s) => it(s, () => expect(Object.keys(seen(s))).toContain("credentials")));
  S.SEEN_SESSION_CONTROLS.filter((s) => s !== "--session G-01").forEach((s) => it(`control passes: ${s}`, () => expect(seen(s)).toEqual({})));
});
