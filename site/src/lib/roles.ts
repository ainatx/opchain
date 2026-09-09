// Pure skill→role mapping. Extracted from skills.ts so it can be imported by
// modules that must NOT pull in `astro:content` (e.g. the /demo search index
// builder + its Vitest unit tests, which run in a plain Node environment).
// skills.ts re-exports everything here, so existing
// `import { getSkillRole, type Role } from "../lib/skills"` callsites are
// unaffected.

export type Role =
  | "workflow"
  | "tri-agent"
  | "audit-gate"
  | "specialist"
  | "advisor"
  | "orchestrator"
  | "success";

// Skill → role mapping. Source of truth for the colored role pills shown
// on the homepage, the Skill Library, and the /demo workbench.
//
// INVARIANT: every directory under skills/ must appear here. An unmapped skill
// silently falls back to "specialist" and renders with the wrong role colour —
// which is how 11 skills added between v1.6 and v1.9 went unnoticed. The
// roles-coverage test in tests/roles-coverage.test.js fails the build on drift.
const ROLE_BY_NAME: Record<string, Role> = {
  "oc-agent-forge": "tri-agent",
  "oc-api-dev": "tri-agent",
  "oc-app-architect": "workflow",
  "oc-bug-check": "audit-gate",
  "oc-checkpoint-protocol": "success",
  "oc-claude-api": "specialist",
  "oc-code-auditor": "audit-gate",
  "oc-compliance-ops": "audit-gate",
  "oc-cost-ops": "advisor",
  "oc-dash-forge": "specialist",
  "oc-data-ops": "tri-agent",
  "oc-deploy-ops": "orchestrator",
  "oc-docs-forge": "specialist",
  "oc-evolve": "tri-agent",
  "oc-fleet-ops": "orchestrator",
  "oc-git-ops": "specialist",
  "oc-hindsight": "tri-agent",
  "oc-integrations-engineer": "tri-agent",
  "oc-migration-ops": "specialist",
  "oc-modularize-ops": "specialist",
  "oc-monitoring-ops": "specialist",
  "oc-orchestrator": "orchestrator",
  "oc-prompt-ops": "specialist",
  "oc-qa-ops": "advisor",
  "oc-rag-forge": "tri-agent",
  "oc-release-ops": "orchestrator",
  "oc-repo-ops": "audit-gate",
  "oc-reverse-spec": "specialist",
  "oc-scale-ops": "advisor",
  "oc-security-auditor": "audit-gate",
  "oc-security-hardening": "specialist",
  "oc-signal-forge": "tri-agent",
  "oc-stack-forge": "advisor",
  "oc-telemetry-ops": "advisor",
  "oc-ux-engineer": "tri-agent",
};

const ROLE_LABEL: Record<Role, string> = {
  workflow: "Workflow",
  "tri-agent": "Tri-agent",
  "audit-gate": "Audit gate",
  specialist: "Standalone specialist",
  advisor: "Advisor",
  orchestrator: "Orchestrator",
  success: "Protocol",
};

export function getSkillRole(name: string): Role {
  return ROLE_BY_NAME[name] ?? "specialist";
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABEL[role];
}
