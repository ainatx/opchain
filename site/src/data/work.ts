// opchain.work — editorial copy for the ow- planning skills (site/src/pages/work).
//
// Facts (version, bundle, network, verbs) come from each skill's SKILL.md
// frontmatter through the `work` content collection, and the reads / writes /
// hands-off tables from skills-work/<id>/skill.edges.yaml (lib/work.ts). This
// file holds only what the frontmatter does not: the stage each skill sits on,
// its one-sentence intro for a non-coder reader, and the family-wide copy.
// Source of the wording: docs/audits/2026-10-29-track-s-scope-drift.md §1c.
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
    intro: "The Build Plan and the fixed quote: a one-page offer, a process map, scope with acceptance checks, and a quote added up only from your own price book.",
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

/** Where the ow- skills run. The same two lines on every /work page. */
export const HOSTS = [
  { host: "Claude Code", note: "Every skill, plus the optional ow-tools add-on that runs code on your machine and says so." },
  { host: "claude.ai upload", note: "Every skill, as a text skill. ow-tools does not apply." },
  { host: "Other hosts", note: "Untested." },
];

/** What no ow- skill does, whatever the stage. */
export const NEVER = [
  "Invent a price: a recap names a path, and the Build Plan prices it from your own price book.",
  "Give legal advice: contract inputs are recorded for your own counsel.",
  "Send anything without your confirmation: you read every email, export and push before it goes.",
];

/** Words we use — plain definitions for the non-coder reader. */
export const WORDS: Array<{ term: string; def: string }> = [
  { term: "Fit call", def: "The first 20-minute conversation, which ends in one recommended path or a polite no." },
  { term: "Build Plan", def: "The one-page offer, process map, scope with acceptance checks and fixed quote the client signs." },
  { term: "Acceptance test", def: "The client’s people trying the build against what was agreed, before they sign off." },
  { term: "Handoff", def: "Documents, code and accounts moved into the client’s name, then the builder’s access taken back out." },
  { term: "Care", def: "Monthly checks and small changes after a handoff, or after taking over someone else’s build." },
  { term: "Workstream", def: "One client job’s folder under opchain-work/, which every skill reads and writes." },
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
  "Not in 2.1: vendor evaluation, a standing control register with framework packs, and a currency watch follow in 2.2.";
