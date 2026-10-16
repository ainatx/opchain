/**
 * Types + loader for the build-time roadmap pull
 * (`scripts/gen-roadmap.mjs` → `site/src/data/roadmap.json`).
 *
 * Source: GitHub Issues on the public `asfbay-bit/opchain-skills` mirror,
 * filtered to the four `roadmap:*` labels (that label IS the bucket — no
 * separate visibility gate, unlike the old Linear `roadmap-visible` +
 * state-driven-bucket model). See docs/plans/2026-08-26-roadmap-github-issues.md.
 *
 * The JSON is gitignored. `npm run gen-roadmap` regenerates it; `loadRoadmap()`
 * falls back to an empty shape if the file isn't there — so type-check
 * passes regardless of whether the JSON exists at the moment.
 *
 * Loaded via `import.meta.glob` rather than `fs.readFileSync(__dirname + ...)`
 * on purpose: Astro/Vite bundles this module into a prerender chunk whose
 * runtime location is NOT `site/src/data` (it's somewhere under
 * `dist/.prerender/chunks/`), so an `import.meta.url`-relative fs read
 * silently fails during `astro build` even though it works fine under plain
 * `node`/Vitest. `import.meta.glob` is resolved against the *source* module
 * graph at compile time, so it isn't affected by where the compiled chunk
 * ends up — and, same as the fs approach, a missing file just yields no
 * match (not a hard import error), preserving the "safe to build before
 * `npm run gen-roadmap` has run" contract.
 */

const roadmapModules = import.meta.glob<{ default: Roadmap }>("./roadmap.json", { eager: true });
const roadmapModule = roadmapModules["./roadmap.json"];

export type RoadmapBucket = "shipped" | "in-progress" | "planned" | "backlog";

export interface RoadmapItem {
  /** GitHub issue number as a string, e.g. "42". Also the /api/votes id. */
  id: string;
  title: string;
  /** First line of the issue body, truncated to 240 chars. */
  blurb: string;
  /** Bullet points parsed from the issue body (lines starting with "-"/"*"). */
  deliverables: string[];
  /** GitHub issue permalink. */
  url: string;
  bucket: RoadmapBucket;
  /** GitHub milestone title (e.g. "v1.9") — null when unmilestoned. */
  milestone: string | null;
  /** GitHub milestone number — used as a stable creation-order sort key. */
  milestoneSort: number | null;
  /** GitHub milestone due_on — null when the milestone has no due date. */
  targetDate: string | null;
  /** Issue labels, minus the roadmap:* bucket label itself. */
  labels: string[];
  updatedAt: string;
}

export interface RoadmapMilestone {
  name: string;
  sortOrder: number | null;
  targetDate: string | null;
  counts: Record<RoadmapBucket, number>;
}

export interface Roadmap {
  generated_at: string;
  /** Set when the build pulled with a GitHub fetch error / rate limit. */
  note: string | null;
  items: Record<RoadmapBucket, RoadmapItem[]>;
  milestones: RoadmapMilestone[];
}

/**
 * Astro is in static-output mode, so this only runs during SSG and the
 * result is baked into the rendered HTML. Returns an empty roadmap if
 * the file is missing (e.g. `npm run gen-roadmap` hasn't run yet).
 */
export function loadRoadmap(): Roadmap {
  if (!roadmapModule) {
    return {
      generated_at: new Date().toISOString(),
      note: "roadmap.json missing — run `npm run gen-roadmap` to refresh.",
      items: { shipped: [], "in-progress": [], planned: [], backlog: [] },
      milestones: [],
    };
  }
  return roadmapModule.default;
}

/**
 * Items in `bucket` carrying milestone `milestoneName`, sorted by GitHub
 * issue number (stable creation order — matches the old ascending-priority
 * tie-break with no Linear-priority equivalent to sort by instead).
 */
export function itemsForMilestone(
  roadmap: Roadmap,
  bucket: RoadmapBucket,
  milestoneName: string,
): RoadmapItem[] {
  return roadmap.items[bucket]
    .filter((item) => item.milestone === milestoneName)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

/**
 * Items in `bucket` whose GitHub milestone NUMBER is `milestoneNumber`
 * (`milestoneSort` is the milestone number, see gen-roadmap.mjs). Use this
 * where a milestone's title is expected to change: a milestone's number
 * survives a rename, so the page reads the same issues before and after the
 * title moves (e.g. "v2.2" → "later: agency delivery"), and an issue never
 * lands in the wrong group because another milestone took the old title.
 */
export function itemsForMilestoneNumber(
  roadmap: Roadmap,
  bucket: RoadmapBucket,
  milestoneNumber: number,
): RoadmapItem[] {
  return roadmap.items[bucket]
    .filter((item) => item.milestoneSort === milestoneNumber)
    .sort((a, b) => Number(a.id) - Number(b.id));
}
