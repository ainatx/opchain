import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROUTES, createPreviewServer, resolveStatic } from "../scripts/lhci-preview.mjs";

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

  it("never resolves a path outside the build directory", () => {
    expect(resolveStatic(root, "/../../etc/passwd")).toBeNull();
    expect(resolveStatic(root, "/%2e%2e/%2e%2e/etc/passwd")).toBeNull();
    expect(resolveStatic(root, "/skills")).toEqual(
      expect.objectContaining({ path: join(root, "skills", "index.html") }),
    );
  });
});
