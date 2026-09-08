// build-proto.mjs — the opchain 2.0 site prototype.
//
// A functional single-file mockup of five pages (home, changelog, skill detail,
// install, architecture) on the decided Slate & Emerald tokens (set 34), with
// the "opchain 2.0" lockup (option A: wordmark + badge) everywhere the branded
// mark appears, the release-state surfaces advanced to "2.0 shipped", and the
// five new 2.0 content blocks outlined in ember so they are easy to find.
//
// Reuses the exploration builder's CSS, header, footer and page mockups by
// import; nothing under site/ is read or written. Dark mode only, by decision.
//
//   node gen-tokens.mjs && node build-proto.mjs ../proto-2.0.html
import fs from "node:fs";
import path from "node:path";
import { LOGO, ICON, header as baseHeader, footer as baseFooter, homePage as baseHome, skillPage as baseSkill, tile, horizon, cmd, css as baseCss, tokens, fontFaceCss } from "./build-preview.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(process.argv[2] || path.join(HERE, "../proto-2.0.html"));
const SET = tokens.sets.find((s) => s.id === 34);
if (!SET) throw new Error("set 34 missing — run gen-tokens.mjs");
const D = SET.modes.dark;

// ── the lockup (option A) ──
const BADGE = `<span class="v-badge">2.0</span>`;
const lockupHeader = `<span class="logo">opchain</span>${BADGE}`;

// ── ember outline for the new blocks — the old brand orange, which is no
//    longer anywhere in the palette, so it cannot be mistaken for content ──
const nb = (n, title, inner, extra = "") => `<div class="nb ${extra}" data-nb="2.0 · new block ${n} — ${title}">${inner}</div>`;

// ── chrome shared by every page: header with the 2.0 chip, footer with badge ──
const header = (active) => baseHeader(active)
  .replace('<span class="logo">opchain</span>', lockupHeader)
  .replace('<span class="vchip-tag">v1.9</span>', '<span class="vchip-tag">v2.0</span>');
const footer = baseFooter.replace('<div class="brand">opchain</div>', `<div class="brand">opchain${BADGE}</div>`);

// ════════════════════════════════════════════════════════════════════
// 1 · HOME — concept only ("Mix: concept on home, specifics deeper")
// ════════════════════════════════════════════════════════════════════
const BLOCK_HOME = nb(1, "what 2.0 unlocks · home", `
<section class="unlock" aria-label="What 2.0 unlocks">
  <span class="eyebrow">what 2.0 unlocks</span>
  <h2 class="unlock-h">The pipeline now learns from its own runs.</h2>
  <p class="unlock-sub">Every skill already leaves a checkpoint. In 2.0 those checkpoints become something the pipeline can look back at — and, with your say-so, act on.</p>
  <div class="unlock-grid">
    <div class="unlock-tile"><span class="unlock-n">01</span><h3>It remembers.</h3><p>Verdicts, findings and post-mortems are harvested into a repo-local, git-tracked memory. Committed outcomes, not chat history.</p></div>
    <div class="unlock-tile"><span class="unlock-n">02</span><h3>It proposes.</h3><p>When the same lesson recurs three times, it becomes a candidate rule — tested in isolation against held-out fixtures before anyone sees it.</p></div>
    <div class="unlock-tile unlock-tile--gate"><span class="unlock-n">★</span><h3>You decide.</h3><p>Nothing changes behaviour until a human promotes it. Learned content is advisory data, never an instruction — and everything expires.</p></div>
  </div>
  <div class="unlock-foot"><a class="btn btn-outline btn-sm" href="#">how the loop closes ›</a><span class="unlock-note">Works with the skills you already have installed. Off by default; no content leaves your machine.</span></div>
</section>`);

let homePage = baseHome
  .replace(`<div class="intro-hero">${LOGO(88)}<h1 class="intro-mark">opchain</h1></div>`,
           `<div class="intro-hero">${LOGO(88)}<h1 class="intro-mark">opchain</h1><span class="v-badge v-badge--hero">2.0</span></div>`)
  .replace('<span class="rb-tag">v1.9 · shipped</span><span class="rb-text">Assurance &amp; governed delivery · qa · data · compliance · hardening</span>',
           '<span class="rb-tag">v2.0 · shipped</span><span class="rb-text">The self-improving pipeline · memory · governed rules · human gate</span>')
  .replace('<span class="rb-tag rb-tag-next">v2.0 · next</span><span class="rb-text rb-text-next">the self-improving pipeline · committed</span>',
           '<span class="rb-tag rb-tag-next">v2.1 · next</span><span class="rb-text rb-text-next">distribution &amp; discovery · planned</span>')
  .replace('<span class="stat-num">33</span>', '<span class="stat-num">35</span>')
  .replace('<span class="stat-num">v1.9</span>', '<span class="stat-num">v2.0</span>')
  .replace('<section class="stage">', BLOCK_HOME + '\n  <section class="stage">');
homePage = homePage.replace('data-page="home"', 'data-page="home"').replace(baseHeader("/"), header("/")).replace(baseFooter, footer);

// ════════════════════════════════════════════════════════════════════
// 2 · CHANGELOG — v2.0 moves to Just Released; block 2 names the mechanics
// ════════════════════════════════════════════════════════════════════
const BLOCK_CHANGELOG = nb(2, "how the loop closes · changelog", `
<div class="loop">
  <h3>How the loop closes — three layers</h3>
  <ol class="loop-layers">
    <li><span class="loop-k">Layer 1 · substrate</span><div class="loop-body"><strong>Checkpoint wire 1.2.</strong> <code>eval_scores[]</code> gains real append semantics and a durable spill to <code>.checkpoints/history/*.eval.ndjson</code> — the ecosystem's first git-tracked cross-run accumulator. <span class="tag tag--warn">breaking · read contract</span></div></li>
    <li><span class="loop-k">Layer 2 · measurement + memory</span><div class="loop-body"><strong>Outcome Scorecard kit</strong> samples every discarded Evaluator verdict into a time series; a declining trend emits a decaying advisory. <strong>Hindsight store</strong> holds harvested lessons in <code>.opchain/hindsight/</code>.</div></li>
    <li><span class="loop-k">Layer 3 · governed workflows</span><div class="loop-body"><strong>oc-hindsight</strong> harvests, generates source-grounded candidate lessons, evaluates provenance and retrieval in isolated context, then requires human promotion. <strong>oc-evolve</strong> reflects, proposes rules, adversarially evaluates them against held-out fixtures, then requires human adoption. <span class="tag tag--accent">★ human gate on every activation</span></div></li>
  </ol>
  <div class="loop-inv"><span class="loop-k">invariants</span> advisory data, never instructions · skill-contract › repo-policy › learned-rule · recurrence ≥ 3 · everything decays · telemetry default-off</div>
</div>`);

const changelogPage = `
<div class="page page-changelog" data-page="changelog" hidden>
${header("/changelog")}
<main class="pg">
  <div class="page-head"><span class="eyebrow">changelog</span><h1>Changelog.</h1>
    <p class="lede">What shipped, what's next, and what to do about it. Each skill's <code>version</code> field is the source of truth — this page rolls them up by release. Vote on what's coming to signal priority.</p></div>
  <div class="tab-bar">
    <div class="tab-list" role="tablist">
      <button class="tab-btn" role="tab" aria-selected="true" data-tab="released">Just Released <span class="tab-count">19 shipped</span></button>
      <button class="tab-btn tab-btn--next" role="tab" aria-selected="false" data-tab="coming">Coming Next <span class="tab-count">v2.1</span></button>
      <button class="tab-btn tab-btn--planned" role="tab" aria-selected="false" data-tab="planned">Planned <span class="tab-count">v2.2 → v2.3</span></button>
    </div>
    <span class="tab-indicator" data-active="0"></span>
  </div>

  <section class="tab-panel" data-panel="released">
    <div class="panel-head"><h2>What shipped</h2><span class="panel-sub">Latest release is open; patches and earlier releases expand in place.</span></div>
    <article class="hero-card hero-card--released is-open">
      <button class="hero-head" type="button"><span class="hero-chevron">▶</span><span class="hero-badge">latest release</span>
        <span class="hero-ver">v2.0.0 · shipped Sep 07, 2026 · major</span><span class="hero-title">The self-improving pipeline</span>
        <span class="hero-desc">Two governed workflow skills — oc-hindsight (operational memory) and oc-evolve (behaviour change) — over a three-layer learning architecture. Every activation ends at a human gate; learned content is advisory data, never instructions.</span></button>
      <div class="card-body"><div class="card-body-inner hero-body-inner">
        <div class="tag-row"><span class="tag tag--accent">shipped</span><span class="tag">33 → 35 skills</span><span class="tag">2 new skills</span><span class="tag">checkpoint wire 1.1 → 1.2</span><span class="tag">16 skills updated</span></div>
        <h3>What's new</h3>
        <div class="tile-grid">
          ${tile("oc-hindsight", "Governed operational memory: plan a harvest, generate source-grounded candidate lessons, evaluate provenance, safety and retrieval quality in isolated context, then require human promotion before a lesson becomes active.")}
          ${tile("oc-evolve", "Governed behaviour change: reflect and plan an improvement hypothesis, generate candidate rules, adversarially evaluate them against held-out and full-suite regressions, then require human adoption. `graduate` opens an upstream PR.")}
          ${tile("checkpoint wire 1.2", "eval_scores[] gains append semantics, a durable history spill and a union-merge contract. The documented read contract moves — which is the 2.0 major.")}
          ${tile("Outcome Scorecard kit", "scripts/scorecard.mjs + hooks: every discarded Evaluator verdict sampled into a time series; a declining trend emits a decaying advisory the next session reads. Mechanical, zero judgement.")}
        </div>
        ${BLOCK_CHANGELOG}
        <div class="compat-box"><strong>Skill and on-disk checkpoint compatibility:</strong> 1.0, 1.1 and 1.2 files all still validate; nothing migrates destructively. What changes is the <em>read</em> contract for <code>eval_scores</code> completeness — readers needing full history union the in-file window with <code>.checkpoints/history/</code>. Run <code>/oc-migrate checkpoints 1.2</code> for the stamp sweep. All 35 skills lockstep-bump to <code>2.0.0</code>.</div>
      </div></div>
    </article>
    <article class="rel-card"><button class="rc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--past">v1.9.0</span><span class="pc-title">Assurance and governed delivery ops</span><span class="pc-timing">Sep 02, 2026</span></span><span class="pc-summary">oc-qa-ops, oc-data-ops, oc-compliance-ops, oc-security-hardening. 29 → 33 skills.</span></span></button></article>
    <article class="rel-card"><button class="rc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--past">v1.8.3</span><span class="pc-title">Release tag + checkpoint doctor</span><span class="pc-timing">Aug 27, 2026</span></span><span class="pc-summary">Signed release tags land in oc-git-ops; checkpoint:doctor diagnoses schema drift.</span></span></button></article>
  </section>

  <section class="tab-panel" data-panel="coming" hidden>
    <div class="panel-head"><h2>What's coming</h2><span class="panel-sub">v2.1 is next — distribution &amp; discovery.</span></div>
    <article class="hero-card hero-card--next is-open">
      <button class="hero-head" type="button"><span class="hero-chevron">▶</span><span class="hero-badge">planned</span>
        <span class="hero-ver">v2.1.0 · next</span><span class="hero-title">Distribution &amp; discovery</span>
        <span class="hero-desc">Registry presence, plugin-marketplace polish, and agent-facing discovery surfaces. Voting is open on what lands first.</span></button>
      <div class="card-body"><div class="card-body-inner hero-body-inner">
        <div class="tag-row"><span class="tag tag--info">next</span><span class="tag">Q4 2026</span></div>
        <ul class="horizon-list">
          ${horizon("MCP registry auto-republish", "Republish the hosted server listing on every tagged release, not just manual dispatch.", 42, true)}
          ${horizon("Per-skill install pages", "One-click install for a single skill instead of the full bundle.", 27, false)}
          ${horizon("Codex-native checkpoint reads", "Let non-Claude agents read checkpoints through the hosted endpoint without a local clone.", 19, false)}
        </ul>
      </div></div>
    </article>
  </section>

  <section class="tab-panel" data-panel="planned" hidden>
    <div class="panel-head"><h2>What's planned</h2><span class="panel-sub">Vote within v2.2–v2.3 to shape what follows.</span></div>
    <article class="plan-card"><button class="pc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--next">v2.2</span><span class="pc-title">Fleet operations</span><span class="pc-timing">2027 H1</span></span><span class="pc-summary">Multi-repo orchestration and cross-project checkpoints.</span></span></button></article>
    <article class="plan-card"><button class="pc-row" type="button"><span class="pc-toggle">▶</span><span class="pc-meta"><span class="pc-head"><span class="ver-pill ver-pill--next">v2.3</span><span class="pc-title">Graduated rules, upstream</span><span class="pc-timing">2027 H1</span></span><span class="pc-summary">/oc-evolve graduate as a first-class release input — repo-local rules proposed back to the global skills through reviewed PRs.</span></span></button></article>
  </section>
  <p class="footer-note">Skill versions are stamped in <code>skills/&lt;name&gt;/SKILL.md</code> under <code>version:</code>; this page rolls them up by release.</p>
</main>
${footer}
</div>`;

// ════════════════════════════════════════════════════════════════════
// 3 · SKILL DETAIL — how this skill participates in the loop
// ════════════════════════════════════════════════════════════════════
const BLOCK_SKILL = nb(3, "in the 2.0 loop · skill page", `
<section class="inloop">
  <div class="quick-head">In the 2.0 loop</div>
  <div class="inloop-grid">
    <div class="inloop-cell"><span class="inloop-k">reads</span><p>Before Phase 6 builds, the <strong>Generator</strong> reads active advisories, promoted Hindsight lessons and adopted rules as pre-build context.</p></div>
    <div class="inloop-cell"><span class="inloop-k">never reads</span><p>The <strong>Evaluator</strong> is never shown any of it. It grades fresh from the frozen contract; recurrence is annotated <em>after</em> the verdict, by a separate pass.</p></div>
    <div class="inloop-cell"><span class="inloop-k">emits</span><p><code>eval-round-M.md</code> is now a stable, versioned emitter surface — its section headings are frozen so the scorecard and Hindsight can harvest it.</p></div>
  </div>
  <p class="inloop-note">Silent no-op when the scorecard kit or a repo-local Hindsight store is absent. Nothing about this skill's definition differs per repo.</p>
</section>`);

let skillPage = baseSkill
  .replace('<span class="badge badge-neutral">v1.9.0</span>', '<span class="badge badge-neutral">v2.0.0</span>')
  .replace('Updated Sep 02, 2026', 'Updated Sep 07, 2026')
  .replace('<section class="usage">', BLOCK_SKILL + '\n  <section class="usage">')
  .replace(baseHeader("/skills"), header("/skills")).replace(baseFooter, footer);

// ════════════════════════════════════════════════════════════════════
// 4 · INSTALL — upgrading an existing install to 2.0
// ════════════════════════════════════════════════════════════════════
const BLOCK_INSTALL = nb(4, "upgrading to 2.0 · install", `
<div class="upg">
  <h3 class="flow-sub">Already on 1.x? <span class="flow-tag">2.0 is a major — here's what that means</span></h3>
  <ul class="upg-list">
    <li><strong>Nothing migrates destructively.</strong> Checkpoint files stamped 1.0, 1.1 or 1.2 all still validate. Two skills are added (33 → 35); every existing skill takes the lockstep bump to <code class="ic">2.0.0</code>.</li>
    <li><strong>One read contract moves.</strong> <code class="ic">eval_scores[]</code> in a checkpoint is now a bounded recent window; the full record lives in <code class="ic">.checkpoints/history/</code>. Anything that read the in-file array as the whole history — <code class="ic">oc-orchestrator</code>, <code class="ic">oc-cost-ops</code> — unions both. That is the breaking change.</li>
    <li><strong>The stamp sweep is one command.</strong> <code class="ic">/oc-migrate checkpoints 1.2</code> rewrites <code class="ic">protocol_version</code> in place, same template as the 1.0 → 1.1 sweep.</li>
    <li><strong>The loop is off until you turn it on.</strong> No scorecard kit, no Hindsight store, no rules directory → every 2.0 workflow is a silent no-op. Telemetry stays default-off and no content ever leaves the machine. Opt in per repo with <code class="ic">/oc-hindsight init</code>.</li>
  </ul>
  <div class="code-row"><pre class="codeblock" tabindex="0"><code>/plugin update opchain
/oc-migrate checkpoints 1.2
/oc-hindsight init        # optional — enables the loop for this repo</code></pre></div>
</div>`);

const installPage = `
<div class="page page-install" data-page="install" hidden>
${header("/install")}
<main class="pg">
  <div class="page-head ph-row"><div><span class="eyebrow">install</span><h1>Four flows.</h1></div><a class="btn btn-primary" href="#">${ICON.download} download bundle</a></div>
  <p class="lede">Every skill is a single <code class="ic">SKILL.md</code> file. Install the full set or just the ones you want. No API keys, no package manager, no build step.</p>

  <section class="flow"><div class="flow-num">01</div><div class="flow-body">
    <h2>Claude Code CLI</h2>
    <p>Need the CLI first? <a href="#">Install Claude Code</a>, then pick a path. The <strong>plugin</strong> is the one to use if you can — it carries the skills <em>and</em> the hooks that enforce them. The zip carries the skills only.</p>
    <h3 class="flow-sub">Plugin <span class="flow-tag">recommended</span></h3>
    <p>Two commands. Adds the 35 skills, fourteen registered slash commands, and three hooks: a commit gate that refuses <code class="ic">git commit</code> unless the code being committed passed bug-check, pipeline state at session start, and a pointer to the next skill when one finishes.</p>
    <div class="code-row"><pre class="codeblock" tabindex="0"><code>/plugin marketplace add asfbay-bit/opchain-skills
/plugin install opchain</code></pre><button class="copy" type="button">${ICON.copy || ""}copy</button></div>
    <h3 class="flow-sub">Zip <span class="flow-tag flow-tag--muted">skills only</span></h3>
    <p>Drop the skills into <code class="ic">.claude/skills/</code>; Claude Code discovers them next session. None of the hooks come with it, so nothing mechanically enforces a gate.</p>
    <div class="code-row"><pre class="codeblock" tabindex="0"><code>curl -fsSL https://opchain.dev/opchain-skills.zip -o opchain-skills.zip
unzip -o opchain-skills.zip -d .claude/skills/</code></pre><button class="copy" type="button">copy</button></div>
  </div></section>

  <section class="flow"><div class="flow-num">02</div><div class="flow-body"><h2>Claude.ai / Claude Desktop</h2><ol class="steps"><li>Open Settings → Skills → Add.</li><li>Upload <code class="ic">opchain-skills.zip</code>.</li><li>Start a new conversation; say what you want to build.</li></ol></div></section>
  <section class="flow"><div class="flow-num">03</div><div class="flow-body"><h2>Team (check into git)</h2><p>Commit <code class="ic">.claude/skills/</code> and <code class="ic">.checkpoints/</code>. Every collaborator gets the same pipeline and the same resume state.</p></div></section>
  <section class="flow"><div class="flow-num">04</div><div class="flow-body"><h2>Codex / any MCP agent</h2><p>Point the client at the hosted endpoint <code class="ic">opchain.dev/mcp</code>. No install; the catalog is served per request.</p></div></section>

  <section class="upgrade"><h2>Update an existing install</h2>
    <p>Skills carry a <code class="ic">version:</code> field; the SessionStart hook compares it against <code class="ic">/skills.json</code> and tells you when you're behind.</p>
    ${BLOCK_INSTALL}
  </section>

  <section class="what"><h2>What you get</h2><div class="tile-grid">
    ${tile("35 skills", "One Markdown file each: discover, spec, design, build, audit, ship, monitor, migrate, scale — and now remember and evolve.")}
    ${tile("checkpoint protocol", "Every skill writes .checkpoints/<skill>.checkpoint.json. Next session, Claude reads it back and picks up where you left off.")}
    ${tile("three hooks", "Commit gate, session-start state, next-skill pointer. Plugin install only.")}
    ${tile("hosted MCP", "The same catalog over JSON-RPC at opchain.dev/mcp for Codex and any MCP client.")}
  </div></section>
</main>
${footer}
</div>`;

// ════════════════════════════════════════════════════════════════════
// 5 · ARCHITECTURE — legend gains Layer 3; the diagram itself is a placeholder
//     for the separate diagram workstream and is NOT one of the five blocks.
// ════════════════════════════════════════════════════════════════════
const BLOCK_ARCH = nb(5, "layer 3 legend · architecture", `
<div class="legend legend--l3">
  <div class="legend-section-label">2.0 · governed workflows (layer 3)</div>
  <div class="legend-row">
    <span class="legend-item"><i class="lg-dot" style="background:var(--orchestrator)"></i>oc-hindsight<span class="legend-hint">harvest → lesson → retrieval eval → ★ promote</span></span>
    <span class="legend-item"><i class="lg-dot" style="background:var(--tri-agent)"></i>oc-evolve<span class="legend-hint">reflect → rule → adversarial eval → ★ adopt → graduate</span></span>
    <span class="legend-item"><i class="lg-star">★</i>human gate<span class="legend-hint">every activation ends here; nothing self-applies</span></span>
    <span class="legend-item"><i class="lg-dot lg-dot--dashed"></i>advisory data<span class="legend-hint">lessons + rules flow to Generators only, never Evaluators</span></span>
  </div>
</div>`);

const archPage = `
<div class="page page-arch" data-page="arch" hidden>
${header("/architecture")}
<main class="pg pg-arch">
  <div class="page-head"><span class="eyebrow">architecture</span><h1>opchain skills ecosystem</h1>
    <p class="lede">Checkpoint-driven pipeline of 35 skills across 6 phases — how skills chain through <code>.checkpoints/&lt;skill&gt;.checkpoint.json</code>, and, in 2.0, how what they learn flows back.</p></div>
  <div class="diagram-ph" role="img" aria-label="Architecture diagram placeholder">
    <span class="diagram-ph-k">diagram · separate workstream</span>
    <p>The redrawn 2.0 architecture diagram is being produced in another chat and merges here when complete. It will add the three learning layers beneath the existing six-phase spine.</p>
    <div class="diagram-ph-spine">${["rev-spec", "app-architect", "git-ops", "release-ops", "deploy-ops", "monitoring-ops"].map((s, i) => `<span class="sp-node">${i + 1} ${s}</span>`).join('<span class="sp-arrow">›</span>')}</div>
    <div class="diagram-ph-layers"><span>L1 wire 1.2 · history</span><span>L2 scorecard · hindsight store</span><span>L3 oc-hindsight · oc-evolve · ★</span></div>
  </div>
  ${BLOCK_ARCH}
  <div class="legend">
    <div class="legend-section-label">connections</div>
    <div class="legend-row">
      <span class="legend-item"><i class="lg-line"></i>spine ordinal<span class="legend-hint">1 rev-spec → 2 app-arch → 3 git-ops → 4 release-ops → 5 deploy-ops → 6 monitoring-ops</span></span>
      <span class="legend-item"><i class="lg-line lg-line--accent"></i>chains to<span class="legend-hint">oc-app-architect → oc-stack-forge · oc-ux-engineer · oc-api-dev</span></span>
      <span class="legend-item"><i class="lg-line lg-line--dashed"></i>advisory<span class="legend-hint">oc-scale-ops → oc-app-architect</span></span>
      <span class="legend-item"><i class="lg-dot" style="background:var(--audit-gate)"></i>audit gate<span class="legend-hint">score ≥ 7/10 · STRIDE clean · zero critical CVEs</span></span>
      <span class="legend-item"><i class="lg-dot" style="background:var(--secondary)"></i>PR-readiness gate<span class="legend-hint">oc-git-ops → oc-docs-forge → oc-repo-ops → PR opens</span></span>
    </div>
  </div>
</main>
${footer}
</div>`;

// ════════════════════════════════════════════════════════════════════
// CSS — the exploration's stylesheet plus the 2.0 additions
// ════════════════════════════════════════════════════════════════════
const PAGES = ["home", "changelog", "skill", "install", "arch"];
const css = baseCss.replace(/\/\* ═+ generated set tokens ═+ \*\/[\s\S]*$/, "") + `
/* ═══ 2.0 prototype: tokens (set 34, dark) ═══ */
:root { ${Object.entries(D).map(([k, v]) => `--${k}: ${v}`).join("; ")}; }
.site { background: var(--bg); color: var(--text); }
.page-all { display: none !important; }

/* lockup A — badge */
.v-badge { display: inline-flex; align-items: center; font: 600 10px var(--font-mono); letter-spacing: .06em; background: var(--accent); color: var(--on-accent); border-radius: var(--r-pill); padding: 2px 7px; line-height: 1.5; margin-left: .5rem; transform: translateY(-1px); }
.v-badge--hero { font-size: 15px; padding: 4px 12px; margin-left: 1rem; transform: translateY(-14px); align-self: center; }
.site-footer .brand .v-badge { font-size: 9px; padding: 1px 6px; }

/* ember outline for the five new blocks */
.nb { position: relative; outline: 2px solid #e05c18; outline-offset: 8px; border-radius: 6px; margin: 2.4rem 0 1.6rem; }
.nb::before { content: attr(data-nb); position: absolute; top: -1.7rem; left: -8px; z-index: 6; font: 600 9.5px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: #1c1710; background: #e05c18; padding: 3px 9px; border-radius: 999px 999px 999px 0; white-space: nowrap; }
body.hide-nb .nb { outline: none; margin: 0; } body.hide-nb .nb::before { display: none; }

/* block 1 — home */
.unlock { width: 100%; max-width: 960px; margin: 0 auto; text-align: center; padding: 1.6rem 0 .4rem; }
.unlock-h { font-size: var(--fs-2xl); font-weight: 600; margin: .5rem 0 .4rem; }
.unlock-sub { color: var(--muted); max-width: 58ch; margin: 0 auto 1.4rem; font-size: var(--fs-base); }
.unlock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; text-align: left; }
.unlock-tile { background: var(--card); border: .5px solid var(--border); border-radius: var(--r-lg); padding: 1.1rem 1.2rem; display: flex; flex-direction: column; gap: .4rem; }
.unlock-tile--gate { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-dim), var(--glow-lg); }
.unlock-n { font: 500 10px var(--font-mono); letter-spacing: .14em; color: var(--accent); }
.unlock-tile h3 { font-size: var(--fs-md); font-weight: 600; }
.unlock-tile p { margin: 0; font-size: var(--fs-sm); color: var(--muted); line-height: var(--lh-snug); }
.unlock-foot { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
.unlock-note { font-size: 12px; color: var(--subtle); }

/* block 2 — changelog */
.loop { background: var(--surface); border: .5px solid var(--border); border-radius: var(--r-sm); padding: 1rem 1.1rem 1rem; margin-bottom: .9rem; }
.loop h3 { margin: 0 0 .7rem !important; }
.loop-layers { list-style: none; margin: 0; padding: 0; display: grid; gap: .55rem; }
.loop-layers li { display: grid; grid-template-columns: 150px 1fr; gap: .8rem; font-size: 12.5px; line-height: var(--lh-base); color: var(--muted); padding: .55rem 0; border-top: .5px solid var(--border); }
.loop-body { display: block; } .loop-body .tag { margin-left: .3rem; vertical-align: 1px; }
.loop-layers li:first-child { border-top: 0; padding-top: 0; }
.loop-layers strong { color: var(--text); font-weight: 600; }
.loop-layers code { color: var(--text); background: var(--card); border: .5px solid var(--border); padding: 0 4px; border-radius: 3px; font-size: .9em; }
.loop-k { font: 500 9.5px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--accent); padding-top: 3px; }
.loop-inv { margin-top: .8rem; padding-top: .7rem; border-top: .5px solid var(--border); font: 11px var(--font-mono); color: var(--subtle); display: flex; gap: .8rem; align-items: baseline; flex-wrap: wrap; }
.tag--warn { color: var(--warning); border-color: var(--warning); background: var(--warning-dim); }

/* block 3 — skill page */
.inloop { background: var(--surface); border: .5px solid var(--border); border-radius: var(--r-lg); padding: 1rem 1.1rem; margin: 0 0 2rem; }
.inloop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; }
.inloop-cell p { margin: .2rem 0 0; font-size: 12.5px; color: var(--muted); line-height: var(--lh-base); }
.inloop-cell strong { color: var(--text); font-weight: 600; }
.inloop-cell code { font-family: var(--font-mono); font-size: .9em; color: var(--text); }
.inloop-k { font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.inloop-note { margin: .8rem 0 0; font-size: 11.5px; color: var(--subtle); }

/* install page */
.ph-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.flow { display: grid; grid-template-columns: 56px 1fr; gap: 1rem; padding: 1.4rem 0; border-top: .5px solid var(--border); }
.flow-num { font: 600 var(--fs-xl) var(--font-display); color: var(--accent); letter-spacing: -.02em; line-height: 1; }
.flow-body h2 { font-size: var(--fs-lg); font-weight: 600; margin-bottom: .4rem; }
.flow-body p { color: var(--muted); font-size: var(--fs-sm); margin: 0 0 .7rem; line-height: var(--lh-base); max-width: 68ch; }
.flow-sub { font-size: var(--fs-md); font-weight: 600; margin: .9rem 0 .3rem; display: flex; align-items: center; gap: .5rem; }
.flow-tag { font: 500 9.5px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); border: .5px solid var(--accent); background: var(--accent-dim); border-radius: var(--r-pill); padding: 1px 7px; }
.flow-tag--muted { color: var(--subtle); border-color: var(--border); background: transparent; }
.code-row { display: flex; gap: .5rem; align-items: flex-start; margin: .2rem 0 .6rem; }
.codeblock { flex: 1; margin: 0; background: var(--surface); border: .5px solid var(--border); border-left: 3px solid var(--accent); border-radius: var(--r-sm); padding: .8rem 1rem; font: 12.5px/1.6 var(--font-mono); color: var(--text); overflow-x: auto; }
.copy { font: 500 10px var(--font-mono); letter-spacing: .06em; color: var(--muted); background: var(--card); border: .5px solid var(--border); border-radius: var(--r-sm); padding: .4rem .6rem; cursor: pointer; }
.steps { color: var(--muted); font-size: var(--fs-sm); padding-left: 1.2rem; margin: 0; } .steps li { margin: .25rem 0; }
.upgrade, .what { padding: 1.6rem 0 0; border-top: .5px solid var(--border); margin-top: .4rem; }
.upgrade h2, .what h2 { font-size: var(--fs-lg); font-weight: 600; margin-bottom: .5rem; }
.upgrade > p { color: var(--muted); font-size: var(--fs-sm); margin: 0 0 .5rem; }
.upg { background: var(--surface); border: .5px solid var(--border); border-radius: var(--r-lg); padding: 1rem 1.2rem 1.1rem; }
.upg .flow-sub { margin-top: 0; }
.upg-list { margin: .5rem 0 .9rem; padding-left: 1.1rem; color: var(--muted); font-size: 12.5px; line-height: var(--lh-base); } .upg-list li { margin: .4rem 0; } .upg-list strong { color: var(--text); font-weight: 600; }
.what .tile-grid { margin-top: .8rem; }

/* architecture page */
.pg-arch { max-width: 1040px; }
.diagram-ph { border: 1.5px dashed var(--border); border-radius: var(--r-xl); padding: 2rem 1.6rem; margin: 1.4rem 0 1.2rem; text-align: center; background: radial-gradient(600px 240px at 50% 0%, var(--accent-dim), transparent 70%); }
.diagram-ph-k { font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); }
.diagram-ph p { color: var(--muted); font-size: var(--fs-sm); max-width: 58ch; margin: .5rem auto 1.4rem; }
.diagram-ph-spine { display: flex; align-items: center; justify-content: center; gap: .4rem; flex-wrap: wrap; font: 500 11px var(--font-mono); }
.sp-node { border: .5px solid var(--border); background: var(--card); border-radius: var(--r-sm); padding: .35rem .6rem; color: var(--text); }
.sp-arrow { color: var(--subtle); }
.diagram-ph-layers { display: flex; justify-content: center; gap: .5rem; margin-top: 1rem; flex-wrap: wrap; font: 500 10px var(--font-mono); letter-spacing: .06em; }
.diagram-ph-layers span { border: .5px solid var(--accent); color: var(--accent); background: var(--accent-dim); border-radius: var(--r-pill); padding: .3rem .7rem; }
.legend { margin-top: 1rem; }
.legend--l3 { background: var(--surface); border: .5px solid var(--border); border-radius: var(--r-lg); padding: .9rem 1.1rem; }
.legend-section-label { font: 500 9.5px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--subtle); margin-bottom: .6rem; }
.legend-row { display: flex; flex-wrap: wrap; gap: .5rem .9rem; }
.legend-item { display: inline-flex; align-items: center; gap: .45rem; font: 500 12px var(--font-display); color: var(--text); background: var(--card); border: .5px solid var(--border); border-radius: var(--r-pill); padding: .35rem .75rem; position: relative; }
.legend-hint { font: 10.5px var(--font-mono); color: var(--subtle); margin-left: .3rem; }
.lg-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; } .lg-dot--dashed { border: 1.5px dashed var(--subtle); }
.lg-star { color: var(--accent); font-size: 13px; }
.lg-line { width: 18px; height: 2px; background: var(--muted); display: inline-block; } .lg-line--accent { background: var(--accent); } .lg-line--dashed { background: repeating-linear-gradient(90deg, var(--muted) 0 4px, transparent 4px 7px); }

/* prototype chrome */
.chrome .grp.r2 { color: #e05c18; }
.chrome .seg button[aria-pressed="true"] { background: #e05c18; color: #1c1710; }
`;

// ════════════════════════════════════════════════════════════════════
// JS — page switching, changelog tabs, highlight toggle. No hash writes.
// ════════════════════════════════════════════════════════════════════
const js = `
const PAGES = ${JSON.stringify(PAGES)};
let page = "home", showNb = true;
function render() {
  document.querySelectorAll(".page").forEach(p => p.hidden = p.dataset.page !== page);
  document.querySelectorAll("[data-page-btn]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pageBtn === page)));
  document.body.classList.toggle("hide-nb", !showNb);
  document.querySelector("[data-nb-toggle]").setAttribute("aria-pressed", String(showNb));
  if (page === "changelog") requestAnimationFrame(() => positionIndicator([...document.querySelectorAll(".page-changelog [role=tab]")].findIndex(t => t.getAttribute("aria-selected") === "true")));
  window.scrollTo(0, 0);
}
function positionIndicator(i) {
  const tabs = [...document.querySelectorAll(".page-changelog [role=tab]")]; const ind = document.querySelector(".tab-indicator");
  if (!ind || !tabs[i]) return; ind.dataset.active = i; ind.style.left = tabs[i].offsetLeft + "px"; ind.style.width = tabs[i].offsetWidth + "px";
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-page-btn],[data-nb-toggle],[role=tab]"); if (!b) return;
  if (b.dataset.pageBtn) { page = b.dataset.pageBtn; render(); }
  else if (b.hasAttribute("data-nb-toggle")) { showNb = !showNb; render(); }
  else if (b.getAttribute("role") === "tab") {
    const tabs = [...b.parentElement.querySelectorAll("[role=tab]")]; const i = tabs.indexOf(b);
    tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
    document.querySelectorAll(".tab-panel").forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
    positionIndicator(i);
  }
});
document.addEventListener("keydown", e => {
  if (e.target.matches("input,textarea")) return;
  const n = parseInt(e.key, 10); if (n >= 1 && n <= PAGES.length) { page = PAGES[n - 1]; render(); }
  if (e.key === "h") { showNb = !showNb; render(); }
});
render();
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>opchain 2.0 — site prototype · Slate &amp; Emerald</title>
<style>${fontFaceCss}
${css}</style>
</head>
<body>
<div class="chrome">
  <div class="chrome-row">
    <span class="chrome-title">opchain 2.0 · site prototype</span>
    <span class="chrome-sub">Slate &amp; Emerald (set 34) · lockup A · dark · five new content blocks outlined in ember</span>
    <span class="chrome-spacer"></span>
    <div class="seg" role="group" aria-label="Page">${PAGES.map((p, i) => `<button type="button" data-page-btn="${p}">${i + 1} ${{ home: "Home", changelog: "Changelog", skill: "Skill page", install: "Install", arch: "Architecture" }[p]}</button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Highlights"><button type="button" data-nb-toggle>2.0 block outlines</button></div>
    <span class="kbd-hint"><kbd>1</kbd>–<kbd>5</kbd> page · <kbd>h</kbd> outlines</span>
  </div>
</div>
<div class="site" data-set="34" data-mode="dark">
${homePage}
${changelogPage}
${skillPage}
${installPage}
${archPage}
</div>
<script>${js}</script>
</body>
</html>`;

fs.writeFileSync(OUT, html);
const blocks = (html.match(/class="nb /g) || []).length;
console.log("wrote", OUT, (html.length / 1024).toFixed(0) + " KB —", blocks, "outlined blocks,", PAGES.length, "pages");
