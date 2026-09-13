#!/usr/bin/env node
/**
 * Static preview server for Lighthouse CI.
 *
 * `astro preview` serves site/dist faithfully but knows nothing about the
 * Worker routes that sit in front of the static assets in production. The
 * Header's live-version chip fetches /api/health on every page load, so under
 * `astro preview` every LHCI page logged a 404 to the console and Lighthouse's
 * weight-1 `errors-in-console` audit failed: Best Practices sat at 0.96 on all
 * seven routes, one hundredth above the 0.95 gate, from a request that never
 * fails in production.
 *
 * This server serves the same static build and answers the one Worker route
 * the pages hit on load. It is NOT a Worker emulator. Every other /api/* path
 * still 404s exactly as the static preview did, so a new client-side fetch to
 * a route this server does not know about shows up in LHCI as the console
 * error it would be under `astro preview`. Extend ROUTES deliberately.
 *
 * Route resolution mirrors the Astro build (`output: "static"`,
 * `trailingSlash: "never"`, directory format): `/skills` serves
 * `dist/skills/index.html` without a redirect, `/` serves `dist/index.html`,
 * and an unknown path serves `dist/404.html` with a 404 status. Text responses
 * above 1 KiB are gzipped when the client accepts it, exactly as Vite's
 * preview does, so Lighthouse's transfer-size-based throttling sees the same
 * bytes it always did.
 *
 * Usage (from site/, matching lighthouserc.cjs):
 *   node ../scripts/lhci-preview.mjs --dir dist --host 127.0.0.1 --port 4321
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";

// Lighthouse's simulated throttling prices a page by transfer size, and the
// Vite preview server behind `astro preview` gzips text responses above 1 KiB.
// Serving the same files uncompressed made /demo (a 1.4 MB HTML document,
// 330 KB gzipped) score 0.83 for Performance on PR #498 against 0.97 under the
// old preview. Same threshold, same encoding, so the calibration carries over.
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml|manifest\+json)|image\/svg\+xml)/;
const COMPRESS_MIN_BYTES = 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
};

/**
 * Worker routes the static pages call on load. Keep this list to routes the
 * pages actually request; a stub for a route nothing fetches proves nothing.
 */
export const ROUTES = {
  "/api/health": () => ({
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify({ ok: true, service: "opchain-dev", version: "lhci-preview" }),
  }),
};

function fileInfo(path) {
  try {
    const stat = statSync(path);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}

/**
 * Map a URL pathname onto a file under `root`, or null. Refuses anything
 * that normalizes outside `root`.
 */
export function resolveStatic(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const base = resolve(root, `.${sep}${relative}`);
  if (base !== root && !base.startsWith(root + sep)) return null;

  const candidates = [base, join(base, "index.html"), `${base}.html`];
  for (const candidate of candidates) {
    if (candidate !== root && !candidate.startsWith(root + sep)) continue;
    const stat = fileInfo(candidate);
    if (stat) return { path: candidate, size: stat.size };
  }
  return null;
}

function send(res, status, headers, body, headOnly) {
  res.writeHead(status, headers);
  if (headOnly) return res.end();
  res.end(body);
}

export function wantsGzip(acceptEncoding) {
  return /(?:^|,)\s*gzip\s*(?:;|,|$)/i.test(acceptEncoding || "");
}

function stream(req, res, status, file, headOnly) {
  const type = MIME[extname(file.path).toLowerCase()] || "application/octet-stream";
  const gzip =
    COMPRESSIBLE.test(type) &&
    file.size >= COMPRESS_MIN_BYTES &&
    wantsGzip(req.headers["accept-encoding"]);
  const headers = { "content-type": type, "cache-control": "no-cache", vary: "accept-encoding" };
  if (gzip) headers["content-encoding"] = "gzip";
  else headers["content-length"] = file.size;
  res.writeHead(status, headers);
  if (headOnly) return res.end();
  const body = createReadStream(file.path);
  if (gzip) body.pipe(createGzip()).pipe(res);
  else body.pipe(res);
}

export function createPreviewServer({ root, routes = ROUTES }) {
  const absoluteRoot = resolve(root);
  return createServer((req, res) => {
    const headOnly = req.method === "HEAD";
    if (req.method !== "GET" && !headOnly) {
      return send(res, 405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }, "method not allowed", headOnly);
    }
    const { pathname } = new URL(req.url || "/", "http://preview.local");

    const route = routes[pathname];
    if (route) {
      const reply = route(req);
      return send(res, reply.status, reply.headers, reply.body, headOnly);
    }

    const file = resolveStatic(absoluteRoot, pathname);
    if (file) return stream(req, res, 200, file, headOnly);

    const notFound = resolveStatic(absoluteRoot, "/404.html");
    if (notFound) return stream(req, res, 404, notFound, headOnly);
    return send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "not found", headOnly);
  });
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 || index === process.argv.length - 1 ? fallback : process.argv[index + 1];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(process.cwd(), option("--dir", "dist"));
  const host = option("--host", "127.0.0.1");
  const port = Number(option("--port", "4321"));
  if (!fileInfo(join(root, "index.html"))) {
    console.error(`lhci-preview: no index.html under ${root} — run \`npm run build\` in site/ first`);
    process.exit(1);
  }
  const server = createPreviewServer({ root });
  server.listen(port, host, () => {
    // "Local" is the startServerReadyPattern in lighthouserc.cjs, the same
    // token `astro preview` prints.
    console.log(`lhci-preview serving ${root}`);
    console.log(`  Local    http://${host}:${port}/`);
    console.log(`  Routes   ${Object.keys(ROUTES).join(", ")} (stubbed Worker routes; all other /api/* 404)`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
