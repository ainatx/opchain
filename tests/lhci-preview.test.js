import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { ROUTES, createPreviewServer, resolveStatic, wantsGzip } from "../scripts/lhci-preview.mjs";

// Raw request: Node's fetch transparently decompresses, which would hide the
// encoding these tests are about.
function raw(url, headers = {}) {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

// A miniature Astro `output: "static"` build: directory-format pages, a
// hashed asset, and the 404 page Astro emits for unknown routes.
let root;
let server;
let base;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "lhci-preview-"));
  mkdirSync(join(root, "skills", "oc-app-architect"), { recursive: true });
  mkdirSync(join(root, "_astro"));
  writeFileSync(join(root, "index.html"), "<h1>home</h1>");
  writeFileSync(join(root, "skills", "index.html"), "<h1>skills</h1>");
  writeFileSync(join(root, "skills", "oc-app-architect", "index.html"), "<h1>app-architect</h1>");
  writeFileSync(join(root, "404.html"), "<h1>nothing to see here</h1>");
  writeFileSync(join(root, "_astro", "site.abc123.css"), "body{}");
  writeFileSync(join(root, "robots.txt"), "User-agent: *");
  // Above the 1 KiB compression threshold; the tiny files above are below it.
  writeFileSync(join(root, "demo.html"), `<main>${"<p>replay</p>".repeat(400)}</main>`);
  writeFileSync(join(root, "_astro", "logo.png"), Buffer.alloc(4096, 1));

  server = createPreviewServer({ root });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(root, { recursive: true, force: true });
});

describe("lhci-preview: the one Worker route the pages call on load", () => {
  it("answers /api/health with a healthy JSON payload and no-store", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, service: "opchain-dev" });
    expect(typeof body.version).toBe("string");
  });

  it("does not pretend to be the Worker for any other /api route", async () => {
    // A future client-side fetch to an unstubbed route must surface in LHCI
    // as the console 404 it would be under `astro preview`.
    const res = await fetch(`${base}/api/flags/public`);
    expect(res.status).toBe(404);
    expect(Object.keys(ROUTES)).toEqual(["/api/health"]);
  });
});

describe("lhci-preview: static resolution matches the Astro build", () => {
  it("serves the root index", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("home");
  });

  it("serves directory-format pages at their trailing-slash-free URL without redirecting", async () => {
    const res = await fetch(`${base}/skills/oc-app-architect`, { redirect: "manual" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("app-architect");
  });

  it("serves hashed assets with the right content type", async () => {
    const res = await fetch(`${base}/_astro/site.abc123.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  it("serves the 404 page with a 404 status for unknown routes", async () => {
    const res = await fetch(`${base}/definitely-not-a-real-route`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("nothing to see here");
  });

  it("answers HEAD without a body", async () => {
    const res = await fetch(`${base}/robots.txt`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("rejects methods other than GET and HEAD", async () => {
    const res = await fetch(`${base}/api/health`, { method: "POST" });
    expect(res.status).toBe(405);
  });

  it("gzips text above 1 KiB when the client accepts it, like Vite's preview", async () => {
    const res = await raw(`${base}/demo`, { "accept-encoding": "gzip, deflate, br" });
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers.vary).toBe("accept-encoding");
    expect(res.headers["content-length"]).toBeUndefined();
    expect(res.body[0]).toBe(0x1f);
    expect(res.body[1]).toBe(0x8b);
    expect(gunzipSync(res.body).toString()).toContain("<p>replay</p>");
    expect(res.body.length).toBeLessThan(gunzipSync(res.body).length / 4);
  });

  it("leaves small text, binaries, and clients without gzip uncompressed", async () => {
    const small = await raw(`${base}/_astro/site.abc123.css`, { "accept-encoding": "gzip" });
    expect(small.headers["content-encoding"]).toBeUndefined();
    expect(small.headers["content-length"]).toBe("6");

    const png = await raw(`${base}/_astro/logo.png`, { "accept-encoding": "gzip" });
    expect(png.headers["content-encoding"]).toBeUndefined();
    expect(png.headers["content-length"]).toBe("4096");

    const identity = await raw(`${base}/demo`);
    expect(identity.headers["content-encoding"]).toBeUndefined();
    expect(identity.body.toString()).toContain("<p>replay</p>");

    expect(wantsGzip("gzip")).toBe(true);
    expect(wantsGzip("br, gzip;q=0.8")).toBe(true);
    expect(wantsGzip("br")).toBe(false);
    expect(wantsGzip(undefined)).toBe(false);
  });

  it("never resolves a path outside the build directory", () => {
    expect(resolveStatic(root, "/../../etc/passwd")).toBeNull();
    expect(resolveStatic(root, "/%2e%2e/%2e%2e/etc/passwd")).toBeNull();
    expect(resolveStatic(root, "/skills")).toEqual(
      expect.objectContaining({ path: join(root, "skills", "index.html") }),
    );
  });
});
