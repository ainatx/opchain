// Pure functions extracted from validate-pm-mcp.mjs so they can be unit-tested
// directly without subprocess fixtures. The CLI wrapper imports these and
// translates results into stdout / exit code.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { load } from "js-yaml";

export function findPmAwareSkills(skillsDir) {
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => {
      const file = `${skillsDir}/${id}/SKILL.md`;
      return existsSync(file) && /^##\s+PM-Tool MCP Integration/m.test(readFileSync(file, "utf8"));
    })
    .sort();
}

export const ALLOWED_PROVIDERS = new Set(["linear", "jira", "github-issues"]);

export const TOOL_REGISTRY = {
  linear: new Set([
    "mcp__claude_ai_Linear__get_issue",
    "mcp__claude_ai_Linear__list_issues",
    "mcp__claude_ai_Linear__list_comments",
    "mcp__claude_ai_Linear__save_comment",
    "mcp__claude_ai_Linear__save_issue",
    "mcp__claude_ai_Linear__list_issue_statuses",
    "mcp__claude_ai_Linear__get_team",
    "mcp__claude_ai_Linear__get_project",
  ]),
  "github-issues": new Set([
    "mcp__mcp-server-github__issue_read",
    "mcp__mcp-server-github__list_issues",
    "mcp__mcp-server-github__add_issue_comment",
    "mcp__mcp-server-github__issue_write",
  ]),
  jira: new Set([
    "mcp__atlassian__jira_get_issue",
    "mcp__atlassian__jira_search",
    "mcp__atlassian__jira_get_comments",
    "mcp__atlassian__jira_add_comment",
    "mcp__atlassian__jira_create_issue",
    "mcp__atlassian__jira_transition_issue",
    "mcp__atlassian__jira_get_transitions",
    "mcp__atlassian__jira_get_project",
  ]),
};

const ALL_REGISTRY_TOOLS = new Set(
  Object.values(TOOL_REGISTRY).flatMap((s) => [...s]),
);

// Shallow YAML parser for .opchain/pm.yaml.
// Handles top-level scalars, single-level nested maps, and bracketed flow
// arrays (`labels_default: [a, b]`). pm.yaml is well-structured and small;
// this avoids pulling in a yaml dependency for one consumer.
export function parsePmYaml(src) {
  const parsed = load(src);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected a top-level mapping");
  }
  return parsed;
}

// Compatibility export for callers that used the old helper name. The parser
// is now a full YAML parser; the old shallow implementation is gone.
export const parseShallowYaml = parsePmYaml;

const PM_MARKER_PART = /^[a-z0-9][a-z0-9._-]*$/;

export function buildPmMarker({ skill, event, correlationId, revision, payload }) {
  for (const [name, value] of Object.entries({ skill, event, correlationId, revision })) {
    if (typeof value !== "string" || !PM_MARKER_PART.test(value)) {
      throw new Error(`PM marker ${name} must use lowercase letters, digits, dots, underscores, or hyphens`);
    }
  }
  if (!/^r[1-9]\d*$/.test(revision)) throw new Error("PM marker revision must be r followed by a positive integer");
  const payloadHash = createHash("sha256").update(stableJson(payload)).digest("hex").slice(0, 16);
  return `<!-- opchain:${skill}:${event}:${correlationId}:${revision}:${payloadHash} -->`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function composePmComment({ markerInput, body }) {
  if (typeof body !== "string" || body.trim() === "") throw new Error("PM comment body must be a non-empty string");
  const marker = buildPmMarker(markerInput);
  return { marker, body: `${marker}\n${body}` };
}

// Provider is deliberately small and mockable: listComments(ticket) returns
// [{ body }], and addComment({ ticket, body, marker }) performs the single
// write. A caller retries after uncertain delivery by calling this boundary
// again; a now-visible exact marker reconciles the delivery without a duplicate.
export async function reconcilePmComment({ ticket, markerInput, body, provider }) {
  if (!provider || typeof provider.listComments !== "function" || typeof provider.addComment !== "function") {
    throw new Error("PM provider must supply listComments() and addComment()");
  }
  const composed = composePmComment({ markerInput, body });
  const comments = await provider.listComments(ticket);
  if (!Array.isArray(comments)) throw new Error("PM provider listComments() must return an array");
  if (comments.some((comment) => typeof comment?.body === "string" && comment.body.includes(composed.marker))) {
    return { status: "reconciled", marker: composed.marker };
  }
  const result = await provider.addComment({ ticket, ...composed });
  return { status: "written", marker: composed.marker, result };
}

export function checkSkillFile(id, text) {
  const errors = [];
  if (!/^##\s+PM-Tool MCP Integration/m.test(text)) {
    errors.push(`${id}: missing section anchor "## PM-Tool MCP Integration"`);
  }
  const placeholderHits = text.match(/mcp\.<provider>\./g);
  if (placeholderHits) {
    errors.push(
      `${id}: found ${placeholderHits.length} legacy placeholder(s) ` +
      `\`mcp.<provider>.\` — replace with concrete registry tool names ` +
      `or cite the protocol doc by reference.`,
    );
  }
  if (!text.includes("pm-mcp-protocol.md")) {
    errors.push(
      `${id}: PM-Tool MCP Integration section must cite ` +
      `integrations-engineer/references/pm-mcp-protocol.md`,
    );
  }
  return errors;
}

export function checkToolNames(id, text) {
  const errors = [];
  const warnings = [];
  const seen = new Set(text.match(/mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+/g) || []);
  for (const name of seen) {
    if (ALL_REGISTRY_TOOLS.has(name)) continue;
    if (name.startsWith("mcp__atlassian__")) {
      warnings.push(
        `${id}: Jira tool name not in registry: ${name} (Atlassian MCP surface is still stabilising)`,
      );
      continue;
    }
    errors.push(`${id}: tool name not in any provider's registry: ${name}`);
  }
  return { errors, warnings };
}

export function checkPmYaml(text) {
  const errors = [];
  let parsed;
  try {
    parsed = parsePmYaml(text);
  } catch (e) {
    errors.push(`.opchain/pm.yaml parse error: ${e.message}`);
    return { errors, parsed: null };
  }

  for (const k of ["provider", "team_or_project", "issue_types", "states"]) {
    if (!(k in parsed)) errors.push(`.opchain/pm.yaml missing required key \`${k}\``);
  }

  if (parsed.provider && !ALLOWED_PROVIDERS.has(parsed.provider)) {
    errors.push(
      `.opchain/pm.yaml provider must be one of ${[...ALLOWED_PROVIDERS].join(", ")} ` +
      `(got "${parsed.provider}")`,
    );
  }

  const states = parsed.states || {};
  if (typeof parsed.issue_types !== "object" || Array.isArray(parsed.issue_types)) {
    errors.push(".opchain/pm.yaml issue_types must be a mapping");
  }
  if (typeof states !== "object" || Array.isArray(states)) {
    errors.push(".opchain/pm.yaml states must be a mapping");
    return { errors, parsed };
  }
  for (const required of ["in_progress", "in_review", "done"]) {
    if (!(required in states)) {
      errors.push(`.opchain/pm.yaml states.${required} is required`);
    }
  }

  return { errors, parsed };
}
