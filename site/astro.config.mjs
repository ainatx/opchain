// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { rehypeTaskListLabels } from "./src/lib/rehype-task-list-labels.mjs";

// Sprint 6 — the cutover. Static output; the Worker at src/index.js handles
// /api/* and serves the Astro build as static assets via the ASSETS binding.
// Keeping the build static means no cold-start latency on page views and
// lets Cloudflare cache everything at the edge.
export default defineConfig({
  site: "https://opchain.dev",
  // Dev-server port. Astro does not read $PORT on its own, so honour it here:
  // several git worktrees of this repo run `astro dev` side by side, and the
  // preview harness assigns a free port via $PORT to avoid collisions.
  // Build output is unaffected — `server` only applies to `astro dev`.
  server: { port: Number(process.env.PORT) || 4321 },
  output: "static",
  trailingSlash: "never",
  integrations: [sitemap()],
  markdown: {
    // Astro 7 defaults to the Sätteri markdown processor, which doesn't
    // support remark/rehype plugins. rehypeTaskListLabels is a plain
    // unified/HAST plugin, so we opt back into the unified() pipeline
    // (still officially supported through Astro 8) instead of porting it
    // to a Sätteri-native plugin.
    processor: unified({
      // GFM task-list checkboxes (`- [ ] item`) render as bare disabled
      // <input type="checkbox"> elements; this plugin gives them an
      // aria-label so axe's `label` rule passes. See B-11 in
      // roadmap/05-post-sprint-7-backlog.md.
      rehypePlugins: [rehypeTaskListLabels],
    }),
    // Shiki dual-theme (ADEV-340): Astro's default github-dark has known
    // low-contrast tokens (comments fail WCAG AA on the dark page bg).
    // github-dark-default is the GitHub-published refresh that bumps every
    // token to AA-compliant ratios. Pair with github-light for the light
    // theme. Astro emits CSS variables and Shiki's runtime switches on
    // data-theme via the .astro-code .astro-code-themes CSS hook.
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-default",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
