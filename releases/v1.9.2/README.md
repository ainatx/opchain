# opchain 1.9.2 — Verified handoffs

The maintainer selected 1.9.2 for the complete approved audit-remediation scope, including additive local tools. All 33 skills move together. Worker/site package versions and production monitoring baselines are independent.

The release proceeds through a reviewed product PR, signed tag, then the site update and staging verification. The maintainer authorized staging and tagging on September 13, 2026. Production promotion requires a separate decision.

`site-release.patch` contains the subsequent site change: L4/L5/L7, architecture version prose and the matching browser assertions. Apply after the product tag exists, refresh the ship date if needed, and verify the rendered release cards and vote options. Preserve this patch as the release plan after it has been applied.

See `release-notes.md` for migration requirements. The original verified candidate package remains immutable; fresh repository-bound verification and CI certify the release commits. Existing repository-split and 2.0 work remain outside this release.
