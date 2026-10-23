// Measures the held-out sets (tests/ow-care-heldout.mjs) on scripts/ow-care-acceptance.mjs.
// Returns, per set, how many forms the rules handle as the set says they should, and the forms they miss.
// `node tests/ow-care-heldout-measure.mjs` prints the numbers.
import { fileURLToPath } from "node:url";
import * as A from "../scripts/ow-care-acceptance.mjs";
import { sessionEntries } from "../scripts/ow-handoff-acceptance.mjs";
import * as H from "./ow-care-heldout.mjs";

const USER = "Robin";
const CLIENT = "Larkspur Ceramics";
const ALLOWED = new Set(["3200", "250", "350", "8", "2", "30"]);

function tally(rows) {
  const misses = rows.filter((r) => !r.ok).map((r) => r.what);
  return { total: rows.length, correct: rows.length - misses.length, misses };
}
const near = (a, b) => Math.abs(a - b) < 0.005;
const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback(e); } };

export function measure() {
  const out = {};
  out.sessions = tally(H.SESSIONS.map(([kind, want, said, ok]) => {
    const got = safe(() => A.sessionApproval(kind, sessionEntries(said, USER), want, { client: CLIENT }).length === 0, () => false);
    return { ok: got === ok, what: `${kind}: ${said.replace(/\n/g, " / ")} (expected ${ok ? "accepted" : "refused"})` };
  }));
  out.sessionsMustFail = tally(H.SESSIONS.filter((s) => !s[3]).map(([kind, want, said]) => ({ ok: safe(() => A.sessionApproval(kind, sessionEntries(said, USER), want, { client: CLIENT }).length > 0, () => true), what: `${kind}: ${said}` })));
  out.sessionsControls = tally(H.SESSIONS.filter((s) => s[3]).map(([kind, want, said]) => ({ ok: safe(() => A.sessionApproval(kind, sessionEntries(said, USER), want, { client: CLIENT }).length === 0, () => false), what: `${kind}: ${said}` })));
  out.injections = tally(H.INJECTIONS.map((s) => ({ ok: A.careInstruction(s) === true, what: `missed injection: ${s}` })));
  out.legitimate = tally(H.LEGITIMATE.map((s) => ({ ok: A.careInstruction(s) === false, what: `quoted as an instruction: ${s}` })));
  out.internalFail = tally(H.INTERNAL_FAIL.map((s) => ({ ok: A.internalFindings(s, ALLOWED, USER).length > 0, what: `missed: ${s}` })));
  out.internalPass = tally(H.INTERNAL_PASS.map((s) => ({ ok: A.internalFindings(s, ALLOWED, USER).length === 0, what: `flagged: ${s}` })));
  out.credFail = tally(H.CREDENTIAL_FAIL.map((s) => ({ ok: A.credentialFindings(s).length > 0, what: `missed: ${s}` })));
  out.credPass = tally(H.CREDENTIAL_PASS.map((s) => ({ ok: A.credentialFindings(s).length === 0, what: `flagged: ${s}` })));
  out.privFail = tally(H.PRIVATE_FAIL.map((s) => ({ ok: A.privateNameFindings(s).length > 0, what: `missed: ${s}` })));
  out.privPass = tally(H.PRIVATE_PASS.map((s) => ({ ok: A.privateNameFindings(s).length === 0, what: `flagged: ${s}` })));
  out.otherFail = tally(H.OTHER_CLIENT_FAIL.map((s) => ({ ok: A.otherClientHits(s, H.OTHER_CLIENTS, CLIENT).length > 0, what: `missed: ${s}` })));
  out.otherPass = tally(H.OTHER_CLIENT_PASS.map((s) => ({ ok: A.otherClientHits(s, H.OTHER_CLIENTS, CLIENT).length === 0, what: `flagged: ${s}` })));
  out.peopleFail = tally(H.PEOPLE_FAIL.map((s) => ({ ok: A.peopleFindings(s, { user: USER, client: CLIENT }).length > 0, what: `missed: ${s}` })));
  out.peoplePass = tally(H.PEOPLE_PASS.map((s) => ({ ok: A.peopleFindings(s, { user: USER, client: CLIENT }).length === 0, what: `flagged: ${s}` })));
  out.claimsFail = tally(H.CLAIMS_FAIL.map((s) => ({ ok: A.screenClaims(s).length > 0, what: `missed: ${s}` })));
  out.claimsPass = tally(H.CLAIMS_PASS.map((s) => ({ ok: A.screenClaims(s).length === 0, what: `flagged: ${s}` })));
  out.reply = tally(H.REPLY.map(([received, businessDays, holidays, effective, due]) => {
    const got = safe(() => A.replyDue({ received, businessDays, holidays }), () => ({}));
    return { ok: got.effective === effective && got.due === due, what: `${received} +${businessDays} ${holidays.join(",")}: got ${got.effective}/${got.due}, expected ${effective}/${due}` };
  }));
  out.periods = tally(H.PERIODS.map(([start, n, want]) => ({ ok: safe(() => A.monthPeriod(start, n), () => null) === want, what: `${start} M-${n}: got ${safe(() => A.monthPeriod(start, n), () => "error")}, expected ${want}` })));
  out.ends = tally(H.ENDS.map(([start, notice, days, expiry, end]) => {
    const got = safe(() => A.careEnd(start, notice, days), () => ({}));
    return { ok: got.expiry === expiry && got.end === end, what: `${start} notice ${notice}+${days}: got ${got.expiry}/${got.end}, expected ${expiry}/${end}` };
  }));
  out.ledgers = tally(H.LEDGERS.map(([name, rule, months, expect]) => {
    if (!Array.isArray(expect)) {
      const threw = safe(() => { A.ledgerRows(rule, months); return false; }, (e) => new RegExp(expect.error).test(String(e.message)));
      return { ok: threw, what: `${name}: expected ${expect.error}` };
    }
    const got = safe(() => A.ledgerRows(rule, months), () => []);
    const ok = got.length === expect.length && expect.every((e, i) => ["rolled_in", "used", "extra", "rolled_over", "lapsed"].every((k) => got[i]?.[k] === e[k]));
    return { ok, what: `${name}: got ${JSON.stringify(got)}` };
  }));
  out.invoices = tally(H.INVOICES.map(([args, want]) => ({ ok: near(A.invoiceAmount(args), want), what: `${JSON.stringify(args)}: got ${A.invoiceAmount(args)}, expected ${want}` })));
  out.accessLines = tally(H.ACCESS_LINES.map(([line, ok]) => ({ ok: (A.accessRecordProblems(line).length === 0) === ok, what: `${line} (expected ${ok ? "valid" : "invalid"})` })));
  out.healthLines = tally(H.HEALTH_LINES.map(([line, tool, ok]) => ({ ok: (A.healthLineProblems(line, { tool }).length === 0) === ok, what: `${line} [tool ${tool}] (expected ${ok ? "valid" : "invalid"})` })));
  return out;
}
export function summary(m = measure()) {
  const total = Object.values(m).filter((v) => v.total && !/^sessions(MustFail|Controls)$/.test("")).reduce((s, v) => s + v.total, 0);
  return { sets: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, `${v.correct}/${v.total}`])), total };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const m = measure();
  let correct = 0, total = 0;
  for (const [k, v] of Object.entries(m)) {
    if (k === "sessionsMustFail" || k === "sessionsControls") { console.log(`  ${k}: ${v.correct}/${v.total}`); continue; }
    correct += v.correct; total += v.total;
    console.log(`${k}: ${v.correct}/${v.total}`);
    for (const x of v.misses) console.log(`    - ${x}`);
  }
  console.log(`ALL: ${correct}/${total}`);
}
