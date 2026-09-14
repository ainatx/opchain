# 2.0 launch presentation review

The user clarified that staging must show the site as it will look when 2.0 is
live. The site now identifies 2.0 as the current release, shows 36 skills and 16
plugin commands, and places 2.0 in the released changelog panel. No release date
has been invented. The three new demo conversations remain external Markdown
drafts until the user approves their integration.

## Reviewed changes

Release labels agree across the header, home, library, style guide and desktop
and mobile architecture. Visible preview language is removed from those pages
and the Hindsight and Evolve skill introductions. The generated plugin copies
match their sources. Provider, separate evaluator and external reviewer setup
remain explicit requirements.

The install page now describes complete folders, the current skill and command
counts, the supported updater and a bootstrap route for older installations.
It removes the unimplemented initialization and wire migration commands and the
destructive whole-directory replacement. The Codex destination is .agents/skills.

## Security and release boundary

The release marker retains status staging-preview and releaseDate null. Its
explicit presentation field permits launch copy to lead the historical ledger.
The actual release ledger remains unchanged. The production deploy wrapper still
refuses any tree carrying this marker. New regression coverage checks that a
missing marker, wrong version or released status cannot silently authorize this
presentation. No authentication, provider execution, trust policy or runtime
lifecycle code changed.

The rendered launch wording represents the requested future public experience;
it is not evidence that the outstanding release acceptance work has happened.
The existing runtime alignment plan continues to own that work.

## Validation

The site builds and Astro reports zero errors and warnings. All 55 browser cases
pass across route rendering, the existing accessibility checks, diagram geometry,
changelog navigation and the unchanged 12 scenario picker entries. The release
surface suite passes all three tests, including its new boundary case.
Final commit verification runs the repository's required candidate checks.

## Changelog layout follow up

The user requested the same structure as previous releases: a What's new section
with the three new skills, followed by What's changed. The 2.0 entry now uses the
existing skill tile layout for oc-update, oc-hindsight and oc-evolve. The runtime
change descriptions and compatibility guidance remain below the new skills.
This is static page content only; it changes no runtime or security boundary.
