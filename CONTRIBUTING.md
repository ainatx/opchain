# Contributing to opchain

Thanks for wanting to make the skills better. Here's how contributions work.

## Where PRs go

**This repo is where PRs merge.** The public snapshot at [asfbay-bit/opchain-skills](https://github.com/asfbay-bit/opchain-skills) is currently a read-only mirror refreshed from here on every push to `main`; a restructure is underway that will make it the canonical contributor repo for the skills themselves (see `docs/plans/2026-08-22-oss-split-licensing-compliance.md`). Until that lands, open issues and PRs here.

## Dev setup

```bash
npm ci                 # root (worker, scripts, tests)
npm run site:install   # once, if you'll touch site/
npm test               # vitest suite (pretest runs the catalog/pack validators)
npm run test:hooks     # plugin hook suites — run if you touch plugins/opchain/hooks
```

Use npm 11 (bundled with Node 24; on Node 22 run `npm install -g npm@11`). Dependabot writes lockfiles with it and CI installs with it; npm 10's `npm ci` rejects those lockfiles (`Missing: proxy-agent@… from lock file`).

Repo layout is documented at the top of `CLAUDE.md`. The short version: `skills/` is the product, `site/` + `src/` are opchain.dev, `scripts/` is build tooling, `.checkpoints/` is tracked session state.

## Before you open a PR

- `npm test` green.
- `npm run gen-catalog` green — skill frontmatter is validated (required fields include `license: Apache-2.0`; descriptions ≤1024 chars).
- If you edited `skills/orchestrator.md` or `skills/oc-checkpoint-protocol/SKILL.md`, run `npm run sync-bundles` — those files are bundled into every skill and CI fails on drift.
- Add a line to `skills/CHANGELOG.md` under *Unreleased* if skill behaviour changed.
- No internal references in shipped skill content: no personal paths, no `aidops`, no tooling that only exists in this repo.

## Sign-off (DCO) — required

Every commit must be signed off by a **human** author:

```bash
git commit -s
```

The sign-off certifies the [Developer Certificate of Origin 1.1](https://developercertificate.org/): that you have the right to submit the work under this repo's license. By contributing, you agree your contribution is licensed under **Apache-2.0** (inbound = outbound, per Apache-2.0 §5 and the [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#6-contributions-under-repository-license)). There is no CLA.

## AI-assisted contributions

AI assistance is welcome here — much of this repo was built with it — under these rules:

1. **You are the author.** A human is the git author, reviews every line, and signs off. AI agents never add `Signed-off-by`.
2. **Disclose the assistance** with a `Co-Authored-By:` trailer (e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`).
3. The tool's terms must permit open-source licensing of its output (Anthropic's and Cursor's do), and you must not submit reproduced third-party copyrighted material.

## Conventions

- Conventional commits (`feat(scope): …`, `fix: …`, `docs: …`); squash or rebase merges only.
- One logical change per PR. Focused diffs review fast; mass renames and formatting-only sweeps don't.

## Open an issue first for

- Renaming a skill (names are public surface — renames break installs)
- A brand new skill
- Changes to the checkpoint protocol or `skills/orchestrator.md`
- Anything that depends on opchain.dev site behaviour

## Conduct & security

Be decent — the full policy is [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (contact: conduct@opchain.dev). Security issues: see [SECURITY.md](SECURITY.md) — please don't report vulnerabilities in public issues.
