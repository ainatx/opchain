// ow-handoff acceptance tests (docs/plans/2026-10-08-ow-handoff-design.md §13 and the OW-06 contract,
// sprints/release-2.1/ow-06/contract.md). ow-handoff is a text-only skill, so a model has to run it. These tests
// prove the mechanical half: every golden run passes scripts/ow-handoff-acceptance.mjs, laid out as a real run
// folder too; each check fails on its own when a file is malformed (C23); the catalog holds the body to its
// budget; the shared files stay byte-identical; the controls pass and the held-out sets are measured; and the
// pinned wrapper for ow-documentation 1.0.1's rules is deleted once #644 merges. Plants: ow-handoff-plants.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { CHECK_NAMES, FIXTURES, HANDOFF_PIN, STEPS, WRITER_PIN, clientSentenceFindings, edgesWriterDrift, handoffFieldDrift, listCases, loadKey, prepare, runCase, shippedTextProblems, stepNameProblems } from "../scripts/ow-handoff-acceptance.mjs";
import { estimateTokens } from "../scripts/gen-skills-catalog.mjs";
import { checkEdges, checkProtocolCopies } from "../scripts/check-skill-contracts.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import * as docs from "../scripts/ow-documentation-acceptance.mjs";
import * as S from "./ow-handoff-sentences.mjs";
import { measure, FROZEN } from "./ow-handoff-measure.mjs";
import { cleanup, mutated, temp } from "./ow-handoff-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
const SKILL = join(ROOT, "skills-work", "ow-handoff");
afterAll(cleanup);
const CASES = listCases();
const keys = Object.fromEntries(CASES.map((c) => [c, loadKey(join(FIXTURES, c))]));
const body = () => { const t = readFileSync(join(SKILL, "SKILL.md"), "utf8"); return t.slice(t.indexOf("\n---", 3) + 4); };
const L = "opchain-work/handoffs/larkspur-ceramics";

describe("golden runs", () => {
  it("there are at least 140 cases (the contract's size)", () => expect(CASES.length).toBeGreaterThanOrEqual(140));
  it("every C4 route cell and every mode's resume cut has a case", () => {
    for (const c of ["start", "start-missing-signoff", "route-uat-new", "route-uat-mismatch", "route-uat-cut", "route-uat-started", "route-uat-delivered", "route-uat-closed", "route-uat-punch", "route-uat-punch-done",
      "route-fix-not-started", "fix-report", "fix-after-window", "fix-co-window-day45", "fix-main-window-day45", "fix-co-no-addendum", "fix-windows", "fix-reopen",
      "route-notes-not-started", "notes-no-accounts", "notes-index", "notes-wait", "m-notes", "notes-rerun-clears",
      "m-package-no-accounts", "m-package-no-notes", "m-package", "m-package-finding", "package-planted-key", "package-revision", "fix-help-after-close",
      "delivered-not-packaged", "delivered", "delivered-again", "delivered-moved", "m-delivered", "m-delivered-backstop",
      "accounts-not-started", "accounts", "accounts-transfer", "accounts-check", "m-accounts-complete", "accounts-waive", "accounts-after-close",
      "offer", "m-offer", "offer-before-delivery", "offer-rerun", "offer-after-close",
      "access", "access-record", "access-regrant", "access-waive", "access-record-before-transfer",
      "close-no-dates", "close-between", "close-co-open", "close-addendum-no-row", "close-held", "close-unconfirmed-row", "close", "close-care-installed", "close-hourly", "close-none", "close-undecided", "close-reopened", "close-unresponsive",
      "m-route-folder-accounts", "route-folder-accounts-done", "route-folder-notes-done", "route-folder-packaged", "route-folder-delivered", "route-folder-nothing-left", "route-folder-removal-due", "route-folder-window-ended", "route-folder-close-due", "route-folder-closed", "route-folder-reopened", "route-folder-not-started",
      "route-nopath-one", "route-nopath-several"]) expect(CASES, c).toContain(c);
    const resumed = new Set(Object.values(keys).filter((k) => k.resume).map((k) => `${k.resume.verb} after ${k.resume.done.at(-1)}`));
    for (const [verb, steps] of Object.entries(STEPS)) for (const s of steps.slice(0, -1)) expect(resumed, `${verb} after ${s}`).toContain(`${verb} after ${s}`);
  });
  for (const c of CASES) {
    it(`${c} passes every check its answer key names`, () => {
      const out = runCase(c);
      expect(out.filter((r) => r.problems.length), JSON.stringify(out.filter((r) => r.problems.length), null, 1)).toEqual([]);
      expect(out.length).toBeGreaterThan(0);
    });
  }
  it("every golden, laid out as a real run folder, passes too (real-run mode reads by difference)", () => {
    const bad = [];
    for (const c of CASES) { const out = runCase(c, mutated(c)).filter((r) => r.problems.length); if (out.length) bad.push(`${c}: ${JSON.stringify(out).slice(0, 300)}`); }
    expect(bad).toEqual([]);
  }, 300000);
  it("every answer key names known checks", () => { for (const c of CASES) for (const k of keys[c].checks) expect(CHECK_NAMES, `${c}: ${k}`).toContain(k); });
  it("the design §13 cases and the plan's named tests have goldens (by section)", () => {
    const sections = Object.values(keys).map((k) => String(k.section ?? "")).join("\n");
    for (const s of ["Synthetic handoff", "Quick-quote job", "Missing sign-off", "Punch list", "Post-acceptance CO window", "Delivery payment once", "Credentials: a key planted in operator-notes.md blocks -package", "Credentials: a typed waiver", "-notes re-run without the value clears", "Fix classification", "Window dates", "Close timing", "Care without ow-care", "Frozen terms", "Provisional dates moved", "Routes", "Resume"]) expect(sections, s).toContain(s);
  });
  it("the definition-of-done chain runs on Larkspur from the sign-off to the reopened close", () => {
    let c = "close-reopened";
    const seen = [];
    while (c) { seen.unshift(c); c = keys[c].base; }
    for (const step of ["start", "fix-punch", "accounts", "fix-windows", "notes-index", "package", "delivered", "fix-report", "offer", "access", "close", "fix-reopen", "close-reopened"]) expect(seen, step).toContain(step);
  });
  it("prepare lays out a starting state with no golden output in it", () => {
    const dir = temp("ow-ho-prep-");
    expect(typeof prepare).toBe("function");
    prepare("package", dir);
    expect(() => readFileSync(join(dir, L, "handoff-notes.md"))).toThrow();
    expect(readFileSync(join(dir, L, "operator-notes.md"), "utf8")).toMatch(/form: index/);
  });
});

describe("C23: malformed files fail their own check, never crash", () => {
  const malformed = [
    ["start", `${L}/handoff.yaml`, "a directory", "dir", "start"],
    ["delivered", `${L}/dates.yaml`, "invalid YAML", ": : [\n", "dates"],
    ["fix-windows", `${L}/co-windows.yaml`, "a truncated row", "ow_artefact: ow-handoff/co-windows\nrows:\n  - { co: CO-04, accepted:\n", "fix"],
    ["accounts", `${L}/accounts.md`, "a binary file", "\u0000\u0001\u0002", "accounts"],
    ["fix-report", `${L}/fixes/FIX-03.md`, "no header", "# FIX-03\n", "fix"],
    ["fix-report", `${L}/fixes/FIX-03.md`, "a scalar header", "---\njust text\n---\n# FIX-03\n", "fix"],
    ["offer", `${L}/after-offer.md`, "a scalar header", "---\njust text\n---\n# After\n", "offer"],
    ["package", `${L}/package.yaml`, "a list", "- one\n- two\n", "package"],
    ["accounts", `${L}/accounts.md`, "an unparseable scan record", "---\nscan: { status: HITS\n---\n", "accounts"],
    ["notes-index", `${L}/operator-notes.md`, "a header that is a list", "---\n- a\n---\n", "notes"],
    ["access", `${L}/access.md`, "no header", "# Access\n", "access"],
    ["close", `${L}/close.md`, "invalid header", "---\nclosed: [\n---\n", "close"],
  ];
  for (const [c, rel, what, content, check] of malformed) {
    it(`${c}: ${rel.split("/").pop()} as ${what} fails ${check} only through its problems`, () => {
      const dir = mutated(c, { [rel]: () => (content === "dir" ? null : content) });
      if (content === "dir") mkdirSync(join(dir, rel), { recursive: true });
      const out = runCase(c, dir);
      expect(out.find((r) => r.check === check)?.problems.length, JSON.stringify(out)).toBeGreaterThan(0);
      expect(out.every((r) => Array.isArray(r.problems))).toBe(true);
    });
  }
  it("a missing printed screen is a problem, not a crash", () => {
    const out = runCase("accounts", mutated("accounts", { "printed.md": () => null }));
    expect(out.find((r) => r.check === "screen").problems.join()).toMatch(/no saved screen/);
  });
  it("a repository file that is a symlink out of the repository is not read as the repository's", () => {
    const dir = mutated("package");
    const outside = join(temp("ow-ho-out-"), "README.md");
    writeFileSync(outside, "# elsewhere\n\n    npm run release:prod\n");
    const p = join(dir, "larkspur-repo", "README.md");
    try { symlinkSync(outside, p); } catch { /* the layered README stays; the walk never follows a link */ }
    const out = runCase("package", dir);
    expect(out.every((r) => Array.isArray(r.problems))).toBe(true);
  });
});

describe("C2, C3: the body, the frontmatter, the shipped text", () => {
  it("the body is at most 4,100 tokens (the build target) and the catalog caps it at 4,500", () => {
    expect(estimateTokens(body())).toBeLessThanOrEqual(4100);
    const ow = loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-");
    expect(ow.bodyTokenBudgets["ow-handoff"]).toBe(4500);
    expect(ow.planned).not.toContain("ow-handoff");
    expect(ow.planned).not.toContain("ow-care");
  });
  it("the description is at most 1,024 characters, names ow-handoff in its first 200, no angle brackets", () => {
    const fm = readFileSync(join(SKILL, "SKILL.md"), "utf8").match(/description: >\n([\s\S]*?)\nlicense/)[1].replace(/\s+/g, " ").trim();
    expect(fm.length).toBeLessThanOrEqual(1024);
    expect(fm.slice(0, 200)).toContain("ow-handoff");
    expect(fm).not.toMatch(/[<>]/);
    for (const n of ["fixing code", "sending anything", "deleting anything", "removing a secret from git history", "ow-care"]) expect(fm).toContain(n);
  });
  it("network none, core bundle, version 1.0.1", () => {
    const t = readFileSync(join(SKILL, "SKILL.md"), "utf8");
    expect(t).toMatch(/^ {2}network: none$/m);
    expect(t).toMatch(/^ {2}bundle: core$/m);
    expect(t).toMatch(/^ {2}version: "1\.0\.2"$/m);
    expect(t).toMatch(/^ow-handoff 1\.0\.2 · protocol 1/m);
  });
  it("the shipped text is clean (C3)", () => expect(shippedTextProblems()).toEqual([]));
  it("the protocol copy and the shared examples are byte-identical everywhere", () => {
    expect(checkProtocolCopies(loadCatalogs({ root: ROOT }))).toEqual([]);
    const dig = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
    for (const f of ["handoffs.yaml", "offers.md"]) {
      const copies = ["ow-start", "ow-build-plan", "ow-build", "ow-uat", "ow-documentation", "ow-handoff"].map((s) => join(ROOT, "skills-work", s, "examples", f)).filter((p) => { try { readFileSync(p); return true; } catch { return false; } });
      expect(copies.length).toBeGreaterThanOrEqual(f === "offers.md" ? 4 : 6);
      expect(new Set(copies.map(dig)).size, f).toBe(1);
    }
    const offers = readFileSync(join(SKILL, "examples", "offers.md"), "utf8");
    for (const k of ["care_tiers:", "billing:", "rollover: {", "rollover_wording:", "notice_days:", "urgent_price:", "ow-handoff reads"]) expect(offers).toContain(k);
    expect(offers).not.toMatch(/\b(?:Keep|Tune|Steward)\b/);
  });
});

describe("C1, C17, C21: edges, writer modes, the step table", () => {
  it("the family's edges hold with ow-handoff built", () => expect(checkEdges(loadCatalogs({ root: ROOT }))).toEqual([]));
  it("WRITER_PIN and HANDOFF_PIN hold the edges", () => { expect(edgesWriterDrift()).toEqual([]); expect(handoffFieldDrift()).toEqual([]); expect(WRITER_PIN.length).toBeGreaterThan(25); expect(Object.keys(HANDOFF_PIN)).toContain("/ow-care-start"); });
  it("the step table is keyed on verb and mode, every mode has a row", () => {
    expect(stepNameProblems()).toEqual([]);
    for (const k of ["/ow-handoff-start --keep-frozen", "/ow-handoff-start --refreeze", "/ow-handoff-fix --punch", "/ow-handoff-fix --windows", "/ow-handoff-fix --hours", "/ow-handoff-offer --rerun", "/ow-handoff-close --reopened", "/ow-handoff-package --revision", "/ow-handoff-access --regrant"]) expect(Object.keys(STEPS), k).toContain(k);
  });
  it("ow-care's design §5.1 reads every care-start.md field the close golden writes", () => {
    const t = readFileSync(join(FIXTURES, "close", "expected", L, "care-start.md"), "utf8");
    for (const k of ["care_start:", "tier:", "reply_business_days:", "window_end:", "## Kept access", "## Carried fixes", "## Waiting requests", "## Frozen terms"]) expect(t).toContain(k);
  });
  it("ow-start's index reads after-offer.md by created and choice, with no amount or person in the header", () => {
    const h = readFileSync(join(FIXTURES, "offer", "expected", L, "after-offer.md"), "utf8").split("\n---")[0];
    expect(h).toMatch(/^created: 2027-03-05$/m);
    expect(h).toMatch(/^choice: care$/m);
    expect(h).not.toMatch(/price|amount|Robin|recorded_by/);
  });
});

describe("C19, C20: controls first, held-out sets measured", () => {
  it("the 32 internal-number controls pass (12 of them day counts, windows, business days and frozen terms)", () => {
    expect(S.INTERNAL_CONTROLS.length).toBeGreaterThanOrEqual(30);
    expect(S.INTERNAL_CONTROLS.filter((s) => clientSentenceFindings(s, FROZEN, "Robin").length)).toEqual([]);
  });
  it("the held-out sets are sized as OW-05's and measured as the sentence file's header says", () => {
    expect(S.INTERNAL_HELDOUT_OURS.length).toBeGreaterThanOrEqual(18);
    expect(S.INTERNAL_HELDOUT_LEGIT.length).toBeGreaterThanOrEqual(20);
    expect(S.credentialValues().length).toBeGreaterThanOrEqual(15);
    expect(S.CREDENTIAL_CONTROLS.length).toBeGreaterThanOrEqual(10);
    expect(S.PEOPLE_HELDOUT.length).toBeGreaterThanOrEqual(10);
    expect(S.OTHER_CLIENT_HELDOUT.length).toBeGreaterThanOrEqual(10);
    expect(S.APPROVALS.filter((a) => a[2]).length).toBeGreaterThanOrEqual(10);
    const m = measure();
    expect(m.before).toEqual({ controls: 31, ours: 17, legit: 18 });
    expect(m.after).toEqual({ controls: 32, ours: 18, legit: 20 });
    expect(m.credentials).toEqual({ caught: 15, of: 15, controls: 10 });
    expect(m.people).toEqual({ caught: 10, controls: 10 }); // 9/10 until the shared PHONE took the UK mobile's 6-digit group (PR #652)
    expect(m.others).toEqual({ caught: 10, controls: 10 });
    expect(m.approvals).toEqual({ bad: 10, good: 10 });
  });
  it("the held-out sets are unchanged since they were hashed", () => {
    const d = createHash("sha256").update(JSON.stringify([S.INTERNAL_HELDOUT_OURS, S.INTERNAL_HELDOUT_LEGIT, S.CREDENTIAL_CONTROLS, S.PEOPLE_HELDOUT, S.PEOPLE_CONTROLS, S.OTHER_CLIENT_HELDOUT, S.OTHER_CLIENT_CONTROLS, S.APPROVALS])).digest("hex");
    expect(d).toBe(S.HELDOUT_DIGEST);
  });
});

describe("ow-documentation 1.0.1's rules are imported, never copied", () => {
  it("the success-claim guard and the other-client rule come from ow-documentation's checker", () => {
    const src = readFileSync(join(ROOT, "scripts", "ow-handoff-acceptance.mjs"), "utf8");
    expect(src).toMatch(/import \{[^}]*successClaims[^}]*otherClientMatchers[^}]*\} from "\.\/ow-documentation-acceptance\.mjs"/);
    expect(src).not.toMatch(/^(?:export )?(?:function|const) (?:successClaims|otherClientMatchers|otherWorkstreams)\b/m);
    expect(typeof docs.otherClientMatchers).toBe("function");
  });
});
