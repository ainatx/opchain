# REL-01 — Distribution and integrity

2026-10-22. Implements the approved ow-family sprint plan's REL-01. The owner
has moved ow-care, ow-vendor-eval, ow-controls and ow-currency to v2.2; v2.1.0
contains eight skills once OW-06 lands. Build outputs enumerate the validated
catalog so an absent skill is never advertised by a hardcoded count.

## Deliverables and checks

1. Mirror `skills-work/` independently of the oc- plugin and discovery catalog.
   A workflow assertion checks both its trigger and staging-copy source.
2. Ship `/work/<id>.zip` and `/opchain-work-skills.zip` with the complete skill
   tree, protocol copy, LICENSE and NOTICE. Generate `/work/manifest.json`
   recording per-skill versions and archive SHA-256s. Exercise a clean-folder
   install from an archive and reject invalid source before replacing outputs.
3. Document link/copy installation in Claude Code and one-skill upload in
   claude.ai, separating the text-only skills from the optional code add-on.
4. Bind the per-skill version inventory to the signed release through an
   release-seal field required from opchain 2.1 onward, without forcing ow- into oc-'s lockstep policy.
5. Provide a trigger-query harness that checks recorded model routing answers
   against positive and negative queries. Synthetic answers test the harness;
   only actual recorded model answers can count as trigger evidence.

## Scope and evidence boundary

This implementation does not manufacture an ow-tools public-mirror commit.
SA-001 requires a durable mirror tag and its actual commit, plus a manifest
hash published through the signed source tag/site. The preparation script
verifies that state; its code is not evidence of publication. SA-004 is
implemented in ow-tools 1.3.1 with the publisher revision verified from public
metadata and Whisper hashed at run time; real-model timing remains REL-02. A local clean-folder
archive check is not evidence of a successful hosted installation. REL-02's
real-model runs, real jobs and calendar-bound measurements stay separate.

## Verification

Run targeted distribution, catalog and release-tag tests during implementation.
The coordinator serializes the full verifier and independent evaluation before
the commit/PR, with no parallel full-suite load on the owner's machine.
