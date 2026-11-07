<!-- opchain:agents-section v1 -->
## OpChain

This repository uses OpChain: development skills plus a git-hook commit gate.
These rules apply to every coding agent working here (Codex, Cursor, Copilot,
Claude Code, and others) and to people.

OpChain manages the text between these markers and rewrites it on update, so
put your own guidance outside them. To stop OpChain writing this section,
replace it with an HTML comment that reads `opchain:agents-section off`.
This section names no version on purpose: `.opchain-install.json` records the
installed release (a plugin-only install reports it through the plugin manager).

### Start Every Task Here

1. Read `.checkpoints/` first. Each `<skill>.checkpoint.json` records the last
   phase, status and `next_actions`. Resume from there instead of starting over,
   and do not hand-edit another skill's checkpoint.
2. Pick the OpChain skill that matches the task and follow its `SKILL.md`.
   Skills live in `.agents/skills/oc-*/` (Codex and other agents) or
   `.claude/skills/oc-*/` (Claude Code), or come from the opchain plugin.
   Without slash commands, name the step in words, for example "run the
   oc-bug-check pre-commit checks". In Claude Code the `/oc-*` verbs are
   aliases for the same steps.

### Commits Go Through the Gate

- The gate is plain git hooks: `pre-commit`, `post-commit` and `pre-push`. They
  run for any agent or person that runs `git commit` or `git push` here.
- `pre-commit` reruns the checks declared in `.bugcheck.json` on the exact
  staged tree and writes a receipt. When it refuses a commit, stop. Read the
  output, fix the cause, stage again and commit again.
- Never use `git commit --no-verify` (or `OPCHAIN_BYPASS=1`) unless the user
  approved a bypass, and record it with a trailer quoting who approved it and
  why: `git commit --trailer "Opchain-Bypass: <reason>"`. `post-commit`
  records every commit that has no passing receipt, and `pre-push` refuses to
  push one without an `Opchain-Bypass:` trailer.
- To run the checks before committing where `.opchain/runtime/` is vendored,
  stage your changes and run
  `node .opchain/runtime/scripts/verify-candidate.mjs run --repo .`

### Vendored Skills Are Read-Only

- Never hand-edit vendored `oc-*` skills under `.claude/skills/`,
  `.agents/skills/` or `.codex/skills/`. `.opchain-install.json` tracks them
  and the next update replaces them.
- Change them only by running the OpChain updater (the `oc-update` skill, or
  `/oc-update` in Claude Code), and commit that update in its own pull request.
<!-- /opchain:agents-section -->
