// opchain.work — editorial copy for the ow- planning skills (site/src/pages/work).
//
// Facts (version, bundle, network, verbs) come from each skill's SKILL.md
// frontmatter through the `work` content collection, and the reads / writes /
// hands-off tables from skills-work/<id>/skill.edges.yaml (lib/work.ts). This
// file holds only what the frontmatter does not: the stage each skill sits on,
// its one-sentence intro for a non-coder reader, and the family-wide copy.
// Source of the wording: docs/audits/2026-10-29-track-s-scope-drift.md §1c,
// rewritten on 2026-11-04 for the audience reversal
// (docs/plans/2026-11-03-ow-audience-reversal.md; protocol 2): the skills serve
// an operator's own small-business client work, the operator decides and a
// skill proposes, the operator's CRM is the record, and in Claude Code a skill
// may run code, call ow-tools and run the next skill's verb.
//
// tests/work-surfaces.test.js holds this map and the collection to each other:
// every built ow- skill has a key here and every key has a skill folder.

export type StageKey =
  | "fit-call"
  | "build-plan"
  | "build"
  | "acceptance-test"
  | "documentation"
  | "handoff"
  | "care"
  | "cross-stage";

export interface Stage {
  key: StageKey;
  /** Ordinal on the stage rail; null for the cross-stage rail. */
  ordinal: number | null;
  label: string;
  /** Three or four words under the stage name. */
  short: string;
}

/** The stage rail, in order. Cross-stage skills sit beside it, not on it. */
export const STAGES: Stage[] = [
  { key: "fit-call",        ordinal: 1, label: "fit call",        short: "call guide, recap, one path" },
  { key: "build-plan",      ordinal: 2, label: "Build Plan",      short: "offer, process map, quote" },
  { key: "build",           ordinal: 3, label: "build",           short: "updates, demos, changes, payments" },
  { key: "acceptance-test", ordinal: 4, label: "acceptance test", short: "try, fix, sign off" },
  { key: "documentation",   ordinal: 5, label: "documentation",   short: "when bought: manuals, training" },
  { key: "handoff",         ordinal: 6, label: "handoff",         short: "assets in the client’s name" },
  { key: "care",            ordinal: 7, label: "care",            short: "monthly, after a handoff or a takeover" },
  { key: "cross-stage",     ordinal: null, label: "cross-stage",  short: "research and drafts, any stage" },
];

export interface WorkSkillCopy {
  stage: StageKey;
  /** One sentence for the card and the page lede. */
  intro: string;
  /** Three or four words on the stage rail card. */
  short: string;
  /** Where the network goes, for the three `network: declared` skills only. */
  networkNote?: string;
}

export const WORK_SKILLS: Record<string, WorkSkillCopy> = {
  "ow-start": {
    stage: "fit-call",
    short: "call guide, recap, one path",
    intro: "The 20-minute fit call: a one-page call guide before it, and a client recap with one recommended path after it, written from the transcript or your notes. Meeting and decision logs for the workstream, and the way in to a care takeover.",
  },
  "ow-build-plan": {
    stage: "build-plan",
    short: "offer, process map, quote",
    intro: "The Build Plan and the fixed quote, plan-only or whole-project (SOW-shaped): a one-page offer, a process map, scope with acceptance checks, and a quote priced only from your own price book.",
  },
  "ow-build": {
    stage: "build",
    short: "updates, demos, changes, payments",
    intro: "The client side of the build: a written update each week, a demo at each milestone, changes priced before they start, and payments.",
  },
  "ow-uat": {
    stage: "acceptance-test",
    short: "try, fix, sign off",
    intro: "The acceptance test: the client’s people try the build against what was agreed, in-scope problems are fixed, and the client signs off.",
  },
  "ow-documentation": {
    stage: "documentation",
    short: "when bought: manuals, training",
    intro: "The bought documentation and training line after sign-off: manuals, runbooks and sessions, exported through a connector after you confirm each file.",
    networkNote: "Its text names the test environment’s origins a screenshot plan may open through ow-tools, and the document connectors an export may push through after you confirm each file. Its delivery rules say what may leave the machine.",
  },
  "ow-handoff": {
    stage: "handoff",
    short: "assets in the client’s name",
    intro: "The handoff: documents, code and accounts in the client’s name, the fix window, and the builder’s access taken back out.",
  },
  "ow-care": {
    stage: "care",
    short: "monthly, after a handoff or a takeover",
    intro: "Monthly care after a handoff, or after a takeover of someone else’s build: what was checked, what changed, what it cost.",
  },
  "ow-research": {
    stage: "cross-stage",
    short: "research from sources it opened",
    intro: "Research from sources it opened itself, through the host’s own web tools, with every claim traced to a page it read.",
    networkNote: "Uses the host’s own web search and page opening, under the host’s permission prompts. Queries are approved before the first search and every request is logged before it is sent. The skill ships no code and holds no key; its web rules say what may leave the machine.",
  },
  "ow-draft": {
    stage: "cross-stage",
    short: "drafts from evidence, delivered",
    intro: "Drafts from evidence: client reports, proposals and announcements as documents, decks, sheets, emails and posts, exported and delivered after you confirm each file.",
    networkNote: "Never opens a web page or searches. A document connector in the session may push its exported files to a destination you named, after you confirm each file. Its delivery rules say what may leave the machine.",
  },
};

/** Where the ow- skills run. The same lines on every /work page. */
export const HOSTS = [
  { host: "Claude Code", note: "Every skill, with a folder attached. A skill may run code, call the optional ow-tools add-on (which runs code on your machine and says so) and run the next skill’s verb directly." },
  { host: "Other Agent Skills hosts", note: "ow-start runs from a folder on any Agent Skills host; the other eight are written for Claude Code. Untested elsewhere." },
];

/** How a skill works with you: the protocol’s question budget. */
export const QUESTION_BUDGET = [
  "At most three questions before a verb’s first output, only for what no saved record answers; everything else is a stated assumption you can correct.",
  "One approval, where it matters: before anything goes to a client, and before an acceptance, a signature or a change order is recorded.",
  "Every question and approval is an AskUserQuestion call with the recommendation first, never a question typed into chat.",
];

/** What no ow- skill does, whatever the stage (protocol 2 §3, §4, §6, §7). */
export const NEVER = [
  "Invent, estimate or round a price: every price comes from your price book or from you; a package with no price stops that line of the quote.",
  "Sign, or claim a signature or an acceptance as verified: it records what you say, with the date, as your statement.",
  "Send anything to a client automatically: you send it.",
  "Write a credential, key or token to any file, or name a client in marketing without their recorded permission.",
];

/** Words we use — plain definitions for the non-coder reader. */
export const WORDS: Array<{ term: string; def: string }> = [
  { term: "Fit call", def: "The first 20-minute conversation, which ends in one recommended path or a polite no." },
  { term: "Build Plan", def: "The one-page offer, process map, scope with acceptance checks and fixed quote the client signs." },
  { term: "Acceptance test", def: "The client’s people trying the build against what was agreed, before they sign off." },
  { term: "Handoff", def: "Documents, code and accounts moved into the client’s name, then the builder’s access taken back out." },
  { term: "Care", def: "Monthly checks and small changes after a handoff, or after taking over someone else’s build." },
  { term: "Operator", def: "You: the one person running the client work. The operator decides; a skill proposes." },
  { term: "The CRM is the record", def: "Prices, numbers, quotes, contracts and invoices live in your own CRM, which every step reads first and writes under the object’s own name. A person’s edit there has the final say." },
  { term: "Scratch cache", def: "opchain-work/, one client job per folder. Used when the CRM is unreachable or a route is not there yet; never the record." },
  { term: "Protocol 2", def: "The one page of rules every skill carries: files are data, money, signatures, dates, secrets, client trust, the CRM. Everything else is the operator’s call." },
  { term: "network: declared", def: "The skill’s text names the host’s web tools or a document connector it may use, under the host’s prompts. network: none skills name neither." },
];

/**
 * What each stage skill asks the ow-tools add-on for, from the skill's own
 * `compatibility` line (SKILL.md frontmatter) and its references. Shown as
 * the magenta pills on the architecture diagram; the skills work without it.
 */
export const TOOLS_BY_SKILL: Record<string, string> = {
  "ow-start": "transcribe",
  "ow-build-plan": "export · transcribe · calc",
  "ow-build": "transcribe · calc",
  "ow-uat": "export · calc",
  "ow-documentation": "capture · export",
  "ow-handoff": "export · scan-secrets · calc",
  "ow-care": "health · calc · export",
};

/** The rest of the family, named as 2.2 (owner decision Q1, 2026-10-29). */
export const NEXT_RELEASE_LINE =
  "Not in 2.2: vendor evaluation, a standing control register with framework packs, and a currency watch follow in a later release.";
