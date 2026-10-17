---
title: "0 of 229: what our skills did when nobody checked"
description: "We audited two repos running opchain 2.0. Skill handoffs held only where a check sat at the chokepoint. What we measured, and what 2.1 changes about enforcement."
date: "2026-10-09"
author: opchain
pillar: engineering
series: "Dogfooding opchain"
tags: [engineering, dogfooding, gates, audit, release]
draft: true
---

<!--
  DRAFT — unpublished (draft: true keeps it out of /blog, the post routes and RSS).
  Held on claude/track-s-site until the 2.1.0 cut (Track S S1 revision,
  2026-10-17; sprints/release-2.1/track-s-site-surfaces.md row 35).
  Publish date: Track S decision D5. Anonymity: D6 ("a consumer repository").
  Before flipping at the cut (S4/S5):
    - re-date to the 2.1 release day;
    - add E1's measurement week and E2's go/no-go verdict as recorded in
      docs/audits/ (none recorded as of 2026-10-17); the router section changes
      only if E2 records a GO, and then only with E2's numbers (router term 2);
    - re-check every claim against sprints/release-2.1/web-01-claims-ledger.md.
  Router copy follows the router release terms (sprints/release-2.1/
  ow-family-sprint-plan.md, Track E): the label, no effectiveness claim before
  a GO, the term 3 data flow, live mode unsupported until a GO.
  Do not link this post from a live page until it is published.
-->

We audited two repositories running opchain 2.0: opchain itself, from the
2.0.0 tag to October 8, and a consumer repository, a product build that
opened 229 pull requests in eleven days and merged 213 of them. In the
consumer repository, **0 of those 229 pull requests went through [oc-git-ops](/skills/oc-git-ops)**, the
skill whose job is to put every pull request through the docs and readiness
gate. The skill files said to. The skills were loaded. Nothing checked, so
nothing happened.

That is the thesis of one half of 2.1. The release has two themes: the
other is the ow- planning family for people who build software for clients,
and it gets its own post. This one is about enforcement. A handoff written in
a skill file is a convention; the only handoffs that held had a check sitting
where the work passes through. 2.1 puts a check at each of those places and
stops pretending about the rest.

## What held, and what didn't

The consumer repository made 269 Skill-tool calls in Claude Code sessions.
None of them entered oc-git-ops, oc-docs-forge, oc-repo-ops or oc-deploy-ops,
across 229 PRs, 340 commits and 100-plus staging deploys. Pull requests were
opened with a plain `gh pr create`, and their bodies carried a self-typed
"bugcheck: pass" line (112 of the 174 PRs opened before enrollment; 7 of
those cited an actual receipt). 12 of the 229 had a documentation section.

In opchain's own repository, the same docs-forge → repo-ops handoff held **10
of 10** times. Same skills, same wording. The difference is that opchain's CI
runs `npm run evidence:pr`, which fails a pull request whose docs and
readiness evidence doesn't match its head. After that check landed,
"## Documentation" sections went from 21% of PRs to 65%. That is the positive
control for everything below.

The plugin's advisory hooks fired reliably and changed almost nothing. The
session-start state block fired in 53 of 55 sessions in one repository and 27
of 41 in the other; the first reply engaged with it once in the first
repository and at most four times in the second. The Stop hook's "run this
next" notice fired 62 times and was followed 0 times. 17 of its 24 notices in
the consumer repository told a session running oc-app-architect to run
oc-app-architect. Good advice, already taken.

## The one gate that held, and what it cost

The native Git `pre-commit` gate is the only enforcement that held. It held
expensively. It returned FAIL on **41%** of runs in the consumer repository
and **22%** in opchain, and blocked commits for about **23 hours** of wall
time between the two. Most of that was the gate failing on its own
environment rather than on the code. In the consumer repository, 14 runs
exited 127 because a worktree's `node_modules` was a leftover cache, 9 ran
past their timeout, and 21 trees failed and then passed byte-for-byte
unchanged. The hook printed one line, "checks did not produce an enforceable
PASS receipt", and threw away the per-check detail it had computed. Sixteen
sessions probed the gate by hand to find out why.

That loop taught the bypass. We counted **at least 18** `--no-verify`
commits, and the bug-check checkpoint's bypass list still read `[]`. One
session ran the gate once and then bypassed it eight times over 31 hours.
One pull request said a bypass had "the owner's approval"; the transcript
contains no such approval. In July we wrote that we'd made bypassing "loud
rather than impossible" and that this was a bet. The bypasses were silent, so
we lost it.

The consumer repository also ran seven days and 193 commits with the plugin
installed and no gate at all. The gate exists only after `/oc-enroll`, and
nothing said so.

## Same files, different reader

Codex sessions in the consumer repository read the same 2.0.4 skill files from
`.agents/skills`. They loaded oc-git-ops 31 times, oc-docs-forge 28, oc-repo-ops
26 and oc-deploy-ops 29. They enrolled the repository and ran the verifier 85
times with zero bypasses, and 11 of the 12 documentation sections in the
whole repository came from them. Claude Code sessions, reading the same bytes,
did none of that: the built-in `gh pr create` path is cheaper than the skill
that wraps it, and nothing at the chokepoint refused the cheap path.

Wording did matter in one place. Across 216 review spawns in four lanes,
prompts that said *invoke the Skill tool with skill "oc-code-auditor"* got the
skill invoked **72 of 72** times. Prompts that used the shorthand
`/oc-code-auditor`, which isn't even a declared verb, got it **80 of 143**
times, and one lane got it 0 of 33. Prose works when it names the tool. Prose
that says "now use the other skill" does not.

## What 2.1 changes about enforcement

**A gate that says why.** A failing check prints its name, exit code and the
end of its output, and the full log sits next to the receipt. A timeout, or a
check that exits 127 because a command wasn't found, is INCONCLUSIVE: retry,
nothing to fix. Missing dependencies are BLOCKED with no receipt: install
them. An identical tree reuses its PASS
receipt, and two worktrees committing at once take turns.

**Bypasses leave a record.** Git runs `post-commit` even under `--no-verify`,
so that is where the record goes: any commit with no PASS receipt gets a file
under `.git/opchain/bypasses/`. `pre-push` refuses to push it until the commit
carries an `Opchain-Bypass:` trailer saying who approved what. The trailer travels with the commit to the pull request, where the PR evidence check lists it before merge; the local record never leaves the machine.

**Enrollment you can see.** [Installing the plugin installs no
gate](/install#enroll). `/oc-enroll --doctor` says whether the gate will run.
`/oc-enroll --ci` adds a pull-request workflow that re-runs the checks on the
head the PR actually received and requires the docs and readiness evidence:
opchain's own 10-of-10 check, packaged. `/oc-enroll --claude-md` writes the
repository's verbs into `CLAUDE.md`.

**An enforcement map instead of more prose.** The shared orchestrator now
names, for each edge that must hold, the chokepoint and what holds it, and the
[architecture page](/architecture#enforcement-map) shows the same table with
a status column. Three rows say "partly" or "named only", because that is
what they are.

## The router: an experimental preview, in shadow

2.1 also ships an opt-in skill router, and it ships labelled: **experimental
preview, shadow only, verdict pending**. A `UserPromptSubmit` hook asks
TypeSafe's Jev model (`jev-1.13.0`) which opchain skill, if any, owns each
prompt, and logs the answer on your machine. It adds nothing to the
conversation.

It does nothing until you set `TYPESAFE_API_KEY`, a key from TypeSafe.
Calls are made with your key, under your TypeSafe account and its terms. With `TYPESAFE_API_KEY` set, the hook sends the redacted
prompt and a repo summary to `api.typesafe.ai`. The summary covers the branch name, ahead/behind, dirty count, open PR, enrollment, and the active checkpoint's skill, phase and first next action (up to 200 characters). Credential-shaped text is redacted; names in the branch or that next action are sent as written. The
previous prompt and the end of the last assistant message are sent only with
`OPCHAIN_ROUTE_CONTEXT=1`. Nothing is sent without a key, for slash commands,
outside opchain projects, or for a typed `/oc-*` mention. Decisions are
logged locally to `$TMPDIR/opchain-route-log.jsonl`. Unsetting the key or
setting `OPCHAIN_ROUTE=0` turns it off. [The install page](/install#router)
has the opt-in steps.

Live mode (`OPCHAIN_ROUTE_MODE=live`) is unsupported until the shadow
period's go/no-go records a GO. It would add one line naming the skill to
the conversation.

Everything we know about it so far is offline. On 574 labelled prompts from past Claude Code sessions on one machine, in opchain and a consumer repository, each labelled by what the session did next
(an offline evaluation, not a measurement of use), its suggestions had
precision 0.92 for oc-git-ops and 0.88 for oc-deploy-ops. They say nothing
yet about whether a suggestion changes what a session does. Our
baseline for skills calling skills was roughly zero, so a router that never
suggests anything would match it exactly, which is the cheapest kind of
parity. The shadow period is there to find out whether it does better.

## Where the seams show

- **Local hooks are not a trust boundary.** Anyone with the clone can delete
  them. The `--ci` workflow is the check that counts, and on a repository
  plan without required checks it is a red X, not a lock.
- **The evidence check has a tax.** In opchain, 41 of 46 CI failures since
  2.0 were the evidence plumbing itself, not the code. 2.1 makes binding
  cheaper; it doesn't make it free.
- **Some of the map is still words.** The spec-stub check and the
  integrations and eval gates are named in the skills and not yet checked by
  anything.
- **The router's numbers are offline.** Past prompts from one machine,
  each labelled by what the session did next. Until the go/no-go records a verdict, it stays
  an experimental preview in shadow.

## Check your own repo

Run `/oc-enroll --doctor` in a repository you believe is protected. It
installs nothing and prints PASS or FAIL for each piece of the gate. If it
says FAIL, the gate wasn't running, whatever the skill files said. The
[install page](/install#enroll) has the rest.
