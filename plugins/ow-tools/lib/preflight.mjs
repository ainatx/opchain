// Export preflight (design §5.2): read the Markdown an ow- skill wrote, take
// out what never goes to a client, and refuse structure that would export
// inaccessibly. Pure apart from the image-exists check. Lines are blanked, not
// deleted, so every message keeps the source line number.
import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const INTERNAL_START = /^\s*<!--\s*ow:internal\s*-->\s*$/;
const INTERNAL_END = /^\s*<!--\s*ow:end-internal\s*-->\s*$/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const ATX = /^\s{0,3}(#{1,6})(?:\s+(.*?))?\s*#*\s*$/;
const SETEXT = /^\s{0,3}(=+|-+)\s*$/;
const DELIM = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const BAD_LINK_TEXT = /^(here|click here|link|this link|read more|more)$/i;
const URLISH = /^(https?:\/\/|www\.)\S+$/i;

const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

const plain = (s) => s.replace(/[*_`]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();

export function preflight(text, mdPath) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const problems = [];
  const bad = (i, msg) => problems.push(`line ${i + 1}: ${msg}`);
  let banner = null;

  // Banner + R3 artefact header (only at the very top).
  if (/^ow_artefact:/.test(lines[0] || "")) lines[0] = "";
  else if (/^ow_artefact:/.test(lines[1] || "") && (lines[0] || "").trim()) {
    banner = lines[0].trim();
    lines[0] = "";
    lines[1] = "";
  }

  // Internal sections.
  const removed = [];
  let open = -1;
  lines.forEach((l, i) => {
    if (INTERNAL_START.test(l)) {
      if (open >= 0) bad(i, "an ow:internal section opens inside another one");
      open = i;
      lines[i] = "";
    } else if (INTERNAL_END.test(l)) {
      if (open < 0) bad(i, "ow:end-internal without an opening ow:internal");
      open = -1;
      lines[i] = "";
    } else if (open >= 0) {
      if (l.trim()) removed.push(l.trim());
      lines[i] = "";
    }
  });
  if (open >= 0) bad(open, "ow:internal section never closed with <!-- ow:end-internal -->");

  // Structure checks, outside fenced code.
  const headings = [];
  const images = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const f = FENCE.exec(l);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (f) {
      fence = f[1];
      continue;
    }
    if (/^ow_artefact:/.test(l)) bad(i, "an artefact header line is only allowed at the top");
    if (/ow:(end-)?internal/.test(l)) bad(i, "stray ow:internal marker");

    const atx = ATX.exec(l);
    const prev = i > 0 ? lines[i - 1] : "";
    if (atx) headings.push({ i, level: atx[1].length, text: plain(atx[2] || "") });
    else if (SETEXT.exec(l) && prev.trim() && !/^\s*([#|>*+-]|\d+[.)])/.test(prev) && !DELIM.test(l) && !l.includes("|")) {
      headings.push({ i: i - 1, level: l.trim()[0] === "=" ? 1 : 2, text: plain(prev) });
    }

    if (/<[A-Za-z!/]/.test(l.replace(/`[^`]*`/g, "")) && !/^\s*<!--.*-->\s*$/.test(l)) {
      if (/<https?:\/\//i.test(l)) bad(i, "a bare URL as link text; write [what it is](url)");
      else bad(i, "raw HTML is not exported; use Markdown");
    }
    for (const m of l.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const [, alt, src] = m;
      if (!alt.trim()) bad(i, `image ${src} has no alt text`);
      if (/^[a-z]+:\/\//i.test(src)) bad(i, `image ${src} is remote; exports use local files only`);
      else images.push({ i, src, alt });
    }
    if (/!\[[^\]]*\]\[[^\]]*\]/.test(l)) bad(i, "reference-style images are not supported; use ![alt](file)");
    for (const m of l.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
      const [, t, href] = m;
      const txt = plain(t);
      if (BAD_LINK_TEXT.test(txt)) bad(i, `link text "${txt}" doesn't say where it goes`);
      else if (URLISH.test(txt) || txt === href.trim()) bad(i, "a bare URL as link text; write [what it is](url)");
    }
    if (DELIM.test(l) && l.includes("-") && i > 0 && prev.includes("|")) {
      const head = cells(prev);
      if (head.some((c) => !c)) bad(i - 1, "a table header cell is empty; every column needs a header");
      if (cells(l).length !== head.length) bad(i, "the table delimiter row doesn't match the header's columns");
    }
  }

  const h1 = headings.filter((h) => h.level === 1);
  if (h1.length === 0) problems.push("the document needs exactly one level-1 heading (# Title); found none");
  if (h1.length > 1) bad(h1[1].i, "a second level-1 heading; the document needs exactly one");
  for (let k = 1; k < headings.length; k++) {
    if (headings[k].level > headings[k - 1].level + 1) {
      bad(headings[k].i, `heading level jumps from ${headings[k - 1].level} to ${headings[k].level}`);
    }
  }
  if (headings.length && headings[0].level !== 1) bad(headings[0].i, "the first heading must be the level-1 title");

  const base = dirname(resolve(mdPath));
  for (const img of images) {
    if (isAbsolute(img.src)) bad(img.i, `image ${img.src} uses an absolute path; use a path relative to the document`);
    else if (!existsSync(resolve(base, decodeURI(img.src)))) bad(img.i, `image not found: ${img.src}`);
  }

  const body = lines.join("\n").replace(/^\n+/, "");
  for (const r of removed) {
    if (r.length > 3 && body.includes(r)) problems.push(`internal text also appears outside the internal section: "${r.slice(0, 40)}"`);
  }
  return {
    ok: problems.length === 0,
    problems,
    title: h1[0]?.text || null,
    banner,
    body,
    images,
    removedSections: removed.length ? (text.match(/<!--\s*ow:internal\s*-->/g) || []).length : 0,
  };
}
