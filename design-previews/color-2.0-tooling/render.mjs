// render.mjs — screenshot every set × page × mode of the preview to PNG.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire("/Users/aidanelsesser/repos/opchain/site/package.json");
const { chromium } = require("playwright-core");

const HTML = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const only = process.argv[4]; // optional "set:page:mode" filter, e.g. "3:home:light" or "all"
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("file://" + HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(800); // fonts
// collapse the token strip so screenshots are mostly the site
await page.evaluate(() => { const b = document.querySelector("[data-info-toggle]"); if (b.getAttribute("aria-expanded") === "true") b.click(); });

const pages = ["home", "changelog", "skill"];
const modes = ["dark", "light"];
let n = 0;
const NSETS = await page.evaluate(() => document.querySelectorAll("[data-set-btn]").length);
for (let set = 1; set <= NSETS; set++) {
  for (const mode of modes) {
    for (const pg of pages) {
      if (only && only !== "all" && only !== `${set}:${pg}:${mode}`) continue;
      await page.evaluate(([s, m, p]) => {
        document.querySelector(`[data-set-btn="${s}"]`).click();
        document.querySelector(`[data-mode-btn="${m}"]`).click();
        document.querySelector(`[data-page-btn="${p}"]`).click();
        if (p === "changelog") document.querySelector('[data-tab="released"]').click();
        window.scrollTo(0, 0);
      }, [set, mode, pg]);
      await page.waitForTimeout(120);
      const file = path.join(OUT, `set${String(set).padStart(2, "0")}-${pg}-${mode}.png`);
      await page.screenshot({ path: file, fullPage: true });
      n++;
      if (pg === "changelog") {
        for (const tab of ["coming", "planned"]) {
          await page.evaluate((t) => { document.querySelector(`[data-tab="${t}"]`).click(); window.scrollTo(0, 0); }, tab);
          await page.waitForTimeout(80);
          await page.screenshot({ path: path.join(OUT, `set${String(set).padStart(2, "0")}-changelog-${tab}-${mode}.png`), fullPage: true });
          n++;
        }
      }
    }
  }
}
// overview grids
for (const mode of modes) {
  await page.evaluate((m) => { document.querySelector(`[data-mode-btn="${m}"]`).click(); document.querySelector('[data-page-btn="all"]').click(); window.scrollTo(0, 0); }, mode);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, `overview-${mode}.png`), fullPage: true });
  n++;
}
await browser.close();
console.log(`rendered ${n} screenshots → ${OUT}`);
