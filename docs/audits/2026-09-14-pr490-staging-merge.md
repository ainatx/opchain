# PR 490 staging merge review

The user authorized merging PR #490 into staging. Its head is
`f4d879c84814b1dc93c95762559a9ccbbbe2c2a9`; the destination is
`codex/oc-update-v2`, previously deployed at `627f386`.

## Merge decisions

The Slate & Emerald tokens, lockup badge and five content blocks were already
integrated during the runtime alignment. The merge records the original branch
as an ancestor and adds its design exploration records, optional design tools,
and the F9 brand-generation guidance in both release reference copies.

Conflicts retain the current 36-skill release copy, explicit learning behavior,
new comparison page, all 15 demos and the install upgrade prompt. The newer OG
generator reads the shared palette, so it and its current images are retained.
The current UX checkpoint is retained. Both sets of ignore rules are combined.
Whitespace in two archived HTML previews is normalized.

There is no diff from `627f386` in `site/src`, `site/public/og`, or the OG generator.
The generated MCP catalog changes only the updated release reference digest.
The historical design previews are records of the earlier design, not current
release claims and not part of the deployed site.

## Code and security review

The added architecture transforms target the local architecture file and exit
without writes when their existing markers are present. Both were checked and
reported already applied. Twelve incoming JavaScript tools pass syntax checks.
They are optional local design tools, not build hooks or server endpoints.
The font caching helper fetches public font assets; it is not executed by this
merge or deployment. Imported HTML is design documentation outside public assets.
No new runtime permission, credential, network endpoint or executable site logic
is introduced. No blocking code or security finding was identified in this merge.

Bundle and plugin parity checks pass. The final merge must pass the normal
candidate verification and typed code/security deployment evidence. Deployment
uses the staging wrapper, live hardening and smoke checks, then the existing
live browser suite covering comparison, changelog, demos and installation.
Production approval and the remaining overall 2.0 release acceptance are unchanged.
