/**
 * "In the 2.0 loop" — per-skill facts for the block on /skills/<id>.
 *
 * Only the skills the 2.0 plan of record (docs/releases/2.0-plan.md, §"Per-skill
 * changes") touches get an entry; every other skill page renders no block. Each
 * entry is three short cells. Copy is grounded in the plan row for that skill —
 * do not invent a role for a skill the plan does not name.
 *
 * This is a forward surface: the loop is planned for v2.0 and nothing here has
 * shipped, so the block's eyebrow says so until the release cut.
 */
export interface LoopCell {
  k: string;
  html: string;
}
export interface LoopEntry {
  cells: LoopCell[];
  note: string;
}

export const LOOP_2_0: Record<string, LoopEntry> = {
  "oc-app-architect": {
    cells: [
      { k: "reads", html: "Before Phase 6 builds, the <strong>Generator</strong> reads active advisories, promoted Hindsight lessons and adopted rules as pre-build context." },
      { k: "never reads", html: "The <strong>Evaluator</strong> is never shown any of it. It grades fresh from the frozen contract; recurrence is annotated <em>after</em> the verdict, by a separate pass." },
      { k: "emits", html: "<code>eval-round-M.md</code> becomes a stable, versioned emitter surface — its section headings are frozen so the scorecard and Hindsight can harvest it." },
    ],
    note: "Silent no-op when the scorecard kit or a repo-local Hindsight store is absent. Nothing about this skill's definition differs per repo.",
  },
  "oc-code-auditor": {
    cells: [
      { k: "emits", html: "The full report is written to a committed <code>audits/&lt;date&gt;-&lt;scope&gt;.md</code>, append-only, one file per run — the durable home of every <code>[F-NNN]</code> finding." },
      { k: "keeps", html: "The checkpoint keeps counts, grade and a new <code>report_path</code>; <code>/oc-audit report</code> re-points at the committed file." },
      { k: "unlocks", html: "Principle 5 — <em>don't re-report known issues</em> — becomes executable across sessions, because Hindsight can harvest the committed findings." },
    ],
    note: "Committed security findings are visible in a public repo; the location is repo-policy-overridable.",
  },
  "oc-monitoring-ops": {
    cells: [
      { k: "emits", html: "Postmortem Lessons-Learned blocks are wrapped in namespaced <code>opchain:oc-monitoring-ops:lessons:&lt;incident-id&gt;</code> markers — distinct from the postmortem idempotency marker." },
      { k: "hands off", html: "The postmortem flow hands the marked block to <code>/oc-hindsight harvest</code>. Harvest keys on the markers, never on prose headings." },
      { k: "never", html: "Absent store or disabled skill → silent no-op. Nothing changes about the postmortem itself." },
    ],
    note: "The lessons marker is additive; existing postmortems without it are simply not harvested.",
  },
  "oc-bug-check": {
    cells: [
      { k: "emits", html: "The harvest surface is <strong>verdict + per-check statuses + counts + timestamp</strong>. The repo-local Stop hook may mirror the latest run into the durable ndjson." },
      { k: "never emits", html: "<strong>Never report bodies.</strong> Mirroring a body would re-commit any secret fragment the gate caught, through a side channel." },
      { k: "unchanged", html: "Zero runtime added; the gate verdict stays binary PASS/FAIL plus a warnings count. Principles 1 and 6 hold." },
    ],
    note: "Documents the harvest surface only — the skill itself does not change behaviour in 2.0.",
  },
  "oc-orchestrator": {
    cells: [
      { k: "reads", html: "Scorecard trends, history, staged lessons and proposed rules — <strong>read-only</strong>. The orchestrator never writes any of them." },
      { k: "routes", html: "Eval-trend awareness joins the tiebreaker chain: rank hierarchy → budget → eval trend → pipeline order → cross-project. New routing rows for memory and behaviour-change intents." },
      { k: "shows", html: "<code>/oc-ops status</code> gains an <em>advisory — self-improvement</em> block rendered <strong>below</strong> blockers; NEXT-ACTION may cite an unexpired directive." },
    ],
    note: "Evolve looks backward and governs rules; it never routes. That boundary stays with the orchestrator.",
  },
  "oc-cost-ops": {
    cells: [
      { k: "counts", html: "<code>oc-hindsight</code> harvest/eval and <code>oc-evolve</code> reflect/eval are added as token-count sources, with their own <code>by_phase</code> keys." },
      { k: "reconciles", html: "Evolve's adoption eval reuses the existing oc-prompt-ops per-eval path — no double-count; Σ <code>by_phase</code> must still equal <code>total_usd</code>." },
      { k: "gates", html: "<code>budget-gates.md</code> gains harvest, reflection and evaluation ceilings. Cost-ops emits the verdict; each workflow owns its own deferral." },
    ],
    note: "No new verbs — the loop's spend is visible through the ceilings you already set.",
  },
  "oc-prompt-ops": {
    cells: [
      { k: "reads", html: "<code>eval/rules-manifest.json</code> as an optional fourth eval file, written by oc-evolve; prompt-ops validates referential integrity only." },
      { k: "scopes", html: "<code>/oc-prompt regress</code> gains <code>--cases</code> and <code>--rule</code>. A scoped run is adoption <em>evidence</em> only — the merge gate stays the full suite." },
      { k: "grows", html: "Each recurring harvested FAIL becomes a new goldset case with a stable id, so generalisation is measured on the held-out set, never on the cases a rule came from." },
    ],
    note: "The leakage principle, applied to rules: adoption needs a full-suite regress with zero per-case regressions.",
  },
};
