#!/usr/bin/env node
/**
 * Deterministic SVG geometry auditor for the architecture diagrams.
 *
 *   node scripts/audit-diagram-geometry.mjs \
 *     site/src/pages/architecture.astro \
 *     site/src/components/MobileArchitecture.astro [--json out.json]
 *
 * WHY THIS EXISTS
 * The diagrams are ~1,500 lines of hand-placed SVG across two files. Asking a
 * person (or a model) to check hundreds of coordinates by eye is how the
 * v1.7 build-band regression survived two releases. This parses the real
 * attributes and does the arithmetic, so "does this label fit its box" stops
 * being a judgement call.
 *
 * WHAT IT CHECKS
 *   - elements outside their viewBox
 *   - centred text whose x != its panel's centre
 *   - text overflowing its own panel or chip (width estimated from the font:
 *     JetBrains Mono advances 0.6em/char, Outfit ~0.52em)
 *   - real ink collisions: text vs text, chip vs chip, panel vs panel
 *   - connectors that are degenerate, end inside a panel, or are almost-
 *     but-not-quite axis aligned
 *   - arrowhead markers whose fill disagrees with their line's stroke
 *   - row rhythm: unequal inter-panel gaps, mixed heights, asymmetric margins
 *   - CP/ORC badge straddle consistency against the diagram's modal pattern
 *
 * IT IS OWNERSHIP-AWARE. A CP/ORC chip is *supposed* to straddle its panel's
 * top-right edge, so chips are classified separately from panels and are not
 * reported as overflow. Entities are decoded before measuring ("&#8220;" is
 * one glyph, not eight), and vertical crowding is only reported when the
 * glyphs actually collide, not merely when baselines are close.
 *
 * KNOWN FALSE POSITIVES — as of v1.9 the clean baseline is TOTAL: 16, all of
 * them expected. Do not "fix" these; investigate anything ABOVE the baseline:
 *   - chip-straddle-inconsistent x4 + uneven-row-gaps/heights on the
 *     quality-gate rail: measured against the dashed PR-stop highlight band,
 *     which intentionally frames the pair and is 12 units larger than it.
 *   - asymmetric-row-margins on the orchestrator sync/routing sub-diagrams:
 *     the "left margin" is the orchestrator box, which is not part of the row.
 *   - asymmetric-row-margins on the AI/BUILD bands (14 vs 20): the diagram-wide
 *     convention reserves 9 units at the right edge for the +11 ORC overhang.
 *   - uneven-row-heights in Ship: oc-release-ops is deliberately 64 tall so all
 *     four panels stay top-aligned on the single y=39 connector line.
 *   - connector-fully-inside-panel x2: the release-ops mini-pipeline arrows and
 *     the mobile equivalent, which legitimately live inside their panel.
 *
 * Full procedure: docs/runbooks/architecture-diagram-cycle.md
 */
import fs from 'node:fs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--') && !a.endsWith('.json'));
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;

const numAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isNaN(v) ? null : v;
};
const strAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
};
// Entities must be decoded before measuring: "&#8220;" is ONE glyph, not eight.
const decodeEntities = (str) =>
  str.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
     .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
     .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
     .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const isMono = (fam) => !!fam && /mono/i.test(fam);
// JetBrains Mono advance is exactly 0.6em. Outfit averages ~0.52em for mixed case.
const advance = (fam) => (isMono(fam) ? 0.6 : 0.52);

function textBox(t) {
  const ls = t.letterSpacing
    ? parseFloat(t.letterSpacing) * (/em/.test(t.letterSpacing) ? t.fontSize : 1)
    : 0;
  const w = t.content.length * t.fontSize * advance(t.family) + Math.max(0, t.content.length - 1) * ls;
  const left = t.anchor === 'middle' ? t.x - w / 2 : t.anchor === 'end' ? t.x - w : t.x;
  return { left, right: left + w, w, top: t.y - t.fontSize * 0.78, bot: t.y + t.fontSize * 0.22 };
}

function findSvgBlocks(src) {
  const blocks = [];
  const re = /<svg\b/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    let depth = 0, end = -1, t;
    const tagRe = /<svg\b|<\/svg>/g;
    tagRe.lastIndex = start;
    while ((t = tagRe.exec(src))) {
      if (t[0] === '</svg>') { depth--; if (depth === 0) { end = t.index + 6; break; } }
      else depth++;
    }
    if (end === -1) continue;
    const body = src.slice(start, end);
    const head = body.slice(0, body.indexOf('>') + 1);
    blocks.push({
      line: src.slice(0, start).split('\n').length,
      viewBox: strAttr(head, 'viewBox'),
      ariaLabel: strAttr(head, 'aria-label'),
      cls: strAttr(head, 'class'),
      body,
    });
    re.lastIndex = end;
  }
  return blocks;
}

function parseBlock(block) {
  const { body } = block;
  const base = block.line - 1;
  const lineOf = (idx) => base + body.slice(0, idx).split('\n').length;

  const defsRanges = [];
  let dm;
  const defsRe = /<defs\b[\s\S]*?<\/defs>/g;
  while ((dm = defsRe.exec(body))) defsRanges.push([dm.index, dm.index + dm[0].length]);
  const inDefs = (i) => defsRanges.some(([a, b]) => i >= a && i < b);

  const rects = [], texts = [], lineEls = [], polylines = [], circles = [];
  let m;

  const rectRe = /<rect\b[^>]*?\/?>/g;
  while ((m = rectRe.exec(body))) {
    if (inDefs(m.index)) continue;
    const t = m[0];
    const x = numAttr(t, 'x'), y = numAttr(t, 'y'), w = numAttr(t, 'width'), h = numAttr(t, 'height');
    if ([x, y, w, h].some((v) => v === null)) continue;
    rects.push({ x, y, w, h, rx: numAttr(t, 'rx'), fill: strAttr(t, 'fill'), stroke: strAttr(t, 'stroke'),
      dash: strAttr(t, 'stroke-dasharray'), filter: strAttr(t, 'filter'), cls: strAttr(t, 'class'),
      line: lineOf(m.index) });
  }

  const textRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  while ((m = textRe.exec(body))) {
    if (inDefs(m.index)) continue;
    const tag = '<text ' + m[1] + '>';
    const content = decodeEntities(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    const x = numAttr(tag, 'x'), y = numAttr(tag, 'y');
    if (x === null || y === null) continue;
    texts.push({ x, y, fontSize: numAttr(tag, 'font-size') ?? 8,
      anchor: strAttr(tag, 'text-anchor') || 'start', family: strAttr(tag, 'font-family') || '',
      weight: strAttr(tag, 'font-weight') || '', letterSpacing: strAttr(tag, 'letter-spacing') || '',
      fill: strAttr(tag, 'fill') || '', opacity: strAttr(tag, 'opacity'), cls: strAttr(tag, 'class'),
      content, line: lineOf(m.index) });
  }

  const lineRe = /<line\b[^>]*?\/?>/g;
  while ((m = lineRe.exec(body))) {
    if (inDefs(m.index)) continue;
    const t = m[0];
    const o = { x1: numAttr(t, 'x1'), y1: numAttr(t, 'y1'), x2: numAttr(t, 'x2'), y2: numAttr(t, 'y2'),
      stroke: strAttr(t, 'stroke'), strokeWidth: numAttr(t, 'stroke-width'),
      markerEnd: strAttr(t, 'marker-end'), markerStart: strAttr(t, 'marker-start'),
      dash: strAttr(t, 'stroke-dasharray'), opacity: strAttr(t, 'opacity'), cls: strAttr(t, 'class'),
      line: lineOf(m.index), raw: t.replace(/\s+/g, ' ').slice(0, 190) };
    if ([o.x1, o.y1, o.x2, o.y2].some((v) => v === null)) continue;
    lineEls.push(o);
  }

  const polyRe = /<polyline\b[^>]*?\/?>/g;
  while ((m = polyRe.exec(body))) {
    if (inDefs(m.index)) continue;
    const t = m[0];
    polylines.push({ pts: (strAttr(t, 'points') || '').trim().split(/\s+/).map((p) => p.split(',').map(Number)),
      stroke: strAttr(t, 'stroke'), markerEnd: strAttr(t, 'marker-end'), dash: strAttr(t, 'stroke-dasharray'),
      line: lineOf(m.index), raw: t.replace(/\s+/g, ' ').slice(0, 190) });
  }

  const circRe = /<circle\b[^>]*?\/?>/g;
  while ((m = circRe.exec(body))) {
    if (inDefs(m.index)) continue;
    const t = m[0];
    circles.push({ cx: numAttr(t, 'cx'), cy: numAttr(t, 'cy'), r: numAttr(t, 'r'),
      stroke: strAttr(t, 'stroke'), fill: strAttr(t, 'fill'), line: lineOf(m.index) });
  }

  return { rects, texts, lineEls, polylines, circles };
}

const MARKER_COLOUR = {
  'ah-success': '#0d9488', 'ah-success-sm': '#0d9488', 'ah-ember': '#e05c18', 'ah-ember-rev': '#e05c18',
  'ah-ember-sm': '#e05c18', 'ah-ember-sm-rev': '#e05c18', 'ah-sand': '#c4b89e', 'ah-sand-rev': '#c4b89e',
  'ah-error': '#ef4444', 'ah-docs': '#38bdf8', 'ah-docs-rev': '#38bdf8', 'cp-sync-end': '#e05c18',
  'cp-sync-start': '#e05c18', 'orch-rt-end': '#e05c18',
};

function analyze(block, file) {
  const els = parseBlock(block);
  const [vbx, vby, vbw, vbh] = (block.viewBox || '0 0 0 0').split(/\s+/).map(Number);
  const F = [];
  const add = (kind, line, detail, extra = {}) => F.push({ kind, line, detail, ...extra });

  // ---- classify rects ----
  const groups = new Map();
  for (const r of els.rects) {
    const k = `${r.x},${r.y},${r.w},${r.h}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const uniq = [...groups.values()].map((g) => ({
    ...g[0], layers: g.length, lines: g.map((x) => x.line),
    anyFilter: g.some((x) => x.filter), anyDash: g.some((x) => x.dash),
  }));
  const chips = uniq.filter((r) => r.h <= 15);
  const panels = uniq.filter((r) => r.h > 20);

  // ---- assign each text an owner (smallest rect containing its anchor) ----
  const ownerOf = (t) => {
    const cands = uniq.filter((r) => t.x >= r.x - 1.5 && t.x <= r.x + r.w + 1.5 && t.y >= r.y - 1 && t.y <= r.y + r.h + 1.5);
    if (!cands.length) return null;
    return cands.sort((a, b) => a.w * a.h - b.w * b.h)[0];
  };
  for (const t of els.texts) {
    t.owner = ownerOf(t);
    t.ownerIsChip = !!t.owner && t.owner.h <= 15;
    t.box = textBox(t);
  }

  // ---- 1. out of viewBox ----
  for (const r of uniq) {
    if (r.x < vbx - 0.01 || r.y < vby - 0.01 || r.x + r.w > vbx + vbw + 0.01 || r.y + r.h > vby + vbh + 0.01)
      add('rect-outside-viewbox', r.line,
        `rect ${r.x},${r.y} ${r.w}x${r.h} → right=${r.x + r.w} bottom=${r.y + r.h}; viewBox "${block.viewBox}"`);
  }
  for (const t of els.texts) {
    if (t.box.left < vbx - 0.5 || t.box.right > vbx + vbw + 0.5)
      add('text-outside-viewbox', t.line,
        `"${t.content}" spans x ${t.box.left.toFixed(1)}..${t.box.right.toFixed(1)} (est), viewBox 0..${vbw}`, { estimated: true });
    if (t.y > vby + vbh + 0.5 || t.y - t.fontSize < vby - 0.5)
      add('text-vertically-outside-viewbox', t.line,
        `"${t.content}" baseline y=${t.y}, cap-top≈${(t.y - t.fontSize * 0.78).toFixed(1)}; viewBox y 0..${vbh}`);
  }
  for (const p of els.polylines)
    for (const [px, py] of p.pts)
      if (px < vbx - 0.01 || px > vbx + vbw + 0.01 || py < vby - 0.01 || py > vby + vbh + 0.01)
        add('polyline-point-outside-viewbox', p.line, `point ${px},${py} outside viewBox "${block.viewBox}"`);

  // ---- 2. centering ----
  for (const t of els.texts) {
    if (t.anchor !== 'middle' || !t.owner) continue;
    const c = t.owner.x + t.owner.w / 2;
    const d = +(t.x - c).toFixed(2);
    if (Math.abs(d) > 0.51)
      add(t.ownerIsChip ? 'chip-label-off-center' : 'panel-text-off-center', t.line,
        `"${t.content}" x=${t.x} vs ${t.ownerIsChip ? 'chip' : 'panel'} center ${c} (rect ${t.owner.x},${t.owner.y} ${t.owner.w}x${t.owner.h} @L${t.owner.line}) → off by ${d}`);
  }

  // ---- 3. text overflowing its own owner box ----
  for (const t of els.texts) {
    if (!t.owner) continue;
    const oL = t.owner.x - t.box.left, oR = t.box.right - (t.owner.x + t.owner.w);
    const pad = t.ownerIsChip ? 0.5 : 2;
    if (oL > pad || oR > pad)
      add(t.ownerIsChip ? 'chip-label-overflows-chip' : 'panel-text-overflows-panel', t.line,
        `"${t.content}" fs=${t.fontSize} est.width=${t.box.w.toFixed(1)} spans ${t.box.left.toFixed(1)}..${t.box.right.toFixed(1)}; ` +
        `owner ${t.owner.x}..${t.owner.x + t.owner.w} @L${t.owner.line}; overflow L=${oL.toFixed(1)} R=${oR.toFixed(1)}`,
        { estimated: true });
  }

  // ---- 4. real text-vs-text collisions (bbox intersection) ----
  for (let i = 0; i < els.texts.length; i++)
    for (let j = i + 1; j < els.texts.length; j++) {
      const a = els.texts[i], b = els.texts[j];
      const ox = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
      const oy = Math.min(a.box.bot, b.box.bot) - Math.max(a.box.top, b.box.top);
      if (ox > 1.5 && oy > 1) {
        // animated layers deliberately occupy the same slot (cross-faded)
        const animPair = (a.cls && b.cls) && (a.cls !== b.cls);
        add('text-text-collision', b.line,
          `"${a.content}"(L${a.line}${a.cls ? ' .' + a.cls : ''}) vs "${b.content}"(L${b.line}${b.cls ? ' .' + b.cls : ''}) overlap ${ox.toFixed(1)}x${oy.toFixed(1)}` +
          (animPair ? ' [both have classes — may be an intentional cross-fade pair]' : ''),
          { estimated: true, maybeCrossFade: animPair });
      }
    }

  // ---- 5. chip vs chip overlap ----
  for (let i = 0; i < chips.length; i++)
    for (let j = i + 1; j < chips.length; j++) {
      const a = chips[i], b = chips[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.5 && oy > 0.5)
        add('chip-overlap', a.line, `chip ${a.x},${a.y} ${a.w}x${a.h} @L${a.line} overlaps chip ${b.x},${b.y} ${b.w}x${b.h} @L${b.line} by ${ox.toFixed(1)}x${oy.toFixed(1)}`);
    }

  // ---- 6. panel vs panel overlap ----
  for (let i = 0; i < panels.length; i++)
    for (let j = i + 1; j < panels.length; j++) {
      const a = panels[i], b = panels[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0.5 && oy > 0.5) {
        const contains = a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;
        const containedBy = b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.h >= a.y + a.h;
        const outer = contains ? a : containedBy ? b : null;
        if (outer && outer.anyDash) continue; // dashed highlight band drawn behind a group — intentional
        add(outer ? 'panel-nested-in-panel' : 'panel-overlap', a.line,
          `panel ${a.x},${a.y} ${a.w}x${a.h} @L${a.line} overlaps panel ${b.x},${b.y} ${b.w}x${b.h} @L${b.line} by ${ox.toFixed(1)}x${oy.toFixed(1)}`);
      }
    }

  // ---- 7. baseline crowding, only when horizontally overlapping ----
  for (const r of panels) {
    const inside = els.texts
      .filter((t) => t.owner === r && !t.ownerIsChip)
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < inside.length; i++) {
      const p = inside[i - 1], c = inside[i];
      const hOverlap = Math.min(p.box.right, c.box.right) - Math.max(p.box.left, c.box.left) > 0;
      if (!hOverlap) continue;
      const gap = c.y - p.y;
      if (gap <= 0.01) continue;
      const prevDescender = p.y + p.fontSize * 0.22;
      const curCapTop = c.y - c.fontSize * 0.78;
      const clearance = +(curCapTop - prevDescender).toFixed(2);
      if (clearance < 0)
        add('text-ink-collision-vertical', c.line,
          `"${c.content}"(y=${c.y},fs=${c.fontSize}) cap-top ${curCapTop.toFixed(1)} sits ABOVE "${p.content}"(y=${p.y},fs=${p.fontSize}) descender ${prevDescender.toFixed(1)} — glyphs overlap by ${(-clearance).toFixed(1)}`);
      else if (clearance < 1.2)
        add('baseline-tight', c.line,
          `"${c.content}"(y=${c.y},fs=${c.fontSize}) has only ${clearance} clearance below "${p.content}"(y=${p.y},fs=${p.fontSize}) (baseline gap ${gap.toFixed(1)}) — no collision, but tighter than sibling panels`);
    }
  }

  // ---- 8. chip straddle pattern consistency (CP/ORC pairs) ----
  const chipLabel = (ch) => {
    const lbl = els.texts.find((t) => t.owner === ch);
    return lbl ? lbl.content : '?';
  };
  const straddleReport = [];
  for (const p of panels) {
    const onTop = chips.filter((ch) => Math.abs(ch.y + ch.h - p.y) < 12 && ch.x + ch.w > p.x && ch.x < p.x + p.w);
    for (const ch of onTop)
      straddleReport.push({
        panel: `${p.x},${p.y} ${p.w}x${p.h} @L${p.line}`, chip: chipLabel(ch),
        chipLine: ch.line, chipX: ch.x, chipW: ch.w,
        rightEdgeOffset: +(ch.x + ch.w - (p.x + p.w)).toFixed(2),
        topEdgeOffset: +(ch.y + ch.h - p.y).toFixed(2),
        panelRight: p.x + p.w,
      });
  }
  // CP/ORC gap uniformity
  const cpOrc = straddleReport.filter((s) => s.chip === 'CP' || s.chip === 'ORC');
  const byPanel = {};
  for (const s of cpOrc) (byPanel[s.panel] ||= []).push(s);
  for (const [panel, arr] of Object.entries(byPanel)) {
    const cp = arr.find((a) => a.chip === 'CP'), orc = arr.find((a) => a.chip === 'ORC');
    if (cp && orc) {
      const gap = +(orc.chipX - (cp.chipX + cp.chipW)).toFixed(2);
      const orcOverhang = orc.rightEdgeOffset;
      straddleReport.push({ summary: `panel ${panel}: CP→ORC gap=${gap}, ORC overhang past panel right edge=${orcOverhang}, CP top-edge straddle=${cp.topEdgeOffset}` });
    }
  }

  // ---- 9. connectors ----
  for (const l of els.lineEls) {
    const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    if (len < 2) add('degenerate-connector', l.line, `length=${len.toFixed(2)}: ${l.raw}`);
    for (const r of panels) {
      const inA = l.x1 > r.x + 0.5 && l.x1 < r.x + r.w - 0.5 && l.y1 > r.y + 0.5 && l.y1 < r.y + r.h - 0.5;
      const inB = l.x2 > r.x + 0.5 && l.x2 < r.x + r.w - 0.5 && l.y2 > r.y + 0.5 && l.y2 < r.y + r.h - 0.5;
      if (inA !== inB)
        add('connector-endpoint-inside-panel', l.line,
          `(${l.x1},${l.y1})→(${l.x2},${l.y2}): ${inA ? 'start' : 'end'} is inside panel ${r.x},${r.y} ${r.w}x${r.h} @L${r.line}`);
      if (inA && inB) {
        const touchesChip = (x, y) => chips.some((c) => x >= c.x - 4 && x <= c.x + c.w + 4 && y >= c.y - 3 && y <= c.y + c.h + 3);
        const isStepArrow = touchesChip(l.x1, l.y1) && touchesChip(l.x2, l.y2);
        if (!isStepArrow)
          add('connector-fully-inside-panel', l.line,
            `(${l.x1},${l.y1})→(${l.x2},${l.y2}) entirely inside panel @L${r.line} and not linking two chips`);
      }
    }
    const dy = Math.abs(l.y1 - l.y2), dx = Math.abs(l.x2 - l.x1);
    if (dy > 0.001 && dy < 3 && dx > 10)
      add('near-axis-connector', l.line, `almost-horizontal but off by ${dy}: (${l.x1},${l.y1})→(${l.x2},${l.y2})`);
    if (dx > 0.001 && dx < 3 && dy > 10)
      add('near-axis-connector', l.line, `almost-vertical but off by ${dx}: (${l.x1},${l.y1})→(${l.x2},${l.y2})`);
  }

  // ---- 10. marker colour vs stroke ----
  const chk = (el, ref, which) => {
    if (!ref) return;
    const id = (ref.match(/#([^)]+)\)/) || [])[1];
    if (!id || !MARKER_COLOUR[id]) return;
    const got = (el.stroke || '').toLowerCase();
    if (got.startsWith('#') && got !== MARKER_COLOUR[id])
      add('marker-stroke-colour-mismatch', el.line,
        `${which}="${id}" draws a ${MARKER_COLOUR[id]} arrowhead on a stroke="${el.stroke}" line`);
  };
  for (const l of els.lineEls) { chk(l, l.markerEnd, 'marker-end'); chk(l, l.markerStart, 'marker-start'); }
  for (const p of els.polylines) chk(p, p.markerEnd, 'marker-end');

  // ---- 11. row rhythm: gaps between panels sharing a row ----
  const rows = [];
  for (const p of [...panels].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let row = rows.find((r) => Math.abs(r[0].y - p.y) < 6 && Math.abs(r[0].h - p.h) < 40);
    if (!row) rows.push([p]); else row.push(p);
  }
  const rowInfo = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const sorted = [...row].sort((a, b) => a.x - b.x);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(+(sorted[i].x - (sorted[i - 1].x + sorted[i - 1].w)).toFixed(2));
    const widths = sorted.map((p) => p.w);
    const heights = sorted.map((p) => p.h);
    const uniqGaps = [...new Set(gaps)];
    rowInfo.push({ y: sorted[0].y, lines: sorted.map((p) => p.line), xs: sorted.map((p) => p.x), widths, heights, gaps,
      leftMargin: sorted[0].x - vbx, rightMargin: vbx + vbw - (sorted.at(-1).x + sorted.at(-1).w) });
    if (uniqGaps.length > 1)
      add('uneven-row-gaps', sorted[0].line,
        `row at y=${sorted[0].y} (panels @L${sorted.map((p) => p.line).join(',')}) has unequal inter-panel gaps: [${gaps.join(', ')}]`);
    if (heights.some((h) => h !== heights[0]))
      add('uneven-row-heights', sorted[0].line,
        `row at y=${sorted[0].y} (panels @L${sorted.map((p) => p.line).join(',')}) mixes heights: [${heights.join(', ')}]`);
    const lm = +(sorted[0].x - vbx).toFixed(2);
    const rm = +(vbx + vbw - (sorted.at(-1).x + sorted.at(-1).w)).toFixed(2);
    if (Math.abs(lm - rm) > 1)
      add('asymmetric-row-margins', sorted[0].line,
        `row at y=${sorted[0].y}: left margin ${lm} vs right margin ${rm} (viewBox width ${vbw}) — row is not optically centred`);
  }

  // ---- 12. straddle-overhang consistency vs the modal pattern in this diagram ----
  const overhangs = straddleReport.filter((s) => !s.summary && (s.chip === 'CP' || s.chip === 'ORC'));
  const modeOf = (arr) => {
    const c = {};
    for (const v of arr) c[v] = (c[v] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  };
  for (const chipName of ['CP', 'ORC']) {
    const set = overhangs.filter((s) => s.chip === chipName);
    if (set.length < 3) continue;
    const [modal, count] = modeOf(set.map((s) => s.rightEdgeOffset));
    if (count < 2) continue;
    for (const s of set)
      if (String(s.rightEdgeOffset) !== modal)
        add('chip-straddle-inconsistent', s.chipLine,
          `${chipName} chip on panel ${s.panel} overhangs the panel right edge by ${s.rightEdgeOffset}, but ${count}/${set.length} ${chipName} chips in this diagram overhang by ${modal} — badge alignment is inconsistent`);
  }

  return {
    file, block: { line: block.line, viewBox: block.viewBox, cls: block.cls, ariaLabel: block.ariaLabel },
    counts: { rects: uniq.length, panels: panels.length, chips: chips.length, texts: els.texts.length,
      lines: els.lineEls.length, polylines: els.polylines.length, circles: els.circles.length },
    findings: F, rowInfo, straddleReport,
    panels: panels.map((p) => ({ line: p.line, x: p.x, y: p.y, w: p.w, h: p.h, stroke: p.stroke, filter: p.anyFilter })),
  };
}

const all = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const b of findSvgBlocks(src)) all.push(analyze(b, f));
}

let out = '';
const kindTotals = {};
for (const r of all) {
  out += `${'='.repeat(90)}\n${r.file}  SVG @ line ${r.block.line}   viewBox="${r.block.viewBox}"  class=${r.block.cls || '-'}\n`;
  if (r.block.ariaLabel) out += `   aria: ${r.block.ariaLabel.slice(0, 130)}\n`;
  out += `   counts: ${JSON.stringify(r.counts)}\n`;
  out += `   panels: ${r.panels.map((p) => `L${p.line}[${p.x},${p.y} ${p.w}x${p.h}]`).join(' ')}\n`;
  for (const ri of r.rowInfo)
    out += `   row y=${ri.y}: xs=[${ri.xs}] w=[${ri.widths}] h=[${ri.heights}] gaps=[${ri.gaps}] margins L=${ri.leftMargin} R=${ri.rightMargin}\n`;
  for (const s of r.straddleReport.filter((s) => s.summary)) out += `   straddle: ${s.summary}\n`;
  const byKind = {};
  for (const f of r.findings) { (byKind[f.kind] ||= []).push(f); kindTotals[f.kind] = (kindTotals[f.kind] || 0) + 1; }
  out += `   FINDINGS: ${r.findings.length}\n`;
  for (const [k, fs_] of Object.entries(byKind)) {
    out += `   --- ${k} (${fs_.length})\n`;
    for (const f of fs_) out += `       L${f.line}: ${f.detail}${f.estimated ? '  [width-estimated]' : ''}\n`;
  }
}
out += `\n${'='.repeat(90)}\nTOTAL: ${Object.values(kindTotals).reduce((a, b) => a + b, 0)}\nBY KIND: ${JSON.stringify(kindTotals, null, 2)}\n`;
console.log(out);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 2));
