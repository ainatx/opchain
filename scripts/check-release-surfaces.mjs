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

import { readFileSync, existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
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
      [
        "README leading version",
        "README.md",
        (text) => {
          const m = text.match(/^\> \*\*Opchain (\d+\.\d+\.\d+)\.\*\*/m);
          if (!m) throw new Error("pattern not found");
          return m[1];
        },
      ],
      [
        "plugin README leading version",
        "plugins/opchain/README.md",
        (text) => {
          const m = text.match(/^\> \*\*Opchain (\d+\.\d+\.\d+)\.\*\*/m);
          if (!m) throw new Error("pattern not found");
          return m[1];
        },
      ],
      [
        "mirror README leading version",
        "mirror/README.md",
        (text) => {
          const m = text.match(/^> Opchain (\d+\.\d+\.\d+)/m);
          if (!m) throw new Error("pattern not found");
          return m[1];
        },
      ],
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

  return { ok: errors.length === 0, expected, releaseVersion, results, errors };
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const { ok, expected, results, errors } = checkReleaseSurfaces();
  console.log("RELEASE SURFACE CHECK");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const r of results) {
    console.log(`  ${r.error ? "✗" : r.value === (r.expected ?? expected) ? "✓" : "✗"} ${r.label}: ${r.value ?? `(${r.error})`}`);
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
