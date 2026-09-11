/**
 * opchain-dev — Cloudflare Worker for opchain.dev
 *
 * Routes:
 *   GET  /api/health           → health check
 *   POST /api/feedback         → Linear issue creation (bug/improvement/security/general);
 *                                 roadmap feature requests (type=feature + category) go to
 *                                 GitHub Issues instead — see docs/plans/2026-08-26-roadmap-github-issues.md
 *   POST /api/notify           → install/download soft-gate capture (KV-backed)
 *   GET  /*                    → static assets (public/)
 *
 * The `/api/try/*` chat surface and the email-gated session flow were
 * removed in `claude/remove-try-it`. Old links (/tryit) now 301 to /demo.
 * The Resend-powered `/api/email-pipeline` was removed too — Step 5 of
 * /pipeline-builder now offers a client-side Markdown download instead.
 */

import { FeedbackSchema, NotifySchema, parseBody } from "./lib/schemas.js";
import { capture, hashDistinctId } from "./lib/analytics.js";
import { bindLogger, newRequestId, EVENTS } from "./lib/request-id.js";
import { evalFlag, evalFlags } from "./lib/flags/eval.js";
import { ensureOcId } from "./lib/flags/identity.js";
import { FLAG_NAMES, FLAGS, PUBLIC_FLAG_NAMES } from "./lib/flags/registry.js";
import { createMcpServer, MAX_CHECKPOINT_BYTES } from "./lib/mcp/server.js";
import mcpCatalog from "./generated/mcp-catalog.json" with { type: "json" };
import {
  DISCOVERY_PATHS,
  buildAiCatalog,
  buildMcpCard,
  buildLlmsTxt,
  buildSkillsJson,
} from "./lib/discovery.js";
import {
  ALLOWED_ORIGINS,
  corsHeaders,
  applyBaselineHeaders,
  generateNonce,
  buildCspHtml,
  NONCE_PLACEHOLDER,
} from "./lib/http.js";
import {
  DEFAULT_TEAM_ID,
  DEFAULT_PROJECT_ID,
  LABEL_MAP,
  PRIORITY_MAP,
  SECURITY_PRIORITY,
  LINEAR_MUTATION,
} from "./lib/feedback-config.js";
import { ROADMAP_GITHUB_REPO, ROADMAP_COMMUNITY_LABEL } from "./lib/roadmap-config.js";

// Injected at build time by esbuild `define` (see build.mjs).
// eslint-disable-next-line no-undef
const VERSION = typeof __OPCHAIN_VERSION__ !== "undefined" ? __OPCHAIN_VERSION__ : "dev";

async function applySecurityHeaders(response, { env, ctx } = {}) {
  const ct = response.headers.get("Content-Type") || "";
  if (!ct.includes("text/html")) {
    const res = new Response(response.body, response);
    applyBaselineHeaders(res);
    return res;
  }
  const nonce = generateNonce();
  const text = await response.text();
  const swapped = text.split(NONCE_PLACEHOLDER).join(nonce);
  const res = new Response(swapped, response);
  applyBaselineHeaders(res);
  // Strict mode emits enforce; non-strict emits Report-Only so we can tune
  // a new policy in production without breaking the page. The default is
  // strict, so in test paths that don't pass env we keep enforce mode.
  const strict = env
    ? await evalFlag("platform.security.csp-strict", { env, ctx })
    : true;
  const cspHeader = strict ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
  res.headers.set(cspHeader, buildCspHtml(nonce));
  res.headers.delete("Content-Length");
  return res;
}

async function fetchAsset(env, request, origin) {
  let res = await env.ASSETS.fetch(request);
  if (res.status === 308) {
    const loc = res.headers.get("Location");
    if (loc) {
      const redir = new URL(loc, origin);
      res = await env.ASSETS.fetch(new Request(redir, request));
    }
  }
  return res;
}

// ── Roadmap vote handlers ───────────────────────────────────────────────────
// One vote per IP per day per GitHub issue (asfbay-bit/opchain-skills — see
// docs/plans/2026-08-26-roadmap-github-issues.md). Vote counts are stored in
// the NOTIFY KV namespace under keys:
//   vote-count:<issue-number>                          → integer
//   vote-lock:<issue-number>:<YYYY-MM-DD>:<ip-hash>    → "1" (TTL 25h)
// We hash the IP (first 16 hex chars of SHA-256) so the lock keys carry
// no PII at rest. KV is eventually consistent — that's fine for a vote
// counter; the worst case is a few seconds of stale display.
//
// Ids are bare GitHub issue numbers (e.g. "42") — the strict digits-only
// character class keeps the value safe to interpolate into KV keys.
const VOTE_ID_RE = /^\d{1,6}$/;
const VOTE_BATCH_MAX = 50;
const VOTE_TTL_SECONDS = 25 * 60 * 60; // 25h, so lock spans the next-day boundary

async function ipHashHex(ip) {
  const bytes = new TextEncoder().encode(String(ip || "0.0.0.0"));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

async function handleVotePost(request, env, ctx, origin, requestId, rawId) {
  const log = bindLogger(requestId);
  const id = String(rawId || "").toUpperCase();
  if (!VOTE_ID_RE.test(id)) {
    return new Response(
      JSON.stringify({ error: "Invalid issue id.", code: "invalid_id" }),
      { status: 400, headers: corsHeaders(origin, requestId) },
    );
  }
  if (!env.NOTIFY) {
    log.event(EVENTS.NOTIFY_NO_KV, { source: "vote" });
    return new Response(
      JSON.stringify({ error: "Vote storage unavailable.", code: "kv_not_configured" }),
      { status: 503, headers: corsHeaders(origin, requestId) },
    );
  }
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const today = new Date().toISOString().slice(0, 10);
  const ipHash = await ipHashHex(ip);
  const lockKey = `vote-lock:${id}:${today}:${ipHash}`;
  const countKey = `vote-count:${id}`;

  const [existingLock, currentRaw] = await Promise.all([
    env.NOTIFY.get(lockKey),
    env.NOTIFY.get(countKey),
  ]);
  const current = Math.max(0, parseInt(currentRaw || "0", 10) || 0);

  if (existingLock) {
    return new Response(
      JSON.stringify({ ok: true, count: current, alreadyVoted: true }),
      { status: 200, headers: corsHeaders(origin, requestId) },
    );
  }

  const next = current + 1;
  await Promise.all([
    env.NOTIFY.put(lockKey, "1", { expirationTtl: VOTE_TTL_SECONDS }),
    env.NOTIFY.put(countKey, String(next)),
  ]);
  log.event(EVENTS.FEEDBACK_SUBMITTED, { type: "roadmap-vote", issue: id, count: next });
  return new Response(
    JSON.stringify({ ok: true, count: next, alreadyVoted: false }),
    { status: 200, headers: corsHeaders(origin, requestId) },
  );
}

async function handleVoteGet(request, env, origin, requestId) {
  const url = new URL(request.url);
  if (!env.NOTIFY) {
    return new Response(
      JSON.stringify({ counts: {} }),
      { status: 200, headers: corsHeaders(origin, requestId) },
    );
  }
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => VOTE_ID_RE.test(s))
    .slice(0, VOTE_BATCH_MAX);
  const counts = {};
  await Promise.all(
    ids.map(async (id) => {
      const v = await env.NOTIFY.get(`vote-count:${id}`);
      counts[id] = Math.max(0, parseInt(v || "0", 10) || 0);
    }),
  );
  return new Response(
    JSON.stringify({ counts }),
    {
      status: 200,
      headers: {
        ...corsHeaders(origin, requestId),
        "Cache-Control": "no-store",
      },
    },
  );
}

// ── Feedback Handler ────────────────────────────────────────────────────────

async function handleFeedback(request, env, ctx, origin, requestId) {
  const log = bindLogger(requestId);
  const parsed = await parseBody(request, FeedbackSchema);
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({ error: parsed.error, code: parsed.code, issues: parsed.issues }),
      { status: 400, headers: corsHeaders(origin, requestId) },
    );
  }
  const {
    type, title, description, priority, skill, email,
    // Security-only fields — only read when type === "security".
    component, reproduction, impact, severity,
    // Roadmap community-submission field. Presence → community mode.
    category,
  } = parsed.data;
  const isSecurity = type === "security";
  const isCommunity = !!category && !isSecurity;

  // Staging (and any env with the api-feedback kill flag on) accepts the
  // submission, logs it, and returns a synthetic 201 without calling
  // Linear. Keeps test entries out of the prod backlog and means
  // staging doesn't need LINEAR_API_KEY at all. See wrangler.jsonc
  // env.staging.
  //
  // The legacy FEEDBACK_DRY_RUN env var is honoured as a back-compat
  // alias so an in-flight rollout doesn't break staging.
  const dryRun = env.FEEDBACK_DRY_RUN === "true"
    || (await evalFlag("site.ops.api-feedback.kill", { env, ctx }));
  if (dryRun) {
    log.event(EVENTS.FEEDBACK_SUBMITTED, {
      type, priority: PRIORITY_MAP[priority] ?? 0,
      skill: skill || null, issue: "STAGING-DRY-RUN", dry_run: true,
    });
    return new Response(
      JSON.stringify({ ok: true, id: "STAGING-DRY-RUN", url: null, dryRun: true }),
      { status: 201, headers: corsHeaders(origin, requestId) },
    );
  }

  // Roadmap feature requests (RoadmapForm.astro) go to GitHub Issues, not
  // Linear — see docs/plans/2026-08-26-roadmap-github-issues.md. Everything
  // else (bug/improvement/security/general) continues below on Linear.
  if (isCommunity) {
    // Roadmap requests become public GitHub issues, so never forward contact
    // information from the shared feedback payload to that write path.
    return handleRoadmapRequest(request, env, ctx, log, origin, requestId, { type, title, description, category });
  }

  if (!env.LINEAR_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Feedback endpoint not configured", code: "not_configured" }),
      { status: 503, headers: corsHeaders(origin, requestId) },
    );
  }

  const teamId = env.LINEAR_TEAM_ID || DEFAULT_TEAM_ID;
  const projectId = env.LINEAR_PROJECT_ID || DEFAULT_PROJECT_ID;
  // Label resolution. Security disclosures prefer a dedicated label
  // (configurable via env.LINEAR_SECURITY_LABEL_ID); regular feedback
  // uses the static LABEL_MAP entry. Empty → no label, never blocks.
  let labelIds = LABEL_MAP[type] ? [LABEL_MAP[type]] : [];
  if (isSecurity && env.LINEAR_SECURITY_LABEL_ID) {
    labelIds = [env.LINEAR_SECURITY_LABEL_ID];
  }
  // Priority resolution. Security disclosures bypass the
  // user-submitted priority and ride the SECURITY_PRIORITY table —
  // reporters shouldn't be able to mark their own bug as "low."
  const linearPriority = isSecurity
    ? (SECURITY_PRIORITY[severity || "medium"])
    : (PRIORITY_MAP[priority] ?? 0);
  // SKILL_NAMES used to map ids → display names from skill-prompts.js;
  // that file went away with the Try-It removal. The raw slug (e.g.
  // `code-auditor`) still carries enough signal to triage feedback in
  // Linear, so we surface the id directly.
  const skillName = skill || null;

  const descParts = [];
  if (isSecurity) {
    // Structured Markdown body for security disclosures — gives the
    // triager a consistent layout regardless of how thorough the
    // reporter was. Missing sections render as "_Not provided._" so
    // gaps are obvious at a glance.
    descParts.push(`## Severity\n\n${severity ? severity.toUpperCase() : "_Not specified — defaulting to medium triage._"}`);
    descParts.push(`## Affected component\n\n${component || "_Not provided._"}`);
    descParts.push(`## Reproduction\n\n${reproduction || "_Not provided._"}`);
    descParts.push(`## Impact\n\n${impact || "_Not provided._"}`);
    if (description) descParts.push(`## Additional notes\n\n${description}`);
  } else if (description) {
    descParts.push(description);
  }
  if (skillName) descParts.push(`**Skill:** ${skillName}`);
  if (email) descParts.push(`**Contact:** ${email}`);
  descParts.push(`**Request ID:** ${requestId}`);
  descParts.push(
    isSecurity
      ? "_Submitted via opchain.dev /security disclosure form_"
      : "_Submitted via opchain.dev_",
  );

  const titlePrefix = isSecurity ? "[SECURITY]" : `[${type}]`;

  const variables = {
    input: {
      teamId, projectId,
      title: `${titlePrefix} ${title}`,
      description: descParts.join("\n\n"),
      priority: linearPriority,
      labelIds,
    },
  };

  let linearData;
  try {
    const linearRes = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: LINEAR_MUTATION, variables }),
    });
    linearData = await linearRes.json();
  } catch (e) {
    log.eventError(EVENTS.UPSTREAM_FAILED, { upstream: "linear", reason: "fetch_error", message: e.message });
    return new Response(
      JSON.stringify({ error: "Could not reach issue tracker.", code: "upstream_unreachable" }),
      { status: 502, headers: corsHeaders(origin, requestId) },
    );
  }

  if (linearData.data?.issueCreate?.success) {
    const issue = linearData.data.issueCreate.issue;
    log.event(EVENTS.FEEDBACK_SUBMITTED, { type, priority: linearPriority, skill: skill || null, issue: issue.identifier });
    if (email) {
      try {
        const distinctId = await hashDistinctId(email);
        ctx?.waitUntil?.(capture(env, {
          distinctId,
          event: "feedback_submitted",
          properties: { type, priority: linearPriority, skill: skill || null, request_id: requestId },
        }));
      } catch (e) {
        log.warn("analytics error:", e.message);
      }
    }
    return new Response(
      JSON.stringify({ ok: true, id: issue.identifier, url: issue.url }),
      { status: 201, headers: corsHeaders(origin, requestId) },
    );
  }

  log.eventError(EVENTS.FEEDBACK_FAILED, { errors: linearData?.errors?.map((e) => e.message) ?? null });
  return new Response(
    JSON.stringify({ error: "Failed to create issue.", code: "upstream_error" }),
    { status: 500, headers: corsHeaders(origin, requestId) },
  );
}

// ── Roadmap community-request handler (GitHub Issues) ───────────────────────
// RoadmapForm.astro's "Request a feature" form. Unlike the rest of
// /api/feedback (Linear), this creates a public GitHub issue on
// ROADMAP_GITHUB_REPO — visible the instant it's created, not gated behind
// triage the way a Linear ticket was. Two mitigations for that: the
// `community-submitted` label (not a roadmap:* bucket label, so it doesn't
// appear on the public roadmap until a maintainer promotes it) and a
// per-IP rate limit tighter than handleNotify's, since spam here is
// immediately public rather than a private lead-capture record.
const ROADMAP_REQUEST_RATELIMIT_MAX = 5;
const ROADMAP_REQUEST_RATELIMIT_TTL_S = 60 * 60; // 1h

async function handleRoadmapRequest(request, env, ctx, log, origin, requestId, { type, title, description, category }) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  if (env.NOTIFY) {
    const ipHash = await ipHashHex(ip);
    const rlKey = `ratelimit:roadmap-request:${ipHash}`;
    const current = Number(await env.NOTIFY.get(rlKey)) || 0;
    if (current >= ROADMAP_REQUEST_RATELIMIT_MAX) {
      log.event(EVENTS.RATE_LIMIT_HIT, { ip_hash: ipHash, source: "roadmap-request" });
      return new Response(
        JSON.stringify({ error: "Too many requests, slow down.", code: "rate_limited" }),
        { status: 429, headers: corsHeaders(origin, requestId) },
      );
    }
    await env.NOTIFY.put(rlKey, String(current + 1), {
      expirationTtl: ROADMAP_REQUEST_RATELIMIT_TTL_S,
    });
  }

  if (!env.ROADMAP_GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Roadmap request endpoint not configured", code: "not_configured" }),
      { status: 503, headers: corsHeaders(origin, requestId) },
    );
  }

  const descParts = [description];
  descParts.push(`**Category:** ${category}`);
  descParts.push(`**Request ID:** ${requestId}`);
  descParts.push("_Submitted via opchain.dev /changelog roadmap form — stays off the public roadmap until a maintainer adds a `roadmap:*` label during triage._");

  let ghRes;
  try {
    ghRes = await fetch(`https://api.github.com/repos/${ROADMAP_GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ROADMAP_GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "opchain-dev-worker",
      },
      body: JSON.stringify({
        title: `[community/${type}] ${title}`,
        body: descParts.join("\n\n"),
        labels: [ROADMAP_COMMUNITY_LABEL],
      }),
    });
  } catch (e) {
    log.eventError(EVENTS.UPSTREAM_FAILED, { upstream: "github", reason: "fetch_error", message: e.message });
    return new Response(
      JSON.stringify({ error: "Could not reach issue tracker.", code: "upstream_unreachable" }),
      { status: 502, headers: corsHeaders(origin, requestId) },
    );
  }

  if (ghRes.ok) {
    const issue = await ghRes.json();
    const id = `${ROADMAP_GITHUB_REPO.split("/")[1]}#${issue.number}`;
    log.event(EVENTS.FEEDBACK_SUBMITTED, { type, skill: null, issue: id, source: "github" });
    return new Response(
      JSON.stringify({ ok: true, id, url: issue.html_url }),
      { status: 201, headers: corsHeaders(origin, requestId) },
    );
  }

  log.eventError(EVENTS.FEEDBACK_FAILED, { errors: [await ghRes.text().catch(() => "")] });
  return new Response(
    JSON.stringify({ error: "Failed to create issue.", code: "upstream_error" }),
    { status: 500, headers: corsHeaders(origin, requestId) },
  );
}

// ── Notify (install/download soft-gate capture) ─────────────────────────────
//
// The user lands at the install page or clicks "download skill" / "download
// bundle". A modal opens asking for email + role + team size + free-text
// "what are you building". Submit (or skip) — submit posts here.
//
// Stored in env.NOTIFY (KV) under `lead:<sha256(email)>`. Hashing the email
// keeps the key opaque if KV is ever exfiltrated *and* gives us idempotent
// upserts (re-submitting the same email overwrites instead of accumulating).
//
// Rate-limited per IP at 3 submissions / 60s. Bots that try to spam are
// silently 429'd; legitimate users will never hit it.
//
// If env.NOTIFY isn't bound (local dev without `wrangler kv:namespace
// create`), the handler accepts the submission and returns 200 — the lead
// is just not persisted. Logs an event so missing-binding misconfigurations
// are visible in Cloudflare's dashboard.

const NOTIFY_RATELIMIT_MAX = 3;
const NOTIFY_RATELIMIT_TTL_S = 60;
const LEAD_TTL_SECONDS = 365 * 24 * 60 * 60;

async function handleNotify(request, env, ctx, origin, requestId) {
  const log = bindLogger({ requestId, route: "/api/notify" });

  const parsed = await parseBody(request, NotifySchema);
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({ error: parsed.error, code: parsed.code, issues: parsed.issues }),
      { status: 400, headers: corsHeaders(origin, requestId) },
    );
  }
  const { email, role, teamSize, building, source } = parsed.data;

  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

  // Rate-limit per IP. KV is best-effort — if NOTIFY isn't bound we
  // skip the limit and let the submission through.
  if (env.NOTIFY) {
    const ipHash = await ipHashHex(ip);
    const rlKey = `ratelimit:notify:${ipHash}`;
    const current = Number(await env.NOTIFY.get(rlKey)) || 0;
    if (current >= NOTIFY_RATELIMIT_MAX) {
      log.event(EVENTS.NOTIFY_RATELIMITED, { ip_hash: ipHash });
      return new Response(
        JSON.stringify({ error: "Too many submissions, slow down.", code: "rate_limited" }),
        { status: 429, headers: corsHeaders(origin, requestId) },
      );
    }
    await env.NOTIFY.put(rlKey, String(current + 1), {
      expirationTtl: NOTIFY_RATELIMIT_TTL_S,
    });
  }

  const emailHash = await sha256Hex(email.toLowerCase());
  const record = {
    email,
    role: role ?? null,
    teamSize: teamSize ?? null,
    building: building ?? null,
    source,
    submittedAt: new Date().toISOString(),
    requestId,
  };

  if (env.NOTIFY) {
    await env.NOTIFY.put(`lead:${emailHash}`, JSON.stringify(record), {
      expirationTtl: LEAD_TTL_SECONDS,
    });
    log.event(EVENTS.NOTIFY_CAPTURED, { source, hasRole: !!role, hasTeamSize: !!teamSize, hasBuilding: !!building });
  } else {
    log.event(EVENTS.NOTIFY_NO_KV, { source });
  }

  // Fire-and-forget PostHog event so funnel-analytics still works even
  // when KV is unbound.
  try {
    const distinctId = await hashDistinctId(email);
    ctx?.waitUntil?.(capture(env, {
      distinctId,
      event: "notify_submitted",
      properties: {
        source,
        role: role ?? null,
        team_size: teamSize ?? null,
        has_building: !!building,
        request_id: requestId,
      },
    }));
  } catch { /* analytics never breaks a submission */ }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: corsHeaders(origin, requestId) },
  );
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Flags API ───────────────────────────────────────────────────────────────
//
// /api/flags/public returns the subset of flags safe to ship to the browser
// (UI / feature / experiment / consent / skill visibility — see
// PUBLIC_FLAG_NAMES). Sets the `oc_id` cookie if missing so the same visitor
// keeps landing in the same percentage-rollout bucket.
//
// Response is cached briefly per-visitor:
//   Cache-Control: private, max-age=30
// — long enough to absorb a burst of fetches on a single page load, short
// enough that flipping a flag in PostHog propagates within ~30s. This
// deliberately overrides the no-store default from corsHeaders(); `private`
// still keeps it out of the shared edge cache — only the visitor's browser
// may hold it.

async function handlePublicFlags(request, env, ctx, origin, requestId) {
  const { id, setCookie } = ensureOcId(request);
  const flags = await evalFlags(PUBLIC_FLAG_NAMES, { env, ctx, distinctId: id });
  const headers = {
    ...corsHeaders(origin, requestId),
    "Cache-Control": "private, max-age=30",
  };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(
    JSON.stringify({ flags }),
    { status: 200, headers },
  );
}

/**
 * Build a server-only summary of flags whose evaluated value differs from
 * the registry default. Used by /api/health when site.ops.api-health.detailed
 * is on. Distinct id is intentionally omitted — this is the env-level
 * picture, not a per-visitor snapshot.
 */
async function flagOverridesSummary(env, ctx) {
  const evaluated = await evalFlags(FLAG_NAMES, { env, ctx });
  const overrides = {};
  for (const name of FLAG_NAMES) {
    const def = FLAGS[name];
    if (evaluated[name] !== def.default) overrides[name] = evaluated[name];
  }
  return { count: Object.keys(overrides).length, overrides };
}

// Skill ids gained an `oc-` prefix (skills/oc-*). Map the old /skills/<id>
// page URLs and /skills/<id>.zip bundle URLs to the prefixed path with a 301
// so inbound + bookmarked links survive the rename.
const RENAMED_SKILL_IDS = new Set([
  "api-dev", "app-architect", "bug-check", "checkpoint-protocol", "code-auditor",
  "dash-forge", "deploy-ops", "git-ops", "integrations-engineer", "migration-ops",
  "monitoring-ops", "orchestrator", "release-ops", "reverse-spec", "scale-ops",
  "security-auditor", "stack-forge", "ux-engineer",
]);

// ── MCP server (POST /mcp) ──────────────────────────────────────────────────
//
// Exposes the opchain skill catalog, intent routing, the shared orchestrator
// protocol, and session checkpoints to Codex and any other MCP client over
// streamable HTTP (JSON-RPC 2.0 on a single POST endpoint). Skill bodies stream
// from the ASSETS binding (public/docs/<id>/SKILL.md, synced by sync-docs.sh);
// checkpoints persist in the NOTIFY KV namespace, scoped per session. The
// transport-agnostic core is src/lib/mcp/server.js (also wrapped over stdio by
// mcp/local-server.mjs). Gated by the site.ops.api-mcp.kill switch in route().

const MCP_CHECKPOINT_TTL_SECONDS = 30 * 24 * 60 * 60;
const MCP_REQUEST_MAX_BYTES = 256 * 1024;
const MCP_BATCH_MAX = 25;

function mcpCheckpointStore(env) {
  if (!env.NOTIFY) return null;
  const key = (skill, session) => `mcp-checkpoint:${session}:${skill}`;

  async function signingKey() {
    const secret = env.MCP_SESSION_SIGNING_KEY;
    if (typeof secret !== "string" || new TextEncoder().encode(secret).byteLength < 32) {
      throw new Error("MCP session signing key is not configured");
    }
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }

  function base64Url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeBase64Url(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return {
    async createSession() {
      const id = crypto.randomUUID();
      const signature = await crypto.subtle.sign(
        "HMAC",
        await signingKey(),
        new TextEncoder().encode(id),
      );
      return `${id}.${base64Url(signature)}`;
    },
    async hasSession(session) {
      const separator = session.lastIndexOf(".");
      if (separator <= 0) return false;
      const id = session.slice(0, separator);
      const signature = session.slice(separator + 1);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return false;
      if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
      try {
        const signatureBytes = decodeBase64Url(signature);
        if (base64Url(signatureBytes) !== signature) return false;
        return await crypto.subtle.verify(
          "HMAC",
          await signingKey(),
          signatureBytes,
          new TextEncoder().encode(id),
        );
      } catch {
        return false;
      }
    },
    async read(skill, session) {
      const raw = await env.NOTIFY.get(key(skill, session));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    async write(skill, session, data) {
      const serialized = JSON.stringify(data);
      if (new TextEncoder().encode(serialized).byteLength > MAX_CHECKPOINT_BYTES) {
        throw new Error(`checkpoint exceeds the ${MAX_CHECKPOINT_BYTES}-byte storage limit.`);
      }
      await env.NOTIFY.put(key(skill, session), serialized, {
        expirationTtl: MCP_CHECKPOINT_TTL_SECONDS,
      });
    },
  };
}

async function readMcpBody(request) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MCP_REQUEST_MAX_BYTES) return { tooLarge: true };
  if (!request.body) return { text: "" };

  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MCP_REQUEST_MAX_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(joined) };
}

function checkpointMutationCount(body) {
  const messages = Array.isArray(body) ? body : [body];
  return messages.filter(
    (message) => message?.method === "tools/call" &&
      ["create_checkpoint_session", "write_checkpoint"].includes(message?.params?.name),
  ).length;
}

async function consumeMcpWriteBudget(request, env, writeCount) {
  if (writeCount === 0) return { ok: true };
  if (!env.MCP_WRITE_RATE_LIMITER?.limit) return { ok: false, unavailable: true };
  const ipHash = await ipHashHex(request.headers.get("CF-Connecting-IP") || "0.0.0.0");
  try {
    // The Cloudflare binding is the enforcement mechanism. Consume one token
    // per mutation (rather than per HTTP batch), sequentially, so a 25-message
    // batch cannot collapse to one rate-limit event.
    for (let i = 0; i < writeCount; i += 1) {
      const result = await env.MCP_WRITE_RATE_LIMITER.limit({ key: ipHash });
      if (!result?.success) return { ok: false, unavailable: false };
    }
    return { ok: true };
  } catch {
    // Writes fail closed when the binding is absent or unhealthy. Read-only
    // MCP discovery and checkpoint reads remain available.
    return { ok: false, unavailable: true };
  }
}

async function handleMcp(request, env, ctx, origin, requestId) {
  const headers = { ...corsHeaders(origin, requestId), "Cache-Control": "no-store" };

  // Streamable HTTP: clients POST JSON-RPC. No standalone GET SSE stream is
  // offered (the server is stateless request/response), so GET → 405.
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Use POST with a JSON-RPC body." } }),
      { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } },
    );
  }

  let body;
  try {
    const raw = await readMcpBody(request);
    if (raw.tooLarge) {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request body too large" } }),
        { status: 413, headers },
      );
    }
    body = JSON.parse(raw.text);
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }),
      { status: 400, headers },
    );
  }

  if (Array.isArray(body) && body.length === 0) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }),
      { status: 400, headers },
    );
  }
  if (Array.isArray(body) && body.length > MCP_BATCH_MAX) {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: `Batch exceeds ${MCP_BATCH_MAX} messages` } }),
      { status: 400, headers },
    );
  }

  const writeCount = checkpointMutationCount(body);
  const writeBudget = await consumeMcpWriteBudget(request, env, writeCount);
  if (!writeBudget.ok) {
    const unavailable = writeBudget.unavailable;
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: unavailable ? "Checkpoint write protection unavailable" : "Checkpoint write rate limit exceeded",
        },
      }),
      {
        status: unavailable ? 503 : 429,
        headers: { ...headers, ...(unavailable ? {} : { "Retry-After": "60" }) },
      },
    );
  }

  const reqOrigin = new URL(request.url).origin;
  const server = createMcpServer({
    catalog: mcpCatalog,
    serverVersion: VERSION,
    checkpoints: mcpCheckpointStore(env),
    // The server validates `id` against the catalog before calling this, so the
    // path is always a known skill id — no traversal risk.
    loadBody: async (id) => {
      const res = await env.ASSETS.fetch(new Request(new URL(`/docs/${id}/SKILL.md`, reqOrigin)));
      if (!res.ok) return null;
      const text = await res.text();
      return text && text.trim() ? text : null;
    },
  });

  // Single message or JSON-RPC batch. Notifications (no id) get a 202 with no body.
  if (Array.isArray(body)) {
    // Preserve request order so mutations and subsequent reads of an already
    // issued session are deterministic. JSON-RPC permits any response order.
    const responses = [];
    for (const message of body) {
      const response = await server.handle(message);
      if (response !== null) responses.push(response);
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers });
    return new Response(JSON.stringify(responses), { status: 200, headers });
  }

  const response = await server.handle(body);
  if (response === null) return new Response(null, { status: 202, headers });
  return new Response(JSON.stringify(response), { status: 200, headers });
}

// Agentic-discovery docs (ai-catalog.json, mcp.json, llms.txt, skills.json) are
// public, uncredentialed metadata, so they get a wildcard CORS origin (any
// registry/agent can fetch them) and a modest edge cache.
function discoveryHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
    "X-Opchain-Version": VERSION,
  };
}

// ── Main Router ─────────────────────────────────────────────────────────────

async function route(request, env, ctx, url, origin, requestId) {
    // MCP Streamable HTTP requires validation of every present Origin to
    // prevent DNS-rebinding/cross-site attacks. Native clients that omit
    // Origin remain supported. Reject before parsing, KV, or rate limiting.
    if (url.pathname === "/mcp" && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Origin not allowed" } }),
        { status: 403, headers: corsHeaders(origin, requestId) },
      );
    }

    if (request.method === "OPTIONS" && (url.pathname.startsWith("/api/") || url.pathname === "/mcp")) {
      return new Response(null, { status: 204, headers: corsHeaders(origin, requestId) });
    }

    // opchain MCP server (Codex + any MCP client). JSON-RPC over a single POST.
    if (url.pathname === "/mcp") {
      if (await evalFlag("site.ops.api-mcp.kill", { env, ctx })) {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "opchain MCP server is paused." } }),
          { status: 503, headers: corsHeaders(origin, requestId) },
        );
      }
      return handleMcp(request, env, ctx, origin, requestId);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      const body = { ok: true, service: "opchain-dev", version: VERSION };
      if (await evalFlag("site.ops.api-health.detailed", { env, ctx })) {
        body.flags = await flagOverridesSummary(env, ctx);
      }
      return new Response(
        JSON.stringify(body),
        {
          headers: {
            "Content-Type": "application/json",
            // Version-truth probe: post-deploy sanity checks and the deploy-lag
            // canary compare this SHA against main HEAD, so a cached response
            // reads as false drift (or masks a fresh deploy).
            "Cache-Control": "no-store",
            "X-Opchain-Version": VERSION,
            "X-Opchain-Request-Id": requestId,
          },
        },
      );
    }

    if (url.pathname === "/api/flags/public" && request.method === "GET") {
      return handlePublicFlags(request, env, ctx, origin, requestId);
    }

    // ── Agentic resource discovery ────────────────────────────────────────
    // The "front door" that lets registries/agents find the MCP server above.
    // All four are derived from the same mcpCatalog the MCP server serves and
    // self-describe per request origin (staging advertises staging).
    if (request.method === "GET" && url.pathname === DISCOVERY_PATHS.aiCatalog) {
      const data = buildAiCatalog({ catalog: mcpCatalog, origin: url.origin, version: VERSION });
      return new Response(JSON.stringify(data, null, 2) + "\n", {
        headers: discoveryHeaders("application/json; charset=utf-8"),
      });
    }
    if (request.method === "GET" && url.pathname === DISCOVERY_PATHS.mcpCard) {
      // Tool list comes from a live server instance so the card never drifts
      // from what POST /mcp actually exposes.
      const { tools } = createMcpServer({ catalog: mcpCatalog, serverVersion: VERSION });
      const data = buildMcpCard({ catalog: mcpCatalog, origin: url.origin, version: VERSION, tools });
      return new Response(JSON.stringify(data, null, 2) + "\n", {
        headers: discoveryHeaders("application/json; charset=utf-8"),
      });
    }
    if (request.method === "GET" && url.pathname === DISCOVERY_PATHS.skills) {
      const data = buildSkillsJson({ catalog: mcpCatalog, origin: url.origin, version: VERSION });
      return new Response(JSON.stringify(data, null, 2) + "\n", {
        headers: discoveryHeaders("application/json; charset=utf-8"),
      });
    }
    if (request.method === "GET" && url.pathname === DISCOVERY_PATHS.llms) {
      const text = buildLlmsTxt({ catalog: mcpCatalog, origin: url.origin });
      return new Response(text, {
        headers: discoveryHeaders("text/plain; charset=utf-8"),
      });
    }

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return handleFeedback(request, env, ctx, origin, requestId);
    }

    // POST /api/votes/:id — per-IP/day server-side dedup, returns new count.
    // GET  /api/votes?ids=A,B,C — batched count read for the roadmap UI.
    const voteMatch = url.pathname.match(/^\/api\/votes\/([^/]+)$/);
    if (voteMatch && request.method === "POST") {
      if (await evalFlag("site.ops.api-feedback.kill", { env, ctx })) {
        return new Response(
          JSON.stringify({ error: "Voting is paused.", code: "paused" }),
          { status: 503, headers: corsHeaders(origin, requestId) },
        );
      }
      return handleVotePost(request, env, ctx, origin, requestId, voteMatch[1]);
    }
    if (url.pathname === "/api/votes" && request.method === "GET") {
      return handleVoteGet(request, env, origin, requestId);
    }

    if (url.pathname === "/api/notify" && request.method === "POST") {
      // Ops kill switch — when on, return 503 without touching KV. Used to
      // pause lead capture during incidents. Default off, so existing
      // traffic flows untouched.
      if (await evalFlag("site.ops.api-notify.kill", { env, ctx })) {
        return new Response(
          JSON.stringify({ error: "Lead capture is paused.", code: "paused" }),
          { status: 503, headers: corsHeaders(origin, requestId) },
        );
      }
      return handleNotify(request, env, ctx, origin, requestId);
    }

    // /api/email-pipeline (Resend-backed Step 5 email send) and /api/try/*
    // (the email-gated chat) are both gone. Reject with 410 Gone so any
    // cached client gets a clean "the resource is gone" rather than a 404.
    if (
      url.pathname === "/api/email-pipeline" ||
      url.pathname.startsWith("/api/try")
    ) {
      return new Response(
        JSON.stringify({ error: "This endpoint has been removed." }),
        // no-store keeps the "nothing under /api/* is edge-cached" invariant
        // exception-free — a cached 410 would outlive any future revival.
        { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
      );
    }

    // /tryit + /in-action both 301 to the combined /demo page.
    const demoRedirects = {
      "/in-action": "/demo",
      "/tryit":     "/demo",
    };

    // Builds an absolute redirect target: starts from `target` (which may
    // include a hash), preserves the original request's query string.
    // Example: ("/demo#live", url with ?skill=foo) → "https://.../demo?skill=foo#live"
    const buildRedirect = (target) => {
      const dest = new URL(target, url.origin);
      dest.search = url.search;
      return dest.toString();
    };

    // Sprint 6 — legacy `.html` paths (live until today) now 301 to clean URLs.
    // `/index.html` → `/`; `/foo.html` → `/foo`. If the cleaned path is one
    // of the demo-folded routes, jump straight to the final destination so
    // we don't make users follow a two-hop redirect chain.
    // We build the Response by hand (rather than `Response.redirect`) so the
    // outer baseline-header stamp can mutate the Headers.
    if (request.method === "GET" && url.pathname.endsWith(".html")) {
      const clean = url.pathname === "/index.html" ? "/" : url.pathname.replace(/\.html$/, "");
      const target = demoRedirects[clean] ?? clean;
      return new Response(null, { status: 301, headers: { Location: buildRedirect(target) } });
    }

    if (request.method === "GET") {
      const target = demoRedirects[url.pathname];
      if (target) {
        return new Response(null, { status: 301, headers: { Location: buildRedirect(target) } });
      }
    }

    // Old (pre-oc-) skill URLs 301 to the prefixed path. Matches both the
    // page (`/skills/<id>` and `/skills/<id>/`) and the per-skill bundle
    // (`/skills/<id>.zip`). Already-prefixed `/skills/oc-*` never matches the
    // id set, so there's no redirect loop.
    if (request.method === "GET") {
      const skillPath = url.pathname.match(/^\/skills\/([a-z0-9][a-z0-9-]*?)(\.zip)?\/?$/);
      if (skillPath && RENAMED_SKILL_IDS.has(skillPath[1])) {
        const dest = `/skills/oc-${skillPath[1]}${skillPath[2] || ""}`;
        return new Response(null, { status: 301, headers: { Location: buildRedirect(dest) } });
      }
    }

    if (url.pathname.endsWith(".zip")) {
      if (!(await evalFlag("site.feature.install-zip-download", { env, ctx }))) {
        return new Response("Not Found", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      const res = await fetchAsset(env, request, url.origin);
      const dlRes = new Response(res.body, res);
      // Use the actual filename from the URL so per-skill bundles
      // (`/skills/<id>.zip`) download as `<id>.zip` and the combined
      // bundle still downloads as `opchain-skills.zip`.
      const filename = url.pathname.split("/").pop() || "opchain-skills.zip";
      dlRes.headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      dlRes.headers.set("Cache-Control", "public, max-age=3600");
      if (res.ok) {
        try {
          const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
          const distinctId = await hashDistinctId(`ip:${ip}`);
          ctx?.waitUntil?.(capture(env, {
            distinctId,
            event: "zip_downloaded",
            properties: { path: url.pathname, request_id: requestId },
          }));
        } catch { /* analytics never breaks a download */ }
      }
      return applySecurityHeaders(dlRes, { env, ctx });
    }

    // /LICENSE and /NOTICE are extensionless assets: wrangler uploads them
    // with no Content-Type, and every response carries nosniff, so a browser
    // would be left to its unknown-type sniffing heuristic. Pin text/plain
    // (mirrors the .zip special-case above).
    if (request.method === "GET" && (url.pathname === "/LICENSE" || url.pathname === "/NOTICE")) {
      const res = await fetchAsset(env, request, url.origin);
      if (!res.ok) return applySecurityHeaders(res, { env, ctx });
      const txt = new Response(res.body, res);
      txt.headers.set("Content-Type", "text/plain; charset=utf-8");
      txt.headers.set("Cache-Control", "public, max-age=3600");
      return applySecurityHeaders(txt, { env, ctx });
    }

    const res = await fetchAsset(env, request, url.origin);
    return applySecurityHeaders(res, { env, ctx });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);
    const requestId = request.headers.get("X-Opchain-Request-Id") || newRequestId();
    const res = await route(request, env, ctx, url, origin, requestId);
    // Stamp baseline headers on every response. Idempotent — asset responses
    // already set them inside applySecurityHeaders, re-setting is a no-op.
    // Doing this unconditionally prevents latent bugs where a future handler
    // sets one baseline header and accidentally suppresses the rest.
    applyBaselineHeaders(res);
    return res;
  },
};
