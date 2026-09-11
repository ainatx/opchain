/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;

type Runtime = import("@astrojs/cloudflare").Runtime<{
  DATA: KVNamespace;
  LINEAR_API_KEY?: string;
  ROADMAP_GITHUB_TOKEN?: string;
  MCP_SESSION_SIGNING_KEY?: string;
  POSTHOG_PROJECT_API_KEY?: string;
  POSTHOG_HOST?: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
