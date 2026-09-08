// build-preview.mjs — assembles design-previews/color-2.0-explorations.html
import fs from "node:fs";
import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname);
export const tokens = JSON.parse(fs.readFileSync(path.join(HERE, "tokens.json"), "utf8"));
export const tokenCss = fs.readFileSync(path.join(HERE, "tokens.css"), "utf8");

// Embed the webfonts when fetch-fonts.mjs has cached them. A shared HTML file
// is often opened in a sandboxed frame or a strict-CSP preview pane, where an
// external stylesheet is refused outright and logs a console error every load.
// Embedding removes the network dependency; without the cache we fall back to
// the Google Fonts <link> tags, which still work in a normal browser.
export let fontFaceCss = "", fontLinks = "";
try {
  const faces = JSON.parse(fs.readFileSync(path.join(HERE, "fonts.json"), "utf8"));
  fontFaceCss = faces.map((f) =>
    `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;` +
    `src:url(data:font/woff2;base64,${f.b64}) format('woff2');}`).join("\n");
} catch {
  fontLinks =
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />';
}
const OUT = process.argv[2] || path.join(HERE, "color-2.0-explorations.html");

export const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"><line x1="3" y1="16" x2="29" y2="16" stroke="var(--logo-spine)" stroke-width="1"/><rect x="3" y="10" width="7" height="12" rx="1.5" fill="none" stroke="var(--logo-stroke)" stroke-width="1.2"/><rect x="12" y="10" width="7" height="12" rx="1.5" fill="none" stroke="var(--logo-stroke)" stroke-width="1.2"/><rect x="21" y="10" width="8" height="12" rx="1.5" fill="var(--logo-filled)"/><circle cx="6.5" cy="16" r="1.6" fill="var(--logo-stroke)"/><circle cx="15.5" cy="16" r="1.6" fill="var(--logo-stroke)"/><circle cx="25" cy="16" r="1.6" fill="var(--logo-dot-dark)"/></svg>`;

export const ICON = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
  puzzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.4 13.4a1.5 1.5 0 0 0-1.9 1.4v1.7H14v-3.5a1.5 1.5 0 0 1-3 0V16H8v-3.5a1.5 1.5 0 0 0-3 0V9h3.5a1.5 1.5 0 0 1 0-3H12v3.5a1.5 1.5 0 0 0 3 0V6h3.5v3.5a1.5 1.5 0 0 1 0 3H21v1.9a1.5 1.5 0 0 1-1.6-1z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>`,
};

// ─────────────────────────── page mockups ───────────────────────────
export const header = (active) => `
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-header-brand" href="#">${LOGO(22)}<span class="logo">opchain</span></a>
    <nav class="nav" aria-label="Primary">
      <div class="nav-group ${active === "/" ? "is-active" : ""}"><button class="nav-group-btn" type="button">Product <span class="nav-caret"></span></button></div>
      <div class="nav-group"><button class="nav-group-btn" type="button">Pipeline <span class="nav-badge tool">tool</span><span class="nav-caret"></span></button></div>
      <div class="nav-group ${active === "/changelog" || active === "/skills" ? "is-active" : ""}"><button class="nav-group-btn" type="button">Resources <span class="nav-badge new">NEW</span><span class="nav-caret"></span></button></div>
      <a class="nav-install" href="#">install</a>
    </nav>
    <div class="right-cluster">
      <label class="search-trigger">${ICON.search}<input type="text" placeholder="Search pages, skills, glossary…" readonly><kbd class="search-kbd">⌘K</kbd></label>
      <a class="version-chip" href="#"><span class="vchip-tag">v1.9</span><span class="vchip-dot"></span></a>
      <button class="util-feedback" type="button">feedback</button>
      <button class="theme-toggle" type="button" aria-label="Toggle theme">${ICON.sun}</button>
    </div>
  </div>
</header>`;

export const footer = `
<footer class="site-footer">
  <div class="site-footer-inner">
    <div class="col"><div class="brand">opchain</div><p class="tagline">skills that ship.</p></div>
    <div class="col"><div class="col-head">product</div><a href="#">Introduction</a><a href="#">Architecture</a><a href="#">Skill Library</a><a href="#">Install</a><a href="#">Changelog</a><a href="#">Compare</a></div>
    <div class="col"><div class="col-head">explore</div><a href="#">Pipeline Builder</a><a href="#">AI Recipes</a><a href="#">Blog</a><a href="#">Walkthrough</a><a href="#">Showcase</a><a href="#">Glossary</a></div>
    <div class="col"><div class="col-head">trust</div><a href="#">Status</a><a href="#">Security</a><a href="#">How it's built</a><a href="#">Privacy</a></div>
    <div class="col"><div class="col-head">source</div><a href="#">GitHub</a><a href="#">API health</a><a href="#">Manage privacy</a></div>
  </div>
  <div class="site-footer-newsletter">
    <div class="nl-copy"><div class="nl-head">Ship-notes, occasionally.</div><p class="nl-sub">Release notes and the odd engineering write-up. No spam.</p></div>
    <form class="nl-form" onsubmit="return false"><input type="email" placeholder="you@example.com" readonly><button type="button" class="btn btn-primary btn-sm">subscribe</button></form>
  </div>
  <div class="site-footer-meta"><span>© 2026 opchain · Apache-2.0</span><span>built with opchain</span></div>
</footer>`;

export const homePage = `
<div class="page page-home" data-page="home">
${header("/")}
<main class="intro">
  <span class="eyebrow">skill ecosystem</span>
  <div class="intro-hero">${LOGO(88)}<h1 class="intro-mark">opchain</h1></div>
  <p class="intro-claim">skills that ship.</p>
  <div class="intro-tagline"><span>a skillchain and checkpoint protocol designed to get you from concept to production to ops</span></div>
  <div class="intro-body">
    <p>If you've ever tried to build something real with Claude and watched it lose the plot between chats — forgetting your spec, redesigning what it already designed, repeating questions it asked an hour ago — opchain is what you've been looking for.</p>
    <p>Install them, trigger by name, keep going. No API keys. No SaaS. No vendor lock-in — every skill is a single Markdown file.</p>
  </div>
  <a class="release-bar-glow" href="#">
    <span class="rb-half rb-current"><span class="rb-tag">v1.9 · shipped</span><span class="rb-text">Assurance &amp; governed delivery · qa · data · compliance · hardening</span></span>
    <span class="rb-divider" aria-hidden="true"></span>
    <span class="rb-half rb-next"><span class="rb-tag rb-tag-next">v2.0 · next</span><span class="rb-text rb-text-next">the self-improving pipeline · committed</span></span>
    <span class="rb-arrow" aria-hidden="true">›</span>
  </a>
  <section class="stats">
    <a class="stat" href="#"><span class="stat-num">33</span><span class="stat-label">skills shipped</span></a>
    <a class="stat" href="#"><span class="stat-num">v1.9</span><span class="stat-label">latest release</span></a>
    <a class="stat" href="#"><span class="stat-num">live</span><span class="stat-label">system status</span></a>
    <a class="stat" href="#"><span class="stat-num">Apache-2.0</span><span class="stat-label">open source</span></a>
  </section>
  <section class="stage">
    <div class="stage-mid">
      <div class="stage-issue">opchain · scenario 01 of 12</div>
      <h2 class="stage-h">Concept → shipped, in one chat</h2>
      <p class="stage-sub">Idea → deployed, one chat. Discovery, spec, design, build loop, audit gate, staging, production — every phase leaves a checkpoint the next session reads back.</p>
      <div class="stage-actions"><a class="btn btn-primary" href="#">${ICON.play} open the workbench</a><a class="btn btn-ghost" href="#">install opchain</a></div>
      <div class="dot-row">${Array.from({ length: 12 }, (_, i) => `<span class="dot${i === 0 ? " active" : ""}"></span>`).join("")}<span class="dot-counter">01 / 12</span></div>
    </div>
  </section>
  <section class="resources-strip">
    <span class="eyebrow">go deeper</span>
    <h2 class="resources-heading">resources</h2>
    <p class="resources-sub">References and trust signals you'd otherwise have to scroll all the way to the footer to find.</p>
    <div class="res-grid">
      <a class="res-card" href="#"><span class="res-icon">${ICON.puzzle}</span><h3>Skills</h3><p>Read the source. Every skill is a single Markdown file you can audit, fork, and rewire.</p><span class="read">read the files ›</span></a>
      <a class="res-card" href="#"><span class="res-icon">${ICON.book}</span><h3>Glossary</h3><p>Plain-English definitions for every opchain term — checkpoint, tri-agent, audit gate.</p><span class="read">read ›</span></a>
      <a class="res-card" href="#"><span class="res-icon">${ICON.cpu}</span><h3>How it's built</h3><p>opchain.dev is itself built with opchain. Every commit ran through the gates.</p><span class="read">read ›</span></a>
      <a class="res-card" href="#"><span class="res-icon">${ICON.shield}</span><h3>Security</h3><p>Threat model, dependency posture, secret handling — what we actually do.</p><span class="read">read ›</span></a>
    </div>
  </section>
  <div class="intro-actions"><a class="btn btn-primary btn-lg" href="#">install opchain</a><a class="btn btn-outline btn-lg" href="#">browse the skills</a></div>
  <div class="role-strip" aria-label="Skill roles">
    <span class="role-strip-label">skill roles</span>
    ${["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"].map((r) => `<span class="card-role-tag" data-role="${r}">${r}</span>`).join("")}
  </div>
</main>
${footer}
</div>`;

export const tile = (name, desc) => `<div class="tile"><span class="tile-name">${name}</span><span class="tile-desc">${desc}</span></div>`;
export const horizon = (title, blurb, count, voted) => `
<li class="horizon-item"><div class="horizon-meta"><span class="horizon-title">${title}</span><p class="horizon-blurb">${blurb}</p></div>
<button class="vote-btn${voted ? " voted" : ""}" type="button"><span class="v-arrow">▲</span><span class="v-count">${count}</span><span class="v-label">${voted ? "voted" : "vote"}</span></button></li>`;

export const changelogPage = `
<div class="page page-changelog" data-page="changelog" hidden>
${header("/changelog")}
<main class="pg">
  <div class="page-head"><span class="eyebrow">changelog</span><h1>Changelog.</h1>
    <p class="lede">What shipped, what's next, and what to do about it. Each skill's <code>version</code> field is the source of truth — this page rolls them up by release. Vote on what's coming to signal priority.</p></div>
  <div class="tab-bar">
    <div class="tab-list" role="tablist">
      <button class="tab-btn" role="tab" aria-selected="true" data-tab="released">Just Released <span class="tab-count">18 shipped</span></button>
      <button class="tab-btn tab-btn--next" role="tab" aria-selected="false" data-tab="coming">Coming Next <span class="tab-count">v2.0</span></button>
      <button class="tab-btn tab-btn--planned" role="tab" aria-selected="false" data-tab="planned">Planned <span class="tab-count">v2.1 → v2.3</span></button>
    </div>
    <span class="tab-indicator" data-active="0"></span>
  </div>

  <section class="tab-panel" data-panel="released">
    <div class="panel-head"><h2>What shipped</h2><span class="panel-sub">Latest release is open; patches and earlier releases expand in place.</span></div>
    <article class="hero-card hero-card--released is-open">
      <button class="hero-head" type="button"><span class="hero-chevron">▶</span><span class="hero-badge">latest release</span>
        <span class="hero-ver">v1.9.0 · shipped Sep 02, 2026</span><span class="hero-title">Assurance and governed delivery ops</span>
        <span class="hero-desc">Delivery evidence you can review and enforce. v1.9 adds four skills that decide which tests should exist, build data pipelines with observable contracts, keep a standing compliance register with audit-ready evidence, and execute security fixes behind a per-deploy gate.</span></button>
      <div class="card-body"><div class="card-body-inner hero-body-inner">
        <div class="tag-row"><span class="tag tag--accent">shipped</span><span class="tag">29 → 33 skills</span><span class="tag">4 new skills</span><span class="tag">additive</span></div>
        <h3>What's new</h3>
        <div class="tile-grid">
          ${tile("oc-qa-ops", "Test-pyramid design: coverage budgets, contract-test matrix, load-test planning. The strategy layer split out of oc-bug-check.")}
          ${tile("oc-data-ops", "Ingestion patterns, staging → intermediate → marts layering, dbt, and data contracts replayed by an isolated Contract-Verifier.")}
          ${tile("oc-compliance-ops", "A standing control register plus audit-ready evidence bundles generated at deploy and release time. Evidence, not certification.")}
          ${tile("oc-security-hardening", "Turns auditor findings into merged fixes, records every control in a manifest, and stands the per-deploy gate that replays it.")}
        </div>
        <div class="compat-box"><strong>Skill and on-disk checkpoint compatibility:</strong> back-compatible with v1.8.3. All 33 skills lockstep-bump to <code>1.9.0</code>; no checkpoint-file migration or commands are removed.</div>
      </div></div>
    </article>
    <article class="rel-card"><button class="rc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--past">v1.8.3</span><span class="pc-title">Release tag + checkpoint doctor</span><span class="pc-timing">Aug 27, 2026</span></span><span class="pc-summary">Signed release tags land in oc-git-ops; checkpoint:doctor diagnoses schema drift.</span></span></button></article>
    <article class="rel-card"><button class="rc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--past">v1.8.0</span><span class="pc-title">Documentation &amp; repo hygiene</span><span class="pc-timing">Aug 12, 2026</span></span><span class="pc-summary">oc-docs-forge and oc-repo-ops gate every PR; Apache-2.0 relicense.</span></span></button></article>
  </section>

  <section class="tab-panel" data-panel="coming" hidden>
    <div class="panel-head"><h2>What's coming</h2><span class="panel-sub">v2.0 is next — the self-improving pipeline, committed after v1.9.</span></div>
    <article class="hero-card hero-card--next is-open">
      <button class="hero-head" type="button"><span class="hero-chevron">▶</span><span class="hero-badge">committed</span>
        <span class="hero-ver">v2.0.0 · next · committed</span><span class="hero-title">The self-improving pipeline</span>
        <span class="hero-desc">Two governed workflow skills — oc-hindsight (operational memory) and oc-evolve (behaviour change) — over a three-layer learning architecture. Every activation ends at a human gate; learned content is advisory data, never instructions.</span></button>
      <div class="card-body"><div class="card-body-inner hero-body-inner">
        <div class="tag-row"><span class="tag tag--info">committed</span><span class="tag">next release</span><span class="tag">33 → 35 skills</span><span class="tag">checkpoint wire 1.2</span></div>
        <div class="tile-grid">
          ${tile("oc-hindsight", "Governed operational memory: harvest, generate source-grounded candidate lessons, evaluate in isolated context, then require human promotion.")}
          ${tile("oc-evolve", "Governed behaviour change: plan an improvement hypothesis, generate candidate rules, adversarially evaluate, then require human adoption.")}
        </div>
        <p>v2.0 closes the loop: what the pipeline learns from its own runs becomes reviewable, promotable state — never a silent write-through.</p>
        <div class="planned-box">Committed after v1.9 — <a href="#">read the full 2.0 plan of record</a>.</div>
      </div></div>
    </article>
  </section>

  <section class="tab-panel" data-panel="planned" hidden>
    <div class="panel-head"><h2>What's planned</h2><span class="panel-sub">v2.0 is in build. Vote within v2.1–v2.3 to shape what follows.</span></div>
    <article class="plan-card is-open">
      <button class="pc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--next">v2.1</span><span class="pc-title">Distribution &amp; discovery</span><span class="pc-timing">Q4 2026</span></span><span class="pc-summary">Registry presence, plugin marketplace polish, and agent-facing discovery surfaces.</span></span></button>
      <div class="card-body"><div class="card-body-inner">
        <div class="tag-row"><span class="tag tag--planned">planned</span><span class="tag">3 items</span></div>
        <ul class="horizon-list">
          ${horizon("MCP registry auto-republish", "Republish the hosted server listing on every tagged release, not just manual dispatch.", 42, true)}
          ${horizon("Per-skill install pages", "One-click install for a single skill instead of the full bundle.", 27, false)}
          ${horizon("Codex-native checkpoint reads", "Let non-Claude agents read checkpoints through the hosted endpoint without a local clone.", 19, false)}
        </ul>
        <div class="planned-box">Voting is open — use each item to signal priority within this release.</div>
      </div></div>
    </article>
    <article class="plan-card"><button class="pc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--next">v2.2</span><span class="pc-title">Fleet operations</span><span class="pc-timing">2027 H1</span></span><span class="pc-summary">Multi-repo orchestration and cross-project checkpoints.</span></span></button></article>
  </section>
  <p class="footer-note">Skill versions are stamped in <code>skills/&lt;name&gt;/SKILL.md</code> under <code>version:</code>; this page rolls them up by release.</p>
</main>
${footer}
</div>`;

export const cmd = (c) => `<code class="cmd">${c}</code>`;
export const skillPage = `
<div class="page page-skill" data-page="skill" hidden>
${header("/skills")}
<main class="pg pg-skill">
  <a href="#" class="back">${ICON.arrowLeft} all skills</a>
  <header class="head">
    <span class="eyebrow">plan · build</span>
    <h1>OC · App Architect</h1>
    <p class="lede">Idea → spec → design → build → launch in one skill. v1.2 reads PM tickets and writes sprints back via PM-MCP.</p>
    <div class="tags"><span class="badge badge-accent">plan</span><span class="badge badge-accent">build</span><span class="badge badge-accent">Tri-agent</span><span class="badge badge-neutral">v1.9.0</span><span class="badge badge-neutral">Updated Sep 02, 2026</span><span class="card-role-tag" data-role="tri-agent">tri-agent</span></div>
  </header>
  <section class="quick">
    <div class="card card-surface"><div class="quick-head">Commands</div><div class="cmds">${["/oc-app", "/oc-discover", "/oc-spec", "/oc-design", "/oc-roadmap", "/oc-scaffold", "/oc-build", "/oc-launch"].map(cmd).join("")}</div></div>
    <div class="card card-surface"><div class="quick-head">Pipeline phase</div><p class="quick-body"><strong>plan · build</strong> · runs as a tri-agent loop (Planner / Generator / Evaluator)</p>
      <div class="quick-head" style="margin-top:.7rem">Chains to</div>
      <div class="chain-row"><a class="chain-pill" href="#" data-role="specialist"><span class="role-dot"></span>oc-stack-forge</a><a class="chain-pill" href="#" data-role="tri-agent"><span class="role-dot"></span>oc-ux-engineer</a><a class="chain-pill" href="#" data-role="audit-gate"><span class="role-dot"></span>oc-bug-check</a><a class="chain-pill" href="#" data-role="workflow"><span class="role-dot"></span>oc-git-ops</a></div></div>
    <div class="card card-surface"><div class="quick-head">Get this skill</div><p class="quick-body">Drop the bundle into <code class="ic">.claude/skills/</code> and Claude Code auto-discovers it on the next session — or point Codex / any MCP agent at the hosted <code class="ic">opchain.dev/mcp</code> endpoint.</p>
      <div class="try-actions"><a class="btn btn-outline btn-sm" href="#">${ICON.download} download skill</a></div>
      <div class="related-row"><a class="related-link" href="#">${ICON.sparkles} see it run in the demo</a><a class="related-link" href="#">${ICON.refresh} what changed in this skill</a></div></div>
  </section>
  <section class="usage"><h2>How you'll use it</h2>
    <p class="usage-desc">Unified app development: idea → spec → design → build with Generator/Evaluator QA loop → launch. Use for "build me an app", "I have an app idea", or any software project. Chains to oc-stack-forge and oc-ux-engineer.</p>
    <p class="usage-label">Trigger with natural language or a slash command:</p>
    <div class="usage-cmds">${["/oc-app", "/oc-discover", "/oc-spec", "/oc-design", "/oc-roadmap", "/oc-scaffold"].map(cmd).join("")}<span class="cmd-more">+2 more</span></div>
  </section>
  <section class="prose-wrap">
    <div class="prose-head"><div class="prose-head-row"><span class="prose-eyebrow">SKILL.md</span><span class="prose-readtime">≈ 14 min read</span></div>
      <span class="prose-note">Below is the file Claude reads on invocation. It's written in the model's voice — "read this", "do that" — not a user guide. The <a href="#">How you'll use it</a> section above is the one for you.</span></div>
    <section class="prose">
      <h2 id="p1">Phase 1: Discovery</h2>
      <p>Interview the user. Do not write a spec until you can state the problem in one sentence, the user in one sentence, and the non-goal in one sentence. Write the checkpoint <code>phase: "discovery"</code> before the first question.</p>
      <pre><code><span class="c">// .checkpoints/oc-app-architect.checkpoint.json</span>
{
  <span class="k">"phase"</span>: <span class="s">"discovery"</span>,
  <span class="k">"step"</span>: <span class="s">"problem-statement"</span>,
  <span class="k">"next_actions"</span>: [<span class="s">"confirm non-goal"</span>, <span class="s">"pick stack via oc-stack-forge"</span>]
}</code></pre>
      <h3 id="p1b">Gate: problem statement approval</h3>
      <p>Present the three sentences. <strong>Do not proceed until approved.</strong> If the user adds scope, restate all three and ask again.</p>
      <table><thead><tr><th>Criterion</th><th>Weight</th><th>Verified by</th></tr></thead><tbody>
        <tr><td>Functionality</td><td>40%</td><td>Evaluator runs the contract's test list</td></tr>
        <tr><td>Feature completeness</td><td>35%</td><td>Punch list coverage ≥ 90%</td></tr>
        <tr><td>Code quality</td><td>25%</td><td>oc-bug-check passes silently</td></tr></tbody></table>
      <h2 id="p2">Phase 2: Stack selection</h2>
      <p>Hand off to <a href="#">oc-stack-forge</a> with the problem statement and constraints. Read its handoff back before writing a line of the spec.</p>
    </section>
  </section>
  <aside class="toc-rail"><div class="toc-rail-inner"><span class="toc-rail-eyebrow">on this page</span>
    <ol class="toc-list"><li><a href="#" class="is-active">Phase 1: Discovery</a><ol><li><a href="#">Gate: problem statement</a></li></ol></li><li><a href="#">Phase 2: Stack selection</a></li><li><a href="#">Phase 3: Design</a></li><li><a href="#">Phase 6: Build loop</a></li><li><a href="#">Checkpoint integration</a></li></ol></div></aside>
  <section class="cta"><h2>Ready to run it?</h2><p>Install the bundle, open a new session, and say what you want to build.</p><div class="cta-row"><a class="btn btn-primary" href="#">install opchain</a><a class="btn btn-outline" href="#">read the architecture</a></div></section>
</main>
${footer}
</div>`;

// All-sets overview: each mini scopes its own tokens via data-set/data-mode.
const mini = (s) => `
<div class="mini" data-set="${s.id}" data-mode="dark"${s.treatment ? ` data-treatment="${s.treatment}"` : ""} data-mini>
  <div class="mini-ribbon">${LOGO(16)}<span class="mini-brand">opchain</span><span class="mini-nav">Product · Pipeline · Resources</span><span class="mini-install">install</span></div>
  <div class="mini-body">
    <div class="mini-head"><span class="mini-num">${String(s.id).padStart(2, "0")}</span><span class="mini-name">${s.name}</span><span class="mini-tag">${s.tag}</span></div>
    <span class="eyebrow">skill ecosystem</span>
    <div class="mini-btns"><span class="btn btn-primary btn-sm">install opchain</span><span class="btn btn-outline btn-sm">browse</span></div>
    <div class="mini-ids"><span class="hero-badge id-rel">released</span><span class="hero-badge id-next">next</span><span class="hero-badge id-plan">planned</span></div>
    <div class="mini-roles">${["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"].map((r) => `<span class="card-role-tag" data-role="${r}">${r}</span>`).join("")}</div>
    <div class="mini-sem"><span class="badge badge-success">success</span><span class="badge badge-danger">danger</span><span class="badge badge-warning">warning</span><span class="badge badge-info">info</span><span class="badge badge-progress">in&nbsp;progress</span></div>
    <div class="mini-swatches" aria-hidden="true">${["danger","warning","success","info","in-progress"].map((k) => `<span style="background:var(--${k})"></span>`).join("")}</div>
    <div class="mini-swatches mini-swatches--roles" aria-hidden="true">${["workflow","tri-agent","audit-gate","specialist","advisor","orchestrator"].map((k) => `<span style="background:var(--${k})"></span>`).join("")}</div>
  </div>
</div>`;
const group = (head, rows) => `<div class="all-group"><div class="all-group-head">${head}</div><div class="all-grid">${rows.map(mini).join("")}</div></div>`;
const byFam = (f) => tokens.sets.filter((s) => s.family === f);
const allPage = `
<div class="page page-all" data-page="all" hidden>
  <div class="all-wrap">
    ${group("round 4 · the eight least-explored hues · farthest-point picks over the 23 accents already in use · roles gamut-maxed, semantics muted to half chroma", byFam("fresh"))}
    ${group("round 3 · six semantic systems on one ground · muted seaglass, vs. its round-2 parent set 17", [tokens.sets[16], ...byFam("seaglass-sem")])}
    ${group("round 2 · slate family · set 06's ground, four accents", [tokens.sets[5], ...byFam("slate")])}
    ${group("round 2 · plum family · muted ground (bg chroma halved) vs. the original set 07", [tokens.sets[6], ...byFam("plum")])}
    ${group("round 2 · seaglass family · muted ground (bg chroma halved) vs. the original set 10", [tokens.sets[9], ...byFam("seaglass")])}
    ${group("round 1 · batch 1 · Obsidian background unchanged", tokens.sets.filter((s) => s.batch === 1))}
    ${group("round 1 · batch 2 · background hue shifted at the same darkness", tokens.sets.filter((s) => s.batch === 2))}
  </div>
</div>`;

// ─────────────────────────── CSS ───────────────────────────
export const css = `
:root {
  --font-display: "Outfit", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-body: var(--font-display);
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --fs-xs: 11px; --fs-sm: 13px; --fs-base: 15px; --fs-md: 17px; --fs-lg: 21px; --fs-xl: 29px; --fs-2xl: 37px; --fs-3xl: 49px;
  --lh-tight: 1.1; --lh-snug: 1.35; --lh-base: 1.55;
  --ls-tight: -0.015em; --ls-wide: 0.05em; --ls-wider: 0.1em; --ls-widest: 0.15em; --ls-display: 0.22em;
  --r-xs: 3px; --r-sm: 4px; --r-md: 6px; --r-lg: 8px; --r-xl: 12px; --r-pill: 999px;
  --dur-fast: 120ms; --dur-base: 200ms; --ease-standard: cubic-bezier(0.4,0,0.2,1);
  --shadow-lg: 0 8px 24px -6px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.12);
  --glow-ribbon: 0 8px 24px -8px var(--glow, transparent);
  --glow-lg: 0 0 32px -6px var(--glow, transparent);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { font: var(--fs-base)/var(--lh-base) var(--font-body); background: #0b0a09; color: #e8dfd0; -webkit-font-smoothing: antialiased; }

/* ═══════════ preview chrome (fixed palette, independent of sets) ═══════════ */
.chrome { position: sticky; top: 0; z-index: 100; background: #100e0c; border-bottom: 0.5px solid #2c2620; color: #c4b89e; font-family: var(--font-mono); }
.chrome-row { max-width: 1240px; margin: 0 auto; padding: .55rem 1.25rem; display: flex; align-items: center; gap: .75rem 1.1rem; flex-wrap: wrap; }
.chrome-row + .chrome-row { border-top: 0.5px solid #1f1b17; padding-top: .45rem; padding-bottom: .5rem; }
.chrome-title { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #e8dfd0; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.chrome-title::before { content: ""; width: 14px; height: 1px; background: #e8dfd0; }
.chrome-sub { font-size: 10px; color: #7d6e5c; letter-spacing: .06em; }
.chrome-spacer { flex: 1; }
.seg { display: inline-flex; border: 0.5px solid #3a3129; border-radius: var(--r-pill); overflow: hidden; }
.seg button { font: 500 10px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; background: transparent; color: #c4b89e; border: 0; padding: .45rem .8rem; cursor: pointer; }
.seg button + button { border-left: 0.5px solid #3a3129; }
.seg button:hover { color: #fff; }
.seg button[aria-pressed="true"] { background: #e8dfd0; color: #100e0c; }
.grp { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #7d6e5c; margin-right: .1rem; white-space: nowrap; }
.set-pills { display: inline-flex; gap: .3rem; flex-wrap: wrap; }
.set-pill { display: inline-flex; align-items: center; gap: .45rem; font: 500 10.5px/1 var(--font-mono); letter-spacing: .04em; color: #c4b89e; background: #17130f; border: 0.5px solid #3a3129; border-radius: var(--r-pill); padding: .38rem .7rem .38rem .45rem; cursor: pointer; transition: border-color var(--dur-fast), color var(--dur-fast); }
.set-pill:hover { color: #fff; border-color: #6a5c4c; }
.set-pill[aria-pressed="true"] { color: #fff; border-color: #e8dfd0; background: #221c16; }
.set-pill .sw { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--sw-bg); background: var(--sw-accent); box-shadow: 0 0 0 1px rgba(255,255,255,.06); flex: none; }
.set-pill .sw2 { width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(135deg, var(--sw-accent) 50%, var(--sw-bg) 50%); box-shadow: 0 0 0 1px rgba(255,255,255,.12); flex: none; }
.set-pill kbd { font: inherit; color: #7d6e5c; }
.kbd-hint { font-size: 9.5px; color: #5f5344; letter-spacing: .04em; }
.kbd-hint kbd { font: inherit; color: #9d8b78; border: 0.5px solid #3a3129; border-radius: 3px; padding: 0 4px; }
.chrome-row--r2 { background: #131009; }
.chrome-row--r3 { background: #0d1414; }
.chrome-row--r4 { background: #14100d; }
.grp.r2 { color: #e8dfd0; letter-spacing: .16em; }
.info-name .pair-fam { color: #e8dfd0; border-color: #6a5c4c; }

.info { background: #0d0c0a; border-bottom: 0.5px solid #2c2620; position: relative; }
.info-toggle { position: absolute; right: 1.25rem; top: .55rem; font: 500 9.5px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: #9d8b78; background: #17130f; border: 0.5px solid #3a3129; border-radius: var(--r-pill); padding: .3rem .6rem; cursor: pointer; }
.info-toggle:hover { color: #fff; }
.info.is-collapsed .info-inner { padding: .5rem 1.25rem; grid-template-columns: 1fr; }
.info.is-collapsed #info-right, .info.is-collapsed .info-why { display: none; }
.info.is-collapsed .info-name { font-size: 15px; }
.info.is-collapsed .info-tag { margin: 0; font-size: 12px; }
.info-inner { max-width: 1240px; margin: 0 auto; padding: .8rem 1.25rem .9rem; display: grid; grid-template-columns: minmax(280px, 1.1fr) minmax(0, 2fr); gap: 1rem 2rem; align-items: start; }
@media (max-width: 900px) { .info-inner { grid-template-columns: 1fr; } }
.info-name { font-family: var(--font-display); font-size: 20px; font-weight: 600; color: #f6f0e8; letter-spacing: -0.01em; display: flex; align-items: baseline; gap: .6rem; }
.info-name .num { font: 500 11px var(--font-mono); color: #7d6e5c; letter-spacing: .1em; }
.info-name .pair { font: 500 9px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: #9d8b78; border: 0.5px solid #3a3129; border-radius: var(--r-pill); padding: 2px 7px; }
.info-tag { font-family: var(--font-display); font-size: 13px; color: #c4b89e; margin: .15rem 0 .35rem; }
.info-why { font-family: var(--font-display); font-size: 12.5px; line-height: 1.5; color: #9d8b78; margin: 0; max-width: 56ch; }
.chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.chip { display: inline-flex; align-items: center; gap: .45rem; background: #15120f; border: 0.5px solid #2c2620; border-radius: var(--r-sm); padding: .3rem .5rem; font-size: 10px; color: #9d8b78; line-height: 1; }
.chip .sw { width: 14px; height: 14px; border-radius: 3px; border: 0.5px solid rgba(255,255,255,.1); flex: none; }
.chip .sw.round { border-radius: 50%; }
.chip .nm { color: #c4b89e; letter-spacing: .04em; }
.chip .hx { color: #6f6253; }
.chip .cr { color: #9d8b78; }
.chip .cr.ok { color: #7fd5a3; }
.chip .cr.bad { color: #f08c8c; }
.chips-label { flex-basis: 100%; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #5f5344; margin-top: .25rem; }
.audit-line { font-size: 10px; color: #7d6e5c; margin-top: .5rem; letter-spacing: .04em; }
.audit-line b { color: #7fd5a3; font-weight: 500; }
.audit-line b.bad { color: #f08c8c; }

/* ═══════════ site frame ═══════════ */
.site { background: var(--bg); color: var(--text); min-height: 100vh; transition: background var(--dur-base), color var(--dur-base); }
.page[hidden] { display: none; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); }
::selection { background: var(--accent); color: var(--on-accent); }
code { font-family: var(--font-mono); font-size: .92em; }
h1, h2, h3 { font-family: var(--font-display); letter-spacing: var(--ls-tight); margin: 0; color: var(--text); }

/* Header */
.site-header { position: sticky; top: 0; z-index: 50; background: var(--ribbon); border-bottom: 0.5px solid var(--ribbon-edge); box-shadow: var(--glow-ribbon); }
.site-header-inner { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem; height: 56px; display: flex; align-items: center; gap: 1rem; }
.site-header-brand { display: inline-flex; align-items: center; gap: .55rem; color: var(--text); }
.logo { font-family: var(--font-display); font-weight: 600; font-size: 15px; letter-spacing: var(--ls-display); text-transform: lowercase; }
.nav { display: flex; align-items: center; gap: .15rem; margin-left: .5rem; }
.nav-group-btn { display: inline-flex; align-items: center; gap: .4rem; font: 500 13px var(--font-display); color: var(--muted); background: none; border: 0; padding: .45rem .7rem; border-radius: var(--r-sm); cursor: pointer; }
.nav-group-btn:hover { color: var(--text); background: var(--surface); }
.nav-group.is-active .nav-group-btn { color: var(--text); }
.nav-caret { width: 0; height: 0; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent; border-top: 4px solid currentColor; opacity: .6; }
.nav-badge { font: 600 8.5px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; padding: 2px 5px; border-radius: var(--r-xs); }
.nav-badge.new { color: var(--on-accent); background: var(--accent); }
.nav-badge.tool { color: var(--secondary); border: 0.5px solid var(--secondary); }
.nav-install { font: 500 13px var(--font-display); color: var(--accent); border: 0.5px solid var(--accent); border-radius: var(--r-pill); padding: .3rem .9rem; margin-left: .3rem; }
.nav-install:hover { background: var(--accent-dim); }
.right-cluster { margin-left: auto; display: flex; align-items: center; gap: .55rem; }
.search-trigger { display: inline-flex; align-items: center; gap: .4rem; background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-md); padding: .3rem .55rem; color: var(--subtle); width: 230px; }
.search-trigger svg { width: 14px; height: 14px; flex: none; }
.search-trigger input { flex: 1; min-width: 0; font: 12px var(--font-display); background: transparent; border: 0; color: var(--text); outline: 0; }
.search-trigger input::placeholder { color: var(--subtle); }
.search-kbd { font: 10px var(--font-mono); color: var(--subtle); border: 0.5px solid var(--border); border-radius: 3px; padding: 1px 4px; }
.version-chip { display: inline-flex; align-items: center; gap: .4rem; font: 500 11px var(--font-mono); color: var(--muted); border: 0.5px solid var(--border); border-radius: var(--r-pill); padding: .28rem .6rem; }
.version-chip:hover { border-color: var(--accent); color: var(--text); }
.vchip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px var(--success-dim); }
.util-feedback { font: 500 12px var(--font-display); color: var(--muted); background: none; border: 0; cursor: pointer; }
.util-feedback:hover { color: var(--text); }
.theme-toggle { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); background: none; border: 0.5px solid var(--border); border-radius: var(--r-md); cursor: pointer; }
.theme-toggle svg { width: 14px; height: 14px; }

/* Shared atoms */
.eyebrow { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--accent); letter-spacing: var(--ls-widest); text-transform: uppercase; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.eyebrow::before { content: ""; display: inline-block; width: 18px; height: 1px; background: var(--accent); }
.btn { display: inline-flex; align-items: center; gap: .5rem; font-family: var(--font-mono); font-weight: 500; letter-spacing: var(--ls-wide); border-radius: var(--r-sm); text-decoration: none; cursor: pointer; font-size: 11px; padding: .55rem 1.1rem; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); line-height: 1.2; }
.btn svg { width: 12px; height: 12px; }
.btn-sm { font-size: 10px; padding: .4rem .75rem; }
.btn-lg { font-size: 12px; padding: .7rem 1.4rem; }
.btn-primary { background: var(--accent-fill); color: var(--on-accent-fill); border: 0.5px solid var(--accent-fill); }
.btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: var(--on-accent); }
.btn-outline { background: transparent; color: var(--accent); border: 0.5px solid var(--accent); }
.btn-outline:hover { background: var(--accent-dim); color: var(--accent); }
.btn-ghost { background: transparent; color: var(--muted); border: 0.5px solid transparent; }
.btn-ghost:hover { color: var(--text); border-color: var(--border); }
.badge { display: inline-flex; align-items: center; font-family: var(--font-mono); font-size: 10px; letter-spacing: .04em; padding: 2px 7px; border-radius: var(--r-xs); border: 0.5px solid currentColor; line-height: 1.5; }
.badge-accent { color: var(--accent); } .badge-neutral { color: var(--muted); } .badge-success { color: var(--success); } .badge-danger { color: var(--danger); } .badge-info { color: var(--info); } .badge-warning { color: var(--warning); } .badge-progress { color: var(--in-progress); }
.card { border: 0.5px solid var(--border); border-radius: var(--r-lg); padding: 1rem 1.1rem; }
.card-surface { background: var(--surface); }
.card-role-tag { --pill-color: var(--specialist); --pill-bg: var(--specialist-pill); display: inline-flex; align-items: center; padding: 2px 7px; font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: .02em; line-height: 1.5; color: var(--pill-color); border: 0.5px solid var(--pill-color); background: var(--pill-bg); white-space: nowrap; text-transform: lowercase; }
.card-role-tag[data-role="workflow"] { --pill-color: var(--workflow); --pill-bg: var(--workflow-pill); }
.card-role-tag[data-role="tri-agent"] { --pill-color: var(--tri-agent); --pill-bg: var(--tri-agent-pill); }
.card-role-tag[data-role="audit-gate"] { --pill-color: var(--audit-gate); --pill-bg: var(--audit-gate-pill); }
.card-role-tag[data-role="specialist"] { --pill-color: var(--specialist); --pill-bg: var(--specialist-pill); }
.card-role-tag[data-role="advisor"] { --pill-color: var(--advisor); --pill-bg: var(--advisor-pill); }
.card-role-tag[data-role="orchestrator"] { --pill-color: var(--orchestrator); --pill-bg: var(--orchestrator-pill); }
.role-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--rc, var(--accent)); }
.chain-row { display: flex; flex-wrap: wrap; gap: .3rem; }
.chain-pill { display: inline-flex; align-items: center; gap: .4rem; font: 500 10.5px var(--font-mono); color: var(--text); background: var(--card); border: 0.5px solid var(--border); border-radius: var(--r-pill); padding: 3px 9px 3px 7px; }
.chain-pill:hover { border-color: var(--rc); color: var(--text); }
.chain-pill[data-role="workflow"] { --rc: var(--workflow); } .chain-pill[data-role="tri-agent"] { --rc: var(--tri-agent); } .chain-pill[data-role="audit-gate"] { --rc: var(--audit-gate); } .chain-pill[data-role="specialist"] { --rc: var(--specialist); } .chain-pill[data-role="advisor"] { --rc: var(--advisor); } .chain-pill[data-role="orchestrator"] { --rc: var(--orchestrator); }

/* ── Home ── */
.intro { max-width: 960px; margin: 0 auto; padding: 3rem 1.5rem 0; display: flex; flex-direction: column; align-items: center; text-align: center; gap: .9rem; }
.intro-hero { display: flex; align-items: center; gap: 1.1rem; margin-top: .4rem; }
.intro-mark { font-family: var(--font-display); font-weight: 600; font-size: clamp(2.25rem, 7vw, 3.75rem); letter-spacing: var(--ls-display); color: var(--text); text-transform: lowercase; }
.intro-claim { font-family: var(--font-display); font-size: var(--fs-xl); font-weight: 500; color: var(--text); margin: -.2rem 0 0; letter-spacing: var(--ls-tight); }
.intro-tagline { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--muted); letter-spacing: .02em; max-width: 60ch; }
.intro-body { max-width: 62ch; color: var(--muted); font-size: var(--fs-base); }
.intro-body p { margin: 0 0 .9rem; }
.release-bar-glow { display: grid; grid-template-columns: minmax(0,auto) auto minmax(0,auto) auto; align-items: center; margin: .6rem auto .3rem; max-width: min(100%, 880px); padding: 4px 10px 4px 4px; background: var(--surface); border: 0.5px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 12px; box-shadow: 0 0 0 1px var(--accent-glow), 0 0 24px -8px var(--accent-glow); animation: rb-pulse 3.4s ease-in-out infinite; }
@keyframes rb-pulse { 0%,100% { box-shadow: 0 0 0 1px var(--accent-dim), 0 0 18px -8px var(--accent-glow); } 50% { box-shadow: 0 0 0 1px var(--accent-glow), 0 0 30px -6px var(--accent-glow); } }
.rb-half { display: inline-flex; align-items: center; gap: .6rem; padding: .2rem .5rem; min-width: 0; }
.rb-tag { font: 500 10px var(--font-mono); letter-spacing: .06em; text-transform: uppercase; color: var(--on-accent); background: var(--accent); border-radius: 999px; padding: .28rem .6rem; white-space: nowrap; }
.rb-tag-next { color: var(--secondary); background: var(--secondary-dim); border: 0.5px solid var(--secondary); }
.rb-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rb-text-next { color: var(--muted); }
.rb-divider { width: 0.5px; height: 18px; background: var(--border); margin: 0 .3rem; }
.rb-arrow { color: var(--subtle); font-size: 16px; padding-left: .3rem; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; width: 100%; max-width: 640px; margin: .6rem auto 0; }
.stat { display: flex; flex-direction: column; align-items: center; gap: .15rem; padding: .7rem .85rem; background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-md); color: var(--muted); }
.stat:hover { border-color: var(--accent); color: var(--text); }
.stat-num { font-family: var(--font-display); font-size: var(--fs-lg); font-weight: 600; color: var(--text); letter-spacing: var(--ls-tight); line-height: 1; }
.stat-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--ls-widest); text-transform: uppercase; color: var(--subtle); }
.stage { position: relative; align-self: stretch; margin: 1.5rem -1.5rem 0; padding: 1.4rem clamp(1.5rem, 4vw, 2.4rem) 1.2rem; overflow: hidden; text-align: left; min-height: 240px; display: flex; flex-direction: column; justify-content: center; background: radial-gradient(720px 320px at 75% 35%, var(--accent-glow), transparent 70%), radial-gradient(540px 260px at 12% 80%, var(--accent-dim), transparent 70%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 88%, black) 0%, var(--bg) 100%); border-top: 0.5px solid var(--border); border-bottom: 0.5px solid var(--border); }
[data-mode="light"] .stage { background: radial-gradient(720px 320px at 75% 35%, var(--accent-glow), transparent 70%), radial-gradient(540px 260px at 12% 80%, var(--accent-dim), transparent 70%), linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%); }
.stage-mid { max-width: 940px; margin: 0 auto; width: 100%; }
.stage-issue { color: var(--accent); font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--ls-widest); text-transform: uppercase; margin-bottom: .5rem; }
.stage-h { font-size: clamp(1.25rem, 2.6vw, 1.85rem); font-weight: 600; line-height: 1.15; margin: 0 0 .4rem; max-width: 36ch; }
.stage-sub { font-size: var(--fs-base); color: var(--muted); max-width: 44rem; margin: 0 0 .85rem; line-height: var(--lh-snug); }
.stage-actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
.dot-row { display: flex; align-items: center; gap: 6px; margin-top: 1rem; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
.dot.active { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.dot-counter { font: 10px var(--font-mono); color: var(--subtle); margin-left: .5rem; letter-spacing: .08em; }
.resources-strip { width: 100%; max-width: 960px; margin: 3rem auto 0; text-align: center; }
.resources-heading { font-size: var(--fs-2xl); font-weight: 600; margin: .5rem 0 0; }
.resources-sub { color: var(--muted); max-width: 48ch; margin: .5rem auto 1.5rem; font-size: var(--fs-sm); }
.res-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; text-align: left; }
@media (max-width: 900px) { .res-grid { grid-template-columns: 1fr 1fr; } .stats { grid-template-columns: 1fr 1fr; } }
.res-card { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--r-lg); padding: 1.25rem; color: var(--text); display: flex; flex-direction: column; gap: .5rem; }
.res-card:hover { border-color: var(--accent); color: var(--text); box-shadow: 0 0 0 1px var(--accent-dim); }
.res-icon { width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; background: var(--accent-dim); color: var(--accent); border-radius: var(--r-md); }
.res-icon svg { width: 18px; height: 18px; }
.res-card h3 { font-size: var(--fs-md); font-weight: 600; }
.res-card p { margin: 0; font-size: var(--fs-sm); color: var(--muted); line-height: var(--lh-snug); flex: 1; }
.res-card .read { font: 500 11px var(--font-mono); color: var(--accent); letter-spacing: .04em; }
.intro-actions { display: flex; gap: .6rem; margin-top: 2.2rem; }
.role-strip { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; justify-content: center; margin: 1.6rem 0 0; }
.role-strip-label { font: 500 9.5px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--subtle); margin-right: .3rem; }

/* Footer */
.site-footer { border-top: 0.5px solid var(--border); background: var(--bg); color: var(--muted); margin-top: 5rem; }
.site-footer-inner { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 1.5rem; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 1.5rem; }
@media (max-width: 800px) { .site-footer-inner { grid-template-columns: 1fr 1fr; } }
.site-footer .col { display: flex; flex-direction: column; gap: .35rem; }
.site-footer .col a { font-size: 13px; color: var(--muted); }
.site-footer .col a:hover { color: var(--accent); }
.col-head { font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); margin-bottom: .3rem; }
.site-footer .brand { font-family: var(--font-display); font-weight: 600; letter-spacing: var(--ls-display); color: var(--text); font-size: 15px; }
.site-footer .tagline { margin: .2rem 0 0; font-size: 13px; }
.site-footer-newsletter { max-width: 960px; margin: 0 auto; padding: 1.25rem 1.5rem; border-top: 0.5px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
.nl-head { font-family: var(--font-display); font-weight: 600; color: var(--text); font-size: var(--fs-md); }
.nl-sub { margin: .2rem 0 0; font-size: 12.5px; color: var(--muted); max-width: 52ch; }
.nl-form { display: flex; gap: .4rem; }
.nl-form input { font: 12.5px var(--font-display); background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-sm); padding: .45rem .7rem; color: var(--text); width: 220px; }
.site-footer-meta { max-width: 960px; margin: 0 auto; padding: .9rem 1.5rem 1.6rem; display: flex; justify-content: space-between; font: 10.5px var(--font-mono); color: var(--subtle); letter-spacing: .04em; }

/* ── Changelog / skill shared page frame ── */
.pg { max-width: 820px; margin: 0 auto; padding: 2.4rem 1.5rem 0; }
.page-head { margin-bottom: 1.6rem; }
.page-head h1, .head h1 { font-size: var(--fs-3xl); font-weight: 600; margin: .4rem 0 .5rem; }
.lede { color: var(--muted); font-size: var(--fs-md); max-width: 62ch; margin: 0; line-height: var(--lh-base); }
.lede code, .ic { font-family: var(--font-mono); font-size: .85em; color: var(--text); background: var(--surface); border: 0.5px solid var(--border); padding: 1px 5px; border-radius: var(--r-xs); }
.tab-bar { position: relative; border-bottom: 0.5px solid var(--border); margin-bottom: 1.75rem; }
.tab-list { display: flex; align-items: center; }
.tab-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.1rem; font: 500 var(--fs-sm) var(--font-display); color: var(--muted); background: none; border: 0; cursor: pointer; position: relative; z-index: 2; }
.tab-btn:hover, .tab-btn[aria-selected="true"] { color: var(--text); }
.tab-count { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: var(--ls-wide); background: var(--surface); border: 0.5px solid var(--border); padding: 1px 6px; border-radius: var(--r-pill); color: var(--subtle); }
.tab-btn[aria-selected="true"] .tab-count { background: var(--accent-dim); border-color: var(--accent); color: var(--text); }
.tab-btn--next[aria-selected="true"] .tab-count { background: var(--secondary-dim); border-color: var(--secondary); color: var(--text); }
.tab-btn--planned[aria-selected="true"] .tab-count { background: var(--tertiary-dim); border-color: var(--tertiary); color: var(--text); }
.tab-indicator { position: absolute; bottom: -0.5px; height: 2px; left: 0; width: 0; background: var(--accent); border-radius: 1px; transition: left var(--dur-base) var(--ease-standard), width var(--dur-base) var(--ease-standard); }
.tab-indicator[data-active="1"] { background: var(--secondary); }
.tab-indicator[data-active="2"] { background: var(--tertiary); }
.tab-panel[hidden] { display: none; }
.panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.1rem; }
.panel-head h2 { font-size: var(--fs-lg); font-weight: 600; }
.panel-sub { font-size: var(--fs-sm); color: var(--subtle); }
.hero-card { border: 0.5px solid var(--border); border-radius: var(--r-md); margin-bottom: .65rem; overflow: hidden; position: relative; background: var(--card); }
.hero-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.hero-card--released::before { background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 35%, transparent)); }
.hero-card--next::before { background: linear-gradient(180deg, var(--secondary), color-mix(in srgb, var(--secondary) 35%, transparent)); }
.hero-card--released.is-open { border-color: var(--accent); }
.hero-card--next.is-open { border-color: var(--secondary); }
.hero-head { display: block; width: 100%; text-align: left; background: none; border: 0; cursor: pointer; font: inherit; color: inherit; position: relative; padding: 1.4rem 2.9rem 1.4rem 1.5rem; }
.hero-chevron { position: absolute; top: 1.45rem; right: 1.3rem; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; border-radius: 50%; border: 0.5px solid var(--border); color: var(--subtle); transform: rotate(90deg); }
.hero-card--released.is-open .hero-chevron { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
.hero-card--next.is-open .hero-chevron { background: var(--secondary-dim); border-color: var(--secondary); color: var(--secondary); }
.hero-badge { display: inline-flex; align-items: center; gap: .35rem; font-family: var(--font-mono); font-size: 9.5px; letter-spacing: var(--ls-wide); text-transform: uppercase; padding: 2px 8px; border-radius: var(--r-pill); margin-bottom: .6rem; color: var(--text); }
.hero-badge::before { content: "●"; font-size: 6px; }
.hero-card--released .hero-badge, .id-rel { border: 0.5px solid var(--accent); background: var(--accent-dim); }
.hero-card--released .hero-badge::before, .id-rel::before { color: var(--accent); }
.hero-card--next .hero-badge, .id-next { border: 0.5px solid var(--secondary); background: var(--secondary-dim); }
.hero-card--next .hero-badge::before, .id-next::before { color: var(--secondary); }
.id-plan { border: 0.5px solid var(--tertiary); background: var(--tertiary-dim); }
.id-plan::before { color: var(--tertiary); }
.hero-ver { display: block; font-family: var(--font-mono); font-size: 11px; color: var(--subtle); margin-bottom: .3rem; }
.hero-title { display: block; font-family: var(--font-display); font-size: var(--fs-xl); font-weight: 600; color: var(--text); letter-spacing: var(--ls-tight); margin-bottom: .5rem; }
.hero-desc { display: block; font-size: var(--fs-sm); color: var(--muted); line-height: var(--lh-base); max-width: 64ch; }
.card-body-inner { padding: 0 1.5rem 1.4rem; font-size: var(--fs-sm); color: var(--muted); }
.card-body-inner h3 { font-size: var(--fs-md); font-weight: 600; margin: .2rem 0 .6rem; }
.card-body-inner p { margin: .6rem 0; }
.hero-body-inner { padding-top: 1rem; }
.tag-row { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .9rem; }
.tag { font: 500 10px var(--font-mono); letter-spacing: .04em; color: var(--muted); border: 0.5px solid var(--border); background: var(--surface); padding: 2px 7px; border-radius: var(--r-xs); }
.tag--accent { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }
.tag--info { color: var(--secondary); border-color: var(--secondary); background: var(--secondary-dim); }
.tag--planned { color: var(--tertiary); border-color: var(--tertiary); background: var(--tertiary-dim); }
.tile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; margin-bottom: 1.1rem; }
.tile { background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-sm); padding: .75rem .9rem; }
.tile-name { display: block; font-family: var(--font-mono); font-size: 11px; margin-bottom: .25rem; }
.tile-desc { font-size: 12px; color: var(--muted); line-height: var(--lh-snug); }
.hero-card--released .tile-name { color: var(--accent); }
.hero-card--next .tile-name { color: var(--secondary); }
.compat-box, .planned-box { background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-sm); padding: .8rem 1rem; font-size: 12.5px; line-height: var(--lh-base); }
.compat-box strong { color: var(--success); font-weight: 600; }
.compat-box code { color: var(--text); }
.rel-card, .plan-card { border: 0.5px solid var(--border); border-radius: var(--r-md); margin-bottom: .55rem; background: var(--card); overflow: hidden; }
.rel-card:hover { border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
.plan-card:hover { border-color: color-mix(in srgb, var(--tertiary) 35%, var(--border)); }
.plan-card.is-open { border-color: var(--tertiary); }
.rc-row, .pc-row { display: flex; gap: .8rem; width: 100%; text-align: left; background: none; border: 0; cursor: pointer; font: inherit; color: inherit; padding: .95rem 1.2rem; align-items: flex-start; }
.pc-toggle { font-size: 9px; color: var(--subtle); margin-top: .45rem; }
.plan-card.is-open .pc-toggle { transform: rotate(90deg); color: var(--tertiary); }
.pc-meta { flex: 1; min-width: 0; }
.pc-head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .2rem; }
.pc-title { font-family: var(--font-display); font-weight: 600; color: var(--text); font-size: var(--fs-md); }
.pc-timing { font: 11px var(--font-mono); color: var(--subtle); }
.pc-summary { font-size: var(--fs-sm); color: var(--muted); }
.ver-pill { font: 500 10.5px var(--font-mono); letter-spacing: .04em; padding: 2px 8px; border-radius: var(--r-pill); }
.ver-pill--past { color: var(--subtle); border: 0.5px solid var(--border); }
.ver-pill--next { color: var(--tertiary); border: 0.5px solid var(--tertiary); }
.horizon-list { list-style: none; padding: 0; margin: .5rem 0 1rem; display: grid; gap: .5rem; }
.horizon-item { display: flex; align-items: center; gap: 1rem; background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-sm); padding: .7rem .85rem; }
.horizon-item:hover { border-color: color-mix(in srgb, var(--tertiary) 35%, var(--border)); }
.horizon-meta { flex: 1; min-width: 0; }
.horizon-title { display: block; font-family: var(--font-display); font-size: var(--fs-sm); font-weight: 600; color: var(--text); margin-bottom: 2px; }
.horizon-blurb { font-size: 12px; color: var(--muted); line-height: var(--lh-snug); margin: 0; }
.vote-btn { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; min-width: 50px; min-height: 46px; padding: 6px 10px; background: var(--bg); border: 0.5px solid var(--border); border-radius: var(--r-md); color: var(--text); font-family: var(--font-mono); cursor: pointer; flex-shrink: 0; }
.vote-btn:hover { border-color: var(--tertiary); background: var(--tertiary-dim); }
.vote-btn.voted { border-color: var(--tertiary); background: var(--tertiary-dim); color: var(--tertiary); }
.v-arrow { font-size: 13px; line-height: 1; } .v-count { font-size: 13px; font-weight: 700; line-height: 1.1; }
.v-label { font-size: 8.5px; letter-spacing: var(--ls-wider); text-transform: uppercase; color: var(--subtle); line-height: 1; }
.vote-btn.voted .v-label { color: var(--tertiary); }
.footer-note { font-size: 12px; color: var(--subtle); margin: 2rem 0 0; }
.footer-note code { color: var(--muted); }

/* ── Skill page ── */
.pg-skill { position: relative; }
.back { display: inline-flex; align-items: center; gap: .4rem; font: 500 11px var(--font-mono); color: var(--subtle); letter-spacing: .04em; margin-bottom: 1.2rem; }
.back svg { width: 12px; height: 12px; }
.back:hover { color: var(--accent); }
.head { margin-bottom: 1.4rem; }
.tags { display: flex; gap: .35rem; flex-wrap: wrap; margin-top: .8rem; align-items: center; }
.quick { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: .7rem; margin-bottom: 2rem; }
@media (max-width: 800px) { .quick { grid-template-columns: 1fr; } }
.quick-head { font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); margin-bottom: .5rem; }
.quick-body { margin: 0; font-size: 12.5px; color: var(--muted); line-height: var(--lh-base); }
.quick-body strong { color: var(--text); font-weight: 600; }
.cmds, .usage-cmds { display: flex; flex-wrap: wrap; gap: .3rem; }
.cmd { font-family: var(--font-mono); font-size: 11px; color: var(--text); background: var(--card); border: 0.5px solid var(--border); padding: 1px 6px; border-radius: var(--r-xs); }
.cmd-more { font: 10.5px var(--font-mono); color: var(--subtle); align-self: center; }
.try-actions { margin: .6rem 0 .5rem; }
.related-row { display: flex; flex-direction: column; gap: .3rem; }
.related-link { display: inline-flex; align-items: center; gap: .4rem; font: 500 11px var(--font-mono); color: var(--muted); }
.related-link svg { width: 12px; height: 12px; color: var(--accent); }
.related-link:hover { color: var(--accent); }
.usage { margin-bottom: 2rem; }
.usage h2 { font-size: var(--fs-lg); font-weight: 600; margin-bottom: .5rem; }
.usage-desc { color: var(--muted); font-size: var(--fs-base); line-height: var(--lh-base); margin: 0 0 .8rem; max-width: 66ch; }
.usage-label { font: 500 10px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--subtle); margin: 0 0 .4rem; }
.prose-head { border-top: 0.5px solid var(--border); padding-top: 1.2rem; margin-bottom: 1.2rem; }
.prose-head-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .3rem; }
.prose-eyebrow { font: 500 10px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.prose-readtime { font: 10.5px var(--font-mono); color: var(--subtle); }
.prose-note { font-size: 12.5px; color: var(--subtle); line-height: var(--lh-base); display: block; max-width: 70ch; }
.prose { font-size: var(--fs-base); color: var(--muted); line-height: 1.65; }
.prose h2 { font-size: var(--fs-lg); font-weight: 600; color: var(--text); margin: 1.6rem 0 .6rem; padding-bottom: .35rem; border-bottom: 0.5px solid var(--border); }
.prose h3 { font-size: var(--fs-md); font-weight: 600; color: var(--text); margin: 1.2rem 0 .4rem; }
.prose p { margin: 0 0 .8rem; }
.prose p code { font-size: .85em; color: var(--text); background: var(--surface); border: 0.5px solid var(--border); padding: 1px 5px; border-radius: var(--r-xs); }
.prose strong { color: var(--text); font-weight: 600; }
.prose pre { background: var(--surface); border: 0.5px solid var(--border); border-left: 3px solid var(--accent); border-radius: var(--r-sm); padding: .9rem 1rem; overflow-x: auto; margin: .8rem 0 1rem; font-size: 12.5px; line-height: 1.55; color: var(--text); }
.prose pre .c { color: var(--subtle); } .prose pre .k { color: var(--secondary); } .prose pre .s { color: var(--accent); }
.prose table { width: 100%; border-collapse: collapse; font-size: 13px; margin: .6rem 0 1rem; }
.prose th { text-align: left; font: 500 10px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--subtle); padding: .45rem .6rem; border-bottom: 0.5px solid var(--border); }
.prose td { padding: .5rem .6rem; border-bottom: 0.5px solid var(--border); color: var(--muted); }
.prose td:first-child { color: var(--text); }
.toc-rail { position: absolute; top: 2.4rem; right: -220px; width: 200px; }
@media (max-width: 1280px) { .toc-rail { display: none; } }
.toc-rail-inner { position: sticky; top: 72px; border-left: 0.5px solid var(--border); padding-left: 1rem; }
.toc-rail-eyebrow { display: block; font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); margin-bottom: .6rem; }
.toc-list, .toc-list ol { list-style: none; margin: 0; padding: 0; }
.toc-list ol { padding-left: .8rem; }
.toc-list li { margin: .25rem 0; }
.toc-list a { font-size: 12px; color: var(--subtle); display: block; line-height: 1.4; }
.toc-list a:hover { color: var(--accent); }
.toc-list a.is-active { color: var(--accent); font-weight: 500; margin-left: -1.05rem; padding-left: .95rem; border-left: 1.5px solid var(--accent); }
.cta { margin-top: 3rem; padding: 1.6rem 1.5rem; background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--glow-lg); }
.cta h2 { font-size: var(--fs-lg); font-weight: 600; margin-bottom: .3rem; }
.cta p { margin: 0 0 1rem; color: var(--muted); font-size: var(--fs-sm); }
.cta-row { display: flex; gap: .6rem; flex-wrap: wrap; }

/* ── All sets ── */
.page-all { background: #0b0a09; min-height: 100vh; }
.all-wrap { max-width: 1240px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
.all-group + .all-group { margin-top: 1.6rem; }
.all-group-head { font: 500 10px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: #7d6e5c; margin-bottom: .7rem; }
.all-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: .8rem; }
.mini { background: var(--bg); color: var(--text); border: 0.5px solid var(--border); border-radius: var(--r-lg); overflow: hidden; cursor: pointer; transition: transform var(--dur-fast), box-shadow var(--dur-fast); }
.mini:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0,0,0,.6); }
.mini-ribbon { display: flex; align-items: center; gap: .4rem; background: var(--ribbon); border-bottom: 0.5px solid var(--ribbon-edge); padding: .5rem .7rem; font: 500 9px var(--font-mono); color: var(--muted); }
.mini-brand { font-family: var(--font-display); font-weight: 600; letter-spacing: var(--ls-display); color: var(--text); font-size: 10px; }
.mini-nav { flex: 1; text-align: center; color: var(--subtle); font-size: 8.5px; }
.mini-install { color: var(--accent); border: 0.5px solid var(--accent); border-radius: var(--r-pill); padding: 1px 6px; font-size: 8.5px; }
.mini-body { padding: .8rem .8rem .9rem; display: flex; flex-direction: column; gap: .55rem; }
.mini-head { display: flex; align-items: baseline; gap: .45rem; flex-wrap: wrap; }
.mini-num { font: 500 9px var(--font-mono); color: var(--subtle); letter-spacing: .1em; }
.mini-name { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--text); }
.mini-tag { flex-basis: 100%; font-size: 10.5px; color: var(--muted); }
.mini .eyebrow { font-size: 9px; }
.mini-btns { display: flex; gap: .35rem; }
.mini-ids { display: flex; gap: .3rem; flex-wrap: wrap; }
.mini-ids .hero-badge { margin: 0; font-size: 8.5px; }
.mini-roles { display: flex; gap: .25rem; flex-wrap: wrap; }
.mini-roles .card-role-tag { font-size: 8.5px; padding: 1px 5px; }
.mini-sem { display: flex; gap: .25rem; flex-wrap: wrap; }
.mini-sem .badge { font-size: 8.5px; padding: 1px 5px; }
.mini-swatches { display: flex; gap: 3px; margin-top: .1rem; }
.mini-swatches span { flex: 1; height: 14px; border-radius: 2px; }
.mini-swatches--roles { margin-top: 3px; }
.mini-swatches--roles span { height: 9px; }

/* ═══════════ generated set tokens ═══════════ */

/* ══ round-3 page treatments ══════════════════════════════════
   These are the point of round 3: the six sets differ by how the
   accent is USED, not only by which hue it is. */

/* duotone — a second brand colour takes outlines, the install pill and
   the "read more" links, so the page alternates between two colours. */
[data-treatment="duotone"] .btn-outline { color: var(--accent-2); border-color: var(--accent-2); }
[data-treatment="duotone"] .btn-outline:hover { background: var(--accent-2-dim); color: var(--accent-2); }
[data-treatment="duotone"] .nav-install { color: var(--accent-2); border-color: var(--accent-2); }
[data-treatment="duotone"] .nav-install:hover { background: var(--accent-2-dim); }
[data-treatment="duotone"] .res-card .read { color: var(--accent-2); }
[data-treatment="duotone"] .res-card:hover { border-color: var(--accent-2); box-shadow: 0 0 0 1px var(--accent-2-dim); }
[data-treatment="duotone"] .stage { background:
  radial-gradient(720px 320px at 75% 35%, var(--accent-glow), transparent 70%),
  radial-gradient(540px 260px at 12% 80%, var(--accent-2-dim), transparent 70%),
  linear-gradient(180deg, color-mix(in srgb, var(--bg) 88%, black) 0%, var(--bg) 100%); }
[data-treatment="duotone"] .related-link svg { color: var(--accent-2); }
[data-treatment="duotone"] .toc-list a.is-active { color: var(--accent-2); border-left-color: var(--accent-2); }

/* halo — the accent never fills a shape. Primary buttons become outlines
   with a hard glow, so the page reads as lit rather than painted. */
[data-treatment="halo"] .btn-primary {
  background: transparent; color: var(--accent); border: 1px solid var(--accent);
  box-shadow: 0 0 18px -2px var(--accent-glow), inset 0 0 12px -6px var(--accent-glow);
}
[data-treatment="halo"] .btn-primary:hover { background: var(--accent-dim); color: var(--accent); box-shadow: 0 0 26px -2px var(--accent-glow); }
[data-treatment="halo"] .res-icon { background: transparent; border: 1px solid var(--accent); box-shadow: 0 0 14px -4px var(--accent-glow); }
[data-treatment="halo"] .rb-tag { background: transparent; color: var(--accent); border: 1px solid var(--accent); box-shadow: 0 0 14px -3px var(--accent-glow); }
[data-treatment="halo"] .nav-badge.new { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
[data-treatment="halo"] .dot.active { background: transparent; border: 1.5px solid var(--accent); box-shadow: 0 0 10px 0 var(--accent-glow); }
[data-treatment="halo"] .nl-form .btn-primary { box-shadow: 0 0 14px -3px var(--accent-glow); }

/* invert — the accent becomes a surface. The stage and the closing CTA are
   filled with it and their text drops to the ground colour. */
[data-treatment="invert"] .stage { background: var(--accent); border-color: var(--accent); }
[data-treatment="invert"] .stage-h, [data-treatment="invert"] .stage-sub { color: var(--on-accent); }
[data-treatment="invert"] .stage-issue { color: var(--on-accent); opacity: .75; }
[data-treatment="invert"] .stage .btn-primary { background: var(--on-accent); color: var(--accent); border-color: var(--on-accent); }
[data-treatment="invert"] .stage .btn-ghost { color: var(--on-accent); border-color: color-mix(in srgb, var(--on-accent) 40%, transparent); }
[data-treatment="invert"] .stage .dot { background: color-mix(in srgb, var(--on-accent) 35%, transparent); }
[data-treatment="invert"] .stage .dot.active { background: var(--on-accent); box-shadow: none; }
[data-treatment="invert"] .stage .dot-counter { color: var(--on-accent); opacity: .7; }
[data-treatment="invert"] .cta { background: var(--accent); border-color: var(--accent); box-shadow: none; }
[data-treatment="invert"] .cta h2, [data-treatment="invert"] .cta p { color: var(--on-accent); }
[data-treatment="invert"] .cta .btn-primary { background: var(--on-accent); color: var(--accent); border-color: var(--on-accent); }
[data-treatment="invert"] .cta .btn-outline { color: var(--on-accent); border-color: var(--on-accent); }

/* bone — achromatic brand; the semantic row is the only colour on the page. */
[data-treatment="bone"] .eyebrow { color: var(--muted); }
[data-treatment="bone"] .eyebrow::before { background: var(--muted); }

${tokenCss}
`;

// ─────────────────────────── JS ───────────────────────────
export const js = `
const DATA = ${JSON.stringify(tokens.sets.map((s) => ({ id: s.id, key: s.key, name: s.name, batch: s.batch, pairing: s.pairing, treatment: s.treatment, tag: s.tag, why: s.why, modes: s.modes, audit: s.audit })))};
const PAGES = ["home", "changelog", "skill", "all"];
const site = document.querySelector(".site");
const state = { set: 1, mode: "dark", page: "home" };

function lum(hex) { const c = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function cr(a, b) { const x = lum(a), y = lum(b); const [h, l] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (l + 0.05); }

function readHash() {
  let raw = "";
  try { raw = location.hash.slice(1); } catch (e) { return; }
  const p = new URLSearchParams(raw);
  const s = parseInt(p.get("set") || "1", 10); if (s >= 1 && s <= DATA.length) state.set = s;
  const m = p.get("mode"); if (m === "light" || m === "dark") state.mode = m;
  const pg = p.get("page"); if (PAGES.includes(pg)) state.page = pg;
}
// Deep-linking is a convenience, not a feature to break the page over.
// replaceState throws in an opaque origin — a sandboxed iframe, a data: URL,
// srcdoc — which is exactly how preview panes render a local file, and it
// fires on every set click, so an unguarded call spams the console. Detect
// once, then fall back to assigning location.hash, and give up silently if
// even that is refused.
let canWriteHash = true;
function writeHash() {
  if (!canWriteHash) return;
  const h = "#set=" + state.set + "&mode=" + state.mode + "&page=" + state.page;
  try { history.replaceState(null, "", h); }
  catch (e) {
    try { location.hash = h; } catch (e2) { canWriteHash = false; }
  }
}

function render() {
  site.dataset.set = state.set; site.dataset.mode = state.mode;
  const tre = DATA[state.set - 1].treatment; if (tre) site.dataset.treatment = tre; else delete site.dataset.treatment;
  document.querySelectorAll("[data-mini]").forEach(m => m.dataset.mode = state.mode);
  document.querySelectorAll(".page").forEach(p => p.hidden = p.dataset.page !== state.page);
  document.querySelectorAll("[data-page-btn]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pageBtn === state.page)));
  document.querySelectorAll("[data-mode-btn]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modeBtn === state.mode)));
  document.querySelectorAll("[data-set-btn]").forEach(b => { b.setAttribute("aria-pressed", String(+b.dataset.setBtn === state.set)); const t = DATA[+b.dataset.setBtn - 1].modes[state.mode]; b.style.setProperty("--sw-accent", t.accent); b.style.setProperty("--sw-bg", t.bg); });
  renderInfo(); writeHash();
  if (state.page === "changelog") requestAnimationFrame(() => positionIndicator([...document.querySelectorAll(".page-changelog [role=tab]")].findIndex(t => t.getAttribute("aria-selected") === "true")));
}

function chip(name, hex, extra, round) {
  return '<span class="chip"><span class="sw' + (round ? " round" : "") + '" style="background:' + hex + '"></span><span class="nm">' + name + '</span><span class="hx">' + hex + '</span>' + (extra || "") + '</span>';
}
function crSpan(fg, bg, min) { const r = cr(fg, bg); return '<span class="cr ' + (r >= min ? "ok" : "bad") + '" title="contrast vs ' + bg + '">' + r.toFixed(1) + ':1</span>'; }
function renderInfo() {
  const s = DATA[state.set - 1], t = s.modes[state.mode];
  const pairTxt = s.batch === 1 ? "bg unchanged" : (s.pairing === "family" ? "same-family pairing" : "contrast pairing");
  const pair = '<span class="pair">' + pairTxt + '</span>' + (s.treatment ? '<span class="pair pair-fam">treatment: ' + s.treatment + '</span>' : '') + (s.family ? '<span class="pair pair-fam">round 2 · ' + s.family + (s.family === "slate" ? "" : " · muted ground") + '</span>' : '');
  document.getElementById("info-left").innerHTML =
    '<div class="info-name"><span class="num">' + String(s.id).padStart(2, "0") + '</span>' + s.name + pair + '</div>' +
    '<div class="info-tag">' + s.tag + '</div><p class="info-why">' + s.why + '</p>';
  const fails = s.audit[state.mode].filter(r => !r.pass && r.min > 1.5);
  const total = s.audit[state.mode].filter(r => r.min > 1.5).length;
  let h = '<span class="chips-label">ground · ' + state.mode + '</span>';
  h += chip("bg", t.bg) + chip("ribbon", t.ribbon) + chip("surface", t.surface) + chip("card", t.card) + chip("border", t.border);
  h += '<span class="chips-label">text</span>';
  h += chip("text", t.text, crSpan(t.text, t.bg, 7)) + chip("muted", t.muted, crSpan(t.muted, t.bg, 4.5)) + chip("subtle", t.subtle, crSpan(t.subtle, t.surface, 4.5));
  h += '<span class="chips-label">accent · changelog identities (released / next / planned)</span>';
  h += chip("accent", t.accent, crSpan(t.accent, t.bg, 4.5)) + chip("accent-hover", t["accent-hover"], crSpan(t["accent-hover"], t.bg, 3)) + chip("on-accent", t["on-accent"], crSpan(t["on-accent"], t.accent, 4.5)) + chip("secondary", t.secondary, crSpan(t.secondary, t.card, 4.5)) + chip("tertiary", t.tertiary, crSpan(t.tertiary, t.card, 4.5));
  h += '<span class="chips-label">skill roles (on card)</span>';
  for (const r of ["workflow", "tri-agent", "audit-gate", "specialist", "advisor", "orchestrator"]) h += chip(r, t[r], crSpan(t[r], t.card, 4.5), true);
  h += '<span class="chips-label">semantic (danger / warning / success / info / in-progress)</span>';
  for (const r of ["danger", "warning", "success", "info", "in-progress"]) h += chip(r, t[r], crSpan(t[r], t.card, 4.5));
  h += '<div class="audit-line">WCAG AA matrix (' + total + ' checks: text ≥7:1, muted/subtle/accent/roles/semantic ≥4.5:1 on bg, surface and card; hover ≥3:1): ' + (fails.length ? '<b class="bad">' + fails.length + ' fail</b> — ' + fails.map(f => f.label + " on " + f.bg + " " + f.ratio).join(", ") : '<b>all pass</b>') + '</div>';
  document.getElementById("info-right").innerHTML = '<div class="chips">' + h + '</div>';
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-set-btn],[data-page-btn],[data-mode-btn],[data-mini],[role=tab]");
  if (!b) return;
  if (b.dataset.setBtn) state.set = +b.dataset.setBtn;
  else if (b.dataset.pageBtn) state.page = b.dataset.pageBtn;
  else if (b.dataset.modeBtn) state.mode = b.dataset.modeBtn;
  else if (b.hasAttribute("data-mini")) { state.set = +b.dataset.set; state.page = "home"; window.scrollTo({ top: 0 }); }
  else if (b.getAttribute("role") === "tab") { switchTab(b); return; }
  render();
});
function switchTab(btn) {
  const tabs = [...btn.parentElement.querySelectorAll("[role=tab]")];
  const i = tabs.indexOf(btn);
  tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
  document.querySelectorAll(".tab-panel").forEach(p => p.hidden = p.dataset.panel !== btn.dataset.tab);
  positionIndicator(i);
}
function positionIndicator(i) {
  const tabs = [...document.querySelectorAll(".page-changelog [role=tab]")];
  const ind = document.querySelector(".tab-indicator"); if (!ind || !tabs[i]) return;
  ind.dataset.active = i; ind.style.left = tabs[i].offsetLeft + "px"; ind.style.width = tabs[i].offsetWidth + "px";
}
document.addEventListener("keydown", e => {
  if (e.target.matches("input,textarea")) return;
  if (e.key === "ArrowRight") { state.set = state.set % DATA.length + 1; render(); }
  else if (e.key === "ArrowLeft") { state.set = (state.set + DATA.length - 2) % DATA.length + 1; render(); }
  else if (e.key === "d" || e.key === "D") { state.mode = state.mode === "dark" ? "light" : "dark"; render(); }
  else if (["1", "2", "3", "4"].includes(e.key)) { state.page = PAGES[+e.key - 1]; render(); }
});
window.addEventListener("hashchange", () => { readHash(); render(); });
const infoEl = document.querySelector(".info");
function setInfo(open) {
  infoEl.classList.toggle("is-collapsed", !open);
  const b = document.querySelector("[data-info-toggle]");
  b.setAttribute("aria-expanded", String(open)); b.textContent = open ? "hide tokens ▴" : "show tokens ▾";
  try { sessionStorage.setItem("oc-info", open ? "1" : "0"); } catch {}
}
document.querySelector("[data-info-toggle]").addEventListener("click", () => setInfo(infoEl.classList.contains("is-collapsed")));
let infoOpen = window.innerHeight >= 900 && window.innerWidth >= 1100;
try { const s = sessionStorage.getItem("oc-info"); if (s !== null) infoOpen = s === "1"; } catch {}
setInfo(infoOpen);
document.addEventListener("keydown", e => { if (e.key === "t" && !e.target.matches("input,textarea")) setInfo(infoEl.classList.contains("is-collapsed")); });
readHash(); render();
// indicator needs layout; run after fonts settle
requestAnimationFrame(() => { positionIndicator(0); setTimeout(() => positionIndicator([...document.querySelectorAll(".page-changelog [role=tab]")].findIndex(t => t.getAttribute("aria-selected") === "true")), 400); });
`;

const pill = (s, split) => `<button class="set-pill" data-set-btn="${s.id}" type="button" title="${s.tag}"><span class="${split ? "sw2" : "sw"}"></span>${String(s.id).padStart(2, "0")} ${s.name.replace(/^(Muted )?(Slate|Plum|Seaglass)( &amp;| &)? ?/, "") || s.name}</button>`;
const setPills = (batch) => tokens.sets.filter((s) => s.batch === batch).map((s) => pill(s, batch === 2)).join("");
const famPills = (f) => tokens.sets.filter((s) => s.family === f).map((s) => pill(s, true)).join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>opchain 2.0 — colour explorations (10 sets × dark/light · home / changelog / skill)</title>
${fontLinks}
<style>${fontFaceCss}
${css}</style>
</head>
<body>
<div class="chrome">
  <div class="chrome-row">
    <span class="chrome-title">opchain 2.0 · colour explorations</span>
    <span class="chrome-sub">generated ${tokens.generated.slice(0, 10)} · tokens derived in OKLCH, AA-enforced</span>
    <span class="chrome-spacer"></span>
    <div class="seg" role="group" aria-label="Page"><button type="button" data-page-btn="home">Home</button><button type="button" data-page-btn="changelog">Changelog</button><button type="button" data-page-btn="skill">Skill page</button><button type="button" data-page-btn="all">All sets</button></div>
    <div class="seg" role="group" aria-label="Mode"><button type="button" data-mode-btn="dark">Dark</button><button type="button" data-mode-btn="light">Light</button></div>
  </div>
  <div class="chrome-row">
    <span class="grp">r1 · obsidian</span><div class="set-pills">${setPills(1)}</div>
    <span class="grp" style="margin-left:.5rem">r1 · bg shifted</span><div class="set-pills">${setPills(2)}</div>
    <span class="chrome-spacer"></span>
    <span class="kbd-hint"><kbd>←</kbd><kbd>→</kbd> set · <kbd>d</kbd> mode · <kbd>1</kbd>–<kbd>4</kbd> page</span>
  </div>
  <div class="chrome-row chrome-row--r4">
    <span class="grp r2">round 4</span>
    <span class="grp">least-explored hues</span><div class="set-pills">${famPills("fresh")}</div>
  </div>
  <div class="chrome-row chrome-row--r3">
    <span class="grp r2">round 3</span>
    <span class="grp">seaglass · semantics</span><div class="set-pills">${famPills("seaglass-sem")}</div>
  </div>
  <div class="chrome-row chrome-row--r2">
    <span class="grp r2">round 2</span>
    <span class="grp">slate</span><div class="set-pills">${famPills("slate")}</div>
    <span class="grp" style="margin-left:.5rem">plum · muted</span><div class="set-pills">${famPills("plum")}</div>
    <span class="grp" style="margin-left:.5rem">seaglass · muted</span><div class="set-pills">${famPills("seaglass")}</div>
  </div>
  <div class="info"><div class="info-inner"><div id="info-left"></div><div id="info-right"></div></div><button class="info-toggle" type="button" data-info-toggle aria-expanded="true">hide tokens ▴</button></div>
</div>
<div class="site" data-set="1" data-mode="dark">
${homePage}
${changelogPage}
${skillPage}
${allPage}
</div>
<script>${js}</script>
</body>
</html>`;

// Write only when run directly; build-proto.mjs imports this module for its
// CSS and page mockups and must not have the exploration file rewritten as a
// side effect of the import.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) { fs.writeFileSync(OUT, html); console.log("wrote", OUT, (html.length / 1024).toFixed(0) + " KB"); }
