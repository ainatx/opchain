import type { Walkthrough } from "./types";

/**
 * Scenario 2 — oc-ux-engineer detects a data-heavy surface and routes it to
 * oc-dash-forge. Demonstrates the specialist routing pattern: oc-ux-engineer
 * keeps the style book and the component registry, but hands the dense screen
 * to the density specialist, then grades what comes back through its own
 * Design Evaluator (25%×4, PASS threshold all criteria ≥ 6/10).
 *
 * Every number in this file reconciles: the 8-row OKR sheet the user pastes
 * drives the bar fills, the Layer 0 summary, the mock data, and the sprint.
 * Two real failures: /oc-df-audit fails 2 of 13 checks on run 1, and the
 * Design Evaluator returns ITERATE on round 1.
 */
export const dashboardRescue: Walkthrough = {
  id: "dashboard-rescue",
  title: "Dashboard rescue — dense data, designed right",
  tagline: "Dense data, designed right",
  summary:
    "A 14-chart dashboard nobody reads becomes three layers and a drawer — 3.25/10 to 8.0/10 across two evaluator rounds.",
  description:
    "The analytics screen was a kitchen sink: 14 `<ChartCard>`s in one 1,412-line file, four tabs, nine hex literals, fourteen axe violations. oc-ux-engineer runs its Design Evaluator on the live screen, scores it **3.25/10 — ITERATE**, and offers the data-heavy routing prompt; the user takes it. oc-dash-forge runs Phase 0 intake, pushes back on the mobile-first assumption, picks the **Exec** archetype over Analyst, deviates from the Exec default viz stack to stay on the app's Recharts, and builds a `dash-forge-handoff/` bundle — spec, tokens, types, mock data, working prototype. Its own `/oc-df-audit` **fails 2 of 13 checks** on the first run (the semantic palette is unreadable on white; the state glyphs live only in a tooltip) and passes 13/13 after a palette rebuild that keeps the original hues as the dark-mode set. oc-ux-engineer folds the tokens back into the living component registry and grades the prototype: **round 1 ITERATE** on State Completeness, **round 2 PASS at 8.0/10**. oc-app-architect turns the handoff into one flagged sprint, with Layer 3's two new charts explicitly deferred to Sprint 2.",
  inputs: [
    "Production SaaS · Next.js 14 app router · Recharts · Postgres",
    "`app/dashboard/page.tsx` — 1,412 lines, 14 `<ChartCard>`s, 4 tabs",
    "Screenshot + Figma `Kx9Qm2aLpR7vTn4WcYzB3e/saas-analytics`",
    "Primary users: founders + team leads, Monday check-in, 30% on a phone",
    "The 8-row quarterly OKR sheet + a `/api/metrics?range=12w` sample response",
  ],
  outputs: [
    {
      id: "dashboard-principles",
      label: "Density principles + screen audit",
      kind: "audit.md",
      body:
`# \`/dashboard\` — screen audit

Produced by **oc-ux-engineer** (\`/oc-uxe eval app/dashboard/page.tsx\`) before routing to oc-dash-forge. Sources: the running app at \`localhost:3000/dashboard\`, the repo at \`HEAD\` (\`b7c1e94\`), and the Figma file \`figma.com/file/Kx9Qm2aLpR7vTn4WcYzB3e/saas-analytics\`.

## 1. The one-line summary

The screen tries to answer fourteen questions at once and answers none. This is a density problem, not a taste problem — which is why it routes to oc-dash-forge rather than through the tri-design harness.

## 2. Evidence

\`\`\`
$ wc -l app/dashboard/page.tsx
    1412 app/dashboard/page.tsx

$ grep -c "<ChartCard" app/dashboard/page.tsx
14

$ grep -c "empty=\\|error=" app/dashboard/page.tsx
3

$ grep -rhoE "#[0-9a-f]{6}" app/dashboard components/charts | sort -u | wc -l
       9

$ npx @axe-core/cli http://localhost:3000/dashboard
Running axe-core 4.10.2 in chrome-headless
Testing http://localhost:3000/dashboard ... please wait

  color-contrast      serious     3 nodes    .chart-legend span
  aria-hidden-focus   serious     2 nodes    .tab-panel[aria-hidden="true"] button
  svg-img-alt         critical    9 nodes    .recharts-surface

14 accessibility issues detected.
\`\`\`

One file, 1,412 lines, 14 \`<ChartCard>\` call sites, 9 distinct hex literals, 14 axe violations.

## 3. State coverage — the 14 \`<ChartCard>\` call sites

\`/oc-uxe components audit\` against \`app/dashboard/page.tsx\`. \`Disabled\` is N/A for every chart (none is interactive).

| # | Call site | Loading | Empty | Error |
|---|---|:-:|:-:|:-:|
| 1 | L112 \`mau-count\` | ✅ | ❌ | ❌ |
| 2 | L148 \`mau-trend\` | ✅ | ❌ | ❌ |
| 3 | L191 \`mau-heatmap\` | ✅ | ❌ | ❌ |
| 4 | L236 \`signups-weekly\` | ✅ | ✅ | ✅ |
| 5 | L284 \`signups-by-channel\` | ✅ | ❌ | ❌ |
| 6 | L331 \`churn-donut\` | ✅ | ❌ | ❌ |
| 7 | L377 \`churn-trend\` | ✅ | ❌ | ❌ |
| 8 | L424 \`nps-pie\` | ✅ | ❌ | ❌ |
| 9 | L470 \`nps-trend\` | ✅ | ✅ | ✅ |
| 10 | L518 \`tickets-volume\` | ✅ | ❌ | ❌ |
| 11 | L566 \`tickets-ttr\` | ✅ | ❌ | ❌ |
| 12 | L613 \`activation-funnel\` | ✅ | ❌ | ❌ |
| 13 | L661 \`retention-curve\` | ✅ | ✅ | ✅ |
| 14 | L708 \`system-status\` | ✅ | ❌ | ❌ |

**11 of 14 handle neither empty nor error.** A Postgres timeout on the rollup renders eleven axis frames with nothing in them and no message.

## 4. Design Evaluator — baseline

\`design/sprints/sprint-1/eval-round-0.md\` (baseline round, scored against the live screen, not a design).

- **Visual Hierarchy: 2/10** — squint test fails outright. Fourteen cards on one 12-col grid at equal weight, no primary KPI, no above-the-fold answer.
- **State Completeness: 3/10** — 11 of 14 ChartCards have no empty and no error state (table above). Loading is the only state anyone implemented.
- **Consistency: 4/10** — 9 distinct hex literals, 3 numeric formats on one screen (\`12,304\` / \`12.3K\` / \`12,304.00\`), chart titles and axis labels both 14px.
- **Accessibility: 4/10** — 14 axe violations; 3 legend labels below 4.5:1; 9 Recharts surfaces with no accessible name.
- **Weighted Score: 3.25/10**

**Verdict: ITERATE (baseline).** Every criterion is below the 6/10 threshold.

## 5. What's wrong — the offenders behind the scores

**Hierarchy**

1. Fourteen charts, all equal visual weight. Nothing cues where to start.
2. No primary KPI — every chart competes for the same first glance.
3. No small multiples. Every trend comparison is its own full-width chart, so two trends are never spatially adjacent or scale-aligned.

**Encoding**

4. MAU is encoded three ways (count, trend, heatmap). Pick one.
5. Comparable y-axes don't share a scale; the reader renormalises on every glance.
6. Five chart types (line, bar, pie, donut, heatmap) where two would do.

**Typography**

7. Chart titles and axis labels are both 14px — no hierarchy between "what this chart is" and "what this number is".
8. Mixed numeric formatting: \`12,304\`, \`12.3K\`, \`12,304.00\` on one screen.
9. Per-series inline labels instead of one legend block.

**Color**

10. Nine hues across fourteen charts. Red means "good" on \`tickets-ttr\` (low is good) and "bad" on \`churn-trend\`.
11. Color carries decoration, not meaning — no token maps to a state.

**Accessibility**

12. Three legend labels sit at 3.1–3.9:1 against the card surface. \`churn-donut\` and \`nps-pie\` differentiate slices by hue only — no glyph, no label.

## 6. Principles handed to oc-dash-forge as the brief

| # | Principle | Operational test |
|---|---|---|
| P1 | One question, one answer, top-of-fold. | A team lead answers the OKR question in < 2s, no scroll, at 1280. |
| P2 | Small multiples over big singles for comparison. | If two metrics are comparable, they share a column width and a y-normalisation. |
| P3 | Remove every pixel that isn't data. | No 3D, no gradient fills, no chart shadows, no gridline heavier than 1px at 8% opacity. |
| P4 | Color = meaning. | Three state hues max, one semantic each. A glyph carries the same signal redundantly. |
| P5 | Consistent baselines. | Comparable charts share a y-scale, declared in the spec. |
| P6 | Desktop-primary, phone-survivable. | Layer 0 + Layer 1 fit above the fold at 390×844; nothing horizontally scrolls. |
| P7 | Numeric format consistency. | One format per metric class (count, percentage, duration, currency), enforced by a component prop. |
| P8 | WCAG 2.2 AA on every chart. | Text ≥ 4.5:1, graphical objects ≥ 3:1, verified with a measured ratio not an eyeball. |
| P9 | Screen-reader-first reading order. | DOM order matches visual order; every chart has a \`<title>\`/\`<desc>\` or an adjacent data table. |

P6 is a deliberate reversal of the brief's "mobile 30%". 30% is a *second* context, not the primary one — see the intake exchange with oc-dash-forge.

## 7. What to keep

- **The data pipeline.** \`/api/metrics?range=12w\` already returns \`{ id, target, current, baseline, series[] }\` per OKR. No backend change.
- **The font stack.** The system stack is fine — under-leveraged, not wrong.
- **The Mon-first calendar week.** The rollup job stamps Monday; don't change that without a separate decision.

## 8. What to delete

- \`churn-donut\` and \`nps-pie\`. Both reduce to a bar or a number.
- \`system-status\` — already in the global nav.
- The 4-tab structure. One canvas, no tabs. (\`?tab=funnel\` still has to resolve — a Looker embed points at it.)

## 9. What success looks like

- Design Evaluator: all four criteria ≥ 6/10, weighted ≥ 8.0 (baseline 3.25).
- Lighthouse mobile accessibility ≥ 95 (current: 73).
- axe-core violations: 0 (current: 14).
- Layer 0 + Layer 1 answer "which OKRs are off track?" above the fold at 390×844.

## 10. Handoff

Routing to **oc-dash-forge** with the primary question, the principle table, the OKR sheet, and the current tokens. oc-ux-engineer keeps the component registry and grades what comes back; it does not design the screen.`,
    },
    {
      id: "dashboard-layers",
      label: "`dash-forge-handoff/spec.md` — archetype, layers, tokens, tile inventory",
      kind: "spec.md",
      body:
`# Dashboard — three layers and a drawer

\`dash-forge-handoff/spec.md\` · produced by **oc-dash-forge** \`/oc-df-layout\` · checkpoint \`.checkpoints/oc-dash-forge.checkpoint.json\`

## 0. Archetype

\`\`\`
ARCHETYPE: Exec

WHY THIS, NOT THE ALTERNATIVES
- Users are founders + team leads with reallocation authority; the decision
  is "move people mid-quarter or kill an initiative" (intake Q1, Q2).
- Viewing context is a Monday standup read on a laptop, once a week —
  not a wall display, not a mouse-driven exploration (intake Q3).
- Eight OKRs with declared targets is a bounded, pre-aggregated set. There
  is nothing to slice.
- Runner-up: Analyst — lost because team leads decide weekly against a
  fixed target set, they don't explore. Analyst would buy filter chrome
  and a pivot surface nobody would open.

DENSITY TARGET
- Low — 17 tiles, KPI 32px, body 16px, one drill path.

VIZ STACK
- Recharts — deviating from the Exec default (Tremor) because the app
  already ships Recharts 2.12 and the user ruled out a second chart
  dependency. Cost: the KPI/progress primitives Tremor gives for free are
  hand-built here (OkrBar, SmallMultiple, ~135 LoC).

INTERACTION MODEL
- Passive display + one drill (OKR row → drawer). No filters, no date picker.
\`\`\`

## 1. Why three layers and a drawer

Dense dashboards fail because they pack fourteen questions onto one canvas. Sparse dashboards fail because they hide everything behind a click. Four reading depths, three of them always rendered:

| Layer | Question | Answered in | Rendering |
|---|---|---|---|
| 0 | "Did anything change this week?" | < 1 s | always |
| 1 | "Which OKRs are on or off track?" | < 5 s | always |
| 2 | "What's the supporting context?" | < 15 s | always |
| 3 | "What's the trend on *this* OKR?" | on demand | **drawer (on demand)** |

## 2. Layer 0 — weekly summary (above the fold, 3 lines)

Plain text, no chart. Three bullets written by the existing \`metrics_weekly_rollup\` job (nightly 02:00 UTC).

> **This week · Mon 12 Oct 2026 · week 11 of 13**
> Weekly signups up **+18%** WoW to **710** — leading OKR #2, on track (**+21%** vs pace).
> Retention day-7 flat at **42.1%** — lagging OKR #1, off track (**−6.0%** vs pace).
> Support tickets down **−12%** to **3.2 / 100 MAU** — leading OKR #5, on track.

### 2.1 Why text, not a chart

A chart on top reduces to "now interpret the chart". A text summary reduces to "now decide whether to read more". No new infrastructure — the rollup already writes these three fields.

### 2.2 Constraints

- Exactly three bullets. Four bullets is a small chart in disguise.
- Each bullet: metric → delta → OKR reference → status.
- Inline numbers in \`JetBrains Mono\` so they align vertically down the block.
- Target reading time < 8 s.
- If \`weeklySummary()\` returns null, the block renders "Summary unavailable — the nightly rollup has not run since <timestamp>" and Layer 1 still renders. It never renders nothing.

## 3. Layer 1 — OKR rows (the hero)

One horizontal bar per OKR. Track is 24 cells; the target tick sits at cell 16 (\`current / target = 1.0\`); fill clamps at 1.5× target.

\`\`\`
 #  ind st  OKR                       0 ────────────── target ── 1.5×   current   target   vs pace
 1  ⊢  ✕   Retention day-7           ███████████████░│░░░░░░░░         42.1%      45%      −6.0%
 2  ↗  ✓   Weekly signups            ████████████████│███░░░░░           710       600     +21%
 3  ↗  ~   NPS                       ██████████████░░│░░░░░░░░            36        40      −4.5%
 4  ⊢  ✕   Support time-to-resolve   ████████████████│██░░░░░░          4.6h       ≤4h      +7.6% †
 5  ↗  ✓   Tickets / 100 MAU         █████████████░░░│░░░░░░░░           3.2        ≤4      −24%  †
 6  ⊢  ~   ARR retention             ████████████████│░░░░░░░░           91%       92%      −0.5%
 7  ↗  ✓   Activation (signup→act)   ████████████████│██░░░░░░           62%       55%     +16%
 8  ⊢  ✓   Engineering velocity      ████████████████│██████░░           4.1       3.0     +41%
                                                     ▲ target tick
 † lower-is-better — crossing the tick is bad, not good.
\`\`\`

### 3.1 Glyph legend (no new color)

| Glyph | Meaning |
|---|---|
| \`↗\` | leading indicator — predictive of future state |
| \`⊢\` | lagging indicator — records past state |
| \`✓\` | on track — at or past the pace line |
| \`~\` | watch — behind the pace line by ≤ 5% |
| \`✕\` | off track — behind the pace line by > 5% |

The \`✓ ~ ✕\` glyph is rendered **inline in the row**, not in the tooltip. That is the fix for \`/oc-df-audit\` check 6 — see \`audit-report.md\`. The \`↗ ⊢\` glyph carries a tooltip; neither glyph carries chromatic weight.

### 3.2 Pace line

\`\`\`
pace(t) = baseline + (target − baseline) × (weeks_elapsed / 13)
\`\`\`

FY27 Q1 runs Mon 3 Aug → Sun 1 Nov 2026. On Mon 12 Oct, \`weeks_elapsed = 10\`, so \`pace = baseline + (target − baseline) × 0.769\`. Tolerance from intake: **within 5% of the pace line is "trending"**.

| # | id | baseline (3 Aug) | target | current | pace @ wk 11 | vs pace | state |
|---|---|---:|---:|---:|---:|---:|:-:|
| 1 | \`retention_d7\` | 44.0 | 45 | 42.1 | 44.77 | −6.0% | ✕ |
| 2 | \`weekly_signups\` | 540 | 600 | 710 | 586.2 | +21% | ✓ |
| 3 | \`nps\` | 30 | 40 | 36 | 37.69 | −4.5% | ~ |
| 4 | \`ttr_hours\` † | 5.2 | 4.0 | 4.6 | 4.28 | +7.6% | ✕ |
| 5 | \`tickets_per_100mau\` † | 4.9 | 4.0 | 3.2 | 4.21 | −24% | ✓ |
| 6 | \`arr_retention\` | 89.5 | 92 | 91 | 91.42 | −0.5% | ~ |
| 7 | \`activation_rate\` | 48 | 55 | 62 | 53.38 | +16% | ✓ |
| 8 | \`eng_velocity\` | 2.6 | 3.0 | 4.1 | 2.91 | +41% | ✓ |

Four on track, two watch, two off track.

### 3.3 Bar mechanics

- Width = \`current / target\`, rendered against a 24-cell track where cell 16 is \`1.0\`. Clamped at 1.5× so \`eng_velocity\` at 1.37× doesn't blow out the row.
- The target tick renders at cell 16 always, even when the fill is short.
- For lower-is-better OKRs (**OKR 4**, **OKR 5**) the *semantics* invert, not the geometry: the bar is still \`current / target\`, but crossing the tick sets \`--off\` instead of \`--ok\`. A footnote and a row tooltip say so. Inverting the geometry was tried and rejected — two bars reading in opposite directions in the same column is worse than one footnote.

### 3.4 Tokens — \`dash-forge-handoff/tokens.ts\`

\`\`\`ts
// Emitted by /oc-df-layout. oc-ux-engineer reads this into
// design/component-registry.json so the living library stays consistent.
export const tokens = {
  color: {
    chrome: { bg: "#ffffff", surface: "#f6f7f9", rule: "#e3e6ea" },
    text:   { primary: "#11151a", secondary: "#4b5563" },
    state:  { success: "#1f6b43", warning: "#7a5c12", danger: "#b4512a" },
    series: ["#1f6b43", "#7a5c12", "#b4512a", "#2b5c8a"],
  },
  density: {
    archetype: "exec",
    kpiFontSize: 32,
    bodyFontSize: 16,
    tilePaddingPx: 16,
    gutterPx: 16,
  },
  type: {
    display:  { size: 32, weight: 600 },   // Layer 0 headline number
    headline: { size: 20, weight: 600 },   // OKR label
    body:     { size: 16, weight: 400 },
    caption:  { size: 13, weight: 400 },   // vs-pace, deltas, axis
  },
  chart: {
    gridlineColor: "#e3e6ea",
    axisLabelColor: "#4b5563",
    tooltipStyle: { border: "1px solid #e3e6ea", borderRadius: 4, padding: 12 },
  },
  dark: {
    chrome: { bg: "#0f1115", surface: "#161a20", rule: "#262c35" },
    text:   { primary: "#e7eaee", secondary: "#9aa4b2" },
    // The original Leaf / Sand / Clay hues, which fail on white and clear
    // 4.40:1 / 8.02:1 / 5.51:1 on #0f1115. See audit-report.md run 1.
    state:  { success: "#2f8a57", warning: "#c3a64f", danger: "#d96b3a" },
  },
} as const;
\`\`\`

Four type sizes (32/20/16/13) against the ≤ 5 ramp rule. Every spacing value (16, 16, 12, 4) is on the 4/8/12/16/24/32/48/64 scale.

## 4. Layer 2 — context strip

2×4 grid of small multiples. Each cell: 11-bin sparkline + last value + WoW delta. Cells share width and are y-normalised to their own max — shape comparison only; exact values are numeric.

\`\`\`
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Signups      │ │ Active users │ │ Retention d7 │ │ NPS          │
│ ▁▂▃▄▅▆█▆▅▆▇  │ │ ▆▆▆▇▇▆▇▇▆▆▇  │ │ ▇▇▆▆▆▅▅▅▅▄▄  │ │ ▄▄▅▅▆▆▅▆▆▆▆  │
│  710  +18%   │ │  4.4K  +2%   │ │ 42.1%  −0.4  │ │  36   +1pt   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Tickets      │ │ Time-to-resp │ │ Activation   │ │ ARR retention│
│ ▆▅▄▄▃▃▂▂▂▁▁  │ │ ▅▅▅▆▆▇▇▆▆▆▅  │ │ ▃▄▄▅▅▅▆▆▇▇▇  │ │ ▆▆▇▇▇▆▆▆▅▅▅  │
│  142  −12%   │ │  4.6h  +6%   │ │  62%  +3pt   │ │  91%  −0.2   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
\`\`\`

\`142 tickets / (4,400 MAU / 100) = 3.2\` — Layer 2 shows the raw count, OKR 5 shows the normalised rate. Both are correct; the spec says so out loud because the first prototype had them disagreeing.

### 4.1 Cell anatomy

- 11 bins. \`/api/metrics?range=12w\` returns 12 rows; the current partial week is dropped, leaving 11 complete weeks.
- Last value, prominent (20px). WoW delta with sign, in caption size.
- No axis labels. The number on the left is the latest; the sparkline is shape only.

## 5. Layer 3 — drawer (on demand)

Clicking an OKR row opens a right-hand drawer with **three charts max**:

1. **Historical trend vs plan** — the OKR's own value over 26 weeks with the pace line overlaid. *(Sprint 1 — reuses \`HistoricalTrendChart\`.)*
2. **Contributing subcomponents** — stacked area by acquisition channel. *(Sprint 2 — needs \`StackedAreaChart\`, not in Sprint 1.)*
3. **Cohort view** — one mini-chart per signup-week cohort. *(Sprint 2 — needs \`CohortMatrix\`.)*

No tabs, no nesting. A fourth chart means the OKR is really two OKRs.

### 5.1 Drawer mechanics

- Slides in from the right ≥ 768; full-screen sheet below.
- Esc closes; clicking the row again toggles; overlay click closes and restores focus to the row.
- Honours \`prefers-reduced-motion\` — no slide, just appears.
- Shareable URL \`/dashboard?okr=retention_d7\`; invalid ids fall back to closed.

## 6. Grid

| Breakpoint | Columns | Gutter | Tile padding | Layer 1 | Layer 2 |
|---|---:|---:|---:|---|---|
| ≥ 1280 | 12 | 16 | 16 | 6×1 tiles, 2 per row, 4 rows | 3×1 tiles, 4 per row, 2 rows |
| 768–1279 | 8 | 16 | 16 | 8×1 tiles, 1 per row | 4×1 tiles, 2 per row |
| ≤ 390 | 4 | 16 | 16 | 4×1 tiles, 1 per row | 2×1 tiles, 2 per row |

At 390×844 the fold lands after OKR 5. Layer 0 (88px) + four OKR rows (4 × 56px) + the fifth partially visible — which is the P6 test: the two off-track OKRs (#1, #4) are both above the fold because rows sort off-track first.

## 7. Tile inventory

17 tiles + one drawer overlay.

| id | component | @1280 | @390 | data field | layer | drill |
|---|---|---|---|---|---:|---|
| \`week-summary\` | \`WeekSummary\` | 12×1 | 4×1 | \`summary.bullets[]\` | 0 | none |
| \`okr-1\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[retention_d7]\` | 1 | drawer |
| \`okr-2\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[weekly_signups]\` | 1 | drawer |
| \`okr-3\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[nps]\` | 1 | drawer |
| \`okr-4\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[ttr_hours]\` | 1 | drawer |
| \`okr-5\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[tickets_per_100mau]\` | 1 | drawer |
| \`okr-6\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[arr_retention]\` | 1 | drawer |
| \`okr-7\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[activation_rate]\` | 1 | drawer |
| \`okr-8\` | \`OkrRow\` | 6×1 | 4×1 | \`okrs[eng_velocity]\` | 1 | drawer |
| \`sm-signups\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[signups]\` | 2 | none |
| \`sm-active\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[active_users]\` | 2 | none |
| \`sm-retention\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[retention_d7]\` | 2 | none |
| \`sm-nps\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[nps]\` | 2 | none |
| \`sm-tickets\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[tickets]\` | 2 | none |
| \`sm-ttr\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[ttr_hours]\` | 2 | none |
| \`sm-activation\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[activation_rate]\` | 2 | none |
| \`sm-arr\` | \`SmallMultiple\` | 3×1 | 2×1 | \`metrics[arr_retention]\` | 2 | none |
| \`okr-drawer\` | \`OkrDrawer\` | overlay 8×6 | full sheet | \`okrs[id].series\` + \`plan\` | 3 | none |

Component parents: \`OkrBar\` is a subcomponent of \`OkrRow\`; \`HistoricalTrendChart\` is lazy-loaded inside \`OkrDrawer\`.

## 8. Chart selection per tile

From \`references/chart-selection.md\` — data shape decides, not preference.

| Tiles | Data shape | Chart | Why |
|---|---|---|---|
| \`okr-1\`…\`okr-8\` | one value against one target | horizontal bar + target tick | Cleveland: position along a common scale is the most accurately decoded encoding. A gauge or donut forces angle comparison and loses the target line. |
| \`sm-*\` | 11 ordered values, shape only | bar sparkline | ≤ 30 points, no axis needed; the exact value is shown numerically beside it, so the chart carries only direction. |
| drawer 1 | 2 continuous series over 26 weeks | line + dashed reference line | shared y-scale, one actual and one plan — the reference-line pattern, not a second axis. |
| drawer 2 | 4 channels over 26 weeks | stacked area | part-to-whole over time with ≤ 7 series. |
| drawer 3 | 8 cohorts × 8 weeks | small-multiple grid | a 64-cell heatmap is decoded by nobody; eight 8-point lines are. |

Anti-patterns explicitly rejected: donut for churn composition, dual-axis for signups-vs-activation, pie for NPS bands.

## 9. Performance budget

- Layer 0–2 shell (HTML + CSS + JS, no drawer): **≤ 28 KB gzipped**. Prototype measures 24.6 KB.
- Drawer chunk: lazy, 11.8 KB gzipped, fetched on first open.
- LCP ≤ 1.5 s on a throttled 4G profile.
- Layers 0 and 1 render server-side and are readable before hydration; only the drawer needs JS.

## 10. Accessibility

- Interactive targets ≥ 44×44 at ≤ 768.
- Text ≥ 4.5:1, graphical objects ≥ 3:1, both measured — see \`audit-report.md\`.
- Every sparkline carries a visually-hidden \`<table>\` of its 11 values ("weeks ending 27 Jul … 11 Oct: 41, 38, 42, …").
- \`OkrBar\` renders \`<title>\`/\`<desc>\` on the SVG: "Retention day-7, 42.1 percent against a 45 percent target, off track".
- Drawer traps focus on open, restores to the originating row on close (Esc, overlay click, or toggle).
- Source order Layer 0 → 1 → 2 matches visual order at every breakpoint.

## 11. Telemetry

| Event | Payload |
|---|---|
| \`dashboard.viewed\` | \`{ flag_variant, viewport_bucket }\` |
| \`okr_row.expanded\` | \`{ okr_id, source: "click" \\| "keyboard" }\` |
| \`drawer.chart_viewed\` | \`{ okr_id, chart_type }\` |
| \`small_multiple.hovered\` | \`{ metric_id }\` |

Aggregated weekly into the existing \`metrics_*\` rollup tables, so we can see which OKRs anyone actually drills into and delete the ones nobody does.`,
    },
    {
      id: "dashboard-audit",
      label: "/oc-df-audit — run 1 FAIL, run 2 PASS",
      kind: "audit-report.md",
      body:
`# \`/oc-df-audit\` — \`dash-forge-handoff/audit-report.md\`

Runs automatically before \`/oc-df-prototype\` completion. Critical failures block the handoff.

## Run 1 — 11 PASS / 2 FAIL · 2026-10-12 11:02 UTC

| # | Check | Verdict | Evidence |
|---|---|:-:|---|
| 1 | Archetype defense | PASS | Exec, tied to intake Q1 (founders + leads, reallocation authority) and Q3 (Monday laptop read). Runner-up Analyst named with reason. |
| 2 | Primary question | PASS | "Is my team on track to hit this quarter's OKRs?" — \`spec.md\` §0. |
| 3 | Density fits archetype | PASS | 17 tiles (exec range 8–20), \`kpiFontSize\` 32, \`bodyFontSize\` 16. |
| 4 | Color semantics | PASS | 3 state + 3 chrome + 2 text + 4 series, every token named by role. |
| 5 | Chart fit | PASS | bar-vs-target ×8, sparkline ×8, line+reference ×1. No donut, no dual-axis, no pie. |
| 6 | **Colorblind safe** | **FAIL** | \`✓ ~ ✕\` render only inside the row tooltip. On the canvas the three states differ by **hue alone**. Under a deuteranopia transform \`--ok #2f8a57\` → \`#7d7d4e\` and \`--off #d96b3a\` → \`#b08046\`: the two are 12.4 ΔE apart, below the 20 ΔE floor in \`design-principles.md\`. |
| 7 | ≤ 7 series per chart | PASS | Max 4 (drawer composition, deferred to Sprint 2). |
| 8 | Drill paths declared | PASS | 8 \`OkrRow\` → drawer; 9 other tiles → \`none\`, declared in the tile inventory. |
| 9 | Mock data realism | PASS | (1) named metrics, no "Metric A"; (2) ranges taken from the pasted \`/api/metrics\` response; (3) non-uniform — a week-6 signup outlier (+41%) and a week-9 gap where the rollup missed; (4) 11 rows ≥ the 8-point sparkline minimum in \`react-patterns.md\`. |
| 10 | Type ramp | PASS | 4 sizes: 32 / 20 / 16 / 13. |
| 11 | Spacing on scale | PASS | \`tokens.ts\`: gutter 16, tile padding 16, tooltip 12, glyph gap 4. |
| 12 | **Contrast** | **FAIL** | Measured against \`chrome.bg #ffffff\`:<br>\`--watch #c3a64f\` → **2.36:1** — fails the 3:1 graphical-object rule for the bar fill *and* the 4.5:1 text rule for the glyph.<br>\`--ok #2f8a57\` → **4.29:1** — clears 3:1 for the fill, fails 4.5:1 for the glyph.<br>\`--off #d96b3a\` → **3.43:1** — same.<br>Net: 2 of 3 hues clear the fill rule, **0 of 3** clear the glyph rule. |
| 13 | Screen reader | PASS | Every sparkline has a visually-hidden \`<table>\` of 11 values; every \`OkrBar\` SVG has \`<title>\` + \`<desc>\`. |

**Blocked.** Two critical failures. \`/oc-df-prototype\` does not complete.

### Remediation

The three hues were chosen for a dark canvas and then used on a white one. Rather than desaturate them into mud, split the palette:

| Token | Light (on \`#ffffff\`) | ratio | Dark (on \`#0f1115\`) | ratio |
|---|---|---:|---|---:|
| \`--ok\` | \`#1f6b43\` | **6.48:1** | \`#2f8a57\` | 4.40:1 |
| \`--watch\` | \`#7a5c12\` | **6.24:1** | \`#c3a64f\` | 8.02:1 |
| \`--off\` | \`#b4512a\` | **5.06:1** | \`#d96b3a\` | 5.51:1 |

The original Leaf / Sand / Clay survive as \`tokens.dark.state\` — they were never wrong, they were on the wrong background.

The \`✓ ~ ✕\` glyph moves out of the tooltip and into the row, 4px left of the OKR label, at caption size in \`text.primary\`. State now reads without color at all.

## Run 2 — 13 PASS / 0 FAIL · 2026-10-12 11:19 UTC

| # | Check | Verdict | Evidence |
|---|---|:-:|---|
| 1 | Archetype defense | PASS | unchanged |
| 2 | Primary question | PASS | unchanged |
| 3 | Density fits archetype | PASS | unchanged |
| 4 | Color semantics | PASS | light + dark state sets, both named by role |
| 5 | Chart fit | PASS | unchanged |
| 6 | Colorblind safe | **PASS** | \`✓ ~ ✕\` inline in every row; grayscale render of the prototype still communicates all three states. Deuteranopia sim re-run: state is legible with color fully removed. |
| 7 | ≤ 7 series per chart | PASS | unchanged |
| 8 | Drill paths declared | PASS | unchanged |
| 9 | Mock data realism | PASS | unchanged |
| 10 | Type ramp | PASS | unchanged |
| 11 | Spacing on scale | PASS | \`tokens.ts\` values only — this check reads the token file, not inline styles in \`prototype.tsx\` (see the note below) |
| 12 | Contrast | **PASS** | 6.48 / 6.24 / 5.06 on \`#ffffff\`; 4.40 / 8.02 / 5.51 on \`#0f1115\`. All ≥ 4.5:1 for glyph text, all ≥ 3:1 for bar fills, both themes. |
| 13 | Screen reader | PASS | unchanged |

**13/13 PASS.** \`/oc-df-prototype\` completes; handoff bundle written.

> **Known scope limit of check 11.** \`Spacing on scale\` enumerates \`tokens.ts\`. It does not walk inline style objects in \`prototype.tsx\`. oc-ux-engineer's Token Police caught one value it missed — \`drawerPanel: { padding: 14 }\` — in eval round 1. Filed as a \`/oc-df-audit\` improvement, not a blocker here.`,
    },
    {
      id: "dashboard-prototype",
      label: "`dash-forge-handoff/` — README + types + mock data",
      kind: "prototype",
      body:
`# \`dash-forge-handoff/README.md\`

**Archetype:** Exec · **Viz stack:** Recharts 2.12 (app's existing dependency) · **Run:** \`npm i && npm run dev\` → \`http://localhost:5173\`

## What's rendered

| Layer | Tiles | Component |
|---|---|---|
| 0 | 1 weekly summary | \`WeekSummary\` |
| 1 | 8 OKR rows | \`OkrRow\` → \`OkrBar\` |
| 2 | 8 small multiples | \`SmallMultiple\` |
| 3 | 1 drawer | \`OkrDrawer\` → \`HistoricalTrendChart\` |

17 tiles plus the drawer overlay. Breakpoints wired at 390 / 768 / 1280.

## Interactivity

- Click or Enter/Space on any OKR row → drawer opens, focus moves in.
- Esc, overlay click, or re-clicking the row → drawer closes, focus returns to the row.
- Theme toggle (top right) swaps \`tokens\` ↔ \`tokens.dark\` so the palette can be checked on both canvases.
- Everything else is passive. No filters, no date picker — that's the archetype.

## What's mocked

- \`mock-data.ts\` only. No network, no auth, no \`/api/metrics\` call.
- The 8 OKR objects carry the **real** targets and baselines pasted in intake; only the weekly series are generated.
- \`HistoricalTrendChart\` renders 26 generated weeks. The two Sprint-2 drawer charts (\`StackedAreaChart\`, \`CohortMatrix\`) are **not** in this bundle — the drawer opens with the trend chart only.

## \`types.ts\`

\`\`\`ts
export type OkrKind = "leading" | "lagging";
export type OkrState = "ok" | "watch" | "off";

export interface OkrSnapshot {
  id: string;                 // "retention_d7"
  label: string;              // "Retention day-7"
  kind: OkrKind;              // ↗ leading | ⊢ lagging
  unit: "percent" | "count" | "hours" | "rate";
  target: number;
  baseline: number;           // value at the start of the quarter
  current: number;
  lowerIsBetter: boolean;     // OKR 4 and OKR 5
  series: number[];           // 11 complete weeks, oldest first
}

export interface MetricSnapshot {
  id: string;
  label: string;
  unit: OkrSnapshot["unit"];
  current: number;
  deltaWoW: number;           // signed; percent for rates, points for scores
  series: number[];           // 11 bins
}

export interface Bullet {
  metric: string;
  delta: string;              // "+18%"
  okrRef: number;             // 2
  state: OkrState;
}
\`\`\`

## \`mock-data.ts\` (excerpt)

\`\`\`ts
import type { OkrSnapshot } from "./types";

/** Weeks ending Sun 26 Jul … Sun 11 Oct 2026 — 11 complete weeks. */
export const WEEKS_ENDING = [
  "2026-07-26", "2026-08-02", "2026-08-09", "2026-08-16", "2026-08-23",
  "2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20", "2026-09-27",
  "2026-10-11",
] as const; // note: 2026-10-04 is the rollup gap, see below

export const OKRS: OkrSnapshot[] = [
  { id: "retention_d7", label: "Retention day-7", kind: "lagging",
    unit: "percent", target: 45, baseline: 44.0, current: 42.1,
    lowerIsBetter: false,
    series: [44.0, 43.8, 43.9, 43.4, 43.1, 42.9, 42.6, 42.4, 42.3, 42.2, 42.1] },

  { id: "weekly_signups", label: "Weekly signups", kind: "leading",
    unit: "count", target: 600, baseline: 540, current: 710,
    lowerIsBetter: false,
    //                                    ↓ week 6: Product Hunt launch, +41%
    series: [540, 551, 573, 566, 588, 829, 612, 640, 655, 602, 710] },

  { id: "ttr_hours", label: "Support time-to-resolve", kind: "lagging",
    unit: "hours", target: 4.0, baseline: 5.2, current: 4.6,
    lowerIsBetter: true,
    series: [5.2, 5.0, 4.7, 4.4, 4.2, 4.1, 4.3, 4.4, 4.5, 4.5, 4.6] },
  // … 5 more: nps, tickets_per_100mau, arr_retention,
  //           activation_rate, eng_velocity
];

/**
 * Realism generator — /oc-df-audit check 9.
 * noise: per-week jitter as a fraction of base.
 * outlierAt / outlierMul: one deliberate spike (Product Hunt, an incident).
 * gapAt: one null week where metrics_weekly_rollup failed to run.
 */
export function generateWeekly(
  n: number, base: number, trend: number,
  opts: { noise?: number; outlierAt?: number; outlierMul?: number; gapAt?: number } = {},
): (number | null)[] { /* … */ }
\`\`\`

The week ending **2026-10-04** is deliberately absent: \`metrics_weekly_rollup\` failed that night. The prototype renders the gap as a missing bin rather than interpolating, because production will hit the same case and \`WeekSummary\` has to survive it.

## Bundle

\`\`\`
$ wc -l dash-forge-handoff/*
     112 dash-forge-handoff/README.md
      96 dash-forge-handoff/audit-report.md
      94 dash-forge-handoff/integration-notes.md
     148 dash-forge-handoff/mock-data.ts
     312 dash-forge-handoff/prototype.tsx
     486 dash-forge-handoff/spec.md
      58 dash-forge-handoff/tokens.ts
      41 dash-forge-handoff/types.ts
    1347 total

$ npm run build && gzip -c dist/assets/index-*.js | wc -c
   25190
$ gzip -c dist/assets/drawer-*.js | wc -c
   12083
\`\`\`

24.6 KB gzipped shell, 11.8 KB lazy drawer chunk — inside the 28 KB budget in \`spec.md\` §9.

Hand this to \`/oc-app-architect\` Phase 6.`,
    },
    {
      id: "dashboard-grade",
      label: "Design Evaluator — round 1 ITERATE, round 2 PASS",
      kind: "eval-round.md",
      body:
`# \`design/sprints/sprint-1/eval-round-1.md\`

## Design Sprint 1 — Evaluation Round 1

Target: \`dash-forge-handoff/prototype.tsx\` (312 lines), rendered at 390 / 768 / 1280 against \`design/style-book.html\`.

### Scores

- **Visual Hierarchy: 8/10** — the squint test passes: at full blur the eye lands on the Layer 0 block and then the two \`--off\` bars. Held below 9 because \`SmallMultiple\` last-values (20px) and \`OkrRow\` labels (20px) read at the same weight, so Layer 2 competes with Layer 1 on a second pass.
- **State Completeness: 5/10** — three data-driven components render nothing on a non-happy path. Details below. This is the fail.
- **Consistency: 8/10** — tokens are used almost everywhere; one hardcoded spacing value. Number formatting is enforced by a \`format\` prop on every numeric, which is the fix for the old screen's three formats.
- **Accessibility: 8/10** — 0 axe violations, contrast measured and passing in both themes, keyboard path complete. Two real gaps below.
- **Weighted Score: 7.25/10**

### Issues

1. **\`WeekSummary\` renders nothing when there is no summary** — \`dash-forge-handoff/prototype.tsx:48\` returns \`null\` when \`weeklySummary()\` is null. \`metrics_weekly_rollup\` has already missed one night in the mock series (week ending 2026-10-04). On that Monday the screen opens with an 88px hole above Layer 1 and no explanation. Fix: render the "Summary unavailable — last rollup <timestamp>" row that \`spec.md\` §2.2 already specifies.
2. **\`SmallMultiple\` has no loading state** — \`prototype.tsx:112\` maps straight off \`props.metric.series\`. With a slow \`/api/metrics\` the user gets eight empty 3×1 boxes with captions and no bars, which reads as "all eight metrics are zero". Fix: a skeleton with 11 grey bins at 40% opacity, \`aria-busy="true"\`.
3. **\`OkrDrawer\` has no error state for a failed chunk** — \`prototype.tsx:214\` wraps \`HistoricalTrendChart\` in \`React.lazy\` with no error boundary. A chunk 404 after a deploy (stale HTML, new asset hashes) blanks the drawer with the focus trap still active — the user is stuck in an empty panel until Esc. Fix: error boundary rendering "Couldn't load the trend chart. Reload." with the close button still reachable.
4. **Drawer close button is 32×32** — \`prototype.tsx:241\`. Below the 44×44 floor in \`spec.md\` §10 at ≤ 768, where the drawer is a full-screen sheet and the close button is the only exit.
5. **Overlay click does not restore focus** — Esc restores focus to the originating \`OkrRow\`; clicking the overlay closes the drawer and drops focus to \`<body>\`. Two exits, two behaviours.

### Token Compliance

- **Colors: 6/6** from palette — 3 state + 3 chrome, both themes, no literals in \`prototype.tsx\`.
- **Spacing: 11/12** from scale — \`prototype.tsx:73\`, \`drawerPanel: { padding: 14 }\`. Should be \`tokens.density.tilePaddingPx\` (16). 14 is not on the 4/8/12/16/24/32/48/64 scale. \`/oc-df-audit\` check 11 missed it because that check reads \`tokens.ts\`, not inline style objects.
- **Typography: 4/4** from type scale — 32 / 20 / 16 / 13, no one-offs.

### Gaps vs Contract

1. P1 one question top-of-fold — **PASS** — at 1280 and 390 the primary question is answered above the fold; off-track rows sort first.
2. P4 color = meaning — **PASS** — 3 state hues, one semantic each, glyph redundancy inline (post \`/oc-df-audit\` run 2).
3. P6 desktop-primary, phone-survivable — **PASS** — no horizontal scroll at 390; Layer 0 + 4 OKR rows above the fold, both off-track OKRs included.
4. P8 WCAG 2.2 AA — **PARTIAL** — contrast and semantics pass; the 32×32 close target fails 2.5.5 at the breakpoint where it matters most.
5. Spec §2.2 "it never renders nothing" — **FAIL** — issue 1.

### Verdict: ITERATE

State Completeness at 5/10 is below the 6/10 threshold; every other criterion clears it. Feedback to the Generator: add the three missing states (issues 1–3) with the copy already specified in \`spec.md\`; bump the close target to 44×44 and route both close paths through one handler; replace the \`padding: 14\`. Do not touch the layout or the palette — they passed.

---

# \`design/sprints/sprint-1/eval-round-2.md\`

## Design Sprint 1 — Evaluation Round 2

### Scores

- **Visual Hierarchy: 8/10** — unchanged; the Layer 1 / Layer 2 weight overlap was not in scope for this round and is logged as a Sprint 2 polish item.
- **State Completeness: 7/10** — all three states landed. \`WeekSummary\` renders the unavailable row, \`SmallMultiple\` has an \`aria-busy\` skeleton, \`OkrDrawer\` has an error boundary. Held at 7 because the boundary wraps all three drawer charts at once, so a failure in the Sprint-2 composition chart will take the trend chart down with it.
- **Consistency: 8/10** — token compliance is now 12/12. Held at 8 because the drawer's chart chrome (gridline and axis-label colors) comes from Recharts defaults rather than \`tokens.chart\`, so the drawer is 2 shades off the rest of the screen.
- **Accessibility: 9/10** — close target 44×44, both close paths restore focus to the originating row. Held at 9 because \`prefers-reduced-motion\` suppresses the drawer slide but not the 240ms bar-fill transition on Layer 1.
- **Weighted Score: 8.0/10**

### Issues

1. Shared error boundary across the three drawer charts — split per chart in Sprint 2, when there are actually three.
2. Drawer chart chrome not token-driven — pass \`tokens.chart\` into the Recharts \`CartesianGrid\`/\`XAxis\` props.
3. Bar-fill transition ignores \`prefers-reduced-motion\`.

None blocks. All three carry into the Sprint 1 punch list as polish.

### Token Compliance

- **Colors: 6/6** · **Spacing: 12/12** · **Typography: 4/4**

### Gaps vs Contract

1. P8 WCAG 2.2 AA — **PASS** — 44×44 targets, 0 axe violations, contrast measured in both themes.
2. Spec §2.2 "it never renders nothing" — **PASS** — verified by forcing \`weeklySummary()\` to null.
3. Spec §9 bundle ≤ 28 KB gz — **PASS** — 24.6 KB shell, 11.8 KB lazy drawer.

### Verdict: PASS

All four criteria ≥ 6/10. Weighted 8.0/10, up from a 3.25/10 baseline on the live screen. Registering \`WeekSummary\`, \`OkrRow\`, \`SmallMultiple\` in \`design/component-registry.json\`; \`ChartCard\` moves to DEPRECATED.

---

## Measured, not modelled

Everything above is a design grade. The two numbers a build has to beat are measured on the running pages.

\`\`\`
$ npx lighthouse http://localhost:3000/dashboard \\
    --form-factor=mobile --only-categories=performance,accessibility \\
    --quiet --chrome-flags="--headless"
  Performance    62
  Accessibility  73

$ npx lighthouse http://localhost:5173/ \\
    --form-factor=mobile --only-categories=performance,accessibility \\
    --quiet --chrome-flags="--headless"
  Performance    91
  Accessibility 100

$ npx @axe-core/cli http://localhost:3000/dashboard
14 accessibility issues detected.

$ npx @axe-core/cli http://localhost:5173/
0 accessibility issues detected.
\`\`\`

| Metric | Old \`/dashboard\` | Prototype |
|---|---:|---:|
| Lighthouse mobile performance | 62 | 91 |
| Lighthouse mobile accessibility | 73 | 100 |
| axe-core violations | 14 | 0 |
| Design Evaluator (weighted) | 3.25 / 10 | 8.0 / 10 |

The prototype is a Vite page with mock data — it has no auth, no data fetch, and no app shell, so 91 is a ceiling, not a forecast. The sprint's gate is Lighthouse mobile performance ≥ 85 on the real route.

Checkpoint: \`.checkpoints/oc-ux-engineer.checkpoint.json\`.`,
    },
    {
      id: "dashboard-checkpoint",
      label: "`.checkpoints/oc-ux-engineer.checkpoint.json`",
      kind: "checkpoint.json",
      body:
`\`\`\`json
{
  "protocol_version": "1.1",
  "skill": "oc-ux-engineer",
  "project": "saas-analytics",
  "project_dir": "/Users/dev/src/saas-analytics",
  "created_at": "2026-10-12T09:41:18.402Z",
  "updated_at": "2026-10-12T11:36:05.771Z",
  "phase": "sprint-1-eval-2",
  "step": "design-evaluator-round-2-pass",
  "status": "complete",
  "progress_summary": "Audited app/dashboard/page.tsx (1,412 lines, 14 ChartCards, 14 axe violations) and scored it 3.25/10 — ITERATE. Routed the screen to oc-dash-forge, which returned a handoff bundle after failing 2 of 13 /oc-df-audit checks and fixing them. Design Evaluator round 1 returned ITERATE on State Completeness (5/10); round 2 PASS at 8.0/10. Tokens folded into the component registry. Ready for /oc-roadmap.",
  "progress_table": [
    { "id": "audit",        "label": "Screen audit + baseline eval", "status": "complete" },
    { "id": "route",        "label": "Route to oc-dash-forge",       "status": "complete" },
    { "id": "registry",     "label": "Absorb dash-forge tokens",     "status": "complete" },
    { "id": "eval-round-1", "label": "Design Evaluator round 1",     "status": "complete" },
    { "id": "eval-round-2", "label": "Design Evaluator round 2",     "status": "complete" },
    { "id": "sprint-plan",  "label": "Hand to oc-app-architect",     "status": "not_started" }
  ],
  "context_primer": {
    "key_decisions": [
      "Desktop-primary, verified at 390x844 — user confirmed phones are the Monday standup, not the primary read",
      "Recharts, not Tremor — user ruled out a second chart dependency; Exec-default stack overridden",
      "Light palette rebuilt (#1f6b43 / #7a5c12 / #b4512a); original Leaf/Sand/Clay kept as tokens.dark.state",
      "Layer 3 StackedAreaChart + CohortMatrix deferred — drawer ships with the trend chart only",
      "ChartCard stays in place on /billing/usage and /admin/metrics this quarter"
    ],
    "generated_files": [
      "design/sprints/sprint-1/eval-round-0.md",
      "design/sprints/sprint-1/eval-round-1.md",
      "design/sprints/sprint-1/eval-round-2.md",
      "design/component-registry.json",
      "dash-forge-handoff/"
    ],
    "user_preferences": [
      "Release train is Thursday; rollout phases must land on Thu/Mon",
      "/dashboard?tab=funnel must keep resolving (Looker embed)",
      "Do not touch metrics_weekly_rollup"
    ]
  },
  "eval_scores": [
    { "rubric": "design-evaluator-v1", "score": 3.25, "max": 10, "at": "2026-10-12T09:58:11.900Z",
      "dimensions": { "visual_hierarchy": 2, "state_completeness": 3, "consistency": 4, "accessibility": 4 } },
    { "rubric": "design-evaluator-v1", "score": 7.25, "max": 10, "at": "2026-10-12T11:24:47.118Z",
      "dimensions": { "visual_hierarchy": 8, "state_completeness": 5, "consistency": 8, "accessibility": 8 } },
    { "rubric": "design-evaluator-v1", "score": 8.0, "max": 10, "at": "2026-10-12T11:35:52.640Z",
      "dimensions": { "visual_hierarchy": 8, "state_completeness": 7, "consistency": 8, "accessibility": 9 } }
  ],
  "sub_skill_invocations": [
    {
      "skill": "oc-dash-forge",
      "checkpoint_path": ".checkpoints/oc-dash-forge.checkpoint.json",
      "invoked_at": "2026-10-12T10:03:29.771Z",
      "status": "complete",
      "handoff_path": "./dash-forge-handoff/",
      "result": "Exec archetype, Recharts stack, /oc-df-audit 13/13 PASS on run 2"
    }
  ],
  "skill_state": {
    "scores": { "sprint-1": { "final": 8.0, "rounds": 2, "verdict": "PASS" } },
    "component_count": 27,
    "registry_delta": {
      "added": ["WeekSummary", "OkrRow", "SmallMultiple"],
      "deprecated": ["ChartCard"],
      "children": { "OkrRow": ["OkrBar", "OkrDrawer"] }
    },
    "max_rounds": 3,
    "rounds_used": 2
  },
  "next_actions": ["/oc-roadmap", "/oc-build"]
}
\`\`\`

\`component_count\` counts top-level registry entries: 24 before, +3 (\`WeekSummary\`, \`OkrRow\`, \`SmallMultiple\`) = 27. \`OkrBar\` and \`OkrDrawer\` are registered as children of \`OkrRow\`, which is why the sprint ships **five** new components against **three** new registry entries.`,
    },
    {
      id: "dashboard-sprint",
      label: "Sprint 1 — flagged dashboard replacement",
      kind: "sprint.md",
      body:
`# \`sprints/sprint-plan.md\` — Sprint 1

## Sprint 1: OKR dashboard behind \`FLAG_NEW_DASHBOARD\` — replace \`/dashboard\` for flagged users with the three rendered layers

### Features

Punch list entry, Phase 3d:

\`\`\`
Screen: OKR dashboard (/dashboard)
  Source: oc-dash-forge handoff at ./dash-forge-handoff/
  Components: see prototype.tsx + spec.md §7 tile inventory
  Integration: see integration-notes.md
  Design grade: 8.0/10, eval-round-2, PASS
\`\`\`

No inline wireframes — this screen was routed to oc-dash-forge, so the handoff bundle *is* the design.

### Deliverables

**Five new components**, mapped 1:1 to the tile inventory:

| Component | From | Registry |
|---|---|---|
| \`WeekSummary\` | Layer 0 | new top-level entry |
| \`OkrRow\` | Layer 1 ×8 | new top-level entry |
| \`OkrBar\` | subcomponent of \`OkrRow\` | child of \`OkrRow\` |
| \`SmallMultiple\` | Layer 2 ×8 | new top-level entry |
| \`OkrDrawer\` | Layer 3 | child of \`OkrRow\`, lazy |

Registry goes 24 → 27 entries; \`ChartCard\` moves to DEPRECATED but is **not** deleted — \`/billing/usage\`, \`/admin/metrics\` and \`ReportPreview\` still import it.

**One component reused:** \`HistoricalTrendChart\` from the existing chart kit, lazy-loaded inside the drawer.

**Deferred to Sprint 2:** \`StackedAreaChart\` and \`CohortMatrix\`. The drawer opens with the trend chart only. \`spec.md\` §5 lists three drawer charts; Sprint 1 ships one, and the drawer header says "Trend" rather than promising tabs that don't exist.

**Three read helpers:** \`weekSummary()\`, \`okrSnapshot()\`, \`smallMultiple()\` in \`lib/dashboard/snapshots.ts\`, all reading the existing \`/api/metrics?range=12w\`. No backend change, no migration, no change to \`metrics_weekly_rollup\`.

### Files touched

| File | Change | LoC |
|---|---|---:|
| \`app/dashboard/page.tsx\` | rewrite (1,412 → flag-routed shell) | ~150 |
| \`app/dashboard/legacy/page.tsx\` | move the existing screen here | (move) |
| \`components/dashboard/WeekSummary.tsx\` | new | ~70 |
| \`components/dashboard/OkrRow.tsx\` | new | ~90 |
| \`components/dashboard/OkrBar.tsx\` | new | ~55 |
| \`components/dashboard/SmallMultiple.tsx\` | new | ~80 |
| \`components/dashboard/OkrDrawer.tsx\` | new (lazy) | ~120 |
| \`lib/dashboard/snapshots.ts\` | new | ~95 |
| \`lib/dashboard/format.ts\` | new (count / percent / hours / rate) | ~40 |
| \`tests/components/dashboard/*.test.tsx\` | new (3 files) | ~240 |
| \`tests/e2e/dashboard.spec.ts\` | new (Playwright) | ~110 |

**~1,050 lines added, 0 deleted** — the legacy screen moves rather than dies.

### Test Requirements

- \`tests/components/dashboard/OkrBar.test.tsx\` — fill clamps at 1.5× target; the \`inverted\` prop flips the state token without flipping the geometry; the target tick renders at 1.0 even when the fill is short.
- \`tests/components/dashboard/WeekSummary.test.tsx\` — renders exactly 3 bullets; \`weeklySummary()\` null → renders the "summary unavailable" row, not \`null\`. (This test exists because of eval round 1, issue 1.)
- \`tests/components/dashboard/SmallMultiple.test.tsx\` — renders 11 bins from a 12-row response; the visually-hidden \`<table>\` has 11 cells; a null bin renders a gap, not a zero.
- \`tests/e2e/dashboard.spec.ts\` — \`opens drawer, Esc closes, focus returns to row\`; plus the overlay-click path, which must restore focus identically.
- All tests green before the sprint hands off to the Evaluator.

### Definition of Done

- [ ] All **Code** criteria ≥ 6/10 and all **Design** criteria ≥ 6/10 (both Evaluators attached — \`/oc-uxe attach\`).
- [ ] Design score ≥ 8.0/10 — matches eval round 2, so the build is not allowed to regress the design it was handed.
- [ ] Lighthouse mobile performance ≥ 85 on the real \`/dashboard\` route with the flag on (old screen: 62).
- [ ] axe-core: 0 violations (old screen: 14).
- [ ] Initial bundle delta ≤ +28 KB gzipped; drawer chunk counted lazily (prototype: 24.6 KB + 11.8 KB).
- [ ] \`FLAG_NEW_DASHBOARD\` off → legacy screen renders with no regression.
- [ ] \`/dashboard?tab=funnel\` resolves in **both** flag states — 302 to \`/dashboard/legacy?tab=funnel\`. The Looker embed points at it.
- [ ] Unit coverage ≥ 90% on new files.

### Dependencies

- \`dash-forge-handoff/\` bundle present at the repo root (spec, tokens, types, mock-data, prototype, integration-notes).
- \`FLAG_NEW_DASHBOARD\` registered, default off.
- No dependency on other sprints. This ships in isolation.

### Estimated Effort

\`\`\`
CLAUDE: 5h | USER: 1h
\`\`\`

USER hours: flag registration, the Looker embed check, and the internal smoke pass.

## Rollout

Release train is Thursday, so the phases land on Thu/Mon.

| Phase | Audience | Window | Gate |
|---|---|---|---|
| Internal | team, 12 accounts | Thu 15 Oct → Mon 19 Oct | manual smoke on 3 devices incl. one 390-wide phone |
| 10% | random sampling | Mon 19 Oct → Thu 22 Oct | ≤ 2 issues; 0 new Sentry error signatures |
| 50% | scaled out | Thu 22 Oct → Mon 26 Oct | LCP p75 within 10% of legacy; complaint rate ≤ baseline |
| 100% | everyone | Thu 29 Oct | — |

Legacy code stays in the tree until **Thu 5 Nov** (one full release cycle after 100%), then a separate cleanup PR.

## Rollback

Flip \`FLAG_NEW_DASHBOARD\` off. The legacy screen renders from \`app/dashboard/legacy/page.tsx\`; no deploy needed.

In-flight behaviour across a flip:
- Tabs polling \`/api/metrics\` — unchanged, same endpoint, same shape.
- Open drawer URLs (\`/dashboard?okr=retention_d7\`) — the legacy screen ignores the param and renders its default tab.
- \`/dashboard?tab=funnel\` — 302s to legacy in both states, so the Looker embed never depends on the flag.

## Risks

| Risk | Mitigation |
|---|---|
| \`metrics_weekly_rollup\` misses a night and \`weeklySummary()\` returns null | Covered — \`WeekSummary\` renders "Summary unavailable — last rollup <timestamp>" and Layer 1 still paints. This is eval round 1 issue 1; it has a test. |
| Drawer chunk 404s after a deploy with stale HTML | Error boundary added in eval round 2; boundary is shared across the (currently one) drawer chart. Split when Sprint 2 adds the other two. |
| Hand-built \`OkrBar\`/\`SmallMultiple\` drift from Recharts' rendering | Both are plain SVG, no Recharts dependency; only the drawer chart uses Recharts. Drift surface is one component. |
| Layer 2 competes with Layer 1 for the second glance (eval round 2, VH held at 8) | Sprint 2 polish: drop \`SmallMultiple\` last-value from 20px to 16px and re-run the Evaluator. |
| \`prefers-reduced-motion\` not honoured on the bar-fill transition | One-line fix in Sprint 1 polish; tracked on the punch list. |

## After merge

- [ ] Design Evaluator score recorded in the CI annotation (gate: ≥ 8.0).
- [ ] Lighthouse CI budget green on \`/dashboard\`.
- [ ] axe nightly green 3 consecutive nights before moving past 10%.
- [ ] \`design/component-registry.json\` re-audited (\`/oc-uxe components audit\`) — 27 entries, \`ChartCard\` DEPRECATED with its 3 remaining consumers listed.
- [ ] \`docs/runbooks/dashboard.md\` updated with the five components and the flag.

Checkpoint: \`.checkpoints/oc-app-architect.checkpoint.json\` — \`phase: "sprint-plan-approved"\`, Sprint 1 queued.`,
    },
  ],
  skills: ["oc-ux-engineer", "oc-dash-forge", "oc-app-architect"],
  runtime: "≈ 15 exchanges",
  steps: [
    { type: "beat", phase: "design", label: "01 · Triage", caption: "oc-ux-engineer reads the actual screen", skills: ["oc-ux-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`/oc-uxe eval app/dashboard/page.tsx

Our analytics dashboard is a mess. 14 charts, 4 tabs, team leads keep saying they "don't know where to look." Next.js 14 app router, Recharts, Postgres — the whole screen is one file, \`app/dashboard/page.tsx\`. Dev server is up on :3000.

[image: kitchen-sink-dashboard.png]
[figma: https://figma.com/file/Kx9Qm2aLpR7vTn4WcYzB3e/saas-analytics]

Can we make this actually usable?`
    },
    {
      type: "exchange", role: "claude", skill: "oc-ux-engineer",
      content:
`Using **oc-ux-engineer** — Design Planner → Generator → Evaluator. Reading the file and the running page.

\`\`\`
$ wc -l app/dashboard/page.tsx
    1412 app/dashboard/page.tsx
$ grep -c "<ChartCard" app/dashboard/page.tsx
14
$ grep -c "empty=\\|error=" app/dashboard/page.tsx
3
$ npx @axe-core/cli http://localhost:3000/dashboard
14 accessibility issues detected (3 color-contrast, 9 svg-img-alt).
\`\`\`

Eleven of the fourteen \`<ChartCard>\`s render an axis frame and nothing else when the rollup is late, and MAU is encoded three ways. Not a visual-design problem — density. **Route design to oc-dash-forge? (Y/N)**

Either way: what's the one question this screen has to answer, and is the primary user an exec who glances weekly or an IC who lives in it?`
    },
    {
      type: "exchange", role: "user",
      content:
`Y — route it.

1. "Is my team on track to hit this quarter's OKRs?"
2. Founders + team leads. Weekly check-in, Monday morning. Mobile maybe 30% of the time.

The actual OKR sheet — FY27 Q1, Mon 3 Aug → Sun 1 Nov, week 11 of 13, eight rows:

\`\`\`
#  metric                          baseline(3 Aug)  target   current  ind
1  Retention day-7 (%)                       44.0      45      42.1   lagging
2  Weekly signups                             540     600       710   leading
4  Support time-to-resolve (h)                5.2      ≤4       4.6   lagging
5  Tickets / 100 MAU                          4.9      ≤4       3.2   leading
8  Engineering velocity (feat/wk)              2.6     3.0       4.1   lagging
   3 NPS 30→40 now 36 · 6 ARR retention 89.5→92 now 91 · 7 Activation 48→55 now 62
\`\`\`

\`/api/metrics?range=12w\` returns a 12-element series per OKR; the last element is the in-progress week, null until the rollup runs.

One hard constraint: **we're on Recharts. Do not bring in Tremor.** I'm not carrying two chart libraries.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-ux-engineer",
      artifacts: ["dashboard-principles"],
      content:
`Recharts noted as a hard constraint — I'll pass it down as one.

Baseline first, so we have a number to beat. Design Evaluator against the live screen, written to \`design/sprints/sprint-1/eval-round-0.md\`:

\`\`\`
## Design Sprint 1 — Evaluation Round 0 (baseline)
  Visual Hierarchy 2/10 · State Completeness 3/10
  Consistency      4/10 · Accessibility      4/10
  **Weighted Score: 3.25/10 — Verdict: ITERATE**
\`\`\`

All four below the 6/10 threshold — that's what the rebuild has to move.

One scoping question first: \`grep -rl "ChartCard" app components\` returns five files, so \`ChartCard\` has three consumers besides \`/dashboard\`. One-screen job or four-screen job?`
    },
    {
      type: "exchange", role: "user",
      content:
`One screen. \`/billing/usage\` and \`/admin/metrics\` stay on ChartCard this quarter — nobody's complaining and I don't want the blast radius.

Two things you'll trip over: a Looker embed points at \`/dashboard?tab=funnel\`, so that URL has to keep resolving whatever we do to the route. And \`metrics_weekly_rollup\` is a fragile nightly job that already skipped a run this quarter (week ending 4 Oct is just missing). Don't assume it fired.`
    },

    { type: "beat", phase: "design", label: "02 · oc-dash-forge", caption: "density specialist takes the screen", skills: ["oc-dash-forge"] },

    {
      type: "exchange", role: "claude", skill: "oc-dash-forge",
      content:
`Now using **oc-dash-forge**. Cold start, no checkpoint. \`/oc-data-forge\` with oc-ux-engineer's tokens + brief — per the intake scaling table, three questions:

**1. What decision does this drive?** "Awareness of OKR status" isn't an answer I'll accept — what does a lead *do* differently on Monday?
**2. What tolerance separates "trending" from "off track"?** Without a band, six of eight rows are red and nobody reads it twice.
**3. Where does the weekly rollup land, and how often?** It skips, so Layer 0 has to degrade rather than vanish.

**And a pushback on the 30% mobile figure.** Mobile-first is my most common failure mode, so I'd rather argue now: you described a Monday check-in where leads reallocate people, which is laptop work. My default is **desktop-primary, verified at 390×844** — mobile-first only if that Monday read is *predominantly* on a phone. Which is it?`
    },
    {
      type: "exchange", role: "user",
      content:
`Decision: reallocate people mid-quarter or kill an initiative. If the screen doesn't change who's working on what, it's wallpaper.

Trending = within 5% of the pace line.

Rollup is \`metrics_weekly_rollup\`, nightly 02:00 UTC, stamps Monday-first weeks.

Phones are Monday morning in the standup — someone pulls it up while walking in. Design for laptop, it must not break at 390.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-dash-forge",
      artifacts: ["dashboard-layers"],
      content:
`That's an Exec dashboard and it isn't close — runner-up Analyst loses because leads decide weekly against a fixed target set of eight pre-aggregated OKRs. Density low: 17 tiles, KPI 32px, one drill path. Viz stack **Recharts, deviating from the Exec default (Tremor)** because you ruled out a second chart dependency — OkrBar and SmallMultiple are hand-built, ~135 LoC of plain SVG.

**Phase 2 — layout.** Three layers, one drawer on demand. Your 5% tolerance becomes the state rule against \`pace = baseline + (target − baseline) × (weeks_elapsed / 13)\` — ×0.769 at week 11:

\`\`\`
 1  ⊢  ✕  Retention day-7  ██████████████░│░░░░░   42.1% vs 45%   −6.0% vs pace
                                          ▲ target tick
\`\`\`

That lands **4 on / 2 watch / 2 off** — a screen that says "these two" changes staffing. Layer 2 is a 2×4 strip of 11-bin sparklines: of the 12 rows \`range=12w\` returns I drop your trailing \`null\`, and the 4 Oct gap renders as a gap, not a zero. At 390 the off-track rows sort first.

Layout look right? (Y/n)`
    },
    {
      type: "exchange", role: "user",
      content:
`Y, with two changes:

1. Some of those OKRs are leading and some are lagging, and that matters more than the order — a lagging one off track means we already lost the quarter, a leading one means we can still fix it. Leads need to see which without reading the tooltip.
2. We need a "what changed this week" block. Not a chart, a list. The rollup already writes three sentences for the Monday email — reuse those, don't invent a field.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-dash-forge",
      artifacts: ["dashboard-audit", "dashboard-prototype"],
      content:
`Both fit without new color: an \`↗\` / \`⊢\` prefix glyph ahead of the state glyph, and a Layer 0 of three plain-text bullets off the rollup's Monday-email fields — "Summary unavailable" on your 4 Oct case.

**Phase 3 — prototype**, then the mandatory self-check.

\`\`\`
$ /oc-df-audit

  6   Colorblind safe  FAIL  ← ✓/~/✕ live only in the row tooltip; on canvas
                               the 3 states differ by hue alone. Deuteranopia
                               puts --ok #2f8a57 → #7d7d4e and --off #d96b3a →
                               #b08046: 12.4 ΔE apart, floor is 20.
  12  Contrast         FAIL  ← on #ffffff, --watch #c3a64f 2.36:1, --ok #2f8a57
                               4.29:1, --off #d96b3a 3.43:1 — 0 of 3 clear the
                               4.5:1 glyph rule.

  11 PASS / 2 FAIL — critical. /oc-df-prototype blocked.
\`\`\`

I picked those hues for a dark canvas and then put them on a white one. Splitting the palette rather than desaturating it, and the glyph moves into the row itself:

\`\`\`
         light #ffffff    dark #0f1115
--ok     #1f6b43 6.48:1   #2f8a57 4.40:1
--watch  #7a5c12 6.24:1   #c3a64f 8.02:1
--off    #b4512a 5.06:1   #d96b3a 5.51:1
\`\`\`

The originals weren't wrong, just on the wrong background — they survive as \`tokens.dark.state\`. Re-run: **13 PASS / 0 FAIL**.`
    },

    { type: "beat", phase: "design", label: "03 · Handback", caption: "oc-ux-engineer integrates and grades", skills: ["oc-ux-engineer"] },

    {
      type: "exchange", role: "user",
      content:
`The palette swap is fine — \`#1f6b43\` is close enough to our existing success green that nobody will file a ticket, and the old one was probably failing on the legacy screen too.

Grade it before I take this to the team Monday — the score and the list, not the vibes. And it has to land in the component library properly; last time we shipped a one-off dashboard it drifted from the style book inside a month.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-ux-engineer",
      artifacts: ["dashboard-grade", "dashboard-checkpoint"],
      content:
`Resuming from checkpoint — \`sub_skill_invocations[0]\` → \`complete\`.

\`/oc-uxe components\` folds \`tokens.ts\` in: three new draft components, \`ChartCard\` → DEPRECATED with its 3 consumers left alone, coverage 24 → 27, no new type sizes or spacing steps — it specialises inside the style book, not beside it.

**\`/oc-uxe eval\` on the prototype — round 1:**

\`\`\`
  Visual Hierarchy 8/10 · State Completeness 5/10
  Consistency      8/10 · Accessibility      8/10  (0 axe violations)
  **Weighted Score: 7.25/10 — Verdict: ITERATE**
\`\`\`

State Completeness is under the 6/10 threshold, so this doesn't pass:

1. \`prototype.tsx:48\` — \`WeekSummary\` returns \`null\` when \`weeklySummary()\` is null: an 88px hole above Layer 1 on your 4 Oct case, and the spec already has the copy.
2. \`prototype.tsx:112\` — \`SmallMultiple\` has no skeleton, so a slow \`/api/metrics\` reads as "all eight are zero".
3. \`prototype.tsx:214\` — \`OkrDrawer\` has no error boundary; a chunk 404 blanks the drawer *with the focus trap still active*. Plus \`padding: 14\` at \`:73\`, off-scale, which \`/oc-df-audit\` check 11 can't see — it reads \`tokens.ts\`, not inline styles.

Generator fixed all four. **Round 2 — 8/10 · 7/10 · 8/10 · 9/10, weighted 8.0/10, PASS.**

**3.25 → 8.0** on the same rubric, two rounds of three; the three round-2 holds go on the punch list. Next: \`/oc-roadmap\`, then \`/oc-build\`.`
    },

    { type: "beat", phase: "plan", label: "04 · Sprint plan", caption: "oc-app-architect turns the handoff into one flagged sprint", skills: ["oc-app-architect"] },

    {
      type: "exchange", role: "user",
      content:
`/oc-roadmap — one sprint, behind a flag. We cut a release every Thursday, so make the rollout phases land on Thursdays and Mondays. Leave the legacy route untouched and don't touch the rollup job.`
    },
    {
      type: "exchange", role: "claude", skill: "oc-app-architect",
      artifacts: ["dashboard-sprint"],
      content:
`The sprint references \`./dash-forge-handoff/\` rather than re-specifying it — the handoff *is* the design, at 8.0/10. **Sprint 1: OKR dashboard behind \`FLAG_NEW_DASHBOARD\`**, two scope corrections:

**Five new components, not three** — \`OkrBar\` and \`OkrDrawer\` are children of \`OkrRow\`, so they get no registry entry but still need writing.

**Layer 3 ships with one chart, not three.** \`spec.md\` §5 promises trend + composition + cohort, but \`StackedAreaChart\` and \`CohortMatrix\` are in neither your tree nor the bundle — most of a second sprint. **Deferred to Sprint 2**, rather than discovering that at the 50% gate.

\`\`\`
11 files, ~1,050 lines: app/dashboard/page.tsx rewrites 1,412 → ~150.

Definition of Done:
  all Code AND Design criteria ≥ 6/10; Design ≥ 8.0, no regression on
  what the build was handed
  Lighthouse mobile perf ≥ 85 (old: 62) · axe 0 (old: 14) · ≤ +28 KB gz
  /dashboard?tab=funnel resolves in BOTH flag states (302 → legacy)

Estimated Effort: CLAUDE: 5h | USER: 1h
\`\`\`

\`WeekSummary.test.tsx\` exists because of eval round 1, issue 1 — the null-rollup case gets a failing-first test, not a risk-table line.

Rollout on your Thursday train: internal Thu 15 Oct → 10% Mon 19 Oct → 50% Thu 22 Oct → 100% Thu 29 Oct, legacy deleted Thu 5 Nov. Kill switch is the flag; the rollup job is untouched.`
    },
    {
      type: "exchange", role: "user",
      content:
`Contract looks right, and deferring the two Layer 3 charts is the correct call — the drawer was always going to be the part that slipped.

One addition: put the \`?tab=funnel\` 302 in its own commit at the front of the sprint so I can ship it Thursday independently of the flag. If the Looker embed breaks, that's what pages someone.

I'll kick off \`/oc-build\` after standup.`
    },
  ],
};
