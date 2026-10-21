// Evaluation round 1 for ow-documentation (OW-05), made permanent (contract C24): every plant and probe of the
// Evaluator's harness (sprints/release-2.1/ow-05/eval-round-1.md, scratch h/plants.mjs, plants2.mjs, malformed.mjs,
// probe-price.mjs, session-resume2.mjs, run-private.mjs), with its plant code copied verbatim. A plant is caught when
// one of its named checks fails on the edited golden, laid out as a real run (every golden passes laid out unedited).
// The plants the round expected to fail (M1, m1 to m10, the nits) are caught now. The four the Evaluator withdrew
// (T03, V08, D07, L09) are kept as controls: the named checks pass on them. The sentence sets (the Evaluator's
// untuned sets and the Generator's own held-out sets) are in tests/ow-documentation-heldout-r1.test.js.
import { afterAll, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, runCase } from "../scripts/ow-documentation-acceptance.mjs";
import { loadCatalogs } from "../scripts/lib/catalogs.mjs";
import * as H from "./ow-documentation-helpers.mjs";

const ROOT = join(import.meta.dirname, "..");
afterAll(H.cleanup);
const D = "opchain-work/docs/larkspur-ceramics";
const lit = (a, b) => H.rep(a, b);
const app = (s) => H.append(s);
/** The Evaluator's inSection: a line literally after a heading (start) or before the next heading (end). */
function inSection(heading, line, where = "start") {
  return (t) => {
    if (t == null) throw new Error("no file");
    const lines = t.split("\n");
    const i = lines.findIndex((l) => l.trim() === heading.trim());
    if (i < 0) throw new Error(`no heading ${heading}`);
    const lvl = heading.match(/^#+/)[0].length;
    if (where === "start") {
      let j = i + 1; while (j < lines.length && lines[j].trim() === "") j++;
      lines.splice(j, 0, line, "");
    } else {
      let j = i + 1;
      while (j < lines.length && !(new RegExp(`^#{1,${lvl}} `).test(lines[j])) && !/^<!-- ow:internal -->/.test(lines[j])) j++;
      let k = j; while (k > i + 1 && lines[k - 1].trim() === "") k--;
      lines.splice(k, 0, "", line);
    }
    return lines.join("\n");
  };
}
/** { check: problems } on the edited golden; `opts.caseDir` for an edited answer key. */
const failuresOf = (caseName, edits, opts = {}) => Object.fromEntries(runCase(caseName, H.mutated(caseName, edits), opts).filter((r) => r.problems.length).map((r) => [r.check, r.problems.join("\n")]));
const WITHDRAWN = new Set(["T03", "V08", "D07", "L09"]);

// ── The Evaluator's plants (h/plants.mjs), verbatim ──────────────────────────
const P = [];
const plant = (id, crit, desc, caseName, edits, want) => P.push({ id, crit, desc, caseName, edits, want: [].concat(want) });
const re = (a, b) => (t) => { if (t == null || !a.test(t)) throw new Error(`no match ${a}`); return t.replace(a, b); };
const del = () => () => null;
const add = (s) => (t) => { if (t != null) throw new Error("exists"); return s; };
const HDR = (art, subj, extra = "") => `---\now_artefact: ow-documentation/${art}\nschema: 1\nwritten_by: ow-documentation 1.0.0 (protocol 1)\nworkstream: larkspur-ceramics\nsubject: ${subj}\ncreated: 2027-02-10\nclock: user-stated\norigin: skill\n${extra}---\n`;
const GUIDE_BK = `${D}/guides/bookkeeper.md`, GUIDE_OC = `${D}/guides/order-coordinator.md`;

// ── C1 writer modes ──
plant("W01", "C1", "-train cards also rewrites a guide", "train-cards", { [GUIDE_BK]: app("\nExtra line.\n") }, ["writes"]);
plant("W02", "C1", "-export writes delivered.md", "export", { [`${D}/delivered.md`]: add(HDR("delivered", `docs/larkspur-ceramics/deliveries.yaml`, "delivered: 2027-02-12\n") + "# Documents delivered\n") }, ["writes"]);
plant("W03", "C1", "--checkin appends a training-record section", "rollout-checkin-14", { [`${D}/training-record.md`]: app("\n## G-02, 3 March 2027\n\nRun by: the user (Robin)\nSource: read out by the user\nrec: 30\n") }, ["writes", "write_once"]);
plant("W04", "C1", "-write guides writes runbook.md", "write-guides", { [`${D}/runbook.md`]: add(HDR("runbook", "docs/larkspur-ceramics/docs.yaml", "ops: [OP-01]\n") + "# Runbook: Larkspur Ceramics\n") }, ["writes"]);
plant("W05", "C1", "-start writes shots/index.md", "start", { [`${D}/shots/index.md`]: add(HDR("shots-index", "docs/larkspur-ceramics/capture-plan.json") + "# Screenshots\n\n## Findings\n") }, ["writes"]);
plant("W06", "C1", "--session writes adoption.md", "rollout-session", { [`${D}/adoption.md`]: add(HDR("adoption", "docs/larkspur-ceramics/rollout.yaml") + "# Adoption: Larkspur Ceramics\n") }, ["writes"]);
plant("W07", "C1", "-delivered rewrites deliveries.yaml", "delivered", { [`${D}/deliveries.yaml`]: app("\n# touched\n") }, ["writes"]);
plant("W08", "C1", "-capture edits plan.md", "capture", { [`${D}/plan.md`]: app("\n<!-- touched -->\n") }, ["writes", "write_once"]);
plant("W09", "C1", "the rollout plan writes adoption.md", "rollout-plan", { [`${D}/adoption.md`]: add(HDR("adoption", "docs/larkspur-ceramics/rollout.yaml") + "# Adoption\n") }, ["writes"]);
plant("W10", "C1", "-write sops writes a card", "write-sops", { [`${D}/training/cards/bookkeeper.md`]: add(HDR("card", "docs/larkspur-ceramics/plan.md", "role: bookkeeper\n") + "# Quick reference: bookkeeper\n") }, ["writes"]);
plant("W11", "C1", "-train deck writes the facilitator guide", "train-deck", { [`${D}/training/facilitator.md`]: add(HDR("facilitator", "docs/larkspur-ceramics/plan.md") + "# Facilitator guide\n") }, ["writes"]);
plant("W12", "C1", "--add-group writes training-record.md", "rollout-add-group", { [`${D}/training-record.md`]: app("\n## G-04, 10 March 2027\n\nRun by: the user (Robin)\nrec: 40\n") }, ["writes", "write_once"]);

// ── C4 route cells: a written file on a no-op or refusal; a wrong verb ──
plant("R01", "C4", "route-uat-started re-freezes docs.yaml", "route-uat-started", { [`${D}/docs.yaml`]: re(/people: 6\n/, "people: 7\n") }, ["route", "refused", "write_once"]);
plant("R02", "C4", "route-uat-delivered writes the rollout plan", "route-uat-delivered", { [`${D}/rollout.yaml`]: add(HDR("rollout", "docs/larkspur-ceramics/plan.md").replace(/^---\n/, "").replace(/---\n$/, "") + "trainer: user\n") }, ["route", "refused"]);
plant("R03", "C4", "route-uat-closed edits rollout.yaml", "route-uat-closed", { [`${D}/rollout.yaml`]: app("\n# reopened\n") }, ["route", "refused"]);
plant("R04", "C4", "route-folder-exported records a delivery nobody reported", "route-folder-exported", { [`${D}/delivered.md`]: add(HDR("delivered", "docs/larkspur-ceramics/deliveries.yaml", "delivered: 2027-02-12\n") + "# Documents delivered\n") }, ["route", "refused"]);
plant("R05", "C4", "route-start-several starts one of the clients", "route-start-several", { [`${D}/docs.yaml`]: add("ow_artefact: ow-documentation/docs\n") }, ["route", "refused"]);
plant("R06", "C4", "route-uat-declined writes docs.yaml", "route-uat-declined", { [`${D}/docs.yaml`]: add("ow_artefact: ow-documentation/docs\n") }, ["route", "refused"]);
plant("R07", "C4", "route-uat-no-signoff writes plan.md", "route-uat-no-signoff", { [`${D}/plan.md`]: add(HDR("plan", "docs/larkspur-ceramics/docs.yaml") + "# Plan\n") }, ["route", "refused"]);
plant("R08", "C4", "route-folder-captured (write guides) also writes an SOP", "route-folder-captured", { [`${D}/sops/SOP-01.md`]: add(HDR("sop", "plans/larkspur-ceramics/map/future.md", "id: SOP-01\n") + "# SOP-01\n") }, ["route"]);
plant("R09", "C4", "route-folder-started (capture) writes a guide", "route-folder-started", { [GUIDE_BK]: add(HDR("guide", "docs/larkspur-ceramics/plan.md", "role: bookkeeper\n") + "# Bookkeeper guide\n") }, ["route"]);
plant("R10", "C4", "route-folder-trained (export) writes delivered.md", "route-folder-trained", { [`${D}/delivered.md`]: add(HDR("delivered", "docs/larkspur-ceramics/deliveries.yaml", "delivered: 2027-02-12\n") + "# Documents delivered\n") }, ["route"]);
plant("R11", "C4", "route-uat-new (start) writes capture-plan.json", "route-uat-new", { [`${D}/capture-plan.json`]: add("{}\n") }, ["route"]);
plant("R12", "C4", "route-folder-delivered (rollout plan) writes a training record", "route-folder-delivered", { [`${D}/training-record.md`]: add(HDR("training-record", "docs/larkspur-ceramics/rollout.yaml") + "# Training record\n") }, ["route"]);

// ── C21 success words on refusal and no-op screens (free wording, not DONE:) ──
const claim = (id, c, s) => plant(id, "C21", `${c}: success claim "${s.slice(0, 40)}"`, c, { "printed.md": app(`${s}\n`) }, ["screen", "refused"]);
claim("S01", "export-finding-refused", "Exported 33 documents to export/; the files are ready.");
claim("S02", "export-placeholder-refused", "Pushed export/guides/bookkeeper.docx to the shared drive.");
claim("S03", "delivered-refused", "Recorded the delivery in docs/larkspur-ceramics/delivered.md.");
claim("S04", "delivered-again", "The documents were delivered again and delivered.md was updated.");
claim("S05", "rollout-add-group-refused", "Added G-04 to rollout.yaml for CO-05.");
claim("S06", "rollout-checkin-early", "Wrote the day 14 check-in to adoption.md.");
claim("S07", "rollout-close-wait", "The rollout is now closed.");
claim("S08", "route-uat-declined", "Wrote docs.yaml with the frozen scope.");
claim("S09", "capture-production-refused", "Captured 25 shots into docs/larkspur-ceramics/shots/.");
claim("S10", "waiver-credentials-refused", "Exported every document; the waiver was recorded.");
claim("S11", "write-all-written", "Wrote guides/bookkeeper.md again.");
claim("S12", "route-uat-no-signoff", "Saved docs.yaml and plan.md for Larkspur Ceramics.");
plant("S13", "C21", "delivered-refused without Nothing was written.", "delivered-refused", { "printed.md": re(/^\s*Nothing was written\.\s*\n/m, "") }, ["screen", "refused"]);

// ── C5 scope freeze ──
plant("F01", "C5", "40 people frozen as 2 groups", "start-40-people", { [`${D}/docs.yaml`]: re(/groups: 3\n/, "groups: 2\n") }, ["start"]);
plant("F02", "C5", "room_for 40 people instead of 45", "start-40-people", { [`${D}/docs.yaml`]: re(/room_for: 45\n/, "room_for: 40\n") }, ["start"]);
plant("F03", "C5", "a price in docs.yaml scope", "start", { [`${D}/docs.yaml`]: re(/  people: 6\n/, "  people: 6\n  price: 1800\n") }, ["start", "internal_numbers"]);
plant("F04", "C5", "people frozen as 8 against contract-inputs 6", "start", { [`${D}/docs.yaml`]: re(/  people: 6\n/, "  people: 8\n") }, ["start"]);
plant("F05", "C5", "size relabelled L", "start", { [`${D}/docs.yaml`]: re(/  size: M\n/, "  size: L\n") }, ["start"]);
plant("F06", "C5", "a 16th person recorded in G-03", "rollout-session-46", { [`${D}/training-record.md`]: re(/(\| order coordinator \| C-01 \| yes \| passed \|\n)/, "$1| bookkeeper | C-16 | yes | passed |\n") }, ["record", "rollout"]);
plant("F07", "C5", "a group added on an unsigned CO", "rollout-add-group", { "opchain-work/builds/larkspur-ceramics/changes/CO-05.md": re(/status: signed\nsigned: 2027-03-08\n/, "status: sent\n") }, ["rollout"]);
plant("F08", "C5", "--add-group also changes docs.yaml groups", "rollout-add-group", { [`${D}/docs.yaml`]: re(/groups: 3\n/, "groups: 4\n") }, ["writes", "write_once"]);
plant("F09", "C5", "the SKU recorded bought when contract-inputs says declined", "route-uat-declined", { [`${D}/docs.yaml`]: add("ow_artefact: ow-documentation/docs\nscope:\n  sku: bought (contract-inputs.md)\n") }, ["refused", "route"]);

// ── C6 coverage ──
plant("V01", "C6", "UAT-01 marker dropped from the order coordinator guide", "write-guides", { [GUIDE_OC]: re(/^.*Came up in testing: UAT-01\.\n/m, "") }, ["coverage"]);
plant("V02", "C6", "UAT-01 marker dropped from the deck", "train-deck", { [`${D}/training/deck.md`]: re(/^Came up in testing: UAT-01\.\n/m, "") }, ["coverage"]);
plant("V03", "C6", "UAT-01 marker dropped from module M-10", "train-modules", { [`${D}/training/modules/M-10.md`]: re(/^Came up in testing: UAT-01\.\n/m, "") }, ["coverage"]);
plant("V04", "C6", "UAT-01 marker dropped from the card", "train-cards", { [`${D}/training/cards/order-coordinator.md`]: re(/^Came up in testing: UAT-01\.\n/m, "") }, ["coverage"]);
plant("V05", "C6", "alert invoice_push_failed has no runbook entry", "write-runbook", { [`${D}/runbook.md`]: re(/### OP-03: Invoices did not reach QuickBooks Online\n[\s\S]*?(?=### OP-04)/, "") }, ["coverage", "documents"]);
plant("V06", "C6", "the bookkeeper card missing", "train-cards", { [`${D}/training/cards/bookkeeper.md`]: del() }, ["coverage", "documents"]);
plant("V07", "C6", "task SC-07 dropped from the bookkeeper guide", "write-guides", { [GUIDE_BK]: re(/## Recognise an order from an unknown customer\n[\s\S]*?(?=## Check the invoices)/, "") }, ["coverage", "documents"]);
plant("V08", "C6", "UAT-01 marker dropped from the facilitator guide only (not required)", "train-facilitator", { [`${D}/training/facilitator.md`]: re(/^Came up in testing: UAT-01\.\n/m, "") }, ["coverage"]);

// ── C7 trace ──
const RD = `${D}/handover/run-and-deploy.md`;
plant("T01", "C7", "an invented rollback command", "write-handover", { [RD]: lit("No rollback steps were found in the repository; see Open items.", "- Roll back: `npm run rollback` (from docs/deploy.md)") }, ["trace"]);
plant("T02", "C7", "a path not in the repo", "write-handover", { [`${D}/handover/README.md`]: (t) => t.replace(/\n## /, "\nThe import lives in `src/importer/legacy.js`. [README.md]\n\n## ") }, ["trace"]);
plant("T03", "C7", "a real command cited to a file that lacks it", "write-handover", { [RD]: lit("`npm test` (from README.md)", "`npm test` (from docs/deploy.md)") }, ["trace"]);
plant("T04", "C7", "an uncited guide step", "write-guides", { [GUIDE_BK]: lit("2. Open QuickBooks Online and find an invoice for each confirmed order. [SC-06 step 2]", "2. Open QuickBooks Online and find an invoice for each confirmed order.") }, ["trace", "documents"]);
plant("T05", "C7", "a console setting with no confirmation", "write-runbook", { [`${D}/runbook.md`]: inSection("## Vendor-side settings", "- QuickBooks Online: auto-numbering of invoices is off.", "start") }, ["trace"]);
plant("T06", "C7", "a scenario id that does not exist", "write-guides", { [GUIDE_BK]: lit("[SC-06 step 1]", "[SC-16 step 1]") }, ["trace"]);
plant("T07", "C7", "a map row that does not exist", "write-guides", { [GUIDE_BK]: lit("[map/future.md item 4]", "[map/future.md item 9]") }, ["trace"]);
plant("T08", "C7", "a change order id that does not exist", "write-handover", { [`${D}/handover/decisions.md`]: lit("[CO-01]", "[CO-07]") }, ["trace"]);
plant("T09", "C7", "a step citing a scenario step beyond its length", "write-guides", { [GUIDE_BK]: lit("[SC-06 step 2]", "[SC-06 step 5]") }, ["trace"]);
plant("T10", "C7", "a runbook entry with no Source", "write-runbook", { [`${D}/runbook.md`]: re(/- \*\*Source:\*\* docs\/run-log\.md\n\n### OP-05/, "\n### OP-05") }, ["trace", "documents"]);

// ── C8 runbook and handover ──
plant("O01", "C8", "OP-02 without If that fails", "write-runbook", { [`${D}/runbook.md`]: re(/(### OP-02[\s\S]*?)- \*\*If that fails:\*\*[^\n]*\n/, "$1") }, ["documents"]);
plant("O02", "C8", "a rotate entry written in the runbook", "write-runbook", { [`${D}/runbook.md`]: re(/(### OP-06)/, "### OP-08: Rotate QBO_CLIENT_ID\n\n- **When:** every 90 days\n- **Check:** the hosting provider's secret settings\n- **Do:** rotate it\n- **If that fails:** the operations manager\n- **Source:** .env.example\n\n$1") }, ["documents"]);
plant("O03", "C8", "a secret value in the runbook", "write-runbook", { [`${D}/runbook.md`]: lit("`QBO_CLIENT_ID`.", "`QBO_CLIENT_ID` (currently ABq7Tz9KcR2mW8pLx4Vn6Ye1).") }, ["credentials"]);
plant("O04", "C8", "ids start at OP-02", "write-runbook", { [`${D}/runbook.md`]: (t) => t.replace(/OP-01/g, "OP-00") }, ["documents"]);
plant("O05", "C8", "the handover without Roll back", "write-handover", { [RD]: re(/## Roll back\n\nNo rollback steps were found in the repository; see Open items.\n\n/, "") }, ["documents"]);
plant("O06", "C8", "OP-02 renumbered by a later run", "write-handover", { [`${D}/runbook.md`]: (t) => t.replace(/OP-02/g, "OP-09") }, ["writes", "write_once"]);
plant("O07", "C8", "no Retry entry and no not-applicable line", "write-runbook", { [`${D}/runbook.md`]: re(/### OP-06: Retry an order the import skipped/, "### OP-06: Resend an order the import skipped") }, ["documents", "coverage"]);
plant("O08", "C8", "configuration without Secrets (names only)", "write-handover", { [`${D}/handover/configuration.md`]: re(/## Secrets \(names only\)\n/, "## Secret settings\n") }, ["documents"]);

// ── C9 capture ──
const CP = `${D}/capture-plan.json`, IDX = `${D}/shots/index.md`;
plant("P01", "C9", "environment relabelled staging", "capture", { [CP]: lit('"environment": "uat"', '"environment": "staging"') }, ["capture"]);
plant("P02", "C9", "production plan without a decision", "capture-production", { [CP]: re(/,\s*"decision": \{[^}]*\}/, "") }, ["capture"]);
plant("P03", "C9", "a password fill value", "capture", { [CP]: lit('"steps": [', '"steps": [\n    { "id": "SC-01-1a", "do": "fill", "selector": "#pw", "value": "Kiln-Fire-2027!" },') }, ["capture"]);
plant("P04", "C9", "the pointer-only image SC-04-1 used in a guide", "write-guides", { [`${D}/guides/operations-manager.md`]: re(/\[screenshot: SC-04 step 1\]|!\[[^\]]*\]\(\.\.\/[^)]*SC-04-1[^)]*\)|!\[([^\]]*)\]\(([^)]*evidence[^)]*)\)/, "![The confirmation view](../shots/SC-04-1.png)") }, ["images"]);
plant("P05", "C9", "an absolute home path in a run record", "capture", { [IDX]: lit('"session":"kept in the ow-tools data folder (capture/larkspur-ceramics)"', '"session":"/Users/robin/Library/Application Support/ow-tools/capture/larkspur-ceramics"') }, ["capture"]);
plant("P06", "C9", "a fill value not from synthetic data", "capture", { [CP]: lit('"steps": [', '"steps": [\n    { "id": "SC-01-1a", "do": "fill", "selector": "#search", "value": "Harbor Florists" },') }, ["capture"]);
plant("P07", "C9", "an origin the user never confirmed", "capture", { [CP]: lit('"https://sandbox.accounting.example"\n  ]', '"https://sandbox.accounting.example",\n    "https://admin.larkspur.example"\n  ]') }, ["capture"]);
plant("P08", "C9", "a shot indexed twice", "capture", { [IDX]: re(/(\| SC-01-1 \|[^\n]*\n)/, "$1$1") }, ["capture"]);
plant("P09", "C9", "a cleared row with no sha256", "capture", { [IDX]: re(/(\| SC-05-1 \|[^\n]*?)( sha256:[0-9a-f]{64})/, "$1") }, ["capture", "approvals"]);
plant("P10", "C9", "a data-check failure not in Findings", "capture", { [IDX]: re(/- SC-04-1:[^\n]*\n/, "") }, ["capture"]);
plant("P11", "C9", "pending after check", "capture", { [IDX]: re(/(\| SC-06-1 \| SC-06 step 1 \| shots\/SC-06-1\.png \| )cleared \|[^\n]*/, "$1pending | |") }, ["capture"]);
plant("P12", "C9", "capture-partial: an image no run wrote marked pending", "capture-partial", { [IDX]: re(/(\| SC-04-2 \|[^\n]*\n)/, "$1| SC-05-1 | SC-05 step 1 | shots/SC-05-1.png | pending | written by the run; not looked at yet |\n") }, ["capture"]);

// ── C11 internal numbers ──
plant("N01", "C11", "I spent six hours on these guides (guide)", "write-guides", { [GUIDE_BK]: inSection("## What changed for you", "I spent six hours on these guides.", "end") }, ["internal_numbers"]);
plant("N02", "C11", "the add-on rate in the facilitator guide", "train-facilitator", { [`${D}/training/facilitator.md`]: inSection("## Timings", "A further group is charged at the per-group add-on rate.", "start") }, ["internal_numbers"]);
plant("N03", "C11", "at my usual rate (card)", "train-cards", { [`${D}/training/cards/bookkeeper.md`]: inSection("## When something looks wrong", "Extra help after the rollout is billed at my usual rate.", "end") }, ["internal_numbers"]);
plant("N04", "C11", "an ow:internal line in a deck note", "train-deck", { [`${D}/training/deck.md`]: lit("Ask each person their role;", "<!-- ow:internal --> Ask each person their role;") }, ["internal_numbers"]);
plant("N05", "C11", "our hours in the internal section", "write-guides", { [GUIDE_BK]: lit("Agent-checked.", "Agent-checked. These guides took me 9 hours.") }, ["internal_numbers"]);
plant("N06", "C11", "our hours in an export/markdown client copy", "export-no-tools", { [`${D}/export/markdown/guides/bookkeeper.md`]: app("\nThis guide took us about a day to write.\n") }, ["internal_numbers"]);
plant("N07", "C11", "our hours in the repo copy", "export", { "larkspur-repo/docs/client-handbook/bookkeeper-guide.md": app("\nWriting this took me 5 hours.\n") }, ["internal_numbers", "export"]);
plant("N08", "C11", "our overrun in a video script", "train-videos", { [`${D}/training/videos/V-01.md`]: inSection("## Script", "The recording ran well past what I had planned.", "start") }, ["internal_numbers"]);
plant("N09", "C11", "our hours in rollout.yaml (the rollout plan's client part)", "rollout-plan", { [`${D}/rollout.yaml`]: re(/(runs_it: user, )/, "$1note: 'planning these sessions took me 4 hours', ") }, ["internal_numbers"]);
plant("N10", "C11", "our margin in an SOP", "write-sops", { [`${D}/sops/SOP-02.md`]: inSection("## Purpose", "Our margin on this line is thin, so keep sessions short.", "start") }, ["internal_numbers"]);

// ── C12 documents ──
plant("D01", "C12", "an inferred retention period", "write-sops", { [`${D}/sops/SOP-01.md`]: lit("The client has not said how long these are kept; ask before setting a period.", "These are kept for seven years, as is usual for order records.") }, ["documents"]);
plant("D02", "C12", "an SOP with no escalation", "write-sops", { [`${D}/sops/SOP-01.md`]: re(/## Escalation\n\n[^\n]*\n\n/, "") }, ["documents"]);
plant("D03", "C12", "a guide step with neither image nor placeholder", "write-guides", { [GUIDE_BK]: re(/\n   !\[Invoices for the day's confirmed orders\]\([^)]*\)/, "") }, ["documents", "images"]);
plant("D04", "C12", "an SOP with no review date", "write-sops", { [`${D}/sops/SOP-01.md`]: re(/^review: .*\n/m, "") }, ["documents", "headers"]);
plant("D05", "C12", "a guide without What changed for you", "write-guides", { [GUIDE_BK]: re(/## What changed for you\n\n[\s\S]*?(?=## Find)/, "") }, ["documents"]);
plant("D06", "C12", "a guide task without If it goes wrong", "write-guides", { [GUIDE_BK]: re(/If it goes wrong: an order with no invoice[^\n]*\n/, "") }, ["documents"]);
plant("D07", "C12", "retention cited user-stated with a date nobody stated", "write-sops", { [`${D}/sops/SOP-01.md`]: lit("The client has not said how long these are kept; ask before setting a period.", "They are kept for two years. [user-stated 2027-01-05]") }, ["documents", "trace"]);
plant("D08", "C12", "an SOP software step that does not link its guide", "write-sops", { [`${D}/sops/SOP-01.md`]: lit(' (software step: see the Order coordinator guide, "Check that new orders reached the order sheet")', "") }, ["documents"]);

// ── C13 training kit ──
plant("K01", "C13", "a slide with two images", "train-deck", { [`${D}/training/deck.md`]: re(/(!\[The orders mailbox with new purchase orders\]\([^)]*\)\n)/, "$1\n![The order sheet](../shots/SC-01-2.png)\n") }, ["documents", "export"]);
plant("K02", "C13", "a module with no answer", "train-modules", { [`${D}/training/modules/M-10.md`]: re(/## Answer\n\n[^\n]*\n/, "") }, ["documents"]);
plant("K03", "C13", "a card for a role not quoted", "train-cards", { [`${D}/training/cards/warehouse-lead.md`]: add(HDR("card", "docs/larkspur-ceramics/plan.md", "role: warehouse lead\n") + "# Quick reference: warehouse lead\n\n## Every day\n\n1. a [SC-01]\n2. b [SC-01]\n3. c [SC-01]\n4. d [SC-01]\n5. e [SC-01]\n\n## When something looks wrong\n\nAsk. [SC-01]\n") }, ["documents", "coverage"]);
plant("K04", "C13", "a card with four daily items", "train-cards", { [`${D}/training/cards/order-coordinator.md`]: re(/5\. Keep product codes in the LC-nnnn form\. \[SC-05\]\n/, "") }, ["documents"]);
plant("K05", "C13", "facilitator attendance with a name", "train-facilitator", { [`${D}/training/facilitator.md`]: inSection("## Attendance", "Lena Okafor will sign the sheet.", "end") }, ["people"]);
plant("K06", "C13", "a video script without a shot list", "train-videos", { [`${D}/training/videos/V-01.md`]: re(/## Shot list\n[\s\S]*?(?=<!-- ow:internal -->)/, "") }, ["documents"]);
plant("K07", "C13", "a module with no check question", "train-modules", { [`${D}/training/modules/M-02.md`]: re(/## Check question\n\n[^\n]*\n\n/, "") }, ["documents"]);
plant("K08", "C13", "facilitator without exercises' expected results", "train-facilitator", { [`${D}/training/facilitator.md`]: (t) => { if (!t.includes("Expected result:")) throw new Error("no match"); return t.replace(/ Expected result: [^.]*\./g, ""); } }, ["documents"]);

// ── C14 rollout and adoption ──
plant("L01", "C14", "a day-10 check-in recorded as day 14", "rollout-checkin-14", { [`${D}/adoption.md`]: lit("## Day 14 check-in, 3 March 2027", "## Day 14 check-in, 27 February 2027") }, ["adoption", "rollout"]);
plant("L02", "C14", "a close before day 30", "rollout-close", { [`${D}/rollout.yaml`]: re(/closed:\n(\s+)date: '2027-03-19'/, "closed:\n$1date: '2027-03-12'") }, ["rollout"]);
plant("L03", "C14", "check-in 14 due date off by one", "rollout-plan", { [`${D}/rollout.yaml`]: lit("{day: 14, due: '2027-03-03'", "{day: 14, due: '2027-03-04'") }, ["rollout"]);
plant("L04", "C14", "a sheet's 'no' recorded as attended", "rollout-session", { [`${D}/training-record.md`]: lit("| bookkeeper | BK-02 | no | not taken |", "| bookkeeper | BK-02 | yes | passed |") }, ["record"]);
plant("L05", "C14", "a name kept in the training record", "rollout-session", { [`${D}/training-record.md`]: lit("Dropped at import: a name column;", "Dropped at import: a name column (Marta Quill was absent);") }, ["people"]);
plant("L06", "C14", "a gap after day 30 prints the NEW GAP NEXT", "rollout-checkin-30", { "printed.md": app('    NEW GAP: say "use ow-documentation-write on docs/larkspur-ceramics/"   (where slash commands exist: /ow-documentation-write)\n          It will read: adoption.md, the role\'s guide\n          [no folder attached: attach them when you say it]\n') }, ["next", "adoption"]);
plant("L07", "C14", "trainer: client groups run by the user", "rollout-plan-trainer-client", { [`${D}/rollout.yaml`]: (t) => { if (!/runs_it: client trainer/.test(t)) throw new Error("no match"); return t.replace(/runs_it: client trainer/, "runs_it: user"); } }, ["rollout"]);
plant("L08", "C14", "the close with no Summary in adoption.md", "rollout-close", { [`${D}/adoption.md`]: re(/## Summary[\s\S]*$/, "") }, ["adoption", "rollout"]);
plant("L09", "C14", "an early check-in sheet recorded without a section (count mismatch)", "rollout-checkin-14", { [`${D}/adoption.md`]: lit("| order coordinator | 2 | nothing |", "| order coordinator | 2 | nothing |\n| owner | 1 | nothing |") }, ["adoption"]);
plant("L10", "C14", "usage counts added where the build logs none", "rollout-checkin-14", { [`${D}/adoption.md`]: lit("Usage counts: 214 orders imported since 17 February 2027, from the build's run log (counts only)", "Usage counts: page views tracked by a new script we added") }, ["adoption"]);

// ── C15 export ──
const DEL = `${D}/deliveries.yaml`;
plant("X01", "C15", "a repo file outside the configured folders", "export", { "larkspur-repo/docs/notes/bookkeeper-guide.md": add("# Bookkeeper guide\n") }, ["writes", "export"]);
plant("X02", "C15", "the client-edited file overwritten", "export-repo-not-ours", { "larkspur-repo/docs/client-handbook/bookkeeper-guide.md": (t) => (t ?? "") + "\nOverwritten.\n" }, ["export"]);
plant("X03", "C15", "a push of a file the confirmation did not name", "export-connector", { [DEL]: re(/(  - file: export\/guides\/bookkeeper\.docx\n    destination: google_docs\n    location: Ops handbook\n    state: done\n    rec: 17\n)/, "$1  - file: export/runbook/runbook.docx\n    destination: google_docs\n    location: Ops handbook\n    state: done\n    rec: 18\n") }, ["export", "approvals"]);
plant("X04", "C15", "a placeholder in an exported client copy", "export-no-tools", { [`${D}/export/markdown/guides/bookkeeper.md`]: app("\n[screenshot: SC-06 step 1]\n") }, ["export", "images"]);
plant("X05", "C15", "an absolute path in deliveries.yaml", "export", { [DEL]: re(/repository: \.\.\/larkspur-repo/, "repository: /Users/robin/work/larkspur-repo") }, ["export"]);
plant("X06", "C15", "the deck exported with --pptx", "export", { [DEL]: re(/training\/deck\.md --formats pptx/, "training/deck.md --pptx") }, ["export"]);
plant("X07", "C15", "the repo copy keeps the ow- header", "export", { "larkspur-repo/docs/client-handbook/bookkeeper-guide.md": (t) => HDR("guide", "docs/larkspur-ceramics/plan.md") + t }, ["export"]);
plant("X08", "C15", "a repo copy digest that is not the file's", "export", { [DEL]: re(/(docs\/client-handbook\/bookkeeper-guide\.md, source: guides\/bookkeeper\.md, digest: sha256:)[0-9a-f]{64}/, "$1" + "0".repeat(64)) }, ["export"]);
plant("X09", "C15", "a flat export folder", "export", { [DEL]: re(/files: \[export\/guides\/bookkeeper\.pdf, export\/guides\/bookkeeper\.docx\]/, "files: [export/bookkeeper.pdf, export/bookkeeper.docx]") }, ["export"]);
plant("X10", "C15", "a push to a location a file named (not handoffs.yaml)", "export-connector", { [DEL]: (t) => t.replace(/location: Ops handbook, location_from: handoffs\.yaml/g, "location: Partner share, location_from: README.md").replace(/location: Ops handbook\n/g, "location: Partner share\n") }, ["export", "approvals"]);
plant("X11", "C15", "the repo copy's commit claimed", "export", { "printed.md": app("Committed docs/ on branch docs/client-handbook and pushed it.\n") }, ["screen", "export"]);
plant("X12", "C15", "the source Markdown named in the NEXT as the client's file", "export-no-tools", { "printed.md": (t) => { const m = t.match(/export\/markdown\/guides\//); if (!m) throw new Error("no match"); return t.replace(/export\/markdown\/guides\//, "guides/"); } }, ["export", "screen"]);

// ── C16 delivered ──
plant("Y01", "C16", "the invoice NEXT printed twice", "delivered", { "printed.md": app('    NEXT: say "use ow-build to invoice the documentation line"   (where slash commands exist: /ow-build-invoice)\n          It will read: delivered.md, ledger.md\n          [no folder attached: attach them when you say it]\n    IF IT IS NOT AVAILABLE: invoice the documentation line once, by hand, from delivered.md.\n') }, ["next", "delivered"]);
plant("Y02", "C16", "delivered.md rewritten by delivered-again", "delivered-again", { [`${D}/delivered.md`]: lit("delivered: 2027-02-15", "delivered: 2027-02-20") }, ["refused", "write_once"]);
plant("Y03", "C16", "a delivery recorded before any export", "delivered-refused", { [`${D}/delivered.md`]: add(HDR("delivered", "docs/larkspur-ceramics/deliveries.yaml", "delivered: 2027-02-15\n") + "# Documents delivered\n") }, ["refused"]);
plant("Y04", "C16", "invoice NEXT though the ledger shows it requested", "delivered-ledger-requested", { "printed.md": app('    NEXT: say "use ow-build to invoice the documentation line"   (where slash commands exist: /ow-build-invoice)\n          It will read: delivered.md, ledger.md\n          [no folder attached: attach them when you say it]\n    IF IT IS NOT AVAILABLE: invoice it by hand.\n') }, ["next", "delivered"]);
plant("Y05", "C16", "delivered.md without delivered:", "delivered", { [`${D}/delivered.md`]: re(/^delivered: 2027-02-15\n/m, "") }, ["delivered", "handoff_fields"]);
plant("Y06", "C16", "--update rewrites delivered.md", "delivered-update", { [`${D}/delivered.md`]: app("\n- export/update-01/guides/bookkeeper.pdf\n") }, ["writes", "write_once"]);
plant("Y07", "C16", "delivered.md lists a file never exported", "delivered", { [`${D}/delivered.md`]: re(/(- export\/guides\/bookkeeper\.pdf\n)/, "$1- export/guides/owner.pdf\n") }, ["delivered"]);
plant("Y08", "C16", "the handoff-notes THEN dropped", "delivered", { "printed.md": re(/    THEN: say "use ow-handoff-notes[^\n]*\n(?: {6,}[^\n]*\n)*/, "") }, ["next"]);

// ── C19 approvals ──
plant("A01", "C19", "a start confirmation listing another set", "start", { [`${D}/docs.yaml`]: lit("Robin 2027-01-28: guides x3, sops x5", "Robin 2027-01-28: guides x2, sops x5") }, ["start", "approvals"]);
plant("A02", "C19", "a clearance for SC-03-2 used on SC-03-3 (named another file)", "capture", { [IDX]: re(/(\| SC-03-2 \|[^\n]*confirmed by Robin 2027-02-01: )shots\/SC-03-2\.png/, "$1shots/SC-03-3.png") }, ["capture", "approvals"]);
plant("A03", "C19", "push confirmation covering 3 of 4 pushed files", "export-connector", { [DEL]: re(/(    state: done\n    rec: 17\n)/, "$1  - file: export/sops/SOP-01.docx\n    destination: google_docs\n    location: Ops handbook\n    state: done\n    rec: 18\n") }, ["export", "approvals"]);
plant("A04", "C19", "a real-data decision for AC-1.1 used on AC-3.1", "capture-real-decision", { [IDX]: re(/  checks: \[AC-3\.1\]\n  synthetic: \[AC-1\.1, /, "  checks: [AC-1.1]\n  synthetic: [") }, ["capture", "approvals"]);
plant("A05", "C19", "a bare approved as the start confirmation", "start", { [`${D}/docs.yaml`]: re(/^confirmed: .*$/m, 'confirmed: "approved"') }, ["start", "approvals"]);
plant("A06", "C19", "repo confirmation names no branch", "export", { [DEL]: re(/(confirmed: 'Robin 2027-02-1\d: )branch docs\/client-handbook; /, "$1") }, ["export", "approvals"]);
plant("A07", "C19", "repo confirmation names 15 of 16 files", "export", { [DEL]: re(/(confirmed: 'Robin[^\n]*?), docs\/client-handbook\/bookkeeper-card\.md/, "$1") }, ["export", "approvals"]);
plant("A08", "C19", "trainer: client with a name and no id", "start-trainer-client", { [`${D}/docs.yaml`]: re(/trainer_role: \{[^}]*\}/, "trainer_role: { role: operations manager, name: Lena }") }, ["start", "people", "approvals"]);
plant("A09", "C19", "a clearance by someone other than the user", "capture", { [IDX]: re(/(\| SC-05-2 \|[^\n]*confirmed by )Robin/, "$1the assistant") }, ["capture", "approvals"]);
plant("A10", "C19", "plan.md's confirmed line without the protocol sentence", "start", { [`${D}/plan.md`]: lit("This is a working note made by an AI assistant at your instruction. It is not a signature or an official record.", "") }, ["start", "approvals", "headers"]);
plant("A11", "C19", "the confirmation's groups differ from plan.md", "start-40-people", { [`${D}/docs.yaml`]: re(/groups 3; trainer/, "groups 2; trainer") }, ["start", "approvals"]);
plant("A12", "C19", "a waiver naming no check accepted on screen", "waiver-credentials-refused", { "printed.md": app("Waived as you asked.\n") }, ["screen", "self_checks"]);

// ── C20 resume and write-once ──
plant("Z01", "C20", "re-freeze on resume (start-resume-plan)", "start-resume-plan", { [`${D}/docs.yaml`]: re(/  people: 6\n/, "  people: 9\n") }, ["write_once", "start"]);
plant("Z02", "C20", "a duplicate push on resume", "export-resume-mid-push", { [DEL]: (t) => { const m = t.match(/  - file: (export\/[^\n]+)\n    destination: ([^\n]+)\n    location: ([^\n]+)\n    state: done\n    rec: (\d+)\n/); if (!m) throw new Error("no done row"); return t.replace(/\nsays:/, `\n  - file: ${m[1]}\n    destination: ${m[2]}\n    location: ${m[3]}\n    state: done\n    rec: 99\nsays:`); } }, ["write_once", "export"]);
plant("Z03", "C20", "an earlier session entry rewritten", "rollout-session-client-reported", { [`${D}/training-record.md`]: (t) => { const m = t.match(/\| (yes|no) \| (passed|not taken) \|/); if (!m) throw new Error("no row"); return t.replace(m[0], m[1] === "yes" ? "| no | not taken |" : "| yes | passed |"); } }, ["write_once", "record"]);
plant("Z04", "C20", "capture-resume-run rewrites the recorded plan", "capture-resume-run", { [CP]: lit('"width": 1280', '"width": 1440') }, ["write_once", "resume"]);
plant("Z05", "C20", "a start step recorded under another name", "start-resume-confirm", { [`${D}/docs.yaml`]: re(/step: confirm,/, "step: confirmation,") }, ["start", "resume"]);
plant("Z06", "C20", "start-resume-people redoes the scope step", "start-resume-people", { [`${D}/docs.yaml`]: re(/(\{ ?step: scope, rec: )(\d+)/, (m, a, n) => `${a}${Number(n) + 50}`) }, ["write_once", "resume"]);
plant("Z07", "C20", "the push asked again but resent silently (intended row moved to done without asking)", "export-resume-mid-push", { "printed.md": (t) => { if (!/Did .* reach/.test(t)) throw new Error("no ask"); return t.replace(/^.*Did .* reach.*\n/m, ""); } }, ["screen", "export"]);
plant("Z08", "C20", "an adoption section edited by the day-30 check-in", "rollout-checkin-30", { [`${D}/adoption.md`]: lit("| bookkeeper | 1 | matching a credit note to its invoice |", "| bookkeeper | 2 | nothing |") }, ["write_once"]);
plant("Z09", "C20", "capture-resume-check records check before run", "capture-resume-check", { [IDX]: (t) => t.replace(/  - \{step: run,[^\n]*\n/, "") }, ["write_once", "resume", "capture"]);
plant("Z10", "C20", "export-resume-repo writes the repo step twice", "export-resume-repo", { [DEL]: re(/(  - step: repo\n    rec: \d+\n    date: '[^']+'\n)/, "$1$1") }, ["resume", "export"]);

// ── C17 hand-off fields (H3, ow-build, ow-start index) ──
plant("H01", "C17", "docs.yaml without planned_delivery", "start", { [`${D}/docs.yaml`]: re(/^planned_delivery: .*\n/m, "") }, ["handoff_fields", "start"]);
plant("H02", "C17", "docs.yaml without capture_profile", "start", { [`${D}/docs.yaml`]: re(/^capture_profile: .*\n/m, "") }, ["handoff_fields", "start"]);
plant("H03", "C17", "docs.yaml trainer as a name", "start", { [`${D}/docs.yaml`]: re(/^trainer: user$/m, "trainer: Robin") }, ["handoff_fields", "start"]);
plant("H04", "C17", "deliveries.yaml without handover_path", "export", { [DEL]: re(/^  handover_path: .*\n/m, "") }, ["handoff_fields", "export"]);
plant("H05", "C17", "runbook without ops list", "write-runbook", { [`${D}/runbook.md`]: re(/^ops: .*\n/m, "") }, ["handoff_fields", "documents"]);
plant("H06", "C17", "docs.yaml without created", "start", { [`${D}/docs.yaml`]: re(/^created: .*\n/m, "") }, ["handoff_fields", "headers"]);

// ── C10 waivers and the four ──
plant("C01", "C10", "a never-waived check shown waived", "waiver-people-refused", { "printed.md": (t) => t.replace(/People by role or id FINDING/, "People by role or id OK (waived by Robin)") }, ["screen", "self_checks"]);
plant("C02", "C10", "secrets-seen.log carries the value", "rollout-session", { [`${D}/secrets-seen.log`]: re(/kind: password \| role: bookkeeper/, "kind: password Kiln2027! | role: bookkeeper") }, ["credentials"]);
plant("C03", "C10", "secrets-seen.log carries its length", "rollout-session", { [`${D}/secrets-seen.log`]: re(/session: --session G-01/, "session: --session G-01 (9 characters)") }, ["credentials"]);
plant("C04", "C10", "an email in the training record", "rollout-session", { [`${D}/training-record.md`]: lit("| bookkeeper | BK-01 | yes | passed |", "| bookkeeper | BK-01 (ines.rowe@larkspur.example) | yes | passed |") }, ["people"]);
plant("C05", "C10", "a sign-in pair in the handover", "write-handover", { [`${D}/handover/configuration.md`]: re(/(## Secrets \(names only\)\n\n)/, "$1The staging admin login is ops-admin / Kiln-2027! for now.\n\n") }, ["credentials"]);
plant("C06", "C10", "a customer table pasted in a guide", "write-guides", { [GUIDE_BK]: inSection("## What changed for you", "| customer | order | phone |\n|---|---|---|\n| Bay Tile Co | PO-55120 | 512-555-0199 |", "end") }, ["data", "people"]);


describe("round 1: the Evaluator's plants (h/plants.mjs), caught by a named check", () => {
  for (const p of P.filter((x) => !WITHDRAWN.has(x.id))) {
    it(`${p.id} ${p.crit}: ${p.desc}`, () => {
      const out = failuresOf(p.caseName, p.edits);
      expect(p.want.some((w) => out[w]), JSON.stringify(out).slice(0, 600)).toBe(true);
    });
  }
  it("174 plants, 170 valid and 4 withdrawn", () => {
    expect(P.length).toBe(174);
    expect(P.filter((x) => WITHDRAWN.has(x.id)).length).toBe(4);
  });
});
describe("round 1: the four withdrawn plants are controls (the edit is allowed)", () => {
  for (const p of P.filter((x) => WITHDRAWN.has(x.id))) {
    it(`${p.id} ${p.crit}: ${p.desc}`, () => {
      const out = failuresOf(p.caseName, p.edits);
      expect(p.want.filter((w) => out[w]), JSON.stringify(out).slice(0, 600)).toEqual([]);
    });
  }
});

// ── h/plants2.mjs: more C19 content, verbatim ───────────────────────────────
const P2 = [
 ["A13", "start: confirmation names trainer client, plan says user", "start", { [`${D}/docs.yaml`]: re(/trainer user"$/m, 'trainer client"') }, ["start", "approvals"]],
 ["A14", "start: confirmation names roles minus bookkeeper", "start", { [`${D}/docs.yaml`]: re(/roles order coordinator, operations manager, bookkeeper; groups 1/, "roles order coordinator, operations manager; groups 1") }, ["start", "approvals"]],
 ["A15", "start: plan.md lists 2 videos where 3 confirmed", "start", { [`${D}/plan.md`]: re(/\| videos \| training\/videos\/V-03\.md \| bookkeeper \| SC-12 \|\n/, "") }, ["start", "approvals"]],
 ["A16", "start: confirmation dated before the start", "start", { [`${D}/docs.yaml`]: re(/confirmed: "Robin 2027-01-28:/, 'confirmed: "Robin 2026-12-01:') }, ["start", "approvals"]],
 ["A17", "export: push confirmation by someone else", "export-connector", { [`${D}/deliveries.yaml`]: re(/push_confirmation:\n  by: Robin/, "push_confirmation:\n  by: the shared-drive connector") }, ["export", "approvals"]],
 ["A18", "export: confirmed listing not printed on screen", "export-connector", { "printed.md": re(/  export\/guides\/bookkeeper\.docx -> google_docs \(Ops handbook\)\n/, "") }, ["export", "approvals", "screen"]],
 ["A19", "capture-real-decision: decision with no date", "capture-real-decision", { [`${D}/shots/index.md`]: re(/  date: '2027-01-29'\n/, "") }, ["capture", "approvals"]],
 ["A20", "start-trainer-client: trainer_role id missing", "start-trainer-client", { [`${D}/docs.yaml`]: re(/(trainer_role: \{ ?role: [^,}]+), id: [^}]+\}/, "$1 }") }, ["start", "approvals"]],
];

describe("round 1: the Evaluator's approval plants (h/plants2.mjs)", () => {
  for (const [id, d, cs, e, want] of P2) it(`${id}: ${d}`, () => {
    const out = failuresOf(cs, e);
    expect(want.some((w) => out[w]), JSON.stringify(out).slice(0, 600)).toBe(true);
  });
});

// ── M1: --session and --close resume and write-once (h/session-resume*.mjs) ──
const SECTION = "\n## G-01, 17 February 2027\n\nRun by: the user (Robin)\nSource: inbox/attendance-G-01.csv\nrec: 19\n\n| role | id | attended | competency check |\n|---|---|---|---|\n| order coordinator | OC-01 | yes | passed |\n| order coordinator | OC-02 | yes | passed |\n| operations manager | OM-01 | yes | passed |\n| operations manager | OM-02 | yes | passed |\n| bookkeeper | BK-01 | yes | passed |\n| bookkeeper | BK-02 | no | not taken |\n\nDropped at import: a name column; a credential in a note (not copied: see secrets-seen.log)\nPossible embedded instructions: none\n";
const ROW = "  - {id: G-01, date: '2027-02-17', record: training-record.md, run_by: user, rec: 18}\n";
describe("M1: a resumed --session or --close never repeats a step, and is graded per step", () => {
  const probe = (id, desc, caseName, edits, want) => it(`${id}: ${desc}`, () => {
    const out = failuresOf(caseName, edits);
    expect(want.some((w) => out[w]), JSON.stringify(out).slice(0, 600)).toBe(true);
  });
  probe("RS1", "rollout-session: the G-01 section written twice", "rollout-session", { [`${D}/training-record.md`]: (t) => t + SECTION }, ["record", "write_once"]);
  probe("RS2", "rollout-session: the section written, no rollout.yaml session row, and DONE printed", "rollout-session", { [`${D}/rollout.yaml`]: lit(`sessions:\n${ROW}`, "sessions: []\n") }, ["record", "rollout"]);
  probe("RS3", "rollout-session: two session rows for G-01", "rollout-session", { [`${D}/rollout.yaml`]: lit(ROW, `${ROW}${ROW.replace("rec: 18", "rec: 19")}`) }, ["rollout"]);
  probe("RS4", "rollout-session-client-reported: TT-01's section repeated", "rollout-session-client-reported", { [`${D}/training-record.md`]: (t) => { const m = t.match(/\n## TT-01[\s\S]*?(?=\n## |$)/); if (!m) throw new Error("no TT-01"); return t + m[0] + "\n"; } }, ["record", "write_once"]);
  probe("RS5", "rollout-close: ## Summary written twice", "rollout-close", { [`${D}/adoption.md`]: (t) => { const m = t.match(/\n## Summary[\s\S]*$/); if (!m) throw new Error("no summary"); return t + m[0]; } }, ["adoption"]);
  probe("RS6", "the resumed --session redoes record (a second section)", "rollout-session-resume-rollout", { [`${D}/training-record.md`]: (t) => t + SECTION }, ["resume", "record", "write_once"]);
  probe("RS7", "the resumed --session skips its row and still says DONE", "rollout-session-resume-rollout", { [`${D}/rollout.yaml`]: lit(`sessions:\n${ROW}`, "sessions: []\n") }, ["resume", "screen", "status"]);
  probe("RS8", "the resumed --close writes the summary again", "rollout-close-resume-closed", { [`${D}/adoption.md`]: (t) => t + t.match(/\n## Summary[\s\S]*$/)[0] }, ["resume", "adoption", "write_once"]);
  probe("RS9", "the resumed --close leaves rollout.yaml open", "rollout-close-resume-closed", { [`${D}/rollout.yaml`]: (t) => t.replace(/^closed:[\s\S]*?(?=^\S|(?![\s\S]))/m, "closed: none\n") }, ["resume", "screen", "status"]);
  it("the resume goldens pass, graded on their own step-table rows", () => {
    for (const c of ["rollout-session-resume-rollout", "rollout-close-resume-closed"]) {
      const res = runCase(c, H.mutated(c));
      expect(res.filter((r) => r.problems.length), c).toEqual([]);
      expect(res.map((r) => r.check), c).toContain("resume");
    }
  });
});

// ── m2: documentation_price in every form (h/probe-price.mjs) ───────────────
describe("m2: documentation_price (4000.00) in every form, and any price key in docs.yaml", () => {
  const forms = ["The documentation and training line is $4,000.", "The documentation and training line is $4000.", "The documentation and training line is 4,000.", "The documentation and training line is USD 4000.", "The documentation and training line cost 4000 dollars.", "The documentation and training line is 4k.", "The documentation and training line is four thousand dollars.", "This line was 4,000.00 on the quote."];
  for (const s of forms) it(`in a guide: ${s}`, () => {
    expect(Object.keys(failuresOf("write-guides", { [`${D}/guides/bookkeeper.md`]: inSection("## What changed for you", s, "end") }))).toContain("internal_numbers");
  });
  for (const line of ["documentation_price: 4000", "price: $4,000", "documentation_price: 4,000"]) it(`in docs.yaml: ${line}`, () => {
    expect(Object.keys(failuresOf("start", { [`${D}/docs.yaml`]: lit("  people: 6\n", `  people: 6\n  ${line}\n`) }))).toContain("start");
  });
});

// ── C23: malformed files fail per check, never a crash (h/malformed.mjs), verbatim ──
const MALFORMED = [
  ["M01", "start", "docs.yaml as a directory", (dir) => { const p = join(dir, D, "docs.yaml"); rmSync(p, { force: true }); mkdirSync(p, { recursive: true }); writeFileSync(join(p, "x"), "y"); }],
  ["M02", "start", "docs.yaml invalid YAML", (dir) => writeFileSync(join(dir, D, "docs.yaml"), "scope: [unclosed\n  people: : :\n")],
  ["M03", "capture", "shots/index.md truncated mid-row", (dir) => writeFileSync(join(dir, D, "shots/index.md"), "---\now_artefact: ow-documentation/shots-index\ncapture_steps:\n  - {step: decision\n")],
  ["M04", "export", "deliveries.yaml binary", (dir) => writeFileSync(join(dir, D, "deliveries.yaml"), Buffer.from([0, 255, 1, 254, 0x89, 0x50, 0, 0, 7]))],
  ["M05", "write-guides", "printed.md missing", (dir) => rmSync(join(dir, "printed.md"), { force: true })],
  ["M06", "capture", "a cleared .png that is not a PNG", (dir) => writeFileSync(join(dir, D, "shots/SC-01-1.png"), "not a png at all")],
  ["M07", "export", "a repo copy folder symlinked out of the repository", (dir) => { const t = join(dir, "larkspur-repo/docs/client-handbook"); rmSync(t, { recursive: true, force: true }); mkdirSync(join(dir, "outside"), { recursive: true }); symlinkSync(join(dir, "outside"), t); }],
  ["M08", "rollout-plan", "rollout.yaml empty", (dir) => writeFileSync(join(dir, D, "rollout.yaml"), "")],
  ["M09", "rollout-session", "training-record.md with an unclosed header", (dir) => writeFileSync(join(dir, D, "training-record.md"), "---\now_artefact: ow-documentation/training-record\n# no end\n")],
  ["M10", "capture", "capture-plan.json invalid JSON", (dir) => writeFileSync(join(dir, D, "capture-plan.json"), "{ \"schema\": 1, ")],
  ["M11", "write-runbook", "runbook.md is a YAML list", (dir) => writeFileSync(join(dir, D, "runbook.md"), "- a\n- b\n")],
  ["M12", "delivered", "delivered.md header is a scalar", (dir) => writeFileSync(join(dir, D, "delivered.md"), "---\njust text\n---\n# x\n")],
  ["M13", "export", "a repo file that is a symlink", (dir) => { const t = join(dir, "larkspur-repo/docs/client-handbook/bookkeeper-guide.md"); rmSync(t, { force: true }); symlinkSync("/etc/hosts", t); }],
  ["M14", "rollout-checkin-14", "adoption.md as a directory", (dir) => { const p = join(dir, D, "adoption.md"); rmSync(p, { force: true }); mkdirSync(p); }],
  ["M15", "start", "STATUS.md binary", (dir) => writeFileSync(join(dir, "opchain-work/STATUS.md"), Buffer.from([0, 1, 2, 3, 255]))],
];

describe("C23: malformed files fail per check and never crash the checker (M12 included)", () => {
  for (const [id, c, desc, fn] of MALFORMED) it(`${id} ${c}: ${desc}`, () => {
    const dir = H.mutated(c);
    fn(dir);
    let res;
    expect(() => { res = runCase(c, dir); }).not.toThrow();
    const failing = res.filter((r) => r.problems.length);
    expect(failing.length).toBeGreaterThan(0);
    for (const r of failing) expect(r.problems.join("\n"), `${id} ${r.check}`).not.toMatch(/TypeError|ReferenceError|Cannot read propert|is not a function/);
  });
});

// ── m6: an answer key's private names in any spelling; the catalog's blocklist (h/run-private.mjs) ──
describe("m6: the key's private names in any spelling, and the catalog's blocklist", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ow-doc-r1-key-"));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const caseDir = join(tmp, "write-guides");
  cpSync(join(FIXTURES, "write-guides"), caseDir, { recursive: true });
  const keyPath = join(caseDir, "answer-key.yaml");
  writeFileSync(keyPath, readFileSync(keyPath, "utf8").replace(/private_names:\n(  - .*\n)+/, "private_names:\n  - Quillmoor Studio\n  - qm-ops\n"));
  const plantIn = (s, where) => failuresOf("write-guides", { [`${D}/guides/bookkeeper.md`]: inSection("## What changed for you", s, where) }, { caseDir });
  const SPELLINGS = ["Prepared with Quillmoor Studio's template.", "Prepared with quillmoor-studio's template.", "Prepared with QUILLMOOR STUDIO's template.", "Prepared with Quillmoor_Studio's template.", "Prepared with QuillmoorStudio's template.", "Prepared with Quillmoor  Studio's template.", "Prepared by qm-ops for this job.", "Prepared by QM OPS for this job.", "Prepared by qmops for this job.", "Prepared by qm_ops for this job."];
  for (const s of SPELLINGS) it(`caught at the start and the end: ${s}`, () => {
    expect(Object.keys(plantIn(s, "start"))).toContain("private_names");
    expect(Object.keys(plantIn(s, "end"))).toContain("private_names");
  });
  for (const s of ["Quills and moor-green glazes are in aisle 2.", "The QM report is due monthly.", "Ops hours are 07:00 to 19:00.", "Studio sessions run on Tuesdays."]) it(`control passes: ${s}`, () => {
    expect(Object.keys(plantIn(s, "start"))).not.toContain("private_names");
  });
  it("the catalog's blocklist in five spellings each (read at run time, never printed)", () => {
    const ow = loadCatalogs({ root: ROOT }).find((c) => c.prefix === "ow-");
    const names = [...(ow.privateNames ?? []), ...(ow.brandNames ?? [])];
    expect(names.length).toBeGreaterThan(0);
    let missed = 0;
    names.forEach((nm, i) => {
      const parts = String(nm).split(/[-_\s]+/);
      [nm, String(nm).toUpperCase(), parts.join(" "), parts.join("_"), parts.join("-").toLowerCase()].forEach((f, j) => { if (!plantIn(`Made with ${f} for this job.`, j % 2 ? "end" : "start").private_names) missed++; });
    });
    expect(missed).toBe(0);
  });
});

// ── OW-06 contract O6, taken in this round (no version change) ───────────────
describe("OW-06 O6: runbook ids never collide with ow-handoff's rotate entries; the training log is handed on", () => {
  const RB = `${D}/runbook.md`;
  it("O6-1: an update reuses a rotate entry's id (OP-08, in operator-notes.md)", () => {
    expect(failuresOf("write-runbook-update", { [RB]: (t) => t.replace(/OP-10/g, "OP-08") }).documents ?? "").toMatch(/OP-08 is one of ow-handoff's rotate entries/);
  });
  it("O6-2: an update skips an id (OP-11)", () => {
    expect(failuresOf("write-runbook-update", { [RB]: (t) => t.replace(/OP-10/g, "OP-11") }).documents ?? "").toMatch(/the next id after the highest in the runbook's and ow-handoff's operator notes' ops: is OP-10/);
  });
  it("O6-3: with no rotate entries in the operator notes, the update takes OP-08 and its ids pass", () => {
    const out = failuresOf("write-runbook-update", { "opchain-work/handoffs/larkspur-ceramics/operator-notes.md": (t) => t.replace("ops: [OP-08, OP-09]", "ops: []"), [RB]: (t) => t.replace(/OP-10/g, "OP-08") });
    expect(out.documents).toBeUndefined();
  });
  it("O6-4: the Delivered hand-off to /ow-handoff-notes carries secrets-seen.log, pinned", async () => {
    const { HANDOFF_PIN, handoffFieldDrift } = await import("../scripts/ow-documentation-acceptance.mjs");
    expect(HANDOFF_PIN["/ow-handoff-notes"]["docs/<client>/secrets-seen.log"]).toEqual(["kind", "role", "source", "session"]);
    const edges = readFileSync(join(ROOT, "skills-work/ow-documentation/skill.edges.yaml"), "utf8");
    expect(handoffFieldDrift(edges)).toEqual([]);
    expect(handoffFieldDrift(edges.replace("      - { path: docs/<client>/secrets-seen.log, fields: [kind, role, source, session] }\n", "")).join("\n")).toMatch(/secrets-seen\.log/);
  });
});

// ── Found by the Generator's dropped-file sweep this round: every file a golden writes, dropped, is caught ──
describe("the dropped-file sweep's one gap (327 of 327 caught after the fix)", () => {
  it("capture-recapture: capture-plan-02.json dropped while shots/index.md records its run", () => {
    expect(failuresOf("capture-recapture", { [`${D}/capture-plan-02.json`]: () => null }).capture ?? "").toMatch(/records a run of capture-plan-02\.json, which was not written/);
  });
});
