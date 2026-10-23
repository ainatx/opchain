# Independent review: accessible-name remediation

Date: 2026-10-22. Base: PR #652 head `f0eb785916239e5a720a48cfdba0138dc124c05b`, plus the frozen six-file working diff in `/Users/aidanelsesser/.codex/worktrees/ow-handoff-completion/opchain`.

**Verdict: PASS for this scoped remediation; no actionable findings.** This is an independent review under the `oc-ux-engineer` 2.0.4 semantic HTML, ARIA correctness, keyboard/focus, and consistency criteria, not a full redesign or blanket WCAG certification. Only `/tmp` review artifacts were written. No source, index, checkpoints, or tests were changed by this reviewer, and no competing broad suite was run.

## Source and computed-name evidence

The frozen baseline `docs/audits/evidence/2026-10-22-accessible-name-baseline.json` contains only `label-content-name-mismatch`: 26 node occurrences across 13 routes, representing 14 unique links. The source fix covers that exact set.

- `site/src/components/Header.astro:8,88–91` uses the same `LOCKUP_GENERATION` as the visible badge. Chromium's accessibility tree reports **“opchain 2.0 home”** for visible **“opchain 2.0”**. The name preserves the home destination/purpose and cannot drift independently from the generation constant (`site/src/lib/lockup.ts:16`). `VersionBadge.astro:9–10` only corrects its explanation; no new hiding was introduced.
- `site/src/pages/architecture.astro:534,1036–1047,1147–1158,1264–1287,1393–1404` removes 11 incomplete name overrides. The browser now derives each name from its complete visible text. The pack link says “v1.5 · 36 packs →”; skill cards retain their skill name, command, function, and release/context text. Their `href` values are unchanged: coverage, the corresponding skill page, or the v2.0 changelog for the two learning-release cards. Link purpose remains meaningful in its existing context.
- `site/src/pages/index.astro:94–104` and `site/src/pages/skills/index.astro:57–65` derive release-link names from the complete visible release text. The skills callout still announces “SEE WHAT CHANGED”. Both preserve `/changelog#v2-0`.

Independent Chromium CDP evidence is saved in `docs/audits/evidence/2026-10-22-accessible-name-fixed.json`: actual link roles, computed names, visible text, original destinations, and `tabIndex=0` for all 14 affected links at 1280px. The home link's literal `includesVisible` field is false solely because `innerText` includes the pre-existing decorative chevron `›`, excluded by the unchanged `aria-hidden="true"` at `index.astro:104`. All meaningful visible words are present in its computed name; this is not a remaining label mismatch.

## Interaction and test integrity

The five site-file diff changes naming attributes/imports and a comment only. Anchor elements, destinations, visible content, handlers, CSS, focus styles, and responsive structure remain unchanged. Independent browser checks in `docs/audits/evidence/2026-10-22-accessible-name-keyboard.json` confirm visible focus, Tab leaving the control, and Enter navigation for the brand and skills callout at 375/768/1280px, and the pack badge at 768/1280px.

An earlier optional probe timed out on the pack badge at 375px because it attempted to focus the hidden desktop-only element. The visibility-aware follow-up confirms the existing responsive behavior (`architecture.astro:3251–3252`); no site defect or regression was inferred. This review does not claim a full visual audit or exhaustive keyboard traversal.

`tests/site-release-chip.test.js:25–34` improves the existing source check: the expected destination, shipped label, purpose text, and command names must belong to the actual release-callout anchor. Replacing the old invalid `aria-label` literal with a check against competing name overrides is appropriate; existing header identity/health checks remain. A separate read-only reviewer agreed. Root reports all four focused unit checks pass in 180ms; this reviewer did not rerun them.

The 13 routes, Axe tags, zero-violation assertion, and existing exclusions in `site/tests/e2e/routes.spec.ts:91–192` are unchanged. No new rule disable, test exclusion, or configuration weakening was introduced. Existing contrast and other documented exclusions mean these results do not establish complete accessibility conformance.

## Verification and limits

Read and verified the frozen logs:

- `/tmp/opchain-axe-fixed-routes.log`: **28/28 PASS**, including all **13 Axe routes**, 11.0s.
- `/tmp/opchain-axe-fixed-full-e2e.log`: initial full run **122 PASS / 1 FAIL**, 48.3s. The unchanged planned-votes test found zero entries because the ignored roadmap input had not been generated locally.
- The builder then ran the existing public-roadmap generator and rebuilt with CI preparation, without further source/test changes. `.github/workflows/ci.yml:198` already runs that generator; the test explicitly requires populated roadmap data (`changelog-and-scenarios.spec.ts:163–193`).
- `/tmp/opchain-axe-roadmap.log`: 12 roadmap items, including 8 planned; `/tmp/opchain-axe-ci-build.log`: 83 pages built.
- `/tmp/opchain-axe-fixed-ci-e2e.log`: **123/123 PASS**, zero skips, **52.2s**. All 13 Axe cases pass in this full run.
- Independent `git diff --check` passed on the reviewed six-file diff.

This supports accepting the accessible-name fix and proceeding to the root's full gate. It is not evidence of a production deployment, remote CI completion for a later commit, live Worker behavior, or final release readiness.
