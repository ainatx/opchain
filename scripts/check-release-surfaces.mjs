#!/usr/bin/env node
// check-release-surfaces.mjs
//
// Guards against the recurring "we shipped vN but the site still says vN-1"
// drift. Reads every LIVE-CLAIM site surface (the ones that assert what's
// currently live in prod) and asserts they all agree on the same release line.
// The canonical value is Header's CURRENT_RELEASE; every other surface must
// match it. See skills/oc-release-ops/references/site-release-surfaces.md.
//
// This does NOT decide what the release *should* be — only that the surfaces are
// consistent with each other. Run after a release cut (and in CI) so a
// half-finished bump fails loudly instead of shipping a lying header.
//
// Run:        node scripts/check-release-surfaces.mjs
// Exit:       0 if consistent, 1 on any mismatch.

import { readFileSync, existsSync, realpathSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCatalogVersion } from "./check-release-tag.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Each probe pulls the major release line ("v1.6") from one live-claim surface.
const PROBES = [
  {
    label: "Header CURRENT_RELEASE",
    file: "site/src/components/Header.astro",
    re: /const CURRENT_RELEASE\s*=\s*"(v\d+\.\d+)"/,
  },
  {
    label: "Header CURRENT_RELEASE_HREF",
    file: "site/src/components/Header.astro",
    re: /const CURRENT_RELEASE_HREF\s*=\s*"\/changelog#v(\d+)-(\d+)"/,
    join: (m) => `v${m[1]}.${m[2]}`,
  },
  {
    label: "homepage release bar (shipped)",
    file: "site/src/pages/index.astro",
    re: /<span class="rb-tag">(v\d+\.\d+) · shipped<\/span>/,
  },
  {
    label: "homepage stat chip",
    file: "site/src/pages/index.astro",
    re: /<span class="stat-num">(v\d+\.\d+)<\/span>/,
  },
  {
    label: "changelog Just-Released hero (open)",
    file: "site/src/pages/changelog.astro",
    re: /hero-card--released is-open"\s+id="v(\d+)-(\d+)"/,
    join: (m) => `v${m[1]}.${m[2]}`,
  },
  {
    label: "Skill Library release callout",
    file: "site/src/pages/skills/index.astro",
    re: /<span class="release-callout-tag">(v\d+\.\d+) · SHIPPED<\/span>/,
  },
  {
    label: "Skill Library release callout href",
    file: "site/src/pages/skills/index.astro",
    re: /<a class="release-callout" href="\/changelog#v(\d+)-(\d+)"/,
    join: (m) => `v${m[1]}.${m[2]}`,
  },
  {
    label: "styleguide version Badge",
    file: "site/src/pages/styleguide.astro",
    re: /<Badge[^>]*>(v\d+\.\d+)\.\d+<\/Badge>/,
  },
  // The architecture diagram states the live release in three places. All three
  // were stale after v1.9 shipped (they still read v1.8) precisely because
  // nothing probed them. Procedure: docs/runbooks/architecture-diagram-cycle.md
  {
    label: "architecture diagram eyebrow",
    file: "site/src/pages/architecture.astro",
    re: /SKILLS · ARCHITECTURE · v2 · RELEASE (v\d+\.\d+)/,
  },
  {
    label: "architecture diagram footer",
    file: "site/src/pages/architecture.astro",
    re: /spine ordinals · (v\d+\.\d+) · checkpoint-driven/,
  },
  {
    label: "mobile architecture eyebrow",
    file: "site/src/components/MobileArchitecture.astro",
    re: /SKILLS · ARCHITECTURE · v2 · MOBILE · (v\d+\.\d+)/,
  },
];

function probe({ label, file, re, join: j }, p) {
  let text;
  try {
    text = readFileSync(p(file), "utf8");
  } catch {
    return { label, file, value: null, error: "file not found" };
  }
  const m = text.match(re);
  if (!m) return { label, file, value: null, error: "pattern not found" };
  return { label, file, value: j ? j(m) : m[1] };
}

export function checkReleaseSurfaces({ root = ROOT } = {}) {
  const p = (rel) => join(root, rel);
  const results = PROBES.map((entry) => probe(entry, p));
  const preview = existsSync(p("release-preview.json")) ? JSON.parse(readFileSync(p("release-preview.json"), "utf8")) : null;
  // Rehearse launch copy without manufacturing an entry in the real release ledger.
  // The deploy wrapper still refuses production while this marker exists.
  const launchPresentation = preview?.presentation === "release";
  const header = results.find((r) => r.label === "Header CURRENT_RELEASE");
  const expected = header?.value ?? null;
  const errors = [];

  if (!expected) {
    errors.push("could not read Header CURRENT_RELEASE — the canonical release value");
  }
  for (const r of results) {
    if (r.error) {
      errors.push(`${r.label} (${r.file}): ${r.error}`);
    } else if (expected && r.value !== expected) {
      errors.push(`${r.label} (${r.file}): says ${r.value}, expected ${expected}`);
    }
  }
  // R3a (v1.9): consistency is not truth — all eight surfaces can agree on a
  // release the product never recorded (v1.8.2 shipped with the changelog
  // stopped at 1.8.1). Bind the site's claim to skills/CHANGELOG.md's newest
  // release heading, so the site cannot announce what the catalog has not
  // logged.
  let releaseVersion = null;
  if (expected) {
    try {
      const changelog = readFileSync(p("skills/CHANGELOG.md"), "utf8");
      const heading = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
      if (!heading) {
        errors.push("skills/CHANGELOG.md: no released `## [x.y.z]` heading found");
      } else {
        releaseVersion = heading[1];
        const logged = `v${releaseVersion.split(".").slice(0, 2).join(".")}`;
        results.push({ label: "skills/CHANGELOG.md newest release", file: "skills/CHANGELOG.md", value: logged, ...(launchPresentation ? { expected: logged } : {}) });
        if (launchPresentation ? expected !== `v${preview.version.split(".").slice(0, 2).join(".")}` : logged !== expected) {
          errors.push(
            `skills/CHANGELOG.md (newest entry ${logged}) does not match the site's claimed ${expected} — ` +
              "the site must not announce a release the catalog has not recorded",
          );
        }
      }
    } catch (e) {
      errors.push(`skills/CHANGELOG.md: unreadable (${e.message})`);
    }
  }

  // The site uses a minor display label, but install/update surfaces carry a
  // full semver. Keep their inventory executable so a lockstep bump cannot
  // leave the marketplace, plugin, catalog, server, or release seal behind.
  if (releaseVersion) {
    if (existsSync(p("release-preview.json"))) {
      if (preview.schemaVersion !== 1 || preview.status !== "staging-preview" || preview.releaseDate !== null || preview.baseline !== releaseVersion || (preview.presentation !== undefined && preview.presentation !== "release")) errors.push("Invalid staging preview release metadata");
      releaseVersion = preview.version;
    }
    const versioned = [
      ["skill catalog frontmatter", "skills/*/SKILL.md", () => readCatalogVersion(join(root, "skills")).version],
      ["release seal catalogVersion", "release-seal.json", () => JSON.parse(readFileSync(p("release-seal.json"), "utf8")).catalogVersion],
      ["MCP server version", "server.json", () => JSON.parse(readFileSync(p("server.json"), "utf8")).version],
      ["marketplace metadata version", ".claude-plugin/marketplace.json", () => JSON.parse(readFileSync(p(".claude-plugin/marketplace.json"), "utf8")).metadata?.version],
      ["marketplace plugin version", ".claude-plugin/marketplace.json", () => JSON.parse(readFileSync(p(".claude-plugin/marketplace.json"), "utf8")).plugins?.find((plugin) => plugin.name === "opchain")?.version],
      ["plugin manifest version", "plugins/opchain/.claude-plugin/plugin.json", () => JSON.parse(readFileSync(p("plugins/opchain/.claude-plugin/plugin.json"), "utf8")).version],
    ];
    for (const [label, file, read] of versioned) {
      try {
        const value = read();
        results.push({ label, file, value, expected: releaseVersion });
        if (value !== releaseVersion) errors.push(`${label} (${file}): says ${value ?? "(missing)"}, expected ${releaseVersion}`);
      } catch (error) {
        results.push({ label, file, value: null, error: "unreadable" });
        errors.push(`${label} (${file}): unreadable (${error.message})`);
      }
    }
    // Full-semver live claims that must track the catalog patch, not just
    // Header's major.minor line. A lagging open-hero range or README
    // "Opchain x.y.z" is the same class of lie as a stale catalogVersion.
    for (const [label, file, read] of [
      [
        "changelog Just-Released hero-ver",
        "site/src/pages/changelog.astro",
        (text) => {
          const m = text.match(/hero-card--released is-open"[\s\S]*?<span class="hero-ver">(v\d+\.\d+\.\d+)(?:\s*→\s*(v\d+\.\d+\.\d+))?/);
          if (!m) throw new Error("pattern not found");
          return (m[2] || m[1]).replace(/^v/, "");
        },
      ],
      ["README leading version", "README.md", semverAt(/^\> \*\*Opchain (\d+\.\d+\.\d+)\.\*\*/m)],
      // The 2.0.3 changelog named these three as gated; until the 2.0.3 audit
      // only the README above was.
      ["mirror README leading version", "mirror/README.md", semverAt(/^> Opchain (\d+\.\d+\.\d+) ·/m)],
      ["plugin README leading version", "plugins/opchain/README.md", semverAt(/^\> \*\*Opchain (\d+\.\d+\.\d+)\.\*\*/m)],
      ["styleguide version Badge (full)", "site/src/pages/styleguide.astro", semverAt(/<Badge[^>]*>v(\d+\.\d+\.\d+)<\/Badge>/)],
    ]) {
      try {
        const value = read(readFileSync(p(file), "utf8"));
        results.push({ label, file, value, expected: releaseVersion });
        if (value !== releaseVersion) errors.push(`${label} (${file}): says ${value ?? "(missing)"}, expected ${releaseVersion}`);
      } catch (error) {
        results.push({ label, file, value: null, error: "unreadable" });
        errors.push(`${label} (${file}): unreadable (${error.message})`);
      }
    }
  }

  // The skill page's "In the 2.0 loop" tag names the release that shipped the
  // loop, not the current line, so it may trail the site. It must still never
  // call a shipped release "next" (it did after 2.0.2 shipped) or call a
  // future release shipped.
  if (expected) {
    const label = "skill-page loop tag";
    const file = "site/src/pages/skills/[id].astro";
    try {
      const m = readFileSync(p(file), "utf8").match(/<span class="inloop-tag">(v\d+\.\d+) · (\w+)<\/span>/);
      if (!m) throw new Error("pattern not found");
      const [tag, state] = [m[1], m[2].toLowerCase()];
      const shipped = compareLine(tag, expected) <= 0;
      const pass = state === "shipped" ? shipped : !shipped;
      results.push({ label, file, value: `${tag} · ${state}`, pass });
      if (!pass) errors.push(`${label} (${file}): says ${tag} · ${state}, but the site's release line is ${expected}`);
    } catch (error) {
      results.push({ label, file, value: null, error: "unreadable" });
      errors.push(`${label} (${file}): unreadable (${error.message})`);
    }
  }

  // 2.1 /work (opchain.work, the ow- planning family). The ow- catalog is
  // versioned per skill and is in no oc- output, so the live-claim line above
  // says nothing about it. What the section must never do is name a skill the
  // family has not built: catalogs.json `ow.planned` legitimately holds the
  // v2.2 skills (their planned verbs still resolve in the contract check), so
  // the probe is not "planned is empty" but "no /work page exists for a planned
  // id, and no planned id appears in the built /work HTML". Source is probed
  // always; the built HTML when site/dist/work exists (CI runs Vitest before
  // the site build, so the dist half is a local and post-build guard).
  for (const r of checkWorkSurfaces({ root })) {
    results.push(r);
    if (!r.pass) errors.push(`${r.label} (${r.file}): ${r.detail}`);
  }

  return { ok: errors.length === 0, expected, releaseVersion, results, errors };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** The /work probes: planned ids have no page and no mention under /work. */
export function checkWorkSurfaces({ root = ROOT } = {}) {
  const pagesDir = join(root, "site/src/pages/work");
  if (!existsSync(pagesDir)) return [];
  let planned;
  try {
    const catalogs = JSON.parse(readFileSync(join(root, "catalogs.json"), "utf8")).catalogs;
    planned = catalogs.find((c) => c.id === "ow")?.planned ?? [];
  } catch (error) {
    return [{ label: "/work planned ids", file: "catalogs.json", value: null, pass: false, detail: `unreadable (${error.message})` }];
  }
  // Every `file` below is a file, not a directory: tests/release-surfaces.test.js
  // copies each named file into a scratch root to replay the probes there.
  const out = [{ label: "/work planned ids", file: "catalogs.json", value: planned.join(", ") || "none", pass: true, detail: "" }];
  const pageHits = planned.filter((id) => existsSync(join(pagesDir, `${id}.astro`)) || existsSync(join(root, "site/dist/work", id, "index.html")));
  out.push({
    label: "/work has no page for a planned ow- skill",
    file: "site/src/pages/work/index.astro",
    value: pageHits.length ? pageHits.join(", ") : `none of ${planned.length} planned`,
    pass: pageHits.length === 0,
    detail: `planned skills with a page: ${pageHits.join(", ")}`,
  });
  // The intro-copy map is the one hand-written source of ids under /work.
  const dataFile = join(root, "site/src/data/work.ts");
  const dataText = existsSync(dataFile) ? readFileSync(dataFile, "utf8") : "";
  const dataHits = planned.filter((id) => new RegExp(`["'\`]${id}["'\`]`).test(dataText));
  out.push({
    label: "/work intro copy names no planned ow- skill",
    file: "site/src/data/work.ts",
    value: dataHits.length ? dataHits.join(", ") : "clean",
    pass: dataHits.length === 0,
    detail: `planned skills named: ${dataHits.join(", ")}`,
  });
  const dist = join(root, "site/dist/work");
  if (existsSync(dist)) {
    const hits = [];
    for (const file of walk(dist).filter((f) => f.endsWith(".html"))) {
      const text = readFileSync(file, "utf8");
      for (const id of planned) if (new RegExp(`\\b${id}\\b`).test(text)) hits.push(`${relative(root, file)}: ${id}`);
    }
    out.push({
      label: "built /work HTML names no planned ow- skill",
      file: "site/dist/work/index.html",
      value: hits.length ? `${hits.length} hit(s)` : "clean",
      pass: hits.length === 0,
      detail: hits.slice(0, 5).join("; "),
    });
  }
  return out;
}

function semverAt(re) {
  return (text) => {
    const m = text.match(re);
    if (!m) throw new Error("pattern not found");
    return m[1];
  };
}

// Orders two "vX.Y" release lines; negative when a is older than b.
function compareLine(a, b) {
  const [a1, a2] = a.slice(1).split(".").map(Number);
  const [b1, b2] = b.slice(1).split(".").map(Number);
  return a1 - b1 || a2 - b2;
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const { ok, expected, results, errors } = checkReleaseSurfaces();
  console.log("RELEASE SURFACE CHECK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const r of results) {
    console.log(`  ${r.error ? "✗" : (r.pass ?? r.value === (r.expected ?? expected)) ? "✓" : "✗"} ${r.label}: ${r.value ?? `(${r.error})`}`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (ok) {
    console.log(`✓ all live-claim surfaces agree on ${expected}`);
    process.exit(0);
  }
  console.error(`✗ release-surface drift:\n  - ${errors.join("\n  - ")}`);
  console.error("\nFix per skills/oc-release-ops/references/site-release-surfaces.md (live-claim surfaces L1–L10).");
  process.exit(1);
}
