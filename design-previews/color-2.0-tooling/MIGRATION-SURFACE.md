# 2.0 recolour — migration surface

Every colour literal in the site that bypasses the token layer (raw hex / rgb(a), a 1.x brand constant like `var(--ember)` or `var(--obsidian)`, or a stale `var(--x, #hex)` fallback), found by a first pass and then re-checked file-by-file by an adversarial verifier. Paths are relative to the worktree root; line numbers are against the current tree. 35 files were catalogued (34 carry at least one literal; `site/src/data/walkthroughs/runtime-pm-loop.ts` is clean). Total: **1,848 literals** — 356 tokenize, 14 light-precomputed, 22 generated-asset, 78 fixed, 1,378 diagram-deferred. Three-quarters of the surface (1,378) is the two architecture diagrams and is replaced wholesale by the architecture workstream; the recolour proper has to touch **392 literals in 30 files**. The single most important finding: the literals that would visibly keep the site orange after the swap are not scattered hex — they are 12 light-mode `var(--ember)` overrides (the "B-10" AA workarounds in `Button.astro`, `Header.astro` ×3, `ConsentBanner.astro`, `WelcomePopup.astro` ×2, `RoadmapForm.astro`, `index.astro` ×2, `DesktopWorkbench.astro`) plus 25 hard-coded obsidian labels on accent fills across 13 files. Both patterns collapse onto the 2.0 sheet's `--on-accent` token (light `--accent` #066a34 on `--on-accent` #ffffff is 6.73:1, so every B-10 override becomes a deletion, not a retint). The first pass invented names for that role four different ways (`--accent-fg`, `--accent-text`, `--accent-ink`, `--accent-contrast`); none exist. Use `--on-accent`.

## By classification

### tokenize — 356

Replace the literal with the token named below (or delete the rule where the row says so). All names are checked against `site/src/styles/tokens.css` and `design-previews/color-2.0-tooling/tokens-2.0.css`; where the 2.0 sheet has no token for the role the row says so explicitly. Ordered by file, files by tokenize count descending.

| file | line | value | property | suggested token / action |
|---|---|---|---|---|
| site/src/pages/architecture.astro | 1309 | `#14B8A6` | inline `style` color, `.cards` prose span | `var(--specialist)` (verifier: HTML prose below the diagram, not diagram markup) |
| site/src/pages/architecture.astro | 1310 | `#14B8A6` | inline `style` color, `.cards` prose span | `var(--specialist)` |
| site/src/pages/architecture.astro | 1311 | `#14B8A6` | inline `style` color, `.cards` prose span | `var(--specialist)` |
| site/src/pages/architecture.astro | 1325 | `#a78bfa` | inline `style` color, Tri-Agent card span | `var(--orchestrator)` |
| site/src/pages/architecture.astro | 1326 | `#a78bfa` | inline `style` color, Tri-Agent card span | `var(--orchestrator)` |
| site/src/pages/architecture.astro | 1357 | `var(--ember)` | inline `style` background, `.card-dot` | `var(--accent)` |
| site/src/pages/architecture.astro | 1370 | `var(--sand)` | inline `style` background, `.card-dot` | `var(--muted)` |
| site/src/pages/architecture.astro | 1926 | `#1c1710` | `--obsidian` (.arch-v2 local alias) | `var(--bg)` — delete the whole local alias block once consumers below are tokenized |
| site/src/pages/architecture.astro | 1927 | `#2a2218` | `--forge` (local alias) | `var(--surface)` |
| site/src/pages/architecture.astro | 1928 | `#5a5040` | `--slag` (local alias) | `var(--border)` (text uses → `var(--subtle)`) |
| site/src/pages/architecture.astro | 1929 | `#c4b89e` | `--sand` (local alias) | `var(--muted)` |
| site/src/pages/architecture.astro | 1930 | `#e8dfd0` | `--linen` (local alias) | `var(--text)` |
| site/src/pages/architecture.astro | 1931 | `#f6f0e8` | `--parchment` (local alias) | `var(--text)` |
| site/src/pages/architecture.astro | 1934 | `#e05c18` | `--ember` (local alias) | `var(--accent)` |
| site/src/pages/architecture.astro | 1935 | `#b84510` | `--char` (local alias) | `var(--accent-hover)` |
| site/src/pages/architecture.astro | 1936 | `rgba(224,92,24,.10)` | `--ember-dim` (local alias) | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 1939 | `#0D9488` | `--success` (local alias) | `var(--success)` |
| site/src/pages/architecture.astro | 1940 | `#f59e0b` | `--warning` (local alias) | `var(--warning)` |
| site/src/pages/architecture.astro | 1941 | `#ef4444` | `--error` (local alias) | `var(--danger)` |
| site/src/pages/architecture.astro | 1942 | `#0EA5E9` | `--advisor` (local alias) | `var(--advisor)` |
| site/src/pages/architecture.astro | 1943 | `#F43F5E` | `--auditor` (local alias) | `var(--audit-gate)` |
| site/src/pages/architecture.astro | 1944 | `#a78bfa` | `--ai` (local alias) | `var(--orchestrator)` (verifier: `--specialist` is teal; #A78BFA is the orchestrator token) |
| site/src/pages/architecture.astro | 1945 | `#a3e635` | `--inst` (local alias) | no site token — keep as a local `--inst`, re-derive hue against Slate |
| site/src/pages/architecture.astro | 1946 | `#e879f9` | `--sig` (local alias) | no site token — keep as a local `--sig`, re-derive hue against Slate |
| site/src/pages/architecture.astro | 1947 | `#38bdf8` | `--docs` (local alias) | `var(--info)` |
| site/src/pages/architecture.astro | 1948 | `rgba(56,189,248,.08)` | `--docs-dim` (local alias) | `var(--info-dim)` |
| site/src/pages/architecture.astro | 1949 | `rgba(56,189,248,.16)` | `--docs-mid` (local alias) | `color-mix(in srgb, var(--info) 16%, transparent)` |
| site/src/pages/architecture.astro | 1950 | `rgba(163,230,53,.08)` | `--inst-dim` (local alias) | `color-mix` on local `--inst` |
| site/src/pages/architecture.astro | 1951 | `rgba(163,230,53,.16)` | `--inst-mid` (local alias) | `color-mix` on local `--inst` |
| site/src/pages/architecture.astro | 1961 | `var(--obsidian)` | background, `.arch-v2` | `var(--bg)` |
| site/src/pages/architecture.astro | 1962 | `var(--linen)` | color, `.arch-v2` | `var(--text)` |
| site/src/pages/architecture.astro | 1984 | `var(--ember)` | color, `.header-eyebrow` | `var(--accent)` |
| site/src/pages/architecture.astro | 1988 | `var(--ember)` | color, `.header-eyebrow::before` | `var(--accent)` |
| site/src/pages/architecture.astro | 1993 | `var(--linen)` | color, h1 | `var(--text)` |
| site/src/pages/architecture.astro | 1995 | `var(--sand)` | color, h1 sub | `var(--muted)` |
| site/src/pages/architecture.astro | 1998 | `var(--forge)` | background, `.diagram-container` | `var(--surface)` |
| site/src/pages/architecture.astro | 2000 | `var(--slag)` | border, `.diagram-container` | `var(--border)` |
| site/src/pages/architecture.astro | 2006 | `rgba(224,92,24,.3)` | border, `.bands-wrap` | `var(--glow)` |
| site/src/pages/architecture.astro | 2010 | `rgba(224,92,24,.015)` | background, `.bands-wrap` tint | `color-mix(in srgb, var(--accent) 2%, transparent)` |
| site/src/pages/architecture.astro | 2019 | `var(--ember)` | color, `.cp-zone-badge` | `var(--accent)` |
| site/src/pages/architecture.astro | 2021 | `var(--ember-dim)` | background, `.cp-zone-badge` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2022 | `rgba(224,92,24,.5)` | border, `.cp-zone-badge` | `var(--glow)` |
| site/src/pages/architecture.astro | 2027 | `var(--ember)` | outline, `.cp-zone-badge:focus` | `var(--accent)` |
| site/src/pages/architecture.astro | 2030 | `var(--ember)` | color, `.cp-zone-title` | `var(--accent)` |
| site/src/pages/architecture.astro | 2033 | `var(--slag)` | color, `.cp-zone-title` dim | `var(--subtle)` |
| site/src/pages/architecture.astro | 2047 | `rgba(224,92,24,.04)` | background, `.foundation-pill` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2048 | `rgba(224,92,24,.5)` | border, `.foundation-pill` | `var(--glow)` |
| site/src/pages/architecture.astro | 2049 | `rgba(224,92,24,.18)` | box-shadow, `.foundation-pill` | `var(--glow)` |
| site/src/pages/architecture.astro | 2052 | `var(--ember)` | color, `.fp-tag` | `var(--accent)` |
| site/src/pages/architecture.astro | 2055 | `var(--ember-dim)` | background, `.fp-tag` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2055 | `rgba(224,92,24,.5)` | border, `.fp-tag` | `var(--glow)` |
| site/src/pages/architecture.astro | 2059 | `var(--linen)` | color, `.fp-name` | `var(--text)` |
| site/src/pages/architecture.astro | 2062 | `var(--sand)` | color, `.fp-desc` | `var(--muted)` |
| site/src/pages/architecture.astro | 2072 | `rgba(224,92,24,.10)` | background, `.foundation-pill-trigger:focus-visible` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2073 | `rgba(224,92,24,.7)` | border-color, `.foundation-pill-trigger:focus-visible` | `var(--accent)` |
| site/src/pages/architecture.astro | 2074 | `rgba(224,92,24,.32)` | box-shadow, `.foundation-pill-trigger:focus-visible` | `var(--glow)` |
| site/src/pages/architecture.astro | 2078 | `var(--ember)` | outline, `.foundation-pill-trigger:focus-visible` | `var(--accent)` |
| site/src/pages/architecture.astro | 2108 | `var(--ember)` | outline, `.band-label:focus` | `var(--accent)` |
| site/src/pages/architecture.astro | 2170 | `var(--linen)` | color, `.bd-title` | `var(--text)` |
| site/src/pages/architecture.astro | 2174 | `var(--sand)` | color, `.bd-desc` | `var(--muted)` |
| site/src/pages/architecture.astro | 2178 | `rgba(196,184,158,.12)` | border, `.bd-meta` | `color-mix(in srgb, var(--muted) 12%, transparent)` |
| site/src/pages/architecture.astro | 2185 | `var(--slag)` | color, `.bd-meta-label` | `var(--subtle)` |
| site/src/pages/architecture.astro | 2195 | `var(--ember)` | color, `.bd-cp` | `var(--accent)` |
| site/src/pages/architecture.astro | 2200 | `var(--ember-dim)` | background, `.bd-cp-badge` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2200 | `rgba(224,92,24,.5)` | border, `.bd-cp-badge` | `var(--glow)` |
| site/src/pages/architecture.astro | 2216 | `var(--ember)` | color, `.band-arrow` | `var(--accent)` |
| site/src/pages/architecture.astro | 2220 | `rgba(224,92,24,.08)` | background gradient, `.pack-fabric-band` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2220 | `rgba(28,23,16,.4)` | background gradient, `.pack-fabric-band` | `color-mix(in srgb, var(--bg) 40%, transparent)` |
| site/src/pages/architecture.astro | 2221 | `rgba(224,92,24,.5)` | border, `.pack-fabric-band` | `var(--glow)` |
| site/src/pages/architecture.astro | 2224 | `rgba(224,92,24,.08)` | box-shadow, `.pack-fabric-band` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2234 | `var(--ember)` | color, `.pf-eyebrow` | `var(--accent)` |
| site/src/pages/architecture.astro | 2239 | `var(--linen)` | color, `.pf-title` | `var(--text)` |
| site/src/pages/architecture.astro | 2245 | `var(--sand)` | color, `.pf-sub` | `var(--muted)` |
| site/src/pages/architecture.astro | 2250 | `var(--linen)` | color, `.pf-sub code` | `var(--text)` |
| site/src/pages/architecture.astro | 2251 | `rgba(196,184,158,.08)` | background, `.pf-sub code` | `color-mix(in srgb, var(--muted) 8%, transparent)` |
| site/src/pages/architecture.astro | 2254 | `var(--linen)` | color, `.pf-sub code` | `var(--text)` |
| site/src/pages/architecture.astro | 2259 | `rgba(224,92,24,.18)` | background, `.pf-badge` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2260 | `rgba(224,92,24,.7)` | border, `.pf-badge` | `var(--accent)` |
| site/src/pages/architecture.astro | 2261 | `var(--ember)` | color, `.pf-badge` | `var(--accent)` |
| site/src/pages/architecture.astro | 2270 | `rgba(224,92,24,.30)` | background, `.pf-badge:focus-visible` | `var(--glow)` |
| site/src/pages/architecture.astro | 2271 | `rgba(224,92,24,.9)` | border-color, `.pf-badge:focus-visible` | `var(--accent)` |
| site/src/pages/architecture.astro | 2272 | `rgba(224,92,24,.35)` | box-shadow, `.pf-badge:focus-visible` | `var(--glow)` |
| site/src/pages/architecture.astro | 2276 | `var(--ember)` | outline, `.pf-badge:focus-visible` | `var(--accent)` |
| site/src/pages/architecture.astro | 2280 | `var(--ember)` | background, `.pf-badge-dot` | `var(--accent)` |
| site/src/pages/architecture.astro | 2281 | `var(--ember)` | box-shadow, `.pf-badge-dot` glow | `var(--glow)` |
| site/src/pages/architecture.astro | 2291 | `rgba(28,23,16,.55)` | background, `.pf-cell` | `color-mix(in srgb, var(--bg) 55%, transparent)` |
| site/src/pages/architecture.astro | 2292 | `rgba(196,184,158,.22)` | border, `.pf-cell` | `var(--border)` |
| site/src/pages/architecture.astro | 2303 | `var(--sand)` | color, `.pf-cell-kind` | `var(--muted)` |
| site/src/pages/architecture.astro | 2308 | `var(--linen)` | color, `.pf-cell-count` | `var(--text)` |
| site/src/pages/architecture.astro | 2317 | `rgba(196,184,158,.08)` | background, `.pf-chip` | `color-mix(in srgb, var(--muted) 8%, transparent)` |
| site/src/pages/architecture.astro | 2318 | `rgba(196,184,158,.25)` | border, `.pf-chip` | `var(--border)` |
| site/src/pages/architecture.astro | 2319 | `var(--sand)` | color, `.pf-chip` | `var(--muted)` |
| site/src/pages/architecture.astro | 2322 | `#0EA5E9` | color, `.pf-lang .pf-cell-count` | `var(--advisor)` |
| site/src/pages/architecture.astro | 2324 | `rgba(14,165,233,.10)` | background, `.pf-lang .pf-chip` | `color-mix(in srgb, var(--advisor) 10%, transparent)` |
| site/src/pages/architecture.astro | 2324 | `rgba(14,165,233,.35)` | border-color, `.pf-lang .pf-chip` | `color-mix(in srgb, var(--advisor) 35%, transparent)` |
| site/src/pages/architecture.astro | 2324 | `#0EA5E9` | color, `.pf-lang .pf-chip` | `var(--advisor)` |
| site/src/pages/architecture.astro | 2326 | `#f59e0b` | color, `.pf-fw .pf-cell-count` | `var(--warning)` |
| site/src/pages/architecture.astro | 2328 | `rgba(245,158,11,.10)` | background, `.pf-fw .pf-chip` | `var(--warning-dim)` |
| site/src/pages/architecture.astro | 2328 | `rgba(245,158,11,.35)` | border-color, `.pf-fw .pf-chip` | `color-mix(in srgb, var(--warning) 35%, transparent)` |
| site/src/pages/architecture.astro | 2328 | `#f59e0b` | color, `.pf-fw .pf-chip` | `var(--warning)` |
| site/src/pages/architecture.astro | 2330 | `#A78BFA` | color, `.pf-mob .pf-cell-count` | `var(--orchestrator)` (verifier) |
| site/src/pages/architecture.astro | 2332 | `rgba(167,139,250,.10)` | background, `.pf-mob .pf-chip` | `color-mix(in srgb, var(--orchestrator) 10%, transparent)` |
| site/src/pages/architecture.astro | 2332 | `rgba(167,139,250,.35)` | border-color, `.pf-mob .pf-chip` | `color-mix(in srgb, var(--orchestrator) 35%, transparent)` |
| site/src/pages/architecture.astro | 2332 | `#A78BFA` | color, `.pf-mob .pf-chip` | `var(--orchestrator)` |
| site/src/pages/architecture.astro | 2334 | `#14B8A6` | color, `.pf-dep .pf-cell-count` | `var(--specialist)` (verifier: not `--success`, which is #10B981) |
| site/src/pages/architecture.astro | 2336 | `rgba(20,184,166,.10)` | background, `.pf-dep .pf-chip` | `color-mix(in srgb, var(--specialist) 10%, transparent)` |
| site/src/pages/architecture.astro | 2336 | `rgba(20,184,166,.35)` | border-color, `.pf-dep .pf-chip` | `color-mix(in srgb, var(--specialist) 35%, transparent)` |
| site/src/pages/architecture.astro | 2336 | `#14B8A6` | color, `.pf-dep .pf-chip` | `var(--specialist)` |
| site/src/pages/architecture.astro | 2340 | `#EC4899` | color, `.pf-vec .pf-cell-count` | no site token — local `--vec`, re-derive |
| site/src/pages/architecture.astro | 2342 | `rgba(236,72,153,.10)` | background, `.pf-vec .pf-chip` | `color-mix` on local `--vec` |
| site/src/pages/architecture.astro | 2342 | `rgba(236,72,153,.35)` | border-color, `.pf-vec .pf-chip` | `color-mix` on local `--vec` |
| site/src/pages/architecture.astro | 2342 | `#EC4899` | color, `.pf-vec .pf-chip` | local `--vec` |
| site/src/pages/architecture.astro | 2483 | `rgba(224,92,24,.25)` | border, `.cp-grid-inner` | `var(--glow)` |
| site/src/pages/architecture.astro | 2485 | `rgba(28,23,16,.85)` | background, `.cp-grid-inner` | `color-mix(in srgb, var(--bg) 85%, transparent)` |
| site/src/pages/architecture.astro | 2489 | `var(--ember)` | color, `.cp-grid-title` | `var(--accent)` |
| site/src/pages/architecture.astro | 2502 | `var(--ember-dim)` | background, `.cp-grid-badge-icon` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2503 | `rgba(224,92,24,.6)` | border, `.cp-grid-badge-icon` | `var(--accent)` |
| site/src/pages/architecture.astro | 2504 | `var(--ember)` | color, `.cp-grid-badge-icon` | `var(--accent)` |
| site/src/pages/architecture.astro | 2508 | `var(--slag)` | color, `.cp-grid-badge-name` | `var(--subtle)` |
| site/src/pages/architecture.astro | 2520 | `rgba(224,92,24,.3)` | border, `.cpd-inner` | `var(--glow)` |
| site/src/pages/architecture.astro | 2522 | `rgba(28,23,16,.92)` | background, `.cpd-inner` | `color-mix(in srgb, var(--bg) 92%, transparent)` |
| site/src/pages/architecture.astro | 2536 | `var(--ember)` | background gradient, `.cpd-inner::before` | `var(--accent)` |
| site/src/pages/architecture.astro | 2536 | `var(--ember)` | background gradient, `.cpd-inner::before` | `var(--accent)` |
| site/src/pages/architecture.astro | 2539 | `var(--ember)` | color, `.cpd-inner::before` | `var(--accent)` |
| site/src/pages/architecture.astro | 2542 | `var(--ember)` | color, `.cpd-title` | `var(--accent)` |
| site/src/pages/architecture.astro | 2546 | `var(--sand)` | color, `.cpd-intro` | `var(--muted)` |
| site/src/pages/architecture.astro | 2549 | `var(--linen)` | color, `.cpd-intro code` | `var(--text)` |
| site/src/pages/architecture.astro | 2549 | `var(--ember-dim)` | background, `.cpd-intro code` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2549 | `rgba(224,92,24,.2)` | border, `.cpd-intro code` | `var(--glow)` |
| site/src/pages/architecture.astro | 2551 | `var(--ember)` | color, `.cpd-intro strong` | `var(--accent)` |
| site/src/pages/architecture.astro | 2552 | `var(--sand)` | color, `.cpd-intro` | `var(--muted)` |
| site/src/pages/architecture.astro | 2553 | `var(--linen)` | color, `.cpd-intro code` | `var(--text)` |
| site/src/pages/architecture.astro | 2553 | `var(--ember-dim)` | background, `.cpd-intro code` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2553 | `rgba(224,92,24,.2)` | border, `.cpd-intro code` | `var(--glow)` |
| site/src/pages/architecture.astro | 2555 | `rgba(224,92,24,.07)` | background, `.cpd-intro` callout | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2555 | `rgba(224,92,24,.18)` | border, `.cpd-intro` callout | `var(--glow)` |
| site/src/pages/architecture.astro | 2555 | `var(--linen)` | color, `.cpd-intro` callout | `var(--text)` |
| site/src/pages/architecture.astro | 2556 | `var(--ember)` | color, `.cpd-intro` callout strong | `var(--accent)` |
| site/src/pages/architecture.astro | 2558 | `var(--sand)` | color, `.cpd-json` | `var(--muted)` |
| site/src/pages/architecture.astro | 2558 | `var(--obsidian)` | background, `.cpd-json` | `var(--bg)` |
| site/src/pages/architecture.astro | 2559 | `rgba(224,92,24,.12)` | border, `.cpd-json` | `var(--accent-dim)` |
| site/src/pages/architecture.astro | 2562 | `var(--ember)` | color, `.cpd-json .k` | `var(--accent)` |
| site/src/pages/architecture.astro | 2564 | `var(--slag)` | color, `.cpd-json .c` | `var(--subtle)` |
| site/src/pages/architecture.astro | 2585 | `var(--slag)` | background, `.legend-divider` | `var(--border)` |
| site/src/pages/architecture.astro | 2591 | `var(--sand)` | color, `.legend-item` | `var(--muted)` |
| site/src/pages/architecture.astro | 2594 | `var(--ember)` | outline, `.legend-item:focus` | `var(--accent)` |
| site/src/pages/architecture.astro | 2601 | `rgba(20,184,166,.18)` | background, `.li-swatch-spine` | `color-mix(in srgb, var(--specialist) 18%, transparent)` (verifier) |
| site/src/pages/architecture.astro | 2602 | `#14B8A6` | border, `.li-swatch-spine` | `var(--specialist)` |
| site/src/pages/architecture.astro | 2603 | `#14B8A6` | color, `.li-swatch-spine` | `var(--specialist)` |
| site/src/pages/architecture.astro | 2620 | `rgba(28,23,16,.96)` | background, `.legend-card` | `color-mix(in srgb, var(--bg) 96%, transparent)` |
| site/src/pages/architecture.astro | 2621 | `var(--slag)` | border, `.legend-card` | `var(--border)` |
| site/src/pages/architecture.astro | 2625 | `var(--sand)` | color, `.legend-card` | `var(--muted)` |
| site/src/pages/architecture.astro | 2628 | `var(--linen)` | color, `.legend-card strong` | `var(--text)` |
| site/src/pages/architecture.astro | 2629 | `var(--slag)` | color, `.legend-card small` | `var(--subtle)` |
| site/src/pages/architecture.astro | 2636 | `var(--forge)` | background, `.card` | `var(--card)` |
| site/src/pages/architecture.astro | 2637 | `var(--slag)` | border, `.card` | `var(--border)` |
| site/src/pages/architecture.astro | 2643 | `var(--linen)` | color, `.card h2` | `var(--text)` |
| site/src/pages/architecture.astro | 2645 | `var(--sand)` | color, `.card ul` | `var(--muted)` |
| site/src/pages/architecture.astro | 2690 | `var(--linen)` | color, `.irail-title` | `var(--text)` |
| site/src/pages/architecture.astro | 2696 | `var(--obsidian)` | background, `.irail-anchor` | `var(--bg)` |
| site/src/pages/architecture.astro | 2701 | `var(--linen)` | color, `.irail-anchor` | `var(--text)` |
| site/src/pages/architecture.astro | 2702 | `var(--sand)` | color, `.irail-anchor` sub | `var(--muted)` |
| site/src/pages/architecture.astro | 2706 | `var(--ember)` | color, `.ia-cp` | `var(--accent)` |
| site/src/pages/architecture.astro | 2707 | `rgba(224,92,24,.6)` | border, `.ia-cp` | `var(--accent)` |
| site/src/pages/architecture.astro | 2707 | `var(--obsidian)` | background, `.ia-cp` | `var(--bg)` |
| site/src/pages/architecture.astro | 2720 | `rgba(196,184,158,.12)` | border-bottom, `.irow` | `var(--border)` |
| site/src/pages/architecture.astro | 2725 | `var(--sand)` | color, `.irow.irail-h` | `var(--muted)` |
| site/src/pages/architecture.astro | 2725 | `rgba(163,230,53,.3)` | border-bottom, `.irow.irail-h` | `color-mix` on local `--inst` |
| site/src/pages/architecture.astro | 2732 | `var(--sand)` | color, `.irow.irail-h span` | `var(--muted)` |
| site/src/pages/architecture.astro | 2734 | `var(--sand)` | color, `.irow.irail-h span` | `var(--muted)` |
| site/src/pages/architecture.astro | 2737 | `var(--obsidian)` | background, `.ir-ord` | `var(--bg)` |
| site/src/pages/architecture.astro | 2740 | `var(--linen)` | color, `.ir-ord` | `var(--text)` |
| site/src/pages/architecture.astro | 2743 | `rgba(163,230,53,.12)` | background, `.ir-ord` active | `color-mix` on local `--inst` |
| site/src/pages/architecture.astro | 2745 | `var(--sand)` | color, `.ir-ord` | `var(--muted)` |
| site/src/pages/architecture.astro | 2767 | `var(--linen)` | color, `.qrail-title` | `var(--text)` |
| site/src/pages/architecture.astro | 2775 | `var(--obsidian)` | background, `.qrail-anchor` | `var(--bg)` |
| site/src/pages/index.astro | 257 | `var(--ember)` | color, `.intro-claim` | `var(--accent)` |
| site/src/pages/index.astro | 312 | `rgba(224, 92, 24, 0.18)` | box-shadow ring, `.release-bar-glow` | `color-mix(in srgb, var(--accent) 18%, transparent)` |
| site/src/pages/index.astro | 313 | `rgba(224, 92, 24, 0.4)` | box-shadow glow, `.release-bar-glow` | `color-mix(in srgb, var(--accent) 40%, transparent)` (stronger than `--glow`'s 14%) |
| site/src/pages/index.astro | 322 | `rgba(224, 92, 24, 0.18)` | box-shadow, `@keyframes release-bar-pulse` 0/100% | `color-mix(in srgb, var(--accent) 18%, transparent)` |
| site/src/pages/index.astro | 323 | `rgba(224, 92, 24, 0.35)` | box-shadow, `release-bar-pulse` 0/100% | `color-mix(in srgb, var(--accent) 35%, transparent)` |
| site/src/pages/index.astro | 327 | `rgba(224, 92, 24, 0.32)` | box-shadow, `release-bar-pulse` 50% | `color-mix(in srgb, var(--accent) 32%, transparent)` |
| site/src/pages/index.astro | 328 | `rgba(224, 92, 24, 0.55)` | box-shadow, `release-bar-pulse` 50% | `color-mix(in srgb, var(--accent) 55%, transparent)` |
| site/src/pages/index.astro | 360 | `var(--obsidian)` | color, `.rb-tag` text on accent fill | `var(--on-accent)` only (verifier: never `--bg`, which is cream in light mode) |
| site/src/pages/index.astro | 367 | `var(--ember)` | background, light-mode `.rb-tag` override | delete the override (B-10 workaround; 2.0 light accent passes AA) |
| site/src/pages/index.astro | 397 | `var(--obsidian)` | color, light-mode `.rb-text` | `var(--text)` — redundant, delete |
| site/src/pages/index.astro | 483 | `var(--ember-glow)` | radial-gradient, `.stage` bloom | `var(--accent-glow)` |
| site/src/pages/index.astro | 484 | `var(--ember-dim)` | radial-gradient, `.stage` wash | `var(--accent-dim)` |
| site/src/pages/index.astro | 485 | `#14100a` | linear-gradient stop, `.stage` top | `color-mix(in srgb, var(--bg) 85%, black)` — warm near-black, also unthemed in light mode today |
| site/src/pages/index.astro | 547 | `var(--obsidian)` | color, `.stage .btn-primary` | `var(--on-accent)` only (verifier) |
| site/src/pages/index.astro | 552 | `var(--ember)` | background, light-mode `.stage .btn-primary` | delete the override |
| site/src/pages/index.astro | 600 | `rgba(232, 223, 208, 0.22)` | background, `.dot-row .dot::before` | `color-mix(in srgb, var(--text) 22%, transparent)` |
| site/src/pages/index.astro | 615 | `var(--ember-dim)` | box-shadow inset ring, `.dot.active::before` | `var(--accent-dim)` |
| site/src/pages/index.astro | 616 | `var(--ember)` | box-shadow halo colour, `.dot.active::before` | `var(--accent)` (verifier: `--glow-sm` is a whole shadow value, only valid if the entire layer is replaced) |
| site/src/pages/index.astro | 624 | `var(--ember)` | conic-gradient, `.dot.active::after` | `var(--accent)` |
| site/src/pages/index.astro | 640 | `var(--ember)` | background, reduced-motion active dot | `var(--accent)` |
| site/src/pages/index.astro | 642 | `var(--ember-dim)` | box-shadow ring, reduced-motion active dot | `var(--accent-dim)` |
| site/src/pages/index.astro | 643 | `var(--ember)` | box-shadow halo colour, reduced-motion | `var(--accent)` (same caveat as 616) |
| site/src/pages/dashboard.astro | 169 | `#cbd5e1` | color, `.lede` (`--text-2` fallback — LIVE, token undefined) | `var(--text)`, drop fallback |
| site/src/pages/dashboard.astro | 174 | `#334155` | border, `.sample-banner` (`--border` fallback) | `var(--border)`, drop fallback |
| site/src/pages/dashboard.astro | 175 | `#14b8a6` | color-mix operand, `.sample-banner` (`--accent` fallback) | `var(--accent-dim)`, drop fallback |
| site/src/pages/dashboard.astro | 181 | `#94a3b8` | color, `.t-head` (`--text-3` fallback — LIVE) | `var(--muted)`, drop fallback |
| site/src/pages/dashboard.astro | 183 | `#94a3b8` | color, `.t-sub` (`--text-3` fallback — LIVE) | `var(--muted)` |
| site/src/pages/dashboard.astro | 187 | `#94a3b8` | color, `.note` (`--text-3` fallback — LIVE) | `var(--muted)` |
| site/src/pages/dashboard.astro | 192 | `#cbd5e1` | color, `.bar-label`/`.tier-label` (`--text-2` — LIVE) | `var(--text)` |
| site/src/pages/dashboard.astro | 193 | `#1e293b` | background, `.bar-track` (`--surface-2` — LIVE, shows in light mode) | `var(--surface)` |
| site/src/pages/dashboard.astro | 194 | `#14b8a6` | background, `.bar-fill` (`--accent` fallback) | `var(--accent)`, drop fallback |
| site/src/pages/dashboard.astro | 195 | `#cbd5e1` | color, `.bar-num` (`--text-2` — LIVE) | `var(--text)` |
| site/src/pages/dashboard.astro | 196 | `#38bdf8` | background, `.tier-haiku` | new categorical `--tier-haiku` (or `var(--info)`) |
| site/src/pages/dashboard.astro | 196 | `#14b8a6` | background, `.tier-sonnet` | new `--tier-sonnet` — must not be emerald-adjacent or it merges with the `--accent` `.bar-fill` |
| site/src/pages/dashboard.astro | 197 | `#a78bfa` | background, `.tier-opus` | new `--tier-opus` (or `var(--orchestrator)`) |
| site/src/pages/dashboard.astro | 197 | `#f472b6` | background, `.tier-fable` | new `--tier-fable` |
| site/src/pages/dashboard.astro | 203 | `#14b8a6` | background, `.spark-bar` (`--accent` fallback) | `var(--accent)`, drop fallback |
| site/src/pages/dashboard.astro | 204 | `#94a3b8` | color, `.spark-x` (`--text-3` — LIVE) | `var(--muted)` |
| site/src/pages/dashboard.astro | 209 | `#14b8a6` | color, `.r-cost` (`--accent` fallback) | `var(--accent)`, drop fallback |
| site/src/pages/dashboard.astro | 210 | `#94a3b8` | color, `.r-path` (`--text-3` — LIVE) | `var(--muted)` |
| site/src/pages/dashboard.astro | 211 | `#cbd5e1` | color, `.r-summary` (`--text-2` — LIVE) | `var(--text)` |
| site/src/pages/dashboard.astro | 213 | `#1e293b` | background, `.r-chip` (`--surface-2` — LIVE) | `var(--surface)` |
| site/src/pages/dashboard.astro | 213 | `#cbd5e1` | color, `.r-chip` (`--text-2` — LIVE) | `var(--text)` |
| site/src/pages/demo.astro | 271 | `rgba(255,255,255,0.03)` | background, modal TOC link hover | `color-mix(in srgb, var(--text) 4%, transparent)` |
| site/src/pages/demo.astro | 275 | `rgba(0, 0, 0, 0.18)` | background, modal TOC active band | `var(--accent-dim)` |
| site/src/pages/demo.astro | 300 | `var(--ember-glow)` | background-color, heading-flash keyframe 0% | `var(--accent-glow)` (verifier: not `--glow`, which is the 14% card halo) |
| site/src/pages/demo.astro | 300 | `var(--ember-dim)` | box-shadow, heading-flash keyframe 0% | `var(--accent-dim)` |
| site/src/pages/demo.astro | 314 | `var(--ember-dim)` | background-color, reduced-motion heading tint | `var(--accent-dim)` |
| site/src/pages/demo.astro | 465 | `var(--ember-dim)` | background, `.ocs-pill` active | `var(--accent-dim)` |
| site/src/pages/demo.astro | 473 | `#f5894d` | color, search group header (dark) | `var(--accent)` |
| site/src/pages/demo.astro | 487 | `var(--ember-dim)` | background, `.ocs-snip mark` | `var(--accent-dim)` |
| site/src/pages/demo.astro | 511 | `#f5894d` | color, facet group h4 (dark) | `var(--accent)` |
| site/src/pages/demo.astro | 518 | `rgba(255, 255, 255, 0.02)` | background, facet chip resting | `var(--card)` or `color-mix(in srgb, var(--text) 3%, transparent)` |
| site/src/pages/demo.astro | 523 | `var(--ember-dim)` | background, `.ocs-chip[aria-pressed=true]` | `var(--accent-dim)` |
| site/src/pages/demo.astro | 549 | `var(--ember-glow)` | background-color, deep-link flash keyframe 0% | `var(--accent-glow)` |
| site/src/pages/demo.astro | 549 | `var(--ember-dim)` | box-shadow, deep-link flash keyframe 0% | `var(--accent-dim)` |
| site/src/pages/demo.astro | 554 | `var(--ember-dim)` | background-color, reduced-motion deep-link tint | `var(--accent-dim)` |
| site/src/components/Header.astro | 493 | `var(--obsidian)` | color, `.nav-badge.new` on accent | `var(--on-accent)` |
| site/src/components/Header.astro | 495 | `rgba(20, 184, 166, 0.16)` | background, `.nav-badge.tool` | `var(--specialist-pill)` (verifier: `--specialist-dim` does not exist) |
| site/src/components/Header.astro | 508 | `var(--obsidian)` | color, `.nav-install` | `var(--on-accent)` |
| site/src/components/Header.astro | 521 | `var(--obsidian)` | color, `.nav-install:hover` | `var(--on-accent)` |
| site/src/components/Header.astro | 524 | `var(--ember)` | background, light-mode `.nav-install` (B-10) | delete the override; rewrite the comment on 523 with it |
| site/src/components/Header.astro | 597 | `var(--obsidian)` | color, `.pillet.new` | `var(--on-accent)` |
| site/src/components/Header.astro | 598 | `rgba(20,184,166,0.16)` | background, `.pillet.tool` | `var(--specialist-pill)` |
| site/src/components/Header.astro | 599 | `rgba(224,92,24,0.4)` | border, `.pillet.count` | `color-mix(in srgb, var(--accent) 40%, transparent)` |
| site/src/components/Header.astro | 735 | `var(--ember)` | color, light-mode `.util-feedback:hover` | `var(--accent)` (light scope) |
| site/src/components/Header.astro | 735 | `var(--ember)` | border-color, light-mode `.util-feedback:hover` | `var(--accent)` (light scope) |
| site/src/components/Header.astro | 826 | `var(--obsidian)` | color, `.nav-drawer-primary` | `var(--on-accent)` |
| site/src/components/Header.astro | 835 | `var(--ember)` | background, light-mode `.nav-drawer-primary` (B-10) | delete the override |
| site/src/components/MobileWorkbench.astro | 402 | `#f5894d` | color, `.mw-empty-eyebrow` | `var(--accent)` |
| site/src/components/MobileWorkbench.astro | 409 | `#993505` | color, light-mode `.mw-empty-eyebrow` | delete the override once 402 is tokenized |
| site/src/components/MobileWorkbench.astro | 449 | `rgba(255, 255, 255, 0.02)` | background, `.mw-skill-pill` (on `--card`, not terminal) | `color-mix(in srgb, var(--text) 3%, transparent)` |
| site/src/components/MobileWorkbench.astro | 492 | `var(--ember-dim)` | background, `.mw-scn-card[aria-pressed=true]` | `var(--accent-dim)` |
| site/src/components/MobileWorkbench.astro | 500 | `#f5894d` | color, `.mw-scn-num` | `var(--accent)` |
| site/src/components/MobileWorkbench.astro | 507 | `#993505` | color, light-mode `.mw-scn-num` | delete the override |
| site/src/components/MobileWorkbench.astro | 543 | `#f5894d` | color, `.mw-stream-eyebrow` | `var(--accent)` |
| site/src/components/MobileWorkbench.astro | 550 | `#993505` | color, light-mode `.mw-stream-eyebrow` | delete the override |
| site/src/components/MobileWorkbench.astro | 810 | `var(--ember-dim)` | background, `.mw-output-row` hover/focus | `var(--accent-dim)` |
| site/src/components/MobileWorkbench.astro | 827 | `#f5894d` | color, `.mw-insp-eyebrow` | `var(--accent)` |
| site/src/components/MobileWorkbench.astro | 834 | `#993505` | color, light-mode `.mw-insp-eyebrow` | delete the override |
| site/src/components/DesktopWorkbench.astro | 563 | `var(--obsidian)` | color, `.tree-folder.is-open` on accent fill | `var(--on-accent)` |
| site/src/components/DesktopWorkbench.astro | 567 | `var(--ember)` | background, light-mode open tree folder | delete the override (redundant once `--accent` is theme-aware) |
| site/src/components/DesktopWorkbench.astro | 571 | `var(--obsidian)` | color, open-folder glyphs | `var(--on-accent)` |
| site/src/components/DesktopWorkbench.astro | 702 | `#f5894d` | color, `.editor-prompt-eyebrow` | `var(--accent)` |
| site/src/components/DesktopWorkbench.astro | 728 | `#f5894d` | color, `.scenario-num` | `var(--accent)` |
| site/src/components/DesktopWorkbench.astro | 768 | `#f5894d` | color, `.col-head` | `var(--accent)` |
| site/src/components/DesktopWorkbench.astro | 822 | `var(--ember-dim)` | background, `.output-row:hover` | `var(--accent-dim)` |
| site/src/components/DesktopWorkbench.astro | 886 | `var(--ember-dim)` | background, `.play-btn:hover` | `var(--accent-dim)` |
| site/src/components/DesktopWorkbench.astro | 1117 | `#f5894d` | color, `.ip-eyebrow` | `var(--accent)` |
| site/src/components/DesktopWorkbench.astro | 1148 | `#f5894d` | color, `.ip-section-head` | `var(--accent)` |
| site/src/pages/pipeline-builder.astro | 304 | `var(--dim)` | color (undefined token, renders `inherit`) | `var(--subtle)` — verifier-found; `--dim` is defined nowhere |
| site/src/pages/pipeline-builder.astro | 312 | `#0D9488` | color, `var(--success)` fallback | `var(--success)`, drop fallback |
| site/src/pages/pipeline-builder.astro | 418 | `#1c1710` | color, `.next` button on accent | `var(--on-accent)` |
| site/src/pages/pipeline-builder.astro | 487 | `var(--obsidian)` | background, `.codeblock` | see CodeBlock decision (§Order of work) — `var(--slate)` like-for-like or `var(--bg)` |
| site/src/pages/pipeline-builder.astro | 488 | `var(--linen)` | color, `.codeblock` | `var(--frost)` like-for-like or `var(--text)` |
| site/src/pages/pipeline-builder.astro | 489 | `var(--slag)` | border, `.codeblock` | `var(--gunmetal)` like-for-like or `var(--border)` |
| site/src/pages/pipeline-builder.astro | 528 | `#1c1710` | color, `.download-btn` on accent | `var(--on-accent)` |
| site/src/pages/pipeline-builder.astro | 570 | `#1c1710` | color, `.cta-primary` on accent | `var(--on-accent)` |
| site/src/pages/pipeline-builder.astro | 952 | `#0D9488` | JS inline `color: var(--success, #0D9488)` | `var(--success)`, drop fallback |
| site/src/pages/pipeline-builder.astro | 953 | `#f59e0b` | JS inline `color: var(--in-progress, #f59e0b)` warn state | `var(--warning)`, drop fallback (amber must not survive) |
| site/src/styles/global.css | 36 | `var(--obsidian)` | `--color-obsidian` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 37 | `var(--forge)` | `--color-forge` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 38 | `var(--slag)` | `--color-slag` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 39 | `var(--sand)` | `--color-sand` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 40 | `var(--linen)` | `--color-linen` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 41 | `var(--parchment)` | `--color-parchment` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 42 | `var(--ember)` | `--color-ember` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 43 | `var(--char)` | `--color-char` (@theme inline, no consumer) | remove |
| site/src/styles/global.css | 123 | `var(--obsidian)` | color, `::selection` on accent bg | `var(--on-accent)` |
| site/src/pages/styleguide.astro | 42 | `#1c1710` | `brand[]` hex → inline style + label | render chip from `var(--obsidian)`; label from new sheet |
| site/src/pages/styleguide.astro | 43 | `#2a2218` | `brand[]` hex | render from `var(--forge)` |
| site/src/pages/styleguide.astro | 44 | `#5a5040` | `brand[]` hex | render from `var(--slag)` |
| site/src/pages/styleguide.astro | 45 | `#c4b89e` | `brand[]` hex | render from `var(--sand)` |
| site/src/pages/styleguide.astro | 46 | `#e8dfd0` | `brand[]` hex | render from `var(--linen)` |
| site/src/pages/styleguide.astro | 47 | `#f6f0e8` | `brand[]` hex | render from `var(--parchment)` |
| site/src/pages/styleguide.astro | 48 | `#e05c18` | `brand[]` hex (old accent) | render from `var(--ember)` (aliased to the new accent) |
| site/src/pages/styleguide.astro | 49 | `#b84510` | `brand[]` hex (old accent-hover) | render from `var(--char)` |
| site/src/pages/styleguide.astro | 129 | ``style={`background: ${c.hex};`}`` | template interpolation | ``style={`background: var(${c.token});`}`` — verifier-found; the array rows above only matter through this line |
| site/src/pages/security.astro | 244 | `var(--obsidian)` | background, `.codeblock pre` | CodeBlock decision — `var(--slate)` or `var(--bg)` |
| site/src/pages/security.astro | 245 | `var(--linen)` | color, `.codeblock pre` | `var(--frost)` or `var(--text)` |
| site/src/pages/security.astro | 246 | `var(--slag)` | border, `.codeblock` | `var(--gunmetal)` or `var(--border)` |
| site/src/pages/security.astro | 297 | `var(--ember)` | background, `.sec-cta-btn` | `var(--accent)` |
| site/src/pages/security.astro | 298 | `var(--obsidian)` | color, `.sec-cta-btn` | `var(--on-accent)` |
| site/src/pages/security.astro | 299 | `var(--ember)` | border, `.sec-cta-btn` | `var(--accent)` |
| site/src/pages/security.astro | 309 | `var(--parchment)` | color, `.sec-cta-btn:hover` | `var(--on-accent)` (stop flipping contrast direction on hover) |
| site/src/components/Logo.astro | 25 | `#5a5040` | stroke, `var(--logo-spine)` fallback | refresh fallback to 2.0 dark `--subtle` |
| site/src/components/Logo.astro | 29 | `#e8dfd0` | stroke, `var(--logo-stroke)` fallback | refresh fallback to 2.0 dark `--text` |
| site/src/components/Logo.astro | 33 | `#e8dfd0` | stroke, `var(--logo-stroke)` fallback | refresh fallback |
| site/src/components/Logo.astro | 37 | `#e05c18` | fill, `var(--logo-filled)` fallback | refresh fallback to 2.0 `--accent` (literal Ember today) |
| site/src/components/Logo.astro | 39 | `#e8dfd0` | fill, `var(--logo-stroke)` fallback | refresh fallback |
| site/src/components/Logo.astro | 40 | `#e8dfd0` | fill, `var(--logo-stroke)` fallback | refresh fallback |
| site/src/components/Logo.astro | 41 | `#1c1710` | fill, `var(--logo-dot-dark)` fallback | refresh fallback to 2.0 dark `--bg` |
| site/src/pages/status.astro | 142 | `#0D9488` | background, `var(--success)` fallback | `var(--success)`, drop fallback |
| site/src/pages/status.astro | 143 | `#0D9488` | box-shadow color-mix, `--success` fallback | `var(--success-dim)` |
| site/src/pages/status.astro | 146 | `#f59e0b` | background, `var(--warning)` fallback | `var(--warning)`, drop fallback |
| site/src/pages/status.astro | 147 | `#f59e0b` | box-shadow color-mix, `--warning` fallback | `var(--warning-dim)` |
| site/src/pages/status.astro | 150 | `#F43F5E` | background, `var(--danger)` fallback | `var(--danger)`, drop fallback |
| site/src/pages/status.astro | 151 | `#F43F5E` | box-shadow color-mix, `--danger` fallback | `var(--danger-dim)` |
| site/src/components/WelcomePopup.astro | 158 | `#f5894d` | color, `.welcome-eyebrow` | `var(--accent)` (verify 4.5:1 on 2.0 dark `--surface`) |
| site/src/components/WelcomePopup.astro | 164 | `#993505` | color, light-mode `.welcome-eyebrow` | `var(--accent-hover)` or delete override |
| site/src/components/WelcomePopup.astro | 239 | `#1c1710` | color, `.welcome-btn` on accent | `var(--on-accent)` |
| site/src/components/WelcomePopup.astro | 251 | `var(--ember)` | background, light-mode `.welcome-btn` (B-10) | delete the override; remove the 248–249 comment with it |
| site/src/components/WelcomePopup.astro | 252 | `var(--ember)` | border-color, light-mode `.welcome-btn` | delete with 251 |
| site/src/pages/changelog.astro | 1290 | `#b29adf` | `--cl-violet` (dark) | `var(--tertiary)` (verifier: `--planned` does not exist; tokens-2.0.css:65) |
| site/src/pages/changelog.astro | 1291 | `rgba(178, 154, 223, 0.14)` | `--cl-violet-dim` (dark) | `var(--tertiary-dim)` |
| site/src/pages/changelog.astro | 1294 | `#6d28d9` | `--cl-violet` (light override) | delete override; `--tertiary` carries its own light value (#7b428c) |
| site/src/pages/changelog.astro | 1295 | `rgba(109, 40, 217, 0.10)` | `--cl-violet-dim` (light override) | delete override; `--tertiary-dim` light value exists |
| site/src/pages/showcase.astro | 392 | `#1c1710` | color, `.submit-btn` on accent | `var(--on-accent)` (verifier: not a new `--accent-ink`) |
| site/src/pages/showcase.astro | 461 | `#f59e0b` | JS inline `var(--in-progress, #f59e0b)`, HTTP-error status | `var(--danger)`, drop fallback (verifier: error state, not in-progress) |
| site/src/pages/showcase.astro | 465 | `#0D9488` | JS inline `var(--success, #0D9488)` | `var(--success)`, drop fallback |
| site/src/pages/showcase.astro | 469 | `#f59e0b` | JS inline `var(--in-progress, #f59e0b)`, network-error status | `var(--danger)`, drop fallback |
| site/src/components/ui/CodeBlock.astro | 16 | `var(--obsidian)` | background, `.codeblock pre` | `var(--slate)` like-for-like (always-dark) or `var(--bg)` (theme-following) — decision, see §Order of work; never `--surface` |
| site/src/components/ui/CodeBlock.astro | 17 | `var(--linen)` | color, `.codeblock pre` | `var(--frost)` or `var(--text)` (same decision) |
| site/src/components/ui/CodeBlock.astro | 18 | `var(--slag)` | border, `.codeblock` | `var(--gunmetal)` or `var(--border)` |
| site/src/components/ui/CodeBlock.astro | 34 | `var(--slag)` | color, `.codeblock::before` lang label | `var(--gunmetal)`/`var(--mist)` or `var(--subtle)` |
| site/src/components/RoadmapForm.astro | 309 | `var(--obsidian)` | color, submit button on accent | `var(--on-accent)` |
| site/src/components/RoadmapForm.astro | 323 | `var(--ember)` | background, light-mode submit override | delete the override |
| site/src/components/RoadmapForm.astro | 340 | `rgba(16, 185, 129, 0.08)` | background, success panel | `var(--success-dim)` |
| site/src/components/RoadmapForm.astro | 351 | `rgba(216, 100, 100, 0.08)` | background, error panel | `var(--danger-dim)` |
| site/src/pages/skills/[id].astro | 1169 | `var(--parchment)` | background, light-mode `.prose pre` | `var(--bg)` (verifier: `--card` is #fff in light and makes the override a no-op; `--parchment` aliases `--paper` = light `--bg`) |
| site/src/pages/skills/[id].astro | 1170 | `var(--sand)` | border-color, light-mode `.prose pre` | `var(--border)` |
| site/src/pages/skills/[id].astro | 1407 | `var(--parchment)` | background, light-mode `.code-block` wrapper | `var(--bg)` — change together with 1169 |
| site/src/pages/skills/[id].astro | 1408 | `var(--sand)` | border-color, light-mode `.code-block` | `var(--border)` — together with 1170 |
| site/src/components/ui/Button.astro | 63 | `var(--obsidian)` | color, `.btn-primary` | `var(--on-accent)` (verifier: not `--accent-fg`) |
| site/src/components/ui/Button.astro | 66 | `var(--obsidian)` | color, `.btn-primary:hover` | `var(--on-accent)` or drop (base rule already sets it) |
| site/src/components/ui/Button.astro | 71 | `var(--ember)` | background, light-mode `.btn-primary` (B-10) | delete rule and the 68–69 comment; no new token needed (light accent/on-accent = 6.73:1) |
| site/src/pages/install.astro | 599 | `var(--obsidian)` | background, `.codeblock` | CodeBlock decision — `var(--slate)` or `var(--bg)` |
| site/src/pages/install.astro | 600 | `var(--linen)` | color, `.codeblock` | `var(--frost)` or `var(--text)` |
| site/src/pages/install.astro | 601 | `var(--slag)` | border, `.codeblock` | `var(--gunmetal)` or `var(--border)` |
| site/src/pages/skills/index.astro | 304 | `var(--obsidian)` | border-left, custom checkbox checkmark | `var(--on-accent)` |
| site/src/pages/skills/index.astro | 305 | `var(--obsidian)` | border-bottom, checkmark second edge | `var(--on-accent)` — change with 304 |
| site/src/pages/compare.astro | 799 | `#f59e0b` | color, `.review-badge` (`--warning` fallback) | `var(--warning)`, drop fallback |
| site/src/pages/compare.astro | 800 | `#f59e0b` | border-color, `.review-badge` (`--warning` fallback) | `var(--warning)`, drop fallback |
| site/src/components/ConsentBanner.astro | 166 | `var(--obsidian)` | color, accept button on accent | `var(--on-accent)` |
| site/src/components/ConsentBanner.astro | 171 | `var(--ember)` | background, light-mode accept button (B-10) | delete the override; re-validate line 143 (`--accent-hover` link) at the same time |
| site/src/components/Footer.astro | 247 | `#0a0a0a` | color, Subscribe button (`--accent-contrast` fallback — LIVE, token undefined) | `var(--on-accent)`, drop fallback (verifier: 2.0 light value is #fff, so the near-black fallback is wrong in light) |
| site/src/components/Footer.astro | 265 | `#e5484d` | color, newsletter error (`--danger` fallback) | `var(--danger)`, drop fallback |
| site/src/components/PipelineDiagram.astro | 288 | `var(--slag)` | stroke, `.node-foundation` dashed outline | `var(--border)` (or `var(--ribbon-edge)`) |
| site/src/components/PipelineDiagram.astro | 324 | `var(--slag)` | border, `.swatch-foundation` legend | `var(--border)` — must match 288 |
| site/src/components/CaptureModal.astro | 373 | `#1c1710` | color, `.capture-submit` on accent | `var(--on-accent)` (verifier: `--accent-text` does not exist) |

### light-precomputed — 14

Hand-precomputed light-theme hex values (Axe/LHCI workarounds, "B-10/B-11") that were derived from the old Ember palette; each must be regenerated from the 2.0 light tokens or, where the base rule is already token-driven, the override deleted.

| file | line | value | property | suggested token / action |
|---|---|---|---|---|
| site/src/pages/skills/index.astro | 383 | `#f4e5cf` | comment documenting the light `--surface` operand | update the comment when 389–395 are regenerated |
| site/src/pages/skills/index.astro | 389 | `#e4cbb2` | background, light workflow pill | regenerate: `color-mix(in srgb, var(--workflow) 15%, var(--surface))` at 2.0 light values |
| site/src/pages/skills/index.astro | 390 | `#e2cfb1` | background, light tri-agent pill | regenerate from light `--tri-agent` / `--surface` |
| site/src/pages/skills/index.astro | 391 | `#e7c6b9` | background, light audit-gate pill | regenerate from light `--audit-gate` / `--surface` |
| site/src/pages/skills/index.astro | 392 | `#d1d1bd` | background, light specialist pill | regenerate from light `--specialist` / `--surface` |
| site/src/pages/skills/index.astro | 393 | `#d1cfc3` | background, light advisor pill | regenerate from light `--advisor` / `--surface` |
| site/src/pages/skills/index.astro | 394 | `#e0c9d1` | background, light orchestrator pill | regenerate from light `--orchestrator` / `--surface` |
| site/src/pages/skills/index.astro | 395 | `#d0d1ba` | background, light success pill | regenerate from light `--success` / `--surface` |
| site/src/components/DesktopWorkbench.astro | 709 | `#993505` | color, light `.editor-prompt-eyebrow` | delete once 702 is `var(--accent)` (light `--accent` already AA) |
| site/src/components/DesktopWorkbench.astro | 736 | `#993505` | color, light `.scenario-num` + `.col-head` | delete once 728/768 are tokenized |
| site/src/components/DesktopWorkbench.astro | 1124 | `#993505` | color, light `.ip-eyebrow` | delete once 1117 is tokenized |
| site/src/components/DesktopWorkbench.astro | 1157 | `#993505` | color, light `.ip-section-head` | delete once 1148 is tokenized |
| site/src/pages/demo.astro | 476 | `#993505` | color, light search group header | delete once 473 is tokenized |
| site/src/pages/demo.astro | 514 | `#993505` | color, light facet h4 | delete once 511 is tokenized |

Note: the same `#993505` light-mode eyebrow override appears four more times in `MobileWorkbench.astro` (409, 507, 550, 834) and once in `WelcomePopup.astro` (164); the first pass filed those as tokenize and the verifier did not object, so they are counted there. The action is identical: delete the override.

### generated-asset — 22

All in `scripts/gen-og-images.mjs`. Nothing here reads `tokens.css`; the OG/blog card SVG templates carry their own hex. Update the literals to the 2.0 dark values, then regenerate every PNG under `site/public/og/` (regens are byte-nondeterministic, expect a full-set diff).

| file | line | value | property | suggested token / action |
|---|---|---|---|---|
| scripts/gen-og-images.mjs | 111 | `#e05c18` | stop-color, `#gr` 0% (opacity .18) | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 112 | `#1c1710` | stop-color, `#gr` 100% (opacity 0) | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 116 | `#e05c18` | stop-color, `#gl` 0% (opacity .07) | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 117 | `#1c1710` | stop-color, `#gl` 100% | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 122 | `#1c1710` | fill, 1200×630 base rect | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 127 | `#e05c18` | fill, 5px left accent bar | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 135 | `#e05c18` | fill, OPCHAIN wordmark | 2.0 dark `--accent` (or lockup wordmark colour once picked) |
| scripts/gen-og-images.mjs | 145 | `#e8dfd0` | fill, 68px headline | 2.0 dark `--text` |
| scripts/gen-og-images.mjs | 154 | `#c4b89e` | fill, 26px tagline | 2.0 dark `--muted` |
| scripts/gen-og-images.mjs | 158 | `#e05c18` | fill, bottom accent rule (opacity .7) | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 166 | `#5a5040` | fill, `opchain.dev` URL text | `--gunmetal` (exact 1:1 of `--slag`); `--subtle` only as a deliberate contrast lift — see §Order of work |
| scripts/gen-og-images.mjs | 245 | `#e8dfd0` | fill, blog title spans | 2.0 dark `--text` |
| scripts/gen-og-images.mjs | 252 | `#e05c18` | stop-color, blog `#gr` 0% | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 253 | `#1c1710` | stop-color, blog `#gr` 100% | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 256 | `#e05c18` | stop-color, blog `#gl` 0% | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 257 | `#1c1710` | stop-color, blog `#gl` 100% | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 260 | `#1c1710` | fill, blog base rect | 2.0 dark `--bg` |
| scripts/gen-og-images.mjs | 263 | `#e05c18` | fill, blog left accent bar | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 264 | `#e05c18` | fill, blog OPCHAIN wordmark | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 265 | `#c4742a` | fill, `ENGINEERING · BLOG` eyebrow | `--accent-hover` (verifier: `--accent-dim` is a 10% wash and would be near-invisible as text) |
| scripts/gen-og-images.mjs | 267 | `#e05c18` | fill, blog bottom accent rule | 2.0 dark `--accent` |
| scripts/gen-og-images.mjs | 268 | `#5a5040` | fill, `opchain.dev/blog` URL text | same decision as 166 |

### fixed — 78

Palette-independent constants that stay as they are: pure-black scrims and drop shadows (`rgba(0,0,0,…)`), white tints on the always-dark Claude Code terminal emulation, `transparent` reset/mix operands, the macOS traffic-light dots, the `--cc-*`/`--mw-cc-*` terminal palette, narrative hex in walkthrough prose, and comment-only text. Representative examples:

- `site/src/components/DesktopWorkbench.astro:923–932` and `MobileWorkbench.astro:569–575` — the `--cc-bg #181818` … `--cc-border #2a2a2a` terminal palette, deliberately dark in both themes (three of the desktop entries, `--cc-purple/--cc-green/--cc-red`, are dead).
- `site/src/pages/demo.astro:157`, `SearchPalette.astro:148`, `WelcomePopup.astro:121`, `CaptureModal.astro:228`, `FeedbackWidget.astro:155`, `Header.astro:797` — `rgba(0,0,0,.45–.72)` modal scrims.
- `site/src/components/DesktopWorkbench.astro:459–461` — `#ff5f57 / #febc2e / #28c840` macOS window-chrome dots.
- `site/src/data/walkthroughs/concept-to-shipped.ts:1041` and `dashboard-rescue.ts:174–176` — a fictional client palette rendered as inline-code text.
- `site/src/pages/architecture.astro:2178,2622` — `rgba(0,0,0,.18/.4)` inset panel and drop shadow inside the diagram page.

Two caveats inside this bucket. (1) **17 are comment-only** and 8 of those become false the moment `--ember` retires and must be rewritten with the rule they justify: `Header.astro:523`, `WelcomePopup.astro:248–249`, `Button.astro:68–69`, `Eyebrow.astro:32` (the first pass filed this one as tokenize; the rendered rule on line 34 already uses `var(--accent-hover)`), and `skills/[id].astro:1128,1130` ×2. The other 9 (`architecture.astro:2338,2339,2598,2599,2600,2647`, `global.css:131` — anchored at 131, not 132 — and `DesktopWorkbench`'s dead tokens) are harmless. (2) **`--cc-orange #d99155`** (`DesktopWorkbench.astro:928`, `MobileWorkbench.astro:574`, plus their 8% tints at 1103 and 753) is Claude Code's own terminal orange, not Ember, but after the swap it is the only warm accent on the workbench pages. Decide once — keep for CC fidelity or retint — and mirror the decision across both files; express the tints as `color-mix(in srgb, var(--cc-orange) 8%, transparent)` so they track it.

### diagram-deferred — 1,378

The two architecture diagrams carry their own complete palettes (`.arch-v2` aliases + inline SVG/canvas colours in `architecture.astro`; `--ma-*` dark/light palette + attribute-selector remap in `MobileArchitecture.astro`). These are not migrated literal-by-literal: the architecture workstream replaces both surfaces wholesale, and it should take the 2.0 sheet as input rather than inherit these values.

| file | diagram-deferred |
|---|---|
| site/src/pages/architecture.astro | 827 |
| site/src/components/MobileArchitecture.astro | 551 |

Inputs the workstream needs from this catalogue: (a) four diagram-only roles have no site token — `--ma-ai`/`--ai` violet (#a78bfa), `--ma-sig`/`--sig` magenta (#e879f9), `--ma-vec` pink (#ec4899), `--ma-inst`/`--inst` lime (#a3e635) — and must either get 2.0 tokens or stay diagram-local; (b) the `SUCC` canvas constant at `architecture.astro:1605` is declared but never referenced and can be deleted; (c) in `MobileArchitecture.astro` every `#1c1710` is a rect/circle *surface* fill whose light-mode target is `--card`, not `--text` (38 entries the first pass had wrong), and the three timeline circles at 621/631/650 are not covered by any remap selector today, so they already render as dark dots in light mode.

## By file

Sorted by (tokenize + light-precomputed + generated-asset) descending — the files that actually block the recolour are on top.

| file | tokenize | light-precomputed | generated-asset | fixed | diagram-deferred | total |
|---|---:|---:|---:|---:|---:|---:|
| site/src/pages/architecture.astro | 176 | 0 | 0 | 8 | 827 | 1011 |
| site/src/pages/index.astro | 22 | 0 | 0 | 0 | 0 | 22 |
| scripts/gen-og-images.mjs | 0 | 0 | 22 | 0 | 0 | 22 |
| site/src/pages/dashboard.astro | 21 | 0 | 0 | 0 | 0 | 21 |
| site/src/pages/demo.astro | 14 | 2 | 0 | 3 | 0 | 19 |
| site/src/components/DesktopWorkbench.astro | 10 | 4 | 0 | 21 | 0 | 35 |
| site/src/components/Header.astro | 12 | 0 | 0 | 3 | 0 | 15 |
| site/src/components/MobileWorkbench.astro | 11 | 0 | 0 | 14 | 0 | 25 |
| site/src/pages/pipeline-builder.astro | 10 | 0 | 0 | 0 | 0 | 10 |
| site/src/pages/skills/index.astro | 2 | 8 | 0 | 2 | 0 | 12 |
| site/src/styles/global.css | 9 | 0 | 0 | 1 | 0 | 10 |
| site/src/pages/styleguide.astro | 9 | 0 | 0 | 1 | 0 | 10 |
| site/src/pages/security.astro | 7 | 0 | 0 | 0 | 0 | 7 |
| site/src/components/Logo.astro | 7 | 0 | 0 | 0 | 0 | 7 |
| site/src/pages/status.astro | 6 | 0 | 0 | 0 | 0 | 6 |
| site/src/components/WelcomePopup.astro | 5 | 0 | 0 | 3 | 0 | 8 |
| site/src/pages/changelog.astro | 4 | 0 | 0 | 0 | 0 | 4 |
| site/src/pages/showcase.astro | 4 | 0 | 0 | 0 | 0 | 4 |
| site/src/components/ui/CodeBlock.astro | 4 | 0 | 0 | 0 | 0 | 4 |
| site/src/components/RoadmapForm.astro | 4 | 0 | 0 | 0 | 0 | 4 |
| site/src/pages/skills/[id].astro | 4 | 0 | 0 | 4 | 0 | 8 |
| site/src/components/ui/Button.astro | 3 | 0 | 0 | 2 | 0 | 5 |
| site/src/pages/install.astro | 3 | 0 | 0 | 1 | 0 | 4 |
| site/src/pages/compare.astro | 2 | 0 | 0 | 1 | 0 | 3 |
| site/src/components/ConsentBanner.astro | 2 | 0 | 0 | 0 | 0 | 2 |
| site/src/components/Footer.astro | 2 | 0 | 0 | 0 | 0 | 2 |
| site/src/components/PipelineDiagram.astro | 2 | 0 | 0 | 1 | 0 | 3 |
| site/src/components/CaptureModal.astro | 1 | 0 | 0 | 1 | 0 | 2 |
| site/src/components/MobileArchitecture.astro | 0 | 0 | 0 | 2 | 551 | 553 |
| site/src/data/walkthroughs/concept-to-shipped.ts | 0 | 0 | 0 | 4 | 0 | 4 |
| site/src/data/walkthroughs/dashboard-rescue.ts | 0 | 0 | 0 | 3 | 0 | 3 |
| site/src/components/FeedbackWidget.astro | 0 | 0 | 0 | 1 | 0 | 1 |
| site/src/components/SearchPalette.astro | 0 | 0 | 0 | 1 | 0 | 1 |
| site/src/components/ui/Eyebrow.astro | 0 | 0 | 0 | 1 | 0 | 1 |
| site/src/data/walkthroughs/runtime-pm-loop.ts | 0 | 0 | 0 | 0 | 0 | 0 |
| **total** | **356** | **14** | **22** | **78** | **1378** | **1848** |

## Order of work

1. **Land `tokens-2.0.css` first, with `--on-accent`, `--accent-glow`, `--specialist-pill`, `--tertiary`/`--tertiary-dim` present.** 25 label-on-accent literals in 13 files and 12 B-10 light-mode overrides in 7 files resolve to those four names; none of them can be migrated until the tokens exist. Keep `--ember`, `--obsidian`, `--linen`, `--slag`, `--sand`, `--parchment`, `--char` as aliases through the migration so partially-migrated pages do not break.
2. **Shared chrome next: `Button.astro`, `Header.astro`, `ConsentBanner.astro`, `Footer.astro`, `global.css`, `Logo.astro`, `WelcomePopup.astro`, `CaptureModal.astro`, `RoadmapForm.astro`.** Small counts, but they render on every page, and eight of the twelve B-10 overrides live here. Each override is a deletion plus a comment rewrite, not a retint.
3. **`index.astro` and `dashboard.astro`.** Index has the only remaining raw-alpha Ember (`rgba(224,92,24,…)` ×6 in the release-bar pulse) and the `#14100a` gradient stop that will clash with a cool slate ground; dashboard has 11 literals that render *today* because `--text-2`, `--text-3` and `--surface-2` were never defined — the recolour is the moment to fix those, and its four model-tier bars need new categorical tokens (the sonnet tier must not be emerald-adjacent).
4. **The workbench trio and `demo.astro`** (`DesktopWorkbench`, `MobileWorkbench`, `demo`): `#f5894d` / `#993505` eyebrow pairs (11 rules total) collapse to `var(--accent)` plus override deletion; then make the `--cc-orange` call and apply it in both workbench files.
5. **The code-panel four** (`CodeBlock.astro`, `install.astro`, `security.astro`, `pipeline-builder.astro`) after the decision in item 8 — one decision, sixteen lines.
6. **`gen-og-images.mjs`** once the accent hex is final and the lockup pick is in, then regenerate all OG PNGs in one commit.
7. **Long tail** (`status`, `compare`, `showcase`, `changelog`, `skills/index`, `skills/[id]`, `styleguide`, `PipelineDiagram`): mechanical; `skills/index.astro:389–395` needs the seven light pill hexes recomputed from the 2.0 light `--surface` and role tokens; `styleguide.astro` should render chips from `var(${c.token})` (line 129) so the swatch page can never drift again.
8. **Wait for the architecture workstream:** `architecture.astro` (827 deferred + 176 tokenize) and `MobileArchitecture.astro` (551 deferred). The 176 tokenize rows in `architecture.astro` are the page chrome *around* the diagram (header, legend, cards, rails, pack-fabric band); they are real and migratable, but the whole page is being rebuilt, so do not spend effort on them unless the rebuild slips past the recolour ship date. Hand the workstream the four diagram-only roles (violet/magenta/pink/lime) and the `--card`-not-`--text` light-fill correction.

Genuinely ambiguous literals (name the decision, do not guess):

- **The obsidian/linen/slag code-panel triple** — `CodeBlock.astro:16–18,34`, `install.astro:599–601`, `security.astro:244–246`, `pipeline-builder.astro:487–489`. Option A, like-for-like: `--slate`/`--frost`/`--gunmetal` (or a new `--code-bg`/`--code-text`/`--code-border`), keeping the panel always-dark in light mode as `tokens.css` line 12 ("brand constants, never themed") intends. Option B, theme-following: `--bg`/`--text`/`--border`, which turns the panel light in light mode. The first pass proposed B in three files and A-ish in one without flagging it as a behaviour change; `--surface` (proposed for CodeBlock) is wrong under either option because it is a different, lighter panel than `--bg`. Note `skills/[id].astro:1169/1407` already implements a light code panel via `--parchment`, so the site is currently inconsistent either way.
- **`gen-og-images.mjs:166,268` `#5a5040` URL text** — `--gunmetal` is the exact 1:1 swap (`#5a5040` *is* `--slag` = `--border`); `--subtle` lifts the URL text from ~1.9:1 contrast on the card but is a re-role, not a palette swap. Decide which the OG cards want.
- **`dashboard.astro:196` `.tier-sonnet #14b8a6`** — any new categorical token must be checked against the emerald `--accent` used by the adjacent `.bar-fill`, or the model-tier chart loses a series.

## Verification notes

The verifier found gaps in **18 of 35 files** (verdict `gaps-found`): `architecture`, `MobileArchitecture`, `gen-og-images`, `index`, `Header`, `demo`, `global.css`, `skills/[id]`, `styleguide`, `pipeline-builder`, `WelcomePopup`, `changelog`, `showcase`, `Button`, `CodeBlock`, `CaptureModal`, `Footer`, `Eyebrow`. The other 17 were confirmed complete. Only **two literals were actually missed** (finder total 1,846 → 1,848): the template interpolation ``style={`background: ${c.hex};`}`` at `styleguide.astro:129`, and the never-defined `var(--dim)` at `pipeline-builder.astro:304`. Everything else was a wrong classification or a wrong target token. What the first pass tended to get wrong, in order of frequency, so the next person knows what to re-check by hand:

1. **Invented token names.** `--accent-fg`, `--accent-text`, `--accent-ink`, `--accent-contrast`, `--specialist-dim`, `--planned`, `--planned-dim` were all proposed and none exist in `tokens.css` or `tokens-2.0.css`; the sheet already has `--on-accent`, `--specialist-pill`, `--tertiary`, `--tertiary-dim`, `--accent-glow`. Grep every proposed `var(--…)` against the two token files before accepting it (≈15 corrections).
2. **Value lookalikes mapped by hue, not by token.** Teal `#14B8A6` was sent to `--success` (which is `#10B981`) instead of `--specialist`; violet `#A78BFA` to `--specialist` instead of `--orchestrator`; `--ember-glow` to `--glow` (14% card halo) instead of `--accent-glow` (22%). Thirteen entries in `architecture.astro` alone, and the file's own comments at 2598–2600 said which token the value was.
3. **Role confusion in themed suggestions.** Every `#1c1710` rect fill in `MobileArchitecture.astro` (38 entries) was given `--text` as its light target when the component's own remap sends it to the card surface; `--parchment` in `skills/[id].astro` was mapped to `--card`, which silently turns the light override into a no-op. Check what the *base* rule already sets before proposing a token for an override.
4. **Comment-only literals misfiled both ways.** Stale B-10 rationale hexes were marked `fixed` (leave as-is) when the comment becomes false after the swap (`Header:523`, `WelcomePopup:248–249`, `Button:68–69`), and one comment hex was marked `tokenize` when nothing renders (`Eyebrow:32`). One anchor was off by one (`global.css:131`, not 132).
5. **Shadow tokens in colour slots.** `--glow-sm` is a complete `box-shadow` value; dropping it into the colour position of an existing layer invalidates the declaration (`index.astro:616,643`). Likewise `--accent-dim` (a 10% wash) was proposed for opaque text (`gen-og-images.mjs:265`).
6. **Regex blind spots.** The hex/rgba/brand-var scan does not see JS template interpolation, undefined `var()` references with no fallback, or JS-set inline styles unless they carry a literal fallback (dashboard's live fallbacks were caught only because the fallback hex was present). Grep separately for `var(--` names that are not defined anywhere.
7. **Prose-adjacent inline styles filed with the diagram.** Seven inline `style` colours in the `.cards` prose section below the architecture diagram (`architecture.astro:1309–1370`) were marked diagram-deferred; anything outside the `<svg>`/canvas that lives in a diagram-heavy file needs a second look.
8. **Inconsistent classification of the same pattern across files.** The `#993505` light eyebrow override is `light-precomputed` in `DesktopWorkbench`/`demo` but `tokenize` in `MobileWorkbench`/`WelcomePopup`; the action (delete the override) is the same, but the split is why the light-precomputed count reads 14 rather than 19.
