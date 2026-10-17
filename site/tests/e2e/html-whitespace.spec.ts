import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Guards the built HTML against words running into inline elements.
//
// Astro 7's default `compressHTML: 'jsx'` deletes a line break between a
// word and an inline tag instead of collapsing it to a space, so copy like
//
//     Email
//     <a href="mailto:privacy@opchain.dev">privacy@opchain.dev</a>
//
// shipped as "Emailprivacy@opchain.dev" on ~90 boundaries after the Astro 7
// migration (#444). astro.config.mjs sets `compressHTML: true` to get the
// lossless Astro <=6 behaviour back. If that setting is dropped, or a future
// Astro changes what `true` means, this scan of dist/ fails.
//
// It reads files only (no page fixture), so no browser launches. dist/ is
// always fresh here: `pretest:e2e` runs `astro build` first.

const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

const INLINE = "a|code|strong|em";
// A word character directly followed by an inline opening tag, or an inline
// closing tag directly followed by a word character.
const RUNS = [new RegExp(`\\w<(?:${INLINE})\\b`, "g"), new RegExp(`</(?:${INLINE})>\\w`, "g")];

// Elements whose contents are not prose (code samples keep their own spacing).
const NOT_PROSE = /<(script|style|pre|textarea|template|svg)\b[\s\S]*?<\/\1>/gi;

// Joins the source writes on purpose. `head` is the text up to and including
// the hit, with tag attributes stripped; `next` is the character after it.
const INTENTIONAL: { why: string; ok: (head: string, next: string) => boolean }[] = [
  {
    why: "STRIDE initials bolded inside the word (**S**poofing, oc-security-auditor)",
    ok: (head) => /<strong>[A-Z]<\/strong>[a-z]$/.test(head),
  },
  {
    why: "plural of a code identifier (`price_id`s, stripe-ship walkthrough)",
    ok: (head, next) => /<\/code>s$/.test(head) && !/\w/.test(next),
  },
];

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function runTogether(html: string): string[] {
  const text = html.replace(NOT_PROSE, " ").replace(/<(\/?[a-z][\w-]*)\b[^>]*>/gi, "<$1>");
  const hits: string[] = [];
  for (const re of RUNS) {
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      const head = text.slice(Math.max(0, at - 40), end);
      if (INTENTIONAL.some(({ ok }) => ok(head, text.charAt(end)))) continue;
      hits.push(text.slice(Math.max(0, at - 40), end + 30).replace(/\s+/g, " "));
    }
  }
  return hits;
}

test("built pages keep the space between words and inline elements", () => {
  const files = htmlFiles(DIST);
  expect(files.length, `no HTML under ${DIST}; run astro build`).toBeGreaterThan(50);

  const hits = files.flatMap((file) =>
    runTogether(readFileSync(file, "utf8")).map((ctx) => `${relative(DIST, file)}: …${ctx}…`),
  );
  expect(
    hits,
    "words run into an inline element. Check compressHTML in astro.config.mjs; " +
      "for a join the source means, add it to INTENTIONAL with a reason",
  ).toEqual([]);
});
