// Measures evaluation round 1's held-out sets (tests/ow-handoff-heldout-r1.mjs) on the checker as it stands: each
// sentence is planted in a golden run laid out as a real folder, and "caught" means a check gained a failure the
// unedited layout does not have. Not a test file; tests/ow-handoff-r1.test.js calls it, and
// `node tests/ow-handoff-measure-r1.mjs` prints the numbers for the round's report.
import { cleanup, failures, mutated, put } from "./ow-handoff-helpers.mjs";
import { FIXTURES, clientSentenceFindings, loadKey, seenLineOk } from "../scripts/ow-handoff-acceptance.mjs";
import { join } from "node:path";
import * as H from "./ow-handoff-heldout-r1.mjs";
import { FROZEN } from "./ow-handoff-measure.mjs";

const flat = (f) => Object.entries(f).flatMap(([c, p]) => p.split("\n").map((x) => `${c}: ${x}`));
const baseCache = new Map();
/** The failures an edit adds to a case's golden run, laid out as a real folder (the key optionally patched). */
export function fresh(c, edits, patch = null) {
  const k = `${c}|${JSON.stringify(patch)}`;
  if (!baseCache.has(k)) baseCache.set(k, new Set(flat(failures(c, mutated(c), patch))));
  const base = baseCache.get(k);
  let dir;
  try { dir = mutated(c, edits); } catch (e) { if (/changed nothing/.test(e.message)) return []; throw e; } // the planted text is the golden's own
  return flat(failures(c, dir, patch)).filter((x) => !base.has(x));
}
const HD = "opchain-work/handoffs/larkspur-ceramics";
const forced = (c, extra) => ({ checks: [...new Set([...loadKey(join(FIXTURES, c)).checks, ...extra])] });
const after = (anchor) => (s) => (t) => { const i = t.indexOf(anchor); if (i < 0) throw new Error(`no anchor ${anchor}`); return t.slice(0, i + anchor.length) + s + t.slice(i + anchor.length); };

export function measureR1() {
  const r = {};
  // M1: sessions
  const sess = H.SESSIONS.map(([c, text, ok]) => ({ c, text, ok, caught: fresh(c, { "session/answers.md": put(text) }).length > 0 }));
  r.sessions = { mustFail: sess.filter((x) => !x.ok).length, caught: sess.filter((x) => !x.ok && x.caught).length, controls: sess.filter((x) => x.ok).length, falsePos: sess.filter((x) => x.ok && x.caught).length, missed: sess.filter((x) => !x.ok && !x.caught).map((x) => `${x.c}: ${x.text.trim()}`), fp: sess.filter((x) => x.ok && x.caught).map((x) => `${x.c}: ${x.text.trim()}`) };
  // m1: structural-line bypass forms on two refusal screens and one no-op screen
  const screens = ["close-waiver-refused", "package-planted-key-waiver", "route-folder-nothing-left"];
  const byp = H.SCREEN_BYPASS.map((l) => ({ l, caught: screens.every((c) => fresh(c, { "printed.md": (t) => `${t.replace(/\n*$/, "\n")}${l}\n` }).length > 0) }));
  r.screens = { caught: byp.filter((x) => x.caught).length, of: byp.length, missed: byp.filter((x) => !x.caught).map((x) => x.l) };
  // m2: care promises in close.md's Arrangement and the close email, not-installed branch
  const care = (s) => fresh("close-unresponsive", { [`${HD}/close.md`]: after("## Arrangement\n\n")(`${s} `), [`${HD}/export/close-email.txt`]: (t) => `${t.replace(/\n*$/, "\n")}\n${s}\n` }).length > 0;
  r.care = { caught: H.CARE_PROMISES.filter(care).length, of: H.CARE_PROMISES.length, controls: H.CARE_CONTROLS.filter((s) => !care(s)).length, ofControls: H.CARE_CONTROLS.length, missed: H.CARE_PROMISES.filter((s) => !care(s)) };
  // m4: secrets-seen.log fields
  const line = ([n, s]) => `2027-02-01 (clock: user-stated) | ow-handoff 1.0.0 | rec 3 | name: ${n} | kind: key | source: ${s} | session: -accounts`;
  r.seen = { caught: H.SEEN_LEAKS.filter((x) => !seenLineOk(line(x))).length, of: H.SEEN_LEAKS.length, controls: H.SEEN_CONTROLS.filter((x) => seenLineOk(line(x))).length, ofControls: H.SEEN_CONTROLS.length };
  // m5: injection wordings at the end of the repository README the accounts run reads
  const inj = (s) => fresh("accounts", { "larkspur-repo/README.md": (t) => `${t.replace(/\n*$/, "\n")}${s}\n` }).some((x) => /^embedded:/.test(x));
  r.injection = { caught: H.INJECTIONS.filter(inj).length, of: H.INJECTIONS.length, controls: H.INJECTION_CONTROLS.filter((s) => !inj(s)).length, ofControls: H.INJECTION_CONTROLS.length, missed: H.INJECTIONS.filter((s) => !inj(s)) };
  // m7 and m8: client output (the Handoff notes' What happens next), meaning checks forced on
  const patch = forced("package", ["people", "private_names", "internal_numbers"]);
  const notes = (s, check) => fresh("package", { [`${HD}/handoff-notes.md`]: after("## What happens next\n\n")(`${s}\n\n`) }, patch).some((x) => x.startsWith(`${check}:`));
  r.privateNames = { caught: H.PRIVATE_SPLITS.filter((s) => notes(`The notes were written by ${s}.`, "private_names")).length, of: H.PRIVATE_SPLITS.length, controls: H.PRIVATE_CONTROLS.filter((s) => !notes(`The notes mention ${s}.`, "private_names")).length, ofControls: H.PRIVATE_CONTROLS.length };
  r.people = { caught: H.PEOPLE_UNLISTED.filter((s) => notes(s, "people")).length, of: H.PEOPLE_UNLISTED.length, controls: H.PEOPLE_UNLISTED_CONTROLS.filter((s) => !notes(s, "people")).length, ofControls: H.PEOPLE_UNLISTED_CONTROLS.length };
  r.ours = { caught: H.OURS_R1.filter((s) => clientSentenceFindings(s, FROZEN, "Robin").length).length, of: H.OURS_R1.length, controls: H.OURS_R1_CONTROLS.filter((s) => !clientSentenceFindings(s, FROZEN, "Robin").length).length, ofControls: H.OURS_R1_CONTROLS.length };
  cleanup();
  return r;
}
if (process.argv[1] && process.argv[1].endsWith("ow-handoff-measure-r1.mjs")) console.log(JSON.stringify(measureR1(), null, 1));
