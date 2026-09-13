// Per-scenario artifact bundle for the /demo output-modal lightbox.
//
// Every walkthrough's `outputs[]` bodies used to be pre-rendered and inlined
// into demo.astro's own HTML (`.artifact-store`) — ~480KB of the page's
// ~1.4MB, for content most visitors never open (an output row only matters
// once someone clicks it). As the scenario corpus grew, that stopped being
// a reasonable trade against /demo's Lighthouse performance budget (see
// lighthouserc.cjs — /demo already sits at the thinnest margin on the site).
//
// This route pre-renders each scenario's outputs into its own static JSON
// file at build time (`output: "static"` in astro.config.mjs prerenders
// every path getStaticPaths() returns), and demo.astro's lightbox script
// fetches + caches one of these the first time a viewer opens any output
// row belonging to that scenario. Twelve small files fetched on demand
// instead of one big blob shipped to everyone.
import type { APIRoute, GetStaticPaths } from "astro";
import { walkthroughs } from "../../data/walkthroughs";
import { renderSafeMarkdown } from "../../lib/markdown";

export const getStaticPaths: GetStaticPaths = () =>
  walkthroughs.map((w) => ({ params: { scenario: w.id } }));

export const GET: APIRoute = ({ params }) => {
  const walkthrough = walkthroughs.find((w) => w.id === params.scenario);
  if (!walkthrough) {
    return new Response(JSON.stringify({}), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const bundle: Record<string, { label: string; kind: string; html: string }> = {};
  for (const output of walkthrough.outputs) {
    bundle[output.id] = {
      label: output.label,
      kind: output.kind ?? "",
      html: renderSafeMarkdown(output.body),
    };
  }

  return new Response(JSON.stringify(bundle), {
    headers: { "content-type": "application/json" },
  });
};
