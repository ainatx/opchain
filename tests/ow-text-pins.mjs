// Pinned prose rules for the ow- skills (eval rounds 3 and 4: "the round-4 prose
// rules are mostly unpinned"). The goldens grade what a run writes; these pins
// guard the sentences that tell a model what to do, so deleting or rewriting one
// fails `npm test` (tests/ow-edges.test.js plants each failure). Not a test file
// itself: tests import it, and a scratch tree can be checked with pinProblems(dir).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RR = "ow-build-plan/references/routing-and-resume.md";
const PQ = "ow-build-plan/references/phase-quote.md";
const PS = "ow-build-plan/references/phase-start.md";
const PE = "ow-build-plan/references/phase-export.md";
const CI = "ow-build-plan/references/contract-inputs-schema.md";
const BODY = "ow-build-plan/SKILL.md";
const OFFERS = "ow-build-plan/examples/offers.md";

// ow-start 1.1.0, the logs (OW-08 deliverable 5; tests only, no sibling text edits).
const LS = "ow-start/references/logs-schema.md";
const LI = "ow-start/references/logs-status-and-index.md";
const LM = "ow-start/references/phase-log-meeting.md";
const LD = "ow-start/references/phase-log-decision.md";
const SC = "ow-start/references/self-checks-logs.md";
const SB = "ow-start/SKILL.md";
const CL = "ow-start/CHANGELOG.md";
const BRR = "ow-build/references/routing-and-resume.md";

/** Each rule a file must keep: `must` is a literal sentence or a pattern. */
export const PINS = [
  // Routing (routing-and-resume.md section 2): the inbound route table.
  { id: "route-build-plan", file: RR, must: /\| `build-plan` \| `\/ow-build-plan-offer` for this intake \|/ },
  { id: "route-defined-work", file: RR, must: /\| `defined-work` \| `\/ow-build-plan-quote --quick` for this intake \|/ },
  { id: "route-next-stage (K3, K4, K18)", file: RR, must: /\| `next-stage` \| `\/ow-build-plan-start` for this intake \| .*\*\*Never an offer\*\*/ },
  { id: "route-feasibility (K25)", file: RR, must: /\| `feasibility` \| `\/ow-build-plan-quote --quick` for this intake, priced as the feasibility-test unit \|/ },
  { id: "route-never-twice (new 10)", file: RR, must: "**Never twice.** If `plans/<slug>/` already holds what the row's verb writes" },
  { id: "route-fix-offer", file: RR, must: /## 2\.2 A follow-on request: `handoffs\/<slug>\/fixes\/FIX-nn\.md`\n\nRuns `\/ow-build-plan-offer`/ },
  { id: "route-fix-class (bug 8)", file: RR, must: "**Read the FIX file's class first**" },
  { id: "route-fix-covered (bug 8)", file: RR, must: "`fix`: **a covered Fix, free under the fix window. Never offer, start or quote it as paid work.**" },
  // The two global route rules and the folder rules.
  { id: "never-other-verb (K21)", file: RR, must: "**This skill never runs another skill's verb.**" },
  { id: "never-start-over-plan", file: RR, must: "**This skill never runs `-start` over an existing `plan.yaml`.**" },
  { id: "folder-signed (K22)", file: RR, must: "1. `build-request.md` exists: **the plan is signed; nothing is left for this skill.** Print the signed NEXT block from SKILL.md (`use ow-build to start plans/<slug>/`, with its IF IT IS NOT AVAILABLE line) and stop. Run nothing." },
  { id: "folder-exported (K34)", file: RR, must: /\d\. `quote\.md` exists and has been exported \(`export\/quote\.\*`, or an export line for this folder in `STATUS\.md`\): `\/ow-build-plan-quote --accepted <date>`/ },
  { id: "folder-never-requote (K5)", file: RR, must: "**Never run `-quote` again over it.**" },
  { id: "folder-start-guard (K24)", file: RR, must: "(`-start` only when the folder has no `plan.yaml`;" },
  { id: "folder-other-skill (K23)", file: RR, must: "its `next:` names another skill: print that skill's NEXT and stop;" },
  // Resume grouping (section 1).
  { id: "resume-groups (bug 4)", file: RR, must: "`intake/<slug>/…`, `plans/<slug>/…`, `handoffs/<slug>/…`, `builds/<slug>/…` and `uat/<slug>/…` all belong to the group `<slug>`" },
  { id: "resume-fix-rows (bug 4)", file: RR, must: "**every pending FIX request is a row of its own.**" },
  { id: "resume-two-fix-rows (bug 4)", file: RR, must: "Two pending FIX files for one client (FIX-03 and FIX-04) are two rows." },
  // The quote phase.
  { id: "quote-written-once (K6)", file: PQ, must: "**A quote is written once.**" },
  { id: "quote-refuse-rewrite (K6)", file: PQ, must: "**refuse to write `quote.md` or `quote-items.json`.**" },
  { id: "quote-no-second (K29)", file: PQ, must: "there is no second quote in this folder" },
  { id: "credit-heading (K26)", file: PQ, must: "(build-plan mode with a fee only; never with `fee: none`)" },
  { id: "credit-fee-none (K27)", file: PQ, must: "A plan on signed work (`fee: none`) has no credit line and no `credit_deadline`." },
  { id: "credit-keys-left-out (new 3)", file: PQ, must: "leave `build_plan_fee` and `credit_deadline` out of the header altogether" },
  { id: "expired-no-new-quote (new 6)", file: PQ, must: "There is no new quote in this folder: if the price has to change, that is a new Build Plan or a follow-on (section 1), and you stop." },
  { id: "status-fee-none", file: PQ, must: "(quick mode, or a plan with `fee: none`: the first part only, `awaiting: client's answer by <valid_until>`)" },
  // The start phase.
  { id: "start-delivery-fee (K28)", file: PS, must: "**Delivery mode** (a `next-stage` recap, work already signed) takes no fee from the price book: `fee: none`." },
  { id: "start-plan-guard (new 8)", file: PS, must: "**Never over an existing plan.** Once you know the folder this run writes (below), check it: if it already holds `plan.yaml`, write nothing." },
  { id: "start-template-fee-none (new 10)", file: PS, must: /^ {4}fee: <amount> +# or none: delivery mode, work already signed$/m },
  // The export phase.
  { id: "export-awaiting-fee-none (K33)", file: PE, must: "(quick mode, or a plan with `fee: none`: `awaiting: client's answer by <valid_until>`)" },
  { id: "export-reminders (new 10)", file: PE, must: "suggest a calendar reminder for the validity date, and one for the credit deadline when the quote has one" },
  // contract-inputs.md for a quote with no Build Plan credit.
  { id: "ci-credit-keys (new 2)", file: CI, must: /credit_deadline: <YYYY-MM-DD> +# the quote's, when it has a Build Plan credit; else none\n {4}build_plan_fee: <amount> +# the quote's, when it has a Build Plan credit; else none/ },
  { id: "ci-credit-rule (new 2)", file: CI, must: "A quick quote, or a plan on signed work (`plan.yaml` `fee: none`, delivery mode), has none: write `credit_deadline: none` and `build_plan_fee: none`" },
  { id: "ci-dates (new 2)", file: CI, must: "(valid until; the Build Plan credit deadline only when the quote has one)" },
  // The body: the offer NEXT reads a stated follow-on's request.md.
  { id: "offer-next-reads-request (bug 8)", file: BODY, must: "It will read: build-plan-offer.md, and the intake record, FIX file or request.md it names" },
  // The example offers: a feasibility test is a short quote (owner decision 2026-10-16).
  { id: "offers-feasibility-quote (new 7)", file: OFFERS, must: "- after yes: I send a short quote for a time-boxed test on your own examples" },
  // ow-start 1.1.0: the logs' prose rules the goldens cannot see.
  { id: "logs: a decision is never edited", file: LS, must: "**Never edited.** A decision file is written once, with its self-check results, and never changed." },
  { id: "logs: a decision is never edited (phase)", file: LD, must: "A decision is **never edited**. To change one, write a new `DEC-nn` whose `supersedes:` names the old one; the old file stays byte for byte." },
  { id: "logs: superseding closes the old review", file: LD, must: "- Superseding a decision whose newest line is an open review: one more line for the old decision, `next: none (closed: superseded by DEC-nn) | awaiting: none (superseded <YYYY-MM-DD>)`." },
  { id: "logs: the newest line per item", file: LI, must: "the **newest line per item** (`MTG-nn`, `A-nn`, `DEC-nn`; logs-schema §6). An item is open while its newest line is not closed. Closing one action never hides another." },
  { id: "logs: the newest line per item (body)", file: SB, must: "each open logs item (the newest line per `MTG-nn`, `A-nn` and `DEC-nn`" },
  { id: "logs: the follow-up is never sent", file: LM, must: "Never send it: tell the user to copy it and add names." },
  { id: "logs: people by role", file: LS, must: "**People by role, everywhere**: `you`, `client ops lead`, `client owner`, `vendor account manager`. No name, email address or phone number in any file the logs verbs write, yours included. A request to write one is refused, even with a waiver." },
  { id: "logs: three checks never waived", file: SC, must: "**Three can never be waived: People by role, No client text in STATUS, No private names.**" },
  { id: "logs: three checks never waived (body)", file: SB, must: "**People by role, No client text in STATUS and No private names can never be waived.**" },
  { id: "logs: a business log never reaches a client file", file: LS, must: "**Nothing crosses.** Nothing from `logs/business/` is written into a client file or a client agenda, and nothing from a client workstream into `logs/business/`." },
  { id: "logs: ow-start never transcribes", file: LM, must: "**A recording and no transcript** (a file in `MTG-nn/audio/`): do not transcribe." },
  { id: "logs: ow-start never transcribes (body)", file: SB, must: "Never transcribe audio yourself." },
  { id: "logs: a logs line joins no sibling group (ow-build)", file: BRR, must: "2. Group by the client slug in the path field: `plans/<slug>/…`, `builds/<slug>/…`, `uat/<slug>/…`, `handoffs/<slug>/…` and `docs/<slug>/…` all belong to `<slug>`." },
  // C20: the changelog records both in-place edits to 1.0.0 (owner decision O7).
  { id: "changelog: #605's in-place edit", file: CL, must: "- **#605 (OW-01, ow-build-plan 1.0.0):** the Hands-off row for delivery mode when the next stage is another session (`/ow-start-prep`, \"use ow-start to prep <client>\"), and its NEXT template's `[no folder attached: attach intake-record.md when you say it]` line." },
  { id: "changelog: #616's in-place edit", file: CL, must: "- **#616 (OW-02, ow-build 1.0.0):** the K18 slash hint `(where slash commands exist: /ow-build-plan)` on the after-extract NEXT." },
];

/**
 * Wording that must never come back, in any text file of the ow- skills.
 * The 5-business-days-a-week rule (owner decision g): deadlines come only from
 * the price book's build_plan_schedule or the user; no skill rule ties them to weeks.
 */
export const BANS = [
  {
    id: "no 5-a-week rule (decision g, K30, K31)",
    re: /\b(?:5|five)\s*(?:x|×|\*|times)\s*`?(?:the\s+)?(?:build_plan_)?weeks?\b|\b(?:5|five)x\b|\b(?:5|five)\s+(?:business\s+|working\s+)?days?\s+(?:a|per|each|every|of each)\s+week\b|\b(?:5|five)\s+a\s+week\b|\b(?:business|working)\s+days\s+(?:a|per|each|every)\s+week\b/i,
  },
  { id: "no revised or second quote file (K29)", re: /quote-r(?:<|\d)|\brevised quote\b|\bquote-v\d/i, only: "ow-build-plan/" },
  { id: "no 'issue a new quote' (new 6)", re: /\bissue a new quote\b/i, only: "ow-build-plan/" },
  { id: "feasibility is a quote, not an offer (new 7)", re: /short offer for a time-boxed test/i },
  // OW-08: a logs/ line joins no sibling group; the group lists stay explicit.
  { id: "a logs line joins no ow-build-plan group", re: /`logs\/<slug>\/|\blogs\/<slug>\/\S*\s+(?:all\s+)?belongs?\b|\bevery (?:path|line)\b[^.]*\bbelongs? to\b/i, only: "ow-build-plan/references/routing-and-resume.md" },
  { id: "a logs line joins no ow-build group", re: /`logs\/<slug>\/|\blogs\/<slug>\/\S*\s+(?:all\s+)?belongs?\b|\bevery (?:path|line)\b[^.]*\bbelongs? to\b/i, only: "ow-build/references/routing-and-resume.md" },
];

function textFiles(dir, rel = "") {
  if (!existsSync(join(dir, rel))) return [];
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? textFiles(dir, r) : /\.(md|ya?ml|txt|json)$/.test(e.name) ? [r] : [];
  });
}

/** Problems in a skills-work/-shaped tree at `dir`: a pinned rule missing, or banned wording present. */
export function pinProblems(dir) {
  const out = [];
  for (const pin of PINS) {
    const path = join(dir, pin.file);
    const text = existsSync(path) ? readFileSync(path, "utf8") : "";
    const ok = typeof pin.must === "string" ? text.includes(pin.must) : pin.must.test(text);
    if (!ok) out.push(`${pin.file}: the pinned rule "${pin.id}" is missing or reworded`);
  }
  const files = textFiles(dir).filter((r) => /^ow-[a-z-]+\//.test(r));
  for (const ban of BANS) {
    for (const rel of files.filter((r) => !ban.only || r.startsWith(ban.only))) {
      readFileSync(join(dir, rel), "utf8").split("\n").forEach((line, i) => {
        const m = line.match(ban.re);
        if (m) out.push(`${rel}:${i + 1}: "${m[0]}" (${ban.id})`);
      });
    }
  }
  return out;
}
