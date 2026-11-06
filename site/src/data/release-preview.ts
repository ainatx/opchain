// Release-preview denotation (owner decision 2026-10-30).
//
// A staging build of an unreleased release's site surfaces marks every change
// on the page with a small tag ("2.1 · ow" / "2.1 · oc") and a thin ribbon
// under the header, so a reviewer can tell new copy from shipped copy. Both
// render ONLY when `PUBLIC_OPCHAIN_RELEASE_PREVIEW` is set at build time
// (for example `PUBLIC_OPCHAIN_RELEASE_PREVIEW=2.1 npm run deploy:staging`).
// Unset, the same source renders nothing extra, so the code can merge to
// `main` and ship with no preview chrome. Vite exposes `PUBLIC_`-prefixed
// process.env to `import.meta.env` at build time; the deploy wrapper refuses
// a production deploy while the variable is set (scripts/deploy.mjs).
export const PREVIEW_RELEASE: string = String(
  import.meta.env.PUBLIC_OPCHAIN_RELEASE_PREVIEW ?? "",
).trim();

/** True when this build denotes unreleased changes. */
export const IS_RELEASE_PREVIEW = PREVIEW_RELEASE !== "";

/** The two 2.1 themes a tag can name. */
export type PreviewTheme = "ow" | "oc";
