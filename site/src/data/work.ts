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
  /** The page's meta description: 160 characters at most (tests/work-surfaces.test.js). */
  meta: string;
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
    meta: "The 20-minute client fit call: a one-page call guide before it and a recap with one recommended path after it, plus meeting and decision logs.",
  },
  "ow-build-plan": {
    stage: "build-plan",
    short: "offer, process map, quote",
    intro: "The Build Plan and the fixed quote: a one-page offer, a process map, scope with acceptance checks, and a quote added up only from your own price book. The quote can cover the plan alone or the whole project, shaped like a statement of work, so the client signs plan and build together.",
    meta: "The Build Plan and fixed quote: offer, process map, scope with acceptance checks, and a price from your own price book, plan-only or whole-project.",
  },
  "ow-build": {
    stage: "build",
    short: "updates, demos, changes, payments",
    intro: "The client side of the build: a written update each week, a demo at each milestone, changes priced before they start, and payments.",
    meta: "The client side of a signed build: weekly updates, milestone demos, change orders priced before work starts, and invoice requests.",
  },
  "ow-uat": {
    stage: "acceptance-test",
    short: "try, fix, sign off",
    intro: "The acceptance test: the client’s people try the build against what was agreed, in-scope problems are fixed, and the client signs off.",
    meta: "The client’s acceptance test: scenarios per check, tester packs, in-scope fixes and the sign-off request, with the contract’s dates kept.",
  },
  "ow-documentation": {
    stage: "documentation",
    short: "when bought: manuals, training",
    intro: "The bought documentation and training line after sign-off: manuals, runbooks and sessions, exported through a connector after you confirm each file.",
    meta: "The bought documentation and training line: guides, SOPs, runbooks and sessions, exported after you confirm each file.",
    networkNote: "Its text names the test environment’s origins a screenshot plan may open through ow-tools, and the document connectors an export may push through after you confirm each file. Its delivery rules say what may leave the machine.",
  },
  "ow-handoff": {
    stage: "handoff",
    short: "assets in the client’s name",
    intro: "The handoff: documents, code and accounts in the client’s name, the fix window, and the builder’s access taken back out.",
    meta: "The handoff after sign-off: documents, code and accounts in the client’s name, the fix window, and the builder’s access taken back out.",
  },
  "ow-care": {
    stage: "care",
    short: "monthly, after a handoff or a takeover",
    intro: "Monthly care after a handoff, or after a takeover of someone else’s build: what was checked, what changed, what it cost.",
    meta: "Prepaid monthly care after a handoff or a takeover review: requests, hours, health checks and a report of what changed and what it cost.",
  },
  "ow-research": {
    stage: "cross-stage",
    short: "research from sources it opened",
    intro: "Research from sources it opened itself, through the host’s own web tools, with every claim traced to a page it read.",
    meta: "Research from pages it opened through the host’s own web tools, or from your files, with every claim traced to a source it read.",
    networkNote: "Uses the host’s own web search and page opening, under the host’s permission prompts. Queries are approved before the first search and every request is logged before it is sent. The skill ships no code and holds no key; its web rules say what may leave the machine.",
  },
  "ow-draft": {
    stage: "cross-stage",
    short: "drafts from evidence, delivered",
    intro: "Drafts from evidence: client reports, proposals and announcements as documents, decks, sheets, emails and posts, exported and delivered after you confirm each file.",
    meta: "Client reports, proposals and announcements drafted from evidence, exported and delivered only after you sign off the version.",
    networkNote: "Never opens a web page or searches. A document connector in the session may push its exported files to a destination you named, after you confirm each file. Its delivery rules say what may leave the machine.",
  },
};

/** Where the ow- skills run. The same two lines on every /work page. */
export const HOSTS = [
  { host: "Claude Code", note: "Where the skills are built to run: every skill, the AskUserQuestion prompts they use for each question and approval, and the optional ow-tools add-on." },
  { host: "claude.ai upload", note: "Untested. The zips upload, but each question and approval goes through AskUserQuestion, which that host may not offer, and ow-tools does not apply." },
  { host: "Other hosts", note: "Untested." },
];

/** What no ow- skill does, whatever the stage. */
export const NEVER = [
  "Invent a price: every price and document number comes from your CRM or from you, and a package with no price stops the quote until you price it.",
  "Give legal advice: contract inputs are recorded for your own counsel.",
  "Send anything without your confirmation: you read every email, export and push before it goes.",
  "Claim a signature or an acceptance as verified: it records what you said, with the date, as your statement.",
  "Overwrite a version a person edited in the CRM: it writes its own beside it and says so.",
  "Write a credential, key or token to any file.",
];

/** Words we use — plain definitions for the non-coder reader. */
export const WORDS: Array<{ term: string; def: string }> = [
  { term: "Fit call", def: "The first 20-minute conversation, which ends in one recommended path or a polite no." },
  { term: "Build Plan", def: "The one-page offer, process map and scope with acceptance checks. Its fixed quote covers the plan alone or the whole project, shaped like a statement of work." },
  { term: "Acceptance test", def: "The client’s people trying the build against what was agreed, before they sign off." },
  { term: "Handoff", def: "Documents, code and accounts moved into the client’s name, then the builder’s access taken back out." },
  { term: "Care", def: "Monthly checks and small changes after a handoff, or after taking over someone else’s build." },
  { term: "CRM", def: "Your customer system and the record of the job. Each step reads the latest saved version from it, and prices and numbers come from it." },
  { term: "Workstream", def: "One client job. Its record is in your CRM; its folder under opchain-work/ is a scratch copy, used when the CRM cannot be reached." },
  { term: "network: declared", def: "The skill’s text names the host’s web tools or a document connector it may use, under the host’s prompts. network: none skills name neither, and reach only your CRM." },
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

/**
 * Where the CRM wiring stands (docs/plans/2026-11-03-ow-audience-reversal.md §7).
 * The one sentence on /work that dates: remove it when the write path ships.
 */
export const CRM_STATE =
  "The connection to the CRM is still being built, so runs use the scratch folder for now.";
