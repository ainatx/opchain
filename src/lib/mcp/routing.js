// Intent → skill routing for the opchain MCP server.
//
// Claude Code auto-discovers skills and triggers them on their `description`.
// Codex (and other MCP clients) instead ask the server "which skill handles
// this?" via the `route` tool. This module reproduces the orchestrator's Smart
// Routing table (skills/orchestrator.md §4) deterministically:
//
//   1. An exact /oc-* command resolves to the skill that declares it.
//   2. Otherwise a natural-language request is matched against the intent
//      table below (mirrors the documented routing rules).
//   3. No match → oc-orchestrator, which interviews the user and dispatches.

// Natural-language hints, mirroring skills/orchestrator.md §4 "Smart Routing
// Table": at least one row per invocable skill (every skill except
// oc-checkpoint-protocol, which is a protocol, not an entry point), and each
// `phase` is a verb its target skill declares in frontmatter `commands:`.
// tests/mcp-routing-coverage.test.js enforces both, and walks every quoted §4
// example phrase through route().
//
// First match wins, so order matters: a specific phrase sits above any generic
// word it contains. Collisions resolved deliberately (pinned in
// tests/routing-disambiguation.test.js):
//
//   "where did I leave off (on X)"      → oc-orchestrator, above every domain row (a
//                                         resume request names a domain in passing);
//                                         bare "status" stays near the bottom
//   "quick audit", "before I commit"    → oc-bug-check, above code-auditor + git-ops
//   "tag the release"                   → oc-git-ops /oc-git-release (the tag verb),
//                                         above oc-release-ops, which hands the tag off
//   "ship v1.3"                         → oc-release-ops, above deploy-ops' "ship it"
//   "build an agent", "subagent"        → oc-agent-forge, above app-architect's
//                                         generic "build a/an/the"
//   "prompt caching", "model migration" → oc-claude-api, above scale-ops' caching and
//                                         migration-ops' "migrate"
//   "usage metering", "skill usage"     → oc-telemetry-ops, above monitoring-ops and
//                                         dash-forge's "dashboard"; bare "telemetry"
//                                         (service telemetry) is deliberately not claimed
//   "what did this cost", "budget gate" → oc-cost-ops, above scale-ops
//   "new metric", "instrument this"     → oc-signal-forge, above monitoring-ops
//   "plan a load test"                  → oc-qa-ops (plans), above scale-ops'
//                                         "load test" (executes)
//   "harden this", "the pen test found" → oc-security-hardening (executes), above the
//                                         auditor's "hardening"/"hardened"/"pen test"
//                                         (assesses)
//   "SOC 2 evidence", "audit-ready"     → oc-compliance-ops, above the auditor's
//                                         "SOC 2 readiness" and code-auditor's "audit".
//                                         The row names compliance frameworks and
//                                         artefacts only, so "OWASP compliance" falls
//                                         through to oc-security-auditor below it and
//                                         "WCAG compliant" to oc-ux-engineer
//   "accessibility audit"               → oc-ux-engineer, above code-auditor's "audit"
//   "pre-deploy check"                  → oc-code-auditor, above deploy-ops' "deploy"
//   "OpenAPI/API schema drift"          → oc-api-dev; "warehouse schema drift" → oc-data-ops
//   "sync SaaS data into the warehouse" → oc-data-ops: its "warehouse" row sits above
//                                         integrations' "connect … to"/"integrate"
//   "unit vs integration"               → oc-qa-ops, above integrations' "integration"
//   "break up the monolith"             → oc-modularize-ops, above migration-ops
//   "kubernetes", "terraform",
//   "deploy multiple containers",
//   "deploy to VMs"                     → oc-fleet-ops, above deploy-ops' "deploy"
//   "data visualization design"         → oc-dash-forge, above app-architect's "design"
export const INTENT_HINTS = [
  { re: /\b(update opchain|refresh opchain skills)\b/, skill: "oc-update", phase: "/oc-update" },
  { re: /\b(review local learning history|review past agent mistakes)\b/, skill: "oc-hindsight", phase: "/oc-hindsight" },
  { re: /\b(evaluate a learning rule|test a proposed learning rule)\b/, skill: "oc-evolve", phase: "/oc-evolve" },
  // ── Resume: above every domain row ───────────────────────────────────────
  { re: /\b(where did i leave off|(continue|pick up) where (we|i) left off|what should i work on)\b/, skill: "oc-orchestrator", phase: "/oc-ops status" },

  // ── Commit and PR gates, git, release ─────────────────────────────────────
  { re: /\b(pre[- ]?commit|before i commit|lint and test|sanity check|quick (check|audit)|run the checks|safe to commit)\b/, skill: "oc-bug-check", phase: "/oc-bugcheck" },
  { re: /\b(pr docs|update (the )?readme|docs? (drift|drifted|upkeep)|standardi[sz]e (the )?docs)\b/, skill: "oc-docs-forge", phase: "/oc-docs pr" },
  { re: /\b(pr (is )?ready|repo hygiene|clean (up )?(this|the) repo|catalog drift|orphaned (docs|files))\b/, skill: "oc-repo-ops", phase: "/oc-repo audit" },
  { re: /\b(tag (the|a|this) release|release tag|tag v?\d+(\.\d+)*)\b/, skill: "oc-git-ops", phase: "/oc-git-release" },
  { re: /\b(cut (a|the) (v?\d+(\.\d+)* )?release|ship v?\d|draft the changelog|version bump|bump (the )?versions?|what'?s in this release|release notes)\b/, skill: "oc-release-ops", phase: "/oc-release plan" },

  // ── AI-native skills and instrumentation ─────────────────────────────────
  { re: /\b(build (me )?(an?|the|my) (claude )?agent|agent sdk|subagents?|tool budgets?|agent (loop|harness|eval)|multi[- ]agent|orchestrator[- ]worker)\b/, skill: "oc-agent-forge", phase: "/oc-agent plan" },
  { re: /\b(anthropic sdk|claude api|prompt caching|cache hit rate|model migration|migrate (our |the )?prompts|(sonnet|opus|haiku) \d|extended thinking|batch api|files api)\b/, skill: "oc-claude-api", phase: "/oc-claude-api" },
  { re: /\b(rag|vector (database|db|store)|semantic search|vector embeddings?|embeddings|retrieval[- ]augmented)\b/, skill: "oc-rag-forge", phase: "/oc-rag design" },
  { re: /\bprompt drift\b/, skill: "oc-prompt-ops", phase: "/oc-prompt drift" },
  { re: /\b(prompt (regression|eval)s?|eval (dataset|set)|golden ?set)\b/, skill: "oc-prompt-ops", phase: "/oc-prompt eval" },
  { re: /\b(what did (this|that|it)( \w+){0,2} cost|budget gate|cheaper model|token cost|cost (attribution|regression)|llm (spend|cost)|spend per feature|model tier routing)\b/, skill: "oc-cost-ops", phase: "/oc-cost report" },
  { re: /\b(usage (metering|stats)|opt[- ]in (usage )?(analytics|telemetry)|which skills (do )?(people|we|you) (use|actually run)|anonymi[sz]ed usage|(opchain|skill) usage( telemetry)?|skill telemetry)\b/, skill: "oc-telemetry-ops", phase: "/oc-telemetry status" },
  { re: /\b(new metric|derive a kpi|instrument this|is this metric right|metric definition|tracking plan)\b/, skill: "oc-signal-forge", phase: "/oc-signal frame" },

  // ── Assurance ────────────────────────────────────────────────────────────
  { re: /\b(test (strategy|pyramid)|coverage budgets?|contract test(s|ing)?|plan (a |the )?load tests?|which load tests|unit (tests? )?vs\.? integration|flaky tests|test debt)\b/, skill: "oc-qa-ops", phase: "/oc-qa pyramid" },
  { re: /\b(harden|security findings|roll out (a )?csp|rate[- ]limit (this|the|our|an?) (endpoint|api|route)s?|add security headers|rotate secrets|security baseline|the pen ?test found|pen ?test findings)\b/, skill: "oc-security-hardening", phase: "/oc-harden baseline" },
  { re: /\b(soc ?2 (evidence|compliant|compliance|report|controls?|type (i|ii|1|2))|hipaa|gdpr|baa|compliance (evidence|checklist|report|register|profile|controls?)|control (register|mapping)|audit[- ]ready|audit evidence|what would an auditor)\b/, skill: "oc-compliance-ops", phase: "/oc-comply scope" },
  { re: /\b(threat model|owasp|attack surface|hardening|hardened|security posture|security review|security architecture|security risks|soc ?2 readiness|pen ?test|is this secure|secure enough|audit the csp|review waf|check tls)\b/, skill: "oc-security-auditor", phase: "/oc-security posture" },
  { re: /\b(accessibility (audit|review)|a11y audit|wcag)\b/, skill: "oc-ux-engineer", phase: "/oc-uxe eval" },
  { re: /\b(audit|review this code|find bugs|code review|what'?s wrong with this code|is this code good|pre[- ]deploy (check|audit))\b/, skill: "oc-code-auditor", phase: "/oc-audit full" },

  // ── Design ───────────────────────────────────────────────────────────────
  { re: /\b(dashboard|data ?viz|data visuali[sz]ation|report view|kpi|bi design|analytics ui|dense (data|information))\b/, skill: "oc-dash-forge", phase: "/oc-data-forge" },
  { re: /\b(ux|design (review|iteration)|design is inconsistent|component library|accessibility|is the ui consistent)\b/, skill: "oc-ux-engineer", phase: "/oc-uxe eval" },

  // ── Interfaces and data ──────────────────────────────────────────────────
  { re: /\b(design (our|the|an?) api|openapi|graphql schema|versioning strategy|generate (an )?sdk|deprecate (an |the )?endpoint|api (schema|contract) drift)\b/, skill: "oc-api-dev", phase: "/oc-api design" },
  { re: /\b(data pipeline|dbt|data contracts?|ingestion|warehouse|stale data|etl)\b/, skill: "oc-data-ops", phase: "/oc-data-ops design" },
  { re: /\b(connect (\w+ ){0,3}to|webhooks?|oauth|integration|integrate|third[- ]?party api)\b/, skill: "oc-integrations-engineer", phase: "/oc-integrate plan" },

  // ── Change and scale ─────────────────────────────────────────────────────
  { re: /\b(monolith|extract (a|the) service|modulari[sz]e|microservices?|strangler)\b/, skill: "oc-modularize-ops", phase: "/oc-modularize assess" },
  { re: /\b(migrate|migration|upgrade to|refactor to|swap|platform move|breaking changes?|deprecation)\b/, skill: "oc-migration-ops", phase: "/oc-migrate assess" },
  { re: /\b(kubernetes|k8s|terraform|helm charts?|nomad|multiple containers|multi[- ]container|self[- ]managed infra|deploy to (vms?|virtual machines|bare metal|on[- ]prem)|on[- ]prem deployment|container fleet|orchestrate containers)\b/, skill: "oc-fleet-ops", phase: "/oc-fleet topology" },
  { re: /\b(load test|handle more users|handle \d+x|performance|perf budget|caching strategy|capacity)\b/, skill: "oc-scale-ops", phase: "/oc-scale audit" },

  // ── Ship and operate ─────────────────────────────────────────────────────
  { re: /\b(is prod healthy|prod(uction)? health)\b/, skill: "oc-monitoring-ops", phase: "/oc-monitor health" },
  { re: /\b(monitor(ing)?|uptime|error tracking|alerting|observability|incident|on[- ]?call|runbook|slos?|slis?|status page)\b/, skill: "oc-monitoring-ops", phase: "/oc-monitor setup" },
  { re: /\b(deploy|ship it|push to production|staging|rollback|go live)\b/, skill: "oc-deploy-ops", phase: "/oc-deploy staging" },
  { re: /\b(commit|push to git|create a pr|sync to repo|open a (pr|pull request))\b/, skill: "oc-git-ops", phase: "/oc-git-sync" },

  // ── Plan: the generic catch-alls go last ─────────────────────────────────
  { re: /\b(document|reverse[- ]?spec|backfill specs?|specs? from code|existing codebase)\b/, skill: "oc-reverse-spec", phase: "/oc-rev-full" },
  { re: /\b(what stack|which stack|tech stack|framework comparison|what should i build with)\b/, skill: "oc-stack-forge", phase: "/oc-stack-decide" },
  { re: /\b(status|what should i do|which project|show me everything)\b/, skill: "oc-orchestrator", phase: "/oc-ops status" },
  { re: /\b(build me (an?|the|my) |i have an idea|app idea|new project|spec|design|build (an?|the) )/, skill: "oc-app-architect", phase: "/oc-discover" },
];

const DEFAULT_SKILL = "oc-orchestrator";

/** Strip leading slash and surrounding whitespace; lower-case. */
function normalizeCommand(token) {
  return token.trim().replace(/^\//, "").toLowerCase();
}

/**
 * Build a `command verb → skill id` index from the catalog. Each skill's
 * frontmatter `commands` array (e.g. ["/oc-git", "/oc-git-sync"]) is the
 * source of truth — no hand-maintained second copy.
 */
export function buildCommandIndex(catalog) {
  const index = new Map();
  for (const skill of catalog.skills ?? []) {
    for (const cmd of skill.commands ?? []) {
      const verb = normalizeCommand(String(cmd).split(/\s+/)[0]);
      if (verb && !index.has(verb)) index.set(verb, skill.id);
    }
  }
  return index;
}

/**
 * Resolve a request to a skill.
 *
 * @param {string} query - an /oc-* command or a free-text request.
 * @param {{skills: Array}} catalog
 * @returns {{ skill: string, phase: string|null, matchedCommand: string|null, reason: string, confident: boolean }}
 */
export function route(query, catalog) {
  const raw = String(query ?? "").trim();
  const index = buildCommandIndex(catalog);

  // 1. Exact /oc-* command. Accept the first whitespace-delimited token so
  //    "/oc-git-sync ADEV-12" still resolves on the verb.
  const firstToken = raw.split(/\s+/)[0] || "";
  if (firstToken.startsWith("/") || index.has(normalizeCommand(firstToken))) {
    const verb = normalizeCommand(firstToken);
    const skill = index.get(verb);
    if (skill) {
      return {
        skill,
        phase: raw.startsWith("/") ? raw : `/${raw}`,
        matchedCommand: `/${verb}`,
        reason: `'/${verb}' is declared by ${skill}.`,
        confident: true,
      };
    }
  }

  // 2. Natural-language intent table.
  const lower = raw.toLowerCase();
  for (const hint of INTENT_HINTS) {
    if (hint.re.test(lower)) {
      return {
        skill: hint.skill,
        phase: hint.phase,
        matchedCommand: null,
        reason: `Matched the routing rule for ${hint.skill}.`,
        confident: true,
      };
    }
  }

  // 3. Fallback — the orchestrator interviews the user and dispatches.
  return {
    skill: DEFAULT_SKILL,
    phase: "/oc-ops",
    matchedCommand: null,
    reason: "No specific rule matched; oc-orchestrator will route from a one-line intake.",
    confident: false,
  };
}
