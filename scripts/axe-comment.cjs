// Builds the single, edited-in-place PR comment for the Playwright e2e job.
// Mirrors scripts/lhci-comment.cjs in shape so the surface area for PR
// comments stays uniform.
//
// Reads attachments written by routes.spec.ts via testInfo.attach():
//   site/test-results/<test-id>/axe-violations-<slug>.json
// Each file is the raw `violations` array from @axe-core/playwright.
//
// The Playwright step's outcome decides whether there is anything to say.
// Directory contents cannot: a green run still leaves files under
// test-results/ (compare.spec.ts writes its screenshots there, and a retried
// attempt keeps its trace), which is how passing PRs used to collect
// "the e2e job failed" comments on every push.

const fs = require("node:fs");
const path = require("node:path");

const VIOLATION_FILENAME = /^axe-violations-(.+)\.json$/;
const NODE_LIMIT = 5;
const ERROR_CONTEXT_LIMIT = 3;

// Hidden marker that identifies this job's comment so later runs edit it
// instead of posting another one.
const MARKER = "<!-- opchain:axe-comment -->";

function findViolationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (VIOLATION_FILENAME.test(ent.name)) out.push(p);
    }
  }
  return out;
}

function slugToRoute(slug) {
  if (slug === "root") return "/";
  return "/" + slug.replace(/_/g, "/");
}

function listTopLevel(dir, depth = 2) {
  // Diagnostic: shallow listing of `dir` to figure out where Playwright
  // actually wrote attachments when our recursive lookup misses.
  const out = [];
  function walk(d, indent) {
    if (indent > depth) return;
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      out.push("  ".repeat(indent) + (ent.isDirectory() ? `${ent.name}/` : ent.name));
      if (ent.isDirectory()) walk(p, indent + 1);
    }
  }
  walk(dir, 0);
  return out;
}

function findErrorContexts(dir) {
  const out = [];
  function walk(d, depth = 0) {
    if (depth > 3 || out.length >= ERROR_CONTEXT_LIMIT) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); }
    catch { return; }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (ent.name === "error-context.md") {
        try {
          const txt = fs.readFileSync(p, "utf8");
          out.push({ test: path.basename(path.dirname(p)), txt: txt.slice(0, 1500) });
        } catch { /* skip */ }
      }
      if (out.length >= ERROR_CONTEXT_LIMIT) return;
    }
  }
  walk(dir);
  return out;
}

// Playwright's error-context.md embeds its own ```yaml page snapshot, so a
// plain triple-backtick fence would close early. Use one backtick more than
// the longest run in the text.
function fenced(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}\n`;
}

function footer({ sha, runUrl } = {}) {
  const parts = [];
  if (sha) parts.push(`\`${sha.slice(0, 7)}\``);
  if (runUrl) parts.push(`[run](${runUrl})`);
  const where = parts.length ? ` for ${parts.join(" · ")}` : "";
  return `\n---\n_Latest Playwright e2e result${where}. This comment is edited in place on every run._\n`;
}

function failureWithoutViolations(dir) {
  if (!fs.existsSync(dir)) {
    return (
      `## Playwright e2e failed — no test results\n\n` +
      `\`${dir}\` does not exist, so Playwright stopped before any test wrote ` +
      `output (for example, the preview server did not start). See the job log.\n`
    );
  }
  let body = `## Playwright e2e failed — no axe violations recorded\n\n`;
  body +=
    `No \`axe-violations-*.json\` under \`${dir}\`, so the failure is not an ` +
    `axe assertion: another spec failed, or an axe test errored before it ` +
    `could attach its results.\n`;
  const errorContexts = findErrorContexts(dir);
  if (errorContexts.length > 0) {
    body += `\nFirst ${errorContexts.length} error-context.md sample(s):\n`;
    for (const ec of errorContexts) {
      body += `\n<details><summary><code>${ec.test}</code></summary>\n\n`;
      body += fenced(ec.txt) + "</details>\n";
    }
  } else {
    const listing = listTopLevel(dir).slice(0, 30);
    body +=
      `\nNo error-context.md found either. First entries under that path:\n\n` +
      fenced(listing.join("\n") || "(empty)");
  }
  return body;
}

function violationsBody(files) {
  // Each test's attachment is a snapshot of that single test run. If the same
  // route's axe test ran more than once (retries, sharding) we'd see duplicates;
  // dedupe by route.
  const byRoute = new Map();
  for (const file of files) {
    const match = path.basename(file).match(VIOLATION_FILENAME);
    if (!match) continue;
    const route = slugToRoute(match[1]);
    if (byRoute.has(route)) continue;
    byRoute.set(route, JSON.parse(fs.readFileSync(file, "utf8")));
  }

  let body = "## Axe violations\n\n";
  body += "Surfaced from `routes.spec.ts` axe attachments. To resolve each: ";
  body += "either fix in source or add to `disabledRules` in `routes.spec.ts` ";
  body += "with a one-line reason.\n";

  for (const route of [...byRoute.keys()].sort()) {
    body += `\n### \`${route}\`\n`;
    const violations = byRoute.get(route);
    if (violations.length === 0) {
      body += "_no violations recorded but attachment was emitted (rare)_\n";
      continue;
    }
    for (const v of violations) {
      body += `\n- \`${v.id}\` (${v.impact ?? "unknown impact"}) — ${v.help}\n`;
      const nodes = v.nodes.slice(0, NODE_LIMIT);
      for (const n of nodes) {
        const target = Array.isArray(n.target) ? n.target.join(" ") : n.target;
        body += `  - \`${target}\`\n`;
      }
      if (v.nodes.length > NODE_LIMIT) {
        body += `  - …and ${v.nodes.length - NODE_LIMIT} more node(s)\n`;
      }
    }
  }

  return body;
}

// Returns the comment body for a failed Playwright step, or null when there
// is nothing to report. `outcome` is the step outcome (`steps.<id>.outcome`):
// anything other than "failure" — success, cancelled, skipped, unknown —
// reports nothing, even if files are lying around under `dir`.
function buildComment(dir, { outcome, sha, runUrl } = {}) {
  if (outcome !== "failure") return null;
  const files = findViolationFiles(dir);
  const body = files.length > 0 ? violationsBody(files) : failureWithoutViolations(dir);
  return `${MARKER}\n${body}${footer({ sha, runUrl })}`;
}

function resolvedComment({ sha, runUrl } = {}) {
  return (
    `${MARKER}\n## Playwright e2e passing\n\n` +
    `An earlier run on this PR failed and reported here; the latest run passed.\n` +
    footer({ sha, runUrl })
  );
}

// The oldest bot comment carrying the marker. Human comments that quote the
// marker are ignored.
function findExistingComment(comments = []) {
  return comments.find((c) => c?.user?.type === "Bot" && c.body?.includes(MARKER)) ?? null;
}

// Decides what the workflow does with the PR's comment thread:
//   failure            → create the marked comment, or edit the existing one
//   success + existing → edit it to say the latest run passed
//   anything else      → leave the thread alone
function planComment({ dir, outcome, comments, sha, runUrl } = {}) {
  const existing = findExistingComment(comments);
  const body = buildComment(dir, { outcome, sha, runUrl });
  if (body != null) {
    if (!existing) return { action: "create", body, reason: "e2e failed" };
    if (existing.body === body) return { action: "none", reason: "existing comment is already current" };
    return { action: "update", commentId: existing.id, body, reason: "e2e failed; refreshing existing comment" };
  }
  if (outcome === "success" && existing) {
    const resolved = resolvedComment({ sha, runUrl });
    if (existing.body === resolved) return { action: "none", reason: "existing comment already says passing" };
    return { action: "update", commentId: existing.id, body: resolved, reason: "e2e passed; marking earlier failure resolved" };
  }
  return { action: "none", reason: `e2e outcome ${outcome || "unknown"}; nothing to report` };
}

module.exports = {
  MARKER,
  buildComment,
  findExistingComment,
  findViolationFiles,
  planComment,
  resolvedComment,
  slugToRoute,
};
