// `ow-tools export` (design §5.2): Markdown → branded, accessible PDF + Word.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { PLUGIN_ROOT, failed, isFile, missing, oneLine, refused, run, sha256File, usage, which } from "./core.mjs";
import { loadBrand } from "./brand.mjs";
import { brandDocx } from "./docx.mjs";
import { withTempDir } from "./guards.mjs";
import { preflight } from "./preflight.mjs";

export const NOT_CONFORMANCE =
  "Structure checked in the source this tool generated; this is not a conformance test. Run your organisation's accessibility checker on the exported file.";
export const HASH_NOTE = "The SHA-256 detects accidental change only; it is not tamper-evidence.";
const FORMATS = ["pdf", "docx"];
const PANDOC_FROM = "gfm-autolink_bare_uris";

export const typstString = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export function brandTyp(brand, { title, banner, logoFile }) {
  const [lang, region] = brand.lang.split("-");
  const fonts = (f) => `(${[f, brand.fonts.body, "Libertinus Serif"].filter(Boolean).map(typstString).join(", ")},)`;
  return `#let brand = (
  title: ${typstString(title)},
  author: ${brand.name ? typstString(brand.name) : "()"},
  name: ${typstString(brand.name || "")},
  banner: ${banner ? typstString(banner) : "none"},
  footer: ${typstString(brand.footer || "")},
  logo: ${logoFile ? typstString(logoFile) : "none"},
  logo-alt: ${typstString(brand.logo_alt || "")},
  text: rgb(${typstString(brand.colors.text)}),
  background: rgb(${typstString(brand.colors.background)}),
  primary: rgb(${typstString(brand.colors.primary)}),
  accent: rgb(${typstString(brand.colors.accent)}),
  header-text: rgb(${typstString(brand.headerText)}),
  link: rgb(${typstString(brand.link)}),
  rule: rgb("#9A9A9A"),
  body-fonts: ${fonts(brand.fonts.body)},
  heading-fonts: ${fonts(brand.fonts.heading)},
  lang: ${typstString(lang)},
  region: ${region ? typstString(region) : "none"},
  paper: ${typstString(brand.page === "a4" ? "a4" : "us-letter")},
)
`;
}

function availableFonts() {
  const r = run("typst", ["fonts"]);
  return new Set(r.stdout.split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean));
}

export function exportRequirements(formats) {
  const need = ["pandoc"];
  if (formats.includes("pdf")) need.push("typst");
  if (formats.includes("docx")) need.push("zip", "unzip");
  return need.filter((c) => !which(c));
}

export async function exportDoc({ file, brand: brandPath, out, formats = FORMATS }) {
  if (!file) throw usage("usage: ow-tools export <file.md> [--brand brand.yaml] [--out DIR] [--formats pdf,docx]");
  const src = resolve(file);
  if (!isFile(src) || extname(src) !== ".md") throw usage(`give a Markdown (.md) file; got ${file}`);
  const fmts = [...new Set(formats)];
  if (!fmts.length || fmts.some((f) => !FORMATS.includes(f))) throw usage("--formats takes pdf, docx or pdf,docx");

  const text = readFileSync(src, "utf8");
  const pre = preflight(text, src);
  if (!pre.ok) throw refused(`not exported; fix these in ${basename(src)} first:\n  ${pre.problems.join("\n  ")}`, { problems: pre.problems });
  const { brand, path: brandFile } = loadBrand(src, brandPath);

  const need = exportRequirements(fmts);
  if (need.length) throw missing(`export needs: ${need.join(", ")}. Run ow-tools doctor for the exact steps.`, { missing: need });

  const outDir = resolve(out ?? join(dirname(src), "export"));
  mkdirSync(outDir, { recursive: true });
  const name = basename(src, ".md");
  const outputs = {};
  const notes = [];

  await withTempDir(async (tmp) => {
    // Copy images in under neutral names so nothing outside the temp folder
    // is reachable from Typst (--root) and paths can't escape.
    let body = pre.body;
    mkdirSync(join(tmp, "assets"));
    pre.images.forEach((img, n) => {
      const local = `assets/img-${n}${extname(img.src) || ".png"}`;
      copyFileSync(resolve(dirname(src), decodeURI(img.src)), join(tmp, local));
      body = body.split(`](${img.src}`).join(`](${local}`);
    });
    writeFileSync(join(tmp, "doc.md"), body);

    if (fmts.includes("pdf")) {
      let r = run("pandoc", [join(tmp, "doc.md"), "-f", PANDOC_FROM, "-t", "typst", "-o", join(tmp, "body.typ")], { cwd: tmp });
      if (r.status !== 0) throw failed(`pandoc (Typst) failed: ${oneLine(r.stderr)}`);
      // pandoc centres every table; body text reads better left-aligned
      // (right-aligned number columns keep their own alignment).
      const typBody = readFileSync(join(tmp, "body.typ"), "utf8").replace(/align\(center\)\[#table\(/g, "align(left)[#table(");
      writeFileSync(join(tmp, "body.typ"), typBody);
      let logoFile = null;
      if (brand.logoPath) {
        logoFile = "assets/logo.png";
        copyFileSync(brand.logoPath, join(tmp, logoFile));
      }
      writeFileSync(join(tmp, "brand.typ"), brandTyp(brand, { title: pre.title, banner: pre.banner, logoFile }));
      copyFileSync(join(PLUGIN_ROOT, "templates", "ow.typ"), join(tmp, "main.typ"));
      const fonts = availableFonts();
      for (const f of [brand.fonts.body, brand.fonts.heading].filter(Boolean)) {
        if (!fonts.has(f.toLowerCase())) notes.push(`font "${f}" is not installed; the PDF uses a fallback font`);
      }
      const pdf = join(outDir, `${name}.pdf`);
      r = run("typst", ["compile", "--root", tmp, "--pdf-standard", "ua-1", join(tmp, "main.typ"), pdf]);
      if (r.status !== 0) throw failed(`typst could not build an accessible PDF: ${oneLine(r.stderr)}`);
      outputs.pdf = pdf;
    }

    if (fmts.includes("docx")) {
      const docx = join(outDir, `${name}.docx`);
      const r = run("pandoc", [join(tmp, "doc.md"), "-f", PANDOC_FROM, "-t", "docx", "-M", `lang=${brand.lang}`, "--resource-path", tmp, "-o", docx], { cwd: tmp });
      if (r.status !== 0) throw failed(`pandoc (Word) failed: ${oneLine(r.stderr)}`);
      brandDocx(docx, brand, { title: pre.title, banner: pre.banner, workDir: tmp });
      outputs.docx = docx;
      if (brand.fonts.body || brand.fonts.heading) notes.push("Word shows a substitute font on machines without the brand fonts");
    }
  });

  return {
    status: "done",
    title: pre.title,
    outputs,
    sha256: { source: sha256File(src), ...(outputs.pdf ? { pdf: sha256File(outputs.pdf) } : {}) },
    brand: brandFile ? brandFile : "none found; neutral styling",
    contrast: brand.ratios,
    removed_internal_sections: pre.removedSections,
    banner: Boolean(pre.banner),
    notes,
    checked: [
      "one level-1 heading, no skipped levels",
      "alt text on every image",
      "a header row on every table",
      "link text that says where it goes",
      "internal sections removed",
      `brand contrast (text ${brand.ratios.text_on_background}:1, headings ${brand.ratios.headings_on_background}:1, table header ${brand.ratios.table_header}:1)`,
      ...(outputs.pdf ? ["PDF built in Typst's PDF/UA-1 mode (tagged, title and language set)"] : []),
    ],
    statement: NOT_CONFORMANCE,
    hash_note: HASH_NOTE,
  };
}
