// opchain.work architecture diagram — pure layout + markup for the /work page.
//
// Mirrors site/src/pages/architecture.astro (the "Architecture v2" diagram):
// the same .arch-v2 markup (header-eyebrow, bands-wrap with a #lines-canvas,
// band / band-label / band-content / band-detail, rails, legend, footer), the
// same SVG card idiom (760-wide viewBox, rect + text in Outfit / JetBrains
// Mono, chips on the top edge, a numbered spine chip) and the same canvas
// line-drawing code (drawPath / drawArrowhead / labelPill / orthoSkip), with
// the coordinate map generated from data instead of hand-placed.
//
// Pure: no astro:content, no fs. The Astro components feed it the collection
// and the edges (lib/work.ts); the design-preview script feeds it the same
// data read with js-yaml, so the preview and the page cannot drift. Only
// erasable TypeScript syntax here (Node runs the preview with type stripping).

export interface DiagramSkill {
  id: string;
  version: string;
  bundle: "core" | "connected";
  network: "none" | "declared";
  commands: string[];
  /** Stage key from data/work.ts; "cross-stage" for ow-research and ow-draft. */
  stage: string;
  stageLabel: string;
  /** 1–7 on the rail; null for the cross-stage pair. */
  ordinal: number | null;
  /** Three or four words for the card's third line. */
  short: string;
  /** One sentence for the band detail. */
  intro: string;
}

export interface DiagramEdge { from: string; to: string; whens: string[]; verbs: string[] }

export interface DiagramInput {
  skills: DiagramSkill[];
  edges: DiagramEdge[];
  /** Which stages hand files to the add-on, and what for (data/work.ts TOOLS_BY_SKILL). */
  tools: { id: string; version: string; byStage: Record<string, string> };
  release: string; // "v2.1"
}

export type Variant = "a" | "b";

// ── palette (the Forge set the architecture page uses; CSS re-themes by attribute) ──
const OBSIDIAN = "#12191f", LINEN = "#d4e2ef", SAND = "#a5bcd1";
const EMBER = "#2be179", MINT = "#02fdff", YELLOW = "#ebfe00", SIG = "#d87fd1";

/** Card stroke by kind: text-only core (mint), text with declared network (yellow), runs code (magenta). */
export function kindColor(s: { network: string }): string { return s.network === "declared" ? YELLOW : MINT; }
function kindFilter(s: { network: string }): string { return s.network === "declared" ? "glow-yellow" : "glow-mint"; }
function kindWash(s: { network: string }): string { return s.network === "declared" ? "rgba(235,254,0,.10)" : "rgba(2,253,255,0.06)"; }

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface Coord { band: string; x: number; y: number; w: number; h: number; vbW: number; vbH: number }

const CARD = { x: 280, y: 14, w: 200, h: 52, vbW: 760, vbH: 80 };

function verbsLine(commands: string[]): string {
  const shown = commands.filter((c) => !/^\/ow-(setup|status)$/.test(c)).slice(0, 3);
  return shown.join(" · ") + (commands.length > shown.length ? " · …" : "");
}

/** One stage band's SVG: the stage card centred, spine chip on top, version + kind chips top-right. */
function bandSvg(s: DiagramSkill, index: number, total: number, tool?: string): string {
  const c = CARD; const cx = c.x + c.w / 2;
  const color = kindColor(s);
  const spine = `${index > 1 ? `↑${index - 1}·` : ""}${index}${index < total ? `·↓${index + 1}` : ""}`;
  const meta = `${s.stageLabel} · ${s.version} · ${s.bundle} · network: ${s.network}`;
  const label = `${s.id} — stage ${index} of ${total}, ${s.stageLabel}; ${s.version}; ${s.bundle} bundle; network ${s.network}`;
  const chips = [
    { t: s.version, w: 34, col: EMBER, fill: "rgba(43,225,121,.10)", stroke: "rgba(43,225,121,0.6)" },
    s.network === "declared"
      ? { t: "NET", w: 24, col: YELLOW, fill: "rgba(235,254,0,.10)", stroke: "rgba(235,254,0,0.6)" }
      : { t: "TXT", w: 24, col: MINT, fill: "rgba(2,253,255,.10)", stroke: "rgba(2,253,255,0.6)" },
  ];
  let x = c.x + c.w - 4;
  const chipSvg = chips.map((ch) => { x -= ch.w + 2; return `<rect x="${x}" y="7" width="${ch.w}" height="13" rx="3" fill="${OBSIDIAN}"/><rect x="${x}" y="7" width="${ch.w}" height="13" rx="3" fill="${ch.fill}" stroke="${ch.stroke}" stroke-width="0.5"/><text x="${x + ch.w / 2}" y="16.5" fill="${ch.col}" font-size="6.5" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(ch.t)}</text>`; }).join("");
  const toolPill = tool
    ? `<g class="tool-pill"><rect x="${c.x + c.w + 14}" y="${c.y + 18}" width="${Math.max(70, 6 * tool.length + 34)}" height="16" rx="3" fill="${OBSIDIAN}"/><rect x="${c.x + c.w + 14}" y="${c.y + 18}" width="${Math.max(70, 6 * tool.length + 34)}" height="16" rx="3" fill="rgba(216,127,209,.10)" stroke="${SIG}" stroke-width="0.5"/><text x="${c.x + c.w + 14 + Math.max(70, 6 * tool.length + 34) / 2}" y="${c.y + 29}" fill="${SIG}" font-size="6.5" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">ow-tools · ${esc(tool)}</text><line x1="${c.x + c.w}" y1="${c.y + 26}" x2="${c.x + c.w + 14}" y2="${c.y + 26}" stroke="${SIG}" stroke-width="0.8" stroke-dasharray="2,2"/></g>`
    : "";
  return `<svg viewBox="0 0 ${c.vbW} ${c.vbH}" role="img" aria-label="${esc(label)}">
<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="5" fill="${OBSIDIAN}" stroke="${color}" stroke-width="1" opacity="0.97"><title>${esc(s.id)} — ${esc(s.intro)}</title></rect>
<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="5" fill="${kindWash(s)}" stroke="${color}" stroke-width="0.5" filter="url(#${kindFilter(s)})"/>
<text x="${cx}" y="30" fill="${LINEN}" font-size="7.5" font-weight="600" font-family="Outfit,system-ui,sans-serif" text-anchor="middle">${esc(s.id)}</text>
<text x="${cx}" y="42" fill="${SAND}" font-size="6.5" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(meta)}</text>
<text x="${cx}" y="56" fill="${color}" font-size="6.5" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(verbsLine(s.commands))}</text>
${chipSvg}
<g class="spine-chip"><rect x="${cx - 30}" y="7" width="60" height="14" rx="3" fill="${OBSIDIAN}"/><rect x="${cx - 30}" y="7" width="60" height="14" rx="3" fill="rgba(2,253,255,.18)" stroke="${MINT}" stroke-width="0.8" filter="url(#glow-mint)"/><text x="${cx}" y="17" fill="${MINT}" font-size="8" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(spine)}</text></g>
${toolPill}
</svg>`;
}

/** A rail anchor card (the irail-anchor idiom) for a cross-stage skill or the add-on. */
function anchor(opts: { id: string; href: string; meta: string; does: string; badges: string[]; cls: string; label: string }): string {
  return `<a class="irail-anchor ${opts.cls}" id="wa-anchor-${esc(opts.id)}" href="${opts.href}" aria-label="${esc(opts.label)}">
<span class="ia-name">${esc(opts.id)}</span>
<span class="ia-meta">${esc(opts.meta)}</span>
<span class="ia-do">${esc(opts.does)}</span>
<span class="ia-badges">${opts.badges.map((b) => `<span class="ia-new">${esc(b)}</span>`).join("")}</span>
</a>`;
}

interface CanvasEdge {
  from: string; to: string; label: string;
  /** forward skip (ember, right gutter) · back (sand, left gutter) · rail (magenta/yellow from an anchor). */
  kind: "skip" | "back" | "rail";
}

function shortWhen(w: string): string {
  const t = w.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
  return t.length > 34 ? t.slice(0, 32).replace(/[ ,:;]+$/, "") + "…" : t;
}

/**
 * The diagram. Adjacent forward hand-offs ride the spine chips; forward skips
 * draw on the right gutter, backward hand-offs (re-pricing, invoicing, a fix
 * after sign-off) on the left, and the cross-stage pair's hand-offs from their
 * rail anchors. Variant "a" stacks the two rails under the bands like the
 * architecture page; "b" puts them in a side column beside the bands.
 */
export function buildWorkDiagram(input: DiagramInput, variant: Variant = "a"): { html: string; script: string } {
  const rail = input.skills.filter((s) => s.ordinal !== null).sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const cross = input.skills.filter((s) => s.ordinal === null).sort((a, b) => a.id.localeCompare(b.id));
  const total = rail.length;
  const byId = new Map(input.skills.map((s) => [s.id, s]));
  const ordinalOf = (id: string) => byId.get(id)?.ordinal ?? null;

  const coords: Record<string, Coord> = {};
  for (const s of rail) coords[s.id] = { band: s.stage, ...CARD };

  // Edge classes. Labels name the receiving verbs (the `verb:` of the
  // hands_off row); a `when:` is a sentence and is shown in the band detail.
  const canvas: CanvasEdge[] = [];
  const spineNext = new Map<string, string[]>();
  const verbLabel = (e: DiagramEdge) => {
    const vs = [...new Set(e.verbs.map((v) => v.split(" ")[0]))];
    return vs.slice(0, 2).join(" · ") + (vs.length > 2 ? " · …" : "") || shortWhen(e.whens[0] ?? "");
  };
  for (const e of input.edges) {
    const a = ordinalOf(e.from), b = ordinalOf(e.to);
    const label = verbLabel(e);
    if (a !== null && b !== null) {
      if (b === a + 1) { spineNext.set(e.from, [...(spineNext.get(e.from) ?? []), e.to]); continue; }
      if (b > a + 1) canvas.push({ from: e.from, to: e.to, label, kind: "skip" });
      else if (b < a) canvas.push({ from: e.from, to: e.to, label, kind: "back" });
    } else if (a === null && b !== null) {
      canvas.push({ from: e.from, to: e.to, label, kind: "rail" });
    }
    // cross ↔ cross and rail → cross edges are written on the anchors instead.
  }

  const edgesFrom = (id: string) => input.edges.filter((e) => e.from === id);
  const edgesTo = (id: string) => input.edges.filter((e) => e.to === id);

  const bands = rail.map((s, i) => {
    const idx = i + 1;
    const tool = input.tools.byStage[s.id];
    const reads = [...new Set(edgesTo(s.id).map((e) => e.from))];
    const hands = [...new Set(edgesFrom(s.id).map((e) => e.to))];
    const detail = `<div class="band-detail">
<div class="bd-inner" style="background:${s.network === "declared" ? "rgba(235,254,0,0.04)" : "rgba(2,253,255,0.04)"};border:0.5px solid ${s.network === "declared" ? "rgba(235,254,0,0.25)" : "rgba(2,253,255,0.2)"}">
<div class="bd-left">
<div class="bd-meta">
<div class="bd-meta-row"><span class="bd-meta-label">skill</span><div class="bd-tags"><span class="bd-tag" style="background:${kindWash(s)};border:0.5px solid ${kindColor(s)};color:${kindColor(s)}">${esc(s.id)} ${esc(s.version)}</span></div></div>
<div class="bd-meta-row"><span class="bd-meta-label">handed in</span><div class="bd-cross">${reads.length ? reads.map((r) => `<span class="bd-cross-tag" style="background:rgba(165,188,209,0.06);border:0.5px solid rgba(165,188,209,0.3);color:${SAND}">← ${esc(r)}</span>`).join("") : `<span class="bd-cross-tag" style="color:${SAND}">your notes or a transcript</span>`}</div></div>
<div class="bd-meta-row"><span class="bd-meta-label">hands off</span><div class="bd-cross">${hands.map((h) => `<span class="bd-cross-tag" style="background:rgba(43,225,121,0.06);border:0.5px solid rgba(43,225,121,0.3);color:${EMBER}">→ ${esc(h)}</span>`).join("") || `<span class="bd-cross-tag" style="color:${SAND}">the client, through your handoffs.yaml</span>`}</div></div>
${tool ? `<div class="bd-meta-row"><span class="bd-meta-label">add-on</span><div class="bd-cross"><span class="bd-cross-tag" style="background:rgba(216,127,209,0.08);border:0.5px solid ${SIG};color:${SIG}">ow-tools · ${esc(tool)}</span></div></div>` : ""}
</div>
<div class="bd-text">
<div class="bd-badge" style="color:var(--sand)">Stage ${idx} of ${total}</div>
<div class="bd-title">${esc(s.stageLabel)}</div>
<div class="bd-desc">${esc(s.intro)} <a href="/work/${esc(s.id)}" style="color:${EMBER}">${esc(s.id)} →</a></div>
</div>
</div>
</div>
</div>`;
    return `<div class="band" id="wa-band-${esc(s.stage)}" data-phase="${esc(s.stage)}" tabindex="0">
<div class="band-label"><div class="band-label-bar" style="background:${kindColor(s)}"></div><span class="band-label-text">${esc(s.stageLabel.toUpperCase())}</span></div>
<div class="band-content">
${bandSvg(s, idx, total, tool)}
${detail}
</div>
</div>` + (i < rail.length - 1 ? `\n<div class="band-arrow" id="wa-arrow-${i}" data-from="${esc(s.stage)}" data-to="${esc(rail[i + 1].stage)}"></div>` : "");
  });

  const crossRail = `<div class="irail wa-rail wa-rail--cross" role="group" aria-label="Cross-stage rail: ${cross.map((c) => c.id).join(" and ")}, used at any stage">
<div class="irail-head"><span class="irail-eyebrow">${esc(input.release)} · cross-stage · any stage</span><span class="irail-title">Research and drafts — handed into the stages, never on them</span></div>
<div class="irail-anchors">
${cross.map((c) => anchor({
    id: c.id, href: `/work/${c.id}`, cls: c.network === "declared" ? "wa-anchor--net" : "wa-anchor--txt",
    meta: `${c.version} · ${c.bundle} · network: ${c.network} · ${verbsLine(c.commands)}`,
    does: `${c.short} → ${[...new Set(edgesFrom(c.id).map((e) => e.to))].join(" · ") || "the workstream"}`,
    badges: [c.network === "declared" ? "NET · host web tools or connector" : "TXT · sends nothing", `${input.release} · preview`],
    label: `${c.id}: ${c.intro}`,
  })).join("\n")}
</div>
<div class="irail-foot">↑ ${cross.map((c) => c.id).join(" and ")} hand findings and drafts into the stages above · each line is a hands-off row in the skills’ edge files</div>
</div>`;

  const toolStages = rail.filter((s) => input.tools.byStage[s.id]).map((s) => `${s.id}: ${input.tools.byStage[s.id]}`);
  const toolRail = `<div class="irail wa-rail wa-rail--tools" role="group" aria-label="Add-on rail: ow-tools ${esc(input.tools.version)}, the Claude Code add-on that runs code on your machine">
<div class="irail-head"><span class="irail-eyebrow">${esc(input.release)} · add-on · Claude Code only</span><span class="irail-title">ow-tools — the one part that runs code, and says so</span></div>
<div class="irail-anchors">
${anchor({ id: input.tools.id, href: "/work/ow-tools", cls: "wa-anchor--tools", meta: `${input.tools.version} · plugin from its own marketplace · /ow-tools doctor`, does: "transcription · export · calc · digest · health · capture · scan-secrets · session start · doctor", badges: ["RUNS CODE", "network: health, capture only", "audio local"], label: `ow-tools ${input.tools.version}: the Claude Code add-on; runs code on your machine and says so` })}
<div class="irail-anchor wa-anchor--kit"><span class="ia-name">where the stages use it</span><span class="ia-meta">from each skill’s compatibility line</span><span class="ia-do">${esc(toolStages.join(" · "))}</span><span class="ia-badges"><span class="ia-new">the skills work without it</span></span></div>
</div>
<div class="irail-foot">magenta pills on the bands mark the stages that call it · no telemetry · no update check</div>
</div>`;

  const legend = `<div class="legend" role="group" aria-label="Legend">
<div class="legend-section-label">cards</div>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-swatch" style="background:rgba(2,253,255,0.08);border:1px solid #02fdff"></div><span>text only · network: none</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Core bundle</div>A text skill whose files name no web tool and no connector. It sends nothing anywhere. Six of the nine.</div></span>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-swatch" style="background:rgba(235,254,0,.10);border:1px solid #ebfe00"></div><span>text only · network: declared</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Connected bundle</div>Still text, still no code: the skill’s text names the host’s own web tools or a document connector it may use, under the host’s permission prompts. Its rules file says what may leave the machine. Three of the nine.</div></span>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-swatch" style="background:rgba(216,127,209,.10);border:1px solid #d87fd1"></div><span>ow-tools · runs code</span><div class="legend-card" role="tooltip"><div class="legend-card-title">The add-on</div>Optional, Claude Code only, from its own marketplace. Two of its verbs use the network, only for what you list; audio never leaves the machine.</div></span>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-swatch li-swatch-spine">↑N↓</div><span>stage ordinal</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Stage ordinal</div>The seven stage skills wear numbered chips showing their place on the rail; <code>↑prev·↓next</code> marks the adjacent hand-off, which the user acts on from the NEXT block each skill prints.</div></span>
<div class="legend-divider"></div>
<div class="legend-section-label">connections</div>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-line" style="border-color:#2be179;border-style:dashed"></div><span>hands off (skips a stage)</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Forward hand-off</div>A hands_off row in the producer’s edge file whose receiver is more than one stage down: the acceptance test to the handoff when documentation was not bought, the Build Plan straight to care for a takeover.</div></span>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-line" style="border-color:#a5bcd1;border-style:dashed"></div><span>returns (back up the rail)</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Return</div>Work that goes back to an earlier stage: a change to price, an invoice request, a fix too big for a change order, a care request that needs a quote.</div></span>
<span class="legend-item" tabindex="0"><div aria-hidden="true" class="li-line" style="border-color:#ebfe00;border-style:dashed"></div><span>from the cross-stage rail</span><div class="legend-card" role="tooltip"><div class="legend-card-title">Cross-stage hand-off</div>Research findings handed to the Build Plan’s evidence register; ow-research and ow-draft also hand to each other on the rail.</div></span>
</div>`;

  const rails = `${crossRail}\n${toolRail}`;
  const header = `<div class="header">
<div class="header-eyebrow">OPCHAIN.WORK · ARCHITECTURE · ${esc(input.release)} · PREVIEW</div>
<p class="arch-title">opchain.work planning skills</p>
<p class="subtitle">Stage rail · ${rail.length} stage skills · ${cross.length} cross-stage · ${input.skills.length} skills in all · versions per skill · <span style="color:var(--warning)">${input.skills.filter((s) => s.network === "declared").length} network: declared</span> · <span style="color:var(--sig)">ow-tools ${esc(input.tools.version)} add-on</span> · edges from each skill’s <code>skill.edges.yaml</code></p>
</div>`;

  const bandsWrap = `<div class="bands-wrap" id="wa-bands-wrap">
<canvas class="lines-canvas" id="wa-lines-canvas"></canvas>
${bands.join("\n")}
</div>`;

  const body = variant === "a"
    ? `${bandsWrap}\n${rails}`
    : `<div class="wa-cols"><div class="wa-col-main">${bandsWrap}</div><div class="wa-col-side" id="wa-side">${rails}</div></div>`;

  const html = `<div class="arch-v2 work-arch work-arch-desktop" data-variant="${variant}">
<svg class="arch-v2-defs" aria-hidden="true"><defs>
<filter id="glow-yellow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feFlood flood-color="#ebfe00" flood-opacity="0.5" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow-mint" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feFlood flood-color="#02fdff" flood-opacity="0.45" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>
<div class="container">
${header}
<div class="diagram-container">
${body}
${legend}
</div>
<p class="footer">opchain.work · ${input.skills.length} skills · ${rail.length} stages · ${cross.length} cross-stage · 1 add-on · versions per skill · ${esc(input.release)} · preview · edges from skill.edges.yaml</p>
</div>
</div>`;

  const script = buildScript(rail.map((s) => s.stage), coords, canvas, variant);
  return { html, script };
}

/**
 * The page script: drawConnectionLines (verbatim idiom from architecture.astro:
 * pt / drawArrowhead / drawPath / labelPill / orthoSkip reading CSS variables
 * at draw time), band hover/focus dimming, legend tooltips, resize redraw.
 * Rail anchors are DOM elements, so pt() also accepts an element id.
 */
function buildScript(bandKeys: string[], coords: Record<string, Coord>, edges: CanvasEdge[], variant: Variant): string {
  return `(function () {
    const BANDS = ${JSON.stringify(bandKeys)};
    const ARROWS = BANDS.slice(0, -1).map((_, i) => 'wa-arrow-' + i);
    const SKILLS = ${JSON.stringify(coords)};
    const EDGES = ${JSON.stringify(edges)};
    const VARIANT = ${JSON.stringify(variant)};
    let activePhase = null, leaveTimeout = null, legendActive = false, legendLeaveTimeout = null;

    function drawConnectionLines() {
      const canvas = document.getElementById('wa-lines-canvas');
      const wrap = document.getElementById('wa-bands-wrap');
      const root = document.querySelector('.work-arch');
      if (!canvas || !wrap || !root) return;
      // The canvas covers the bands wrap; in variant b the side rail sits outside it,
      // so size the canvas to the whole column row instead.
      const area = VARIANT === 'b' ? (wrap.closest('.wa-cols') || wrap) : wrap;
      const wr = area.getBoundingClientRect();
      if (!wr.width || !wr.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = wr.width * dpr; canvas.height = wr.height * dpr;
      canvas.style.width = wr.width + 'px'; canvas.style.height = wr.height + 'px';
      if (VARIANT === 'b') { const w0 = wrap.getBoundingClientRect(); canvas.style.left = (wr.left - w0.left) + 'px'; canvas.style.top = (wr.top - w0.top) + 'px'; }
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, wr.width, wr.height);

      function pt(skill, edge) {
        const s = SKILLS[skill];
        let r;
        if (s) {
          const svg = document.querySelector('#wa-band-' + s.band + ' .band-content svg');
          if (!svg) return null;
          const sr = svg.getBoundingClientRect();
          const sx = sr.width / s.vbW, sy = sr.height / s.vbH;
          r = { left: sr.left + s.x * sx, top: sr.top + s.y * sy, width: s.w * sx, height: s.h * sy };
        } else {
          const el = document.getElementById('wa-anchor-' + skill);
          if (!el) return null;
          r = el.getBoundingClientRect();
        }
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let x, y;
        switch (edge) {
          case 'top':    x = cx;               y = r.top;             break;
          case 'bottom': x = cx;               y = r.top + r.height;  break;
          case 'left':   x = r.left;           y = cy;                break;
          case 'right':  x = r.left + r.width; y = cy;                break;
        }
        return { x: x - wr.left, y: y - wr.top };
      }
      function arrowMidY(arrowId) {
        const el = document.getElementById(arrowId);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - wr.top;
      }
      function drawArrowhead(fromX, fromY, toX, toY, color, alpha, size) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const sz = size || 5;
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = alpha;
        ctx.translate(toX, toY); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-sz * 1.6, -sz * 0.55); ctx.lineTo(-sz * 1.6, sz * 0.55); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      function drawPath(points, color, width, dash, alpha, arrowEnd, arrowSize) {
        if (points.length < 2 || points.some(p => !p)) return;
        const a = (alpha == null) ? 0.85 : alpha;
        const aSz = arrowSize || 5;
        const pts = points.map(p => ({ x: p.x, y: p.y }));
        if (arrowEnd && pts.length >= 2) {
          const p = pts[pts.length - 2], q = pts[pts.length - 1];
          const dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx*dx + dy*dy);
          const back = aSz * 1.6;
          if (len > back) pts[pts.length - 1] = { x: q.x - (dx/len)*back, y: q.y - (dy/len)*back };
        }
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = a;
        ctx.setLineDash(dash ? [5, 4] : []); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.setLineDash([]);
        if (arrowEnd) { const p = points[points.length - 2], q = points[points.length - 1]; drawArrowhead(p.x, p.y, q.x, q.y, color, a, aSz); }
      }
      function labelPill(text, x, y, color) {
        ctx.save();
        ctx.font = '500 7.5px "JetBrains Mono", ui-monospace, monospace';
        const m = ctx.measureText(text);
        const padX = 6, padY = 3, w = m.width + padX * 2, h = 9 + padY * 2, rx = 3;
        // Keep the pill inside the canvas (the right gutter is narrow at small widths).
        x = Math.min(Math.max(x, w / 2 + 2), wr.width - w / 2 - 2);
        ctx.fillStyle = PILL_BG; ctx.globalAlpha = 0.96;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, rx); ctx.fill(); } else { ctx.fillRect(x - w/2, y - h/2, w, h); }
        ctx.strokeStyle = color; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.45;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, rx); ctx.stroke(); } else { ctx.strokeRect(x - w/2, y - h/2, w, h); }
        ctx.globalAlpha = 0.95; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
      }
      function orthoSkip(srcSkill, srcEdge, tgtSkill, tgtEdge, midY1, midY2, safeX, color, width, dash, alpha, arrowSize) {
        const s = pt(srcSkill, srcEdge), t = pt(tgtSkill, tgtEdge);
        if (!s || !t) return null;
        const points = [s, { x: s.x, y: midY1 }, { x: safeX, y: midY1 }, { x: safeX, y: midY2 }, { x: t.x, y: midY2 }, t];
        drawPath(points, color, width, dash, alpha, true, arrowSize);
        return { s, t, midY1, midY2, safeX };
      }

      const cssVar = (n, fallback) => { const v = getComputedStyle(root).getPropertyValue(n).trim(); return v || fallback; };
      const EMB = cssVar('--ember', '#2be179'), SAND = cssVar('--sand', '#a5bcd1'), YEL = cssVar('--warning', '#ebfe00');
      const PILL_BG = cssVar('--shade', '#12191f');
      const W = 1.2, O = 0.78, A = 5;
      const bandIndex = (id) => BANDS.indexOf(SKILLS[id] ? SKILLS[id].band : null);
      // Lanes: each gutter line gets its own x so parallel lines do not overlap.
      const first = Object.keys(SKILLS)[0];
      const right = pt(first, 'right');
      // The ow-tools pills hang off the card's right edge (about 175 viewBox units);
      // the forward lanes start beyond them, scaled like the card itself.
      const svgEl = document.querySelector('#wa-band-' + SKILLS[first].band + ' .band-content svg');
      const unit = svgEl ? svgEl.getBoundingClientRect().width / SKILLS[first].vbW : 1;
      // …but never past the canvas: three lanes and a label must still fit.
      const cardRightX = Math.min((right ? right.x : wr.width * 0.63) + 178 * unit, wr.width - 4 * 24 - 8);
      const left = pt(Object.keys(SKILLS)[0], 'left');
      const cardLeftX = left ? left.x : wr.width * 0.37;
      let laneR = 0, laneL = 0;
      for (const e of EDGES) {
        const a = bandIndex(e.from), b = bandIndex(e.to);
        if (e.kind === 'skip') {
          const y1 = arrowMidY('wa-arrow-' + a), y2 = arrowMidY('wa-arrow-' + (b - 1));
          if (y1 == null || y2 == null) continue;
          laneR += 1;
          const safeX = cardRightX + laneR * 24;
          const r = orthoSkip(e.from, 'bottom', e.to, 'top', y1 - 4 + laneR * 3, y2 - 4 - laneR * 3, safeX, EMB, W, true, O, A);
          if (r) labelPill(e.label, safeX, (r.midY1 + r.midY2) / 2 + (laneR % 2 ? -14 : 14), EMB);
        } else if (e.kind === 'back') {
          continue; // drawn below, one trunk per receiver
        } else if (e.kind === 'rail') {
          const s = pt(e.from, VARIANT === 'b' ? 'left' : 'top'), t = pt(e.to, 'right');
          if (!s || !t) continue;
          laneR += 1;
          const safeX = cardRightX + laneR * 24;
          const yT = t.y;
          const points = VARIANT === 'b'
            ? [s, { x: safeX, y: s.y }, { x: safeX, y: yT }, t]
            : [s, { x: s.x, y: s.y - 10 }, { x: safeX, y: s.y - 10 }, { x: safeX, y: yT }, t];
          drawPath(points, YEL, W, true, O, true, A);
          labelPill(e.label, safeX, yT + 26, YEL);
        }
      }
      // Returns: every back edge into one receiver rides a single trunk in the
      // left gutter (the busFanOut idiom, reversed): each source joins at its
      // own band gap, the trunk ends at the receiver's bottom edge, one pill
      // names the receiving verbs. One lane per receiver, so four lanes at most.
      const backByTarget = new Map();
      for (const e of EDGES) if (e.kind === 'back') { const l = backByTarget.get(e.to) || []; l.push(e); backByTarget.set(e.to, l); }
      const targets = [...backByTarget.keys()].sort((p, q) => bandIndex(p) - bandIndex(q));
      targets.forEach((to, i) => {
        const group = backByTarget.get(to);
        const t = pt(to, 'bottom');
        if (!t) return;
        const safeX = cardLeftX - 44 - i * 28;
        if (safeX < 24) return;
        const joins = [];
        for (const e of group) {
          const a = bandIndex(e.from);
          const y = arrowMidY('wa-arrow-' + (a - 1));
          const s = pt(e.from, 'top');
          if (y == null || !s) continue;
          const yJ = y + 4 + i * 3;
          drawPath([s, { x: s.x, y: yJ }, { x: safeX, y: yJ }], SAND, 1.0, true, 0.55, false);
          joins.push(yJ);
        }
        if (!joins.length) return;
        const yEnd = arrowMidY('wa-arrow-' + bandIndex(to)) ; const yT = (yEnd == null ? t.y + 12 : yEnd + 4 + i * 3);
        drawPath([{ x: safeX, y: Math.max.apply(null, joins) }, { x: safeX, y: yT }, { x: t.x, y: yT }, t], SAND, 1.0, true, 0.55, true, 4);
        const verbs = [...new Set(group.flatMap(e => e.label.split(' · ')))].filter(v => v !== '…').slice(0, 2);
        const label = verbs.join(' · ');
        // On the entry segment: each receiver's is at its own height, so the
        // four labels never stack.
        labelPill(label, (safeX + t.x) / 2, yT - 9, SAND);
      });
    }

    function bandEnter(phase) {
      clearTimeout(leaveTimeout);
      if (legendActive || activePhase === phase) return;
      activePhase = phase;
      BANDS.forEach(p => { const b = document.getElementById('wa-band-' + p); if (!b) return; if (p === phase) { b.classList.add('active'); b.classList.remove('dimmed'); } else { b.classList.add('dimmed'); b.classList.remove('active'); } });
      ARROWS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('dimmed'); });
      const lc = document.getElementById('wa-lines-canvas'); if (lc) lc.classList.add('dimmed');
      document.querySelectorAll('.work-arch .wa-rail').forEach(r => r.classList.add('dimmed'));
    }
    function bandLeave() {
      leaveTimeout = setTimeout(() => {
        activePhase = null;
        BANDS.forEach(p => { const b = document.getElementById('wa-band-' + p); if (b) b.classList.remove('active', 'dimmed'); });
        ARROWS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('dimmed'); });
        const lc = document.getElementById('wa-lines-canvas'); if (lc) lc.classList.remove('dimmed');
        document.querySelectorAll('.work-arch .wa-rail').forEach(r => r.classList.remove('dimmed'));
        setTimeout(() => drawConnectionLines(), 550);
      }, 200);
    }
    function legendEnter(el) {
      clearTimeout(legendLeaveTimeout);
      legendActive = true;
      document.querySelectorAll('.work-arch .legend-item').forEach(li => {
        const c = li.querySelector('.legend-card');
        if (li === el) { li.classList.remove('dimmed'); if (c) c.classList.add('visible'); }
        else { li.classList.add('dimmed'); if (c) c.classList.remove('visible'); }
      });
    }
    function legendLeave() {
      legendLeaveTimeout = setTimeout(() => {
        legendActive = false;
        document.querySelectorAll('.work-arch .legend-item').forEach(li => { li.classList.remove('dimmed'); const c = li.querySelector('.legend-card'); if (c) c.classList.remove('visible'); });
      }, 200);
    }

    BANDS.forEach(phase => {
      const band = document.getElementById('wa-band-' + phase);
      if (!band) return;
      const enter = () => bandEnter(phase);
      band.addEventListener('mouseenter', enter); band.addEventListener('mouseleave', bandLeave);
      band.addEventListener('focusin', enter); band.addEventListener('focusout', bandLeave);
    });
    ARROWS.forEach(id => { const a = document.getElementById(id); if (!a) return; a.addEventListener('mouseenter', () => clearTimeout(leaveTimeout)); a.addEventListener('mouseleave', bandLeave); });
    document.querySelectorAll('.work-arch .legend-item').forEach(li => {
      li.addEventListener('mouseenter', () => legendEnter(li)); li.addEventListener('mouseleave', legendLeave);
      li.addEventListener('focus', () => legendEnter(li)); li.addEventListener('blur', legendLeave);
    });

    let raf = 0;
    const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawConnectionLines); };
    window.addEventListener('resize', redraw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    setTimeout(drawConnectionLines, 50);
    setTimeout(drawConnectionLines, 600);
  })();`;
}

// ── mobile fallback (MobileArchitecture.astro idiom: <details> bands with 330-wide SVG cards) ──

function mobileCard(s: DiagramSkill, idx: number | null, total: number, filterId: string): string {
  const color = kindColor(s);
  const ordinal = idx !== null ? `<rect x="148" y="10" width="34" height="20" rx="4" fill="${OBSIDIAN}"/><rect x="148" y="10" width="34" height="20" rx="4" fill="rgba(20,184,166,.22)" stroke="${MINT}" stroke-width="1.2" filter="url(#mwa-glow-mint)"/><text x="165" y="24" fill="${MINT}" font-size="13" font-weight="700" font-family="JetBrains Mono,monospace" text-anchor="middle">${idx}</text>` : "";
  const label = `${s.id}${idx !== null ? `, stage ${idx} of ${total}` : ", cross-stage"}: ${s.version}, ${s.bundle} bundle, network ${s.network}`;
  return `<svg viewBox="0 0 330 110" role="img" aria-label="${esc(label)}">
<rect x="40" y="20" width="250" height="72" rx="6" fill="${OBSIDIAN}" stroke="${color}" stroke-width="1.8" filter="url(#${filterId})"/>
<rect x="40" y="20" width="250" height="72" rx="6" fill="${kindWash(s)}" stroke="${color}" stroke-width="1"/>
${ordinal}
<text x="165" y="51" fill="${LINEN}" font-size="15" font-weight="600" font-family="Outfit,system-ui,sans-serif" text-anchor="middle">${esc(s.id)}</text>
<text x="165" y="68" fill="${SAND}" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(`${s.version} · ${s.bundle} · network: ${s.network}`)}</text>
<text x="165" y="84" fill="${color}" font-size="11" font-family="JetBrains Mono,monospace" text-anchor="middle">${esc(verbsLine(s.commands.slice(0, 2)))}</text>
</svg>`;
}

export function buildMobileWorkDiagram(input: DiagramInput): string {
  const rail = input.skills.filter((s) => s.ordinal !== null).sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const cross = input.skills.filter((s) => s.ordinal === null).sort((a, b) => a.id.localeCompare(b.id));
  const total = rail.length;
  const edgesFrom = (id: string) => input.edges.filter((e) => e.from === id);
  const bands = rail.map((s, i) => {
    const idx = i + 1;
    const hands = [...new Set(edgesFrom(s.id).map((e) => e.to))];
    const tool = input.tools.byStage[s.id];
    return `<details class="ma-band" open style="--ma-phase-color: ${kindColor(s)}">
<summary class="ma-band-header"><h3 class="ma-band-heading"><span class="ma-band-num">${idx}</span><span class="ma-band-title">${esc(s.stageLabel)}</span><span class="ma-band-of">Stage ${idx} of ${total}</span></h3></summary>
<div class="ma-band-svg-wrap">${mobileCard(s, idx, total, s.network === "declared" ? "mwa-glow-yellow" : "mwa-glow-mint")}</div>
<div class="ma-band-caption">
<p>${esc(s.intro)} <a href="/work/${esc(s.id)}">${esc(s.id)} →</a></p>
<div class="ma-bc-cp"><span class="ma-bc-cp-badge">→</span><span>hands off to ${hands.length ? hands.map((h) => `<code>${esc(h)}</code>`).join(" · ") : "the client, through your handoffs.yaml"}</span></div>
${tool ? `<div class="ma-bc-cp"><span class="ma-bc-cp-badge ma-bc-tool">ow-tools</span><span>${esc(tool)}</span></div>` : ""}
</div>
</details>`;
  }).join("\n");
  const crossBands = cross.map((s) => `<details class="ma-band ma-cross" open style="--ma-phase-color: ${kindColor(s)}">
<summary class="ma-band-header"><h3 class="ma-band-heading"><span class="ma-band-num">↔</span><span class="ma-band-title">${esc(s.id)}</span><span class="ma-band-of">cross-stage</span></h3></summary>
<div class="ma-band-svg-wrap">${mobileCard(s, null, total, s.network === "declared" ? "mwa-glow-yellow" : "mwa-glow-mint")}</div>
<div class="ma-band-caption"><p>${esc(s.intro)} <a href="/work/${esc(s.id)}">${esc(s.id)} →</a></p><div class="ma-bc-cp"><span class="ma-bc-cp-badge">→</span><span>hands off to ${[...new Set(edgesFrom(s.id).map((e) => e.to))].map((h) => `<code>${esc(h)}</code>`).join(" · ") || "the workstream"}</span></div></div>
</details>`).join("\n");
  const toolStages = rail.filter((s) => input.tools.byStage[s.id]).map((s) => `<code>${esc(s.id)}</code> ${esc(input.tools.byStage[s.id])}`);
  return `<section class="mobile-architecture mobile-work-architecture work-arch-mobile" aria-label="opchain.work architecture (mobile)">
<svg class="ma-defs" aria-hidden="true"><defs>
<filter id="mwa-glow-mint" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#02fdff" flood-opacity="0.45" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="mwa-glow-yellow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feFlood flood-color="#ebfe00" flood-opacity="0.45" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>
<div class="ma-container">
<div class="ma-header"><div class="ma-header-eyebrow">OPCHAIN.WORK · ARCHITECTURE · MOBILE · ${esc(input.release)} · PREVIEW</div><p class="ma-title">opchain.work planning skills</p><p class="ma-subtitle">Stage rail · ${rail.length} stage skills · ${cross.length} cross-stage · versions per skill · <span style="color:var(--ma-triagent)">${input.skills.filter((s) => s.network === "declared").length} network: declared</span> · <span style="color:var(--ma-sig)">ow-tools ${esc(input.tools.version)}</span></p></div>
<div class="ma-diagram-container">
${bands}
${crossBands}
<div class="ma-instrail ma-tools" aria-label="ow-tools, the Claude Code add-on"><div class="ma-instrail-row"><span class="ma-instrail-tag">ADD-ON</span><span class="ma-instrail-name">ow-tools ${esc(input.tools.version)} · runs code on your machine</span></div><div class="ma-instrail-desc">Claude Code only, from its own marketplace. Network: health and capture only, for what you list; audio local. ${toolStages.join(" · ")}. <a href="/work/ow-tools">ow-tools →</a></div></div>
</div>
</div>
</section>`;
}
