# opchain v2.0.4 — Bug fixes

opchain v2.0.4 is a patch release. It fixes what a 2026-09-21 audit found when
it ran the 2.0.1–2.0.3 features in real Claude Code sessions. The plugin's
`Task ended:` stamp now prints in every repository; it was silent in any repo
without `.checkpoints/`. A resumed or compacted session now says `Task resumed:`
instead of starting the task again. The release-surface gate now checks the
mirror README, plugin README, styleguide badge and skill-page tag, which the
2.0.3 notes said it already did, and the oc-release-ops docs now describe a
patch as one PR, which is how 2.0.3 actually shipped. Dependencies (zod, Astro,
Markdown, Playwright) are refreshed. Back-compatible with v2.0; no migration.
Update the plugin with `/plugin marketplace update opchain`. Full notes:
https://opchain.dev/changelog#v2-0-4 · audit:
`docs/audits/2026-09-21-v2.0.3-feature-execution-audit.md`.
