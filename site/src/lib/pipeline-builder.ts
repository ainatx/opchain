// /pipeline-builder decision table: four wizard answers in, a skill bundle and
// a CLAUDE.md starter out.
//
// Pure module (no astro:content) so the page's client script and the Vitest
// suite (tests/pipeline-builder.test.js) import the same logic. Skill ids,
// names and one-line descriptions come from the live catalog — the `skills`
// content collection built from skills/<id>/SKILL.md — which the page passes
// in. Only the answer → skill rules live here, and the build fails if a rule
// names a skill the catalog does not have (see referencedSkillIds()).

export type Kind = "web-app" | "api" | "marketing-site" | "data" | "cli" | "legacy";
export type Team = "solo" | "small" | "medium" | "large";
export type Deploy = "cloudflare" | "vercel" | "aws" | "fly" | "render" | "self-hosted";
export type Surface = "claude-code" | "claude-ai" | "both";
export type AiApp = "none" | "feature" | "rag" | "agent";

export interface Answers {
  kind: Kind;
  team: Team;
  deploy: Deploy;
  surface: Surface;
  aiApp: AiApp;
}

/** One catalog entry, as the page serialises it from the content collection. */
export interface CatalogSkill {
  id: string;
  shortDesc: string;
}

/** Every value each wizard question can take (tests walk the full space). */
export const ANSWER_SPACE = {
  kind: ["web-app", "api", "marketing-site", "data", "cli", "legacy"] as Kind[],
  team: ["solo", "small", "medium", "large"] as Team[],
  deploy: ["cloudflare", "vercel", "aws", "fly", "render", "self-hosted"] as Deploy[],
  surface: ["claude-code", "claude-ai", "both"] as Surface[],
  aiApp: ["none", "feature", "rag", "agent"] as AiApp[],
};

// ── Skill recommendation table ────────────────────────────────────────────
// The Foundation set is always recommended. It carries the gate rail
// oc-git-ops chains to: oc-bug-check before every commit, then oc-docs-forge
// and oc-repo-ops before every PR. Everything else is additive.
export const FOUNDATION = [
  "oc-app-architect",
  "oc-orchestrator",
  "oc-checkpoint-protocol",
  "oc-code-auditor",
  "oc-git-ops",
  "oc-bug-check",
  "oc-docs-forge",
  "oc-repo-ops",
];

export const KIND_SKILLS: Record<Kind, string[]> = {
  "web-app":        ["oc-stack-forge", "oc-ux-engineer", "oc-api-dev", "oc-deploy-ops", "oc-monitoring-ops"],
  "api":            ["oc-stack-forge", "oc-api-dev", "oc-integrations-engineer", "oc-deploy-ops", "oc-monitoring-ops", "oc-scale-ops"],
  "marketing-site": ["oc-ux-engineer", "oc-deploy-ops"],
  "data":           ["oc-dash-forge", "oc-data-ops", "oc-signal-forge", "oc-api-dev", "oc-deploy-ops", "oc-monitoring-ops"],
  "cli":            ["oc-stack-forge"],
  "legacy":         ["oc-reverse-spec", "oc-migration-ops", "oc-modularize-ops", "oc-security-auditor", "oc-deploy-ops"],
};

/** Team size → skills. Each list is complete for its size (larger sizes repeat smaller ones). */
const TEAM_SKILLS: Record<Team, string[]> = {
  solo: [],
  // A team shipping versioned releases wants the release ledger.
  small: ["oc-release-ops"],
  // Multiple squads: assessed and executed security, a test strategy, and
  // scale readiness.
  medium: ["oc-release-ops", "oc-security-auditor", "oc-security-hardening", "oc-qa-ops", "oc-scale-ops"],
  // Org-wide: everything above plus a compliance control register.
  large: ["oc-release-ops", "oc-security-auditor", "oc-security-hardening", "oc-qa-ops", "oc-scale-ops", "oc-compliance-ops"],
};

/**
 * Catalog skills no wizard answer recommends, with the reason. The install
 * snippet unzips the whole catalog, so they are still installed; they are just
 * not something these four questions can call for.
 */
export const NOT_RECOMMENDED: Record<string, string> = {
  "oc-update": "Use when updating Opchain itself; it is not an application build step.",
  "oc-hindsight": "Optional review of local learning history, chosen after real work exists.",
  "oc-evolve": "Optional rule experiments requiring frozen evidence and an external reviewer.",
  "oc-telemetry-ops":
    "opt-in metering of opchain's own skill usage; not driven by what you are building or team size",
};

/** Deploy target → skills. A DEPLOY_NOTE below is used only when the bundle has every skill it names. */
const DEPLOY_SKILLS: Record<Deploy, string[]> = {
  cloudflare: [],
  vercel: [],
  aws: ["oc-scale-ops"],
  fly: [],
  render: [],
  // Self-managed infra: container topology, assess + harden, and SLOs.
  "self-hosted": ["oc-fleet-ops", "oc-security-auditor", "oc-security-hardening", "oc-monitoring-ops"],
};

/** An LLM in the product → the AI-native skills, plus spend attribution. */
const AI_SKILLS: Record<AiApp, string[]> = {
  none: [],
  feature: ["oc-claude-api", "oc-prompt-ops", "oc-cost-ops"],
  rag: ["oc-claude-api", "oc-prompt-ops", "oc-cost-ops", "oc-rag-forge"],
  agent: ["oc-claude-api", "oc-prompt-ops", "oc-cost-ops", "oc-agent-forge"],
};

export const DEPLOY_NOTE: Record<Deploy, string> = {
  "cloudflare":  "Cloudflare Workers — oc-deploy-ops has a dedicated section for wrangler",
  "vercel":      "Vercel — oc-deploy-ops knows the `vercel deploy --prod` flow",
  "aws":         "AWS — oc-deploy-ops + oc-scale-ops cover ECS / Lambda / RDS",
  "fly":         "Fly.io — long-running containers, oc-deploy-ops handles flyctl",
  "render":      "Render / Railway — Blueprint-based provisioning via oc-deploy-ops",
  "self-hosted": "Self-hosted — oc-fleet-ops for the container topology, oc-security-auditor to assess and oc-security-hardening to harden, oc-monitoring-ops for SLOs",
};

/** Deploy target names with no skill attached, for bundles a DEPLOY_NOTE doesn't fit. */
const DEPLOY_TARGET: Record<Deploy, string> = {
  "cloudflare": "Cloudflare Workers",
  "vercel": "Vercel",
  "aws": "AWS",
  "fly": "Fly.io",
  "render": "Render / Railway",
  "self-hosted": "Self-hosted",
};

/** Every skill id any rule above can recommend. */
export function referencedSkillIds(): string[] {
  const all = [
    ...FOUNDATION,
    ...Object.values(KIND_SKILLS).flat(),
    ...Object.values(TEAM_SKILLS).flat(),
    ...Object.values(DEPLOY_SKILLS).flat(),
    ...Object.values(AI_SKILLS).flat(),
  ];
  return Array.from(new Set(all));
}

/**
 * The recommended bundle, in a stable order. When a catalog is passed, ids it
 * does not contain are dropped, so the page never recommends a skill the
 * catalog has removed or hidden.
 */
export function recommend(a: Answers, catalog?: readonly CatalogSkill[]): string[] {
  const set = new Set<string>(FOUNDATION);
  KIND_SKILLS[a.kind].forEach((s) => set.add(s));
  TEAM_SKILLS[a.team].forEach((s) => set.add(s));
  DEPLOY_SKILLS[a.deploy].forEach((s) => set.add(s));
  AI_SKILLS[a.aiApp].forEach((s) => set.add(s));
  const ids = Array.from(set);
  if (!catalog || catalog.length === 0) return ids;
  const known = new Set(catalog.map((s) => s.id));
  return ids.filter((id) => known.has(id));
}

/** id → one-line description from the catalog. */
export function blurbs(catalog: readonly CatalogSkill[]): Record<string, string> {
  return Object.fromEntries(catalog.map((s) => [s.id, s.shortDesc]));
}

export function claudeMdStarter(a: Answers, skills: readonly string[], blurb: Record<string, string>): string {
  const has = (id: string) => skills.includes(id);
  const kindTitle = {
    "web-app":        "web app",
    "api":            "API / backend service",
    "marketing-site": "marketing site",
    "data":           "data product / dashboard",
    "cli":            "CLI / library",
    "legacy":         "legacy migration",
  }[a.kind];

  const teamLabel = {
    "solo": "solo founder", "small": "team of 2–5", "medium": "team of 6–20", "large": "org of 21+",
  }[a.team];

  const review = [
    "- Code changes go through `oc-code-auditor` before merge",
    has("oc-security-auditor") ? " plus `oc-security-auditor` on security-sensitive paths" : "",
    has("oc-security-hardening") ? "; `oc-security-hardening` (`/oc-harden`) executes the fixes" : "",
  ].join("");

  const work = [
    "- Start every session with `/oc-ops` to read open checkpoints",
    "- For new work, trigger `oc-app-architect` with \"I have an app idea\" or `/oc-discover`",
    has("oc-bug-check") ? "- Before every commit, `oc-git-ops` runs the `oc-bug-check` gate (`/oc-bugcheck`); only a PASS for this tree clears the commit" : "",
    has("oc-docs-forge") && has("oc-repo-ops")
      ? "- Before every PR, `oc-git-ops` runs the pre-PR gate: `oc-docs-forge` (`/oc-docs pr`) writes the PR docs, then `oc-repo-ops` (`/oc-repo verify`) checks readiness"
      : "",
    review,
    has("oc-qa-ops") ? "- Test strategy and coverage budgets come from `oc-qa-ops` (`/oc-qa pyramid`)" : "",
    has("oc-data-ops") ? "- Data pipelines and data contracts go through `oc-data-ops` (`/oc-data-ops design`)" : "",
    has("oc-signal-forge") ? "- New metrics are framed and validated with `oc-signal-forge` (`/oc-signal frame`) before anyone builds on them" : "",
    has("oc-claude-api") ? "- LLM calls follow `oc-claude-api` for model routing and prompt caching" : "",
    has("oc-prompt-ops") ? "- Prompts are versioned and eval-gated by `oc-prompt-ops` (`/oc-prompt eval`)" : "",
    has("oc-cost-ops") ? "- `oc-cost-ops` (`/oc-cost report`) attributes LLM spend and gates budgets" : "",
    has("oc-compliance-ops") ? "- `oc-compliance-ops` (`/oc-comply`) keeps the control register and audit evidence" : "",
    has("oc-deploy-ops")
      ? "- Ship via `oc-deploy-ops` — staging first, then production" +
        (has("oc-fleet-ops") ? "; `oc-fleet-ops` (`/oc-fleet`) owns the container topology" : "")
      : has("oc-fleet-ops")
        ? "- `oc-fleet-ops` (`/oc-fleet`) owns the container topology"
        : "",
    has("oc-release-ops") ? "- Cut releases with `oc-release-ops` (`/oc-release plan`); `oc-git-ops` tags them (`/oc-git-release`)" : "",
    "- The orchestrator routes between skills; you don't need to name the next one",
  ].filter(Boolean);

  // A deploy note names skills; use it only when the bundle has all of them.
  const noteSkills = DEPLOY_NOTE[a.deploy].match(/\boc-[a-z]+(?:-[a-z]+)*\b/g) ?? [];
  const deployNote = noteSkills.every(has)
    ? DEPLOY_NOTE[a.deploy]
    : `${DEPLOY_TARGET[a.deploy]} — no opchain deploy skill in this bundle`;

  return `# ${kindTitle} — opchain pipeline

## Context

A ${kindTitle} maintained by a ${teamLabel}. Deploys to ${a.deploy}.
Built with Claude via ${a.surface === "both" ? "Claude Code + Claude.ai" : a.surface}.

## opchain skills installed

${skills.map((s) => `- ${s} — ${blurb[s] || ""}`).join("\n")}

## How to work in this repo

${work.join("\n")}

## Deploy target

${deployNote}

## Conventions

- Branch per feature; PRs reviewed by \`oc-code-auditor\` before merge
- Checkpoints in \`.checkpoints/\` survive across sessions
- Feature flags live in \`src/lib/flags/registry.ts\` (or your equivalent)
`;
}
