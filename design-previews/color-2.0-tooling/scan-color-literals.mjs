#!/usr/bin/env node
/**
 * Mechanical cross-check for the 2.0 colour migration surface.
 *
 *   node design-previews/color-2.0-tooling/scan-color-literals.mjs
 *
 * This does NOT regenerate MIGRATION-SURFACE.md. That catalogue is hand-built
 * and adversarially verified, and it is the authority — it knows things a regex
 * cannot, such as which literals are deliberate and what each one should become.
 * This script exists for the one thing a hand-built catalogue cannot do: tell you,
 * cheaply and at any moment, whether the tree has moved underneath it.
 *
 * It finds every colour literal under site/src that is not in the token layer,
 * classifies it by context (CSS block, inline style attribute, SVG fill/stroke,
 * script, frontmatter), and cross-references it against the current values in
 * site/src/styles/tokens.css.
 *
 * Read the output with one caveat in mind, learned the hard way: a literal that
 * MATCHES a token value is not automatically a bypass. It may be a documented
 * `var(--token, #fallback)` fallback, or a hex quoted inside a comment. In one
 * sample of 57 matches, only 22 were real and 5 of those were false positives
 * where the scanner had matched an rgba() nested inside a box-shadow token.
 * Treat every count here as a set to inspect, never a worklist to execute.
 *
 * Run from the repo root. Set S=<dir> to also dump scan.json for further slicing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "site/src";
const TOKENS = "site/src/styles/tokens.css";

// ── what the token layer currently resolves to (both themes live in this file)
const tk = fs.readFileSync(TOKENS, "utf8");
const tokenVals = new Map(); // literal -> [token names]
for (const m of tk.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  const name = m[1];
  for (const lit of m[2].matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) {
    const k = lit[0].toLowerCase().replace(/\s+/g, "");
    if (!tokenVals.has(k)) tokenVals.set(k, []);
    if (!tokenVals.get(k).includes(name)) tokenVals.get(k).push(name);
  }
}

// ── walk site/src
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(astro|ts|css|mjs|js)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const LIT = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;
const rows = [];
for (const f of files) {
  if (f === TOKENS) continue; // the token layer itself is what gets swapped
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(LIT)) {
      const before = line.slice(0, m.index);
      let ctx = "css";
      if (/style\s*=\s*["'][^"']*$/.test(before)) ctx = "inline-style";
      else if (/\b(fill|stroke|stop-color|flood-color)\s*=\s*"[^"]*$/.test(before)) ctx = "svg-attr";
      else if (/\.(ts|mjs|js)$/.test(f)) ctx = "script";
      else if (/^\s*(const|let|var|.*:)\s/.test(line) && /\.astro$/.test(f) && i < 60) ctx = "frontmatter";
      const low = m[0].toLowerCase().replace(/\s+/g, "");
      rows.push({ file: f, line: i + 1, lit: m[0], low, ctx, shadows: tokenVals.get(low) || null });
    }
  });
}

// ── report
const byFile = new Map();
for (const r of rows) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}
console.log(`TOTAL colour literals outside the token layer: ${rows.length} across ${byFile.size} files\n`);
console.log("FILE".padEnd(52) + "COUNT  DISTINCT  SHADOWS-A-TOKEN");
for (const [f, rs] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(
    f.replace("site/src/", "").padEnd(52) +
      String(rs.length).padStart(5) +
      String(new Set(rs.map((r) => r.low)).size).padStart(10) +
      String(rs.filter((r) => r.shadows).length).padStart(17),
  );
}
const byCtx = {};
for (const r of rows) byCtx[r.ctx] = (byCtx[r.ctx] || 0) + 1;
console.log("\nBY CONTEXT:", JSON.stringify(byCtx));

const shadowRows = rows.filter((r) => r.shadows);
console.log(`\nSHADOWS (literal equals a current token value → will drift when tokens.css swaps): ${shadowRows.length}`);
const byLit = new Map();
for (const r of shadowRows) {
  const k = `${r.low} = ${r.shadows.join(", ")}`;
  byLit.set(k, (byLit.get(k) || 0) + 1);
}
for (const [k, c] of [...byLit.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(c).padStart(4)}x  ${k}`);
}

if (process.env.S) {
  fs.writeFileSync(process.env.S + "/scan.json", JSON.stringify({ rows, tokenVals: [...tokenVals] }, null, 1));
}
