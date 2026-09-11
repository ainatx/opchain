// Single source for GitHub repo links (surface pass 2026-08-25, item D1).
// At the repo split (docs/plans/2026-08-22-oss-split-licensing-compliance.md §2.5)
// contribution surfaces (issues, advisories for the product, source links) flip to
// REPO_PRODUCT — change them HERE, nowhere else.
export const REPO_SITE = "https://github.com/ainatx/opchain"; // site + Worker monorepo
export const REPO_PRODUCT = "https://github.com/asfbay-bit/opchain-skills"; // skills + plugin (contributor repo at the split)
export const REPO_ISSUES = `${REPO_SITE}/issues`;
export const REPO_NEW_ISSUE = `${REPO_SITE}/issues/new`;
export const REPO_ADVISORIES = `${REPO_SITE}/security/advisories`;
