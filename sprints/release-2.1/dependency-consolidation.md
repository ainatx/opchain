# v2.1 dependency consolidation

Prepared 2026-10-22 from the nine pending Dependabot proposals: #651, #650, #640, #631, #630, #629, #628, #627 and #598. This is maintenance for the release candidate; it does not change the published release version.

The root lock resolves js-yaml 5.5.0, Vitest 5.0.5, Wrangler 4.151.0, Zod 4.6.7 and Vite 8.3.5. The site resolves Astro 7.4.1, the Cloudflare adapter 14.4.1, markdown-remark 7.3.3, Astro Check 0.9.11, isomorphic-dompurify 4.6.0, marked 18.1.1, Playwright 1.64.1 and Axe Playwright 4.14.0.

The adapter requires Astro 7.4 or later, so the manifest floor moves with the lock. The upgraded Astro checker also catches an extra `</Base>` after the glossary's style block; removing it retains the correctly closed layout above the styles. Zod and js-yaml are embedded in the runtime, so the runtime and all skill/plugin copies are regenerated from these dependencies.

Clean installs succeed on Node 24.19.0. Root and site lock audits report zero vulnerabilities, and the updated site type check reports zero errors. The unchanged optional Puppeteer/proxy-agent peer mismatch remains outside this set. Full candidate verification and CI evidence belong to the commits and PR that land this change. Superseded dependency PRs are closed only after the consolidated candidate passes and merges.

The full dependency-only candidate ran 10,947 tests: 10,933 passed, 13 skipped,
and one failed on equivalent LibreOffice CSV formatting (`6700.5` versus
`6700.50`). The corrected test checks the exact total cell numerically and
conversion status; both real-binary C8 tests pass. The final integrated full
gate, including this correction, remains required.

A subsequent authenticated GitHub alert check found 40 Python advisories,
including five critical alerts, outside the npm audits. The Python lock now
resolves Pillow 13.0.0 and certifi 2026.10.19; these are its only changed package
records. All reported Python ranges are cleared, and isolated pip-audit 2.10.1
checked all 116 registry entries with zero skips and zero known vulnerabilities.
The exact pyannote and model pins remain unchanged. The security manifest is
regenerated; see `docs/audits/2026-10-22-python-dependency-remediation.md` for
commands, persisted evidence and integration limits. The final candidate gate
was restarted to include this lock, rather than reusing the earlier snapshot.
