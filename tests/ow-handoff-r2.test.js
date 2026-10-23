// OW-06 PR 2, evaluation round 2 (sprints/release-2.1/ow-06/eval-round-2.md): M1b, the session check refused natural,
// legitimate approvals. The evaluator's 17 valid forms are controls, his 28 refusals plants, and the held-out set
// written and hashed before the rules changed (tests/ow-handoff-heldout-r2.mjs) is measured here. Everything is invented.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as A from "../scripts/ow-handoff-acceptance.mjs";
import * as Grammar from "../scripts/lib/approval-grammar.mjs";
import { docPeopleFindings } from "../scripts/ow-documentation-acceptance.mjs";
import { cleanup, failures, mutated, put } from "./ow-handoff-helpers.mjs";
import { EVAL_R2_FORMS } from "./ow-handoff-eval-r2-forms.mjs";
import * as H from "./ow-handoff-heldout-r2.mjs";
import { afterAll } from "vitest";

afterAll(cleanup);
const graded = (c, said) => {
  const run = A.runView(c);
  const ents = A.sessionEntries(said, run.key.user);
  return A.sessionRecords(run, run.key).flatMap((r) => A.sessionApproval(r.kind, ents, r.want, { client: run.key.client }));
};
/** The evaluator's one "ok" form that stays refused: a waiver with no "waive" verb ("close it unconfirmed … That is my waiver."). */
const STRICT = "FIX-03 passed its re-check; the client never answered my two emails on 9 and 11 March, so close it unconfirmed. That is my waiver.";

describe("round 2 held-out set", () => {
  it("is unchanged since it was hashed, before any rule changed", () => {
    expect(createHash("sha256").update(JSON.stringify([H.SESSIONS_R2, H.NAMES_R2, H.NAMES_R2_CONTROLS])).digest("hex")).toBe(H.HELDOUT_R2_DIGEST);
  });
  it("every refusal is caught", () => {
    for (const [c, said, ok] of H.SESSIONS_R2) if (!ok) expect(graded(c, `${said}\n`), `${c}: ${said}`).not.toEqual([]);
  });
  it("every valid approval passes, except the one the record does not support", () => {
    // "TR-01 is finished": the record is the client's owner rights (state owner); "finished" says neither owner nor done.
    // The set was hashed before the rules changed, so it is kept as written and the miss is reported, not tuned away.
    for (const [c, said, ok] of H.SESSIONS_R2) if (ok && !/^TR-01 is finished/.test(said)) expect(graded(c, `${said}\n`), `${c}: ${said}`).toEqual([]);
    expect(graded("accounts-transfer", "TR-01 is finished, no further steps are left. The operations manager confirmed it today.\n")).not.toEqual([]);
  });
  it("names: a given name and an O'/Mc surname are caught, other Mc and O' words are not", () => {
    const f = (s) => A.peopleIrish(s, "Robin").length > 0 || docPeopleFindings(s, { names: [], user: "Robin", client: "Larkspur Ceramics" }).length > 0;
    for (const s of H.NAMES_R2) expect(f(s), s).toBe(true);
    for (const s of H.NAMES_R2_CONTROLS) expect(f(s), s).toBe(false);
  });
});

describe("M1b: the evaluator's forms", () => {
  it("the 28 refusals fail, and each says why", () => {
    for (const [c, kind, said] of EVAL_R2_FORMS) if (kind === "bad") expect(graded(c, `${said}\n`).join("\n"), `${c}: ${said}`).toMatch(/not what the user said|no answer/);
  });
  it("the 20 valid forms pass (19, and one kept strict by the owner's recommendation)", () => {
    let n = 0;
    for (const [c, kind, said] of EVAL_R2_FORMS) {
      if (kind !== "ok") continue;
      if (said === STRICT) continue;
      n++;
      expect(graded(c, `${said}\n`), `${c}: ${said}`).toEqual([]);
    }
    expect(n).toBe(19);
  });
  it("the strict waiver: no verb 'waive' in the user's own words, no waiver (decision recorded in design §17)", () => {
    expect(graded("fix-waive", `${STRICT}\n`)).not.toEqual([]);
  });
});

describe("M1b: the fixes, one by one", () => {
  it("1. a leading 'text:' is the user's, unless it is the printed question or a named other party", () => {
    expect(graded("accounts-transfer", "Yes: TR-01, the client has owner rights now. I watched the operations manager change the org name.\n")).toEqual([]);
    expect(graded("access-record", "AX-01 is removed: the operations manager confirmed our admin seat is gone from the repository.\n")).toEqual([]);
    expect(graded("offer-rerun", "They changed their mind: hourly help, decided today.\n")).toEqual([]);
    expect(graded("fix-hours", "Client: Robin spent 3 hours on HELP-01.\n")).not.toEqual([]);
    expect(graded("fix-hours", "Assistant: HELP-01 took 3 hours.\n")).not.toEqual([]);
    expect(graded("fix-hours", "Robin: HELP-01 took 3 hours.\nAssistant: ok\n")).toEqual([]);
    expect(A.sessionEntries("Asked: Waive TR-02?\nRobin: Yes.\nDone: TR-01.\n", "Robin").map((e) => e.who)).toEqual(["asked", "user", "user"]);
  });
  it("2. a decline is tested in the clause that holds the approval verb", () => {
    expect(graded("offer", "The operations manager chose Regular care, not the Light tier. No, ow-care is not installed.\n")).toEqual([]);
    expect(graded("fix-go-ahead", "Go-ahead for HELP-01 from the operations manager, no conditions attached.\n")).toEqual([]);
    expect(graded("accounts-waive", "I waive TR-02 as the client is not answering; I am not waiving TR-01.\n")).toEqual([]);
    expect(graded("offer", "The operations manager chose the Regular care tier today, and ow-care is not installed here.\n")).toEqual([]);
    // ...but a decline in that clause, or a condition around it, still refuses
    expect(graded("fix-go-ahead", "The operations manager has not given a go-ahead for HELP-01, no conditions attached.\n")).not.toEqual([]);
    expect(graded("offer", "The operations manager chose Light care, not the Regular tier. No, ow-care is not installed.\n")).not.toEqual([]);
    expect(graded("accounts-waive", "I do not waive TR-02 because the client is not answering.\n")).not.toEqual([]);
  });
  it("3. 'I'm waiving' counts, and an exclusion in the next sentence does", () => {
    expect(graded("accounts-waive", "I'm waiving TR-02, the QuickBooks Online connection. I asked on 10 and 17 February. Not TR-01.\n")).toEqual([]);
    expect(graded("accounts-waive", "I am waiving the confirmation for TR-02. Except TR-01.\n")).toEqual([]);
    expect(graded("accounts-waive", "I'm waiving TR-02.\n").join()).toMatch(/but not/);
    expect(graded("accounts-waive", "The client's bookkeeper is waiving TR-02, not TR-01.\n")).not.toEqual([]);
    expect(graded("accounts-waive", "Please waive TR-02 but not TR-01.\n")).toEqual([]);
    expect(graded("accounts-waive", "Waive TR-02 and TR-01.\n")).not.toEqual([]);
  });
  it("4. a terse care choice, and a waiver naming its item by a pronoun or a possessive, count", () => {
    expect(graded("offer", "Care, Regular tier. No, I don't have ow-care installed.\n")).toEqual([]);
    expect(graded("offer", "Care, Light tier. ow-care is not installed.\n")).not.toEqual([]);
    expect(graded("fix-waive", "FIX-03 passed its re-check. I waive it; the client has not answered since 9 March.\n")).toEqual([]);
    expect(graded("access-waive", "AX-03 is removed, but the client did not confirm. I waive their confirmation.\n")).toEqual([]);
    expect(graded("fix-waive", "I waive it.\n")).not.toEqual([]);
  });
  it("5. offer-resume-html's key has approvals, and its session says so", () => {
    expect(A.runView("offer-resume-html").session()).not.toBeNull();
    for (const c of A.listCases()) {
      const key = A.loadKey(`${A.FIXTURES}/${c}`);
      if (Array.isArray(key.approvals) && key.approvals.length) expect(A.runView(c).session(), `${c} has approvals: and no session`).not.toBeNull();
    }
  });
  it("6. both graders import the shared grammar; handoff re-exports its actual shared rules", () => {
    for (const skill of ["draft", "handoff"]) {
      const src = readFileSync(new URL(`../scripts/ow-${skill}-acceptance.mjs`, import.meta.url), "utf8");
      expect(src).toContain('from "./lib/approval-grammar.mjs"');
      expect(src).not.toMatch(/(?:const|function) (?:SAID_NO|SAID_LATER|SAID_SCOPE|HEDGE|COND_START|NEG_NEXT|sentencesOf|clausesOf)\s*[=(]/);
    }
    expect(A.SAID_SCOPE).toBe(Grammar.HANDOFF_SCOPE);
    expect(A.HEDGE).toBe(Grammar.HANDOFF_HEDGE);
    expect(A.sentencesOf).toBe(Grammar.sentencesOf);
    expect(A.clausesOf).toBe(Grammar.clausesOf);
    expect(A.sentencesOf("One. Two; three")).toEqual(["One.", "Two;", "three"]);
    expect(A.clausesOf("Waive TR-02, but not TR-01 and go.")).toEqual(["Waive TR-02", "but not TR-01", "go"]);
  });
  it("through the whole checker: a colon line, a waiving line and a terse care line pass the session check", () => {
    expect(failures("accounts-transfer", mutated("accounts-transfer", { "session/answers.md": put("Done: TR-01, the operations manager now owns the repository.\n") })).session).toBeUndefined();
    expect(failures("accounts-waive", mutated("accounts-waive", { "session/answers.md": put("I'm waiving TR-02, the QuickBooks Online connection, but not TR-01.\n") })).session).toBeUndefined();
    expect(failures("offer", mutated("offer", { "session/answers.md": put("Care, Regular tier. ow-care isn't installed here.\n") })).session).toBeUndefined();
    expect(failures("offer", mutated("offer", { "session/answers.md": put("Care, Regular tier. ow-care might be installed.\n") })).session).toMatch(/ow-care answer/);
  });
});

describe("m3: given names with an O' or Mc surname", () => {
  it("a word on the line above is not a given name (O'Brien Street at the start of a paragraph)", () => {
    expect(A.peopleIrish("Monthly care, tier Regular\n\nO'Brien Street is where the studio is.", "Robin")).toEqual([]);
    expect(A.peopleIrish("Call Brendan McGrath on the kiln line.", "Robin")).toEqual(["Brendan McGrath"]);
  });
  it("fail in a client output through the whole checker", () => {
    const f = "opchain-work/handoffs/larkspur-ceramics/handoff-notes.md";
    const text = readFileSync(new URL("./fixtures/ow-handoff/package/expected/" + f, import.meta.url), "utf8");
    const hit = text.replace("## What happens next\n\n", "## What happens next\n\nCall Brendan McGrath on the kiln line.\n\n");
    expect(hit).not.toBe(text);
    expect(failures("package", mutated("package", { [f]: put(hit) }), { checks: [...A.loadKey(`${A.FIXTURES}/package`).checks, "people"] }).people).toMatch(/Brendan McGrath/);
  });
});
